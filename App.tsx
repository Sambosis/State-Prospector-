import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SegmentSelector from './components/SegmentSelector';
import ProspectResults from './components/ProspectResults';
import HistoryList from './components/HistoryList';
import { SearchParams, ProspectResult, SavedSearch } from './types';
import { searchProspects } from './services/geminiService';
import { getSavedSearches, saveSearch, deleteSavedSearch } from './services/storageService';

type ToolStatus = 'idle' | 'processing' | 'success' | 'error';

interface DiagnosticState {
  maps: ToolStatus;
  search: ToolStatus;
  synthesis: ToolStatus;
}

const App: React.FC = () => {
  const [location, setLocation] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedSubSegment, setSelectedSubSegment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({
    maps: 'idle',
    search: 'idle',
    synthesis: 'idle'
  });
  
  const [locating, setLocating] = useState(false);
  const [results, setResults] = useState<ProspectResult | null>(null);
  const [error, setError] = useState<{message: string, tool?: keyof DiagnosticState} | null>(null);
  
  const [history, setHistory] = useState<SavedSearch[]>([]);
  const [userCoords, setUserCoords] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    setHistory(getSavedSearches());
  }, []);

  // Diagnostic Animation Logic
  useEffect(() => {
    let timer: any;
    if (loading && !error) {
      setDiagnostic({ maps: 'processing', search: 'idle', synthesis: 'idle' });
      
      timer = setTimeout(() => {
        setDiagnostic(prev => ({ ...prev, maps: 'success', search: 'processing' }));
        
        timer = setTimeout(() => {
          setDiagnostic(prev => ({ ...prev, search: 'success', synthesis: 'processing' }));
        }, 3500);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [loading, error]);

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError({ message: "Geolocation is not supported by your browser." });
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocation("Current Location");
        setLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        let msg = "Could not retrieve your location.";
        if (err.code === 1) msg = "Location access denied. Please enable it in browser settings.";
        setError({ message: msg });
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLocation = location.trim();
    if (!cleanLocation) {
      setError({ message: "Please enter a city, state, or region." });
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setDiagnostic({ maps: 'processing', search: 'idle', synthesis: 'idle' });

    const params: SearchParams = {
      location: cleanLocation,
      segment: selectedSegment || undefined,
      subSegment: selectedSubSegment || undefined,
      latLng: userCoords || undefined
    };

    try {
      const data = await searchProspects(params);
      
      if (!data.prospects || data.prospects.length === 0) {
        setError({ message: `No verified prospects found for "${cleanLocation}". Try a broader area or segment.` });
        setDiagnostic({ maps: 'error', search: 'error', synthesis: 'error' });
      } else {
        setDiagnostic({ maps: 'success', search: 'success', synthesis: 'success' });
        // Small delay to show success states before results pop in
        setTimeout(() => {
          setResults(data);
          const updatedHistory = saveSearch(params, data);
          setHistory(updatedHistory);
          setLoading(false);
        }, 800);
        return; // Success handles its own loading state change
      }
    } catch (err: any) {
      console.error("App Error:", err);
      const tool = err.message.toLowerCase().includes('maps') ? 'maps' : 
                   err.message.toLowerCase().includes('search') ? 'search' : 'synthesis';
      
      setError({ 
        message: err.message || "A system error occurred during lead generation.",
        tool: tool as keyof DiagnosticState
      });
      
      setDiagnostic(prev => ({
        ...prev,
        [tool]: 'error'
      }));
    } finally {
      // In case of error, stop loading immediately
      if (!results) setLoading(false);
    }
  };

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setLocation(saved.params.location);
    setSelectedSegment(saved.params.segment || '');
    setSelectedSubSegment(saved.params.subSegment || '');
    setResults(saved.results);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSavedSearch = (id: string) => {
    const updated = deleteSavedSearch(id);
    setHistory(updated);
  };

  const resetSearch = () => {
    setResults(null);
    setError(null);
    setLoading(false);
  };

  const renderStatusIcon = (status: ToolStatus) => {
    switch (status) {
      case 'processing':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        );
      case 'success':
        return (
          <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full check-pop">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-100 text-red-600 p-1.5 rounded-full animate-shake">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return <div className="w-6 h-6 border-2 border-slate-100 rounded-full"></div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-100 selection:text-blue-800 font-sans">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-start pt-8 pb-12 px-4 sm:px-6">
        {results ? (
          <div className="w-full animate-fade-in-up">
            <ProspectResults data={results} onBack={resetSearch} />
          </div>
        ) : (
          <div className="w-full max-w-4xl animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Intelligence-Driven Prospecting
              </h2>
              <p className="mt-3 text-lg text-slate-600 max-w-xl mx-auto">
                Real-time lead generation for <span className="text-blue-600 font-semibold">State Chemical</span> using Gemini & Google Maps.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden mb-8">
              <div className="p-8">
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Search Territory
                      </label>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={location}
                        disabled={loading}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          if (userCoords && e.target.value !== "Current Location") {
                            setUserCoords(null);
                          }
                        }}
                        placeholder="e.g. Baltimore, MD or 21201"
                        className="w-full rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 pl-11 pr-14 p-4 border transition-all duration-200 ease-in-out font-medium text-lg disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={locating || loading}
                        title="Use current location"
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                          locating 
                            ? 'text-blue-500 bg-blue-50 animate-pulse' 
                            : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 disabled:opacity-30'
                        }`}
                      >
                        {locating ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.14l1.29-1.29m1.29-1.29l1.29-1.29m1.29-1.29l1.29-1.29m1.29-1.29l1.29-1.29m1.29-1.29l1.29-1.29m1.29-1.29l1.29-1.29M12 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.14l-1.29 1.29m-1.29 1.29l-1.29 1.29m-1.29 1.29l-1.29 1.29m-1.29 1.29l-1.29 1.29m-1.29 1.29l-1.29 1.29m-1.29 1.29l-1.29 1.29m-1.29 1.29l-1.29 1.29" />
                            <circle cx="12" cy="11" r="3" strokeWidth={2} />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div>
                     <SegmentSelector
                        selectedSegment={selectedSegment}
                        selectedSubSegment={selectedSubSegment}
                        onSelectSegment={setSelectedSegment}
                        onSelectSubSegment={setSelectedSubSegment}
                      />
                  </div>

                  {error && (
                    <div className={`p-4 rounded-xl shadow-sm flex items-start animate-shake ${error.tool ? 'bg-orange-50 border-l-4 border-orange-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                      <svg className={`h-5 w-5 mr-3 mt-0.5 shrink-0 ${error.tool ? 'text-orange-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1">
                          {error.tool ? `${error.tool.toUpperCase()} DIAGNOSTIC` : 'Search Insight'}
                        </p>
                        <p className={`text-sm font-medium ${error.tool ? 'text-orange-700' : 'text-red-700'}`}>{error.message}</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !location.trim()}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-blue-600/20 transition-all transform duration-200 flex items-center justify-center text-lg ${
                      loading || !location.trim()
                        ? 'bg-slate-400 cursor-not-allowed opacity-80'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:to-blue-400 hover:scale-[1.01] hover:shadow-blue-600/30 active:scale-[0.98]'
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Initializing Services...
                      </>
                    ) : (
                      'Find Prospects'
                    )}
                  </button>
                </form>
              </div>
            </div>

            {loading && (
              <div className="w-full bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-slide-up mb-8">
                <div className="bg-blue-600 px-8 py-3 flex justify-between items-center">
                  <span className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">Diagnostic Dashboard</span>
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tool 1: Maps */}
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${diagnostic.maps === 'processing' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-3">
                        {renderStatusIcon(diagnostic.maps)}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${diagnostic.maps === 'processing' ? 'text-blue-600' : 'text-slate-400'}`}>Geospatial Engine</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Google Maps</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Retrieving proximity-based business locations and verified addresses.</p>
                    </div>

                    {/* Tool 2: Search */}
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${diagnostic.search === 'processing' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-3">
                        {renderStatusIcon(diagnostic.search)}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${diagnostic.search === 'processing' ? 'text-blue-600' : 'text-slate-400'}`}>Web Intelligence</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Grounding Search</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Scanning official domains for contact points and facility profiles.</p>
                    </div>

                    {/* Tool 3: Model */}
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${diagnostic.synthesis === 'processing' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-3">
                        {renderStatusIcon(diagnostic.synthesis)}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${diagnostic.synthesis === 'processing' ? 'text-blue-600' : 'text-slate-400'}`}>Lead Synthesis</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Gemini Reasoning</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Processing data points into actionable B2B prospect lists.</p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                     <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                          style={{ 
                            width: diagnostic.synthesis === 'processing' ? '90%' : 
                                   diagnostic.search === 'processing' ? '60%' : 
                                   diagnostic.maps === 'processing' ? '30%' : '0%' 
                          }}
                        ></div>
                     </div>
                     <div className="flex justify-center">
                        <p className="text-xs text-slate-400 font-medium animate-pulse italic">
                          Engaging deep-search protocols for {location || "target territory"}...
                        </p>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && <HistoryList 
              history={history} 
              onLoadSearch={handleLoadSavedSearch} 
              onDeleteSearch={handleDeleteSavedSearch} 
            />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;