import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeamOverviewScreen from '../screens/TeamOverviewScreen';
import TeamMapScreen from '../screens/TeamMapScreen';
import TeamLeaderboardScreen from '../screens/TeamLeaderboardScreen';
import TeamBroadcastsScreen from '../screens/TeamBroadcastsScreen';
import FieldRequestApprovalsScreen from '../screens/FieldRequestApprovalsScreen';
import TeamLeaderAccountScreen from '../screens/TeamLeaderAccountScreen';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ScreenStack({ component: Component, title }) {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: styles.headerTitle,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name={title} component={Component} options={{ title }} />
    </Stack.Navigator>
  );
}

function OverviewStack() { return <ScreenStack component={TeamOverviewScreen} title="Team overview" />; }
function MapStack() { return <ScreenStack component={TeamMapScreen} title="Live team map" />; }
function LeaderboardStack() { return <ScreenStack component={TeamLeaderboardScreen} title="Leaderboard" />; }
function BroadcastsStack() { return <ScreenStack component={TeamBroadcastsScreen} title="Broadcasts" />; }
function RequestsStack() { return <ScreenStack component={FieldRequestApprovalsScreen} title="Field requests" />; }
function AccountStack() { return <ScreenStack component={TeamLeaderAccountScreen} title="Account" />; }

const icons = {
  Overview: 'grid-outline',
  Map: 'map-outline',
  Leaderboard: 'trophy-outline',
  Broadcasts: 'megaphone-outline',
  Requests: 'checkmark-done-outline',
  Account: 'person-circle-outline',
};

export default function TeamLeaderNavigator() {
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
      <Tab.Screen name="Overview" component={OverviewStack} />
      <Tab.Screen name="Map" component={MapStack} />
      <Tab.Screen name="Leaderboard" component={LeaderboardStack} />
      <Tab.Screen name="Broadcasts" component={BroadcastsStack} />
      <Tab.Screen name="Requests" component={RequestsStack} options={{ title: 'Requests' }} />
      <Tab.Screen name="Account" component={AccountStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: typography.fontFamilyExtraBold },
  tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 9, fontWeight: '600' },
});
