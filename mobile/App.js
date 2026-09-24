import React from 'react';
import { StatusBar, Text, TextInput } from 'react-native';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { AuthProvider } from './src/auth/AuthContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { typography } from './src/theme/tokens';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [Text.defaultProps.style, { fontFamily: typography.fontFamily }];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [TextInput.defaultProps.style, { fontFamily: typography.fontFamily }];

export default function App() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!fontsLoaded) return null;
  return <ThemeProvider><AppContent /></ThemeProvider>;
}

function AppContent() { return <AppShell />; }

function AppShell() {
  const { colors, mode } = useTheme();
  return <><StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} translucent={false} /><LanguageProvider><AuthProvider><AppNavigator /></AuthProvider></LanguageProvider></>;
}
