import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchProducts } from '../api/catalog';
import { uploadSalePhoto } from '../api/uploads';
import { enqueueSale } from '../offline/salesQueue';
import { initDb } from '../offline/db';
import { createLocalId } from '../utils/ids';
import SaleForm from '../components/SaleForm';
import EmptyState from '../components/EmptyState';
import { colors, spacing, typography } from '../theme/tokens';

export default function SaleEntryScreen({ route, navigation }) {
  const outlet = route.params?.outlet; const [products, setProducts] = useState([]); const [submitting, setSubmitting] = useState(false); const [notice, setNotice] = useState(null); const [uploadProgress, setUploadProgress] = useState(null);
  useEffect(() => { initDb(); fetchProducts().then(setProducts).catch(() => setNotice('Unable to load products')); }, []);
  async function submit({ photoUri, ...sale }) { setSubmitting(true); try { let photoUrl = null; if (photoUri) { try { setUploadProgress(0); photoUrl = await uploadSalePhoto(photoUri, setUploadProgress); } catch (error) { const saveWithoutPhoto = await new Promise((resolve) => Alert.alert('Receipt not uploaded', 'Save this sale without its receipt photo? The sale will sync normally, but the photo will not be attached.', [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Save without photo', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) })); if (!saveWithoutPhoto) return; } finally { setUploadProgress(null); } } enqueueSale(createLocalId(), { ...sale, photoUrl, timestamp: new Date().toISOString() }); setNotice('Sale saved locally and will sync automatically.'); setTimeout(() => navigation.goBack(), 700); } finally { setSubmitting(false); } }
  if (!outlet) return <EmptyState title="Select an outlet first" message="Return to your assigned outlets to begin a sale." />;
  return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.eyebrow}>NEW TRANSACTION</Text><Text style={styles.title}>Log a sale</Text><Text style={styles.subtitle}>{outlet.name}</Text></View>{notice ? <View style={styles.notice}><Text style={styles.noticeIcon}>✓</Text><Text style={styles.noticeText}>{notice}</Text></View> : null}<View style={styles.form}><SaleForm outlet={outlet} products={products} onSubmit={submit} submitting={submitting} uploadProgress={uploadProgress} /></View></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs }, subtitle: { color: colors.muted, fontSize: typography.body, marginTop: spacing.xs }, form: { padding: spacing.lg, paddingTop: spacing.sm }, notice: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, padding: spacing.sm, borderRadius: 12, backgroundColor: colors.successSoft }, noticeIcon: { width: 22, height: 22, marginRight: spacing.sm, borderRadius: 11, backgroundColor: colors.success, color: colors.white, lineHeight: 22, textAlign: 'center', fontWeight: '800' }, noticeText: { flex: 1, color: colors.success, fontSize: typography.small } });
