import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/auth/AuthContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}

function AppContent() { return <AppShell />; }

function AppShell() {
  const { colors, mode } = useTheme();
  return <><StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} /><LanguageProvider><AuthProvider><AppNavigator /></AuthProvider></LanguageProvider></>;
}
