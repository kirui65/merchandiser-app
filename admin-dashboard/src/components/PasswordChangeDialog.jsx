import React, { useState } from 'react';
import client from '../api/client';
import Button from './Button';

export default function PasswordChangeDialog({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(null); setNotice(null);
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    setSaving(true);
    try {
      const { data } = await client.post('/auth/change-password', { currentPassword, newPassword });
      setNotice(data.message);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to update password');
    } finally { setSaving(false); }
  }

  return <div className="password-dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="password-dialog ui-card" role="dialog" aria-modal="true" aria-labelledby="change-password-title" onMouseDown={(event) => event.stopPropagation()}><div className="password-dialog-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2 id="change-password-title">Change password</h2></div><button className="dialog-close" type="button" aria-label="Close password dialog" onClick={onClose}>×</button></div><p className="muted">Use your current password to confirm this change.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength="8" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div><div className="field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>{error && <div className="error-banner">{error}</div>}{notice && <div className="success-banner">{notice}</div>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</Button></div></form></section></div>;
}
