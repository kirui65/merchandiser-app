import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import LeadListScreen from '../screens/LeadListScreen';
import RoleMoreScreen from '../screens/RoleMoreScreen';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const icons = { LeadTab: 'people-outline', CallHistory: 'call-outline', More: 'menu-outline' };

function LeadStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: styles.headerTitle,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="LeadList" component={LeadListScreen} options={{ title: 'Leads' }} />
      <Stack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: 'Lead details' }} />
    </Stack.Navigator>
  );
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
      <Tab.Screen name="LeadTab" component={LeadStack} options={{ title: 'Leads' }} />
      <Tab.Screen
        name="CallHistory"
        component={CallHistoryScreen}
        options={({ route }) => ({
          title: 'Calls',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerTitleStyle: styles.headerTitle,
        })}
      />
      <Tab.Screen name="More" component={RoleMoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: typography.fontFamilyExtraBold },
  tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' },
});
