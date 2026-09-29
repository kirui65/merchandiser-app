import React, { useEffect, useState } from 'react';
import client from '../api/client';
import Button from './Button';
import { useAuth } from '../auth/AuthContext';

export default function PasswordChangeDialog({ onClose }) {
  const { user, updateSession } = useAuth();
  const [mode, setMode] = useState('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get('/auth/mfa/status').then(({ data }) => setMfaEnabled(data.enabled)).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError(null); setNotice(null);
    if (mode === 'password' && newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    setSaving(true);
    try {
      const endpoint = mode === 'password' ? '/auth/change-password' : mode === 'email' ? '/auth/change-email' : mode === 'sessions' ? '/auth/revoke-sessions' : mfaEnabled ? '/auth/mfa/disable' : '/auth/mfa/enable';
      const body = mode === 'password' ? { currentPassword, newPassword } : mode === 'email' ? { currentPassword, email } : mode === 'sessions' ? { currentPassword } : { currentPassword, code: mfaCode };
      const { data } = await client.post(endpoint, body);
      updateSession(data);
      setNotice(data.message);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      if (mode === 'mfa') { setMfaEnabled(data.enabled); setMfaSetup(null); setMfaCode(''); }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to update password');
    } finally { setSaving(false); }
  }

  async function beginMfaSetup() {
    setError(null); setNotice(null); setSaving(true);
    try { const { data } = await client.post('/auth/mfa/setup'); setMfaSetup(data); }
    catch (err) { setError(err.response?.data?.error?.message || 'Unable to start authenticator setup'); }
    finally { setSaving(false); }
  }

  return <div className="password-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="password-dialog ui-card" role="dialog" aria-modal="true" aria-labelledby="change-account-title" onMouseDown={(event) => event.stopPropagation()}><div className="password-dialog-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2 id="change-account-title">Account settings</h2></div><button className="dialog-close" type="button" aria-label="Close account settings" onClick={onClose}>×</button></div><div className="account-settings-tabs" role="tablist" aria-label="Account settings"><button type="button" role="tab" aria-selected={mode === 'password'} className={mode === 'password' ? 'is-active' : ''} onClick={() => { setMode('password'); setError(null); setNotice(null); }}>Password</button><button type="button" role="tab" aria-selected={mode === 'email'} className={mode === 'email' ? 'is-active' : ''} onClick={() => { setMode('email'); setError(null); setNotice(null); }}>Email</button><button type="button" role="tab" aria-selected={mode === 'sessions'} className={mode === 'sessions' ? 'is-active' : ''} onClick={() => { setMode('sessions'); setError(null); setNotice(null); }}>Sessions</button><button type="button" role="tab" aria-selected={mode === 'mfa'} className={mode === 'mfa' ? 'is-active' : ''} onClick={() => { setMode('mfa'); setError(null); setNotice(null); }}>MFA</button></div><p className="muted">{mode === 'sessions' ? 'Sign out every other device by rotating your session version.' : mode === 'mfa' ? 'Protect sign-in with a six-digit authenticator-app code.' : 'Your current password is required to confirm account changes. Other sessions will be signed out.'}</p>{mode === 'mfa' && !mfaEnabled && !mfaSetup && <div className="mfa-setup-start"><span className="muted">Set up an authenticator app, then confirm its current code to enable MFA.</span><Button type="button" variant="secondary" disabled={saving} onClick={beginMfaSetup}>{saving ? 'Preparing…' : 'Set up authenticator'}</Button></div>}{mode === 'mfa' && mfaSetup && !mfaEnabled && <div className="mfa-secret-panel"><strong>Authenticator setup key</strong><code>{mfaSetup.secret}</code><small>Add this key manually in your authenticator app. It is only shown during setup.</small></div>}<form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>{mode === 'password' ? <><div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength="8" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div><div className="field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div></> : mode === 'email' ? <div className="field"><label htmlFor="account-email">New email address</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div> : mode === 'sessions' ? <p className="account-session-warning">Other signed-in devices will need to log in again.</p> : <div className="field"><label htmlFor="account-mfa-code">{mfaEnabled ? 'Current authenticator code' : 'Authenticator code'}</label><input id="account-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>}{error && <div className="error-banner">{error}</div>}{notice && <div className="success-banner">{notice}</div>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="submit" disabled={saving || (mode === 'mfa' && !mfaEnabled && !mfaSetup)}>{saving ? 'Updating…' : mode === 'password' ? 'Update password' : mode === 'email' ? 'Update email' : mode === 'sessions' ? 'Sign out other sessions' : mfaEnabled ? 'Disable MFA' : 'Enable MFA'}</Button></div></form></section></div>;
}
