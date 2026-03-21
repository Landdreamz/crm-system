import React from 'react';
import { Box, Typography, Button, Paper, useTheme } from '@mui/material';

const AUTH_STORAGE_KEY = 'dealvision_authenticated';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function setAuthenticated(value: boolean): void {
  if (typeof window === 'undefined') return;
  if (value) localStorage.setItem(AUTH_STORAGE_KEY, 'true');
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

interface LoginPageProps {
  onEnter: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onEnter }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleEnter = () => {
    setAuthenticated(true);
    onEnter();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(59, 130, 246, 0.18), transparent 55%)'
          : 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(11, 163, 96, 0.12), transparent 55%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.04em',
            mb: 0.5,
          }}
        >
          Deal Vision
          <Typography component="span" sx={{ fontWeight: 600, color: 'primary.main', ml: 0.5 }}>
            CRM
          </Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to your workspace
        </Typography>
        <Button variant="contained" color="primary" size="large" fullWidth onClick={handleEnter} sx={{ py: 1.25, fontSize: '1rem' }}>
          Enter
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage;
