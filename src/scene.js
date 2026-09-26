// Cảnh 3D dựng hoàn toàn bằng code: phòng low-poly và người ở đây, đồ vật trên quầy ở props.js.
// Cảnh chỉ vẽ: vị trí khách và nhân viên đọc từ thế giới mô phỏng W (logic.js) mỗi khung hình,
// trạm dựng theo số liệu của quán. game.js gọi vào các hàm bên dưới và nhận lại sự kiện chạm qua `handlers`.
import * as THREE from 'three';
import { LAYOUT, BEARS } from './data.js';
import { motionScale } from './feel.js';
import * as P from './props.js';
import { buildStreet } from './street.js';
import { buildBear, buildKid, animBear, animKid, emote as emoteActor, newActor, heartGeometry, BEAR_HEAD, BEAR_CARRY, KID_HEAD, KID_HAND } from './chars.js';

const TOP_FRONT = 0.95, TOP_BACK = 0.95;

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
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
// cảm giác "nảy" ở mọi thứ được chạm: trạm, người, biển hiệu.
const spring = () => ({ v: 0, vel: 0 });
function stepSpring(s, dt, k = 420, d = 15) {
  if (!s.v && !s.vel) return;
  s.vel += (-k * s.v - d * s.vel) * dt;
  s.v += s.vel * dt;
  if (Math.abs(s.v) < 1e-4 && Math.abs(s.vel) < 1e-3) { s.v = 0; s.vel = 0; }
}
// Nén giữ nguyên thể tích: thấp xuống thì bè ra.
const squash = (o, v, base = 1) => o.scale.set(base * (1 - v * 0.5), base * (1 + v), base * (1 - v * 0.5));
// Quay góc theo đường ngắn nhất.
const turn = (a, b, k) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;

// Mô hình cho từng loại trạm: [hàm dựng, tỉ lệ, có ly mẫu bên cạnh không]
const PROP = {
  espresso: [P.buildEspresso, 0.64, false],
  can: [P.buildCan, 1.7, true],
  carton: [P.buildCarton, 1.35, true],
  pitcher: [P.buildPitcher, 1.55, true],
  kettle: [P.buildKettle, 1.45, true],
  icebin: [P.buildIceBin, 1.1, true],
  syrup: [P.buildSyrup, 1.45, true],
  cream: [P.buildCreamBowl, 1.5, true],
};

// Hiệu ứng lúc pha cho từng loại máy (toạ độ trong khung của mô hình, trước khi phóng to):
// machine: máy rung, rót từ vòi; pour: nhấc lên, dời sang ly, nghiêng rót; swirl: lắc xoáy; ice: xúc đá; whisk: đánh kem.
// lip: điểm dòng nước chảy ra; stream: màu dòng (bỏ trống thì lấy màu món); puff: loại hạt bay ra định kỳ.
const BREWFX = {
  espresso: { mode: 'machine', lip: [0, 0.44, 0.34], stream: 0x3b2314, puff: 'steam', puffAt: [0.3, 0.9, -0.05] },
  can: { mode: 'pour', lift: 0.2, dx: 0.26, tilt: 1.0, lip: [0.11, 0.21, 0], stream: 0xf3e2b8 },
  carton: { mode: 'pour', lift: 0.16, dx: 0.3, tilt: 1.05, lip: [0.06, 0.36, 0.04], stream: 0xfbf7ee },
  kettle: { mode: 'pour', lift: 0.12, dx: 0.02, tilt: 0.55, lip: [0.34, 0.28, 0], puff: 'steam', puffAt: [0.34, 0.3, 0] },
  syrup: { mode: 'pour', lift: 0.22, dx: 0.3, tilt: 1.3, lip: [0.09, 0.39, 0] },
  pitcher: { mode: 'swirl', puff: 'steam', puffAt: [0, 0.3, 0] },
  icebin: { mode: 'ice' },
  cream: { mode: 'whisk', puff: 'bubble', puffAt: [0, 0.25, 0] },
};

export function createScene(canvas, handlers) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  P.initProps(renderer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3e3cc);
  const BASE_FOV = 36;
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 80);

  scene.add(new THREE.HemisphereLight(0xfff3df, 0x7a5a44, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(3.5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const pickables = [];
  let room = null;
  buildCounters(scene);

  /* ---------- biển hiệu tên quán trên tường ---------- */
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024;
  signCanvas.height = 300;
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 4;
  const signG = new THREE.Group();
  signG.position.set(0.2, 2.55, -4.84);
  scene.add(signG);
  box(2.9, 0.95, 0.08, mat(0x5a3d2b), 0, 0, 0, signG).castShadow = false;
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(2.76, 0.81), new THREE.MeshBasicMaterial({ map: signTex }));
  signFace.position.z = 0.045;
  signG.add(signFace);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xff6fa8 });
  const neon = new THREE.Group();
  [[0, 0.43, 2.8, 0.03], [0, -0.43, 2.8, 0.03], [-1.4, 0, 0.03, 0.89], [1.4, 0, 0.03, 0.89]].forEach(([x, y, w, h]) => { box(w, h, 0.03, neonMat, x, y, 0.06, neon).castShadow = false; });
  signG.add(neon);
  const signSp = spring();
  let signKey = '';
  // Vẽ lại chỉ khi chữ hoặc kiểu biển đổi, không bao giờ vẽ trong vòng lặp khung hình.
  function drawSign(name, sub, lit) {
    const c = signCanvas.getContext('2d'), W = signCanvas.width, H = signCanvas.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = lit ? '#2b1d2a' : '#fff3dc';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = lit ? '#ff6fa8' : '#8a5a3b';
    c.lineWidth = 10;
    c.strokeRect(22, 22, W - 44, H - 44);
    const font = px => `800 ${px}px "Baloo 2", system-ui, sans-serif`;
    let size = 130;
    c.font = font(size);
    while (size > 48 && c.measureText(name).width > W - 110) { size -= 4; c.font = font(size); }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (lit) { c.shadowColor = '#ff6fa8'; c.shadowBlur = 28; c.fillStyle = '#ffe3f0'; }
    else { c.lineWidth = 12; c.strokeStyle = '#fff3dc'; c.strokeText(name, W / 2, H * 0.42); c.fillStyle = '#3a2317'; }
    c.fillText(name, W / 2, H * 0.42);
    c.shadowBlur = 0;
    c.font = font(54);
    c.fillStyle = lit ? '#ffb3d1' : '#8a5a3b';
    c.fillText(sub, W / 2, H * 0.76);
    signTex.needsUpdate = true;
  }
  function setSign(name, sub, lit, celebrate) {
    name = name || 'Quán Cà Phê Nhỏ';
    const key = name + '|' + sub + '|' + !!lit;
    if (key !== signKey || celebrate === 'redraw') { signKey = key; drawSign(name, sub, lit); }
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

  /* ---------- trạm pha trên quầy sau ---------- */
  const stations = new Map();
  const stGroup = new THREE.Group();
  scene.add(stGroup);
  const tkMats = new Map();
  const streamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const drinkMat = c => { if (!tkMats.has(c)) tkMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })); return tkMats.get(c); };
  function clearStations() {
    stations.forEach(s => { stGroup.remove(s.group); stGroup.remove(s.stream); const i = pickables.indexOf(s.group); if (i >= 0) pickables.splice(i, 1); });
    stations.clear();
  }
  // defs: danh sách trạm của quán; mỗi trạm dựng sẵn cả mô hình lẫn thùng hàng, bật tắt theo trạng thái khoá.
  function setStations(defs) {
    clearStations();
    defs.forEach((d, i) => {
      const g = new THREE.Group();
      g.position.set(LAYOUT.stationX[i], TOP_BACK, LAYOUT.backZ);
      g.userData.station = d.id;
      const tray = box(0.98, 0.03, 0.78, mat(new THREE.Color(d.c).lerp(new THREE.Color(0xffffff), 0.55).getHex()), 0, 0.015, 0, g);
      tray.receiveShadow = true;
      const prop = new THREE.Group();
      const [build, sc, withCup] = PROP[d.prop] || PROP.can;
      const inner = new THREE.Group();
      build(inner);
      inner.scale.setScalar(sc);
      prop.add(inner);
      if (d.prop === 'espresso') inner.position.z = -0.12;
      else inner.position.x = -0.2;
      // ly trước máy: đầy dần khi đang pha, nảy lên khi pha xong
      const color = new THREE.Color(d.c).getHex();
      const cup = P.buildTakeaway(drinkMat(color));
      const cupScale = withCup ? 1.35 : 0.75;
      cup.scale.setScalar(cupScale);
      if (withCup) cup.position.set(0.32, 0, 0.12); else cup.position.set(0, 0, 0.098);
      prop.add(cup);
      const stream = new THREE.Mesh(streamGeo, new THREE.MeshStandardMaterial({ color: BREWFX[d.prop].stream ?? color, roughness: 0.3, emissive: BREWFX[d.prop].stream ?? color, emissiveIntensity: 0.15 }));
      stream.visible = false;
      stream.castShadow = false;
      stGroup.add(stream);
      prop.position.y = 0.03;
      g.add(prop);
      const crate = buildCrate(d.c);
      g.add(crate);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.0, 1.0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hb.position.y = 0.5;
      g.add(hb);
      stGroup.add(g);
      pickables.push(g);
      stations.set(d.id, { group: g, prop, crate, locked: null, sp: spring(), base: g.position.clone(), idx: i, inner, rest: inner.position.clone(), sc, fx: BREWFX[d.prop] || BREWFX.can, color, cup, cupScale, fill: cup.children[0], cupSp: spring(), tray, stream, prog: -1, brew: -1, bt: 0, k: 0, spin: 0, puffT: 0, glow: 0 });
    });
  }
  function setStationLocked(id, locked) {
    const s = stations.get(id);
    if (!s || s.locked === locked) return;
    const was = s.locked;
    s.locked = locked;
    s.prop.visible = !locked;
    s.crate.visible = locked;
    if (was === true && !locked) {
      // thùng hàng bật tung, máy nảy lên: khoảnh khắc mở trạm
      s.sp.v = -0.5 * motionScale;
      s.sp.vel = 0;
      const p = s.group.localToWorld(tv.set(0, 0.5, 0));
      burst('crate', p, 14);
      burst('confetti', p, 26);
      burst('star', p, 6);
      punch(0.4);
      shake(0.25);
    }
  }
  function press(id, a = 0.22) { const s = stations.get(id); if (s) { s.sp.v = -a * motionScale; s.sp.vel = 0; } }
  function celebrateStation(id, big) {
    const s = stations.get(id);
    if (!s) return;
    s.sp.v = (big ? -0.45 : -0.25) * motionScale;
    s.sp.vel = 0;
    const p = s.group.localToWorld(tv.set(0, 0.7, 0));
    burst('spark', p, big ? 16 : 8);
    if (big) { burst('star', p, 7); burst('confetti', p, 18); punch(0.3); }
  }

  /* ---------- máy chạy khi pha: lấy đà, làm việc, xong thì nảy và lấp lánh ---------- */
  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function brewStart(s) {
    s.bt = 0;
    s.puffT = 0.1;
    s.sp.v = -0.12 * motionScale;             // lấy đà: nén xuống rồi bật lên
    s.sp.vel = 0;
    s.fill.scale.y = 0.05;
    burst('spark', s.inner.localToWorld(tA.set(0, 0.3, 0)), 3);
  }
  function brewDone(s) {
    s.sp.v = -0.26 * motionScale;             // máy nảy
    s.sp.vel = 0;
    s.cupSp.v = 0.4 * motionScale;            // ly vươn lên rồi nảy về
    s.cupSp.vel = 0;
    s.glow = 1;
    s.fill.scale.y = 1;
    const top = s.cup.localToWorld(tA.set(0, 0.3, 0));
    burst('spark', top, 6);
    burst('star', top, 2);
  }
  function animStation(s, dt) {
    const on = s.brew >= 0 && !s.locked, fx = s.fx, inner = s.inner, ms = motionScale;
    s.bt += dt;
    s.k += ((on ? 1 : 0) - s.k) * (1 - Math.exp(-dt * 9));
    const k = s.k, t = s.bt;
    inner.position.copy(s.rest);
    inner.rotation.set(0, 0, 0);
    inner.scale.setScalar(s.sc);
    let pour = false;
    if (fx.mode === 'machine') {
      if (on) { inner.position.x += rr() * 0.007 * ms; inner.position.z += rr() * 0.004 * ms; pour = true; }
    } else if (fx.mode === 'pour') {
      inner.position.x += fx.dx * k;
      inner.position.y += fx.lift * k + (on ? Math.sin(t * 9) * 0.012 * ms : 0);
      inner.rotation.z = -fx.tilt * k;
      pour = on && k > 0.85;
    } else if (fx.mode === 'swirl') {
      inner.rotation.y = Math.sin(t * 9) * 0.6 * k * ms;
      inner.rotation.z = Math.sin(t * 9 + 1.2) * 0.18 * k * ms;
      inner.position.y += Math.abs(Math.sin(t * 9)) * 0.03 * k;
    } else if (fx.mode === 'ice') {
      inner.position.x += Math.sin(t * 34) * 0.012 * k * ms;
      inner.rotation.z = Math.sin(t * 17) * 0.05 * k * ms;
    } else if (fx.mode === 'whisk') {
      s.spin += dt * 9 * k;
      inner.rotation.y = s.spin;
      inner.rotation.z = Math.sin(t * 14) * 0.08 * k * ms;
    }
    // ly đầy dần theo tiến độ, nảy khi xong
    if (on) s.fill.scale.y = Math.max(0.05, s.brew);
    stepSpring(s.cupSp, dt, 380, 12);
    squash(s.cup, s.cupSp.v, s.cupScale);
    // khay dưới máy sáng nhấp nháy khi đang pha, loé lên khi xong
    s.glow = Math.max(on ? 0.28 + 0.14 * Math.sin(t * 8) : 0, s.glow - dt * 2.5);
    s.tray.material.emissive.setHex(s.color);
    s.tray.material.emissiveIntensity = s.glow;
    // dòng nước từ miệng máy hay miệng chai xuống ly, phập phồng nhẹ cho sống động
    if (pour) {
      inner.updateMatrixWorld(true);
      inner.localToWorld(tA.set(...fx.lip));
      s.cup.localToWorld(tB.set(0, 0.24, 0));
      const len = tA.distanceTo(tB), r = 0.022 * (1 + Math.sin(t * 40) * 0.25);
      s.stream.position.copy(tA).add(tB).multiplyScalar(0.5);
      s.stream.quaternion.setFromUnitVectors(UP, tB.sub(tA).normalize());
      s.stream.scale.set(r, len, r);
      s.stream.visible = true;
    } else s.stream.visible = false;
    // hạt bay ra định kỳ theo từng loại máy
    if (on && (s.puffT -= dt) <= 0) {
      s.puffT = 0.16 + Math.random() * 0.1;
      if (fx.puff && Math.random() < 0.7) burst(fx.puff, inner.localToWorld(tA.set(...fx.puffAt)), 1);
      if (pour && Math.random() < 0.6) burst('drop', s.cup.localToWorld(tA.set(0, 0.26, 0)), 1, fx.stream ?? s.color);
      if (fx.mode === 'ice') burst('ice', inner.localToWorld(tA.set(0, 0.22, 0)), 1);
      if (fx.mode === 'swirl' && Math.random() < 0.6) burst('bubble', inner.localToWorld(tA.set(0, 0.25, 0)), 1);
    }
  }

  /* ---------- vòng sáng chỉ trạm (cho bong bóng hướng dẫn) ---------- */
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 40), new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  function setHighlight(id) {
    const s = id && stations.get(id);
    ring.visible = !!s;
    if (s) ring.position.set(s.base.x, TOP_BACK + 0.04, s.base.z);
  }

  /* ---------- hạt: một pool dựng sẵn, không cấp phát gì trong lúc chơi ---------- */
  const PGEO = { coin: new THREE.CylinderGeometry(0.055, 0.055, 0.016, 12), orb: new THREE.SphereGeometry(0.045, 8, 6), paper: new THREE.PlaneGeometry(0.08, 0.045), star: starGeometry(), chip: new THREE.BoxGeometry(0.09, 0.02, 0.07), heart: heartGeometry() };
  const PMAT = {
    coin: new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.55, roughness: 0.3, emissive: 0x7a5200, emissiveIntensity: 0.4 }),
    spark: new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    star: new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }),
    steam: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
    crate: new THREE.MeshStandardMaterial({ color: 0xc9955f, roughness: 0.8 }),
    heart: new THREE.MeshBasicMaterial({ color: 0xff6b8b, side: THREE.DoubleSide }),
    ice: new THREE.MeshStandardMaterial({ color: 0xe6f7ff, transparent: true, opacity: 0.85, roughness: 0.1 }),
    bubble: new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.5 }),
    confetti: [0xe25b4a, 0xf0b43c, 0x4fa883, 0x5aa9e6, 0xef6f8e, 0x9b6bd1].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })),
  };
  const parts = Array.from({ length: 260 }, () => {
    const m = new THREE.Mesh(PGEO.orb, PMAT.spark);
    m.visible = false;
    m.frustumCulled = false;
    scene.add(m);
    return { m, vel: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0, life: 1, grav: 0, drag: 0, s0: 1, grow: false };
  });
  let pNext = 0;
  const rr = () => Math.random() * 2 - 1;
  const KIND = {
    coin: { geo: 'coin', mat: 'coin', life: 0.85, grav: -9, drag: 0.4, s0: 1.3, v: () => [rr() * 1.3, 2.8 + Math.random() * 1.4, rr() * 1.3 + 0.4], spin: 18 },
    spark: { geo: 'orb', mat: 'spark', life: 0.38, grav: 0, drag: 4, s0: 1, v: () => { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI; return [Math.cos(a) * Math.sin(b) * 2.6, Math.cos(b) * 2.6, Math.sin(a) * Math.sin(b) * 2.6]; }, spin: 0 },
    star: { geo: 'star', mat: 'star', life: 0.9, grav: -3, drag: 1.2, s0: 1.6, v: () => [rr() * 1.4, 2.2 + Math.random(), rr() * 0.6 + 0.8], spin: 8 },
    confetti: { geo: 'paper', mat: 'confetti', life: 1.7, grav: -5, drag: 1.4, s0: 1.3, v: () => [rr() * 2.4, 3 + Math.random() * 2.4, rr() * 2 + 0.5], spin: 14 },
    steam: { geo: 'orb', mat: 'steam', life: 0.95, grav: 0, drag: 0.6, s0: 1.1, grow: true, v: () => [rr() * 0.15, 0.55 + Math.random() * 0.35, rr() * 0.15], spin: 0 },
    drop: { geo: 'orb', mat: 'drop', life: 0.45, grav: -7, drag: 0.5, s0: 0.45, v: () => [rr() * 0.7, 0.8 + Math.random() * 0.8, rr() * 0.7], spin: 0 },
    ice: { geo: 'chip', mat: 'ice', life: 0.6, grav: -9, drag: 0.3, s0: 0.9, v: () => [1.1 + Math.random() * 0.5, 2.2 + Math.random() * 0.8, rr() * 0.3], spin: 12 },
    bubble: { geo: 'orb', mat: 'bubble', life: 0.7, grav: 0.5, drag: 1, s0: 0.5, grow: true, v: () => [rr() * 0.25, 0.5 + Math.random() * 0.4, rr() * 0.25], spin: 0 },
    heart: { geo: 'heart', mat: 'heart', life: 1.1, grav: 0.8, drag: 1.6, s0: 1.4, v: () => [rr() * 0.5, 1.2 + Math.random() * 0.6, 0.3], spin: 0, face: true },
    crate: { geo: 'chip', mat: 'crate', life: 0.9, grav: -9, drag: 0.4, s0: 1.4, v: () => [rr() * 2.2, 2.5 + Math.random() * 2, rr() * 1.6 + 0.4], spin: 16 },
  };
  function burst(kind, pos, n, color) {
    const K = KIND[kind];
    n = Math.max(1, Math.round(n * (0.8 + Math.random() * 0.4)));
    for (let i = 0; i < n; i++) {
      const p = parts[pNext];
      pNext = (pNext + 1) % parts.length;
      p.m.geometry = PGEO[K.geo];
      p.m.material = K.mat === 'confetti' ? PMAT.confetti[(Math.random() * 6) | 0] : K.mat === 'drop' ? drinkMat(color ?? 0x8a5a3b) : PMAT[K.mat];
      p.m.position.set(pos.x + rr() * 0.05, pos.y, pos.z + rr() * 0.05);
      if (K.face) p.m.rotation.set(-0.5, 0, rr() * 0.4); else p.m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.vel.set(...K.v());
      p.spin.set(rr() * K.spin, rr() * K.spin, rr() * K.spin);
      Object.assign(p, { t: 0, life: K.life * (0.8 + Math.random() * 0.4), grav: K.grav, drag: K.drag, s0: K.s0 * (0.75 + Math.random() * 0.5), grow: !!K.grow });
      p.m.scale.setScalar(p.s0);
      p.m.visible = true;
    }
  }
  const tv = new THREE.Vector3(), tmp = new THREE.Vector3();
  // where: { station } | { cust } | { staff }, head = true thì bắn từ trên đầu
  function burstAt(where, kind, n) {
    let p = null;
    if (where.station) { const s = stations.get(where.station); if (s) p = s.group.localToWorld(tv.set(0, 0.6, 0.1)); }
    else {
      const m = where.cust != null ? custs.get(where.cust) : staff.get(where.staff);
      const bear = where.staff != null;
      if (m) p = m.g.localToWorld(tv.copy(where.head ? (bear ? BEAR_HEAD : KID_HEAD) : (bear ? BEAR_CARRY : KID_HAND)));
    }
    if (p) burst(kind, p, n);
  }

  /* ---------- người: khách và nhân viên, vị trí lấy từ W ---------- */
  const custs = new Map(), staff = new Map();
  const people = new THREE.Group();
  scene.add(people);
  let apron = 0xff8fa3;
  function holdCup(m, color) {
    if (m.cup) m.g.remove(m.cup);
    m.cup = null;
    if (color == null) return;
    m.cup = P.buildTakeaway(drinkMat(color));
    m.cup.scale.setScalar(1.15);
    m.cup.position.copy(m.kind === 'kid' ? KID_HAND : BEAR_CARRY);
    m.g.add(m.cup);
  }
  const lookFor = seed => {
    const r = k => { const x = Math.sin(seed * 9973 + k * 131.7) * 43758.5453; return x - Math.floor(x); };
    const pick = (arr, k) => arr[Math.floor(r(k) * arr.length)];
    return {
      skin: pick([0xfde0c8, 0xf5d0b0, 0xe8b894, 0xc98f63], 1),
      shirt: pick([0xff8fa3, 0x8fd3c1, 0xa0c4ff, 0xffd166, 0xc3a6ff, 0xffb4a2, 0x9ed39a], 2),
      pants: pick([0x5b6c8f, 0x7a6a8f, 0x8a6a4f, 0x4a5a78], 3),
      hair: pick([0x3a2317, 0x5a3a24, 0x2b2b2e, 0xc9884f, 0xe9c46a], 4),
      bun: r(5) < 0.4,
    };
  };
  // pickKey: userData để chạm vào nhận ra khách ('cust') hay gấu ('staff')
  function addActor(map, id, built, e, pickKey) {
    const m = newActor(built, (id * 7.31) % 10);
    m.g.position.set(e.x, 0, e.z);
    m.g.rotation.y = e.face;
    m.g.userData[pickKey] = id;
    pickables.push(m.g);
    people.add(m.g);
    map.set(id, m);
    return m;
  }
  function dropPerson(map, id) {
    const m = map.get(id);
    if (!m) return;
    people.remove(m.g);
    const i = pickables.indexOf(m.g);
    if (i >= 0) pickables.splice(i, 1);
    map.delete(id);
  }
  function clearPeople() { [...custs.keys()].forEach(id => dropPerson(custs, id)); [...staff.keys()].forEach(id => dropPerson(staff, id)); }
  // Đọc W: thêm người mới, bỏ người đã đi, đặt vị trí và góc quay. colorOf(st) → màu ly của món.
  // Gấu thứ i trong quán mặc bộ thứ i trong BEARS (gấu nâu, gấu trúc, gấu trắng, gấu mật).
  function sync(W, colorOf, dt) {
    const seen = new Set();
    for (const c of W.cust) {
      seen.add(c.id);
      const m = custs.get(c.id) || addActor(custs, c.id, buildKid(lookFor(c.seed)), c, 'cust');
      place(m, c, dt);
      if (c.state === 'got' && !m.cup) holdCup(m, colorOf(c.st));
    }
    [...custs.keys()].forEach(id => { if (!seen.has(id)) dropPerson(custs, id); });
    seen.clear();
    W.staff.forEach((s, i) => {
      seen.add(s.id);
      const m = staff.get(s.id) || addActor(staff, s.id, buildBear(BEARS[i % BEARS.length].id, apron), s, 'staff');
      place(m, s, dt);
      if (m.carry !== s.carry) { m.carry = s.carry; holdCup(m, s.carry ? colorOf(s.carry) : null); }
      m.brewing = s.state === 'brew' ? s.job.st : null;
    });
    [...staff.keys()].forEach(id => { if (!seen.has(id)) dropPerson(staff, id); });
    stations.forEach(st => { st.prog = -1; });
    for (const b of W.staff) if (b.state === 'brew') { const st = stations.get(b.job.st); if (st) st.prog = Math.max(st.prog, Math.min(1, b.t / b.dur)); }
  }
  function place(m, e, dt) {
    m.g.position.x = e.x;
    m.g.position.z = e.z;
    // gấu rảnh tay (đưa ly xong) thì quay mặt ra phía người chơi, để luôn thấy biểu cảm
    const face = e.state === 'idle' && m.kind !== 'kid' && !(m.emote && m.emote.k === 'serve') ? 0 : e.face;
    m.g.rotation.y = turn(m.g.rotation.y, face, 1 - Math.exp(-dt * (face === e.face ? 12 : 5)));
    m.moving = e.moving;
  }
  function animPeople(dt) {
    custs.forEach(m => animKid(m, dt));
    staff.forEach(m => animBear(m, dt));
  }
  // where: { staff } | { cust }; k: 'serve' | 'cheer' | 'wave' | 'love' | ...
  function emote(where, k, opts) {
    const m = where.staff != null ? staff.get(where.staff) : custs.get(where.cust);
    if (!m) return;
    emoteActor(m, k, opts);
    m.sp.v = -0.25 * motionScale;
  }
  function cheerAll() { staff.forEach(m => emoteActor(m, 'cheer')); }

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
      while (o && o.userData.station == null && o.userData.cust == null && o.userData.staff == null) o = o.parent;
      if (o) return o.userData.station != null ? { station: o.userData.station } : o.userData.staff != null ? { staff: o.userData.staff } : { cust: o.userData.cust };
    }
    return null;
  }
  canvas.addEventListener('pointerdown', ev => { const p = pick(ev); if (p) handlers.onTap(p); });

  /* ---------- chiếu ra màn hình ---------- */
  const v = new THREE.Vector3();
  let W = 1, H = 1;
  function toScreen(p) {
    v.copy(p).project(camera);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 };
  }
  const headScreen = id => { const m = custs.get(id); return m ? toScreen(m.g.localToWorld(tv.copy(KID_HEAD))) : null; };
  const staffScreen = id => { const m = staff.get(id); return m ? toScreen(m.g.localToWorld(tv.copy(BEAR_HEAD))) : null; };
  // Mép sau của trạm (sát tường), để gắn nhãn cấp phía trên máy, không che mặt gấu đứng trước máy.
  const stationScreen = id => { const s = stations.get(id); return s ? toScreen(tv.set(s.base.x, TOP_BACK + 0.05, s.base.z - 0.62)) : null; };
  const stationTop = id => { const s = stations.get(id); return s ? toScreen(tv.set(s.base.x, TOP_BACK + 0.75, s.base.z)) : null; };

  /* ---------- khung hình ---------- */
  // Nhìn chếch từ phía khách, gần như từ trên xuống: thu trọn khách, hai quầy, gấu và biển hiệu,
  // chừa chỗ cho thanh trên và thanh dưới, rồi căn giữa theo chiều dọc.
  const FIT = [[-2.85, 0.95, LAYOUT.backZ - 0.6], [2.85, 0.95, LAYOUT.backZ - 0.6], [-2.7, 0, LAYOUT.custZ + 0.35], [2.7, 0, LAYOUT.custZ + 0.35], [-2.7, 1.35, LAYOUT.custZ], [2.7, 1.35, LAYOUT.custZ], [-1.3, 3.05, -4.84], [1.7, 3.05, -4.84]].map(a => new THREE.Vector3(...a));
  let TOP_LIM = 0.7, BOT_LIM = -0.68;
  function placeCam(t, dir, d) { camera.position.copy(t).addScaledVector(dir, d); camera.lookAt(t); camera.updateMatrixWorld(); }
  function extent() {
    let minY = 9, maxY = -9, maxX = 0;
    FIT.forEach(p => { const q = v.copy(p).project(camera); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); maxX = Math.max(maxX, Math.abs(q.x)); });
    return { minY, maxY, maxX };
  }
  function fitDist(t, dir) {
    let lo = 3, hi = 60;
    for (let i = 0; i < 30; i++) {
      const d = (lo + hi) / 2;
      placeCam(t, dir, d);
      const e = extent();
      if (e.maxX <= 0.96 && e.maxY <= TOP_LIM && e.minY >= BOT_LIM) hi = d; else lo = d;
    }
    return hi;
  }
  function fit() {
    TOP_LIM = 1 - 2 * 118 / H;
    BOT_LIM = -1 + 2 * 128 / H;
    const el = camera.aspect < 0.8 ? 1.0 : 0.9;
    const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el)), t = new THREE.Vector3(0, 0.9, -0.6);
    for (let k = 0; k < 4; k++) {
      const d = fitDist(t, dir);
      placeCam(t, dir, d);
      const e = extent(), err = (e.minY + e.maxY) / 2 - (TOP_LIM + BOT_LIM) / 2;
      t.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), err * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d);
    }
    placeCam(t, dir, fitDist(t, dir));
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
  // Máy quay lúc vào quán: đặt sẵn ở xa, cao và lệch góc (introPrime), rồi sà vào vị trí thường (introPlay),
  // chậm dần về cuối để dừng êm; lúc dừng thì đẩy ống kính nhẹ và gọi onLand để game hiện các bảng tiếp theo.
  let intro = null;
  const introFrom = new THREE.Vector3(), introOff = new THREE.Vector3();
  function introPrime(dur = 1.4) { intro = { t: 0, dur, playing: false, onLand: null }; }
  function introPlay(onLand) { if (!intro) introPrime(); intro.playing = true; intro.onLand = onLand; }
  function introPose(pos, dt) {
    if (!intro) return;
    const m = motionScale;
    if (intro.playing) intro.t += dt;
    const k = Math.min(1, intro.t / intro.dur), e = 1 - Math.pow(1 - k, 3);
    introOff.subVectors(camBase, camTarget).applyAxisAngle(UP, 0.5 * m).multiplyScalar(1 + 0.8 * m);
    introFrom.copy(camTarget).add(introOff).add(tA.set(0, 1.5 * m, 0));
    pos.lerpVectors(introFrom, pos, e);
    if (k >= 1) {
      const cb = intro.onLand;
      intro = null;
      punch(0.35);
      if (cb) cb();
    }
  }
  function updateCamera(realDt) {
    camT += realDt;
    const m = motionScale, s = trauma * trauma * (m < 1 ? 0.3 : 1);
    camera.position.set(
      camBase.x + Math.sin(camT * 0.37) * 0.05 * m + s * 0.14 * (Math.sin(camT * 57) + Math.sin(camT * 91) * 0.5),
      camBase.y + Math.sin(camT * 0.53) * 0.035 * m + s * 0.1 * Math.sin(camT * 73 + 1),
      camBase.z);
    introPose(camera.position, realDt);
    camera.lookAt(camTarget);
    trauma = Math.max(0, trauma - realDt * 1.8);
    const fov = BASE_FOV * (1 - punchV * 0.06 * m);
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
    punchV *= Math.exp(-realDt * 7);
    if (punchV < 1e-3) punchV = 0;
  }

  /* ---------- đổi quán: phòng, màu, trạm ---------- */
  function setShop(shop) {
    if (room) scene.remove(room);
    room = shop.theme.style === 'street' ? buildStreet(shop.theme) : buildRoom(shop.theme);
    apron = shop.theme.apron;
    scene.add(room);
    scene.background = new THREE.Color(shop.theme.sky);
    setStations(shop.stations);
    clearPeople();
    setHighlight(null);
  }

  function update(dt, realDt = dt) {
    updateCamera(realDt);
    animPeople(dt);
    stations.forEach(s => {
      stepSpring(s.sp, dt);
      squash(s.group, s.sp.v);
      // bắt đầu / xong một lượt pha; tiến độ tụt mạnh nghĩa là bạn gấu khác vừa nhận lượt mới ngay
      const p = s.prog;
      if (p >= 0 && (s.brew < 0 || p < s.brew - 0.3)) { if (s.brew >= 0) brewDone(s); brewStart(s); }
      else if (p < 0 && s.brew >= 0) brewDone(s);
      s.brew = p;
      animStation(s, dt);
    });
    stepSpring(signSp, dt, 260, 9);
    signG.scale.setScalar(1 + signSp.v);
    signG.rotation.z = signSp.v * 0.25;
    if (ring.visible) {
      const k = 1 + Math.sin(camT * 6) * 0.06;
      ring.scale.setScalar(k);
      ring.material.opacity = 0.55 + Math.sin(camT * 6) * 0.25;
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
  return { resize, update, render, introPrime, introPlay, setShop, setStationLocked, sync, press, celebrateStation, emote, cheerAll, burstAt, shake, punch, setHighlight, setSign, headScreen, staffScreen, stationScreen, stationTop };
}

function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.035 : 0.08, a = i / 10 * Math.PI * 2 - Math.PI / 2;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(s);
}

/* ================= dựng phòng theo màu của quán ================= */
function buildRoom(t) {
  const g = new THREE.Group();
  const floor = mesh(new THREE.PlaneGeometry(24, 24), mat(t.floor), 0, 0, 0, g);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const plank = mat(t.plank);
  for (let x = -11; x <= 11; x += 1.2) { const p = box(0.04, 0.005, 24, plank, x, 0.003, 0, g); p.castShadow = false; }
  const rug = cyl(1, 1, 0.012, mat(t.rug), 0, 0.008, LAYOUT.custZ - 0.1, g, 40);
  rug.scale.set(3.1, 1, 0.95);
  rug.castShadow = false;
  const rugIn = cyl(1, 1, 0.014, mat(new THREE.Color(t.rug).lerp(new THREE.Color(0xffffff), 0.45).getHex()), 0, 0.01, LAYOUT.custZ - 0.1, g, 40);
  rugIn.scale.set(2.7, 1, 0.72);
  rugIn.castShadow = false;

  const wall = mat(t.wall), trim = mat(t.wainscot);
  box(24, 4.2, 0.2, wall, 0, 2.1, -5, g);
  box(24, 1.1, 0.22, trim, 0, 0.55, -4.98, g);
  const glassM = mat(0xbfe3f2, { roughness: 0.2 });
  [-3.2, 2.1].forEach(x => { box(1.5, 1.2, 0.05, glassM, x - 0.8, 2.0, -4.88, g); box(1.65, 0.1, 0.1, trim, x - 0.8, 1.38, -4.86, g); });

  const tableM = mat(0xe8d5b9), legM = mat(0x5a3d2b), chairM = mat(t.chair);
  const table = (x, z) => {
    cyl(0.5, 0.5, 0.06, tableM, x, 0.74, z, g, 14);
    cyl(0.05, 0.05, 0.72, legM, x, 0.37, z, g, 6);
    cyl(0.28, 0.28, 0.03, legM, x, 0.02, z, g, 10);
    [[0.75, 0], [-0.75, 0]].forEach(([ddx, ddz]) => { box(0.42, 0.06, 0.42, chairM, x + ddx, 0.46, z + ddz, g); box(0.06, 0.46, 0.06, legM, x + ddx, 0.23, z + ddz, g); box(0.06, 0.45, 0.42, chairM, x + ddx + Math.sign(ddx) * 0.2, 0.7, z + ddz, g); });
  };
  table(-5.0, -3.1);
  table(-5.0, -0.9);
  table(5.6, -2.0);

  // cây bụi tròn trong chậu màu kem
  const pot = mat(0xfff1e0), potBand = mat(t.wainscot), leaf = mat(0x86c98a), leaf2 = mat(0x6fb57a);
  [[-6, -4.3], [6.2, -4.3], [-4.2, 2.9], [4.2, 2.9]].forEach(([x, z]) => {
    cyl(0.27, 0.2, 0.42, pot, x, 0.21, z, g, 20);
    cyl(0.275, 0.26, 0.08, potBand, x, 0.34, z, g, 20);
    sph(0.36, leaf, x, 0.72, z, g, 20, 14);
    sph(0.24, leaf2, x + 0.2, 0.95, z + 0.05, g, 18, 12);
    sph(0.2, leaf, x - 0.18, 0.98, z - 0.02, g, 18, 12);
  });
  // cờ dây tam giác nhiều màu võng trên tường
  const flag = new THREE.Shape();
  flag.moveTo(-0.16, 0); flag.lineTo(0.16, 0); flag.lineTo(0, -0.3); flag.closePath();
  const flagGeo = new THREE.ShapeGeometry(flag);
  const flagMats = t.flags.map(c => mat(c, { side: THREE.DoubleSide }));
  const rope = mat(0x8a5a3b);
  [[-5.4, -0.4], [-0.2, 5.0]].forEach(([x0, x1]) => {
    const n = 11, pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + (x1 - x0) * k; pts.push(new THREE.Vector3(x, 3.55 - Math.sin(k * Math.PI) * 0.45, -4.86)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 5), rope, 0, 0, 0, g).castShadow = false;
    for (let i = 1; i < n; i++) {
      const f = mesh(flagGeo, flagMats[i % flagMats.length], pts[i].x, pts[i].y, -4.84, g);
      f.castShadow = false;
    }
  });
  return g;
}

/* ================= quầy trước (đưa ly) và quầy sau (trạm pha) ================= */
function buildCounters(scene) {
  const wood = mat(0xd9a574), top = mat(0xfff8ef, { roughness: 0.4 }), accent = mat(0xf4b6a6);
  const fz = LAYOUT.frontZ, bz = LAYOUT.backZ;
  box(5.9, 0.92, 0.9, wood, 0, 0.46, fz, scene);
  box(6.1, 0.06, 1.0, top, 0, TOP_FRONT, fz, scene);
  // mặt quầy đưa ly quay về phía khách (và máy quay): sọc hồng, viền vỏ sò
  for (let x = -2.6; x <= 2.6; x += 0.52) box(0.22, 0.62, 0.03, accent, x, 0.42, fz + 0.46, scene);
  const scallopF = new THREE.CircleGeometry(0.15, 16, Math.PI, Math.PI);
  for (let i = 0; i < 20; i++) mesh(scallopF, mat(i % 2 ? 0xfff1e0 : 0xff9fb2), -2.85 + i * 0.3, 0.88, fz + 0.463, scene).castShadow = false;
  box(5.9, 0.9, 1.1, wood, 0, 0.45, bz, scene);
  box(6.1, 0.06, 1.2, top, 0, TOP_BACK - 0.02, bz, scene);
  // viền vỏ sò hồng kem trên mặt quầy sau quay về phía máy quay
  const scallop = new THREE.CircleGeometry(0.15, 16, Math.PI, Math.PI), pink = mat(0xff9fb2), cream = mat(0xfff1e0);
  for (let i = 0; i < 20; i++) {
    const sc = mesh(scallop, i % 2 ? cream : pink, -2.85 + i * 0.3, 0.88, bz + 0.553, scene);
    sc.castShadow = false;
  }
  box(5.9, 0.05, 0.02, mat(0xff9fb2), 0, 0.89, bz + 0.555, scene).castShadow = false;
  const reg = new THREE.Group();
  reg.position.set(2.65, TOP_FRONT + 0.03, fz + 0.05);
  reg.rotation.y = Math.PI;
  P.buildRegister(reg);
  scene.add(reg);
  const stack = new THREE.Group();
  stack.position.set(-2.75, TOP_FRONT + 0.03, fz + 0.1);
  P.buildGlassStack(stack, 0.34);
  scene.add(stack);
}

// Thùng các-tông dán băng keo màu món: chỗ của trạm chưa mở.
function buildCrate(color) {
  const g = new THREE.Group(), card = mat(0xc9955f), tape = mat(new THREE.Color(color).getHex());
  box(0.7, 0.5, 0.56, card, 0, 0.28, 0, g);
  box(0.72, 0.04, 0.12, tape, 0, 0.53, 0, g);
  box(0.12, 0.5, 0.58, tape, 0, 0.28, 0, g);
  box(0.36, 0.2, 0.01, mat(0xfff3dc), 0.15, 0.3, 0.285, g);
  g.visible = false;
  return g;
}
