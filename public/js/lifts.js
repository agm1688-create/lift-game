// 兩部透明電梯：模型、黃金鋼纜、門、緊急出口、冷氣機、CCTV、碰撞
import * as THREE from 'three';
import * as T from './textures.js';
import { goldMat } from './avatar.js';
import { altOfFloor, MACHINE_ROOM_Y, floorLabel } from './alt.js';
import { LIFT_DEF } from './world.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const steel = std('#cfd3d6', { metalness: 0.9, roughness: 0.3 });
const glass = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.16, metalness: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
const TOP_Y = altOfFloor(10000) + 200;

const ease = u => (1 - Math.cos(Math.PI * u)) / 2;

export function floorAt(L, T) {
  if (T <= L.t0) return L.from;
  if (T >= L.t0 + L.dur) return L.to;
  const e = ease((T - L.t0) / L.dur);
  const g = Math.log(L.from + 1) + (Math.log(L.to + 1) - Math.log(L.from + 1)) * e;
  return Math.exp(g) - 1;
}
export function doorOpenness(L, T) {
  if (T < L.doorStart || T > L.doorEnd) return 0;
  return Math.min(1, (T - L.doorStart) / 1000, (L.doorEnd - T) / 1000);
}
export const isMoving = (L, T) => T > L.t0 && T < L.t0 + L.dur;

function displayCanvas() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { c, tex, last: null };
}
function drawDisplay(d, text, arrow) {
  const key = text + arrow; if (d.last === key) return; d.last = key;
  const g = d.c.getContext('2d');
  g.fillStyle = '#100'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ff4b2b'; g.font = 'bold 64px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText((arrow || ' ') + ' ' + text, 128, 52);
  d.tex.needsUpdate = true;
}

export function buildLifts(scene, api) {
  const lifts = [];
  const staticCols = [];
  const interactables = [];
  const addCol = (x0, y0, z0, x1, y1, z1) => staticCols.push({ min: [x0, y0, z0], max: [x1, y1, z1] });

  for (const D of LIFT_DEF) {
    const { w, d, h, cargo, id } = D;
    const sx = id === 0 ? 1 : -1;          // 緊急出口嗰邊（向住另一部 lift）
    const car = new THREE.Group(); car.position.set(D.x, 0, D.z); scene.add(car);
    const M = (geo, mat, x, y, z, parent = car) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    const B = (bw, bh, bd, mat, x, y, z, parent) => M(new THREE.BoxGeometry(bw, bh, bd), mat, x, y, z, parent);

    // 地台
    B(w, 0.2, d, std('#fff', { map: cargo ? T.checkerPlateTex(3) : T.tileTex(1.5, 1.5, '#f2efe8', '#c9b98f'), metalness: cargo ? 0.6 : 0.1 }), 0, -0.1, 0);
    // 金色門檻
    B(w - 0.4, 0.03, 0.12, goldMat, 0, 0.015, d / 2 - 0.06);
    if (cargo) { const hz = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.2), std('#fff', { map: T.hazardTex() })); hz.rotation.x = -Math.PI / 2; hz.position.set(0, 0.035, d / 2 - 0.25); car.add(hz); }
    // 天花 + 頂
    B(w, 0.15, d, std('#e0e0e0', { metalness: 0.5 }), 0, h + 0.075, 0);
    const lightPanel = B(w * 0.6, 0.02, d * 0.5, new THREE.MeshBasicMaterial({ color: '#fffbe8' }), 0, h - 0.01, 0);
    const pl = new THREE.PointLight('#fff6e0', 6, 6, 1.5); pl.position.set(0, h - 0.3, 0); car.add(pl);
    // 角柱 + 框
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B(0.06, h, 0.06, steel, a * w / 2, h / 2, b * d / 2));
    [[0, -d / 2, w, 0.06], [0, d / 2, w, 0.06]].forEach(([x, z, bw, bd]) => { B(bw, 0.06, bd, steel, x, 0.03, z); B(bw, 0.06, bd, steel, x, h, z); });
    [-1, 1].forEach(a => { B(0.06, 0.06, d, steel, a * w / 2, 0.03, 0); B(0.06, 0.06, d, steel, a * w / 2, h, 0); });
    // 後牆（玻璃）
    B(w, h, 0.03, glass, 0, h / 2, -d / 2);
    // 非緊急出口嗰邊：整幅玻璃
    B(0.03, h, d, glass, -sx * w / 2, h / 2, 0);
    // 緊急出口嗰邊：玻璃 + 門位
    const ez0 = -0.5, ez1 = 0.5, eh = 2.0;
    B(0.03, h, ez0 + d / 2, glass, sx * w / 2, h / 2, (-d / 2 + ez0) / 2);
    B(0.03, h, d / 2 - ez1, glass, sx * w / 2, h / 2, (ez1 + d / 2) / 2);
    B(0.03, h - eh, ez1 - ez0, glass, sx * w / 2, (h + eh) / 2, 0);
    B(0.05, 0.06, 1.06, std('#d32f2f'), sx * w / 2, eh, 0);
    const eDoor = new THREE.Group(); eDoor.position.set(sx * w / 2, 0, ez0); car.add(eDoor);
    B(0.04, eh, 1.0, std('#ff5252', { transparent: true, opacity: 0.45, depthWrite: false }), 0, eh / 2, 0.5, eDoor);
    B(0.05, 0.06, 1.0, std('#b71c1c'), 0, 0.03, 0.5, eDoor); B(0.05, 0.06, 1.0, std('#b71c1c'), 0, eh - 0.03, 0.5, eDoor);
    B(0.05, eh, 0.06, std('#b71c1c'), 0, eh / 2, 0.97, eDoor);
    B(0.12, 0.04, 0.2, std('#eee', { metalness: 0.8 }), 0, 1.0, 0.8, eDoor);
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({ map: T.signTex('🏃 緊急出口 EXIT', '#0a8a3a', '#fff', 512, 180, 'bold 70px sans-serif'), side: THREE.DoubleSide }));
    exitSign.position.set(sx * (w / 2 - 0.03), eh + 0.2, 0); exitSign.rotation.y = -sx * Math.PI / 2; car.add(exitSign);
    // 前面：兩邊固定板 + 趟門
    const ow = w - 0.5, dh = h - 0.4;
    B(0.25, h, 0.03, glass, -w / 2 + 0.125, h / 2, d / 2); B(0.25, h, 0.03, glass, w / 2 - 0.125, h / 2, d / 2);
    B(ow, h - dh, 0.03, glass, 0, (h + dh) / 2, d / 2);
    const leaves = [-1, 1].map(s => {
      const g = new THREE.Group(); car.add(g);
      B(ow / 2 + 0.02, dh, 0.025, glass, 0, dh / 2, 0, g);
      B(0.04, dh, 0.035, goldMat, -s * (ow / 4), dh / 2, 0, g);
      B(ow / 2, 0.04, 0.035, steel, 0, 0.02, 0, g); B(ow / 2, 0.04, 0.035, steel, 0, dh - 0.02, 0, g);
      return { g, s };
    });
    // 窗口式冷氣機（喺非緊急出口嗰邊，橫跨玻璃）
    const wacZ = -d / 2 + 0.6;
    const wac = new THREE.Group(); wac.position.set(-sx * w / 2, 1.95, wacZ); car.add(wac);
    B(0.6, 0.4, 0.62, std('#ece6d4', { roughness: 0.5 }), 0, 0, 0, wac);
    for (let i = 0; i < 6; i++) B(0.01, 0.025, 0.5, std('#9e9785'), sx * 0.305, -0.13 + i * 0.05, 0, wac);
    B(0.02, 0.06, 0.12, std('#4caf50'), sx * 0.305, 0.14, 0.2, wac);
    for (let i = 0; i < 5; i++) B(0.01, 0.3, 0.02, std('#777'), -sx * 0.305, 0, -0.2 + i * 0.1, wac);
    // 分體式冷氣機：室內機（後牆頂）+ 室外機（車頂）
    const indoor = new THREE.Group(); indoor.position.set(0, h - 0.32, -d / 2 + 0.13); car.add(indoor);
    B(Math.min(1.0, w * 0.42), 0.27, 0.2, std('#fafafa', { roughness: 0.3 }), 0, 0, 0, indoor);
    const louver = B(Math.min(0.94, w * 0.4), 0.03, 0.08, std('#ddd'), 0, -0.12, 0.08, indoor);
    B(0.06, 0.02, 0.005, new THREE.MeshBasicMaterial({ color: '#4fc3f7' }), 0.32, 0.05, 0.101, indoor);
    const outdoor = new THREE.Group(); outdoor.position.set(-sx * (w / 2 - 0.5), h + 0.15, -d / 2 + 0.4); car.add(outdoor);
    B(0.8, 0.55, 0.32, std('#f0f0f0', { roughness: 0.4 }), 0, 0.275, 0, outdoor);
    const ofan = M(new THREE.CircleGeometry(0.2, 20), std('#333'), -0.12, 0.275, 0.165, outdoor);
    const oblades = new THREE.Group(); oblades.position.set(-0.12, 0.275, 0.17); outdoor.add(oblades);
    for (let i = 0; i < 3; i++) { const b = B(0.05, 0.36, 0.01, std('#bbb'), 0, 0, 0, oblades); b.rotation.z = i * Math.PI / 3; }
    B(0.04, 0.04, d - 0.6, std('#c8a165'), 0.3, 0.05, (d - 0.6) / 2 - 0.1, outdoor);
    // 車頂：橫樑、逃生窿、黃金鋼纜
    B(w * 0.9, 0.18, 0.2, std('#455a64', { metalness: 0.6 }), 0, h + 0.24, 0);
    B(0.6, 0.04, 0.6, std('#78909c'), sx * 0.3, h + 0.17, d / 4);
    const cableLen = 4000;
    const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, cableLen, 6);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(cableGeo, goldMat); c.position.set(-0.15 + i * 0.1, h + 0.33 + cableLen / 2, 0); car.add(c); }
    B(0.5, 0.15, 0.25, goldMat, 0, h + 0.4, 0);
    // 控制面板（車廂內，右邊近門）
    const panelX = w / 2 - 0.035, panelZ = d / 2 - 0.42;
    const panel = new THREE.Group(); panel.position.set(panelX, 1.2, panelZ); car.add(panel);
    B(0.02, 0.62, 0.26, std('#c0c4c8', { metalness: 0.9, roughness: 0.25 }), 0, 0, 0, panel);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) M(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 10), std('#eee', { emissive: '#333' }), -0.012, 0.18 - r * 0.07, -0.06 + c * 0.06, panel).rotation.z = Math.PI / 2;
    const redBtn = M(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), std('#e00', { emissive: '#600' }), -0.015, -0.2, 0, panel); redBtn.rotation.z = Math.PI / 2;
    // 扶手 / 防撞木
    if (!cargo) B(w * 0.7, 0.04, 0.04, goldMat, 0, 0.95, -d / 2 + 0.08);
    else { [0.4, 0.9].forEach(y => { B(w - 0.2, 0.12, 0.05, std('#fff', { map: T.woodTex() }), 0, y, -d / 2 + 0.05); B(0.05, 0.12, d - 0.6, std('#fff', { map: T.woodTex() }), -sx * (w / 2 - 0.05), y, 0); }); }
    // 貨箱
    const crates = [];
    if (cargo) {
      const cm = std('#fff', { map: T.woodTex() });
      B(0.8, 0.8, 0.8, cm, -sx * (w / 2 - 0.5), 0.4, -d / 2 + 0.5); crates.push([-sx * (w / 2 - 0.5), -d / 2 + 0.5, 0.4, 0.8]);
      B(0.6, 0.6, 0.6, cm, -sx * (w / 2 - 0.5), 1.1, -d / 2 + 0.5);
    }
    // CCTV 鏡頭（車廂內天花角）
    const camPos = new THREE.Vector3(sx * (w / 2 - 0.15), h - 0.12, -d / 2 + 0.15);
    M(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#222', { roughness: 0.1 }), camPos.x, h, camPos.z).rotation.x = Math.PI;
    const cctvCam = new THREE.PerspectiveCamera(100, 4 / 3, 0.05, 2e7);
    cctvCam.position.copy(camPos); car.add(cctvCam);
    car.updateMatrixWorld(true);
    cctvCam.lookAt(new THREE.Vector3(D.x - sx * 0.3, 0.6, D.z + d / 2));
    // 車廂內樓層顯示
    const dispIn = displayCanvas();
    const di = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: dispIn.tex }));
    di.position.set(0, h - 0.15, d / 2 - 0.03); di.rotation.y = Math.PI; car.add(di);
    // 名牌（車外頂）
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.3), new THREE.MeshBasicMaterial({ map: T.signTex(D.name, cargo ? '#e65100' : '#1565c0', '#fff', 512, 110, 'bold 60px sans-serif') }));
    nm.position.set(0, h + 0.35, d / 2 + 0.02); car.add(nm);

    // ---------- 電梯井（地面以上透明井框）----------
    const shaft = new THREE.Group(); scene.add(shaft);
    const railMat = std('#5d6b75', { metalness: 0.7, roughness: 0.4 });
    const railLen = TOP_Y - MACHINE_ROOM_Y;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, railLen, 0.12), railMat);
      r.position.set(D.x + a * (w / 2 + 0.12), MACHINE_ROOM_Y + railLen / 2, D.z + b * (d / 2 + 0.12)); r.castShadow = false; shaft.add(r);
      addCol(r.position.x - 0.06, -0.3, r.position.z - 0.06, r.position.x + 0.06, 4, r.position.z + 0.06);
    });
    // 地面至 100 樓嘅固定橫樑
    const beamGeoX = new THREE.BoxGeometry(w + 0.36, 0.08, 0.08), beamGeoZ = new THREE.BoxGeometry(0.08, 0.08, d + 0.36);
    const NB = 100;
    const bx = new THREE.InstancedMesh(beamGeoX, railMat, NB * 2), bz = new THREE.InstancedMesh(beamGeoZ, railMat, NB * 2);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < NB; i++) {
      const y = 3.5 + i * 3.5 + h + 0.6;
      [-1, 1].forEach((s, k) => {
        bx.setMatrixAt(i * 2 + k, mtx.makeTranslation(D.x, y, D.z + s * (d / 2 + 0.12)));
        bz.setMatrixAt(i * 2 + k, mtx.makeTranslation(D.x + s * (w / 2 + 0.12), y, D.z));
      });
    }
    shaft.add(bx, bz);
    // 跟住車廂嘅移動橫樑（高空都見到井框）
    const NM = 24;
    const mx = new THREE.InstancedMesh(beamGeoX, railMat, NM * 2), mz = new THREE.InstancedMesh(beamGeoZ, railMat, NM * 2);
    mx.frustumCulled = mz.frustumCulled = false; shaft.add(mx, mz);
    // 地面玻璃圍欄（後面 + 兩邊）
    const fx0 = D.x - w / 2 - 0.2, fx1 = D.x + w / 2 + 0.2, fz0 = D.z - d / 2 - 0.2, fz1 = D.z + d / 2 + 0.1;
    const fenceH = 2.8;
    [[fx0, fz0, fx1, fz0 + 0.04], [fx0, fz0, fx0 + 0.04, fz1], [fx1 - 0.04, fz0, fx1, fz1]].forEach(([a, b, c, e]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(c - a, fenceH, e - b), glass); m.position.set((a + c) / 2, fenceH / 2, (b + e) / 2); shaft.add(m);
      addCol(a, 0, b, c, fenceH, e);
    });
    // 地面層門（landing door）+ 金框
    const lz = D.z + d / 2 + 0.12;
    const lframe = new THREE.Group(); lframe.position.set(D.x, 0, lz); scene.add(lframe);
    B(0.16, dh + 0.2, 0.2, goldMat, -ow / 2 - 0.08, (dh + 0.2) / 2, 0, lframe); B(0.16, dh + 0.2, 0.2, goldMat, ow / 2 + 0.08, (dh + 0.2) / 2, 0, lframe);
    B(ow + 0.32, 0.2, 0.2, goldMat, 0, dh + 0.1, 0, lframe);
    B(ow + 0.32, 0.03, 0.3, goldMat, 0, 0.015, 0.05, lframe);
    addCol(D.x - ow / 2 - 0.16, 0, lz - 0.1, D.x - ow / 2, dh + 0.2, lz + 0.1);
    addCol(D.x + ow / 2, 0, lz - 0.1, D.x + ow / 2 + 0.16, dh + 0.2, lz + 0.1);
    // landing door 旁邊封口
    addCol(fx0, 0, lz - 0.1, D.x - ow / 2 - 0.16, fenceH, lz + 0.05);
    addCol(D.x + ow / 2 + 0.16, 0, lz - 0.1, fx1, fenceH, lz + 0.05);
    const lLeaves = [-1, 1].map(s => {
      const g = new THREE.Group(); lframe.add(g);
      B(ow / 2 + 0.02, dh, 0.04, std('#d7b56d', { metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0.55, depthWrite: false }), 0, dh / 2, 0, g);
      return { g, s };
    });
    const dispOut = displayCanvas();
    const dout = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: dispOut.tex }));
    dout.position.set(0, dh + 0.42, 0.11); lframe.add(dout);
    // 召喚面板（外面柱）
    const cpx = D.x + (id === 0 ? -1 : 1) * (ow / 2 + 0.5), cpz = lz + 0.15;
    const post = new THREE.Group(); post.position.set(cpx, 0, cpz); scene.add(post);
    B(0.18, 1.4, 0.1, steel, 0, 0.7, 0, post);
    B(0.12, 0.2, 0.02, std('#222'), 0, 1.15, 0.06, post);
    const keyHole = M(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), goldMat, 0, 1.15, 0.075, post); keyHole.rotation.x = Math.PI / 2;
    addCol(cpx - 0.09, 0, cpz - 0.05, cpx + 0.09, 1.4, cpz + 0.05);

    const L = {
      def: D, id, car, leaves, lLeaves, eDoor, eOpen: 0, sx, cctvCam, dispIn, dispOut, outdoorFan: oblades, louver,
      crates, mx, mz, NM, h, w, d, ow, dh, lz, state: { from: 1, to: 1, t0: 0, dur: 0, doorStart: 0, doorEnd: 0, emerg: false },
      y: 0, prevY: 0, vy: 0, door: 0, wasMoving: false, floor: 1,
    };
    lifts.push(L);

    // 外面召喚（要入 key）
    interactables.push({
      pos: new THREE.Vector3(cpx, 0, cpz + 0.4), r: 1.5,
      label: () => `🔑 入 Key 開 ${D.name}`,
      act: () => api.keyPrompt(id, () => {
        const T = api.now(), mv = isMoving(L.state, T), f = Math.round(L.floor);
        if (f === 1 && !mv) return api.liftCmd(id, 'open');
        const where = mv ? `而家喺 ${Math.round(L.floor)} 樓，${L.state.to > L.state.from ? '向上' : '向下'}行緊` : `而家停喺 ${f} 樓`;
        api.choose(`🛗 ${D.name}`, [
          { label: '🔔 正常召 Lift', sub: mv ? '等佢到咗目的地之後再落返嚟地面' : '叫佢落返嚟地面', fn: () => { api.liftCmd(id, 'call'); api.toast(`🔔 已召 ${D.name}，等等佢落嚟`); } },
          { label: '⏬ 強制 Lift 即刻落地面', sub: '等 Lift 嘅人嘅權利：Lift 即刻停低，直接落返地面開門（入面嘅人都要一齊落）', fn: () => { api.liftCmd(id, 'force'); api.sfx.beep(); api.toast(`⏬ 強制召 ${D.name} 落地面！`, 3000); } },
        ], `${where}。另一部 Lift 唔會受影響。`);
      }),
      show: () => api.playerY() > -1,
    });
    // 機房召喚
    interactables.push({
      pos: new THREE.Vector3(D.x, MACHINE_ROOM_Y, D.z + d / 2 + 0.8), r: 1.6,
      label: () => `🔑 入 Key 召喚 ${D.name} 落機房`,
      act: () => api.keyPrompt(id, () => {
        if (Math.round(L.floor) === 0 && !isMoving(L.state, api.now())) api.liftCmd(id, 'open');
        else { api.liftCmd(id, 'goto', 0); api.liftCmd(id, 'open'); }
      }),
      show: () => api.playerY() < -3,
    });
  }

  const tmpM = new THREE.Matrix4();
  function update(dt, T) {
    for (const L of lifts) {
      const S = L.state;
      L.floor = floorAt(S, T);
      L.prevY = L.y;
      L.y = altOfFloor(L.floor);
      L.vy = dt > 0 ? (L.y - L.prevY) / dt : 0;
      L.car.position.y = L.y;
      L.door = doorOpenness(S, T);
      L.leaves.forEach(({ g, s }) => g.position.set(s * (L.ow / 4 + L.door * L.ow / 2 * 0.95), 0, L.d / 2 + (s < 0 ? 0.035 : 0.06)));
      const atGround = Math.abs(L.y) < 0.05;
      const ld = atGround ? L.door : 0;
      L.lLeaves.forEach(({ g, s }) => g.position.set(s * (L.ow / 4 + ld * L.ow / 2 * 0.95), 0, s < 0 ? -0.03 : 0.03));
      L.eOpen += ((S.emerg ? 1 : 0) - L.eOpen) * Math.min(1, dt * 5);
      L.eDoor.rotation.y = L.sx * L.eOpen * Math.PI / 2;
      L.outdoorFan.rotation.z += dt * 12;
      L.louver.rotation.x = 0.4 + Math.sin(T / 1500) * 0.3;
      const moving = isMoving(S, T);
      if (L.wasMoving && !moving) api.arrived(L.id);
      L.wasMoving = moving;
      const f = Math.round(L.floor);
      const arrow = moving ? (S.to > S.from ? '▲' : '▼') : '';
      drawDisplay(L.dispIn, floorLabel(f), arrow); drawDisplay(L.dispOut, floorLabel(f), arrow);
      // 移動橫樑
      const base = Math.floor(L.y / 3.5) * 3.5;
      for (let i = 0; i < L.NM; i++) {
        const y = base + (i - L.NM / 2) * 3.5 + L.h + 0.6;
        [-1, 1].forEach((s, k) => {
          L.mx.setMatrixAt(i * 2 + k, tmpM.makeTranslation(L.def.x, y, L.def.z + s * (L.d / 2 + 0.12)));
          L.mz.setMatrixAt(i * 2 + k, tmpM.makeTranslation(L.def.x + s * (L.w / 2 + 0.12), y, L.def.z));
        });
      }
      L.mx.instanceMatrix.needsUpdate = L.mz.instanceMatrix.needsUpdate = true;
    }
  }

  // 每格動態碰撞盒（世界座標）
  function dynamicColliders() {
    const out = [];
    for (const L of lifts) {
      const { x, z } = L.def, w = L.w, d = L.d, h = L.h, y = L.y, t = 0.06;
      const box = (x0, y0, z0, x1, y1, z1, extra) => out.push({ min: [x + x0, y + y0, z + z0], max: [x + x1, y + y1, z + z1], ...extra });
      box(-w / 2, -0.25, -d / 2, w / 2, 0, d / 2, { lift: L.id });                // 地台
      box(-w / 2, h, -d / 2, w / 2, h + 0.3, d / 2, { lift: L.id });              // 車頂（可以企）
      box(-w / 2, 0, -d / 2 - t, w / 2, h, -d / 2 + t);                           // 後牆
      const s = L.sx;
      box(-s * w / 2 - t, 0, -d / 2, -s * w / 2 + t, h, d / 2);                   // 非緊急邊
      // 緊急出口邊
      const ex0 = s * w / 2 - t, ex1 = s * w / 2 + t;
      box(Math.min(ex0, ex1), 0, -d / 2, Math.max(ex0, ex1), h, -0.5);
      box(Math.min(ex0, ex1), 0, 0.5, Math.max(ex0, ex1), h, d / 2);
      box(Math.min(ex0, ex1), 2.0, -0.5, Math.max(ex0, ex1), h, 0.5);
      if (L.eOpen < 0.5) box(Math.min(ex0, ex1), 0, -0.5, Math.max(ex0, ex1), 2.0, 0.5);
      // 前面
      box(-w / 2, 0, d / 2 - t, -w / 2 + 0.25, h, d / 2 + t);
      box(w / 2 - 0.25, 0, d / 2 - t, w / 2, h, d / 2 + t);
      const gap = L.door * L.ow * 0.95;
      if (gap < 0.8) box(-w / 2 + 0.25, 0, d / 2 - t, w / 2 - 0.25, h, d / 2 + t);
      // 貨箱
      L.crates.forEach(([cx, cz, cy, sz]) => box(cx - sz / 2, 0, cz - sz / 2, cx + sz / 2, sz, cz + sz / 2));
      // 地面 landing door
      const atGround = Math.abs(y) < 0.05;
      if (!(atGround && gap >= 0.8)) out.push({ min: [x - L.ow / 2, 0, L.lz - 0.08], max: [x + L.ow / 2, L.dh, L.lz + 0.08] });
    }
    return out;
  }

  function insideCar(p) {
    for (const L of lifts) {
      const { x, z } = L.def;
      if (Math.abs(p.x - x) < L.w / 2 && Math.abs(p.z - z) < L.d / 2 && p.y >= L.y - 0.3 && p.y < L.y + L.h) return L;
    }
    return null;
  }

  return { lifts, staticCols, interactables, update, dynamicColliders, insideCar };
}
