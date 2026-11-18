// 海洋公園 + 迪士尼樂園：機動遊戲類型跟現實世界差唔多（原創造型，冇卡通人物）
// 機動遊戲全部跟伺服器時間行，所有玩家見到一樣；上車 / 落車用返遊樂場嗰套（park.rides）
import * as THREE from 'three';
import { Batch, DISNEY, OCEAN, MAT, tree, planeGeo } from './city.js';
import { signMat, sign } from './interiors.js';
import * as TX from './textures.js';
import { buildPet, animatePet } from './pets.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
const mkSeat = (parent, x, y, z, ry = 0) => { const s = new THREE.Object3D(); s.position.set(x, y, z); s.rotation.y = ry; parent.add(s); return s; };
const PASTEL = ['#f48fb1', '#90caf9', '#a5d6a7', '#ffe082', '#ce93d8', '#ffab91', '#80deea', '#fff59d'];

export function buildThemeParks(scene, api, rides) {
  const inter = [], cols = [], updaters = [], groups = { disney: [], ocean: [] };
  const add = (zone, o) => { scene.add(o); groups[zone].push(o); return o; };
  const mesh = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  function addRide(zone, r) {
    r.idx = rides.length; rides.push(r);
    inter.push({ pos: new V3(r.board.x, 0, r.board.z), r: 3.4, label: () => `🎢 玩${r.name}`, act: () => api.boardRide(r.idx) });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), signMat(r.name, r.color, '#fff', 'bold 52px sans-serif')); s.position.set(r.board.x, 3.1, r.board.z); s.rotation.y = r.signRot || 0; add(zone, s);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), std('#555')); p.position.set(r.board.x, 1.3, r.board.z - 0.03); add(zone, p);
    if (r.en) r.info = (r.info || '') + `（${r.en}）`;
  }
  const board = (x, z, exit) => ({ x, z, exit: exit || [x, z] });

  // ---------- 通用：路軌機動遊戲（過山車、礦車、船、纜車）----------
  function trackRide(zone, o) {
    const curve = new THREE.CatmullRomCurve3(o.pts.map(p => new V3(...p)), true, 'catmullrom', 0.4);
    const N = 600, P = curve.getSpacedPoints(N), L = curve.getLength(), ds = L / N;
    // 時間表：過山車跟高度計速度（上斜用鏈條 4 m/s）
    const top = Math.max(...P.map(p => p.y)), cumT = [0];
    for (let i = 1; i <= N; i++) {
      const dy = P[i].y - P[i - 1].y;
      const v = o.speed !== 'coaster' ? o.speed : (dy > 0.02 * ds ? 4.5 : Math.max(6, Math.sqrt(2 * 9.8 * (top - P[i].y + 3))));
      cumT.push(cumT[i - 1] + ds / v);
    }
    const LAP = cumT[N];
    const sAt = t => { t = ((t % LAP) + LAP) % LAP; let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cumT[m] <= t) lo = m; else hi = m - 1; } if (lo >= N) return L - 1e-3; return (lo + (t - cumT[lo]) / Math.max(1e-6, cumT[lo + 1] - cumT[lo] || 1)) * ds; };
    if (o.rail !== false) {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 500, o.railR || 0.28, 6, true), std(o.railColor || '#eceff1', { metalness: 0.6 }));
      add(zone, tube);
      if (o.supports !== false) for (let i = 0; i < N; i += 8) { const p = P[i]; if (p.y < 1.6) continue; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, p.y - 0.3, 6), std(o.supportColor || '#90a4ae')); c.position.set(p.x, (p.y - 0.3) / 2, p.z); add(zone, c); }
    }
    const cars = [], seats = [];
    for (let k = 0; k < o.cars; k++) { const c = o.car(k); add(zone, c.g); cars.push(c.g); c.seats.forEach(s => seats.push(s)); }
    const gap = o.gap === 'even' ? L / o.cars : o.gap;
    const tmp = new V3(), tg = new V3();
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], o.exit), seats, thrill: o.thrill, signRot: o.signRot || 0, info: o.info };
    r.update = t => {
      const s0 = sAt(t);
      cars.forEach((g, k) => {
        const s = ((s0 - k * gap) % L + L) % L, u = s / L;
        curve.getPointAt(u, tmp); curve.getTangentAt(u, tg);
        g.position.copy(tmp); if (o.hang) g.position.y -= o.hang;
        if (o.yawOnly) { g.rotation.set(0, Math.atan2(tg.x, tg.z), 0); if (o.bob) { g.position.y += Math.sin(t * 2 + k) * 0.12; g.rotation.y += Math.sin(t * 0.7 + k) * 0.6; } }
        else g.lookAt(tmp.x + tg.x, tmp.y + tg.y, tmp.z + tg.z);
      });
    };
    addRide(zone, r);
    return { r, curve, LAP };
  }
  // 過山車卡（4 人一卡）
  const coasterCar = (color, open = false) => k => {
    const g = new THREE.Group(), body = std(k % 2 ? color : '#fafafa', { metalness: 0.4 });
    mesh(new THREE.BoxGeometry(1.8, 0.5, 2.6), body, 0, 0.55, 0, g);
    if (!open) { mesh(new THREE.BoxGeometry(1.8, 0.6, 0.15), body, 0, 0.9, 1.25, g); mesh(new THREE.BoxGeometry(1.8, 0.5, 0.12), body, 0, 0.9, 0.05, g); }
    const seats = [mkSeat(g, -0.45, 0.75, 0.6), mkSeat(g, 0.45, 0.75, 0.6), mkSeat(g, -0.45, 0.75, -0.6), mkSeat(g, 0.45, 0.75, -0.6)];
    return { g, seats };
  };
  // 礦車
  const mineCar = k => {
    const g = new THREE.Group(), wood = std('#6d4c41'), iron = std('#455a64', { metalness: 0.7 });
    mesh(new THREE.BoxGeometry(1.8, 0.8, 2.4), wood, 0, 0.7, 0, g); mesh(new THREE.BoxGeometry(1.85, 0.12, 2.45), iron, 0, 1.1, 0, g);
    [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 10), iron, x, 0.3, z, g); w.rotation.z = Math.PI / 2; });
    return { g, seats: [mkSeat(g, -0.4, 0.9, 0.5), mkSeat(g, 0.4, 0.9, 0.5), mkSeat(g, -0.4, 0.9, -0.5), mkSeat(g, 0.4, 0.9, -0.5)] };
  };
  // 吊車（纜車 / 吊船）
  const gondola = (color, n = 4) => k => {
    const g = new THREE.Group(), c = std(PASTEL[k % PASTEL.length]);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), std('#455a64'), 0, 1.1, 0, g);
    const body = mesh(new THREE.SphereGeometry(1.4, 14, 10), new THREE.MeshStandardMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.45, side: THREE.DoubleSide }), 0, -0.6, 0, g); body.scale.set(1, 0.9, 1.2);
    mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.18, 14), c, 0, -1.6, 0, g); mesh(new THREE.CylinderGeometry(0.5, 1.2, 0.4, 14), c, 0, 0.6, 0, g);
    const seats = []; for (let i = 0; i < n; i++) seats.push(mkSeat(g, (i % 2 ? 0.45 : -0.45), -1.5, i < 2 ? 0.45 : -0.45, i < 2 ? Math.PI : 0));
    return { g, seats };
  };
  // 圓形橡皮艇（激流）/ 小船
  const raft = k => {
    const g = new THREE.Group();
    mesh(new THREE.TorusGeometry(1.6, 0.45, 8, 20), std(['#ff7043', '#ffca28', '#29b6f6'][k % 3]), 0, 0.4, 0, g).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16), std('#37474f'), 0, 0.2, 0, g);
    const seats = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; seats.push(mkSeat(g, Math.cos(a) * 1.05, 0.25, Math.sin(a) * 1.05, -a - Math.PI / 2)); }
    return { g, seats };
  };
  const jungleBoat = k => {
    const g = new THREE.Group(), hull = std('#8d6e63'), canopy = std(['#ef5350', '#ffd54f', '#66bb6a'][k % 3]);
    mesh(new THREE.BoxGeometry(2.6, 0.9, 7), hull, 0, 0.25, 0, g);
    [[-1.1, -3], [1.1, -3], [-1.1, 3], [1.1, 3]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), std('#5d4037'), x, 1.6, z, g));
    mesh(new THREE.BoxGeometry(2.9, 0.12, 7.2), canopy, 0, 2.6, 0, g);
    const seats = []; for (let z = -2.4; z <= 2.4; z += 1.6) [-0.6, 0.6].forEach(x => seats.push(mkSeat(g, x, 0.65, z)));
    return { g, seats };
  };

  // =====================================================================
  // 迪士尼樂園
  // =====================================================================
  {
    const Z = 'disney', D = DISNEY, cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2;
    const B = new Batch();
    B.add(planeGeo(D.x0, D.z0, D.x1, D.z1, 0.02, 4), std('#b9ad99', { map: TX.tileTex(1, 1, '#f3e5d0', '#e2ccae') }));
    B.add(planeGeo(cx - 9, D.z0, cx + 9, 1950, 0.03, 3), std('#c75b5b'));                    // 大街
    // 圍牆 + 大門
    const wall = std('#f8bbd0');
    [[D.x0, D.z0, cx - 12, D.z0 + 1], [cx + 12, D.z0, D.x1, D.z0 + 1], [D.x0, D.z1 - 1, D.x1, D.z1], [D.x0, D.z0, D.x0 + 1, D.z1], [D.x1 - 1, D.z0, D.x1, D.z1]].forEach(([a, b, c, d]) => B.box(a, 0, b, c, 2.5, d, wall));
    B.box(cx - 13, 0, D.z0, cx - 11, 9, D.z0 + 2, std('#ce93d8')); B.box(cx + 11, 0, D.z0, cx + 13, 9, D.z0 + 2, std('#ce93d8'));
    B.box(cx - 13, 9, D.z0, cx + 13, 11, D.z0 + 2, std('#ce93d8'), false);
    sign(B, cx, 10, D.z0 - 0.05, 24, 2.2, signMat('✨ 迪士尼樂園 ✨', '#7b1fa2', '#ffeb3b', 'bold 60px serif'), '-z');
    // 城堡（原創童話城堡）
    const kx = cx, kz = 1975, pink = std('#f8bbd0'), blue = std('#5c6bc0'), white = std('#fafafa'), gold = std('#ffca28', { metalness: 0.7, roughness: 0.3 });
    B.box(kx - 26, 0, kz - 10, kx - 5, 14, kz + 10, white); B.box(kx + 5, 0, kz - 10, kx + 26, 14, kz + 10, white);
    B.box(kx - 5, 6, kz - 10, kx + 5, 14, kz + 10, white);                                  // 門拱（下面行得過）
    B.box(kx - 12, 14, kz - 8, kx + 12, 28, kz + 8, pink);
    for (let x = kx - 26; x <= kx + 24; x += 3) B.box(x, 14, kz - 10.5, x + 1.5, 15.5, kz - 9.5, white, false);
    [[-26, -10, 4, 22], [26, -10, 4, 22], [-26, 10, 4, 22], [26, 10, 4, 22], [-12, -8, 3.5, 34], [12, -8, 3.5, 34], [0, 0, 5, 44], [-6, 8, 2.5, 38], [6, 8, 2.5, 38]].forEach(([dx, dz, r, h]) => {
      const t = new THREE.CylinderGeometry(r, r, h, 16); t.translate(kx + dx, h / 2, kz + dz); B.add(t, dx === 0 ? pink : white);
      const c = new THREE.ConeGeometry(r * 1.3, r * 2.6, 16); c.translate(kx + dx, h + r * 1.3, kz + dz); B.add(c, blue);
      const s = new THREE.ConeGeometry(0.25, 3, 6); s.translate(kx + dx, h + r * 2.6 + 1.4, kz + dz); B.add(s, gold);
      B.cols.push({ min: [kx + dx - r, 0, kz + dz - r], max: [kx + dx + r, h, kz + dz + r] });
    });
    sign(B, kx, 16.5, kz - 10.6, 14, 2, signMat('🏰 童話城堡 Castle', '#5c6bc0', '#fff'), '-z');
    for (let k = 0; k < 24; k++) { const x = D.x0 + 20 + ((k * 97) % 560), z = D.z0 + 30 + ((k * 53) % 540); if (Math.abs(x - cx) < 40 && z < 2000) continue; tree(B, x, z, 1.2, k % 3 === 0); }
    for (let z = D.z0 + 20; z < 1940; z += 20) [cx - 11, cx + 11].forEach(x => { B.box(x - 0.1, 0, z - 0.1, x + 0.1, 4.5, z + 0.1, std('#263238'), false); B.box(x - 0.4, 4.5, z - 0.4, x + 0.4, 5, z + 0.4, std('#fff59d', { emissive: '#fff59d', emissiveIntensity: 0.6 }), false); });
    const g = B.build(); add(Z, g); cols.push(...B.cols);
    // 煙花（城堡上面）
    const fwN = 300, fwGeo = new THREE.BufferGeometry(), fwPos = new Float32Array(fwN * 3).fill(-1e5), fwVel = new Float32Array(fwN * 3), fwCol = new Float32Array(fwN * 3);
    fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
    const fw = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fw.frustumCulled = false; add(Z, fw);
    let fwLast = -1; const col = new THREE.Color();
    updaters.push((dt, t) => {
      const slot = Math.floor(t / 4);
      if (slot !== fwLast) { fwLast = slot; const ox = kx + Math.sin(slot * 1.7) * 30, oy = 60 + Math.sin(slot) * 10, oz = kz + Math.cos(slot * 2.3) * 15; col.setHSL((slot * 0.17) % 1, 1, 0.6); for (let i = 0; i < fwN; i++) { const v = new V3().randomDirection().multiplyScalar(10 + Math.random() * 4); fwPos.set([ox, oy, oz], i * 3); fwVel.set([v.x, v.y, v.z], i * 3); fwCol.set([col.r, col.g, col.b], i * 3); } }
      for (let i = 0; i < fwN; i++) { fwVel[i * 3 + 1] -= 5 * dt; fwPos[i * 3] += fwVel[i * 3] * dt; fwPos[i * 3 + 1] += fwVel[i * 3 + 1] * dt; fwPos[i * 3 + 2] += fwVel[i * 3 + 2] * dt; }
      fwGeo.attributes.position.needsUpdate = true; fw.material.opacity = Math.max(0, 1 - (t % 4) / 3);
    });

    // ---- 旋轉咖啡杯 ----
    {
      const x0 = -1760, z0 = 1840, plat = new THREE.Group(); plat.position.set(x0, 0, z0); add(Z, plat);
      mesh(new THREE.CylinderGeometry(12, 12, 0.4, 40), std('#fff176'), 0, 0.2, 0, plat);
      cols.push({ min: [x0 - 1, 0, z0 - 1], max: [x0 + 1, 3, z0 + 1] });
      const cups = [], seats = [];
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2, cup = new THREE.Group(); cup.position.set(Math.cos(a) * 7, 0.4, Math.sin(a) * 7); plat.add(cup);
        mesh(new THREE.CylinderGeometry(1.9, 1.3, 1.4, 22, 1, true), new THREE.MeshStandardMaterial({ color: PASTEL[k], side: THREE.DoubleSide }), 0, 0.8, 0, cup);
        mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.1, 22), std(PASTEL[k]), 0, 0.1, 0, cup);
        mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 14, Math.PI), std(PASTEL[k]), 1.95, 0.9, 0, cup).rotation.z = -Math.PI / 2;
        for (let i = 0; i < 4; i++) { const b = i / 4 * Math.PI * 2; seats.push(mkSeat(cup, Math.cos(b) * 0.9, 0.15, Math.sin(b) * 0.9, -b - Math.PI / 2)); }
        cups.push(cup);
      }
      const r = { name: '旋轉咖啡杯', en: 'Spinning Tea Cups', color: '#f06292', board: board(x0, z0 + 15), seats, thrill: false, info: '杯可以一路轉一路自轉，坐穩啲！' };
      r.update = t => { plat.rotation.y = t * 0.35; cups.forEach((c, k) => c.rotation.y = t * (1.4 + (k % 3) * 0.4) * (k % 2 ? 1 : -1)); };
      addRide(Z, r);
    }
    // ---- 旋轉木馬 ----
    {
      const x0 = -1440, z0 = 1840, base = new THREE.Group(); base.position.set(x0, 0, z0); add(Z, base);
      mesh(new THREE.CylinderGeometry(10, 10, 0.5, 40), std('#ffe0b2'), 0, 0.25, 0, base);
      mesh(new THREE.CylinderGeometry(1, 1, 7, 16), std('#ffca28', { metalness: 0.6 }), 0, 3.5, 0, base);
      mesh(new THREE.ConeGeometry(11, 3.4, 32), std('#ab47bc'), 0, 8.7, 0, base);
      cols.push({ min: [x0 - 1.2, 0, z0 - 1.2], max: [x0 + 1.2, 6, z0 + 1.2] });
      const horses = [], seats = [];
      for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2 + ring * 0.3, rr = ring ? 5 : 7.8, h = new THREE.Group(); h.position.set(Math.cos(a) * rr, 1.3, Math.sin(a) * rr); h.rotation.y = -a; base.add(h);
        const c = std(['#fafafa', '#ffccbc', '#d1c4e9', '#b3e5fc'][(k + ring) % 4]);
        mesh(new THREE.BoxGeometry(0.5, 0.7, 1.5), c, 0, 0, 0, h); mesh(new THREE.BoxGeometry(0.35, 0.7, 0.45), c, 0, 0.45, 0.75, h).rotation.x = -0.4;
        mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), std('#ffd54f', { metalness: 0.8 }), 0, 2.5, 0, h);
        seats.push(mkSeat(h, 0, 0.2, 0)); horses.push({ h, ph: k + ring * 2 });
      }
      const r = { name: '旋轉木馬', en: 'Carousel', color: '#ab47bc', board: board(x0, z0 + 13), seats, thrill: false, info: '木馬會一上一落' };
      r.update = t => { base.rotation.y = -t * 0.45; horses.forEach(({ h, ph }) => h.position.y = 1.3 + Math.sin(t * 1.8 + ph) * 0.4); };
      addRide(Z, r);
    }
    // ---- 火箭旋轉機 ----
    {
      const x0 = -1440, z0 = 2070, hub = new THREE.Group(); hub.position.set(x0, 0, z0); add(Z, hub);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, 9, 16), std('#90a4ae', { metalness: 0.6 })); st.position.set(x0, 4.5, z0); add(Z, st);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), std('#ff7043')); planet.position.set(x0, 11, z0); add(Z, planet);
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.25, 8, 40), std('#ffd54f')); ringM.rotation.x = Math.PI / 2.3; ringM.position.copy(planet.position); add(Z, ringM);
      cols.push({ min: [x0 - 2, 0, z0 - 2], max: [x0 + 2, 9, z0 + 2] });
      const rockets = [], seats = [];
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2, arm = new THREE.Group(); arm.rotation.y = a; hub.add(arm);
        const rk = new THREE.Group(); arm.add(rk);
        const body = mesh(new THREE.CylinderGeometry(0.9, 0.9, 3, 12), std(PASTEL[k]), 0, 0, 0, rk); body.rotation.x = Math.PI / 2;
        mesh(new THREE.ConeGeometry(0.9, 1.4, 12), std('#e53935'), 0, 0, 2.2, rk).rotation.x = Math.PI / 2;
        mesh(new THREE.BoxGeometry(0.1, 0.1, 6), std('#b0bec5', { metalness: 0.8 }), -3, 0, 0, rk).rotation.y = Math.PI / 2;
        seats.push(mkSeat(rk, 0, 0.3, -0.5), mkSeat(rk, 0, 0.3, 0.6));
        rockets.push({ rk, ph: k });
      }
      const r = { name: '火箭旋轉機', en: 'Rocket Spinner', color: '#ff7043', board: board(x0, z0 + 12), seats, thrill: true, info: '火箭圍住星球飛，會升高降低' };
      r.update = t => { hub.rotation.y = t * 0.9; rockets.forEach(({ rk, ph }) => { rk.position.set(6, 3 + 2.6 + Math.sin(t * 0.8 + ph) * 2.6, 0); rk.rotation.y = 0; }); };
      addRide(Z, r);
    }
    // ---- 降落傘跳塔 ----
    {
      const x0 = -1840, z0 = 1960;
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 34, 10), std('#eceff1')); tw.position.set(x0, 17, z0); add(Z, tw);
      cols.push({ min: [x0 - 1.3, 0, z0 - 1.3], max: [x0 + 1.3, 34, z0 + 1.3] });
      const top = new THREE.Mesh(new THREE.ConeGeometry(4, 2, 12), std('#43a047')); top.position.set(x0, 35, z0); add(Z, top);
      const carr = new THREE.Group(); add(Z, carr);
      const seats = [];
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2, x = Math.cos(a) * 4.5, z = Math.sin(a) * 4.5;
        const can = mesh(new THREE.SphereGeometry(2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(PASTEL[k], { side: THREE.DoubleSide }), x, 4, z, carr); can.scale.y = 0.6;
        mesh(new THREE.BoxGeometry(1.6, 0.2, 1.2), std('#455a64'), x, 0, z, carr);
        seats.push(mkSeat(carr, x - 0.35, 0.1, z, -a + Math.PI / 2), mkSeat(carr, x + 0.35, 0.1, z, -a + Math.PI / 2));
      }
      const r = { name: '降落傘跳塔', en: 'Parachute Drop', color: '#43a047', board: board(x0 + 9, z0), seats, thrill: true, signRot: Math.PI / 2, info: '慢慢升上 25 米，然後跌落嚟！' };
      r.update = t => { const u = t % 20; const y = u < 10 ? u / 10 * 25 : u < 13 ? 25 : u < 15 ? 25 * (1 - ((u - 13) / 2) ** 2) : 0; carr.position.set(x0, y + 1, z0); carr.rotation.y = t * 0.2; };
      addRide(Z, r);
    }
    // ---- 太空過山車（圓頂入面）----
    {
      const x0 = -1760, z0 = 2125;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(32, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b0bec5', wireframe: true, transparent: true, opacity: 0.5 })); dome.position.set(x0, 0, z0); add(Z, dome);
      const pts = []; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, r = 22 + 4 * Math.sin(a * 3); pts.push([x0 + Math.cos(a) * r, 4 + 14 * (0.5 + 0.5 * Math.sin(a * 2 + 1)) * (k < 6 ? k / 6 : 1), z0 + Math.sin(a) * r * 0.8]); }
      trackRide(Z, { name: '太空過山車', en: 'Space Coaster', color: '#3949ab', pts, speed: 'coaster', cars: 5, gap: 3, car: coasterCar('#3949ab'), board: [x0, z0 - 36], thrill: true, railColor: '#90caf9', info: '喺星空圓頂入面高速飛馳' });
    }
    // ---- 礦山過山車 ----
    {
      const x0 = -1470, z0 = 2215;
      const mt = new THREE.Mesh(new THREE.ConeGeometry(30, 30, 9), std('#a1887f')); mt.position.set(x0, 15, z0); add(Z, mt);
      cols.push({ min: [x0 - 18, 0, z0 - 18], max: [x0 + 18, 20, z0 + 18] });
      for (let k = 0; k < 8; k++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(4 + k % 3, 0), std('#8d6e63')); r.position.set(x0 + Math.cos(k) * 22, 2, z0 + Math.sin(k) * 22); add(Z, r); }
      const pts = []; for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2, r = 36 + 6 * Math.sin(a * 4); pts.push([x0 + Math.cos(a) * r, 2 + 10 * Math.max(0, Math.sin(a * 2)) + (k % 7 === 0 ? 3 : 0), z0 + Math.sin(a) * r * 0.7]); }
      trackRide(Z, { name: '礦山過山車', en: 'Mine Train Coaster', color: '#6d4c41', pts, speed: 'coaster', cars: 5, gap: 3, car: mineCar, board: [x0 - 44, z0 - 20], thrill: true, railColor: '#795548', supportColor: '#6d4c41', info: '礦車圍住大石山衝上衝落' });
    }
    // ---- 森林河流之旅 ----
    {
      const x0 = -1660, z0 = 2248, B2 = new Batch();
      const pts = []; for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; pts.push([x0 + Math.cos(a) * 60, 0.35, z0 + Math.sin(a) * 30]); }
      const wg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new V3(p[0], 0, p[2])), true), 120, 5, 4, true); wg.scale(1, 0.02, 1);
      const w = new THREE.Mesh(wg, MAT.water); w.position.y = 0.05; add(Z, w);
      for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, rr = k % 2 ? 0.7 : 1.3; tree(B2, x0 + Math.cos(a) * 60 * rr, z0 + Math.sin(a) * 30 * rr, 1.3, false); }
      const g2 = B2.build(); add(Z, g2);
      trackRide(Z, { name: '森林河流之旅', en: 'Jungle River Cruise', color: '#2e7d32', pts, speed: 3.5, cars: 4, gap: 'even', car: jungleBoat, board: [x0, z0 - 36], thrill: false, rail: false, yawOnly: true, info: '坐船遊森林河，睇吓兩邊嘅大樹' });
    }
    updaters.push(() => { });
  }

  // =====================================================================
  // 海洋公園
  // =====================================================================
  {
    const Z = 'ocean', O = OCEAN, cx = (O.x0 + O.x1) / 2;
    const B = new Batch();
    B.add(planeGeo(O.x0, O.z0, O.x1, 4250, 0.02, 4), std('#9cb5b1', { map: TX.tileTex(1, 1, '#e0f2f1', '#b2dfdb') }));
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(O.x1 - O.x0 - 12, 44), MAT.water); sea.rotation.x = -Math.PI / 2; sea.position.set(cx, 0.04, 4272); add(Z, sea);
    const wall = std('#4dd0e1');
    [[O.x0, O.z0, cx - 12, O.z0 + 1], [cx + 12, O.z0, O.x1, O.z0 + 1], [O.x0, 4250, O.x1, 4251], [O.x0, O.z0, O.x0 + 1, 4250], [O.x1 - 1, O.z0, O.x1, 4250]].forEach(([a, b, c, d]) => B.box(a, 0, b, c, 2.5, d, wall));
    B.box(cx - 13, 0, O.z0, cx - 11, 9, O.z0 + 2, std('#0288d1')); B.box(cx + 11, 0, O.z0, cx + 13, 9, O.z0 + 2, std('#0288d1')); B.box(cx - 13, 9, O.z0, cx + 13, 11, O.z0 + 2, std('#0288d1'), false);
    sign(B, cx, 10, O.z0 - 0.05, 24, 2.2, signMat('🐬 海洋公園 🐼', '#0277bd', '#fff', 'bold 60px sans-serif'), '-z');
    for (let k = 0; k < 30; k++) { const x = O.x0 + 15 + ((k * 89) % 570), z = O.z0 + 40 + ((k * 61) % 500); tree(B, x, z, 1.1, k % 4 === 0); }
    // 大熊貓館
    const ph = { x: 2060, z: 3770 };
    B.box(ph.x - 22, 0, ph.z - 14, ph.x + 22, 0.3, ph.z + 14, std('#a5d6a7'));
    B.box(ph.x - 22, 0, ph.z - 14, ph.x + 22, 8, ph.z - 13.6, std('#5d4037')); B.box(ph.x - 22, 0, ph.z - 14, ph.x - 21.6, 8, ph.z + 14, std('#5d4037')); B.box(ph.x + 21.6, 0, ph.z - 14, ph.x + 22, 8, ph.z + 14, std('#5d4037'));
    B.box(ph.x - 22, 0, ph.z + 13.6, ph.x + 22, 3, ph.z + 14, new THREE.MeshStandardMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.3 }));
    for (let k = 0; k < 14; k++) { const b = new THREE.CylinderGeometry(0.15, 0.15, 5 + k % 3, 6); b.translate(ph.x - 18 + k * 2.7, 2.6, ph.z - 10 + (k % 3)); B.add(b, std('#7cb342')); }
    sign(B, ph.x, 5, ph.z + 14.05, 12, 1.4, signMat('🐼 大熊貓館 Giant Panda House', '#2e7d32'), '+z');
    // 鯊魚館（水族館）
    const aq = { x: 2260, z: 3790 };
    const dome = new THREE.SphereGeometry(18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(aq.x, 0, aq.z); B.add(dome, std('#4fc3f7', { metalness: 0.5, roughness: 0.2 }));
    B.cols.push({ min: [aq.x - 13, 0, aq.z - 13], max: [aq.x + 13, 12, aq.z + 13] });
    sign(B, aq.x, 4, aq.z + 18.2, 12, 1.4, signMat('🦈 鯊魚館 Shark Aquarium', '#01579b'), '+z');
    // 海洋劇場（海豚表演）
    const dp = { x: 2420, z: 3930 };
    const pool = new THREE.CircleGeometry(16, 36); pool.rotateX(-Math.PI / 2); pool.translate(dp.x, 0.4, dp.z); B.add(pool, MAT.water);
    const rim = new THREE.CylinderGeometry(16.6, 16.6, 0.8, 36, 1, true); rim.translate(dp.x, 0.4, dp.z); B.add(rim, std('#e0e0e0', { side: THREE.DoubleSide }));
    B.cols.push({ min: [dp.x - 15, 0, dp.z - 15], max: [dp.x + 15, 0.8, dp.z + 15] });
    for (let k = 0; k < 6; k++) B.box(dp.x - 22 + k * 0.01, k * 0.6, dp.z + 18 + k * 1.4, dp.x + 22, k * 0.6 + 0.6, dp.z + 19.4 + k * 1.4, std('#1565c0'));
    sign(B, dp.x, 3, dp.z - 17, 14, 1.4, signMat('🐬 海洋劇場 Dolphin Show', '#0277bd'), '+z');
    const g = B.build(); add(Z, g); cols.push(...B.cols);
    // 熊貓（會郁）
    const pandas = [0, 1, 2].map(k => { const p = buildPet('panda'); p.scale.setScalar(1.4); p.position.set(ph.x - 10 + k * 9, 0.3, ph.z - 2 + k * 2); add(Z, p); return p; });
    updaters.push((dt, t) => pandas.forEach((p, k) => { const a = t * 0.2 + k * 2; p.position.x = ph.x - 10 + k * 9 + Math.sin(a) * 3; p.rotation.y = Math.cos(a) > 0 ? Math.PI / 2 : -Math.PI / 2; animatePet(p, true, dt); }));
    // 海豚跳水
    const dolphins = [0, 1, 2].map(k => { const d = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), std('#78909c')); b.scale.set(1, 0.8, 2.6); d.add(b); const f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 4), std('#607d8b')); f.position.set(0, 0.8, 0); d.add(f); add(Z, d); return d; });
    updaters.push((dt, t) => dolphins.forEach((d, k) => { const u = ((t * 0.25 + k / 3) % 1), a = u * Math.PI * 2; d.position.set(dp.x + Math.cos(a) * 9, Math.max(-0.5, Math.sin(u * Math.PI * 4) * 4), dp.z + Math.sin(a) * 9); d.rotation.set(-Math.cos(u * Math.PI * 4) * 0.8, -a, 0, 'YXZ'); }));
    inter.push({ pos: new V3(ph.x, 0, ph.z + 16), r: 4, label: () => '🐼 睇大熊貓', act: () => api.say('Look! These are giant pandas. They love to eat bamboo.', '睇吓！呢啲係大熊貓，最鍾意食竹。', { force: true }) });
    inter.push({ pos: new V3(aq.x, 0, aq.z + 20), r: 4, label: () => '🦈 入鯊魚館', act: () => api.say('Welcome to the aquarium. Sharks have very sharp teeth!', '歡迎嚟到水族館，鯊魚有好鋒利嘅牙！', { force: true }) });
    inter.push({ pos: new V3(dp.x, 0, dp.z + 26), r: 6, label: () => '🐬 睇海豚表演', act: () => api.say('The dolphins are jumping! Dolphins are very clever animals.', '海豚跳緊水！海豚係好聰明嘅動物。', { force: true }) });

    // ---- 登山纜車（低地 ⇄ 南朗山頂）----
    {
      const A = [2010, 3800], Bp = [2440, 4180], m = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2];
      const pts = [[A[0] - 3, 13, A[1]], [m[0] - 3, 55, m[1]], [Bp[0] - 3, 13, Bp[1]], [Bp[0] + 6, 13, Bp[1] + 4], [Bp[0] + 3, 13, Bp[1] + 6], [m[0] + 3, 55, m[1] + 2], [A[0] + 3, 13, A[1] + 2], [A[0] - 6, 13, A[1] - 4]];
      const tr = trackRide(Z, { name: '登山纜車', en: 'Cable Car', color: '#0288d1', pts, speed: 4, cars: 18, gap: 'even', car: gondola('#0288d1'), board: [A[0] - 10, A[1] - 6], thrill: false, rail: true, railR: 0.06, railColor: '#37474f', supports: false, hang: 0, yawOnly: true, info: '由低地搭纜車上山頂，可以睇到成個海' });
      [A, Bp].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 12), std('#e0e0e0')); s.position.set(x, 7 - 0.5, z); add(Z, s); cols.push({ min: [x - 7, 0, z - 6], max: [x + 7, 6, z + 6] }); });
      for (let k = 1; k < 4; k++) { const x = A[0] + (Bp[0] - A[0]) * k / 4, z = A[1] + (Bp[1] - A[1]) * k / 4, h = 40 + 15 * Math.sin(k / 4 * Math.PI); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, h, 8), std('#90a4ae')); p.position.set(x, h / 2, z); add(Z, p); }
      void tr;
    }
    // ---- 海洋天地（旋轉觀光塔）----
    {
      const x0 = 2380, z0 = 4060;
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 72, 14), std('#eceff1')); tw.position.set(x0, 36, z0); add(Z, tw);
      cols.push({ min: [x0 - 2.3, 0, z0 - 2.3], max: [x0 + 2.3, 72, z0 + 2.3] });
      const ring = new THREE.Group(); add(Z, ring);
      mesh(new THREE.CylinderGeometry(6, 6, 2.6, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#80deea', transparent: true, opacity: 0.4, side: THREE.DoubleSide }), 0, 1.3, 0, ring);
      mesh(new THREE.CylinderGeometry(6.1, 6.1, 0.3, 28), std('#0277bd'), 0, 0, 0, ring); mesh(new THREE.CylinderGeometry(6.1, 6.1, 0.3, 28), std('#0277bd'), 0, 2.7, 0, ring);
      const seats = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; seats.push(mkSeat(ring, Math.cos(a) * 4.6, 0.2, Math.sin(a) * 4.6, -a + Math.PI / 2)); }
      const r = { name: '海洋天地觀光塔', en: 'Ocean Park Tower', color: '#0277bd', board: board(x0, z0 + 12), seats, thrill: false, info: '一路轉一路升到 60 米高，睇晒成個海' };
      r.update = t => { const u = (t % 120) / 120, h = u < 0.4 ? u / 0.4 * 60 : u < 0.6 ? 60 : u < 0.95 ? 60 * (1 - (u - 0.6) / 0.35) : 0; ring.position.set(x0, h + 0.5, z0); ring.rotation.y = t * 0.12; };
      addRide(Z, r);
    }
    // ---- 翻天覆地（海邊無地板過山車）----
    {
      const pts = []; for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; pts.push([2200 + Math.cos(a) * 110, 3 + 26 * Math.max(0, Math.sin(a * 2)) ** 1.5 + (k === 3 ? 6 : 0), 4205 + Math.sin(a) * 34]); }
      trackRide(Z, { name: '翻天覆地', en: 'Floorless Coaster', color: '#d32f2f', pts, speed: 'coaster', cars: 6, gap: 3, car: coasterCar('#d32f2f', true), board: [2200, 4160], thrill: true, railColor: '#ffeb3b', info: '喺海邊高速衝上衝落，腳下冇地板！' });
    }
    // ---- 越礦飛車 ----
    {
      const x0 = 2040, z0 = 4120;
      for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + k % 3 * 2, 0), std('#a1887f')); r.position.set(x0 + Math.cos(k) * 10, 3, z0 + Math.sin(k) * 10); add(Z, r); }
      cols.push({ min: [x0 - 14, 0, z0 - 14], max: [x0 + 14, 8, z0 + 14] });
      const pts = []; for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; pts.push([x0 + Math.cos(a) * 32, 2 + 9 * Math.max(0, Math.sin(a * 3)), z0 + Math.sin(a) * 26]); }
      trackRide(Z, { name: '越礦飛車', en: 'Mine Train', color: '#795548', pts, speed: 'coaster', cars: 4, gap: 3, car: mineCar, board: [x0, z0 - 32], thrill: true, railColor: '#6d4c41', info: '礦車喺石山之間飛馳' });
    }
    // ---- 熱帶激流 ----
    {
      const x0 = 2090, z0 = 3960;
      const pts = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = 40 + 8 * Math.sin(a * 3); pts.push([x0 + Math.cos(a) * r, 0.3 + (k > 4 && k < 8 ? 6 - Math.abs(k - 6) * 2 : 0), z0 + Math.sin(a) * r * 0.6]); }
      const wg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new V3(p[0], p[1], p[2])), true), 160, 4, 4, true); wg.scale(1, 1, 1);
      const w = new THREE.Mesh(wg, std('#29b6f6', { transparent: true, opacity: 0.8 })); w.scale.y = 0.15; w.position.y = 0.1; add(Z, w);
      trackRide(Z, { name: '熱帶激流', en: 'Rapids Adventure', color: '#0097a7', pts, speed: 5, cars: 7, gap: 'even', car: raft, board: [x0, z0 - 30], thrill: true, rail: false, yawOnly: true, bob: true, info: '坐圓形橡皮艇衝激流，可能會濕身！' });
    }
    // ---- 摩天巨輪 ----
    {
      const x0 = 2340, z0 = 3860, cy = 26, R = 22;
      const wheel = new THREE.Group(); wheel.position.set(x0, cy, z0); add(Z, wheel);
      [-1, 1].forEach(z => mesh(new THREE.TorusGeometry(R, 0.3, 8, 60), std('#0288d1'), 0, 0, z, wheel));
      for (let k = 0; k < 12; k++) { const sp = mesh(new THREE.BoxGeometry(0.15, R * 2, 0.15), std('#eceff1'), 0, 0, 0, wheel); sp.rotation.z = k / 12 * Math.PI; }
      [-1, 1].forEach(s => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, cy * 1.1, 8), std('#eceff1')); leg.position.set(x0 + s * 6, cy / 2, z0); leg.rotation.z = s * 0.25; add(Z, leg); });
      cols.push({ min: [x0 - 10, 0, z0 - 2], max: [x0 + 10, 3, z0 + 2] });
      const cabs = [], seats = [];
      for (let k = 0; k < 12; k++) { const c = new THREE.Group(); add(Z, c); mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.2, 12, 1, true), new THREE.MeshStandardMaterial({ color: PASTEL[k % 8], transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, -1.6, 0, c); mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.15, 12), std(PASTEL[k % 8]), 0, -2.7, 0, c); seats.push(mkSeat(c, 0, -2.85, 0.6, Math.PI), mkSeat(c, 0, -2.85, -0.6, 0)); cabs.push({ c, a: k / 12 * Math.PI * 2 }); }
      const r = { name: '摩天巨輪', en: 'Ferris Wheel', color: '#0288d1', board: board(x0, z0 + 6), seats, thrill: false, info: '慢慢轉，睇到成個海洋公園' };
      r.update = t => { const a0 = t * Math.PI * 2 / 140; wheel.rotation.z = a0; cabs.forEach(({ c, a }) => c.position.set(x0 + Math.cos(a + a0) * R, cy + Math.sin(a + a0) * R, z0)); };
      addRide(Z, r);
    }
  }

  function update(dt, t, p) {
    const nearD = p.x > DISNEY.x0 - 1200 && p.x < DISNEY.x1 + 1200 && p.z > DISNEY.z0 - 1200 && p.z < DISNEY.z1 + 1200;
    const nearO = p.x > OCEAN.x0 - 1200 && p.x < OCEAN.x1 + 1200 && p.z > OCEAN.z0 - 1200 && p.z < OCEAN.z1 + 1200;
    groups.disney.forEach(o => o.visible = nearD || p.y > 300); groups.ocean.forEach(o => o.visible = nearO || p.y > 300);
    if (nearD || nearO) updaters.forEach(f => f(dt, t));
  }
  return { colliders: cols, interactables: inter, update, gate: { disney: new V3((DISNEY.x0 + DISNEY.x1) / 2, 0.1, DISNEY.z0 + 12), ocean: new V3((OCEAN.x0 + OCEAN.x1) / 2, 0.1, OCEAN.z0 + 12) } };
}
