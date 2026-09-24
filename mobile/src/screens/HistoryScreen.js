import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, SafeAreaView, Share, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { fetchMySales } from '../api/sales';
import { formatDateTime, formatKes } from '../utils/formatters';
import SyncStatusBadge from '../components/SyncStatusBadge';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ErrorState, LoadingState } from '../components/ScreenState';

export default function HistoryScreen() {
  const { colors: activeColors } = useTheme(); const styles = createStyles(activeColors);
  const [sales, setSales] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState(null);
  async function load(refresh = false) { refresh ? setRefreshing(true) : setLoading(true); setError(null); try { setSales(await fetchMySales()); } catch { setError('Your sales history could not be loaded.'); } finally { setLoading(false); setRefreshing(false); } }
  useEffect(() => { load(); }, []);
  async function exportCsv() {
    if (!sales.length) return;
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Sale ID', 'Outlet ID', 'Product ID', 'Quantity', 'Unit price (KES)', 'Total (KES)', 'Status'],
      ...sales.map((sale) => [sale.timestamp, sale.id || sale.localId, sale.outletId, sale.productId, sale.qty, sale.unitPrice, sale.total, sale.syncStatus || 'synced']),
    ];
    try {
      const filename = `brandsphere-sales-${new Date().toISOString().slice(0, 10)}.csv`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, rows.map((row) => row.map(escape).join(',')).join('\n'), { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({ title: 'Sales history CSV', url: uri, message: 'My Brandsphere sales history export.' });
    } catch {
      Alert.alert('Export unavailable', 'We could not prepare your sales CSV. Please try again.');
    }
  }
  if (loading) return <LoadingState colors={activeColors} label="Loading sales history…" />; if (error) return <ErrorState colors={activeColors} message={error} onRetry={load} />;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>RECORDS</Text><View style={styles.titleRow}><Text style={styles.title}>Sales history</Text><Pressable onPress={exportCsv} disabled={!sales.length} style={({ pressed }) => [styles.exportButton, !sales.length && styles.exportDisabled, pressed && styles.exportPressed]}><Text style={styles.exportText}>Export CSV</Text></Pressable></View><Text style={styles.subtitle}>Your submitted transactions</Text></View><FlatList data={sales} keyExtractor={(sale) => sale.id || sale.localId} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={activeColors.primary} />} renderItem={({ item }) => <Card style={styles.card}><View style={styles.row}><View><Text style={styles.product}>Sale record</Text><Text style={styles.date}>{formatDateTime(item.timestamp)}</Text></View><SyncStatusBadge status={item.syncStatus || 'synced'} /></View><View style={styles.row}><Text style={styles.qty}>{item.qty} units</Text><Text style={styles.total}>{formatKes(item.total)}</Text></View></Card>} ListEmptyComponent={<EmptyState icon="▤" title="No sales yet" message="Completed sales will appear here once they are recorded." />} /></SafeAreaView>;
}
const createStyles = (colors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xs }, title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800' }, exportButton: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, exportDisabled: { opacity: 0.5 }, exportPressed: { opacity: 0.75 }, exportText: { color: colors.primaryDark, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, fontWeight: '800' }, subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs }, list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm }, card: { marginBottom: spacing.md }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, product: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, fontWeight: '800' }, date: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 12, marginTop: 4 }, qty: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.md }, total: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 18, fontWeight: '800', marginTop: spacing.md } });
