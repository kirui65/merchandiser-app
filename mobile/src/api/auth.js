import client from './client';
import * as SecureStore from 'expo-secure-store';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  if (data.mfaRequired) return data;
  await SecureStore.setItemAsync('authToken', data.token);
  await SecureStore.setItemAsync('authUser', JSON.stringify(data.user));
  return data.user;
}

export async function verifyMfaLogin(challenge, code) {
  const { data } = await client.post('/auth/mfa/verify-login', { challenge, code });
  await SecureStore.setItemAsync('authToken', data.token);
  await SecureStore.setItemAsync('authUser', JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  const results = await Promise.allSettled([
    SecureStore.deleteItemAsync('authToken'),
    SecureStore.deleteItemAsync('authUser'),
    SecureStore.deleteItemAsync('biometricUnlockEnabled'),
  ]);
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Unable to clear all saved sign-in credentials from this device.');
  }
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync('authUser');
  return raw ? JSON.parse(raw) : null;
}

export async function hasStoredAuthToken() {
  return Boolean(await SecureStore.getItemAsync('authToken'));
}
