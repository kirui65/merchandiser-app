import React from 'react';

export default function RepTable({ byRep }) {
  const rows = Object.entries(byRep || {});

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16 }}>
      <h3>Totals by rep</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Rep ID</th>
            <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 8 }}>Total (KES)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([repId, total]) => (
            <tr key={repId}>
              <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{repId}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
