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
import { stopRouteTracking } from '../location/gpsTracker';
import {
  canUseBiometricUnlock,
  getBiometricPromptAsked,
  markBiometricPromptAsked,
  saveBiometricLogin,
} from './biometric';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingBiometricCredentials, setPendingBiometricCredentials] = useState(null);

  useEffect(() => {
    initDb();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [hasToken, storedUser] = await Promise.all([hasStoredAuthToken(), getStoredUser()]);
        const validServerRoles = ['rep', 'manager', 'brand_ambassador', 'telemarketer', 'team_leader', 'recruiter'];
        if (mounted && hasToken && storedUser && validServerRoles.includes(storedUser.role)) setUser(storedUser);
      } catch (error) {
        console.warn('Could not restore the saved session:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
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

  async function offerBiometricSetup(credentials, loggedInUser) {
    try {
      if (!(await canUseBiometricUnlock()) || await getBiometricPromptAsked()) return;
      await markBiometricPromptAsked();
    } catch {
      Alert.alert('Biometric sign-in unavailable', 'You can enable fingerprint or face sign-in later in More.');
      return;
    }

    await new Promise((resolve) => {
      Alert.alert(
        'Sign in faster next time?',
        'Use fingerprint or face recognition for your next sign-in on this device.',
        [
          { text: 'Not now', style: 'cancel', onPress: resolve },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                await saveBiometricLogin({
                  ...credentials,
                  displayName: loggedInUser.name || credentials.email.split('@')[0],
                });
              } catch (error) {
                Alert.alert('Biometric sign-in not enabled', error.message);
              } finally {
                resolve();
              }
            },
          },
        ],
        { cancelable: false },
      );
    });
  }

  async function signIn(email, password, role, { skipBiometricPrompt = false } = {}) {
    const loggedInUser = await apiLogin(email, password, role);
    if (loggedInUser.mfaRequired) {
      setPendingBiometricCredentials({ email, password, role, skipBiometricPrompt });
      return loggedInUser;
    }
    setPendingBiometricCredentials(null);
    if (!skipBiometricPrompt) {
      await offerBiometricSetup({ email, password, role }, loggedInUser);
    }
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function verifyMfa(challenge, code) {
    const pendingCredentials = pendingBiometricCredentials;
    const loggedInUser = await verifyMfaLogin(challenge, code, pendingCredentials?.role);
    setPendingBiometricCredentials(null);
    if (pendingCredentials && !pendingCredentials.skipBiometricPrompt) {
      await offerBiometricSetup(pendingCredentials, loggedInUser);
    }
    setUser(loggedInUser);
    return loggedInUser;
  }

  function cancelPendingSignIn() {
    setPendingBiometricCredentials(null);
  }

  async function signOut() {
    setUser(null);
    setPendingBiometricCredentials(null);
    const [authCleanup, trackingCleanup] = await Promise.allSettled([
      apiLogout(),
      stopRouteTracking(),
    ]);
    const failedCleanup = [authCleanup, trackingCleanup].find((result) => result.status === 'rejected');
    if (failedCleanup) {
      console.error('Sign-out cleanup did not complete:', failedCleanup.reason);
      Alert.alert(
        'Sign-out needs attention',
        'You are signed out, but this device could not clear the current session or stop location tracking. Please restart the app and try again.',
      );
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, verifyMfa, cancelPendingSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
