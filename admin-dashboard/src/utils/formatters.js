const currency = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatKes(value) {
  return currency.format(Number(value) || 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-KE').format(Number(value) || 0);
}

export function formatDateTime(value) {
  return dateTime.format(new Date(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('en-KE', { timeStyle: 'short' }).format(new Date(value));
}

export function formatWeekday(value) {
  return new Intl.DateTimeFormat('en-KE', { weekday: 'short' }).format(new Date(value));
}
