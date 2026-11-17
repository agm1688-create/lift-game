// 日出康城（地圖最右面）：海邊高樓屋苑 + 商場平台 + 港鐵康城站 + 海濱長廊
// 豪景花園門口有直通直升機 / 小巴嚟呢度；呢度都有直升機坪同小巴站返豪景花園
import * as THREE from 'three';
import { Batch, FAC, MAT, tree, planeGeo, LOHAS } from './city.js';
import { IM, signMat, sign, plant } from './interiors.js';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...e });
export const LOHAS_PAD = { x: 4760, z: 2420 }, LOHAS_BUS = { x: 4380, z: 2450 };
const SEA_X = 4800, SEA_Z = 2830;   // 東面 / 南面係海

export function buildLohas(scene, api) {
  const B = new Batch(), inter = [];
  const pave = std('#a8a294', { map: TX.tileTex(1, 1, '#dcd6c8', '#c2baa8') }), grass = std('#6cbf5a'), white = std('#f5f5f5'), rail = std('#546e7a', { metalness: 0.6 });
  const L = LOHAS;
  // 地面 + 海
  B.add(planeGeo(L.x0, L.z0, SEA_X, SEA_Z, 0.02, 4), pave);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), MAT.water);
  sea.rotation.x = -Math.PI / 2; sea.scale.set(L.x1 - 6 - SEA_X, L.z1 - 6 - L.z0, 1); sea.position.set((SEA_X + L.x1 - 6) / 2, 0.03, (L.z0 + L.z1 - 6) / 2); scene.add(sea);
  const sea2 = sea.clone(); sea2.scale.set(SEA_X - L.x0, L.z1 - 6 - SEA_Z, 1); sea2.position.set((L.x0 + SEA_X) / 2, 0.03, (SEA_Z + L.z1 - 6) / 2); scene.add(sea2);
  const sea3 = sea.clone(); sea3.scale.set(900, 2400, 1); sea3.position.set(5456, 0.03, 2600); scene.add(sea3);
  // 海邊欄杆（唔好跌落海）
  B.box(SEA_X, 0, L.z0, SEA_X + 0.2, 1.1, SEA_Z, rail); B.box(L.x0, 0, SEA_Z, SEA_X, 1.1, SEA_Z + 0.2, rail);
  for (let z = L.z0 + 10; z < SEA_Z; z += 30) { B.box(SEA_X - 3, 0, z, SEA_X - 1.5, 0.45, z + 2.2, IM.wood); tree(B, SEA_X - 10, z + 15, 1.1, false); B.box(SEA_X - 6.1, 0, z - 0.1, SEA_X - 5.9, 4.5, z + 0.1, rail, false); B.box(SEA_X - 6.3, 4.5, z - 0.3, SEA_X - 5.7, 4.8, z + 0.3, IM.light, false); }
  for (let x = L.x0 + 20; x < SEA_X; x += 30) { B.box(x, 0, SEA_Z - 3, x + 2.2, 0.45, SEA_Z - 1.5, IM.wood); tree(B, x + 15, SEA_Z - 10, 1.1, false); }
  sign(B, SEA_X - 30, 3, SEA_Z - 6, 14, 1.4, signMat('🌊 海濱長廊 WATERFRONT PROMENADE', '#0277bd', '#fff'), '-z');
  // 公園草地
  B.add(planeGeo(4560, 2720, 4780, 2810, 0.03, 4), grass);
  for (let k = 0; k < 18; k++) tree(B, 4570 + (k % 6) * 38, 2730 + Math.floor(k / 6) * 30, 1.2, k % 3 === 0);
  // 商場平台（康城商場）：地下可以行入去
  const M = { x0: 4440, x1: 4680, z0: 2520, z1: 2680, h: 14 };
  const wallM = std('#e8e2d6'), glass = IM.glass;
  B.box(M.x0, M.h - 0.6, M.z0, M.x1, M.h, M.z1, wallM);                             // 平台頂
  B.box(M.x0, 0, M.z0, M.x1, M.h - 0.6, M.z0 + 0.4, wallM); B.box(M.x0, 0, M.z1 - 0.4, M.x1, M.h - 0.6, M.z1, wallM); B.box(M.x1 - 0.4, 0, M.z0, M.x1, M.h - 0.6, M.z1, wallM);
  // 西面玻璃幕牆 + 大門
  B.box(M.x0, 0, M.z0, M.x0 + 0.3, M.h - 0.6, 2590, glass); B.box(M.x0, 0, 2610, M.x0 + 0.3, M.h - 0.6, M.z1, glass); B.box(M.x0, 5, 2590, M.x0 + 0.3, M.h - 0.6, 2610, glass);
  sign(B, M.x0 - 0.1, 9, 2600, 30, 3.2, signMat('🛍 康城商場 THE MALL', '#6a1b9a', '#fff'), '-x');
  B.add(planeGeo(M.x0, M.z0, M.x1, M.z1, 0.04, 3), IM.marble);
  for (let x = M.x0 + 10; x < M.x1; x += 14) for (let z = M.z0 + 10; z < M.z1; z += 14) B.box(x - 1, M.h - 0.65, z - 1, x + 1, M.h - 0.6, z + 1, IM.light, false);
  for (let x = M.x0 + 40; x < M.x1 - 10; x += 40) for (const z of [M.z0 + 40, M.z1 - 40]) B.box(x - 1.2, 0, z - 1.2, x + 1.2, M.h - 0.6, z + 1.2, std('#d7ccc8'));
  // 舖頭（南北兩排）
  const SHOPS = [['🍔 快餐店', 'mcd', '#c62828'], ['🍗 炸雞店', 'kfc', '#b71c1c'], ['🍚 牛丼店', 'yoshinoya', '#ef6c00'], ['🛒 超級市場', 'parknshop', '#1565c0'], ['🥢 酒樓', 'restaurant', '#8d6e63'], ['🛒 超市', 'wellcome', '#c62828']];
  SHOPS.forEach(([n, key, c], k) => {
    const north = k < 3, x = M.x0 + 50 + (k % 3) * 60, z = north ? M.z0 + 0.4 : M.z1 - 12.4;
    B.box(x, 0, z, x + 40, 6, z + 12, std(c), false);
    const front = north ? z + 12.05 : z - 0.05;
    sign(B, x + 20, 4.8, front, 16, 1.6, signMat(n, c, '#fff'), north ? '+z' : '-z');
    B.box(x + 10, 0, north ? z + 12 : z - 2, x + 30, 1.1, north ? z + 13 : z - 1, IM.wood);
    inter.push({ pos: new V3(x + 20, 0, north ? z + 15 : z - 4), r: 4, label: () => `${n}（康城商場）`, act: () => api.openShop(key, n.slice(2), [c, '#ffffff']) });
  });
  B.box(4600, 0, 2590, 4640, 0.6, 2610, std('#4fc3f7'), true);   // 中庭噴水池
  sign(B, 4620, 3.5, 2589.9, 12, 1.2, signMat('🌅 歡迎嚟到日出康城 Welcome to LOHAS Park', '#ff6f00', '#fff'), '-z');
  // 住宅大廈：平台頂 + 周圍
  const towers = [];
  const tower = (x, z, y0, h, f, name) => { const w = 26; B.box(x - w / 2, y0, z - w / 2, x + w / 2, y0 + h, z + w / 2, FAC[f].m); B.box(x - w / 2 - 0.3, y0 + h, z - w / 2 - 0.3, x + w / 2 + 0.3, y0 + h + 1.2, z + w / 2 + 0.3, MAT.roof, false); B.box(x - 4, y0 + h + 1.2, z - 3, x + 4, y0 + h + 5, z + 3, MAT.roof, false); towers.push({ x, z, y0, h, name }); };
  let n = 1;
  for (const [x, z] of [[4480, 2550], [4540, 2550], [4600, 2550], [4660, 2550], [4480, 2650], [4540, 2650], [4600, 2650], [4660, 2650]]) tower(x, z, M.h, 150 + (n * 37) % 45, [3, 1, 3, 0][n % 4], `第${Math.ceil(n++ / 2)}期`);
  for (const [x, z] of [[4360, 2360], [4420, 2360], [4480, 2360], [4560, 2360], [4640, 2360], [4360, 2760], [4430, 2760], [4500, 2760], [4740, 2560], [4740, 2660]]) tower(x, z, 0, 140 + (n * 53) % 60, [3, 1, 3, 0][n % 4], `第${Math.ceil(n++ / 2)}期`);
  towers.forEach(t => { if (t.y0 === 0) sign(B, t.x, 5, t.z + 13.1, 10, 1.4, signMat(`🏢 日出康城 ${t.name}`, '#37474f'), '+z'); });
  // 入口大牌
  B.box(4317.5, 0, 2569.5, 4318.5, 8, 2570.5, std('#ff8f00')); B.box(4317.5, 0, 2629.5, 4318.5, 8, 2630.5, std('#ff8f00'));
  sign(B, 4317.4, 9.5, 2600, 60, 4, signMat('🌅 日出康城 LOHAS PARK', '#ff6f00', '#fff', 'bold 60px sans-serif'), '-x');
  // 直升機坪 + 小巴站
  const pad = new THREE.Mesh(new THREE.CircleGeometry(11, 32), signMat('H', '#2b2f36', '#ffd54f', 'bold 90px sans-serif')); pad.rotation.x = -Math.PI / 2; pad.position.set(LOHAS_PAD.x, 0.05, LOHAS_PAD.z); scene.add(pad);
  sign(B, LOHAS_PAD.x - 14, 3, LOHAS_PAD.z, 8, 1.2, signMat('🚁 直升機坪：直航豪景花園', '#1565c0'), '-x');
  B.box(LOHAS_PAD.x - 14.1, 0, LOHAS_PAD.z - 0.1, LOHAS_PAD.x - 13.9, 2.4, LOHAS_PAD.z + 0.1, rail, false);
  B.box(LOHAS_BUS.x - 2, 0, LOHAS_BUS.z - 8, LOHAS_BUS.x + 2, 0.2, LOHAS_BUS.z + 8, std('#9e9e9e'), false);
  B.box(LOHAS_BUS.x + 2.5, 2.6, LOHAS_BUS.z - 6, LOHAS_BUS.x + 5, 2.8, LOHAS_BUS.z + 6, std('#2e7d32'), false);
  sign(B, LOHAS_BUS.x + 3, 3.4, LOHAS_BUS.z, 9, 1.2, signMat('🚐 小巴總站：往豪景花園', '#2e7d32'), '-x');
  inter.push({ pos: new V3(LOHAS_PAD.x - 12, 0, LOHAS_PAD.z), r: 4, label: () => '🚁 搭直通直升機返豪景花園', act: () => api.shuttle('heli', 'village') });
  inter.push({ pos: new V3(LOHAS_BUS.x + 3, 0, LOHAS_BUS.z), r: 4, label: () => '🚐 搭小巴返豪景花園', act: () => api.shuttle('minibus', 'village') });
  const g = B.build(); scene.add(g);
  function update(p) { const near = p.x > L.x0 - 2500 && p.z > L.z0 - 2500 && p.z < L.z1 + 2500; g.visible = sea.visible = sea2.visible = sea3.visible = pad.visible = near || p.y > 300; }
  return { colliders: B.cols, interactables: inter, update, center: new V3(4400, 0.1, 2600), pad: new V3(LOHAS_PAD.x, 0, LOHAS_PAD.z), bus: new V3(LOHAS_BUS.x, 0, LOHAS_BUS.z) };
}
