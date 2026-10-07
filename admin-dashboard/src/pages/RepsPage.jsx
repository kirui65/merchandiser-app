import React, { useEffect, useState } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

const ROLE_OPTIONS = [
  ['rep', 'Merchandiser'],
  ['brand_ambassador', 'Brand Ambassador'],
  ['telemarketer', 'Telemarketer'],
  ['team_leader', 'Team Leader'],
  ['manager', 'Manager'],
];
const roleLabel = (role) => ROLE_OPTIONS.find(([value]) => value === role)?.[1] || role;
const emptyForm = { name: '', phone: '', email: '', password: '', role: 'rep' };
const editForm = { name: '', phone: '', email: '', role: 'rep' };

export default function RepsPage() {
  const [reps, setReps] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState(editForm);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function load() {
    const { data } = await client.get('/reps');
    setReps(data.reps);
  }

  useEffect(() => { load().catch(() => setError('Failed to load reps')); }, []);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    const normalizedEmail = form.email.trim().toLowerCase();
    if (reps.some((rep) => rep.email?.trim().toLowerCase() === normalizedEmail)) {
      setError('An account already uses this email address');
      return;
    }
    try {
      await client.post('/reps', { ...form, email: normalizedEmail });
      setForm(emptyForm);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to create rep');
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    try {
      await client.put(`/reps/${editing.id}`, edit);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to update rep');
    }
  }

  async function toggle(rep) {
    try {
      await client.patch(`/reps/${rep.id}/status`, { active: !rep.active });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to update status');
    }
  }

  async function resetPassword(rep) {
    if (!window.confirm(`Generate a new temporary password for ${rep.name}?`)) return;
    try {
      const { data } = await client.post(`/reps/${rep.id}/reset-password`);
      setNotice(`Temporary password for ${rep.name}: ${data.temporaryPassword}`);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to reset password');
    }
  }

  async function resetMfa(rep) {
    if (!window.confirm(`Reset MFA for ${rep.name}? Their sessions will be signed out.`)) return;
    try {
      const { data } = await client.post(`/reps/${rep.id}/reset-mfa`);
      setNotice(data.message);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to reset MFA');
    }
  }

  function startEditing(rep) {
    setEditing(rep);
    setEdit({ name: rep.name, phone: rep.phone, email: rep.email, role: rep.role });
  }

  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">FIELD NETWORK</span>
        <h1>Representatives</h1>
        <p className="muted">Manage access and field coverage without deleting historical records.</p>
      </div>
      {notice ? <div className="success-banner" style={{ marginBottom: 18 }}>{notice}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="grid-2">
        <Card title="Create account">
          <form className="form-grid" onSubmit={submit}>
            {Object.entries(form).filter(([key]) => key !== 'role').map(([key, value]) => (
              <div className="field" key={key}>
                <label>{key[0].toUpperCase() + key.slice(1)}</label>
                <input type={key === 'password' ? 'password' : 'text'} required value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
              </div>
            ))}
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <Button type="submit">Create account</Button>
          </form>
        </Card>
        <Card title={`${reps.length} team members`}>
          {reps.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{reps.map((rep) => (
                  <tr key={rep.id}>
                    <td>{rep.name}</td>
                    <td>{rep.email}<br />{rep.phone}</td>
                    <td>{roleLabel(rep.role)}</td>
                    <td>{rep.active ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Button variant="secondary" onClick={() => startEditing(rep)}>Edit</Button>{' '}
                      <Button variant="secondary" onClick={() => toggle(rep)}>{rep.active ? 'Deactivate' : 'Reactivate'}</Button>{' '}
                      <Button variant="secondary" onClick={() => resetPassword(rep)}>Reset password</Button>{' '}
                      {rep.mfaEnabled ? <Button variant="secondary" onClick={() => resetMfa(rep)}>Reset MFA</Button> : null}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState title="No representatives" message="Create the first field account to get started." />}
        </Card>
      </div>
      {editing ? (
        <Card title={`Edit ${editing.name}`}>
          <form className="form-grid" onSubmit={saveEdit}>
            {['name', 'phone', 'email'].map((key) => (
              <div className="field" key={key}>
                <label>{key[0].toUpperCase() + key.slice(1)}</label>
                <input required value={edit[key]} onChange={(event) => setEdit({ ...edit, [key]: event.target.value })} />
              </div>
            ))}
            <div className="field">
              <label>Role</label>
              <select value={edit.role} onChange={(event) => setEdit({ ...edit, role: event.target.value })}>
                {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <Button type="submit">Save changes</Button>{' '}
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </>
  );
}
