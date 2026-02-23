import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography } from '@mui/material';
import { getCentroid } from './zipCentroids';

let heatReady = false;
function ensureHeat() {
  if (heatReady) return Promise.resolve();
  (window as unknown as { L: typeof L }).L = L;
  // eslint-disable-next-line import/first -- load after L is on window for leaflet.heat
  return import('leaflet.heat').then(() => { heatReady = true; });
}

export interface SaleRecordForMap {
  zip: string;
  state: string;
  price: number;
}

interface HeatLayerUpdaterProps {
  sales: SaleRecordForMap[];
}

function HeatLayerUpdater({ sales }: HeatLayerUpdaterProps) {
  const map = useMap();
  const heatRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;
    if (sales.length === 0) {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      return;
    }

    let cancelled = false;
    ensureHeat().then(() => {
      if (cancelled || !map) return;
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      const LWithHeat = L as typeof L & { heatLayer: (points: [number, number, number][], opts?: Record<string, unknown>) => L.Layer };
      if (typeof LWithHeat.heatLayer !== 'function') return;

      const byZip = new Map<string, { count: number; totalPrice: number }>();
      for (const s of sales) {
        const z = s.zip.trim();
        const cur = byZip.get(z) || { count: 0, totalPrice: 0 };
        cur.count += 1;
        cur.totalPrice += s.price;
        byZip.set(z, cur);
      }

      const points: [number, number, number][] = [];
      byZip.forEach((agg, zip) => {
        const state = sales.find((s) => s.zip.trim() === zip)?.state ?? 'TX';
        const [lat, lng] = getCentroid(zip, state);
        const intensity = Math.min(1, agg.count * 0.15 + agg.totalPrice / 500000);
        points.push([lat, lng, intensity]);
      });

      try {
        const layer = LWithHeat.heatLayer(points, {
          radius: 35,
          blur: 25,
          maxZoom: 14,
          minOpacity: 0.35,
          gradient: { 0.2: '#3cba92', 0.5: '#0ba360', 0.8: '#098a52', 1: '#064d2e' },
        });
        if (!cancelled) {
          layer.addTo(map);
          heatRef.current = layer;
        } else {
          map.removeLayer(layer);
        }
      } catch {
        // heatLayer failed
      }
    });

    return () => {
      cancelled = true;
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, sales]);

  return null;
}

const defaultCenter: [number, number] = [29.76, -95.36];
const defaultZoom = 10;

interface SalesHeatMapProps {
  sales: SaleRecordForMap[];
  center?: [number, number];
  zoom?: number;
  height?: number;
}

const SalesHeatMap: React.FC<SalesHeatMapProps> = ({
  sales,
  center = defaultCenter,
  zoom = defaultZoom,
  height = 420,
}) => {
  return (
    <Box sx={{ width: '100%', height }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
        Demand heat map by zip — hotter = more sales / higher volume
      </Typography>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: height - 32, width: '100%', borderRadius: 8 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayerUpdater sales={sales} />
      </MapContainer>
    </Box>
  );
};

export default SalesHeatMap;
