import React, { useCallback, useEffect, useState } from 'react';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { formatDateTime } from '../utils/formatters';

function timestamp(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayDate(value) {
  const date = timestamp(value);
  return date ? formatDateTime(date) : '—';
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [leadResponse, callResponse] = await Promise.all([
        client.get('/leads'),
        client.get('/calls'),
      ]);
      setLeads(leadResponse.data.leads);
      setCalls(callResponse.data.calls);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Failed to load leads and calls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const leadNames = new Map(leads.map((lead) => [lead.id, lead.name]));

  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TELEMARKETING</span>
        <h1>Leads</h1>
        <p className="muted">Read-only view of prospects and call activity across the workspace.</p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      <Card title="Lead records">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Organization</th><th>Phone</th><th>Status</th><th>Score</th><th>Owner</th><th>Calls</th><th>Next follow-up</th></tr></thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{lead.organization || '—'}</td>
                  <td>{lead.phone}</td>
                  <td>{lead.status?.replace(/_/g, ' ') || '—'}</td>
                  <td>{lead.score || 'unscored'}</td>
                  <td>{lead.telemarketerId}</td>
                  <td>{lead.callCount || 0}</td>
                  <td>{displayDate(lead.nextFollowUpAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && leads.length === 0
            ? <EmptyState title="No leads yet" message="Telemarketer prospects will appear here." />
            : null}
          {loading ? <p className="muted">Loading lead records…</p> : null}
        </div>
      </Card>
      <Card title="Call activity">
        {loading ? <p className="muted">Loading call activity…</p> : calls.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Lead</th><th>Telemarketer</th><th>Outcome</th><th>Duration</th><th>Notes</th></tr></thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td>{displayDate(call.startedAt)}</td>
                    <td>{leadNames.get(call.leadId) || call.leadId}</td>
                    <td>{call.telemarketerId}</td>
                    <td>{call.outcome?.replace(/_/g, ' ') || '—'}</td>
                    <td>{Number.isFinite(call.durationSeconds) ? `${call.durationSeconds}s` : '—'}</td>
                    <td>{call.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading ? (
          <EmptyState title="No calls yet" message="Logged call activity will appear here." />
        ) : null}
      </Card>
      <div style={{ marginTop: 18 }}>
        <Button variant="secondary" onClick={() => { setLoading(true); load(); }} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
    </>
  );
}
