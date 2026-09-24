function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function printReport(title, headers, rows) {
  const report = window.open('', '_blank', 'noopener,noreferrer');
  if (!report) return;
  report.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Manrope,Arial,sans-serif;padding:32px;color:#17332c}h1{font-size:24px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #d9e9e4;text-align:left;font-size:12px}th{background:#e9f7f1} @media print{body{padding:0}}</style></head><body><h1>${escapeHtml(title)}</h1><p>Generated ${escapeHtml(formatDateTime(new Date()))}</p><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.print()</script></body></html>`);
  report.document.close();
}
import { formatDateTime } from './formatters';
