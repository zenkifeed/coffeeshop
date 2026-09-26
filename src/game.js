// Điều phối: vòng mô phỏng, thanh trên, nhãn trạm, bảng trượt (trạm, nâng cấp, nhiệm vụ, quán),
// chuyển quán, tiền lúc vắng mặt, lưu và hướng dẫn. Luật chơi nằm ở logic.js, phần vẽ 3D ở scene.js.
import { CFG, SHOPS, BEARS } from './data.js';
import * as L from './logic.js';
import { createScene } from './scene.js';
import { sfx, unlock as audioUnlock, setSfx, pauseAudio } from './audio.js';
import { Music } from './music.js';
import { opts, saveOpts, haptic } from './feel.js';
import * as SV from './save.js';
import { Coach } from './coach.js';
import { Cloud, sameProgress, isFresh, authStep } from './cloud.js';
import { $, esc, ICON, bearIcon, drinkIcon, starsHTML, toast, floatText, flash, punchEl, retrigger, centerOf, coinFly, domBurst, countUp, modal, modalOpen } from './ui.js';

const fmt = L.fmt;
const hex = c => parseInt(c.slice(1), 16);
const num1 = n => n.toFixed(1).replace('.', ',');
const MODES = [[1, 'x1'], [10, 'x10'], ['ms', 'Tới mốc'], ['max', 'Tối đa']];

const loaded = SV.readSave();
// Mốc lần cuối quán còn chạy, lấy trước khi vòng lặp kịp lưu đè, để tính tiền lúc vắng mặt.
const bootAt = loaded.data && loaded.data.at;
let S = hydrate(loaded.data, loaded.legacy);
let W = L.newWorld(S);
const R = { sheet: null, disp: S.money, rateV: 0, saveT: 10, bakT: CFG.backupEvery, uiT: 0, paused: false, hiddenAt: 0, hold: null, noStoreWarned: false, legacy: loaded.legacy, sheetKey: '' };
if (!MODES.some(m => m[0] === opts.buy)) opts.buy = 1;

const scene = createScene($('c'), {
  onTap: p => {
    audioUnlock();
    if (p.station) { openSheet('station', p.station); sfx.ui(); haptic('tap'); }
    else if (p.staff != null) {
      // chạm vào gấu: gấu vẫy chào, bắn tim nhỏ
      scene.emote({ staff: p.staff }, 'wave');
      scene.burstAt({ staff: p.staff, head: true }, 'heart', 2);
      sfx.boop();
      haptic('tap');
    } else if (p.cust != null) { scene.emote({ cust: p.cust }, 'wave'); sfx.boop(); }
  },
});
setSfx(opts.sound);
// Nhạc nền mặc định bật; chỉ tắt khi người chơi đã tắt trong Cài đặt.
const musicOn = () => opts.music !== false;

/* ---------- lưu ---------- */
// Trộn bản lưu với trạng thái mặc định để bản lưu cũ thiếu trường mới vẫn chạy.
function hydrate(d, legacy) {
  if (!d) { const s = L.freshState(); if (legacy) s.shopName = legacy.shopName; return s; }
  d = L.migrate(d);   // bản lưu thang tiền cũ: chia tiền cho 1.000
  const shop =Math.max(0, Math.min(SHOPS.length - 1, d.shop | 0)), f = L.freshState(shop);
  const s = { ...f, ...d, shop, st: { ...f.st, ...d.st }, upg: { ...d.upg }, claimed: { ...d.claimed }, life: { ...f.life, ...d.life }, ftue: { ...L.newFtue(), ...d.ftue } };
  if (!Number.isFinite(s.money) || s.money < 0) s.money = 0;
  return s;
}
function save() {
  S.at = Date.now();
  const ok = SV.writeSave(S);
  if (!ok && !R.noStoreWarned) { R.noStoreWarned = true; storeWarn(() => {}); }
  return ok;
}

/* ---------- phản hồi chung ---------- */
// Sàn phản hồi: một bộ nghe duy nhất cho mọi nút, để không nút nào câm.
document.addEventListener('pointerdown', e => {
  if (e.button) return;
  audioUnlock();
  const el = e.target.closest && e.target.closest('button, [data-tap]');
  if (!el || el.disabled || el.hasAttribute('data-quiet')) return;
  if (el.classList.contains('dis')) { sfx.meh(); haptic('error'); return; }
  const primary = el.classList.contains('big') || el.classList.contains('pri');
  (primary ? sfx.uiPrimary : sfx.ui)();
  haptic(primary ? 'primary' : 'tap');
}, { capture: true, passive: true });
// Thiếu tiền thì không khoá chết: nói thiếu bao nhiêu và tiền tới từ đâu.
function deny(msg) { toast(msg, true); sfx.meh(); haptic('error'); }
const short = cost => `Thiếu ${fmt(cost - S.money)}. Khách vẫn đang trả tiền, chờ chút nhé`;

/* ---------- quán hiện tại: cảnh, biển hiệu, nhãn trạm ---------- */
const shop = () => L.shopOf(S);
function applyShop() {
  scene.setShop(shop());
  syncStations();
  scene.setSign(S.shopName, 'Chi nhánh ' + shop().n, S.upg.sign);
  buildLabels();
  clearBubbles();
  document.title = (S.shopName || 'Quán Cà Phê Nhỏ') + ' · ' + shop().n;
  $('hShop').textContent = S.shopName || 'Quán Cà Phê Nhỏ';
  $('hLoc').textContent = 'Chi nhánh ' + shop().n;
}
function syncStations() { shop().stations.forEach(s => scene.setStationLocked(s.id, !L.lvOf(S, s.id))); }
const colorOf = st => { const d = L.stDef(S, st); return d ? hex(d.c) : 0x8a5a3b; };

const labelEls = new Map();
function buildLabels() {
  $('labels').innerHTML = '';
  labelEls.clear();
  shop().stations.forEach(s => {
    const el = document.createElement('button');
    el.className = 'lbl';
    el.onclick = () => openSheet('station', s.id);
    $('labels').appendChild(el);
    labelEls.set(s.id, el);
  });
  labelText();
}
// Nội dung nhãn đổi chậm (mỗi 0,2 giây); vị trí và thanh pha cập nhật mỗi khung hình.
function labelText() {
  const next = L.nextLocked(S);
  shop().stations.forEach(s => {
    const el = labelEls.get(s.id), lv = L.lvOf(S, s.id);
    let key, html, cls;
    if (lv) {
      const b = L.bulk(S, s.id, 1), can = b.n && S.money >= b.cost;
      key = `u${lv}|${can}`;
      const st = L.starsAt(lv);
      html = `<b>Cấp ${lv}</b>${st ? `<span class="st">${ICON.star}${st}</span>` : ''}${can ? `<i class="up">${ICON.up}</i>` : ''}<span class="bar"><i></i></span>`;
      cls = 'lbl' + (can ? ' can' : '');
    } else if (next && next.id === s.id) {
      const can = S.money >= s.unlock;
      key = `n${can}`;
      html = `<i class="lk">${ICON.lock}</i><b>${fmt(s.unlock)}</b>`;
      cls = 'lbl lock' + (can ? ' can' : '');
    } else { key = 'far'; html = `<i class="lk">${ICON.lock}</i>`; cls = 'lbl lock far'; }
    if (el._k !== key) { el._k = key; el.innerHTML = html; el.className = cls; el._bar = el.querySelector('.bar i'); }
  });
}
function labelPos() {
  labelEls.forEach((el, id) => {
    const p = scene.stationScreen(id);
    if (!p) return;
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, calc(-100% - 2px))`;
    if (el._bar) { const b = L.brewProgress(W, id); el._bar.style.transform = `scaleX(${Math.max(0, b).toFixed(3)})`; el._bar.parentElement.classList.toggle('on', b >= 0); }
  });
}

/* ---------- bong bóng món khách gọi ---------- */
const bubbleEls = new Map();
function clearBubbles() { bubbleEls.forEach(el => el.remove()); bubbleEls.clear(); }
function bubbles() {
  const alive = new Set();
  for (const c of W.cust) {
    if (c.state !== 'wait') continue;
    alive.add(c.id);
    let el = bubbleEls.get(c.id);
    if (!el) {
      const d = L.stDef(S, c.st);
      el = document.createElement('div');
      el.className = 'bub';
      el.innerHTML = drinkIcon(d.c, d.ice);
      $('bubbles').appendChild(el);
      bubbleEls.set(c.id, el);
    }
    el.classList.toggle('taken', !!c.who);
    const p = scene.headScreen(c.id);
    if (p) el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
  }
  bubbleEls.forEach((el, id) => {
    if (alive.has(id)) return;
    bubbleEls.delete(id);
    el.classList.add('bye');
    setTimeout(() => el.remove(), 220);
  });
}

/* ---------- sự kiện từ mô phỏng ---------- */
// Tiếng máy chạy tự động (người chơi không bấm): mỗi loại tối đa một tiếng trong 0,12 giây để nhiều máy cùng chạy không ồn.
const sfxAt = {};
function sfxOk(k) { const n = performance.now(); if (n - (sfxAt[k] || 0) < 120) return false; sfxAt[k] = n; return true; }
function handle(ev) {
  for (const e of ev) {
    if (e.k === 'serve') {
      const hp = e.c && scene.headScreen(e.c.id);
      if (hp) { floatText(hp.x, hp.y - 4, '+' + fmt(e.amt), 'money sm'); coinFly(hp.x, hp.y, 1, true); }
      scene.emote({ staff: e.s.id }, 'serve');
      if (e.c) { scene.burstAt({ cust: e.c.id }, 'coin', 3); scene.emote({ cust: e.c.id }, 'love'); scene.burstAt({ cust: e.c.id, head: true }, 'heart', 2); }
      sfx.cash();
    } else if (e.k === 'brew') { if (sfxOk('brew')) sfx.brew(L.stDef(S, e.st).prop); }
    else if (e.k === 'ready') { if (sfxOk('ready')) sfx.ding(L.stIndex(S, e.st)); }
    else if (e.k === 'order') {
      // khách vừa tới quầy: một bạn gấu đang rảnh vẫy tay chào
      const idle = W.staff.filter(s => s.state === 'idle');
      if (idle.length && Math.random() < 0.6) scene.emote({ staff: idle[Math.floor(Math.random() * idle.length)].id }, 'wave');
    }
    else if (e.k === 'hire') {
      // người mới chỉ có trong cảnh sau lần đồng bộ kế tiếp
      const b = BEARS[W.staff.indexOf(e.s) % BEARS.length];
      setTimeout(() => { scene.emote({ staff: e.s.id }, 'cheer', { spin: true }); scene.burstAt({ staff: e.s.id, head: true }, 'confetti', 16); scene.burstAt({ staff: e.s.id, head: true }, 'heart', 4); }, 40);
      sfx.bell();
      toast(`<b>${b.n}</b> đã vào ca!`);
    }
  }
}

/* ---------- thanh trên, dòng nhiệm vụ, thanh dưới ---------- */
function hud() {
  const m = R.disp;
  const t = fmt(m);
  if ($('hMoney')._t !== t) { $('hMoney')._t = t; $('hMoney').textContent = t; }
}
function slowUi() {
  R.rateV = L.rate(S);
  $('hRate').textContent = `+${fmt(R.rateV)}/giây`;
  const ready = L.tasksClaimable(S), canUpg = L.upgList(S).some(u => S.money >= u.cost);
  badge($('navTask'), ready || (L.canMove(S) ? '!' : 0));
  badge($('navUpg'), canUpg ? '!' : 0);
  goal();
  labelText();
  tickSheet();
}
function badge(el, v) {
  const b = el.querySelector('.bdg'), s = v ? String(v) : '';
  if (b.textContent !== s) { b.textContent = s; b.hidden = !v; if (v) retrigger(b, 'punch'); }
}
function goal() {
  const g = L.nextGoal(S), el = $('goal');
  let key, html;
  if (!g) {
    if (L.canMove(S)) { key = 'move'; html = `<i>${ICON.shop}</i><span>Sẵn sàng chuyển sang <b>${esc(SHOPS[S.shop + 1].n)}</b></span><b class="go">➜</b>`; }
    else { key = 'none'; html = ''; }
  } else if (g.done) { key = 'claim' + g.i; html = `<i>${ICON.gift}</i><span>${esc(g.text)}</span><b class="claim">Nhận thưởng</b>`; }
  else { key = `t${g.i}|${g.cur}`; html = `<i>${ICON.list}</i><span>${esc(g.text)}</span><b>${g.need > 1 ? `${g.cur}/${g.need}` : ''}</b>`; }
  if (el._k === key) return;
  const changed = el._k != null && el._k.split('|')[0] !== key.split('|')[0];
  el._k = key;
  el.innerHTML = html;
  el.hidden = !html;
  el.classList.toggle('ready', key.startsWith('claim') || key === 'move');
  if (changed) retrigger(el, 'pop');
}

/* ---------- bảng trượt ---------- */
function openSheet(kind, id) {
  if (modalOpen()) return;
  const was = R.sheet;
  R.sheet = { kind, id };
  renderSheet();
  $('sheet').hidden = false;
  if (!was) { retrigger($('sheetCard'), 'enter'); sfx.sheet(); }
}
function closeSheet() {
  stopHold();
  R.sheet = null;
  $('sheet').hidden = true;
}
$('sheet').addEventListener('pointerdown', e => { if (e.target === $('sheet')) closeSheet(); });
const head = (ic, title, sub, extra = '') => `<div class="sh-h"><span class="sh-ic">${ic}</span><div class="sh-t"><h3>${title}</h3><small>${sub}</small></div>${extra}<button class="x" data-close aria-label="Đóng">✕</button></div>`;
// Khoá của bảng: đổi thì dựng lại, không đổi thì chỉ cập nhật số (để không phá nút đang giữ).
function sheetKey() {
  const s = R.sheet;
  if (!s) return '';
  if (s.kind === 'station') { const n = L.nextLocked(S); return `st|${s.id}|${L.lvOf(S, s.id) > 0}|${n && n.id}`; }
  if (s.kind === 'upg') return 'upg|' + Object.keys(S.upg).join();
  if (s.kind === 'tasks') return 'tasks|' + L.tasks(S).map(t => +t.done + +t.claimed * 2).join('') + L.canMove(S);
  return 'shop|' + S.shopName;
}
function renderSheet() {
  const s = R.sheet, card = $('sheetCard');
  card.className = 'sheet-card ' + s.kind;
  card.innerHTML = ({ station: sheetStation, upg: sheetUpg, tasks: sheetTasks, shop: sheetShop })[s.kind]();
  card.querySelectorAll('[data-close]').forEach(b => { b.onclick = closeSheet; });
  ({ station: bindStation, upg: bindUpg, tasks: bindTasks, shop: bindShop })[s.kind]();
  R.sheetKey = sheetKey();
}
function tickSheet() {
  if (!R.sheet) return;
  if (sheetKey() !== R.sheetKey) renderSheet();
  else if (R.sheet.kind === 'station') updStation();
  else if (R.sheet.kind === 'upg') $('sheetCard').querySelectorAll('[data-u]').forEach(b => b.classList.toggle('dis', S.money < L.upgDef(S, b.dataset.u).cost));
}

/* ----- bảng trạm: nâng cấp theo lô, giữ nút để nâng liên tục ----- */
function sheetStation() {
  const d = L.stDef(S, R.sheet.id), lv = L.lvOf(S, d.id), icon = drinkIcon(d.c, d.ice);
  if (!lv) {
    const n = L.nextLocked(S), idx = L.stIndex(S, d.id), prev = shop().stations[idx - 1];
    const act = n && n.id === d.id
      ? `<button class="big buy${S.money < d.unlock ? ' dis' : ''}" id="stUnlock" data-quiet>Mở trạm · ${fmt(d.unlock)}</button>`
      : `<p class="note">${ICON.lock} Mở trạm <b>${esc(prev.n)}</b> trước đã</p>`;
    return head(icon, esc(d.n), 'Trạm chưa mở') +
      `<div class="stats"><div><small>Mỗi ly ở cấp 1</small><b>${fmt(d.price)}</b></div><div><small>Pha một ly</small><b>${num1(d.time / L.derived(S).prep)} giây</b></div></div>
       <p class="muted small">Mở xong, khách bắt đầu gọi thêm món này. Trạm sau bán đắt hơn trạm trước.</p>${act}`;
  }
  return head(icon, esc(d.n), `<span id="stLv"></span>`) +
    `<div class="ms"><div class="ms-top"><span id="stStars">${starsHTML(0)}</span><small id="stMsTx"></small></div><div class="ms-bar"><i id="stMsBar"></i></div></div>
     <div class="stats"><div><small>Mỗi ly</small><b id="stP"></b><em id="stPn"></em></div><div><small>Pha một ly</small><b id="stT"></b></div><div><small>Pha cùng lúc</small><b id="stC"></b></div></div>
     <div class="seg">${MODES.map(([m, t]) => `<button data-m="${m}" class="${opts.buy === m ? 'on' : ''}">${t}</button>`).join('')}</div>
     <button class="big buy" id="stBuy" data-quiet><span id="stBuyT"></span><small id="stBuyC"></small></button>`;
}
function updStation() {
  const id = R.sheet.id, lv = L.lvOf(S, id);
  if (!lv || !$('stBuy')) { const u = $('stUnlock'); if (u) u.classList.toggle('dis', S.money < L.stDef(S, id).unlock); return; }
  const D = L.derived(S), b = L.bulk(S, id, opts.buy), nm = L.nextMs(lv), pm = L.prevMs(lv);
  $('stLv').textContent = `Cấp ${lv}/${CFG.maxLv}`;
  $('stStars').querySelectorAll('i').forEach((s, i) => s.classList.toggle('on', i < L.starsAt(lv)));
  $('stMsTx').textContent = nm ? `Cấp ${nm}: tiền mỗi ly ×2${CFG.capAt.includes(nm) ? ', thêm một chỗ pha' : ''}` : 'Đã lên cấp tối đa';
  $('stMsBar').style.transform = `scaleX(${nm ? ((lv - pm) / (nm - pm)).toFixed(3) : 1})`;
  $('stP').textContent = fmt(L.profitOf(S, id, lv, D));
  $('stPn').textContent = b.n ? '→ ' + fmt(L.profitOf(S, id, lv + b.n, D)) : '';
  $('stT').textContent = num1(L.prepOf(S, id, D)) + ' giây';
  $('stC').textContent = L.capAt(lv) + ' bạn gấu';
  $('stBuyT').textContent = b.n ? `Nâng +${b.n} cấp` : 'Đã tối đa';
  $('stBuyC').textContent = b.n ? fmt(b.cost) : '';
  $('stBuy').classList.toggle('dis', !b.n || S.money < b.cost);
}
function bindStation() {
  const id = R.sheet.id;
  const u = $('stUnlock');
  if (u) u.onclick = () => doUnlock(id, u);
  if (!$('stBuy')) return;
  $('sheetCard').querySelectorAll('[data-m]').forEach(b => {
    b.onclick = () => {
      const m = b.dataset.m, v = m === 'ms' || m === 'max' ? m : +m;
      opts.buy = v; saveOpts();
      $('sheetCard').querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
      updStation();
    };
  });
  const buy = $('stBuy');
  buy.onpointerdown = e => {
    if (e.button) return;
    stopHold();
    if (!doBuy(id)) return;
    let delay = 380;
    const rep = () => { if (doBuy(id)) { delay = Math.max(55, delay * 0.8); R.hold = setTimeout(rep, delay); } else R.hold = null; };
    R.hold = setTimeout(rep, delay);
  };
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => buy.addEventListener(k, stopHold));
  updStation();
}
function stopHold() { if (R.hold) { clearTimeout(R.hold); R.hold = null; } }
function doBuy(id) {
  const b = L.bulk(S, id, opts.buy);
  if (!b.n) return false;
  if (S.money < b.cost) { deny(short(b.cost)); return false; }
  const cap0 = L.capAt(L.lvOf(S, id)), gained = L.buyLevels(S, id, opts.buy), lv = L.lvOf(S, id);
  sfx.lvl(lv);
  haptic('tap');
  scene.press(id, 0.16);
  const btn = $('stBuy');
  if (btn) { retrigger(btn, 'bump'); const [x, y] = centerOf(btn); floatText(x + (Math.random() - 0.5) * 60, y - 26, `+${b.n} cấp`, 'good small'); }
  if (gained > 0) milestone(id, lv);
  else scene.celebrateStation(id, false);
  if (L.capAt(lv) > cap0) setTimeout(() => toast(`${esc(L.stDef(S, id).n)}: thêm một chỗ pha, ${L.capAt(lv)} bạn gấu pha cùng lúc`), 500);
  updStation();
  labelText();
  save();
  return true;
}
function milestone(id, lv) {
  const d = L.stDef(S, id);
  Music.duck(1.4, 0.35);
  sfx.star();
  haptic('reward');
  flash('good');
  scene.celebrateStation(id, true);
  scene.cheerAll();
  const st = $('stStars');
  if (st) { const [x, y] = centerOf(st); domBurst(x, y, 22); punchEl(st); }
  toast(`<b>${esc(d.n)}</b> lên cấp ${lv}: tiền mỗi ly ×2!`);
}
function doUnlock(id, btn) {
  const d = L.stDef(S, id);
  if (S.money < d.unlock) return deny(short(d.unlock));
  if (!L.unlock(S, id)) return;
  const [x, y] = centerOf(btn);
  sfx.crate();
  setTimeout(sfx.perfect, 140);
  haptic('reward');
  domBurst(x, y, 26);
  scene.setStationLocked(id, false);
  toast(`Đã mở trạm <b>${esc(d.n)}</b>! Khách bắt đầu gọi món này`);
  save();
  renderSheet();
  labelText();
}

/* ----- bảng nâng cấp quán ----- */
function sheetUpg() {
  const list = L.upgList(S), owned = shop().upgrades.filter(u => S.upg[u.id]);
  const hires = shop().upgrades.filter(x => x.fx === 'staff');
  // nâng cấp thuê gấu hiện mặt đúng bạn gấu sẽ vào ca
  const icon = u => u.fx === 'staff' ? bearIcon(BEARS[(hires.indexOf(u) + 1) % BEARS.length].id) : ICON[u.fx];
  const row = (u, own) => `<div class="row${own ? ' owned' : ''}"><i class="ric">${icon(u)}</i><div class="nm"><b>${esc(u.n)}</b><small>${esc(u.d)}</small></div>${own ? '<span class="own">Đã có</span>' : `<button class="pri buyu${S.money < u.cost ? ' dis' : ''}" data-u="${u.id}" data-quiet>${fmt(u.cost)}</button>`}</div>`;
  return head(ICON.arrowUp, 'Nâng cấp quán', `Mua một lần, dùng mãi ở ${esc(shop().n)}`) +
    `<div class="list">${list.map(u => row(u, false)).join('')}${owned.map(u => row(u, true)).join('')}</div>`;
}
function bindUpg() {
  $('sheetCard').querySelectorAll('[data-u]').forEach(b => {
    b.onclick = () => {
      const u = L.upgDef(S, b.dataset.u);
      if (S.money < u.cost) return deny(short(u.cost));
      if (!L.buyUpgrade(S, u.id)) return;
      const [x, y] = centerOf(b);
      sfx.star();
      haptic('reward');
      domBurst(x, y, 20);
      floatText(x, y - 20, '−' + fmt(u.cost), 'neg');
      toast(`Đã mua: <b>${esc(u.n)}</b>`);
      if (u.id === 'sign') scene.setSign(S.shopName, 'Chi nhánh ' + shop().n, true, true);
      save();
      renderSheet();
    };
  });
}

/* ----- bảng nhiệm vụ và chuyển quán ----- */
function sheetTasks() {
  const ts = L.tasks(S), got = ts.filter(t => t.claimed).length, next = SHOPS[S.shop + 1];
  const rows = ts.map((t, i) => {
    const state = t.claimed ? ' got' : t.done ? ' ready' : '';
    const right = t.claimed ? '<em>Đã nhận</em>' : t.done ? `<button class="pri claim" data-claim="${t.i}" data-quiet>Nhận +${fmt(t.r)}</button>` : `<em class="rw">${t.need > 1 ? `${t.cur}/${t.need} · ` : ''}+${fmt(t.r)}</em>`;
    return `<div class="trow${state}" style="--i:${i}"><i class="tic">${t.done ? ICON.check : '<b></b>'}</i><span>${esc(L.taskText(S, t))}</span>${right}</div>`;
  }).join('');
  const foot = L.canMove(S) ? `<button class="big go breathe" id="moveBtn">Chuyển sang ${esc(next.n)} ➜</button>`
    : !next && L.allClaimed(S) ? `<p class="note done">${ICON.check} Bạn đã làm chủ cả chuỗi quán! Chi nhánh mới đang được xây.</p>`
    : next ? `<p class="muted small">Nhận hết thưởng để mở chi nhánh <b>${esc(next.n)}</b>.</p>` : '';
  return head(ICON.list, `Nhiệm vụ ở ${esc(shop().n)}`, `${got}/${ts.length} đã nhận thưởng`) +
    `<div class="tbar"><i style="transform:scaleX(${(got / ts.length).toFixed(3)})"></i></div><div class="list">${rows}</div>${foot}`;
}
function bindTasks() {
  $('sheetCard').querySelectorAll('[data-claim]').forEach(b => {
    b.onclick = () => {
      const [x, y] = centerOf(b), v = L.claimTask(S, +b.dataset.claim);
      if (!v) return;
      sfx.coin(3);
      setTimeout(sfx.star, 120);
      haptic('reward');
      domBurst(x, y, 18);
      floatText(x, y - 10, '+' + fmt(v), 'money');
      coinFly(x, y, 5);
      L.checkTuts(S);
      save();
      renderSheet();
      if (L.allClaimed(S)) toast(L.canMove(S) ? 'Xong hết nhiệm vụ! Chuyển sang chi nhánh mới được rồi' : 'Xong hết nhiệm vụ của cả chuỗi quán!');
    };
  });
  const mv = $('moveBtn');
  if (mv) mv.onclick = askMove;
}
function askMove() {
  const next = SHOPS[S.shop + 1];
  modal(`<div class="wel-hero">${ICON.shop}</div><h2>Chuyển sang ${esc(next.n)}?</h2><p>${esc(next.d)}</p>
    <p class="muted small">Gấu Nâu đi cùng bạn, các bạn gấu khác thuê lại ở chi nhánh mới. Tiền, trạm và nâng cấp ở ${esc(shop().n)} để lại. Bạn bắt đầu chi nhánh mới với <b>${fmt(next.start)}</b> và 5 món mới.</p>`,
  [['Ở lại thêm', () => {}], [`Chuyển sang ${esc(next.n)}`, doMove, 1]], 'welcome');
}
function doMove() {
  closeSheet();
  SV.rotateBackups(S);
  R.paused = true;
  const next = SHOPS[S.shop + 1], cur = $('curtain');
  cur.innerHTML = `<div><small>Chi nhánh mới</small><b>${esc(next.n)}</b></div>`;
  cur.hidden = false;
  cur.className = 'in';
  Music.duck(3, 0.2);
  sfx.day();
  haptic('heavy');
  setTimeout(() => {
    L.moveShop(S);
    Cloud.push(S);
    W = L.newWorld(S);
    applyShop();
    R.disp = S.money;
    save();
    cur.className = 'out';
    setTimeout(() => {
      cur.hidden = true;
      R.paused = false;
      const sh = shop();
      modal(`<div class="wel-hero">${drinkIcon(sh.stations[0].c, sh.stations[0].ice)}</div><h2>Chào mừng tới ${esc(sh.n)}!</h2><p>${esc(sh.d)}</p>
        <p class="muted small">Món ở đây: ${sh.stations.map(s => esc(s.n)).join(', ')}.</p>`, [['Mở cửa!', () => {}, 1]], 'welcome');
      domBurst(innerWidth / 2, innerHeight / 2, 34);
      sfx.perfect();
      setTimeout(scene.cheerAll, 200);
    }, 650);
  }, 950);
}

/* ----- bảng quán: tên, chuỗi chi nhánh, số liệu ----- */
function sheetShop() {
  const hired = L.derived(S).staff, hire = shop().upgrades.filter(u => u.fx === 'staff');
  const team = BEARS.slice(0, 1 + hire.length).map((b, i) => {
    const st = i < hired ? '<em class="ok">Đang làm</em>' : `<em class="lk">${ICON.lock} ${fmt(hire[i - 1].cost)}</em>`;
    return `<div class="row${i < hired ? '' : ' owned'}"><i class="ric">${bearIcon(b.id)}</i><div class="nm"><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>${st}</div>`;
  }).join('');
  const chain = SHOPS.map((sh, i) => {
    const st = i < S.shop ? `<em class="ok">${ICON.check} Đã xong</em>` : i === S.shop ? '<em class="here">Đang ở đây</em>' : `<em class="lk">${ICON.lock}</em>`;
    return `<div class="row${i > S.shop ? ' owned' : ''}"><div class="nm"><b>${esc(sh.n)}</b><small>${esc(sh.d)}</small></div>${st}</div>`;
  }).join('');
  return head(ICON.shop, esc(S.shopName || 'Quán Cà Phê Nhỏ'), 'Chi nhánh ' + esc(shop().n), `<button class="ghost ren" id="rename">${ICON.pencil}Đổi tên</button>`) +
    `<div class="stats"><div><small>Khách ở đây</small><b>${S.served.toLocaleString('vi-VN')}</b></div><div><small>Tiền kiếm ở đây</small><b>${fmt(S.earned)}</b></div><div><small>Tổng khách</small><b>${S.life.served.toLocaleString('vi-VN')}</b></div></div>
     <div class="list"><h4 class="subh">Đội gấu</h4>${team}<h4 class="subh">Chuỗi chi nhánh</h4>${chain}</div>`;
}
function bindShop() { $('rename').onclick = renameDlg; }

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
function renameDlg() {
  closeSheet();
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
  const pick = name => { inp.value = name; refresh(); retrigger(sign, 'flip'); sfx.lvl(3); haptic('tap'); setMsg(HINT); };
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
    sign.classList.add('stamp');
    const [x, y] = centerOf(sign);
    domBurst(x, y, 26);
    sfx.star();
    haptic('reward');
    setTimeout(() => {
      close();
      applyShopName(true);
      // Chờ biển hiệu nảy xong mới báo, để thông báo không che đúng khoảnh khắc đẹp nhất.
      setTimeout(() => toast('Quán đã có tên mới: ' + esc(v)), 1100);
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
function applyShopName(celebrate) {
  scene.setSign(S.shopName, 'Chi nhánh ' + shop().n, S.upg.sign, celebrate);
  document.title = (S.shopName || 'Quán Cà Phê Nhỏ') + ' · ' + shop().n;
  $('hShop').textContent = S.shopName || 'Quán Cà Phê Nhỏ';
  punchEl($('hShop'));
}

/* ---------- cài đặt, khôi phục, cảnh báo lưu ---------- */
function settings() {
  closeSheet();
  const onOff = v => v ? 'Bật' : 'Tắt';
  modal(`<h2>Cài đặt</h2>
    ${accountHTML()}
    <div class="set"><button data-tap data-o="music"><span>Nhạc nền</span><b class="${musicOn() ? 'on' : ''}">${onOff(musicOn())}</b></button>
    <button data-tap data-o="sound"><span>Âm thanh hiệu ứng</span><b class="${opts.sound ? 'on' : ''}">${onOff(opts.sound)}</b></button>
    <button data-tap data-o="haptic"><span>Rung khi chạm</span><b class="${opts.haptic ? 'on' : ''}">${onOff(opts.haptic)}</b></button></div>
    <p class="muted small">Nhạc nền và âm thanh hiệu ứng bật tắt riêng. Game tự lưu mỗi 10 giây. Đóng game thì quán vẫn bán: lần sau mở lại được nhận tiền lúc vắng mặt, tính tối đa ${CFG.offlineCapH} giờ. Máy bật "giảm chuyển động" thì rung lắc màn hình tự dịu đi.</p>`,
  [['Khôi phục bản tự lưu', () => restoreDlg(settings)],
    ['Chơi lại từ đầu', () => modal('<h2>Xoá quán và chơi lại?</h2><p>Mọi tiến trình sẽ mất, chỉ giữ tên quán.</p>', [['Huỷ', settings], ['Xoá và chơi lại', () => applyState(null, 'Đã mở quán mới'), 1]])],
    ['Xong', () => {}, 1]]);
  bindAccount();
  $('card').querySelectorAll('[data-o]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.o;
      opts[k] = k === 'music' ? !musicOn() : !opts[k];
      saveOpts();
      if (k === 'music') Music.set(opts.music);
      if (k === 'sound') { setSfx(opts.sound); if (opts.sound) sfx.uiPrimary(); }
      if (k === 'haptic' && opts.haptic) haptic('primary');
      const t = b.querySelector('b');
      t.textContent = onOff(opts[k]);
      t.classList.toggle('on', opts[k]);
      punchEl(t);
    };
  });
}
/* ---------- tài khoản Discord: lưu tiến trình lên mây ---------- */
const DISCORD_ICON = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.1 14.1 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.1.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418z"/></svg>';
const clock = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
function accountHTML() {
  const u = Cloud.user;
  if (!u) return `<div class="acct"><button class="discord" id="dcLogin" data-quiet>${DISCORD_ICON}Đăng nhập bằng Discord</button>
    <p class="muted small">Lưu tiến trình lên mây để chơi tiếp trên máy khác. Game chỉ đọc tên và ảnh đại diện Discord của bạn.</p></div>`;
  return `<div class="acct in"><img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer"><div class="who"><b>${esc(u.name)}</b><small id="dcStat">${Cloud.lastAt ? 'Đã lưu lên mây lúc ' + clock(Cloud.lastAt) : 'Đang đồng bộ…'}</small></div>
    <button class="ghost" id="dcOut">Đăng xuất</button></div>`;
}
function bindAccount() {
  const li = $('dcLogin'), lo = $('dcOut');
  if (li) li.onclick = () => { sfx.uiPrimary(); rememberAuth('discord'); save(); Cloud.login(); };
  // đăng xuất = chọn chơi khách trên máy này: lần sau vào game không tự đăng nhập lại
  if (lo) lo.onclick = async () => { await Cloud.push(S); await Cloud.logout(); rememberAuth('guest'); toast('Đã đăng xuất Discord. Tiến trình vẫn lưu trên máy này'); settings(); };
}
// Tóm tắt một bản lưu để người chơi nhận ra: chi nhánh, tiền, số khách, lúc lưu.
const saveLine = (d, at) => `<b>${esc(SHOPS[d.shop] ? SHOPS[d.shop].n : '?')}</b> · ${fmt(d.money)} · ${(d.life && d.life.served || 0).toLocaleString('vi-VN')} khách${at ? ' · ' + whenOf(at) : ''}`;
// Sau khi biết đã đăng nhập: so bản trên máy với bản trên mây rồi mới bật tự đẩy.
async function cloudSync(next = () => {}) {
  if (!Cloud.user) return next();
  const rec = await Cloud.pull();
  if (!rec) { toast('Chưa kết nối được máy chủ lưu, tạm lưu trên máy', true); return next(); }
  const cloud = L.migrate(rec.data);   // bản trên mây lưu từ trước khi đổi thang tiền
  const keepLocal = async () => { Cloud.synced = true; if (await Cloud.push(S, true)) toast('Đã lưu tiến trình lên Discord'); next(); };
  const takeCloud = () => { R.tookCloud = true; Cloud.synced = true; Cloud.lastAt = rec.at; applyState(cloud, 'Đã tải tiến trình từ Discord'); Cloud.lastJson = JSON.stringify({ data: S }); offlineDlg(cloud.at, next); };
  if (!cloud) return keepLocal();
  if (sameProgress(cloud, S)) { Cloud.synced = true; Cloud.lastAt = rec.at; return next(); }
  if (isFresh(S)) return takeCloud();
  modal(`<h2>Chọn tiến trình để chơi tiếp</h2><p class="muted small">Tiến trình trên máy này khác với bản đã lưu trên Discord.</p>
    <div class="pick"><small>Trên Discord</small><div>${saveLine(cloud, rec.at)}</div></div>
    <div class="pick"><small>Trên máy này</small><div>${saveLine(S, S.at)}</div></div>`,
  [['Dùng bản trên Discord', takeCloud, 1], ['Dùng bản trên máy này', keepLocal]], 'welcome');
}
// Quay về từ Discord (?login=ok|fail|cancel): báo kết quả rồi xoá tham số khỏi thanh địa chỉ.
function loginResult() {
  const r = LOGIN_PARAM;
  if (!r) return;
  history.replaceState(null, '', location.pathname);
  if (r === 'ok' && Cloud.user) toast(`Đã đăng nhập Discord: <b>${esc(Cloud.user.name)}</b>`);
  else if (r === 'cancel') toast('Đã huỷ đăng nhập Discord');
  else toast('Đăng nhập Discord chưa được, thử lại sau nhé', true);
}

function applyState(d, msg) {
  const n = S.shopName;
  S = hydrate(d);
  if (!S.shopName) S.shopName = n;
  if (!d) S.ftue = { ...L.newFtue(), welcomed: true, skip: S.ftue.skip };
  W = L.newWorld(S);
  R.disp = S.money;
  closeSheet();
  applyShop();
  save();
  toast(msg);
}
const whenOf = t => t ? new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'không rõ giờ';
function restoreDlg(back) {
  const list = SV.listBackups();
  if (!list.length) return modal(`<h2>Chưa có bản tự lưu</h2><p>Game giữ 3 bản dự phòng, cứ ${CFG.backupEvery / 60} phút chơi thêm một bản và mỗi lần chuyển quán.</p>`, [['Quay lại', back, 1]]);
  const label = d => `${whenOf(d.at)} · ${SHOPS[d.shop] ? SHOPS[d.shop].n : '?'} · ${fmt(L.migrate(d).money)}`;
  modal('<h2>Khôi phục bản tự lưu</h2><p>Chọn bản muốn lấy lại. Tiến trình hiện tại sẽ bị thay thế.</p>',
    [...list.map(b => [label(b.data), () => modal(`<h2>Lấy lại bản này?</h2><p><b>${esc(b.data.shopName || 'Quán Cà Phê Nhỏ')}</b> · ${label(b.data)}</p>`, [['Huỷ', () => restoreDlg(back)], ['Khôi phục', () => applyState(b.data, 'Đã khôi phục bản lưu lúc ' + whenOf(b.data.at)), 1]])]), ['Quay lại', back]]);
}
function storeWarn(next) {
  modal(`<h2>Máy đang chặn lưu tiến trình</h2><p>Game vẫn chạy, nhưng <b>tắt trang là mất hết</b>, mở lại sẽ về quán đầu.</p>
    <ul class="how"><li><b>iPhone:</b> Cài đặt › Safari › tắt <b>Chặn tất cả cookie</b>.</li><li>Không mở game trong <b>tab ẩn danh</b>.</li><li>Kiểm tra bộ nhớ máy còn trống.</li></ul>`, [['Đã hiểu', next, 1]], 'warnc');
}
function corruptDlg(next) {
  const has = SV.listBackups().length > 0;
  modal(`<h2>Không đọc được tiến trình cũ</h2><p>Bản lưu trong máy bị lỗi nên game mở quán mới. Bản cũ vẫn được cất riêng, không bị xoá.</p>${has ? '<p>Bạn có thể lấy lại một bản tự lưu.</p>' : ''}`,
    [...(has ? [['Khôi phục bản tự lưu', () => restoreDlg(() => corruptDlg(next)), 1]] : []), ['Chơi quán mới', next, !has]]);
}

/* ---------- tiền lúc vắng mặt ---------- */
function durText(s) {
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? `${h} giờ${m ? ` ${m} phút` : ''}` : m ? `${m} phút` : `${Math.round(s)} giây`;
}
// since: mốc thời gian lần cuối quán còn chạy. Vắng dưới offlineMin giây thì bỏ qua.
function offlineDlg(since, next = () => {}) {
  const secs = (Date.now() - since) / 1000;
  if (!since || secs < CFG.offlineMin) return next();
  const g = Math.round(L.rate(S) * L.offlineSecs(secs));
  if (g <= 0) return next();
  const capped = secs > CFG.offlineCapH * 3600;
  modal(`<div class="wel-hero">${ICON.clock}</div><h2>Quán vẫn bán khi bạn vắng</h2>
    <p>Bạn vắng <b>${durText(secs)}</b>. Nhân viên vẫn pha và thu tiền${capped ? `, tính tối đa ${CFG.offlineCapH} giờ` : ''}.</p>
    <div class="big-money" id="offAmt">+0</div>`, [[`Nhận ${fmt(g)}`, () => {
    S.money += g; S.earned += g; S.life.earned += g;
    save();
    const [x, y] = centerOf($('hMoneyBox'));
    coinFly(innerWidth / 2, innerHeight / 2, 8);
    domBurst(innerWidth / 2, innerHeight / 2, 26);
    floatText(x, y + 34, '+' + fmt(g), 'money');
    sfx.coin(5);
    haptic('reward');
    next();
  }, 1]], 'welcome offline');
  countUp($('offAmt'), g, v => '+' + fmt(v), 900);
}
document.addEventListener('visibilitychange', () => {
  pauseAudio(document.hidden);
  if (document.hidden) { R.hiddenAt = Date.now(); stopHold(); save(); Cloud.push(S); }
  else if (R.hiddenAt) { const t = R.hiddenAt; R.hiddenAt = 0; if (!modalOpen()) offlineDlg(t); }
});
window.addEventListener('pagehide', () => save());
window.addEventListener('resize', () => { scene.resize(); });
document.addEventListener('contextmenu', e => e.preventDefault());

/* ================= HƯỚNG DẪN LẦN ĐẦU ================= */
function welcomeDlg(next) {
  const old = R.legacy;
  modal(`<div class="wel-hero">${drinkIcon('#8a5a3b', true)}</div><h2>${old ? 'Quán đã đổi cách chơi!' : 'Chào mừng tới quán!'}</h2>
    ${old ? `<p class="muted small">Giờ bạn là chủ chuỗi quán: các bạn gấu tự pha, bạn lo nâng cấp và mở rộng.${old.shopName ? ` Tên quán <b>${esc(old.shopName)}</b> vẫn giữ nguyên.` : ''}</p>` : ''}
    <ol class="how wel"><li><b>Các bạn gấu tự pha và bán</b>: khách tới, gấu làm món, tiền tự vào két. Chạm vào gấu để chào nhé!</li><li><b>Chạm vào trạm pha</b> để nâng cấp. Tới cấp 10, 25, 50, 75, 100 thì tiền mỗi ly gấp đôi.</li><li><b>Làm nhiệm vụ</b> để chuyển sang chi nhánh mới, lớn hơn.</li></ol>`,
  [['Chỉ mình cách chơi', () => { S.ftue.welcomed = true; L.checkTuts(S); save(); next(); }, 1],
    ['Bỏ qua, mình tự chơi', () => { Object.assign(S.ftue, { welcomed: true, skip: true }); L.checkTuts(S); save(); next(); }]], 'welcome');
}
function skipCoach() {
  S.ftue.skip = true;
  L.checkTuts(S);
  save();
  Coach.clear();
  scene.setHighlight(null);
  toast('Đã tắt hướng dẫn. Dòng nhiệm vụ trên cùng vẫn gợi ý việc nên làm');
}
// Gọi mỗi khung hình: mỗi hướng dẫn là một cờ null → 'go' → 'done' (logic.js bật và tắt),
// ở đây chỉ chọn chỗ trỏ theo màn hình đang mở. Người chơi làm tới đâu bong bóng theo tới đó.
function runCoach() {
  const f = S.ftue, sh = R.sheet, skip = { onSkip: skipCoach };
  let hl = null;
  if (!f.welcomed || f.skip || modalOpen()) { Coach.clear(); scene.setHighlight(null); return; }
  if (f.first === 'go') {
    const first = shop().stations[0];
    if (sh && sh.kind === 'station' && sh.id === first.id) Coach.show($('stBuy'), 'Bấm <b>Nâng cấp</b>. Cấp càng cao, mỗi ly bán càng đắt.', { key: 'first', place: 'above', ...skip });
    else if (!sh) { hl = first.id; Coach.show(() => scene.stationTop(first.id), `Chạm vào <b>${esc(first.n.toLowerCase())}</b> để nâng cấp trạm.`, { key: 'first', place: 'above', ...skip }); }
    else Coach.clear();
  } else if (f.unlock === 'go') {
    const n = L.nextLocked(S);
    if (!n) Coach.clear();
    else if (sh && sh.kind === 'station' && sh.id === n.id) Coach.show($('stUnlock'), 'Mở trạm để bán thêm <b>món mới</b>, đắt hơn món cũ.', { key: 'unlock', place: 'above', ...skip });
    else if (!sh) { hl = n.id; Coach.show(() => scene.stationTop(n.id), 'Đủ tiền mở <b>trạm mới</b> rồi! Chạm vào thùng hàng.', { key: 'unlock', place: 'above', ...skip }); }
    else Coach.clear();
  } else if (f.upg === 'go') {
    if (sh && sh.kind === 'upg') Coach.show($('sheetCard').querySelector('.buyu:not(.dis)'), 'Mua nâng cấp này: quán bán nhanh hơn, đông khách hơn.', { key: 'upg', place: 'below', ...skip });
    else if (!sh) Coach.show($('navUpg'), 'Có <b>nâng cấp quán</b> mua được rồi. Vào đây xem.', { key: 'upg', place: 'above', ...skip });
    else Coach.clear();
  } else if (f.move === 'go') {
    if (sh && sh.kind === 'tasks') Coach.show($('moveBtn'), 'Xong hết nhiệm vụ! <b>Chuyển sang chi nhánh mới</b> thôi.', { key: 'move', place: 'above', ...skip });
    else if (!sh) Coach.show($('navTask'), 'Nhận hết thưởng rồi. Vào đây để <b>chuyển quán</b>.', { key: 'move', place: 'above', ...skip });
    else Coach.clear();
  } else Coach.clear();
  scene.setHighlight(hl);
}

/* ---------- khởi động ---------- */
const cloudReady = Cloud.me();
// Tham số ?login= khi vừa từ Discord quay về; đọc một lần lúc tải trang (loginResult sẽ xoá nó khỏi địa chỉ).
const LOGIN_PARAM = new URLSearchParams(location.search).get('login');

/* ---------- chọn cách chơi: khách hay Discord, nhớ trên máy này ---------- */
// opts.auth: null (chưa chọn) | 'guest' | 'discord'. Lưu cùng tuỳ chọn âm thanh nên "Chơi lại từ đầu" không xoá.
function rememberAuth(v) { if (opts.auth !== v) { opts.auth = v; saveOpts(); } }
// Tự chuyển sang Discord tối đa một lần mỗi tab, để phiên hết hạn mà Discord lỗi thì không lặp vòng.
const AUTO_KEY = 'cafe3d_autologin';
const autoTried = () => { try { return sessionStorage.getItem(AUTO_KEY) === '1'; } catch (e) { return true; } };
const markTried = () => { try { sessionStorage.setItem(AUTO_KEY, '1'); } catch (e) { /* bỏ qua */ } };
function goDiscord() { markTried(); rememberAuth('discord'); save(); Cloud.login(); }
function authGate(next) {
  loginResult();   // vừa từ Discord về: báo kết quả ngay và xoá ?login= khỏi thanh địa chỉ
  const step = authStep(opts.auth, { online: Cloud.online, user: Cloud.user, login: LOGIN_PARAM, tried: autoTried() });
  if (step === 'continue') { if (Cloud.user) rememberAuth('discord'); return next(); }
  if (step === 'offline') { toast('Chưa kết nối được Discord, tạm chơi và lưu trên máy này', true); return next(); }
  if (step === 'redirect') return goDiscord();          // rời trang sang Discord, quay về là vào thẳng
  loginDlg(next);
}
function loginDlg(next) {
  const off = !Cloud.online;
  modal(`<div class="wel-hero"><img src="icons/icon.svg" alt=""></div><h2>Vào quán thôi!</h2>
    <p class="muted small">Chọn cách chơi. Lần sau game nhớ lựa chọn này, đổi được trong Cài đặt.</p>
    <div class="login-opts">
      <button class="lg-opt discord${off ? ' dis' : ''}" id="lgDiscord" data-quiet><i>${DISCORD_ICON}</i><span><b>Đăng nhập bằng Discord</b><small>${off ? 'Chưa kết nối được máy chủ, thử lại sau' : 'Lưu tiến trình lên mây, chơi tiếp trên máy khác'}</small></span></button>
      <button class="lg-opt guest" id="lgGuest" data-quiet><i>${bearIcon('white')}</i><span><b>Chơi với tư cách khách</b><small>Tiến trình chỉ lưu trên máy này</small></span></button>
    </div>`, [], 'welcome login');
  $('lgDiscord').onclick = () => {
    if (off) return deny('Chưa kết nối được máy chủ. Chơi khách trước, đăng nhập sau trong Cài đặt nhé');
    sfx.uiPrimary(); haptic('primary'); goDiscord();
  };
  $('lgGuest').onclick = () => {
    sfx.uiPrimary(); haptic('primary');
    $('modal').hidden = true;
    rememberAuth('guest');
    toast('Đang chơi với tư cách khách');
    next();
  };
}

// Các bước sau khi đã vào quán (máy quay dừng): cảnh báo lưu, đồng bộ Discord, chào mừng, tiền lúc vắng mặt.
function bootChecks() {
  const steps = [];
  if (loaded.status === 'corrupt') steps.push(corruptDlg);
  if (!SV.storageOk()) { R.noStoreWarned = true; steps.push(storeWarn); }
  steps.push(cloudSync);
  // thẻ chào mừng sau khi đồng bộ: tải bản trên mây về rồi thì không chào lại
  steps.push(next => (S.ftue.welcomed ? next() : welcomeDlg(next)));
  // tiền lúc vắng mặt tính theo bản trên máy; nếu vừa lấy bản trên mây thì cloudSync đã tính rồi
  steps.push(next => (bootAt && !R.tookCloud ? offlineDlg(bootAt, next) : next()));
  const run = () => { const f = steps.shift(); if (f) f(run); };
  run();
}
// Màn mở: vừa tải xong là hỏi cách chơi (bảng nổi trên màn mở), chọn xong mới hiện nút "Vào quán thôi!".
// Người đã chọn từ trước thì thấy nút ngay. Bấm nút: màn mở phóng to mờ dần, máy quay sà vào quán,
// thanh trên và thanh dưới trượt vào; máy quay dừng thì mới hiện các bảng tiếp theo.
function splash() {
  const sp = $('splash');
  sp.classList.add('js');
  scene.introPrime();
  cloudReady.then(() => authGate(showEnter));
}
function showEnter() {
  $('spWait').hidden = true;
  const btn = $('enterBtn');
  btn.hidden = false;
  btn.onclick = enterShop;
}
function enterShop() {
  const sp = $('splash'), btn = $('enterBtn');
  btn.onclick = null;
  audioUnlock();
  // AudioContext chỉ chạy sau cú chạm đầu tiên, nên nhạc bắt đầu từ lúc bấm vào quán
  Music.start(musicOn());
  sfx.uiPrimary();
  sfx.sheet();
  haptic('primary');
  sp.classList.add('out');
  document.body.classList.add('entering');
  document.body.classList.remove('pre');
  scene.introPlay(() => {
    // máy quay vừa dừng: chuông nhẹ, rung nhẹ, rồi mới tới các bảng
    sfx.ding(2);
    haptic('tap');
    bootChecks();
  });
  setTimeout(() => { sp.hidden = true; }, 720);
  setTimeout(() => document.body.classList.remove('entering'), 2200);
}

/* ---------- vòng lặp ---------- */
let last = performance.now();
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dt = R.paused ? 0 : realDt;
  if (dt) handle(L.step(S, W, dt));
  scene.sync(W, colorOf, realDt);
  scene.update(dt, realDt);
  scene.render();
  R.disp += (S.money - R.disp) * (1 - Math.exp(-realDt * 9));
  if (Math.abs(S.money - R.disp) < Math.max(1, S.money * 1e-4)) R.disp = S.money;
  if ((R.uiT -= realDt) <= 0) {
    R.uiT = 0.2;
    if (L.checkTuts(S)) save();
    slowUi();
  }
  if ((R.saveT -= realDt) <= 0) { R.saveT = 10; save(); }
  if ((R.cloudT = (R.cloudT ?? 30) - realDt) <= 0) { R.cloudT = 30; Cloud.push(S).then(ok => { if (ok && $('dcStat')) $('dcStat').textContent = 'Đã lưu lên mây lúc ' + clock(Cloud.lastAt); }); }
  if ((R.bakT -= dt) <= 0) { R.bakT = CFG.backupEvery; SV.rotateBackups(S); }
  labelPos();
  bubbles();
  hud();
  runCoach();
  Coach.position();
  requestAnimationFrame(frame);
}

export function boot() {
  SV.requestPersist();
  $('setBtn').innerHTML = ICON.gear;
  $('hCoin').innerHTML = ICON.coin;
  $('navUpg').insertAdjacentHTML('afterbegin', ICON.arrowUp);
  $('navTask').insertAdjacentHTML('afterbegin', ICON.list);
  $('navShop').insertAdjacentHTML('afterbegin', ICON.shop);
  $('setBtn').onclick = settings;
  $('navUpg').onclick = () => (R.sheet && R.sheet.kind === 'upg' ? closeSheet() : openSheet('upg'));
  $('navTask').onclick = () => (R.sheet && R.sheet.kind === 'tasks' ? closeSheet() : openSheet('tasks'));
  $('navShop').onclick = () => (R.sheet && R.sheet.kind === 'shop' ? closeSheet() : openSheet('shop'));
  $('goal').onclick = () => openSheet('tasks');
  applyShop();
  // Biển hiệu vẽ bằng phông Baloo 2: vẽ lại khi phông tải xong, không thì chữ ra phông hệ thống.
  if (document.fonts) document.fonts.load('800 100px "Baloo 2"').then(() => scene.setSign(S.shopName, 'Chi nhánh ' + shop().n, S.upg.sign, 'redraw')).catch(() => {});
  slowUi();
  splash();
  requestAnimationFrame(frame);
  window.__game = { S: () => S, W: () => W, R, L, scene, Music };
}
