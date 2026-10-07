import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

export default function CompetitorPriceScreen({ route, navigation }) {
  const outlet = route.params?.outlet;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [competitorName, setCompetitorName] = useState('');
  const [competitorProductName, setCompetitorProductName] = useState('');
  const [competitorSku, setCompetitorSku] = useState('');
  const [price, setPrice] = useState('');
  const [ourProductId, setOurProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [photoUri, setPhotoUri] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initDb();
    fetchProducts().then((catalog) => {
      cacheProducts(catalog);
      setProducts(catalog);
    }).catch(() => setProducts(getCachedProducts()));
  }, []);

  async function capturePhoto(uri) {
    setSavingPhoto(true);
    setError(null);
    try {
      setPhotoUri(await persistCapturedPhoto(uri, createLocalId()));
    } catch (saveError) {
      setError(saveError.message || 'Could not save the price photo for offline sync.');
    } finally {
      setSavingPhoto(false);
    }
  }

  function submit() {
    if (!outlet) {
      setError('Outlet details are missing.');
      return;
    }
    const amount = Number(price);
    if (!competitorName.trim() || !competitorProductName.trim() || price.trim() === '' || !Number.isFinite(amount) || amount < 0) {
      setError('Enter a competitor, product name, and valid non-negative KES price.');
      return;
    }
    setSubmitting(true);
    try {
      enqueueMerchandisingRecord(createLocalId(), 'competitorPrice', {
        outletId: outlet.id,
        competitorName: competitorName.trim(),
        competitorProductName: competitorProductName.trim(),
        ...(competitorSku.trim() ? { competitorSku: competitorSku.trim() } : {}),
        ...(ourProductId ? { ourProductId } : {}),
        price: amount,
        observedAt: new Date().toISOString(),
        ...(photoUri ? { photoStorageUri: photoUri } : {}),
      });
      navigation.goBack();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this price locally.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!outlet) return <EmptyState title="Select an outlet first" message="Return to your assigned outlets and choose an outlet to log a competitor price." />;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Competitor price</Text>
        <Text style={styles.subtitle}>{outlet.name}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Card style={styles.card}>
          <Text style={styles.label}>COMPETITOR NAME</Text>
          <TextInput value={competitorName} onChangeText={setCompetitorName} style={styles.input} placeholder="Competitor brand" />
          <Text style={styles.label}>COMPETITOR PRODUCT</Text>
          <TextInput value={competitorProductName} onChangeText={setCompetitorProductName} style={styles.input} placeholder="Product name" />
          <Text style={styles.label}>COMPETITOR SKU (OPTIONAL)</Text>
          <TextInput value={competitorSku} onChangeText={setCompetitorSku} style={styles.input} placeholder="SKU or pack size" />
          <Text style={styles.label}>PRICE (KES)</Text>
          <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} placeholder="0.00" />
          <Text style={styles.label}>OUR MATCHING PRODUCT (OPTIONAL)</Text>
          <View style={styles.productList}>
            {products.map((product) => (
              <Text key={product.id} onPress={() => setOurProductId((current) => current === product.id ? '' : product.id)} style={[styles.productOption, ourProductId === product.id && styles.productOptionSelected]}>
                {ourProductId === product.id ? '✓ ' : ''}{product.name}
              </Text>
            ))}
            {!products.length ? <Text style={styles.subtitle}>Product catalog not available offline.</Text> : null}
          </View>
          <Text style={styles.label}>PHOTO (OPTIONAL)</Text>
          <CameraCapture label="price" onCapture={capturePhoto} />
          {savingPhoto ? <Text style={styles.subtitle}>Saving photo locally…</Text> : null}
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
        </Card>
        <PrimaryButton title="Save competitor price" onPress={submit} loading={submitting} disabled={savingPhoto} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  card: { gap: spacing.sm },
  label: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, letterSpacing: 1 },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface },
  productList: { gap: spacing.xs },
  productOption: { color: colors.ink, fontFamily: typography.fontFamily, fontSize: typography.small, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  productOptionSelected: { color: colors.primaryDark, backgroundColor: colors.primarySoft, borderColor: colors.primary },
  preview: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.border },
});
