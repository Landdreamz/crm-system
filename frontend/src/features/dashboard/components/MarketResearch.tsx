import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Checkbox,
  ListItemText,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PublicIcon from '@mui/icons-material/Public';
import SalesHeatMap from './SalesHeatMap';

const SALES_DATE_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 180 days' },
  { value: '365', label: 'Last 1 year' },
  { value: '730', label: 'Last 2 years' },
  { value: 'all', label: 'All time' },
];

const HOUSTON_ZIPS = [
  '77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008',
  '77009', '77010', '77011', '77012', '77013', '77014', '77015', '77016',
  '77017', '77018', '77019', '77020', '77021', '77022', '77023', '77024',
  '77025', '77026', '77027', '77028', '77029', '77030', '77031', '77032',
  '77033', '77034', '77035', '77036', '77037', '77038', '77039', '77040',
  '77041', '77042', '77043', '77044', '77045', '77046', '77047', '77048',
  '77049', '77050', '77051', '77052', '77053', '77054', '77055', '77056',
  '77057', '77058', '77059', '77060', '77061', '77062', '77063', '77064',
  '77065', '77066', '77067', '77068', '77069', '77070', '77071', '77072',
  '77073', '77074', '77075', '77076', '77077', '77078', '77079', '77080',
  '77081', '77082', '77083', '77084', '77085', '77086', '77087', '77088',
  '77089', '77090', '77091', '77092', '77093', '77094', '77095', '77096',
  '77098', '77099',
];

interface SaleRecord {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  saleDate: string;
  price: number;
  acres?: number;
  sqft?: number;
  propertyType: 'land' | 'residential' | 'commercial';
}

interface PropertyTypeFilter {
  land: boolean;
  houses: boolean;
}

function parseLocationInput(input: string): { type: 'address' | 'zip'; address?: string; zips: string[]; state: string } {
  const trimmed = input.trim();
  const zipOnly = /^[\d\s,]+$/.test(trimmed);
  if (zipOnly && trimmed) {
    const zips = trimmed.split(/[\s,]+/).filter(Boolean);
    const first = zips[0] || '';
    const state = first.startsWith('77') ? 'TX' : first.startsWith('37') ? 'TN' : 'TX';
    return { type: 'zip', zips, state };
  }
  return { type: 'address', address: trimmed || undefined, zips: [], state: 'TX' };
}

function isRapidApiUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('rapidapi.com');
  } catch {
    return false;
  }
}

function getRapidApiHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function buildRapidApiUrl(
  base: string,
  location: { type: 'address' | 'zip'; address?: string; zips: string[]; state: string },
  dateRange: string
): string {
  try {
    const u = new URL(base);
    const hasPath = u.pathname !== '/' && u.pathname !== '';
    if (hasPath) {
      u.searchParams.set('state_code', location.state);
      u.searchParams.set('limit', '50');
      if (location.zips.length) u.searchParams.set('postal_code', location.zips[0]);
      if (dateRange !== 'all') u.searchParams.set('days_back', dateRange);
      return u.toString();
    }
    const path = '/properties/v2/list-for-sale';
    const params = new URLSearchParams();
    params.set('state_code', location.state);
    params.set('limit', '50');
    if (location.zips.length) params.set('postal_code', location.zips[0]);
    if (location.type === 'address' && location.address) params.set('address', location.address);
    if (dateRange !== 'all') params.set('days_back', dateRange);
    return `${u.origin}${path}?${params.toString()}`;
  } catch {
    return base;
  }
}

function normalizeApiResponseToSaleRecords(data: unknown): SaleRecord[] {
  if (Array.isArray(data)) {
    return data.map((item, i) => normalizeItem(item, i));
  }
  const obj = data as Record<string, unknown>;
  const dataObj = obj.data as Record<string, unknown> | undefined;
  const homeSearch = dataObj?.home_search as Record<string, unknown> | undefined;
  const list =
    (obj.properties as SaleRecord[] | undefined) ??
    (obj.results as SaleRecord[] | undefined) ??
    (obj.listings as SaleRecord[] | undefined) ??
    (dataObj?.results as SaleRecord[] | undefined) ??
    (homeSearch?.results as SaleRecord[] | undefined) ??
    (dataObj?.properties as SaleRecord[] | undefined) ??
    ((obj.home_search as Record<string, unknown>)?.results as SaleRecord[] | undefined);
  if (Array.isArray(list)) {
    return list.map((item, i) => normalizeItem(item, i));
  }
  return [];
}

function normalizeItem(item: unknown, index: number): SaleRecord {
  const r = item as Record<string, unknown>;
  const addr = (r.address as Record<string, unknown>) ?? r;
  const line = (addr.line ?? addr.street ?? addr.address ?? r.address_line ?? '') as string;
  const city = (addr.city ?? r.city ?? '') as string;
  const state = (addr.state_code ?? addr.state ?? r.state_code ?? r.state ?? '') as string;
  const zip = (addr.postal_code ?? addr.postal ?? addr.zip ?? r.postal_code ?? r.zip ?? '') as string;
  const price = Number(r.list_price ?? r.price ?? r.list_price_min ?? r.sale_price ?? 0) || 0;
  const date = (r.list_date ?? r.sale_date ?? r.close_date ?? r.last_sold_date ?? r.date ?? '') as string;
  const saleDate = typeof date === 'string' ? date.slice(0, 10) : '';
  const propType = ((r.prop_type ?? r.property_type ?? r.type ?? 'residential') as string).toLowerCase();
  const propertyType: 'land' | 'residential' | 'commercial' =
    propType.includes('land') || propType === 'lot' ? 'land' : propType.includes('commercial') ? 'commercial' : 'residential';
  return {
    id: (r.id ?? r.listing_id ?? `live-${index}`) as string,
    address: line || '—',
    city: city || '—',
    state: state || '—',
    zip: zip || '—',
    saleDate: saleDate || '—',
    price,
    acres: typeof r.acres === 'number' ? r.acres : undefined,
    sqft: typeof r.sqft === 'number' ? r.sqft : (typeof r.building_size === 'number' ? r.building_size : undefined),
    propertyType,
  };
}

const STORAGE_KEY_API = 'marketResearchApiKey';
const STORAGE_KEY_URL = 'marketResearchApiUrl';
const DEFAULT_API_BASE_URL = 'https://realty-in-us.p.rapidapi.com';

const MarketResearch: React.FC = () => {
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeFilter>({ land: true, houses: false });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SaleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');
  const [salesDateRange, setSalesDateRange] = useState<string>('90');
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_API) : null;
      const envKey = process.env.REACT_APP_MARKET_RESEARCH_API_KEY ?? '';
      return (stored ?? envKey) || '';
    } catch {
      return process.env.REACT_APP_MARKET_RESEARCH_API_KEY ?? '';
    }
  });
  const [apiUrl, setApiUrl] = useState<string>(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
      return stored ?? DEFAULT_API_BASE_URL;
    } catch {
      return DEFAULT_API_BASE_URL;
    }
  });

  const saveApiKey = (value: string) => {
    setApiKey(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY_API, value);
      else localStorage.removeItem(STORAGE_KEY_API);
    } catch {
      /* ignore */
    }
  };
  const saveApiUrl = (value: string) => {
    setApiUrl(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY_URL, value);
      else localStorage.removeItem(STORAGE_KEY_URL);
    } catch {
      /* ignore */
    }
  };

  // Restore API key and URL from localStorage or .env on mount; persist default URL if missing
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(STORAGE_KEY_API);
      const envKey = process.env.REACT_APP_MARKET_RESEARCH_API_KEY ?? '';
      if (storedKey) {
        setApiKey(storedKey);
      } else if (envKey) {
        setApiKey(envKey);
      }
      let storedUrl = localStorage.getItem(STORAGE_KEY_URL);
      if (!storedUrl) {
        localStorage.setItem(STORAGE_KEY_URL, DEFAULT_API_BASE_URL);
        storedUrl = DEFAULT_API_BASE_URL;
      }
      if (storedUrl) setApiUrl(storedUrl);
    } catch {
      /* ignore */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const effectiveApiKey = (apiKey || process.env.REACT_APP_MARKET_RESEARCH_API_KEY || '').trim();
  const effectiveApiUrl = (apiUrl || process.env.REACT_APP_MARKET_RESEARCH_API_URL || '').trim();

  const handleSearch = async () => {
    setError(null);
    setLoading(true);
    setResults([]);

    if (dataSource === 'live' && (!effectiveApiKey || !effectiveApiUrl)) {
      setError('Enter your API key in the field next to “Live data” (paste once — it’s saved in this browser). Or add REACT_APP_MARKET_RESEARCH_API_KEY to a .env file in the frontend folder and restart the app to pre-fill. Get a key at rapidapi.com.');
      setLoading(false);
      return;
    }

    const location = parseLocationInput(locationQuery);
    try {
      if (dataSource === 'sample') {
        await new Promise((r) => setTimeout(r, 800));
        const raw = getSampleData(location.state, location.zips, propertyTypes, salesDateRange);
        const byDate = filterResultsBySalesDate(raw, salesDateRange);
        const filtered = filterResultsByPropertyType(byDate, propertyTypes);
        setResults(filtered);
      } else if (effectiveApiUrl && effectiveApiKey) {
        const isRapid = isRapidApiUrl(effectiveApiUrl);
        const requestUrl = isRapid
          ? buildRapidApiUrl(effectiveApiUrl, location, salesDateRange)
          : buildApiUrl(effectiveApiUrl, location, propertyTypes, salesDateRange);
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (isRapid) {
          headers['X-RapidAPI-Key'] = effectiveApiKey;
          headers['X-RapidAPI-Host'] = getRapidApiHost(effectiveApiUrl);
        } else {
          headers['X-Api-Key'] = effectiveApiKey;
        }
        const res = await fetch(requestUrl, { headers });
        if (!res.ok) {
          let body = '';
          try {
            body = await res.text();
          } catch {
            /* ignore */
          }
          if (res.status === 403 && /not subscribed|subscription/i.test(body)) {
            throw new Error(
              'You are not subscribed to this API. On rapidapi.com, open the API (e.g. "Realty in US"), click "Subscribe to Test" or "Pricing", choose the free plan, then try Search again.'
            );
          }
          if (res.status === 403) {
            throw new Error(
              `API 403 Forbidden. Check your RapidAPI key, that you're subscribed to this API on rapidapi.com (Subscribe to Test → free plan), and that the base URL matches (e.g. realty-in-us.p.rapidapi.com).${body ? ` — ${body.slice(0, 150)}` : ''}`
            );
          }
          throw new Error(body ? `API error: ${res.status} — ${body.slice(0, 200)}` : `API error: ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        const list = normalizeApiResponseToSaleRecords(data);
        const byDate = filterResultsBySalesDate(list, salesDateRange);
        setResults(filterResultsByPropertyType(byDate, propertyTypes));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const buildApiUrl = (
    base: string,
    location: { type: 'address' | 'zip'; address?: string; zips: string[]; state: string },
    types: PropertyTypeFilter,
    dateRange: string
  ): string => {
    const url = new URL(base);
    url.searchParams.set('state', location.state);
    if (location.type === 'address' && location.address) url.searchParams.set('q', location.address);
    if (location.zips.length) url.searchParams.set('zip', location.zips.join(','));
    const typeParams: string[] = [];
    if (types.land) typeParams.push('land');
    if (types.houses) typeParams.push('residential');
    if (typeParams.length) url.searchParams.set('property_type', typeParams.join(','));
    if (dateRange !== 'all') url.searchParams.set('days', dateRange);
    return url.toString();
  };

  const getSampleData = (
    st: string,
    zipsFromQuery: string[],
    types: PropertyTypeFilter,
    dateRange: string
  ): SaleRecord[] => {
    const defaultZips = st === 'TX' ? HOUSTON_ZIPS.slice(0, 20) : ['37013', '37128', '37201', '37203', '37204', '37205', '37206', '37207', '37208', '37209'];
    const zips = zipsFromQuery.length > 0 ? zipsFromQuery.filter((z) => defaultZips.includes(z) || z.length >= 5).slice(0, 20) : defaultZips;
    const cities = st === 'TX' ? ['Houston', 'Katy', 'Cypress', 'Spring', 'The Woodlands', 'Pearland', 'Sugar Land', 'League City'] : ['Nashville', 'Franklin', 'Murfreesboro', 'Brentwood', 'Hendersonville', 'Clarksville', 'Knoxville', 'Memphis'];
    const maxDays = dateRange === 'all' ? 730 : Math.min(730, parseInt(dateRange, 10) || 90);
    const now = Date.now();
    const msRange = maxDays * 24 * 60 * 60 * 1000;
    const allowed: Array<'land' | 'residential'> = [];
    if (types.land) allowed.push('land');
    if (types.houses) allowed.push('residential');
    const typePool = allowed.length === 0 ? (['land'] as const) : allowed;
    return Array.from({ length: 12 }, (_, i) => {
      const pt = typePool[i % typePool.length];
      return {
        id: `sample-${i + 1}`,
        address: `${1200 + i * 100} ${['Oak', 'Pine', 'Cedar', 'Maple', 'Elm', 'Lakeview', 'Park', 'Main', 'First', 'Hill', 'River', 'Valley'][i]} Dr`,
        city: cities[i % cities.length],
        state: st,
        zip: zips[i % zips.length],
        saleDate: new Date(now - Math.random() * msRange).toISOString().slice(0, 10),
        price: Math.round((150000 + Math.random() * 850000) / 1000) * 1000,
        acres: pt === 'land' ? Number((0.5 + Math.random() * 4.5).toFixed(2)) : undefined,
        sqft: pt === 'residential' ? Math.round(1200 + Math.random() * 3800) : undefined,
        propertyType: pt,
      };
    });
  };

  function filterResultsByPropertyType(list: SaleRecord[], types: PropertyTypeFilter): SaleRecord[] {
    const allowed: string[] = [];
    if (types.land) allowed.push('land');
    if (types.houses) allowed.push('residential');
    if (allowed.length === 0) return [];
    return list.filter((r) => r.propertyType && allowed.includes(r.propertyType));
  }

  function filterResultsBySalesDate(list: SaleRecord[], dateRange: string): SaleRecord[] {
    if (dateRange === 'all') return list;
    const days = parseInt(dateRange, 10);
    if (Number.isNaN(days)) return list;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return list.filter((r) => {
      if (!r.saleDate) return true;
      const d = new Date(r.saleDate);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
  }

  const formatMoney = (n: number) => `$${n.toLocaleString()}`;

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Alert severity="success" sx={{ mb: 2 }}>Market Research page loaded. Use filters below and click Search.</Alert>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PublicIcon /> Market Research — Real Estate & Land Sales
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Search by address or zip code(s), then filter by sales date and property type.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Location & filters</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            size="small"
            label="Address or zip code(s)"
            placeholder="e.g. 123 Main St or 77001, 77024"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sales date</InputLabel>
            <Select value={salesDateRange} label="Sales date" onChange={(e) => setSalesDateRange(e.target.value)}>
              {SALES_DATE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="property-type-label">Property type</InputLabel>
            <Select
              labelId="property-type-label"
              label="Property type"
              multiple
              value={['land', 'houses'].filter((k) => propertyTypes[k as keyof PropertyTypeFilter])}
              onChange={(e) => {
                const v = e.target.value;
                const arr = typeof v === 'string' ? v.split(',') : v;
                setPropertyTypes({ land: arr.includes('land'), houses: arr.includes('houses') });
              }}
              renderValue={(selected) =>
                selected.length === 0
                  ? 'Select types'
                  : selected.map((s) => (s === 'land' ? 'Land' : 'Houses')).join(', ')
              }
              displayEmpty
            >
              <MenuItem value="land">
                <Checkbox size="small" checked={propertyTypes.land} />
                <ListItemText primary="Land" />
              </MenuItem>
              <MenuItem value="houses">
                <Checkbox size="small" checked={propertyTypes.houses} />
                <ListItemText primary="Houses" />
              </MenuItem>
            </Select>
          </FormControl>
          <ToggleButtonGroup
            size="small"
            value={dataSource}
            exclusive
            onChange={(_, v) => v != null && setDataSource(v)}
            aria-label="data source"
          >
            <ToggleButton value="sample">Sample data</ToggleButton>
            <ToggleButton value="live">Live data</ToggleButton>
          </ToggleButtonGroup>
          {dataSource === 'live' && (
            <>
              <TextField
                size="small"
                label="API key"
                type="password"
                placeholder="Paste your RapidAPI key"
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                onBlur={(e) => saveApiKey((e.target as HTMLInputElement).value)}
                sx={{ minWidth: 200 }}
                autoComplete="off"
              />
              <TextField
                size="small"
                label="API base URL"
                placeholder="https://realty-in-us.p.rapidapi.com"
                value={apiUrl}
                onChange={(e) => saveApiUrl(e.target.value)}
                onBlur={(e) => saveApiUrl((e.target as HTMLInputElement).value)}
                sx={{ minWidth: 260 }}
                autoComplete="off"
              />
            </>
          )}
          <Button variant="contained" onClick={handleSearch} disabled={loading} startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}>
            {loading ? 'Loading…' : 'Search'}
          </Button>
        </Box>
        {dataSource === 'live' && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Get a key at rapidapi.com (e.g. Realty in US). Paste it above once — it’s saved in this browser. Or create a file <code>frontend/.env</code> with <code>REACT_APP_MARKET_RESEARCH_API_KEY=your_key</code> and restart the app to pre-fill.
          </Typography>
        )}
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {results.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <SalesHeatMap
            sales={results.map((r) => ({ zip: r.zip, state: r.state, price: r.price }))}
            center={(results[0]?.state === 'TN' ? [36.16, -86.78] : [29.76, -95.36]) as [number, number]}
            zoom={results[0]?.state === 'TN' ? 9 : 10}
            height={420}
          />
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ color: 'white' }}>Address</TableCell>
              <TableCell sx={{ color: 'white' }}>City</TableCell>
              <TableCell sx={{ color: 'white' }}>State</TableCell>
              <TableCell sx={{ color: 'white' }}>Zip</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Sale date</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Price</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Acres</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Sq ft</TableCell>
              <TableCell sx={{ color: 'white' }}>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }} color="text.secondary">
                  Set filters and click Search. Use &quot;Sample data&quot; to see example results.
                </TableCell>
              </TableRow>
            )}
            {results.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.address}</TableCell>
                <TableCell>{row.city}</TableCell>
                <TableCell>{row.state}</TableCell>
                <TableCell>{row.zip}</TableCell>
                <TableCell align="right">{row.saleDate}</TableCell>
                <TableCell align="right">{formatMoney(row.price)}</TableCell>
                <TableCell align="right">{row.acres ?? '—'}</TableCell>
                <TableCell align="right">{row.sqft != null ? row.sqft.toLocaleString() : '—'}</TableCell>
                <TableCell>
                  <Chip label={row.propertyType} size="small" variant="outlined" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MarketResearch;
