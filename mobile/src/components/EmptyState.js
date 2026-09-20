import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
export default function EmptyState({ icon = '○', title, message }) { return <View style={styles.container}><Text style={styles.icon}>{icon}</Text><Text style={styles.title}>{title}</Text>{message ? <Text style={styles.message}>{message}</Text> : null}</View>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, icon: { color: colors.primary, fontSize: 36, marginBottom: spacing.sm }, title: { color: colors.ink, fontSize: typography.h3, fontWeight: '800', textAlign: 'center' }, message: { maxWidth: 280, color: colors.muted, fontSize: typography.small, lineHeight: 19, marginTop: spacing.xs, textAlign: 'center' } });
