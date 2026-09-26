// Cảnh đường phố cho chi nhánh vỉa hè: vỉa hè lát gạch, lòng đường có vạch qua đường, mặt tiền nhà ống
// có cửa cuốn và mái hiên sọc, nhà hàng xóm, bàn ghế nhựa thấp, cột đèn, cây xanh, cột điện giăng dây, xe máy đỗ.
// Chỉ dựng đồ trang trí; quầy, trạm pha và biển tên quán vẫn do scene.js dựng như mọi chi nhánh.
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
const flat = (w, d, c, x, y, z, p) => { const m = mesh(new THREE.PlaneGeometry(w, d), mat(c), x, y, z, p, false); m.rotation.x = -Math.PI / 2; return m; };

export function buildStreet(t) {
  const g = new THREE.Group();
  const CURB = 2.55;

  /* ---------- mặt đất: vỉa hè lát gạch, bó vỉa, lòng đường ---------- */
  flat(30, CURB + 6, t.floor, 0, 0, (CURB - 6) / 2, g);
  for (let x = -14.4; x <= 14.4; x += 0.9) box(0.03, 0.004, CURB + 6, t.plank, x, 0.002, (CURB - 6) / 2, g, false);
  for (let z = -5.4; z <= CURB; z += 0.9) box(30, 0.004, 0.03, t.plank, 0, 0.002, z, g, false);
  box(30, 0.14, 0.26, 0xdcd6cc, 0, 0.07, CURB + 0.13, g);
  flat(30, 12, 0x7d828c, 0, -0.01, CURB + 6.25, g);
  for (let x = -14; x <= 14; x += 2.2) box(1.2, 0.01, 0.12, 0xffffff, x, 0.0, CURB + 4.2, g, false);   // vạch giữa đường
  for (let z = CURB + 0.6; z <= CURB + 5; z += 0.7) box(1.9, 0.01, 0.38, 0xf8f8f2, 3.9, 0.0, z, g, false);   // vạch qua đường

  /* ---------- mặt tiền: quán ở giữa, hai nhà hàng xóm ---------- */
  box(7.4, 4.4, 0.2, t.wall, 0, 2.2, -5, g);
  box(7.4, 0.25, 0.3, t.wainscot, 0, 4.3, -4.95, g);                 // gờ mái
  // cửa cuốn kéo lên, bên trong lấp ló kệ đồ
  box(6.2, 1.95, 0.05, 0x6b4a36, 0, 0.98, -4.88, g, false);
  box(6.3, 0.16, 0.12, 0xb9bcc2, 0, 2.0, -4.84, g);
  [0.55, 1.2].forEach(y => box(6, 0.05, 0.25, 0xa9785a, 0, y, -4.8, g));
  const jar = [0xffb3c1, 0x8fd3c1, 0xffd166, 0xa0c4ff, 0xfff1e0];
  for (let i = 0; i < 14; i++) cyl(0.07, 0.07, 0.18, jar[i % 5], -2.7 + i * 0.42, i % 2 ? 0.67 : 1.32, -4.78, g, 10);
  // mái hiên sọc nghiêng, viền lượn
  const aw = new THREE.Group();
  aw.position.set(0, 2.05, -4.85);
  aw.rotation.x = 0.55;
  g.add(aw);
  for (let i = 0; i < 16; i++) box(0.45, 0.03, 0.9, i % 2 ? 0xfff6ea : t.wainscot, -3.375 + i * 0.45, 0, 0.45, aw);
  const scal = new THREE.CircleGeometry(0.225, 14, Math.PI, Math.PI);
  for (let i = 0; i < 16; i++) { const s = mesh(scal, mat(i % 2 ? 0xfff6ea : t.wainscot, { side: THREE.DoubleSide }), -3.375 + i * 0.45, 0, 0.9, aw, false); s.rotation.x = -0.55; }
  // nhà hàng xóm: cao thấp khác nhau, cửa sổ có bồn hoa, cửa cuốn đóng
  [[-8.3, 9.2, 5.2, 0xa9d6e5], [8.3, 9.2, 4.6, 0xffe19c]].forEach(([x, w, h, c]) => {
    box(w, h, 0.2, c, x, h / 2, -5.05, g);
    box(w, 0.22, 0.3, 0xfff6ea, x, h - 0.1, -5.0, g);
    box(4.4, 1.9, 0.05, 0xc9ccd2, x + Math.sign(x) * 0.6, 0.95, -4.93, g);
    for (let k = 0; k < 9; k++) box(4.4, 0.02, 0.06, 0xaeb2b9, x + Math.sign(x) * 0.6, 0.15 + k * 0.2, -4.9, g, false);
    [-1.2, 1.4].forEach(dx => {
      box(0.9, 0.8, 0.05, 0xbfe3f2, x + dx, 3.0, -4.93, g);
      box(1.0, 0.18, 0.25, 0xa9785a, x + dx, 2.55, -4.85, g);
      [-0.3, 0, 0.3].forEach(fx => sph(0.1, [0xff8fa3, 0xffd166, 0xff6b6b][Math.abs(Math.round(fx * 10)) % 3], x + dx + fx, 2.7, -4.82, g));
    });
  });
  // hai chậu cây nhỏ hai bên cửa quán
  [-3.9, 3.9].forEach(x => { cyl(0.2, 0.15, 0.32, 0xfff1e0, x, 0.16, -4.55, g); sph(0.26, 0x86c98a, x, 0.52, -4.55, g); });

  /* ---------- bàn thấp, ghế nhựa ---------- */
  const stools = [0xff6b6b, 0x5aa9e6, 0xff8fa3, 0x8fd3c1];
  const sit = (x, z, n) => {
    box(0.62, 0.04, 0.62, 0x5aa9e6, x, 0.46, z, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(0.04, 0.44, 0.04, 0x4a8fc4, x + a * 0.26, 0.22, z + b * 0.26, g));
    cyl(0.07, 0.06, 0.14, 0xfff6ea, x - 0.1, 0.55, z, g, 10);                 // ly trà đá trên bàn
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.4, sx = x + Math.cos(a) * 0.62, sz = z + Math.sin(a) * 0.62, c = stools[(i + Math.round(x)) & 3];
      cyl(0.17, 0.2, 0.05, c, sx, 0.3, sz, g, 14);
      cyl(0.13, 0.17, 0.28, c, sx, 0.14, sz, g, 14);
    }
  };
  sit(-5.0, -2.8, 3);
  sit(-5.2, -0.5, 4);
  sit(5.3, -2.6, 3);

  /* ---------- cột đèn, cây xanh, cột điện ---------- */
  const lamp = (x, z) => {
    cyl(0.12, 0.14, 0.12, 0x4a4f55, x, 0.06, z, g);
    cyl(0.05, 0.05, 3.2, 0x4a4f55, x, 1.6, z, g, 10);
    box(0.5, 0.05, 0.05, 0x4a4f55, x - 0.22 * Math.sign(x), 3.15, z, g);
    const head = sph(0.17, 0xfff3c4, x - 0.45 * Math.sign(x), 3.02, z, g);
    head.material = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd98a, emissiveIntensity: 0.6 });
  };
  lamp(-7.0, CURB - 0.25);
  lamp(7.1, CURB - 0.25);
  const tree = (x, z) => {
    box(0.8, 0.12, 0.8, 0xc9b8a4, x, 0.06, z, g);
    box(0.64, 0.13, 0.64, 0x7a5a3b, x, 0.07, z, g, false);
    cyl(0.1, 0.13, 1.8, 0x8a5c3a, x, 0.9, z, g, 10);
    sph(0.62, 0x86c98a, x, 2.1, z, g);
    sph(0.45, 0x6fb57a, x + 0.42, 2.35, z + 0.1, g);
    sph(0.42, 0x9ed39a, x - 0.4, 2.4, z - 0.05, g);
  };
  tree(-6.3, 1.1);
  tree(6.4, 0.6);
  // cột điện sát tường, dây giăng dọc mặt tiền (không vắt ngang khung hình), đúng chất phố
  const px = -6.4, pz = -4.2;
  cyl(0.1, 0.13, 5.6, 0x9a9da3, px, 2.8, pz, g, 10);
  box(1.3, 0.08, 0.08, 0x6d7076, px, 5.2, pz, g);
  box(0.35, 0.5, 0.3, 0x8a8e94, px + 0.25, 4.3, pz, g);
  [[5.1, -3.4, 4.35], [4.95, 0.5, 4.4], [5.2, 3.4, 4.3]].forEach(([y0, x1, y1]) => {
    const pts = [new THREE.Vector3(px + 0.5, y0, pz), new THREE.Vector3((px + x1) / 2, Math.min(y0, y1) - 0.35, -4.6), new THREE.Vector3(x1, y1, -4.85)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.015, 5), mat(0x2b2b2e), 0, 0, 0, g, false);
  });

  /* ---------- xe máy đỗ bên lề ---------- */
  const scooter = (x, z, ry, c) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    s.rotation.y = ry;
    g.add(s);
    [-0.45, 0.45].forEach(wx => {
      const w = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 18), mat(0x2b2b2e), wx, 0.17, 0, s);
      w.rotation.x = Math.PI / 2;
      const hub = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), mat(0xd9dde0), wx, 0.17, 0, s);
      hub.rotation.x = Math.PI / 2;
    });
    const body = mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 14), mat(c), -0.12, 0.42, 0, s);
    body.rotation.z = Math.PI / 2;
    body.scale.set(1, 1, 0.85);
    box(0.5, 0.06, 0.3, 0xfff6ea, 0.12, 0.3, 0, s);
    const shield = box(0.12, 0.62, 0.34, c, 0.42, 0.6, 0, s);
    shield.rotation.z = -0.25;
    const bar = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 8), mat(0x4a4f55), 0.5, 0.96, 0, s);
    bar.rotation.x = Math.PI / 2;
    sph(0.07, 0xfff3c4, 0.56, 0.86, 0, s);
    const seat = mesh(new THREE.CapsuleGeometry(0.1, 0.34, 4, 10), mat(0x6b4a36), -0.18, 0.66, 0, s);
    seat.rotation.z = Math.PI / 2;
  };
  scooter(5.6, 1.4, 0.35, 0x8fd3c1);
  scooter(-5.9, 2.0, Math.PI - 0.3, 0xffb3c1);

  /* ---------- cờ dây tam giác giăng trên mặt tiền ---------- */
  const flag = new THREE.Shape();
  flag.moveTo(-0.16, 0); flag.lineTo(0.16, 0); flag.lineTo(0, -0.3); flag.closePath();
  const flagGeo = new THREE.ShapeGeometry(flag);
  [[-5.4, -0.4], [-0.2, 5.0]].forEach(([x0, x1]) => {
    const n = 11, pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new THREE.Vector3(x0 + (x1 - x0) * k, 3.75 - Math.sin(k * Math.PI) * 0.45, -4.8)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 5), mat(0x8a5a3b), 0, 0, 0, g, false);
    for (let i = 1; i < n; i++) mesh(flagGeo, mat(t.flags[i % t.flags.length], { side: THREE.DoubleSide }), pts[i].x, pts[i].y, -4.78, g, false);
  });
  return g;
}
