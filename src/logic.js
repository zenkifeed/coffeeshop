// Logic thuần của game: không đụng DOM hay Three.js, để chạy được trong Node khi kiểm thử.
import { ING, COMP, DRINKS, UPG, EVENTS, CFG, FIRST, REVIEW, ROOKIE } from './data.js';

export const rnd = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];
export function wpick(arr, w, rng = Math.random) {
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r < 0) return arr[i]; }
  return arr[arr.length - 1];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const newRec = day => ({ day, sales: 0, tips: 0, served: 0, lost: 0, stars: [], buy: 0, upgrades: 0, spoil: { n: 0, v: 0 }, rent: 0, util: 0, waste: [], bonus: 0 });

export function freshState(rng = Math.random) {
  const sell = { L: CFG.sizeL };
  Object.keys(DRINKS).forEach(k => { sell[k] = DRINKS[k].price; });
  const stock = {};
  Object.keys(ING).forEach(k => { stock[k] = []; });
  const S = { v: 1, day: 1, money: CFG.startMoney, stock, unlocked: { den: true, sua: true }, sell, upg: {}, reviews: [], history: [], best: 0, cur: newRec(1), ev: null, evDay: 0, seenLv: 1, ftue: newFtue() };
  rollDay(S, rng);
  return S;
}

export const level = day => day >= CFG.levels.l3 ? 3 : day >= CFG.levels.l2 ? 2 : 1;

/* ---------- kho theo mẻ, có hạn dùng ---------- */
export function addStock(S, k, q) {
  if (!q) return;
  const life = ING[k].life, exp = life ? S.day + life - 1 : 99999;
  const b = S.stock[k].find(x => x.exp === exp);
  if (b) b.q += q; else { S.stock[k].push({ q, exp }); S.stock[k].sort((a, c) => a.exp - c.exp); }
}
export const qty = (S, k) => S.stock[k].reduce((a, b) => a + b.q, 0);
export function take(S, k) {
  const b = S.stock[k].find(x => x.q > 0);
  if (!b) return false;
  b.q--;
  S.stock[k] = S.stock[k].filter(x => x.q > 0);
  return true;
}
export function expireStock(S) {
  const out = [];
  Object.keys(S.stock).forEach(k => {
    let q = 0;
    S.stock[k] = S.stock[k].filter(b => { if (b.exp <= S.day) { q += b.q; return false; } return true; });
    if (q) out.push({ k, q, v: q * ING[k].cost });
  });
  return out;
}
export const ingInUse = S => {
  const set = new Set(['cup', 'beans', 'ice']);
  Object.keys(DRINKS).filter(k => S.unlocked[k]).forEach(k => DRINKS[k].comps.forEach(c => { if (COMP[c].ing) set.add(COMP[c].ing); }));
  return Object.keys(ING).filter(k => set.has(k));
};

/* ---------- sự kiện ---------- */
export const ev = S => (S.ev && S.evDay === S.day ? S.ev : null);
export const evIs = (S, id) => { const e = ev(S); return !!e && e.id === id; };
export function rollDay(S, rng = Math.random) {
  const d = S.day;
  let e = null;
  if (d > 1 && d % 15 === 0) e = { id: 'holiday' };
  else if (d > 1 && (d % 7 === 6 || d % 7 === 0)) e = { id: 'weekend' };
  else if (d > 2 && rng() < 0.25) {
    e = { id: rnd(['hot', 'rain', 'trend', 'sale'], rng) };
    if (e.id === 'trend') e.k = rnd(Object.keys(DRINKS).filter(k => S.unlocked[k]), rng);
    if (e.id === 'sale') e.k = rnd(ingInUse(S), rng);
  }
  S.ev = e;
  S.evDay = d;
}
export const evText = (S, e) => EVENTS[e.id].d.replace('%', e.k ? (DRINKS[e.k] || ING[e.k]).n.toLowerCase() : '');
export const ingCost = (S, k) => Math.round(ING[k].cost * (evIs(S, 'sale') && ev(S).k === k ? 0.7 : 1));

/* ---------- giá và lượng khách ---------- */
export const priceOf = (S, o) => S.sell[o.drink] + (o.size === 'L' ? S.sell.L : 0);
export const priceIdx = (S, k) => S.sell[k] / DRINKS[k].price;
export const upgCount = S => UPG.filter(u => S.upg[u.id]).length;
export function sanitizePrices(S) {
  Object.keys(DRINKS).forEach(k => {
    const v = +S.sell[k];
    S.sell[k] = clamp(Number.isFinite(v) ? Math.round(v / 1000) * 1000 : DRINKS[k].price, 1000, DRINKS[k].price * CFG.priceMaxMul);
  });
  const L = +S.sell.L;
  S.sell.L = clamp(Number.isFinite(L) ? Math.round(L / 1000) * 1000 : CFG.sizeL, 0, CFG.sizeLMax);
}
export function rating(S) {
  const r = S.reviews.slice(0, CFG.reviewWindow);
  return r.length ? r.reduce((a, x) => a + x.s, 0) / r.length : 4;
}
export function avgPriceIdx(S) {
  const ks = Object.keys(DRINKS).filter(k => S.unlocked[k]);
  return ks.reduce((a, k) => a + priceIdx(S, k), 0) / ks.length;
}
export function traffic(S) {
  const r = rating(S);
  let rf = 0.45 + (r - 1) * 0.26;
  if (r < 3.5) rf *= 0.8;
  const ramp = S.day < 7 ? 0.75 + 0.035 * S.day : 1;
  const boost = 1 + (S.upg.sign ? 0.2 : 0) + Math.min(S.day, 30) * 0.01;
  const pf = clamp(1.5 - 0.5 * avgPriceIdx(S), 0.4, 1.15);
  const e = ev(S);
  return rf * ramp * boost * pf * (e ? EVENTS[e.id].mul : 1);
}
// el: 0 = giờ mở cửa, 1 = giờ đóng cửa. Cà phê đông nhất buổi sáng.
export function rushMul(el) {
  if (el < 0.2) return 1.5;
  if (el < 0.33) return 0.9;
  if (el < 0.47) return 1.2;
  if (el < 0.6) return 0.6;
  if (el < 0.73) return 1.1;
  if (el < 0.87) return 1.3;
  return 0.7;
}
export const spawnGap = (S, el, rng = Math.random) => 8 / traffic(S) / rushMul(el) * (0.75 + rng() * 0.5);

/* ---------- đơn hàng ---------- */
export function canMake(S, k, ice) {
  if (!qty(S, 'cup')) return false;
  if (ice && !qty(S, 'ice')) return false;
  return DRINKS[k].comps.every(c => !COMP[c].ing || qty(S, COMP[c].ing) > 0);
}
function pickTemp(S, k, rng) {
  const t = DRINKS[k].temps;
  if (level(S.day) < 2 || t.length === 1) return t[0];
  if (evIs(S, 'hot')) return rng() < 0.85 ? 'iced' : 'hot';
  if (evIs(S, 'rain')) return rng() < 0.7 ? 'hot' : 'iced';
  return rnd(t, rng);
}
// Trả về đơn một ly, hoặc { leave: 'pricey' | 'soldout', k }.
export function genOrder(S, rng = Math.random) {
  const unl = Object.keys(DRINKS).filter(k => S.unlocked[k]);
  let k = evIs(S, 'trend') && S.unlocked[ev(S).k] && rng() < 0.5 ? ev(S).k : rnd(unl, rng);
  if (priceIdx(S, k) > 1.6 && rng() < 0.8) {
    const ok = unl.filter(x => priceIdx(S, x) <= 1.6);
    if (!ok.length) return { leave: 'pricey', k };
    k = rnd(ok, rng);
  }
  let ice = pickTemp(S, k, rng) === 'iced';
  if (!canMake(S, k, ice)) {
    const alt = unl.filter(x => x !== k && canMake(S, x, pickTemp(S, x, () => 0) === 'iced'));
    if (!alt.length || rng() < 0.5) return { leave: 'soldout', k };
    k = rnd(alt, rng);
    ice = pickTemp(S, k, () => 0) === 'iced';
  }
  const lc = S.sell.L <= 7000 ? 0.3 : S.sell.L <= 12000 ? 0.12 : 0.03;
  return { drink: k, size: rng() < lc ? 'L' : 'M', ice };
}
export function cupCount(S, rng = Math.random) {
  if (level(S.day) >= 3) return wpick([1, 2, 3], [0.6, 0.3, 0.1], rng);
  if (evIs(S, 'weekend') && rng() < 0.25) return 2;
  return 1;
}
export function patienceFor(S, cups) {
  const base = CFG.patience + (level(S.day) >= 2 ? 10 : 0);
  return base * (S.upg.seats ? 1.25 : 1) * (1 + 0.7 * (cups.length - 1));
}
export const custName = (rng = Math.random) => rnd(FIRST, rng);

/* ---------- ly đang pha ---------- */
export const newCup = () => ({ size: null, comps: [], ice: false, shotP: 0, shotQ: null, cost: 0 });
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
export const cupMatches = (cup, o) => cup.size === o.size && cup.ice === o.ice && sameSet(cup.comps, DRINKS[o.drink].comps);
export const identifyDrink = cup => Object.keys(DRINKS).find(k => sameSet(cup.comps, DRINKS[k].comps)) || null;
export function shotQuality(p, grinder) {
  const { lo, hi } = CFG.shot, w = grinder ? 0.04 : 0;
  return p < lo - w ? 'weak' : p > hi + w ? 'strong' : 'ok';
}
// Shot hoàn hảo: nằm trong 40% giữa của vùng chuẩn. Chỉ để thưởng cảm giác, không đổi tiền hay sao.
export function shotPerfect(p, grinder) {
  const { lo, hi } = CFG.shot, w = grinder ? 0.04 : 0;
  return Math.abs(p - (lo + hi) / 2) <= (hi - lo + 2 * w) * 0.2;
}
// Bước pha tiếp theo cho đơn `o`: trạm cần chạm (để chiếu vòng sáng) và câu gợi ý.
export function nextStep(cup, o) {
  if (!o) return { key: null, text: '' };
  const recipe = DRINKS[o.drink].comps;
  if (!cup.size) return { key: o.size === 'L' ? 'cupL' : 'cupM', text: `Chạm chồng ly ${o.size} để lấy ly` };
  if (cup.size !== o.size) return { key: 'trash', text: 'Sai size, chạm thùng rác để đổ ly' };
  const extra = cup.comps.find(c => !recipe.includes(c));
  if (extra) return { key: 'trash', text: `Dư ${COMP[extra].n.toLowerCase()}, chạm thùng rác để đổ ly` };
  if (!cup.comps.includes('shot')) return { key: 'espresso', text: 'Nhấn giữ máy pha, thả tay khi vạch vào vùng xanh' };
  const miss = recipe.find(c => !cup.comps.includes(c));
  if (miss) return { key: miss, text: `Thêm ${COMP[miss].n.toLowerCase()}` };
  if (o.ice && !cup.ice) return { key: 'ice', text: 'Thêm đá' };
  if (!o.ice && cup.ice) return { key: 'trash', text: 'Ly nóng không có đá, đổ ly làm lại' };
  return { key: 'serve', text: 'Chạm vào khách để giao ly' };
}
export const nextHint = (cup, o) => nextStep(cup, o).text;

/* ---------- chấm sao, tip, đánh giá ---------- */
export function stars(S, c, rng = Math.random) {
  const w = 1 - Math.max(0, c.pat) / c.max;
  const pricey = c.cups.some(o => priceIdx(S, o.drink) > 1.25 || (o.size === 'L' && S.sell.L > 12000));
  const idx = c.cups.reduce((a, o) => a + priceIdx(S, o.drink), 0) / c.cups.length;
  let s = 5, why = 'great';
  if (w > 0.5) { s--; why = 'wait'; }
  if (w > 0.8) s--;
  if (c.shotPen) { s -= 1; if (why === 'great') why = 'weak'; }
  if (pricey) { s--; why = 'pricey'; }
  if (c.wrong) { s -= c.wrong; why = 'wrong'; }
  if (rng() < 0.1) s--;
  if (!pricey && idx < 0.9 && s < 5) { s++; if (why === 'great') why = 'cheap'; }
  s = clamp(s, 1, 5);
  if (why === 'great' && s < 5) why = 'ok';
  return { s, why };
}
export function tipFor(S, c) {
  const e = ev(S);
  return Math.round(Math.max(0, c.pat) / c.max * 5) * 1000 * c.cups.length * (e && EVENTS[e.id].tip ? EVENTS[e.id].tip : 1);
}
export function addReview(S, s, why, name, rng = Math.random) {
  const recent = new Set(S.reviews.slice(0, 12).map(r => r.t));
  const all = REVIEW[why] || REVIEW.ok;
  const pool = all.filter(t => !recent.has(t));
  const t = rnd(pool.length ? pool : all, rng);
  S.reviews.unshift({ s, t, n: name, d: S.day });
  if (S.reviews.length > 300) S.reviews.length = 300;
  S.cur.stars.push(s);
}

/* ---------- cuối ngày ---------- */
export const recRevenue = r => r.sales + r.tips + (r.bonus || 0);
export const recCost = r => r.buy + r.upgrades + r.rent + r.util;
export function endDay(S, rng = Math.random) {
  const r = S.cur;
  r.rent = CFG.rent;
  r.util = CFG.utilBase + upgCount(S) * CFG.utilPerUpg;
  r.waste = expireStock(S);
  S.money -= r.rent + r.util;
  const revenue = recRevenue(r), cost = recCost(r), profit = revenue - cost;
  S.history.push(r);
  if (S.history.length > 120) S.history.shift();
  const broke = S.money < 0;
  if (!broke) {
    S.best = Math.max(S.best, S.day);
    S.day++;
    S.cur = newRec(S.day);
    rollDay(S, rng);
  }
  return { rec: r, revenue, cost, profit, broke };
}

/* ---------- hướng dẫn lần đầu + nhiệm vụ tân binh ---------- */
// coached: đã xong (hoặc bỏ qua) phần chỉ dẫn pha ly đầu tiên. menuTut: null → 'go' → 'done'.
export const newFtue = () => ({ welcomed: false, coached: false, skip: false, done: {}, claimed: {}, menuTut: null });
const DEFAULT_DRINKS = ['den', 'sua'];
export const unlockedExtra = S => Object.keys(DRINKS).some(k => S.unlocked[k] && !DEFAULT_DRINKS.includes(k));
// Bản lưu có từ trước khi có hướng dẫn: người đã chơi thì không bắt học lại và không hiện nhiệm vụ tân binh.
export function migrateFtue(S) {
  if (!S.ftue) {
    S.ftue = newFtue();
    if (S.day > 1 || S.history.length || S.tutSeen) {
      Object.assign(S.ftue, { welcomed: true, coached: true, menuTut: 'done' });
      ROOKIE.forEach(t => { S.ftue.done[t.id] = true; S.ftue.claimed[t.id] = true; });
    }
  }
  S.ftue.done = S.ftue.done || {};
  S.ftue.claimed = S.ftue.claimed || {};
  if (unlockedExtra(S)) S.ftue.menuTut = 'done';
  return S;
}
// Trả về true nếu vừa hoàn thành lần đầu (để báo cho người chơi đúng một lần).
export function rookieDone(S, id) {
  if (!ROOKIE.some(t => t.id === id) || S.ftue.done[id]) return false;
  S.ftue.done[id] = true;
  return true;
}
export function rookieClaim(S, id) {
  const t = ROOKIE.find(x => x.id === id);
  if (!t || !S.ftue.done[id] || S.ftue.claimed[id]) return 0;
  S.ftue.claimed[id] = true;
  S.money += t.reward;
  S.cur.bonus = (S.cur.bonus || 0) + t.reward;
  return t.reward;
}
export const rookieActive = S => S.ftue.welcomed && ROOKIE.some(t => !S.ftue.claimed[t.id]);
export const rookieState = S => ROOKIE.map(t => ({ ...t, done: !!S.ftue.done[t.id], claimed: !!S.ftue.claimed[t.id] }));
// Hướng dẫn theo ngữ cảnh: lần đầu đủ tiền mở món mới thì chỉ chỗ mở.
export function checkMenuTut(S) {
  if (S.ftue.menuTut != null || S.ftue.skip || !S.ftue.coached || unlockedExtra(S)) return false;
  const cheapest = Math.min(...Object.keys(DRINKS).filter(k => !S.unlocked[k]).map(k => DRINKS[k].unlock));
  if (S.money < cheapest) return false;
  S.ftue.menuTut = 'go';
  return true;
}
