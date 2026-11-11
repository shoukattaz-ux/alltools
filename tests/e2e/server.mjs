// Minimal static server for dist/ that mimics Cloudflare Pages: directory indexes, trailing-slash redirects,
// 404.html with a real 404 status, and the response headers from public/_headers (so the real CSP is enforced in tests).
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : join(root, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.map': 'application/json' };

function globalHeaders() {
  const text = readFileSync(join(dist, '_headers'), 'utf8');
  const block = text.split(/\n(?=\S)/).find((b) => b.startsWith('/*')) ?? '';
  const out = {};
  for (const line of block.split('\n').slice(1)) { const m = /^\s+([\w-]+):\s*(.+)$/.exec(line); if (m) out[m[1]] = m[2]; }
  return out;
}

export function startServer(port = 0) {
  const hdr = globalHeaders();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let path = decodeURIComponent(url.pathname);
    if (path.includes('..')) { res.writeHead(400); return res.end(); }
    let file = join(dist, path);
    const isDir = existsSync(file) && statSync(file).isDirectory();
    if (isDir && !path.endsWith('/')) { res.writeHead(301, { Location: path + '/' + url.search }); return res.end(); }
    if (isDir) file = join(file, 'index.html');
    let status = 200;
    if (!existsSync(file)) { file = join(dist, '404.html'); status = 404; }
    const headers = { ...hdr, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
    delete headers['Strict-Transport-Security'];
    res.writeHead(status, headers);
    res.end(readFileSync(file));
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r({ server, port: server.address().port })));
}
