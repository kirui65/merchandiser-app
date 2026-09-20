import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, logout as apiLogout, getStoredUser } from '../api/auth';
import { initDb } from '../offline/db';
import { getPendingPings, markPingsFailed, markPingsSynced } from '../offline/gpsQueue';
import { createGpsSyncManager } from '../offline/gpsSyncManager';
import { getPendingSales, markFailed, markSynced } from '../offline/salesQueue';
import { postSale } from '../api/sales';
import { createSyncManager } from '../offline/syncManager';
import { subscribeToConnectivity, isCurrentlyOnline } from '../utils/netInfo';

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
    const syncManager = createGpsSyncManager({
      queue: { getPendingPings, markPingsFailed, markPingsSynced },
      isOnline: () => true,
    });
    const stopSalesSync = salesSyncManager.start();
    const stopGpsSync = syncManager.start();
    return () => {
      stopSalesSync();
      stopGpsSync();
    };
  }, [user]);

  useEffect(() => {
    getStoredUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function signIn(email, password) {
    const loggedInUser = await apiLogin(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function signOut() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
