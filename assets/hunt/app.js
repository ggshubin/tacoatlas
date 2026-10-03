// /hunt controller: state, filtering, saving, and wiring the views together.
import { $, esc, today, fmt, state, hasPin, plural } from './util.js';
import { loadConfig, createClient } from './data.js';
import { createMap } from './map.js';
import { renderList } from './list.js';
import { renderCalendar } from './calendar.js';

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode: fine */ } },
};

let S = {
  rows: [],
  loaded: false,
  filter: 'open',
  area: '',
  q: '',
  view: store.get('hunt-view') === 'cal' ? 'cal' : 'list',
  month: today().slice(0, 7),
  open: new Set(),
  editing: null,
};
let client = null;
let map = null;

const set = (patch) => { S = { ...S, ...patch }; render(); };

/* ── status line ─────────────────────────────────────────── */
let baseStatus = 'Loading spots…';
let flashTimer;
function announce(msg, tone = '') {
  const el = $('status');
  clearTimeout(flashTimer);
  el.textContent = msg;
  el.dataset.tone = tone;
  if (tone !== 'error') flashTimer = setTimeout(() => { el.textContent = baseStatus; el.dataset.tone = ''; }, 2600);
}

/* ── filtering ───────────────────────────────────────────── */
const searchable = (r) =>
  [r.name, r.where_text, r.addr, r.food, r.notes, r.hours, (r.suggested_by || []).join(' '), r.my_note].join(' ').toLowerCase();

function inScope(r) {
  if (S.area && (r.area || 'Location unknown') !== S.area) return false;
  return !S.q || searchable(r).includes(S.q.toLowerCase());
}
function statusOk(r, filter) {
  const st = state(r);
  if (filter === 'all') return true;
  if (filter === 'open') return st === 'todo' || st === 'planned';
  return st === filter;
}
// "To visit" keeps visited pins on the map so you see both at once; the list stays open-only.
const mapRows = () => S.rows.filter((r) => inScope(r) && (statusOk(r, S.filter) || (S.filter === 'open' && state(r) === 'visited')));
const listRows = () => S.rows.filter((r) => inScope(r) && statusOk(r, S.filter));

/* ── rendering ───────────────────────────────────────────── */
function renderCounts() {
  const c = { open: 0, planned: 0, visited: 0, 'needs-info': 0, all: S.rows.length };
  S.rows.forEach((r) => {
    const st = state(r);
    if (st === 'todo' || st === 'planned') c.open += 1;
    if (st in c) c[st] += 1;
  });
  document.querySelectorAll('#filters [data-f]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.f === S.filter));
    b.querySelector('.n').textContent = S.loaded ? c[b.dataset.f] : '–';
  });
}

function renderAreas() {
  const areas = [...new Set(S.rows.map((r) => r.area || 'Location unknown'))].sort();
  $('area').innerHTML = `<option value="">All areas</option>${areas
    .map((a) => `<option${a === S.area ? ' selected' : ''}>${esc(a)}</option>`).join('')}`;
}

function renderOffMap() {
  const off = listRows().filter((r) => !hasPin(r));
  $('offmap').innerHTML = off.length
    ? `${plural(off.length, 'spot isn’t', 'spots aren’t')} on the map yet, no usable location. <button type="button" class="link" id="showOff">Show ${off.length === 1 ? 'it' : 'them'}</button>`
    : '';
}

function render() {
  renderCounts();
  document.body.dataset.view = S.view;
  document.querySelectorAll('#views [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
  if (!S.loaded) return;
  if (S.view === 'cal') {
    $('cal').innerHTML = renderCalendar(S.rows, S.month);
    return;
  }
  map?.render(mapRows());
  renderOffMap();
  $('list').innerHTML = renderList(S.rows, listRows(), S);
}

/* ── saving ──────────────────────────────────────────────── */
async function save(id, patch, done = 'Saved.') {
  const before = S.rows;
  set({ rows: S.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  try {
    await client.updateSpot(id, patch);
    announce(done, 'ok');
  } catch (e) {
    set({ rows: before });
    announce(`Couldn’t save that. ${e.message}`, 'error');
  }
}

function reveal(id) {
  const r = S.rows.find((x) => x.id === id);
  if (!r) return;
  const visibleNow = listRows().some((x) => x.id === id);
  set({ view: 'list', open: new Set([...S.open, id]), ...(visibleNow ? {} : { filter: 'all', q: '', area: '' }) });
  if (!visibleNow) $('q').value = '';
  requestAnimationFrame(() => {
    const el = document.getElementById(`spot-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  });
}

function act(id, action, input) {
  const r = S.rows.find((x) => x.id === id);
  if (!r) return;
  switch (action) {
    case 'visit': return save(id, { status: 'visited', visited_on: today(), planned_for: null }, `${r.name} marked visited.`);
    case 'unvisit': return save(id, { status: 'todo', visited_on: null }, `${r.name} is back on the list.`);
    case 'unplan': return save(id, { planned_for: null }, 'Date cleared.');
    case 'plan': return save(id, { planned_for: input.value || null }, input.value ? `Planned for ${fmt(input.value)}.` : 'Date cleared.');
    case 'vdate': return save(id, { visited_on: input.value || null });
    case 'note': return set({ editing: id, open: new Set([...S.open, id]) });
    case 'cancelnote': return set({ editing: null });
    case 'savenote': {
      const text = document.getElementById(`n-${id}`)?.value.trim() || null;
      S = { ...S, editing: null };
      return save(id, { my_note: text }, 'Note saved.');
    }
    case 'locate':
      $('mapwrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return map?.focus(r);
    case 'show': return reveal(id);
    default: return undefined;
  }
}

/* ── events ──────────────────────────────────────────────── */
function wire() {
  // The desktop map and scroll targets sit under the sticky toolbar; track its real height.
  new ResizeObserver(([e]) =>
    document.documentElement.style.setProperty('--tb-h', `${Math.round(e.target.getBoundingClientRect().height)}px`),
  ).observe($('toolbar'));

  $('filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (b) set({ filter: b.dataset.f });
  });
  $('views').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    store.set('hunt-view', b.dataset.view);
    set({ view: b.dataset.view });
    if (b.dataset.view === 'list') requestAnimationFrame(() => map?.resize());
  });
  $('area').addEventListener('change', (e) => set({ area: e.target.value }));
  let qt;
  $('q').addEventListener('input', (e) => {
    clearTimeout(qt);
    qt = setTimeout(() => set({ q: e.target.value.trim() }), 160);
  });

  const list = $('list');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    act(b.closest('[data-id]').dataset.id, b.dataset.act, b);
  });
  list.addEventListener('change', (e) => {
    const i = e.target;
    if (i.dataset?.act) act(i.closest('[data-id]').dataset.id, i.dataset.act, i);
  });
  list.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.classList?.contains('row')) return;
    const open = new Set(S.open);
    if (d.open) open.add(d.dataset.id); else open.delete(d.dataset.id);
    S = { ...S, open };
  }, true);

  $('offmap').addEventListener('click', (e) => {
    if (e.target.id !== 'showOff') return;
    $('q').value = '';
    set({ filter: 'needs-info', q: '' });
    $('list').scrollIntoView({ behavior: 'smooth' });
  });

  $('cal').addEventListener('click', (e) => {
    const nav = e.target.closest('[data-cal]');
    if (nav) {
      const n = Number(nav.dataset.cal);
      const [y, m] = S.month.split('-').map(Number);
      const d = n === 0 ? new Date() : new Date(y, m - 1 + n, 1);
      return set({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
    }
    const ev = e.target.closest('[data-goto]');
    if (ev) reveal(ev.dataset.goto);
    return undefined;
  });

  $('theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    store.set('hunt-theme', next);
    map?.setTheme(next);
  });
}

/* ── boot ────────────────────────────────────────────────── */
function showMapProblem(msg) {
  $('map').innerHTML = `<div class="map-problem"><p>${esc(msg)}</p></div>`;
}

async function boot() {
  wire();
  render();
  try {
    const config = await loadConfig();
    client = createClient(config);
    if (!config.mapboxToken) {
      showMapProblem('Map token missing. Add MAPBOX_PUBLIC_TOKEN to the environment and reload.');
    } else {
      try {
        map = createMap({
          container: $('map'),
          token: config.mapboxToken,
          theme: document.documentElement.dataset.theme,
          onAction: act,
          onError: showMapProblem,
        });
      } catch (e) {
        showMapProblem(e.message);
      }
    }
    const [rows, sweep] = await Promise.all([client.listSpots(), client.lastSweep().catch(() => null)]);
    baseStatus = `${plural(rows.length, 'spot', 'spots')} from DMs and comments${sweep ? `. Last sweep ${fmt(sweep.slice(0, 10))}.` : '.'}`;
    $('status').textContent = baseStatus;
    S = { ...S, rows, loaded: true };
    renderAreas();
    render();
  } catch (e) {
    $('status').textContent = '';
    $('list').innerHTML = `<div class="empty empty--error"><p>The list didn’t load. ${esc(e.message)}</p><button type="button" class="btn btn--go" onclick="location.reload()">Try again</button></div>`;
  }
}

boot();
