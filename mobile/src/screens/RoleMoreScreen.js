import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { useAuth } from '../auth/AuthContext';
import { isBiometricUnlockEnabled, setBiometricUnlockEnabled } from '../auth/biometric';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

export default function RoleMoreScreen({ navigation }) {
  const { signOut, user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { colors, mode, setMode } = useTheme();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const styles = createStyles(colors);
  const canUseTeamTools = ['rep', 'brand_ambassador', 'telemarketer', 'team_leader'].includes(user?.role);
  const teamLinks = [
    { label: 'Team announcements', icon: 'megaphone-outline', screen: 'BroadcastFeed' },
    { label: 'Request time or field support', icon: 'calendar-outline', screen: 'FieldRequest' },
  ];

  useEffect(() => {
    isBiometricUnlockEnabled()
      .then(setBiometricEnabled)
      .catch((error) => {
        console.error('Could not read biometric preference:', error);
        Alert.alert('Settings unavailable', 'Could not read the biometric sign-in preference.');
      });
  }, []);

  async function toggleBiometric(enabled) {
    try {
      await setBiometricUnlockEnabled(enabled);
      setBiometricEnabled(enabled);
    } catch (error) {
      Alert.alert('Biometric setting not changed', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{user?.name || 'Account'}</Text>
            <Text style={styles.email}>{user?.email || 'Profile settings'}</Text>
          </View>
        </View>

        {canUseTeamTools ? (
          <>
            <Text style={styles.section}>Team</Text>
            <Card style={styles.menu}>
              {teamLinks.map((item) => (
                <Pressable key={item.screen} style={styles.row} onPress={() => navigation.navigate(item.screen)}>
                  <Ionicons name={item.icon} color={colors.primary} size={22} />
                  <Text style={styles.rowText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" color={colors.muted} size={20} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}
        <Text style={styles.section}>Settings</Text>
        <Card style={styles.menu}>
          <View style={styles.row}>
            <Ionicons name="moon-outline" color={colors.primary} size={22} />
            <Text style={styles.rowText}>Dark mode</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={mode === 'dark' ? colors.primary : colors.surface}
            />
          </View>
          <View style={styles.row}>
            <Ionicons name="finger-print-outline" color={colors.primary} size={22} />
            <Text style={styles.rowText}>Biometric unlock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={biometricEnabled ? colors.primary : colors.surface}
            />
          </View>
          <Pressable style={styles.row} onPress={() => setLanguage(language === 'en' ? 'sw' : 'en')}>
            <Ionicons name="language-outline" color={colors.primary} size={22} />
            <Text style={styles.rowText}>Language</Text>
            <Text style={styles.value}>{language === 'en' ? 'English' : 'Kiswahili'}</Text>
            <Ionicons name="chevron-forward" color={colors.muted} size={20} />
          </Pressable>
        </Card>
        <Pressable accessibilityRole="button" style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" color={colors.error} size={22} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primary },
  avatarText: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: 22 },
  profileCopy: { flex: 1 },
  name: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2 },
  email: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: 3 },
  section: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, marginTop: spacing.sm },
  menu: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1, color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: typography.body },
  value: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  signOut: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.errorSoft, borderRadius: radius.md, backgroundColor: colors.errorSoft },
  signOutText: { color: colors.error, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button },
});
