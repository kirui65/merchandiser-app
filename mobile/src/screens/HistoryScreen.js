import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchMySales } from '../api/sales';
import { formatDateTime, formatKes } from '../utils/formatters';
import SyncStatusBadge from '../components/SyncStatusBadge';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';

export default function HistoryScreen() {
  const [sales, setSales] = useState([]);
  useEffect(() => { fetchMySales().then(setSales).catch(() => {}); }, []);
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>RECORDS</Text><Text style={styles.title}>Sales history</Text><Text style={styles.subtitle}>Your submitted transactions</Text></View><FlatList data={sales} keyExtractor={(sale) => sale.id || sale.localId} contentContainerStyle={styles.list} renderItem={({ item }) => <Card style={styles.card}><View style={styles.row}><View><Text style={styles.product}>Sale record</Text><Text style={styles.date}>{formatDateTime(item.timestamp)}</Text></View><SyncStatusBadge status={item.syncStatus || 'synced'} /></View><View style={styles.row}><Text style={styles.qty}>{item.qty} units</Text><Text style={styles.total}>{formatKes(item.total)}</Text></View></Card>} ListEmptyComponent={<EmptyState icon="▤" title="No sales yet" message="Completed sales will appear here once they are recorded." />} /></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }, list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm }, card: { marginBottom: spacing.md }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, product: { color: colors.ink, fontSize: typography.h3, fontWeight: '800' }, date: { color: colors.muted, fontSize: 12, marginTop: 4 }, qty: { color: colors.muted, fontSize: typography.small, marginTop: spacing.md }, total: { color: colors.primary, fontSize: 18, fontWeight: '800', marginTop: spacing.md } });
