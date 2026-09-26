// Bước 1: chuyển người chơi sang trang đồng ý của Discord. Mã "state" ngẫu nhiên lưu tạm trong cookie
// để bước 2 kiểm tra đúng là yêu cầu do chính trình duyệt này khởi tạo (chống giả mạo yêu cầu).
import { DISCORD_CLIENT_ID, redirect, redirectUri, cookie, newState } from '../_lib/core.js';

export function GET(req) {
  const state = newState();
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = new URLSearchParams({ client_id: DISCORD_CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(req), scope: 'identify', state, prompt: 'none' });
  return redirect(url.toString(), [cookie(req, 'cs_state', state, 600)]);
}
