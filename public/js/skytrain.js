// 空中輕軌（好似泰國曼谷嗰種）：喺馬路正上面 9 米高嘅高架路軌，順時針圍一大圈
// 6 架列車按時間表行（所有玩家見到一樣），每個站停 12 秒；喺街上搭 Lift 上月台，車到就上車
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign } from './interiors.js';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
export const DECK = 9;
const BOX = { x0: -1300, x1: 2500, z0: -1100, z1: 300 }, RC = 30;
export const SKY_STATIONS = [
  { n: '城市河', en: 'River Park', x: -400, z: -1100 },
  { n: '大球場', en: 'Stadium', x: 1200, z: -1100 },
  { n: '東區', en: 'East Town', x: 2500, z: -400 },
  { n: '東灣', en: 'East Bay', x: 1800, z: 300 },
  { n: '國際機場', en: 'Airport', x: 800, z: 300 },
  { n: '柏熙小鎮', en: 'Pak Hei Town', x: 0, z: 300 },
  { n: '豪景花園', en: 'Hong Kong Garden', x: -600, z: 300 },
  { n: '怪獸決戰場', en: 'Monster Arena', x: -1300, z: 0 },
  { n: '西林', en: 'West Woods', x: -1300, z: -800 },
];
// 圓角長方形路線（順時針：北邊向東 → 東邊向南 → 南邊向西 → 西邊向北）
function buildPath() {
  const { x0, x1, z0, z1 } = BOX, pts = [];
  const arc = (cx, cz, a0, a1) => { for (let k = 0; k <= 10; k++) { const a = a0 + (a1 - a0) * k / 10; pts.push(new V3(cx + Math.cos(a) * RC, 0, cz + Math.sin(a) * RC)); } };
  arc(x0 + RC, z0 + RC, Math.PI, Math.PI * 1.5);
  arc(x1 - RC, z0 + RC, -Math.PI / 2, 0);
  arc(x1 - RC, z1 - RC, 0, Math.PI / 2);
  arc(x0 + RC, z1 - RC, Math.PI / 2, Math.PI);
  pts.push(pts[0].clone());
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
export const SKY_PATH = buildPath();
export function skyAt(s, out) {
  const { pts, cum, L } = SKY_PATH; s = ((s % L) + L) % L;
  let lo = 1, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m + 1; else hi = m; }
  const i = lo, a = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  out.lerpVectors(pts[i - 1], pts[i], a);
  return Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
}
// 每個站喺路線上嘅距離
function sOf(x, z) { let best = 0, bd = 1e9; const t = new V3(); for (let s = 0; s < SKY_PATH.L; s += 2) { skyAt(s, t); const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = s; } } return best; }
SKY_STATIONS.forEach(st => st.s = sOf(st.x, st.z));
SKY_STATIONS.sort((a, b) => a.s - b.s);
// 時間表：每段 = 加速 / 減速 + 勻速，站停 DWELL 秒
const VMAX = 28, ACC = 1.6, DWELL = 12, NTRAIN = 6;
const TT = [];   // 每段 { s0, len, run, t0 }
let LAP = 0;
SKY_STATIONS.forEach((st, i) => {
  const nx = SKY_STATIONS[(i + 1) % SKY_STATIONS.length];
  const len = ((nx.s - st.s) % SKY_PATH.L + SKY_PATH.L) % SKY_PATH.L;
  const ta = VMAX / ACC, da = VMAX * ta / 2;
  const run = len > 2 * da ? 2 * ta + (len - 2 * da) / VMAX : 2 * Math.sqrt(len / ACC);
  TT.push({ st: i, s0: st.s, len, run, t0: LAP }); LAP += DWELL + run;
});
// 時間 t（秒）時，喺環線上嘅位置 + 停緊邊個站（-1 = 行緊）
function trainAt(t) {
  t = ((t % LAP) + LAP) % LAP;
  let seg = TT[TT.length - 1]; for (const g of TT) if (g.t0 <= t) seg = g;
  const u = t - seg.t0;
  if (u < DWELL) return { s: seg.s0, at: seg.st, wait: DWELL - u };
  const r = u - DWELL, len = seg.len, ta = Math.min(VMAX / ACC, seg.run / 2), vm = ACC * ta;
  let d;
  if (r < ta) d = ACC * r * r / 2;
  else if (r > seg.run - ta) { const q = seg.run - r; d = len - ACC * q * q / 2; }
  else d = ACC * ta * ta / 2 + vm * (r - ta);
  return { s: seg.s0 + Math.min(len, d), at: -1, wait: 0 };
}

function buildTrain() {
  const g = new THREE.Group(), body = std('#f5f7f8', { metalness: 0.4, roughness: 0.3 }), blue = std('#0288d1'), yellow = std('#ffca28'), glass = new THREE.MeshStandardMaterial({ color: '#7fc6ff', transparent: true, opacity: 0.45, metalness: 0.3, roughness: 0.05 });
  const add = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  for (let k = -1; k <= 1; k++) {
    const z = k * 18.6;
    add(3.0, 0.5, 18, std('#455a64'), 0, 0.55, z);
    add(3.0, 2.0, 18, body, 0, 1.8, z);
    add(3.02, 0.9, 16, glass, 0, 2.1, z);
    add(3.04, 0.22, 18, blue, 0, 1.1, z); add(3.04, 0.1, 18, yellow, 0, 1.3, z);
    add(2.9, 0.3, 18, body, 0, 2.95, z);
    if (k !== 0) add(2.6, 1.6, 0.2, glass, 0, 1.9, z + k * 9.05);
  }
  g.userData = { seat: new V3(0.6, 0.85, 0) };
  return g;
}

export function buildSkytrain(scene, api) {
  const B = new Batch(), inter = [];
  const conc = std('#cfd2d4'), deckM = std('#9ea3a8'), railM = std('#6d7378', { metalness: 0.7 }), white = std('#eceff1');
  const t = new V3(), t2 = new V3();
  // 高架橋面（每 10 米一段）+ 柱（每 40 米）
  for (let s = 0; s < SKY_PATH.L; s += 10) {
    const yaw = skyAt(s + 5, t);
    const g = new THREE.BoxGeometry(7, 1.2, 10.4); g.rotateY(yaw); g.translate(t.x, DECK - 0.6, t.z); B.add(g, deckM);
    [-1.6, 1.6].forEach(o => { const r = new THREE.BoxGeometry(0.15, 0.25, 10.4); r.translate(o, 0, 0); r.rotateY(yaw); r.translate(t.x, DECK + 0.12, t.z); B.add(r, railM); });
    [-3.4, 3.4].forEach(o => { const r = new THREE.BoxGeometry(0.2, 0.9, 10.4); r.translate(o, 0, 0); r.rotateY(yaw); r.translate(t.x, DECK + 0.45, t.z); B.add(r, conc); });
    if (Math.round(s) % 40 === 0) {
      const p = new THREE.CylinderGeometry(0.7, 0.8, DECK - 1.2, 10); p.translate(t.x, (DECK - 1.2) / 2, t.z); B.add(p, conc);
      const cap = new THREE.BoxGeometry(5, 0.8, 1.6); cap.rotateY(yaw); cap.translate(t.x, DECK - 1.5, t.z); B.add(cap, conc);
      B.cols.push({ min: [t.x - 0.75, 0, t.z - 0.75], max: [t.x + 0.75, DECK - 1.2, t.z + 0.75] });
    }
  }
  // 車站：月台喺外邊、地面有 Lift 塔
  const cx = (BOX.x0 + BOX.x1) / 2, cz = (BOX.z0 + BOX.z1) / 2;
  const stInfo = SKY_STATIONS.map(st => {
    const yaw = skyAt(st.s, t), along = new V3(Math.sin(yaw), 0, Math.cos(yaw));
    let nrm = new V3(along.z, 0, -along.x); if (nrm.x * (st.x - cx) + nrm.z * (st.z - cz) < 0) nrm.negate();
    const P = (a, o) => [st.x + along.x * a + nrm.x * o, st.z + along.z * a + nrm.z * o];
    // 月台（沿路 70 米）
    const [ax, az] = P(-35, 3.5), [bx, bz] = P(35, 7.5);
    B.box(Math.min(ax, bx), DECK - 0.6, Math.min(az, bz), Math.max(ax, bx), DECK + 0.4, Math.max(az, bz), white);
    const [rx0, rz0] = P(-35, 7.4), [rx1, rz1] = P(35, 7.6); B.box(Math.min(rx0, rx1), DECK + 0.4, Math.min(rz0, rz1), Math.max(rx0, rx1), DECK + 1.5, Math.max(rz0, rz1), railM);
    // 上蓋
    const [hx0, hz0] = P(-30, 3), [hx1, hz1] = P(30, 8); B.box(Math.min(hx0, hx1), DECK + 4.2, Math.min(hz0, hz1), Math.max(hx0, hx1), DECK + 4.5, Math.max(hz0, hz1), std('#0288d1'), false);
    for (const a of [-28, -14, 0, 14, 28]) { const [px, pz] = P(a, 7.2); B.box(px - 0.15, DECK + 0.4, pz - 0.15, px + 0.15, DECK + 4.2, pz + 0.15, railM, false); }
    // 地面 Lift 塔（喺行人路）
    const [lx, lz] = P(30, 9.8);
    B.box(lx - 1.6, 0, lz - 1.6, lx + 1.6, DECK + 4.5, lz + 1.6, std('#b0bec5', { metalness: 0.3 }));
    const [sx, sz] = P(0, 7.62);
    sign(B, sx, DECK + 3.4, sz, 9, 1.1, signMat(`🚝 ${st.n} ${st.en}`, '#0288d1', '#fff'), nrm.x > 0.5 ? '+x' : nrm.x < -0.5 ? '-x' : nrm.z > 0 ? '+z' : '-z');
    const [gx, gz] = P(30, 12.2);
    const [ux, uz] = P(22, 6), out = nrm.clone(), up = new V3(ux, 0, uz), down = new V3(gx, 0, gz);
    return { st, yaw, along, nrm: out, ground: down, plat: new V3(up.x, DECK + 0.45, up.z), lift: new V3(lx, 0, lz) };
  });
  const g = B.build(); scene.add(g);
  stInfo.forEach((si, i) => {
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: TX.signTex(`🚝 空中輕軌 ${si.st.n}站`, '#0288d1', '#fff', 512, 128, 'bold 46px sans-serif'), side: THREE.DoubleSide }));
    lbl.position.set(si.lift.x + si.nrm.x * 1.62, 3.2, si.lift.z + si.nrm.z * 1.62); lbl.rotation.y = Math.atan2(si.nrm.x, si.nrm.z); scene.add(lbl);
    inter.push({ pos: si.ground, r: 3, label: () => `🚝 搭 Lift 上空中輕軌「${si.st.n}站」`, act: () => { api.sfx.door(); api.blackout(() => { api.teleport(si.plat.x, si.plat.y, si.plat.z); api.face(Math.atan2(-si.nrm.x, -si.nrm.z)); api.toast(`🚝 ${si.st.n}站月台：等列車到，撳「🚝 上車」`, 3500); api.say(`Welcome to ${si.st.en} station. Please stand behind the yellow line.`, `歡迎嚟到${si.st.n}站，請企喺黃線後面。`); }, 600); } });
    inter.push({ pos: si.plat.clone(), r: 9, label: () => { const w = waitAt(i); return w.docked >= 0 ? '🚝 上車！' : `🚝 下一班車 ${Math.ceil(w.eta)} 秒後到`; }, act: () => boardAt(i) });
    inter.push({ pos: new V3(...[si.plat.x + si.along.x * 8, si.plat.y, si.plat.z + si.along.z * 8]), r: 3, label: () => '⬇ 搭 Lift 落街', act: () => { api.sfx.door(); api.blackout(() => { api.teleport(si.ground.x + si.nrm.x * 1.5, 0.1, si.ground.z + si.nrm.z * 1.5); api.loadCity(); }, 600); } });
  });
  // 列車
  const trains = []; for (let k = 0; k < NTRAIN; k++) { const m = buildTrain(); scene.add(m); trains.push(m); }
  const now = () => api.now() / 1000;
  const trainState = k => trainAt(now() + k * LAP / NTRAIN);
  function waitAt(i) {
    let eta = 1e9, docked = -1;
    for (let k = 0; k < NTRAIN; k++) {
      const st = trainState(k); if (st.at === i) { docked = k; break; }
      // 幾耐之後到呢個站
      const T = now() + k * LAP / NTRAIN, tt = ((T % LAP) + LAP) % LAP, ti = TT[i].t0;
      const d = ((ti - tt) % LAP + LAP) % LAP; eta = Math.min(eta, d);
    }
    return { docked, eta };
  }
  let ride = null;
  function boardAt(i) {
    const w = waitAt(i); if (w.docked < 0) return api.toast(`列車仲未到，等多 ${Math.ceil(w.eta)} 秒`);
    ride = { k: w.docked, from: i, said: i }; api.sfx.door();
    api.say('This is the sky train. It runs high above the road. Please hold on to the handrail.', '呢架係空中輕軌，喺馬路上面行，請握好扶手。', { force: true });
    api.toast('🚝 上咗車！列車停站時撳「🚪 落車」就可以落車', 4000);
  }
  function step() {
    if (!ride) return null;
    const m = trains[ride.k]; m.updateMatrixWorld(true);
    const seat = m.userData.seat.clone().applyMatrix4(m.matrixWorld);
    const st = trainState(ride.k);
    if (st.at >= 0 && st.at !== ride.said) { ride.said = st.at; const S = SKY_STATIONS[st.at]; api.say(`This is ${S.en}.`, `${S.n}站到喇。`, { force: true, gap: 0 }); }
    if (st.at < 0) { const nx = SKY_STATIONS[nextStation(ride.k)]; if (ride.announced !== nx.n) { ride.announced = nx.n; ride.said = -1; api.say(`Next station, ${nx.en}.`, `下一站：${nx.n}`, { force: true, gap: 0 }); } }
    return { pos: seat, yaw: m.rotation.y, at: st.at, wait: st.wait };
  }
  function nextStation(k) { const tt = ((now() + k * LAP / NTRAIN) % LAP + LAP) % LAP; let seg = TT[TT.length - 1]; for (const g2 of TT) if (g2.t0 <= tt) seg = g2; return (seg.st + 1) % SKY_STATIONS.length; }
  function alight() {
    if (!ride) return;
    const st = trainState(ride.k); if (st.at < 0) return api.toast('列車行緊，要等停站先落得車');
    const si = stInfo[st.at]; ride = null;
    api.teleport(si.plat.x, si.plat.y, si.plat.z); api.toast(`🚶 喺 ${si.st.n}站落咗車`); api.sfx.click();
  }
  function cancel() { ride = null; }
  function update(dt, p) {
    const far = p.x < BOX.x0 - 1500 || p.x > BOX.x1 + 1500 || p.z < BOX.z0 - 1500 || p.z > BOX.z1 + 1500;
    g.visible = !far || p.y > 300;
    trains.forEach((m, k) => {
      m.visible = g.visible; if (!m.visible) return;
      const st = trainState(k), yaw = skyAt(st.s, t);
      m.position.set(t.x, DECK + 0.05, t.z);
      let d = yaw - m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.rotation.y += Math.abs(d) > 1 ? d : d * Math.min(1, dt * 6);
    });
  }
  const docked = () => ride ? trainState(ride.k).at >= 0 : false;
  return { colliders: B.cols, interactables: inter, update, step, alight, cancel, riding: () => !!ride, docked, stations: stInfo, lap: LAP };
}
