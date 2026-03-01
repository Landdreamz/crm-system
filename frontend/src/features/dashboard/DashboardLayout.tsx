import React, { useState, useEffect, useCallback } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Select,
  MenuItem,
  Paper,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShowChartOutlined as SalesIcon,
  PeopleOutlined as ContactsIcon,
  AccountTreeOutlined as PipelineIcon,
  CalendarTodayOutlined as CalendarIcon,
  SettingsOutlined as SettingsIcon,
  TaskOutlined as TaskIcon,
  NotificationsOutlined as NotificationsIcon,
  CalculateOutlined as CalculateIcon,
  LandscapeOutlined as LandIcon,
  MapOutlined as ParcelApiIcon,
  CodeOutlined as CodeIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  SchoolOutlined as TrainingIcon,
  CampaignOutlined as MarketingIcon,
  AutoFixHighOutlined as AutomationIcon,
  SmartToyOutlined as AIIcon,
  PhoneOutlined as PhoneIcon,
  AssessmentOutlined as AssessmentIcon,
  Logout as LogoutIcon,
  AssignmentOutlined as DealDeskIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import SalesPerformance from './components/SalesPerformance';
import DealDesk from './components/DealDesk';
import Contacts, { loadContacts, saveContacts } from './components/Contacts';
import Announcements from './components/Announcements';
import AmortizationCalculator from './components/AmortizationCalculator';
import { LandCalculator } from './components/LandCalculator';
import TrainingResources from './components/TrainingResources';
import MarketingChannel from './components/MarketingChannel';
import AutomationWorkflows from './components/AutomationWorkflows';
import AskAI from './components/AskAI';
import PowerDialer from './components/PowerDialer';
import MarketResearch from './components/MarketResearch';
import PipelineManagement from './components/PipelineManagement';
import Settings from './components/Settings';
import TasksView from './components/TasksView';
import ParcelApiMap, { type MapFlyToResult } from './components/ParcelApiMap';
import type { Contact } from './components/types';

const PARCEL_API_BASE = typeof process !== 'undefined' ? (process.env.REACT_APP_PARCEL_API_URL || 'http://localhost:8001') : 'http://localhost:8001';

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

type ParcelSearchResult =
  | { type: 'center'; lat: number; lng: number; zoom: number }
  | { type: 'parcel'; props: Record<string, unknown> }
  | null;

function ParcelApiContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<ParcelSearchResult>(null);
  const [searching, setSearching] = useState(false);
  const [mapView, setMapView] = useState<'streets' | 'satellite'>('streets');
  const [mapFlyToResult, setMapFlyToResult] = useState<MapFlyToResult>(null);
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [parcelGeometry, setParcelGeometry] = useState<GeoJSON.Polygon | GeoJSON.MultiPolygon | null>(null);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setMapFlyToResult(null);
    setSearchCenter(null);
    setParcelGeometry(null);
    try {
      if (isLikelyApn(q)) {
        const url = `${PARCEL_API_BASE.replace(/\/$/, '')}/parcels/by-apn?apn=${encodeURIComponent(q.trim())}`;
        const res = await fetch(url);
        if (!res.ok) {
          const isLocalhost = typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
          const msg = res.status === 404 || res.status >= 500
            ? isLocalhost
              ? `Parcel API error (${res.status}). Is the server running? Set REACT_APP_PARCEL_API_URL in frontend .env (e.g. http://localhost:8001) and run: uvicorn app:app --port 8001 in parcel_api/`
              : `Parcel API error (${res.status}). The deployed Parcel API may be down or not configured for this site.`
            : 'Parcel API error';
          throw new Error(msg);
        }
        const fc = (await res.json()) as { features?: GeoJSON.Feature[] };
        const features = fc?.features ?? [];
        if (features.length === 0) {
          setSearchError('No parcel found for this APN. The parcel API database may not contain it, or the APN format may differ (try with/without dashes).');
          return;
        }
        const first = features[0];
        const props = (first?.properties || {}) as Record<string, unknown>;
        setSearchResult({ type: 'parcel', props });
        const geom = first?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined;
        if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
          setParcelGeometry(geom);
          let points: [number, number][] = [];
          if (geom.type === 'Polygon') {
            points = geom.coordinates[0] as [number, number][];
          } else {
            for (const poly of geom.coordinates) points = points.concat((poly[0] as [number, number][]));
          }
          if (points.length > 0) {
            const lats = points.map((p) => p[1]);
            const lngs = points.map((p) => p[0]);
            setMapFlyToResult({
              type: 'bounds',
              south: Math.min(...lats),
              west: Math.min(...lngs),
              north: Math.max(...lats),
              east: Math.max(...lngs),
            });
          }
        } else {
          setParcelGeometry(null);
        }
        return;
      }
      const coords = await geocodeAddress(q);
      if (coords) {
        setSearchResult({ type: 'center', lat: coords[0], lng: coords[1], zoom: 17 });
        setMapFlyToResult({ type: 'center', lat: coords[0], lng: coords[1], zoom: 17 });
        setSearchCenter(coords);
      } else {
        setSearchError('Address not found. Try a different search or search by APN.');
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Search failed';
      const isNetworkError = /failed to fetch|load failed|network error|connection refused/i.test(errMsg) || (e instanceof TypeError && errMsg.includes('fetch'));
      if (isLikelyApn(q) && isNetworkError) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        const isLocalhost = /^localhost$|^127\.0\.0\.1$/.test(host);
        const isLiveSite = /github\.io$/.test(host) || (!isLocalhost && host.length > 0);
        setSearchError(
          isLocalhost
            ? 'Cannot reach the Parcel API. Start the server in a terminal: cd parcel_api && uvicorn app:app --reload --port 8001'
            : isLiveSite
              ? 'Parcel API is not set up for this site. To enable APN search here: (1) Deploy the Parcel API on Render, (2) Add variable REACT_APP_PARCEL_API_URL in GitHub repo Settings → Actions → Variables, (3) Push a commit to trigger a new deploy. See the repo docs/PARCEL_API_CHECKLIST.md for step-by-step.'
              : 'Cannot reach the Parcel API. Run it locally: cd parcel_api && uvicorn app:app --port 8001'
        );
      } else {
        setSearchError(errMsg);
      }
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchError(null);
    setSearchResult(null);
    setMapFlyToResult(null);
    setSearchCenter(null);
    setParcelGeometry(null);
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
          <ParcelApiIcon fontSize="small" /> Map
        </Typography>
        <ParcelApiMap
          mapView={mapView}
          onMapViewChange={setMapView}
          flyToResult={mapFlyToResult}
          searchCenter={searchCenter}
          parcelGeometry={parcelGeometry}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ParcelApiIcon fontSize="small" /> Guide
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

type Section = 'Sales Performance' | 'Deal Desk' | 'Market Research' | 'Contacts' | 'Pipeline Management' | 'Calendar' | 'Tasks' | 'Settings' | 'Parcel API' | 'Announcements' | 'Amortization Calculator' | 'Land Evaluation Calculator' | 'Training & Resources' | 'Marketing Channel' | 'Automation & Workflows' | 'Ask A.I' | 'Power Dialer';

const CRM_ACTIVE_ID_KEY = 'crmActiveId';

export type CrmId = 'acq' | 'dispo';

const CRMS: { id: CrmId; name: string }[] = [
  { id: 'acq', name: 'ACQ CRM' },
  { id: 'dispo', name: 'Dispo CRM' },
];

function loadActiveCrmId(): CrmId {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CRM_ACTIVE_ID_KEY) : null;
    if (raw === 'acq' || raw === 'dispo') return raw;
  } catch {
    /* ignore */
  }
  return 'acq';
}

function saveActiveCrmId(id: CrmId) {
  try {
    localStorage.setItem(CRM_ACTIVE_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  minHeight: '100vh',
  background: theme.palette.background.default,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const MENU_ITEMS: { text: Section; icon: React.ReactNode }[] = [
  { text: 'Land Evaluation Calculator', icon: <LandIcon /> },
  { text: 'Amortization Calculator', icon: <CalculateIcon /> },
  { text: 'Contacts', icon: <ContactsIcon /> },
  { text: 'Pipeline Management', icon: <PipelineIcon /> },
  { text: 'Calendar', icon: <CalendarIcon /> },
  { text: 'Sales Performance', icon: <SalesIcon /> },
  { text: 'Deal Desk', icon: <DealDeskIcon /> },
  { text: 'Market Research', icon: <AssessmentIcon /> },
  { text: 'Marketing Channel', icon: <MarketingIcon /> },
  { text: 'Automation & Workflows', icon: <AutomationIcon /> },
  { text: 'Power Dialer', icon: <PhoneIcon /> },
  { text: 'Ask A.I', icon: <AIIcon /> },
  { text: 'Announcements', icon: <NotificationsIcon /> },
  { text: 'Training & Resources', icon: <TrainingIcon /> },
  { text: 'Tasks', icon: <TaskIcon /> },
  { text: 'Settings', icon: <SettingsIcon /> },
  { text: 'Parcel API', icon: <ParcelApiIcon /> },
];

interface DashboardLayoutProps {
  onLogout?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onLogout }) => {
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const [selectedSection, setSelectedSection] = React.useState<Section>('Parcel API');
  const [currentCrmId, setCurrentCrmId] = useState<CrmId>(loadActiveCrmId);
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts(loadActiveCrmId()));
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  useEffect(() => {
    saveContacts(contacts, currentCrmId);
  }, [contacts, currentCrmId]);

  const handleSwitchCrm = (crmId: CrmId) => {
    if (crmId === currentCrmId) return;
    setCurrentCrmId(crmId);
    setContacts(loadContacts(crmId));
    setSelectedContactId(null);
    saveActiveCrmId(crmId);
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts((prev) => {
      const next = prev.map((c) => {
        if (c.id !== updated.id) return c;
        // Use the tasks array from TasksView as-is (no remap) so dueTime is never dropped
        const tasks = updated.tasks ?? c.tasks ?? [];
        return {
          ...c,
          ...updated,
          tasks,
        };
      });
      // Persist immediately with the exact state we're setting
      saveContacts(next, currentCrmId);
      return next;
    });
  };

  const handleOpenContact = (contactId: number) => {
    setSelectedContactId(contactId);
    setSelectedSection('Contacts');
  };

  const addContactToOtherCrm = (contact: Contact, targetCrmId: string) => {
    if (contact.alsoInCrmIds?.includes(targetCrmId)) return;
    const otherContacts = loadContacts(targetCrmId as CrmId);
    const newId = otherContacts.length === 0 ? 1 : Math.max(...otherContacts.map((c) => c.id)) + 1;
    const copy: Contact = {
      ...contact,
      id: newId,
      alsoInCrmIds: [...(contact.alsoInCrmIds ?? []).filter((id) => id !== targetCrmId), currentCrmId],
    };
    saveContacts([...otherContacts, copy], targetCrmId as CrmId);
    handleUpdateContact({ ...contact, alsoInCrmIds: [...(contact.alsoInCrmIds ?? []), targetCrmId] });
  };

  const renderContent = () => {
    // Market Research: match exactly or by prefix so we never show Coming Soon for it
    if (selectedSection === 'Market Research' || selectedSection.startsWith('Market Research')) {
      return <MarketResearch />;
    }
    switch (selectedSection) {
      case 'Sales Performance':
        return <SalesPerformance />;
      case 'Deal Desk':
        return (
          <Box sx={{ flexGrow: 1, p: 2 }}>
            <DealDesk />
          </Box>
        );
      case 'Marketing Channel':
        return <MarketingChannel />;
      case 'Automation & Workflows':
        return <AutomationWorkflows />;
      case 'Power Dialer':
        return <PowerDialer contacts={contacts} />;
      case 'Ask A.I':
        return <AskAI />;
      case 'Contacts':
        return (
          <Contacts
            contacts={contacts}
            setContacts={setContacts}
            selectedContactId={selectedContactId}
            setSelectedContactId={setSelectedContactId}
            crmId={currentCrmId}
          />
        );
      case 'Pipeline Management':
        return (
          <PipelineManagement
            contacts={contacts}
            onUpdateContact={handleUpdateContact}
            onOpenContact={handleOpenContact}
            crmId={currentCrmId}
            crms={CRMS}
            onAddContactToOtherCrm={addContactToOtherCrm}
          />
        );
      case 'Announcements':
        return <Announcements />;
      case 'Amortization Calculator':
        return <AmortizationCalculator />;
      case 'Land Evaluation Calculator':
        return <LandCalculator />;
      case 'Training & Resources':
        return <TrainingResources />;
      case 'Tasks':
        return (
          <TasksView
            contacts={contacts}
            onOpenContact={handleOpenContact}
            onUpdateContact={handleUpdateContact}
            onPersistContacts={saveContacts}
            crmId={currentCrmId}
          />
        );
      case 'Settings':
        return <Settings />;
      case 'Parcel API':
        return <ParcelApiContent />;
      default:
        return (
          <Typography variant="h6">
            {selectedSection} - Coming Soon
          </Typography>
        );
    }
  };

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const greenGradient = 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: greenGradient }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: greenGradient,
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Select
            value={currentCrmId}
            onChange={(e) => handleSwitchCrm(e.target.value as CrmId)}
            variant="standard"
            disableUnderline
            IconComponent={ArrowDropDownIcon}
            sx={{
              color: 'inherit',
              fontSize: '1.25rem',
              fontWeight: 600,
              minWidth: 160,
              '& .MuiSelect-select': { py: 0.5 },
              '& .MuiSvgIcon-root': { color: 'inherit' },
            }}
          >
            {CRMS.map((crm) => (
              <MenuItem key={crm.id} value={crm.id}>
                {crm.name}
              </MenuItem>
            ))}
          </Select>
          <Box sx={{ flexGrow: 1 }} />
          {onLogout && (
            <IconButton color="inherit" onClick={onLogout} aria-label="Log out" size="medium">
              <LogoutIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: theme.palette.background.paper,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {MENU_ITEMS.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={selectedSection === item.text}
                  onClick={() => setSelectedSection(item.text as Section)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
            App: crm-system
          </Typography>
        </Box>
      </Drawer>
      <Main open={open}>
        <Toolbar />
        {renderContent()}
      </Main>
    </Box>
  );
};

export default DashboardLayout; 