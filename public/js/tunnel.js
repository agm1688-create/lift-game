// 海港 + 3 條海底隧道（西區、紅磡、東區）：海港南北兩岸有隧道口，行 / 揸電單車入去就落到海底隧道，
// 隧道四面係玻璃，望到海底同魚；行到盡頭就喺對岸出返嚟
import * as THREE from 'three';
import { Batch, HARBOUR, TUNNELS } from './city.js';
import { IM, signMat, sign } from './interiors.js';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...e });
export const TUBE = { x: 6800, z: 0, half: 125 };
const H = HARBOUR, SHORE_N = H.z0 + 6, SHORE_S = H.z1 - 6;   // 海邊（馬路以外）

export function buildTunnels(scene, api) {
  const B = new Batch(), inter = [];
  const rail = std('#455a64', { metalness: 0.6 }), conc = std('#9e9e9e'), dark = std('#1b1f23');
  // ---- 海 ----
  const water = new THREE.Mesh(new THREE.PlaneGeometry(H.x1 - H.x0, SHORE_S - SHORE_N), new THREE.MeshStandardMaterial({ color: '#1f78b4', metalness: 0.45, roughness: 0.12, transparent: true, opacity: 0.95 }));
  water.rotation.x = -Math.PI / 2; water.position.set((H.x0 + H.x1) / 2, 0.05, (SHORE_N + SHORE_S) / 2); scene.add(water);
  // ---- 海邊欄杆（2.5 米高嘅碰撞，跳唔過；隧道口留位）----
  const gaps = TUNNELS.map(t => [t.x - 7, t.x + 7]);
  function railX(z) {
    let segs = [[H.x0, H.x1]];
    for (const [a, b] of gaps) segs = segs.flatMap(([p, q]) => [[p, Math.min(q, a)], [Math.max(p, b), q]].filter(([u, v]) => v - u > 0.5));
    segs.forEach(([a, b]) => { B.box(a, 0, z - 0.1, b, 1.1, z + 0.1, rail, false); B.cols.push({ min: [a, 0, z - 0.15], max: [b, 2.5, z + 0.15] }); for (let x = a; x < b; x += 3) B.box(x - 0.05, 0, z - 0.05, x + 0.05, 1.1, z + 0.05, rail, false); });
  }
  railX(SHORE_N + 0.3); railX(SHORE_S - 0.3);
  [H.x0, H.x1].forEach(x => { B.box(x - 0.1, 0, SHORE_N, x + 0.1, 1.1, SHORE_S, rail, false); B.cols.push({ min: [x - 0.15, 0, SHORE_N], max: [x + 0.15, 2.5, SHORE_S] }); });
  // ---- 隧道口（兩岸各一個）----
  const portals = [];
  TUNNELS.forEach((t, k) => {
    for (const north of [true, false]) {
      const z0 = north ? SHORE_N : SHORE_S - 18, z1 = north ? SHORE_N + 18 : SHORE_S;
      B.box(t.x - 7, 0, z0, t.x + 7, 0.06, z1, std('#555'), false);                              // 路面
      B.box(t.x - 7.5, 0, z0, t.x - 6, 6, z1, conc); B.box(t.x + 6, 0, z0, t.x + 7.5, 6, z1, conc);   // 兩邊牆
      B.box(t.x - 7.5, 5, z0, t.x + 7.5, 6.5, z1, conc);                                            // 頂
      const inner = north ? z1 - 2 : z0 + 2;
      B.box(t.x - 6, 0.06, Math.min(inner, inner + (north ? 2 : -2)), t.x + 6, 5, Math.max(inner, inner + (north ? 2 : -2)), dark, false);   // 黑色洞口
      const face = north ? z0 - 0.05 : z1 + 0.05;
      sign(B, t.x, 5.8, face, 13, 1.3, signMat(`🌊 ${t.n} ${t.en}`, '#0d47a1', '#fff', 'bold 40px sans-serif'), north ? '-z' : '+z');
      // 隧道口燈
      for (let x = -5; x <= 5; x += 2.5) B.box(t.x + x - 0.4, 4.95, z0 + 1, t.x + x + 0.4, 5, z1 - 1, IM.light, false);
      portals.push({ k, north, x: t.x, zIn: north ? z1 - 4 : z0 + 4, exit: new V3(t.x + (north ? -3 : 3), 0.1, north ? H.z0 - 10 : H.z1 + 10), face: north ? Math.PI : 0 });
    }
  });
  const g = B.build(); scene.add(g);

  // ===== 海底隧道（地圖以外，3 條共用一個模板）=====
  const T = new Batch(), X = TUBE.x, Z = TUBE.z, L = TUBE.half;
  const tb = (x0, y0, z0, x1, y1, z1, m, col = true) => T.box(X + x0, y0, Z + z0, X + x1, y1, Z + z1, m, col);
  const road = std('#fff', { map: TX.roadTex(1, 1) });
  const rg = new THREE.PlaneGeometry(8, L * 2); rg.rotateX(-Math.PI / 2); const uv = rg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * L * 2 / 12, uv.getX(i)); rg.rotateY(0); rg.translate(X, 0.02, Z);
  // 路標線向 z：用 roadTex 嘅 UV 已經對齊長邊
  T.add(rg, road);
  tb(-6, -0.4, -L - 3, 6, 0, L + 3, std('#5f6368'));
  tb(-6, 0, -L - 3, -4, 0.25, L + 3, std('#bdbdbd')); tb(4, 0, -L - 3, 6, 0.25, L + 3, std('#bdbdbd'));    // 行人路
  const glass = new THREE.MeshStandardMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  tb(-6.2, 0, -L - 3, -6, 6.5, L + 3, glass); tb(6, 0, -L - 3, 6.2, 6.5, L + 3, glass); tb(-6.2, 6.5, -L - 3, 6.2, 6.7, L + 3, glass);
  for (let z = -L; z <= L; z += 10) { tb(-6.3, 0, z - 0.2, -6.0, 6.7, z + 0.2, rail, false); tb(6.0, 0, z - 0.2, 6.3, 6.7, z + 0.2, rail, false); tb(-6.3, 6.5, z - 0.2, 6.3, 6.8, z + 0.2, rail, false); tb(-2, 6.45, z - 2, 2, 6.5, z + 2, IM.light, false); }
  tb(-6, 0, -L - 3.2, 6, 6.5, -L - 3, dark); tb(-6, 0, L + 3, 6, 6.5, L + 3.2, dark);
  // 海底：沙、石、海草
  const sea = new THREE.Mesh(new THREE.BoxGeometry(120, 60, L * 2 + 40), new THREE.MeshBasicMaterial({ color: '#0b4f7a', side: THREE.BackSide, fog: false }));
  sea.position.set(X, 20, Z); scene.add(sea);
  T.add(new THREE.PlaneGeometry(120, L * 2 + 40).rotateX(-Math.PI / 2).translate(X, -1.5, Z), std('#c9b27c'));
  for (let k = 0; k < 70; k++) {
    const side = k % 2 ? 1 : -1, x = side * (9 + ((k * 37) % 40)), z = -L + ((k * 53) % (L * 2));
    const h = 1.5 + (k % 5); const sw = new THREE.ConeGeometry(0.4, h, 5); sw.translate(X + x, -1.5 + h / 2, Z + z); T.add(sw, std(k % 3 ? '#2e7d32' : '#558b2f'));
    if (k % 4 === 0) { const r = new THREE.DodecahedronGeometry(1 + (k % 3), 0); r.translate(X + x + 2, -1, Z + z + 3); T.add(r, std('#6d6d6d')); }
  }
  const tg = T.build(); scene.add(tg);
  const waterTop = new THREE.Mesh(new THREE.PlaneGeometry(120, L * 2 + 40), new THREE.MeshBasicMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false }));
  waterTop.rotation.x = Math.PI / 2; waterTop.position.set(X, 26, Z); scene.add(waterTop);
  // 魚（簡單原創造型）
  const fish = [];
  const fishCols = ['#ff7043', '#ffd54f', '#4dd0e1', '#ba68c8', '#e57373', '#aed581'];
  for (let k = 0; k < 40; k++) {
    const f = new THREE.Group(), c = std(fishCols[k % fishCols.length]);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), c); body.scale.set(1.6, 0.8, 0.5); f.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 4), c); tail.rotation.z = Math.PI / 2; tail.position.x = -0.85; f.add(tail);
    const s = 0.6 + (k % 4) * 0.35; f.scale.setScalar(s);
    f.userData = { r: 9 + (k % 7) * 3, y: 1 + (k % 9) * 2, sp: 0.15 + (k % 5) * 0.05, a: k * 0.9, z0: -L + (k * 61) % (L * 2), side: k % 2 ? 1 : -1 };
    scene.add(f); fish.push(f);
  }
  // 隧道入面招牌（動態：邊條隧道）
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 160;
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
  const smat = new THREE.MeshBasicMaterial({ map: stex, side: THREE.DoubleSide });
  [[-L + 6, Math.PI], [L - 6, 0], [0, 0], [0.01, Math.PI]].forEach(([z, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), smat); m.position.set(X, 5.6, Z + z); m.rotation.y = ry; scene.add(m); });
  function setSign(t, dirTxt) { const c = sc.getContext('2d'); c.fillStyle = '#0d47a1'; c.fillRect(0, 0, 1024, 160); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 56px sans-serif'; c.fillText(`🌊 ${t.n}`, 512, 52); c.font = 'bold 40px sans-serif'; c.fillText(`${t.en}　${dirTxt}`, 512, 118); stex.needsUpdate = true; }

  let cur = null, cool = 0, lock = 0;
  function enter(pt) {
    const t = TUNNELS[pt.k];
    cur = { k: pt.k, fromNorth: pt.north }; lock = 1.2;
    setSign(t, pt.north ? '往南岸 →' : '往北岸 →');
    api.sfx.whoosh();
    api.blackout(() => {
      api.teleport(X + (pt.north ? 2 : -2), 0.1, Z + (pt.north ? -L + 4 : L - 4)); api.face(pt.north ? 0 : Math.PI);
      api.toast(`🌊 落咗${t.n}！行到盡頭就到對岸\n望下兩邊：海底有魚同海草 🐟`, 4500);
      api.say(`This is the ${t.en}. It is a tunnel under the sea. Look at the fish swimming outside!`, `呢條係${t.n}，係喺海底嘅隧道（tunnel），望吓出面啲魚游緊水！`, { force: true });
    }, 600);
  }
  function exit(toNorth) {
    const t = TUNNELS[cur.k], pt = portals.find(p => p.k === cur.k && p.north === toNorth); cur = null; cool = 2; lock = 1.2;
    api.blackout(() => { api.teleport(pt.exit.x, 0.1, pt.exit.z); api.face(pt.face); api.loadCity(); api.toast(`🌊 經${t.n}到咗${toNorth ? '北岸' : '南岸'}`); }, 500);
  }
  const inTube = p => Math.abs(p.x - X) < 7 && Math.abs(p.z - Z) < L + 4 && p.y > -3 && p.y < 9;
  function update(dt, p) {
    const near = p.x > H.x0 - 1500 && p.x < H.x1 + 1500 && p.z > H.z0 - 1500 && p.z < H.z1 + 1500;
    g.visible = water.visible = near || p.y > 300;
    const inT = inTube(p);
    if (lock > 0) { lock -= dt; tg.visible = sea.visible = waterTop.visible = inT; fish.forEach(f => f.visible = inT); return; }
    tg.visible = sea.visible = waterTop.visible = inT; fish.forEach(f => f.visible = inT);
    if (inT) {
      fish.forEach(f => { const u = f.userData; u.a += dt * u.sp; f.position.set(X + u.side * (u.r + Math.sin(u.a * 2) * 2), u.y + Math.sin(u.a * 3) * 0.5, Z + ((u.z0 + u.a * 12) % (L * 2 + 20) + L * 2 + 20) % (L * 2 + 20) - L - 10); f.rotation.y = -Math.PI / 2; });
      if (!cur) cur = { k: 0, fromNorth: true };
      if (p.z > Z + L + 1) exit(false); else if (p.z < Z - L - 1) exit(true);
      return;
    }
    cool -= dt; if (cool > 0 || api.busy()) return;
    for (const pt of portals) if (Math.abs(p.x - pt.x) < 5.5 && p.y < 3 && (pt.north ? p.z > pt.zIn && p.z < pt.zIn + 6 : p.z < pt.zIn && p.z > pt.zIn - 6)) { enter(pt); break; }
  }
  return { colliders: B.cols.concat(T.cols), interactables: inter, update, inside: inTube, label: () => cur ? `🌊 ${TUNNELS[cur.k].n}` : '🌊 海底隧道' };
}
