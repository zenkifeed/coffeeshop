// Lớp phản hồi DOM dùng chung: bộ icon SVG, thông báo, chữ bay, xu bay, pháo giấy, số chạy, hộp thoại, bảng trượt.
// Không giữ trạng thái game; game.js gọi vào đây.
import { sfx } from './audio.js';
import { motionScale } from './feel.js';

export const $ = id => document.getElementById(id);
export const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- bộ icon SVG path (không dùng emoji hay ảnh) ---------- */
const K = '#3a2317';
export const ICON = {
  coin: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5c542" stroke="${K}" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#c9912a" stroke-width="1.6"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor" stroke="${K}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 5l-1.9.4a6.7 6.7 0 0 1-.8 1.9l1.1 1.6-1.9 1.9-1.6-1.1a6.7 6.7 0 0 1-1.9.8l-.4 1.9h-2.6l-.4-1.9a6.7 6.7 0 0 1-1.9-.8l-1.6 1.1-1.9-1.9 1.1-1.6a6.7 6.7 0 0 1-.8-1.9l-1.9-.4v-2.6l1.9-.4c.2-.7.4-1.3.8-1.9L4.6 6.9l1.9-1.9 1.6 1.1c.6-.4 1.2-.6 1.9-.8l.4-1.9h2.6l.4 1.9c.7.2 1.3.4 1.9.8l1.6-1.1 1.9 1.9-1.1 1.6c.4.6.6 1.2.8 1.9l1.9.4z" fill="currentColor"/></svg>',
  pencil: `<svg viewBox="0 0 24 24"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19z" fill="#f0b43c" stroke="${K}" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 7l3.5 3.5" stroke="${K}" stroke-width="1.8"/><path d="M4 20l1-4.5 3.5 3.5z" fill="${K}"/></svg>`,
  dice: `<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="${K}" stroke-width="2"/><g fill="${K}"><circle cx="8.3" cy="8.3" r="1.6"/><circle cx="15.7" cy="8.3" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="8.3" cy="15.7" r="1.6"/><circle cx="15.7" cy="15.7" r="1.6"/></g></svg>`,
  check: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4fa883" stroke="${K}" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  gift: `<svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11.5" rx="2" fill="#e25b4a" stroke="${K}" stroke-width="2"/><rect x="2.5" y="6.5" width="19" height="4.5" rx="1.5" fill="#f0b43c" stroke="${K}" stroke-width="2"/><path d="M12 6.5v14" stroke="${K}" stroke-width="2"/><path d="M12 6.5c-2-3.5-6-3-5-.5.6 1.4 5 .5 5 .5zm0 0c2-3.5 6-3 5-.5-.6 1.4-5 .5-5 .5z" fill="#f0b43c" stroke="${K}" stroke-width="1.6"/></svg>`,
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#fffaf2" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  up: `<svg viewBox="0 0 24 24"><path d="M12 3.5l7.5 8h-4.5v8.5h-6v-8.5h-4.5z" fill="#4fa883" stroke="${K}" stroke-width="2" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#f0b43c" stroke="${K}" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="${K}" stroke-width="2.2"/><circle cx="12" cy="15.5" r="1.6" fill="${K}"/></svg>`,
  list: `<svg viewBox="0 0 24 24"><rect x="4.5" y="3.5" width="15" height="18" rx="2.5" fill="#fffaf2" stroke="${K}" stroke-width="2"/><rect x="8.5" y="2" width="7" height="4" rx="1.5" fill="#f0b43c" stroke="${K}" stroke-width="1.8"/><path d="M8 11l1.6 1.6L12.5 9.5M8 16.5l1.6 1.6 2.9-3.1" fill="none" stroke="#4fa883" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11.5h2.5M14 17h2.5" stroke="${K}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  shop: `<svg viewBox="0 0 24 24"><path d="M4 10.5V20h16v-9.5" fill="#fffaf2" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M3 6.5L5 3.5h14l2 3v2.5a2.5 2.5 0 0 1-4.5 1.5 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 9z" fill="#e25b4a" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><rect x="9.5" y="13.5" width="5" height="6.5" fill="#8a5a3b" stroke="${K}" stroke-width="1.8"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#f0b43c" stroke="${K}" stroke-width="2"/><path d="M12 6.5l5 5.5h-3v5h-4v-5H7z" fill="#fff" stroke="${K}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  // icon cho từng loại nâng cấp
  staff: `<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4" fill="#e8b894" stroke="${K}" stroke-width="2"/><path d="M8 4.8h8v-1a4 3 0 0 0-8 0z" fill="#8a5a3b" stroke="${K}" stroke-width="1.6"/><path d="M4.5 21a7.5 7 0 0 1 15 0z" fill="#fff8ee" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 14.6h5V21h-5z" fill="#8a5a3b" stroke="${K}" stroke-width="1.6"/></svg>`,
  spawn: `<svg viewBox="0 0 24 24"><path d="M3.5 10h3l8-5v14l-8-5h-3z" fill="#e25b4a" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M6.5 14l1.5 6h3l-1-5" fill="#fffaf2" stroke="${K}" stroke-width="1.8" stroke-linejoin="round"/><path d="M17.5 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="${K}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  walk: `<svg viewBox="0 0 24 24"><path d="M3 15.5l2-7 5 1.5 2.5 3 7 1.5a2 2 0 0 1 1.5 2V18H3z" fill="#5aa9e6" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M3 18h18v2H3z" fill="#fffaf2" stroke="${K}" stroke-width="1.8"/><path d="M8 11.5l1.5 1M10 13.5l1.5 1" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  queue: `<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="4" rx="1.5" fill="#c49a6c" stroke="${K}" stroke-width="2"/><path d="M5.5 14v6M18.5 14v6" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/><path d="M4 10V6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V10" fill="#e2574c" stroke="${K}" stroke-width="2"/></svg>`,
  prep: `<svg viewBox="0 0 24 24"><path d="M13.5 2.5L5 13.5h6l-1.5 8 9-11.5h-6z" fill="#f0b43c" stroke="${K}" stroke-width="2" stroke-linejoin="round"/></svg>`,
  profit: `<svg viewBox="0 0 24 24"><ellipse cx="9" cy="17" rx="6" ry="2.5" fill="#f5c542" stroke="${K}" stroke-width="1.8"/><path d="M3 17v-3.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V17" fill="#f5c542" stroke="${K}" stroke-width="1.8"/><ellipse cx="9" cy="13.5" rx="6" ry="2.5" fill="#f5c542" stroke="${K}" stroke-width="1.8"/><path d="M15.5 9.5l3-3 3 3M18.5 6.5v8" fill="none" stroke="#4fa883" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
// Ly có màu món: ly đá có ống hút và viên đá, ly nóng bốc hơi.
export function drinkIcon(c, ice) {
  const temp = ice
    ? '<rect x="11" y="18" width="4.5" height="4.5" rx="1" fill="#fff" opacity=".75" transform="rotate(12 13 20)"/><rect x="17" y="21" width="4.5" height="4.5" rx="1" fill="#fff" opacity=".6"/><path d="M19 1.5l-2 6.5" stroke="#e25b4a" stroke-width="2.4" stroke-linecap="round"/>'
    : '<path d="M12 5.5c-1.6-1.4 1.6-2.4 0-4M16.5 5.5c-1.6-1.4 1.6-2.4 0-4M21 5.5c-1.6-1.4 1.6-2.4 0-4" fill="none" stroke="#b39a88" stroke-width="1.6" stroke-linecap="round"/>';
  return `<svg class="dic" viewBox="0 0 32 36"><path d="M6 8.5h20l-2.3 23.6a3 3 0 0 1-3 2.7h-9.4a3 3 0 0 1-3-2.7z" fill="#fff" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><path d="M7.7 13.2h16.6l-1.8 18.6a1.8 1.8 0 0 1-1.8 1.6h-9.4a1.8 1.8 0 0 1-1.8-1.6z" fill="${c}"/>${temp}<rect x="4.5" y="7" width="23" height="3.4" rx="1.6" fill="${K}"/></svg>`;
}
// Mặt gấu dạng icon cho danh sách đội gấu và nâng cấp thuê gấu.
const BEAR_SVG = {
  brown: { fur: '#9b6a45', ear: '#8a5c3a', muz: '#f0cfa8', acc: `<path d="M6.5 8.5a5.5 4.5 0 0 1 11 0z" fill="#e25b4a" stroke="${K}" stroke-width="1.4"/><rect x="11" y="7.2" width="8" height="2.2" rx="1.1" fill="#e25b4a" stroke="${K}" stroke-width="1.2"/>` },
  panda: { fur: '#fbf8f3', ear: '#2e2c30', muz: '#ffffff', patch: true, acc: `<path d="M17 4.5l3.5-1.8v4.2zM17 4.5l-3.2-1.8v3.8z" fill="#ff8fb1" stroke="${K}" stroke-width="1"/>` },
  white: { fur: '#f6f8fb', ear: '#eef1f5', muz: '#ffffff', acc: `<path d="M5 20.5c3 1.8 11 1.8 14 0v2H5z" fill="#5aa9e6" stroke="${K}" stroke-width="1.2"/>` },
  honey: { fur: '#e0a94a', ear: '#d29a3c', muz: '#fbe3b6', acc: `<ellipse cx="14" cy="4.2" rx="3" ry="1.3" fill="#7fb069" stroke="${K}" stroke-width="1" transform="rotate(-25 14 4.2)"/>` },
};
export function bearIcon(kind) {
  const b = BEAR_SVG[kind] || BEAR_SVG.brown;
  const patch = b.patch ? '<ellipse cx="9" cy="12.2" rx="2.2" ry="2.8" fill="#2e2c30" transform="rotate(20 9 12.2)"/><ellipse cx="15" cy="12.2" rx="2.2" ry="2.8" fill="#2e2c30" transform="rotate(-20 15 12.2)"/>' : '';
  return `<svg viewBox="0 0 24 24"><circle cx="5.5" cy="6.5" r="3" fill="${b.ear}" stroke="${K}" stroke-width="1.4"/><circle cx="18.5" cy="6.5" r="3" fill="${b.ear}" stroke="${K}" stroke-width="1.4"/><ellipse cx="12" cy="13" rx="8.5" ry="7.8" fill="${b.fur}" stroke="${K}" stroke-width="1.6"/>${patch}<circle cx="9" cy="12" r="1.2" fill="${K}"/><circle cx="15" cy="12" r="1.2" fill="${K}"/><circle cx="9.4" cy="11.6" r=".4" fill="#fff"/><circle cx="15.4" cy="11.6" r=".4" fill="#fff"/><ellipse cx="12" cy="16" rx="3" ry="2.2" fill="${b.muz}" stroke="${K}" stroke-width="1"/><ellipse cx="12" cy="15.1" rx="1.1" ry=".8" fill="${K}"/><circle cx="6.8" cy="15.2" r="1.2" fill="#ff8fa3" opacity=".7"/><circle cx="17.2" cy="15.2" r="1.2" fill="#ff8fa3" opacity=".7"/>${b.acc}</svg>`;
}
export const starsHTML = (n, max = 5, cls = '') => `<span class="stars ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">${ICON.star}</i>`).join('')}</span>`;

/* ---------- thông báo, chữ bay, xu bay, pháo giấy ---------- */
// Thông báo xếp chồng, tối đa 3 cái để một loạt sự kiện không che kín màn hình.
export function toast(msg, bad) {
  const box = $('toasts'), t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.innerHTML = msg;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2300);
}
export function floatText(x, y, txt, cls = '') {
  const d = document.createElement('div');
  d.className = 'float ' + cls;
  d.innerHTML = txt;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1300);
}
export function flash(kind) {
  const f = $('flash');
  f.className = '';
  void f.offsetWidth;
  f.className = kind;
}
export function punchEl(el) { if (!el) return; el.classList.remove('punch'); void el.offsetWidth; el.classList.add('punch'); }
export const retrigger = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
export const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
// Xu bay từ chỗ tiền sinh ra lên ô tiền: chỉ khi xu chạm ô tiền thì ô tiền mới nảy.
export function coinFly(x, y, n = 4, quiet = false) {
  const to = $('hMoney').getBoundingClientRect(), tx = to.left + 4, ty = to.top + to.height / 2;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'coinfly';
    c.innerHTML = ICON.coin;
    document.body.appendChild(c);
    const sx = x + (Math.random() - 0.5) * 40, sy = y + (Math.random() - 0.5) * 20, mx = (sx + tx) / 2 + (Math.random() - 0.5) * 80, my = Math.min(sy, ty) - 40 - Math.random() * 40;
    const a = c.animate([
      { transform: `translate(${sx}px,${sy}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${sx}px,${sy - 20}px) scale(1.1)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${tx}px,${ty}px) scale(.7)`, opacity: 1 },
    ], { duration: 650 + i * 70, easing: 'cubic-bezier(.5,0,.6,1)', delay: i * 40, fill: 'backwards' });
    a.onfinish = () => { c.remove(); punchEl($('hMoneyBox')); if (!quiet) sfx.tick(); };
  }
}
// Pháo giấy DOM cho những khoảnh khắc ở giao diện (mở trạm, qua mốc, nhận thưởng, chuyển quán).
export function domBurst(x, y, n = 18) {
  const cols = ['#e25b4a', '#f0b43c', '#4fa883', '#5aa9e6', '#ef6f8e', '#9b6bd1'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'conf';
    p.style.background = cols[i % cols.length];
    document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2, d = (70 + Math.random() * 110) * motionScale;
    p.animate([
      { transform: `translate(${x}px,${y}px) rotate(0deg) scale(1)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d - 40}px) rotate(${Math.random() * 540}deg) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${x + Math.cos(a) * d * 1.2}px,${y + Math.sin(a) * d + 90}px) rotate(${Math.random() * 720}deg) scale(.6)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => p.remove();
  }
}
export function countUp(el, to, f, dur = 700) {
  const t0 = performance.now();
  let lastTick = 0;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = f(to * e);
    if (now - lastTick > 60 && k < 1) { lastTick = now; sfx.count(); }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- hộp thoại giữa màn hình ---------- */
// buttons: [chữ, hàm, là nút chính]. Bấm nút nào cũng đóng hộp thoại rồi mới gọi hàm.
export function modal(html, buttons, cls = '') {
  $('modal').onpointerdown = null;
  $('modal').classList.remove('top');
  $('card').className = 'card ' + cls;
  $('card').innerHTML = html + `<div class="btns">${buttons.map((b, i) => `<button class="${b[2] ? 'pri' : ''}" data-i="${i}">${b[0]}</button>`).join('')}</div>`;
  $('modal').hidden = false;
  $('modal').classList.remove('show');
  void $('modal').offsetWidth;
  $('modal').classList.add('show');
  $('card').querySelectorAll('.btns button').forEach(el => { el.onclick = () => { $('modal').hidden = true; buttons[+el.dataset.i][1](); }; });
}
export const modalOpen = () => !$('modal').hidden;
