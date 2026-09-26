// Âm thanh tổng hợp bằng Web Audio, không cần file. Mọi tiếng đều lệch cao độ ngẫu nhiên vài phần trăm
// để lặp lại trăm lần vẫn không nhàm. Trình duyệt chỉ cho phát sau cú chạm đầu tiên.
// Đồ thị: tiếng hiệu ứng → sfx ─┐
//        nhạc nền (music.js) → music ─┴→ master → loa. Tắt riêng từng nhánh bằng gain của nhánh đó.
let ctx = null, master = null, sfxBus = null;
let sfxOn = true;
const SFX_VOL = 0.55;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxOn ? SFX_VOL : 0;
  sfxBus.connect(master);
  return ctx;
}
// Cho music.js dùng chung AudioContext và master. null nếu máy không hỗ trợ Web Audio.
export function audioBus() { const c = ensure(); return c ? { ctx: c, master } : null; }
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
export function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? SFX_VOL : 0, ctx.currentTime, 0.02); }
// Tab ẩn thì dừng hẳn âm thanh (nhạc không vang ở tab nền), quay lại thì phát tiếp.
export function pauseAudio(paused) {
  if (!ctx) return;
  if (paused && ctx.state === 'running') ctx.suspend().catch(() => {});
  else if (!paused && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

const jit = (f, a = 0.04) => f * (1 + (Math.random() * 2 - 1) * a);

function tone(freq, dur, { type = 'sine', vol = 0.3, delay = 0, slide = 0, attack = 0.006 } = {}) {
  const c = ensure();
  if (!c || !sfxOn) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.03);
}

let noiseBuf = null;
function noiseBuffer(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function noise(dur, { freq = 1200, q = 1, vol = 0.2, delay = 0, type = 'bandpass', slide = 0 } = {}) {
  const c = ensure();
  if (!c || !sfxOn) return;
  const t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c);
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.03);
}

// Nốt ngũ cung: mỗi lần nâng cấp lên một nốt, giữ nút nâng liên tục thành một giai điệu đi lên.
const PENTA = [523, 587, 659, 784, 880];
const note = i => PENTA[i % 5] * 2 ** (Math.floor(i / 5) % 3);

export const sfx = {
  ui: () => { tone(jit(880), 0.05, { type: 'triangle', vol: 0.12 }); noise(0.03, { freq: 3000, vol: 0.05 }); },
  uiPrimary: () => { tone(jit(660), 0.08, { type: 'triangle', vol: 0.16 }); tone(jit(990), 0.1, { type: 'triangle', vol: 0.12, delay: 0.04 }); },
  sheet: () => noise(0.16, { freq: 900, q: 1, vol: 0.06, slide: 2.2 }),
  lvl: i => { const f = jit(note(i), 0.01); tone(f, 0.12, { type: 'triangle', vol: 0.16, slide: 1.12 }); tone(f * 2, 0.05, { type: 'sine', vol: 0.05 }); },
  // tiền khách trả: nhỏ và khẽ vì vang lên liên tục, lệch cao độ để không nhàm
  cash: () => { const k = 1 + (Math.random() - 0.5) * 0.12; tone(1319 * k, 0.06, { type: 'square', vol: 0.025 }); tone(1760 * k, 0.1, { type: 'square', vol: 0.02, delay: 0.045 }); },
  // Tiếng máy lúc bắt đầu pha, mỗi loại máy một kiểu, rất nhỏ vì vang lên liên tục.
  // Tiếng nhiễu dùng lọc thông thấp (không dùng thông dải) để không ra tiếng xì chói tai.
  brew: kind => {
    if (kind === 'espresso') { noise(0.45, { freq: 520, q: 0.7, vol: 0.06, type: 'lowpass', slide: 1.8 }); tone(jit(110), 0.4, { type: 'triangle', vol: 0.03 }); }
    else if (kind === 'icebin') [0, 0.06, 0.13].forEach(d => tone(jit(2300, 0.15), 0.05, { vol: 0.035, delay: d }));
    else if (kind === 'pitcher' || kind === 'kettle') noise(0.5, { freq: 1600, q: 0.5, vol: 0.035, type: 'lowpass', slide: 0.7 });
    else if (kind === 'cream') [0, 0.08, 0.16, 0.24].forEach(d => tone(jit(900, 0.1), 0.03, { type: 'triangle', vol: 0.035, delay: d }));
    else [0, 0.09, 0.18].forEach((d, i) => tone(jit(300 + i * 70, 0.05), 0.08, { vol: 0.05, slide: 1.5, delay: d }));   // róc rách rót
  },
  // "ting" khi xong một ly: mỗi trạm một nốt ngũ cung, nhiều trạm xong liền nhau thành giai điệu nhỏ
  ding: i => { const f = [1568, 1760, 2093, 2349, 2637][i % 5]; tone(jit(f, 0.01), 0.25, { type: 'triangle', vol: 0.045 }); tone(f * 2, 0.12, { vol: 0.012, delay: 0.02 }); },
  // kim cương rơi vào túi: hai nốt cao trong trẻo
  gem: () => { tone(jit(2093, 0.01), 0.12, { type: 'sine', vol: 0.09 }); tone(jit(3136, 0.01), 0.22, { type: 'sine', vol: 0.07, delay: 0.06 }); },
  // bật tăng tốc: vút lên rồi hợp âm trưởng
  boost: () => { noise(0.35, { freq: 500, q: 0.8, vol: 0.12, type: 'lowpass', slide: 6 }); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.06, delay: 0.12 + i * 0.05 })); },
  // món hot: ba nốt giục giã
  hot: () => [784, 988, 1175].forEach((f, i) => tone(jit(f, 0.01), 0.12, { type: 'triangle', vol: 0.1, delay: i * 0.07 })),
  // khách VIP bước vào: chuông kép lấp lánh
  vip: () => { [1319, 1760, 2637].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.08, delay: i * 0.08 })); tone(2637 * 1.5, 0.3, { vol: 0.03, delay: 0.3 }); },
  // mở khoá tính năng
  unlock: () => [523, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.12, delay: i * 0.07 })),
  // tiếng "bíp" dễ thương khi chạm vào gấu: hai nốt trượt lên
  boop: () => { tone(jit(620, 0.06), 0.09, { type: 'sine', vol: 0.18, slide: 1.6 }); tone(jit(990, 0.06), 0.1, { type: 'sine', vol: 0.12, slide: 1.4, delay: 0.08 }); },
  meh: () => tone(jit(392), 0.2, { type: 'triangle', vol: 0.14, slide: 0.85 }),
  coin: (n = 0) => { const k = 1 + Math.min(n, 8) * 0.06; tone(988 * k, 0.07, { type: 'square', vol: 0.08 }); tone(1319 * k, 0.22, { type: 'square', vol: 0.08, delay: 0.06 }); },
  tick: () => tone(jit(1760, 0.08), 0.04, { type: 'square', vol: 0.03 }),
  bell: () => { tone(jit(1320, 0.02), 0.6, { vol: 0.14 }); tone(jit(1980, 0.02), 0.45, { vol: 0.07, delay: 0.09 }); },
  star: () => [1047, 1319, 1568].forEach((f, i) => tone(jit(f, 0.01), 0.25, { type: 'triangle', vol: 0.14, delay: i * 0.08 })),
  perfect: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.15, delay: i * 0.05 })),
  combo: n => { const b = 523 * Math.pow(2, Math.min(n, 12) / 12); [1, 1.25, 1.5].forEach((m, i) => tone(b * m, 0.16, { type: 'square', vol: 0.07, delay: i * 0.05 })); },
  count: () => tone(jit(1200, 0.1), 0.03, { type: 'square', vol: 0.035 }),
  crate: () => { noise(0.25, { freq: 700, q: 0.8, vol: 0.2, slide: 0.5 }); tone(jit(220), 0.16, { type: 'triangle', vol: 0.14, slide: 0.7 }); },
  day: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.1 })),
};
