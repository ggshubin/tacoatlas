// Shared helpers for /hunt. Rows use the database's snake_case shape.

export const $ = (id) => document.getElementById(id);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape anything that came from the database before it touches innerHTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());

/** "Oct 3" from "2026-10-03", read at local noon so time zones never shift the day. */
export const fmt = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

/** Planned is derived, never stored: a date is set and the spot isn't visited. */
export const state = (r) => (r.status === 'visited' ? 'visited' : r.planned_for ? 'planned' : r.status);

export const LABEL = { todo: 'To visit', planned: 'Planned', visited: 'Visited', 'needs-info': 'Need info' };

export const hasPin = (r) => Number.isFinite(r.lat) && Number.isFinite(r.lng);
export const isApprox = (r) => !!r.geo_precision && r.geo_precision !== 'address';

export const APPROX_WHY = {
  'cross-streets': 'placed at the cross streets',
  'name-search': 'found by name search',
  nearby: 'same lot as a neighbor',
};

export const directionsUrl = (r) =>
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(r.addr || [r.name, r.where_text, 'Portland OR'].filter(Boolean).join(' '));

export const byMentions = (a, b) => (b.mentions || 0) - (a.mentions || 0) || a.name.localeCompare(b.name);

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Status pill text, with the date that belongs to the state. */
export function statusText(r) {
  const st = state(r);
  if (st === 'planned') return `${LABEL.planned} · ${fmt(r.planned_for)}`;
  if (st === 'visited' && r.visited_on) return `${LABEL.visited} · ${fmt(r.visited_on)}`;
  return LABEL[st];
}

const ICONS = {
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  route: '<path d="M7 17L17 7M9 7h8v8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
};
/** Inline stroke icon, one weight across the page. */
export const icon = (name, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
