// Phần dùng chung cho các hàm máy chủ (Vercel Functions, chữ ký Web Request/Response).
// Thư mục bắt đầu bằng "_" nên Vercel không biến file này thành một đường dẫn API.
// Không dùng thư viện npm: ký phiên bằng HMAC của node:crypto, gọi Discord và Upstash bằng fetch.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1553371421567090819';
const SESSION_DAYS = 30;
export const MAX_SAVE = 100 * 1024;   // bản lưu thật chỉ vài KB; chặn gửi rác cỡ lớn

/* ---------- phản hồi ---------- */
export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
export function redirect(to, cookies = []) {
  const h = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  cookies.forEach(c => h.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers: h });
}

/* ---------- cookie ---------- */
export function readCookies(req) {
  const out = {};
  (req.headers.get('cookie') || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
// Secure chỉ bật khi chạy https (localhost http vẫn lưu được cookie để thử trên máy).
export function cookie(req, name, value, maxAge) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export const originOf = req => new URL(req.url).origin;
export const redirectUri = req => originOf(req) + '/api/auth/callback';

/* ---------- phiên đăng nhập: payload base64url + chữ ký HMAC-SHA256 ---------- */
const b64 = s => Buffer.from(s).toString('base64url');
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Thiếu SESSION_SECRET');
  return s;
}
const sign = body => createHmac('sha256', secret()).update(body).digest('base64url');
export function makeSession(user, now = Date.now()) {
  const body = b64(JSON.stringify({ ...user, exp: now + SESSION_DAYS * 864e5 }));
  return `${body}.${sign(body)}`;
}
export function readSession(req, now = Date.now()) {
  const raw = readCookies(req).cs_sess;
  if (!raw || !raw.includes('.')) return null;
  const [body, sig] = raw.split('.');
  try {
    const a = Buffer.from(sig), b = Buffer.from(sign(body));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const u = JSON.parse(Buffer.from(body, 'base64url').toString());
    return u.exp > now && u.id ? u : null;
  } catch (e) { return null; }
}
export const sessionCookie = (req, user) => cookie(req, 'cs_sess', makeSession(user), SESSION_DAYS * 86400);
export const clearCookie = (req, name) => cookie(req, name, '', 0);
export const newState = () => randomBytes(16).toString('hex');

/* ---------- Discord ---------- */
// Kiểm thử thay deps.fetch bằng bản giả để không gọi Discord thật.
export const deps = { fetch: (...a) => fetch(...a) };
export function avatarUrl(u) {
  if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
}
// Đổi mã từ Discord lấy thông tin người dùng. Chỉ lấy mã, tên và ảnh đại diện (quyền "identify").
export async function discordUser(code, redirect_uri) {
  const fetchFn = deps.fetch;
  const tok = await fetchFn('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET || '', grant_type: 'authorization_code', code, redirect_uri }),
  });
  if (!tok.ok) throw new Error('Discord từ chối mã đăng nhập (' + tok.status + ')');
  const { access_token } = await tok.json();
  const me = await fetchFn('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + access_token } });
  if (!me.ok) throw new Error('Không đọc được thông tin Discord (' + me.status + ')');
  const u = await me.json();
  return { id: u.id, name: u.global_name || u.username, avatar: avatarUrl(u) };
}

/* ---------- kho lưu: Upstash Redis (REST) trên Vercel, file JSON khi chạy thử trên máy ---------- */
// Vercel gắn Upstash qua Marketplace sẽ tự thêm KV_REST_API_URL/KV_REST_API_TOKEN (hoặc UPSTASH_REDIS_REST_*).
const kvUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LOCAL = join(process.cwd(), '.data', 'saves.json');
export const storeReady = () => !!(kvUrl() && kvToken()) || !process.env.VERCEL;
async function localAll() { try { return JSON.parse(await readFile(LOCAL, 'utf8')); } catch (e) { return {}; } }
export const store = {
  async get(key) {
    if (kvUrl()) {
      const r = await fetch(`${kvUrl()}/get/${encodeURIComponent(key)}`, { headers: { Authorization: 'Bearer ' + kvToken() } });
      if (!r.ok) throw new Error('Kho lưu lỗi ' + r.status);
      const { result } = await r.json();
      return result == null ? null : JSON.parse(result);
    }
    return (await localAll())[key] ?? null;
  },
  async set(key, value) {
    if (kvUrl()) {
      const r = await fetch(`${kvUrl()}/set/${encodeURIComponent(key)}`, { method: 'POST', headers: { Authorization: 'Bearer ' + kvToken() }, body: JSON.stringify(value) });
      if (!r.ok) throw new Error('Kho lưu lỗi ' + r.status);
      return;
    }
    const all = await localAll();
    all[key] = value;
    await mkdir(join(process.cwd(), '.data'), { recursive: true });
    await writeFile(LOCAL, JSON.stringify(all));
  },
};
export const saveKey = id => 'save:' + id;
// Bản lưu hợp lệ: đúng khung của game (v2), không quá lớn.
export function validSave(d, size) {
  return !!d && typeof d === 'object' && d.v === 2 && typeof d.st === 'object' && Number.isFinite(d.shop) && Number.isFinite(d.money) && size <= MAX_SAVE;
}
