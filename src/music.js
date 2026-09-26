// Nhạc nền lo-fi "quán cà phê chill" tổng hợp lúc chạy, không có file nhạc.
// Piano điện ấm rải hợp âm jazz, bass tròn, trống chổi khẽ, vài nốt kalimba có tiếng vọng, lách tách đĩa than.
// Hai đoạn A/B mỗi đoạn 8 ô nhịp luân phiên, hợp âm đảo và nhịp đánh ngẫu nhiên nhẹ để nghe lâu không nhàm.
//
// Dùng chung AudioContext và master với audio.js (qua audioBus), đi nhánh riêng musicGain nên bật tắt
// độc lập với tiếng hiệu ứng. Bộ hẹn giờ lên lịch trước theo ctx.currentTime (setInterval, không dùng
// requestAnimationFrame) nên nhạc không giật khi khung hình chậm. Không bao giờ ném lỗi: máy không có
// Web Audio thì im lặng.
import { audioBus } from './audio.js';

const BPM = 74, LOOKAHEAD = 0.15, TICK = 30, FADE = 0.6;
const VOL = 0.45;            // âm lượng nhạc so với master: đỉnh vẫn ngang tiếng hiệu ứng nhỏ, không át tiếng tiền
const SWING = 0.3;           // nốt móc kép lẻ trễ 30% độ dài một móc kép: nhịp đung đưa kiểu lo-fi

let bus = null, musicGain = null, echoSend = null, timer = null;
let on = true, step = 0, nextTime = 0, resync = true, duckUntil = 0, duckTo = 1;

const hz = m => 440 * 2 ** ((m - 69) / 12);
const chance = p => Math.random() < p;
const pick = a => a[Math.floor(Math.random() * a.length)];

// Hợp âm: bass (MIDI) + các nốt piano. Đoạn A êm (Fmaj9 Em7 Dm9 Cmaj9), đoạn B có màu hơn (Am9 Dm9 G13 Cmaj9).
const A = [
  { b: 41, n: [57, 60, 64, 67] },
  { b: 40, n: [55, 59, 62, 64] },
  { b: 38, n: [53, 57, 60, 64] },
  { b: 36, n: [52, 55, 59, 62] },
];
const B = [
  { b: 45, n: [60, 64, 67, 71] },
  { b: 38, n: [53, 57, 60, 64] },
  { b: 43, n: [53, 59, 64, 65] },
  { b: 36, n: [52, 55, 59, 62] },
];
const MEL = [72, 74, 76, 79, 81, 84];   // ngũ cung Đô trưởng: nốt nào cũng hợp mọi hợp âm ở trên

let noiseBuf = null;
function noise() {
  if (!noiseBuf) {
    const c = bus.ctx;
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function env(g, t, vol, attack, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function osc(type, f, t, dur, vol, attack, out, detune = 0) {
  const c = bus.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.setValueAtTime(detune, t);
  env(g, t, vol, attack, dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
  return g;
}
// Piano điện: hai sine lệch nhau vài cent (nghe dày, ấm) cộng một chút bồi âm bậc hai tắt nhanh.
function keys(m, t, dur, vol) {
  const f = hz(m);
  osc('sine', f, t, dur, vol, 0.012, musicGain, -4);
  osc('sine', f, t, dur, vol * 0.8, 0.012, musicGain, 5);
  osc('triangle', f * 2, t, 0.35, vol * 0.18, 0.004, musicGain);
}
function bass(m, t, dur, vol = 0.2) { osc('sine', hz(m), t, dur, vol, 0.02, musicGain); osc('triangle', hz(m), t, dur * 0.4, vol * 0.25, 0.01, musicGain); }
// Kalimba: sine tắt nhanh, gửi thêm vào tiếng vọng.
function kalimba(m, t) {
  const g = osc('sine', hz(m), t, 0.9, 0.05, 0.004, musicGain);
  g.connect(echoSend);
  osc('sine', hz(m) * 4.02, t, 0.12, 0.008, 0.002, musicGain);
}
function kick(t, vol = 0.22) {
  const c = bus.ctx, o = c.createOscillator(), g = c.createGain();
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  env(g, t, vol, 0.004, 0.22);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + 0.25);
}
// Tiếng nhiễu qua hai tầng lọc (thông cao rồi thông thấp): trống chổi, hi-hat, tiếng lách tách.
// Không dùng lọc thông dải vì dễ ra tiếng "xì" chói tai khi lặp lâu.
function hiss(t, dur, vol, lo, hi) {
  const c = bus.ctx, s = c.createBufferSource(), h = c.createBiquadFilter(), l = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise();
  h.type = 'highpass'; h.frequency.value = lo; h.Q.value = 0.3;
  l.type = 'lowpass'; l.frequency.value = hi; l.Q.value = 0.3;
  env(g, t, vol, 0.003, dur);
  s.connect(h).connect(l).connect(g).connect(musicGain);
  s.start(t, Math.random() * 0.8);
  s.stop(t + dur + 0.02);
}

// Một bước móc kép: quyết định mọi bè rơi vào bước này.
function gen(n, t) {
  const bar = Math.floor(n / 16), s = n % 16, sec = Math.floor(bar / 8) % 2 ? B : A, ch = sec[bar % 4];
  const beat = 60 / BPM;
  if (s === 0) {
    // hợp âm đầu ô nhịp ngân dài, đảo nốt trên cùng lên quãng tám cho có biến tấu
    const voicing = chance(0.35) ? [...ch.n.slice(0, 3), ch.n[3] + 12] : ch.n;
    voicing.forEach((m, i) => keys(m, t + i * 0.012, beat * 3.6, 0.03));
    bass(ch.b, t, beat * 1.8);
  }
  // đánh lại hợp âm khẽ ở phách lệch (kiểu lo-fi), không phải ô nào cũng có
  if ((s === 7 || s === 10) && chance(s === 10 ? 0.45 : 0.3)) ch.n.slice(1).forEach(m => keys(m, t, beat * 1.2, 0.018));
  if (s === 8 && chance(0.7)) bass(chance(0.5) ? ch.b : ch.b + 7, t, beat * 1.2, 0.16);
  if (s === 14 && chance(0.3)) bass(ch.b - 2, t, beat * 0.4, 0.1);
  // trống: kick mềm, chổi quét ở phách 2 và 4, hi-hat thưa
  if (s === 0 || (s === 10 && chance(0.6)) || (s === 7 && chance(0.2))) kick(t);
  if (s === 4 || s === 12) hiss(t, 0.22, 0.05, 900, 4200);
  if (s % 2 === 0 && chance(0.8)) hiss(t, 0.04, s % 4 === 2 ? 0.018 : 0.011, 6000, 11000);
  // kalimba thưa, đoạn B nhiều hơn một chút; thỉnh thoảng một cặp nốt đi liền
  if (s % 2 === 0 && chance(sec === B ? 0.2 : 0.11)) {
    const m = pick(MEL);
    kalimba(m, t);
    if (chance(0.3)) kalimba(MEL[Math.max(0, MEL.indexOf(m) - 1)], t + beat / 2);
  }
  // lách tách đĩa than: vài tiếng tách ngắn, rất nhỏ
  if (chance(0.35)) hiss(t + Math.random() * beat / 4, 0.006, 0.012 + Math.random() * 0.02, 1500, 7000);
}

function build() {
  const c = bus.ctx;
  musicGain = c.createGain();
  musicGain.gain.value = 0.0001;
  const warm = c.createBiquadFilter();
  warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = 0.3;
  musicGain.connect(warm).connect(bus.master);
  // tiếng vọng theo nhịp (3/4 phách), hồi tiếp đã lọc tối cho mềm
  const echo = c.createDelay(2), fb = c.createGain(), tone = c.createBiquadFilter();
  echo.delayTime.value = 60 / BPM * 0.75;
  fb.gain.value = 0.35;
  tone.type = 'lowpass'; tone.frequency.value = 1800;
  echo.connect(tone).connect(fb).connect(echo);
  tone.connect(musicGain);
  echoSend = c.createGain();
  echoSend.gain.value = 0.5;
  echoSend.connect(echo);
}
function target() {
  if (!on) return 0.0001;
  return bus.ctx.currentTime < duckUntil ? VOL * duckTo : VOL;
}
function tick() {
  const c = bus.ctx;
  try { musicGain.gain.setTargetAtTime(target(), c.currentTime, FADE / 3); } catch (e) { /* bỏ qua */ }
  // chưa có cú chạm đầu tiên hoặc tab đang ẩn: chưa rải nốt, lúc chạy lại thì bắt nhịp từ đầu
  if (c.state !== 'running' || !on) { resync = true; return; }
  if (resync) { nextTime = c.currentTime + 0.08; resync = false; }
  const s16 = 60 / BPM / 4;
  while (nextTime < c.currentTime + LOOKAHEAD) {
    try { gen(step, nextTime + (step % 2 ? s16 * SWING : 0)); } catch (e) { /* bỏ qua */ }
    nextTime += s16;
    step++;
  }
}

export const Music = {
  // Gọi một lần lúc khởi động; bật hay tắt theo tuỳ chọn người chơi.
  start(enabled) {
    on = enabled;
    bus = bus || audioBus();
    if (!bus) return;
    if (!musicGain) build();
    if (!timer) timer = setInterval(tick, TICK);
  },
  set(enabled) {
    on = enabled;
    if (on && !timer) this.start(true);
  },
  // Hạ nhạc tạm thời để khoảnh khắc lớn (qua mốc, chuyển quán) nổi lên.
  duck(sec = 1.5, amt = 0.35) { if (bus) { duckUntil = bus.ctx.currentTime + sec; duckTo = amt; } },
  state: () => ({ on, step, ctx: bus && bus.ctx.state, gain: musicGain ? +musicGain.gain.value.toFixed(3) : null }),
};
