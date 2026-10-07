import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import ActivationEntryScreen from '../screens/ActivationEntryScreen';
import ActivationListScreen from '../screens/ActivationListScreen';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
        component={ActivationAccountScreen}
        options={{
          title: 'Account',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerTitleStyle: styles.headerTitle,
        }}
      />
    </Tab.Navigator>
  );
}

function ActivationAccountScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>{user?.name || 'Brand ambassador'}</Text>
        <Text style={{ color: colors.muted }}>{user?.email}</Text>
        <Pressable onPress={signOut} style={{ minHeight: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.errorSoft, borderRadius: 12 }}>
          <Text style={{ color: colors.error, fontWeight: '700' }}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: typography.fontFamilyExtraBold },
  tabLabel: { fontFamily: typography.fontFamilySemiBold, fontSize: 11, fontWeight: '600' },
});
