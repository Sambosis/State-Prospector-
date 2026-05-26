import React, { useState, useEffect } from 'react';
import { MARKET_SEGMENTS } from '../constants';

interface SegmentSelectorProps {
  selectedSegment: string;
  selectedSubSegment: string;
  onSelectSegment: (segment: string) => void;
  onSelectSubSegment: (subSegment: string) => void;
}

const SegmentIcons: Record<string, React.ReactNode> = {
  'all': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z" />
    </svg>
  ),
  'residential': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  'education': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  'healthcare': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  'government': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m18 4v-4M10 21V7a2 2 0 012-2h0a2 2 0 012 2v14m-7 0h10M5 21h14M5 10l7-7 7 7" />
    </svg>
  ),
  'commercial': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  'industrial': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.823a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  'specialized': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
  )
};

const SegmentSelector: React.FC<SegmentSelectorProps> = ({
  selectedSegment,
  selectedSubSegment,
  onSelectSegment,
  onSelectSubSegment,
}) => {
  const [openSegmentId, setOpenSegmentId] = useState<string | null>(null);

  // Sync open state with selected segment if changed externally
  useEffect(() => {
    if (selectedSegment) {
      const segment = MARKET_SEGMENTS.find(s => s.name === selectedSegment);
      if (segment) {
        setOpenSegmentId(segment.id);
      } else if (selectedSegment === '') {
        setOpenSegmentId('all');
      }
    } else {
      setOpenSegmentId('all');
    }
  }, [selectedSegment]);

  const toggleAccordion = (id: string, name: string) => {
    if (openSegmentId === id) {
      setOpenSegmentId(null);
    } else {
      setOpenSegmentId(id);
      onSelectSegment(name);
      onSelectSubSegment(''); // Reset sub-segment when switching main categories
    }
  };

  const handleSelectAll = () => {
    setOpenSegmentId('all');
    onSelectSegment('');
    onSelectSubSegment('');
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
          Industry Focus
        </label>
        {selectedSegment !== '' && (
          <button 
            type="button"
            onClick={handleSelectAll}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* All Segments Option */}
        <div 
          className={`border rounded-xl transition-all duration-300 overflow-hidden ${
            openSegmentId === 'all' && selectedSegment === ''
              ? 'border-blue-200 bg-blue-50/20 shadow-sm' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <button
            type="button"
            onClick={handleSelectAll}
            className="w-full flex items-center justify-between p-4 focus:outline-none group"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors ${
                selectedSegment === '' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}>
                {SegmentIcons['all']}
              </div>
              <div className="text-left">
                <span className={`text-sm font-bold tracking-tight block transition-colors ${
                  selectedSegment === '' ? 'text-blue-900' : 'text-slate-700 group-hover:text-slate-900'
                }`}>
                  All Market Segments
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Broad market-wide search</span>
              </div>
            </div>
            {selectedSegment === '' && (
              <div className="text-blue-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {MARKET_SEGMENTS.map((seg) => {
          const isOpen = openSegmentId === seg.id;
          const isSelected = selectedSegment === seg.name;

          return (
            <div 
              key={seg.id} 
              className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                isOpen 
                  ? 'border-blue-300 bg-white shadow-md ring-1 ring-blue-100' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleAccordion(seg.id, seg.name)}
                className="w-full flex items-center justify-between p-4 focus:outline-none group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}>
                    {SegmentIcons[seg.id] || SegmentIcons['specialized']}
                  </div>
                  <span className={`text-sm font-bold tracking-tight transition-colors ${
                    isSelected ? 'text-blue-900' : 'text-slate-700 group-hover:text-slate-900'
                  }`}>
                    {seg.name}
                  </span>
                </div>
                
                <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <div 
                className={`transition-all duration-300 ease-in-out bg-slate-50/50 ${
                  isOpen ? 'max-h-[800px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="p-3 sm:p-4">
                  <div className="space-y-3">
                    {/* General Option - Distinct */}
                    <button
                      type="button"
                      onClick={() => onSelectSubSegment('')}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        selectedSubSegment === ''
                          ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm ring-1 ring-blue-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white hover:text-slate-800 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-2.5 ${selectedSubSegment === '' ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                        General {seg.name}
                      </span>
                      {selectedSubSegment === '' && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Sub-segments Divider */}
                    {seg.subSegments.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="h-px bg-slate-200 flex-grow"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specific Niches</span>
                        <div className="h-px bg-slate-200 flex-grow"></div>
                      </div>
                    )}

                    {/* Sub-segments Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {seg.subSegments.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => onSelectSubSegment(sub)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all border h-full flex items-center ${
                            selectedSubSegment === sub
                              ? 'bg-white text-blue-700 border-blue-500 shadow-sm ring-1 ring-blue-500 z-10'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/50'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {!selectedSegment && (
        <p className="text-[11px] text-slate-400 font-medium italic mt-2 ml-1">
          Perform a broad search or select a category to refine your results.
        </p>
      )}
    </div>
  );
};

export default SegmentSelector;