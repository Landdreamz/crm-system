/**
 * Parcel API tab content — search only, no map.
 * (Separate file so the app loads a fresh chunk and bypasses cached old bundle.)
 */
import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Map as MapIcon, Code as CodeIcon, Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

type SearchResult =
  | { type: 'center'; lat: number; lng: number; zoom: number }
  | { type: 'bounds'; south: number; west: number; north: number; east: number }
  | { type: 'parcel'; props: Record<string, unknown> }
  | null;

async function geocodeAddress(query: string): Promise<[number, number] | null> {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(trimmed)}&benchmark=Public_AR_Current&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    const coord = match?.coordinates;
    if (coord != null && typeof coord.x === 'number' && typeof coord.y === 'number')
      return [Number(coord.y), Number(coord.x)];
  } catch {
    // ignore
  }
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) return [Number(coords[1]), Number(coords[0])];
  } catch {
    // ignore
  }
  return null;
}

function isLikelyApn(q: string): boolean {
  const t = q.trim();
  return /^[\d\-.\s]+$/.test(t) && t.length >= 4 && t.length <= 30;
}

const PARCEL_API_BASE =
  typeof process !== 'undefined' ? process.env.REACT_APP_PARCEL_API_URL || '' : '';

export default function ParcelApiTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      if (PARCEL_API_BASE && isLikelyApn(q)) {
        const url = `${PARCEL_API_BASE.replace(/\/$/, '')}/parcels/by-apn?apn=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Parcel API error');
        const fc = (await res.json()) as { features?: GeoJSON.Feature[] };
        const features = fc?.features ?? [];
        if (features.length === 0) {
          setSearchError('No parcel found for this APN');
          return;
        }
        const first = features[0];
        const props = (first?.properties || {}) as Record<string, unknown>;
        setSearchResult({ type: 'parcel', props });
        return;
      }
      const coords = await geocodeAddress(q);
      if (coords) {
        setSearchResult({ type: 'center', lat: coords[0], lng: coords[1], zoom: 17 });
      } else {
        setSearchError('Address not found. Try a different search or search by APN.');
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchError(null);
    setSearchResult(null);
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Parcel API
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Build your own nationwide parcel API by crawling county ArcGIS servers. This project lives in this repo.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SearchIcon fontSize="small" /> Search by address or APN
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Enter a Harris County address or a parcel APN (e.g. 0280490000034). Addresses are geocoded; APNs use your Parcel API when configured.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="e.g. 3153 Chickering St, Houston or APN 0280490000034"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            variant="outlined"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (searchQuery || searchError) ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={clearSearch} aria-label="Clear">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ flex: '1 1 280px', minWidth: 0 }}
          />
          {searching ? (
            <CircularProgress size={28} />
          ) : (
            <IconButton
              size="small"
              color="primary"
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              aria-label="Search"
            >
              <SearchIcon />
            </IconButton>
          )}
        </Stack>
        {searchError && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {searchError}
          </Typography>
        )}
        {searchResult && !searchError && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            {searchResult.type === 'center' && (
              <Typography variant="body2">
                <strong>Address found</strong>: {searchResult.lat.toFixed(5)}, {searchResult.lng.toFixed(5)}
              </Typography>
            )}
            {searchResult.type === 'parcel' && (
              <Box component="dl" sx={{ m: 0, '& dd': { ml: 2 }, '& dt': { fontWeight: 600, mt: 0.5 }, '& dt:first-of-type': { mt: 0 } }}>
                {searchResult.props.address != null && (
                  <>
                    <dt>Address</dt>
                    <dd>{String(searchResult.props.address)}</dd>
                  </>
                )}
                {searchResult.props.apn != null && (
                  <>
                    <dt>APN</dt>
                    <dd>{String(searchResult.props.apn)}</dd>
                  </>
                )}
                {searchResult.props.owner != null && (
                  <>
                    <dt>Owner</dt>
                    <dd>{String(searchResult.props.owner)}</dd>
                  </>
                )}
                {searchResult.props.acres != null && (
                  <>
                    <dt>Acres</dt>
                    <dd>{String(searchResult.props.acres)}</dd>
                  </>
                )}
                {searchResult.props.market_value != null && (
                  <>
                    <dt>Market value</dt>
                    <dd>{String(searchResult.props.market_value)}</dd>
                  </>
                )}
                {searchResult.props.legal_desc != null && (
                  <>
                    <dt>Legal</dt>
                    <dd>{String(searchResult.props.legal_desc)}</dd>
                  </>
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapIcon fontSize="small" /> Guide
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <Typography component="code" variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>docs/PARCEL_API_BUILD.md</Typography> in the repo — finding county URLs, querying ArcGIS, normalizing data, storage, and your API.
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CodeIcon fontSize="small" /> Crawler script
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Run from repo root (requires Python and <Typography component="code" variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>requests</Typography>):
        </Typography>
        <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflow: 'auto', fontSize: '0.8rem' }}>
{`python scripts/crawl_county_parcels.py \\
  --url "https://www.gis.hctx.net/.../HCAD/Parcels/MapServer/0" \\
  --bbox min_lon min_lat max_lon max_lat \\
  --out output.geojson`}
        </Box>
        <Typography variant="body2" color="text.secondary">
          See <Typography component="code" variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>scripts/README.md</Typography> in the repo for options (--limit, --delay).
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Next steps (Harris County first)
        </Typography>
        <List dense disablePadding>
          <ListItem disablePadding sx={{ display: 'list-item' }}>
            <ListItemText
              primary="1. County URL list (state/county → parcel layer URL)"
              secondary={
                <>Start with Harris: copy <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>scripts/county_parcel_sources.example.json</Typography> or <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>.example.csv</Typography> (Harris already included). Add more counties later.</>
              }
            />
          </ListItem>
          <ListItem disablePadding sx={{ display: 'list-item' }}>
            <ListItemText
              primary="2. Run crawler (Harris or batch)"
              secondary={
                <>Single: <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>crawl_county_parcels.py --url "…Harris…" --bbox -95.9 29.5 -95.0 30.2 --out harris.geojson</Typography>. Harris batch: <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>run_crawl_all_counties.py --list scripts/county_parcel_sources.harris_only.json --out-dir data/parcels</Typography></>
              }
            />
          </ListItem>
          <ListItem disablePadding sx={{ display: 'list-item' }}>
            <ListItemText
              primary="3. PostGIS + API (bbox, point, APN)"
              secondary={
                <>Load: <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>scripts/load_parcels_to_postgis.py</Typography>. Run API: <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>parcel_api/</Typography> (see parcel_api/README.md).</>
              }
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}
