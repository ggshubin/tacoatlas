// Mapbox map for /hunt. Pins are HTML markers in the landing page's teardrop
// shape: salsa = to visit (number = mentions), amber = planned, cilantro
// check = visited, dashed = approximate location.
import { buildStyle, PALETTES } from './map-style.js';
import { esc, state, statusText, hasPin, isApprox, APPROX_WHY, directionsUrl, plural, icon } from './util.js';

const PORTLAND = [-122.6, 45.5];
const REGION = [[-123.4, 45.05], [-121.8, 45.95]];
// Teardrop = square rotated 45°, so its tip hangs (√2 − 1) / 2 of its size below the box.
const TIP = (Math.SQRT2 - 1) / 2;

function pinSize(r) {
  return state(r) === 'visited' ? 22 : Math.min(34, 24 + Math.max(0, (r.mentions || 0) - 1) * 2);
}

function pinElement(r) {
  const st = state(r);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `pin pin--${st === 'needs-info' ? 'todo' : st}${isApprox(r) ? ' pin--approx' : ''}`;
  el.style.setProperty('--s', `${pinSize(r)}px`);
  el.setAttribute('aria-label', `${r.name}, ${statusText(r)}, ${plural(r.mentions || 0, 'mention', 'mentions')}`);
  const inner = st === 'visited' ? icon('check', 'pin-ico') : `<span class="pin-n">${r.mentions || ''}</span>`;
  el.innerHTML = `<span class="pin-drop">${inner}</span>`;
  return el;
}

function popupHtml(r) {
  const st = state(r);
  const why = isApprox(r) ? `<p class="pop-note">${icon('pin')} Approximate pin, ${esc(APPROX_WHY[r.geo_precision] || 'location is rough')}.</p>` : '';
  return `<div class="pop">
    <p class="pop-meta"><span class="pill pill--${st}">${esc(statusText(r))}</span><span class="pop-count">${plural(r.mentions || 0, 'mention', 'mentions')}</span></p>
    <h3 class="pop-name">${esc(r.name)}</h3>
    <p class="pop-where">${esc(r.addr || r.where_text || '')}</p>
    ${r.food ? `<p class="pop-line"><b>Order</b> ${esc(r.food)}</p>` : ''}
    ${r.hours ? `<p class="pop-line"><b>Hours</b> ${esc(r.hours)}</p>` : ''}
    ${why}
    <div class="pop-actions">
      ${st === 'visited'
        ? `<button type="button" class="btn btn--quiet" data-pact="unvisit">${icon('undo')}Move back</button>`
        : `<button type="button" class="btn btn--go" data-pact="visit">${icon('check')}Mark visited</button>`}
      <a class="btn btn--quiet" href="${directionsUrl(r)}" target="_blank" rel="noopener">${icon('route')}Directions</a>
      <button type="button" class="btn btn--quiet" data-pact="show">Details</button>
    </div>
  </div>`;
}

/** Offset spots that share a lot so no pin hides another. */
function spread(rows) {
  const seen = new Map();
  return rows.map((r) => {
    const k = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return { r, lngLat: [r.lng + (n - 1) * 0.0008, r.lat + (n - 1) * 0.0006] };
  });
}

/**
 * @param {{ container: HTMLElement, token: string, theme: 'dark'|'light',
 *           onAction: (id: string, action: string) => void, onError: (msg: string) => void }} opts
 */
export function createMap({ container, token, theme, onAction, onError }) {
  const gl = window.mapboxgl;
  if (!gl) throw new Error('The map library did not load. Check your connection and reload.');
  gl.accessToken = token;

  const map = new gl.Map({
    container,
    style: buildStyle(PALETTES[theme]),
    center: PORTLAND,
    zoom: 10,
    minZoom: 8.5,
    maxZoom: 17.5,
    maxBounds: REGION,
    // Stacked above the list, the map must not swallow page scroll (wheel or one-finger drag).
    // As the sticky side panel on wide screens, it can take gestures directly.
    cooperativeGestures: !matchMedia('(min-width: 1100px)').matches,
    attributionControl: false,
  });
  map.addControl(new gl.AttributionControl({ compact: true }), 'bottom-right');
  map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
  map.on('error', (e) => {
    const status = e?.error?.status;
    if (status === 401 || status === 403) onError('Mapbox refused the token. Check MAPBOX_PUBLIC_TOKEN and its URL restrictions.');
  });

  let markers = [];
  let fitted = false;

  function render(rows) {
    markers.forEach((m) => m.remove());
    // Draw visited first so open spots sit on top.
    const order = { visited: 0, 'needs-info': 1, todo: 2, planned: 3 };
    const placed = spread(rows.filter(hasPin).sort((a, b) => order[state(a)] - order[state(b)]));
    markers = placed.map(({ r, lngLat }) => {
      const size = pinSize(r);
      const popup = new gl.Popup({ offset: size + 6, maxWidth: '300px', focusAfterOpen: true, className: 'hunt-pop' })
        .setHTML(popupHtml(r));
      popup.on('open', () => {
        // Sit the pin low in the frame so the card above it has room and never clips.
        map.easeTo({ center: lngLat, offset: [0, map.getContainer().clientHeight * 0.28], duration: 350 });
        popup.getElement().querySelectorAll('[data-pact]').forEach((b) =>
          b.addEventListener('click', () => { popup.remove(); onAction(r.id, b.dataset.pact); }));
      });
      return new gl.Marker({ element: pinElement(r), anchor: 'bottom', offset: [0, -size * TIP] })
        .setLngLat(lngLat).setPopup(popup).addTo(map);
    });
    if (!fitted && placed.length) {
      const b = new gl.LngLatBounds();
      placed.forEach(({ lngLat }) => b.extend(lngLat));
      map.fitBounds(b, { padding: 48, maxZoom: 13, duration: 0 });
      fitted = true;
    }
  }

  function focus(r) {
    if (!hasPin(r)) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 14), duration: 700 });
  }

  return {
    render,
    focus,
    resize: () => map.resize(),
    setTheme: (t) => map.setStyle(buildStyle(PALETTES[t])),
  };
}
