import client from './client';
import * as SecureStore from 'expo-secure-store';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  await SecureStore.setItemAsync('authToken', data.token);
  await SecureStore.setItemAsync('authUser', JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  await SecureStore.deleteItemAsync('authToken');
  await SecureStore.deleteItemAsync('authUser');
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync('authUser');
  return raw ? JSON.parse(raw) : null;
}
