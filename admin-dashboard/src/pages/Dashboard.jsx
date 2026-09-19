import React, { useEffect, useState } from 'react';
import client from '../api/client';
import ChartCard from '../components/ChartCard';
import RepTable from '../components/RepTable';

export default function Dashboard() {
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/dashboard/totals')
      .then(({ data }) => setTotals(data))
      .catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load totals'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!totals) return null;

  return (
    <div>
      <h1>Sales Totals</h1>
      <p>
        Grand total: <strong>KES {totals.grandTotal.toLocaleString()}</strong> across {totals.count} sales
      </p>
      <ChartCard title="Sales by day" data={totals.byDay} />
      <RepTable byRep={totals.byRep} />
    </div>
  );
}
