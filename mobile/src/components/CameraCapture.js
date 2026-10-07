import React, { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import PrimaryButton from './PrimaryButton';
import { radius, spacing, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function CameraCapture({ onCapture }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const camera = useRef(null);

  async function openCamera() {
    setPermissionDenied(false);
    if (!permission?.granted) {
      try {
        const result = await requestPermission();
        if (!result.granted) {
          setPermissionDenied(true);
          return;
        }
      } catch {
        setPermissionDenied(true);
        return;
      }
    }
    setOpen(true);
  }

  async function capture() {
    if (!camera.current) {
      Alert.alert('Camera is starting', 'Please wait a moment and try again.');
      return;
    }

    setCapturing(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error('Camera did not return an image.');
      setPreview(photo.uri);
      setOpen(false);
    } catch {
      Alert.alert('Photo not captured', 'Please try taking the receipt photo again.');
    } finally {
      setCapturing(false);
    }
  }

  function confirmPhoto() {
    if (!preview) return;
    onCapture(preview);
    setPreview(null);
  }

  if (preview) {
    return (
      <Card style={styles.previewCard}>
        <Image source={{ uri: preview }} style={styles.previewImage} accessibilityLabel="Receipt photo preview" />
        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              title="Retake"
              icon={<Ionicons name="refresh-outline" size={18} color={colors.primaryDark} />}
              variant="secondary"
              onPress={() => { setPreview(null); setOpen(true); }}
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton
              title="Use photo"
              icon={<Ionicons name="checkmark-outline" size={18} color={colors.white} />}
              onPress={confirmPhoto}
            />
          </View>
        </View>
      </Card>
    );
  }

  if (open) {
    return (
      <View style={styles.cameraFrame}>
        <CameraView ref={camera} style={StyleSheet.absoluteFillObject} facing="back" />
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraLabel}>CAPTURE RECEIPT</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            hitSlop={10}
            onPress={() => setOpen(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={21} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.cameraControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take receipt photo"
            accessibilityState={{ disabled: capturing, busy: capturing }}
            disabled={capturing}
            onPress={capture}
            style={styles.shutter}
          >
            <View style={styles.shutterCore} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permissionDenied ? (
        <Text style={styles.permissionMessage}>Camera access is needed to attach a receipt photo.</Text>
      ) : null}
      <PrimaryButton
        title={permissionDenied ? 'Allow camera access' : 'Add receipt photo'}
        icon={<Ionicons name="camera-outline" size={20} color={permissionDenied ? colors.primaryDark : colors.white} />}
        variant={permissionDenied ? 'secondary' : 'primary'}
        onPress={openCamera}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { marginVertical: spacing.sm },
  permissionMessage: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, marginBottom: spacing.sm },
  cameraFrame: { height: 280, marginVertical: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.primaryDark },
  cameraHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.primaryDark },
  cameraLabel: { color: colors.white, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primary },
  cameraControls: { position: 'absolute', right: 0, bottom: 0, left: 0, height: 96, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark },
  shutter: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, borderRadius: radius.pill, backgroundColor: colors.surface },
  shutterCore: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.success },
  previewCard: { gap: spacing.md, marginVertical: spacing.sm },
  previewImage: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: colors.border },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
