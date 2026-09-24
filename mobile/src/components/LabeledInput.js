import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function LabeledInput({ label, icon, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, right }) {
  return <View style={styles.group}><Text style={styles.label}>{label}</Text><View style={styles.shell}><Text style={styles.icon}>{icon}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} secureTextEntry={secureTextEntry} />{right}</View></View>;
}
const styles = StyleSheet.create({ group: { marginBottom: spacing.md }, label: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small, fontWeight: '700', marginBottom: spacing.xs }, shell: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, icon: { width: 24, color: colors.primary, fontFamily: typography.fontFamily, fontSize: 17 }, input: { flex: 1, color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.body, paddingVertical: 0 } });
