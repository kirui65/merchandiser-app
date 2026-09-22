import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { colors, darkColors } from './tokens';
import { getDb, initDb } from '../offline/db';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initDb();
    const saved = getDb().getFirstSync("SELECT value FROM app_settings WHERE key = 'themeMode';");
    if (saved?.value === 'dark') setModeState('dark');
    setReady(true);
  }, []);
  const setMode = (nextMode) => {
    setModeState(nextMode);
    getDb().runSync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', ['themeMode', nextMode]);
  };
  const value = useMemo(() => ({ mode, setMode, colors: mode === 'dark' ? darkColors : colors }), [mode]);
  return <ThemeContext.Provider value={value}>{ready ? children : null}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
