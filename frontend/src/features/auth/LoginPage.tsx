import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

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
        background: 'linear-gradient(135deg, #0ba360 0%, #3cba92 50%, #5dd4a8 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" fontWeight={700} color="primary.dark" gutterBottom>
          Deal Vision
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          CRM
        </Typography>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleEnter}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Enter
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage;
