import { createTheme, PaletteMode } from '@mui/material/styles';

const greenGradient = 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)';

const lightColors = {
  primary: '#0ba360',
  secondary: '#3cba92',
  success: '#26a87a',
  background: '#FFFFFF',
  paper: '#FFFFFF',
  text: '#2D3748',
  textSecondary: '#4A5568',
};

const darkColors = {
  primary: '#0ba360',
  secondary: '#3cba92',
  success: '#26a87a',
  background: '#121212',
  paper: '#1e1e1e',
  text: '#e0e0e0',
  textSecondary: '#b0b0b0',
};

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
        light: colors.secondary,
        dark: '#098a52',
      },
      secondary: {
        main: colors.secondary,
        light: '#5dd4a8',
        dark: '#2da876',
      },
      success: {
        main: colors.success,
        light: colors.secondary,
        dark: colors.primary,
      },
      background: {
        default: colors.background,
        paper: colors.paper,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: greenGradient,
            color: isDark ? '#fff' : colors.text,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 'none',
            boxShadow: isDark ? '2px 0 8px rgba(0,0,0,0.3)' : '2px 0 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            background: greenGradient,
            '&:hover': {
              background: greenGradient,
              filter: 'brightness(0.95)',
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              background: greenGradient,
              color: isDark ? '#fff' : colors.text,
              '&:hover': {
                background: greenGradient,
                filter: 'brightness(0.95)',
              },
              '& .MuiListItemIcon-root': {
                color: isDark ? '#fff' : colors.text,
              },
            },
          },
        },
      },
    },
  });
}

const theme = createAppTheme('light');
export default theme;
