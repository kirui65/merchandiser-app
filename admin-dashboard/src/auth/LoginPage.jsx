import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-mark">●</span> Brandsphere</div>
        <div className="login-hero"><span className="login-kicker">Manager workspace</span><h1>See every field decision clearly.</h1><p>Monitor sales performance, route coverage, collections, and the team behind the work—all in one focused workspace.</p></div>
        <div className="login-proof"><span><strong>Field-first</strong>Route & outlet intelligence</span><span><strong>Money-aware</strong>M-Pesa reconciliation</span><span><strong>Accountable</strong>Team audit history</span></div>
      </section>
      <section className="login-panel"><div className="login-card"><span className="eyebrow">Secure access</span><h1>Welcome back</h1><p>Sign in with your manager account to continue.</p><form className="form-grid" onSubmit={handleSubmit}><div className="field"><label htmlFor="email">Work email</label><input id="email" autoComplete="email" type="email" placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><div className="field"><label htmlFor="password">Password</label><input id="password" autoComplete="current-password" placeholder="Enter your password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>{error && <div className="error-banner">{error}</div>}<button className="ui-button ui-button-primary" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Sign in to dashboard'}</button></form><p className="login-help">This workspace is available to Brandsphere managers only.</p></div></section>
    </main>
  );
}
