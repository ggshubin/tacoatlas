// Data access for /hunt over Supabase's REST endpoint (PostgREST).
// The anon role can read every row and update only the tracking columns;
// the database enforces that, this file just speaks HTTP.

/** Columns the page is allowed to write. Mirrors the column grant in the migration. */
const WRITABLE = new Set(['status', 'visited_on', 'planned_for', 'my_note']);

export async function loadConfig() {
  const res = await fetch('/api/hunt-config', { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Settings failed to load (${res.status}).`);
  return body;
}

export function createClient({ supabaseUrl, supabaseAnonKey }) {
  const base = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };

  async function request(path, init = {}) {
    let res;
    try {
      res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    } catch {
      throw new Error('No connection. Check your signal and try again.');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${res.status}).`);
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    listSpots: () => request('/food_spots?select=*&order=mentions.desc,name.asc'),
    lastSweep: () =>
      request('/food_spots_meta?select=last_sweep_at&id=eq.sweep').then((r) => r?.[0]?.last_sweep_at ?? null),
    /** Patch one spot. Refuses non-tracking columns before the database has to. */
    updateSpot(id, patch) {
      const bad = Object.keys(patch).filter((k) => !WRITABLE.has(k));
      if (bad.length) return Promise.reject(new Error(`Not editable here: ${bad.join(', ')}`));
      return request(`/food_spots?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
    },
  };
}
