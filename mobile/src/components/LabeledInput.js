import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function LabeledInput({ label, icon, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, right }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const styles = createStyles(colors);
  return <View style={styles.group}><Text style={styles.label}>{label}</Text><View style={[styles.shell, focused && styles.focused]}><Text style={styles.icon}>{icon}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} secureTextEntry={secureTextEntry} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />{right}</View></View>;
}
const createStyles = (colors) => StyleSheet.create({ group: { marginBottom: spacing.md }, label: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small, fontWeight: '700', marginBottom: spacing.xs }, shell: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, focused: { borderColor: colors.primary, borderWidth: 1.5 }, icon: { width: 24, color: colors.primary, fontFamily: typography.fontFamily, fontSize: 17 }, input: { flex: 1, color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.body, paddingVertical: 0 } });
