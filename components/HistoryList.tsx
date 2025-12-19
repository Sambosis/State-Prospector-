import React from 'react';
import { SavedSearch } from '../types';

interface HistoryListProps {
  history: SavedSearch[];
  onLoadSearch: (search: SavedSearch) => void;
  onDeleteSearch: (id: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onLoadSearch, onDeleteSearch }) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-12 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Saved Sessions</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => (
          <div 
            key={item.id}
            className="group bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative"
            onClick={() => onLoadSearch(item)}
          >
            <div className="flex justify-between items-start mb-2">
               <div className="bg-slate-100 rounded-md px-2 py-1 text-xs font-bold text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                  {item.params.location}
               </div>
               <span className="text-[10px] text-slate-400">
                 {new Date(item.timestamp).toLocaleDateString()}
               </span>
            </div>
            
            <p className="text-sm font-medium text-slate-800 mb-1 truncate">
              {item.params.segment 
                ? `${item.params.subSegment || item.params.segment}` 
                : "Broad Market Search"}
            </p>
            
            <p className="text-xs text-slate-500">
              {item.resultCount} prospects found
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSearch(item.id);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete Search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;