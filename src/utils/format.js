export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, withTime = false) {
  const d = toDate(value);
  if (!d) return '-';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(value) {
  const d = toDate(value);
  if (!d) return 'just now';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(d);
}

export const formatINR = (n) =>
  n === null || n === undefined || n === '' ? '-' : `₹${Number(n).toLocaleString('en-IN')}`;

export const formatRange = (min, max) =>
  min === null || min === undefined ? 'Variable' : `${formatINR(min)} – ${formatINR(max)}`;

export const formatStatus = (s) =>
  (s || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const shortId = (id) => (id ? `#${id.slice(0, 6).toUpperCase()}` : '-');

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const sortByDateDesc = (list, field = 'createdAt') =>
  [...list].sort((a, b) => (toDate(b[field])?.getTime() || 0) - (toDate(a[field])?.getTime() || 0));
