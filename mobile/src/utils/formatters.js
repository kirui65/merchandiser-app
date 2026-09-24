const currency = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
const date = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' });
const time = new Intl.DateTimeFormat('en-KE', { timeStyle: 'short' });

export function formatKes(amount) { return currency.format(Number(amount) || 0); }

export function formatNumber(value, options) {
  return new Intl.NumberFormat('en-KE', options).format(Number(value) || 0);
}

export function formatDateTime(isoOrMs) { return dateTime.format(new Date(isoOrMs)); }

export function formatDate(isoOrMs) { return date.format(new Date(isoOrMs)); }

export function formatTime(isoOrMs) { return time.format(new Date(isoOrMs)); }

export function formatWeekday(isoOrMs) {
  return new Intl.DateTimeFormat('en-KE', { weekday: 'short' }).format(new Date(isoOrMs));
}
