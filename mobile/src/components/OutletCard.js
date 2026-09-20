import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';
import Card from './Card';
import { colors, spacing, typography } from '../theme/tokens';

export default function OutletCard({ outlet, onPress }) {
	return <Card style={styles.card}><View style={styles.copy}><View style={styles.titleRow}><View style={styles.statusDot} /><Text style={styles.name}>{outlet.name}</Text></View><Text style={styles.address}>{outlet.address || 'No address recorded'}</Text><Text style={styles.status}>Not visited yet</Text></View><PrimaryButton title="Log sale" onPress={onPress} /></Card>;
}

const styles = StyleSheet.create({
	card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
	copy: { flex: 1, marginRight: spacing.md }, titleRow: { flexDirection: 'row', alignItems: 'center' }, statusDot: { width: 9, height: 9, marginRight: spacing.sm, borderRadius: 5, backgroundColor: colors.warning }, name: { color: colors.ink, fontSize: typography.h3, fontWeight: '800', marginBottom: 4 }, address: { color: colors.muted, fontSize: typography.small }, status: { marginTop: spacing.xs, color: colors.warning, fontSize: 12, fontWeight: '700' },
});
