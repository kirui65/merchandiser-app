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
  // Do not use `noopener` here: some browsers return a null/unusable window for
  // a blank popup with that flag, which prevents the print dialog from opening.
  const report = window.open('', '_blank');
  if (!report) {
    window.alert('Your browser blocked the report window. Allow popups for this dashboard, then try again.');
    return false;
  }
  report.opener = null;
  report.onload = () => { report.focus(); report.print(); };
  report.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Manrope,Arial,sans-serif;padding:32px;color:#17332c}h1{font-size:24px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #d9e9e4;text-align:left;font-size:12px}th{background:#e9f7f1} @media print{body{padding:0}}</style></head><body><h1>${escapeHtml(title)}</h1><p>Generated ${escapeHtml(formatDateTime(new Date()))}</p><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
  report.document.close();
  return true;
}
import { formatDateTime } from './formatters';
