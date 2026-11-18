// 銀行金庫（保險箱室）：由銀行職員帶入去，喺地圖以外嘅獨立房間
// 入面有成幅牆嘅保險箱、中間有張枱放住你打開咗嘅保險箱，見到入面有幾多條金條 / 銀條
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign, exhaustFan } from './interiors.js';
import { goldMat, buildAvatar } from './avatar.js';

export const VAULT = { x: 6600, z: -300 };
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...e });
const silverMat = new THREE.MeshStandardMaterial({ color: '#e3e6ea', metalness: 0.95, roughness: 0.2, emissive: '#3a3d42', emissiveIntensity: 0.3 });

export function buildVault(scene, api) {
  const B = new Batch(), inter = [];
  const X = VAULT.x, Z = VAULT.z, W = 8, D = 6, H = 3.4;
  const b = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + Math.min(x0, x1), y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), y1, Z + Math.max(z0, z1), m, col);
  const steelW = std('#9ea4aa', { metalness: 0.85, roughness: 0.35 }), dark = std('#3a3f45', { metalness: 0.6 });
  // 地板 / 天花 / 牆
  b(-W - 3, -0.4, -D - 3, W + 3, 0, D + 20, std('#5b5f63', { roughness: 0.4 }));
  b(-W, 0, -D - 0.3, W, H, -D, steelW); b(-W - 0.3, 0, -D, -W, H, D, steelW); b(W, 0, -D, W + 0.3, H, D, steelW);
  b(-W, 0, D, -1.6, H, D + 0.3, steelW); b(1.6, 0, D, W, H, D + 0.3, steelW); b(-1.6, 2.6, D, 1.6, H, D + 0.3, steelW);
  b(-W, H, -D, W, H + 0.2, D + 0.3, std('#d8dbde'), true);
  for (let x = -W + 2; x < W; x += 4) for (let z = -D + 2; z < D; z += 4) b(x - 0.8, H - 0.03, z - 0.2, x + 0.8, H, z + 0.2, IM.light, false);
  // 圓形金庫大門（打開咗，擺喺門口外面）
  const door = new THREE.CylinderGeometry(1.5, 1.5, 0.45, 40); door.rotateZ(Math.PI / 2); door.rotateY(0.3); door.translate(X - 2.9, 1.5, Z + D + 1.6); B.add(door, steelW);
  const ring = new THREE.TorusGeometry(1.5, 0.12, 8, 40); ring.rotateY(Math.PI / 2 + 0.3); ring.translate(X - 2.65, 1.5, Z + D + 1.55); B.add(ring, goldMat);
  for (let i = 0; i < 3; i++) { const sp = new THREE.BoxGeometry(0.06, 1.4, 0.06); sp.rotateX(i * Math.PI / 3); sp.rotateY(0.3); sp.translate(X - 2.6, 1.5, Z + D + 1.5); B.add(sp, goldMat); }
  // 出口通道 + 樓梯：由金庫門口行上去，返銀行大堂
  b(-1.9, 0, D + 0.3, -1.6, 6.4, D + 17, steelW); b(1.6, 0, D + 0.3, 1.9, 6.4, D + 17, steelW);
  b(-1.9, 6.4, D + 0.3, 1.9, 6.6, D + 17, std('#d8dbde'));
  for (let k = 0; k < 8; k++) b(-1.6, 0, D + 4 + k, 1.6, (k + 1) * 0.4, D + 5 + k, std('#8d8f93'));
  b(-1.6, 0, D + 12, 1.6, 3.2, D + 17, std('#8d8f93'));
  b(-1.9, 3.2, D + 16.8, 1.9, 6.4, D + 17.1, std('#6d4c41'));
  for (let z = D + 2; z < D + 16; z += 3) b(-0.5, 6.35, z, 0.5, 6.4, z + 1, IM.light, false);
  sign(B, X, 5.4, Z + D + 16.75, 2.8, 0.6, signMat('🚪 出口 EXIT → 銀行大堂', '#2e7d32', '#fff'), '-z');
  sign(B, X, 2.85, Z + D - 0.05, 2.6, 0.45, signMat('⬆ 行樓梯返銀行大堂', '#2e7d32', '#fff'), '-z');
  sign(B, X, 3.0, Z + D + 0.32, 3.2, 0.5, signMat('🔐 保險箱室 SAFE DEPOSIT', '#0b4f8a', '#ffd864'), '+z');
  // 三面牆嘅保險箱（每格有門同金色鎖）
  const box = std('#b0b6bc', { metalness: 0.9, roughness: 0.28 }), knob = goldMat;
  const grid = (x0, x1, z0, z1, face) => {
    const along = face === '+z' || face === '-z';
    const L = along ? x1 - x0 : z1 - z0, n = Math.floor(L / 0.62);
    for (let i = 0; i < n; i++) for (let r = 0; r < 5; r++) {
      const a = (along ? x0 : z0) + 0.06 + i * 0.62, y = 0.25 + r * 0.56;
      if (face === '+z') { b(a, y, z0, a + 0.56, y + 0.5, z0 + 0.06, box, false); b(a + 0.42, y + 0.21, z0 + 0.06, a + 0.5, y + 0.29, z0 + 0.1, knob, false); }
      else if (face === '+x') { b(x0, y, a, x0 + 0.06, y + 0.5, a + 0.56, box, false); b(x0 + 0.06, y + 0.21, a + 0.42, x0 + 0.1, y + 0.29, a + 0.5, knob, false); }
      else { b(x1 - 0.06, y, a, x1, y + 0.5, a + 0.56, box, false); b(x1 - 0.1, y + 0.21, a + 0.42, x1 - 0.06, y + 0.29, a + 0.5, knob, false); }
    }
  };
  grid(-W + 0.3, W - 0.3, -D, -D + 0.06, '+z'); grid(-W, -W + 0.06, -D + 0.3, D - 0.6, '+x'); grid(W - 0.06, W, -D + 0.3, D - 0.6, '-x');
  B.cols.push({ min: [X - W, 0, Z - D], max: [X + W, 3.1, Z - D + 0.2] }, { min: [X - W, 0, Z - D], max: [X - W + 0.2, 3.1, Z + D] }, { min: [X + W - 0.2, 0, Z - D], max: [X + W, 3.1, Z + D] });
  // 你嘅保險箱（後牆中間，門打開咗、發光框）
  b(-0.35, 1.37, -D + 0.06, 0.35, 1.43, -D + 0.6, goldMat, false);
  sign(B, X, 2.2, Z - D + 0.12, 2.0, 0.4, signMat('⭐ 你嘅保險箱 No.0888', '#b8860b', '#fff'), '+z');
  // 中間嘅檢視枱（保險箱抽屜擺喺枱面）
  b(-1.3, 0, -1.0, 1.3, 0.92, 0.2, std('#2f3a46', { metalness: 0.5 }));
  b(-1.35, 0.92, -1.05, 1.35, 0.96, 0.25, std('#e9e4d8', { roughness: 0.3 }), false);
  b(-0.9, 0.96, -0.85, 0.9, 1.0, 0.05, steelW, false);                       // 抽屜底
  b(-0.9, 0.96, -0.85, -0.86, 1.26, 0.05, steelW, false); b(0.86, 0.96, -0.85, 0.9, 1.26, 0.05, steelW, false);
  b(-0.9, 0.96, -0.85, 0.9, 1.26, -0.81, steelW, false); b(-0.9, 0.96, 0.01, 0.9, 1.1, 0.05, steelW, false);
  const lid = new THREE.BoxGeometry(1.8, 0.04, 0.9); lid.translate(0, 0, -0.45); lid.rotateX(-1.9); lid.translate(X, 1.26, Z - 0.83); B.add(lid, steelW);
  // 椅 + 植物 + 閉路電視
  [-2.6, 2.6].forEach(x => { b(x - 0.25, 0.42, 0.7, x + 0.25, 0.48, 1.2, std('#1d3b6e'), true); b(x - 0.25, 0.48, 1.12, x + 0.25, 1.0, 1.2, std('#1d3b6e'), false); });
  b(W - 0.9, H - 0.6, D - 0.9, W - 0.5, H - 0.35, D - 0.5, std('#222'), false);
  sign(B, X - W + 0.12, 2.0, Z + 2.5, 3.2, 1.1, signMat('保險箱只可以存放：金條 🥇、銀條 🥈｜❌ 唔可以存放現金', '#7a1f1f', '#fff', 'bold 30px sans-serif'), '+x');
  exhaustFan(B, X + 5.5, 2.7, Z + D - 0.02, '-z');
  const g = B.build(); scene.add(g);

  // 抽屜入面嘅金條 / 銀條（數量跟住你存咗幾多而變）
  const MAXB = 48;
  const barG = new THREE.BoxGeometry(0.2, 0.06, 0.09);
  const gold = new THREE.InstancedMesh(barG, goldMat, MAXB), silver = new THREE.InstancedMesh(barG, silverMat, MAXB);
  gold.count = silver.count = 0; scene.add(gold, silver);
  const m4 = new THREE.Matrix4();
  function setContents(ng, ns) {
    const place = (im, n, x0) => {
      im.count = Math.min(MAXB, n);
      for (let i = 0; i < im.count; i++) {
        const lay = Math.floor(i / 16), k = i % 16, col = k % 4, row = Math.floor(k / 4);
        m4.makeTranslation(X + x0 + col * 0.21, 1.03 + lay * 0.065, Z - 0.72 + row * 0.18);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    };
    place(gold, ng, -0.84); place(silver, ns, 0.04);
  }
  setContents(0, 0);
  // 保安員（門口）
  const guard = buildAvatar({ gender: 'm', skin: '#e0ac69', hat: 'none', shirt: '#263238', pants: '#263238', hair: '#1b1b1b' });
  guard.position.set(X + 2.6, 0, Z + D - 1.0); guard.rotation.y = Math.PI; scene.add(guard);

  inter.push({ pos: new THREE.Vector3(X, 0, Z + 0.9), r: 1.8, label: () => '🔐 打開我嘅保險箱（存 / 拎金條銀條）', act: () => api.vaultMenu() });
  inter.push({ pos: new THREE.Vector3(X, 3.2, Z + D + 15), r: 2, label: () => '🚪 開門返銀行大堂', act: () => api.leaveVault() });
  inter.push({ pos: new THREE.Vector3(X + 2.6, 0, Z + D - 1.8), r: 1.4, label: () => '💂 保安：有咩可以幫你？', act: () => api.toast('💂 保安：保險箱只可以放金條同銀條，現金請喺櫃位存入戶口。', 3500) });
  const inside = p => Math.abs(p.x - X) < W + 3 && p.z > Z - D - 3 && p.z < Z + D + 18;
  return { colliders: B.cols, interactables: inter, setContents, inside, entry: new THREE.Vector3(X, 0.05, Z + D + 1.4), update: p => { const v = Math.abs(p.x - X) < 200 && Math.abs(p.z - Z) < 200; g.visible = gold.visible = silver.visible = guard.visible = v; if (Math.abs(p.x - X) < 1.7 && p.z > Z + D + 16 && p.y > 2.5 && p.y < 5) api.leaveVault(); } };
}
