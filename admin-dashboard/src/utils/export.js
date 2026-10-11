import { formatDateTime } from './formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}


async function loadCompanyLogo() {
  const response = await fetch('/brandsphere-wordmark.png');
  if (!response.ok) throw new Error('The company logo could not be loaded.');
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 850;
    canvas.height = Math.round(850 * image.height / image.width);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function fileSlug(value) {
  return String(value || 'report').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '-').toLowerCase().slice(0, 70) || 'report';
}

export async function exportPdf(title, headers, rows, options = {}) {
  try {
    const logo = await loadCompanyLogo();
    const wide = headers.length >= 7;
    const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const reportDate = formatDateTime(new Date());
    const subtitleLines = options.subtitle ? doc.splitTextToSize(String(options.subtitle), pageWidth - margin * 2) : [];
    const startY = 51 + Math.max(0, subtitleLines.length - 1) * 4;
    const drawHeader = () => {
      doc.addImage(logo, 'JPEG', margin, 8, 53, 20);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BRANDSPHERE MARKETING AGENCY', pageWidth - margin, 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(102, 119, 143);
      doc.text('MANAGEMENT REPORT', pageWidth - margin, 19, { align: 'right' });
      doc.setDrawColor(67, 105, 177);
      doc.setLineWidth(0.7);
      doc.line(margin, 31, pageWidth - margin, 31);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(25, 43, 69);
      doc.text(String(title || 'Report'), margin, 40, { maxWidth: pageWidth - margin * 2 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(103, 119, 141);
      doc.text(`Generated ${reportDate}`, margin, 45);
      if (subtitleLines.length) doc.text(subtitleLines, margin, 50);
    };
    autoTable(doc, {
      head: [headers.map((cell) => String(cell ?? ''))],
      body: rows.length ? rows.map((row) => row.map((cell) => String(cell ?? ''))) : [['No records to display.']],
      startY,
      margin: { top: startY, right: margin, bottom: 18, left: margin },
      styles: { font: 'helvetica', fontSize: wide ? 7 : 8, cellPadding: 2.5, overflow: 'linebreak', textColor: [48, 67, 94], lineColor: [222, 231, 241], lineWidth: 0.15 },
      headStyles: { fillColor: [232, 239, 249], textColor: [38, 67, 102], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 253] },
      didDrawPage: (data) => {
        drawHeader();
        doc.setDrawColor(222, 231, 241);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(118, 132, 153);
        doc.text('Confidential management report', margin, pageHeight - 8);
        doc.text(`Page ${data.pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      },
    });
    const filename = options.filename || `brandsphere-${fileSlug(title)}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return true;
  } catch (error) {
    window.alert(error?.message || 'Could not create the PDF. Please try again.');
    return false;
  }
}
