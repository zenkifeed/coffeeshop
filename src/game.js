// Điều phối: màn chuẩn bị, vòng bán hàng thời gian thực, tổng kết ngày, và toàn bộ lớp phản hồi.
import { ING, COMP, DRINKS, UPG, EVENTS, CFG } from './data.js';
import * as L from './logic.js';
import { createScene } from './scene.js';
import { sfx, pour as pourSnd, unlock, setMuted } from './audio.js';
import { opts, saveOpts, haptic, motionScale } from './feel.js';
import * as SV from './save.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round(n / 100) / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'k';
const hex = c => parseInt(c.slice(1), 16);

/* ---------- bộ icon SVG path (không dùng emoji hay ảnh) ---------- */
const ICON = {
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5c542" stroke="#3a2317" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#c9912a" stroke-width="1.6"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor" stroke="#3a2317" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 5l-1.9.4a6.7 6.7 0 0 1-.8 1.9l1.1 1.6-1.9 1.9-1.6-1.1a6.7 6.7 0 0 1-1.9.8l-.4 1.9h-2.6l-.4-1.9a6.7 6.7 0 0 1-1.9-.8l-1.6 1.1-1.9-1.9 1.1-1.6a6.7 6.7 0 0 1-.8-1.9l-1.9-.4v-2.6l1.9-.4c.2-.7.4-1.3.8-1.9L4.6 6.9l1.9-1.9 1.6 1.1c.6-.4 1.2-.6 1.9-.8l.4-1.9h2.6l.4 1.9c.7.2 1.3.4 1.9.8l1.6-1.1 1.9 1.9-1.1 1.6c.4.6.6 1.2.8 1.9l1.9.4z" fill="currentColor"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 2.5c1 3.6 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.3.1 1.7.8 2.8 1.9 3.3C10.5 8.4 11.3 5 12 2.5z" fill="#ff8a3d" stroke="#3a2317" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12.5c1.2 1.3 2.4 2 2.4 3.8a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.3 2.4-3.8z" fill="#ffd23f"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19z" fill="#f0b43c" stroke="#3a2317" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 7l3.5 3.5" stroke="#3a2317" stroke-width="1.8"/><path d="M4 20l1-4.5 3.5 3.5z" fill="#3a2317"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="#3a2317" stroke-width="2"/><g fill="#3a2317"><circle cx="8.3" cy="8.3" r="1.6"/><circle cx="15.7" cy="8.3" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="8.3" cy="15.7" r="1.6"/><circle cx="15.7" cy="15.7" r="1.6"/></g></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#fffaf2" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
function drinkIcon(o) {
  const c = DRINKS[o.drink].c;
  const cream = o.drink === 'muoi' ? '<path d="M8 13.2h16l-.3 3H8.3z" fill="#fff6e6"/>' : '';
  const temp = o.ice
    ? '<rect x="11" y="18" width="4.5" height="4.5" rx="1" fill="#fff" opacity=".75" transform="rotate(12 13 20)"/><rect x="17" y="21" width="4.5" height="4.5" rx="1" fill="#fff" opacity=".6"/><path d="M19 1.5l-2 6.5" stroke="#e25b4a" stroke-width="2.4" stroke-linecap="round"/>'
    : '<path d="M12 5.5c-1.6-1.4 1.6-2.4 0-4M16.5 5.5c-1.6-1.4 1.6-2.4 0-4M21 5.5c-1.6-1.4 1.6-2.4 0-4" fill="none" stroke="#b39a88" stroke-width="1.6" stroke-linecap="round"/>';
  return `<svg class="dic" viewBox="0 0 32 36"><path d="M6 8.5h20l-2.3 23.6a3 3 0 0 1-3 2.7h-9.4a3 3 0 0 1-3-2.7z" fill="#fff" stroke="#3a2317" stroke-width="2" stroke-linejoin="round"/><path d="M7.7 13.2h16.6l-1.8 18.6a1.8 1.8 0 0 1-1.8 1.6h-9.4a1.8 1.8 0 0 1-1.8-1.6z" fill="${c}"/>${cream}${temp}<rect x="4.5" y="7" width="23" height="3.4" rx="1.6" fill="#3a2317"/></svg>`;
}

const loaded = SV.readSave();
let S = hydrate(loaded.data);
const R = { mode: 'prep', tab: 'kho', plan: {}, slots: [], cup: L.newCup(), pouring: false, focus: null, paused: false, uid: 0, disp: S.money, freeze: 0, combo: 0, animPane: true, animSheet: true, saveT: 0, noStoreWarned: false };

const scene = createScene($('c'), {
  onDown: p => { unlock(); if (p.station) onStation(p.station); else if (p.cust != null) onCustomer(p.cust); },
  onUp: () => stopPour(),
});
setMuted(!opts.sound);

/* ---------- lưu ---------- */
// Trộn bản lưu với trạng thái mặc định để bản lưu cũ thiếu trường mới vẫn chạy.
function hydrate(d) {
  if (!d) return L.freshState();
  // Tắt trang ngay ở màn phá sản thì bản lưu còn két âm: mở quán mới, giữ tên quán.
  if (d.money < 0) return { ...L.freshState(), shopName: d.shopName || '' };
  const f = L.freshState();
  const s = { ...f, ...d, stock: { ...f.stock, ...d.stock }, sell: { ...f.sell, ...d.sell }, unlocked: { ...f.unlocked, ...d.unlocked }, upg: { ...d.upg } };
  L.sanitizePrices(s);
  if (s.evDay !== s.day) L.rollDay(s);
  return s;
}
function save() {
  const ok = SV.writeSave(S);
  if (!ok && !R.noStoreWarned) { R.noStoreWarned = true; storeWarn(() => {}); }
  return ok;
}
// Trong lúc bán thì lưu kèm giờ còn lại, để mở lại là bán tiếp đúng chỗ chứ không chơi lại ngày.
function saveLive() {
  if (R.mode === 'sell') S.dayT = Math.max(0, R.t);
  save();
}
const clockOf = tLeft => {
  const el = Math.min(1, Math.max(0, 1 - tLeft / (CFG.dayMinutes * 60))), mins = CFG.openHour * 60 + Math.floor(el * (CFG.closeHour - CFG.openHour) * 60 / 5) * 5;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
};

/* ================= LỚP PHẢN HỒI DOM ================= */
// Thông báo xếp chồng, tối đa 3 cái để một loạt sự kiện không che kín màn hình.
function toast(msg, bad) {
  const box = $('toasts'), t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2300);
}
function floatText(x, y, txt, cls = '') {
  const d = document.createElement('div');
  d.className = 'float ' + cls;
  d.innerHTML = txt;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1300);
}
function flash(kind) {
  const f = $('flash');
  f.className = '';
  void f.offsetWidth;
  f.className = kind;
}
function punchEl(el) { if (!el) return; el.classList.remove('punch'); void el.offsetWidth; el.classList.add('punch'); }
// Xu bay từ chỗ khách lên ô tiền: chỉ khi xu chạm ô tiền thì ô tiền mới nảy.
function coinFly(x, y, n = 4) {
  const to = $('hMoney').getBoundingClientRect(), tx = to.left + 14, ty = to.top + to.height / 2;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'coinfly';
    c.innerHTML = ICON.coin;
    document.body.appendChild(c);
    const sx = x + (Math.random() - 0.5) * 40, sy = y + (Math.random() - 0.5) * 20, mx = (sx + tx) / 2 + (Math.random() - 0.5) * 80, my = Math.min(sy, ty) - 60 - Math.random() * 40;
    const a = c.animate([
      { transform: `translate(${sx}px,${sy}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${sx}px,${sy - 20}px) scale(1.1)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${tx}px,${ty}px) scale(.7)`, opacity: 1 },
    ], { duration: 650 + i * 70, easing: 'cubic-bezier(.5,0,.6,1)', delay: i * 40, fill: 'backwards' });
    a.onfinish = () => { c.remove(); punchEl($('hMoneyBox')); sfx.tick(); };
  }
}
// Pháo giấy DOM cho những khoảnh khắc ở giao diện (mở món, nâng cấp, lãi cuối ngày).
function domBurst(x, y, n = 18) {
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
const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function countUp(el, to, f, dur = 700) {
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

function modal(html, buttons, cls = '') {
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

// Sàn phản hồi: một bộ nghe duy nhất cho mọi nút, để không nút nào câm.
document.addEventListener('pointerdown', e => {
  if (e.button) return;
  unlock();
  const el = e.target.closest && e.target.closest('button, [data-tap]');
  if (!el || el.disabled || el.hasAttribute('data-quiet')) return;
  if (el.classList.contains('dis')) { sfx.meh(); haptic('error'); return; }
  const primary = el.classList.contains('big') || el.classList.contains('pri');
  (primary ? sfx.uiPrimary : sfx.ui)();
  haptic(primary ? 'primary' : 'tap');
}, { capture: true, passive: true });

/* ---------- HUD ---------- */
function hud() {
  const selling = R.mode === 'sell';
  $('hDay').textContent = 'Ngày ' + S.day;
  let sub = 'Chuẩn bị';
  if (selling) {
    const el = Math.min(1, 1 - R.t / R.dayLen);
    sub = R.closing ? 'Đã đóng cửa' : clockOf(R.t);
    $('dayBar').style.transform = `scaleX(${el.toFixed(4)})`;
  }
  if ($('hSub').textContent !== sub) $('hSub').textContent = sub;
  const m = Math.round(R.disp / 100) * 100;
  if ($('hMoney')._v !== m) { $('hMoney')._v = m; $('hMoney').textContent = fmt(m); }
  const r = L.rating(S), rs = r.toFixed(1).replace('.', ',');
  if ($('hRate').textContent !== rs) { $('hRate').textContent = rs; $('hStarFill').style.width = (r / 5 * 100) + '%'; }
  $('pauseBtn').hidden = !selling;
  $('dayBarBox').hidden = !selling;
}

/* ================= MÀN CHUẨN BỊ ================= */
function renderPrep() {
  R.mode = 'prep';
  document.body.classList.remove('selling');
  $('prep').hidden = false;
  $('panel').hidden = true;
  $('gauge').hidden = true;
  $('combo').hidden = true;
  scene.setHighlight(null);
  refreshStations();
  const e = L.ev(S), lv = L.level(S.day);
  const tabs = [['kho', 'Kho'], ['menu', 'Menu & giá'], ['upg', 'Nâng cấp'], ['rev', 'Đánh giá']];
  $('prep').innerHTML = `
    <div class="prep-card${R.animSheet ? ' enter' : ''}">
      <div class="prep-top"><h2 id="shopTitle">${esc(S.shopName || 'Quán Cà Phê Nhỏ')}</h2><button class="ghost ren" id="rename">${ICON.pencil}Đổi tên</button></div>
      ${e ? `<div class="evc"><b>Hôm nay: ${EVENTS[e.id].n}</b><small>${esc(L.evText(S, e))}</small></div>` : ''}
      <div class="lvc">Cấp ${lv}: ${lv === 1 ? 'khách gọi món và size' : lv === 2 ? 'khách chọn thêm nóng hay đá' : 'một khách gọi tới 3 ly'}${lv < 3 ? ` · lên cấp ${lv + 1} từ ngày ${lv === 1 ? CFG.levels.l2 : CFG.levels.l3}` : ''}</div>
      <div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${R.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="pane" id="pane"></div>
      <div class="prep-foot" id="foot"></div>
    </div>`;
  R.animSheet = false;
  $('prep').querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { if (R.tab === b.dataset.tab) return; R.tab = b.dataset.tab; R.animPane = true; renderPrep(); }; });
  $('rename').onclick = renameDlg;
  scene.setSign(S.shopName, S.upg.sign);
  renderPane();
  renderFoot();
  hud();
}
function renderPane() {
  ({ kho: paneKho, menu: paneMenu, upg: paneUpg, rev: paneRev })[R.tab]();
  const p = $('pane');
  if (R.animPane) {
    p.querySelectorAll('.row, .rev, .rate-big').forEach((r, i) => { r.style.setProperty('--i', i); r.classList.add('enter'); });
    R.animPane = false;
  }
}
// Thiếu tiền thì không khoá chết nút: bấm vào vẫn nói thiếu bao nhiêu.
const short = cost => `Thiếu ${fmt(cost - S.money)}. Bán thêm vài ngày rồi quay lại nhé`;

function planTotal() { return Object.entries(R.plan).reduce((a, [k, q]) => a + q * L.ingCost(S, k), 0); }
function paneKho(bumpKey) {
  const ks = L.ingInUse(S);
  $('pane').innerHTML = ks.map(k => {
    const it = ING[k], q = L.qty(S, k), p = R.plan[k] || 0, soon = S.stock[k][0];
    const life = it.life ? (it.life === 1 ? 'dùng trong ngày' : `hạn ${it.life} ngày`) : 'không hết hạn';
    const exp = soon && soon.exp < 99999 ? ` · ${soon.q} phần hết hạn ${soon.exp === S.day ? 'tối nay' : 'ngày ' + soon.exp}` : '';
    return `<div class="row"><div class="nm"><b>${it.n}</b><small>Còn ${q} · ${life}${exp}</small><small>${fmt(L.ingCost(S, k))}/phần</small></div>
      <div class="qty"><button data-k="${k}" data-d="-1" ${p ? '' : 'class="dis"'}>−</button><span class="${bumpKey === k ? 'bump' : ''}${p ? ' has' : ''}">${p}</span><button data-k="${k}" data-d="1">+</button></div></div>`;
  }).join('') + `<button class="ghost wide" id="suggest">Gợi ý nhập đủ khoảng 30 ly</button>`;
  $('pane').querySelectorAll('.qty button').forEach(b => {
    b.onclick = () => { const k = b.dataset.k, d = +b.dataset.d; if (d < 0 && !R.plan[k]) return; R.plan[k] = Math.max(0, (R.plan[k] || 0) + d * ING[k].pack); if (!R.plan[k]) delete R.plan[k]; paneKho(k); renderFoot(); };
  });
  $('suggest').onclick = () => {
    const want = { cup: 30, beans: 30, ice: 20 };
    ks.forEach(k => { const need = (want[k] || 15) - L.qty(S, k); R.plan[k] = need > 0 ? Math.ceil(need / ING[k].pack) * ING[k].pack : 0; if (!R.plan[k]) delete R.plan[k]; });
    paneKho();
    $('pane').querySelectorAll('.qty span.has').forEach(s => s.classList.add('bump'));
    renderFoot();
  };
}
const unitCost = k => DRINKS[k].comps.reduce((a, c) => a + (COMP[c].ing ? ING[COMP[c].ing].cost : 0), ING.cup.cost);
function paneMenu() {
  $('pane').innerHTML = Object.keys(DRINKS).map(k => {
    const d = DRINKS[k], rec = d.comps.map(c => COMP[c].s).join(' + '), ic = `<span class="mic">${drinkIcon({ drink: k, ice: d.temps[0] === 'iced' })}</span>`;
    if (!S.unlocked[k]) return `<div class="row locked">${ic}<div class="nm"><b>${d.n}</b><small>${rec}</small></div><button class="pri${S.money < d.unlock ? ' dis' : ''}" data-unlock="${k}">Mở · ${fmt(d.unlock)}</button></div>`;
    const idx = L.priceIdx(S, k), warn = idx > 1.6 ? '<em class="bad">Quá đắt, đa số khách bỏ qua</em>' : idx > 1.25 ? '<em class="warn">Hơi đắt, khách chê</em>' : idx < 0.9 ? '<em class="ok">Rẻ, khách thích</em>' : '';
    return `<div class="row">${ic}<div class="nm"><b>${d.n}</b><small>${rec} · vốn ${fmt(unitCost(k))} · gợi ý ${fmt(d.price)}</small>${warn}</div>
      <label class="price"><input type="number" inputmode="numeric" min="1" step="1" data-price="${k}" value="${S.sell[k] / 1000}"><span>k</span></label></div>`;
  }).join('') + `<div class="row"><div class="nm"><b>Phụ thu size L</b><small>Gợi ý ${fmt(CFG.sizeL)} · trên 7k ít người chọn L</small></div><label class="price"><input type="number" inputmode="numeric" min="0" step="1" data-price="L" value="${S.sell.L / 1000}"><span>k</span></label></div>`;
  $('pane').querySelectorAll('[data-unlock]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.unlock, c = DRINKS[k].unlock;
      if (S.money < c) return toast(short(c), true);
      const [x, y] = centerOf(b);
      S.money -= c; S.cur.upgrades += c; S.unlocked[k] = true; save();
      sfx.star(); haptic('reward'); domBurst(x, y);
      toast('Đã thêm ' + DRINKS[k].n + ' vào menu');
      renderPrep();
    };
  });
  $('pane').querySelectorAll('[data-price]').forEach(i => {
    i.onchange = () => { S.sell[i.dataset.price] = Math.round(+i.value * 1000); L.sanitizePrices(S); save(); sfx.pop(2); paneMenu(); };
  });
}
function paneUpg() {
  $('pane').innerHTML = UPG.map(u => S.upg[u.id]
    ? `<div class="row"><div class="nm"><b>${u.n}</b><small>${u.d}</small></div><span class="own">Đã có</span></div>`
    : `<div class="row"><div class="nm"><b>${u.n}</b><small>${u.d} · điện nước +${fmt(CFG.utilPerUpg)}/ngày</small></div><button class="pri${S.money < u.cost ? ' dis' : ''}" data-upg="${u.id}">${fmt(u.cost)}</button></div>`).join('');
  $('pane').querySelectorAll('[data-upg]').forEach(b => {
    b.onclick = () => {
      const u = UPG.find(x => x.id === b.dataset.upg);
      if (S.money < u.cost) return toast(short(u.cost), true);
      const [x, y] = centerOf(b);
      S.money -= u.cost; S.cur.upgrades += u.cost; S.upg[u.id] = true; save();
      sfx.star(); haptic('reward'); domBurst(x, y);
      toast('Đã lắp ' + u.n);
      renderPrep();
      if (u.id === 'sign') scene.setSign(S.shopName, true, true);
    };
  });
}
function paneRev() {
  const r = L.rating(S);
  $('pane').innerHTML = `<div class="rate-big">${r.toFixed(1).replace('.', ',')} ${starsHTML(Math.round(r))}<small>Trung bình ${Math.min(CFG.reviewWindow, S.reviews.length) || 0} đánh giá gần nhất. Sao càng cao khách càng đông.</small></div>` +
    (S.reviews.length ? S.reviews.slice(0, 40).map(x => `<div class="rev"><b>${esc(x.n)}</b> ${starsHTML(x.s, 'sm')} <small>ngày ${x.d}</small><div>${esc(x.t)}</div></div>`).join('') : '<p class="muted">Chưa có đánh giá nào. Mở cửa để đón khách đầu tiên!</p>');
}
/* ---------- đổi tên quán ---------- */
const NAME_MAX = 30;
const NAME_A = ['Cà Phê', 'Quán', 'Tiệm', 'Góc', 'Nhà'];
const NAME_B = ['Mây', 'Gió Chiều', 'Hạt Nâu', 'Phố Nhỏ', 'Bên Hiên', 'Mộc', 'Lá Me', 'Sớm Mai', 'Ngõ Nhỏ', 'Tí Tách', 'Mèo Mướp', 'Nắng Sớm', 'Hiên Nhà', 'Giọt Đắng', 'Rang Xay', 'Bàn Gỗ', 'Góc Phố', 'Mưa Bay'];
const cleanName = v => String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
function randomNames(n, avoid) {
  const out = new Set();
  while (out.size < n) { const x = `${L.rnd(NAME_A)} ${L.rnd(NAME_B)}`; if (x !== avoid) out.add(x); }
  return [...out];
}
const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
function renameDlg() {
  const cur = S.shopName || '', HINT = 'Tên hiện trên biển hiệu của quán';
  modal(`<h2>Đặt tên quán</h2>
    <div class="sign-prev" id="rnSign"><div class="awn"></div><div class="board"><span id="rnPrev"></span></div></div>
    <div class="rn-field" id="rnField"><input id="rnIn" type="text" maxlength="${NAME_MAX}" enterkeyhint="done" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Quán Cà Phê Nhỏ" aria-label="Tên quán"><button id="rnDice" class="dice" aria-label="Gợi ý tên ngẫu nhiên">${ICON.dice}</button></div>
    <div class="rn-meta"><span id="rnMsg">${HINT}</span><span id="rnCount"></span></div>
    <div class="chips" id="rnChips"></div>
    <div class="rn-btns"><button class="ghost" id="rnCancel">Huỷ</button><button class="pri" id="rnOk" data-quiet>Đặt tên</button></div>`, [], 'rename');
  const inp = $('rnIn'), prev = $('rnPrev'), sign = $('rnSign');
  inp.value = cur;
  const setMsg = (t, bad) => { $('rnMsg').textContent = t; $('rnMsg').classList.toggle('bad', !!bad); };
  const refresh = typed => {
    const v = cleanName(inp.value);
    prev.textContent = v || 'Quán Cà Phê Nhỏ';
    prev.classList.toggle('ph', !v);
    $('rnCount').textContent = `${inp.value.length}/${NAME_MAX}`;
    $('rnCount').classList.toggle('near', inp.value.length >= NAME_MAX - 4);
    $('rnOk').classList.toggle('soft', !v || v === cur);
    if (typed) { retrigger(prev, 'punch'); sfx.tick(); }
  };
  const pick = name => {
    inp.value = name;
    refresh();
    retrigger(sign, 'flip');
    sfx.pop(4);
    haptic('tap');
    setMsg(HINT);
  };
  const chips = () => {
    $('rnChips').innerHTML = randomNames(3, cleanName(inp.value)).map((n, i) => `<button class="chip" style="--i:${i}" data-n="${esc(n)}">${esc(n)}</button>`).join('');
    $('rnChips').querySelectorAll('.chip').forEach(b => { b.onclick = () => pick(b.dataset.n); });
  };
  const refuse = msg => { retrigger($('rnField'), 'shake'); setMsg(msg, true); sfx.meh(); haptic('error'); };
  const close = () => { $('modal').hidden = true; };
  const ok = () => {
    const v = cleanName(inp.value);
    if (!v) { inp.focus(); return refuse('Nhập tên quán trước nhé'); }
    if (v === cur) return refuse('Đây là tên đang dùng, thử tên khác xem');
    inp.blur();
    S.shopName = v;
    save();
    document.title = v;
    sign.classList.add('stamp');
    const [x, y] = centerOf(sign);
    domBurst(x, y, 26);
    sfx.star();
    haptic('reward');
    setTimeout(() => {
      close();
      scene.setSign(v, S.upg.sign, true);
      renderPrep();
      punchEl($('shopTitle'));
      // Chờ biển hiệu nảy xong mới báo, để thông báo không che đúng khoảnh khắc đẹp nhất.
      setTimeout(() => toast('Quán đã có tên mới: ' + v), 1100);
    }, 650);
  };
  inp.addEventListener('input', () => { refresh(true); if ($('rnMsg').classList.contains('bad')) setMsg(HINT); });
  inp.addEventListener('beforeinput', e => {
    if (e.inputType.startsWith('insert') && inp.value.length >= NAME_MAX && inp.selectionStart === inp.selectionEnd) { retrigger($('rnCount'), 'full'); sfx.meh(); haptic('tap'); }
  });
  inp.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'Enter') { e.preventDefault(); ok(); } else if (e.key === 'Escape') close();
  });
  // Bàn phím điện thoại che nửa dưới màn hình: lúc gõ thì đẩy hộp thoại lên trên.
  inp.addEventListener('focus', () => $('modal').classList.add('top'));
  inp.addEventListener('blur', () => $('modal').classList.remove('top'));
  $('rnDice').onclick = () => { retrigger($('rnDice'), 'roll'); pick(randomNames(1, cleanName(inp.value))[0]); chips(); };
  $('rnOk').onclick = ok;
  $('rnCancel').onclick = close;
  $('modal').onpointerdown = e => { if (e.target === $('modal')) close(); };
  refresh();
  chips();
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => { inp.focus(); inp.select(); }, 380);
}
const starsHTML = (n, cls = '') => `<span class="stars ${cls}">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}">${ICON.star}</i>`).join('')}</span>`;
function openBlock() {
  if (!L.qty(S, 'cup') && !(R.plan.cup > 0)) return 'Chưa có ly';
  if (!L.qty(S, 'beans') && !(R.plan.beans > 0)) return 'Chưa có cà phê hạt';
  return null;
}
function renderFoot() {
  const t = planTotal(), blk = openBlock();
  $('foot').innerHTML = t
    ? `<button class="big buy${t > S.money ? ' dis' : ''}" id="buy">Nhập hàng · ${fmt(t)}</button>`
    : `<button class="big${blk ? ' dis' : ' breathe'}" id="open">${blk ? blk + ' · vào Kho nhập hàng' : 'Mở cửa ngày ' + S.day}</button>`;
  if ($('buy')) $('buy').onclick = () => {
    const tot = planTotal();
    if (tot > S.money) return toast(short(tot), true);
    Object.entries(R.plan).forEach(([k, q]) => L.addStock(S, k, q));
    S.money -= tot;
    S.cur.buy += tot;
    R.plan = {};
    save();
    sfx.coin();
    const [x, y] = centerOf($('hMoney'));
    floatText(x, y + 26, '−' + fmt(tot), 'neg');
    punchEl($('hMoneyBox'));
    toast('Đã nhập hàng');
    renderPrep();
  };
  if ($('open')) $('open').onclick = () => { if (blk) { R.tab = 'kho'; R.animPane = true; renderPrep(); return toast(blk + ', nhập hàng trước khi mở cửa', true); } unlock(); startDay(); };
}

/* ================= BÁN HÀNG ================= */
// Trạm thành phần chỉ dùng được khi có món đã mở cần đến nó.
const compUsable = key => Object.keys(DRINKS).some(k => S.unlocked[k] && DRINKS[k].comps.includes(key));
function refreshStations() { Object.keys(COMP).filter(k => k !== 'shot').forEach(k => scene.setStationEnabled(k, compUsable(k))); }
function startDay(resume) {
  R.mode = 'sell';
  document.body.classList.add('selling');
  $('prep').hidden = true;
  $('panel').hidden = false;
  R.dayLen = CFG.dayMinutes * 60;
  R.t = resume ? Math.min(R.dayLen, Math.max(1, S.dayT)) : R.dayLen;
  R.saveT = 10;
  R.spawnT = 1;
  R.closing = false;
  R.paused = false;
  R.cup = L.newCup();
  R.focus = null;
  R.combo = 0;
  const n = S.upg.slot4 ? 4 : 3;
  R.slots = Array(n).fill(null);
  scene.setSlots(n);
  scene.setCup(R.cup);
  scene.punch(0.6);
  sfx.bell();
  haptic('primary');
  refreshStations();
  clearBubbles();
  saveLive();
  const lv = L.level(S.day);
  if (resume) toast('Bán tiếp ngày ' + S.day + ' từ ' + clockOf(R.t));
  else if (S.day === 1 && !S.tutSeen) {
    S.tutSeen = true;
    save();
    R.paused = true;
    modal(`<h2>Cách pha</h2><ol class="how"><li>Chạm <b>chồng ly M hoặc L</b> để lấy ly.</li><li><b>Nhấn giữ máy espresso</b>, thả tay khi vạch vào vùng xanh. Vào giữa vùng xanh là <b>Hoàn hảo</b>.</li><li>Chạm sữa đặc, sữa tươi, đá… theo món khách gọi.</li><li><b>Chạm vào khách</b> để giao ly.</li></ol><p class="muted">Vòng sáng vàng luôn chỉ chỗ cần chạm tiếp theo.</p>`, [['Mở cửa', () => { R.paused = false; }, 1]]);
  } else if (lv > (S.seenLv || 1)) {
    S.seenLv = lv;
    save();
    R.paused = true;
    modal(lv === 2 ? '<h2>Từ hôm nay: nóng hay đá</h2><p>Khách chọn uống nóng hoặc uống đá. Ly có ống hút và đá là uống đá, ly bốc hơi là uống nóng.</p>' : '<h2>Từ hôm nay: đơn nhiều ly</h2><p>Một khách có thể gọi 2–3 ly. Bong bóng thoại hiện ly đang cần làm, giao xong ly này thì chuyển sang ly kế tiếp.</p>', [['Đã hiểu', () => { R.paused = false; }, 1]], 'lvup');
  }
  const e = L.ev(S);
  if (e) setTimeout(() => toast(EVENTS[e.id].n + ': ' + L.evText(S, e)), 400);
  hud();
}

function spawnCustomer() {
  const slot = R.slots.findIndex(s => !s);
  if (slot < 0) return;
  const n = L.cupCount(S), cups = [];
  for (let i = 0; i < n; i++) {
    const o = L.genOrder(S);
    if (o.leave) {
      S.cur.lost++;
      if (o.leave === 'soldout') toast('Hết nguyên liệu cho ' + DRINKS[o.k].n.toLowerCase() + ', khách về', true);
      else { toast('Khách xem menu chê đắt, bỏ đi', true); if (Math.random() < 0.3) L.addReview(S, 2, 'pricey', L.custName()); }
      return;
    }
    cups.push(o);
  }
  const look = {
    skin: L.rnd([0xf5d0b0, 0xe8b894, 0xd29a6e, 0xa8744f]),
    shirt: L.rnd([0xe25b4a, 0x5aa9e6, 0x7fb069, 0xf0b43c, 0x9b6bd1, 0xef6f8e, 0x4fa883, 0x3d5a80]),
    pants: L.rnd([0x2d3142, 0x4a4e69, 0x6b4a36, 0x1f2a44]),
    hair: L.rnd([0x2b1d14, 0x4a2c1a, 0x111111, 0x8a5a3b, 0xd9a441]),
    bun: Math.random() < 0.4,
    h: 0.9 + Math.random() * 0.2,
  };
  const max = L.patienceFor(S, cups);
  const c = { id: ++R.uid, slot, cups, done: cups.map(() => false), pat: max, max, wrong: 0, shotPen: 0, name: L.custName(), look, leaving: false, low: false };
  R.slots[slot] = c;
  scene.addCustomer(c.id, slot, look);
  sfx.bell();
}
const custById = id => R.slots.find(c => c && c.id === id);
const curOrder = c => c.cups[c.done.indexOf(false)];
const serving = c => c && !c.leaving && scene.customerArrived(c.id);
function focusCust() {
  let c = R.focus != null ? custById(R.focus) : null;
  if (!serving(c)) {
    c = R.slots.filter(serving).sort((a, b) => a.pat / a.max - b.pat / b.max)[0] || null;
    R.focus = c ? c.id : null;
  }
  return c;
}
function customerLeaves(c, mood) {
  R.slots[c.slot] = null;
  if (R.focus === c.id) R.focus = null;
  scene.customerLeave(c.id, mood);
  removeBubble(c.id);
}
function angryLeave(c, stars, why, msg) {
  S.cur.lost++;
  L.addReview(S, stars, why, c.name);
  toast(msg, true);
  sfx.sad();
  haptic('error');
  R.combo = 0;
  customerLeaves(c, 'angry');
  saveLive();
}

function tick(dt) {
  R.t -= dt;
  const el = Math.min(1, 1 - R.t / R.dayLen);
  if (!R.closing) {
    R.spawnT -= dt;
    if (R.spawnT <= 0) { spawnCustomer(); R.spawnT = L.spawnGap(S, el); }
  }
  if (R.pouring) pourTick(dt);
  R.saveT -= dt;
  if (R.saveT <= 0) { R.saveT = 10; saveLive(); }
  R.slots.forEach(c => {
    if (!serving(c)) return;
    c.pat -= dt;
    const low = c.pat / c.max < 0.25;
    if (low !== c.low) { c.low = low; scene.setImpatient(c.id, low); }
    if (c.pat <= 0) return angryLeave(c, Math.random() < 0.3 ? 2 : 1, 'timeout', c.name + ' chờ lâu quá nên bỏ về');
    const left = c.cups.filter((o, k) => !c.done[k]);
    if (!R.cup.size && left.length && left.every(o => !L.canMake(S, o.drink, o.ice))) angryLeave(c, L.rnd([2, 3]), 'soldout', 'Hết nguyên liệu, ' + c.name + ' ra về');
  });
  if (R.t <= 0 && !R.closing) { R.closing = true; toast('22:00 đóng cửa, làm nốt cho khách đang chờ'); }
  if (R.closing && !R.slots.some(Boolean) && !R.pouring) endDay();
}

/* ---------- chiết espresso ---------- */
function pourTick(dt) {
  const cup = R.cup, { hi, spill } = CFG.shot, g = S.upg.grinder;
  cup.shotP += CFG.shot.rate * (g ? 1.3 : 1) * dt;
  scene.setCup(cup);
  pourSnd(true, cup.shotP / spill);
  const zone = L.shotQuality(cup.shotP, g);
  if (zone !== R.zone) {
    if (zone === 'ok') { sfx.zone(); haptic('select'); }
    else if (zone === 'strong') haptic('tap');
    R.zone = zone;
    $('gauge').className = zone === 'ok' ? 'in' : zone === 'strong' ? 'over' : '';
  }
  if (cup.shotP > spill) {
    stopPour(true);
    scene.burstAt('cup', 'splash', 16, 0x3b2314);
    scene.shake(0.35);
    flash('bad');
    sfx.bad();
    haptic('error');
    spoil();
    toast('Tràn ly! Ly bị đổ bỏ', true);
  } else if (cup.shotP > hi + 0.1 && Math.random() < dt * 6) scene.burstAt('cup', 'splash', 1, 0x3b2314);
}
function stopPour(silent) {
  if (!R.pouring) return;
  R.pouring = false;
  scene.setPour(false);
  pourSnd(false);
  $('gauge').hidden = true;
  if (silent) return;
  const cup = R.cup, q = L.shotQuality(cup.shotP, S.upg.grinder), s = scene.cupScreen();
  cup.shotQ = q;
  scene.bumpCup(0.2);
  if (q === 'ok' && L.shotPerfect(cup.shotP, S.upg.grinder)) {
    floatText(s.x, s.y - 30, 'Hoàn hảo!', 'perfect');
    sfx.perfect();
    haptic('perfect');
    scene.burstAt('cup', 'spark', 14);
    scene.burstAt('cup', 'star', 4);
    scene.punch(0.25);
    flash('good');
  } else if (q === 'ok') {
    floatText(s.x, s.y - 30, 'Shot chuẩn!', 'good');
    sfx.shotOk();
    haptic('primary');
    scene.burstAt('cup', 'spark', 7);
  } else {
    floatText(s.x, s.y - 30, q === 'weak' ? 'Hơi nhạt' : 'Hơi đắng', 'meh');
    sfx.meh();
    haptic('tap');
  }
}

/* ---------- thao tác ở quầy ---------- */
function deny(key, msg) { toast(msg); sfx.meh(); haptic('tap'); scene.press(key, -0.08); }
function takeIng(k, key) {
  if (!L.take(S, k)) { deny(key, 'Hết ' + ING[k].n.toLowerCase() + '! Nhập thêm ở kho ngày mai'); return false; }
  R.cup.cost += ING[k].cost;
  return true;
}
const COMP_KEYS = Object.keys(COMP);
function onStation(key) {
  if (R.mode !== 'sell' || R.paused) return;
  const cup = R.cup;
  if (key === 'cupM' || key === 'cupL') {
    if (cup.size) return deny(key, 'Đang có ly, giao cho khách hoặc bỏ vào thùng rác');
    if (!takeIng('cup', key)) return;
    cup.size = key === 'cupM' ? 'M' : 'L';
    sfx.cup();
    haptic('tap');
    scene.press(key, 0.25);
  } else if (key === 'espresso') {
    if (!cup.size) return deny(key, 'Lấy ly M hoặc L trước');
    if (!cup.comps.includes('shot')) { if (!takeIng('beans', key)) return; cup.comps.push('shot'); }
    R.pouring = true;
    R.zone = null;
    scene.setPour(true);
    scene.press(key, 0.1);
    pourSnd(true, 0);
    haptic('select');
    $('gauge').className = '';
    $('gauge').hidden = false;
  } else if (key === 'trash') {
    if (!cup.size) return deny(key, 'Chưa có ly để đổ');
    scene.burstAt({ station: 'trash' }, 'splash', 10, cup.comps.length ? 0x6b4a36 : 0xdfeaf0);
    sfx.trash();
    haptic('primary');
    scene.press(key, 0.3);
    spoil();
  } else if (key === 'ice') {
    if (!cup.size) return deny(key, 'Lấy ly M hoặc L trước');
    if (cup.ice) return deny(key, 'Ly đã có đá');
    if (!takeIng('ice', key)) return;
    cup.ice = true;
    sfx.ice();
    haptic('tap');
    scene.press(key, 0.2);
  } else {
    if (!compUsable(key)) return deny(key, 'Chưa có món nào dùng ' + COMP[key].n.toLowerCase());
    if (!cup.size) return deny(key, 'Lấy ly M hoặc L trước');
    if (cup.comps.includes(key)) return deny(key, 'Ly đã có ' + COMP[key].n.toLowerCase());
    const ing = COMP[key].ing;
    if (ing && !takeIng(ing, key)) return;
    cup.comps.push(key);
    sfx.pop(COMP_KEYS.indexOf(key) + cup.comps.length);
    haptic('tap');
    scene.press(key, 0.22);
    scene.bumpCup(0.3);
    scene.burstAt('cup', 'splash', 6, COMP[key].color);
    if (key === 'steam' || key === 'water') { scene.burstAt({ station: key }, 'steam', 4); sfx.steam(); } else sfx.splash();
  }
  scene.setCup(cup);
}
function spoil() {
  if (R.cup.size) { S.cur.spoil.n++; S.cur.spoil.v += R.cup.cost; }
  R.cup = L.newCup();
  scene.setCup(R.cup);
}

function onCustomer(id) {
  if (R.mode !== 'sell' || R.paused) return;
  const c = custById(id);
  if (!c || c.leaving) return;
  if (!scene.customerArrived(id)) return toast('Khách chưa tới quầy');
  if (R.focus !== id) { R.focus = id; scene.bounceCustomer(id, 0.12); if (!R.cup.size) { sfx.ui(); haptic('tap'); } }
  if (!R.cup.size || R.pouring) return;
  const cup = R.cup;
  const j = c.cups.findIndex((o, k) => !c.done[k] && L.cupMatches(cup, o));
  if (j < 0) {
    c.wrong++;
    c.pat = Math.max(0.5, c.pat - c.max * 0.3);
    scene.burstAt('cup', 'splash', 12, 0x6b4a36);
    spoil();
    scene.shakeCustomer(id);
    scene.shake(0.45);
    flash('bad');
    sfx.bad();
    haptic('error');
    R.combo = 0;
    const b = bubbleEls.get(id);
    if (b) { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); }
    toast('Sai món! Ly bị đổ bỏ', true);
    return;
  }
  const o = c.cups[j], p = L.priceOf(S, o);
  if (cup.shotQ !== 'ok') c.shotPen++;
  c.done[j] = true;
  S.money += p;
  S.cur.sales += p;
  S.cur.served++;
  const left = c.done.filter(x => !x).length;
  let st = null, tip = 0;
  if (!left) {
    st = L.stars(S, c);
    tip = L.tipFor(S, c);
    S.money += tip;
    S.cur.tips += tip;
    L.addReview(S, st.s, st.why, c.name);
    c.leaving = true;
    removeBubble(c.id);
  }
  R.cup = L.newCup();
  scene.setCup(R.cup);
  saveLive();
  sfx.whoosh();
  haptic('select');
  scene.serveFx(id, hex(DRINKS[o.drink].c), () => serveImpact(c, p, tip, st, left));
}
// Khoảnh khắc chạm: ly vừa tới tay khách. Mọi phản hồi dồn vào đây, không phải lúc bấm.
function serveImpact(c, p, tip, st, left) {
  const hp = scene.headScreen(c.id) || { x: innerWidth / 2, y: innerHeight / 3 };
  const big = st && st.s >= 5;
  sfx.coin(R.combo);
  haptic(big ? 'reward' : 'primary');
  scene.burstAt({ cust: c.id }, 'coin', left ? 4 : 7);
  scene.burstAt({ cust: c.id }, 'spark', 8);
  scene.punch(big ? 0.45 : 0.22);
  floatText(hp.x, hp.y - 8, `+${fmt(p + tip)}`, 'money');
  coinFly(hp.x, hp.y, left ? 2 : 4);
  if (left) { floatText(hp.x, hp.y - 40, `còn ${left} ly`, 'good small'); return; }
  floatText(hp.x, hp.y - 44, starsHTML(st.s, 'fly'), 'starsrow');
  if (big) {
    R.combo++;
    R.freeze = 0.07;
    setTimeout(sfx.star, 140);
    scene.burstAt({ cust: c.id, head: true }, 'confetti', 16);
    scene.burstAt({ cust: c.id, head: true }, 'star', 5);
    if (R.combo >= 2) showCombo();
  } else {
    if (R.combo >= 2) hideCombo(true);
    R.combo = 0;
    if (st.s <= 2) sfx.meh();
  }
  setTimeout(() => customerLeaves(c, st.s >= 4 ? 'happy' : 'meh'), 350);
}
function showCombo() {
  const el = $('combo');
  el.innerHTML = `${ICON.flame}<b>Chuỗi ${R.combo}</b><small>khách 5 sao liên tiếp</small>`;
  el.hidden = false;
  punchEl(el);
  sfx.combo(R.combo);
  if (R.combo % 5 === 0) { const [x, y] = centerOf(el); domBurst(x, y, 24); haptic('heavy'); }
}
function hideCombo(broke) {
  const el = $('combo');
  if (el.hidden) return;
  if (broke) toast('Mất chuỗi ' + R.combo + ' khách 5 sao');
  el.hidden = true;
}

/* ---------- lớp phủ: nhãn trạm, bong bóng khách, thanh chiết ---------- */
const labelEls = {};
const LABEL = { cupM: 'Ly M', cupL: 'Ly L', espresso: 'Espresso (giữ)', trash: 'Đổ ly', condensed: 'Sữa đặc', milk: 'Sữa tươi', steam: 'Sữa nóng', water: 'Nước nóng', ice: 'Đá', caramel: 'Caramel', saltcream: 'Kem muối' };
const LABEL_ING = { cupL: 'cup', espresso: 'beans', condensed: 'condensed', milk: 'milk', steam: 'milk', ice: 'ice', caramel: 'caramel', saltcream: 'saltcream' };
function labels(refreshText) {
  scene.stationKeys.forEach(k => {
    let el = labelEls[k];
    if (!el) { el = labelEls[k] = document.createElement('div'); el.className = 'lbl'; $('labels').appendChild(el); refreshText = true; }
    if (refreshText) {
      const ing = LABEL_ING[k], on = !COMP[k] || compUsable(k);
      const txt = LABEL[k] + (ing && on ? ` · ${L.qty(S, ing)}` : '');
      if (el._t !== txt) { el._t = txt; el.textContent = txt; }
      el.classList.toggle('off', !on);
      el.classList.toggle('empty', !!ing && on && !L.qty(S, ing));
    }
    const p = scene.stationScreen(k);
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, ${p.above ? '-50%' : '2px'})`;
  });
}
const bubbleEls = new Map();
function clearBubbles() { bubbleEls.forEach(el => el.remove()); bubbleEls.clear(); }
function removeBubble(id) {
  const el = bubbleEls.get(id);
  if (!el) return;
  bubbleEls.delete(id);
  el.classList.add('bye');
  setTimeout(() => el.remove(), 220);
}
function bubbles(focus) {
  R.slots.forEach(c => {
    if (!c || c.leaving) return;
    let el = bubbleEls.get(c.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'bub';
      el.onpointerdown = e => { e.stopPropagation(); unlock(); onCustomer(c.id); };
      $('bubbles').appendChild(el);
      bubbleEls.set(c.id, el);
    }
    const arrived = scene.customerArrived(c.id), p = scene.headScreen(c.id);
    if (arrived && !el._arr) { el._arr = true; el.classList.add('arrive'); }
    const o = curOrder(c), n = c.cups.length, k = c.done.indexOf(false) + 1;
    const key = `${c.id}|${k}|${o.drink}|${o.size}|${o.ice}`;
    if (el._k !== key) {
      el._k = key;
      el.innerHTML = `<div class="ic">${drinkIcon(o)}${o.size === 'L' ? '<span class="sz">L</span>' : ''}</div><div class="tx"><small>${esc(c.name)}${n > 1 ? ` · ly ${k}/${n}` : ''}</small><b>${DRINKS[o.drink].s}</b></div><div class="pat"><i></i></div>`;
      if (k > 1) { el.classList.remove('next'); void el.offsetWidth; el.classList.add('next'); }
    }
    const r = Math.max(0, c.pat / c.max);
    const bar = el.querySelector('.pat i');
    bar.style.transform = `scaleX(${r.toFixed(3)})`;
    bar.style.background = r > 0.5 ? '#4fa883' : r > 0.25 ? '#f0b43c' : '#e2574c';
    el.classList.toggle('focus', !!focus && focus.id === c.id);
    el.classList.toggle('low', r < 0.25);
    el.classList.toggle('walking', !arrived);
    if (p) el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
  });
}
function gauge() {
  if ($('gauge').hidden) return;
  const p = scene.machineScreen(), { lo, hi, spill } = CFG.shot, w = S.upg.grinder ? 0.04 : 0;
  const g = $('gauge');
  g.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(0, -50%)`;
  const band = g.querySelector('.band');
  band.style.bottom = ((lo - w) / spill * 100) + '%';
  band.style.height = ((hi - lo + 2 * w) / spill * 100) + '%';
  g.querySelector('.fill').style.transform = `scaleY(${Math.min(1, R.cup.shotP / spill).toFixed(3)})`;
}
function panel(focus) {
  const o = focus ? curOrder(focus) : null, cup = R.cup;
  const d = cup.size ? L.identifyDrink(cup) : null;
  const now = cup.size ? `Ly ${cup.size}: ${cup.comps.length ? cup.comps.map(c => COMP[c].s).join(' + ') : 'trống'}${cup.ice ? ' + Đá' : ''}${d ? ` → ${DRINKS[d].n}` : ''}` : 'Chưa lấy ly';
  const step = o ? L.nextStep(cup, o) : { key: null, text: R.closing ? 'Đã đóng cửa' : 'Chờ khách tới quầy…' };
  scene.setHighlight(opts.guide !== false && !R.pouring ? step.key : null);
  const html = `<div class="hint">${esc(step.text)}</div><div class="now">${esc(now)}</div>`;
  const pn = $('panel');
  if (pn._h !== html) {
    const changed = pn._hint !== step.text;
    pn._h = html;
    pn._hint = step.text;
    pn.innerHTML = html;
    if (changed) { pn.classList.remove('bump'); void pn.offsetWidth; pn.classList.add('bump'); }
  }
}

/* ================= CUỐI NGÀY ================= */
function endDay() {
  R.mode = 'summary';
  stopPour(true);
  clearBubbles();
  hideCombo(false);
  scene.setHighlight(null);
  sfx.day();
  haptic('reward');
  const res = L.endDay(S);
  const r = res.rec, avg = r.stars.length ? r.stars.reduce((a, b) => a + b, 0) / r.stars.length : 0;
  delete S.dayT;
  save();
  if (!res.broke) SV.rotateBackups(S);
  const wv = r.waste.reduce((a, x) => a + x.v, 0);
  const e = L.ev(S);
  modal(`<h2>${res.broke ? 'Phá sản' : 'Hết ngày ' + r.day}</h2>
    <div class="kpis"><div><b data-c="${r.served}">0</b>ly bán</div><div><b data-c="${r.lost}">0</b>khách mất</div><div><b>${avg ? avg.toFixed(1).replace('.', ',') : '–'}</b>sao</div></div>
    ${avg ? `<div class="sum-stars">${starsHTML(Math.round(avg), 'big')}</div>` : ''}
    <div class="ledger">
      <div><span>Tiền bán</span><span data-m="${r.sales}" data-s="+">+0k</span></div>
      <div><span>Tip</span><span data-m="${r.tips}" data-s="+">+0k</span></div>
      <div><span>Nhập hàng</span><span>−${fmt(r.buy)}</span></div>
      ${r.upgrades ? `<div><span>Mở món, nâng cấp</span><span>−${fmt(r.upgrades)}</span></div>` : ''}
      <div><span>Mặt bằng + điện nước</span><span>−${fmt(r.rent + r.util)}</span></div>
      ${r.spoil.n ? `<div class="sub"><span>${r.spoil.n} ly hỏng (đã tính trong nhập hàng)</span><span>${fmt(r.spoil.v)}</span></div>` : ''}
      ${wv ? `<div class="sub"><span>Hết hạn đổ bỏ: ${r.waste.map(x => ING[x.k].n + ' ' + x.q).join(', ')}</span><span>${fmt(wv)}</span></div>` : ''}
      <div class="tot profit"><span>Lãi</span><span class="${res.profit < 0 ? 'neg' : 'pos'}">${res.profit < 0 ? '−' : '+'}${fmt(Math.abs(res.profit))}</span></div>
      <div class="tot"><span>Két</span><span>${fmt(S.money)}</span></div>
    </div>
    ${res.broke ? `<p>Quán trụ được ${S.best} ngày.</p>` : e ? `<p class="evn">Ngày mai: <b>${EVENTS[e.id].n}</b>. ${esc(L.evText(S, e))}</p>` : ''}`,
  [[res.broke ? 'Mở quán mới' : `Ngày ${S.day} ➜`, () => {
    if (res.broke) { const n = S.shopName; S = L.freshState(); S.shopName = n; save(); R.disp = S.money; }
    R.tab = 'kho';
    R.animSheet = true;
    R.animPane = true;
    renderPrep();
  }, 1]], 'summary');
  const card = $('card');
  card.querySelectorAll('[data-c]').forEach(b => countUp(b, +b.dataset.c, v => Math.round(v)));
  card.querySelectorAll('[data-m]').forEach(b => countUp(b, +b.dataset.m, v => b.dataset.s + fmt(v), 900));
  card.querySelectorAll('.sum-stars i').forEach((s, i) => { s.style.animationDelay = (0.35 + i * 0.12) + 's'; });
  setTimeout(() => {
    const pr = card.querySelector('.profit');
    if (!pr || $('modal').hidden) return;
    pr.classList.add('pop');
    if (res.profit > 0) { const [x, y] = centerOf(pr); domBurst(x, y, 22); sfx.star(); haptic('reward'); } else sfx.sad();
  }, 1000);
  hud();
}

/* ---------- tạm dừng, cài đặt ---------- */
function pause() {
  if (R.mode !== 'sell' || R.paused) return;
  R.paused = true;
  stopPour(true);
  saveLive();
  modal('<h2>Tạm dừng</h2>', [['Cài đặt', () => settings(() => { R.paused = false; pause(); })], ['Đóng cửa sớm', () => { R.slots.forEach(c => { if (c && !c.leaving) { S.cur.lost++; customerLeaves(c, 'meh'); } }); R.paused = false; R.t = 0; R.closing = true; }], ['Chơi tiếp', () => { R.paused = false; }, 1]]);
}
function settings(back) {
  const onOff = v => v ? 'Bật' : 'Tắt';
  modal(`<h2>Cài đặt</h2>
    <div class="set"><button data-tap data-o="sound"><span>Âm thanh</span><b class="${opts.sound ? 'on' : ''}">${onOff(opts.sound)}</b></button>
    <button data-tap data-o="haptic"><span>Rung khi chạm</span><b class="${opts.haptic ? 'on' : ''}">${onOff(opts.haptic)}</b></button>
    <button data-tap data-o="guide"><span>Vòng sáng chỉ dẫn</span><b class="${opts.guide !== false ? 'on' : ''}">${onOff(opts.guide !== false)}</b></button></div>
    <p class="muted small">Máy bật "giảm chuyển động" thì rung lắc màn hình tự dịu đi, âm thanh và rung vẫn giữ.</p>`,
  // Khôi phục và chơi lại chỉ có ở màn chuẩn bị: làm giữa ngày thì khách và ly đang pha bị bỏ dở.
  [...(R.mode === 'prep' ? [
    ['Khôi phục bản tự lưu', () => restoreDlg(() => settings(back))],
    ['Chơi lại từ đầu', () => modal('<h2>Xoá quán và chơi lại?</h2><p>Mọi tiến trình sẽ mất.</p>', [['Huỷ', () => settings(back)], ['Xoá và chơi lại', () => applyState(L.freshState(), 'Đã mở quán mới'), 1]])],
  ] : []), ['Xong', back || (() => {}), 1]]);
  $('card').querySelectorAll('[data-o]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.o;
      opts[k] = k === 'guide' ? opts.guide === false : !opts[k];
      saveOpts();
      if (k === 'sound') setMuted(!opts.sound);
      if (k === 'haptic' && opts.haptic) haptic('primary');
      const on = k === 'guide' ? opts.guide !== false : opts[k];
      const t = b.querySelector('b');
      t.textContent = onOff(on);
      t.classList.toggle('on', on);
      punchEl(t);
    };
  });
}
$('pauseBtn').innerHTML = ICON.pause;
$('setBtn').innerHTML = ICON.gear;
$('hCoin').innerHTML = ICON.coin;
$('hStarBg').innerHTML = ICON.star.repeat(5);
$('hStarFill').innerHTML = ICON.star.repeat(5);
$('pauseBtn').onclick = pause;
$('setBtn').onclick = () => { if (R.mode === 'sell') { if (R.paused) return; R.paused = true; stopPour(true); settings(() => { R.paused = false; }); } else if (R.mode === 'prep') settings(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); saveLive(); } });
window.addEventListener('pagehide', () => saveLive());
window.addEventListener('resize', () => { scene.resize(); labels(true); });
document.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- màn mở ---------- */
/* ---------- lưu trữ: cảnh báo, khôi phục, bán tiếp ---------- */
function applyState(d, msg) {
  const n = S.shopName;
  S = hydrate(d);
  if (!S.shopName) S.shopName = n;
  delete S.dayT;
  save();
  R.disp = S.money; R.plan = {}; R.tab = 'kho'; R.animSheet = true; R.animPane = true;
  renderPrep();
  toast(msg);
}
function storeWarn(next) {
  modal(`<h2>Máy đang chặn lưu tiến trình</h2><p>Game vẫn chạy, nhưng <b>tắt trang là mất hết</b>, mở lại sẽ về ngày 1.</p>
    <ul class="how"><li><b>iPhone:</b> Cài đặt › Safari › tắt <b>Chặn tất cả cookie</b>.</li><li>Không mở game trong <b>tab ẩn danh</b>.</li><li>Kiểm tra bộ nhớ máy còn trống.</li></ul>`, [['Đã hiểu', next, 1]], 'warnc');
}
function restoreDlg(back) {
  const list = SV.listBackups();
  if (!list.length) return modal('<h2>Chưa có bản tự lưu</h2><p>Game tự lưu 3 cuối ngày gần nhất. Bán hết một ngày là có bản đầu tiên.</p>', [['Quay lại', back, 1]]);
  modal(`<h2>Khôi phục bản tự lưu</h2><p>Chọn bản muốn lấy lại. Tiến trình hiện tại (ngày ${S.day}) sẽ bị thay thế.</p>`,
    [...list.map(b => [`${b.label}: ngày ${b.data.day} · ${fmt(b.data.money)}`, () => modal(`<h2>Lấy lại bản này?</h2><p><b>${esc(b.data.shopName || 'Quán Cà Phê Nhỏ')}</b> · Ngày ${b.data.day} · ${fmt(b.data.money)}</p>`, [['Huỷ', () => restoreDlg(back)], ['Khôi phục', () => applyState(b.data, 'Đã khôi phục ngày ' + b.data.day), 1]])]), ['Quay lại', back]]);
}
function corruptDlg(next) {
  const has = SV.listBackups().length > 0;
  modal(`<h2>Không đọc được tiến trình cũ</h2><p>Bản lưu trong máy bị lỗi nên game mở quán mới. Bản cũ vẫn được cất riêng, không bị xoá.</p>${has ? '<p>Bạn có thể lấy lại một bản tự lưu cuối ngày.</p>' : ''}`,
    [...(has ? [['Khôi phục bản tự lưu', () => restoreDlg(() => corruptDlg(next)), 1]] : []), ['Chơi quán mới', next, !has]]);
}
// Mở lại giữa ngày thì chỉ có một lối: bán tiếp. Không cho chơi lại ngày đó từ đầu.
function resumeDlg() {
  modal(`<h2>Ngày ${S.day} đang bán dở</h2><p>Quán mở lại lúc <b>${clockOf(S.dayT)}</b>. Tiền, kho và đánh giá tới lúc đó vẫn còn nguyên; khách đang chờ lúc tắt trang đã ra về.</p>`, [['Bán tiếp', () => startDay(true), 1]]);
}
function bootChecks() {
  const steps = [];
  if (loaded.status === 'corrupt') steps.push(corruptDlg);
  if (!SV.storageOk()) { R.noStoreWarned = true; steps.push(storeWarn); }
  if (S.dayT != null) steps.push(resumeDlg);
  const run = () => { const f = steps.shift(); if (f) f(run); };
  run();
}

function splash() {
  const sp = $('splash');
  sp.querySelector('.logo').innerHTML = drinkIcon({ drink: 'sua', ice: true });
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    unlock();
    sfx.uiPrimary();
    haptic('primary');
    sp.classList.add('out');
    setTimeout(() => { sp.hidden = true; bootChecks(); }, 450);
    scene.punch(0.5);
  };
  sp.addEventListener('pointerdown', go, { once: true });
  setTimeout(go, 12000);
}

/* ---------- vòng lặp ---------- */
let last = performance.now(), textT = 0;
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let dt = realDt;
  if (R.freeze > 0) { R.freeze -= realDt; dt = 0; }
  if (R.mode === 'sell' && !R.paused) tick(dt);
  scene.update(R.paused ? 0 : dt, realDt);
  scene.render();
  R.disp += (S.money - R.disp) * (1 - Math.exp(-realDt * 9));
  if (Math.abs(S.money - R.disp) < 50) R.disp = S.money;
  textT -= realDt;
  labels(textT <= 0);
  if (textT <= 0) textT = 0.25;
  if (R.mode === 'sell') { const f = focusCust(); bubbles(f); panel(f); gauge(); }
  hud();
  requestAnimationFrame(frame);
}

export function boot() {
  SV.requestPersist();
  document.title = S.shopName || 'Quán Cà Phê Nhỏ';
  // Biển hiệu vẽ bằng phông Baloo 2: vẽ lại khi phông tải xong, không thì chữ ra phông hệ thống.
  if (document.fonts) document.fonts.load('800 100px "Baloo 2"').then(() => scene.setSign(S.shopName, S.upg.sign, 'redraw')).catch(() => {});
  renderPrep();
  labels(true);
  splash();
  requestAnimationFrame(frame);
  window.__game = { S: () => S, R, startDay, onStation, onCustomer, stopPour, endDay };
}
