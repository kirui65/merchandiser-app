import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { enqueueMerchandisingRecord } from '../offline/merchandisingQueue';
import { persistCapturedPhoto } from '../offline/mediaStorage';
import { createLocalId } from '../utils/ids';
import CameraCapture from '../components/CameraCapture';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

export default function NewOutletScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function captureLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required to pin a new outlet.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: lat, longitude: lng } = position.coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('The device did not return valid GPS coordinates.');
      setLocation({ lat, lng });
    } catch (locationError) {
      setError(locationError.message || 'Unable to capture the outlet location.');
    } finally {
      setLocating(false);
    }
  }

  async function capturePhoto(uri) {
    setSavingPhoto(true);
    setError(null);
    try {
      setPhotoUri(await persistCapturedPhoto(uri, createLocalId()));
    } catch (saveError) {
      setError(saveError.message || 'Could not save the outlet photo for offline sync.');
    } finally {
      setSavingPhoto(false);
    }
  }

  function submit() {
    if (!name.trim() || !address.trim()) {
      setError('Enter the outlet name and address.');
      return;
    }
    if (!location) {
      setError('Capture the outlet GPS pin before submitting.');
      return;
    }
    if (!photoUri) {
      setError('Capture a required outlet photo before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      enqueueMerchandisingRecord(createLocalId(), 'outletOnboarding', {
        name: name.trim(),
        address: address.trim(),
        location,
        photoStorageUri: photoUri,
      });
      navigation.goBack();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this outlet submission locally.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Onboard a new outlet</Text>
        <Text style={styles.subtitle}>The outlet will be reviewed before it is added to your active route.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Card style={styles.card}>
          <Text style={styles.label}>OUTLET NAME</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Shop or outlet name" />
          <Text style={styles.label}>ADDRESS / AREA</Text>
          <TextInput value={address} onChangeText={setAddress} style={[styles.input, styles.multiline]} multiline placeholder="Street, estate, town" />
          <PrimaryButton title={location ? `GPS pinned (${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})` : 'Capture outlet GPS pin'} variant="secondary" loading={locating} onPress={captureLocation} />
          <Text style={styles.label}>OUTLET PHOTO (REQUIRED)</Text>
          <CameraCapture label="outlet" onCapture={capturePhoto} />
          {savingPhoto ? <Text style={styles.subtitle}>Saving photo locally…</Text> : null}
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
        </Card>
        <PrimaryButton title="Submit for manager review" onPress={submit} loading={submitting} disabled={savingPhoto || locating} />
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
  multiline: { minHeight: 76, paddingTop: spacing.sm, textAlignVertical: 'top' },
  preview: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.border },
});
