import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_UNLOCK_KEY = 'biometricUnlockEnabled';

export async function isBiometricUnlockEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_UNLOCK_KEY)) === 'true';
}

export async function canUseBiometricUnlock() {
  const [hasHardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  return hasHardware && enrolled;
}

export async function getBiometricUnlockLabel() {
  if (!(await canUseBiometricUnlock())) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const supportsFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const supportsFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

  if (supportsFace && supportsFingerprint) return 'fingerprint or face';
  if (supportsFace) return 'face recognition';
  return supportsFingerprint ? 'fingerprint' : null;
}

export async function setBiometricUnlockEnabled(enabled) {
  if (enabled && !(await canUseBiometricUnlock())) throw new Error('Biometric unlock is not set up on this device. Add a fingerprint or face unlock in device settings first.');
  await SecureStore.setItemAsync(BIOMETRIC_UNLOCK_KEY, enabled ? 'true' : 'false');
}

export async function authenticateBiometric() {
  return LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Brandsphere', cancelLabel: 'Use password', disableDeviceFallback: false });
}
