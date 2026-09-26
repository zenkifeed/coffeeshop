// Logic thuần của game: không đụng DOM hay Three.js, để chạy được trong Node khi kiểm thử.
// Gồm: tiền và cấp trạm, derived() gom mọi hệ số, mô phỏng khách và nhân viên theo từng bước thời gian,
// ước lượng thu nhập mỗi giây (dùng cho tiền lúc vắng mặt), nhiệm vụ, chuyển quán và cờ hướng dẫn.
import { CFG, LAYOUT, SHOPS, FEATURES, VAULT, VAULT_COST } from './data.js';

export const rnd = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];

/* ---------- định dạng tiền vàng: số thường dưới 1.000, rồi K, M, B, T ---------- */
// K = nghìn, M = triệu, B = tỷ, T = nghìn tỷ, Qa = triệu tỷ, Qi = tỷ tỷ. Dưới 10 giữ một chữ số thập phân (thu nhập mỗi giây lúc đầu chỉ vài xu).
const UNITS = [[1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
export function fmt(n) {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '−' : '';
  n = Math.abs(n);
  if (n < 10) return sign + (Math.round(n * 10) / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (Math.round(n) < 1e3) return sign + Math.round(n);
  if (n >= 1e21) return sign + n.toExponential(2).replace('.', ',').replace('e+', 'e');
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [u, s] = UNITS[i], next = UNITS[i - 1];
    const v = n / u, d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
    const r = Math.round(v * 10 ** d) / 10 ** d;
    // 999,96k làm tròn thành 1000k thì chuyển lên đơn vị kế tiếp
    if (next && (r >= 1000 || n >= next[0])) continue;
    return sign + r.toLocaleString('vi-VN', { maximumFractionDigits: d }) + s;
  }
  return sign + n;
}

/* ---------- trạng thái ---------- */
const freshShop = () => ({ st: {}, upg: {}, claimed: {}, served: 0, earned: 0 });
export const newFtue = () => ({ welcomed: false, skip: false, first: null, unlock: null, upg: null, move: null });
// eco: phiên bản thang tiền. 1 = bản đầu (tiền tính theo đồng, vốn 60.000), 2 = tiền vàng (vốn 60).
export const ECO = 2;
export function freshState(shop = 0) {
  // gems, vault, boost, seen giữ qua mọi chi nhánh (moveShop chỉ làm mới phần freshShop)
  const S = { v: 2, eco: ECO, shop, money: SHOPS[shop].start, ...freshShop(), shopName: '', life: { served: 0, earned: 0 }, ftue: newFtue(), at: 0,
    gems: 0, vault: {}, boost: { left: 0, cd: 0 }, seen: {} };
  S.st[SHOPS[shop].stations[0].id] = 1;
  return S;
}
// Bản lưu thang tiền cũ (chưa có eco): chia mọi khoản tiền cho 1.000 cho khớp giá mới.
// Trả về bản sao đã chuyển; bản đã đúng thang thì trả nguyên. Dùng cho bản trên máy, trên mây và bản dự phòng.
export function migrate(d) {
  if (!d || d.eco >= ECO) return d;
  const k = 1000, life = d.life || {};
  return { ...d, eco: ECO, money: (d.money || 0) / k, earned: (d.earned || 0) / k, life: { ...life, earned: (life.earned || 0) / k } };
}
export const shopOf = S => SHOPS[Math.min(S.shop, SHOPS.length - 1)];
export const isLastShop = S => S.shop >= SHOPS.length - 1;
export const stDef = (S, id) => shopOf(S).stations.find(s => s.id === id);
export const stIndex = (S, id) => shopOf(S).stations.findIndex(s => s.id === id);
export const lvOf = (S, id) => S.st[id] || 0;

/* ---------- cấp trạm và mốc ---------- */
export const starsAt = lv => CFG.milestones.filter(m => lv >= m).length;
export const nextMs = lv => CFG.milestones.find(m => m > lv) ?? null;
export const prevMs = lv => [0, ...CFG.milestones].filter(m => m <= lv).pop();
export const capAt = lv => 1 + CFG.capAt.filter(a => lv >= a).length;

/* ---------- Kho báu: buff vĩnh viễn mua bằng kim cương ---------- */
export const vaultDef = id => VAULT.find(v => v.id === id);
export const vaultLv = (S, id) => (S.vault && S.vault[id]) || 0;
// Giá cấp kế tiếp (kim cương), null nếu đã tối đa.
export function vaultCost(S, id) {
  const v = vaultDef(id), lv = vaultLv(S, id);
  return !v || lv >= v.max ? null : VAULT_COST[Math.min(lv, VAULT_COST.length - 1)];
}
export function buyVault(S, id) {
  const c = vaultCost(S, id);
  if (c == null || S.gems < c) return false;
  S.gems -= c;
  S.vault = { ...S.vault, [id]: vaultLv(S, id) + 1 };
  return true;
}
const vf = (S, id) => vaultLv(S, id) * vaultDef(id).per;

/* ---------- tính năng mở dần theo tiến độ ---------- */
export function featureOn(S, key) {
  const f = FEATURES[key];
  if (!f) return false;
  if (S.shop > 0) return true;
  if (f.tasks != null && Object.keys(S.claimed).length < f.tasks) return false;
  if (f.stations != null && shopOf(S).stations.filter(s => lvOf(S, s.id) > 0).length < f.stations) return false;
  if (f.gems != null && S.gems < f.gems && !Object.keys(S.vault || {}).length) return false;
  return true;
}
// Tính năng vừa mở mà người chơi chưa thấy bảng ăn mừng (game hiện từng cái, rồi đánh dấu đã xem).
export const newFeatures = S => Object.keys(FEATURES).filter(k => featureOn(S, k) && !(S.seen && S.seen[k]));
export function markSeen(S, key) { S.seen = { ...S.seen, [key]: true }; }

/* ---------- tăng tốc: tiền ×2 một lúc, rồi hồi ---------- */
export const boostDur = S => CFG.boost.dur + vf(S, 'boost');
export const boostState = S => (S.boost.left > 0 ? 'active' : S.boost.cd > 0 ? 'cd' : 'ready');
export function activateBoost(S) {
  if (!featureOn(S, 'boost') || boostState(S) !== 'ready') return false;
  S.boost = { left: boostDur(S), cd: 0 };
  return true;
}
// Chạy đồng hồ tăng tốc thêm dt giây (cả lúc chơi lẫn lúc vắng mặt). Trả về 'end' | 'ready' | null.
export function tickBoost(S, dt) {
  const b = S.boost;
  if (b.left > 0) {
    b.left -= dt;
    if (b.left > 0) return null;
    const over = -b.left;
    b.left = 0;
    b.cd = Math.max(0, CFG.boost.cd - over);
    return b.cd > 0 ? 'end' : 'ready';
  }
  if (b.cd > 0) { b.cd -= dt; if (b.cd <= 0) { b.cd = 0; return 'ready'; } }
  return null;
}

// Mọi hệ số hiệu lực tính lại từ đầu mỗi lần gọi: cấp gốc + nâng cấp đã mua + Kho báu + tăng tốc.
// Không lưu đệm giá trị nào. opts.noBoost: bỏ tăng tốc (ước lượng tiền lúc vắng mặt).
export function derived(S, opts = {}) {
  const sh = shopOf(S), d = { staff: CFG.staff, walk: CFG.walk * (1 + vf(S, 'walk')), prep: 1 + vf(S, 'prep'), spawn: 1 + vf(S, 'spawn'), queue: CFG.queue, profit: {} };
  d.boost = !opts.noBoost && S.boost && S.boost.left > 0 ? CFG.boost.mul : 1;
  d.all = (1 + vf(S, 'profit')) * d.boost;
  sh.stations.forEach(s => { d.profit[s.id] = 1; });
  sh.upgrades.forEach(u => {
    if (!S.upg[u.id]) return;
    if (u.fx === 'staff') d.staff++;
    else if (u.fx === 'walk') d.walk *= u.v;
    else if (u.fx === 'prep') d.prep *= u.v;
    else if (u.fx === 'spawn') d.spawn *= u.v;
    else if (u.fx === 'queue') d.queue++;
    else if (u.fx === 'profit') {
      const ids = u.st === 'all' ? sh.stations.map(s => s.id) : [].concat(u.st);
      ids.forEach(id => { if (d.profit[id]) d.profit[id] *= u.v; });
    }
  });
  d.queue = Math.min(5, d.queue);
  d.gap = sh.gap / d.spawn;
  return d;
}

export function profitOf(S, id, lv = lvOf(S, id), D = derived(S)) {
  const s = stDef(S, id);
  return lv > 0 ? s.price * lv * 2 ** starsAt(lv) * D.profit[id] * D.all : 0;
}
export const prepOf = (S, id, D = derived(S)) => stDef(S, id).time / D.prep;
// Giá để lên từ cấp lv lên lv + 1.
export const levelCost = (S, id, lv) => stDef(S, id).cost * CFG.growth ** (lv - 1);

// Mua theo lô: mode là số cấp (1, 10), 'ms' (tới mốc kế tiếp) hoặc 'max' (nhiều nhất đủ tiền, ít nhất 1).
// Trả về { n, cost }; n = 0 khi trạm đã tối đa.
export function bulk(S, id, mode, money = S.money) {
  const lv = lvOf(S, id), room = CFG.maxLv - lv;
  if (lv < 1 || room <= 0) return { n: 0, cost: 0 };
  let want = mode === 'ms' ? (nextMs(lv) ?? CFG.maxLv) - lv : mode === 'max' ? room : mode;
  want = Math.min(want, room);
  let n = 0, cost = 0;
  while (n < want) {
    const c = levelCost(S, id, lv + n);
    if (mode === 'max' && n >= 1 && cost + c > money) break;
    cost += c;
    n++;
  }
  return { n, cost };
}
// Trả về số mốc vừa vượt qua (để game ăn mừng), -1 nếu không mua được.
export function buyLevels(S, id, mode) {
  const b = bulk(S, id, mode);
  if (!b.n || S.money < b.cost) return -1;
  const before = starsAt(lvOf(S, id));
  S.money -= b.cost;
  S.st[id] += b.n;
  if (S.ftue.first === 'go') S.ftue.first = 'done';
  const gained = starsAt(S.st[id]) - before;
  S.gems += gained * CFG.gemsPerStar;   // mỗi mốc cấp tặng kim cương
  return gained;
}

// Trạm mở lần lượt theo thứ tự; chỉ trạm khoá đầu tiên là mua được.
export const nextLocked = S => shopOf(S).stations.find(s => !lvOf(S, s.id)) || null;
export function unlock(S, id) {
  const n = nextLocked(S);
  if (!n || n.id !== id || S.money < n.unlock) return false;
  S.money -= n.unlock;
  S.st[id] = 1;
  if (S.ftue.unlock === 'go') S.ftue.unlock = 'done';
  return true;
}
export const upgDef = (S, id) => shopOf(S).upgrades.find(u => u.id === id);
export function buyUpgrade(S, id) {
  const u = upgDef(S, id);
  if (!u || S.upg[id] || S.money < u.cost) return false;
  S.money -= u.cost;
  S.upg[id] = true;
  if (S.ftue.upg === 'go') S.ftue.upg = 'done';
  return true;
}
export const upgList = S => shopOf(S).upgrades.filter(u => !S.upg[u.id]).sort((a, b) => a.cost - b.cost);

/* ---------- mô phỏng khách và nhân viên ---------- */
// W là thế giới tạm (không lưu): khách, nhân viên, chỗ đứng ở các trạm. Tải lại trang thì dựng W mới.
// opts.events = false: tắt khách VIP và món hot (kiểm thử đo thu nhập nền cho ổn định).
export function newWorld(S, opts = {}) {
  const W = { t: 0, spawnT: 0.6, uid: 0, cust: [], staff: [], spots: {}, D: derived(S), events: opts.events !== false, vipT: 40, hotT: 30, hot: null };
  for (let i = 0; i < W.D.staff; i++) addStaff(W);
  return W;
}
const between = ([a, b], rng) => a + (b - a) * rng();
// Món đang hot (id trạm) hoặc null.
export const hotSt = W => (W.hot && W.hot.left > 0 ? W.hot.st : null);
function addStaff(W) {
  const x = LAYOUT.staffHome[W.staff.length % LAYOUT.staffHome.length], z = (LAYOUT.serveZ + LAYOUT.workZ) / 2;
  const s = { id: ++W.uid, x, z, tx: x, tz: z, face: 0, moving: false, state: 'idle', job: null, t: 0, dur: 0, carry: null };
  W.staff.push(s);
  return s;
}
function walk(e, speed, dt) {
  const dx = e.tx - e.x, dz = e.tz - e.z, d = Math.hypot(dx, dz), st = speed * dt;
  if (d <= st) { e.x = e.tx; e.z = e.tz; e.moving = false; return true; }
  e.x += dx / d * st;
  e.z += dz / d * st;
  e.face = Math.atan2(dx, dz);
  e.moving = true;
  return false;
}
function freeSpot(W, S, st) {
  const arr = W.spots[st] || (W.spots[st] = []), cap = capAt(lvOf(S, st));
  for (let i = 0; i < cap; i++) if (!arr[i]) return i;
  return -1;
}
const CUST_SPEED = 1.7;
// Hướng quay: 0 = nhìn về phía khách (+z), π = nhìn vào quầy pha sát tường.
const FACE_OUT = 0, FACE_IN = Math.PI;

// Chạy mô phỏng thêm dt giây. Trả về danh sách sự kiện để game phát âm thanh và hiệu ứng.
export function step(S, W, dt, rng = Math.random) {
  const ev = [], D = W.D = derived(S), L = LAYOUT, sh = shopOf(S);
  W.t += dt;
  while (W.staff.length < D.staff) ev.push({ k: 'hire', s: addStaff(W) });

  // tăng tốc
  const b = tickBoost(S, dt);
  if (b) ev.push({ k: b === 'end' ? 'boostEnd' : 'boostReady' });

  const open = sh.stations.filter(s => lvOf(S, s.id) > 0);
  // món hot: thỉnh thoảng một món đang mở được săn đón một lúc
  if (W.events && featureOn(S, 'hot')) {
    if (W.hot) {
      if ((W.hot.left -= dt) <= 0) { ev.push({ k: 'hotEnd', st: W.hot.st }); W.hot = null; W.hotT = between(CFG.hot.every, rng); }
    } else if ((W.hotT -= dt) <= 0 && open.length >= 2) {
      W.hot = { st: rnd(open, rng).id, left: CFG.hot.dur };
      ev.push({ k: 'hot', st: W.hot.st });
    }
  }
  // khách VIP: đến hẹn thì người khách kế tiếp là VIP
  if (W.events && featureOn(S, 'vip') && W.vipT > 0) W.vipT -= dt;

  // khách tới: chỉ khi quầy còn chỗ đứng
  W.spawnT -= dt;
  if (W.spawnT <= 0) {
    const slots = L.slotsX[D.queue], used = new Set(W.cust.filter(c => c.state !== 'out').map(c => c.slot));
    const free = slots.map((_, i) => i).filter(i => !used.has(i));
    // khách VIP không chen vào quầy: đi thẳng tới ghế ở bàn VIP (slot -1), quầy kín vẫn vào được
    const vip = W.events && featureOn(S, 'vip') && W.vipT <= 0 && !W.cust.some(c => c.vip && c.state !== 'out');
    if (open.length && (vip || free.length)) {
      const [x, z] = L.door, hs = hotSt(W);
      const st = hs && rng() < CFG.hot.share ? hs : rnd(open, rng).id;
      if (vip) W.vipT = between(CFG.vip.every, rng) / (1 + vf(S, 'vip'));
      const slot = vip ? -1 : rnd(free, rng);
      const [tx, tz] = vip ? L.vipSpot : [slots[slot], L.custZ];
      const c = { id: ++W.uid, slot, x, z, tx, tz, face: 0, moving: true, state: 'in', st, who: 0, t: 0, seed: rng(), vip };
      W.cust.push(c);
      ev.push({ k: 'spawn', c });
      W.spawnT = D.gap * (0.7 + rng() * 0.6);
    } else W.spawnT = 0.4;
  }

  for (let i = W.cust.length - 1; i >= 0; i--) {
    const c = W.cust[i];
    if (c.state === 'in' && walk(c, CUST_SPEED, dt)) { c.state = 'wait'; c.face = c.vip ? L.vipFace : FACE_IN; ev.push({ k: 'order', c }); }
    // khách VIP đứng chờ người chơi tự tay rót; chờ quá lâu thì nhờ gấu pha (held: đang mở màn rót, đồng hồ dừng)
    else if (c.state === 'wait' && c.vip && !c.rush && !c.who && !c.held && (c.wt = (c.wt || 0) + dt) >= CFG.vip.wait) { c.rush = true; ev.push({ k: 'vipRush', c }); }
    else if (c.state === 'got' && (c.t += dt) > 0.55) { c.state = 'out'; [c.tx, c.tz] = L.door; }
    else if (c.state === 'out' && walk(c, CUST_SPEED * 1.1, dt)) { W.cust.splice(i, 1); ev.push({ k: 'gone', c }); }
  }

  for (const s of W.staff) {
    if (s.state === 'idle') {
      // khách chờ lâu nhất trước, bỏ qua khách mà trạm của món đang kín chỗ
      for (const c of W.cust) {
        if (c.state !== 'wait' || c.who || (c.vip && !c.rush)) continue;   // khách VIP để dành cho người chơi, trừ khi đã chờ quá lâu
        const spot = freeSpot(W, S, c.st);
        if (spot < 0) continue;
        W.spots[c.st][spot] = s.id;
        c.who = s.id;
        s.job = { c: c.id, st: c.st, spot };
        s.state = 'go';
        s.tx = L.stationX[stIndex(S, c.st)] + L.spotDX[spot];
        s.tz = L.workZ;
        break;
      }
    }
    if (s.state === 'go' && walk(s, D.walk, dt)) {
      s.state = 'brew'; s.t = 0; s.dur = prepOf(S, s.job.st, D); s.face = FACE_IN;
      ev.push({ k: 'brew', s, st: s.job.st });
    } else if (s.state === 'brew' && (s.t += dt) >= s.dur) {
      W.spots[s.job.st][s.job.spot] = 0;
      const c = W.cust.find(x => x.id === s.job.c);
      s.carry = s.job.st;
      s.state = 'deliver';
      s.tx = c ? Math.max(L.stationX[0], Math.min(L.stationX[L.stationX.length - 1], c.tx)) : s.x;
      s.tz = L.serveZ;
      ev.push({ k: 'ready', s, st: s.job.st });
    } else if (s.state === 'deliver' && walk(s, D.walk, dt)) {
      const c = W.cust.find(x => x.id === s.job.c);
      const hot = hotSt(W) === s.job.st, vip = !!(c && c.vip);
      // VIP tới tay gấu nghĩa là người chơi đã bỏ lỡ: trả giá an ủi, không tặng kim cương
      const amt = profitOf(S, s.job.st, undefined, D) * (hot ? CFG.hot.mul : 1) * (vip ? CFG.vip.auto.mul : 1);
      const gems = vip ? CFG.vip.auto.gems : 0;
      S.money += amt; S.earned += amt; S.served++; S.gems += gems;
      S.life.earned += amt; S.life.served++;
      ev.push({ k: 'serve', s, c, st: s.job.st, amt, hot, vip, gems });
      if (c) { c.state = 'got'; c.t = 0; }
      s.carry = null; s.job = null; s.state = 'idle'; s.face = FACE_OUT;
    }
  }
  return ev;
}
// Tiến độ pha của một trạm (0..1), lấy người pha lâu nhất; -1 nếu không ai đang pha.
export function brewProgress(W, st) {
  let p = -1;
  for (const s of W.staff) if (s.state === 'brew' && s.job.st === st) p = Math.max(p, Math.min(1, s.t / s.dur));
  return p;
}

/* ---------- khách VIP: người chơi tự tay rót ly ---------- */
// Khách VIP đang chờ người chơi (chưa quá giờ, chưa gấu nào nhận) hoặc null.
export const vipWaiting = W => W.cust.find(c => c.vip && c.state === 'wait' && !c.rush && !c.who) || null;
// Mở hay đóng màn rót: khách kiên nhẫn đứng chờ, đồng hồ chờ tạm dừng.
export function holdVip(W, id, held) { const c = W.cust.find(x => x.id === id); if (c) c.held = !!held; return c || null; }
// Vạch rót của một khách, tính từ seed để mỗi khách một chỗ: lo..hi là vùng ngon, center ± g là vạch vàng.
export function vipBand(seed) { const center = 0.55 + seed * 0.25; return { center, lo: center - CFG.vip.band / 2, hi: center + CFG.vip.band / 2, g: CFG.vip.gold / 2 }; }
// Chấm mức rót k (0..1): trúng vạch vàng, trong vùng ngon, hay trượt.
export function vipGrade(seed, k) { const b = vipBand(seed); return Math.abs(k - b.center) <= b.g ? 'perfect' : k >= b.lo && k <= b.hi ? 'good' : 'miss'; }
// Người chơi rót xong: tính tiền theo hạng, khách cầm ly rời quầy. Null nếu khách không còn chờ.
export function serveVip(S, W, id, grade) {
  const c = W.cust.find(x => x.id === id);
  if (!c || !c.vip || c.state !== 'wait' || c.rush || c.who) return null;
  const q = CFG.vip.q[grade] || CFG.vip.q.miss;
  const hot = hotSt(W) === c.st;
  const amt = profitOf(S, c.st, undefined, derived(S)) * (hot ? CFG.hot.mul : 1) * q.mul;
  S.money += amt; S.earned += amt; S.served++; S.gems += q.gems;
  S.life.earned += amt; S.life.served++;
  c.state = 'got'; c.t = 0; c.held = false;
  return { amt, gems: q.gems, grade, c, st: c.st, hot };
}

/* ---------- ước lượng thu nhập mỗi giây ---------- */
// Không chạy mô phỏng: lấy min của ba giới hạn (khách tới, sức nhân viên, sức trạm) nhân tiền trung bình một ly.
// Kiểm thử so con số này với mô phỏng thật để nó không lệch quá xa.
const EFF = 0.85;
export function rate(S, D = derived(S)) {
  const sh = shopOf(S), open = sh.stations.filter(s => lvOf(S, s.id) > 0), k = open.length;
  if (!k) return 0;
  const slots = LAYOUT.slotsX[D.queue], dz = LAYOUT.workZ - LAYOUT.serveZ;
  let P = 0, C = 0, cap = Infinity;
  open.forEach(s => {
    const sx = LAYOUT.stationX[sh.stations.indexOf(s)];
    const dx = slots.reduce((a, x) => a + Math.abs(x - sx), 0) / slots.length;
    const prep = s.time / D.prep;
    P += profitOf(S, s.id, undefined, D) / k;
    C += (2 * Math.hypot(dx, dz) / D.walk + prep) / k;
    cap = Math.min(cap, capAt(lvOf(S, s.id)) / prep * k);
  });
  // mỗi chỗ đứng bị giữ từ lúc khách bước vào cửa tới lúc cầm ly đi: đi vào + chờ pha + chờ đi ra
  const [ddx, ddz] = LAYOUT.door, walkIn = slots.reduce((a, x) => a + Math.hypot(x - ddx, LAYOUT.custZ - ddz), 0) / slots.length / CUST_SPEED;
  const queue = D.queue / (walkIn + C + 0.55);
  return Math.min(1 / D.gap, D.staff / C, cap, queue) * P * EFF;
}
// Tiền lúc vắng mặt: tính tối đa offlineCapH giờ, Kho báu "Két sắt lớn" cộng thêm giờ; không tính tăng tốc.
export const offlineCapH = S => CFG.offlineCapH + vf(S, 'offline');
export const offlineSecs = (S, secs) => Math.min(Math.max(0, secs), offlineCapH(S) * 3600);
export const offlineRate = S => rate(S, derived(S, { noBoost: true }));

/* ---------- nhiệm vụ ---------- */
// Loại nhiệm vụ: level (trạm đạt cấp), unlock (mở trạm), upg (mua một nâng cấp cụ thể),
// upgn (sở hữu đủ v nâng cấp bất kỳ của quán), served (phục vụ đủ v khách ở quán này).
export function taskProg(S, t) {
  const cur = t.k === 'level' ? lvOf(S, t.st) : t.k === 'unlock' ? +(lvOf(S, t.st) > 0) : t.k === 'upg' ? +!!S.upg[t.id] : t.k === 'upgn' ? Object.keys(S.upg).length : S.served;
  const need = t.k === 'unlock' || t.k === 'upg' ? 1 : t.v;
  return { cur: Math.min(cur, need), need, done: cur >= need };
}
export function taskText(S, t) {
  if (t.k === 'level') return `Nâng ${stDef(S, t.st).n} lên cấp ${t.v}`;
  if (t.k === 'unlock') return `Mở trạm ${stDef(S, t.st).n}`;
  if (t.k === 'upg') return upgDef(S, t.id).n;
  if (t.k === 'upgn') return `Mua đủ ${t.v} nâng cấp quán`;
  return `Phục vụ ${t.v} khách`;
}
export const tasks = S => shopOf(S).tasks.map((t, i) => ({ ...t, i, ...taskProg(S, t), claimed: !!S.claimed[i] }));
export function claimTask(S, i) {
  const t = shopOf(S).tasks[i];
  if (!t || S.claimed[i] || !taskProg(S, t).done) return 0;
  S.claimed[i] = true;
  S.money += t.r;
  S.gems += t.g ?? CFG.gemsPerTask;
  return t.r;
}
export const tasksClaimable = S => tasks(S).filter(t => t.done && !t.claimed).length;
export const allClaimed = S => shopOf(S).tasks.every((_, i) => S.claimed[i]);
export const canMove = S => allClaimed(S) && !isLastShop(S);
export function moveShop(S) {
  if (!canMove(S)) return false;
  const next = S.shop + 1;
  // Kho báu "Vốn khởi nghiệp": vốn đầu chi nhánh mới gấp (1 + cấp) lần
  Object.assign(S, freshShop(), { shop: next, money: SHOPS[next].start * (1 + vf(S, 'start')) });
  S.gems += CFG.gemsMove;
  S.st[SHOPS[next].stations[0].id] = 1;
  if (S.ftue.move === 'go') S.ftue.move = 'done';
  return true;
}

/* ---------- hướng dẫn theo ngữ cảnh: null → 'go' → 'done' ---------- */
// Bật đúng lúc lần đầu có việc để làm, tắt khi người chơi làm thật (trong buyLevels, unlock, buyUpgrade, moveShop).
// Trả về true nếu có cờ vừa đổi để game lưu lại.
export function checkTuts(S) {
  const f = S.ftue, before = JSON.stringify(f);
  if (!f.welcomed) return false;
  if (f.skip) { ['first', 'unlock', 'upg', 'move'].forEach(k => { if (f[k] !== 'done') f[k] = 'done'; }); }
  else {
    if (f.first == null) f.first = 'go';
    if (f.first === 'done') {
      const n = nextLocked(S);
      if (f.unlock == null && n && S.money >= n.unlock) f.unlock = 'go';
      if (f.upg == null && f.unlock !== 'go' && upgList(S).some(u => S.money >= u.cost)) f.upg = 'go';
    }
    if (f.move == null && canMove(S)) f.move = 'go';
  }
  return JSON.stringify(f) !== before;
}
// Nhiệm vụ lời mời: một câu gợi ý việc nên làm tiếp, cho người chơi đã tắt hướng dẫn cũng có hướng.
export function nextGoal(S) {
  const t = tasks(S).find(x => !x.claimed);
  return t ? { ...t, text: taskText(S, t) } : null;
}
