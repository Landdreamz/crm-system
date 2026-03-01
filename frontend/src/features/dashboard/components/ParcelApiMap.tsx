import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { SatelliteAlt as SatelliteIcon } from '@mui/icons-material';

export type MapFlyToResult =
  | { type: 'center'; lat: number; lng: number; zoom: number }
  | { type: 'bounds'; south: number; west: number; north: number; east: number }
  | null;

const HARRIS_CENTER: [number, number] = [29.76, -95.36];
const HARRIS_ZOOM = 9;

const PARCEL_API_BASE = typeof process !== 'undefined' ? process.env.REACT_APP_PARCEL_API_URL || '' : '';

const parcelStyle: L.PathOptions = {
  color: '#0ba360',
  weight: 2.5,
  fillColor: '#3cba92',
  fillOpacity: 0.35,
};

function MapFlyTo({ result }: { result: MapFlyToResult }) {
  const map = useMap();
  useEffect(() => {
    if (!result) return;
    if (result.type === 'center') {
      map.setView([result.lat, result.lng], result.zoom);
    } else {
      map.fitBounds(
        L.latLngBounds([result.south, result.west], [result.north, result.east]),
        { padding: [24, 24], maxZoom: 18 }
      );
    }
  }, [map, result]);
  return null;
}

function ParcelGeometryLayer({ geometry }: { geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  useEffect(() => {
    if (!geometry) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }
    const feature: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry };
    const layer = L.geoJSON(feature, { style: () => parcelStyle });
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, geometry]);
  return null;
}

const markerIcon = L.divIcon({
  className: 'parcel-api-marker',
  html: '<span style="background:#0ba360;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:block"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface ParcelApiMapProps {
  mapView: 'streets' | 'satellite';
  onMapViewChange: (v: 'streets' | 'satellite') => void;
  flyToResult: MapFlyToResult;
  searchCenter: [number, number] | null;
  parcelGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

export default function ParcelApiMap({
  mapView,
  onMapViewChange,
  flyToResult,
  searchCenter,
  parcelGeometry,
}: ParcelApiMapProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Harris County {PARCEL_API_BASE ? '— search result on map' : ''}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
        <ToggleButtonGroup
          size="small"
          value={mapView}
          exclusive
          onChange={(_, v) => v != null && onMapViewChange(v)}
          aria-label="Map view"
        >
          <ToggleButton value="streets" aria-label="Streets">Streets</ToggleButton>
          <ToggleButton value="satellite" aria-label="Satellite">
            <SatelliteIcon sx={{ mr: 0.5, fontSize: 18 }} /> Satellite
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box
        sx={{
          height: 400,
          minHeight: 400,
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          position: 'relative',
        }}
      >
        <MapContainer
          center={HARRIS_CENTER}
          zoom={HARRIS_ZOOM}
          style={{ height: 400, width: '100%', minHeight: 400 }}
          scrollWheelZoom
        >
          {mapView === 'streets' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              attribution="&copy; Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}
          <MapFlyTo result={flyToResult} />
          <ParcelGeometryLayer geometry={parcelGeometry} />
          {searchCenter && (
            <Marker position={searchCenter} icon={markerIcon}>
              <Popup>Search result</Popup>
            </Marker>
          )}
        </MapContainer>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Search by APN or address above; the map flies to the result and shows the parcel boundary when available.
      </Typography>
    </Box>
  );
}
