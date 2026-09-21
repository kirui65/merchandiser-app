import React, { useCallback, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import SyncStatusBadge from '../components/SyncStatusBadge';
import { postSale } from '../api/sales';
import { getPendingSales, markFailed, markSynced } from '../offline/salesQueue';
import { formatDateTime, formatKes } from '../utils/formatters';
import { colors, spacing, typography } from '../theme/tokens';

export default function PendingSalesScreen() {
  const [sales, setSales] = useState([]); const [retrying, setRetrying] = useState(null);
  const refresh = useCallback(() => setSales(getPendingSales()), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  async function retry(item) { setRetrying(item.localId); try { const response = await postSale({ localId: item.localId, ...item.payload }); if (response.status === 200 || response.status === 201) markSynced(item.localId); else markFailed(item.localId, `HTTP ${response.status}: ${JSON.stringify(response.data)}`); } catch (error) { markFailed(item.localId, error.message || String(error)); } finally { setRetrying(null); refresh(); } }
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>SYNC QUEUE</Text><Text style={styles.title}>Pending sales</Text><Text style={styles.subtitle}>Review sales waiting to reach the server.</Text></View><FlatList data={sales} keyExtractor={(item) => item.localId} contentContainerStyle={styles.list} renderItem={({ item }) => <Card style={styles.card}><View style={styles.row}><View><Text style={styles.sale}>Sale {formatKes(Number(item.payload.qty) * Number(item.payload.unitPrice))}</Text><Text style={styles.date}>{formatDateTime(item.payload.timestamp)}</Text></View><SyncStatusBadge status={item.syncStatus} /></View>{item.lastError ? <Text style={styles.error}>{item.lastError}</Text> : <Text style={styles.waiting}>Waiting for a connection</Text>}<PrimaryButton title="Retry now" loading={retrying === item.localId} disabled={retrying !== null} onPress={() => retry(item)} variant="secondary" /></Card>} ListEmptyComponent={<EmptyState icon="✓" title="Nothing waiting" message="All locally saved sales have synced." />} /></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }, list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm }, card: { gap: spacing.sm, marginBottom: spacing.md }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, sale: { color: colors.ink, fontSize: typography.h3, fontWeight: '800' }, date: { color: colors.muted, fontSize: typography.small, marginTop: 3 }, error: { color: colors.error, fontSize: typography.small }, waiting: { color: colors.warning, fontSize: typography.small } });
