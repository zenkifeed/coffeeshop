// Kiểm thử logic thuần: số liệu, tiền và cấp trạm, mô phỏng khách và nhân viên, ước lượng thu nhập,
// nhiệm vụ và chuyển quán, hướng dẫn, lưu trữ, và mô phỏng cân bằng ba quán trên engine thật.
import { CFG, LAYOUT, SHOPS, BEARS } from '../src/data.js';
import * as L from '../src/logic.js';
import { playAll, seeded } from './balance.mjs';

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('  ✗ ' + msg); } };
const PROPS = ['espresso', 'can', 'carton', 'pitcher', 'kettle', 'icebin', 'syrup', 'cream'];
const FX = ['staff', 'walk', 'prep', 'spawn', 'queue', 'profit'];

console.log('Số liệu');
SHOPS.forEach(sh => {
  const ids = sh.stations.map(s => s.id), up = sh.upgrades.map(u => u.id);
  ok(sh.stations.length <= LAYOUT.stationX.length, `${sh.id}: số trạm vừa quầy`);
  ok(new Set(ids).size === ids.length && new Set(up).size === up.length, `${sh.id}: mã trạm và mã nâng cấp không trùng`);
  ok(sh.stations[0].unlock === 0, `${sh.id}: trạm đầu mở sẵn`);
  sh.stations.forEach((s, i) => {
    ok(PROPS.includes(s.prop), `${sh.id}/${s.id}: có mô hình ${s.prop}`);
    ok(/^#[0-9a-f]{6}$/i.test(s.c) && s.time > 0 && s.price > 0 && s.cost > 0, `${sh.id}/${s.id}: đủ màu, giá, thời gian`);
    if (i) ok(s.price > sh.stations[i - 1].price && s.unlock > sh.stations[i - 1].unlock, `${sh.id}/${s.id}: trạm sau đắt hơn và lãi hơn trạm trước`);
  });
  sh.upgrades.forEach(u => ok(FX.includes(u.fx) && u.cost > 0 && (u.fx !== 'profit' || u.st === 'all' || [].concat(u.st).every(x => ids.includes(x))), `${sh.id}/${u.id}: tác dụng hợp lệ`));
  sh.tasks.forEach((t, i) => ok((t.k !== 'level' && t.k !== 'unlock') || ids.includes(t.st) ? (t.k !== 'upg' || up.includes(t.id)) : false, `${sh.id}: nhiệm vụ ${i + 1} trỏ đúng trạm/nâng cấp`));
  ok(sh.start >= sh.stations[0].cost, `${sh.id}: tiền đầu quán đủ nâng cấp trạm đầu một lần (cho bước hướng dẫn)`);
});
ok(SHOPS.every((s, i) => !i || s.start > SHOPS[i - 1].start), 'quán sau khởi đầu với nhiều tiền hơn quán trước');
ok(SHOPS.every(sh => CFG.staff + sh.upgrades.filter(u => u.fx === 'staff').length <= BEARS.length), 'đủ bạn gấu cho số nhân viên tối đa ở mọi chi nhánh');
ok(SHOPS.every(sh => sh.upgrades.filter(u => u.fx === 'staff').every((u, i) => u.n.includes(BEARS[i + 1].n))), 'nâng cấp thuê gấu ghi đúng tên bạn gấu sẽ vào ca');
ok(SHOPS.every(sh => Number.isFinite(sh.theme.apron) && sh.theme.flags.length >= 2), 'mỗi chi nhánh có màu tạp dề và cờ dây');

console.log('Định dạng tiền');
[[0, '0đ'], [950, '950đ'], [1500, '1,5k'], [20000, '20k'], [999960, '1 tr'], [1.25e6, '1,25 tr'], [3.4e9, '3,4 tỷ'], [1.2e13, '12 nghìn tỷ'], [-2e4, '−20k']]
  .forEach(([n, s]) => ok(L.fmt(n) === s, `fmt(${n}) = ${s} (ra ${L.fmt(n)})`));

console.log('Cấp trạm');
{
  const S = L.freshState();
  const c1 = L.levelCost(S, 'den', 1), c2 = L.levelCost(S, 'den', 2);
  ok(c1 === SHOPS[0].stations[0].cost && Math.abs(c2 / c1 - CFG.growth) < 1e-9, 'giá cấp tăng theo hệ số growth');
  ok(L.bulk(S, 'den', 10).n === 10 && Math.abs(L.bulk(S, 'den', 10).cost - Array.from({ length: 10 }, (_, i) => L.levelCost(S, 'den', 1 + i)).reduce((a, b) => a + b)) < 1e-6, 'mua 10 cấp: cộng đúng giá từng cấp');
  ok(L.bulk(S, 'den', 'ms').n === 9, 'mua tới mốc: từ cấp 1 lên đúng cấp 10');
  S.money = 1e12;
  const p9 = (L.buyLevels(S, 'den', 8), L.profitOf(S, 'den'));
  const gained = L.buyLevels(S, 'den', 1);
  ok(L.lvOf(S, 'den') === 10 && gained === 1, 'qua cấp 10 báo đúng một mốc');
  ok(Math.abs(L.profitOf(S, 'den') / p9 - 10 / 9 * 2) < 1e-9, 'mốc cấp 10 nhân đôi tiền một ly');
  S.money = 0;
  ok(L.buyLevels(S, 'den', 1) === -1 && L.lvOf(S, 'den') === 10, 'thiếu tiền thì không mua được');
  const m = L.bulk(S, 'den', 'max');
  ok(m.n === 1, 'chế độ tối đa khi thiếu tiền vẫn hiện giá một cấp');
  S.money = L.levelCost(S, 'den', 10) + L.levelCost(S, 'den', 11) + 1;
  ok(L.bulk(S, 'den', 'max').n === 2, 'chế độ tối đa mua đúng số cấp đủ tiền');
  S.st.den = CFG.maxLv; S.money = 1e30;
  ok(L.bulk(S, 'den', 1).n === 0 && L.buyLevels(S, 'den', 1) === -1, 'cấp tối đa thì dừng');
  ok(L.capAt(24) === 1 && L.capAt(25) === 2 && L.capAt(75) === 3, 'cấp 25 và 75 thêm chỗ pha');
}

console.log('Mở trạm và nâng cấp');
{
  const S = L.freshState();
  S.money = 1e15;
  ok(!L.unlock(S, 'bacxiu'), 'không mở vượt thứ tự');
  ok(L.unlock(S, 'sua') && L.lvOf(S, 'sua') === 1, 'mở trạm kế tiếp');
  const m0 = S.money;
  ok(!L.unlock(S, 'sua') && S.money === m0, 'không mở lại trạm đã mở');
  const d0 = L.derived(S);
  ok(L.buyUpgrade(S, 'staff2') && L.derived(S).staff === d0.staff + 1, 'thuê thêm người');
  ok(!L.buyUpgrade(S, 'staff2'), 'không mua một nâng cấp hai lần');
  L.buyUpgrade(S, 'milk');
  ok(L.derived(S).profit.sua === 2 && L.derived(S).profit.bacxiu === 2 && L.derived(S).profit.den === 1, 'nâng cấp món chỉ nhân đúng các trạm ghi trong số liệu');
  L.buyUpgrade(S, 'queue4'); L.buyUpgrade(S, 'queue5');
  ok(L.derived(S).queue === 5 && LAYOUT.slotsX[5], 'tối đa 5 chỗ chờ, có đủ vị trí đứng');
}

console.log('Mô phỏng khách và nhân viên');
{
  const S = L.freshState(), rng = seeded(4);
  S.money = 1e15;
  SHOPS[0].stations.forEach(s => { if (!L.lvOf(S, s.id)) L.unlock(S, s.id); L.buyLevels(S, s.id, 30); });
  ['staff2', 'staff3', 'queue4'].forEach(id => L.buyUpgrade(S, id));
  const W = L.newWorld(S);
  let served = 0, paid = 0, overCap = 0, money = S.money, dropped = 0;
  const spawned = new Set(), gone = new Set();
  for (let t = 0; t < 600; t += 0.1) {
    const ev = L.step(S, W, 0.1, rng);
    ev.forEach(e => {
      if (e.k === 'spawn') spawned.add(e.c.id);
      if (e.k === 'gone') gone.add(e.c.id);
      if (e.k === 'serve') { served++; paid += e.amt; }
    });
    if (S.money < money) dropped++;
    money = S.money;
    Object.entries(W.spots).forEach(([st, a]) => { if (a.slice(L.capAt(L.lvOf(S, st))).some(Boolean)) overCap++; });
  }
  ok(served > 100, `10 phút phục vụ đủ đông (${served} ly)`);
  ok(dropped === 0, 'tiền chỉ tăng trong lúc bán');
  ok(overCap === 0, 'không trạm nào có quá số người pha cho phép');
  ok(W.staff.length === L.derived(S).staff, 'số nhân viên đúng với nâng cấp');
  const stuck = [...spawned].filter(id => !gone.has(id) && !W.cust.some(c => c.id === id));
  ok(stuck.length === 0, 'khách nào cũng hoặc đã về hoặc còn trong quán');
  ok(W.cust.filter(c => c.state !== 'out').length <= L.derived(S).queue, 'không quá số chỗ chờ');
  ok(S.served >= served && S.earned >= paid, 'số ly và tiền kiếm được ghi vào quán');
}

console.log('Ước lượng thu nhập so với mô phỏng');
{
  const measure = S => {
    const W = L.newWorld(S), rng = seeded(3);
    for (let t = 0; t < 60; t += 0.1) L.step(S, W, 0.1, rng);
    const e0 = S.earned;
    for (let t = 0; t < 600; t += 0.1) L.step(S, W, 0.1, rng);
    return (S.earned - e0) / 600;
  };
  const cfgs = [
    ['một trạm cấp 1', S => {}],
    ['hai trạm, hai người', S => { S.st.den = 20; S.st.sua = 10; S.upg.staff2 = true; }],
    ['ba trạm, ba người, biển hiệu', S => { S.st.den = 30; S.st.sua = 20; S.st.bacxiu = 10; S.upg.staff2 = S.upg.staff3 = S.upg.sign = true; }],
    ['đủ trạm, bốn người', S => { SHOPS[0].stations.forEach(s => { S.st[s.id] = 30; }); SHOPS[0].upgrades.forEach(u => { S.upg[u.id] = true; }); }],
  ];
  cfgs.forEach(([n, f]) => {
    const S = L.freshState(); f(S);
    const real = measure(S), r = L.rate(S) / real;
    ok(r > 0.7 && r < 1.4, `${n}: ước lượng/thật = ${r.toFixed(2)} (trong 0,7–1,4)`);
  });
  ok(L.offlineSecs(-5) === 0 && L.offlineSecs(99999) === CFG.offlineCapH * 3600, 'tiền vắng mặt tính tối đa ' + CFG.offlineCapH + ' giờ');
}

console.log('Nhiệm vụ và chuyển quán');
{
  const S = L.freshState();
  const t0 = L.tasks(S)[0];
  ok(!t0.done && L.claimTask(S, 0) === 0, 'chưa xong thì không nhận thưởng');
  S.money = 1e15;
  L.buyLevels(S, t0.st, t0.v - 1);
  const m0 = S.money, r = L.claimTask(S, 0);
  ok(r === t0.r && S.money === m0 + r, 'xong thì nhận đúng thưởng');
  ok(L.claimTask(S, 0) === 0, 'không nhận hai lần');
  ok(!L.canMove(S) && !L.moveShop(S), 'chưa xong hết nhiệm vụ thì chưa chuyển quán');
  SHOPS[0].tasks.forEach((t, i) => { S.claimed[i] = true; });
  S.shopName = 'Mây';
  ok(L.canMove(S) && L.moveShop(S), 'xong hết thì chuyển quán');
  ok(S.shop === 1 && S.money === SHOPS[1].start && L.lvOf(S, SHOPS[1].stations[0].id) === 1 && !Object.keys(S.upg).length && !Object.keys(S.claimed).length, 'quán mới: tiền đầu quán, chỉ mở trạm đầu, chưa nâng cấp gì');
  ok(S.shopName === 'Mây' && S.life.served === 0 && S.life.earned >= 0, 'giữ tên quán và số liệu trọn đời');
  S.shop = SHOPS.length - 1;
  SHOPS[S.shop].tasks.forEach((t, i) => { S.claimed[i] = true; });
  ok(!L.canMove(S), 'quán cuối không chuyển tiếp được');
}

console.log('Hướng dẫn');
{
  const S = L.freshState();
  ok(!L.checkTuts(S) && S.ftue.first == null, 'chưa qua thẻ chào mừng thì chưa hướng dẫn');
  S.ftue.welcomed = true;
  ok(L.checkTuts(S) && S.ftue.first === 'go', 'qua thẻ chào mừng thì bật bước nâng cấp đầu tiên');
  ok(L.buyLevels(S, 'den', 1) >= 0 && S.ftue.first === 'done', 'mua cấp thật thì xong bước đầu');
  S.money = 0; L.checkTuts(S);
  ok(S.ftue.unlock == null, 'chưa đủ tiền mở trạm thì chưa nhắc');
  S.money = SHOPS[0].stations[1].unlock; L.checkTuts(S);
  ok(S.ftue.unlock === 'go' && S.ftue.upg == null, 'đủ tiền mở trạm: nhắc mở trạm, chưa nhắc nâng cấp cùng lúc');
  L.unlock(S, 'sua'); L.checkTuts(S);
  ok(S.ftue.unlock === 'done', 'mở trạm thật thì xong nhắc');
  S.money = 1e7; L.checkTuts(S);
  ok(S.ftue.upg === 'go', 'đủ tiền một nâng cấp thì nhắc');
  const K = L.freshState();
  Object.assign(K.ftue, { welcomed: true, skip: true });
  L.checkTuts(K);
  ok(['first', 'unlock', 'upg', 'move'].every(k => K.ftue[k] === 'done'), 'bỏ qua hướng dẫn thì tắt hết');
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
  const mk = n => { const S = L.freshState(); S.money = n * 1000; S.served = n; return S; };

  globalThis.localStorage = new FakeStorage();
  ok(SV.storageOk(), 'máy cho lưu thì storageOk = true');
  ok(SV.readSave().status === 'none', 'chưa có bản lưu thì status none');
  ok(SV.writeSave(mk(5)), 'ghi bản lưu thành công');
  const back = SV.readSave();
  ok(back.status === 'ok' && back.data.money === 5000 && back.data.st.den === 1, 'đọc lại đúng tiền và cấp trạm');

  localStorage.setItem(SV.KEYS.main, '{"v":2,"st":');
  const bad = SV.readSave();
  ok(bad.status === 'corrupt' && localStorage.getItem(SV.KEYS.rescue) === '{"v":2,"st":', 'bản hỏng: báo corrupt và cất nguyên văn sang khoá cứu');
  localStorage.setItem(SV.KEYS.main, JSON.stringify({ v: 2, st: {}, shop: 'x', money: 1 }));
  ok(SV.readSave().status === 'corrupt', 'JSON đúng nhưng thiếu trường bắt buộc cũng là bản hỏng');

  globalThis.localStorage = new FakeStorage();
  localStorage.setItem(SV.KEYS.legacy, JSON.stringify({ v: 1, day: 12, shopName: 'Hạt Nâu', stock: {}, money: 5 }));
  const lg = SV.readSave();
  ok(lg.status === 'none' && lg.legacy && lg.legacy.shopName === 'Hạt Nâu' && lg.legacy.day === 12, 'có bản pha tay cũ: nhận ra người chơi cũ và giữ tên quán');

  globalThis.localStorage = new FakeStorage();
  [1, 2, 3, 4, 5].forEach(d => SV.rotateBackups(mk(d)));
  const list = SV.listBackups();
  ok(list.length === 3 && list.map(b => b.data.served).join(',') === '5,4,3', 'giữ đúng 3 bản gần nhất, mới nhất trước');

  const big = mk(9);
  big.pad = 'x'.repeat(20000);
  const size = JSON.stringify(big).length + SV.KEYS.main.length;
  globalThis.localStorage = new FakeStorage(size * 2.2);
  [6, 7, 8].forEach(() => SV.rotateBackups(big));
  ok(SV.writeSave(big) && SV.readSave().data.served === 9, 'bộ nhớ đầy: bỏ bản dự phòng để vẫn ghi được bản chính');

  globalThis.localStorage = new FakeStorage();
  localStorage.blocked = true;
  ok(!SV.storageOk() && !SV.writeSave(mk(1)) && SV.readSave().status === 'none', 'máy chặn lưu: không văng lỗi, báo không lưu được');
  SV.rotateBackups(mk(2));
  ok(SV.listBackups().length === 0, 'máy chặn lưu: xoay dự phòng và liệt kê cũng không văng lỗi');
  delete globalThis.localStorage;
}

console.log('Mô phỏng cân bằng ba quán (người chơi giả mua theo nhiệm vụ và lợi tức)');
{
  const BAND = [[10, 35], [10, 40], [10, 45]];
  const run = playAll(11);
  run.forEach((r, i) => {
    const first = r.marks[0] / 60, min = r.t / 60;
    console.log(`  ${r.shop}: xong sau ${min.toFixed(1)} phút, thưởng đầu tiên sau ${first.toFixed(1)} phút, két cuối ${L.fmt(r.money)}`);
    ok(r.ok, `${r.shop}: làm xong hết nhiệm vụ`);
    ok(min >= BAND[i][0] && min <= BAND[i][1], `${r.shop}: ${min.toFixed(1)} phút nằm trong ${BAND[i][0]}–${BAND[i][1]} phút`);
    ok(first < 1.5, `${r.shop}: có thưởng đầu tiên trong 1,5 phút`);
    const gaps = r.marks.map((m, k) => m - (r.marks[k - 1] || 0));
    ok(Math.max(...gaps) / 60 < 6, `${r.shop}: không phải chờ quá 6 phút giữa hai lần nhận thưởng (dài nhất ${(Math.max(...gaps) / 60).toFixed(1)})`);
  });
  ok(run.length === SHOPS.length, 'chơi qua được cả chuỗi quán');
}

console.log(`\n${passes} đạt, ${fails} trượt`);
process.exit(fails ? 1 : 0);
