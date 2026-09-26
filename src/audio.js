// Âm thanh tổng hợp bằng Web Audio, không cần file. Mọi tiếng đều lệch cao độ ngẫu nhiên vài phần trăm
// để lặp lại trăm lần vẫn không nhàm. Trình duyệt chỉ cho phát sau cú chạm đầu tiên.
let ctx = null, master = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.55;
  master.connect(ctx.destination);
  return ctx;
}
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }

const jit = (f, a = 0.04) => f * (1 + (Math.random() * 2 - 1) * a);

function tone(freq, dur, { type = 'sine', vol = 0.3, delay = 0, slide = 0, attack = 0.006 } = {}) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
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
  if (!c || muted) return;
  const t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c);
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
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
