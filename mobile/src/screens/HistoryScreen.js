import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, SafeAreaView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { fetchMySales, updateSale, voidSale } from '../api/sales';
import { formatDateTime, formatKes } from '../utils/formatters';
import { getPendingSales, updateQueuedSale } from '../offline/salesQueue';
import { initDb } from '../offline/db';
import SyncStatusBadge from '../components/SyncStatusBadge';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { useAuth } from '../auth/AuthContext';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isQueued(sale) {
  return sale.syncStatus === 'pending' || sale.syncStatus === 'failed';
}

function canEdit(sale) {
  if (isQueued(sale)) return !sale.pendingVoidReason;
  const createdAt = timestampMillis(sale.createdAt || sale.timestamp);
  return sale.saleStatus !== 'voided' && createdAt !== null
    && Date.now() >= createdAt && Date.now() - createdAt <= EDIT_WINDOW_MS;
}

export default function HistoryScreen() {
  const { colors: activeColors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(activeColors);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [voidingSale, setVoidingSale] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      initDb();
      const pending = getPendingSales().map(({ localId, payload, syncStatus }) => ({
        ...payload,
        id: localId,
        localId,
        syncStatus,
      }));
      try {
        const remote = await fetchMySales();
        const remoteLocalIds = new Set(remote.map((sale) => sale.localId).filter(Boolean));
        const localOnly = pending.filter((sale) => !remoteLocalIds.has(sale.localId));
        setSales([...remote, ...localOnly].sort((a, b) => (timestampMillis(b.timestamp) || 0) - (timestampMillis(a.timestamp) || 0)));
      } catch {
        setSales(pending);
        if (!pending.length) setError('Your sales history could not be loaded.');
        else setError('Could not refresh online sales. Showing queued records.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function exportCsv() {
    if (!sales.length) return;
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Sale ID', 'Outlet ID', 'Product ID', 'Quantity', 'Unit price (KES)', 'Total (KES)', 'Sync status', 'Sale status', 'Void reason'],
      ...sales.map((sale) => [sale.timestamp, sale.id || sale.localId, sale.outletId, sale.productId, sale.qty, sale.unitPrice, sale.total, sale.syncStatus || 'synced', sale.saleStatus || (sale.pendingVoidReason ? 'void pending' : 'active'), sale.voidReason || sale.pendingVoidReason || '']),
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

  function openEdit(sale) {
    setEditingSale(sale);
    setEditQty(String(sale.qty ?? ''));
    setEditUnitPrice(String(sale.unitPrice ?? ''));
  }

  async function saveEdit() {
    const qty = Number(editQty);
    const unitPrice = Number(editUnitPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      Alert.alert('Check sale details', 'Enter a quantity above zero and a valid unit price.');
      return;
    }
    setSaving(true);
    try {
      if (isQueued(editingSale)) {
        const { id, localId, syncStatus, ...payload } = editingSale;
        if (!updateQueuedSale(localId, { ...payload, qty, unitPrice, total: Number((qty * unitPrice).toFixed(2)) })) {
          throw new Error('This sale is no longer waiting in the offline queue.');
        }
      } else {
        await updateSale(editingSale.id, { qty, unitPrice });
      }
      setEditingSale(null);
      await load(true);
    } catch (saveError) {
      Alert.alert('Sale not updated', saveError.response?.data?.message || saveError.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmVoid() {
    const reason = voidReason.trim();
    if (reason.length < 3) {
      Alert.alert('Reason required', 'Enter at least 3 characters explaining why this sale is being voided.');
      return;
    }
    setSaving(true);
    try {
      if (isQueued(voidingSale)) {
        const { id, localId, syncStatus, ...payload } = voidingSale;
        if (!updateQueuedSale(localId, { ...payload, pendingVoidReason: reason })) {
          throw new Error('This sale is no longer waiting in the offline queue.');
        }
      } else {
        await voidSale(voidingSale.id, reason);
      }
      setVoidingSale(null);
      setVoidReason('');
      await load(true);
    } catch (voidError) {
      Alert.alert('Sale not voided', voidError.response?.data?.message || voidError.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState colors={activeColors} label="Loading sales history…" />;
  if (error && !sales.length) return <ErrorState colors={activeColors} message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>RECORDS</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Sales history</Text>
          <Pressable onPress={exportCsv} disabled={!sales.length} style={({ pressed }) => [styles.exportButton, !sales.length && styles.exportDisabled, pressed && styles.exportPressed]}>
            <Text style={styles.exportText}>Export CSV</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Your submitted transactions</Text>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={sales}
        keyExtractor={(sale) => sale.id || sale.localId}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={activeColors.primary} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.saleHeading}>
                <Text style={styles.product}>Sale record</Text>
                <Text style={styles.date}>{formatDateTime(item.timestamp)}</Text>
              </View>
              <SyncStatusBadge status={item.syncStatus || 'synced'} />
            </View>
            <View style={styles.row}>
              <Text style={styles.qty}>{item.qty} units</Text>
              <Text style={[styles.total, item.saleStatus === 'voided' && styles.voidedText]}>{formatKes(item.total)}</Text>
            </View>
            {item.saleStatus === 'voided' && <Text style={styles.voidedText}>Voided · {item.voidReason}</Text>}
            {item.pendingVoidReason && <Text style={styles.pendingVoid}>Void queued · {item.pendingVoidReason}</Text>}
            {['rep', 'manager'].includes(user?.role) && (canEdit(item) || (item.saleStatus !== 'voided' && !item.pendingVoidReason)) && (
              <View style={styles.actions}>
                {canEdit(item) && <Pressable style={styles.actionButton} onPress={() => openEdit(item)}><Text style={styles.actionText}>Edit</Text></Pressable>}
                {!item.pendingVoidReason && item.saleStatus !== 'voided' && (
                  <Pressable style={styles.actionButton} onPress={() => { setVoidingSale(item); setVoidReason(''); }}>
                    <Text style={styles.voidActionText}>Void sale</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="▤" title="No sales yet" message="Completed sales will appear here once they are recorded." />}
      />
      <Modal visible={Boolean(editingSale)} transparent animationType="fade" onRequestClose={() => setEditingSale(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit sale</Text>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput value={editQty} onChangeText={setEditQty} keyboardType="decimal-pad" style={styles.input} />
            <Text style={styles.inputLabel}>Unit price (KES)</Text>
            <TextInput value={editUnitPrice} onChangeText={setEditUnitPrice} keyboardType="decimal-pad" style={styles.input} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingSale(null)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable onPress={saveEdit} disabled={saving}><Text style={styles.actionText}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(voidingSale)} transparent animationType="fade" onRequestClose={() => setVoidingSale(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Void sale</Text>
            <Text style={styles.subtitle}>This keeps the record for audit history and removes it from sales totals.</Text>
            <Text style={styles.inputLabel}>Reason (required)</Text>
            <TextInput value={voidReason} onChangeText={setVoidReason} multiline style={[styles.input, styles.reasonInput]} placeholder="Explain why this sale is being voided" placeholderTextColor={activeColors.muted} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setVoidingSale(null)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable onPress={confirmVoid} disabled={saving}><Text style={styles.voidActionText}>{saving ? 'Saving…' : 'Confirm void'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xs },
  title: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title, fontWeight: '800' },
  exportButton: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  exportDisabled: { opacity: 0.5 },
  exportPressed: { opacity: 0.75 },
  exportText: { color: colors.primaryDark, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, fontWeight: '800' },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.xs },
  list: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.sm },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  saleHeading: { flex: 1 },
  product: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3, fontWeight: '800' },
  date: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 12, marginTop: 4 },
  qty: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.md },
  total: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  actionButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: 8 },
  actionText: { color: colors.primaryDark, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, fontWeight: '800' },
  voidActionText: { color: colors.error, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, fontWeight: '800' },
  voidedText: { color: colors.error, fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.sm },
  pendingVoid: { color: colors.warning || '#9a6700', fontFamily: typography.fontFamily, fontSize: typography.small, marginTop: spacing.sm },
  errorText: { color: colors.error, fontFamily: typography.fontFamily, fontSize: typography.small, paddingHorizontal: spacing.lg },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg },
  modalTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h2, fontWeight: '800', marginBottom: spacing.md },
  inputLabel: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, marginBottom: spacing.xs },
  input: { color: colors.ink, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.md },
  reasonInput: { minHeight: 92, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xs },
  cancelText: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.small, fontWeight: '800' },
});
