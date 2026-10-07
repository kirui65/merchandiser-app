const currency = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
const date = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' });
const time = new Intl.DateTimeFormat('en-KE', { timeStyle: 'short' });

export function formatKes(amount) { return currency.format(Number(amount) || 0); }

function asDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat('en-KE', options).format(Number(value) || 0);
}

export function formatDateTime(isoOrMs) { const value = asDate(isoOrMs); return value ? dateTime.format(value) : '—'; }

export function formatDate(isoOrMs) { const value = asDate(isoOrMs); return value ? date.format(value) : '—'; }

export function formatTime(isoOrMs) { const value = asDate(isoOrMs); return value ? time.format(value) : '—'; }

export function formatWeekday(isoOrMs) {
  const value = asDate(isoOrMs);
  return value ? new Intl.DateTimeFormat('en-KE', { weekday: 'short' }).format(value) : '—';
}
