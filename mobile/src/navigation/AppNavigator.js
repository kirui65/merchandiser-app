import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import LoginFlowScreen from '../auth/LoginFlowScreen';
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
import TelemarketerNavigator from './TelemarketerNavigator';
import BrandAmbassadorNavigator from './BrandAmbassadorNavigator';
import OutletAuditScreen from '../screens/OutletAuditScreen';
import CompetitorPriceScreen from '../screens/CompetitorPriceScreen';
import NewOutletScreen from '../screens/NewOutletScreen';
import TeamLeaderNavigator from './TeamLeaderNavigator';
import AdminNavigator from './AdminNavigator';
import BroadcastFeedScreen from '../screens/BroadcastFeedScreen';
import FieldRequestScreen from '../screens/FieldRequestScreen';
import RecruiterNavigator from './RecruiterNavigator';

const RootStack = createNativeStackNavigator(); const Tab = createBottomTabNavigator(); const HomeStack = createNativeStackNavigator(); const RouteStack = createNativeStackNavigator(); const OutletsStack = createNativeStackNavigator(); const SalesStack = createNativeStackNavigator(); const MoreStack = createNativeStackNavigator();
const screenOptions = (colors) => ({ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.ink, headerTitleStyle: styles.headerTitle, contentStyle: { backgroundColor: colors.background } });

function HomeNavigator() { const { colors } = useTheme(); return <HomeStack.Navigator screenOptions={screenOptions(colors)}><HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} /></HomeStack.Navigator>; }
function RouteNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <RouteStack.Navigator screenOptions={screenOptions(colors)}><RouteStack.Screen name="RouteMap" component={RouteMapScreen} options={{ title: t('routeMapTitle') }} /></RouteStack.Navigator>; }
function OutletsNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <OutletsStack.Navigator screenOptions={screenOptions(colors)}><OutletsStack.Screen name="Outlets" component={OutletListScreen} options={{ title: t('assignedOutlets') }} /><OutletsStack.Screen name="SaleEntry" component={SaleEntryScreen} options={{ title: t('logSale') }} /><OutletsStack.Screen name="OutletAudit" component={OutletAuditScreen} options={{ title: 'Stock & planogram' }} /><OutletsStack.Screen name="CompetitorPrice" component={CompetitorPriceScreen} options={{ title: 'Competitor price' }} /><OutletsStack.Screen name="NewOutlet" component={NewOutletScreen} options={{ title: 'New outlet' }} /></OutletsStack.Navigator>; }
function SalesNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <SalesStack.Navigator screenOptions={screenOptions(colors)}><SalesStack.Screen name="History" component={HistoryScreen} options={{ title: t('salesHistory') }} /><SalesStack.Screen name="SaleEntry" component={SaleEntryScreen} options={{ title: t('logSale') }} /></SalesStack.Navigator>; }
function MoreNavigator() { const { colors } = useTheme(); const { t } = useLanguage(); return <MoreStack.Navigator screenOptions={screenOptions(colors)}><MoreStack.Screen name="More" component={MoreScreen} options={{ headerShown: false }} /><MoreStack.Screen name="Performance" component={PerformanceScreen} options={{ title: t('performanceTitle') }} /><MoreStack.Screen name="ShiftHistory" component={ShiftHistoryScreen} options={{ title: t('shiftHistoryTitle') }} /><MoreStack.Screen name="PendingSales" component={PendingSalesScreen} options={{ title: t('pendingSalesTitle') }} /><MoreStack.Screen name="History" component={HistoryScreen} options={{ title: t('salesHistory') }} /><MoreStack.Screen name="BroadcastFeed" component={BroadcastFeedScreen} options={{ title: t('teamAnnouncements') }} /><MoreStack.Screen name="FieldRequest" component={FieldRequestScreen} options={{ title: t('fieldRequests') }} /></MoreStack.Navigator>; }

function AppTabs() { const { colors } = useTheme(); const { t } = useLanguage(); const icons = { HomeTab: ['home-outline', 'home'], RouteTab: ['navigate-outline', 'navigate'], OutletsTab: ['storefront-outline', 'storefront'], SalesTab: ['cash-outline', 'cash'], MoreTab: ['menu-outline', 'menu'] }; return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: styles.tabLabel, tabBarIcon: ({ color, focused, size }) => <Ionicons name={icons[route.name][focused ? 1 : 0]} color={color} size={size} /> })}><Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: t('homeTab') }} /><Tab.Screen name="RouteTab" component={RouteNavigator} options={{ title: t('todaysRoute') }} /><Tab.Screen name="OutletsTab" component={OutletsNavigator} options={{ title: t('assignedOutlets') }} /><Tab.Screen name="SalesTab" component={SalesNavigator} options={{ title: t('salesTab') }} /><Tab.Screen name="MoreTab" component={MoreNavigator} options={{ title: t('moreTab') }} /></Tab.Navigator>; }

export default function AppNavigator() { const { user, loading } = useAuth(); if (loading) return null; return <NavigationContainer><RootStack.Navigator screenOptions={{ headerShown: false }}>{user ? (user.role === 'recruiter' ? <RootStack.Screen name="Recruiter" component={RecruiterNavigator} /> : user.role === 'brand_ambassador' ? <RootStack.Screen name="BrandAmbassador" component={BrandAmbassadorNavigator} /> : user.role === 'telemarketer' ? <RootStack.Screen name="Telemarketer" component={TelemarketerNavigator} /> : user.role === 'team_leader' ? <RootStack.Screen name="TeamLeader" component={TeamLeaderNavigator} /> : user.role === 'manager' ? <RootStack.Screen name="Admin" component={AdminNavigator} /> : <RootStack.Screen name="MainTabs" component={AppTabs} />) : <RootStack.Screen name="Login" component={LoginFlowScreen} />}</RootStack.Navigator></NavigationContainer>; }
const styles = StyleSheet.create({ headerTitle: { fontFamily: typography.fontFamilyExtraBold }, tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' } });
