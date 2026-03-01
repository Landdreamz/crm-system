import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { PaletteMode } from '@mui/material/styles';

const THEME_MODE_KEY = 'crmThemeMode';

function loadThemeMode(): PaletteMode {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_MODE_KEY) : null;
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    /* ignore */
  }
  return 'light';
}

function saveThemeMode(mode: PaletteMode) {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

type ThemeModeContextValue = {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PaletteMode>(loadThemeMode);

  const setMode = useCallback((next: PaletteMode) => {
    setModeState(next);
    saveThemeMode(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}
