// Nhân vật: các bạn gấu nhân viên và khách chibi, dựng bằng khối tròn bóng mịn cho dễ thương.
// Mỗi nhân vật có khuôn mặt đổi biểu cảm (mở mắt, chớp, cười híp, tập trung, ngáp) và bộ động tác:
// đi lạch bạch, pha (hai tay lắc), bưng ly, đưa ly, ăn mừng, vẫy tay, vươn vai, ngó quanh.
// Không biết gì về luật chơi: scene.js đặt vị trí, gọi anim*() mỗi khung hình và emote() khi có chuyện.
import * as THREE from 'three';
import { motionScale } from './feel.js';

const mats = new Map();
const soft = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); return mats.get(c); };
const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.7, depthWrite: false });
const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
const geos = new Map();
const geo = (k, make) => { if (!geos.has(k)) geos.set(k, make()); return geos.get(k); };
function part(g, m, parent, x = 0, y = 0, z = 0, sc) {
  const me = new THREE.Mesh(g, m);
  me.position.set(x, y, z);
  if (sc) me.scale.set(...sc);
  me.castShadow = true;
  parent.add(me);
  return me;
}
const sphere = r => geo('s' + r, () => new THREE.SphereGeometry(r, 20, 14));
const capsule = (r, l) => geo(`c${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 12));
const arc = (r, t) => geo(`a${r},${t}`, () => new THREE.TorusGeometry(r, t, 6, 14, Math.PI));
const disc = r => geo('d' + r, () => new THREE.CircleGeometry(r, 18));
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// Khuôn mặt dùng chung cho gấu và người: mắt tròn có đốm sáng, mắt cười ^^, má hồng, miệng cười và miệng há.
function buildFace(head, o) {
  const f = { open: group(head), happy: group(head), smile: null, mouthOpen: null };
  [-1, 1].forEach(sx => {
    const x = sx * o.eyeX;
    part(sphere(o.eyeR), soft(o.eye), f.open, x, o.eyeY, o.eyeZ);
    part(sphere(o.eyeR * 0.36), WHITE, f.open, x + o.eyeR * 0.35, o.eyeY + o.eyeR * 0.4, o.eyeZ + o.eyeR * 0.85);
    part(arc(o.eyeR * 0.95, o.eyeR * 0.3), soft(0x2b1d14), f.happy, x, o.eyeY - o.eyeR * 0.3, o.eyeZ + o.eyeR * 0.3);
    const b = part(disc(o.blushR), BLUSH, head, sx * o.blushX, o.blushY, o.blushZ);
    b.rotation.y = sx * 0.55;
    b.castShadow = false;
  });
  f.happy.visible = false;
  f.smile = part(arc(o.mouthR, o.mouthR * 0.3), soft(0x2b1d14), head, 0, o.mouthY, o.mouthZ);
  f.smile.rotation.z = Math.PI;
  f.mouthOpen = part(sphere(o.mouthR * 1.2), soft(0x8a3b3b), head, 0, o.mouthY - o.mouthR * 0.3, o.mouthZ - 0.005, [1, 0.9, 0.45]);
  f.mouthOpen.visible = false;
  return f;
}
// mode: 'open' | 'focus' (mắt hơi híp khi pha) | 'happy' (^^ và miệng há) | 'yawn' (nhắm mắt, há to)
function setFace(f, mode, blink) {
  const happy = mode === 'happy', yawn = mode === 'yawn';
  f.happy.visible = happy;
  f.open.visible = !happy;
  f.open.scale.y = yawn || blink ? 0.12 : mode === 'focus' ? 0.6 : 1;
  f.mouthOpen.visible = happy || yawn;
  f.mouthOpen.scale.set(yawn ? 1.3 : 1, yawn ? 1.5 : 0.9, 0.45);
  f.smile.visible = !happy && !yawn;
}

/* ================= gấu ================= */
const BEAR_LOOK = {
  brown: { fur: 0x9b6a45, limb: 0x8a5c3a, light: 0xf0cfa8, inner: 0xe0a489, eye: 0x2b1d14 },
  panda: { fur: 0xfbf8f3, limb: 0x2e2c30, light: 0xffffff, inner: 0x2e2c30, eye: 0x111111, patches: true },
  white: { fur: 0xf6f8fb, limb: 0xeef1f5, light: 0xffffff, inner: 0xe3d6d6, eye: 0x2b2b2e },
  honey: { fur: 0xe0a94a, limb: 0xd29a3c, light: 0xfbe3b6, inner: 0xf0b97a, eye: 0x2b1d14 },
};
export const BEAR_HEAD = new THREE.Vector3(0, 1.38, 0);
export const BEAR_CARRY = new THREE.Vector3(0, 0.6, 0.36);

export function buildBear(kind, apron) {
  const L = BEAR_LOOK[kind] || BEAR_LOOK.brown, fur = soft(L.fur), limb = soft(L.limb), light = soft(L.light);
  const g = new THREE.Group(), body = group(g);
  const P = { body };
  // chân ngắn, bàn chân sáng màu
  [['legL', -0.12], ['legR', 0.12]].forEach(([k, x]) => {
    P[k] = group(body, x, 0.24, 0.02);
    part(capsule(0.09, 0.07), limb, P[k], 0, -0.12, 0);
    part(sphere(0.06), light, P[k], 0, -0.2, 0.07, [1, 0.6, 0.5]);
  });
  // thân tròn, bụng sáng màu, tạp dề theo màu chi nhánh có túi hình tim
  part(sphere(0.3), fur, body, 0, 0.5, 0, [1, 1.02, 0.88]);
  part(sphere(0.2), light, body, 0, 0.45, 0.17, [1, 1.1, 0.35]);
  const ap = group(body, 0, 0.43, 0);
  ap.scale.set(1, 1, 0.9);
  const apronM = new THREE.MeshStandardMaterial({ color: apron, roughness: 0.75, side: THREE.DoubleSide });
  part(geo('apron', () => new THREE.CylinderGeometry(0.312, 0.325, 0.3, 24, 1, true, -0.95, 1.9)), apronM, ap);
  part(heartGeometry(), WHITE, body, 0, 0.42, 0.296, [0.55, 0.55, 0.55]).castShadow = false;
  part(sphere(0.07), fur, body, 0, 0.36, -0.27);
  if (L.patches) part(sphere(0.28), limb, body, 0, 0.66, 0, [1.02, 0.4, 0.86]);   // vai đen của gấu trúc
  // tay: gốc ở vai để xoay, đầu tay tròn
  [['armL', -1], ['armR', 1]].forEach(([k, sx]) => {
    P[k] = group(body, sx * 0.27, 0.66, 0.02);
    part(capsule(0.075, 0.14), limb, P[k], 0, -0.13, 0);
  });
  // đầu: gốc ở cổ để gật, nghiêng, ngó
  const head = P.head = group(body, 0, 0.76, 0);
  part(sphere(0.29), fur, head, 0, 0.27, 0, [1.1, 0.95, 1]);
  [['earL', -1], ['earR', 1]].forEach(([k, sx]) => {
    P[k] = group(head, sx * 0.23, 0.5, -0.03);
    part(sphere(0.1), limb, P[k]);
    part(sphere(0.06), soft(L.inner), P[k], 0, 0, 0.065, [1, 1, 0.35]);
  });
  part(sphere(0.12), light, head, 0, 0.18, 0.235, [1.15, 0.78, 0.7]);
  part(sphere(0.038), soft(0x2b1d14), head, 0, 0.225, 0.318, [1.35, 0.9, 0.85]);
  if (L.patches) [-1, 1].forEach(sx => { const p = part(sphere(0.07), limb, head, sx * 0.12, 0.3, 0.245, [0.85, 1.15, 0.35]); p.rotation.z = sx * 0.5; });
  P.face = buildFace(head, { eyeX: 0.118, eyeY: 0.31, eyeZ: 0.255, eyeR: 0.047, eye: L.eye, blushX: 0.2, blushY: 0.19, blushZ: 0.226, blushR: 0.055, mouthR: 0.026, mouthY: 0.145, mouthZ: 0.312 });
  accessory(kind, head, body);
  return { g, P, kind };
}
function accessory(kind, head, body) {
  if (kind === 'brown') {
    const red = soft(0xe25b4a);
    const cap = part(geo('cap', () => new THREE.SphereGeometry(0.21, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), red, head, 0, 0.47, 0, [1.12, 0.85, 1.12]);
    cap.rotation.x = -0.12;
    const brim = part(geo('brim', () => new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20)), red, head, 0, 0.49, 0.2, [1, 1, 0.75]);
    brim.rotation.x = 0.25;
    part(sphere(0.025), soft(0xfff3dc), head, 0, 0.65, -0.01);
  } else if (kind === 'panda') {
    const bow = group(head, 0.19, 0.55, 0.08);
    bow.rotation.z = -0.4;
    const pink = soft(0xff8fb1), cone = geo('bow', () => new THREE.ConeGeometry(0.055, 0.1, 14));
    [-1, 1].forEach(sx => { const c = part(cone, pink, bow, sx * 0.055, 0, 0); c.rotation.z = sx * Math.PI / 2; });
    part(sphere(0.03), pink, bow);
  } else if (kind === 'white') {
    const blue = soft(0x5aa9e6);
    const sc = part(geo('scarf', () => new THREE.TorusGeometry(0.22, 0.055, 10, 26)), blue, body, 0, 0.76, 0.01);
    sc.rotation.x = Math.PI / 2;
    const tail = part(capsule(0.045, 0.12), blue, body, 0.12, 0.66, 0.2);
    tail.rotation.z = 0.25;
  } else if (kind === 'honey') {
    const leaf = part(sphere(0.06), soft(0x7fb069), head, 0.07, 0.575, 0.02, [0.8, 0.22, 1.7]);
    leaf.rotation.set(0.3, 0.7, 0.2);
    part(capsule(0.008, 0.05), soft(0x6b4a2b), head, 0.03, 0.57, -0.02);
  }
}

/* ================= khách chibi ================= */
export const KID_HEAD = new THREE.Vector3(0, 1.3, 0);
export const KID_HAND = new THREE.Vector3(0.24, 0.45, 0.14);
export function buildKid(look) {
  const g = new THREE.Group(), body = group(g), P = { body };
  const skin = soft(look.skin), shirt = soft(look.shirt), pants = soft(look.pants), hair = soft(look.hair);
  [['legL', -0.08], ['legR', 0.08]].forEach(([k, x]) => {
    P[k] = group(body, x, 0.22, 0);
    part(capsule(0.065, 0.1), pants, P[k], 0, -0.11, 0);
    part(sphere(0.06), soft(0x3a2317), P[k], 0, -0.19, 0.04, [1, 0.6, 1.3]);
  });
  part(capsule(0.19, 0.14), shirt, body, 0, 0.44, 0, [1, 1, 0.85]);
  [['armL', -1], ['armR', 1]].forEach(([k, sx]) => {
    P[k] = group(body, sx * 0.2, 0.56, 0);
    part(capsule(0.055, 0.14), shirt, P[k], 0, -0.1, 0);
    part(sphere(0.05), skin, P[k], 0, -0.2, 0);
  });
  const head = P.head = group(body, 0, 0.66, 0);
  part(sphere(0.27), skin, head, 0, 0.27, 0);
  const hr = part(geo('hair', () => new THREE.SphereGeometry(0.285, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)), hair, head, 0, 0.29, -0.02);
  hr.rotation.x = -0.35;
  if (look.bun) part(sphere(0.1), hair, head, 0, 0.52, -0.14);
  else part(sphere(0.12), hair, head, 0.1, 0.46, 0.12, [1.2, 0.5, 0.8]);   // mái tóc lệch
  if (look.vip) {
    // khách VIP: vương miện vàng năm chóp có ngọc đỏ
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.6, roughness: 0.3, emissive: 0x7a5200, emissiveIntensity: 0.35 });
    const crown = group(head, 0, 0.53, 0);
    part(geo('crownBand', () => new THREE.CylinderGeometry(0.15, 0.16, 0.08, 20, 1, true)), gold, crown).material.side = THREE.DoubleSide;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, tip = part(geo('crownTip', () => new THREE.ConeGeometry(0.035, 0.09, 8)), gold, crown, Math.sin(a) * 0.15, 0.08, Math.cos(a) * 0.15);
      tip.castShadow = false;
    }
    part(sphere(0.025), soft(0xe25b4a), crown, 0, 0.02, 0.16);
  }
  P.face = buildFace(head, { eyeX: 0.095, eyeY: 0.25, eyeZ: 0.24, eyeR: 0.042, eye: 0x2b1d14, blushX: 0.16, blushY: 0.17, blushZ: 0.212, blushR: 0.048, mouthR: 0.022, mouthY: 0.15, mouthZ: 0.262 });
  return { g, P, kind: 'kid' };
}

/* ================= động tác ================= */
const DUR = { serve: 0.55, cheer: 1.3, wave: 1.3, stretch: 1.8, look: 1.6, love: 1.1 };
export function emote(m, k, opts = {}) {
  if (m.emote && m.emote.k === 'cheer' && k !== 'cheer') return;   // đang ăn mừng thì không cắt ngang
  m.emote = { k, t: 0, dur: DUR[k] || 1, spin: !!opts.spin };
}
function timers(m, dt) {
  m.t += dt;
  if ((m.blinkT = (m.blinkT ?? 1 + Math.random() * 3) - dt) <= 0) { m.blinkT = 2 + Math.random() * 3.5; m.blink = 0.13; }
  m.blink = Math.max(0, (m.blink || 0) - dt);
  m.idleT = (m.idleT ?? 3 + Math.random() * 5) - dt;
}
function stepSpring(s, dt) {
  if (!s.v && !s.vel) return;
  s.vel += (-420 * s.v - 15 * s.vel) * dt;
  s.v += s.vel * dt;
  if (Math.abs(s.v) < 1e-4 && Math.abs(s.vel) < 1e-3) { s.v = 0; s.vel = 0; }
}
// Tư thế tính lại từ đầu mỗi khung hình: nền (thở, đi, pha, bưng) rồi động tác đang diễn đè lên trên.
function pose(m, dt, busy) {
  const t = m.t, e = m.emote;
  const p = { aL: [0.1, -0.16], aR: [0.1, 0.16], leg: 0, head: [0, 0, Math.sin(t * 1.1 + m.seed) * 0.06], roll: 0, hop: 0, spin: 0, face: 'open', stretch: 0 };
  if (m.moving) {
    const w = Math.sin(t * 14);
    p.roll = w * 0.13; p.leg = w * 0.75; p.hop = Math.abs(Math.cos(t * 14)) * 0.05;
    p.aL[0] = w * 0.6; p.aR[0] = -w * 0.6; p.head[2] = w * 0.06;
  }
  if (busy.brewing) {
    const w = Math.sin(t * 15);
    p.aL = [-1.35 + w * 0.32, -0.38]; p.aR = [-1.35 - w * 0.32, 0.38];
    p.head[0] = 0.08 + Math.abs(w) * 0.06; p.face = 'focus'; p.hop = Math.abs(w) * 0.015;
  }
  if (busy.carry) { p.aL = [-1.2, -0.45]; p.aR = [-1.2, 0.45]; }
  // đứng yên rảnh tay thì ngẩng lên nhìn người chơi (máy quay ở trên cao)
  if (!m.moving && !busy.brewing && !busy.carry) p.head[0] = -0.22;
  if (busy.cup && !busy.carry) p.aR = [-0.9, 0.3];
  if (e) {
    e.t += dt;
    const k = Math.min(1, e.t / e.dur), bell = Math.sin(k * Math.PI);
    if (e.k === 'serve') { p.aR = [-0.3 - 1.5 * bell, 0.2]; p.aL = [-0.3 - 1.1 * bell, -0.2]; p.hop = bell * 0.12; p.face = 'happy'; p.head[0] = -0.15 * bell; }
    else if (e.k === 'cheer') { const w = Math.sin(t * 20) * 0.2; p.aL = [0, -2.7 + w]; p.aR = [0, 2.7 - w]; p.hop = Math.abs(Math.sin(k * Math.PI * 3)) * 0.28 * (1 - k * 0.3); p.face = 'happy'; if (e.spin) p.spin = k * Math.PI * 2; }
    else if (e.k === 'wave') { p.aR = [-0.2, 2.4 + Math.sin(t * 16) * 0.4]; p.head[2] = 0.18; p.face = 'happy'; }
    else if (e.k === 'stretch') { p.aL = [0, -2.9 * bell]; p.aR = [0, 2.9 * bell]; p.stretch = bell * 0.12; p.face = bell > 0.3 ? 'yawn' : 'open'; p.head[0] = -0.25 * bell; }
    else if (e.k === 'look') p.head[1] = Math.sin(k * Math.PI * 2) * 0.7;
    else if (e.k === 'love') { p.hop = Math.abs(Math.sin(k * Math.PI * 2)) * 0.18; p.face = 'happy'; p.aL = [0, -0.6 * bell]; p.head[2] = 0.2 * bell; }
    if (k >= 1) m.emote = null;
  }
  // rảnh tay lâu thì tự làm một động tác nhỏ cho quán có sức sống
  if (!m.emote && !m.moving && !busy.brewing && !busy.carry && m.idleT <= 0) {
    m.idleT = 5 + Math.random() * 6;
    emote(m, m.kind === 'kid' ? (Math.random() < 0.6 ? 'look' : 'wave') : ['wave', 'stretch', 'look', 'look'][Math.floor(Math.random() * 4)]);
  }
  return p;
}
function apply(m, p) {
  const P = m.P, ms = motionScale, sq = m.sp.v + Math.sin(m.t * 2.4 + m.seed) * 0.015;
  P.armL.rotation.set(p.aL[0] * ms, 0, p.aL[1]);
  P.armR.rotation.set(p.aR[0] * ms, 0, p.aR[1]);
  P.legL.rotation.x = p.leg * ms;
  P.legR.rotation.x = -p.leg * ms;
  P.head.rotation.set(p.head[0], p.head[1], p.head[2] * ms);
  P.body.rotation.set(0, p.spin, p.roll * ms);
  P.body.scale.set(1 - sq * 0.5 - p.stretch * 0.3, 1 + sq + p.stretch, 1 - sq * 0.5 - p.stretch * 0.3);
  m.g.position.y = p.hop * ms;
  setFace(P.face, p.face, m.blink > 0);
}
export function animBear(m, dt) {
  timers(m, dt);
  stepSpring(m.sp, dt);
  const p = pose(m, dt, { brewing: m.brewing, carry: !!m.carry });
  // tai gấu thỉnh thoảng giật nhẹ
  const tw = Math.max(0, Math.sin(m.t * 0.9 + m.seed * 7) - 0.97) * 12;
  m.P.earL.rotation.z = tw * 0.4;
  m.P.earR.rotation.z = -tw * 0.3;
  apply(m, p);
}
export function animKid(m, dt) {
  timers(m, dt);
  stepSpring(m.sp, dt);
  apply(m, pose(m, dt, { cup: !!m.cup }));
  if (m.sit) {
    // ngồi ghế nệm ở bàn VIP: nhấc người lên mặt nệm, hai chân duỗi ra phía trước
    m.P.legL.rotation.x = m.P.legR.rotation.x = 1.45;
    m.g.position.y += 0.13;
  }
}
export function newActor(built, seed) { return { ...built, sp: { v: 0, vel: 0 }, t: Math.random() * 5, seed, cup: null, carry: null, emote: null }; }

// Hình trái tim (dùng cho túi tạp dề và hạt bay lên khi khách vui).
export function heartGeometry() {
  return geo('heart', () => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.06);
    s.bezierCurveTo(-0.02, -0.04, -0.08, -0.01, -0.08, 0.03);
    s.bezierCurveTo(-0.08, 0.07, -0.03, 0.08, 0, 0.045);
    s.bezierCurveTo(0.03, 0.08, 0.08, 0.07, 0.08, 0.03);
    s.bezierCurveTo(0.08, -0.01, 0.02, -0.04, 0, -0.06);
    return new THREE.ShapeGeometry(s, 10);
  });
}
