import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/auth/AuthContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/tokens';

export default function App() {
  return <><StatusBar barStyle="dark-content" backgroundColor={colors.surface} translucent={false} /><LanguageProvider><AuthProvider><AppNavigator /></AuthProvider></LanguageProvider></>;
}
