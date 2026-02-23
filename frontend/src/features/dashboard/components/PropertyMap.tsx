import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, TextField, InputAdornment, IconButton, CircularProgress, FormControlLabel, Checkbox, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Map as MapIcon, SatelliteAlt as SatelliteIcon } from '@mui/icons-material';
import type { Contact } from './types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MIN_ZOOM_PARCELS = 13;
const PARCEL_DEBOUNCE_MS = 700;
const OVERPASS_TIMEOUT = 25;

const parcelStyle = { color: '#1565c0', weight: 2, fillColor: '#42a5f5', fillOpacity: 0.4 };
const parcelStyleHover = { color: '#0d47a1', weight: 3, fillColor: '#1e88e5', fillOpacity: 0.65 };

function formatAddressFromTags(tags: Record<string, string> | undefined): string {
  if (!tags) return 'No address data';
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    [tags['addr:city'], tags['addr:state']].filter(Boolean).join(', '),
    tags['addr:postcode'],
    tags['addr:country'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : (tags['addr:full'] || '');
}

function formatParcelPopupContent(tags: Record<string, string> | undefined): string {
  if (!tags) return 'Parcel';
  const address = formatAddressFromTags(tags);
  if (address && address !== 'No address data') return address;
  const parts: string[] = [];
  if (tags['name']) parts.push(tags['name']);
  if (tags['building']) parts.push(`Building: ${tags['building']}`);
  if (tags['landuse']) parts.push(`Land use: ${tags['landuse']}`);
  if (tags['amenity']) parts.push(tags['amenity']);
  if (tags['shop']) parts.push(`Shop: ${tags['shop']}`);
  if (tags['leisure']) parts.push(tags['leisure']);
  if (tags['addr:street'] && !tags['addr:housenumber']) parts.push(tags['addr:street']);
  return parts.length ? parts.join(' · ') : 'Parcel (no details)';
}

function overpassBbox(bounds: L.LatLngBounds): string {
  const s = bounds.getSouth();
  const w = bounds.getWest();
  const n = bounds.getNorth();
  const e = bounds.getEast();
  return `${s},${w},${n},${e}`;
}

async function fetchParcelAddresses(bounds: L.LatLngBounds): Promise<GeoJSON.FeatureCollection> {
  const bbox = overpassBbox(bounds);
  const query = `[out:json][timeout:${OVERPASS_TIMEOUT}];
(
  node["addr:housenumber"](${bbox});
  node["addr:street"](${bbox});
  way["building"](${bbox});
  way["landuse"](${bbox});
  way["amenity"](${bbox});
  way["leisure"](${bbox});
);
out body geom;
>;
out skel qt;`;
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error('Overpass request failed');
  const data = await res.json();
  const features: GeoJSON.Feature[] = [];
  (data.elements || []).forEach((el: { type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }) => {
    if (el.type === 'node' && el.lat != null && el.lon != null) {
      if (el.tags && (el.tags['addr:housenumber'] || el.tags['addr:street'])) {
        features.push({
          type: 'Feature',
          id: el.id,
          properties: { ...el.tags, _osmType: 'node' },
          geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
        });
      }
    }
    if (el.type === 'way' && el.geometry && el.geometry.length >= 3) {
      const coords = el.geometry.map((g: { lat: number; lon: number }) => [g.lon, g.lat]);
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) coords.push(coords[0]);
      features.push({
        type: 'Feature',
        id: el.id,
        properties: { ...el.tags, _osmType: 'way' },
        geometry: { type: 'Polygon', coordinates: [coords] },
      });
    }
  });
  return { type: 'FeatureCollection', features };
}

// Fix default marker icon in bundler (broken paths)
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // US center
const DEFAULT_ZOOM = 4;

function buildAddressString(contact: Contact): string {
  const parts = [
    contact.address,
    contact.city,
    contact.state,
    contact.zip,
  ].filter(Boolean);
  return parts.join(', ');
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=0`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CRM-PropertyMap/1.0 (https://github.com/crm-system)',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {
    // ignore
  }
  return null;
}

/** Photon (Komoot) geocoder - CORS-friendly, good for in-browser search. */
async function geocodeWithPhoton(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feat = data?.features?.[0];
    const coords = feat?.geometry?.coordinates; // [lon, lat]
    if (Array.isArray(coords) && coords.length >= 2) {
      return [Number(coords[1]), Number(coords[0])];
    }
  } catch {
    // ignore
  }
  return null;
}

async function geocodeSearchAddress(address: string): Promise<[number, number] | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const fromNominatim = await geocodeAddress(trimmed);
  if (fromNominatim) return fromNominatim;
  return geocodeWithPhoton(trimmed);
}

function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function MapCenterOnAddress({
  address,
  onCentered,
}: {
  address: string | null;
  onCentered: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!address?.trim()) return;
    let cancelled = false;
    geocodeAddress(address.trim()).then((coords) => {
      if (!cancelled && coords) {
        map.setView(coords, 14);
      }
      onCentered();
    });
    return () => { cancelled = true; };
  }, [address, map, onCentered]);
  return null;
}

function ParcelAddressLayer({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    const load = () => {
      const zoom = map.getZoom();
      if (zoom < MIN_ZOOM_PARCELS) {
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }
        return;
      }
      const bounds = map.getBounds();
      fetchParcelAddresses(bounds)
        .then((geojson) => {
          if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
          }
          const layer = L.geoJSON(geojson, {
            style: () => parcelStyle,
            pointToLayer: (_, latlng) => {
              const marker = L.circleMarker(latlng, {
                radius: 8,
                ...parcelStyle,
                fillOpacity: 0.7,
              });
              marker.on('mouseover', function (this: L.CircleMarker) {
                this.setStyle(parcelStyleHover);
                this.setRadius(10);
                map.getContainer().style.cursor = 'pointer';
              });
              marker.on('mouseout', function (this: L.CircleMarker) {
                this.setStyle(parcelStyle);
                this.setRadius(8);
                map.getContainer().style.cursor = '';
              });
              return marker;
            },
            onEachFeature: (feature, leafletLayer) => {
              const props = feature.properties || {};
              const content = formatParcelPopupContent(props as Record<string, string>);
              leafletLayer.bindPopup(content, { maxWidth: 320 });
              const pathLayer = leafletLayer as L.Path;
              pathLayer.on('mouseover', function (this: L.Path) {
                this.setStyle(parcelStyleHover);
                this.bringToFront();
                map.getContainer().style.cursor = 'pointer';
              });
              pathLayer.on('mouseout', function (this: L.Path) {
                this.setStyle(parcelStyle);
                map.getContainer().style.cursor = '';
              });
            },
          });
          layer.addTo(map);
          layerRef.current = layer;
        })
        .catch(() => {
          if (layerRef.current) map.removeLayer(layerRef.current);
          layerRef.current = null;
        });
    };

    const onMoveEnd = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(load, PARCEL_DEBOUNCE_MS);
    };
    load();
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled]);

  return null;
}

interface PropertyMapProps {
  contact: Contact;
  height?: number;
  /** When set, map will geocode and center on this address, then clear (via onCentered). */
  centerOnAddress?: string | null;
  onCentered?: () => void;
}

const PropertyMap: React.FC<PropertyMapProps> = ({ contact, height = 280, centerOnAddress = null, onCentered }) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPosition, setSearchPosition] = useState<[number, number] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showParcels, setShowParcels] = useState(true);
  const [mapView, setMapView] = useState<'streets' | 'satellite'>('streets');
  const addressString = buildAddressString(contact);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchPosition(null);
    setSearchError(null);
    try {
      const coords = await geocodeSearchAddress(q);
      if (coords) {
        setSearchPosition(coords);
      } else {
        setSearchError('Address not found. Try a different search.');
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchPosition(null);
    setSearchError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const lat = contact.latitude != null && contact.latitude.trim() !== '' ? parseFloat(contact.latitude) : NaN;
    const lng = contact.longitude != null && contact.longitude.trim() !== '' ? parseFloat(contact.longitude) : NaN;
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setPosition([lat, lng]);
      setLoading(false);
      return;
    }

    if (addressString) {
      geocodeAddress(addressString).then((coords) => {
        if (!cancelled && coords) setPosition(coords);
        if (!cancelled) setLoading(false);
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [contact.latitude, contact.longitude, addressString]);

  const center = searchPosition ?? position ?? DEFAULT_CENTER;
  const zoom = (searchPosition ?? position) ? 14 : DEFAULT_ZOOM;

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Property location
        </Typography>
        {addressString && !position && !loading && (
          <Typography component="span" variant="caption" color="text.disabled">
            (could not geocode — add Latitude/Longitude for precise pin)
          </Typography>
        )}
        {!addressString && !position && (
          <Typography component="span" variant="caption" color="text.disabled">
            Add property address or Latitude/Longitude to see location
          </Typography>
        )}
        <FormControlLabel
          control={<Checkbox size="small" checked={showParcels} onChange={(_, v) => setShowParcels(v)} />}
          label={<Typography variant="caption">Show parcels &amp; addresses</Typography>}
          sx={{ ml: 1 }}
        />
      </Stack>
      <Box sx={{ height, width: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={2}
          maxZoom={22}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          {mapView === 'streets' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxNativeZoom={19}
              maxZoom={22}
            />
          ) : (
            <TileLayer
              attribution="&copy; Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={19}
              maxZoom={22}
            />
          )}
          {typeof process !== 'undefined' && process.env?.REACT_APP_REGRID_TILE_URL && (
            <TileLayer
              attribution='Parcel data &copy; <a href="https://regrid.com">Regrid</a>'
              url={process.env.REACT_APP_REGRID_TILE_URL}
              maxNativeZoom={22}
              maxZoom={22}
              zIndex={5}
            />
          )}
          {position && (
            <Marker position={position} icon={markerIcon}>
              <Popup>
                {addressString || `${contact.latitude}, ${contact.longitude}`}
              </Popup>
            </Marker>
          )}
          {searchPosition && (
            <Marker position={searchPosition} icon={markerIcon}>
              <Popup>Search: {searchQuery.trim()}</Popup>
            </Marker>
          )}
          <MapCenterUpdater center={center} zoom={zoom} />
          {centerOnAddress != null && onCentered && (
            <MapCenterOnAddress address={centerOnAddress} onCentered={onCentered} />
          )}
          <ParcelAddressLayer enabled={showParcels} />
        </MapContainer>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            left: 8,
            display: 'flex',
            justifyContent: 'flex-end',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <Box sx={{ pointerEvents: 'auto', width: '100%', maxWidth: 320 }}>
            <TextField
              size="small"
              placeholder="Search address or place..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              fullWidth
              error={Boolean(searchError)}
              helperText={searchError}
              InputProps={{
                sx: { bgcolor: 'background.paper', boxShadow: 1 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {searching ? (
                      <CircularProgress size={20} />
                    ) : (
                      <>
                        <IconButton size="small" onClick={handleSearch} aria-label="Search" disabled={!searchQuery.trim()}>
                          <SearchIcon fontSize="small" />
                        </IconButton>
                        {searchPosition && (
                          <IconButton size="small" onClick={clearSearch} aria-label="Clear search">
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        )}
                      </>
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <ToggleButtonGroup
            value={mapView}
            exclusive
            onChange={(_, v) => v != null && setMapView(v)}
            size="small"
            sx={{ bgcolor: 'background.paper', boxShadow: 1, '& .MuiToggleButton-root': { py: 0.5, px: 1.25 } }}
          >
            <ToggleButton value="streets" aria-label="Street map">
              <MapIcon sx={{ mr: 0.5, fontSize: 18 }} /> Map
            </ToggleButton>
            <ToggleButton value="satellite" aria-label="Satellite view">
              <SatelliteIcon sx={{ mr: 0.5, fontSize: 18 }} /> Satellite
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Box>
  );
};

export default PropertyMap;
