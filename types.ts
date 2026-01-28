export interface MarketSegment {
  id: string;
  name: string;
  subSegments: string[];
}

export type SearchMode = 'broad' | 'targeted';

export interface SearchParams {
  location: string;
  segment?: string;
  subSegment?: string;
  latLng?: {
    latitude: number;
    longitude: number;
  };
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

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ProspectResult {
  prospects: Prospect[];
  sourceUrls?: GroundingSource[];
}

export interface SavedSearch {
  id: string;
  timestamp: number;
  params: SearchParams;
  resultCount: number;
  results: ProspectResult;
}