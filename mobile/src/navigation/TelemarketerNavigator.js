import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import FollowUpsScreen from '../screens/FollowUpsScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import LeadListScreen from '../screens/LeadListScreen';
import TelemarketerHomeScreen from '../screens/TelemarketerHomeScreen';
import RoleMoreScreen from '../screens/RoleMoreScreen';
import BroadcastFeedScreen from '../screens/BroadcastFeedScreen';
import FieldRequestScreen from '../screens/FieldRequestScreen';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const icons = { Home: 'home-outline', Leads: 'people-outline', FollowUps: 'calendar-outline', Calls: 'call-outline', More: 'menu-outline' };

function ScreenStack({ screens }) {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: styles.headerTitle,
      contentStyle: { backgroundColor: colors.background },
    }}>
      {screens.map(({ name, component: Component, title }) => (
        <Stack.Screen key={name} name={name} component={Component} options={{ title }} />
      ))}
    </Stack.Navigator>
  );
}

function HomeStack() {
  return <ScreenStack screens={[{ name: 'TelemarketerHome', component: TelemarketerHomeScreen, title: 'Home' }]} />;
}

function LeadsStack() {
  return <ScreenStack screens={[
    { name: 'LeadList', component: LeadListScreen, title: 'Leads' },
    { name: 'LeadDetail', component: LeadDetailScreen, title: 'Lead details' },
  ]} />;
}

function FollowUpsStack() {
  return <ScreenStack screens={[
    { name: 'FollowUpsList', component: FollowUpsScreen, title: 'Follow-ups' },
    { name: 'LeadDetail', component: LeadDetailScreen, title: 'Lead details' },
  ]} />;
}

function CallsStack() {
  return <ScreenStack screens={[{ name: 'CallHistory', component: CallHistoryScreen, title: 'Calls' }]} />;
}

function MoreStack() {
  return <ScreenStack screens={[
    { name: 'More', component: RoleMoreScreen, title: 'More' },
    { name: 'BroadcastFeed', component: BroadcastFeedScreen, title: 'Team announcements' },
    { name: 'FieldRequest', component: FieldRequestScreen, title: 'Field requests' },
  ]} />;
}

export default function TelemarketerNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />,
    })}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Leads" component={LeadsStack} />
      <Tab.Screen name="FollowUps" component={FollowUpsStack} options={{ title: 'Follow-ups' }} />
      <Tab.Screen name="Calls" component={CallsStack} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: typography.fontFamilyExtraBold },
  tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' },
});
