// 豪景花園式屋苑（參考香港青龍頭豪景花園：3 期、28 座、山邊屋苑，北面有公路同山，南面係青山公路同海）
// 地下大堂、會所、停車場、酒樓、村屋都入得；屋苑資料參考地產網站（座數 / 層數）
import * as THREE from 'three';
import { Batch, FAC, HOUSE, MAT, VILLAGE, tree, roadGeo, planeGeo } from './city.js';
import { IM, signMat, sign, shell, storeInterior, houseInterior, plant } from './interiors.js';

const V3 = THREE.Vector3;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const V = VILLAGE;

export function buildVillage(scene) {
  const B = new Batch();
  const tower = std('#fff', { map: FAC[3].m.map }), tower2 = std('#f3e6cf', { map: FAC[3].m.map }), tower3 = std('#e7eef5', { map: FAC[3].m.map });
  const road = MAT.road, pave = MAT.pave, green = std('#5f9e4f'), water = MAT.water, sand = MAT.sand, red = std('#c0392b'), blueC = std('#2f6db5'), white = IM.white, conc = std('#b0aca4');
  // 斜置馬路段
  function seg(x0, z0, x1, z1, w = 10, y = 0.03) {
    const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(len, w); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 12);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, road);
  }
  const poly = (pts, w, y) => { for (let i = 1; i < pts.length; i++) seg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, y); };
  const arc = (cx, cz, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + (a1 - a0) * k / n; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });

  // ===== 地面 =====
  B.add(planeGeo(V.x0, 420, V.x1, 790, 0.008, 6), std('#8fbf6a'));
  // ===== 海 + 海堤 + 沙灘 + 碼頭 =====
  B.add(planeGeo(V.x0, 814, V.x1, V.z1 - 6, 0.05, 20), water);
  B.add(planeGeo(-820, 806, -700, 832, 0.06, 4), sand);
  B.box(V.x0, 0, 812, -820, 1.1, 814, conc); B.box(-700, 0, 812, V.x1, 1.1, 814, conc);
  B.cols.push({ min: [-820, 0, 832], max: [-700, 1.2, 834] });
  B.box(-430, 0, 806, -422, 0.4, 880, IM.wood); B.box(-434, 0.4, 868, -418, 4.4, 880, std('#2e7d32'), false); B.box(-434, 4.4, 866, -418, 4.8, 882, std('#1b5e20'), false);
  sign(B, -426, 5.6, 881, 12, 1.6, signMat('青龍頭碼頭 PIER', '#1b5e20'));
  B.cols.push({ min: [-431, 0, 806], max: [-430, 1.2, 880] }, { min: [-422, 0, 806], max: [-421, 1.2, 880] });

  // ===== 青山公路（大欖段）=====
  seg(V.x0, 797, V.x1, 797, 16, 0.031);
  B.add(planeGeo(V.x0, 787, V.x1, 789, 0.05, 2), pave); B.add(planeGeo(V.x0, 805, V.x1, 807, 0.05, 2), pave);
  [-900, -560].forEach(x => {
    B.box(x - 6, 0, 783, x + 6, 0.12, 788, conc, false); B.box(x - 6, 2.8, 782.5, x + 6, 3.0, 787, std('#455a64'), false);
    B.box(x - 6, 0, 782.5, x + 6, 2.8, 782.7, IM.glass); B.box(x - 4, 0, 784, x + 4, 0.45, 784.6, IM.wood);
    sign(B, x, 3.5, 787.1, 10, 1.1, signMat('🚌 青山公路 - 大欖段', '#1565c0'));
  });
  // 迴旋處
  const ring = new THREE.RingGeometry(10, 20, 30); ring.rotateX(-Math.PI / 2); ring.translate(-360, 0.032, 778); B.add(ring, road);
  const isl = new THREE.CircleGeometry(10, 24); isl.rotateX(-Math.PI / 2); isl.translate(-360, 0.06, 778); B.add(isl, green);

  // ===== 屋苑內路（龍騰路）=====
  poly([[-380, 762], [-390, 700]], 10);
  poly([[-1040, 700], [-390, 700]], 10);                                  // 南路
  poly([[-1040, 700], ...arc(-1040, 590, 110, Math.PI / 2, Math.PI * 1.5, 12).slice(1)], 10);   // 西面彎路
  poly([[-1040, 480], [-560, 480], ...arc(-560, 530, 50, -Math.PI / 2, 0, 6).slice(1), [-510, 600]], 10);  // 北路
  poly([[-1000, 600], [-390, 600]], 9);                                   // 中路
  poly([[-390, 600], [-390, 700]], 9); poly([[-640, 480], [-640, 600]], 9);
  poly([[-390, 600], [-390, 470], [-330, 430], [-300, 430]], 9);          // 出去東面

  // ===== 北面：公路（高架）+ 山 + 樹 =====
  B.box(V.x0, 22, 322, V.x1, 23, 342, conc, false); B.box(V.x0, 23, 322, V.x1, 24.2, 323, conc, false); B.box(V.x0, 23, 341, V.x1, 24.2, 342, conc, false);
  const hw = new THREE.PlaneGeometry(V.x1 - V.x0, 18); hw.rotateX(-Math.PI / 2); const huv = hw.attributes.uv; for (let i = 0; i < huv.count; i++) huv.setX(i, huv.getX(i) * (V.x1 - V.x0) / 12); hw.translate((V.x0 + V.x1) / 2, 23.02, 332); B.add(hw, road);
  for (let x = V.x0 + 20; x < V.x1; x += 40) B.box(x - 1.5, 0, 330, x + 1.5, 22, 334, conc);
  sign(B, -700, 26.5, 342.2, 30, 2.4, signMat('NEW TERRITORIES CIRCULAR ROAD 新界環迴公路', '#2e7d32'));
  for (let k = 0; k < 9; k++) { const h = new THREE.SphereGeometry(70, 16, 10); h.scale(1.2, 0.45, 0.8); h.translate(V.x0 + 50 + k * 95, -6, 365 + (k % 2) * 20); B.add(h, std('#3f7d35')); }
  let seed = 3; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 220; k++) { const x = V.x0 + 10 + R() * (V.x1 - V.x0 - 20), z = 352 + R() * 70; tree(B, x, z, 1 + R() * 0.8, R() < 0.4); }
  B.cols.push({ min: [V.x0, 0, 418], max: [V.x1 - 80, 6, 421] });           // 山邊圍欄（東面留路出入）
  for (let x = V.x0; x < V.x1 - 80; x += 3) B.box(x, 0, 419, x + 0.08, 1.2, 419.08, IM.steel, false);

  // ===== 住宅大廈 =====
  let blockNo = 1;
  function block(x0, z0, w, d, floors, mat, entry = 'z1') {
    const no = blockNo++, x1 = x0 + w, z1 = z0 + d, H = floors * 3 + 4.5, GF = 4.5;
    const I = shell(B, x0, z0, x1, z1, GF, mat);
    B.box(x0, GF, z0, x1, H, z1, mat);
    // 十字形外觀：兩邊加凸出嘅單位
    B.box(x0 - 3, GF, z0 + d * 0.3, x0, H - 3, z1 - d * 0.3, mat); B.box(x1, GF, z0 + d * 0.3, x1 + 3, H - 3, z1 - d * 0.3, mat);
    B.box(x0 - 0.4, H, z0 - 0.4, x1 + 0.4, H + 1.2, z1 + 0.4, std('#9e9e9e'), false);
    B.box(x0 + w / 2 - 3, H + 1.2, z0 + d / 2 - 3, x0 + w / 2 + 3, H + 4.5, z0 + d / 2 + 3, std('#bdbdbd'), false);
    storeInterior(B, I, 'apt', () => 0.3, `第 ${no} 座 大堂`);
    sign(B, x0 + w / 2, GF + 1.4, z1 + 0.42, 5, 1.0, signMat(`第 ${no} 座`, '#5d4037', '#ffe082'));
    return { no, x0, z0, x1, z1, H };
  }
  // 一期（第 1–6 座，19 層）：南路同青山公路之間
  for (let k = 0; k < 6; k++) block(-640 + k * 32, 718, 20, 18, 19, tower2);
  // 二期（第 7–12 座，22 層）：東面
  [[-480, 500], [-440, 500], [-480, 540], [-440, 548], [-480, 618], [-440, 622]].forEach(([x, z]) => block(x, z, 20, 20, 22, tower3));
  // 三期（第 13–28 座）：北面一排 30 層 + 中間低座 + 西南長座
  [[-1015, 430], [-990, 430], [-950, 428], [-925, 428], [-885, 430], [-860, 430], [-820, 428], [-795, 428], [-755, 430], [-730, 430], [-600, 432]].forEach(([x, z], k) => block(x, z, 20, 20, k === 2 ? 5 : 30, tower));
  [-800, -760, -720].forEach(x => block(x, 612, 26, 18, 7, tower2));
  // 第 25 座：凱旋閣式長樓（兩段斜住）
  const b25 = block(-1020, 640, 70, 20, 20, tower2); block(-945, 650, 60, 20, 20, tower2);
  sign(B, -985, 9, 660.5, 22, 2, signMat('凱旋閣', '#5d4037', '#ffe082'));

  // ===== 會所 + B 停車場 + 平台泳池 =====
  const cpX0 = -720, cpX1 = -650, cpZ0 = 492, cpZ1 = 560, CPH = 6;
  // 停車場（地下行得入，有車同柱）
  B.box(cpX0, 0, cpZ0, cpX1, CPH, cpZ0 + 0.4, conc); B.box(cpX0, 0, cpZ0, cpX0 + 0.4, CPH, cpZ1, conc); B.box(cpX1 - 0.4, 0, cpZ0, cpX1, CPH, cpZ1, conc);
  B.box(cpX0, 0, cpZ1 - 0.4, cpX0 + 25, CPH, cpZ1, conc); B.box(cpX0 + 35, 0, cpZ1 - 0.4, cpX1, CPH, cpZ1, conc); B.box(cpX0 + 25, 3.2, cpZ1 - 0.4, cpX0 + 35, CPH, cpZ1, conc);
  B.box(cpX0, CPH - 0.4, cpZ0, cpX1, CPH, cpZ1, conc);
  B.add(planeGeo(cpX0, cpZ0, cpX1, cpZ1, 0.03, 4), std('#6d6d6d'));
  for (let x = cpX0 + 10; x < cpX1; x += 12) for (let z = cpZ0 + 10; z < cpZ1 - 5; z += 14) B.box(x - 0.4, 0, z - 0.4, x + 0.4, CPH - 0.4, z + 0.4, conc);
  const carCols = ['#c62828', '#1565c0', '#fafafa', '#212121', '#9e9e9e', '#fdd835'];
  for (let k = 0; k < 14; k++) { const x = cpX0 + 4 + (k % 7) * 9, z = cpZ0 + (k < 7 ? 4 : 30), cm = std(carCols[k % 6], { metalness: 0.5, roughness: 0.35 }); B.box(x - 1, 0.3, z, x + 1, 1.2, z + 4.4, cm); B.box(x - 0.9, 1.2, z + 1, x + 0.9, 1.75, z + 3.2, IM.glass, false); }
  sign(B, cpX0 + 30, 4.4, cpZ1 + 0.1, 12, 1.4, signMat('Ⓟ 豪景花園 B 停車場', '#1565c0'));
  for (let x = cpX0 + 30; x < cpX0 + 34; x += 0.5) {}
  // 平台：泳池 + 曬太陽椅（由外面樓梯上）
  const p1 = planeGeo(cpX0 + 6, cpZ0 + 8, cpX0 + 40, cpZ0 + 28, CPH + 0.05, 2); B.add(p1, std('#4fc3f7', { roughness: 0.1, metalness: 0.2 }));
  const p2 = planeGeo(cpX0 + 46, cpZ0 + 8, cpX1 - 6, cpZ0 + 22, CPH + 0.05, 2); B.add(p2, std('#4fc3f7', { roughness: 0.1, metalness: 0.2 }));
  B.add(planeGeo(cpX0, cpZ0, cpX1, cpZ1, CPH + 0.02, 3), IM.tile);
  for (let k = 0; k < 8; k++) B.box(cpX0 + 8 + k * 4, CPH, cpZ0 + 34, cpX0 + 9.2 + k * 4, CPH + 0.4, cpZ0 + 36.4, white);
  for (let k = 0; k < 15; k++) B.box(cpX1 + k * 1.0, k * 0.4, cpZ1 - 12, cpX1 + 1.0 + k * 1.0, k * 0.4 + 0.4, cpZ1 - 6, conc);   // 樓梯（東面）
  B.box(cpX1 + 15, 0, cpZ1 - 12, cpX1 + 18, CPH, cpZ1 - 6, conc);
  // 會所（3 層，地下係健身室）
  const club = shell(B, -646, 492, -606, 530, 4.5, std('#efe0c0', { map: FAC[1].m.map }));
  B.box(-646, 4.5, 492, -606, 13, 530, std('#efe0c0', { map: FAC[1].m.map }));
  storeInterior(B, club, 'gym', () => 0.5, '會所 CLUBHOUSE 健身室');

  // ===== 16 座公園：網球場 + 遊樂場 =====
  [[-900, 545], [-872, 545]].forEach(([x, z]) => {
    B.add(planeGeo(x, z, x + 24, z + 36, 0.03, 4), blueC); B.box(x, 0.031, z + 17.9, x + 24, 1.0, z + 18.1, white);
    [x, x + 24].forEach(fx => B.box(fx - 0.05, 0, z, fx + 0.05, 3, z + 36, std('#2e7d32'), true));
  });
  B.add(planeGeo(-840, 540, -790, 585, 0.03, 3), std('#ffcc80'));
  B.box(-830, 0, 550, -828, 3, 552, red); B.box(-830, 3, 550, -820, 3.3, 552, red); B.box(-822, 0, 550, -820, 3, 552, red);
  const slide = new THREE.BoxGeometry(2, 0.2, 8); slide.rotateX(0.45); slide.translate(-812, 1.6, 562); B.add(slide, std('#fdd835'));
  B.box(-813, 0, 556, -811, 3.4, 558, blueC); plant(B, -800, 575, 1.5); plant(B, -835, 578, 1.5);
  sign(B, -815, 3.5, 585.1, 12, 1.2, signMat('🌳 豪景花園 16 座公園', '#2e7d32'));

  // ===== A 停車場（天台紅色球場）=====
  const ax0 = -620, ax1 = -545, az0 = 612, az1 = 662;
  B.box(ax0, 0, az0, ax1, 6, az0 + 0.4, conc); B.box(ax0, 0, az0, ax0 + 0.4, 6, az1, conc); B.box(ax1 - 0.4, 0, az0, ax1, 6, az1, conc); B.box(ax0, 0, az1 - 0.4, ax0 + 30, 6, az1, conc); B.box(ax0 + 40, 0, az1 - 0.4, ax1, 6, az1, conc); B.box(ax0 + 30, 3.2, az1 - 0.4, ax0 + 40, 6, az1, conc);
  B.box(ax0, 5.6, az0, ax1, 6, az1, conc);
  B.add(planeGeo(ax0, az0, ax1, az1, 0.03, 4), std('#6d6d6d'));
  for (let k = 0; k < 10; k++) { const x = ax0 + 5 + (k % 5) * 14, z = az0 + (k < 5 ? 4 : 28), cm = std(carCols[(k + 2) % 6], { metalness: 0.5 }); B.box(x - 1, 0.3, z, x + 1, 1.2, z + 4.4, cm); }
  B.add(planeGeo(ax0 + 3, az0 + 3, ax1 - 3, az1 - 3, 6.03, 4), std('#d84315'));
  B.box(ax0 + 37.4, 6.04, az0 + 3, ax0 + 37.6, 6.06, az1 - 3, white, false);
  [ax0 + 6, ax1 - 6].forEach(x => { B.box(x - 0.15, 6, (az0 + az1) / 2 - 0.15, x + 0.15, 9.2, (az0 + az1) / 2 + 0.15, IM.steel); });
  for (let k = 0; k < 15; k++) B.box(ax1 + k * 1.0, k * 0.4, az0 + 4, ax1 + 1 + k * 1.0, k * 0.4 + 0.4, az0 + 10, conc);
  sign(B, ax0 + 35, 4.4, az1 + 0.1, 12, 1.4, signMat('Ⓟ 豪景花園 A 停車場', '#1565c0'));

  // ===== 中菜酒樓 =====
  const rest = shell(B, -790, 735, -740, 772, 5, std('#f5e1c8', { map: FAC[1].m.map }));
  B.box(-790, 5, 735, -740, 9, 772, std('#f5e1c8', { map: FAC[1].m.map }));
  storeInterior(B, rest, 'diner', () => 0.5, '大八坊中菜館');
  for (let k = 0; k < 6; k++) { const g = new THREE.SphereGeometry(0.4, 10, 8); g.translate(-785 + k * 9, 4.2, 773); B.add(g, std('#e53935', { emissive: '#b71c1c', emissiveIntensity: 0.6 })); }

  // ===== 村屋（東面，3 層）=====
  for (let k = 0; k < 10; k++) {
    const x = -372 + (k % 2) * 30, z = 440 + Math.floor(k / 2) * 34;
    houseInterior(B, { x0: x, z0: z, x1: x + 11, z1: z + 11, y1: 3.2 }, HOUSE[k % HOUSE.length]);
    B.box(x, 3.2, z, x + 11, 9.4, z + 11, HOUSE[k % HOUSE.length], true, 3, 2.8);
    B.box(x - 0.3, 9.4, z - 0.3, x + 11.3, 10.4, z + 11.3, std('#bcaaa4'), false);
  }
  // ===== 樹 + 街燈 + 入口牌 =====
  for (let k = 0; k < 60; k++) { const x = V.x0 + 30 + R() * 720, z = 590 + R() * 190; if (z > 690 && z < 712) continue; tree(B, x, z, 0.9 + R() * 0.5, false); }
  const lampM = new THREE.MeshBasicMaterial({ color: '#fff7d6' });
  for (let x = V.x0 + 20; x < V.x1; x += 40) [710, 786].forEach(z => { B.box(x - 0.1, 0, z - 0.1, x + 0.1, 6, z + 0.1, IM.steel); B.box(x - 0.3, 6, z - 0.3, x + 0.3, 6.3, z + 0.3, lampM, false); });
  B.box(-410, 0, 740, -406, 6, 744, std('#795548')); B.box(-370, 0, 740, -366, 6, 744, std('#795548'));
  sign(B, -388, 7, 744.1, 30, 3, signMat('豪景花園 HONG KONG GARDEN', '#5d4037', '#ffe082', 'bold 56px serif'));

  const g = B.build(); g.traverse(o => { if (o.isMesh) o.castShadow = false; }); scene.add(g);
  function update(p) { g.visible = (p.x > V.x0 - 1500 && p.x < V.x1 + 1500 && p.z > V.z0 - 1500 && p.z < V.z1 + 1500) || p.y > 300; }
  return { colliders: B.cols, update, center: new V3(-388, 0.1, 760) };
}
