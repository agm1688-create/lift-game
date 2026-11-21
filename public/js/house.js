// 柏熙屋企：公廁隔籬，3 層高，外牆 100% 黃金；每層平面跟參考圖（3 房 1 廁 + 客飯廳 + 廚房 + 露台）
// 屋入面每樣嘢行近都可以「睇內部零件」學英文；有保險箱、CCTV、消防鐘、消防喉轆、分體式 / 窗口式冷氣機
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign, exhaustFan } from './interiors.js';

const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...e });
export const HOUSE = { x0: -7, z0: 14, W: 11, D: 13, FH: 3.2, N: 3 };
const GOLD = std('#f5c542', { metalness: 0.55, roughness: 0.32, emissive: '#7a5400', emissiveIntensity: 0.45 });

export function buildHouse(scene, api) {
  const B = new Batch(), inter = [], spots = [];
  const { x0: X0, z0: Z0, W, D, FH, N } = HOUSE;
  // 平面圖座標：u = 圖左→右（0..W），v = 圖上→下（0..D）。圖下面（入口）向北（-z）對住廣場
  const P = (u, v) => [X0 - u, Z0 + (D - v)];
  const hb = (u0, v0, u1, v1, y0, y1, m, col = true) => { const [a, b] = P(u0, v0), [c, d] = P(u1, v1); B.box(Math.min(a, c), y0, Math.min(b, d), Math.max(a, c), y1, Math.max(b, d), m, col); };
  const spot = (u, v, y, key, r = 1.6) => { const [x, z] = P(u, v); spots.push({ x, z, y, key, r }); };
  const at = (u, v, y) => { const [x, z] = P(u, v); return new THREE.Vector3(x, y, z); };
  const white = std('#f4f1ea'), floorW = std('#fff', { map: IM.wood.map }), tile = IM.tile, dark = IM.dark, glass = IM.glass, red = std('#d32f2f');
  const T = 0.25, t = 0.12;
  for (let L = 0; L < N; L++) {
    const y = L * FH, top = y + FH;
    // 地板 + 天花
    hb(-0.05, -0.05, W + 0.05, D + 0.05, y - 0.25, y, std('#bfa36a'));
    hb(T, T, W - T, D - T, y + 0.01, y + 0.02, floorW, false);
    hb(7.6, 4.5, W - T, 7.5, y + 0.02, y + 0.03, tile, false); hb(7.6, 10.6, W - T, D - T, y + 0.02, y + 0.03, tile, false);
    // 外牆（黃金）+ 窗
    hb(0, 0, T, 9.9, y, top, GOLD); hb(0, 11.6, T, D, y, top, GOLD); hb(0, 9.9, T, 11.6, y + 2.4, top, GOLD); hb(0, 0, W, T, y, top, GOLD);   // 左牆：露台門（電視 / 梳化嗰邊）
    hb(W - T, 0, W, 7.65, y, top, GOLD); hb(W - T, 8.85, W, D, y, top, GOLD); hb(W - T, 7.65, W, 8.85, y + 2.3, top, GOLD);   // 右牆（飯枱嗰邊）：門口通室外樓梯
    if (L === 0) { hb(0, D - T, 5.6, D, y, top, GOLD); hb(7.0, D - T, W, D, y, top, GOLD); hb(5.6, D - T, 7.0, D, y + 2.3, top, GOLD); }
    else hb(0, D - T, W, D, y, top, GOLD);
    [[2.5, 0], [8.5, 0]].forEach(([u]) => hb(u - 0.9, -0.03, u + 0.9, 0.02, y + 1.0, y + 2.2, glass, false));
    [[-0.03, 2], [-0.03, 5.8]].forEach(([, v]) => hb(-0.03, v - 0.8, 0.02, v + 0.8, y + 1.0, y + 2.2, glass, false));
    hb(2, D - 0.02, 4.4, D + 0.03, y + 1.0, y + 2.2, glass, false);
    // 內牆（有門口）
    hb(6.5 - t / 2, T, 6.5 + t / 2, 4.5, y, top, white);                                            // A | B
    hb(T, 4.5 - t / 2, 5.5, 4.5 + t / 2, y, top, white); hb(7.6, 4.5 - t / 2, W - T, 4.5 + t / 2, y, top, white);   // A/B 底（中間係走廊入口）
    hb(5.5 - t / 2, 4.5, 5.5 + t / 2, 5.4, y, top, white); hb(5.5 - t / 2, 6.6, 5.5 + t / 2, 7.5, y, top, white);   // C 嘅門
    hb(7.6 - t / 2, 4.5, 7.6 + t / 2, 5.4, y, top, white); hb(7.6 - t / 2, 6.6, 7.6 + t / 2, 7.5, y, top, white);   // 浴室門
    hb(T, 7.5 - t / 2, 5.5, 7.5 + t / 2, y, top, white); hb(7.6, 7.5 - t / 2, W - T, 7.5 + t / 2, y, top, white);
    hb(7.6 - t / 2, 10.6, 7.6 + t / 2, D - T, y, top, white); hb(7.6, 10.6 - t / 2, 8.2, 10.6 + t / 2, y, top, white); hb(9.4, 10.6 - t / 2, W - T, 10.6 + t / 2, y, top, white);   // 廚房
    hb(-0.05, -0.05, W + 0.05, D + 0.05, top - 0.2, top - 0.01, std('#f6f6f4'), false);           // 天花
    for (const [u, v] of [[3, 2.2], [8.8, 2.2], [2.8, 6], [9.3, 6], [3, 10], [6.5, 9], [9.3, 11.8]]) hb(u - 0.4, v - 0.4, u + 0.4, v + 0.4, top - 0.23, top - 0.2, IM.light, false);
    // ---------- 客飯廳 ----------
    hb(0.6, 11.8, 4.2, 12.7, y, y + 0.45, IM.sofa2); hb(0.6, 12.5, 4.2, 12.75, y + 0.45, y + 1.0, IM.sofa2, false); hb(0.6, 11.8, 0.9, 12.75, y + 0.45, y + 0.7, IM.sofa2, false); hb(3.9, 11.8, 4.2, 12.75, y + 0.45, y + 0.7, IM.sofa2, false);
    spot(2.4, 11.2, y, 'sofa');
    hb(1.4, 7.6, 4.2, 8.05, y, y + 0.55, dark); hb(1.7, 7.58, 3.9, 7.62, y + 0.85, y + 2.0, IM.black, false); hb(1.75, 7.62, 3.85, 7.63, y + 0.9, y + 1.95, IM.screen, false);
    spot(2.8, 8.9, y, 'tv');
    hb(8, 8.1, 10.3, 9.5, y + 0.72, y + 0.78, IM.wood); [[8.1, 8.2], [10.2, 8.2], [8.1, 9.4], [10.2, 9.4]].forEach(([u, v]) => hb(u - 0.04, v - 0.04, u + 0.04, v + 0.04, y, y + 0.72, IM.wood, false));
    B.cols.push((() => { const [a, b] = P(8, 8.1), [c, d] = P(10.3, 9.5); return { min: [Math.min(a, c), y, Math.min(b, d)], max: [Math.max(a, c), y + 0.78, Math.max(b, d)] }; })());
    [[8.6, 7.8], [9.7, 7.8], [8.6, 9.8], [9.7, 9.8]].forEach(([u, v]) => hb(u - 0.22, v - 0.22, u + 0.22, v + 0.22, y + 0.42, y + 0.47, dark, false));
    spot(9.15, 10.1, y, 'dining');
    // CCTV 顯示屏（客廳）
    hb(4.6, 7.58, 5.4, 7.62, y + 1.4, y + 2.0, IM.black, false); hb(4.65, 7.62, 5.35, 7.63, y + 1.45, y + 1.95, std('#0d47a1', { emissive: '#1565c0', emissiveIntensity: 0.9 }), false);
    inter.push({ pos: at(5, 8.4, y), r: 1.3, label: () => '📹 睇屋企 CCTV', act: () => api.houseCctv() });
    spot(5, 8.4, y, 'cctv', 1.3);
    // 窗口式冷氣機（客廳外牆）
    hb(W - 0.55, 9.25, W + 0.15, 9.95, y + 1.8, y + 2.35, std('#f5f5f5')); for (let k = 0; k < 5; k++) hb(W - 0.58, 9.35, W - 0.56, 9.85, y + 1.86 + k * 0.09, y + 1.88 + k * 0.09, std('#90a4ae'), false);   // 飯枱嗰幅牆
    spot(W - 1.2, 9.6, y, 'acWindow', 1.2);
    { const [fx, fz] = P(W - T - 0.02, 10.28); exhaustFan(B, fx, y + 2.55, fz, '+x', y); }   // 前方後圓抽氣扇（同一幅牆）
    // 消防鐘 + 消防喉轆（入口旁）
    { const [bx, bz] = P(4.9, D - T - 0.05); const bell = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 18); bell.rotateX(Math.PI / 2); bell.translate(bx, y + 2.1, bz - 0.04); B.add(bell, red); }
    hb(4.75, D - T - 0.08, 5.05, D - T - 0.02, y + 1.3, y + 1.6, red, false);
    spot(4.9, 12.0, y, 'alarm', 1.2);
    inter.push({ pos: at(4.9, 12.0, y), r: 1.0, label: () => '🔔 撳消防鐘（測試）', act: () => { api.sfx.firebell(2); api.toast('🔔 鈴鈴鈴！消防鐘測試中', 2500); api.say('Ring ring! This is the fire alarm. If there is a fire, go out quickly!', '鈴鈴鈴！呢個係消防鐘，有火警就要快啲離開！', { force: true }); } });
    { const [hx, hz] = P(7.3, D - T - 0.25); const reel = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 20); reel.rotateX(Math.PI / 2); reel.translate(hx, y + 1.25, hz); B.add(reel, red); const hub = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12); hub.rotateX(Math.PI / 2); hub.translate(hx, y + 1.25, hz); B.add(hub, std('#fafafa')); }
    hb(7.0, D - T - 0.05, 7.6, D - T - 0.02, y + 0.8, y + 1.7, std('#b71c1c'), false);
    spot(7.3, 12.0, y, 'hose', 1.2);
    // ---------- 廚房 ----------
    hb(10.2, 10.8, W - T, 12.9, y, y + 0.9, IM.wood); hb(10.15, 10.75, W - T, 12.95, y + 0.9, y + 0.95, IM.marble, false);
    [11.3, 11.8].forEach(v => { const [x, z] = P(10.5, v); const c = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 14); c.translate(x, y + 0.97, z); B.add(c, IM.black); });
    spot(9.6, 11.5, y, 'stove', 1.0);
    hb(10.3, 12.3, 10.65, 12.65, y + 0.95, y + 1.25, std('#eceff1'), false); spot(9.6, 12.4, y, 'riceCooker', 0.9);
    hb(10.2, 12.0, 10.75, 12.45, y + 1.5, y + 1.85, std('#cfd8dc')); spot(9.6, 12.2, y, 'microwave', 0.8);
    hb(7.8, 12.1, 8.6, 12.85, y, y + 1.9, std('#eceff1')); hb(8.58, 12.15, 8.61, 12.8, y + 1.0, y + 1.6, IM.steel, false); spot(8.2, 11.6, y, 'fridge', 1.0);
    hb(8.9, 12.2, 9.7, 12.9, y, y + 0.85, std('#fafafa')); { const [x, z] = P(9.3, 12.2); const d = new THREE.CircleGeometry(0.26, 18); d.translate(x, y + 0.45, z + 0.01); B.add(d, std('#90a4ae')); }
    spot(9.3, 11.7, y, 'washer', 0.9);
    { const [fx, fz] = P(9.3, D - T - 0.02); exhaustFan(B, fx, y + 2.3, fz, '+z', y); }
    // ---------- 浴室 ----------
    { const [x, z] = P(10.3, 5.0); const g = new THREE.CylinderGeometry(0.22, 0.18, 0.42, 12); g.translate(x, y + 0.21, z); B.add(g, IM.porcelain); }
    hb(10.6, 4.65, 10.85, 5.35, y + 0.4, y + 0.85, IM.porcelain, false); spot(9.8, 5.2, y, 'toilet', 1.0);
    hb(9.4, 6.3, W - T, 7.4, y, y + 0.06, std('#e0e0e0'), false); hb(9.38, 6.3, 9.42, 7.4, y + 0.06, y + 2.0, glass, false); spot(9.0, 6.8, y, 'shower', 1.0);
    hb(7.8, 6.8, 8.5, 7.35, y + 0.8, y + 0.9, IM.porcelain); hb(7.95, 7.33, 8.35, 7.36, y + 1.1, y + 1.7, std('#dfe7ec', { metalness: 1, roughness: 0.05 }), false);
    { const [fx, fz] = P(W - T - 0.02, 5.6); exhaustFan(B, fx, y + 2.4, fz, '+x', y); }
    // ---------- 睡房 A / B / C（每間有分體式冷氣機）----------
    const room = (bu0, bv0, bu1, bv1, ac, wardrobe) => {
      hb(bu0, bv0, bu1, bv1, y, y + 0.45, dark); hb(bu0 + 0.05, bv0 + 0.05, bu1 - 0.05, bv1 - 0.05, y + 0.45, y + 0.6, IM.linen, false); hb(bu0 + 0.05, bv0 + 0.6, bu1 - 0.05, bv1 - 0.05, y + 0.6, y + 0.64, IM.blanket, false);
      spot((bu0 + bu1) / 2, bv1 + 0.6, y, 'bed', 1.2);
      const [au, av, face] = ac; hb(au - 0.55, av - 0.12, au + 0.55, av + 0.12, y + 2.35, y + 2.7, std('#fafafa'), false); spot(au, av + (face === 'v' ? 1.2 : 0), y, 'acSplit', 1.3);
      if (wardrobe) { const [wu0, wv0, wu1, wv1] = wardrobe; hb(wu0, wv0, wu1, wv1, y, y + 2.1, IM.wood); spot((wu0 + wu1) / 2, wv1 + 0.7, y, 'wardrobe', 1.0); }
    };
    room(0.35, 0.4, 2.45, 2.6, [3.2, 0.37, 'v'], [4.6, 0.3, 6.3, 0.9]);
    room(8.6, 0.4, 10.7, 2.6, [9.2, 0.37, 'v'], null);
    room(0.35, 4.8, 2.35, 6.9, [3.6, 4.67, 'v'], [4.2, 6.6, 5.3, 7.35]);
    // 保險箱（B 房，只係地下嗰層有）
    if (L === 0) { hb(6.8, 0.35, 7.7, 1.15, y, y + 0.9, std('#37474f', { metalness: 0.8, roughness: 0.3 })); hb(7.2, 1.15, 7.4, 1.18, y + 0.4, y + 0.55, std('#ffd54f', { metalness: 0.9 }), false); spot(7.25, 1.9, y, 'safe', 1.0); inter.push({ pos: at(7.25, 1.9, y), r: 1.1, label: () => '🔐 打開屋企保險箱（金條銀條）', act: () => api.homeSafe() }); }
    // ---------- 露台（左邊，電視 / 梳化嗰邊出去）----------
    hb(-1.4, 9.6, 0, 11.9, y - 0.25, y, std('#bfa36a')); hb(-1.4, 9.6, -1.25, 11.9, y, y + 1.1, GOLD); hb(-1.4, 9.5, 0, 9.6, y, y + 1.1, GOLD); hb(-1.4, 11.9, 0, 12.0, y, y + 1.1, GOLD);
    hb(-1.2, 11.0, -0.45, 11.75, y, y + 0.65, std('#eceff1')); { const [x, z] = P(-0.8, 11.37); const f = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16); f.rotateZ(Math.PI / 2); f.translate(x - 0.38, y + 0.33, z); B.add(f, std('#78909c')); }
    spot(-0.7, 10.4, y, 'acSplit', 1.0);
    { const [x, z] = P(-0.8, 9.95); const pot = new THREE.CylinderGeometry(0.22, 0.18, 0.4, 10); pot.translate(x, y + 0.2, z); B.add(pot, IM.pot); const pl = new THREE.SphereGeometry(0.35, 10, 8); pl.translate(x, y + 0.7, z); B.add(pl, IM.plant); }
  }
  // 室外樓梯（飯枱嗰邊外面，來回兩段：地下 → 2 樓 → 3 樓），每層有門口入屋
  {
    const S = std('#d9d2c3'), RISE = FH / 8, RUN = 0.8, A = W, Bc = W + 1.6, C = W + 3.2, V0 = 7.4, V1 = 9.0, V2 = V1 + 8 * RUN;
    for (let k = 0; k < 8; k++) hb(A, V2 - (k + 1) * RUN, Bc, V2 - k * RUN, 0, (k + 1) * RISE, S);              // 第 1 段：向屋後面行上 2 樓
    hb(A, V0, C, V1, FH - 0.25, FH, S);                                                                          // 2 樓平台（門口外）
    for (let k = 0; k < 8; k++) hb(Bc, V1 + k * RUN, C, V1 + (k + 1) * RUN, FH, FH + (k + 1) * RISE, S);       // 第 2 段：向廣場行上 3 樓
    hb(A, V2, C, V2 + 1.6, 2 * FH - 0.25, 2 * FH, S);                                                            // 頂平台
    hb(A, V0, Bc, V2, 2 * FH - 0.25, 2 * FH, S);                                                                 // 3 樓行人走廊（喺第 1 段上面）
    hb(W, V0 - 0.1, C, V0, 0, 0.3, S);                                                                           // 地下門口外地台
    // 黃金扶手
    hb(C - 0.08, V0, C, V2 + 1.6, FH, FH + 1.1, GOLD); hb(C - 0.08, V0, C, V2 + 1.6, 2 * FH, 2 * FH + 1.1, GOLD);
    hb(A, V2 + 1.52, C, V2 + 1.6, 2 * FH, 2 * FH + 1.1, GOLD); hb(Bc - 0.04, V1, Bc + 0.04, V2, 2 * FH, 2 * FH + 1.1, GOLD);
    hb(A, V0 - 0.08, C, V0, FH, FH + 1.1, GOLD); hb(A, V0 - 0.08, C, V0, 2 * FH, 2 * FH + 1.1, GOLD);
    for (let v = V0; v <= V2 + 1.6; v += 2) { hb(C - 0.12, v - 0.06, C, v + 0.06, 0, 2 * FH + 1.1, GOLD, false); }
    { const [x, z] = P(Bc, V2 + 1.65); sign(B, x, 2.6, z, 2.6, 0.5, signMat('⬆ 樓梯上 2 / 3 樓', '#5a1a0e', '#ffd77a'), '-z'); }
  }
  // 屋頂（黃金）+ 招牌
  hb(-0.3, -0.3, W + 0.3, D + 0.3, N * FH - 0.2, N * FH + 0.4, GOLD);
  for (let u = 0.5; u <= W - 0.5; u += 1.5) { const [x, z] = P(u, D + 0.2); const s = new THREE.SphereGeometry(0.28, 10, 8); s.translate(x, N * FH + 0.75, z); B.add(s, GOLD); }
  { const [x, z] = P(W / 2, D + 0.27); sign(B, x, N * FH - 0.9, z, 6, 0.9, signMat('🏠 柏熙屋企', '#5a1a0e', '#ffd77a', 'bold 64px sans-serif'), '-z'); }
  const g = B.build(); scene.add(g);
  // CCTV 鏡頭：門口、每層客廳
  const cams = [];
  { const c = new THREE.PerspectiveCamera(70, 4 / 3, 0.1, 400); const [x, z] = P(6.3, D + 6); c.position.set(x, 4, z); const [lx, lz] = P(6.3, D); c.lookAt(lx, 1.2, lz); cams.push({ name: '柏熙屋企 門口', cam: c }); }
  for (let L = 0; L < N; L++) { const c = new THREE.PerspectiveCamera(75, 4 / 3, 0.05, 60); const [x, z] = P(10.6, 12.6); c.position.set(x, L * FH + 2.7, z); const [lx, lz] = P(3, 9); c.lookAt(lx, L * FH + 0.8, lz); cams.push({ name: `柏熙屋企 ${L + 1} 樓客廳`, cam: c }); }
  const inside = p => { const u = X0 - p.x, v = D - (p.z - Z0); return u > -1.5 && u < W - 0.05 && v > -0.1 && v < D + 0.1 && p.y > -1 && p.y < N * FH; };
  const floorOf = p => Math.max(0, Math.min(N - 1, Math.floor((p.y + 0.5) / FH)));
  const stairPos = L => at(W - 1.0, 8.25, L * FH + 0.05);
  return { colliders: B.cols, interactables: inter, spots, cams, inside, floorOf, stairPos, door: at(6.3, D + 1.2, 0.1) };
}
