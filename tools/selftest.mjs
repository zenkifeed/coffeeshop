// Kiểm thử logic thuần: công thức, gợi ý từng bước, kho, đơn hàng, chấm sao, và mô phỏng kinh tế 30 ngày.
import { ING, COMP, DRINKS, CFG } from '../src/data.js';
import * as L from '../src/logic.js';

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('  ✗ ' + msg); } };
const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const stockAll = (S, q = 200) => Object.keys(ING).forEach(k => L.addStock(S, k, q));
const unlockAll = S => Object.keys(DRINKS).forEach(k => { S.unlocked[k] = true; });

console.log('Công thức');
const keys = Object.keys(DRINKS);
keys.forEach(k => ok(L.identifyDrink({ comps: [...DRINKS[k].comps].reverse() }) === k, `nhận diện ${k} không phụ thuộc thứ tự`));
ok(new Set(keys.map(k => [...DRINKS[k].comps].sort().join('+'))).size === keys.length, 'không có hai món trùng công thức');
keys.forEach(k => DRINKS[k].comps.forEach(c => ok(COMP[c], `${k}: thành phần ${c} tồn tại`)));

console.log('So khớp ly');
const o = { drink: 'bacxiu', size: 'L', ice: true };
const good = { size: 'L', ice: true, comps: ['milk', 'shot', 'condensed'] };
ok(L.cupMatches(good, o), 'ly đúng khớp');
ok(!L.cupMatches({ ...good, size: 'M' }, o), 'sai size không khớp');
ok(!L.cupMatches({ ...good, ice: false }, o), 'thiếu đá không khớp');
ok(!L.cupMatches({ ...good, comps: ['shot', 'condensed'] }, o), 'thiếu sữa không khớp');
ok(!L.cupMatches({ ...good, comps: [...good.comps, 'water'] }, o), 'dư nước không khớp');

console.log('Làm theo gợi ý luôn ra đúng món');
for (const k of keys) for (const size of ['M', 'L']) for (const ice of [true, false]) {
  const ord = { drink: k, size, ice }, cup = L.newCup();
  let steps = 0, hint;
  while ((hint = L.nextHint(cup, ord)) !== 'Chạm vào khách để giao ly' && steps++ < 10) {
    if (hint.startsWith('Chạm chồng ly')) cup.size = size;
    else if (hint.startsWith('Nhấn giữ')) cup.comps.push('shot');
    else if (hint === 'Thêm đá') cup.ice = true;
    else { const c = Object.keys(COMP).find(x => hint === 'Thêm ' + COMP[x].n.toLowerCase()); if (!c) break; cup.comps.push(c); }
  }
  ok(L.cupMatches(cup, ord), `gợi ý dẫn tới ${k} ${size} ${ice ? 'đá' : 'nóng'} (dừng ở: ${hint})`);
}
ok(L.nextHint({ size: 'M', comps: ['shot', 'water'], ice: false }, { drink: 'den', size: 'M', ice: false }).startsWith('Dư'), 'báo dư thành phần');
ok(L.nextHint({ size: 'M', comps: ['shot'], ice: true }, { drink: 'den', size: 'M', ice: false }).includes('đổ ly'), 'báo dư đá ở ly nóng');

console.log('Chất lượng shot');
ok(L.shotQuality(0.5) === 'weak' && L.shotQuality(0.74) === 'ok' && L.shotQuality(0.95) === 'strong', 'ba vùng chất lượng');
ok(L.shotQuality(0.6, true) === 'ok' && L.shotQuality(0.6, false) === 'weak', 'máy xay nới rộng vùng chuẩn');
const holdOk = [CFG.shot.lo / CFG.shot.rate, CFG.shot.hi / CFG.shot.rate];
ok(holdOk[1] - holdOk[0] > 0.45 && holdOk[0] > 1, `cửa sổ thả tay ${holdOk.map(x => x.toFixed(2)).join('–')}s đủ rộng để người chơi kịp`);

console.log('Kho theo mẻ');
{
  const S = L.freshState(seeded(1));
  L.addStock(S, 'milk', 10);
  ok(S.stock.milk[0].exp === 3, 'sữa mua ngày 1 hết hạn cuối ngày 3');
  S.day = 2; L.addStock(S, 'milk', 5);
  ok(L.take(S, 'milk') && S.stock.milk[0].q === 9, 'lấy mẻ cũ trước');
  S.day = 3;
  const w = L.expireStock(S);
  ok(w.length === 1 && w[0].q === 9 && L.qty(S, 'milk') === 5, 'đổ đúng mẻ quá hạn');
  L.addStock(S, 'cup', 3);
  ok(L.expireStock(S).every(x => x.k !== 'cup'), 'ly không hết hạn');
}

console.log('Đơn hàng');
{
  const rng = seeded(7), S = L.freshState(rng);
  stockAll(S);
  let bad = 0;
  for (let i = 0; i < 3000; i++) { const x = L.genOrder(S, rng); if (x.leave || !S.unlocked[x.drink]) bad++; }
  ok(bad === 0, 'ngày 1 chỉ gọi món đã mở, không ai bỏ về khi đủ hàng');
  const S2 = L.freshState(rng);
  let so = 0;
  for (let i = 0; i < 500; i++) if (L.genOrder(S2, rng).leave === 'soldout') so++;
  ok(so === 500, 'kho trống thì mọi khách về vì hết hàng');
  const S3 = L.freshState(rng); stockAll(S3);
  Object.keys(DRINKS).forEach(k => { S3.sell[k] = DRINKS[k].price * 2; });
  let pr = 0;
  for (let i = 0; i < 2000; i++) if (L.genOrder(S3, rng).leave === 'pricey') pr++;
  ok(pr > 1400 && pr < 1800, `giá gấp đôi: khoảng 80% khách bỏ đi (đo được ${(pr / 20).toFixed(0)}%)`);
  const S4 = L.freshState(rng); stockAll(S4); S4.day = 1;
  let iced = 0;
  for (let i = 0; i < 1000; i++) if (L.genOrder(S4, rng).ice) iced++;
  ok(iced === 1000, 'cấp 1 không hỏi nóng hay đá, món mặc định là đá');
  S4.day = CFG.levels.l2; unlockAll(S4);
  let hot = 0;
  for (let i = 0; i < 2000; i++) if (!L.genOrder(S4, rng).ice) hot++;
  ok(hot > 400 && hot < 1400, 'cấp 2 có cả nóng lẫn đá');
}

console.log('Chấm sao');
{
  const rng = seeded(3), S = L.freshState(rng);
  let five = 0, out = 0;
  for (let i = 0; i < 4000; i++) {
    const c = { cups: [{ drink: 'sua', size: 'M', ice: true }], pat: 45, max: 50, wrong: 0, shotPen: 0 };
    const r = L.stars(S, c, rng);
    if (r.s === 5) five++;
    if (r.s < 1 || r.s > 5) out++;
  }
  ok(out === 0, 'sao luôn trong 1–5');
  ok(five / 4000 > 0.85, `pha đúng và nhanh gần như chắc 5 sao (${(five / 40).toFixed(0)}%)`);
  const slow = L.stars(S, { cups: [{ drink: 'sua', size: 'M', ice: true }], pat: 2, max: 50, wrong: 1, shotPen: 1 }, () => 0.5);
  ok(slow.s === 1, 'chờ lâu + sai món + shot lỗi = 1 sao');
  const t = [1, 2, 3, 4, 5].map(r => { S.reviews = Array(30).fill({ s: r }); return L.traffic(S); });
  ok(t.every((v, i) => i === 0 || v > t[i - 1]), 'sao cao hơn thì khách đông hơn');
  S.reviews = [];
  const base = L.traffic(S);
  Object.keys(DRINKS).forEach(k => { S.sell[k] = Math.round(DRINKS[k].price * 0.7); });
  ok(L.traffic(S) > base, 'giá rẻ kéo thêm khách');
}

console.log('Mô phỏng kinh tế 30 ngày');
function simulate(skill, seed) {
  const rng = seeded(seed), S = L.freshState(rng);
  const log = [];
  for (let d = 0; d < 30; d++) {
    const want = { cup: 30, beans: 30, ice: 20 };
    L.ingInUse(S).forEach(k => {
      const need = (want[k] || 15) - L.qty(S, k);
      if (need <= 0) return;
      const q = Math.ceil(need / ING[k].pack) * ING[k].pack, cost = q * L.ingCost(S, k);
      if (cost <= S.money) { L.addStock(S, k, q); S.money -= cost; S.cur.buy += cost; }
    });
    const next = Object.keys(DRINKS).find(k => !S.unlocked[k]);
    if (next && S.money > DRINKS[next].unlock + 400000) { S.money -= DRINKS[next].unlock; S.cur.upgrades += DRINKS[next].unlock; S.unlocked[next] = true; }
    const T = CFG.dayMinutes * 60;
    for (let t = 0; t < T;) {
      t += L.spawnGap(S, t / T, rng);
      const n = L.cupCount(S, rng), cups = [];
      let leave = false;
      for (let i = 0; i < n; i++) { const x = L.genOrder(S, rng); if (x.leave) { leave = true; break; } cups.push(x); }
      if (leave) { S.cur.lost++; continue; }
      const max = L.patienceFor(S, cups);
      if (rng() > skill) { S.cur.lost++; L.addReview(S, 1, 'timeout', 'x', rng); continue; }
      const c = { cups, done: cups.map(() => true), pat: max * (0.35 + rng() * 0.6), max, wrong: rng() < 0.05 ? 1 : 0, shotPen: rng() < 0.15 ? 1 : 0 };
      for (const o of cups) {
        L.take(S, 'cup'); if (o.ice) L.take(S, 'ice');
        DRINKS[o.drink].comps.forEach(k => { if (COMP[k].ing) L.take(S, COMP[k].ing); });
        const p = L.priceOf(S, o); S.money += p; S.cur.sales += p; S.cur.served++;
      }
      const st = L.stars(S, c, rng), tip = L.tipFor(S, c);
      S.money += tip; S.cur.tips += tip;
      L.addReview(S, st.s, st.why, 'x', rng);
    }
    const r = L.endDay(S, rng);
    log.push({ day: r.rec.day, served: r.rec.served, profit: r.profit, money: S.money, broke: r.broke });
    if (r.broke) break;
  }
  return log;
}
{
  const good = simulate(0.9, 11), bad = simulate(0.25, 11);
  const d1 = good[0], last = good[good.length - 1];
  console.log(`  người chơi giỏi: ngày 1 bán ${d1.served} ly, lãi ${(d1.profit / 1000).toFixed(0)}k · ngày ${last.day} két ${(last.money / 1e6).toFixed(2)} triệu`);
  console.log(`  người chơi kém: ${bad.length} ngày, két cuối ${(bad[bad.length - 1].money / 1000).toFixed(0)}k${bad[bad.length - 1].broke ? ' (phá sản)' : ''}`);
  ok(d1.served >= 12 && d1.served <= 40, 'ngày 1 có 12–40 ly, đủ bận mà không ngợp');
  ok(good.every(x => !x.broke), 'người chơi giỏi không phá sản trong 30 ngày');
  ok(last.money > 3e6 && last.money < 40e6, 'người chơi giỏi sau 30 ngày có 3–40 triệu, đủ mua hết nâng cấp nhưng không lạm phát');
  ok(bad[bad.length - 1].money < last.money / 3, 'chơi kém thì nghèo hơn hẳn');
}

console.log('Lưu trữ');
{
  // localStorage giả: đặt quota để giả lập bộ nhớ đầy, blocked để giả lập máy chặn lưu.
  class FakeStorage {
    constructor(quota = Infinity) { this.m = new Map(); this.quota = quota; this.blocked = false; }
    get used() { let n = 0; this.m.forEach((v, k) => { n += k.length + v.length; }); return n; }
    getItem(k) { if (this.blocked) throw new Error('SecurityError'); return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) {
      if (this.blocked) throw new Error('SecurityError');
      v = String(v);
      const old = this.m.has(k) ? k.length + this.m.get(k).length : 0;
      if (this.used - old + k.length + v.length > this.quota) throw new Error('QuotaExceededError');
      this.m.set(k, v);
    }
    removeItem(k) { this.m.delete(k); }
  }
  const SV = await import('../src/save.js');
  const mk = day => { const S = L.freshState(seeded(day)); S.day = day; S.money = day * 1000; return S; };

  globalThis.localStorage = new FakeStorage();
  ok(SV.storageOk(), 'máy cho lưu thì storageOk = true');
  ok(SV.readSave().status === 'none', 'chưa có bản lưu thì status none');
  const s5 = mk(5); s5.dayT = 77;
  ok(SV.writeSave(s5), 'ghi bản lưu thành công');
  const back = SV.readSave();
  ok(back.status === 'ok' && back.data.day === 5 && back.data.dayT === 77, 'đọc lại đúng ngày và giờ còn lại giữa ngày');

  localStorage.setItem(SV.KEYS.main, '{"v":1,"stock":');
  const bad = SV.readSave();
  ok(bad.status === 'corrupt' && localStorage.getItem(SV.KEYS.rescue) === '{"v":1,"stock":', 'bản hỏng: báo corrupt và cất nguyên văn sang khoá cứu');
  localStorage.setItem(SV.KEYS.main, JSON.stringify({ v: 1, stock: {}, day: 'x', money: 1 }));
  ok(SV.readSave().status === 'corrupt', 'JSON đúng nhưng thiếu trường bắt buộc cũng là bản hỏng');

  globalThis.localStorage = new FakeStorage();
  [1, 2, 3, 4, 5].forEach(d => SV.rotateBackups(mk(d)));
  const list = SV.listBackups();
  ok(list.length === 3 && list.map(b => b.data.day).join(',') === '5,4,3', 'giữ đúng 3 cuối ngày gần nhất, mới nhất trước');

  const big = mk(9);
  big.reviews = Array.from({ length: 300 }, (_, i) => ({ s: 5, t: 'x'.repeat(60) + i, n: 'A', d: 1 }));
  const size = JSON.stringify(big).length + SV.KEYS.main.length;
  globalThis.localStorage = new FakeStorage(size * 2.2);
  [6, 7, 8].forEach(d => SV.rotateBackups(big));
  ok(SV.writeSave(big) && SV.readSave().data.day === 9, 'bộ nhớ đầy: bỏ bản dự phòng để vẫn ghi được bản chính');

  globalThis.localStorage = new FakeStorage();
  localStorage.blocked = true;
  ok(!SV.storageOk() && !SV.writeSave(mk(1)) && SV.readSave().status === 'none', 'máy chặn lưu: không văng lỗi, báo không lưu được');
  SV.rotateBackups(mk(2));
  ok(SV.listBackups().length === 0, 'máy chặn lưu: xoay dự phòng và liệt kê cũng không văng lỗi');
  delete globalThis.localStorage;
}

console.log('Hướng dẫn lần đầu và nhiệm vụ tân binh');
{
  const { ROOKIE } = await import('../src/data.js');
  const S = L.freshState(seeded(5));
  ok(S.ftue && !S.ftue.welcomed && !S.ftue.coached, 'quán mới: chưa chào mừng, chưa hướng dẫn');
  ok(!L.rookieActive(S), 'chưa qua thẻ chào mừng thì chưa hiện nhiệm vụ');
  S.ftue.welcomed = true;
  ok(L.rookieActive(S), 'qua thẻ chào mừng thì hiện nhiệm vụ');
  ok(L.rookieDone(S, 'sale') && !L.rookieDone(S, 'sale'), 'đánh dấu xong chỉ báo đúng một lần');
  ok(!L.rookieDone(S, 'khong-co'), 'mã nhiệm vụ lạ thì bỏ qua');
  ok(L.rookieClaim(S, 'perfect') === 0, 'chưa xong thì không nhận được thưởng');
  const m0 = S.money, v = L.rookieClaim(S, 'sale');
  ok(v === ROOKIE[0].reward && S.money === m0 + v && S.cur.bonus === v, 'nhận thưởng: cộng két và ghi vào sổ ngày');
  ok(L.rookieClaim(S, 'sale') === 0 && S.money === m0 + v, 'không nhận thưởng hai lần');
  ok(L.recRevenue(S.cur) === v, 'thưởng nhiệm vụ tính vào doanh thu ngày');
  ROOKIE.forEach(t => { L.rookieDone(S, t.id); L.rookieClaim(S, t.id); });
  ok(!L.rookieActive(S), 'nhận hết thì danh sách tự ẩn');

  const vet = L.freshState(seeded(6));
  delete vet.ftue; vet.day = 12;
  L.migrateFtue(vet);
  ok(vet.ftue.welcomed && vet.ftue.coached && !L.rookieActive(vet), 'bản lưu cũ đã chơi: không bắt học lại, không hiện nhiệm vụ');
  const fresh = L.freshState(seeded(7));
  delete fresh.ftue;
  L.migrateFtue(fresh);
  ok(!fresh.ftue.welcomed, 'bản lưu cũ chưa chơi ngày nào: vẫn được hướng dẫn');

  const T = L.freshState(seeded(8));
  T.ftue.welcomed = T.ftue.coached = true;
  T.money = 100000;
  ok(!L.checkMenuTut(T) && T.ftue.menuTut == null, 'chưa đủ tiền mở món thì chưa nhắc');
  T.money = 200000;
  ok(L.checkMenuTut(T) && T.ftue.menuTut === 'go', 'lần đầu đủ tiền mở món rẻ nhất thì bật nhắc');
  ok(!L.checkMenuTut(T), 'đang nhắc thì không bật lại');
  const U = L.freshState(seeded(9));
  Object.assign(U.ftue, { welcomed: true, coached: true, skip: true });
  U.money = 900000;
  ok(!L.checkMenuTut(U), 'người chơi đã bỏ qua hướng dẫn thì không nhắc');
  const V = L.freshState(seeded(10));
  V.ftue.welcomed = V.ftue.coached = true; V.money = 900000; V.unlocked.latte = true;
  ok(!L.checkMenuTut(V), 'đã tự mở món rồi thì không nhắc');
}

console.log(`\n${passes} đạt, ${fails} trượt`);
process.exit(fails ? 1 : 0);
