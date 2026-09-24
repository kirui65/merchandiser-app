import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import MoreScreen from '../screens/MoreScreen';
import { typography } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const RootStack = createNativeStackNavigator(); const Tab = createBottomTabNavigator(); const HomeStack = createNativeStackNavigator(); const RouteStack = createNativeStackNavigator(); const OutletsStack = createNativeStackNavigator(); const SalesStack = createNativeStackNavigator(); const MoreStack = createNativeStackNavigator();
const screenOptions = (colors) => ({ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.ink, headerTitleStyle: styles.headerTitle, contentStyle: { backgroundColor: colors.background } });

function HomeNavigator() { const { colors } = useTheme(); return <HomeStack.Navigator screenOptions={screenOptions(colors)}><HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} /></HomeStack.Navigator>; }
function RouteNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <RouteStack.Navigator screenOptions={screenOptions(colors)}><RouteStack.Screen name="RouteMap" component={RouteMapScreen} options={{ title: t('routeMapTitle') }} /></RouteStack.Navigator>; }
function OutletsNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <OutletsStack.Navigator screenOptions={screenOptions(colors)}><OutletsStack.Screen name="Outlets" component={OutletListScreen} options={{ title: t('assignedOutlets') }} /><OutletsStack.Screen name="SaleEntry" component={SaleEntryScreen} options={{ title: t('logSale') }} /></OutletsStack.Navigator>; }
function SalesNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <SalesStack.Navigator screenOptions={screenOptions(colors)}><SalesStack.Screen name="History" component={HistoryScreen} options={{ title: t('salesHistory') }} /><SalesStack.Screen name="SaleEntry" component={SaleEntryScreen} options={{ title: t('logSale') }} /></SalesStack.Navigator>; }
function MoreNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <MoreStack.Navigator screenOptions={screenOptions(colors)}><MoreStack.Screen name="More" component={MoreScreen} options={{ headerShown: false }} /><MoreStack.Screen name="Performance" component={PerformanceScreen} options={{ title: t('performanceTitle') }} /><MoreStack.Screen name="ShiftHistory" component={ShiftHistoryScreen} options={{ title: t('shiftHistoryTitle') }} /><MoreStack.Screen name="PendingSales" component={PendingSalesScreen} options={{ title: t('pendingSalesTitle') }} /><MoreStack.Screen name="History" component={HistoryScreen} options={{ title: t('salesHistory') }} /></MoreStack.Navigator>; }

function AppTabs() { const { colors } = useTheme(); const { t } = useLanguage(); const icons = { HomeTab: ['home-outline', 'home'], RouteTab: ['navigate-outline', 'navigate'], OutletsTab: ['storefront-outline', 'storefront'], SalesTab: ['cash-outline', 'cash'], MoreTab: ['menu-outline', 'menu'] }; return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: styles.tabLabel, tabBarIcon: ({ color, focused, size }) => <Ionicons name={icons[route.name][focused ? 1 : 0]} color={color} size={size} /> })}><Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Home' }} /><Tab.Screen name="RouteTab" component={RouteNavigator} options={{ title: t('todaysRoute') }} /><Tab.Screen name="OutletsTab" component={OutletsNavigator} options={{ title: t('assignedOutlets') }} /><Tab.Screen name="SalesTab" component={SalesNavigator} options={{ title: 'Sales' }} /><Tab.Screen name="MoreTab" component={MoreNavigator} options={{ title: 'More' }} /></Tab.Navigator>; }

export default function AppNavigator() { const { user, loading } = useAuth(); if (loading) return null; return <NavigationContainer><RootStack.Navigator screenOptions={{ headerShown: false }}>{user ? <RootStack.Screen name="MainTabs" component={AppTabs} /> : <RootStack.Screen name="Login" component={LoginScreen} />}</RootStack.Navigator></NavigationContainer>; }
const styles = StyleSheet.create({ headerTitle: { fontFamily: typography.fontFamilyExtraBold }, tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' } });
