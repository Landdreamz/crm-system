import React from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Stack,
} from '@mui/material';
import { useThemeMode } from '../../../theme/ThemeModeContext';
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';

export default function Settings() {
  const { mode, setMode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customize your CRM view and preferences.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDark ? (
              <DarkModeIcon color="primary" />
            ) : (
              <LightModeIcon color="action" />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={isDark}
                  onChange={(_, checked) => setMode(checked ? 'dark' : 'light')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Dark mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reduces eye strain in low light. Use dark backgrounds and light text.
                  </Typography>
                </Box>
              }
              labelPlacement="end"
              sx={{ alignItems: 'flex-start', mr: 0 }}
            />
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
