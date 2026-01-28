import React, { useState } from 'react';
import { ProspectResult } from '../types';

interface ProspectResultsProps {
  data: ProspectResult;
  onBack: () => void;
}

const ProspectResults: React.FC<ProspectResultsProps> = ({ data, onBack }) => {
  const [copySuccess, setCopySuccess] = useState('');

  const getHeaders = () => ["Prospect Name", "Phone", "Email", "Address", "City", "State", "Zip", "Notes"];

  const handleDownloadCSV = () => {
    const headers = getHeaders();
    const rows = data.prospects.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.phone.replace(/"/g, '""')}"`,
      `"${p.email.replace(/"/g, '""')}"`,
      `"${p.address.replace(/"/g, '""')}"`,
      `"${p.city.replace(/"/g, '""')}"`,
      `"${p.state.replace(/"/g, '""')}"`,
      `"${p.zip.replace(/"/g, '""')}"`,
      `"${p.notes.replace(/"/g, '""')}"`
    ]);

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

    const headers = [["Name", "Phone", "Email", "Address", "City", "State", "Zip", "Notes"]];
    const dataRows = data.prospects.map(p => [
      p.name, p.phone, p.email, p.address, p.city, p.state, p.zip, p.notes
    ]);

    (doc as any).autoTable({
      head: headers,
      body: dataRows,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
    });

    doc.save("state_chemical_prospects.pdf");
  };

  const handleCopyToClipboard = async () => {
    const headers = getHeaders();
    const rows = data.prospects.map(p => [
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Search Results</h2>
           <p className="text-slate-500 text-sm mt-1">Found {data.prospects.length} verified businesses</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button onClick={handleCopyToClipboard} className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            {copySuccess ? 'Copied!' : 'Copy Results'}
          </button>
          
          <button onClick={handleDownloadCSV} className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm">
            CSV
          </button>

          <button onClick={handleExportPDF} className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all shadow-sm">
            PDF
          </button>

          <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-all shadow-lg">
            New Search
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                {getHeaders().map(h => (
                  <th key={h} className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {data.prospects.map((prospect, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-800 group-hover:text-blue-700">{prospect.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{prospect.phone}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 italic">{prospect.email}</td>
                  <td className="px-4 py-4 whitespace-normal text-sm text-slate-600">{prospect.address}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{prospect.city}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{prospect.state}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{prospect.zip}</td>
                  <td className="px-4 py-4 whitespace-normal text-sm text-slate-500 min-w-[200px]">{prospect.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
        <span>Powered by Gemini 2.5</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span>Google Maps Grounding</span>
      </div>
    </div>
  );
};

export default ProspectResults;