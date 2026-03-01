import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js';
import { Box, Typography, TextField, InputAdornment, IconButton, CircularProgress, FormControlLabel, Checkbox, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Map as MapIcon, SatelliteAlt as SatelliteIcon } from '@mui/icons-material';
import type { Contact } from './types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MIN_ZOOM_PARCELS = 10;
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

/** ArcGIS Feature Server layer URL (e.g. https://gis.hctx.net/arcgis/rest/services/.../FeatureServer/0) */
const ARCGIS_PARCEL_LAYER_URL =
  typeof process !== 'undefined' ? process.env.REACT_APP_PARCEL_ARCGIS_FEATURESERVER_URL || '' : '';

/** Your Parcel API base URL (e.g. http://localhost:8001) — fetches /parcels by bbox when "Show parcels" is on */
const PARCEL_API_URL =
  typeof process !== 'undefined' ? process.env.REACT_APP_PARCEL_API_URL || '' : '';

/** Common county ArcGIS parcel field names → display label. Order = popup order. */
const ARCGIS_PARCEL_FIELDS: { keys: string[]; label: string }[] = [
  { keys: ['FullAddr', 'SITE_ADDRESS', 'Address', 'PROP_ADDR', 'ADDRESS', 'LOCATION', 'SitusAddress', 'SITUS_ADDR', 'Situs_Addr'], label: 'Address' },
  {
    keys: [
      'APN', 'ParcelNo', 'PARCEL_NO', 'Parcel_No', 'PARCEL_ID', 'ParcelID', 'ParcelId',
      'ACCT_ID', 'ACCT_NUM', 'AccountNo', 'Account', 'ACCOUNT', 'AccountNum',
      'PropID', 'PROP_ID', 'PropId', 'PROPERTY_ID', 'PIN', 'PIN_NUM', 'PinNum',
      'TAX_PARCEL_ID', 'TaxParcelId', 'RPROP_ID', 'RPARDES', 'ParcelNum', 'PARCEL_NUM',
    ],
    label: 'APN',
  },
  { keys: ['Owner', 'OWNER', 'OwnerName', 'OWNER_NAME', 'SITUS_OWNER', 'MailName', 'MAIL_NAME', 'Owner1'], label: 'Owner' },
  { keys: ['Acreage', 'ACRES', 'GrossAcres', 'LandAcres', 'CALC_ACRES', 'Acres'], label: 'Acreage' },
  { keys: ['LegalDesc', 'LEGAL_DESC', 'LegalDescription', 'Legal_Desc', 'Legal'], label: 'Legal description' },
  { keys: ['MarketValue', 'TOTAL_VALUE', 'AppraisedValue', 'ASSESSED_VAL', 'TotalValue', 'TAX_VAL', 'AppraisalValue', 'Market_Val', 'Appraisal_Val'], label: 'Value' },
  { keys: ['LandValue', 'IMPV_VAL', 'ImprovementValue', 'BuildingValue'], label: 'Improvements value' },
  { keys: ['YearBuilt', 'YEAR_BUILT', 'Year_Built'], label: 'Year built' },
  { keys: ['PropDesc', 'PROP_DESC', 'PropertyDesc', 'Property_Desc', 'LandUse', 'LAND_USE'], label: 'Property type' },
];

/** Match any key that looks like an APN/parcel ID (for layers we don't have in the list). */
const APN_LIKE_KEY = /^(apn|parcel|acct|account|pin|prop_?id|tax_?parcel|rprop|pin_num|parcel_num|property_?id)/i;

function formatArcGISParcelPopup(props: Record<string, unknown>): string {
  const propKeysLower = new Map<string, string>(Object.keys(props).map((k) => [k.toLowerCase(), k]));
  const shown = new Set<string>();
  const parts: string[] = [];
  for (const { keys, label } of ARCGIS_PARCEL_FIELDS) {
    for (const key of keys) {
      const actualKey = propKeysLower.get(key.toLowerCase());
      if (!actualKey) continue;
      const v = props[actualKey];
      if (v != null && String(v).trim() !== '') {
        parts.push(`<strong>${label}:</strong> ${String(v).trim()}`);
        shown.add(actualKey);
        break;
      }
    }
  }
  // If APN still not found, show any attribute whose name looks like APN/parcel ID
  const apnShown = parts.some((p) => p.startsWith('<strong>APN:</strong>'));
  if (!apnShown) {
    for (const [k, v] of Object.entries(props)) {
      if (shown.has(k) || v == null || String(v).trim() === '') continue;
      if (APN_LIKE_KEY.test(k)) {
        parts.splice(1, 0, `<strong>APN:</strong> ${String(v).trim()}`);
        shown.add(k);
        break;
      }
    }
  }
  const rest = Object.entries(props)
    .filter(([k, v]) => !shown.has(k) && v != null && String(v).trim() !== '' && !/^shape_|objectid|fid$/i.test(k))
    .slice(0, 12)
    .map(([k, v]) => `<strong>${k}:</strong> ${v}`);
  if (rest.length) parts.push(...rest);
  return parts.length > 0 ? parts.join('<br/>') : 'Parcel (no attributes)';
}

async function fetchArcGISParcels(baseUrl: string, bounds: L.LatLngBounds): Promise<GeoJSON.FeatureCollection> {
  const w = bounds.getWest();
  const s = bounds.getSouth();
  const e = bounds.getEast();
  const n = bounds.getNorth();
  const geometry = JSON.stringify({
    xmin: w,
    ymin: s,
    xmax: e,
    ymax: n,
    spatialReference: { wkid: 4326 },
  });
  const params = new URLSearchParams({
    where: '1=1',
    geometry,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
    f: 'geojson',
  });
  const url = `${baseUrl.replace(/\/$/, '')}/query?${params.toString()}`;
  const res = await fetch(url, { method: 'GET' });
  const data = (await res.json()) as GeoJSON.FeatureCollection & { error?: { message?: string } };
  if (data?.error) throw new Error(data.error.message || 'ArcGIS error');
  if (!res.ok) throw new Error(`ArcGIS query failed: ${res.status}`);
  return data && data.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: [] };
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
  if (contact.fullAddress && contact.fullAddress.trim()) return contact.fullAddress.trim();
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

/** US Census Geocoder - free, no key, reliable for US addresses. */
async function geocodeWithCensus(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    const coord = match?.coordinates;
    if (coord != null && typeof coord.x === 'number' && typeof coord.y === 'number') {
      return [Number(coord.y), Number(coord.x)]; // Census: x=lon, y=lat → [lat, lon]
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeAddressForGeocode(s: string): string {
  return s
    .trim()
    .replace(/\s*\.\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/,(\s*),/g, ', ')
    .replace(/^\s*,|\s*,$/g, '');
}

async function geocodeSearchAddress(address: string): Promise<[number, number] | null> {
  const trimmed = normalizeAddressForGeocode(address);
  if (!trimmed) return null;
  // Prefer US Census for US-style addresses (best for street-level in USA)
  const looksUS = /\b(AK|AL|AR|AZ|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/i.test(trimmed)
    || /\bUSA\b/i.test(trimmed);
  if (looksUS) {
    const fromCensus = await geocodeWithCensus(trimmed);
    if (fromCensus) return fromCensus;
    const withUSA = trimmed.includes('USA') ? trimmed : `${trimmed}, USA`;
    if (withUSA !== trimmed) {
      const fromCensusUSA = await geocodeWithCensus(withUSA);
      if (fromCensusUSA) return fromCensusUSA;
    }
  }
  const fromPhoton = await geocodeWithPhoton(trimmed);
  if (fromPhoton) return fromPhoton;
  const fromCensus = await geocodeWithCensus(trimmed);
  if (fromCensus) return fromCensus;
  const fromNominatim = await geocodeAddress(trimmed);
  if (fromNominatim) return fromNominatim;
  return null;
}

function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

/** Force Leaflet to recalculate size (fixes map not showing in flex/grid layouts). */
function MapSizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function formatRegridPopupContent(props: Record<string, unknown> | undefined): string {
  if (!props || typeof props !== 'object') return 'Parcel';
  const prefer = ['address', 'addr', 'fulladdr', 'apn', 'parcelno', 'owner', 'acres', 'path', 'll_uuid'];
  const parts: string[] = [];
  const keyLower = (k: string) => k.toLowerCase();
  for (const key of prefer) {
    const entry = Object.entries(props).find(([k]) => keyLower(k) === key);
    if (entry && entry[1] != null && String(entry[1]).trim() !== '') {
      parts.push(`<strong>${entry[0]}:</strong> ${String(entry[1]).trim()}`);
    }
  }
  const shown = new Set(parts.map((p) => p.split(':')[0].replace('<strong>', '')));
  Object.entries(props).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '' && !shown.has(k)) {
      parts.push(`<strong>${k}:</strong> ${String(v).trim()}`);
    }
  });
  return parts.length > 0 ? parts.join('<br/>') : 'Parcel';
}

/** Regrid .pbf vector parcel tiles (e.g. https://tiles.regrid.com/parcels/{z}/{x}/{y}.pbf) */
function RegridVectorLayer({ url, onError }: { url: string; onError?: (msg: string | null) => void }) {
  const map = useMap();
  const layerRef = useRef<L.GridLayer | null>(null);
  useEffect(() => {
    onError?.(null);
    const Lvg = (L as unknown as { vectorGrid?: { protobuf: (u: string, o?: Record<string, unknown>) => L.GridLayer } }).vectorGrid;
    if (!Lvg?.protobuf || !url) return;
    const parcelVectorStyle = [
      { fill: true, fillColor: '#42a5f5', fillOpacity: 0.35, color: '#1565c0', weight: 1.5 },
    ];
    const layer = Lvg.protobuf(url, {
      vectorTileLayerStyles: {
        parcels: parcelVectorStyle,
        parcel: parcelVectorStyle,
        default: parcelVectorStyle,
      },
      attribution: 'Parcel data &copy; <a href="https://regrid.com">Regrid</a>',
      maxNativeZoom: 16,
      maxZoom: 22,
      zIndex: 5,
      interactive: true,
      getFeatureId: (f: { properties?: Record<string, unknown> }) =>
        String(f.properties?.id ?? f.properties?.ll_uuid ?? f.properties?.path ?? f.properties?.parcelno ?? f.properties?.apn ?? ''),
    });
    layer.on('click', (e: L.LeafletEvent & { latlng: L.LatLng; layer?: { properties?: Record<string, unknown> } }) => {
      const props = e.layer?.properties;
      const content = formatRegridPopupContent(props);
      L.popup().setLatLng(e.latlng).setContent(content).openOn(map);
    });
    layer.addTo(map);
    layerRef.current = layer;
    const sampleUrl = url.replace('{z}', '10').replace('{x}', '256').replace('{y}', '256');
    const hasToken = /[?&](?:token|key)=/.test(url);
    fetch(sampleUrl, { method: 'GET' }).then((res) => {
      if (!res.ok && onError && !hasToken) {
        onError('Regrid tiles need an API token. Add REACT_APP_REGRID_API_KEY=your_token to frontend/.env and restart.');
      }
    }).catch(() => {
      if (onError && !hasToken) onError('Regrid tiles failed to load (check network or CORS).');
    });
    return () => {
      layer.removeFrom(map);
      layerRef.current = null;
    };
  }, [map, url, onError]);
  return null;
}

function MapCenterOnAddress({
  address,
  onCentered,
  onGeocoded,
  initialCoords,
}: {
  address: string | null;
  onCentered: () => void;
  onGeocoded?: (coords: [number, number]) => void;
  /** When set, use these coords immediately and skip geocoding (e.g. from contact lat/long). */
  initialCoords?: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (initialCoords != null && initialCoords.length === 2 &&
          Number.isFinite(initialCoords[0]) && Number.isFinite(initialCoords[1])) {
        if (cancelled) return;
        map.invalidateSize();
        map.setView(initialCoords, 14);
        onGeocoded?.(initialCoords);
        onCentered();
        return;
      }
      if (!address?.trim()) {
        onCentered();
        return;
      }
      const normalized = normalizeAddressForGeocode(address);
      (async () => {
        let coords = await geocodeSearchAddress(normalized);
        if (!cancelled && coords) {
          map.invalidateSize();
          map.setView(coords, 14);
          onGeocoded?.(coords);
          onCentered();
          return;
        }
        const withUSA = `${normalized}, USA`;
        coords = await geocodeSearchAddress(withUSA);
        if (!cancelled && coords) {
          map.invalidateSize();
          map.setView(coords, 14);
          onGeocoded?.(coords);
        }
        if (!cancelled) onCentered();
      })();
    };
    const t = setTimeout(run, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [address, map, onCentered, onGeocoded, initialCoords]);
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

function ArcGISParcelLayer({
  enabled,
  layerUrl,
  onError,
}: {
  enabled: boolean;
  layerUrl: string;
  onError?: (message: string | null) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onError?.(null);
    if (!enabled || !layerUrl) {
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
        onError?.(null);
        return;
      }
      const bounds = map.getBounds();
      fetchArcGISParcels(layerUrl, bounds)
        .then((geojson) => {
          onError?.(null);
          if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
          }
          const layer = L.geoJSON(geojson, {
            style: () => parcelStyle,
            onEachFeature: (feature, leafletLayer) => {
              const props = (feature.properties || {}) as Record<string, unknown>;
              const content = formatArcGISParcelPopup(props);
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
        .catch((err) => {
          const msg = err?.message || 'Parcel layer unavailable (check REACT_APP_PARCEL_ARCGIS_FEATURESERVER_URL in .env)';
          onError?.(msg);
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
  }, [map, enabled, layerUrl]);

  return null;
}

function formatParcelApiPopup(props: Record<string, unknown>): string {
  const parts: string[] = [];
  if (props.address) parts.push(`<strong>Address:</strong> ${props.address}`);
  if (props.apn) parts.push(`<strong>APN:</strong> ${props.apn}`);
  if (props.owner) parts.push(`<strong>Owner:</strong> ${props.owner}`);
  if (props.acres != null) parts.push(`<strong>Acres:</strong> ${props.acres}`);
  if (props.legal_desc) parts.push(`<strong>Legal:</strong> ${props.legal_desc}`);
  if (props.market_value != null) parts.push(`<strong>Value:</strong> ${props.market_value}`);
  return parts.length ? parts.join('<br/>') : 'Parcel';
}

async function fetchParcelApiParcels(baseUrl: string, bounds: L.LatLngBounds): Promise<GeoJSON.FeatureCollection> {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const url = `${baseUrl.replace(/\/$/, '')}/parcels?min_lon=${sw.lng}&min_lat=${sw.lat}&max_lon=${ne.lng}&max_lat=${ne.lat}&limit=500`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Parcel API ${res.status}`);
  const data = (await res.json()) as GeoJSON.FeatureCollection;
  return data?.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: [] };
}

function ParcelApiLayer({
  enabled,
  apiUrl,
  onError,
}: {
  enabled: boolean;
  apiUrl: string;
  onError?: (message: string | null) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onError?.(null);
    if (!enabled || !apiUrl) {
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
        onError?.(null);
        return;
      }
      const bounds = map.getBounds();
      fetchParcelApiParcels(apiUrl, bounds)
        .then((geojson) => {
          onError?.(null);
          if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
          }
          const layer = L.geoJSON(geojson, {
            style: () => parcelStyle,
            onEachFeature: (feature, leafletLayer) => {
              const props = (feature.properties || {}) as Record<string, unknown>;
              const content = formatParcelApiPopup(props);
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
        .catch((err) => {
          const msg = err?.message || 'Parcel API unavailable (check REACT_APP_PARCEL_API_URL and that parcel_api is running)';
          onError?.(msg);
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
  }, [map, enabled, apiUrl]);

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
  const [parcelLayerError, setParcelLayerError] = useState<string | null>(null);
  const [parcelApiLayerError, setParcelApiLayerError] = useState<string | null>(null);
  const [regridLayerError, setRegridLayerError] = useState<string | null>(null);
  const addressString = buildAddressString(contact);

  const regridTileUrl =
    (typeof process !== 'undefined' && process.env.REACT_APP_REGRID_TILE_URL) ||
    'https://tiles.regrid.com/parcels/{z}/{x}/{y}.pbf';
  const regridApiKey =
    (typeof process !== 'undefined' && process.env.REACT_APP_REGRID_API_KEY) ||
    ''; // Fallback below used when .env/.env.local not loaded by dev server
  const REGRID_SANDBOX_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyZWdyaWQuY29tIiwiaWF0IjoxNzcxOTA5MDk1LCJleHAiOjE3NzQ1MDEwOTUsInUiOjMwNDU5MCwiZyI6MjMxNTMsImNhcCI6InBhOnRzOnBzOmJmOm1hOnR5OmVvOnpvOnNiIn0.RykRx8auuAXvun9a_FHg3TZmg6tRZsqH8pKFSxt4Dsw';
  const regridKey = regridApiKey || REGRID_SANDBOX_KEY;
  const regridUrl =
    regridKey && regridTileUrl
      ? regridTileUrl.includes('?')
        ? regridTileUrl
        : `${regridTileUrl}?token=${encodeURIComponent(regridKey)}&key=${encodeURIComponent(regridKey)}`
      : '';

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
      (async () => {
        let coords = await geocodeSearchAddress(addressString);
        if (!cancelled && coords) {
          setPosition(coords);
          setLoading(false);
          return;
        }
        const withCountry = /^[A-Za-z]{2}$/.test((contact.state || '').trim())
          ? `${addressString}, USA`
          : addressString;
        if (withCountry !== addressString) {
          coords = await geocodeSearchAddress(withCountry);
        }
        if (!cancelled && coords) setPosition(coords);
        setLoading(false);
      })().catch(() => {
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
    <Box sx={{ width: '100%', mb: 2, minHeight: 200 }}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Property location
        </Typography>
        {addressString && !position && loading && (
          <Typography component="span" variant="caption" color="text.secondary">
            Geocoding…
          </Typography>
        )}
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
        {ARCGIS_PARCEL_LAYER_URL && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (Zoom in for county parcels)
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        Regrid: {regridUrl ? 'on' : 'off (optional)'}
        {PARCEL_API_URL ? ' · Parcel API: on' : ''}
      </Typography>
      {(parcelLayerError || parcelApiLayerError || regridLayerError) && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
          {[parcelLayerError, parcelApiLayerError, regridLayerError].filter(Boolean).join(' ')}
        </Typography>
      )}
      <Box sx={{ height: Math.max(height, 200), width: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={2}
          maxZoom={22}
          style={{ height: '100%', width: '100%', minHeight: 200 }}
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
          {regridUrl && (
            regridUrl.includes('.pbf')
              ? <RegridVectorLayer url={regridUrl} onError={setRegridLayerError} />
              : (
                  <TileLayer
                    attribution='Parcel data &copy; <a href="https://regrid.com">Regrid</a>'
                    url={regridUrl}
                    maxNativeZoom={22}
                    maxZoom={22}
                    zIndex={5}
                  />
                )
          )}
          {typeof process !== 'undefined' && process.env?.REACT_APP_PARCEL_TILE_URL && (
            <TileLayer
              attribution="Parcel layer (county/state)"
              url={process.env.REACT_APP_PARCEL_TILE_URL}
              maxNativeZoom={22}
              maxZoom={22}
              zIndex={5}
            />
          )}
          {typeof process !== 'undefined' && process.env?.REACT_APP_PARCEL_WMS_URL && (
            <WMSTileLayer
              url={process.env.REACT_APP_PARCEL_WMS_URL}
              params={{
                layers: process.env.REACT_APP_PARCEL_WMS_LAYERS || 'parcels',
                format: 'image/png',
                transparent: true,
              }}
              attribution="Parcel layer (WMS)"
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
          <MapSizeFix />
          {centerOnAddress != null && onCentered ? (
            <MapCenterOnAddress
              key={centerOnAddress}
              address={centerOnAddress}
              onCentered={onCentered}
              onGeocoded={setPosition}
              initialCoords={null}
            />
          ) : null}
          <ParcelAddressLayer enabled={showParcels} />
          {ARCGIS_PARCEL_LAYER_URL && (
            <ArcGISParcelLayer
              enabled={showParcels}
              layerUrl={ARCGIS_PARCEL_LAYER_URL}
              onError={setParcelLayerError}
            />
          )}
          {PARCEL_API_URL && (
            <ParcelApiLayer
              enabled={showParcels}
              apiUrl={PARCEL_API_URL}
              onError={setParcelApiLayerError}
            />
          )}
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
