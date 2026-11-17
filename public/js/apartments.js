// 豪景花園住宅樓層：喺大堂搭 Lift 上任何一層，每層 8 個單位（A–H 室）全部入得
// 每個單位有：玄關鞋櫃、客廳（梳化、電視、茶几）、飯廳、廚房（爐頭、星盆、雪櫃、洗衣機）、
// 主人房（雙人床、衣櫃）、睡房（單人床、書枱、電腦）、浴室（坐廁、洗手盆、企缸）、窗外海景
// 所有座 / 所有樓層共用同一個模板（喺地圖以外），HUD 顯示你身處邊座幾樓
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign } from './interiors.js';
import * as TX from './textures.js';

export const APT = { x: 6600, z: 0 };
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...e });
const H = 2.9, T = 0.14;

export function buildApartments(scene, api) {
  const B = new Batch(), inter = [];
  const X = APT.x, Z = APT.z;
  const bx = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + Math.min(x0, x1), y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), y1, Z + Math.max(z0, z1), m, col);
  const M = {
    wall: std('#f4f1ea'), wall2: std('#e8efe9'), corr: std('#d9d4c6'), floorWood: std('#fff', { map: TX.woodTex(1) }), tile: IM.tile,
    corrFloor: std('#fff', { map: TX.tileTex(1, 1, '#d8d2c4', '#b9b09c') }), door: std('#7a4e2d', { roughness: 0.5 }), gate: std('#5f6b73', { metalness: 0.8, roughness: 0.35 }),
    sofa: [std('#6d5848', { roughness: 0.95 }), std('#3f5f8a', { roughness: 0.95 }), std('#8a3f3f', { roughness: 0.95 }), std('#5f7a4a', { roughness: 0.95 })],
    bed: [std('#d18b47'), std('#7aa6d8'), std('#e7a1b0'), std('#9ccc65')],
    white: IM.white, black: IM.black, steel: IM.steel, wood: IM.wood, dark: IM.dark, glass: IM.glass, porcelain: IM.porcelain, linen: IM.linen, screen: IM.screen,
    light: IM.light, red: std('#c62828'), cab: std('#c9b18a', { roughness: 0.5 }), fridge: std('#e9eef2', { metalness: 0.3, roughness: 0.3 }),
  };
  // 地台 + 天花
  bx(-21, -0.3, -12, 21, 0, 12, M.corr);
  const ceil = new THREE.PlaneGeometry(42, 24); ceil.rotateX(Math.PI / 2); ceil.translate(X, H, Z); B.add(ceil, IM.ceiling);
  B.cols.push({ min: [X - 21, H, Z - 12], max: [X + 21, H + 0.3, Z + 12] });   // 天花（鏡頭唔會穿出去）
  // 走廊（z -1.5..1.5）
  bx(-20, 0, -1.5, 20, 0.01, 1.5, M.corrFloor, false);
  for (let x = -18; x <= 18; x += 4) bx(x - 0.5, H - 0.03, -0.2, x + 0.5, H, 0.2, M.light, false);
  // 走廊兩頭：窗
  [-1, 1].forEach(s => { bx(s * 20, 0, -1.5, s * 20 + s * T, H, 1.5, M.corr); bx(s * 20 - s * 0.02, 1.0, -1.0, s * 20 + s * 0.02 - s * 0.01, 2.3, 1.0, M.glass, false); });
  sign(B, X - 19.9, 2.4, Z, 2.4, 0.5, signMat('🔥 後樓梯 EXIT', '#1b5e20'), '+x');
  sign(B, X + 19.9, 0.6, Z, 1.6, 0.4, signMat('🧯 消防喉轆', '#b71c1c'), '-x');
  // 升降機大堂（北面中間 x -2.5..2.5, z -5..-1.5）
  bx(-2.5, 0, -5.14, 2.5, H, -5, M.corr);
  [-1.25, 1.25].forEach((x, k) => {
    bx(x - 0.95, 0, -5, x + 0.95, 2.6, -4.95, IM.gold, false);
    bx(x - 0.8, 0, -4.95, x + 0.8, 2.4, -4.92, IM.steel, false);
    bx(x - 0.02, 0, -4.92, x + 0.02, 2.4, -4.91, M.black, false);
    bx(x - 0.3, 2.65, -5, x + 0.3, 2.85, -4.94, M.screen, false);
    sign(B, X + x, 2.75, Z - 4.93, 0.55, 0.18, signMat(`${k + 1}號 Lift`, '#0d1b2a', '#ff6d4b', 'bold 60px monospace'), '+z');
  });
  bx(-0.12, 1.0, -4.99, 0.12, 1.4, -4.93, IM.gold, false);
  bx(-2.4, 0, -4.6, -2.0, 0.9, -3.8, std('#4caf50'), true);   // 回收箱
  sign(B, X - 2.2, 1.1, Z - 3.6, 0.5, 0.25, signMat('♻ 回收', '#2e7d32'), '+z');
  // 樓層牌（動態）
  const flC = document.createElement('canvas'); flC.width = 512; flC.height = 160;
  const flTex = new THREE.CanvasTexture(flC); flTex.colorSpace = THREE.SRGBColorSpace;
  const flSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshBasicMaterial({ map: flTex }));
  flSign.position.set(X, 2.25, Z - 1.4); scene.add(flSign);
  const flSign2 = flSign.clone(); flSign2.position.set(X, 2.25, Z + 1.4); flSign2.rotation.y = Math.PI; scene.add(flSign2);
  function drawFloorSign(name, f) {
    const g = flC.getContext('2d'); g.fillStyle = '#263238'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#ffd864'; g.fillRect(0, 150, 512, 10);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 58px sans-serif'; g.fillText(`${name}  ${f} 樓`, 256, 58);
    g.font = '34px sans-serif'; g.fillStyle = '#cfd8dc'; g.fillText('A B ← 　 → C D ｜ E F G H', 256, 120);
    flTex.needsUpdate = true;
  }

  // 窗外景色（海、山、遠處嘅橋）
  const view = TX.canvasTex(1024, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#6fb2ef'); sky.addColorStop(1, '#cfe8fb'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7d9f86'; g.beginPath(); g.moveTo(0, h * 0.55); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * (0.42 + 0.1 * Math.sin(x / 90) + 0.05 * Math.sin(x / 37))); g.lineTo(w, h * 0.55); g.fill();
    const sea = g.createLinearGradient(0, h * 0.55, 0, h); sea.addColorStop(0, '#3d8fc6'); sea.addColorStop(1, '#1f5f8f'); g.fillStyle = sea; g.fillRect(0, h * 0.55, w, h);
    g.strokeStyle = '#eceff1'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.55, h * 0.5); g.lineTo(w * 0.98, h * 0.5); g.stroke();
    [0.65, 0.85].forEach(f => { g.fillStyle = '#eceff1'; g.fillRect(w * f - 3, h * 0.3, 6, h * 0.22); g.beginPath(); for (let k = -8; k <= 8; k++) { g.moveTo(w * f, h * 0.31); g.lineTo(w * f + k * 9, h * 0.5); } g.stroke(); });
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(Math.random() * w, h * 0.6 + Math.random() * h * 0.4, 14, 2); }
    g.fillStyle = '#fff'; g.fillRect(w * 0.3, h * 0.66, 26, 8); g.fillStyle = '#c62828'; g.fillRect(w * 0.3, h * 0.66 + 8, 26, 4);
  });
  const viewM = new THREE.MeshBasicMaterial({ map: view, fog: false });
  [-1, 1].forEach(s => { const v = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), viewM); v.position.set(X, 3, Z + s * 16); v.rotation.y = s > 0 ? Math.PI : 0; scene.add(v); });
  const viewE = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), viewM); viewE.position.set(X + 26, 2, Z); viewE.rotation.y = -Math.PI / 2; scene.add(viewE);
  const viewW = viewE.clone(); viewW.position.x = X - 26; viewW.rotation.y = Math.PI / 2; scene.add(viewW);

  // ===== 單位 =====
  // x0..x1：單位闊；side -1 = 北面（向 -z 伸入去），+1 = 南面；深 9 米
  const UNITS = [];
  function unit(x0, x1, side, letter, idx) {
    const W = x1 - x0, Dp = 9;
    const P = (u, v) => [x0 + u, side * (1.5 + v)];
    const fb = (u0, v0, u1, v1, y0, y1, m, col = true) => { const [a, b] = P(u0, v0), [c, d] = P(u1, v1); bx(a, y0, b, c, y1, d, m, col); };
    const sofaM = M.sofa[idx % 4], bedM = M.bed[(idx + 1) % 4];
    // 地板：前半木地板、浴室 / 廚房瓷磚
    fb(0, 0, W, Dp, 0, 0.012, M.floorWood, false);
    fb(0, 0, 3, 3.2, 0.013, 0.016, M.tile, false);
    fb(3.8, 5.6, 5.6, Dp, 0.013, 0.016, M.tile, false);
    // 外框牆
    const dA = W - 2.15, dB = W - 1.05;                     // 大門位
    fb(0, 0, dA, T, 0, H, M.wall); fb(dB, 0, W, T, 0, H, M.wall); fb(dA, 0, dB, T, 2.1, H, M.wall);
    fb(0, 0, T, Dp, 0, H, M.wall); fb(W - T, 0, W, Dp, 0, H, M.wall);
    fb(0, Dp - T, W, Dp, 0, 0.9, M.wall); fb(0, Dp - T, W, Dp, 2.3, H, M.wall);
    fb(0.2, Dp - 0.08, W - 0.2, Dp - 0.04, 0.9, 2.3, M.glass);                         // 窗（有碰撞）
    for (let u = 0.2; u < W - 0.1; u += (W - 0.4) / 3) fb(u - 0.04, Dp - 0.1, u + 0.04, Dp, 0.9, 2.3, M.steel, false);
    fb(0.1, Dp - 0.6, W - 0.1, Dp - T, 0.5, 0.55, M.white);                             // 窗台
    // 門牌 + 木門（打開咗）+ 鐵閘（摺埋）
    const [sx, sz] = P(dA + 0.55, -0.02);
    sign(B, X + sx, 2.35, Z + sz, 0.9, 0.36, signMat(`${letter} 室`, '#5d4037', '#ffe082', 'bold 64px serif'), side < 0 ? '+z' : '-z');
    fb(dA - 0.05, 0.15, dA + 0.0, 1.05, 0, 2.05, M.door, false);
    fb(dB, -0.12, dB + 0.12, -0.02, 0, 2.05, M.gate, false);
    const [mx, mz] = P(dA + 0.2, -0.03); B.box(X + mx - 0.08, 1.05, Z + mz - 0.02, X + mx + 0.08, 1.25, Z + mz + 0.02, IM.gold, false);  // 門鐘
    // 廚房（u 0..3, v 0..3.2）
    fb(3, 0, 3 + T, 1.0, 0, H, M.wall2); fb(3, 2.0, 3 + T, 3.2 + T, 0, H, M.wall2); fb(3, 1.0, 3 + T, 2.0, 2.1, H, M.wall2);
    fb(0, 3.2, 3 + T, 3.2 + T, 0, H, M.wall2);
    fb(T, T, 0.75, 3.1, 0, 0.88, M.cab); fb(T, T, 0.78, 3.1, 0.88, 0.92, IM.marble, false);
    fb(0.25, 0.5, 0.6, 0.85, 0.92, 0.95, M.black, false); fb(0.25, 1.0, 0.6, 1.35, 0.92, 0.95, M.black, false);   // 爐頭
    fb(T, 0.4, 0.55, 1.45, 1.6, 1.9, M.steel, false);                                       // 抽油煙機
    fb(0.25, 2.0, 0.65, 2.6, 0.82, 0.93, M.steel, false);                                     // 星盆
    fb(T, 1.7, 0.45, 2.9, 1.5, 2.3, M.cab, false);                                            // 吊櫃
    fb(2.15, T, 2.9, 0.85, 0, 1.85, M.fridge);                                                 // 雪櫃
    fb(2.2, 2.45, 2.9, 3.1, 0, 0.85, M.white);                                                 // 洗衣機
    const [wx, wz] = P(2.55, 2.42); B.box(X + wx - 0.18, 0.35, Z + wz - 0.01, X + wx + 0.18, 0.7, Z + wz + 0.01, M.glass, false);
    // 客飯廳
    fb(W - 0.55, 0.25, W - T, 1.25, 0, 1.0, M.cab);                                           // 鞋櫃
    fb(T, 3.5, 0.6, 5.3, 0, 0.5, M.dark);                                                      // 電視櫃
    fb(T, 3.7, 0.2, 5.1, 0.9, 1.65, M.screen, false);                                          // 電視
    fb(3.3, 3.5, 4.2, 5.4, 0, 0.42, sofaM); fb(4.0, 3.5, 4.25, 5.4, 0.42, 0.9, sofaM, false);  // 梳化
    fb(1.6, 4.0, 2.5, 4.9, 0.38, 0.42, IM.black); fb(1.65, 4.05, 2.45, 4.85, 0, 0.38, M.wood, false);   // 茶几
    const dtx = Math.min(W - 2.2, 5.8);
    fb(dtx - 0.6, 1.2, dtx + 0.6, 2.2, 0.72, 0.76, M.wood);                                    // 飯枱
    fb(dtx - 0.55, 1.25, dtx - 0.5, 2.15, 0, 0.72, M.steel, false); fb(dtx + 0.5, 1.25, dtx + 0.55, 2.15, 0, 0.72, M.steel, false);
    [[-0.35, 0.85], [0.35, 0.85], [-0.35, 2.55], [0.35, 2.55]].forEach(([du, v]) => { fb(dtx + du - 0.2, v - 0.2, dtx + du + 0.2, v + 0.2, 0.42, 0.46, M.dark, false); fb(dtx + du - 0.2, v + (v < 1.5 ? -0.22 : 0.18), dtx + du + 0.2, v + (v < 1.5 ? -0.18 : 0.22), 0.46, 0.92, M.dark, false); });
    fb(W - 0.6, 4.6, W - T, 5.4, 0, 0.5, IM.pot); fb(W - 0.55, 4.65, W - 0.2, 5.35, 0.5, 1.4, IM.plant, false);   // 植物
    fb(T, 2.0, T + 0.02, 2.6, 1.6, 2.0, IM.gold, false);                                         // 掛鐘位
    // 後半：房間間隔（v 5.6）
    const V = 5.6;
    fb(0, V, 2.6, V + T, 0, H, M.wall2); fb(3.5, V, 4.2, V + T, 0, H, M.wall2); fb(5.1, V, 5.9, V + T, 0, H, M.wall2); fb(6.8, V, W, V + T, 0, H, M.wall2);
    fb(2.6, V, 3.5, V + T, 2.1, H, M.wall2); fb(4.2, V, 5.1, V + T, 2.1, H, M.wall2); fb(5.9, V, 6.8, V + T, 2.1, H, M.wall2);
    fb(3.8, V, 3.8 + T, Dp, 0, H, M.wall2); fb(5.6 - T, V, 5.6, Dp, 0, H, M.wall2);
    // 主人房（u 0..3.8）
    fb(0.2, 6.3, 2.2, 7.9, 0, 0.45, M.dark); fb(0.25, 6.35, 2.15, 7.85, 0.45, 0.6, M.linen, false); fb(0.7, 6.35, 2.15, 7.85, 0.6, 0.63, bedM, false);
    fb(T, 6.3, 0.25, 7.9, 0.45, 1.2, M.dark, false); fb(0.3, 6.5, 0.6, 7.7, 0.6, 0.72, M.white, false);
    fb(T, 8.0, 0.6, 8.6, 0, 0.55, M.wood);                                                       // 床頭櫃
    fb(3.2, 6.0, 3.8 - 0.01, 8.6, 0, 2.2, M.cab);                                                 // 衣櫃
    fb(3.18, 7.28, 3.2, 7.32, 0.2, 2.0, M.dark, false);
    // 浴室（u 3.8..5.6）
    fb(3.95, 8.25, 4.45, 8.85, 0, 0.42, M.porcelain); fb(3.95, 8.6, 4.45, 8.85, 0.42, 0.8, M.porcelain, false);   // 坐廁
    fb(5.15, 6.2, 5.6 - T, 6.9, 0.8, 0.88, M.porcelain); fb(5.3, 6.2, 5.6 - T, 6.9, 0, 0.8, M.white, false);       // 洗手盆
    fb(5.6 - T - 0.02, 6.25, 5.6 - T, 6.85, 1.2, 1.9, std('#dfe7ec', { metalness: 1, roughness: 0.05 }), false);  // 鏡
    fb(4.7, 7.2, 5.6 - T, 8.85, 0, 0.06, M.white, false); fb(4.68, 7.2, 4.72, 8.6, 0.06, 2.0, M.glass);          // 企缸
    fb(5.35, 8.2, 5.45, 8.3, 1.8, 2.0, M.steel, false);
    // 細房（u 5.6..W）
    fb(W - 1.15, 6.6, W - T, 8.7, 0, 0.42, M.dark); fb(W - 1.12, 6.62, W - 0.17, 8.68, 0.42, 0.56, M.linen, false); fb(W - 1.12, 6.62, W - 0.17, 8.2, 0.56, 0.59, bedM, false);
    fb(5.75, 8.2, 7.0, 8.75, 0.72, 0.76, M.wood); fb(5.8, 8.25, 5.85, 8.7, 0, 0.72, M.steel, false); fb(6.9, 8.25, 6.95, 8.7, 0, 0.72, M.steel, false);
    fb(6.15, 8.5, 6.65, 8.55, 0.8, 1.15, M.screen, false); fb(6.0, 8.2, 6.8, 8.35, 0.76, 0.78, M.black, false);
    fb(6.2, 7.5, 6.6, 7.9, 0.42, 0.46, M.red, false); fb(6.2, 7.46, 6.6, 7.5, 0.46, 0.85, M.red, false);
    fb(5.6, 5.8, 6.0, 6.2, 0, 1.8, M.wood);                                                        // 書櫃
    // 天花燈
    [[1.5, 1.6], [W / 2 + 1, 2.8], [1.9, 7.2], [4.7, 7.3], [(5.6 + W) / 2, 7.3]].forEach(([u, v]) => fb(u - 0.35, v - 0.35, u + 0.35, v + 0.35, H - 0.04, H - 0.01, M.light, false));
    const [cx, cz] = P(W / 2, 4.5);
    UNITS.push({ letter, x0, x1, side, cx: X + cx, cz: Z + cz });
    // 互動：開燈 / 煮嘢食 / 瞓覺
    const at = (u, v) => { const [a, b] = P(u, v); return new THREE.Vector3(X + a, 0, Z + b); };
    inter.push({ pos: at(1.1, 1.5), r: 1.2, label: () => '🍳 喺廚房煮個公仔麵', act: () => api.toast('🍜 煮咗一碗公仔麵加蛋，好香！', 2500) });
    inter.push({ pos: at(1.5, 4.5), r: 1.3, label: () => '📺 開電視', act: () => api.toast(['📺 新聞報道：今日天晴，最高氣溫 28 度', '📺 卡通片播緊！', '📺 足球直播：1 比 0！'][Math.floor(Math.random() * 3)], 2500) });
    inter.push({ pos: at(1.2, 7.0), r: 1.4, label: () => '🛏 瞓一陣', act: () => api.nap() });
    inter.push({ pos: at(4.4, 8.0), r: 1.0, label: () => '🚽 去廁所', act: () => { api.sfx.whoosh(); api.toast('🚽 沖廁 ～', 1500); } });
  }
  unit(-20, -11.25, -1, 'A', 0); unit(-11.25, -2.5, -1, 'B', 1); unit(2.5, 11.25, -1, 'C', 2); unit(11.25, 20, -1, 'D', 3);
  unit(-20, -10, 1, 'E', 4); unit(-10, 0, 1, 'F', 5); unit(0, 10, 1, 'G', 6); unit(10, 20, 1, 'H', 7);
  // 升降機大堂後面（垃圾房 / 後樓梯）：封住
  bx(-2.5, 0, -10.5, 2.5, H, -5.14, M.corr);
  sign(B, X, 1.6, Z - 5.16, 1.3, 0.3, signMat('🗑 垃圾房', '#455a64'), '+z');

  const g = B.build(); g.traverse(o => { if (o.isMesh) o.castShadow = false; }); scene.add(g);
  const objs = [g, flSign, flSign2, viewW, viewE];
  scene.children.filter(o => o.material === viewM).forEach(o => objs.push(o));

  // ===== 狀態 + Lift =====
  let cur = null;   // { name, lv, floor, back }
  const inside = p => Math.abs(p.x - X) < 30 && Math.abs(p.z - Z) < 20;
  function goFloor(info, f) {
    api.sfx.door(); api.toast(`🛗 ${info.name} Lift ${f > (cur && cur.floor || 0) ? '上' : '落'}緊 ${f} 樓…`, 1500);
    api.blackout(() => {
      cur = { ...info, floor: f }; drawFloorSign(info.name, f);
      api.teleport(X + (Math.random() - 0.5) * 1.5, 0.05, Z - 3.6); api.face(0);
      api.sfx.ding(); api.toast(`🛎 ${info.name} ${f} 樓到。A–H 室全部入得`, 2800);
    }, 1300);
  }
  function liftMenu(info, fromLobby) {
    const opts = [];
    if (!fromLobby) opts.push({ label: '🅖 地下大堂（出返街）', fn: () => { api.sfx.door(); api.blackout(() => { const b = info.back; cur = null; api.teleport(b[0], 0.05, b[2]); api.face(Math.PI); api.sfx.ding(); api.toast(`🛎 ${info.name} 地下大堂`); }, 1300); } });
    opts.push({ label: '⚙️ Lift 頂電梯機房', sub: '入去睇電梯零件，學英文名', fn: () => { const back = cur ? [X, 0.05, Z - 3.6] : info.back; const keep = cur; api.machineRoom?.(`${info.name}`, () => { if (keep) { cur = keep; drawFloorSign(info.name, keep.floor); } api.teleport(back[0], back[1] ?? 0.05, back[2]); }); } });
    for (let f = 1; f <= info.lv; f++) opts.push({ label: `${f} 樓`, on: cur && cur.floor === f && !fromLobby, fn: () => goFloor(info, f) });
    api.choose(`🛗 ${info.name} Lift（地下 – ${info.lv} 樓）`, opts, fromLobby ? '揀你想去邊層。每層有 A–H 共 8 個單位，全部入得。' : `而家喺 ${cur.floor} 樓`, 92);
  }
  inter.push({ pos: new THREE.Vector3(X, 0, Z - 3.8), r: 2.2, label: () => cur ? `🛗 搭 Lift（而家 ${cur.floor} 樓）` : '🛗 搭 Lift', act: () => cur ? liftMenu(cur, false) : api.toast('Lift 壞咗，請用後樓梯') });
  inter.push({ pos: new THREE.Vector3(X - 19, 0, Z), r: 1.5, label: () => '🚪 後樓梯（返地下大堂）', act: () => { if (!cur) return; const b = cur.back; cur = null; api.blackout(() => { api.teleport(b[0], 0.05, b[2]); api.toast('🚶 行咗後樓梯落返地下'); }, 900); } });
  drawFloorSign('豪景花園', 1);
  return {
    colliders: B.cols, interactables: inter, inside, liftMenu,
    label: () => cur ? `🏢 ${cur.name} ${cur.floor} 樓` : null,
    key: () => cur ? `${cur.name}|${cur.floor}` : '',
    update(p) { const v = Math.abs(p.x - X) < 400 && Math.abs(p.z - Z) < 400; objs.forEach(o => o.visible = v); if (cur && !inside(p)) cur = null; },
  };
}
