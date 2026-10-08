import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ActivationEntryScreen from '../screens/ActivationEntryScreen';
import ActivationListScreen from '../screens/ActivationListScreen';
import RoleMoreScreen from '../screens/RoleMoreScreen';
import BroadcastFeedScreen from '../screens/BroadcastFeedScreen';
import FieldRequestScreen from '../screens/FieldRequestScreen';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AccountStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: styles.headerTitle,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="AccountHome" component={RoleMoreScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="BroadcastFeed" component={BroadcastFeedScreen} options={{ title: 'Team announcements' }} />
      <Stack.Screen name="FieldRequest" component={FieldRequestScreen} options={{ title: 'Field requests' }} />
    </Stack.Navigator>
  );
}

function ActivationStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: styles.headerTitle,
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="ActivationList" component={ActivationListScreen} options={{ title: 'Activations' }} />
      <Stack.Screen name="ActivationEntry" component={ActivationEntryScreen} options={{ title: 'Field activation' }} />
    </Stack.Navigator>
  );
}

export default function BrandAmbassadorNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={route.name === 'ActivationsTab' ? 'megaphone-outline' : 'person-circle-outline'} color={color} size={size} />
      ),
    })}>
      <Tab.Screen name="ActivationsTab" component={ActivationStack} options={{ title: 'Activations' }} />
      <Tab.Screen
        name="Account"
        component={AccountStack}
        options={{
          title: 'Account',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: typography.fontFamilyExtraBold },
  tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' },
});
