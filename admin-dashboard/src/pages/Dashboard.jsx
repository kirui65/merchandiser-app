import React, { useEffect, useState } from 'react';
import client from '../api/client';
import ChartCard from '../components/ChartCard';
import RepTable from '../components/RepTable';
import Card from '../components/Card';

export default function Dashboard() {
  const [totals, setTotals] = useState(null); const [error, setError] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { client.get('/dashboard/totals').then(({ data }) => setTotals(data)).catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load totals')).finally(() => setLoading(false)); }, []);
  if (loading) return <><div className="page-heading"><span className="eyebrow">COMMAND CENTER</span><h1>Sales overview</h1></div><Card><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></Card></>;
  if (error) return <div className="error-banner">{error}</div>; if (!totals) return null;
  return <><div className="page-heading"><span className="eyebrow">COMMAND CENTER</span><h1>Sales overview</h1><p className="muted">A clear view of field performance and daily momentum.</p></div><div className="stat-grid"><Card><span className="muted">Grand total</span><div className="stat-value">KES {totals.grandTotal.toLocaleString()}</div></Card><Card><span className="muted">Transactions</span><div className="stat-value">{totals.count}</div></Card><Card><span className="muted">Active reps</span><div className="stat-value">{Object.keys(totals.byRep || {}).length}</div></Card></div><div className="grid-2"><ChartCard title="Sales by day" data={totals.byDay} /><RepTable byRep={totals.byRep} /></div></>;
}
