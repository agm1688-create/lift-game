// 海洋公園 + 迪士尼樂園：機動遊戲類型跟現實世界差唔多（原創造型，冇卡通人物）
// 機動遊戲全部跟伺服器時間行，所有玩家見到一樣；上車 / 落車用返遊樂場嗰套（park.rides）
import * as THREE from 'three';
import { Batch, DISNEY, OCEAN, SANTA, MAT, tree, planeGeo } from './city.js';
import { signMat, sign } from './interiors.js';
import * as TX from './textures.js';
import { buildPet, animatePet } from './pets.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
const mkSeat = (parent, x, y, z, ry = 0) => { const s = new THREE.Object3D(); s.position.set(x, y, z); s.rotation.y = ry; parent.add(s); return s; };
const PASTEL = ['#f48fb1', '#90caf9', '#a5d6a7', '#ffe082', '#ce93d8', '#ffab91', '#80deea', '#fff59d'];

export function buildThemeParks(scene, api, rides) {
  const inter = [], cols = [], updaters = [], groups = { disney: [], ocean: [], santa: [] };
  const add = (zone, o) => { scene.add(o); groups[zone].push(o); return o; };
  const mesh = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  function addRide(zone, r) {
    r.idx = rides.length; rides.push(r);
    const by = r.board.y || 0;
    inter.push({ pos: new V3(r.board.x, by, r.board.z), r: 3.4, label: () => `🎢 玩${r.name}`, act: () => api.boardRide(r.idx) });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), signMat(r.name, r.color, '#fff', 'bold 52px sans-serif')); s.position.set(r.board.x, 3.1 + by, r.board.z); s.rotation.y = r.signRot || 0; add(zone, s);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), std('#555')); p.position.set(r.board.x, 1.3 + by, r.board.z - 0.03); add(zone, p);
    if (r.en) r.info = (r.info || '') + `（${r.en}）`;
  }
  const board = (x, z, exit, y = 0) => ({ x, z, y: y || 0, exit: exit || [x, z, y || 0] });

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
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], o.exit, o.board[2]), seats, thrill: o.thrill, signRot: o.signRot || 0, info: o.info };
    r.update = t => {
      let s0 = sAt(t);
      if (o.backward) {   // 倒退段：喺呢段時間架車會向後退，之後再衝返前
        const [fa, fb] = o.backward, tt = ((t % LAP) + LAP) % LAP, ta = fa * LAP, tb = fb * LAP;
        if (tt > ta && tt < tb) { const sa = sAt(ta), sb = sAt(tb), u = (tt - ta) / (tb - ta); s0 = sa + (sb - sa) * (u - 0.7 * Math.sin(Math.PI * u)); }
      }
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
      const r = { name: '瘋狂旋轉杯', en: 'Crazy Tea Cups', color: '#f06292', board: board(x0, z0 + 15), seats, thrill: false, info: '杯可以一路轉一路自轉，坐穩啲！' };
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
      const r = { name: '公主旋轉木馬', en: 'Princess Carousel', color: '#ab47bc', board: board(x0, z0 + 13), seats, thrill: false, info: '木馬會一上一落' };
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
      const r = { name: '太空飛碟', en: 'Space Saucers', color: '#ff7043', board: board(x0, z0 + 12), seats, thrill: true, info: '火箭圍住星球飛，會升高降低' };
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
      const r = { name: '玩具兵團跳降傘', en: 'Toy Soldier Parachute Drop', color: '#43a047', board: board(x0 + 9, z0), seats, thrill: true, signRot: Math.PI / 2, info: '慢慢升上 25 米，然後跌落嚟！' };
      r.update = t => { const u = t % 20; const y = u < 10 ? u / 10 * 25 : u < 13 ? 25 : u < 15 ? 25 * (1 - ((u - 13) / 2) ** 2) : 0; carr.position.set(x0, y + 1, z0); carr.rotation.y = t * 0.2; };
      addRide(Z, r);
    }
    // ---- 太空過山車（圓頂入面）----
    {
      const x0 = -1760, z0 = 2125;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(32, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b0bec5', wireframe: true, transparent: true, opacity: 0.5 })); dome.position.set(x0, 0, z0); add(Z, dome);
      const pts = []; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, r = 22 + 4 * Math.sin(a * 3); pts.push([x0 + Math.cos(a) * r, 4 + 14 * (0.5 + 0.5 * Math.sin(a * 2 + 1)) * (k < 6 ? k / 6 : 1), z0 + Math.sin(a) * r * 0.8]); }
      trackRide(Z, { name: '極速太空穿梭', en: 'Hyperspace Coaster', color: '#3949ab', pts, speed: 'coaster', cars: 5, gap: 3, car: coasterCar('#3949ab'), board: [x0, z0 - 36], thrill: true, railColor: '#90caf9', info: '喺星空圓頂入面高速飛馳' });
    }
    // ---- 礦山過山車 ----
    {
      const x0 = -1470, z0 = 2215;
      const mt = new THREE.Mesh(new THREE.ConeGeometry(30, 30, 9), std('#a1887f')); mt.position.set(x0, 15, z0); add(Z, mt);
      cols.push({ min: [x0 - 18, 0, z0 - 18], max: [x0 + 18, 20, z0 + 18] });
      for (let k = 0; k < 8; k++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(4 + k % 3, 0), std('#8d6e63')); r.position.set(x0 + Math.cos(k) * 22, 2, z0 + Math.sin(k) * 22); add(Z, r); }
      const pts = []; for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2, r = 36 + 6 * Math.sin(a * 4); pts.push([x0 + Math.cos(a) * r, 2 + 10 * Math.max(0, Math.sin(a * 2)) + (k % 7 === 0 ? 3 : 0), z0 + Math.sin(a) * r * 0.7]); }
      trackRide(Z, { name: '灰熊山極速礦車', en: 'Grizzly Mountain Mine Cars', backward: [0.42, 0.56], color: '#6d4c41', pts, speed: 'coaster', cars: 5, gap: 3, car: mineCar, board: [x0 - 44, z0 - 20], thrill: true, railColor: '#795548', supportColor: '#6d4c41', info: '礦車圍住大石山衝上衝落' });
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
      const r = { name: '海洋摩天塔', en: 'Ocean Park Tower (72 m)', color: '#0277bd', board: board(x0, z0 + 12), seats, thrill: false, info: '一路轉一路升到 60 米高，睇晒成個海' };
      r.update = t => { const u = (t % 120) / 120, h = u < 0.4 ? u / 0.4 * 66 : u < 0.6 ? 66 : u < 0.95 ? 66 * (1 - (u - 0.6) / 0.35) : 0; ring.position.set(x0, h + 0.5, z0); ring.rotation.y = t * 0.12; };
      addRide(Z, r);
    }
    // ---- 翻天覆地（海邊無地板過山車）----
    {
      const pts = []; for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; pts.push([2200 + Math.cos(a) * 110, 3 + 26 * Math.max(0, Math.sin(a * 2)) ** 1.5 + (k === 3 ? 6 : 0), 4205 + Math.sin(a) * 34]); }
      trackRide(Z, { name: '動感快車', en: 'Floorless Coaster (4G)', color: '#d32f2f', pts, speed: 'coaster', cars: 6, gap: 3, car: coasterCar('#d32f2f', true), board: [2200, 4160], thrill: true, railColor: '#ffeb3b', info: '喺海邊高速衝上衝落，腳下冇地板！' });
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
      const x0 = 2340, z0 = 3860, cy = 13.5, R = 11;
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

  // =====================================================================
  // 多啲機動遊戲（參考真實樂園嘅遊戲類型，原創造型同名稱）
  // =====================================================================
  // 旋轉臂（飛天大笨象、旋轉飛椅、彈簧旋轉車、旋轉臂）
  function spinRide(zone, o) {
    const hub = new THREE.Group(); hub.position.set(o.x, o.hubY || 0, o.z); add(zone, hub);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(o.colR || 0.8, (o.colR || 0.8) * 1.4, o.colH || 6, 12), std(o.colColor || '#b0bec5', { metalness: 0.5 })); col.position.set(o.x, (o.colH || 6) / 2, o.z); add(zone, col);
    if (o.top) { const tp = o.top(); tp.position.set(o.x, o.colH || 6, o.z); add(zone, tp); }
    cols.push({ min: [o.x - 1.5, 0, o.z - 1.5], max: [o.x + 1.5, o.colH || 6, o.z + 1.5] });
    const arms = [], seats = [];
    for (let k = 0; k < o.n; k++) {
      const arm = new THREE.Group(); arm.rotation.y = k / o.n * Math.PI * 2; hub.add(arm);
      const car = o.car(k); arm.add(car.g); car.seats.forEach(s => seats.push(s)); arms.push({ arm, car: car.g, k });
    }
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], null, o.board[2]), seats, thrill: !!o.thrill, signRot: o.signRot || 0, info: o.info };
    r.update = t => {
      hub.rotation.y = t * o.speed;
      if (o.tilt) { hub.rotation.x = Math.sin(t * 0.5) * o.tilt; hub.rotation.z = Math.cos(t * 0.37) * o.tilt * 0.7; }
      arms.forEach(({ car, k }) => {
        const lift = o.rise ? o.rise * (0.5 + 0.5 * Math.sin(t * (o.riseW || 0.6) + k * 1.3)) : 0;
        const out = o.swing ? o.len + Math.sin(o.swing) * o.chain : o.len;
        car.position.set(out, (o.y || 2) + lift, 0);
        if (o.swing) car.rotation.z = -o.swing * (0.6 + 0.4 * Math.sin(t * 0.3));
        if (o.selfSpin) car.rotation.y = t * o.selfSpin * (k % 2 ? 1 : -1);
      });
    };
    addRide(zone, r);
  }
  // 大擺錘（極速旋風 / 沖天搖擺船）
  function pendulumRide(zone, o) {
    const piv = new THREE.Group(); piv.position.set(o.x, o.h, o.z); piv.rotation.y = o.yaw || 0; add(zone, piv);
    const frame = std('#eceff1', { metalness: 0.5 });
    [-1, 1].forEach(s => [-1, 1].forEach(e => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, o.h * 1.08, 8), frame); leg.position.set(o.x + Math.cos(o.yaw || 0) * e * o.h * 0.22 + Math.sin(o.yaw || 0) * s * (o.w || 3), o.h / 2, o.z - Math.sin(o.yaw || 0) * e * o.h * 0.22 + Math.cos(o.yaw || 0) * s * (o.w || 3)); leg.rotation.z = e * 0.22; leg.rotation.y = o.yaw || 0; add(zone, leg); }));
    cols.push({ min: [o.x - 2, 0, o.z - 2], max: [o.x + 2, 2, o.z + 2] });
    const arm = new THREE.Group(); piv.add(arm);
    mesh(new THREE.BoxGeometry(0.5, o.len, 0.5), std(o.color), 0, -o.len / 2, 0, arm);
    const g = o.gondola(); g.g.position.y = -o.len; arm.add(g.g);
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], null, o.board[2]), seats: g.seats, thrill: true, signRot: o.signRot || 0, info: o.info };
    r.update = t => { const u = t % o.period, amp = o.amp * Math.min(1, u / (o.period * 0.4)) * (u > o.period * 0.85 ? (o.period - u) / (o.period * 0.15) : 1); arm.rotation.z = amp * Math.sin(u * Math.PI * 2 / o.swingT); if (o.spin) g.g.rotation.y = t * o.spin; };
    addRide(zone, r);
  }
  // 跳樓機（海洋深淵）
  function dropTower(zone, o) {
    const tw = new THREE.Mesh(new THREE.BoxGeometry(2.4, o.h, 2.4), std(o.color)); tw.position.set(o.x, o.h / 2, o.z); add(zone, tw);
    cols.push({ min: [o.x - 1.3, 0, o.z - 1.3], max: [o.x + 1.3, o.h, o.z + 1.3] });
    const ring = new THREE.Group(); add(zone, ring);
    mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 20, 1, true), std('#263238', { side: THREE.DoubleSide }), 0, 0, 0, ring);
    const seats = []; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; seats.push(mkSeat(ring, Math.cos(a) * 3.2, -0.6, Math.sin(a) * 3.2, -a + Math.PI / 2)); mesh(new THREE.BoxGeometry(0.7, 1.3, 0.18), std('#212121'), Math.cos(a) * 3.5, -0.1, Math.sin(a) * 3.5, ring).rotation.y = -a + Math.PI / 2; }
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], null, o.board[2]), seats, thrill: true, signRot: o.signRot || 0, info: o.info };
    r.update = t => { const u = t % 24; const y = u < 12 ? 1.5 + u / 12 * (o.h - 6) : u < 15 ? o.h - 4.5 : u < 16.4 ? (o.h - 4.5) - (o.h - 6) * ((u - 15) / 1.4) ** 2 : 1.5; ring.position.set(o.x, Math.max(1.5, y) + (o.base || 0), o.z); };
    addRide(zone, r);
  }
  // U 型穿梭過山車（U型賽車）
  function uShuttle(zone, o) {
    const pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40 * 2 - 1; pts.push(new V3(o.x + u * o.half, o.base + o.h * u * u, o.z)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    add(zone, new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.5, 8, false), std(o.color)));
    for (let k = 0; k <= 10; k++) { const p = curve.getPointAt(k / 10); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, p.y, 6), std('#ffb300')); c.position.set(p.x, p.y / 2, p.z + 1.2); add(zone, c); }
    const car = coasterCar(o.color)(0); add(zone, car.g);
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], null, o.board[2]), seats: car.seats, thrill: true, signRot: o.signRot || 0, info: o.info };
    const tmp = new V3(), tg = new V3();
    r.update = t => { const u = t % 30, amp = u < 22 ? Math.min(0.97, 0.3 + u / 22 * 0.67) : 0.97 * (30 - u) / 8; const s = 0.5 + 0.5 * amp * Math.sin(u * 1.3); curve.getPointAt(s, tmp); curve.getTangentAt(s, tg); car.g.position.copy(tmp); car.g.position.y += 0.6; car.g.lookAt(tmp.x + tg.x, tmp.y + 0.6 + tg.y, tmp.z + tg.z); };
    addRide(zone, r);
  }
  // 模擬器（飛行模擬器）：大堂入面一個會郁嘅座艙
  function simulator(zone, o) {
    const hall = new Batch();
    hall.box(o.x - 14, 0, o.z - 10, o.x + 14, 0.2, o.z + 10, std('#37474f'));
    hall.box(o.x - 14, 0, o.z - 10, o.x + 14, 9, o.z - 9.6, std(o.color)); hall.box(o.x - 14, 0, o.z - 10, o.x - 13.6, 9, o.z + 10, std(o.color)); hall.box(o.x + 13.6, 0, o.z - 10, o.x + 14, 9, o.z + 10, std(o.color));
    hall.box(o.x - 14, 9, o.z - 10, o.x + 14, 9.4, o.z + 10, std('#263238'));
    const scr = new THREE.PlaneGeometry(22, 7); scr.translate(o.x, 5, o.z - 9.5); hall.add(scr, new THREE.MeshBasicMaterial({ color: '#4fc3f7' }));
    add(zone, hall.build()); cols.push(...hall.cols);
    const pod = new THREE.Group(); pod.position.set(o.x, 1.4, o.z + 1); add(zone, pod);
    mesh(new THREE.BoxGeometry(9, 0.5, 5), std('#90a4ae', { metalness: 0.5 }), 0, 0, 0, pod);
    const seats = []; for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) { const x = -3.75 + k * 1.5, z = -1 + row * 1.6; mesh(new THREE.BoxGeometry(1, 0.5, 0.8), std('#c62828'), x, 0.5, z, pod); seats.push(mkSeat(pod, x, 0.3, z, Math.PI)); }
    const r = { name: o.name, en: o.en, color: o.color, board: board(o.board[0], o.board[1], null, o.board[2]), seats, thrill: true, signRot: o.signRot || 0, info: o.info };
    r.update = t => { pod.rotation.set(Math.sin(t * 1.7) * 0.12, Math.sin(t * 0.6) * 0.15, Math.sin(t * 2.3 + 1) * 0.14); pod.position.y = 1.4 + Math.sin(t * 3.1) * 0.25; };
    addRide(zone, r);
  }
  // 室內黑暗遊戲（鐳射射擊車、神秘大宅）：一間大屋，車喺入面行
  function darkRide(zone, o) {
    const B = new Batch(), w = o.w, d = o.d, c = std(o.color), roof = std(o.roof || '#4e342e');
    B.box(o.x - w, 0, o.z - d, o.x + w, o.h, o.z - d + 0.4, c); B.box(o.x - w, 0, o.z + d - 0.4, o.x - 3, o.h, o.z + d, c); B.box(o.x + 3, 0, o.z + d - 0.4, o.x + w, o.h, o.z + d, c);
    B.box(o.x - w, 0, o.z - d, o.x - w + 0.4, o.h, o.z + d, c); B.box(o.x + w - 0.4, 0, o.z - d, o.x + w, o.h, o.z + d, c);
    B.box(o.x - w - 0.5, o.h, o.z - d - 0.5, o.x + w + 0.5, o.h + 0.6, o.z + d + 0.5, roof);
    if (o.towers) [[-w, -d], [w, -d], [-w, d], [w, d]].forEach(([dx, dz]) => { const t = new THREE.CylinderGeometry(2, 2, o.h + 6, 10); t.translate(o.x + dx, (o.h + 6) / 2, o.z + dz); B.add(t, c); const cn = new THREE.ConeGeometry(2.6, 5, 10); cn.translate(o.x + dx, o.h + 8.5, o.z + dz); B.add(cn, roof); });
    for (let k = 0; k < o.props; k++) { const a = k / o.props * Math.PI * 2; const p = new THREE.IcosahedronGeometry(1.2 + (k % 3) * 0.5, 0); p.translate(o.x + Math.cos(a) * w * 0.35, 1.5 + (k % 4), o.z + Math.sin(a) * d * 0.35); B.add(p, std(PASTEL[k % PASTEL.length], { emissive: PASTEL[k % PASTEL.length], emissiveIntensity: 0.35 })); }
    sign(B, o.x, o.h - 1.2, o.z + d + 0.05, w * 1.4, 1.6, signMat(`${o.name} ${o.en}`, o.color, '#fff', 'bold 40px sans-serif'), '+z');
    add(zone, B.build());
    const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; pts.push([o.x + Math.cos(a) * (w - 4) * (k % 2 ? 0.75 : 1), 0.4, o.z + Math.sin(a) * (d - 4)]); }
    trackRide(zone, { name: o.name, en: o.en, color: o.color, pts, speed: 3, cars: 4, gap: 'even', car: o.car || coasterCar(o.color), board: [o.x, o.z + d + 4], thrill: false, railR: 0.15, supports: false, yawOnly: true, info: o.info });
  }
  const elephant = k => { const g = new THREE.Group(), c = std(['#90caf9', '#f8bbd0', '#fff59d', '#c5e1a5'][k % 4]); mesh(new THREE.SphereGeometry(1.2, 12, 10), c, 0, 0, 0, g).scale.set(1, 0.9, 1.4); mesh(new THREE.SphereGeometry(0.8, 10, 8), c, 0, 0.6, 1.4, g); const tr = mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.2, 8), c, 0, 0.1, 2.1, g); tr.rotation.x = 0.8; [-1, 1].forEach(s => { const e = mesh(new THREE.CircleGeometry(0.8, 12), new THREE.MeshStandardMaterial({ color: c.color, side: THREE.DoubleSide }), s * 0.8, 0.8, 1.2, g); e.rotation.y = s * 1.2; }); return { g, seats: [mkSeat(g, 0, 0.7, -0.2), mkSeat(g, 0, 0.7, -0.9)] }; };
  const chair = k => { const g = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 4), std('#90a4ae'), 0, 3, 0, g); mesh(new THREE.BoxGeometry(0.7, 0.1, 0.6), std(PASTEL[k % 8]), 0, 0, 0, g); return { g, seats: [mkSeat(g, 0, 0.05, 0, Math.PI / 2)] }; };
  const spring = k => { const g = new THREE.Group(); mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 14), std(PASTEL[k % 8]), 0, 0, 0, g); mesh(new THREE.TorusGeometry(1.1, 0.15, 8, 18), std('#ff7043'), 0, 0.4, 0, g).rotation.x = Math.PI / 2; return { g, seats: [mkSeat(g, -0.4, 0.2, 0, Math.PI / 2), mkSeat(g, 0.4, 0.2, 0, Math.PI / 2)] }; };
  const arm4 = k => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(2.6, 0.4, 1.6), std(PASTEL[k % 8]), 0, 0, 0, g); mesh(new THREE.BoxGeometry(2.6, 1.0, 0.15), std('#37474f'), 0, 0.5, -0.8, g); return { g, seats: [mkSeat(g, -0.7, 0.2, 0, Math.PI / 2), mkSeat(g, 0.7, 0.2, 0, Math.PI / 2)] }; };
  const train = k => {
    const g = new THREE.Group();
    if (k === 0) { mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.6, 14), std('#c62828'), 0, 1.3, 0.3, g).rotation.x = Math.PI / 2; mesh(new THREE.BoxGeometry(2, 2.2, 1.6), std('#1b5e20'), 0, 1.6, -1.6, g); mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.2, 10), std('#212121'), 0, 2.6, 1.6, g); return { g, seats: [mkSeat(g, 0, 0.9, -1.6)] }; }
    mesh(new THREE.BoxGeometry(2.2, 0.6, 4.2), std('#795548'), 0, 0.6, 0, g); mesh(new THREE.BoxGeometry(2.3, 0.15, 4.4), std(PASTEL[k % 8]), 0, 2.6, 0, g);
    [[-1, -1.9], [1, -1.9], [-1, 1.9], [1, 1.9]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), std('#ffd54f'), x, 1.7, z, g));
    return { g, seats: [mkSeat(g, -0.5, 0.95, 1.2), mkSeat(g, 0.5, 0.95, 1.2), mkSeat(g, -0.5, 0.95, -0.4), mkSeat(g, 0.5, 0.95, -0.4)] };
  };
  const sleigh = k => { const g = new THREE.Group(), c = std(k % 2 ? '#1565c0' : '#e3f2fd'); mesh(new THREE.BoxGeometry(1.8, 0.7, 2.6), c, 0, 0.6, 0, g); mesh(new THREE.TorusGeometry(0.6, 0.1, 6, 12, Math.PI), std('#b0bec5'), 0, 0.9, 1.3, g); return { g, seats: [mkSeat(g, -0.4, 0.8, 0.5), mkSeat(g, 0.4, 0.8, 0.5), mkSeat(g, -0.4, 0.8, -0.6), mkSeat(g, 0.4, 0.8, -0.6)] }; };
  const boat = k => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(2.2, 0.7, 5), std(PASTEL[k % 8]), 0, 0.2, 0, g); const seats = []; for (let z = -1.6; z <= 1.6; z += 1.1) [-0.5, 0.5].forEach(x => seats.push(mkSeat(g, x, 0.5, z))); return { g, seats }; };

  const glider = k => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(1.2, 0.5, 3), std(PASTEL[k % 8]), 0, 0, 0, g); mesh(new THREE.BoxGeometry(5, 0.1, 1), std('#fafafa'), 0, 0.3, 0.2, g); mesh(new THREE.CylinderGeometry(0.03, 0.03, 10, 4), std('#90a4ae'), 0, 5, 0, g); return { g, seats: [mkSeat(g, 0, 0.1, 0.5), mkSeat(g, 0, 0.1, -0.6)] }; };
  const horse = k => { const g = new THREE.Group(), c = std(['#fafafa', '#ffccbc', '#d1c4e9', '#b3e5fc'][k % 4]); mesh(new THREE.BoxGeometry(0.5, 0.7, 1.5), c, 0, 0, 0, g); mesh(new THREE.BoxGeometry(0.35, 0.7, 0.45), c, 0, 0.45, 0.75, g).rotation.x = -0.4; mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 6), std('#ffd54f', { metalness: 0.8 }), 0, 2.2, 0, g); return { g, seats: [mkSeat(g, 0, 0.2, 0)] }; };
  const balloon = k => { const g = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.9, 0.8, 0.9, 10), std('#8d6e63'), 0, 0, 0, g); const b = mesh(new THREE.SphereGeometry(1.6, 14, 10), std(PASTEL[k % 8]), 0, 3, 0, g); b.scale.y = 1.2; [[-0.7, 0], [0.7, 0]].forEach(([x]) => mesh(new THREE.CylinderGeometry(0.03, 0.03, 2, 4), std('#5d4037'), x, 1.4, 0, g)); return { g, seats: [mkSeat(g, -0.35, 0, 0, Math.PI / 2), mkSeat(g, 0.35, 0, 0, Math.PI / 2)] }; };
  const honeyPot = k => { const g = new THREE.Group(); const pot = mesh(new THREE.CylinderGeometry(1, 0.8, 1.2, 14), std('#ffb300'), 0, 0.6, 0, g); mesh(new THREE.TorusGeometry(0.95, 0.1, 6, 16), std('#e65100'), 0, 1.2, 0, g).rotation.x = Math.PI / 2; void pot; return { g, seats: [mkSeat(g, -0.35, 0.5, 0), mkSeat(g, 0.35, 0.5, 0)] }; };
  const woodRaft = k => { const g = new THREE.Group(); for (let i = -2; i <= 2; i++) mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 8), std('#8d6e4f'), i * 0.5, 0.25, 0, g).rotation.x = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), std('#5d4037'), 0, 1.3, -1.5, g); const seats = []; [-0.6, 0.6].forEach(x => [-0.8, 0.6].forEach(z => seats.push(mkSeat(g, x, 0.5, z)))); return { g, seats }; };
  // ---------- 迪士尼樂園：加多 11 個 ----------
  {
    const Z = 'disney', D = DISNEY;
    // 樂園火車（圍住成個樂園行一圈）
    const rr = 16, a0 = D.x0 + 10, a1 = D.x1 - 10, b0 = D.z0 + 6, b1 = D.z1 - 8, pts = [];
    [[a0 + rr, b0 + rr, Math.PI], [a1 - rr, b0 + rr, -Math.PI / 2], [a1 - rr, b1 - rr, 0], [a0 + rr, b1 - rr, Math.PI / 2]].forEach(([cx2, cz2, st]) => { for (let k = 0; k <= 4; k++) { const a = st + k / 4 * Math.PI / 2; pts.push([cx2 + Math.cos(a) * rr, 0.25, cz2 + Math.sin(a) * rr]); } });
    trackRide(Z, { name: '樂園鐵路', en: 'Park Railroad', color: '#1b5e20', pts, speed: 6, cars: 5, gap: 5, car: train, board: [a0 + 30, b0 + 6], thrill: false, railR: 0.12, railColor: '#5d4037', supports: false, yawOnly: true, info: '蒸汽火車圍住成個樂園行一圈' });
    spinRide(Z, { name: '飛天小象旋轉世界', en: 'Flying Baby Elephants', color: '#5c6bc0', x: -1830, z: 1765, n: 8, len: 6, y: 2.5, rise: 4, colH: 7, car: elephant, speed: 0.6, board: [-1830, 1780], info: '坐住大笨象轉圈，可以飛高飛低', top: () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), std('#ffca28', { metalness: 0.6 })); return m; } });
    spinRide(Z, { name: '轉轉彈簧狗', en: 'Spinning Spring Dog', color: '#ff7043', x: -1530, z: 1765, n: 6, len: 5, y: 1.2, rise: 0.8, riseW: 2.5, colH: 3, car: spring, speed: 0.8, selfSpin: 1.2, board: [-1530, 1778], info: '一路轉一路彈上彈落' });
    uShuttle(Z, { name: '沖天遙控車', en: 'U-Track Racer', color: '#ef6c00', x: -1400, z: 1760, half: 32, base: 1, h: 26, board: [-1400, 1772], info: '喺 U 型路軌前後衝上 26 米高' });
    simulator(Z, { name: '超級英雄飛行之旅', en: 'Superhero Flight Simulator', color: '#455a64', x: -1360, z: 1960, board: [-1360, 1974], info: '坐喺座艙睇大畫面，座位會跟住震' });
    darkRide(Z, { name: '微型英雄射擊車', en: 'Tiny Heroes Laser Battle', color: '#3949ab', roof: '#1a237e', x: -1500, z: 1955, w: 18, d: 13, h: 9, props: 10, info: '坐車入屋，用鐳射槍射目標' });
    darkRide(Z, { name: '迷離大宅', en: 'Mystic Mansion', color: '#6d4c41', roof: '#3e2723', x: -1860, z: 2095, w: 16, d: 20, h: 10, props: 12, towers: true, info: '坐車遊神秘大宅，入面啲嘢會郁' });
    darkRide(Z, { name: '小小世界水路之旅', en: 'Small World Boat Ride', color: '#ec407a', roof: '#ad1457', x: -1700, z: 1765, w: 20, d: 14, h: 9, props: 14, car: boat, info: '坐船睇世界各地嘅公仔同風景' });
    // 冰雪世界：雪山 + 雪橇過山車 + 冰雪船河
    const sm = new THREE.Mesh(new THREE.ConeGeometry(18, 24, 10), std('#e3f2fd')); sm.position.set(-1835, 12, 2235); add(Z, sm);
    cols.push({ min: [-1847, 0, 2223], max: [-1823, 18, 2247] });
    const sp = []; for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; sp.push([-1835 + Math.cos(a) * 28, 1.5 + 6 * Math.max(0, Math.sin(a * 2)), 2235 + Math.sin(a) * 22]); }
    trackRide(Z, { name: '雪嶺滑雪橇', en: 'Snowy Sleigh Coaster', color: '#1565c0', pts: sp, speed: 'coaster', cars: 4, gap: 3, car: sleigh, board: [-1835, 2205], thrill: true, railColor: '#bbdefb', info: '適合一家大細嘅雪橇過山車' });
    const bp = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; bp.push([-1770 + Math.cos(a) * 18, 0.35 + (k >= 3 && k <= 5 ? [2.5, 4.5, 2][k - 3] : 0), 2265 + Math.sin(a) * 9]); }
    { const ramp = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 4), std('#e3f2fd')); ramp.position.set(-1770 - 6, 2, 2265 + 8); add(Z, ramp); }
    const bw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp.map(p => new V3(p[0], 0, p[2])), true), 60, 3, 4, true), MAT.water); bw.scale.y = 0.02; bw.position.y = 0.05; add(Z, bw);
    trackRide(Z, { name: '冰雪奇幻之旅', en: 'Ice Kingdom Boat Ride', color: '#0277bd', pts: bp, speed: 2.5, cars: 3, gap: 'even', car: boat, board: [-1770, 2250], thrill: false, rail: false, yawOnly: true, info: '坐船穿過冰雪世界' });
  }

  // ---------- 海洋公園：加多 7 個 ----------
  {
    const Z = 'ocean';
    pendulumRide(Z, { name: '翻天覆地', en: 'The Flash (22 m, 3.9G)', color: '#e53935', x: 2190, z: 3870, h: 22, len: 19, amp: 2.2, period: 40, swingT: 5, w: 3, spin: 1.2, gondola: () => { const g = new THREE.Group(); mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.6, 24), std('#ffca28'), 0, 0, 0, g); const seats = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; seats.push(mkSeat(g, Math.cos(a) * 3.6, 0.3, Math.sin(a) * 3.6, -a - Math.PI / 2)); } return { g, seats }; }, board: [2190, 3885], info: '大擺錘一路轉一路盪到幾乎打橫！' });
    pendulumRide(Z, { name: '沖天搖擺船', en: 'Crazy Swinging Ship (45°)', color: '#6d4c41', x: 1975, z: 3880, yaw: Math.PI / 2, h: 16, len: 13, amp: 0.8, period: 36, swingT: 4.5, w: 2, gondola: () => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(3.2, 1.6, 14), std('#8d6e63'), 0, 0, 0, g); mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), std('#5d4037'), 0, 3, 0, g); const s = mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshStandardMaterial({ color: '#fafafa', side: THREE.DoubleSide }), 0, 4, 0, g); s.rotation.y = Math.PI / 2; const seats = []; for (let z = -5.5; z <= 5.5; z += 1.6) [-0.8, 0.8].forEach(x => seats.push(mkSeat(g, x, 0.6, z, Math.PI / 2))); return { g, seats }; }, board: [1995, 3880], signRot: Math.PI / 2, info: '海盜船前後盪到好高' });
    spinRide(Z, { name: '超速旋風', en: 'Flying Glider (30 m)', color: '#1e88e5', x: 2470, z: 3780, n: 6, len: 8, chain: 10, swing: 0.9, y: 6, rise: 18, riseW: 0.25, colH: 32, hubY: 6, tilt: 0.3, car: glider, speed: 0.9, thrill: true, board: [2470, 3797], info: '滑翔機升到 30 米高，一路轉一路飛', top: () => new THREE.Mesh(new THREE.ConeGeometry(4, 3, 12), std('#1565c0')) });
    spinRide(Z, { name: '飛天鞦韆', en: 'Flying Swing', color: '#00897b', x: 2470, z: 4010, n: 16, len: 6, chain: 6, swing: 0.8, y: 7, colH: 12, hubY: 4, car: chair, speed: 1.1, thrill: true, board: [2470, 4024], info: '飛椅轉得越快就飛得越出', top: () => new THREE.Mesh(new THREE.ConeGeometry(7, 3, 16), std('#26a69a')) });
    spinRide(Z, { name: '狂野龍捲風', en: 'Wild Twister (3-axis 4G)', tilt: 0.6, color: '#8e24aa', x: 2300, z: 3975, n: 4, len: 7, y: 3, rise: 6, riseW: 1.4, colH: 6, car: arm4, speed: 1.6, selfSpin: 2, thrill: true, board: [2300, 3990], info: '四隻手臂一路轉一路自轉，好刺激' });
    const ap = []; for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; ap.push([2160 + Math.cos(a) * 24, 1.5 + 5 * Math.max(0, Math.sin(a * 3)), 4060 + Math.sin(a) * 16]); }
    trackRide(Z, { name: '極地時速', en: 'Arctic Coaster', color: '#0288d1', pts: ap, speed: 'coaster', cars: 3, gap: 3, car: sleigh, board: [2160, 4040], thrill: true, railColor: '#e1f5fe', info: '喺冰雪世界穿梭嘅家庭過山車' });
    const ep = [[1925, 1.2, 3760], [1925, 1.2, 4150], [1932, 1.2, 4160], [1932, 1.2, 3750]];
    trackRide(Z, { name: '海洋列車', en: 'Ocean Express', color: '#00acc1', pts: ep, speed: 9, cars: 4, gap: 5, car: k => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(2.6, 2.6, 4.6), std(k % 2 ? '#00acc1' : '#e0f7fa'), 0, 1.5, 0, g); mesh(new THREE.BoxGeometry(2.62, 0.8, 4), new THREE.MeshStandardMaterial({ color: '#80deea', transparent: true, opacity: 0.6 }), 0, 2.1, 0, g); return { g, seats: [mkSeat(g, -0.6, 0.6, 1), mkSeat(g, 0.6, 0.6, 1), mkSeat(g, -0.6, 0.6, -1), mkSeat(g, 0.6, 0.6, -1)] }; }, board: [1945, 3770], thrill: false, railR: 0.15, supports: false, yawOnly: true, info: '由海濱樂園去高峰樂園嘅列車' });
  }


  // ===== 海洋公園：再加 7 個（跟官方清單）=====
  {
    const Z = 'ocean';
    pendulumRide(Z, { name: '雷霆節拍', en: 'Thunder Beat Swing', color: '#6a1b9a', x: 2470, z: 3870, h: 14, len: 11, amp: 1.6, period: 40, swingT: 6, w: 2.5, spin: 1.6, gondola: () => { const g = new THREE.Group(); mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.5, 20), std('#ab47bc'), 0, 0, 0, g); const seats = []; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; seats.push(mkSeat(g, Math.cos(a) * 2.8, 0.25, Math.sin(a) * 2.8, -a - Math.PI / 2)); } return { g, seats }; }, board: [2470, 3886], info: '大圓盤一路轉一路盪，跟住節拍好刺激' });
    // 橫衝直撞（碰碰車）
    { const x0 = 2350, z0 = 3765, Bb = new Batch();
      Bb.box(x0 - 13, 0, z0 - 9, x0 + 13, 0.12, z0 + 9, std('#37474f'), false);
      [[-13, -9, 13, -8.7], [-13, -9, -12.7, 9], [12.7, -9, 13, 9], [-13, 8.7, -2, 9], [2, 8.7, 13, 9]].forEach(([a, b, c, d]) => Bb.box(x0 + a, 0, z0 + b, x0 + c, 0.8, z0 + d, std('#ffca28')));
      Bb.box(x0 - 13, 4.6, z0 - 9, x0 + 13, 4.8, z0 + 9, std('#263238'), false);
      [[-13, -9], [13, -9], [-13, 9], [13, 9]].forEach(([a, b]) => Bb.box(x0 + a - 0.2, 0, z0 + b - 0.2, x0 + a + 0.2, 4.6, z0 + b + 0.2, std('#90a4ae')));
      add(Z, Bb.build()); cols.push(...Bb.cols);
      const cars = [], seats = [];
      for (let k = 0; k < 10; k++) { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(1.5, 0.5, 2), std(PASTEL[k % 8]), 0, 0.35, 0, g); mesh(new THREE.TorusGeometry(1.1, 0.15, 6, 16), std('#212121'), 0, 0.3, 0, g).rotation.x = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 4), std('#bdbdbd'), 0, 2.5, -0.8, g); add(Z, g); cars.push({ g, k, last: null }); seats.push(mkSeat(g, 0, 0.4, 0.1)); }
      const r = { name: '橫衝直撞', en: 'Bumper Cars', color: '#f57f17', board: board(x0, z0 + 11), seats, thrill: false, info: '碰碰車撞嚟撞去' };
      r.update = t => cars.forEach(c => { const x = x0 + 10.5 * Math.sin(t * 0.37 * (1 + c.k * 0.07) + c.k * 1.7), z = z0 + 6.5 * Math.sin(t * 0.53 * (1 + c.k * 0.05) + c.k * 2.3); if (c.last) { const dx = x - c.last[0], dz = z - c.last[1]; if (dx * dx + dz * dz > 1e-6) c.g.rotation.y = Math.atan2(dx, dz); } c.last = [x, z]; c.g.position.set(x, 0, z); });
      addRide(Z, r); }
    spinRide(Z, { name: '幻彩旋轉馬', en: 'Magic Carousel', color: '#ec407a', x: 2105, z: 3850, n: 12, len: 5, y: 1.3, rise: 0.5, riseW: 1.8, colH: 6, car: horse, speed: -0.45, board: [2105, 3862], info: '彩色木馬轉圈圈', top: () => new THREE.Mesh(new THREE.ConeGeometry(7, 2.6, 20), std('#f06292')) });
    spinRide(Z, { name: '昇空奇遇', en: 'Balloon Rise', color: '#29b6f6', x: 2255, z: 3905, n: 8, len: 4, y: 2, rise: 7, riseW: 0.45, colH: 11, car: balloon, speed: 0.35, board: [2255, 3916], info: '坐熱氣球慢慢升高轉圈' });
    { const pond = new THREE.Mesh(new THREE.CircleGeometry(10, 32), MAT.water); pond.rotation.x = -Math.PI / 2; pond.position.set(1985, 0.06, 4000); add(Z, pond); }
    spinRide(Z, { name: '環迴水世界', en: 'Round-the-World Water Ride', color: '#00838f', x: 1985, z: 4000, n: 6, len: 6, y: 0.4, rise: 0.4, riseW: 1.5, colH: 4, car: boat, speed: 0.4, selfSpin: 0.6, board: [1985, 4013], info: '坐船喺水上轉圈' });
    { const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; pts.push([2450 + Math.cos(a) * 22, 0.3, 4115 + Math.sin(a) * 12]); }
      trackRide(Z, { name: '砵砵火車頭', en: 'Toot Toot Train', color: '#e53935', pts, speed: 3, cars: 4, gap: 5, car: train, board: [2450, 4100], thrill: false, railR: 0.12, railColor: '#5d4037', supports: false, yawOnly: true, info: '細細架火車，啱小朋友' }); }
    // 熱帶激流：橋上有遊客用水槍射你
    { const bx = 2130, bz = 3960, Bb = new Batch(); Bb.box(bx - 6, 4, bz - 1.2, bx + 6, 4.3, bz + 1.2, std('#8d6e63')); [-6, 6].forEach(d => Bb.box(bx + d - 0.3, 0, bz - 0.3, bx + d + 0.3, 4, bz + 0.3, std('#6d4c41'))); [-1.2, 1.2].forEach(d => Bb.box(bx - 6, 4.3, bz + d - 0.05, bx + 6, 5.2, bz + d + 0.05, std('#a1887f'), false)); add(Z, Bb.build());
      const jets = [-3, 0, 3].map(d => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 4, 8), new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.6 })); j.position.set(bx + d, 2.2, bz); add(Z, j); const gun = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), std('#ffca28')); gun.position.set(bx + d, 4.6, bz + 0.9); add(Z, gun); return j; });
      updaters.push((dt, t) => jets.forEach((j, i) => { j.visible = Math.sin(t * 2.2 + i * 2) > 0.3; })); }
  }

  // ===== 迪士尼：再加小熊蜜糖歷險之旅 + 往樹屋小島嘅木筏 =====
  {
    const Z = 'disney';
    darkRide(Z, { name: '小熊蜜糖歷險之旅', en: 'Honey Bear Adventure', color: '#f9a825', roof: '#e65100', x: -1360, z: 1880, w: 16, d: 12, h: 8, props: 10, car: honeyPot, info: '坐蜜糖罐車跟小熊去冒險' });
    const tx = -1660, tz = 2250;
    { const Bb = new Batch(); const trunk = new THREE.CylinderGeometry(2, 2.6, 14, 10); trunk.translate(tx, 7, tz); Bb.add(trunk, std('#6d4c41'));
      const leaf = new THREE.IcosahedronGeometry(7, 1); leaf.translate(tx, 20, tz); Bb.add(leaf, std('#2e7d32'));
      Bb.box(tx - 4, 10, tz - 4, tx + 4, 10.3, tz + 4, std('#8d6e63')); Bb.box(tx - 2.5, 10.3, tz - 2.5, tx + 2.5, 13, tz + 2.5, std('#a1887f'), false);
      for (let k = 0; k < 10; k++) Bb.box(tx + 2.2, k, tz + 2.6, tx + 2.8, k + 0.08, tz + 2.7, std('#5d4037'), false);
      Bb.cols.push({ min: [tx - 2.3, 0, tz - 2.3], max: [tx + 2.3, 10, tz + 2.3] });
      sign(Bb, tx, 3.2, tz + 2.65, 4.5, 0.8, signMat('🌳 樹屋 Treehouse', '#2e7d32'), '+z');
      add(Z, Bb.build()); cols.push(...Bb.cols); }
    inter.push({ pos: new V3(tx + 2.5, 0, tz + 3.6), r: 2, label: () => '🪜 爬上樹屋', act: () => { api.sfx.click(); api.teleport(tx, 10.35, tz + 2.8); api.say('Welcome to the treehouse! You can see the whole jungle from here.', '歡迎嚟到樹屋！喺度望到成個森林。', { force: true }); } });
    inter.push({ pos: new V3(tx, 10.3, tz + 3), r: 1.5, label: () => '🪜 落返地面', act: () => api.teleport(tx + 2.5, 0.1, tz + 4.2) });
    { const wch = new THREE.Mesh(new THREE.PlaneGeometry(9, 36), MAT.water); wch.rotation.x = -Math.PI / 2; wch.position.set(tx + 20, 0.07, tz - 26); add(Z, wch); }
    const rp = [[tx + 18, 0.3, tz - 42], [tx + 18, 0.3, tz - 10], [tx + 22, 0.3, tz - 10], [tx + 22, 0.3, tz - 42]];
    trackRide(Z, { name: '往樹屋小島木筏', en: 'Raft to Treehouse Island', color: '#795548', pts: rp, speed: 2.2, cars: 2, gap: 'even', car: woodRaft, board: [tx + 20, tz - 46], thrill: false, rail: false, yawOnly: true, info: '坐木筏過河去樹屋小島' });
  }

  // =====================================================================
  // 聖塔莫尼卡（Santa Monica）：柏熙酒店後面——海、沙灘、碼頭遊樂場、海邊公園、第三街步行街
  // 由南（海）向北：海 z<-262｜沙灘 -262..-214｜棕櫚樹公園 -214..-206｜Ocean Ave -206..-196｜步行街 -192..-154
  // =====================================================================
  {
    const Z = 'santa', DY = 2.4;   // 碼頭面高度
    const rnd = (() => { let s = 20261118; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    const B = new Batch();
    const sandM = std('#f3dfb0', { roughness: 1 }), grassM = std('#7cb342'), roadM = std('#424242'), walkM = std('#bdbdbd'), brickM = std('#c9a27e');
    const flat = (x0, z0, x1, z1, y, m) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, m); };
    flat(-250, -262, 380, -214, 0.03, sandM);
    flat(-250, -214, 380, -206, 0.04, grassM);
    flat(-250, -206, 380, -196, 0.04, roadM);
    for (let x = -246; x < 380; x += 8) flat(x, -201.2, x + 4, -200.8, 0.05, std('#ffd600'));
    flat(-250, -196, 380, -192, 0.05, walkM);
    flat(150, -180, 380, -166, 0.05, brickM);
    flat(-250, -228, 380, -224, 0.05, std('#616161'));   // 單車徑（The Strand）
    for (let x = -248; x < 380; x += 6) flat(x, -226.1, x + 3, -225.9, 0.06, std('#fafafa'));
    // 海（同埋浪花）
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(630, 40), MAT.water); sea.rotation.x = -Math.PI / 2; sea.position.set(65, 0.05, -282); add(Z, sea);
    const foam = [0, 1, 2].map(k => { const f = new THREE.Mesh(new THREE.PlaneGeometry(630, 0.9), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })); f.rotation.x = -Math.PI / 2; f.position.set(65, 0.07, -262); add(Z, f); return f; });
    updaters.push((dt, t) => foam.forEach((f, k) => { const u = ((t * 0.12 + k / 3) % 1); f.position.z = -278 + u * 17; f.material.opacity = 0.75 * Math.sin(u * Math.PI); }));
    // 棕櫚樹
    const trunkM = std('#8d6e63'), frondM = std('#2e7d32', { side: THREE.DoubleSide });
    const palm = (x, z, h) => {
      const t = new THREE.CylinderGeometry(0.2, 0.32, h, 7); t.translate(x, h / 2, z); B.add(t, trunkM);
      for (let k = 0; k < 8; k++) { const f = new THREE.BoxGeometry(0.6, 0.06, 3.4); f.translate(0, 0, 1.7); f.rotateX(0.5); f.rotateY(k / 8 * Math.PI * 2); f.translate(x, h, z); B.add(f, frondM); }
      B.cols.push({ min: [x - 0.3, 0, z - 0.3], max: [x + 0.3, h, z + 0.3] });
    };
    for (let x = -246; x < 380; x += 9) if (x < 34 || x > 66) palm(x, -210, 10 + (Math.abs(x) % 4));
    for (let x = 152; x < 380; x += 24) palm(x, -194, 9);
    for (let x = -244; x < 380; x += 27) if (x < 30 || x > 70) { B.box(x - 1, 0, -213, x + 1, 0.45, -212.4, std('#6d4c41')); }   // 長櫈
    // 救生員塔（每座唔同顏色）
    [[-210, '#4fc3f7'], [-130, '#ffb74d'], [-50, '#f06292'], [110, '#aed581'], [190, '#ba68c8'], [280, '#ffd54f'], [350, '#4db6ac']].forEach(([x, c], i) => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B.box(x + a * 1.1 - 0.1, 0, -248 + b * 1.1 - 0.1, x + a * 1.1 + 0.1, 1.6, -248 + b * 1.1 + 0.1, std('#eceff1')));
      B.box(x - 1.6, 1.6, -249.6, x + 1.6, 3.8, -246.4, std(c));
      B.box(x - 1.8, 3.8, -249.8, x + 1.8, 4.0, -246.2, std('#eceff1'), false);
      B.box(x - 1.4, 2.5, -249.65, x + 1.4, 3.4, -249.6, std('#263238'), false);
      sign(B, x, 3.0, -246.38, 1.6, 0.7, signMat(String(20 + i * 3), '#fff', '#c62828'), '+z');
      const rp = new THREE.BoxGeometry(1, 0.1, 3.4); rp.rotateX(-0.5); rp.translate(x, 0.8, -244.9); B.add(rp, std('#eceff1'));
    });
    inter.push({ pos: new V3(110, 0, -244), r: 3, label: () => '🏊 問救生員', act: () => api.say('Hi! I am a lifeguard. Always swim near the lifeguard tower and never swim alone.', '你好！我係救生員。游水要喺救生員塔附近，唔好自己一個游。', { force: true }) });
    // 沙灘排球場
    [-175, -150].forEach(x => { [-1, 1].forEach(s => B.box(x + s * 5 - 0.08, 0, -236.1, x + s * 5 + 0.08, 2.4, -235.9, std('#eceff1'))); B.box(x - 5, 1.6, -236.02, x + 5, 2.4, -235.98, std('#fafafa', { transparent: true, opacity: 0.6 }), false); });
    // 太陽傘 + 毛巾
    for (let k = 0; k < 40; k++) { const x = -240 + rnd() * 610, z = -258 + rnd() * 18; if (x > 26 && x < 74) continue; if (x > 80 && x < 165 && z > -256) continue;
      const c = PASTEL[k % 8]; const pole = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5); pole.translate(x, 1.2, z); B.add(pole, std('#eceff1'));
      const top = new THREE.ConeGeometry(1.6, 0.7, 10); top.translate(x, 2.5, z); B.add(top, std(c)); flat(x - 0.5, z + 0.4, x + 0.5, z + 2.2, 0.06, std(PASTEL[(k + 3) % 8])); }
    // Muscle Beach 健身場（碼頭南邊）
    { const mx = 92, mz = -234; flat(mx - 10, mz - 6, mx + 10, mz + 6, 0.06, std('#e6c98f'));
      B.box(mx - 6, 0, mz - 0.1, mx - 5.8, 4, mz + 0.1, std('#455a64')); B.box(mx + 1.8, 0, mz - 0.1, mx + 2, 4, mz + 0.1, std('#455a64')); B.box(mx - 6, 3.9, mz - 0.1, mx + 2, 4.1, mz + 0.1, std('#455a64'));
      for (let k = 0; k < 4; k++) { const rg = new THREE.TorusGeometry(0.22, 0.04, 6, 14); rg.translate(mx - 5 + k * 2, 2.3, mz); B.add(rg, std('#ffca28')); const rp = new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4); rp.translate(mx - 5 + k * 2, 3.2, mz); B.add(rp, std('#9e9e9e')); }
      [[5, -3], [5, -1.8]].forEach(([dx, dz]) => B.box(mx + dx, 1.1, mz + dz - 0.04, mx + dx + 3, 1.2, mz + dz + 0.04, std('#78909c'), false));
      [5, 8].forEach(dx => [-3, -1.8].forEach(dz => B.box(mx + dx - 0.05, 0, mz + dz - 0.05, mx + dx + 0.05, 1.1, mz + dz + 0.05, std('#78909c'))));
      sign(B, mx - 2, 4.8, mz + 0.12, 7, 1, signMat('MUSCLE BEACH 健身沙灘', '#37474f', '#ffd54f'), '+z');
      inter.push({ pos: new V3(mx - 2, 0, mz + 2), r: 4, label: () => '💪 吊環做運動', act: () => { api.sfx.click(); api.say('Muscle Beach! Hold the rings and swing. Exercise makes you strong.', '健身沙灘！捉住吊環盪吓，做運動會令你強壯。', { force: true }); } }); }
    // 沙灘遊戲場（鞦韆、滑梯、旋轉盤、攀爬架）
    { const px = 140, pz = -242; flat(px - 22, pz - 12, px + 22, pz + 12, 0.065, std('#ffcc80'));
      sign(B, px, 3.6, pz + 12, 9, 1.2, signMat('BEACH PLAYGROUND 沙灘遊戲場', '#ef6c00', '#fff'), '+z'); B.box(px - 4.6, 0, pz + 11.9, px - 4.4, 3, pz + 12.1, std('#795548')); B.box(px + 4.4, 0, pz + 11.9, px + 4.6, 3, pz + 12.1, std('#795548'));
      // 攀爬架（半球）
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e53935', wireframe: true })); dome.position.set(px + 14, 0.05, pz - 6); add(Z, dome);
      // 蹺蹺板（自己郁）
      const ss = new THREE.Group(); ss.position.set(px + 14, 0.6, pz + 6); add(Z, ss); mesh(new THREE.BoxGeometry(5, 0.15, 0.4), std('#43a047'), 0, 0, 0, ss); B.box(px + 13.8, 0, pz + 5.8, px + 14.2, 0.6, pz + 6.2, std('#795548'));
      updaters.push((dt, t) => { ss.rotation.z = Math.sin(t * 1.6) * 0.2; });
      pendulumRide(Z, { name: '沙灘鞦韆', en: 'Beach Swings', color: '#1e88e5', x: px - 13, z: pz - 2, yaw: Math.PI / 2, h: 3.2, len: 2.4, amp: 0.8, period: 24, swingT: 2.6, w: 1.6, gondola: () => { const g = new THREE.Group(); const seats = []; [-0.6, 0.6].forEach(x => { mesh(new THREE.BoxGeometry(0.7, 0.08, 0.4), std('#ffca28'), x, 0, 0, g); seats.push(mkSeat(g, x, 0.05, 0, Math.PI / 2)); }); return { g, seats }; }, board: [px - 13, pz + 4], info: '盪鞦韆，越盪越高' });
      { const sx = px - 2, sz = pz - 4;   // 滑梯：爬梯上去、滑落嚟
        const pts = [[sx - 3, 0.4, sz], [sx - 3, 3.2, sz - 0.3], [sx - 2.4, 3.3, sz - 0.6], [sx, 2.2, sz - 0.6], [sx + 3, 0.6, sz - 0.6], [sx + 3.6, 0.4, sz], [sx + 1, 0.4, sz + 1.2]];
        const sl = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 1.1), std('#fdd835')); sl.position.set(sx + 0.5, 1.9, sz - 0.6); sl.rotation.z = -0.42; add(Z, sl);
        B.box(sx - 3.6, 0, sz - 1.2, sx - 2.4, 3.2, sz - 1.0, std('#1e88e5'), false); B.box(sx - 3.6, 3.0, sz - 1.2, sx - 2.0, 3.2, sz + 0.2, std('#1e88e5'), false);
        trackRide(Z, { name: '沙灘滑梯', en: 'Beach Slide', color: '#fdd835', pts, speed: 'coaster', cars: 1, gap: 1, car: k => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.6, 0.1, 0.8), std('#ff7043'), 0, 0.1, 0, g); return { g, seats: [mkSeat(g, 0, 0.1, 0)] }; }, board: [sx + 1, pz + 6], thrill: false, rail: false, info: '爬上去再滑落嚟，好好玩' }); }
      spinRide(Z, { name: '沙灘旋轉盤', en: 'Merry-Go-Round', color: '#8e24aa', x: px + 4, z: pz + 4, n: 4, len: 1.2, y: 0.35, colH: 1.2, colR: 0.15, car: k => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), std(PASTEL[k]), 0.2, 0, 0, g); return { g, seats: [mkSeat(g, 0.4, 0.05, 0, Math.PI / 2)] }; }, speed: 1.2, board: [px + 4, pz + 8], info: '轉呀轉，唔好暈呀', top: () => new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.12, 20), std('#ab47bc')) }); }

    // ---------- 碼頭（Pier）----------
    const woodM = std('#a1887f'), pileM = std('#6d4c41'), railM = std('#eceff1');
    B.box(30, DY - 0.3, -300, 70, DY, -214, woodM);
    for (let x = 32; x <= 68; x += 9) for (let z = -298; z <= -216; z += 8) if (z < -230 || z > -222) B.box(x - 0.3, 0, z - 0.3, x + 0.3, DY - 0.3, z + 0.3, pileM);
    B.box(29.8, DY, -300, 30.1, DY + 1.1, -214, railM); B.box(69.9, DY, -300, 70.2, DY + 1.1, -214, railM); B.box(30, DY, -300.2, 70, DY + 1.1, -299.9, railM);
    B.box(30, DY, -214.2, 38, DY + 1.1, -213.9, railM); B.box(62, DY, -214.2, 70, DY + 1.1, -213.9, railM);
    for (let i = 1; i <= 8; i++) B.box(38, 0, -206 - i, 62, 0.3 * i, -205 - i, woodM);   // 斜路樓梯（由 Ocean Ave 上碼頭）
    // 入口大牌坊
    [40, 60].forEach(x => B.box(x - 0.4, 0, -206.4, x + 0.4, 9, -205.6, std('#eceff1')));
    B.box(39.6, 7.4, -206.3, 60.4, 9.6, -205.7, std('#0d47a1'), false);
    sign(B, 50, 8.5, -205.66, 20, 2, signMat('SANTA MONICA PIER 聖塔莫尼卡碼頭', '#0d47a1', '#80d8ff', 'bold 46px sans-serif'), '+z');
    sign(B, 50, 8.5, -206.34, 20, 2, signMat('SANTA MONICA PIER 聖塔莫尼卡碼頭', '#0d47a1', '#80d8ff', 'bold 46px sans-serif'), '-z');
    // 66 號公路終點牌
    B.box(49.9, DY, -296.1, 50.1, DY + 3, -295.9, std('#eceff1'));
    sign(B, 50, DY + 3.4, -295.85, 3, 1.4, signMat('ROUTE 66 · END OF THE TRAIL', '#fafafa', '#1a237e', 'bold 34px sans-serif'), '+z');
    inter.push({ pos: new V3(50, DY, -293), r: 3, label: () => '🛣 66 號公路終點', act: () => api.say('This is the end of Route 66. The road goes all the way across America!', '呢度係 66 號公路嘅終點，條路橫跨成個美國！', { force: true }) });
    // 碼頭尾釣魚佬
    for (let k = 0; k < 4; k++) { const x = 34 + k * 3; const g = new THREE.Group(); g.position.set(x, DY, -298.6); add(Z, g); mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.1, 8), std(PASTEL[k + 2]), 0, 0.85, 0, g); mesh(new THREE.SphereGeometry(0.2, 8, 6), std('#ffcc80'), 0, 1.6, 0, g); const rod = mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 4), std('#3e2723'), 0, 1.6, -1.2, g); rod.rotation.x = 1.0; }
    inter.push({ pos: new V3(40, DY, -296), r: 3, label: () => '🎣 同釣魚佬傾偈', act: () => api.say('I am fishing. Today I caught three fish!', '我喺度釣魚，今日釣到三條魚！', { force: true }) });
    // 旋轉木馬館（Hippodrome）
    { const hx = 39, hz = -223;
      B.box(31, DY, -231, 47, DY + 7, -230.6, std('#fff3e0')); B.box(31, DY, -215.4, 47, DY + 7, -215, std('#fff3e0')); B.box(31, DY, -231, 31.4, DY + 7, -215, std('#fff3e0'));
      B.box(46.6, DY, -231, 47, DY + 7, -226, std('#fff3e0')); B.box(46.6, DY, -220, 47, DY + 7, -215, std('#fff3e0'));
      B.box(30.6, DY + 7, -231.4, 47.4, DY + 7.5, -214.6, std('#ef9a9a'), false);
      const rf = new THREE.ConeGeometry(6, 3, 8); rf.translate(hx, DY + 9, hz); B.add(rf, std('#ef5350'));
      sign(B, 47.05, DY + 5.5, hz, 10, 1.3, signMat('CAROUSEL 旋轉木馬館', '#c62828', '#fff'), '+x');
      spinRide(Z, { name: '碼頭旋轉木馬', en: 'Pier Carousel', color: '#c62828', x: hx, z: hz, hubY: DY, n: 10, len: 4.5, y: 1.3, rise: 0.5, riseW: 1.6, colH: DY + 6.5, car: k => { const g = new THREE.Group(), c = std(['#fafafa', '#ffccbc', '#d1c4e9', '#b3e5fc'][k % 4]); mesh(new THREE.BoxGeometry(0.5, 0.7, 1.5), c, 0, 0, 0, g); mesh(new THREE.BoxGeometry(0.35, 0.7, 0.45), c, 0, 0.45, 0.75, g).rotation.x = -0.4; mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.5, 6), std('#ffd54f', { metalness: 0.8 }), 0, 1.6, 0, g); return { g, seats: [mkSeat(g, 0, 0.2, 0)] }; }, speed: -0.45, board: [50, hz, DY], signRot: Math.PI / 2, info: '百年歷史嘅旋轉木馬' }); }
    // 太平洋摩天輪（LED 燈會轉色）
    { const x0 = 64, z0 = -262, R = 11, cy = DY + 12.5;
      const outer = new THREE.Group(); outer.position.set(x0, cy, z0); outer.rotation.y = Math.PI / 2; add(Z, outer);
      const wheel = new THREE.Group(); outer.add(wheel);
      const rims = [-0.7, 0.7].map(z => mesh(new THREE.TorusGeometry(R, 0.25, 8, 60), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff4081', emissiveIntensity: 1 }), 0, 0, z, wheel));
      for (let k = 0; k < 10; k++) { const sp = mesh(new THREE.BoxGeometry(0.15, R * 2, 0.15), std('#eceff1'), 0, 0, 0, wheel); sp.rotation.z = k / 10 * Math.PI; }
      [-1, 1].forEach(s => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, cy - DY + 1, 8), std('#eceff1')); leg.position.set(x0, (cy + DY) / 2, z0 + s * 5); leg.rotation.x = -s * 0.36; add(Z, leg); });
      const cabs = [], seats = [];
      for (let k = 0; k < 20; k++) { const c = new THREE.Group(); add(Z, c); mesh(new THREE.BoxGeometry(1.6, 1.6, 1.4), new THREE.MeshStandardMaterial({ color: ['#ffeb3b', '#ff5252', '#40c4ff', '#69f0ae'][k % 4], transparent: true, opacity: 0.75 }), 0, -1.3, 0, c); seats.push(mkSeat(c, 0, -2.0, 0, Math.PI / 2)); cabs.push({ c, a: k / 20 * Math.PI * 2 }); }
      const r = { name: '太平洋摩天輪', en: 'Pacific Wheel', color: '#e91e63', board: board(58, z0, null, DY), seats, thrill: false, signRot: -Math.PI / 2, info: '喺海上面轉，望到成個沙灘同大海' };
      r.update = t => { const a0 = t * Math.PI * 2 / 90; wheel.rotation.z = a0; cabs.forEach(({ c, a }) => c.position.set(x0, cy + Math.sin(a + a0) * R, z0 - Math.cos(a + a0) * R)); const hue = (t * 0.05) % 1; rims.forEach((m, i) => m.material.emissive.setHSL((hue + i * 0.5) % 1, 1, 0.5)); };
      addRide(Z, r); }
    // 西岸過山車（圍住海盜船）
    { const pts = []; const hs = [3, 6, 11, 9, 5, 4, 7, 4, 2.5, 1.5, 2, 2.5]; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; pts.push([44 + Math.cos(a) * 10, DY + hs[k], -262 + Math.sin(a) * 24]); }
      trackRide(Z, { name: '西岸過山車', en: 'West Coaster', color: '#1976d2', pts, speed: 'coaster', cars: 4, gap: 3, car: coasterCar('#1976d2'), board: [56, -240, DY], thrill: true, railColor: '#eceff1', supportColor: '#90a4ae', signRot: -Math.PI / 2, info: '喺碼頭上面衝上衝落，下面就係大海' }); }
    pendulumRide(Z, { name: '海龍船', en: 'Sea Dragon', color: '#2e7d32', x: 44, z: -262, h: DY + 8, len: 6.5, amp: 0.75, period: 36, swingT: 6, w: 2.2, gondola: () => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(7, 1.4, 2.4), std('#43a047'), 0, 0, 0, g); const hd = mesh(new THREE.ConeGeometry(0.8, 2, 8), std('#ffd54f'), 4, 0.6, 0, g); hd.rotation.z = -Math.PI / 2; const seats = []; for (let i = -2; i <= 2; i++) [-0.6, 0.6].forEach(z => seats.push(mkSeat(g, i * 1.2, 0.5, z))); return { g, seats }; }, board: [44, -290, DY], info: '海龍船前後大力盪' });
    dropTower(Z, { name: '太平洋跳樓機', en: 'Pacific Plunge', color: '#ff7043', x: 64, z: -290, h: 30, base: DY, board: [58, -290, DY] });
    spinRide(Z, { name: '碼頭狂轉機', en: 'Pier Scrambler', color: '#7b1fa2', x: 62, z: -232, hubY: DY, n: 3, len: 4, y: 0.6, colH: 3, car: arm4, speed: 1.1, selfSpin: 1.6, thrill: true, board: [56, -226, DY], info: '轉到頭都暈埋' });
    // 海鷗
    const gulls = []; for (let k = 0; k < 8; k++) { const g = new THREE.Group(); add(Z, g); [-1, 1].forEach(s => { const w = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.3), std('#fafafa'), s * 0.45, 0, 0, g); w.rotation.z = s * 0.25; }); mesh(new THREE.BoxGeometry(0.2, 0.18, 0.5), std('#eeeeee'), 0, 0, 0, g); gulls.push(g); }
    updaters.push((dt, t) => gulls.forEach((g, k) => { const a = t * 0.25 + k * 0.8; g.position.set(50 + Math.cos(a) * (25 + k * 3), 18 + Math.sin(t + k) * 2, -262 + Math.sin(a) * (30 + k * 2)); g.rotation.y = -a; }));
    // 衝浪的人
    const surf = []; for (let k = 0; k < 4; k++) { const g = new THREE.Group(); add(Z, g); mesh(new THREE.BoxGeometry(0.6, 0.1, 2.2), std(PASTEL[k]), 0, 0, 0, g); mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 8), std('#212121'), 0, 0.6, 0, g); mesh(new THREE.SphereGeometry(0.18, 8, 6), std('#ffcc80'), 0, 1.25, 0, g); surf.push(g); }
    updaters.push((dt, t) => surf.forEach((g, k) => { const u = ((t * 0.05 + k * 0.27) % 1); g.position.set(-200 + k * 110, 0.15 + Math.sin(t * 2 + k) * 0.15, -292 + u * 26); g.rotation.z = Math.sin(t * 1.3 + k) * 0.15; }));
    // 單車徑上嘅單車
    const bikes = []; for (let k = 0; k < 6; k++) { const g = new THREE.Group(); add(Z, g); [-0.5, 0.5].forEach(z => mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 12), std('#212121'), 0, 0.35, z, g).rotation.y = Math.PI / 2); mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 8), std(PASTEL[k + 1]), 0, 1.2, 0, g); mesh(new THREE.SphereGeometry(0.18, 8, 6), std('#ffcc80'), 0, 1.85, 0, g); bikes.push(g); }
    updaters.push((dt, t) => bikes.forEach((g, k) => { const dir = k % 2 ? 1 : -1, u = ((t * 0.012 * (1 + k * 0.1) + k / 6) % 1); g.position.set(dir > 0 ? -248 + u * 626 : 378 - u * 626, 0.05, dir > 0 ? -227 : -225); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }));

    // ---------- 第三街步行街（Third Street Promenade）----------
    const SHOPS = [['SURF SHOP', '衝浪用品', '#0288d1'], ['ICE CREAM', '雪糕店', '#f06292'], ['BOOKS', '書店', '#6d4c41'], ['CAFÉ', '咖啡店', '#795548'], ['SHOES', '鞋舖', '#455a64'], ['TOYS', '玩具店', '#ef6c00'], ['SUNGLASSES', '太陽眼鏡', '#212121'], ['BURGERS', '漢堡包', '#d84315'], ['CINEMA', '戲院', '#4a148c'], ['SOUVENIRS', '紀念品', '#00897b'], ['PIZZA', '薄餅', '#c62828']];
    const SAY = { 'ICE CREAM': ['One ice cream, please. Strawberry is my favourite!', '唔該一個雪糕，我最鍾意士多啤梨味！', 15], 'BURGERS': ['Can I have a burger and fries, please?', '唔該我要一個漢堡包同薯條。', 30], 'CAFÉ': ['A cup of hot chocolate, please.', '唔該一杯熱朱古力。', 20], 'PIZZA': ['One slice of pizza, please.', '唔該一件薄餅。', 18] };
    const facade = ['#ffe0b2', '#d7ccc8', '#f5f5f5', '#cfd8dc', '#ffccbc', '#e1bee7', '#c8e6c9', '#fff9c4'];
    for (let i = 0; i < 11; i++) for (const side of [0, 1]) {
      const x0 = 150 + i * 20, x1 = x0 + 19.4, h = 7 + ((i * 7 + side * 3) % 4) * 2, s = SHOPS[(i + side * 5) % 11];
      const [z0, z1] = side ? [-166, -154] : [-192, -180];
      B.box(x0, 0, z0, x1, h, z1, std(facade[(i + side) % 8]));
      const fz = side ? z0 - 0.03 : z1 + 0.03, face = side ? '-z' : '+z';
      sign(B, (x0 + x1) / 2, 4.2, fz, 12, 1.4, signMat(`${s[0]}  ${s[1]}`, s[2], '#fff', 'bold 44px sans-serif'), face);
      const aw = new THREE.BoxGeometry(14, 0.12, 2.2); aw.rotateX(side ? 0.25 : -0.25); aw.translate((x0 + x1) / 2, 3.2, side ? z0 - 1.1 : z1 + 1.1); B.add(aw, std(PASTEL[(i * 3 + side) % 8]));
      const win = new THREE.PlaneGeometry(12, 2.2); win.rotateY(side ? Math.PI : 0); win.translate((x0 + x1) / 2, 1.6, side ? z0 - 0.02 : z1 + 0.02); B.add(win, std('#90caf9', { metalness: 0.6, roughness: 0.1 }));
      const sp = SAY[s[0]];
      inter.push({ pos: new V3((x0 + x1) / 2, 0, side ? z0 - 2.5 : z1 + 2.5), r: 3.5, label: () => sp ? `🛍 ${s[1]}（$${sp[2]}）` : `🛍 逛${s[1]}`, act: () => { if (sp) { if (!api.pay(sp[2])) { api.sfx.error(); return api.toast('💸 唔夠錢'); } api.sfx.ding?.(); api.say(sp[0], sp[1], { force: true }); } else api.say(`Welcome to the ${s[0].toLowerCase()}! Have a look around.`, `歡迎光臨${s[1]}！隨便睇吓。`, { force: true }); } });
    }
    // 步行街入口牌
    [-180.5, -165.5].forEach(z => B.box(149.6, 0, z - 0.4, 150.4, 7, z + 0.4, std('#37474f')));
    B.box(149.6, 6, -180.5, 150.4, 7.4, -165.5, std('#37474f'), false);
    sign(B, 149.55, 6.7, -173, 14, 1.2, signMat('3rd STREET PROMENADE 第三街步行街', '#37474f', '#ffd54f', 'bold 40px sans-serif'), '-x');
    // 恐龍植物噴水池
    const jets = [];
    [190, 265, 340].forEach((x, i) => {
      const z = -173; const bs = new THREE.CylinderGeometry(3, 3.2, 0.7, 20); bs.translate(x, 0.35, z); B.add(bs, std('#b0bec5'));
      B.cols.push({ min: [x - 3, 0, z - 3], max: [x + 3, 0.7, z + 3] });
      const wt = new THREE.CircleGeometry(2.8, 20); wt.rotateX(-Math.PI / 2); wt.translate(x, 0.72, z); B.add(wt, MAT.water);
      const gM = std('#33691e'), sc = [1, 0.8, 1.15][i];
      const dino = (geo, dx, dy, dz, rx = 0) => { geo.rotateX(rx); geo.scale(sc, sc, sc); geo.translate(x + dx * sc, 0.7 + dy * sc, z + dz * sc); B.add(geo, gM); };
      dino(new THREE.SphereGeometry(1.2, 10, 8).scale(1, 0.8, 1.6), 0, 1.6, 0);
      dino(new THREE.CylinderGeometry(0.3, 0.45, 2.6, 8), 0, 3.1, 1.3, 0.5);
      dino(new THREE.SphereGeometry(0.5, 8, 6).scale(1, 0.8, 1.4), 0, 4.3, 2.1);
      dino(new THREE.ConeGeometry(0.4, 2.6, 8), 0, 1.6, -2.4, -1.4);
      [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.7], [0.6, -0.7]].forEach(([a, b]) => dino(new THREE.CylinderGeometry(0.22, 0.25, 1.2, 6), a, 0.6, b));
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.6, 6), new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.6 })); j.position.set(x + Math.cos(a) * 2.3, 1.5, z + Math.sin(a) * 2.3); add(Z, j); jets.push(j); }
      inter.push({ pos: new V3(x, 0, z + 4), r: 4, label: () => '🦕 恐龍噴水池', act: () => api.say('Look! A dinosaur made of plants. It is a topiary dinosaur.', '睇吓！一隻用植物整嘅恐龍，叫做 topiary（植物雕塑）。', { force: true }) });
    });
    updaters.push((dt, t) => jets.forEach((j, k) => { const s = 0.6 + 0.4 * Math.sin(t * 3 + k); j.scale.y = s; j.position.y = 0.7 + 0.8 * s; }));
    // 掛喺半空嘅燈串
    const bulbM = new THREE.MeshBasicMaterial({ color: '#fff59d' });
    for (let x = 152; x < 370; x += 10) for (let k = 0; k <= 10; k++) { const u = k / 10, z = -180 + u * 14, y = 6 - Math.sin(u * Math.PI) * 1.2; const b = new THREE.SphereGeometry(0.12, 6, 4); b.translate(x + u * 5, y, z); B.add(b, bulbM); }
    // 長櫈 + 花槽
    for (let x = 160; x < 370; x += 25) { B.box(x - 1, 0, -178.6, x + 1, 0.45, -178, std('#5d4037')); B.box(x - 1, 0, -168, x + 1, 0.45, -167.4, std('#5d4037')); }
    for (let x = 228; x < 370; x += 75) { B.box(x - 1.2, 0, -174.2, x + 1.2, 0.6, -171.8, std('#8d6e63')); const tr = new THREE.IcosahedronGeometry(1.4, 0); tr.translate(x, 2.2, -173); B.add(tr, MAT.leaf); }
    // 街頭表演者
    { const g = new THREE.Group(); g.position.set(228, 0, -176.5); add(Z, g); mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.2, 8), std('#7e57c2'), 0, 0.9, 0, g); mesh(new THREE.SphereGeometry(0.22, 8, 6), std('#8d5524'), 0, 1.75, 0, g); const gt = mesh(new THREE.BoxGeometry(0.9, 0.3, 0.1), std('#a1887f'), 0.1, 1.1, 0.3, g); gt.rotation.z = 0.5; mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.25, 10), std('#212121'), 0.8, 0.12, 0.6, g);
      updaters.push((dt, t) => { g.rotation.y = Math.sin(t * 2) * 0.2; });
      inter.push({ pos: new V3(228, 0, -174.5), r: 3, label: () => '🎸 聽街頭表演（俾 $5）', act: () => { if (!api.pay(5)) return api.toast('💸 唔夠錢'); api.sfx.ding?.(); api.say('Thank you! Here is a happy song for you.', '多謝你！送你一首開心歌。', { force: true }); } }); }
    // 行街嘅人
    const walkers = []; for (let k = 0; k < 18; k++) { const g = new THREE.Group(); add(Z, g); mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.1, 8), std(PASTEL[k % 8]), 0, 0.95, 0, g); mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), std('#37474f'), 0, 0.25, 0, g); mesh(new THREE.SphereGeometry(0.2, 8, 6), std(['#ffcc80', '#8d5524', '#f1c27d', '#c68642'][k % 4]), 0, 1.7, 0, g); walkers.push({ g, k }); }
    updaters.push((dt, t) => walkers.forEach(({ g, k }) => { const sp = 0.012 + (k % 5) * 0.002, u = (t * sp + k * 0.137) % 2, f = u < 1 ? u : 2 - u; const x = 155 + f * 210, z = -178 + (k % 6) * 2.2; g.position.set(x, Math.abs(Math.sin(t * 6 + k)) * 0.05, z); g.rotation.y = u < 1 ? Math.PI / 2 : -Math.PI / 2; }));
    // 歡迎牌
    B.box(-10.2, 0, -195.5, -9.8, 3.6, -195.1, std('#455a64')); B.box(9.8, 0, -195.5, 10.2, 3.6, -195.1, std('#455a64'));
    sign(B, 0, 3.2, -195.0, 20, 1.6, signMat('Welcome to SANTA MONICA 歡迎嚟到聖塔莫尼卡', '#00838f', '#fff', 'bold 40px sans-serif'), '+z');
    sign(B, 0, 3.2, -195.6, 20, 1.6, signMat('Welcome to SANTA MONICA 歡迎嚟到聖塔莫尼卡', '#00838f', '#fff', 'bold 40px sans-serif'), '-z');
    inter.push({ pos: new V3(0, 0, -193), r: 4, label: () => '🌴 聖塔莫尼卡介紹', act: () => api.say('Santa Monica is a beach city in California, USA. It has a famous pier, a big Ferris wheel and a long sandy beach.', '聖塔莫尼卡係美國加州嘅海邊城市，有出名嘅碼頭、大摩天輪同好長嘅沙灘。', { force: true }) });
    add(Z, B.build()); cols.push(...B.cols);
  }

  function update(dt, t, p) {
    const nearD = p.x > DISNEY.x0 - 1200 && p.x < DISNEY.x1 + 1200 && p.z > DISNEY.z0 - 1200 && p.z < DISNEY.z1 + 1200;
    const nearO = p.x > OCEAN.x0 - 1200 && p.x < OCEAN.x1 + 1200 && p.z > OCEAN.z0 - 1200 && p.z < OCEAN.z1 + 1200;
    const nearS = p.x > SANTA.x0 - 1200 && p.x < SANTA.x1 + 1200 && p.z > SANTA.z0 - 1200 && p.z < SANTA.z1 + 1200;
    groups.disney.forEach(o => o.visible = nearD || p.y > 300); groups.ocean.forEach(o => o.visible = nearO || p.y > 300); groups.santa.forEach(o => o.visible = nearS || p.y > 300);
    if (nearD || nearO || nearS) updaters.forEach(f => f(dt, t));
  }
  return { colliders: cols, interactables: inter, update, gate: { disney: new V3((DISNEY.x0 + DISNEY.x1) / 2, 0.1, DISNEY.z0 + 12), ocean: new V3((OCEAN.x0 + OCEAN.x1) / 2, 0.1, OCEAN.z0 + 12), santa: new V3(0, 0.1, -193) } };
}
