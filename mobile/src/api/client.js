// axios wrapper: base URL + auth header injection.
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example) — e.g.
// https://your-backend.onrender.com/api for a deployed Render backend,
// or http://<your-lan-ip>:4000/api when running the backend locally
// (localhost won't resolve from a physical device).
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
