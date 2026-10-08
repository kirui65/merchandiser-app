import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  forgetBiometricLogin,
  getBiometricLoginProfile,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from '../auth/biometric';
import { spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function BiometricLoginSettings() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [enabled, setEnabled] = useState(false);
  const [hasSavedLogin, setHasSavedLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([isBiometricUnlockEnabled(), getBiometricLoginProfile()])
      .then(async ([isEnabled, profile]) => {
        if (isEnabled && !profile) {
          await setBiometricUnlockEnabled(false);
          isEnabled = false;
        }
        if (mounted) {
          setEnabled(isEnabled);
          setHasSavedLogin(Boolean(profile));
        }
      })
      .catch(() => {
        if (mounted) {
          Alert.alert('Settings unavailable', 'Could not read the biometric sign-in settings.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  async function toggle(enabledNext) {
    try {
      await setBiometricUnlockEnabled(enabledNext);
      setEnabled(enabledNext);
      if (enabledNext) setHasSavedLogin(true);
    } catch (error) {
      Alert.alert('Biometric setting not changed', error.message);
    }
  }

  function confirmForgetLogin() {
    Alert.alert(
      'Forget saved login?',
      'This removes the encrypted email, password and role saved on this device. You can enable fingerprint or face login again after signing in with your password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget login',
          style: 'destructive',
          onPress: async () => {
            try {
              await forgetBiometricLogin();
              setEnabled(false);
              setHasSavedLogin(false);
            } catch (error) {
              Alert.alert('Saved login not removed', error.message);
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <View style={styles.row}>
        <Ionicons name="finger-print-outline" color={colors.primary} size={22} />
        <View style={styles.copy}>
          <Text style={styles.rowText}>Fingerprint / face login</Text>
          <Text style={styles.hint}>
            {enabled ? 'Enabled on this device' : 'Use biometrics for faster sign-in'}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Fingerprint / face login"
          accessibilityState={{ checked: enabled, disabled: loading }}
          disabled={loading}
          value={enabled}
          onValueChange={toggle}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={enabled ? colors.primary : colors.surface}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Forget saved login on this device"
        accessibilityState={{ disabled: loading }}
        disabled={loading}
        onPress={confirmForgetLogin}
        style={({ pressed }) => [styles.forgetRow, pressed && styles.pressed, !hasSavedLogin && styles.disabled]}
      >
        <Ionicons name="trash-outline" color={hasSavedLogin ? colors.error : colors.muted} size={20} />
        <Text style={[styles.forgetText, !hasSavedLogin && styles.muted]}>
          {hasSavedLogin ? 'Forget saved login on this device' : 'No saved login on this device'}
        </Text>
        {hasSavedLogin ? <Ionicons name="chevron-forward" color={colors.muted} size={19} /> : null}
      </Pressable>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  copy: { flex: 1 },
  rowText: {
    color: colors.ink,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: typography.body,
    fontWeight: '600',
  },
  hint: {
    color: colors.muted,
    fontFamily: typography.fontFamily,
    fontSize: 11,
    marginTop: 2,
  },
  forgetRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  forgetText: {
    flex: 1,
    color: colors.error,
    fontFamily: typography.fontFamilySemiBold,
    fontSize: typography.small,
    fontWeight: '600',
  },
  muted: { color: colors.muted },
  pressed: { backgroundColor: colors.background },
  disabled: { opacity: 0.65 },
});
