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
    // Access jsPDF from window object (loaded via CDN in index.html)
    const { jsPDF } = (window as any).jspdf;
    // Use landscape orientation for better table fit
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    // Blue 600: #2563EB (37, 99, 235)
    doc.setTextColor(37, 99, 235);
    doc.text("State Chemical Prospect List", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text("Baltimore Market Analysis", 14, 33);

    const headers = [["Name", "Phone", "Email", "Address", "City", "State", "Zip", "Notes"]];
    const dataRows = data.prospects.map(p => [
      p.name,
      p.phone,
      p.email,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.notes
    ]);

    (doc as any).autoTable({
      head: headers,
      body: dataRows,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 35 }, // Name
        1: { cellWidth: 25 }, // Phone
        2: { cellWidth: 25 }, // Email
        3: { cellWidth: 35 }, // Address
        4: { cellWidth: 20 }, // City
        5: { cellWidth: 10 }, // State
        6: { cellWidth: 15 }, // Zip
        7: { cellWidth: 'auto' } // Notes (takes remaining space)
      },
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' }, // Blue 600
      alternateRowStyles: { fillColor: [239, 246, 255] }, // Blue 50
    });

    doc.save("state_chemical_prospects.pdf");
  };

  const handleCopyToClipboard = async () => {
    const headers = getHeaders();
    const rows = data.prospects.map(p => [
      p.name,
      p.phone,
      p.email,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.notes
    ].join('\t'));

    const text = [headers.join('\t'), ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopySuccess('Failed');
    }
  };

  return (
    <div className="max-w-[95%] mx-auto p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Search Results</h2>
           <p className="text-slate-500 text-sm mt-1">Found {data.prospects.length} high-potential businesses</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button
            onClick={handleCopyToClipboard}
            className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm focus:ring-2 focus:ring-slate-200"
          >
            {copySuccess ? (
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m2 4h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2" />
              </svg>
            )}
            {copySuccess || 'Copy to Clipboard'}
          </button>
          
          <button
            onClick={handleDownloadCSV}
            className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm focus:ring-2 focus:ring-blue-100"
          >
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-sm focus:ring-2 focus:ring-red-100"
          >
            <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>

          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/10"
          >
            New Search
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Prospect Name
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Phone
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Address
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  City
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  State
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Zip
                </th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {data.prospects.length > 0 ? (
                data.prospects.map((prospect, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {prospect.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {prospect.phone}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 italic">
                      {prospect.email || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-normal text-sm text-slate-600 max-w-[150px]">
                      {prospect.address}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {prospect.city}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {prospect.state}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {prospect.zip}
                    </td>
                    <td className="px-4 py-4 whitespace-normal text-sm text-slate-500 min-w-[200px]">
                      {prospect.notes}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                       <svg className="h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <p className="text-lg font-medium text-slate-900">No prospects found</p>
                       <p className="text-sm">Try adjusting your search filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex justify-end items-center space-x-2 text-xs text-slate-400 font-medium">
        <span>Powered by Gemini 2.5</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span>Google Maps Intelligence</span>
      </div>
    </div>
  );
};

export default ProspectResults;