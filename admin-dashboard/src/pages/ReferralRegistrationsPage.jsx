import React, { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import { exportPdf } from '../utils/export';

const statuses = ['submitted', 'contacted', 'requirements_checked', 'training_scheduled', 'placed', 'rejected'];
const label = (value) => String(value || '').replace(/_/g, ' ');

export default function ReferralRegistrationsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [action, setAction] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [referralResponse, summaryResponse] = await Promise.all([client.get('/referrals'), client.get('/referrals/summary')]);
      setRows(referralResponse.data.referrals || []);
      setSummary(summaryResponse.data.summary || null);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Could not load applicant referrals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const campaigns = useMemo(() => [...new Set(rows.map((row) => row.campaignName).filter(Boolean))], [rows]);
  const [campaignFilter, setCampaignFilter] = useState('');
  const filteredRows = rows.filter((row) => (!statusFilter || row.status === statusFilter)
    && (!campaignFilter || row.campaignName === campaignFilter)
    && `${row.applicantName || ''} ${row.phone || ''} ${row.email || ''} ${row.campaignName || ''} ${row.recruiterName || ''}`.toLowerCase().includes(query.toLowerCase()));

  function openAction(kind, row) {
    setAction({ kind, row });
    setReviewNote('');
    setPaymentReference('');
  }

  async function submitAction(event) {
    event.preventDefault();
    const { kind, row } = action;
    setBusy(row.id);
    setError('');
    try {
      if (kind === 'pay') {
        await client.post(`/referrals/${encodeURIComponent(row.id)}/pay`, { paymentReference: paymentReference.trim() });
      } else {
        await client.patch(`/referrals/${encodeURIComponent(row.id)}/status`, { status: kind, note: reviewNote.trim() });
      }
      setAction(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || (kind === 'pay' ? 'Could not record payment.' : 'Status update failed.'));
    } finally {
      setBusy('');
    }
  }

  function exportApplicants() {
    const exportedRows = filteredRows.map((row) => [row.applicantName, row.campaignName, row.recruiterName || 'Unknown recruiter', row.county || '—', label(row.status), row.commissionConfigured ? `KSh ${Number(row.commissionAmountKsh).toLocaleString()}` : 'Not configured', label(row.payoutStatus || '—')]);
    exportPdf('Applicant referral report', ['Applicant', 'Campaign', 'Recruiter', 'County', 'Progress', 'Commission', 'Payout status'], exportedRows, { subtitle: `${filteredRows.length} applicant records${statusFilter ? ` · ${label(statusFilter)}` : ''}${campaignFilter ? ` · ${campaignFilter}` : ''}` });
  }

  return <>
    <div className="page-heading"><span className="eyebrow">JOBPLUS · CANDIDATE RECRUITMENT</span><h1>Applicant referrals</h1><p className="muted">Review recruiter submissions, track progress, and record commission payments against the configured campaign rule.</p></div>
    {error && <div className="error-banner" role="alert">{error}<Button type="button" variant="secondary" onClick={load} disabled={loading}>{loading ? 'Retrying…' : 'Retry'}</Button></div>}
    <div className="grid-4 referral-summary-grid">
      {[['Applicants', summary?.total || 0], ['In progress', (summary?.counts?.submitted || 0) + (summary?.counts?.contacted || 0)], ['Placed', summary?.counts?.placed || 0], ['Commission due', `KSh ${(summary?.dueKsh || 0).toLocaleString()}`]].map(([title, value]) => <Card key={title}><small className="muted">{title}</small><div className="stat-value">{value}</div></Card>)}
    </div>
    {summary?.commissionRuleMissing && <div className="error-banner">At least one recruitment campaign has no commission rule. Configure a rate and trigger in Campaigns before promising or paying recruiter commission.</div>}
    <Card title={loading ? 'Loading applicants…' : `${filteredRows.length} applicant records`}>
      <div className="referral-toolbar"><label>Search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Applicant, phone, campaign, or recruiter" /></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label><label>Campaign<select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}><option value="">All campaigns</option>{campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}</select></label><Button type="button" variant="secondary" disabled={loading || !filteredRows.length} onClick={exportApplicants}>Export PDF</Button></div>
      {loading && !rows.length ? <div className="table-loading" role="status">Loading referrals…</div> : filteredRows.length ? <div className="table-wrap"><table className="referral-table"><thead><tr><th>Applicant</th><th>Campaign</th><th>Recruiter</th><th>Candidate details</th><th>Progress</th><th>Commission</th><th>Action</th></tr></thead><tbody>{filteredRows.map((row) => {
        const nextStatus = statuses[statuses.indexOf(row.status) + 1];
        return <tr key={row.id}>
          <td><strong>{row.applicantName}</strong><br /><small className="muted">{row.county}</small></td>
          <td>{row.campaignName}</td><td>{row.recruiterName || 'Unknown recruiter'}</td>
          <td><details className="referral-details"><summary>View details</summary><dl><dt>Phone</dt><dd>{row.phone || '—'}</dd><dt>Email</dt><dd>{row.email || '—'}</dd><dt>National ID</dt><dd>{row.applicantIdNumber || '—'}</dd><dt>Education</dt><dd>{row.education || '—'}</dd><dt>Passport</dt><dd>{label(row.passportStatus) || '—'}</dd><dt>NITA fee</dt><dd>{row.nitaFeeStatus === 'paid' ? 'Paid' : 'Unpaid'}</dd></dl></details></td>
          <td><span className={`status-pill ${row.status === 'placed' ? 'status-good' : row.status === 'rejected' ? 'status-risk' : 'status-watch'}`}>{label(row.status)}</span></td>
          <td>{row.commissionConfigured ? `KSh ${Number(row.commissionAmountKsh).toLocaleString()} · ${label(row.payoutStatus)}` : 'Not configured'}</td>
          <td>{row.payoutStatus === 'due' ? <Button disabled={busy === row.id} onClick={() => openAction('pay', row)}>Record payment</Button> : nextStatus && row.status !== 'rejected' ? <Button variant="secondary" disabled={busy === row.id} onClick={() => openAction(nextStatus, row)}>Move to {label(nextStatus)}</Button> : row.status === 'rejected' ? 'Closed' : row.status === 'placed' ? 'Complete' : '—'}</td>
        </tr>;
      })}</tbody></table></div> : !loading ? <div className="empty-state"><strong>{rows.length ? 'No matching referrals' : 'No registrations yet'}</strong><span>{rows.length ? 'Adjust the search or filters.' : 'Recruiter submissions will appear here.'}</span></div> : null}
    </Card>
    {action && <div className="command-backdrop" role="presentation" onMouseDown={() => setAction(null)}><section className="ui-card referral-action-dialog" role="dialog" aria-modal="true" aria-labelledby="referral-action-title" onMouseDown={(event) => event.stopPropagation()}><div className="ui-card-heading"><h2 id="referral-action-title">{action.kind === 'pay' ? 'Record recruiter payment' : `Move applicant to ${label(action.kind)}`}</h2><button className="dialog-close" type="button" aria-label="Close" onClick={() => setAction(null)}>×</button></div><p className="muted">{action.row.applicantName} · {action.row.campaignName}</p><form className="form-grid" onSubmit={submitAction}>{action.kind === 'pay' ? <div className="field"><label htmlFor="referral-payment-reference">Transfer or payment reference</label><input id="referral-payment-reference" required maxLength={120} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></div> : <div className="field"><label htmlFor="referral-review-note">Review note (optional)</label><textarea id="referral-review-note" rows={4} maxLength={500} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></div>}{error && <div className="error-banner" role="alert">{error}</div>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={() => setAction(null)}>Cancel</Button><Button type="submit" disabled={busy === action.row.id}>{busy === action.row.id ? 'Saving…' : action.kind === 'pay' ? 'Record payment' : 'Update status'}</Button></div></form></section></div>}
  </>;
}
