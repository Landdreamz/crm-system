import React, { useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Button } from '@mui/material';
import DashboardLayout from './features/dashboard/DashboardLayout';
import LoginPage, { isAuthenticated, setAuthenticated as persistAuth } from './features/auth/LoginPage';
import { createAppTheme } from './theme/theme';
import { ThemeModeProvider, useThemeMode } from './theme/ThemeModeContext';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h5" color="error" gutterBottom>Something went wrong</Typography>
          <Typography variant="body2" component="pre" sx={{ overflow: 'auto', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            {this.state.error.message}
          </Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());
  const { mode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const handleLogout = () => {
    persistAuth(false);
    setAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
        {authenticated ? (
          <DashboardLayout onLogout={handleLogout} />
        ) : (
          <LoginPage onEnter={() => setAuthenticated(true)} />
        )}
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <AppContent />
    </ThemeModeProvider>
  );
}

export default App;
