import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_UNLOCK_KEY = 'biometricUnlockEnabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometricSavedLogin';
const BIOMETRIC_PROFILE_KEY = 'biometricSavedLoginProfile';
const BIOMETRIC_PROMPT_ASKED_KEY = 'biometricEnablePromptAsked';
const AUTHENTICATED_CREDENTIAL_OPTIONS = {
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your saved login',
};

export async function isBiometricUnlockEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_UNLOCK_KEY)) === 'true';
}

export async function canUseBiometricUnlock() {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

export async function getBiometricUnlockLabel() {
  if (!(await canUseBiometricUnlock())) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const supportsFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const supportsFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

  if (supportsFace && supportsFingerprint) return 'fingerprint or face';
  if (supportsFace) return 'face';
  return supportsFingerprint ? 'fingerprint' : null;
}

export async function getBiometricLoginProfile() {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_PROFILE_KEY);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw);
    if (!profile.displayName || !profile.role) throw new Error('The saved login profile is incomplete.');
    return profile;
  } catch {
    await forgetBiometricLogin();
    throw new Error('The saved biometric login profile is damaged. Sign in with your password to set it up again.');
  }
}

export async function getBiometricPromptAsked() {
  return (await SecureStore.getItemAsync(BIOMETRIC_PROMPT_ASKED_KEY)) === 'true';
}

export async function markBiometricPromptAsked() {
  await SecureStore.setItemAsync(BIOMETRIC_PROMPT_ASKED_KEY, 'true');
}

export async function saveBiometricLogin({ email, password, role, displayName }) {
  if (!(await canUseBiometricUnlock())) {
    throw new Error('Fingerprint or face unlock is not enrolled on this device.');
  }

  const authentication = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm to save your sign-in on this device',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });
  if (!authentication.success) {
    throw new Error('Biometric verification was not completed. Your saved login was not changed.');
  }

  const profile = { displayName, role };
  try {
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify({ email, password, role }),
      AUTHENTICATED_CREDENTIAL_OPTIONS,
    );
    await SecureStore.setItemAsync(BIOMETRIC_PROFILE_KEY, JSON.stringify(profile));
    await SecureStore.setItemAsync(BIOMETRIC_UNLOCK_KEY, 'true');
    await markBiometricPromptAsked();
  } catch (error) {
    const cleanup = await Promise.allSettled([
      SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_PROFILE_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_UNLOCK_KEY),
    ]);
    if (cleanup.some((result) => result.status === 'rejected')) {
      throw new Error('Biometric setup could not be completed and saved login data could not be fully cleared. Use Forget saved login in More.');
    }
    throw error;
  }
}

export async function getBiometricLoginCredentials() {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY, AUTHENTICATED_CREDENTIAL_OPTIONS);
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw);
    if (!credentials.email || !credentials.password || !credentials.role) {
      throw new Error('The saved login is incomplete.');
    }
    return credentials;
  } catch {
    await forgetBiometricLogin();
    throw new Error('Your saved login could not be read. Sign in with your password to set it up again.');
  }
}

export async function setBiometricUnlockEnabled(enabled) {
  if (!enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_UNLOCK_KEY, 'false');
    return;
  }
  if (!(await canUseBiometricUnlock())) {
    throw new Error('Biometric unlock is not set up on this device. Add a fingerprint or face unlock in device settings first.');
  }
  const credentials = await getBiometricLoginCredentials();
  if (!credentials) {
    await forgetBiometricLogin();
    throw new Error('Sign in with your email and password before enabling biometric login.');
  }
  await SecureStore.setItemAsync(BIOMETRIC_UNLOCK_KEY, 'true');
}

export async function forgetBiometricLogin() {
  const results = await Promise.allSettled([
    SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_PROFILE_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_UNLOCK_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_PROMPT_ASKED_KEY),
  ]);
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Could not fully forget the saved login on this device.');
  }
}

export function isBiometricCredentialInvalidated(error) {
  const description = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return description.includes('invalidat')
    || description.includes('decrypt')
    || description.includes('key permanently');
}
