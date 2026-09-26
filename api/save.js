// Bản lưu trên mây của người chơi đã đăng nhập Discord.
// GET → { data, at } (data = null nếu chưa có). PUT { data } → { at }. Chưa đăng nhập → 401.
import { json, readSession, store, storeReady, saveKey, validSave } from './_lib/core.js';

function guard(req) {
  const u = readSession(req);
  if (!u) return { res: json({ error: 'Chưa đăng nhập' }, 401) };
  if (!storeReady()) return { res: json({ error: 'Máy chủ chưa gắn kho lưu' }, 503) };
  return { u };
}

export async function GET(req) {
  const { u, res } = guard(req);
  if (res) return res;
  try {
    const rec = await store.get(saveKey(u.id));
    return json(rec || { data: null, at: 0 });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

export async function PUT(req) {
  const { u, res } = guard(req);
  if (res) return res;
  const text = await req.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { /* bỏ qua, báo lỗi bên dưới */ }
  if (!body || !validSave(body.data, text.length)) return json({ error: 'Bản lưu không hợp lệ' }, 400);
  const rec = { data: body.data, at: Date.now() };
  try {
    await store.set(saveKey(u.id), rec);
    return json({ at: rec.at });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
