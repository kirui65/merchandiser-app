import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function PrimaryButton({ title, icon, onPress, loading = false, disabled = false, variant = 'primary' }) {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, variant === 'danger' && styles.danger, pressed && !disabled && !loading && (variant === 'secondary' ? styles.secondaryPressed : styles.pressed), (disabled || loading) && styles.disabled]}>
    {loading ? <ActivityIndicator color={variant === 'secondary' ? activeColors.primary : activeColors.white} /> : <View style={styles.content}>{icon}{<Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{title}</Text>}</View>}
  </Pressable>;
}

const createStyles = (colors) => StyleSheet.create({ button: { minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary }, content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, secondary: { backgroundColor: colors.primarySoft }, danger: { backgroundColor: colors.error }, pressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] }, secondaryPressed: { backgroundColor: colors.border, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.56 }, text: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.button, fontWeight: '800', letterSpacing: 0.25 }, secondaryText: { color: colors.primary } });
