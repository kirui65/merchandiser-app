import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ChartCard({ title, data }) {
  const chartData = Object.entries(data || {}).map(([key, value]) => ({ label: key, total: value }));

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
