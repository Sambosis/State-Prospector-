import React from 'react';
import { MARKET_SEGMENTS } from '../constants';

interface SegmentSelectorProps {
  selectedSegment: string;
  selectedSubSegment: string;
  onSelectSegment: (segment: string) => void;
  onSelectSubSegment: (subSegment: string) => void;
}

const SegmentSelector: React.FC<SegmentSelectorProps> = ({
  selectedSegment,
  selectedSubSegment,
  onSelectSegment,
  onSelectSubSegment,
}) => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="group">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 ml-1">
          Market Segment
        </label>
        <div className="relative">
          <select
            value={selectedSegment}
            onChange={(e) => {
              onSelectSegment(e.target.value);
              onSelectSubSegment(''); // Reset sub-segment when main segment changes
            }}
            className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 text-slate-700 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 p-3.5 border transition-all duration-200 ease-in-out font-medium"
          >
            <option value="">Select a segment...</option>
            {MARKET_SEGMENTS.map((seg) => (
              <option key={seg.id} value={seg.name}>
                {seg.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {selectedSegment && (
        <div className="group animate-slide-up">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 ml-1">
            Specific Type (Optional)
          </label>
          <div className="relative">
            <select
              value={selectedSubSegment}
              onChange={(e) => onSelectSubSegment(e.target.value)}
              className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 text-slate-700 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 p-3.5 border transition-all duration-200 ease-in-out font-medium"
            >
              <option value="">All {selectedSegment}</option>
              {MARKET_SEGMENTS.find((s) => s.name === selectedSegment)?.subSegments.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentSelector;