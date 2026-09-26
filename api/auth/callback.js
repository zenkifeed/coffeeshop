// Bước 2: Discord chuyển về đây kèm mã. Kiểm tra state, đổi mã lấy thông tin người chơi, đặt cookie phiên
// rồi quay về game. Lỗi gì cũng quay về game kèm ?login=fail để game báo, không để người chơi kẹt ở trang trắng.
import { readCookies, redirect, redirectUri, sessionCookie, clearCookie, discordUser } from '../_lib/core.js';

export async function GET(req) {
  const url = new URL(req.url), code = url.searchParams.get('code'), state = url.searchParams.get('state');
  const back = reason => redirect('/?login=' + reason, [clearCookie(req, 'cs_state')]);
  if (url.searchParams.get('error')) return back('cancel');
  if (!code || !state || state !== readCookies(req).cs_state) return back('fail');
  try {
    const user = await discordUser(code, redirectUri(req));
    return redirect('/?login=ok', [clearCookie(req, 'cs_state'), sessionCookie(req, user)]);
  } catch (e) {
    console.error('Đăng nhập Discord lỗi:', e.message);
    return back('fail');
  }
}
