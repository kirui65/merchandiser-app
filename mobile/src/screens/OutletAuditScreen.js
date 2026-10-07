import React, { useEffect, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { fetchProducts } from '../api/catalog';
import { enqueueMerchandisingRecord } from '../offline/merchandisingQueue';
import { getCachedProducts, cacheProducts } from '../offline/productCatalog';
import { initDb } from '../offline/db';
import { persistCapturedPhoto } from '../offline/mediaStorage';
import { createLocalId } from '../utils/ids';
import CameraCapture from '../components/CameraCapture';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';
import CampaignPicker from '../components/CampaignPicker';

export default function OutletAuditScreen({ route, navigation }) {
  const outlet = route.params?.outlet;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});
  const [compliant, setCompliant] = useState(true);
  const [compliancePercent, setCompliancePercent] = useState('100');
  const [deviation, setDeviation] = useState('');
  const [notes, setNotes] = useState('');
  const [campaignId, setCampaignId] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initDb();
    async function load() {
      try {
        const catalog = await fetchProducts();
        cacheProducts(catalog);
        setProducts(catalog);
      } catch {
        const cached = getCachedProducts();
        setProducts(cached);
        if (!cached.length) setError('No product catalog is available. Connect once to download products.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateStock(productId, field, value) {
    setStock((current) => ({
      ...current,
      [productId]: { ...(current[productId] || {}), [field]: value },
    }));
  }

  async function capturePhoto(uri) {
    setSavingPhoto(true);
    setError(null);
    try {
      const fileId = createLocalId();
      setPhotoUri(await persistCapturedPhoto(uri, fileId));
    } catch (saveError) {
      setError(saveError.message || 'Could not save the audit photo for offline sync.');
    } finally {
      setSavingPhoto(false);
    }
  }

  async function submit() {
    if (!outlet) {
      setError('Outlet details are missing.');
      return;
    }
    if (!photoUri) {
      setError('Capture a shelf photo before saving this stock and planogram check.');
      return;
    }
    const percent = Number(compliancePercent);
    if (!compliant && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
      setError('Enter a planogram compliance percentage from 0 to 100.');
      return;
    }
    if (!compliant && !deviation.trim()) {
      setError('Describe the planogram deviation before saving.');
      return;
    }
    for (const values of Object.values(stock)) {
      for (const value of [values.shelfQuantity, values.backroomQuantity]) {
        if (value !== undefined && value !== '' && parseOptionalQuantity(value) === undefined) {
          setError('Stock quantities must be valid non-negative numbers.');
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      let auditLocation;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          auditLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        }
      } catch {
        auditLocation = undefined;
      }
      const stockChecks = products.map((product) => {
        const values = stock[product.id] || {};
        const shelfQuantity = parseOptionalQuantity(values.shelfQuantity);
        const backroomQuantity = parseOptionalQuantity(values.backroomQuantity);
        const lowStock = values.lowStock === true;
        return {
          productId: product.id,
          ...(shelfQuantity !== undefined ? { shelfQuantity } : {}),
          ...(backroomQuantity !== undefined ? { backroomQuantity } : {}),
          lowStock,
          reorderRequested: lowStock && values.reorderRequested === true,
        };
      }).filter((check) => check.shelfQuantity !== undefined || check.backroomQuantity !== undefined || check.lowStock);
      enqueueMerchandisingRecord(createLocalId(), 'audit', {
        outletId: outlet.id,
        campaignId,
        observedAt: new Date().toISOString(),
        ...(auditLocation ? { location: auditLocation } : {}),
        stockChecks,
        planogram: {
          compliant,
          ...(!compliant ? { compliancePercent: percent } : {}),
          deviations: deviation.trim() ? [{ description: deviation.trim() }] : [],
        },
        photoStorageUris: [photoUri],
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      navigation.goBack();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the outlet check locally.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!outlet) return <EmptyState title="Select an outlet first" message="Return to your assigned outlets and open a stock or planogram check." />;
  if (loading) return <Text style={styles.loading}>Loading product catalog…</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{outlet.name}</Text>
        <Text style={styles.subtitle}>Stock availability and shelf compliance</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Card style={styles.card}>
          <CampaignPicker value={campaignId} onChange={setCampaignId} />
          <Text style={styles.sectionTitle}>Stock check</Text>
          {products.length ? products.map((product) => {
            const values = stock[product.id] || {};
            return (
              <View key={product.id} style={styles.product}>
                <Text style={styles.productName}>{product.name}</Text>
                <View style={styles.quantityRow}>
                  <View style={styles.quantityField}>
                    <Text style={styles.label}>SHELF</Text>
                    <TextInput
                      value={values.shelfQuantity ?? ''}
                      onChangeText={(value) => updateStock(product.id, 'shelfQuantity', value)}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="Qty"
                    />
                  </View>
                  <View style={styles.quantityField}>
                    <Text style={styles.label}>BACKROOM</Text>
                    <TextInput
                      value={values.backroomQuantity ?? ''}
                      onChangeText={(value) => updateStock(product.id, 'backroomQuantity', value)}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="Qty"
                    />
                  </View>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.body}>Low stock</Text>
                  <Pressable onPress={() => updateStock(product.id, 'lowStock', !values.lowStock)} style={[styles.toggle, values.lowStock && styles.toggleOn]}>
                    <Text style={[styles.toggleText, values.lowStock && styles.toggleTextOn]}>{values.lowStock ? 'Yes' : 'No'}</Text>
                  </Pressable>
                </View>
                {values.lowStock ? (
                  <View style={styles.toggleRow}>
                    <Text style={styles.body}>Request reorder</Text>
                    <Pressable onPress={() => updateStock(product.id, 'reorderRequested', !values.reorderRequested)} style={[styles.toggle, values.reorderRequested && styles.toggleOn]}>
                      <Text style={[styles.toggleText, values.reorderRequested && styles.toggleTextOn]}>{values.reorderRequested ? 'Requested' : 'No request'}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }) : <EmptyState title="Products unavailable" message="Reconnect to download the product catalog before recording stock." />}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Planogram check</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.body}>Shelf matches the standard</Text>
            <Pressable onPress={() => setCompliant((value) => !value)} style={[styles.toggle, compliant && styles.toggleOn]}>
              <Text style={[styles.toggleText, compliant && styles.toggleTextOn]}>{compliant ? 'Compliant' : 'Deviations'}</Text>
            </Pressable>
          </View>
          {!compliant ? <>
            <Text style={styles.label}>COMPLIANCE PERCENT (OPTIONAL)</Text>
            <TextInput value={compliancePercent} onChangeText={setCompliancePercent} keyboardType="decimal-pad" style={styles.input} placeholder="0-100" />
            <Text style={styles.label}>DEVIATION NOTES</Text>
            <TextInput value={deviation} onChangeText={setDeviation} multiline style={[styles.input, styles.multiline]} placeholder="Describe the shelf differences" />
          </> : null}
          <Text style={styles.label}>SHELF PHOTO (REQUIRED)</Text>
          <CameraCapture label="shelf" onCapture={capturePhoto} />
          {savingPhoto ? <Text style={styles.subtitle}>Saving photo locally…</Text> : null}
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
          <Text style={styles.label}>NOTES (OPTIONAL)</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.multiline]} placeholder="Additional outlet observations" />
        </Card>
        <PrimaryButton title="Save stock & planogram check" onPress={submit} loading={submitting} disabled={loading || savingPhoto || !products.length} />
      </ScrollView>
    </SafeAreaView>
  );
}

function parseOptionalQuantity(value) {
  if (value === undefined || value === '') return undefined;
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0) return undefined;
  return quantity;
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  loading: { flex: 1, textAlign: 'center', textAlignVertical: 'center', color: colors.muted },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  card: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  product: { paddingVertical: spacing.sm, gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  productName: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  quantityRow: { flexDirection: 'row', gap: spacing.sm },
  quantityField: { flex: 1, gap: spacing.xs },
  label: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, letterSpacing: 1 },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface },
  multiline: { minHeight: 76, paddingTop: spacing.sm, textAlignVertical: 'top' },
  toggleRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  body: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  toggle: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
  toggleOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  toggleText: { color: colors.muted, fontFamily: typography.fontFamilyBold, fontSize: 11 },
  toggleTextOn: { color: colors.primaryDark },
  preview: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.border },
});
