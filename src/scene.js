// Cảnh 3D low-poly dựng hoàn toàn bằng code. Không biết gì về luật chơi:
// game.js gọi vào các hàm bên dưới và nhận lại sự kiện chạm qua `handlers`.
import * as THREE from 'three';
import { COMP } from './data.js';
import { motionScale } from './feel.js';

const TOP_MAIN = 0.98, TOP_BACK = 0.96;
const CUST_Z = -1.35, DOOR = new THREE.Vector3(3.4, 0, -4.4);
const SLOTS = { 3: [-1.45, 0, 1.45], 4: [-1.8, -0.6, 0.6, 1.8] };
const HAND = new THREE.Vector3(0.28, 0.72, 0.18), HEAD = new THREE.Vector3(0, 1.72, 0);

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, flatShading: true, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true;
  me.receiveShadow = true;
  if (parent) parent.add(me);
  return me;
}
const box = (w, h, d, m, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
const cyl = (rt, rb, h, m, x, y, z, p, seg = 12, open = false) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m, x, y, z, p);
const sph = (r, m, x, y, z, p, ws = 10, hs = 8) => mesh(new THREE.SphereGeometry(r, ws, hs), m, x, y, z, p);

// Lò xo tắt dần: đẩy lệch rồi để nó tự nảy về, vượt quá một chút rồi mới đứng yên. Đây là nguồn của
// cảm giác "nảy" ở mọi thứ được chạm: trạm, ly, khách.
const spring = () => ({ v: 0, vel: 0 });
function stepSpring(s, dt, k = 420, d = 15) {
  if (!s.v && !s.vel) return;
  s.vel += (-k * s.v - d * s.vel) * dt;
  s.v += s.vel * dt;
  if (Math.abs(s.v) < 1e-4 && Math.abs(s.vel) < 1e-3) { s.v = 0; s.vel = 0; }
}
// Nén giữ nguyên thể tích: thấp xuống thì bè ra.
const squash = (o, v, base = 1) => o.scale.set(base * (1 - v * 0.5), base * (1 + v), base * (1 - v * 0.5));

export function createScene(canvas, handlers) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3e3cc);
  const BASE_FOV = 38;
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 80);
  const baseTarget = new THREE.Vector3(0, 0.85, 0.35);

  scene.add(new THREE.HemisphereLight(0xfff3df, 0x7a5a44, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(3.5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  buildRoom(scene);
  const stations = {};
  const pickables = [];
  buildCounters(scene, stations, pickables);
  Object.values(stations).forEach(s => { s.sp = spring(); s.base = s.group.position.clone(); });
  const machine = stations.espresso;

  /* ---------- biển hiệu tên quán trên tường ---------- */
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024;
  signCanvas.height = 300;
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 4;
  const signG = new THREE.Group();
  signG.position.set(1.55, 2.3, -4.84);
  scene.add(signG);
  box(2.3, 0.78, 0.08, mat(0x5a3d2b), 0, 0, 0, signG).castShadow = false;
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 0.64), new THREE.MeshBasicMaterial({ map: signTex }));
  signFace.position.z = 0.045;
  signG.add(signFace);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xff6fa8 });
  const neon = new THREE.Group();
  [[0, 0.345, 2.2, 0.03], [0, -0.345, 2.2, 0.03], [-1.1, 0, 0.03, 0.72], [1.1, 0, 0.03, 0.72]].forEach(([x, y, w, h]) => box(w, h, 0.03, neonMat, x, y, 0.06, neon).castShadow = false);
  signG.add(neon);
  const signSp = spring();
  let signKey = '';
  // Vẽ lại chỉ khi tên hoặc kiểu biển đổi, không bao giờ vẽ trong vòng lặp khung hình.
  function drawSign(name, lit) {
    const c = signCanvas.getContext('2d'), W = signCanvas.width, H = signCanvas.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = lit ? '#2b1d2a' : '#fff3dc';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = lit ? '#ff6fa8' : '#8a5a3b';
    c.lineWidth = 10;
    c.strokeRect(22, 22, W - 44, H - 44);
    const font = px => `800 ${px}px "Baloo 2", system-ui, sans-serif`;
    let size = 150, lines = [name];
    c.font = font(size);
    while (size > 64 && c.measureText(name).width > W - 110) { size -= 4; c.font = font(size); }
    if (c.measureText(name).width > W - 110) {
      const mid = name.length / 2, cut = [...name.matchAll(/ /g)].map(m => m.index).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
      lines = cut != null ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
      size = 110;
      c.font = font(size);
      while (size > 40 && Math.max(...lines.map(l => c.measureText(l).width)) > W - 110) { size -= 4; c.font = font(size); }
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lh = size * 0.95, y0 = H / 2 - (lines.length - 1) * lh / 2 + size * 0.06;
    lines.forEach((l, i) => {
      const y = y0 + i * lh;
      if (lit) { c.shadowColor = '#ff6fa8'; c.shadowBlur = 28; c.fillStyle = '#ffe3f0'; }
      else { c.shadowBlur = 0; c.lineWidth = 12; c.strokeStyle = '#fff3dc'; c.strokeText(l, W / 2, y); c.fillStyle = '#3a2317'; }
      c.fillText(l, W / 2, y);
    });
    c.shadowBlur = 0;
    signTex.needsUpdate = true;
  }
  function setSign(name, lit, celebrate) {
    name = name || 'Quán Cà Phê Nhỏ';
    const key = name + '|' + !!lit;
    if (key !== signKey || celebrate === 'redraw') { signKey = key; drawSign(name, lit); }
    neon.visible = !!lit;
    if (celebrate === true) {
      signSp.v = 0.3 * motionScale;
      signSp.vel = 0;
      const p = signG.localToWorld(tv.set(0, -0.1, 0.3));
      burst('spark', p, 16);
      burst('confetti', p, 22);
      burst('star', p, 5);
      punch(0.35);
    }
  }

  /* ---------- vòng sáng chỉ trạm cần chạm tiếp theo ---------- */
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.34, 32), new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  let ringKey = null;
  function setHighlight(key) {
    if (key === ringKey) return;
    ringKey = key;
    const s = key === 'serve' ? null : stations[key];
    ring.visible = !!s;
    if (!s) return;
    const at = key === 'espresso' ? cupHome : s.base;
    ring.position.set(at.x, (key === 'espresso' ? TOP_MAIN : s.base.y) + 0.006, at.z + (key === 'espresso' ? 0 : 0.02));
    const hb = s.hit;
    ring.userData.size = key === 'espresso' ? 0.75 : Math.max(0.8, Math.min(1.6, Math.max(hb[0], hb[2]) / 0.5));
  }

  /* ---------- ly đang pha ---------- */
  const cupHome = new THREE.Vector3(0, TOP_MAIN, 0.22);
  const cupNode = new THREE.Group();
  cupNode.position.copy(cupHome);
  scene.add(cupNode);
  const cupSp = spring();
  const glassMat = mat(0xeaf6fb, { transparent: true, opacity: 0.45, roughness: 0.1, flatShading: false, depthWrite: false });
  const glass = cyl(0.16, 0.12, 1, glassMat, 0, 0.5, 0, cupNode, 16, true);
  glass.castShadow = false;
  const layers = {};
  Object.keys(COMP).forEach(k => {
    const m = cyl(0.145, 0.145, 1, mat(COMP[k].color, { roughness: 0.35, flatShading: false }), 0, 0, 0, cupNode, 16);
    m.visible = false;
    m.userData = { h: 0, y: 0, th: 0, ty: 0 };
    layers[k] = m;
  });
  const iceMat = mat(0xdff4ff, { transparent: true, opacity: 0.85, roughness: 0.1 });
  const cubes = [[-0.05, 0.03], [0.05, -0.02], [0, 0.06]].map(([x, z]) => { const c = box(0.08, 0.08, 0.08, iceMat, x, 0, z, cupNode); c.rotation.set(0.4, x * 9, 0.3); c.visible = false; c.userData = { y: 0, vy: 0, rest: 0 }; return c; });
  const stream = cyl(0.014, 0.014, 1, mat(COMP.shot.color), 0, 0, 0, scene, 6);
  stream.visible = false;
  cupNode.visible = false;
  let cupH = 0.34, hadCup = false, hadIce = false, pouring = false, pourT = 0;

  function setCup(cup) {
    cupNode.visible = !!cup.size;
    if (!cup.size) { hadCup = false; hadIce = false; Object.values(layers).forEach(m => { m.visible = false; m.userData.h = 0; }); cubes.forEach(c => { c.visible = false; }); return; }
    if (!hadCup) { hadCup = true; cupSp.v = -0.45 * motionScale; cupSp.vel = 0; }
    cupH = cup.size === 'L' ? 0.42 : 0.34;
    glass.scale.y = cupH;
    glass.position.y = cupH / 2;
    const inner = cupH * 0.92;
    const raw = cup.comps.map(k => (k === 'shot' ? COMP.shot.h * Math.min(1.4, cup.shotP / 0.74) : COMP[k].h));
    const sum = raw.reduce((a, b) => a + b, 0);
    const k = sum > inner ? inner / sum : 1;
    let y = 0.01;
    Object.entries(layers).forEach(([key, m]) => { if (!cup.comps.includes(key)) { m.visible = false; m.userData.h = 0; } });
    cup.comps.forEach((c, i) => {
      const h = Math.max(0.001, raw[i] * k), m = layers[c];
      if (!m.visible) { m.visible = true; m.userData.h = 0; m.userData.y = y; }
      m.userData.th = h;
      m.userData.ty = y + h / 2;
      y += h;
    });
    layers.shot.material.color.set(cup.comps.includes('water') ? 0x5a3520 : COMP.shot.color);
    if (cup.ice && !hadIce) {
      hadIce = true;
      cubes.forEach((c, i) => { c.visible = true; c.userData.rest = Math.max(0.06, y - 0.04 - i * 0.03); c.userData.y = c.userData.rest + 0.5 + i * 0.12; c.userData.vy = 0; });
    }
    cubes.forEach((c, i) => { if (c.visible) c.userData.rest = Math.max(0.06, y - 0.04 - i * 0.03); });
  }
  const bumpCup = (a = 0.28) => { cupSp.v = -a * motionScale; };

  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  function setPour(on) {
    pouring = on;
    stream.visible = on;
    if (!on) { machine.group.position.copy(machine.base); return; }
    machine.group.localToWorld(tv.set(0, 0.46, 0.34));
    tv2.copy(cupHome).y += 0.05;
    stream.position.set(tv.x, (tv.y + tv2.y) / 2, (tv.z + tv2.z) / 2);
    stream.scale.y = tv.y - tv2.y;
  }

  /* ---------- hạt: một pool dựng sẵn, không cấp phát gì trong lúc chơi ---------- */
  const PGEO = { coin: new THREE.CylinderGeometry(0.055, 0.055, 0.016, 12), orb: new THREE.SphereGeometry(0.045, 8, 6), paper: new THREE.PlaneGeometry(0.08, 0.045), star: starGeometry() };
  const PMAT = {
    coin: new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.55, roughness: 0.3, emissive: 0x7a5200, emissiveIntensity: 0.4 }),
    spark: new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    star: new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }),
    steam: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
    anger: new THREE.MeshStandardMaterial({ color: 0x6b5a55, transparent: true, opacity: 0.7, depthWrite: false }),
    confetti: [0xe25b4a, 0xf0b43c, 0x4fa883, 0x5aa9e6, 0xef6f8e, 0x9b6bd1].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })),
  };
  const dropMats = new Map();
  const dropMat = c => { if (!dropMats.has(c)) dropMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })); return dropMats.get(c); };
  const parts = Array.from({ length: 200 }, () => {
    const m = new THREE.Mesh(PGEO.orb, PMAT.spark);
    m.visible = false;
    m.frustumCulled = false;
    scene.add(m);
    return { m, vel: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0, life: 1, grav: 0, drag: 0, s0: 1, grow: false };
  });
  let pNext = 0;
  const rr = () => Math.random() * 2 - 1;
  const KIND = {
    coin: { geo: 'coin', mat: 'coin', life: 0.85, grav: -9, drag: 0.4, s0: 1, v: () => [rr() * 1.3, 2.6 + Math.random() * 1.4, rr() * 1.3 + 0.6], spin: 18 },
    spark: { geo: 'orb', mat: 'spark', life: 0.38, grav: 0, drag: 4, s0: 0.8, v: () => { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI; return [Math.cos(a) * Math.sin(b) * 2.6, Math.cos(b) * 2.6, Math.sin(a) * Math.sin(b) * 2.6]; }, spin: 0 },
    star: { geo: 'star', mat: 'star', life: 0.9, grav: -3, drag: 1.2, s0: 1.2, v: () => [rr() * 1.4, 2.2 + Math.random(), rr() * 0.6 + 0.8], spin: 8 },
    confetti: { geo: 'paper', mat: 'confetti', life: 1.7, grav: -5, drag: 1.4, s0: 1, v: () => [rr() * 2.4, 3 + Math.random() * 2.4, rr() * 2 + 0.5], spin: 14 },
    splash: { geo: 'orb', mat: 'drop', life: 0.42, grav: -9, drag: 0.5, s0: 0.55, v: () => [rr() * 0.9, 1.1 + Math.random() * 0.9, rr() * 0.9], spin: 0 },
    steam: { geo: 'orb', mat: 'steam', life: 0.95, grav: 0, drag: 0.6, s0: 0.9, grow: true, v: () => [rr() * 0.15, 0.55 + Math.random() * 0.35, rr() * 0.15], spin: 0 },
    anger: { geo: 'orb', mat: 'anger', life: 0.7, grav: 0, drag: 1, s0: 1.2, grow: true, v: () => [rr() * 0.6, 0.7 + Math.random() * 0.4, rr() * 0.4], spin: 0 },
  };
  function burst(kind, pos, n, color) {
    const K = KIND[kind];
    n = Math.max(1, Math.round(n * (0.8 + Math.random() * 0.4)));
    for (let i = 0; i < n; i++) {
      const p = parts[pNext];
      pNext = (pNext + 1) % parts.length;
      p.m.geometry = PGEO[K.geo];
      p.m.material = K.mat === 'drop' ? dropMat(color) : K.mat === 'confetti' ? PMAT.confetti[(Math.random() * 6) | 0] : PMAT[K.mat];
      p.m.position.set(pos.x + rr() * 0.05, pos.y, pos.z + rr() * 0.05);
      p.m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.vel.set(...K.v());
      p.spin.set(rr() * K.spin, rr() * K.spin, rr() * K.spin);
      Object.assign(p, { t: 0, life: K.life * (0.8 + Math.random() * 0.4), grav: K.grav, drag: K.drag, s0: K.s0 * (0.75 + Math.random() * 0.5), grow: !!K.grow });
      p.m.scale.setScalar(p.s0);
      p.m.visible = true;
    }
  }
  const at = {
    cup: (dy = 0) => tv.copy(cupHome).setY(TOP_MAIN + cupH + dy),
    cust: (id, where = HAND) => { const c = custs.get(id); return c ? c.g.localToWorld(tv.copy(where)) : null; },
    station: key => { const s = stations[key]; return s ? s.group.localToWorld(tv.set(0, s.hit[1] * 0.8, 0)) : null; },
  };
  function burstAt(where, kind, n, color) {
    const p = where === 'cup' ? at.cup() : where.station ? at.station(where.station) : where.cust != null ? at.cust(where.cust, where.head ? HEAD : HAND) : null;
    if (p) burst(kind, p, n, color);
  }

  /* ---------- khách ---------- */
  const custs = new Map();
  let slotX = SLOTS[3];
  function setSlots(n) { slotX = SLOTS[n] || SLOTS[3]; }
  function addCustomer(id, slot, look) {
    const g = buildPerson(look);
    g.position.copy(DOOR);
    g.userData.cust = id;
    scene.add(g);
    pickables.push(g);
    custs.set(id, { g, body: g.children[0], state: 'in', to: new THREE.Vector3(slotX[slot], 0, CUST_Z), t: 0, mood: null, hold: null, sp: spring(), impatient: false, onArrive: null });
  }
  function customerLeave(id, mood) {
    const c = custs.get(id);
    if (!c) return;
    c.state = 'out';
    c.mood = mood;
    c.t = 0;
    c.to = DOOR.clone();
    c.impatient = false;
    if (mood === 'angry') { burst('anger', c.g.localToWorld(tv.copy(HEAD)), 6); c.shake = 0.35; }
    const i = pickables.indexOf(c.g);
    if (i >= 0) pickables.splice(i, 1);
  }
  const customerArrived = id => { const c = custs.get(id); return !!c && c.state === 'wait'; };
  function shakeCustomer(id) { const c = custs.get(id); if (c) { c.shake = 0.4; c.sp.v = 0.18 * motionScale; } }
  function bounceCustomer(id, a = 0.25) { const c = custs.get(id); if (c) c.sp.v = -a * motionScale; }
  function setImpatient(id, on) { const c = custs.get(id); if (c) c.impatient = on; }

  /* ---------- trạm được chạm ---------- */
  function press(key, a = 0.22) { const s = stations[key]; if (s) { s.sp.v = -a * motionScale; s.sp.vel = 0; } }

  /* ---------- ly bay tới tay khách: khoảnh khắc chạm là lúc ly tới tay, không phải lúc bấm ---------- */
  const flying = [];
  const servedGeo = { body: new THREE.CylinderGeometry(0.1, 0.08, 0.24, 12), fill: new THREE.CylinderGeometry(0.085, 0.07, 0.18, 12), lid: new THREE.CylinderGeometry(0.105, 0.105, 0.03, 12), straw: new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6) };
  const servedMat = { body: mat(0xffffff, { transparent: true, opacity: 0.9 }), lid: mat(0xf2f2f2), straw: mat(0xe25b4a) };
  function serveFx(id, color, onArrive) {
    const c = custs.get(id);
    if (!c) return;
    const g = new THREE.Group();
    mesh(servedGeo.body, servedMat.body, 0, 0.12, 0, g);
    mesh(servedGeo.fill, dropMat(color), 0, 0.1, 0, g);
    mesh(servedGeo.lid, servedMat.lid, 0, 0.25, 0, g);
    mesh(servedGeo.straw, servedMat.straw, 0.03, 0.33, 0, g);
    g.position.copy(cupHome);
    scene.add(g);
    flying.push({ g, t: 0, life: 0.42, from: cupHome.clone(), cust: c, onArrive });
  }

  /* ---------- máy quay: thở, rung (mô hình trauma), đẩy ống kính ---------- */
  const camBase = new THREE.Vector3(), camTarget = new THREE.Vector3();
  let trauma = 0, punchV = 0, camT = 0;
  const shake = a => { trauma = Math.min(1, trauma + a); };
  const punch = a => { punchV = Math.max(punchV, a); };

  /* ---------- chạm ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.userData.station == null && o.userData.cust == null) o = o.parent;
      if (o) return o.userData.station != null ? { station: o.userData.station } : { cust: o.userData.cust };
    }
    return null;
  }
  canvas.addEventListener('pointerdown', ev => { const p = pick(ev); if (p) handlers.onDown(p); });
  window.addEventListener('pointerup', () => handlers.onUp());
  window.addEventListener('pointercancel', () => handlers.onUp());

  /* ---------- chiếu ra màn hình ---------- */
  const v = new THREE.Vector3();
  let W = 1, H = 1;
  function toScreen(p) {
    v.copy(p).project(camera);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 };
  }
  function headScreen(id) {
    const c = custs.get(id);
    return c ? toScreen(c.g.localToWorld(tv.copy(HEAD))) : null;
  }
  function stationScreen(key) {
    const s = stations[key];
    if (!s) return null;
    const p = toScreen(s.group.localToWorld(tv.copy(s.anchor)));
    p.above = s.above;
    return p;
  }
  // Đỉnh của trạm trên màn hình, để bong bóng chỉ dẫn trỏ vào.
  function stationTop(key) {
    const s = stations[key];
    return s ? toScreen(s.group.localToWorld(tv.set(0, key === 'espresso' ? 0.35 : s.hit[1] * 0.9, key === 'espresso' ? 0.35 : 0))) : null;
  }
  const machineScreen = () => toScreen(machine.group.localToWorld(tv.set(0.85, 0.5, 0.2)));
  const cupScreen = () => toScreen(at.cup(0.05));

  function setStationEnabled(key, on) {
    const s = stations[key];
    if (!s || s.enabled === on) return;
    s.enabled = on;
    s.mats.forEach(({ m, c }) => { m.color.copy(on ? c : c.clone().lerp(new THREE.Color(0x9a9a9a), 0.75)); });
  }

  /* ---------- khung hình ---------- */
  // Nhìn chéo từ sau lưng người pha, phóng to hết cỡ mà vẫn chứa đủ hai quầy và đầu khách,
  // chừa chỗ cho thanh trên và bảng gợi ý dưới, rồi căn giữa theo chiều dọc.
  const FIT = [[-2.45, 0.95, -0.6], [2.45, 0.95, -0.6], [-2.45, 0.95, 2.65], [2.45, 0.95, 2.65], [-1.9, 1.95, CUST_Z], [1.9, 1.95, CUST_Z], [0, 2.0, CUST_Z]].map(a => new THREE.Vector3(...a));
  let TOP_LIM = 0.7, BOT_LIM = -0.68;
  function place(t, dir, d) { camera.position.copy(t).addScaledVector(dir, d); camera.lookAt(t); camera.updateMatrixWorld(); }
  function extent() {
    let minY = 9, maxY = -9, maxX = 0;
    FIT.forEach(p => { const q = v.copy(p).project(camera); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); maxX = Math.max(maxX, Math.abs(q.x)); });
    return { minY, maxY, maxX };
  }
  function fitDist(t, dir) {
    let lo = 3, hi = 40;
    for (let i = 0; i < 30; i++) {
      const d = (lo + hi) / 2;
      place(t, dir, d);
      const e = extent();
      if (e.maxX <= 0.94 && e.maxY <= TOP_LIM && e.minY >= BOT_LIM) hi = d; else lo = d;
    }
    return hi;
  }
  function fit() {
    TOP_LIM = 1 - 2 * 140 / H;
    BOT_LIM = -1 + 2 * 90 / H;
    const el = camera.aspect < 0.8 ? 1.04 : 0.95;
    const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el)), t = baseTarget.clone();
    for (let k = 0; k < 4; k++) {
      const d = fitDist(t, dir);
      place(t, dir, d);
      const e = extent(), err = (e.minY + e.maxY) / 2 - (TOP_LIM + BOT_LIM) / 2;
      t.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), err * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d);
    }
    place(t, dir, fitDist(t, dir));
    camBase.copy(camera.position);
    camTarget.copy(t);
  }
  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.fov = BASE_FOV;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    fit();
  }

  function updateCamera(realDt) {
    camT += realDt;
    const m = motionScale, s = trauma * trauma * (m < 1 ? 0.3 : 1);
    camera.position.set(
      camBase.x + Math.sin(camT * 0.37) * 0.05 * m + s * 0.14 * (Math.sin(camT * 57) + Math.sin(camT * 91) * 0.5),
      camBase.y + Math.sin(camT * 0.53) * 0.035 * m + s * 0.1 * Math.sin(camT * 73 + 1),
      camBase.z);
    camera.lookAt(camTarget);
    trauma = Math.max(0, trauma - realDt * 1.8);
    const fov = BASE_FOV * (1 - punchV * 0.07 * m);
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
    punchV *= Math.exp(-realDt * 7);
    if (punchV < 1e-3) punchV = 0;
  }

  const tmp = new THREE.Vector3();
  // dt: thời gian đã co giãn (hit-stop làm nó về 0). realDt: thời gian thật, để máy quay vẫn rung khi đóng băng.
  function update(dt, realDt = dt) {
    updateCamera(realDt);
    custs.forEach((c, id) => {
      c.t += dt;
      const g = c.g;
      stepSpring(c.sp, dt);
      if (c.state !== 'wait') {
        tmp.subVectors(c.to, g.position);
        tmp.y = 0;
        const d = tmp.length(), step = 2.4 * dt;
        if (d <= step) {
          g.position.x = c.to.x;
          g.position.z = c.to.z;
          if (c.state === 'in') { c.state = 'wait'; g.rotation.y = 0; c.sp.v = -0.25 * motionScale; }
          else { scene.remove(g); custs.delete(id); return; }
        } else {
          g.position.addScaledVector(tmp.normalize(), step);
          g.rotation.y = Math.atan2(tmp.x, tmp.z);
        }
        const hop = c.state === 'out' && c.mood === 'happy' && c.t < 0.65 ? Math.abs(Math.sin(c.t * 10)) * 0.22 * motionScale : 0;
        g.position.y = Math.abs(Math.sin(c.t * 11)) * 0.05 + hop;
        c.body.rotation.z = Math.sin(c.t * 11) * 0.06;
      } else {
        g.position.y = 0;
        c.body.rotation.z = c.impatient ? Math.sin(c.t * 16) * 0.05 * motionScale : 0;
      }
      squash(c.body, c.sp.v + (c.state === 'wait' ? Math.sin(c.t * 2.2 + id) * 0.012 : 0));
      if (c.shake > 0) { c.shake -= dt; g.position.x = c.to.x + Math.sin(c.shake * 70) * 0.06 * motionScale; }
    });
    Object.values(stations).forEach(s => {
      stepSpring(s.sp, dt);
      squash(s.group, s.sp.v);
    });
    if (pouring) {
      pourT += dt;
      machine.group.position.set(machine.base.x + rr() * 0.006 * motionScale, machine.base.y, machine.base.z);
      stream.scale.x = stream.scale.z = 1 + Math.sin(pourT * 45) * 0.3;
      if ((pourT % 0.3) < dt) burst('steam', machine.group.localToWorld(tmp.set(rr() * 0.3, 0.9, 0)), 1);
    }
    stepSpring(signSp, dt, 260, 9);
    signG.scale.setScalar(1 + signSp.v);
    signG.rotation.z = signSp.v * 0.25;
    stepSpring(cupSp, dt, 360, 13);
    squash(cupNode, cupSp.v);
    const f = 1 - Math.exp(-dt * 16);
    Object.values(layers).forEach(m => {
      if (!m.visible) return;
      const u = m.userData;
      u.h += (u.th - u.h) * f;
      u.y += (u.ty - u.y) * f;
      m.scale.y = Math.max(0.001, u.h);
      m.position.y = u.y;
    });
    cubes.forEach(c => {
      if (!c.visible) return;
      const u = c.userData;
      if (u.y > u.rest || u.vy) {
        u.vy -= 9.8 * dt;
        u.y += u.vy * dt;
        if (u.y <= u.rest) { u.y = u.rest; u.vy = u.vy < -0.7 ? -u.vy * 0.35 : 0; if (u.vy) bumpCup(0.08); }
      } else u.y = u.rest;
      c.position.y = u.y;
    });
    if (ring.visible) {
      const k = 1 + Math.sin(camT * 6) * 0.08;
      ring.scale.setScalar(ring.userData.size * k);
      ring.material.opacity = 0.55 + Math.sin(camT * 6) * 0.25;
    }
    for (let i = flying.length - 1; i >= 0; i--) {
      const fl = flying[i];
      fl.t += dt;
      const k = Math.min(1, fl.t / fl.life), e = 1 - Math.pow(1 - k, 2);
      fl.cust.g.localToWorld(tmp.copy(HAND));
      fl.g.position.lerpVectors(fl.from, tmp, e);
      fl.g.position.y += Math.sin(k * Math.PI) * 0.55;
      fl.g.rotation.y = k * Math.PI * 2;
      fl.g.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.25);
      if (k >= 1) {
        if (fl.cust.hold) fl.cust.g.remove(fl.cust.hold);
        fl.cust.g.add(fl.g);
        fl.g.position.copy(HAND);
        fl.g.rotation.set(0, 0, 0);
        fl.g.scale.setScalar(1);
        fl.cust.hold = fl.g;
        fl.cust.sp.v = -0.3 * motionScale;
        flying.splice(i, 1);
        if (fl.onArrive) fl.onArrive();
      }
    }
    for (const p of parts) {
      if (!p.m.visible) continue;
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.m.visible = false; continue; }
      p.vel.y += p.grav * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.m.position.addScaledVector(p.vel, dt);
      p.m.rotation.x += p.spin.x * dt;
      p.m.rotation.y += p.spin.y * dt;
      p.m.rotation.z += p.spin.z * dt;
      const g = p.grow ? 0.6 + k * 1.4 : k < 0.12 ? 0.4 + k * 5 : 1;
      p.m.scale.setScalar(p.s0 * g * (k > 0.7 ? (1 - k) / 0.3 : 1));
    }
  }
  const render = () => renderer.render(scene, camera);

  resize();
  return { resize, update, render, setSlots, addCustomer, customerLeave, customerArrived, shakeCustomer, bounceCustomer, setImpatient, headScreen, stationScreen, stationTop, machineScreen, cupScreen, setCup, bumpCup, setPour, press, burstAt, serveFx, shake, punch, setHighlight, setStationEnabled, setSign, stationKeys: Object.keys(stations) };
}

function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.035 : 0.08, a = i / 10 * Math.PI * 2 - Math.PI / 2;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(s);
}

/* ================= dựng phòng ================= */
function buildRoom(scene) {
  const floor = mesh(new THREE.PlaneGeometry(24, 24), mat(0xc49a6c), 0, 0, 0, scene);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const plank = mat(0xb58a5e);
  for (let x = -11; x <= 11; x += 1.2) { const p = box(0.04, 0.005, 24, plank, x, 0.003, 0, scene); p.castShadow = false; }
  const rug = box(5.2, 0.01, 1.6, mat(0x7fb7a4), 0, 0.008, CUST_Z - 0.1, scene);
  rug.castShadow = false;

  const wall = mat(0xf4dfc4), trim = mat(0x8a5a3b);
  box(24, 4.2, 0.2, wall, 0, 2.1, -5, scene);
  box(24, 1.1, 0.22, mat(0x9c6b48), 0, 0.55, -4.98, scene);
  const glassM = mat(0xbfe3f2, { roughness: 0.2 });
  [-2.6, -0.4].forEach(x => { box(1.7, 1.3, 0.05, glassM, x, 2.0, -4.88, scene); box(1.85, 0.1, 0.1, trim, x, 1.33, -4.86, scene); box(0.08, 1.3, 0.06, trim, x, 2.0, -4.85, scene); });
  box(1.2, 2.3, 0.08, mat(0x6b4630), DOOR.x, 1.15, -4.86, scene);
  sph(0.05, mat(0xf0c05a), DOOR.x - 0.45, 1.1, -4.8, scene, 6, 4);

  const tableM = mat(0xe8d5b9), legM = mat(0x5a3d2b), chairM = mat(0xe2574c);
  const table = (x, z) => {
    cyl(0.5, 0.5, 0.06, tableM, x, 0.74, z, scene, 14);
    cyl(0.05, 0.05, 0.72, legM, x, 0.37, z, scene, 6);
    cyl(0.28, 0.28, 0.03, legM, x, 0.02, z, scene, 10);
    [[0.75, 0], [-0.75, 0]].forEach(([dx, dz]) => { box(0.42, 0.06, 0.42, chairM, x + dx, 0.46, z + dz, scene); box(0.06, 0.46, 0.06, legM, x + dx, 0.23, z + dz, scene); box(0.06, 0.45, 0.42, chairM, x + dx + Math.sign(dx) * 0.2, 0.7, z + dz, scene); });
  };
  table(-4.3, -3.0);
  table(-4.3, -0.6);
  table(4.6, -1.6);

  const pot = mat(0xd4764e), leaf = mat(0x5f9e5a);
  [[-5.3, -4.3], [5.3, -4.3], [-3.3, 3.3], [3.3, 3.3]].forEach(([x, z]) => {
    cyl(0.25, 0.18, 0.4, pot, x, 0.2, z, scene, 8);
    mesh(new THREE.IcosahedronGeometry(0.42, 0), leaf, x, 0.8, z, scene);
    mesh(new THREE.IcosahedronGeometry(0.3, 0), leaf, x + 0.15, 1.1, z - 0.05, scene);
  });
}

/* ================= quầy và các trạm ================= */
function station(scene, stations, pickables, key, x, y, z, build, hit, above = false) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  build(g);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(hit[0], hit[1], hit[2]), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hb.position.y = hit[1] / 2;
  g.add(hb);
  g.userData.station = key;
  scene.add(g);
  pickables.push(g);
  const mats = [];
  g.traverse(o => { if (o.isMesh && o !== hb && o.material.color) mats.push({ m: o.material, c: o.material.color.clone() }); });
  // nhãn đặt dưới trạm (phía người pha) để không che khách; riêng máy pha dán lên mặt trước máy
  stations[key] = { group: g, hit, anchor: above ? new THREE.Vector3(-0.42, 0.24, 0.24) : new THREE.Vector3(0, 0.02, hit[2] / 2), above, mats, pop: 0, enabled: true };
}

function buildCounters(scene, stations, pickables) {
  const wood = mat(0x8a5a3b), top = mat(0xefe6d8, { roughness: 0.4 }), accent = mat(0xa8714c);
  box(4.8, 0.92, 1.1, wood, 0, 0.46, 0, scene);
  box(5.0, 0.06, 1.25, top, 0, 0.95, 0, scene);
  for (let x = -2.08; x <= 2.1; x += 0.52) box(0.22, 0.7, 0.03, accent, x, 0.45, -0.56, scene);
  box(4.8, 0.88, 1.4, wood, 0, 0.44, 1.9, scene);
  box(5.0, 0.06, 1.5, top, 0, 0.93, 1.9, scene);

  const cupM = mat(0xdfeaf0, { transparent: true, opacity: 0.9, roughness: 0.2 }), sleeve = mat(0xc8a27a);
  const stack = (h) => g => { for (let i = 0; i < 6; i++) cyl(0.15, 0.11, h, cupM, 0, h / 2 + i * 0.05, 0, g, 12, true); cyl(0.145, 0.13, h * 0.35, sleeve, 0, h * 0.5 + 0.25, 0, g, 12); };
  station(scene, stations, pickables, 'cupM', -2.0, TOP_MAIN, 0.2, stack(0.28), [0.42, 0.6, 0.42]);
  station(scene, stations, pickables, 'cupL', -1.35, TOP_MAIN, 0.2, stack(0.36), [0.46, 0.7, 0.46]);

  station(scene, stations, pickables, 'espresso', 0, TOP_MAIN, -0.12, g => {
    const red = mat(0xe25b4a), steel = mat(0xd9dde0, { metalness: 0.5, roughness: 0.3 }), dark = mat(0x2d2a28);
    box(1.3, 0.78, 0.55, red, 0, 0.39, -0.05, g);
    box(1.34, 0.06, 0.6, steel, 0, 0.8, -0.05, g);
    box(1.34, 0.12, 0.6, steel, 0, 0.06, -0.05, g);
    cyl(0.1, 0.12, 0.12, steel, 0, 0.52, 0.28, g, 12);
    box(0.08, 0.05, 0.3, dark, 0, 0.45, 0.45, g);
    box(0.7, 0.04, 0.3, steel, 0, 0.02, 0.36, g);
    const gauge = cyl(0.1, 0.1, 0.03, mat(0xfffaf0), -0.4, 0.58, 0.23, g, 14);
    gauge.rotation.x = Math.PI / 2;
    box(0.015, 0.07, 0.01, dark, -0.4, 0.6, 0.25, g);
    [0.32, 0.45].forEach(x => sph(0.035, mat(0x7de08b, { emissive: 0x2a8a3a }), x, 0.6, 0.23, g, 6, 4));
    [-0.35, 0.35].forEach(x => cyl(0.06, 0.05, 0.08, mat(0xffffff), x, 0.87, -0.05, g, 8));
  }, [1.4, 0.95, 0.9], true);

  station(scene, stations, pickables, 'trash', 1.9, TOP_MAIN, 0.22, g => {
    cyl(0.2, 0.17, 0.34, mat(0x4a4f55), 0, 0.17, 0, g, 12);
    cyl(0.215, 0.215, 0.04, mat(0x6d747c), 0, 0.35, 0, g, 12);
  }, [0.5, 0.5, 0.5]);

  const zA = 1.6, zB = 2.25;
  const reg = new THREE.Group();
  reg.position.set(1.15, TOP_MAIN, -0.28);
  box(0.5, 0.25, 0.4, mat(0x5b7c99), 0, 0.12, 0, reg);
  const scr = box(0.38, 0.22, 0.04, mat(0x2d2a28), 0, 0.36, -0.08, reg);
  scr.rotation.x = -0.3;
  scene.add(reg);

  station(scene, stations, pickables, 'condensed', -1.8, TOP_BACK, zA, g => {
    cyl(0.13, 0.13, 0.22, mat(0xf2f2f2, { metalness: 0.3 }), 0, 0.11, 0, g, 14);
    cyl(0.135, 0.135, 0.1, mat(0x3b6fb6), 0, 0.11, 0, g, 14);
    cyl(0.12, 0.12, 0.01, mat(0xd8d8d8), 0, 0.225, 0, g, 14);
  }, [0.4, 0.4, 0.4]);

  station(scene, stations, pickables, 'milk', -0.9, TOP_BACK, zA, g => {
    box(0.24, 0.34, 0.24, mat(0xffffff), 0, 0.17, 0, g);
    box(0.25, 0.1, 0.25, mat(0x5aa9e6), 0, 0.22, 0, g);
    const roof = box(0.18, 0.18, 0.24, mat(0xffffff), 0, 0.36, 0, g);
    roof.rotation.z = Math.PI / 4;
    cyl(0.03, 0.03, 0.04, mat(0x5aa9e6), 0.05, 0.44, 0.05, g, 8);
  }, [0.4, 0.55, 0.4]);

  station(scene, stations, pickables, 'steam', 0, TOP_BACK, zA, g => {
    const steel = mat(0xcfd4d8, { metalness: 0.6, roughness: 0.25 });
    cyl(0.12, 0.14, 0.26, steel, 0, 0.13, 0, g, 14);
    const h = mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 10, Math.PI), steel, 0.15, 0.14, 0, g);
    h.rotation.z = -Math.PI / 2;
    const wand = cyl(0.012, 0.012, 0.4, steel, -0.05, 0.36, 0, g, 6);
    wand.rotation.z = 0.35;
  }, [0.45, 0.6, 0.45]);

  station(scene, stations, pickables, 'water', 0.9, TOP_BACK, zA, g => {
    const k = mat(0x9fcfd8);
    cyl(0.11, 0.16, 0.26, k, 0, 0.13, 0, g, 12);
    cyl(0.03, 0.03, 0.05, mat(0x2d2a28), 0, 0.29, 0, g, 8);
    const sp = cyl(0.018, 0.02, 0.3, k, 0.2, 0.2, 0, g, 6);
    sp.rotation.z = -0.9;
    const hd = mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 10, Math.PI), mat(0x2d2a28), -0.14, 0.16, 0, g);
    hd.rotation.z = Math.PI / 2;
  }, [0.5, 0.45, 0.4]);

  station(scene, stations, pickables, 'ice', 1.8, TOP_BACK, zA, g => {
    box(0.55, 0.2, 0.42, mat(0xcfd4d8, { metalness: 0.5, roughness: 0.3 }), 0, 0.1, 0, g);
    const ice = mat(0xe3f6ff, { transparent: true, opacity: 0.9, roughness: 0.1 });
    [[-0.15, -0.08], [0, 0.05], [0.14, -0.04], [-0.05, -0.1], [0.12, 0.1], [-0.16, 0.1]].forEach(([x, z], i) => { const c = box(0.09, 0.09, 0.09, ice, x, 0.22, z, g); c.rotation.set(i * 0.5, i, 0.2); });
    const sc = box(0.08, 0.03, 0.22, mat(0xb8bec4, { metalness: 0.5 }), 0.2, 0.28, 0.08, g);
    sc.rotation.x = -0.5;
  }, [0.6, 0.4, 0.5]);

  station(scene, stations, pickables, 'caramel', -0.6, TOP_BACK, zB, g => {
    cyl(0.08, 0.08, 0.3, mat(0xc9812c, { transparent: true, opacity: 0.9, roughness: 0.2 }), 0, 0.15, 0, g, 10);
    cyl(0.03, 0.03, 0.08, mat(0x2d2a28), 0, 0.34, 0, g, 8);
    box(0.12, 0.025, 0.04, mat(0x2d2a28), 0.04, 0.39, 0, g);
    cyl(0.082, 0.082, 0.1, mat(0xfff4dc), 0, 0.13, 0, g, 10);
  }, [0.35, 0.5, 0.35]);

  station(scene, stations, pickables, 'saltcream', 0.6, TOP_BACK, zB, g => {
    cyl(0.18, 0.13, 0.13, mat(0xffffff), 0, 0.065, 0, g, 14);
    const d = mesh(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xfff3e0), 0, 0.12, 0, g);
    d.scale.y = 0.6;
    sph(0.025, mat(0xe8e0d0), 0.05, 0.2, 0.03, g, 6, 4);
  }, [0.45, 0.35, 0.45]);

}

function buildPerson(look) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const s = look.h;
  const skin = mat(look.skin), shirt = mat(look.shirt), pants = mat(look.pants), hair = mat(look.hair), dark = mat(0x222222);
  box(0.13, 0.55, 0.14, pants, -0.08, 0.28, 0, body);
  box(0.13, 0.55, 0.14, pants, 0.08, 0.28, 0, body);
  cyl(0.2, 0.24, 0.55 * s, shirt, 0, 0.55 + 0.275 * s, 0, body, 10);
  const armY = 0.55 + 0.4 * s;
  [-1, 1].forEach(d => { const a = box(0.09, 0.45 * s, 0.1, shirt, d * 0.27, armY - 0.12, 0, body); a.rotation.z = d * 0.12; });
  const headY = 0.55 + 0.55 * s + 0.2;
  sph(0.2, skin, 0, headY, 0, body, 12, 8);
  const hr = mesh(new THREE.SphereGeometry(0.215, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, headY + 0.01, -0.01, body);
  hr.rotation.x = -0.25;
  if (look.bun) sph(0.09, hair, 0, headY + 0.12, -0.17, body, 8, 6);
  [-0.07, 0.07].forEach(x => sph(0.025, dark, x, headY + 0.02, 0.18, body, 6, 4));
  box(0.07, 0.015, 0.01, mat(0xb5463c), 0, headY - 0.07, 0.19, body);
  return g;
}
