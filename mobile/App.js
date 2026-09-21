import React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './src/auth/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/tokens';

export default function App() {
  return <><StatusBar barStyle="dark-content" backgroundColor={colors.surface} translucent={false} /><AuthProvider><AppNavigator /></AuthProvider></>;
}
