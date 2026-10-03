// List view for /hunt: planned spots, the top 5 most-requested open spots
// expanded, everything else as tap-to-open rows grouped by area.
import { esc, fmt, state, statusText, directionsUrl, byMentions, hasPin, plural, icon } from './util.js';

export const TOP_N = 5;

function noteEditor(r) {
  return `<div class="note-edit">
    <label class="lbl" for="n-${esc(r.id)}">Your note</label>
    <textarea id="n-${esc(r.id)}" rows="3" maxlength="2000">${esc(r.my_note || '')}</textarea>
    <div class="acts">
      <button type="button" class="btn btn--go" data-act="savenote">Save note</button>
      <button type="button" class="btn btn--quiet" data-act="cancelnote">Cancel</button>
    </div>
  </div>`;
}

function actions(r) {
  const st = state(r);
  const visited = st === 'visited';
  const dateInput = visited
    ? `<label class="date"><span>Visited on</span><input type="date" data-act="vdate" value="${esc(r.visited_on || '')}"></label>`
    : `<label class="date"><span>Plan for</span><input type="date" data-act="plan" value="${esc(r.planned_for || '')}"></label>`;
  return `<div class="acts">
    ${visited
      ? `<button type="button" class="btn btn--quiet" data-act="unvisit">${icon('undo')}Move back to list</button>`
      : `<button type="button" class="btn btn--go" data-act="visit">${icon('check')}Visited today</button>`}
    ${dateInput}
    ${r.planned_for && !visited ? `<button type="button" class="btn btn--quiet" data-act="unplan">${icon('x')}Clear date</button>` : ''}
    <button type="button" class="btn btn--quiet" data-act="note">${icon('pen')}${r.my_note ? 'Edit note' : 'Add note'}</button>
    ${hasPin(r) ? `<button type="button" class="btn btn--quiet" data-act="locate">${icon('pin')}On map</button>` : ''}
  </div>`;
}

export function spotCard(r, { editing }) {
  const st = state(r);
  const where = r.addr || r.where_text;
  const by = r.suggested_by || [];
  return `<article class="spot" id="spot-${esc(r.id)}" data-id="${esc(r.id)}">
    <header class="spot-head">
      <h3 class="spot-name">${esc(r.name)}</h3>
      <p class="spot-count"><b>${r.mentions || 0}</b><span>${r.mentions === 1 ? 'mention' : 'mentions'}</span></p>
    </header>
    <p class="spot-where">${where ? `${esc(where)} · ` : ''}<a href="${directionsUrl(r)}" target="_blank" rel="noopener">Directions</a></p>
    <p class="pills"><span class="pill pill--${st}">${esc(statusText(r))}</span>${r.kind ? `<span class="pill">${esc(r.kind)}</span>` : ''}${r.hours ? `<span class="pill">${esc(r.hours)}</span>` : ''}</p>
    ${r.food ? `<p class="spot-order"><b>Order</b> ${esc(r.food)}</p>` : ''}
    ${r.notes ? `<p class="spot-notes">${esc(r.notes)}</p>` : ''}
    ${r.my_note && !editing ? `<p class="spot-mynote"><b>Your note</b> ${esc(r.my_note)}</p>` : ''}
    ${editing ? noteEditor(r) : ''}
    ${by.length ? `<p class="spot-by">Suggested by ${esc(by.join(', '))}${r.first_seen ? ` · first ${fmt(r.first_seen)}` : ''}</p>` : ''}
    ${actions(r)}
  </article>`;
}

function rowItem(r, ui) {
  const st = state(r);
  return `<details class="row" data-id="${esc(r.id)}"${ui.open.has(r.id) ? ' open' : ''}>
    <summary>
      <span class="row-name">${esc(r.name)}</span>
      <span class="row-where">${esc(r.where_text || r.area || '')}</span>
      ${st === 'todo' ? '' : `<span class="pill pill--${st}">${esc(statusText(r))}</span>`}
      <span class="row-count" aria-label="${plural(r.mentions || 0, 'mention', 'mentions')}">${r.mentions || 0}</span>
      ${icon('chevron', 'ico row-chev')}
    </summary>
    ${spotCard(r, { editing: ui.editing === r.id })}
  </details>`;
}

const section = (title, count, body, cls = '') =>
  `<section class="group ${cls}"><h2 class="group-head">${esc(title)} <span class="num">${count}</span></h2>${body}</section>`;

/** @returns {string} HTML for the whole list */
export function renderList(all, rows, ui) {
  if (!all.length) return `<p class="empty">No suggestions yet. New ones arrive with the Monday TikTok sweep.</p>`;
  if (!rows.length) return `<p class="empty">Nothing matches. Try another filter or clear the search.</p>`;

  const card = (r) => spotCard(r, { editing: ui.editing === r.id });
  if (ui.q) return section(`Matches for “${ui.q}”`, rows.length, [...rows].sort(byMentions).map(card).join(''), 'group--top');

  const planned = rows.filter((r) => state(r) === 'planned').sort((a, b) => a.planned_for.localeCompare(b.planned_for));
  const top = rows.filter((r) => state(r) === 'todo').sort(byMentions).slice(0, TOP_N);
  const shown = new Set([...planned, ...top].map((r) => r.id));
  const rest = rows.filter((r) => !shown.has(r.id));

  let html = '';
  if (planned.length) html += section('Planned', planned.length, planned.map(card).join(''), 'group--top');
  if (top.length) html += section('Most requested', top.length, top.map(card).join(''), 'group--top');
  if (rest.length) {
    const groups = new Map();
    rest.forEach((r) => {
      const a = r.area || 'Location unknown';
      groups.set(a, [...(groups.get(a) || []), r]);
    });
    const weight = (list) => list.reduce((s, r) => s + (r.mentions || 0), 0);
    const ordered = [...groups.entries()].sort((a, b) => weight(b[1]) - weight(a[1]));
    html += `<h2 class="rest-head">Everything else <span class="num">${rest.length}</span></h2>`;
    html += ordered
      .map(([area, list]) => section(area, list.length, `<div class="rows">${[...list].sort(byMentions).map((r) => rowItem(r, ui)).join('')}</div>`))
      .join('');
  }
  return html;
}
