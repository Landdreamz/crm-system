import { createTheme, alpha } from '@mui/material/styles';

type PaletteMode = 'light' | 'dark';

const fontStack = '"Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const lightColors = {
  primary: '#0ba360',
  primaryContrast: '#ffffff',
  secondary: '#3cba92',
  success: '#26a87a',
  background: { default: '#f4f4f5', paper: '#ffffff' },
  text: { primary: '#18181b', secondary: '#71717a' },
  divider: 'rgba(0, 0, 0, 0.08)',
};

const darkColors = {
  /** Blue accent — modern dashboard (reference-style) */
  primary: '#3b82f6',
  primaryContrast: '#ffffff',
  secondary: '#64748b',
  success: '#34d399',
  background: { default: '#09090b', paper: '#18181b' },
  text: { primary: '#fafafa', secondary: '#a1a1aa' },
  divider: 'rgba(255, 255, 255, 0.08)',
};

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return createTheme({
    palette: {
      mode,
      primary: { main: colors.primary, contrastText: colors.primaryContrast },
      secondary: { main: colors.secondary },
      success: { main: colors.success },
      background: colors.background,
      text: colors.text,
      divider: colors.divider,
      action: {
        hover: isDark ? alpha('#ffffff', 0.06) : alpha('#000000', 0.04),
        selected: isDark ? alpha(colors.primary, 0.14) : alpha(colors.primary, 0.1),
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: fontStack,
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#3f3f46 #09090b' : '#d4d4d8 #f4f4f5',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 600,
          },
          containedPrimary: {
            borderRadius: 9999,
            paddingLeft: '1.25rem',
            paddingRight: '1.25rem',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: colors.divider,
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
          color: 'default',
        },
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha('#09090b', 0.92) : colors.background.paper,
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${colors.divider}`,
            color: colors.text.primary,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#0c0c0e' : colors.background.paper,
            borderRight: `1px solid ${colors.divider}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
            marginLeft: theme.spacing(1),
            marginRight: theme.spacing(1),
            marginTop: 2,
            marginBottom: 2,
            paddingLeft: theme.spacing(1.5),
            borderLeft: '3px solid transparent',
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.1),
              borderLeftColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.14),
              },
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: ({ theme }) => ({
            minWidth: 40,
            color: theme.palette.text.secondary,
            '.MuiListItemButton-root.Mui-selected > &': {
              color: theme.palette.primary.main,
            },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: ({ theme }) => ({
            fontWeight: 600,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: theme.palette.text.secondary,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: isDark ? alpha('#ffffff', 0.02) : alpha('#000000', 0.02),
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: isDark ? `1px solid ${colors.divider}` : undefined,
          },
        },
      },
    },
  });
}
