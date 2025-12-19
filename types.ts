export interface MarketSegment {
  id: string;
  name: string;
  subSegments: string[];
}

export type SearchMode = 'broad' | 'targeted'; // Simplified modes

export interface SearchParams {
  location: string; // "Baltimore, MD", "19104", "Delaware", etc.
  segment?: string;
  subSegment?: string;
}

export interface Prospect {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

export interface ProspectResult {
  prospects: Prospect[];
}

export interface SavedSearch {
  id: string;
  timestamp: number;
  params: SearchParams;
  resultCount: number;
  results: ProspectResult;
}