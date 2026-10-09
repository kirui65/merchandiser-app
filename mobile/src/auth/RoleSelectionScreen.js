import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLastSelectedRole, rememberSelectedRole } from '../api/auth';
import { useAuth } from './AuthContext';
import {
  canUseBiometricUnlock,
  forgetBiometricLogin,
  getBiometricLoginCredentials,
  getBiometricLoginProfile,
  getBiometricUnlockLabel,
  isBiometricCredentialInvalidated,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from './biometric';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export const LOGIN_ROLES = [
  {
    value: 'merchandiser',
    label: 'Merchandiser',
    description: 'Outlet sales, stock checks and routes',
    icon: 'storefront-outline',
  },
  {
    value: 'brand_ambassador',
    label: 'Brand Ambassador',
    description: 'Activations, samples and surveys',
    icon: 'megaphone-outline',
  },
  {
    value: 'telemarketer',
    label: 'Telemarketer',
    description: 'Leads, calls and follow-ups',
    icon: 'call-outline',
  },
  {
    value: 'team_leader',
    label: 'Team Leader',
    description: 'Team performance and field support',
    icon: 'people-outline',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Company-wide operations and reporting',
    icon: 'briefcase-outline',
  },
];

export default function RoleSelectionScreen({
  onSelectRole,
  onBiometricMfa,
  onSavedLoginOutOfDate,
  selectedRole,
}) {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [lastRole, setLastRole] = useState(null);
  const [biometricProfile, setBiometricProfile] = useState(null);
  const [biometricLabel, setBiometricLabel] = useState(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState(null);
  const [biometricRoleMismatch, setBiometricRoleMismatch] = useState(false);
  const entrances = useRef(LOGIN_ROLES.map(() => new Animated.Value(0))).current;
  const presses = useRef(LOGIN_ROLES.map(() => new Animated.Value(1))).current;
  const autoPromptStarted = useRef(false);

  useEffect(() => {
    let mounted = true;
    getLastSelectedRole()
      .then((role) => {
        if (mounted && LOGIN_ROLES.some((item) => item.value === role)) setLastRole(role);
      })
      .catch((error) => console.warn('Could not load the last selected sign-in role:', error));
    Promise.all([
      isBiometricUnlockEnabled(),
      getBiometricLoginProfile(),
      canUseBiometricUnlock(),
      getBiometricUnlockLabel(),
    ])
      .then(async ([enabled, profile, canAuthenticate, label]) => {
        if (!mounted) return;
        if (enabled && profile && canAuthenticate) {
          setBiometricProfile(profile);
          setBiometricLabel(label);
          if (!autoPromptStarted.current) {
            autoPromptStarted.current = true;
            await performBiometricLogin(profile, true);
          }
        } else if (enabled && profile) {
          await setBiometricUnlockEnabled(false);
          setBiometricProfile(profile);
          setBiometricMessage('Fingerprint or face sign-in is not available. Add an enrolled biometric in device settings, or sign in with your password.');
        } else if (enabled && !profile) {
          await setBiometricUnlockEnabled(false);
        }
      })
      .catch((error) => {
        if (mounted) setBiometricMessage('Biometric sign-in is unavailable. Choose your role to continue.');
        console.warn('Could not check biometric sign-in availability:', error);
      });

    Animated.stagger(
      70,
      entrances.map((value) => Animated.timing(value, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      })),
    ).start();

    return () => { mounted = false; };
  }, [entrances]);

  async function performBiometricLogin(profile = biometricProfile, automatic = false) {
    if (!profile || biometricBusy) return;
    setBiometricBusy(true);
    setBiometricMessage(null);
    setBiometricRoleMismatch(false);
    try {
      const credentials = await getBiometricLoginCredentials();
      if (!credentials) {
        await forgetBiometricLogin();
        setBiometricProfile(null);
        setBiometricLabel(null);
        setBiometricMessage('Your saved login is no longer available. Choose a role and sign in with your password to set up biometrics again.');
        return;
      }
      const result = await signIn(credentials.email, credentials.password, credentials.role, {
        skipBiometricPrompt: true,
      });
      if (result.mfaRequired) onBiometricMfa(credentials.role, result.challenge);
    } catch (error) {
      if (error?.response?.status === 401) {
        try {
          await forgetBiometricLogin();
        } catch (cleanupError) {
          setBiometricMessage(cleanupError.message);
          return;
        }
        setBiometricProfile(null);
        setBiometricLabel(null);
        onSavedLoginOutOfDate(
          profile.role,
          'Your saved login is out of date, please sign in with your password',
        );
      } else if (isBiometricCredentialInvalidated(error)) {
        try {
          await forgetBiometricLogin();
        } catch (cleanupError) {
          setBiometricMessage(cleanupError.message);
          return;
        }
        setBiometricProfile(null);
        setBiometricLabel(null);
        setBiometricMessage('Your device biometrics changed. Sign in with your password to set up fingerprint or face login again.');
      } else if (error?.response?.status === 403) {
        setBiometricRoleMismatch(true);
        setBiometricMessage(error?.response?.data?.error?.message || 'This saved login does not match its role.');
      } else {
        setBiometricMessage(error?.message?.includes('Could not fully forget')
          ? error.message
          : automatic
            ? 'Biometric sign-in was cancelled or unavailable. Choose your role or try again.'
            : 'Biometric sign-in was not completed. Use your password or try again.');
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  function selectRole(role) {
    setLastRole(role.value);
    rememberSelectedRole(role.value)
      .catch((error) => console.warn('Could not save the last selected sign-in role:', error));
    onSelectRole(role.value);
  }

  function animatePress(index, value) {
    Animated.spring(presses[index], {
      toValue: value,
      speed: 32,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoPanel}>
          <Image
            source={require('../../assets/brandsphere-wordmark.jpg')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Brandsphere Marketing Agency"
          />
        </View>
        <Text style={styles.title}>Who's signing in?</Text>
        <Text style={styles.subtitle}>Choose your role to continue</Text>

        {biometricProfile && biometricLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continue as ${biometricProfile.displayName} (${LOGIN_ROLES.find((item) => item.value === biometricProfile.role)?.label || biometricProfile.role}) with ${biometricLabel}`}
            accessibilityState={{ disabled: biometricBusy, busy: biometricBusy }}
            disabled={biometricBusy}
            onPress={() => performBiometricLogin()}
            style={({ pressed }) => [styles.biometricCard, pressed && styles.cardPressed, biometricBusy && styles.cardDisabled]}
          >
            <View style={styles.biometricIcon}>
              {biometricBusy
                ? <ActivityIndicator color={colors.primary} />
                : <Ionicons name="finger-print-outline" size={27} color={colors.primary} />}
            </View>
            <View style={styles.biometricCopy}>
              <Text style={styles.biometricTitle}>Continue as {biometricProfile.displayName}</Text>
              <Text style={styles.biometricSubtitle}>
                {LOGIN_ROLES.find((item) => item.value === biometricProfile.role)?.label || biometricProfile.role}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={21} color={colors.muted} />
          </Pressable>
        ) : null}

        {biometricMessage ? (
          <View accessibilityLiveRegion="polite" style={styles.biometricMessage}>
            <Ionicons name="information-circle-outline" size={19} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.biometricMessageText}>{biometricMessage}</Text>
              {biometricRoleMismatch ? (
                <Pressable accessibilityRole="button" onPress={() => {
                  setBiometricProfile(null);
                  setBiometricLabel(null);
                  setBiometricMessage(null);
                  setBiometricRoleMismatch(false);
                }}>
                  <Text style={[styles.biometricMessageText, { textDecorationLine: 'underline', marginTop: 6 }]}>Choose a different role</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.grid}>
          {LOGIN_ROLES.map((role, index) => {
            const selected = (selectedRole || lastRole) === role.value;
            const accent = colors.roleAccents[role.value];
            return (
              <Animated.View
                key={role.value}
                style={[
                  styles.cardWrap,
                  index === LOGIN_ROLES.length - 1 && styles.lastCardWrap,
                  {
                    opacity: entrances[index],
                    transform: [
                      {
                        translateY: entrances[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                      { scale: presses[index] },
                    ],
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${role.label}. ${role.description}`}
                  accessibilityState={{ selected, disabled: biometricBusy }}
                  disabled={biometricBusy}
                  onPress={() => selectRole(role)}
                  onPressIn={() => animatePress(index, 0.98)}
                  onPressOut={() => animatePress(index, 1)}
                  style={[
                    styles.card,
                    selected && { borderColor: accent, backgroundColor: colors.surface },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name={role.icon} size={23} color={accent} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.roleName}>{role.label}</Text>
                    <Text style={styles.description}>{role.description}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={accent} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <Text style={styles.footer}>Secure access for your field team</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  logoPanel: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    height: 108,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.logoPanel,
  },
  logo: { width: '100%', height: '100%' },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  biometricCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  biometricIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  biometricCopy: { flex: 1 },
  biometricTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: typography.small,
    fontWeight: '800',
  },
  biometricSubtitle: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    marginTop: 3,
  },
  biometricMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  biometricMessageText: { flex: 1, color: colors.warning, fontFamily: typography.fontFamily, fontSize: 12, lineHeight: 17 },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cardDisabled: { opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  cardWrap: { width: '48.5%' },
  lastCardWrap: { width: '100%' },
  card: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  copy: { flex: 1 },
  roleName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: typography.small,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  footer: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
