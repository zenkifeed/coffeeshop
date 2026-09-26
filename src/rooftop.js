// Cảnh sân thượng cho chi nhánh Rooftop Sài Gòn: sàn gỗ, lan can kính, nhà cao tầng lên đèn phía xa,
// trời hoàng hôn, giàn gỗ treo biển tên quán, dây đèn lấp lánh, cây cọ, gối lười.
// Chỉ dựng đồ trang trí; quầy, trạm pha và biển tên quán vẫn do scene.js dựng như mọi chi nhánh.
// group.userData.tick(dt, t) được scene.js gọi mỗi khung hình để dây đèn nhấp nháy.
import * as THREE from 'three';

const mats = new Map();
const mat = (c, o) => {
  const k = c + (o ? JSON.stringify(o) : '');
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));
  return mats.get(k);
};
function mesh(geo, m, x, y, z, p, shadow = true) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = shadow;
  me.receiveShadow = true;
  p.add(me);
  return me;
}
const box = (w, h, d, c, x, y, z, p, shadow) => mesh(new THREE.BoxGeometry(w, h, d), mat(c), x, y, z, p, shadow);
const cyl = (rt, rb, h, c, x, y, z, p, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c), x, y, z, p);
const sph = (r, c, x, y, z, p) => mesh(new THREE.SphereGeometry(r, 18, 12), mat(c), x, y, z, p);

// Nền trời hoàng hôn: tấm lớn phía sau thành phố, tô chuyển màu cam → hồng → tím bằng canvas.
function skyPlane() {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 256;
  const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#6f6aa8'); gr.addColorStop(0.45, '#e58fa8'); gr.addColorStop(0.75, '#f7b98c'); gr.addColorStop(1, '#ffe0a8');
  c.fillStyle = gr;
  c.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  m.position.set(0, 4, -34);
  return m;
}

export function buildRooftop(t) {
  const g = new THREE.Group(), lights = [];
  const RAIL = -4.9;

  /* ---------- sàn gỗ và lan can kính ---------- */
  const deck = mesh(new THREE.PlaneGeometry(30, 14), mat(t.floor), 0, 0, 1, g, false);
  deck.rotation.x = -Math.PI / 2;
  for (let z = RAIL; z <= 8; z += 0.45) box(30, 0.004, 0.025, t.plank, 0, 0.002, z, g, false);
  box(30, 0.3, 0.4, 0xd9cfc4, 0, 0.15, RAIL - 0.1, g);                     // gờ tường sân thượng
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false });
  for (let x = -14; x < 14; x += 1.6) {
    mesh(new THREE.BoxGeometry(1.5, 1.0, 0.04), glass, x + 0.8, 0.8, RAIL, g, false);
    cyl(0.03, 0.03, 1.05, 0x9aa1a6, x, 0.8, RAIL, g, 8);
  }
  box(30, 0.06, 0.1, 0x9aa1a6, 0, 1.32, RAIL, g);

  /* ---------- thành phố phía xa: nhà cao tầng có cửa sổ lên đèn ---------- */
  g.add(skyPlane());
  const tones = [0x8f86b5, 0xa994c4, 0x7f95c2, 0xc39bb8, 0x9aa6cf];
  const winOn = new THREE.MeshBasicMaterial({ color: 0xffe29a }), winOff = new THREE.MeshBasicMaterial({ color: 0x6b6690 });
  const win = new THREE.PlaneGeometry(0.34, 0.42);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const w = 2 + rand() * 2.4, h = 6 + rand() * 14, x = -24 + i * 1.9 + rand(), z = -12 - rand() * 12;
    const b = box(w, h, 2, tones[i % tones.length], x, h / 2 - 9, z, g, false);
    b.receiveShadow = false;
    for (let yy = -8; yy < h - 9.6; yy += 1.1) for (let xx = -w / 2 + 0.4; xx < w / 2 - 0.3; xx += 0.7) {
      const m = new THREE.Mesh(win, rand() < 0.45 ? winOn : winOff);
      m.position.set(x + xx, yy + 0.4, z + 1.01);
      g.add(m);
    }
  }
  // toà tháp cao nhất có chóp, làm điểm nhấn của thành phố
  const tower = box(3, 26, 3, 0x6f7fb0, 7, 4, -22, g, false);
  tower.receiveShadow = false;
  cyl(0.05, 0.4, 5, 0xd9dde0, 7, 19.5, -22, g, 8);
  const beacon = sph(0.25, 0xff6b6b, 7, 22.2, -22, g);
  beacon.material = new THREE.MeshBasicMaterial({ color: 0xff6b6b });

  /* ---------- giàn gỗ treo biển tên quán ---------- */
  const wood = 0x8a6446;
  [-1.6, 2.0].forEach(x => box(0.16, 3.4, 0.16, wood, x, 1.7, RAIL + 0.08, g));
  box(4.0, 0.16, 0.2, wood, 0.2, 3.35, RAIL + 0.08, g);

  /* ---------- dây đèn lấp lánh: võng từ giàn ra hai cột bên ---------- */
  [[-6.8, 0.3], [7.2, 0.3]].forEach(([px, pz]) => { cyl(0.05, 0.06, 3.4, 0x4a4f55, px, 1.7, pz, g, 8); });
  const bulb = new THREE.SphereGeometry(0.07, 10, 8);
  [[[-1.6, 3.2, RAIL + 0.1], [-6.8, 3.3, 0.3]], [[2.0, 3.2, RAIL + 0.1], [7.2, 3.3, 0.3]], [[-6.8, 3.3, 0.3], [-3.2, 3.0, 2.8]], [[7.2, 3.3, 0.3], [3.6, 3.0, 2.8]]].forEach(([a, b]) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), mid = A.clone().add(B).multiplyScalar(0.5);
    mid.y -= 0.6;
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
    mesh(new THREE.TubeGeometry(curve, 24, 0.012, 5), mat(0x3a2317), 0, 0, 0, g, false);
    for (let k = 1; k < 12; k++) {
      const p = curve.getPoint(k / 12);
      const m = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: 0xffe29a }));
      m.position.copy(p).y -= 0.08;
      g.add(m);
      lights.push({ m, ph: k * 1.7 + a[0] });
    }
  });

  /* ---------- cây cọ trong chậu, gối lười, bàn thấp ---------- */
  const palm = (x, z) => {
    cyl(0.32, 0.24, 0.5, 0xfff1e0, x, 0.25, z, g, 18);
    cyl(0.07, 0.1, 1.9, 0x9a7650, x, 1.4, z, g, 8);
    for (let i = 0; i < 6; i++) {
      const leaf = sph(0.34, i % 2 ? 0x6fb57a : 0x86c98a, x, 2.4, z, g);
      const a = i / 6 * Math.PI * 2;
      leaf.scale.set(1.6, 0.18, 0.5);
      leaf.position.set(x + Math.cos(a) * 0.42, 2.3, z + Math.sin(a) * 0.42);
      leaf.rotation.set(0, -a, -0.35);
    }
  };
  palm(-5.6, -3.8);
  palm(5.9, -3.9);
  palm(-4.6, 3.2);
  palm(4.8, 3.0);
  const lounge = (x, z, c) => { const b = sph(0.42, c, x, 0.28, z, g); b.scale.set(1.2, 0.6, 1.1); };
  lounge(-5.0, -1.6, t.chair); lounge(-5.6, -0.3, 0xa0c4ff); lounge(5.3, -1.8, 0xff8fa3); lounge(5.8, -0.5, t.chair);
  [[-4.3, -0.9], [4.6, -1.1]].forEach(([x, z]) => { cyl(0.35, 0.35, 0.05, 0xfff8ef, x, 0.42, z, g, 20); cyl(0.05, 0.05, 0.4, 0x4a4f55, x, 0.2, z, g, 8); });

  g.userData.tick = (dt, tt) => {
    // dây đèn nhấp nháy lệch pha, ngọn đèn đỏ trên tháp chớp
    for (const l of lights) l.m.material.color.setHex(Math.sin(tt * 2.2 + l.ph) > 0.6 ? 0xfff6d0 : 0xffd27a);
    beacon.visible = Math.sin(tt * 3) > -0.3;
  };
  return g;
}
