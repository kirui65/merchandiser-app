import React, { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

function entryDate(entry) {
  const value = entry.createdAt;
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (value._seconds) return new Date(value._seconds * 1000);
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [reps, setReps] = useState([]);
  const [filters, setFilters] = useState({ actorId: '', entityType: '', date: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([client.get('/audit-log'), client.get('/reps')])
      .then(([auditResponse, repsResponse]) => { setEntries(auditResponse.data.entries); setReps(repsResponse.data.reps); })
      .catch(() => setError('Failed to load audit log'));
  }, []);

  const filtered = useMemo(() => entries.filter((entry) => {
    const date = entryDate(entry);
    return (!filters.actorId || entry.actorId === filters.actorId)
      && (!filters.entityType || entry.entityType === filters.entityType)
      && (!filters.date || date?.toISOString().slice(0, 10) === filters.date);
  }), [entries, filters]);

  return <><div className="page-heading"><span className="eyebrow">ACCOUNTABILITY</span><h1>Audit log</h1><p className="muted">The latest 500 manager changes to representatives, products, and outlets.</p></div>{error && <div className="error-banner">{error}</div>}<Card><div className="grid-2"><div className="field"><label>Actor</label><select value={filters.actorId} onChange={(event) => setFilters({ ...filters, actorId: event.target.value })}><option value="">All managers</option>{reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></div><div className="field"><label>Entity</label><select value={filters.entityType} onChange={(event) => setFilters({ ...filters, entityType: event.target.value })}><option value="">All entities</option><option value="rep">Representatives</option><option value="product">Products</option><option value="outlet">Outlets</option></select></div><div className="field"><label>Date</label><input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></div></div></Card><Card title={`${filtered.length} matching entries`}>{filtered.length ? <div className="table-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Changed</th></tr></thead><tbody>{filtered.map((entry) => { const date = entryDate(entry); return <tr key={entry.id}><td>{date ? date.toLocaleString() : 'Pending timestamp'}</td><td>{reps.find((rep) => rep.id === entry.actorId)?.name || entry.actorId}</td><td>{entry.action.replace('_', ' ')}</td><td>{entry.entityType}: {entry.entityName}</td><td>{entry.changedFields?.join(', ') || '—'}</td></tr>; })}</tbody></table></div> : <EmptyState title="No matching audit entries" message="Changes to representatives, products, and outlets will appear here." />}</Card></>;
}
