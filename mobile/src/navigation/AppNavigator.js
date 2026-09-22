import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../auth/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import OutletListScreen from '../screens/OutletListScreen';
import SaleEntryScreen from '../screens/SaleEntryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import RouteMapScreen from '../screens/RouteMapScreen';
import PendingSalesScreen from '../screens/PendingSalesScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import ShiftHistoryScreen from '../screens/ShiftHistoryScreen';
import { colors } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
	const { user, loading, signOut } = useAuth();
	const { t } = useLanguage();
	const { colors: activeColors } = useTheme();
	if (loading) return null;
	return <NavigationContainer><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: activeColors.surface }, headerTintColor: activeColors.ink, headerTitleStyle: styles.headerTitle, contentStyle: { backgroundColor: activeColors.background } }}>{user ? <>
		<Stack.Screen name="Home" component={HomeScreen} options={{ headerRight: () => <Pressable onPress={signOut}><Text style={styles.signOut}>{t('signOut')}</Text></Pressable> }} />
		<Stack.Screen name="Outlets" component={OutletListScreen} options={{ title: t('assignedOutlets') }} />
		<Stack.Screen name="SaleEntry" component={SaleEntryScreen} options={{ title: t('logSale') }} />
		<Stack.Screen name="History" component={HistoryScreen} options={{ title: t('salesHistory') }} />
		<Stack.Screen name="RouteMap" component={RouteMapScreen} options={{ title: t('routeMapTitle') }} />
		<Stack.Screen name="PendingSales" component={PendingSalesScreen} options={{ title: t('pendingSalesTitle') }} />
		<Stack.Screen name="Performance" component={PerformanceScreen} options={{ title: t('performanceTitle') }} />
		<Stack.Screen name="ShiftHistory" component={ShiftHistoryScreen} options={{ title: t('shiftHistoryTitle') }} />
	</> : <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />}</Stack.Navigator></NavigationContainer>;
}

const styles = StyleSheet.create({ headerTitle: { fontWeight: '800' }, signOut: { color: colors.primary, fontWeight: '800', padding: 8 } });
