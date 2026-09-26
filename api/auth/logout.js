// Đăng xuất: xoá cookie phiên. Bản lưu trên mây vẫn giữ, đăng nhập lại là thấy.
import { json, clearCookie } from '../_lib/core.js';

export function POST(req) {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(req, 'cs_sess') });
}
