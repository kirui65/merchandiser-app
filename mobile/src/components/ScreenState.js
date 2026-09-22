import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import EmptyState from './EmptyState';
import PrimaryButton from './PrimaryButton';
import { spacing, typography } from '../theme/tokens';

export function LoadingState({ colors, label = 'Loading…' }) { return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.text, { color: colors.muted }]}>{label}</Text></View>; }
export function ErrorState({ colors, message, onRetry }) { return <View style={[styles.center, { backgroundColor: colors.background }]}><EmptyState icon="!" title="Unable to load" message={message} />{onRetry && <PrimaryButton title="Try again" onPress={onRetry} />}</View>; }
const styles = StyleSheet.create({ center: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, text: { fontSize: typography.small } });
