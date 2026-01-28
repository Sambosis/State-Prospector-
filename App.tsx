import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SegmentSelector from './components/SegmentSelector';
import ProspectResults from './components/ProspectResults';
import HistoryList from './components/HistoryList';
import { SearchParams, ProspectResult, SavedSearch } from './types';
import { searchProspects } from './services/geminiService';
import { getSavedSearches, saveSearch, deleteSavedSearch } from './services/storageService';

const App: React.FC = () => {
  const [location, setLocation] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedSubSegment, setSelectedSubSegment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<SavedSearch[]>([]);
  const [userCoords, setUserCoords] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    setHistory(getSavedSearches());
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.debug("Geolocation disabled", err),
        { timeout: 5000 }
      );
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLocation = location.trim();
    if (!cleanLocation) {
      setError("Please enter a city, state, or region.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const params: SearchParams = {
      location: cleanLocation,
      segment: selectedSegment || undefined,
      subSegment: selectedSubSegment || undefined,
      latLng: userCoords || undefined
    };

    try {
      const data = await searchProspects(params);
      
      if (!data.prospects || data.prospects.length === 0) {
        setError(`No verified prospects found for "${cleanLocation}". Try searching for a specific city name like 'Baltimore, MD'.`);
      } else {
        setResults(data);
        const updatedHistory = saveSearch(params, data);
        setHistory(updatedHistory);
      }
    } catch (err: any) {
      console.error("App Error:", err);
      setError(err.message || "The prospecting engine encountered a temporary problem. Please try again.");
    } finally {
      setLoading(false);
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

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <div className="p-8">
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">
                      Search Territory
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Baltimore, MD or 21201"
                        className="w-full rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 pl-11 p-4 border transition-all duration-200 ease-in-out font-medium text-lg"
                      />
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
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-xl shadow-sm flex items-start animate-shake">
                      <svg className="h-5 w-5 text-red-500 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-bold">Search Insight</p>
                        <p className="text-red-600 opacity-90">{error}</p>
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
                        Synthesizing Leads...
                      </>
                    ) : (
                      'Find Prospects'
                    )}
                  </button>
                </form>
              </div>
            </div>

            <HistoryList 
              history={history} 
              onLoadSearch={handleLoadSavedSearch} 
              onDeleteSearch={handleDeleteSavedSearch} 
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;