import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import {
  formatMoney,
  formatPropertyLabel,
  getPropertyById,
  loadStoredApiKey,
  saveStoredApiKey,
  suggestProperties,
  TerraScoutXProperty,
} from './terraScoutXApi';

const TerraScoutXTab: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [query, setQuery] = useState('');
  const [noOwner, setNoOwner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<TerraScoutXProperty[]>([]);
  const [selected, setSelected] = useState<TerraScoutXProperty | null>(null);

  useEffect(() => {
    const stored = loadStoredApiKey();
    setApiKey(stored);
    setApiKeyDraft(stored);
  }, []);

  const handleSaveKey = () => {
    saveStoredApiKey(apiKeyDraft);
    setApiKey(apiKeyDraft.trim());
  };

  const handleSearch = async () => {
    setError('');
    setSelected(null);
    if (!apiKey.trim()) {
      setError('Add your TerraScoutX API key below (stored only in this browser).');
      return;
    }
    if (query.trim().length < 2) {
      setError('Enter at least 2 characters (address or parcel ID).');
      return;
    }
    setLoading(true);
    try {
      const list = await suggestProperties(query, apiKey, { noOwner });
      setResults(list);
      if (list.length === 0) {
        setError('No properties found for that search.');
      }
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (property: TerraScoutXProperty) => {
    const id = String(property.id ?? property.parcelId ?? '');
    if (!id || !apiKey.trim()) {
      setSelected(property);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const full = await getPropertyById(id, apiKey, { noOwner });
      setSelected(full);
    } catch (e) {
      setSelected(property);
      setError(e instanceof Error ? e.message : 'Could not load full property record.');
    } finally {
      setLoading(false);
    }
  };

  const detailRows: { label: string; value: unknown }[] = selected
    ? [
        { label: 'Address', value: selected.address ?? (selected as { situsAddress?: string }).situsAddress },
        { label: 'Parcel ID', value: selected.parcelId ?? selected.id },
        { label: 'Total appraised', value: formatMoney(selected.totalAppraised) },
        { label: 'Land value', value: formatMoney(selected.landValue) },
        { label: 'Improvement value', value: formatMoney(selected.improvementValue) },
        { label: 'Acres', value: selected.acres },
        { label: 'Square feet', value: selected.squareFeet },
      ]
    : [];

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
          <TravelExploreIcon color="primary" />
          Terra Scout X
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Search property records by address or parcel ID via the TerraScoutX API. Results can help inform purchase price and
          county appraisal on your amortization worksheet.
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          Your API key is saved only in this browser (localStorage). Do not commit keys to GitHub — on the public site, anyone
          could extract a key embedded in the app. Prefer searching from your local CRM or rotate keys if one is exposed.
        </Alert>

        <Stack spacing={2} sx={{ mb: 3, maxWidth: 720 }}>
          <TextField
            label="TerraScoutX API key"
            type="password"
            size="small"
            fullWidth
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            placeholder="tsx_live_…"
            autoComplete="off"
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={handleSaveKey} disabled={!apiKeyDraft.trim()}>
              Save API key
            </Button>
            {apiKey && (
              <Typography variant="caption" color="success.main" sx={{ alignSelf: 'center' }}>
                Key saved for this browser
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} sx={{ mb: 1 }}>
          <TextField
            label="Address or parcel"
            size="small"
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 1000 Main St Houston or parcel ID"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{ minWidth: 140, flexShrink: 0 }}
          >
            Search
          </Button>
        </Stack>
        <FormControlLabel
          control={<Switch checked={noOwner} onChange={(e) => setNoOwner(e.target.checked)} size="small" />}
          label="Omit owner fields from API response"
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {results.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Results ({results.length})
          </Typography>
          <Stack spacing={1.5}>
            {results.map((p, index) => {
              const key = String(p.id ?? p.parcelId ?? index);
              return (
                <Card key={key} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                      <Box>
                        <Typography variant="subtitle2">{formatPropertyLabel(p)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Appraised: {formatMoney(p.totalAppraised)}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" onClick={() => handleSelect(p)}>
                        View details
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Paper>
      )}

      {selected && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Property details
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {detailRows.map(({ label, value }) =>
              value !== undefined && value !== null && String(value).trim() !== '' && value !== '—' ? (
                <Typography key={label} variant="body2">
                  <strong>{label}:</strong> {String(value)}
                </Typography>
              ) : null
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Raw record
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflow: 'auto',
              fontSize: '0.75rem',
              maxHeight: 320,
            }}
          >
            {JSON.stringify(selected, null, 2)}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default TerraScoutXTab;
