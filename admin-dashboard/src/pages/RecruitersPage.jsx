import React, { useCallback, useEffect, useState } from 'react';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

const blank = { name: '', phone: '', email: '', password: '' };

export default function RecruitersPage() {
  const [form, setForm] = useState(blank);
  const [recruiters, setRecruiters] = useState([]);
  const [teams, setTeams] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [repResponse, teamResponse, membershipResponse, campaignResponse] = await Promise.all([
        client.get('/reps'),
        client.get('/teams'),
        client.get('/teams/memberships'),
        client.get('/campaigns'),
      ]);
      setRecruiters((repResponse.data.reps || []).filter((user) => user.role === 'recruiter' && user.active !== false));
      setTeams((teamResponse.data.teams || []).filter((team) => team.active));
      setMemberships(membershipResponse.data.memberships || []);
      setCampaigns((campaignResponse.data.campaigns || []).filter((campaign) => campaign.programType === 'candidate_recruitment'));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Could not load recruiter setup data.');
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const currentMembership = (userId) => memberships.find((item) => item.repId === userId && item.status === 'active');

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    let created;
    try {
      const response = await client.post('/reps', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: 'recruiter',
      });
      created = response.data?.rep;
      if (!created?.id) throw new Error('The server did not return the created account. Check the recruiter list before trying again.');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || requestError.message || 'Recruiter account creation failed.');
      setSaving(false);
      return;
    }

    setForm(blank);
    setNotice(`${created.name} now has a Campaign Recruiter account.`);

    let followupError = '';
    try {
      await load();
    } catch {
      followupError = `${followupError ? `${followupError} ` : ''}The account was created, but the list could not refresh. Use Refresh to try again.`;
    }
    if (followupError) setError(followupError);
    setSaving(false);
  }

  return <>
    <div className="page-heading">
      <span className="eyebrow">CAMPAIGN OPERATIONS</span>
      <h1>Recruiter accounts</h1>
      <p className="muted">Create recruiter logins here, then assign each person directly from a recruitment campaign. Team assignment is optional.</p>
    </div>
    {error ? <div className="error-banner" role="alert">{error}</div> : null}
    {notice ? <div className="success-banner" role="status">{notice}</div> : null}
    <div className="grid-2">
      <Card title="Create campaign recruiter">
        <form className="form-grid" onSubmit={create}>
          <div className="field"><label>Full name</label><input required maxLength={160} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="field"><label>Phone</label><input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          <div className="field"><label>Email (sign-in)</label><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div className="field"><label>Temporary password</label><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
          <Button type="submit" disabled={saving}>{saving ? 'Creating account…' : 'Create recruiter account'}</Button>
        </form>
      </Card>
      <Card title="Setup steps">
        <ol style={{ lineHeight: 1.8, paddingLeft: 22 }}>
          <li>Create a recruiter account here.</li>
          <li>Open Campaigns, choose Candidate Recruitment, then select the recruiter under Assign recruiters.</li>
          <li>Share sign-in details securely. The recruiter sees the campaign in the app and can register applicants.</li>
        </ol>
        <p className="muted">Team membership is only needed when a team leader should also review the recruiter’s applicants.</p>
      </Card>
    </div>
    <Card title={`${recruiters.length} active campaign recruiters`}>
      <div className="ui-card-heading">
        <span className="muted">{loading ? 'Refreshing recruiter accounts…' : 'Account status and team assignment'}</span>
        <Button type="button" variant="secondary" onClick={() => load().catch(() => {})} disabled={loading || saving}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
      </div>
      {recruiters.length ? <div className="table-wrap"><table>
        <thead><tr><th>Recruiter</th><th>Sign-in email</th><th>Phone</th><th>Team (optional)</th><th>Assigned campaigns</th><th>Status</th></tr></thead>
        <tbody>{recruiters.map((user) => {
          const membership = currentMembership(user.id);
          const team = teams.find((item) => item.id === membership?.teamId);
          const assignedCampaigns = campaigns.filter((campaign) => campaign.recruiterIds?.includes(user.id)
            || (team && campaign.teamIds?.includes(team.id)));
          return <tr key={user.id}>
            <td>{user.name}</td><td>{user.email}</td><td>{user.phone}</td>
            <td>{team?.name || (membership ? 'Assigned team unavailable' : 'Not assigned')}</td>
            <td>{assignedCampaigns.length ? assignedCampaigns.map((campaign) => campaign.name).join(', ') : 'No campaigns assigned'}</td>
            <td>{assignedCampaigns.length ? 'Ready' : 'Campaign needed'}</td>
          </tr>;
        })}</tbody>
      </table></div> : !loading ? <EmptyState title="No recruiter accounts yet" message="Create an account above for each person recruiting campaign applicants." /> : null}
    </Card>
  </>;
}
