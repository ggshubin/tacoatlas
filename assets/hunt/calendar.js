// Month grid of planned (amber) and visited (cilantro) spots.
import { esc, isoDate, today, icon } from './util.js';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** @param {string} month "YYYY-MM" */
export function renderCalendar(rows, month) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7));

  const events = new Map();
  rows.forEach((r) => {
    const [day, kind] = r.status === 'visited' && r.visited_on ? [r.visited_on, 'visited']
      : r.status !== 'visited' && r.planned_for ? [r.planned_for, 'planned'] : [null];
    if (day) events.set(day, [...(events.get(day) || []), { r, kind }]);
  });

  const t = today();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const k = isoDate(d);
    const evs = (events.get(k) || [])
      .map(({ r, kind }) => `<button type="button" class="ev ev--${kind}" data-goto="${esc(r.id)}">${esc(r.name)}</button>`)
      .join('');
    return `<div class="day${d.getMonth() !== m - 1 ? ' day--out' : ''}${k === t ? ' day--today' : ''}"><span class="dn">${d.getDate()}</span>${evs}</div>`;
  }).join('');

  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const total = [...events.keys()].filter((k) => k.startsWith(month)).reduce((s, k) => s + events.get(k).length, 0);
  return `<div class="cal-head">
      <h2 class="cal-title">${esc(title)}</h2>
      <div class="cal-nav">
        <button type="button" class="btn btn--quiet btn--icon" data-cal="-1" aria-label="Previous month">${icon('left')}</button>
        <button type="button" class="btn btn--quiet" data-cal="0">Today</button>
        <button type="button" class="btn btn--quiet btn--icon" data-cal="1" aria-label="Next month">${icon('chevron')}</button>
      </div>
    </div>
    <p class="cal-sub">${total ? `${total} this month.` : 'Nothing this month.'} Set a plan date on any spot to put it here.</p>
    <div class="cal-grid" role="grid">${DOW.map((d) => `<div class="dow">${d}</div>`).join('')}${cells}</div>`;
}
