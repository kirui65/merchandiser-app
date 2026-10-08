import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import RoleMoreScreen from '../screens/RoleMoreScreen';
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

function OverviewStack() { return <ScreenStack component={AdminHomeScreen} title="Company overview" />; }
function MoreStack() { return <ScreenStack component={RoleMoreScreen} title="More" />; }

export default function AdminNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={route.name === 'Overview' ? 'grid-outline' : 'menu-outline'} color={color} size={size} />
      ),
    })}>
      <Tab.Screen name="Overview" component={OverviewStack} options={{ title: 'Overview' }} />
      <Tab.Screen name="More" component={MoreStack} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: typography.fontFamilyExtraBold },
  tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' },
});
