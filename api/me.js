// Ai đang đăng nhập: { user: { id, name, avatar } } hoặc { user: null }.
import { json, readSession } from './_lib/core.js';

export function GET(req) {
  const u = readSession(req);
  return json({ user: u ? { id: u.id, name: u.name, avatar: u.avatar } : null });
}
