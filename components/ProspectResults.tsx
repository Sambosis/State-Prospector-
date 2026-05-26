import React, { useState, useEffect } from 'react';
import { ProspectResult, Prospect, GroundingSource } from '../types';
import { enrichSingleProspect } from '../services/geminiService';
import ProspectsMapView from './ProspectsMapView';

interface ProspectResultsProps {
  data: ProspectResult;
  searchParams: {
    location: string;
    segment: string;
    subSegment: string;
  };
  onBack: () => void;
  onUpdateProspects?: (prospects: Prospect[], newSourceUrls?: GroundingSource[]) => void;
}

const ProspectResults: React.FC<ProspectResultsProps> = ({ data, searchParams, onBack, onUpdateProspects }) => {
  const [copySuccess, setCopySuccess] = useState('');
  const [prospectsList, setProspectsList] = useState<Prospect[]>(data.prospects);
  const [loadingIndices, setLoadingIndices] = useState<Record<number, boolean>>({});
  const [isEnrichingAll, setIsEnrichingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);

  useEffect(() => {
    setProspectsList(data.prospects);
  }, [data.prospects]);

  const handleEnrichSingle = async (index: number) => {
    const prospect = prospectsList[index];
    if (!prospect) return;

    setLoadingIndices(prev => ({ ...prev, [index]: true }));
    setEnrichmentError(null);

    try {
      const enrichment = await enrichSingleProspect(prospect.name, searchParams.location);
      
      const updatedList = [...prospectsList];
      updatedList[index] = {
        ...prospect,
        email: enrichment.email || prospect.email,
        website: enrichment.website || prospect.website,
        notes: enrichment.notes || prospect.notes
      };

      setProspectsList(updatedList);

      if (onUpdateProspects) {
        onUpdateProspects(updatedList, enrichment.sourceUrls);
      }
    } catch (err: any) {
      console.error("Failed to enrich prospect", err);
      setEnrichmentError(err.message || "An enrichment error occurred.");
    } finally {
      setLoadingIndices(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleEnrichAll = async () => {
    setIsEnrichingAll(true);
    setEnrichmentError(null);
    
    for (let i = 0; i < prospectsList.length; i++) {
      const p = prospectsList[i];
      if (!p.email) {
        setLoadingIndices(prev => ({ ...prev, [i]: true }));
        try {
          const enrichment = await enrichSingleProspect(p.name, searchParams.location);
          
          let latestList: Prospect[] = [];
          setProspectsList(currentList => {
            const updated = [...currentList];
            updated[i] = {
              ...p,
              email: enrichment.email || p.email,
              website: enrichment.website || p.website,
              notes: enrichment.notes || p.notes
            };
            latestList = updated;
            return updated;
          });
          
          if (onUpdateProspects && latestList.length > 0) {
            onUpdateProspects(latestList, enrichment.web ? [{ title: enrichment.web.title, uri: enrichment.web.uri }] : enrichment.sourceUrls);
          }
        } catch (err: any) {
          console.error(`Skipping enrichment for ${p.name}`, err);
          const errMsg = err.message || JSON.stringify(err);
          setEnrichmentError(`Bulk enrichment stopped: ${errMsg}`);
          setLoadingIndices(prev => ({ ...prev, [i]: false }));
          break; // Stop bulk processing on quota resource exhaustion
        } finally {
          setLoadingIndices(prev => ({ ...prev, [i]: false }));
        }
        // Stagger requests with 2.2 seconds between to respect the free tier rate limits
        await new Promise(resolve => setTimeout(resolve, 2200));
      }
    }
    setIsEnrichingAll(false);
  };

  const getHeaders = () => ["Prospect Name", "Phone", "Email", "Address", "City", "State", "Zip", "Notes"];
  const getDisplayHeaders = () => ["Prospect Name", "Phone", "Email", "Website", "Address", "City", "State", "Zip", "Notes"];

  const handleDownloadCSV = () => {
    const headers = getHeaders();
    const rows = prospectsList.map(p => {
      // Append email to notes if it exists, as requested for spreadsheet export
      let finalNotes = p.notes || "";
      if (p.email && p.email.trim().length > 0) {
        if (finalNotes.trim().length > 0) {
           finalNotes = `${finalNotes} Email: ${p.email}`;
        } else {
           finalNotes = `Email: ${p.email}`;
        }
      }

      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.phone.replace(/"/g, '""')}"`,
        `"${p.email.replace(/"/g, '""')}"`,
        `"${p.address.replace(/"/g, '""')}"`,
        `"${p.city.replace(/"/g, '""')}"`,
        `"${p.state.replace(/"/g, '""')}"`,
        `"${p.zip.replace(/"/g, '""')}"`,
        `"${finalNotes.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'state_chemical_prospects.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("State Chemical Prospect List", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Area: ${searchParams.location}`, 14, 33);
    doc.text(`Segment: ${searchParams.segment || 'All Segments'} ${searchParams.subSegment ? `> ${searchParams.subSegment}` : ''}`, 14, 38);

    const headers = [["Name", "Phone", "Email", "Website", "Address", "City", "State", "Zip", "Notes"]];
    const dataRows = prospectsList.map(p => {
      const cleanWebsite = p.website ? p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
      return [
        p.name, p.phone, p.email, cleanWebsite, p.address, p.city, p.state, p.zip, p.notes
      ];
    });

    (doc as any).autoTable({
      head: headers,
      body: dataRows,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: {
        3: { cellWidth: 25 }, // Website column
        8: { cellWidth: 65 }  // Notes column
      }
    });

    doc.save("state_chemical_prospects.pdf");
  };

  const handleCopyToClipboard = async () => {
    const headers = getHeaders();
    const rows = prospectsList.map(p => [
      p.name, p.phone, p.email, p.address, p.city, p.state, p.zip, p.notes
    ].join('\t'));

    const text = [headers.join('\t'), ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess('Failed');
    }
  };

  return (
    <div className="max-w-[95%] mx-auto p-4 md:p-6 space-y-6">
      {/* Active Search Context Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 opacity-10 rounded-full -translate-y-1/2 translate-x-1/4 filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 opacity-5 rounded-full translate-y-1/3 -translate-x-1/4 filter blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Active Search Parameters</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center">
                <div className="bg-white/10 p-2 rounded-lg mr-3 backdrop-blur-sm">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Territory</div>
                  <div className="text-xl font-bold text-white tracking-tight">{searchParams.location}</div>
                </div>
              </div>
              
              <div className="hidden sm:block h-10 w-px bg-slate-700"></div>
              
              <div className="flex items-center">
                <div className="bg-white/10 p-2 rounded-lg mr-3 backdrop-blur-sm">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Segment</div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-white">
                      {searchParams.segment || "All Segments"}
                    </span>
                    {searchParams.subSegment && (
                      <div className="flex items-center ml-2">
                        <svg className="w-4 h-4 text-slate-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-sm font-medium text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-md border border-blue-500/30">
                          {searchParams.subSegment}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={onBack} 
            className="flex items-center px-4 py-2.5 bg-white text-slate-900 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
             <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
             New Search
          </button>
        </div>
      </div>

      {enrichmentError && (
        <div id="re-enrichment-warning" className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm text-sm text-amber-900 flex justify-between items-start animate-fade-in my-2">
          <div className="flex">
            <svg className="w-5 h-5 text-amber-600 mr-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-amber-800 mb-0.5">Enrichment Assistant Notice</p>
              <p className="font-semibold text-amber-700">{enrichmentError}</p>
              <p className="text-xs text-slate-500 mt-1">
                You can try clicking individual <strong className="text-blue-600 font-bold">🔎 Find Contact</strong> buttons manually, or wait a minute before running <strong className="text-slate-700 font-bold">Enrich All Contacts</strong> again to allow your API limits to reset.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setEnrichmentError(null)}
            className="text-amber-400 hover:text-amber-700 font-black text-lg px-2 rounded-lg leading-none"
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-start md:items-center gap-4 lg:gap-6">
          <div>
             <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Lead List</h2>
             <p className="text-slate-500 text-sm mt-1 font-medium">Found {prospectsList.length} verified businesses matching your criteria</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-inner w-fit">
            <button
              id="view-toggle-list"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋 List View</span>
            </button>
            <button
              id="view-toggle-map"
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🗺️ Map View</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          {prospectsList.some(p => !p.email) && (
            <button 
              onClick={handleEnrichAll} 
              disabled={isEnrichingAll}
              className={`flex items-center px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]`}
            >
              {isEnrichingAll ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Auto-Enriching...
                </>
              ) : (
                '✨ Enrich All Contacts'
              )}
            </button>
          )}

          <button onClick={handleCopyToClipboard} className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            {copySuccess ? 'Copied!' : 'Copy Results'}
          </button>
          
          <button onClick={handleDownloadCSV} className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm">
            CSV
          </button>

          <button onClick={handleExportPDF} className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all shadow-sm">
            PDF
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                {getDisplayHeaders().map(h => (
                  <th key={h} className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {prospectsList.map((prospect, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-800 group-hover:text-blue-700">{prospect.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{prospect.phone}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    {prospect.email ? (
                      <span className="italic">{prospect.email}</span>
                    ) : (
                      <button
                        onClick={() => handleEnrichSingle(index)}
                        disabled={loadingIndices[index] || isEnrichingAll}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1.5 rounded-lg border border-blue-200 shadow-sm transition-all hover:scale-105"
                      >
                        {loadingIndices[index] ? (
                          <>
                            <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching...
                          </>
                        ) : (
                          '🔎 Find Contact'
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline">
                    {prospect.website ? (
                      <a href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 group-hover:text-blue-700">
                        {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic font-normal text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-normal text-sm text-slate-600">{prospect.address}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{prospect.city}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{prospect.state}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{prospect.zip}</td>
                  <td className="px-4 py-4 whitespace-normal text-sm text-slate-500 min-w-[220px]">
                    {loadingIndices[index] ? (
                      <span className="text-xs text-blue-600 font-semibold animate-pulse flex items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                        <svg className="animate-spin mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Scanning domain for personnel...
                      </span>
                    ) : (
                      prospect.notes || <span className="text-slate-400 italic text-xs">No facility notes yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <ProspectsMapView 
          prospects={prospectsList}
          searchParams={searchParams}
          onEnrichSingle={handleEnrichSingle}
          loadingIndices={loadingIndices}
        />
      )}

      {data.sourceUrls && data.sourceUrls.length > 0 && (
        <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 animate-fade-in">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.823a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Verified Sources
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {data.sourceUrls.map((source, i) => (
              <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:text-blue-900 hover:underline flex items-center">
                {source.title}
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-end items-center space-x-2 text-xs text-slate-400 font-medium">
        <span>Powered by Gemini 3.5</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span>Google Maps Grounding</span>
      </div>
    </div>
  );
};

export default ProspectResults;