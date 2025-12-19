import { SavedSearch, SearchParams, ProspectResult } from '../types';

const STORAGE_KEY = 'state_chem_prospector_history';

export const getSavedSearches = (): SavedSearch[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveSearch = (params: SearchParams, results: ProspectResult): SavedSearch[] => {
  const history = getSavedSearches();
  
  const newSearch: SavedSearch = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    params,
    resultCount: results.prospects.length,
    results
  };

  // Keep latest 20 searches
  const updatedHistory = [newSearch, ...history].slice(0, 20);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Failed to save history", e);
  }

  return updatedHistory;
};

export const deleteSavedSearch = (id: string): SavedSearch[] => {
  const history = getSavedSearches().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};