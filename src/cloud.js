// Lưu tiến trình lên mây qua tài khoản Discord. Offline-first: mọi lời gọi có hạn thời gian và bắt lỗi,
// hỏng gì cũng trả null để game chạy tiếp bằng bản lưu trong trình duyệt, không bao giờ treo vì mạng.
const TIMEOUT = 6000;

async function call(path, opts = {}) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(path, { credentials: 'same-origin', ...opts, signal: ctl && ctl.signal });
    const body = await r.json().catch(() => ({}));
    return r.ok ? body : { error: r.status, message: body.error };
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const Cloud = {
  user: null,        // { id, name, avatar } khi đã đăng nhập
  online: false,     // gọi được máy chủ không (phân biệt "chưa đăng nhập" với "mất mạng")
  lastAt: 0,         // lúc bản trên mây được ghi gần nhất (giờ máy chủ)
  lastJson: '',      // nội dung đã đẩy lần trước, trùng thì khỏi đẩy lại
  synced: false,     // đã so bản trên máy với bản trên mây xong: chưa xong thì chưa tự đẩy
  busy: false,

  async me() {
    const r = await call('/api/me');
    this.online = !!r && !r.error;
    this.user = r && r.user ? r.user : null;
    return this.user;
  },
  login() { location.href = '/api/auth/login'; },
  async logout() {
    await call('/api/auth/logout', { method: 'POST' });
    Object.assign(this, { user: null, lastAt: 0, lastJson: '', synced: false });
  },
  // { data, at } (data null nếu chưa có bản nào), hoặc null nếu không gọi được.
  async pull() {
    if (!this.user) return null;
    const r = await call('/api/save');
    return r && !r.error ? r : null;
  },
  // force: đẩy kể cả khi chưa so bản xong (người chơi chọn giữ bản trên máy). Trả true nếu đã lưu.
  async push(S, force = false) {
    if (!this.user || this.busy || (!this.synced && !force)) return false;
    const js = JSON.stringify({ data: S });
    if (js === this.lastJson) return true;
    this.busy = true;
    const r = await call('/api/save', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: js, keepalive: js.length < 60000 });
    this.busy = false;
    if (r && r.at) { this.lastAt = r.at; this.lastJson = js; return true; }
    return false;
  },
};

// Hai bản có cùng tiến trình không (bỏ qua mốc thời gian lưu).
export function sameProgress(a, b) {
  const strip = d => JSON.stringify({ ...d, at: 0 });
  return !!a && !!b && strip(a) === strip(b);
}
// Bản trên máy còn trắng (chưa bán ly nào, chưa nhận thưởng): lấy bản trên mây không cần hỏi.
export const isFresh = S => S.shop === 0 && !S.life.served && !Object.keys(S.claimed).length;

// Bước tiếp theo lúc vào game, theo lựa chọn đã nhớ trên máy này (choice: null | 'guest' | 'discord').
// login: tham số ?login= khi vừa từ Discord quay về; tried: tab này đã tự chuyển sang Discord một lần chưa.
// Trả về 'continue' (vào game), 'popup' (hỏi chọn cách chơi), 'redirect' (tự đăng nhập lại Discord), 'offline'.
export function authStep(choice, { online, user, login, tried }) {
  if (user || choice === 'guest') return 'continue';
  if (choice !== 'discord') return 'popup';
  if (!online) return 'offline';
  if (login === 'fail' || login === 'cancel' || tried) return 'popup';
  return 'redirect';
}
