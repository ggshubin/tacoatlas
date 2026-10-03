// Public runtime config for /hunt. Everything here is already safe to ship to
// a browser (anon key, URL-restricted Mapbox token). It lives in env vars so
// nothing is committed and the local stack can be swapped in for dev.
export default function handler(req, res) {
  try {
    const config = {
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
      mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN || null,
    };
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('hunt-config: SUPABASE_URL or SUPABASE_ANON_KEY is not set');
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Server is missing its database settings.' }));
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    return res.end(JSON.stringify(config));
  } catch (e) {
    console.error('hunt-config failed', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Could not load settings.' }));
  }
}
