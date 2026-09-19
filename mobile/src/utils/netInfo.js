// Connectivity detection, wired to @react-native-community/netinfo.
// Kept as a thin wrapper so syncManager.js's `isOnline` dependency can be
// swapped for a mock in tests without importing react-native at all.
import NetInfo from '@react-native-community/netinfo';

export function subscribeToConnectivity(onChange) {
  return NetInfo.addEventListener((state) => {
    onChange(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}

export async function isCurrentlyOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
