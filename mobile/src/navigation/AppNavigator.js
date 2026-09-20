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
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
	const { user, loading, signOut } = useAuth();
	if (loading) return null;
	return <NavigationContainer><Stack.Navigator screenOptions={{ headerStyle: styles.header, headerTintColor: colors.ink, headerTitleStyle: styles.headerTitle, contentStyle: { backgroundColor: colors.background } }}>{user ? <>
		<Stack.Screen name="Home" component={HomeScreen} options={{ headerRight: () => <Pressable onPress={signOut}><Text style={styles.signOut}>Sign out</Text></Pressable> }} />
		<Stack.Screen name="Outlets" component={OutletListScreen} />
		<Stack.Screen name="SaleEntry" component={SaleEntryScreen} options={{ title: 'Log sale' }} />
		<Stack.Screen name="History" component={HistoryScreen} />
		<Stack.Screen name="RouteMap" component={RouteMapScreen} options={{ title: 'Today\'s route' }} />
	</> : <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />}</Stack.Navigator></NavigationContainer>;
}

const styles = StyleSheet.create({ header: { backgroundColor: colors.surface }, headerTitle: { fontWeight: '800' }, signOut: { color: colors.primary, fontWeight: '800', padding: 8 } });
