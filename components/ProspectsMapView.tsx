import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Prospect } from '../types';

interface ProspectsMapViewProps {
  prospects: Prospect[];
  searchParams: {
    location: string;
    segment: string;
    subSegment: string;
  };
  onEnrichSingle?: (index: number) => Promise<void>;
  loadingIndices?: Record<number, boolean>;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim().length > 10;

// Inner helper component to manage geocoding, list alignment, and bounds fitting
const MapController: React.FC<{
  prospects: Prospect[];
  selectedProspect: Prospect | null;
  setSelectedProspect: (p: Prospect | null) => void;
  coordsMap: Record<string, Coordinates>;
  setCoordsMap: React.Dispatch<React.SetStateAction<Record<string, Coordinates>>>;
  onEnrichSingle?: (index: number) => Promise<void>;
  loadingIndices?: Record<number, boolean>;
}> = ({ 
  prospects, 
  selectedProspect, 
  setSelectedProspect, 
  coordsMap, 
  setCoordsMap,
  onEnrichSingle,
  loadingIndices
}) => {
  const map = useMap();
  const [activeWindow, setActiveWindow] = useState<Prospect | null>(null);

  // Auto-center on selected prospect from the sidebar list
  useEffect(() => {
    if (!map || !selectedProspect) return;
    const fullAddress = `${selectedProspect.address}, ${selectedProspect.city}, ${selectedProspect.state} ${selectedProspect.zip}`;
    const coords = coordsMap[fullAddress];
    if (coords) {
      map.panTo(coords);
      map.setZoom(15);
      setActiveWindow(selectedProspect);
    }
  }, [selectedProspect, coordsMap, map]);

  // Handle geocoding and bounds fitting on load/prospect update
  useEffect(() => {
    if (!map || prospects.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();
    let geocodedCount = 0;
    const activeTimers: number[] = [];

    prospects.forEach((prospect, index) => {
      const fullAddress = `${prospect.address}, ${prospect.city}, ${prospect.state} ${prospect.zip}`;

      // If we already have coordinates cached, include in bounds
      if (coordsMap[fullAddress]) {
        bounds.extend(coordsMap[fullAddress]);
        geocodedCount++;
        if (geocodedCount === prospects.length) {
          map.fitBounds(bounds);
          // Prevent excessive zoom for single locations
          setTimeout(() => {
            const currentZoom = map.getZoom();
            if (currentZoom && currentZoom > 15) {
              map.setZoom(14);
            }
          }, 100);
        }
        return;
      }

      // Stagger queries by 120ms to avoid Google OVER_QUERY_LIMIT error
      const timer = window.setTimeout(() => {
        geocoder.geocode({ address: fullAddress }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const pos = { lat: loc.lat(), lng: loc.lng() };

            setCoordsMap(prev => {
              const updated = { ...prev, [fullAddress]: pos };
              
              // Recalculate bounds with new keys
              const currentBounds = new google.maps.LatLngBounds();
              Object.values(updated).forEach(pCoords => currentBounds.extend(pCoords));
              map.fitBounds(currentBounds);
              
              setTimeout(() => {
                const currentZoom = map.getZoom();
                if (currentZoom && currentZoom > 15) {
                  map.setZoom(14);
                }
              }, 100);

              return updated;
            });
          } else {
            console.warn(`Geocoding failed for "${prospect.name}":`, status);
          }
        });
      }, index * 120);

      activeTimers.push(timer);
    });

    return () => {
      activeTimers.forEach(t => clearTimeout(t));
    };
  }, [map, prospects]);

  return (
    <>
      {prospects.map((prospect, index) => {
        const fullAddress = `${prospect.address}, ${prospect.city}, ${prospect.state} ${prospect.zip}`;
        const coords = coordsMap[fullAddress];
        if (!coords) return null;

        const isSelected = selectedProspect?.name === prospect.name;

        return (
          <React.Fragment key={index}>
            <AdvancedMarker
              position={coords}
              onClick={() => {
                setSelectedProspect(prospect);
                setActiveWindow(prospect);
              }}
            >
              <Pin 
                background={isSelected ? '#2563eb' : '#ef4444'} 
                borderColor={isSelected ? '#1e40af' : '#b91c1c'} 
                glyphColor="#fff"
              />
            </AdvancedMarker>

            {activeWindow?.name === prospect.name && (
              <InfoWindow
                position={coords}
                onCloseClick={() => {
                  setActiveWindow(null);
                  if (isSelected) setSelectedProspect(null);
                }}
              >
                <div className="p-1 max-w-sm font-sans min-w-[200px]">
                  <h4 className="font-extrabold text-slate-900 text-sm mb-1 leading-snug">{prospect.name}</h4>
                  <p className="text-xs text-slate-500 mb-2 leading-normal">{prospect.address}, {prospect.city}</p>
                  
                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                    {prospect.phone && (
                      <div className="flex items-center text-slate-700">
                        <span className="font-bold mr-1">Phone:</span> {prospect.phone}
                      </div>
                    )}
                    
                    {prospect.email ? (
                      <div className="flex items-center text-slate-700">
                        <span className="font-bold mr-1">Email:</span> <span className="italic text-blue-600">{prospect.email}</span>
                      </div>
                    ) : (
                      onEnrichSingle && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-400 italic">No email found</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEnrichSingle(index);
                            }}
                            disabled={loadingIndices?.[index]}
                            className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100/70 text-[10px] font-bold px-2 py-0.5 rounded transition-all shadow-sm"
                          >
                            {loadingIndices?.[index] ? 'Searching...' : '🔎 Find Contact'}
                          </button>
                        </div>
                      )
                    )}
                    
                    {prospect.website && (
                      <div className="flex items-center text-slate-700">
                        <span className="font-bold mr-1">Website:</span> 
                        <a 
                          href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-medium truncate max-w-[150px]"
                        >
                          {prospect.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                    
                    {prospect.notes && (
                      <div className="bg-slate-50 rounded p-1.5 mt-1 text-[11px] text-slate-600 leading-normal max-h-[100px] overflow-y-auto">
                        <span className="font-bold text-slate-700">Facility Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default function ProspectsMapView({ 
  prospects, 
  searchParams, 
  onEnrichSingle, 
  loadingIndices 
}: ProspectsMapViewProps) {
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [coordsMap, setCoordsMap] = useState<Record<string, Coordinates>>({});
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll sidebar list item when selected on the map
  useEffect(() => {
    if (!selectedProspect || !listContainerRef.current) return;
    const selectedEl = document.getElementById(`sidebar-prospect-${selectedProspect.name.replace(/\s+/g, '-')}`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedProspect]);

  if (!hasValidKey) {
    return (
      <div id="maps-credential-panel" className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 my-6">
        <div className="max-w-2xl mx-auto py-4">
          <div className="flex items-center justify-center bg-blue-50 text-blue-600 w-16 h-16 rounded-2xl mb-6 mx-auto shadow-md">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 text-center tracking-tight mb-3">Google Maps Integration Required</h2>
          <p className="text-slate-600 text-center text-sm leading-relaxed mb-8">
            To plot chemical sales leads on an interactive territory map with real-time driving routing and geocoding, please link your Google Maps Platform key.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6 space-y-4 shadow-inner">
            <div className="flex items-start">
              <span className="flex-shrink-0 flex items-center justify-center bg-blue-600 text-white font-bold text-xs w-5 h-5 rounded-full mr-3 mt-0.5">1</span>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Obtain a Google Maps API Key</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Visit the{' '}
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Google Cloud Map Getting Started portal
                  </a>{' '}
                  to activate the Maps SDK for JavaScript and the Geocoding API.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="flex-shrink-0 flex items-center justify-center bg-blue-600 text-white font-bold text-xs w-5 h-5 rounded-full mr-3 mt-0.5">2</span>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Install as AI Studio Workspace Secret</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Open <strong>Settings</strong> (⚙️ gear icon in the top-right toolbar) &rarr; select <strong>Secrets</strong> &rarr; Add a new key named exactly <code className="bg-slate-200 border border-slate-300 font-mono text-[10px] px-1.5 py-0.5 rounded text-red-600">GOOGLE_MAPS_PLATFORM_KEY</code> &rarr; Paste your API key string &rarr; Press <strong>Enter</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="flex-shrink-0 flex items-center justify-center bg-blue-600 text-white font-bold text-xs w-5 h-5 rounded-full mr-3 mt-0.5">3</span>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Automatic Deployment</h4>
                <p className="text-xs text-slate-500 mt-1">
                  The AI Studio builder automatically triggers hot builds to bundle your new credentials into the local proxy container. No page reloads required!
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-slate-400 font-medium pt-2 border-t border-slate-100">
            Once configured, this map screen reveals active routes, heatmaps, and geographic coordinates for all State Chemical prospects.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="prospects-interactive-map-layout" className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row h-[600px] my-4 animate-fade-in">
      {/* Sidebar - Prospect List */}
      <div className="w-full lg:w-[320px] bg-slate-50 border-r border-slate-200 flex flex-col h-[200px] lg:h-full">
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <h3 className="font-extrabold text-slate-900 tracking-tight text-sm uppercase">Prospects Map Index</h3>
          <p className="text-xs text-slate-500 mt-0.5">Click to focus and view on the map</p>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1" ref={listContainerRef}>
          {prospects.map((prospect, idx) => {
            const isSelected = selectedProspect?.name === prospect.name;
            const fullAddress = `${prospect.address}, ${prospect.city}, ${prospect.state} ${prospect.zip}`;
            const isGeocoded = Boolean(coordsMap[fullAddress]);

            return (
              <button
                key={idx}
                id={`sidebar-prospect-${prospect.name.replace(/\s+/g, '-')}`}
                onClick={() => setSelectedProspect(prospect)}
                className={`w-full text-left p-2.5 rounded-xl transition-all border ${
                  isSelected 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md font-medium scale-[1.01]' 
                    : 'bg-white hover:bg-slate-100/70 border-slate-200/60 text-slate-800 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-xs font-bold font-sans ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {idx + 1}. {prospect.name}
                  </span>
                  {!isGeocoded && (
                    <span className="flex-shrink-0 animate-pulse text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-semibold border border-slate-200/50">
                      Geocoding...
                    </span>
                  )}
                </div>
                <div className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {prospect.address}, {prospect.city}
                </div>
                {prospect.phone && (
                  <div className={`text-[9px] mt-0.5 flex items-center ${isSelected ? 'text-blue-200' : 'text-slate-400 font-medium'}`}>
                    📞 {prospect.phone}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Display area */}
      <div className="flex-1 min-h-[400px] lg:h-full relative bg-slate-100">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={{ lat: 39.27, lng: -76.51 }} // standard fallback (Dundalk/Baltimore MD area context)
            defaultZoom={12}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <MapController
              prospects={prospects}
              selectedProspect={selectedProspect}
              setSelectedProspect={setSelectedProspect}
              coordsMap={coordsMap}
              setCoordsMap={setCoordsMap}
              onEnrichSingle={onEnrichSingle}
              loadingIndices={loadingIndices}
            />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
