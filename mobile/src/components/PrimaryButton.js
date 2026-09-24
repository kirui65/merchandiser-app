import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function PrimaryButton({ title, icon, onPress, loading = false, disabled = false, variant = 'primary' }) {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, variant === 'danger' && styles.danger, pressed && styles.pressed, (disabled || loading) && styles.disabled]}>
    {loading ? <ActivityIndicator color={variant === 'secondary' ? activeColors.primary : activeColors.white} /> : <View style={styles.content}>{icon}{<Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{title}</Text>}</View>}
  </Pressable>;
}

const createStyles = (colors) => StyleSheet.create({ button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, shadowColor: colors.primaryDark, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, secondary: { backgroundColor: colors.primarySoft, shadowOpacity: 0, elevation: 0 }, danger: { backgroundColor: colors.error, shadowColor: colors.error }, pressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.6 }, text: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button, fontWeight: '800', letterSpacing: 0.6 }, secondaryText: { color: colors.primaryDark } });
