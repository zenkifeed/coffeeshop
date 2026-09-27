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

// Dấu mốc "bản trên mây lần cuối do máy này ghi": nhớ mốc at của lần đẩy thành công gần nhất.
// Lúc vào game, mốc trên mây trùng mốc đã nhớ nghĩa là bản mây chỉ là bản cũ của chính máy này
// (bản trên máy luôn mới hơn vài giây chơi) — giữ bản máy, không hỏi. Khác mốc mới là máy khác đã ghi đè.
// Mã máy: sinh một lần cho mỗi trình duyệt, gửi kèm mỗi lần đẩy và máy chủ lưu lại. Tin cậy hơn mốc at:
// cú đẩy cuối lúc đóng trang (keepalive) tới được máy chủ nhưng trang đã đóng, không kịp nhận mốc trả về —
// mã máy thì nằm sẵn trong bản đẩy nên không phụ thuộc hồi đáp.
const DEV_KEY = 'cafe3d_dev';
let devMem = '';
export function devId() {
  if (devMem) return devMem;
  try {
    let v = globalThis.localStorage.getItem(DEV_KEY);
    if (!v) { v = 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); globalThis.localStorage.setItem(DEV_KEY, v); }
    devMem = v;
  } catch (e) { devMem = 'd' + Math.random().toString(36).slice(2, 10); }
  return devMem;
}
const AT_KEY = 'cafe3d_cloudat';
const readAt = () => { try { return +globalThis.localStorage.getItem(AT_KEY) || 0; } catch (e) { return 0; } };
const writeAt = at => { try { globalThis.localStorage.setItem(AT_KEY, String(+at || 0)); } catch (e) { /* máy chặn lưu thì thôi */ } };

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
    // quên dấu mốc và mã máy: tài khoản khác đăng nhập trên máy này không bị nhận nhầm bản lưu
    writeAt(0);
    devMem = '';
    try { globalThis.localStorage.removeItem(DEV_KEY); } catch (e) { /* bỏ qua */ }
    Object.assign(this, { user: null, lastAt: 0, lastJson: '', synced: false });
  },
  // Bản trên mây này do chính máy này ghi lần cuối? (mã máy trong bản ghi, hoặc mốc đẩy đã nhớ)
  own(rec) { return !!rec && ((!!rec.dev && rec.dev === devId()) || this.wrote(rec.at)); },
  // Bản trên mây có mốc at này là do máy này đẩy lần cuối?
  wrote(at) { return !!at && readAt() === +at; },
  // Ghi nhận thủ công (sau khi tải bản trên mây về: bản máy giờ chính là bản mây đó).
  mark(at) { writeAt(at); },
  // { data, at } (data null nếu chưa có bản nào), hoặc null nếu không gọi được.
  async pull() {
    if (!this.user) return null;
    const r = await call('/api/save');
    return r && !r.error ? r : null;
  },
  // force: đẩy kể cả khi chưa so bản xong (người chơi chọn giữ bản trên máy). Trả true nếu đã lưu.
  async push(S, force = false) {
    if (!this.user || this.busy || (!this.synced && !force)) return false;
    const js = JSON.stringify({ data: S, dev: devId() });
    if (js === this.lastJson) return true;
    this.busy = true;
    const r = await call('/api/save', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: js, keepalive: js.length < 60000 });
    this.busy = false;
    if (r && r.at) { this.lastAt = r.at; this.lastJson = js; writeAt(r.at); return true; }
    return false;
  },
};

// Hai bản có cùng tiến trình không: bỏ qua mốc lưu và các trường "trôi" từng giây khi quán đang chạy
// (tiền đang đếm, đồng hồ tăng tốc, cờ hướng dẫn, cờ đã-xem). Chỉ lệch mấy thứ đó thì không phải xung đột;
// khác chi nhánh, cấp trạm, nhiệm vụ, số khách hay kim cương mới đáng hỏi người chơi.
export function sameProgress(a, b) {
  const strip = d => JSON.stringify({ ...d, at: 0, money: 0, earned: 0, boost: 0, ftue: 0, seen: 0, life: d.life ? d.life.served : 0 });
  return !!a && !!b && strip(a) === strip(b);
}
// a có chứa trọn tiến trình của b không (b là bản cũ cùng một dòng chơi)? Chỉ nhìn các đại lượng
// một chiều: chi nhánh, tổng khách cả đời, khách ở quán này, cấp trạm, nâng cấp, nhiệm vụ đã nhận,
// cấp Kho báu. Tiền và kim cương không tính vì có thể tiêu đi. Dùng để tự chọn bản khi hai bản
// cùng một dòng (bản này đi trước bản kia), chỉ còn hỏi người chơi khi hai bản rẽ nhánh thật sự.
export function dominates(a, b) {
  if (!a || !b) return false;
  const la = (a.life && a.life.served) || 0, lb = (b.life && b.life.served) || 0;
  if (la < lb) return false;
  if (a.shop !== b.shop) return a.shop > b.shop;
  if ((a.served || 0) < (b.served || 0)) return false;
  for (const k in b.st || {}) if (((a.st || {})[k] || 0) < b.st[k]) return false;
  for (const k in b.upg || {}) if (b.upg[k] && !(a.upg || {})[k]) return false;
  for (const k in b.claimed || {}) if (b.claimed[k] && !(a.claimed || {})[k]) return false;
  for (const k in b.vault || {}) if (((a.vault || {})[k] || 0) < b.vault[k]) return false;
  return true;
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
