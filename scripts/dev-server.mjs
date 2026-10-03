// Minimal local stand-in for `vercel dev`: serves static files, applies the
// rewrites in vercel.json, and runs api/*.js handlers with .env.local loaded.
//
//   node scripts/dev-server.mjs        → http://localhost:3000
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { rewrites = [] } = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rw = rewrites.find((r) => r.source === path);
    if (rw) path = rw.destination;

    if (path.startsWith('/api/')) {
      const file = join(root, `${path}.js`);
      if (!existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      return await mod.default(req, res);
    }

    const file = normalize(join(root, path === '/' ? '/index.html' : path));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.statusCode = 404; return res.end('Not found');
    }
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(readFileSync(file));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    return res.end('Dev server error');
  }
}).listen(PORT, () => console.log(`tacoatlas-web dev → http://localhost:${PORT}/hunt`));
