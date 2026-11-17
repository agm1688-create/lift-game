// 電梯機房（喺每幢大廈 Lift 頂）：可以入去睇電梯嘅零件，只可以睇唔可以拎走
// 撳（或者行近撳互動）每件零件都會讀出佢嘅英文名，幫玩家學英文
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign } from './interiors.js';

export const MROOM = { x: 6600, z: 1500 };
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...e });
// [中文, English, 講解（英文）, 講解（中文）]
export const PARTS = {
  motor: ['曳引機', 'traction machine', 'This is the traction machine. It is a big motor that moves the lift up and down.', '呢部係曳引機，即係好大嘅摩打，令部 Lift 上上落落。'],
  sheave: ['曳引輪', 'sheave', 'This is the sheave. The steel ropes go around this wheel.', '呢個係曳引輪，啲鋼纜就係繞住呢個轆。'],
  ropes: ['鋼纜', 'steel ropes', 'These are the steel ropes. They hold the lift car and the counterweight.', '呢啲係鋼纜，吊住電梯車廂同對重。'],
  brake: ['制動器', 'brake', 'This is the brake. It stops the lift and holds it safely.', '呢個係制動器，令部 Lift 安全咁停定。'],
  governor: ['限速器', 'speed governor', 'This is the speed governor. If the lift goes too fast, it stops the lift.', '呢個係限速器，Lift 行得太快就會令佢停低。'],
  cabinet: ['控制櫃', 'control cabinet', 'This is the control cabinet. It is the brain of the lift.', '呢個係控制櫃，係部 Lift 嘅大腦。'],
  encoder: ['編碼器', 'encoder', 'This is the encoder. It counts how far the lift has moved.', '呢個係編碼器，計部 Lift 行咗幾遠。'],
  estop: ['緊急停止掣', 'emergency stop button', 'This is the emergency stop button. Only press it in an emergency!', '呢個係緊急停止掣，有緊急事故先好撳！'],
  power: ['主電源開關', 'main power switch', 'This is the main power switch. It turns the electricity on and off.', '呢個係主電源開關，開關部 Lift 嘅電。'],
  fan: ['抽氣扇', 'ventilation fan', 'This is the ventilation fan. It keeps the machine room cool.', '呢把係抽氣扇，令機房唔會太熱。'],
  wheel: ['盤車手輪', 'hand winding wheel', 'This is the hand winding wheel. Engineers use it to move the lift by hand.', '呢個係盤車手輪，工程師用嚟用手轉動部 Lift。'],
  intercom: ['對講機', 'intercom', 'This is the intercom. The engineer can talk to people inside the lift.', '呢部係對講機，工程師可以同 Lift 入面嘅人講嘢。'],
  hook: ['吊鈎', 'lifting hook', 'This is the lifting hook. It helps lift heavy machine parts.', '呢個係吊鈎，用嚟吊起好重嘅機器零件。'],
  ext: ['滅火筒', 'fire extinguisher', 'This is a fire extinguisher. Every machine room must have one.', '呢個係滅火筒，每間機房都一定要有。'],
  logbook: ['保養記錄簿', 'maintenance logbook', 'This is the maintenance logbook. Engineers write down every check here.', '呢本係保養記錄簿，工程師每次檢查都要寫低。'],
};

export function buildLiftRoom(scene, api) {
  const B = new Batch(), inter = [], parts = [];
  const X = MROOM.x, Z = MROOM.z, W = 7, D = 5, H = 3.8;
  const b = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + x0, y0, Z + z0, X + x1, y1, Z + z1, m, col);
  b(-W - 1, -0.3, -D - 1, W + 1, 0, D + 1, std('#7d8790'));
  b(-W, 0, -D - 0.2, W, H, -D, std('#cfd2d6')); b(-W, 0, D, W, H, D + 0.2, std('#cfd2d6')); b(-W - 0.2, 0, -D, -W, H, D, std('#cfd2d6')); b(W, 0, -D, W + 0.2, H, D, std('#cfd2d6'));
  b(-W, H, -D, W, H + 0.2, D, std('#e0e0e0'));
  for (let x = -W + 2; x < W; x += 4) b(x - 0.7, H - 0.03, -0.2, x + 0.7, H, 0.2, IM.light, false);
  b(-6.6, 0.01, -1.6, -3.4, 0.03, 1.6, std('#ffd600'), false);    // 黃色安全線
  sign(B, X, 3.1, Z - D + 0.05, 7, 0.6, signMat('⚙️ 電梯機房 LIFT MACHINE ROOM', '#37474f', '#ffd600'), '+z');
  sign(B, X + W - 0.05, 2.4, Z + 2, 4.4, 0.8, signMat('⚠️ 只可以睇，唔可以拎走零件', '#b71c1c', '#fff', 'bold 40px sans-serif'), '-x');
  sign(B, X - W + 0.05, 2.6, Z - 2.5, 4, 0.7, signMat('撳零件聽英文名 👆 Tap a part!', '#1565c0', '#fff', 'bold 40px sans-serif'), '+x');
  const g = B.build(); scene.add(g);
  // 零件（獨立 Mesh，撳得）
  const add = (key, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(X + x, y, Z + z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.userData.part = key; scene.add(m); parts.push(m); return m; };
  const green = std('#2e7d32', { metalness: 0.5 }), steel = std('#b0bec5', { metalness: 0.85, roughness: 0.3 }), dark = std('#37474f', { metalness: 0.5 }), red = std('#d32f2f'), yellow = std('#ffd600');
  add('motor', new THREE.CylinderGeometry(0.75, 0.75, 1.8, 24), green, -1.5, 0.95, -1.5, 0, 0, Math.PI / 2);
  add('motor', new THREE.BoxGeometry(2.2, 0.2, 1.4), dark, -1.5, 0.1, -1.5);
  add('sheave', new THREE.CylinderGeometry(0.85, 0.85, 0.5, 32), steel, -0.2, 0.95, -1.5, 0, 0, Math.PI / 2);
  add('brake', new THREE.BoxGeometry(0.4, 0.9, 1.0), yellow, -2.65, 0.95, -1.5);
  add('encoder', new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16), std('#1565c0'), -3.05, 0.95, -1.5, 0, 0, Math.PI / 2);
  for (let k = 0; k < 4; k++) add('ropes', new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), std('#455a64', { metalness: 0.9 }), -0.35 + k * 0.1, 0.1, -0.7, 0, 0, 0);
  add('ropes', new THREE.BoxGeometry(1.2, 0.02, 0.6), std('#111'), -0.2, 0.01, -0.7);
  add('wheel', new THREE.TorusGeometry(0.35, 0.05, 8, 24), red, -1.5, 0.95, -0.5);
  add('governor', new THREE.CylinderGeometry(0.4, 0.4, 0.18, 24), std('#ef6c00'), 2.2, 1.2, -3.8, 0, 0, Math.PI / 2);
  add('governor', new THREE.BoxGeometry(0.5, 0.8, 0.5), dark, 2.2, 0.4, -3.8);
  add('cabinet', new THREE.BoxGeometry(1.6, 2.0, 0.6), std('#90a4ae', { metalness: 0.4 }), 4.8, 1.0, -4.6);
  add('estop', new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), red, 4.8, 1.5, -4.27, Math.PI / 2, 0, 0);
  add('power', new THREE.BoxGeometry(0.5, 0.7, 0.2), std('#fbc02d'), 6.8, 1.4, -1.5, 0, Math.PI / 2, 0);
  add('fan', new THREE.CylinderGeometry(0.55, 0.55, 0.2, 20), std('#78909c'), 0, 2.8, D - 0.12, Math.PI / 2, 0, 0);
  add('intercom', new THREE.BoxGeometry(0.35, 0.5, 0.12), std('#263238'), 6.85, 1.5, 1.5, 0, Math.PI / 2, 0);
  add('hook', new THREE.TorusGeometry(0.18, 0.05, 8, 16, Math.PI * 1.4), steel, -1.5, H - 0.4, -1.5);
  add('ext', new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12), red, -6.6, 0.3, 4.3);
  add('logbook', new THREE.BoxGeometry(0.4, 0.06, 0.3), std('#6d4c41'), 3.2, 0.8, -4.6);
  add('logbook', new THREE.BoxGeometry(1.2, 0.8, 0.6), std('#8d6e63'), 3.2, 0.4, -4.6);
  B.cols.push({ min: [X - 3.3, 0, Z - 2.3], max: [X + 0.3, 1.9, Z - 0.7] }, { min: [X + 3.9, 0, Z - 5], max: [X + 5.6, 2, Z - 4.3] }, { min: [X + 1.9, 0, Z - 4.1], max: [X + 2.5, 1.6, Z - 3.5] });
  // 行近都可以撳互動睇
  const seen = new Set();
  function explain(key) {
    const P = PARTS[key]; if (!P) return;
    api.say(P[2], `${P[0]}（${P[1]}）：${P[3]}`, { force: true, now: true });
    api.toast(`🔧 ${P[0]}  ${P[1]}\n${P[3]}${seen.has(key) ? '' : '\n（只可以睇，唔可以拎走）'}`, 4500);
    seen.add(key);
    // 閃一閃
    parts.filter(m => m.userData.part === key).forEach(m => { const e = m.material.emissive; if (!e) return; const old = e.getHex(); e.set('#ffeb3b'); m.material.emissiveIntensity = 0.6; setTimeout(() => { e.setHex(old); m.material.emissiveIntensity = 1; }, 600); });
  }
  const spots = { motor: [-1.5, -0.3], sheave: [-0.2, -0.2], brake: [-3.2, -0.3], governor: [2.2, -2.8], cabinet: [4.8, -3.5], power: [6.0, -1.5], intercom: [6.0, 1.5], fan: [0, 4], ext: [-5.8, 3.6], logbook: [3.2, -3.5] };
  for (const [key, [x, z]] of Object.entries(spots)) inter.push({ pos: new THREE.Vector3(X + x, 0, Z + z), r: 1.1, label: () => `👀 睇吓：${PARTS[key][0]} ${PARTS[key][1]}`, act: () => explain(key) });
  let back = null, name = '';
  inter.push({ pos: new THREE.Vector3(X - 5.5, 0, Z), r: 1.4, label: () => '🚪 離開機房', act: () => leave() });
  function enter(title, backFn) {
    name = title; back = backFn; seen.clear();
    api.sfx.door();
    api.blackout(() => {
      api.teleport(X - 5, 0.05, Z); api.face(Math.PI / 2);
      api.toast(`⚙️ ${title} 電梯機房：撳每件零件可以聽英文名\n（只可以睇，唔可以拎走）`, 4500);
      api.say('Welcome to the lift machine room. Tap each part to learn its English name. Look, but do not touch!', '歡迎嚟到電梯機房，撳每件零件學佢嘅英文名。只可以睇，唔好拎走！', { force: true });
    }, 800);
  }
  function leave() { const f = back; back = null; api.sfx.door(); api.blackout(() => { if (f) f(); else api.teleport(0, 0.1, 8); }, 700); }
  // 撳畫面揀零件
  const ray = new THREE.Raycaster();
  function pick(ndc, camera) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(parts, false)[0];
    if (hit && hit.distance < 25) { explain(hit.object.userData.part); return true; }
    return false;
  }
  const inside = p => Math.abs(p.x - X) < W + 1 && Math.abs(p.z - Z) < D + 1 && p.y < 10;
  function update(p) { const v = Math.abs(p.x - X) < 300 && Math.abs(p.z - Z) < 300; g.visible = v; parts.forEach(m => m.visible = v); }
  return { colliders: B.cols, interactables: inter, enter, pick, inside, update, label: () => `⚙️ ${name} 電梯機房` };
}
