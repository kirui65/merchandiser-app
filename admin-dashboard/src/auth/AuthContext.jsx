import React, { createContext, useContext, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  });

  async function signIn(email, password) {
    const { data } = await client.post('/auth/login', { email, password });
    if (data.user.role !== 'manager') {
      throw new Error('Only managers can access the admin dashboard');
    }
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function signOut() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
