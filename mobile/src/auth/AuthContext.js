import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, logout as apiLogout, getStoredUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
