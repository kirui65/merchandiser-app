import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { login as apiLogin, verifyMfaLogin, logout as apiLogout, getStoredUser, hasStoredAuthToken } from '../api/auth';
import { initDb } from '../offline/db';
import { getPendingPings, markPingsFailed, markPingsSynced } from '../offline/gpsQueue';
import { createGpsSyncManager } from '../offline/gpsSyncManager';
import {
  getPendingActivations,
  markActivationFailed,
  markActivationSynced,
} from '../offline/activationsQueue';
import { createActivationSyncManager } from '../offline/activationSyncManager';
import { createActivation, updateActivation, uploadActivationMedia } from '../api/activations';
import {
  getPendingMerchandisingRecords,
  markMerchandisingFailed,
  markMerchandisingSynced,
} from '../offline/merchandisingQueue';
import { createMerchandisingSyncManager } from '../offline/merchandisingSyncManager';
import { createMerchandisingRecord, uploadMerchandisingPhoto } from '../api/merchandising';
import { getPendingSales, markFailed, markSynced } from '../offline/salesQueue';
import { postSale } from '../api/sales';
import { createSyncManager } from '../offline/syncManager';
import { subscribeToConnectivity, isCurrentlyOnline } from '../utils/netInfo';
import { authenticateBiometric, isBiometricUnlockEnabled } from './biometric';
import { stopRouteTracking } from '../location/gpsTracker';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDb();
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const salesSyncManager = createSyncManager({
      queue: { getPendingSales, markFailed, markSynced },
      api: { postSale },
      isOnline: isCurrentlyOnline,
      subscribeToConnectivity,
    });
    const syncManager = ['rep', 'brand_ambassador'].includes(user.role) ? createGpsSyncManager({
      queue: { getPendingPings, markPingsFailed, markPingsSynced },
      isOnline: () => true,
    }) : null;
    const stopSalesSync = salesSyncManager.start();
    const stopGpsSync = syncManager?.start();
    const activationSyncManager = user.role === 'brand_ambassador'
      ? createActivationSyncManager({
        queue: { getPendingActivations, markActivationSynced, markActivationFailed },
        api: { createActivation, updateActivation },
        uploadMedia: uploadActivationMedia,
        isOnline: isCurrentlyOnline,
        subscribeToConnectivity,
      })
      : null;
    const stopActivationSync = activationSyncManager?.start();
    const merchandisingSyncManager = user.role === 'rep'
      ? createMerchandisingSyncManager({
        queue: { getPendingMerchandisingRecords, markMerchandisingSynced, markMerchandisingFailed },
        api: { createRecord: createMerchandisingRecord },
        uploadPhoto: uploadMerchandisingPhoto,
        isOnline: isCurrentlyOnline,
        subscribeToConnectivity,
      })
      : null;
    const stopMerchandisingSync = merchandisingSyncManager?.start();
    return () => {
      stopSalesSync();
      stopGpsSync?.();
      stopActivationSync?.();
      stopMerchandisingSync?.();
    };
  }, [user]);

  useEffect(() => {
    (async () => {
      const storedUser = await getStoredUser();
      if (storedUser && await isBiometricUnlockEnabled()) {
        const result = await authenticateBiometric();
        setUser(result.success ? storedUser : null);
      } else setUser(storedUser);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  async function signIn(email, password) {
    const loggedInUser = await apiLogin(email, password);
    if (loggedInUser.mfaRequired) return loggedInUser;
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function verifyMfa(challenge, code) {
    const loggedInUser = await verifyMfaLogin(challenge, code);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function unlockWithBiometric() {
    if (!(await isBiometricUnlockEnabled())) return false;
    const result = await authenticateBiometric();
    if (!result.success) return false;

    const [storedUser, hasToken] = await Promise.all([getStoredUser(), hasStoredAuthToken()]);
    if (!storedUser || !hasToken) return false;
    setUser(storedUser);
    return true;
  }

  async function signOut() {
    setUser(null);
    const [authCleanup, trackingCleanup] = await Promise.allSettled([
      apiLogout(),
      stopRouteTracking(),
    ]);
    const failedCleanup = [authCleanup, trackingCleanup].find((result) => result.status === 'rejected');
    if (failedCleanup) {
      console.error('Sign-out cleanup did not complete:', failedCleanup.reason);
      Alert.alert(
        'Sign-out needs attention',
        'You are signed out, but this device could not clear every saved credential or stop location tracking. Please restart the app and try again.',
      );
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, verifyMfa, unlockWithBiometric, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
