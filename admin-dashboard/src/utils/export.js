function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function exportPdf(title, headers, rows, options = {}) {
  // Do not use `noopener` here: some browsers return a null/unusable window for
  // a blank popup with that flag, which prevents the print dialog from opening.
  const report = window.open('', '_blank');
  if (!report) {
    window.alert('Your browser blocked the report window. Allow popups for this dashboard, then try again.');
    return false;
  }
  report.opener = null;
  report.onload = async () => {
    try { await Promise.all([...report.document.images].map((image) => image.decode().catch(() => {}))); } catch {}
    report.focus();
    report.print();
  };
  const logoUrl = new URL('/brandsphere-wordmark.png', window.location.origin).href;
  const subtitle = options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : '';
  report.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 portrait;margin:18mm 15mm 20mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);color:#718096;font:9px Arial,sans-serif}}
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;padding:0;color:#1d2c43;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-header{display:flex;align-items:center;gap:20px;padding:0 0 16px;border-bottom:2px solid #315f8c}.report-logo{display:block;width:190px;height:auto;max-height:65px;object-fit:contain}.company-copy{margin-left:auto;color:#64748b;font-size:10px;letter-spacing:.13em;text-align:right;text-transform:uppercase}.company-copy strong{display:block;margin-bottom:4px;color:#1e3a5f;font-size:12px;letter-spacing:.04em}
    h1{margin:22px 0 5px;color:#172b45;font-size:23px;line-height:1.25}.generated,.subtitle{margin:0 0 7px;color:#68788e;font-size:11px}.subtitle{margin-bottom:17px}
    table{width:100%;border-collapse:collapse;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{padding:8px 9px;border-bottom:1px solid #dfe7ef;text-align:left;vertical-align:top;font-size:10px;overflow-wrap:anywhere}th{color:#294867;background:#e9f0f7;font-size:9px;letter-spacing:.05em;text-transform:uppercase}tbody tr:nth-child(even){background:#f7f9fc}.report-footer{margin-top:20px;padding-top:8px;border-top:1px solid #dfe7ef;color:#7b8799;font-size:9px}
    @media print{body{padding:0}.report-header{break-inside:avoid}.report-footer{position:fixed;bottom:-12mm;left:0;right:0}}
  </style></head><body><header class="report-header"><img class="report-logo" src="${escapeHtml(logoUrl)}" alt="Brandsphere Marketing Agency"><div class="company-copy"><strong>Brandsphere Marketing Agency</strong>Company report</div></header><main><h1>${escapeHtml(title)}</h1><p class="generated">Generated ${escapeHtml(formatDateTime(new Date()))}</p>${subtitle}<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></main><footer class="report-footer">Brandsphere Marketing Agency · Confidential management report</footer></body></html>`);
  report.document.close();
  return true;
}

export const printReport = exportPdf;
import { formatDateTime } from './formatters';
