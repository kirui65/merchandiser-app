import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'primary' }) {
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, pressed && styles.pressed, (disabled || loading) && styles.disabled]}>
    {loading ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.white} /> : <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{title}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({ button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, shadowColor: colors.primaryDark, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, secondary: { backgroundColor: colors.primarySoft, shadowOpacity: 0, elevation: 0 }, pressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.6 }, text: { color: colors.white, fontSize: typography.button, fontWeight: '800', letterSpacing: 0.6 }, secondaryText: { color: colors.primaryDark } });
