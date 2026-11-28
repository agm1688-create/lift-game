// 柏熙五金店嘅玩具：全部係柏熙玩具屋入面見到嘅設備（同埋幾款交通工具模型）
// 用遊戲現金（$）買，放入背包；可以拎喺手度，或者打開 3D 模型慢慢欣賞（用返「睇內部零件」個模型同英文零件名）
import * as THREE from 'three';
import { MACHINES } from './learn.js';

const V3 = THREE.Vector3;
// id = learn.js 嘅 MACHINES key
export const TOYS = [
  { id: 'fan', e: '🌀', p: 28 },
  { id: 'hose', e: '🧯', p: 45 },
  { id: 'breakglass', e: '🟥', p: 18 },
  { id: 'alarm', e: '🔔', p: 25 },
  { id: 'exitSign', e: '🚪', p: 22 },
  { id: 'lightSwitch', e: '💡', p: 12 },
  { id: 'acWindow', e: '❄️', p: 60 },
  { id: 'acSplit', e: '🌬️', p: 70 },
  { id: 'light', e: '🚦', p: 50 },
  { id: 'pedLight', e: '🚶', p: 45 },
  { id: 'phone', e: '📱', p: 35 },
  { id: 'goldBar', e: '🥇', p: 120 },
  { id: 'silverBar', e: '🥈', p: 60 },
  { id: 'fire', e: '🚒', p: 90 },
  { id: 'police', e: '🚓', p: 80 },
  { id: 'fighter', e: '🛩', p: 130 },
  { id: 'apache', e: '🚁', p: 150 },
  { id: 'jumbo', e: '🛫', p: 150 },
].filter(t => MACHINES[t.id]).map(t => ({ ...t, n: `${MACHINES[t.id].zh.replace(/（.*）/, '')}模型`, en: MACHINES[t.id].en }));
export const TOY = Object.fromEntries(TOYS.map(t => [t.id, t]));

// 縮細版模型：最長嗰邊 = size 米，底部中間喺原點
export function toyModel(id, size = 0.35) {
  const g = new THREE.Group(), M = MACHINES[id];
  if (!M) return g;
  const m = M.m();
  const bb = new THREE.Box3().setFromObject(m), s = bb.getSize(new V3()), c = bb.getCenter(new V3());
  const R = Math.max(s.x, s.y, s.z) || 1;
  m.position.set(m.position.x - c.x, m.position.y - bb.min.y, m.position.z - c.z);
  g.add(m); g.scale.setScalar(size / R);
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
// 欣賞用（用返 learn.js 嘅 3D 視窗）
export const toyView = id => { const M = MACHINES[id], t = TOY[id]; return M && t ? { zh: `🧸 ${t.n}`, en: `${M.en} (toy)`, m: M.m, parts: M.parts } : null; };
