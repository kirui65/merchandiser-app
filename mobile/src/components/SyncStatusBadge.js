import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function SyncStatusBadge({ status = 'pending', label }) {
	const defaultLabel = status === 'synced' ? 'Synced' : status === 'failed' ? 'Needs attention' : 'Pending sync';
	return <Text style={[styles.badge, status === 'synced' ? styles.synced : status === 'failed' ? styles.failed : styles.pending]}>{label || defaultLabel}</Text>;
}

const styles = StyleSheet.create({
	badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5, overflow: 'hidden', fontFamily: typography.fontFamilyBold, fontSize: typography.small, fontWeight: '700' },
	pending: { backgroundColor: colors.warningSoft, color: colors.warning },
	synced: { backgroundColor: colors.successSoft, color: colors.success },
	failed: { backgroundColor: colors.errorSoft, color: colors.error },
});
