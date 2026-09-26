// Server chạy thử trên máy, không phụ thuộc gì: phục vụ file tĩnh (ES module không chạy được bằng file://)
// và chạy các hàm trong api/ giống Vercel (chữ ký Web: export GET/POST/PUT nhận Request, trả Response).
// Đọc biến môi trường từ .env.local. Không bao giờ phục vụ file ẩn (.env.local, .data, .git) hay mã trong api/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = +process.env.PORT || 5173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

// .env.local: mỗi dòng KEY=giá trị, bỏ dòng trống và dòng #; biến đã có sẵn trong môi trường thì giữ nguyên.
const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
  readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
}

async function api(req, res, path) {
  const file = join(ROOT, path + '.js');
  if (!file.startsWith(join(ROOT, 'api') + sep) || path.split('/').some(p => p.startsWith('_')) || !existsSync(file)) { res.writeHead(404).end('Not found'); return; }
  const mod = await import(pathToFileURL(file).href);
  const fn = mod[req.method];
  if (!fn) { res.writeHead(405).end(); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await fn(request);
  const headers = {};
  out.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
  const cookies = out.headers.getSetCookie ? out.headers.getSetCookie() : [];
  if (cookies.length) headers['Set-Cookie'] = cookies;
  res.writeHead(out.status, headers).end(Buffer.from(await out.arrayBuffer()));
}

http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/\\/g, '/').replace(/^\/+/, '');
  try {
    if (path.startsWith('api/')) return await api(req, res, path.replace(/\/$/, ''));
  } catch (e) {
    console.error(e);
    res.writeHead(500).end('Lỗi máy chủ');
    return;
  }
  const file = join(ROOT, path || 'index.html');
  if (!file.startsWith(ROOT) || path.split('/').some(p => p.startsWith('.'))) { res.writeHead(404).end('Not found'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Quán Cà Phê Nhỏ: http://localhost:${PORT}`));
