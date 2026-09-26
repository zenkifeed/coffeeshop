// Logic thuần của game: không đụng DOM hay Three.js, để chạy được trong Node khi kiểm thử.
// Gồm: tiền và cấp trạm, derived() gom mọi hệ số, mô phỏng khách và nhân viên theo từng bước thời gian,
// ước lượng thu nhập mỗi giây (dùng cho tiền lúc vắng mặt), nhiệm vụ, chuyển quán và cờ hướng dẫn.
import { CFG, LAYOUT, SHOPS } from './data.js';

export const rnd = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];

/* ---------- định dạng tiền: k, tr, tỷ, nghìn tỷ ---------- */
const UNITS = [[1e15, ' triệu tỷ'], [1e12, ' nghìn tỷ'], [1e9, ' tỷ'], [1e6, ' tr'], [1e3, 'k']];
export function fmt(n) {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '−' : '';
  n = Math.abs(n);
  if (n < 1e3) return sign + Math.round(n) + 'đ';
  if (n >= 1e18) return sign + n.toExponential(2).replace('.', ',').replace('e+', 'e');
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
export function freshState(shop = 0) {
  const S = { v: 2, shop, money: SHOPS[shop].start, ...freshShop(), shopName: '', life: { served: 0, earned: 0 }, ftue: newFtue(), at: 0 };
  S.st[SHOPS[shop].stations[0].id] = 1;
  return S;
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

// Mọi hệ số hiệu lực tính lại từ đầu mỗi lần gọi: cấp gốc + nâng cấp đã mua. Không lưu đệm giá trị nào.
export function derived(S) {
  const sh = shopOf(S), d = { staff: CFG.staff, walk: CFG.walk, prep: 1, spawn: 1, queue: CFG.queue, profit: {} };
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
  return lv > 0 ? s.price * lv * 2 ** starsAt(lv) * D.profit[id] : 0;
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
  return starsAt(S.st[id]) - before;
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
export function newWorld(S) {
  const W = { t: 0, spawnT: 0.6, uid: 0, cust: [], staff: [], spots: {}, D: derived(S) };
  for (let i = 0; i < W.D.staff; i++) addStaff(W);
  return W;
}
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

  // khách tới: chỉ khi quầy còn chỗ đứng
  W.spawnT -= dt;
  if (W.spawnT <= 0) {
    const slots = L.slotsX[D.queue], used = new Set(W.cust.filter(c => c.state !== 'out').map(c => c.slot));
    const free = slots.map((_, i) => i).filter(i => !used.has(i));
    const open = sh.stations.filter(s => lvOf(S, s.id) > 0);
    if (free.length && open.length) {
      const slot = rnd(free, rng), [x, z] = L.door;
      const c = { id: ++W.uid, slot, x, z, tx: slots[slot], tz: L.custZ, face: 0, moving: true, state: 'in', st: rnd(open, rng).id, who: 0, t: 0, seed: rng() };
      W.cust.push(c);
      ev.push({ k: 'spawn', c });
      W.spawnT = D.gap * (0.7 + rng() * 0.6);
    } else W.spawnT = 0.4;
  }

  for (let i = W.cust.length - 1; i >= 0; i--) {
    const c = W.cust[i];
    if (c.state === 'in' && walk(c, CUST_SPEED, dt)) { c.state = 'wait'; c.face = FACE_IN; ev.push({ k: 'order', c }); }
    else if (c.state === 'got' && (c.t += dt) > 0.55) { c.state = 'out'; [c.tx, c.tz] = L.door; }
    else if (c.state === 'out' && walk(c, CUST_SPEED * 1.1, dt)) { W.cust.splice(i, 1); ev.push({ k: 'gone', c }); }
  }

  for (const s of W.staff) {
    if (s.state === 'idle') {
      // khách chờ lâu nhất trước, bỏ qua khách mà trạm của món đang kín chỗ
      for (const c of W.cust) {
        if (c.state !== 'wait' || c.who) continue;
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
      s.tx = c ? c.tx : s.x;
      s.tz = L.serveZ;
      ev.push({ k: 'ready', s, st: s.job.st });
    } else if (s.state === 'deliver' && walk(s, D.walk, dt)) {
      const c = W.cust.find(x => x.id === s.job.c);
      const amt = profitOf(S, s.job.st, undefined, D);
      S.money += amt; S.earned += amt; S.served++;
      S.life.earned += amt; S.life.served++;
      ev.push({ k: 'serve', s, c, st: s.job.st, amt });
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
export const offlineSecs = secs => Math.min(Math.max(0, secs), CFG.offlineCapH * 3600);

/* ---------- nhiệm vụ ---------- */
export function taskProg(S, t) {
  const cur = t.k === 'level' ? lvOf(S, t.st) : t.k === 'unlock' ? +(lvOf(S, t.st) > 0) : t.k === 'upg' ? +!!S.upg[t.id] : S.served;
  const need = t.k === 'level' || t.k === 'served' ? t.v : 1;
  return { cur: Math.min(cur, need), need, done: cur >= need };
}
export function taskText(S, t) {
  if (t.k === 'level') return `Nâng ${stDef(S, t.st).n} lên cấp ${t.v}`;
  if (t.k === 'unlock') return `Mở trạm ${stDef(S, t.st).n}`;
  if (t.k === 'upg') return upgDef(S, t.id).n;
  return `Phục vụ ${t.v} khách`;
}
export const tasks = S => shopOf(S).tasks.map((t, i) => ({ ...t, i, ...taskProg(S, t), claimed: !!S.claimed[i] }));
export function claimTask(S, i) {
  const t = shopOf(S).tasks[i];
  if (!t || S.claimed[i] || !taskProg(S, t).done) return 0;
  S.claimed[i] = true;
  S.money += t.r;
  return t.r;
}
export const tasksClaimable = S => tasks(S).filter(t => t.done && !t.claimed).length;
export const allClaimed = S => shopOf(S).tasks.every((_, i) => S.claimed[i]);
export const canMove = S => allClaimed(S) && !isLastShop(S);
export function moveShop(S) {
  if (!canMove(S)) return false;
  const next = S.shop + 1;
  Object.assign(S, freshShop(), { shop: next, money: SHOPS[next].start });
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
