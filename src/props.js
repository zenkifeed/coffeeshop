// Đồ vật trên quầy: ly, máy pha, chai lọ. Dáng tròn dựng bằng LatheGeometry (xoay một đường viền
// quanh trục đứng), khối vuông thì bo góc, ống cong thì dùng TubeGeometry. Khác với phòng low-poly,
// đồ vật dùng bóng mịn và một bản đồ phản chiếu nhỏ để inox, thuỷ tinh, sứ trông ra chất liệu.
import * as THREE from 'three';

let ENV = null;

// Phản chiếu dựng từ một căn phòng giả: trần sáng ấm, sàn nâu, hai ô cửa sáng. Chỉ gắn cho đồ vật,
// không gắn cho cả cảnh, nên tường sàn không bị sáng lên.
export function initProps(renderer) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16), pos = geo.attributes.position, col = [];
  const top = new THREE.Color(0xfff4e2), mid = new THREE.Color(0xe2c4a0), bot = new THREE.Color(0x4a3222), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    c.copy(mid).lerp(y > 0 ? top : bot, Math.min(1, Math.abs(y) * 1.4));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(5), side: THREE.DoubleSide });
  const panel = (w, h, x, y, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lamp); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  panel(8, 3, 0, 8, 0, Math.PI / 2, 0);
  panel(3, 3, -3, 3, -8, 0, 0);
  panel(3, 3, 5, 2.5, 6, 0, Math.PI);
  const pm = new THREE.PMREMGenerator(renderer);
  ENV = pm.fromScene(s, 0.03).texture;
  pm.dispose();
}

/* ---------- chất liệu ---------- */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0, envMap: ENV, envMapIntensity: 0.55, ...o });
const steel = (color = 0xe2e6e9) => std(color, { metalness: 0.8, roughness: 0.25, envMapIntensity: 1.2 });
const ceramic = (color = 0xfbf8f2) => std(color, { roughness: 0.25, envMapIntensity: 0.7 });
const plastic = color => std(color, { roughness: 0.4 });
// Thuỷ tinh giả: gần trong suốt ở giữa, đặc và sáng dần ra mép (fresnel), nên thấy rõ dáng ly mà vẫn nhìn xuyên được.
export function glassMat(color = 0xe4f3f8, opacity = 0.05, edge = 0.6) {
  const m = std(color, { transparent: true, opacity, roughness: 0.05, depthWrite: false, envMapIntensity: 0.9 });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.2);
      diffuseColor.a = clamp(diffuseColor.a + fr * ${edge.toFixed(2)}, 0.0, 1.0);
      outgoingLight += fr * 0.3;
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'glass' + edge.toFixed(2);
  return m;
}

/* ---------- hình học ---------- */
const cache = new Map();
const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
// Đường viền [bán kính, độ cao] đi từ tâm đáy ra ngoài rồi lên trên (đi ngược chiều thì mặt khối bị lật vào trong).
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
// Hộp bo tròn cả góc lẫn cạnh, tâm ở giữa.
function rboxGeo(w, h, d, r = 0.03) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const b = r * 0.5, a = r - b, x = w / 2 - b, y = h / 2 - b, s = new THREE.Shape();
  s.moveTo(-x + a, -y);
  s.lineTo(x - a, -y); s.absarc(x - a, -y + a, a, -Math.PI / 2, 0);
  s.lineTo(x, y - a); s.absarc(x - a, y - a, a, 0, Math.PI / 2);
  s.lineTo(-x + a, y); s.absarc(-x + a, y - a, a, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + a); s.absarc(-x + a, -y + a, a, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 4 });
  g.center();
  return g;
}
const tubeGeo = (pts, r, seg = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 8, false);

function add(geo, m, x = 0, y = 0, z = 0, parent, shadow = true) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = shadow;
  me.receiveShadow = true;
  if (parent) parent.add(me);
  return me;
}
const rbox = (w, h, d, r, m, x, y, z, p) => add(memo(`rb${w},${h},${d},${r}`, () => rboxGeo(w, h, d, r)), m, x, y, z, p);
const cyl = (rt, rb, h, m, x, y, z, p, seg = 24, open = false) => add(memo(`cy${rt},${rb},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)), m, x, y, z, p);
// Xoay khối cho trục đứng của nó chỉ theo hướng dir.
const aim = (o, dir) => { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()); return o; };

/* ================= ly thuỷ tinh ================= */
// Ly cà phê kiểu quán Việt: thành hơi loe, đáy dày, vành bo tròn.
const G = { rb: 0.118, rt: 0.158, wall: 0.011, base: 0.03 };
const outerR = (H, y) => G.rb + (G.rt - G.rb) * y / H;
export function glassGeo(H) {
  return memo('glass' + H, () => lathe([
    [0, 0], [G.rb - 0.014, 0], [G.rb - 0.003, 0.004], [G.rb, 0.014],
    [outerR(H, H - 0.008), H - 0.008], [outerR(H, H) - 0.002, H - 0.001], [outerR(H, H) - G.wall * 0.5, H],
    [outerR(H, H) - G.wall, H - 0.005], [outerR(H, G.base + 0.01) - G.wall, G.base + 0.01],
    [outerR(H, G.base) - G.wall - 0.012, G.base], [0, G.base],
  ], 36));
}
export const iceGeo = () => memo('ice', () => rboxGeo(0.075, 0.075, 0.075, 0.022));

// Chồng ly úp lồng vào nhau trên khay gỗ tròn.
export function buildGlassStack(g, H) {
  add(lathe([[0, 0], [0.19, 0], [0.2, 0.008], [0.2, 0.018], [0.19, 0.022], [0, 0.022]], 32), std(0xa0714b, { roughness: 0.6 }), 0, 0, 0, g);
  const m = glassMat(0xcfe8f0, 0.1, 0.75);
  for (let i = 0; i < 4; i++) {
    const me = add(glassGeo(H), m, 0, 0.022 + i * 0.06, 0, g, false);
    me.renderOrder = 2 + i;
  }
}

/* ================= ly mang đi (giao cho khách) ================= */
const TK = { h: 0.26, rb: 0.07, rt: 0.1 };
const tkR = y => TK.rb + (TK.rt - TK.rb) * y / TK.h;
let tkParts = null;
export function buildTakeaway(fillMat) {
  if (!tkParts) {
    tkParts = {
      body: lathe([[0, 0], [TK.rb - 0.008, 0], [TK.rb, 0.008], [TK.rt, TK.h], [TK.rt - 0.004, TK.h], [TK.rb - 0.004, 0.008], [0, 0.006]], 28),
      fill: lathe([[0, 0.01], [TK.rb - 0.006, 0.01], [tkR(0.2) - 0.006, 0.2], [0, 0.2]], 28),
      sleeve: new THREE.CylinderGeometry(tkR(0.17) + 0.004, tkR(0.07) + 0.004, 0.1, 28, 1, true),
      lid: lathe([[TK.rt - 0.002, TK.h - 0.012], [TK.rt + 0.006, TK.h - 0.012], [TK.rt + 0.008, TK.h], [TK.rt + 0.004, TK.h + 0.008], [0.07, TK.h + 0.016], [0.06, TK.h + 0.022], [0, TK.h + 0.022]], 28),
      straw: tubeGeo([[0.02, 0.06, 0], [0.025, 0.2, 0], [0.03, TK.h + 0.02, 0], [0.04, TK.h + 0.1, 0.005]], 0.011, 8),
      mats: { body: glassMat(0xf4fbff, 0.12, 0.55), sleeve: std(0xc89a6a, { roughness: 0.8 }), lid: plastic(0xf6f3ee), straw: plastic(0xe25b4a) },
    };
    tkParts.sleeve.translate(0, 0.12, 0);
  }
  const P = tkParts, g = new THREE.Group();
  add(P.fill, fillMat, 0, 0, 0, g);
  add(P.sleeve, P.mats.sleeve, 0, 0, 0, g);
  add(P.lid, P.mats.lid, 0, 0, 0, g);
  add(P.straw, P.mats.straw, 0, 0, 0, g);
  add(P.body, P.mats.body, 0, 0, 0, g, false).renderOrder = 2;
  return g;
}

/* ================= máy pha espresso ================= */
// Toạ độ trong nhóm của trạm: đáy máy ở y = 0, ly đứng ở z = 0.34, vòi rót ở (0, 0.46, 0.34).
export function buildEspresso(g) {
  const red = std(0xd9483b, { roughness: 0.32, envMapIntensity: 0.8 }), st = steel(), dk = std(0x2a2624, { roughness: 0.35 });
  const dkSteel = steel(0x9aa1a6), cream = ceramic(0xfff6e6);
  rbox(1.32, 0.11, 0.52, 0.035, st, 0, 0.055, -0.09, g);
  rbox(1.26, 0.64, 0.5, 0.07, red, 0, 0.43, -0.09, g);
  rbox(1.34, 0.05, 0.56, 0.02, st, 0, 0.765, -0.09, g);
  rbox(1.2, 0.03, 0.02, 0.01, st, 0, 0.7, 0.165, g);
  // lan can để ly trên nóc máy
  const rail = new THREE.Group();
  rail.position.y = 0.83;
  g.add(rail);
  [[-0.62, -0.34], [0.62, -0.34], [0.62, 0.15], [-0.62, 0.15]].forEach(([x, z], i, a) => {
    cyl(0.01, 0.01, 0.07, st, x, -0.03, z, rail, 8);
    const [nx, nz] = a[(i + 1) % 4], len = Math.hypot(nx - x, nz - z);
    aim(cyl(0.011, 0.011, len, st, (x + nx) / 2, 0, (z + nz) / 2, rail, 8), [nx - x, 0, nz - z]);
  });
  [-0.36, 0.36].forEach(x => buildDemitasse(g, x, 0.79, -0.1, st));
  // cụm pha: cổ nối, đầu pha, tay cầm
  aim(cyl(0.085, 0.095, 0.16, st, 0, 0.6, 0.23, g), [0, 0, 1]);
  cyl(0.1, 0.108, 0.07, st, 0, 0.555, 0.34, g, 28);
  cyl(0.094, 0.082, 0.048, dkSteel, 0, 0.497, 0.34, g, 28);
  [-0.025, 0.025].forEach(x => cyl(0.009, 0.012, 0.022, dkSteel, x, 0.466, 0.34, g, 8));
  aim(cyl(0.018, 0.022, 0.1, dkSteel, 0.1, 0.5, 0.37, g, 10), [1, 0.1, 0.45]);
  const h = add(memo('pfHandle', () => new THREE.CapsuleGeometry(0.026, 0.19, 4, 12)), dk, 0.24, 0.515, 0.435, g);
  aim(h, [1, 0.15, 0.45]);
  // đồng hồ áp suất
  const gauge = new THREE.Group();
  gauge.position.set(-0.4, 0.5, 0.165);
  g.add(gauge);
  add(memo('bezel', () => new THREE.TorusGeometry(0.078, 0.014, 10, 32)), st, 0, 0, 0.012, gauge);
  aim(cyl(0.078, 0.078, 0.012, cream, 0, 0, 0.008, gauge, 32), [0, 0, 1]);
  const arc = add(memo('gaugeArc', () => new THREE.RingGeometry(0.052, 0.064, 20, 1, -0.3, 0.9)), std(0x4fa883), 0, 0, 0.0145, gauge, false);
  arc.rotation.z = 0.25;
  // gốc kim ở tâm mặt đồng hồ để xoay quanh đó
  add(memo('needle', () => rboxGeo(0.008, 0.06, 0.004, 0.002).translate(0, 0.022, 0)), std(0xc0392b), 0, 0, 0.017, gauge).rotation.z = -0.7;
  cyl(0.012, 0.012, 0.006, dk, 0, 0, 0.018, gauge, 12).rotation.x = Math.PI / 2;
  // đèn và núm
  [[0.32, 0x7de08b], [0.45, 0xffb347]].forEach(([x, c]) => {
    aim(cyl(0.032, 0.032, 0.02, st, x, 0.5, 0.17, g, 20), [0, 0, 1]);
    add(memo('lamp', () => new THREE.SphereGeometry(0.022, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), std(c, { emissive: c, emissiveIntensity: 0.6, roughness: 0.2 }), x, 0.5, 0.178, g).rotation.x = Math.PI / 2;
  });
  // vòi đánh sữa bên phải
  aim(cyl(0.035, 0.035, 0.05, dk, 0.56, 0.62, 0.18, g, 16), [0, 0, 1]);
  add(memo('wand', () => tubeGeo([[0.56, 0.6, 0.18], [0.58, 0.57, 0.25], [0.6, 0.45, 0.28], [0.6, 0.26, 0.28]], 0.011)), st, 0, 0, 0, g);
  cyl(0.016, 0.012, 0.03, st, 0.6, 0.245, 0.28, g, 10);
  // khay hứng có thanh lưới
  rbox(0.66, 0.026, 0.36, 0.012, st, 0, 0.004, 0.35, g);
  rbox(0.6, 0.006, 0.3, 0.003, dk, 0, 0.016, 0.35, g);
  for (let i = 0; i < 7; i++) rbox(0.58, 0.008, 0.016, 0.004, st, 0, 0.02, 0.23 + i * 0.04, g);
}

// Ly espresso nhỏ có đĩa lót, đặt trên nóc máy.
function buildDemitasse(g, x, y, z, st) {
  const m = ceramic();
  add(memo('saucer', () => lathe([[0, 0], [0.05, 0], [0.075, 0.012], [0.08, 0.018], [0.074, 0.018], [0.05, 0.01], [0, 0.01]], 28)), m, x, y, z, g);
  add(memo('demi', () => lathe([[0, 0.01], [0.03, 0.01], [0.034, 0.014], [0.047, 0.05], [0.048, 0.066], [0.044, 0.066], [0.042, 0.05], [0.03, 0.02], [0, 0.02]], 28)), m, x, y, z, g);
  const hd = add(memo('demiH', () => new THREE.TorusGeometry(0.016, 0.005, 8, 14, Math.PI * 1.2)), m, x + 0.05, y + 0.042, z, g);
  hd.rotation.z = -Math.PI * 0.6;
}

/* ================= quầy sau: nguyên liệu ================= */
export function buildCan(g) {
  const tin = steel(0xe6e8ea), label = std(0x3b6fb6, { roughness: 0.4 }), stripe = std(0xfff1d0, { roughness: 0.4 });
  add(memo('can', () => lathe([[0, 0], [0.11, 0], [0.118, 0.006], [0.114, 0.014], [0.12, 0.02], [0.12, 0.2], [0.114, 0.206], [0.118, 0.214], [0.11, 0.22], [0.102, 0.222], [0.1, 0.216], [0, 0.216]], 32)), tin, 0, 0, 0, g);
  cyl(0.1215, 0.1215, 0.16, label, 0, 0.11, 0, g, 32, true);
  cyl(0.1222, 0.1222, 0.04, stripe, 0, 0.115, 0, g, 32, true);
  const drop = add(memo('dropIcon', () => new THREE.SphereGeometry(0.02, 12, 10)), stripe, 0, 0.165, 0.118, g);
  drop.scale.set(1, 1.3, 0.3);
  const tab = add(memo('tab', () => new THREE.TorusGeometry(0.026, 0.006, 8, 18)), steel(0xc9cdd1), 0.04, 0.222, 0, g);
  tab.rotation.x = Math.PI / 2;
}

export function buildCarton(g) {
  const white = std(0xfdfcf8, { roughness: 0.55 }), blue = std(0x4f9fe0, { roughness: 0.5 });
  rbox(0.22, 0.3, 0.22, 0.016, white, 0, 0.15, 0, g);
  rbox(0.226, 0.1, 0.226, 0.016, blue, 0, 0.17, 0, g);
  const roof = add(memo('roof', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.11, 0); s.lineTo(0.11, 0); s.lineTo(0.008, 0.095); s.lineTo(-0.008, 0.095); s.closePath();
    const ge = new THREE.ExtrudeGeometry(s, { depth: 0.216, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
    return ge.translate(0, 0, -0.108);
  }), white, 0, 0.296, 0, g);
  roof.castShadow = true;
  rbox(0.022, 0.05, 0.22, 0.008, white, 0, 0.405, 0, g);
  const cap = cyl(0.032, 0.032, 0.03, blue, 0.055, 0.35, 0.04, g, 20);
  cap.rotation.z = -Math.atan2(0.095, 0.1);
  add(memo('wave', () => tubeGeo([[-0.113, 0.13, 0.08], [-0.113, 0.11, 0.02], [-0.113, 0.13, -0.04], [-0.113, 0.11, -0.09]], 0.008, 16)), white, 0, 0, 0, g);
}

export function buildPitcher(g) {
  const st = steel(), foam = ceramic(0xfff8ec);
  add(memo('pitcher', () => lathe([
    [0, 0], [0.098, 0], [0.11, 0.008], [0.116, 0.04], [0.112, 0.13], [0.1, 0.21], [0.102, 0.25], [0.108, 0.268],
    [0.104, 0.27], [0.096, 0.25], [0.094, 0.21], [0.104, 0.13], [0.106, 0.04], [0.09, 0.012], [0, 0.012],
  ], 32)), st, 0, 0, 0, g);
  add(memo('foam', () => new THREE.CircleGeometry(0.094, 28).rotateX(-Math.PI / 2)), foam, 0, 0.215, 0, g, false);
  const lip = add(memo('lip', () => new THREE.ConeGeometry(0.045, 0.08, 16, 1, true, -Math.PI / 2, Math.PI)), st, -0.1, 0.26, 0, g);
  lip.material = st.clone();
  lip.material.side = THREE.DoubleSide;
  lip.rotation.z = Math.PI / 2 - 0.35;
  add(memo('pHandle', () => tubeGeo([[0.1, 0.23, 0], [0.17, 0.22, 0], [0.18, 0.12, 0], [0.11, 0.06, 0]], 0.016, 20)), st, 0, 0, 0, g);
  // nhiệt kế kẹp miệng ca
  const th = new THREE.Group();
  th.position.set(0.02, 0, 0.05);
  th.rotation.z = -0.12;
  g.add(th);
  cyl(0.006, 0.006, 0.3, st, 0, 0.2, 0, th, 8);
  aim(cyl(0.036, 0.036, 0.016, st, 0, 0.36, 0, th, 24), [0, 0, 1]);
  aim(cyl(0.03, 0.03, 0.018, ceramic(), 0, 0.36, 0, th, 24), [0, 0, 1]);
  const nd = rbox(0.005, 0.024, 0.004, 0.002, std(0xc0392b), 0.004, 0.368, 0.011, th);
  nd.rotation.z = -0.5;
}

export function buildKettle(g) {
  const body = std(0x8cc7d2, { roughness: 0.3, envMapIntensity: 0.8 }), dk = std(0x2d2a28, { roughness: 0.35 }), st = steel();
  add(memo('kettle', () => lathe([[0, 0], [0.135, 0], [0.15, 0.012], [0.158, 0.06], [0.15, 0.13], [0.12, 0.185], [0.085, 0.21], [0.08, 0.215], [0, 0.215]], 32)), body, 0, 0, 0, g);
  cyl(0.137, 0.137, 0.012, st, 0, 0.006, 0, g, 32);
  add(memo('kLid', () => lathe([[0, 0.215], [0.082, 0.215], [0.07, 0.228], [0.02, 0.248], [0, 0.25]], 28)), st, 0, 0, 0, g);
  cyl(0.012, 0.012, 0.03, dk, 0, 0.262, 0, g, 10);
  add(memo('knob', () => new THREE.SphereGeometry(0.026, 16, 10)), dk, 0, 0.285, 0, g);
  add(memo('spout', () => tubeGeo([[0.13, 0.04, 0], [0.19, 0.06, 0], [0.22, 0.15, 0], [0.25, 0.25, 0], [0.31, 0.29, 0], [0.34, 0.28, 0]], 0.014, 28)), st, 0, 0, 0, g);
  add(memo('kHandle', () => tubeGeo([[-0.1, 0.19, 0], [-0.19, 0.2, 0], [-0.22, 0.12, 0], [-0.15, 0.05, 0]], 0.022, 20)), dk, 0, 0, 0, g);
}

export function buildIceBin(g) {
  const st = steel(), inner = steel(0x8e969c);
  rbox(0.55, 0.18, 0.42, 0.04, st, 0, 0.09, 0, g);
  rbox(0.49, 0.01, 0.36, 0.02, inner, 0, 0.176, 0, g);
  const ice = std(0xe6f7ff, { transparent: true, opacity: 0.82, roughness: 0.08, envMapIntensity: 1.4 });
  [[-0.17, -0.1], [-0.05, -0.08], [0.07, -0.11], [0.18, -0.06], [-0.15, 0.03], [-0.02, 0.04], [0.11, 0.02], [-0.1, 0.12], [0.03, 0.13], [0.17, 0.1]].forEach(([x, z], i) => {
    const c = add(iceGeo(), ice, x, 0.2 + (i % 3) * 0.018, z, g);
    c.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    c.renderOrder = 1;
  });
  // xẻng xúc đá nằm nghiêng trên đống đá: lòng xẻng hở miệng, tay cầm đen
  const scoop = new THREE.Group();
  scoop.position.set(0.11, 0.26, 0.07);
  scoop.rotation.set(0.25, -0.6, 0);
  g.add(scoop);
  const cup = add(memo('scoop', () => lathe([[0, 0], [0.04, 0], [0.048, 0.012], [0.05, 0.1], [0.045, 0.1], [0.043, 0.014], [0.036, 0.006], [0, 0.006]], 24)), st, 0, 0, 0, scoop);
  cup.rotation.z = Math.PI / 2;
  cyl(0.012, 0.012, 0.03, st, 0.015, 0, 0, scoop, 10).rotation.z = Math.PI / 2;
  const hd = add(memo('scoopH', () => new THREE.CapsuleGeometry(0.015, 0.08, 4, 10)), std(0x2d2a28, { roughness: 0.35 }), 0.075, 0, 0, scoop);
  hd.rotation.z = Math.PI / 2;
}

export function buildSyrup(g) {
  const amber = std(0xc07a28, { transparent: true, opacity: 0.93, roughness: 0.12, envMapIntensity: 1.1 }), label = std(0xfff4dc, { roughness: 0.6 }), dk = std(0x2d2a28, { roughness: 0.35 });
  add(memo('bottle', () => lathe([[0, 0], [0.068, 0], [0.078, 0.008], [0.08, 0.02], [0.08, 0.19], [0.075, 0.225], [0.042, 0.255], [0.032, 0.265], [0.032, 0.29], [0, 0.29]], 28)), amber, 0, 0, 0, g);
  cyl(0.0815, 0.0815, 0.1, label, 0, 0.115, 0, g, 28, true);
  cyl(0.0822, 0.0822, 0.018, std(0xc9812c), 0, 0.115, 0, g, 28, true);
  cyl(0.038, 0.036, 0.035, dk, 0, 0.3, 0, g, 20);
  cyl(0.01, 0.01, 0.06, std(0xdedede), 0, 0.345, 0, g, 10);
  rbox(0.06, 0.032, 0.042, 0.012, dk, 0.008, 0.388, 0, g);
  aim(cyl(0.008, 0.008, 0.07, dk, 0.065, 0.392, 0, g, 10), [1, -0.1, 0]);
}

export function buildCreamBowl(g) {
  const bowl = ceramic(0x9cc8e2), rim = ceramic(), cream = std(0xfffaf0, { roughness: 0.6, envMapIntensity: 0.35 });
  add(memo('bowl', () => lathe([[0, 0], [0.085, 0], [0.095, 0.01], [0.15, 0.09], [0.172, 0.118], [0.176, 0.126], [0.168, 0.128], [0.145, 0.1], [0.09, 0.03], [0, 0.03]], 32)), bowl, 0, 0, 0, g);
  cyl(0.1775, 0.172, 0.012, rim, 0, 0.121, 0, g, 32, true);
  add(memo('creamBed', () => lathe([[0, 0.08], [0.15, 0.1], [0.158, 0.118], [0.13, 0.13], [0, 0.13]], 32)), cream, 0, 0, 0, g);
  // kem xoáy: ba vòng nhỏ dần chồng lên nhau, trên cùng là chóp nhọn
  [[0.1, 0.035, 0.145], [0.068, 0.03, 0.19], [0.036, 0.024, 0.228]].forEach(([r, t, y], i) => {
    const ring = add(memo('swirl' + i, () => new THREE.TorusGeometry(r, t, 12, 28)), cream, 0, y, 0, g);
    ring.rotation.x = Math.PI / 2;
  });
  add(memo('tip', () => lathe([[0, 0.23], [0.03, 0.235], [0.012, 0.265], [0, 0.285]], 20)), cream, 0, 0, 0, g);
  // thìa inox cắm nghiêng
  const sp = new THREE.Group();
  sp.position.set(0.1, 0.17, 0.06);
  sp.rotation.set(0.35, 0, -0.7);
  g.add(sp);
  const st = steel();
  cyl(0.008, 0.008, 0.2, st, 0, 0.08, 0, sp, 8);
  const head = add(memo('spoonHead', () => new THREE.SphereGeometry(0.03, 16, 10)), st, 0, -0.03, 0, sp);
  head.scale.set(0.8, 1.2, 0.35);
}

export function buildRegister(g) {
  const slate = std(0x5b7c99, { roughness: 0.4 }), dk = std(0x2d2a28, { roughness: 0.3 });
  rbox(0.5, 0.16, 0.4, 0.04, slate, 0, 0.08, 0, g);
  rbox(0.44, 0.012, 0.01, 0.004, dk, 0, 0.07, 0.2, g);
  rbox(0.08, 0.02, 0.02, 0.008, std(0xd9dde0, { metalness: 0.6, roughness: 0.3 }), 0, 0.045, 0.205, g);
  aim(cyl(0.025, 0.035, 0.12, dk, 0, 0.2, -0.08, g, 12), [0, 1, 0.3]);
  const scr = new THREE.Group();
  scr.position.set(0, 0.33, -0.09);
  scr.rotation.x = -0.3;
  g.add(scr);
  rbox(0.38, 0.24, 0.035, 0.02, dk, 0, 0, 0, scr);
  add(memo('screen', () => new THREE.PlaneGeometry(0.33, 0.19)), std(0x2f6b6a, { emissive: 0x3fa7a0, emissiveIntensity: 0.55, roughness: 0.15 }), 0, 0, 0.019, scr, false);
}
