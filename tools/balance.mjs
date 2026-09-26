// Mô phỏng cân bằng trên engine thật (logic.js), seed cố định để kết quả tái lập được.
// Người chơi giả: nhận thưởng nhiệm vụ ngay; bấm tăng tốc khi sẵn sàng, tiêu kim cương ở Kho báu; đủ tiền cho việc nhiệm vụ đang cần thì làm; không thì mua thứ
// hoàn vốn nhanh nhất nếu hoàn vốn dưới PAYBACK giây. Chạy riêng: node tools/balance.mjs
import { SHOPS } from '../src/data.js';
import * as L from '../src/logic.js';

export const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const PAYBACK = 600, DT = 0.1;
const VAULT_PICK = ['profit', 'prep', 'spawn', 'walk', 'vip', 'start', 'boost', 'offline'];

// Việc cần làm cho nhiệm vụ t: { cost, go() } hoặc null nếu chưa làm được (ví dụ phải mở trạm trước).
function taskAction(S, t) {
  if (t.k === 'level') {
    if (!L.lvOf(S, t.st)) return taskAction(S, { k: 'unlock', st: t.st });
    return { cost: L.levelCost(S, t.st, L.lvOf(S, t.st)), go: () => L.buyLevels(S, t.st, 1) };
  }
  if (t.k === 'unlock') {
    const n = L.nextLocked(S);
    return n ? { cost: n.unlock, go: () => L.unlock(S, n.id) } : null;
  }
  if (t.k === 'upg') return { cost: L.upgDef(S, t.id).cost, go: () => L.buyUpgrade(S, t.id) };
  return null;
}
function gainOf(S, apply, undo) { const r0 = L.rate(S); apply(); const r1 = L.rate(S); undo(); return r1 - r0; }
function bestBuy(S) {
  const c = [];
  L.shopOf(S).stations.forEach(s => {
    const lv = L.lvOf(S, s.id);
    if (lv > 0 && lv < 100) c.push({ cost: L.levelCost(S, s.id, lv), gain: gainOf(S, () => { S.st[s.id]++; }, () => { S.st[s.id]--; }), go: () => L.buyLevels(S, s.id, 1) });
  });
  const n = L.nextLocked(S);
  if (n) c.push({ cost: n.unlock, gain: gainOf(S, () => { S.st[n.id] = 1; }, () => { delete S.st[n.id]; }), go: () => L.unlock(S, n.id) });
  L.upgList(S).forEach(u => c.push({ cost: u.cost, gain: gainOf(S, () => { S.upg[u.id] = true; }, () => { delete S.upg[u.id]; }), go: () => L.buyUpgrade(S, u.id) }));
  return c.filter(x => x.gain > 0).map(x => ({ ...x, pay: x.cost / x.gain })).sort((a, b) => a.pay - b.pay)[0] || null;
}
function decide(S) {
  L.tasks(S).forEach(t => { if (t.done && !t.claimed) L.claimTask(S, t.i); });
  // người chơi thật bấm tăng tốc mỗi khi sẵn sàng và tiêu kim cương ở Kho báu, ưu tiên buff tăng tiền bán
  L.activateBoost(S);
  if (L.featureOn(S, 'vault')) for (const id of VAULT_PICK) if (L.buyVault(S, id)) return true;
  const t = L.tasks(S).find(x => !x.done);
  const ta = t && taskAction(S, t);
  if (ta && S.money >= ta.cost) { ta.go(); return true; }
  const b = bestBuy(S);
  if (b && b.pay < PAYBACK && S.money >= b.cost && (!ta || S.money - b.cost >= 0)) { b.go(); return true; }
  return false;
}

// Chơi một quán tới khi nhận hết thưởng nhiệm vụ. Trả về thời gian, mốc từng nhiệm vụ và độ lệch ước lượng.
export function playShop(S, rng, maxMin = 240) {
  const W = L.newWorld(S), marks = [];
  let t = 0, next = 0, checkT = 60, earned0 = S.earned, est = [];
  while (t < maxMin * 60) {
    L.step(S, W, DT, rng);
    t += DT;
    if (t >= next) {
      next = t + 0.5;
      const before = Object.keys(S.claimed).length;
      while (decide(S));
      if (Object.keys(S.claimed).length > before) marks.push(t);
      if (L.allClaimed(S)) return { ok: true, t, marks, est, money: S.money };
    }
    // mỗi phút: so tiền thật kiếm được với ước lượng rate() ở đầu phút
    if (t >= checkT) { est.push({ real: (S.earned - earned0) / 60, guess: L.rate(S) }); earned0 = S.earned; checkT += 60; }
  }
  return { ok: false, t, marks, est, money: S.money };
}

export function playAll(seed = 11) {
  const rng = seeded(seed), S = L.freshState(), out = [];
  for (let i = 0; i < SHOPS.length; i++) {
    const r = playShop(S, rng);
    out.push({ shop: SHOPS[i].n, ...r });
    if (!r.ok) break;
    if (!L.isLastShop(S)) L.moveShop(S);
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('balance.mjs')) {
  for (const r of playAll()) {
    console.log(`${r.shop}: ${r.ok ? 'xong' : 'CHƯA XONG'} sau ${(r.t / 60).toFixed(1)} phút · két ${L.fmt(r.money)}`);
    console.log('  nhận thưởng lúc (phút): ' + r.marks.map(m => (m / 60).toFixed(1)).join(' · '));
    const dev = r.est.filter(e => e.real > 0).map(e => e.guess / e.real);
    console.log('  ước lượng/thật: ' + dev.filter((_, i) => i % 3 === 0).map(x => x.toFixed(2)).join(' '));
  }
}
