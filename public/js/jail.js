// 監倉：揸電單車沖紅燈又唔夠錢交罰款，就要坐監 3 分鐘（重新整理都走唔甩）
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign, exhaustFan } from './interiors.js';
import { buildAvatar } from './avatar.js';

export const JAIL = { x: 6600, z: 600 };
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...e });
const CSS = `#jailHud { position:fixed; left:50%; top:calc(8px + env(safe-area-inset-top)); transform:translateX(-50%); background:rgba(40,10,10,.88); border:2px solid #ef5350; color:#fff; border-radius:14px; padding:8px 18px; font:700 18px system-ui,sans-serif; z-index:26; text-align:center; pointer-events:none; }
#jailHud small { display:block; font-weight:400; font-size:13px; color:#ffcdd2; }`;

export function buildJail(scene, api) {
  const B = new Batch();
  const X = JAIL.x, Z = JAIL.z, W = 5, D = 4, H = 3.2;
  const b = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + Math.min(x0, x1), y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), y1, Z + Math.max(z0, z1), m, col);
  const wall = std('#9e9e9e'), steel = std('#607d8b', { metalness: 0.8, roughness: 0.3 });
  b(-W - 6, -0.3, -D - 1, W + 6, 0, D + 8, std('#757575'));
  b(-W, 0, -D - 0.3, W, H, -D, wall); b(-W - 0.3, 0, -D, -W, H, D + 7, wall); b(W, 0, -D, W + 0.3, H, D + 7, wall); b(-W, 0, D + 7, W, H, D + 7.3, wall);
  b(-W, H, -D, W, H + 0.2, D + 7.3, std('#bdbdbd'));
  // 鐵窗（前面一排鐵枝）
  for (let x = -W + 0.3; x < W; x += 0.35) b(x, 0, D, x + 0.06, H, D + 0.06, steel, false);
  b(-W, 0, D - 0.05, W, H, D + 0.1, IM.glass || steel, false);
  B.cols.push({ min: [X - W, 0, Z + D - 0.05], max: [X + W, H, Z + D + 0.12] });
  b(-W, 2.9, D, W, 3.0, D + 0.1, steel, false); b(-W, 0.1, D, W, 0.2, D + 0.1, steel, false);
  // 床、廁所、細窗
  b(-W + 0.2, 0, -D + 0.2, -W + 2.2, 0.5, -D + 1.1, std('#5d4037')); b(-W + 0.25, 0.5, -D + 0.25, -W + 2.15, 0.62, -D + 1.05, std('#eceff1'), false);
  b(W - 1.0, 0, -D + 0.2, W - 0.4, 0.45, -D + 0.8, std('#fafafa'));
  b(-1, 2.2, -D, 1, 2.7, -D + 0.05, std('#90caf9'), false);
  for (let x = -0.9; x < 1; x += 0.3) b(x, 2.2, -D + 0.05, x + 0.05, 2.7, -D + 0.1, steel, false);
  sign(B, X, 2.6, Z + D + 0.15, 4, 0.5, signMat('⛓ 警署羈留室 HOLDING CELL', '#b71c1c', '#fff'), '+z');
  sign(B, X - W + 0.05, 1.8, Z, 3.2, 0.9, signMat('🚦 紅燈要停！Red light means STOP!', '#263238', '#ffeb3b', 'bold 34px sans-serif'), '+x');
  for (let x = -W + 1.5; x < W; x += 3) b(x - 0.6, H - 0.03, -0.2, x + 0.6, H, 0.2, IM.light, false);
  exhaustFan(B, X + 3.4, 2.5, Z - D + 0.02, '+z');
  const g = B.build(); scene.add(g);
  const guard = buildAvatar({ gender: 'm', skin: '#e0ac69', hat: 'cap', shirt: '#1a237e', pants: '#1a237e', hair: '#1b1b1b' });
  guard.position.set(X + 1.5, 0, Z + D + 3); guard.rotation.y = Math.PI; scene.add(guard);

  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const hud = document.createElement('div'); hud.id = 'jailHud'; hud.style.display = 'none'; document.body.appendChild(hud);
  const S = Object.assign({ until: 0, back: null, why: '' }, api.store.get('jail', {}));
  const save = () => api.store.set('jail', S);
  const left = () => Math.max(0, (S.until - Date.now()) / 1000);
  const active = () => S.until > Date.now() && !!S.back;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const cell = () => { api.teleport(X, 0.05, Z); api.face(Math.PI); };

  function arrest(sec, why) {
    if (active()) return;
    const back = api.prepare();
    S.until = Date.now() + sec * 1000; S.back = back; S.why = why; save();
    api.sfx.alarm(1.2);
    api.blackout(() => { cell(); api.toast(`👮 ${why}\n要坐監 ${Math.round(sec / 60)} 分鐘！`, 4500); }, 900);
  }
  function release() {
    const back = S.back; S.until = 0; S.back = null; save(); hud.style.display = 'none';
    api.sfx.ding();
    api.blackout(() => { if (back) api.teleport(back[0], back[1], back[2]); api.toast('🔓 坐完監，可以走喇。下次記住紅燈要停車！', 4000); api.onRelease?.(); }, 900);
  }
  function resume() { if (active()) cell(); else if (S.back) release(); }
  function update(dt, pos) {
    const near = Math.abs(pos.x - X) < 300 && Math.abs(pos.z - Z) < 300; g.visible = guard.visible = near;
    if (!S.back) return;
    if (!active()) { release(); return; }
    hud.style.display = 'block';
    hud.innerHTML = `⛓ 坐緊監：仲有 ${fmt(left())}<small>${S.why || ''}</small>`;
    if (Math.abs(pos.x - X) > W + 0.5 || pos.z < Z - D - 0.5 || pos.z > Z + D + 0.5) cell();
  }
  return { colliders: B.cols, update, arrest, resume, active, inside: p => Math.abs(p.x - X) < W + 6 && p.z > Z - D - 1 && p.z < Z + D + 8 };
}
