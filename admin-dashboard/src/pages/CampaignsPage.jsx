import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { businessDateKey } from '../utils/businessDate';

const emptyForm = {
  clientName: '',
  name: '',
  description: '',
  regionIds: [],
  teamIds: [],
  status: 'draft',
  programType: 'field_sales',
  referralCommissionKsh: '',
  referralCommissionAt: 'placed',
  recruiterIds: [],
  startsAt: businessDateKey(),
  endsAt: '',
};

function dateInput(value) {
  if (!value) return '';
  const timestamp = typeof value === 'object' ? (value.seconds ?? value._seconds) * 1000 : value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : businessDateKey(date);
}

function toPayload(form) {
  return {
    ...form,
    referralCommissionKsh: form.programType === 'candidate_recruitment' && form.referralCommissionKsh !== '' ? Number(form.referralCommissionKsh) : null,
    referralCommissionAt: form.programType === 'candidate_recruitment' ? form.referralCommissionAt : null,
    recruiterIds: form.programType === 'candidate_recruitment' ? [...new Set(form.recruiterIds)] : [],
    startsAt: new Date(`${form.startsAt}T00:00:00.000+03:00`).toISOString(),
    endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59.999+03:00`).toISOString() : null,
  };
}

function MultiSelect({ label, options, selected, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select multiple value={selected} onChange={(event) => onChange([...event.target.selectedOptions].map((option) => option.value))} size={Math.min(5, Math.max(3, options.length))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      <small className="muted">Use Ctrl/Cmd-click to select multiple.</small>
    </div>
  );
}

function RecruiterPicker({ recruiters, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef(null);
  const toggle = (recruiterId) => onChange(
    selected.includes(recruiterId)
      ? selected.filter((id) => id !== recruiterId)
      : [...selected, recruiterId],
  );
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => { if (!pickerRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);
  const selectedRecruiters = recruiters.filter((recruiter) => selected.includes(recruiter.id));
  const filteredRecruiters = recruiters.filter((recruiter) => `${recruiter.name} ${recruiter.email}`.toLowerCase().includes(query.toLowerCase()));
  const summary = selectedRecruiters.length
    ? selectedRecruiters.map((recruiter) => recruiter.name).join(', ')
    : 'Select recruiters';
  return <div className="field recruiter-picker" ref={pickerRef}>
    <label id="recruiter-picker-label">Assign recruiters</label>
    <small className="muted">Choose who can register applicants for this campaign.</small>
    {recruiters.length ? <>
      <button type="button" className="recruiter-picker-trigger" aria-labelledby="recruiter-picker-label" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className={selectedRecruiters.length ? '' : 'is-placeholder'}>{summary}</span>
        <span className="recruiter-picker-count">{selectedRecruiters.length ? selectedRecruiters.length : ''}</span>
        <span className="recruiter-picker-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && <div className="recruiter-picker-menu" role="menu" aria-labelledby="recruiter-picker-label">
        {recruiters.length > 6 && <input className="recruiter-picker-search" aria-label="Search recruiters" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recruiters…" />}
        <div className="recruiter-picker-options">
          {filteredRecruiters.map((recruiter) => {
            const isSelected = selected.includes(recruiter.id);
            return <button key={recruiter.id} type="button" role="menuitemcheckbox" aria-checked={isSelected} className={`recruiter-picker-option ${isSelected ? 'is-selected' : ''}`} onClick={() => toggle(recruiter.id)}>
              <span className="recruiter-picker-option-copy"><strong>{recruiter.name}</strong><small>{recruiter.email}</small></span>
              <span className="recruiter-picker-check" aria-hidden="true">{isSelected ? '✓' : ''}</span>
            </button>;
          })}
          {!filteredRecruiters.length && <p className="recruiter-picker-empty">No recruiters match that search.</p>}
        </div>
        <div className="recruiter-picker-footer">{selectedRecruiters.length} selected · Choose one or more</div>
      </div>}
    </> : <p className="muted">No active recruiter accounts yet. <Link to="/recruiters">Create a recruiter account</Link> first.</p>}
    {selectedRecruiters.length > 0 && <div className="recruiter-picker-tags" aria-label="Selected recruiters">{selectedRecruiters.map((recruiter) => <span key={recruiter.id}>{recruiter.name}<button type="button" aria-label={`Remove ${recruiter.name}`} onClick={() => toggle(recruiter.id)}>×</button></span>)}</div>}
  </div>;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [regions, setRegions] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [campaignResponse, teamResponse, regionResponse, repResponse] = await Promise.all([
      client.get('/campaigns'),
      client.get('/teams'),
      client.get('/teams/regions'),
      client.get('/reps'),
    ]);
    setCampaigns(campaignResponse.data.campaigns || []);
    setTeams((teamResponse.data.teams || []).filter((team) => team.active));
    setRegions((regionResponse.data.regions || []).filter((region) => region.active));
    setRecruiters((repResponse.data.reps || []).filter((user) => user.role === 'recruiter' && user.active !== false));
  }, []);

  useEffect(() => { load().catch(() => setError('Failed to load campaign administration data')); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editing) await client.patch(`/campaigns/${editing.id}`, payload);
      else await client.post('/campaigns', payload);
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }

  function editCampaign(campaign) {
    setEditing(campaign);
    setForm({
      clientName: campaign.clientName,
      name: campaign.name,
      description: campaign.description || '',
      regionIds: campaign.regionIds || [],
      teamIds: campaign.teamIds || [],
      status: campaign.status,
      programType: campaign.programType || 'field_sales',
      referralCommissionKsh: campaign.referralCommissionKsh ?? '',
      referralCommissionAt: campaign.referralCommissionAt || 'placed',
      recruiterIds: campaign.recruiterIds || [],
      startsAt: dateInput(campaign.startsAt),
      endsAt: dateInput(campaign.endsAt),
    });
  }

  async function archive(campaign) {
    if (!window.confirm(`Archive “${campaign.name}”?`)) return;
    setError(null);
    try {
      await client.delete(`/campaigns/${campaign.id}`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to archive campaign');
    }
  }

  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">CLIENT DELIVERY</span>
        <h1>Campaigns</h1>
        <p className="muted">Set campaign schedules. Assign recruitment campaigns directly to recruiter accounts; assign field campaigns to regions and teams.</p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <Card className="campaign-form-card" title={editing ? `Edit ${editing.name}` : 'Create campaign'}>
        <form className="form-grid" onSubmit={submit}>
          <div className="field"><label>Client</label><input required maxLength={160} value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} /></div>
          <div className="field"><label>Campaign name</label><input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="field"><label>Program type</label><select value={form.programType} onChange={(event) => setForm({ ...form, programType: event.target.value, ...(event.target.value !== 'candidate_recruitment' ? { recruiterIds: [] } : {}) })}><option value="field_sales">Field sales</option><option value="candidate_recruitment">Candidate recruitment</option></select></div>
          {form.programType === 'candidate_recruitment' ? <div className="grid-2"><div className="field"><label>Recruiter commission (KSh)</label><input type="number" min="1" step="1" required value={form.referralCommissionKsh} onChange={(event) => setForm({ ...form, referralCommissionKsh: event.target.value })} /><small className="muted">This is separate from the advertised candidate salary.</small></div><div className="field"><label>Commission becomes due at</label><select value={form.referralCommissionAt} onChange={(event) => setForm({ ...form, referralCommissionAt: event.target.value })}>{[['requirements_checked','Requirements checked'],['training_scheduled','Training scheduled'],['placed','Placement confirmed']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div></div> : null}
          <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          {form.programType === 'candidate_recruitment' ? <RecruiterPicker recruiters={recruiters} selected={form.recruiterIds} onChange={(recruiterIds) => setForm({ ...form, recruiterIds })} /> : <div className="grid-2">
            <MultiSelect label="Regions" options={regions} selected={form.regionIds} onChange={(regionIds) => setForm({ ...form, regionIds, teamIds: form.teamIds.filter((teamId) => teams.find((team) => team.id === teamId && regionIds.includes(team.regionId))) })} />
            <MultiSelect label="Teams" options={teams.filter((team) => !form.regionIds.length || form.regionIds.includes(team.regionId))} selected={form.teamIds} onChange={(teamIds) => setForm({ ...form, teamIds })} />
          </div>}
          <div className="grid-2">
            <div className="field"><label>Status</label><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['draft', 'active', 'paused', 'completed', 'archived'].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            <div className="field"><label>Starts</label><input required type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></div>
            <div className="field"><label>Ends (optional)</label><input type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></div>
          </div>
          <div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save campaign' : 'Create campaign'}</Button>{' '}
            {editing ? <Button type="button" variant="secondary" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</Button> : null}
          </div>
        </form>
      </Card>
      <Card title={`${campaigns.length} campaigns`}>
        {campaigns.length ? (
          <div className="table-wrap"><table><thead><tr><th>Campaign</th><th>Client</th><th>Schedule</th><th>Assignments</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td><strong>{campaign.name}</strong><br /><small>{campaign.description}</small></td>
                <td>{campaign.clientName}</td>
                <td>{dateInput(campaign.startsAt)} – {dateInput(campaign.endsAt) || 'Ongoing'}</td>
                <td>{campaign.programType === 'candidate_recruitment' ? `${(campaign.recruiterIds || []).length} recruiters` : `${(campaign.regionIds || []).length} regions · ${(campaign.teamIds || []).length} teams`}</td>
                <td>{campaign.status}</td>
                <td><Button variant="secondary" onClick={() => editCampaign(campaign)}>Edit</Button>{' '}{campaign.status !== 'archived' ? <Button variant="secondary" onClick={() => archive(campaign)}>Archive</Button> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <EmptyState title="No campaigns yet" message="Create a campaign and assign recruiters, regions, or field teams." />}
      </Card>
    </>
  );
}
