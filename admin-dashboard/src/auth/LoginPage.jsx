import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Login failed');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Manager Login</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }} />
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" style={{ padding: '8px 16px' }}>Sign in</button>
      </form>
    </div>
  );
}
