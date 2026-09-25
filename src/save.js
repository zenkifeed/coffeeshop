// Lớp lưu trữ: bản lưu chính, 3 bản dự phòng cuối ngày, cất bản hỏng, phát hiện máy chặn lưu.
// Đọc localStorage qua globalThis để kiểm thử thay được bằng bản giả.
export const KEYS = { main: 'cafe3d_v1', rescue: 'cafe3d_rescue', baks: ['cafe3d_bak1', 'cafe3d_bak2', 'cafe3d_bak3'] };
const store = () => globalThis.localStorage;

export const validSave = d => !!d && d.v === 1 && typeof d.stock === 'object' && d.stock !== null && Number.isFinite(d.day) && Number.isFinite(d.money);

// Thử ghi rồi đọc lại: tab ẩn danh cũ, Safari chặn cookie hay bộ nhớ đầy đều hỏng ở bước này.
export function storageOk() {
  try {
    const s = store();
    s.setItem('cafe3d_probe', '1');
    const ok = s.getItem('cafe3d_probe') === '1';
    s.removeItem('cafe3d_probe');
    return ok;
  } catch (e) { return false; }
}

// status: 'ok' | 'none' | 'corrupt'. Bản hỏng được cất sang khoá riêng để lần lưu sau không ghi đè mất.
export function readSave() {
  let raw = null;
  try { raw = store().getItem(KEYS.main); } catch (e) { return { status: 'none', data: null }; }
  if (!raw) return { status: 'none', data: null };
  try {
    const d = JSON.parse(raw);
    if (validSave(d)) return { status: 'ok', data: d };
  } catch (e) { /* JSON hỏng: xử lý như bản không hợp lệ */ }
  try { store().setItem(KEYS.rescue, raw); } catch (e) { /* không cất được thì thôi */ }
  return { status: 'corrupt', data: null };
}

function dropSpare() { [KEYS.rescue, ...KEYS.baks.slice().reverse()].forEach(k => { try { store().removeItem(k); } catch (e) { /* bỏ qua */ } }); }

// Bộ nhớ đầy thì bỏ bản cứu và bản dự phòng để ưu tiên giữ bản chính.
export function writeSave(S) {
  let js;
  try { js = JSON.stringify(S); } catch (e) { return false; }
  try { store().setItem(KEYS.main, js); return true; } catch (e) { /* thử lại sau khi dọn */ }
  dropSpare();
  try { store().setItem(KEYS.main, js); return true; } catch (e) { return false; }
}

// Gọi mỗi cuối ngày: bak3 ← bak2 ← bak1 ← bản hiện tại.
export function rotateBackups(S) {
  try {
    const s = store(), [b1, b2, b3] = KEYS.baks, js = JSON.stringify(S);
    const v1 = s.getItem(b1), v2 = s.getItem(b2);
    try {
      if (v2) s.setItem(b3, v2);
      if (v1) s.setItem(b2, v1);
      s.setItem(b1, js);
    } catch (e) {
      [b3, b2].forEach(k => s.removeItem(k));
      try { s.setItem(b1, js); } catch (e2) { s.removeItem(b1); }
    }
  } catch (e) { /* máy chặn lưu: đã có cảnh báo riêng */ }
}

const LABELS = ['Cuối ngày gần nhất', 'Một ngày trước đó', 'Hai ngày trước đó'];
export function listBackups() {
  const out = [];
  KEYS.baks.forEach((k, i) => {
    try {
      const d = JSON.parse(store().getItem(k));
      if (validSave(d)) out.push({ key: k, label: LABELS[i], data: d });
    } catch (e) { /* bản hỏng thì không liệt kê */ }
  });
  return out;
}

export function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* không hỗ trợ */ }
}
