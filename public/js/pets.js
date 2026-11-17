// 寵物：狗（多款品種）、貓、野獸、農場動物 — 全部用方塊程式即場砌（原創簡化造型）
import * as THREE from 'three';

const matCache = new Map();
const M = c => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); return matCache.get(c); };
const bx = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));

// 參數：s 整體大小、bw/bh/bl 身、leg 腳長、fl 前腳倍數、hw/hh/hl 頭、sn 嘴長、ear 耳形、tail 尾形
// c 主色、b 肚 / 嘴色、d 深色、pat 花紋、fluff 毛茸茸、neck 頸長、mane 鬃毛色、extra 特徵
const D = (o) => Object.assign({ cat: 'dog', s: 1, bw: 0.32, bh: 0.3, bl: 0.6, leg: 0.3, fl: 1, hw: 0.3, hh: 0.28, hl: 0.28, sn: 0.14, ear: 'up', tail: 'curl', c: '#d9893b', b: '#f7efe3', d: '#222' }, o);
export const PETS = [
  // ===== 狗 =====
  D({ id: 'shiba', n: '柴犬', e: '🐕' }),
  D({ id: 'akita', n: '秋田犬', e: '🐕', s: 1.35, c: '#e0a060' }),
  D({ id: 'golden', n: '金毛尋回犬', e: '🦮', s: 1.4, c: '#e3b05c', b: '#f0cf8a', ear: 'flop', tail: 'long' }),
  D({ id: 'labY', n: '拉布拉多（黃）', e: '🦮', s: 1.4, c: '#ecd08e', b: '#f3dfae', ear: 'flop', tail: 'long' }),
  D({ id: 'labB', n: '拉布拉多（黑）', e: '🐕', s: 1.4, c: '#1d1d1d', b: '#2a2a2a', d: '#555', ear: 'flop', tail: 'long' }),
  D({ id: 'husky', n: '哈士奇', e: '🐺', s: 1.35, c: '#6f7780', b: '#f2f2f2', pat: 'mask', tail: 'fluffy' }),
  D({ id: 'malamute', n: '阿拉斯加雪橇犬', e: '🐺', s: 1.6, c: '#5b5f66', b: '#f2f2f2', pat: 'mask', tail: 'fluffy', fluff: 1 }),
  D({ id: 'samoyed', n: '薩摩耶', e: '🐕', s: 1.35, c: '#fbfbf7', b: '#ffffff', tail: 'fluffy', fluff: 1 }),
  D({ id: 'corgi', n: '柯基', e: '🐕', s: 1.05, leg: 0.15, bl: 0.7, c: '#d9822b', b: '#fff', tail: 'short' }),
  D({ id: 'chihuahua', n: '芝娃娃', e: '🐕', s: 0.6, c: '#e8c99a', b: '#f6e6c8', hw: 0.34, hh: 0.3, sn: 0.08, ear: 'big', tail: 'long' }),
  D({ id: 'poodle', n: '貴婦狗', e: '🐩', s: 0.85, c: '#b5793f', b: '#c48a52', ear: 'flop', tail: 'pom', fluff: 1 }),
  D({ id: 'poodleW', n: '玩具貴婦（白）', e: '🐩', s: 0.7, c: '#f5f1ea', b: '#ffffff', ear: 'flop', tail: 'pom', fluff: 1 }),
  D({ id: 'chow', n: '鬆獅', e: '🦁', s: 1.25, c: '#c8742d', b: '#c8742d', mane: '#c8742d', ear: 'round', tail: 'curl', fluff: 1, sn: 0.1 }),
  D({ id: 'gsd', n: '德國牧羊犬', e: '🐕‍🦺', s: 1.5, c: '#a86a2c', b: '#c58a46', pat: 'saddle', d: '#1a1a1a', tail: 'long' }),
  D({ id: 'border', n: '邊境牧羊犬', e: '🐕', s: 1.25, c: '#1a1a1a', b: '#ffffff', pat: 'collar', ear: 'flop', tail: 'fluffy' }),
  D({ id: 'dalmatian', n: '斑點狗（大麥町）', e: '🐕', s: 1.45, c: '#fafafa', b: '#fafafa', pat: 'spots', ear: 'flop', tail: 'long' }),
  D({ id: 'tong', n: '唐狗', e: '🐕', s: 1.2, c: '#b0773b', b: '#d9b080', tail: 'curl' }),
  D({ id: 'frenchie', n: '法國鬥牛犬', e: '🐶', s: 0.85, leg: 0.2, bw: 0.4, c: '#d8c3a0', b: '#efe2cc', sn: 0.06, ear: 'big', tail: 'short' }),
  D({ id: 'bulldog', n: '英國鬥牛犬', e: '🐶', s: 1.0, leg: 0.18, bw: 0.46, bh: 0.32, c: '#e6dccb', b: '#fff', pat: 'patch', sn: 0.06, ear: 'round', tail: 'short' }),
  D({ id: 'bichon', n: '比熊', e: '🐶', s: 0.7, c: '#ffffff', b: '#ffffff', ear: 'flop', tail: 'pom', fluff: 1, sn: 0.08 }),
  D({ id: 'schnauzer', n: '雪納瑞', e: '🐶', s: 0.9, c: '#77797c', b: '#cfd0d2', pat: 'beard', ear: 'flop', tail: 'short' }),
  D({ id: 'dachshund', n: '臘腸狗', e: '🌭', s: 0.95, leg: 0.12, bl: 0.85, bw: 0.26, c: '#8b4513', b: '#a0522d', ear: 'flop', tail: 'long' }),
  D({ id: 'doberman', n: '杜賓', e: '🐕', s: 1.55, leg: 0.42, c: '#1b1b1b', b: '#a0522d', pat: 'tan', tail: 'short' }),
  D({ id: 'pom', n: '松鼠狗（博美）', e: '🐶', s: 0.6, c: '#f3a64a', b: '#f7c27a', tail: 'fluffy', fluff: 1, sn: 0.08 }),
  D({ id: 'pug', n: '八哥', e: '🐶', s: 0.8, leg: 0.22, bw: 0.36, c: '#e3cba0', b: '#2a2a2a', sn: 0.04, ear: 'flop', tail: 'curl' }),
  D({ id: 'shihtzu', n: '西施', e: '🐶', s: 0.65, c: '#f2e6d0', b: '#8b6a45', ear: 'flop', tail: 'fluffy', fluff: 1, sn: 0.06 }),
  D({ id: 'yorkie', n: '約瑟爹利', e: '🐶', s: 0.55, c: '#4a5560', b: '#c89a5a', pat: 'tan', tail: 'short' }),
  D({ id: 'maltese', n: '馬爾濟斯', e: '🐶', s: 0.6, c: '#ffffff', b: '#ffffff', ear: 'flop', tail: 'fluffy', fluff: 1, sn: 0.07 }),
  D({ id: 'beagle', n: '比高犬', e: '🐕', s: 1.0, c: '#b7742e', b: '#ffffff', pat: 'saddle', d: '#2a2a2a', ear: 'flop', tail: 'long' }),
  D({ id: 'greatdane', n: '大丹狗', e: '🐕', s: 2.0, leg: 0.42, c: '#7f8a94', b: '#8f99a3', tail: 'long', ear: 'flop' }),
  D({ id: 'stbernard', n: '聖伯納', e: '🐕', s: 1.9, c: '#a0522d', b: '#ffffff', pat: 'patch', ear: 'flop', tail: 'long', fluff: 1 }),
  D({ id: 'rottweiler', n: '洛威拿', e: '🐕', s: 1.55, c: '#1c1c1c', b: '#8b4513', pat: 'tan', ear: 'flop', tail: 'short' }),
  D({ id: 'sharpei', n: '沙皮狗', e: '🐶', s: 1.1, c: '#c99a5e', b: '#c99a5e', ear: 'round', tail: 'curl', pat: 'wrinkle' }),
  D({ id: 'sheltie', n: '喜樂蒂', e: '🐕', s: 0.95, c: '#c47a35', b: '#ffffff', pat: 'collar', tail: 'fluffy', fluff: 1 }),
  D({ id: 'papillon', n: '蝴蝶犬', e: '🦋', s: 0.6, c: '#ffffff', b: '#8b4513', pat: 'patch', ear: 'big', tail: 'fluffy' }),
  D({ id: 'greyhound', n: '格力犬', e: '🐕', s: 1.5, leg: 0.45, bw: 0.24, bh: 0.26, c: '#9e9e9e', b: '#bdbdbd', tail: 'long', ear: 'flop' }),
  D({ id: 'shepherdW', n: '瑞士白牧羊犬', e: '🐕', s: 1.5, c: '#fbfbf7', b: '#fff', tail: 'fluffy' }),
  // ===== 貓 =====
  D({ id: 'catOrange', n: '橙色花貓', e: '🐈', cat: 'cat', s: 0.75, c: '#e8913a', b: '#fff', pat: 'stripes', d: '#b8641a', sn: 0.06, tail: 'cat' }),
  D({ id: 'catBlack', n: '黑貓', e: '🐈‍⬛', cat: 'cat', s: 0.75, c: '#1b1b1b', b: '#2b2b2b', d: '#444', sn: 0.06, tail: 'cat' }),
  D({ id: 'catBritish', n: '英國短毛貓', e: '🐈', cat: 'cat', s: 0.85, bw: 0.38, c: '#8a96a3', b: '#9aa6b3', sn: 0.05, ear: 'round', tail: 'cat' }),
  D({ id: 'catSiamese', n: '暹羅貓', e: '🐈', cat: 'cat', s: 0.75, c: '#efe3cf', b: '#5a4030', pat: 'points', sn: 0.06, tail: 'cat' }),
  D({ id: 'catPersian', n: '波斯貓', e: '🐈', cat: 'cat', s: 0.8, c: '#ffffff', b: '#ffffff', sn: 0.04, ear: 'round', tail: 'fluffy', fluff: 1 }),
  // ===== 野獸 =====
  D({ id: 'lion', n: '獅子', e: '🦁', cat: 'wild', s: 2.6, c: '#d4a24c', b: '#e6c27a', mane: '#8b5a2b', ear: 'round', tail: 'tuft' }),
  D({ id: 'lioness', n: '母獅', e: '🦁', cat: 'wild', s: 2.4, c: '#d6ac62', b: '#ecd3a0', ear: 'round', tail: 'tuft' }),
  D({ id: 'tiger', n: '老虎', e: '🐅', cat: 'wild', s: 2.7, c: '#e8892a', b: '#ffffff', pat: 'stripes', d: '#1a1a1a', ear: 'round', tail: 'cat' }),
  D({ id: 'tigerW', n: '白老虎', e: '🐅', cat: 'wild', s: 2.7, c: '#f6f2ea', b: '#ffffff', pat: 'stripes', d: '#3a3a3a', ear: 'round', tail: 'cat' }),
  D({ id: 'leopard', n: '豹', e: '🐆', cat: 'wild', s: 2.1, c: '#e0b25a', b: '#f6e7c4', pat: 'rosette', d: '#2a1a0a', ear: 'round', tail: 'cat' }),
  D({ id: 'cheetah', n: '獵豹', e: '🐆', cat: 'wild', s: 2.1, leg: 0.42, bw: 0.26, c: '#e5bf6a', b: '#f7ecd0', pat: 'spots', d: '#1a1a1a', ear: 'round', tail: 'cat' }),
  D({ id: 'panther', n: '黑豹', e: '🐈‍⬛', cat: 'wild', s: 2.2, c: '#151515', b: '#1f1f1f', d: '#333', ear: 'round', tail: 'cat' }),
  D({ id: 'gorilla', n: '大猩猩', e: '🦍', cat: 'wild', s: 2.2, bw: 0.5, bh: 0.42, bl: 0.5, leg: 0.24, fl: 1.9, hw: 0.32, hh: 0.32, hl: 0.26, sn: 0.06, c: '#2b2b2b', b: '#4a4a4a', d: '#111', ear: 'none', tail: 'none', ape: 1 }),
  D({ id: 'orangutan', n: '紅毛猩猩', e: '🦧', cat: 'wild', s: 1.8, bw: 0.46, bh: 0.4, bl: 0.48, leg: 0.22, fl: 1.9, sn: 0.06, c: '#b5521e', b: '#d07a3e', ear: 'none', tail: 'none', ape: 1, fluff: 1 }),
  D({ id: 'chimp', n: '黑猩猩', e: '🐒', cat: 'wild', s: 1.4, bw: 0.4, bh: 0.36, bl: 0.44, leg: 0.24, fl: 1.7, sn: 0.06, c: '#2e2621', b: '#d9b48f', ear: 'round', tail: 'none', ape: 1 }),
  D({ id: 'elephant', n: '大笨象', e: '🐘', cat: 'wild', s: 5.5, bw: 0.42, bh: 0.36, bl: 0.6, leg: 0.32, hw: 0.32, hh: 0.32, hl: 0.24, sn: 0, c: '#8d8f94', b: '#9a9ca1', ear: 'elephant', tail: 'short', trunk: 1 }),
  D({ id: 'giraffe', n: '長頸鹿', e: '🦒', cat: 'wild', s: 4.2, bw: 0.26, bh: 0.26, bl: 0.5, leg: 0.5, neck: 0.75, hw: 0.16, hh: 0.16, hl: 0.24, sn: 0.1, c: '#e0aa52', b: '#f2d9a8', pat: 'patches', d: '#7a4a1e', ear: 'up', tail: 'tuft', horn: 'ossicone' }),
  D({ id: 'zebra', n: '斑馬', e: '🦓', cat: 'wild', s: 2.6, bw: 0.3, bh: 0.3, bl: 0.62, leg: 0.42, neck: 0.18, hw: 0.18, hh: 0.2, hl: 0.3, sn: 0.12, c: '#fafafa', b: '#fafafa', pat: 'stripes', d: '#111', ear: 'up', tail: 'tuft', mane: '#111' }),
  D({ id: 'rhino', n: '犀牛', e: '🦏', cat: 'wild', s: 4.0, bw: 0.42, bh: 0.34, bl: 0.66, leg: 0.22, hw: 0.28, hh: 0.24, hl: 0.34, sn: 0.1, c: '#8e8a84', b: '#9c978f', ear: 'up', tail: 'short', horn: 'rhino' }),
  D({ id: 'hippo', n: '河馬', e: '🦛', cat: 'wild', s: 3.8, bw: 0.48, bh: 0.36, bl: 0.7, leg: 0.16, hw: 0.36, hh: 0.26, hl: 0.34, sn: 0.12, c: '#8a7b85', b: '#d9a3a8', ear: 'round', tail: 'short' }),
  D({ id: 'bearB', n: '棕熊', e: '🐻', cat: 'wild', s: 2.8, bw: 0.42, bh: 0.38, bl: 0.6, leg: 0.24, hw: 0.32, hh: 0.3, sn: 0.12, c: '#6b4426', b: '#8a5a34', ear: 'round', tail: 'short', fluff: 1 }),
  D({ id: 'bearP', n: '北極熊', e: '🐻‍❄️', cat: 'wild', s: 3.0, bw: 0.42, bh: 0.38, bl: 0.66, leg: 0.26, hw: 0.28, hh: 0.28, sn: 0.16, c: '#f6f4ee', b: '#ffffff', ear: 'round', tail: 'short', fluff: 1 }),
  D({ id: 'panda', n: '大熊貓', e: '🐼', cat: 'wild', s: 2.4, bw: 0.44, bh: 0.38, bl: 0.56, leg: 0.22, hw: 0.34, hh: 0.32, sn: 0.08, c: '#fafafa', b: '#fafafa', pat: 'panda', d: '#151515', ear: 'round', tail: 'short' }),
  D({ id: 'wolf', n: '狼', e: '🐺', cat: 'wild', s: 1.8, c: '#7d7d7d', b: '#cfcfcf', pat: 'mask', tail: 'fluffy' }),
  D({ id: 'fox', n: '狐狸', e: '🦊', cat: 'wild', s: 1.0, c: '#e06a1e', b: '#ffffff', pat: 'socks', d: '#2a1a10', ear: 'big', tail: 'fox', sn: 0.18 }),
  D({ id: 'deer', n: '鹿', e: '🦌', cat: 'wild', s: 2.2, bw: 0.26, bh: 0.28, bl: 0.56, leg: 0.48, neck: 0.18, hw: 0.18, hh: 0.2, hl: 0.26, sn: 0.1, c: '#a8743f', b: '#f2e2c8', pat: 'spots', d: '#f7efe0', ear: 'up', tail: 'short', horn: 'antler' }),
  D({ id: 'kangaroo', n: '袋鼠', e: '🦘', cat: 'wild', s: 2.0, bw: 0.3, bh: 0.4, bl: 0.4, leg: 0.36, fl: 0.45, hw: 0.2, hh: 0.22, hl: 0.26, sn: 0.1, c: '#b57a48', b: '#e0b48a', ear: 'big', tail: 'roo', hop: 1 }),
  D({ id: 'camel', n: '駱駝', e: '🐫', cat: 'wild', s: 3.2, bw: 0.3, bh: 0.28, bl: 0.6, leg: 0.5, neck: 0.3, hw: 0.16, hh: 0.16, hl: 0.3, sn: 0.12, c: '#c9a46a', b: '#d9b98a', ear: 'round', tail: 'tuft', hump: 2 }),
  D({ id: 'crocodile', n: '鱷魚', e: '🐊', cat: 'wild', s: 3.4, bw: 0.34, bh: 0.16, bl: 0.9, leg: 0.1, hw: 0.26, hh: 0.12, hl: 0.4, sn: 0.2, c: '#4b6b2e', b: '#a6b06a', ear: 'none', tail: 'croc', pat: 'scales', d: '#2f4a1c' }),
  D({ id: 'dino', n: '三角龍（恐龍）', e: '🦕', cat: 'wild', s: 5.0, bw: 0.44, bh: 0.36, bl: 0.7, leg: 0.24, hw: 0.36, hh: 0.3, hl: 0.34, sn: 0.12, c: '#5f8f4a', b: '#a8c98a', ear: 'none', tail: 'croc', horn: 'tri' }),
  // ===== 農場 / 小動物 =====
  D({ id: 'horse', n: '馬', e: '🐎', cat: 'farm', s: 2.8, bw: 0.3, bh: 0.32, bl: 0.64, leg: 0.46, neck: 0.22, hw: 0.18, hh: 0.2, hl: 0.32, sn: 0.12, c: '#7a4a24', b: '#7a4a24', ear: 'up', tail: 'tuft', mane: '#2a1a10' }),
  D({ id: 'pony', n: '小馬', e: '🐴', cat: 'farm', s: 1.8, bw: 0.32, bh: 0.32, bl: 0.6, leg: 0.36, neck: 0.18, hw: 0.2, hh: 0.2, hl: 0.3, sn: 0.12, c: '#f2f2f2', b: '#f2f2f2', ear: 'up', tail: 'tuft', mane: '#c9a0e0' }),
  D({ id: 'cow', n: '牛', e: '🐄', cat: 'farm', s: 2.8, bw: 0.4, bh: 0.34, bl: 0.66, leg: 0.32, hw: 0.26, hh: 0.24, hl: 0.3, sn: 0.12, c: '#fafafa', b: '#f4b6c0', pat: 'patch', d: '#1a1a1a', ear: 'side', tail: 'tuft', horn: 'cow' }),
  D({ id: 'pig', n: '豬', e: '🐖', cat: 'farm', s: 1.4, bw: 0.4, bh: 0.34, bl: 0.6, leg: 0.16, sn: 0.08, c: '#f4b0b8', b: '#f7c4ca', ear: 'flop', tail: 'curl' }),
  D({ id: 'sheep', n: '綿羊', e: '🐑', cat: 'farm', s: 1.5, bw: 0.42, bh: 0.36, bl: 0.6, leg: 0.24, hw: 0.2, hh: 0.24, sn: 0.08, c: '#f6f2e6', b: '#2a2a2a', ear: 'side', tail: 'short', fluff: 2 }),
  D({ id: 'goat', n: '山羊', e: '🐐', cat: 'farm', s: 1.5, bw: 0.3, bh: 0.3, bl: 0.56, leg: 0.34, hw: 0.2, hh: 0.22, sn: 0.12, c: '#f2efe8', b: '#e6e0d4', pat: 'beard', ear: 'side', tail: 'short', horn: 'goat' }),
  D({ id: 'donkey', n: '驢仔', e: '🫏', cat: 'farm', s: 2.0, bw: 0.3, bh: 0.32, bl: 0.6, leg: 0.36, neck: 0.16, hw: 0.2, hh: 0.2, hl: 0.3, sn: 0.12, c: '#8a8580', b: '#d9d5cf', ear: 'long', tail: 'tuft', mane: '#3a3530' }),
  D({ id: 'rabbit', n: '兔仔', e: '🐇', cat: 'farm', s: 0.6, bw: 0.32, bh: 0.32, bl: 0.48, leg: 0.12, hw: 0.26, hh: 0.26, hl: 0.24, sn: 0.04, c: '#f7f7f7', b: '#ffc4cf', ear: 'long', tail: 'pom', hop: 1 }),
  D({ id: 'hamster', n: '倉鼠', e: '🐹', cat: 'farm', s: 0.35, bw: 0.4, bh: 0.34, bl: 0.46, leg: 0.06, sn: 0.04, c: '#e8b26a', b: '#ffffff', ear: 'round', tail: 'none' }),
  D({ id: 'turtle', n: '烏龜', e: '🐢', cat: 'farm', s: 0.8, bw: 0.5, bh: 0.2, bl: 0.6, leg: 0.1, hw: 0.18, hh: 0.16, hl: 0.22, sn: 0.06, c: '#4f7a3a', b: '#8fb06a', ear: 'none', tail: 'short', shell: '#6b5a2a' }),
];
export const PET_CATS = [['dog', '🐕 狗（各種品種）'], ['cat', '🐈 貓'], ['wild', '🦁 野獸'], ['farm', '🐄 農場 / 小動物']];
export const petIndex = id => PETS.findIndex(p => p.id === id);

// 簡單決定性隨機（花紋位置固定）
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function buildPet(id) {
  const o = PETS[petIndex(id)] || PETS[0];
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const add = (m, x, y, z, parent = inner) => { m.position.set(x, y, z); parent.add(m); return m; };
  const { bw, bh, bl, leg, hw, hh, hl, sn } = o;
  const fLeg = leg * o.fl, legW = Math.max(0.07, bw * 0.26);
  // 身（前腳長嘅動物，例如大猩猩，身體向前傾斜）
  const torso = new THREE.Group(); inner.add(torso);
  const yB = (leg + fLeg) / 2 + bh / 2; torso.position.set(0, yB, 0);
  torso.rotation.x = -Math.atan2(fLeg - leg, bl * 0.8);
  add(bx(bw, bh, bl, o.c), 0, 0, 0, torso);
  if (o.b !== o.c && !o.ape) add(bx(bw * 0.86, bh * 0.3, bl * 0.75, o.b), 0, -bh * 0.38, 0.02, torso);
  if (o.fluff) { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), M(o.c)); f.scale.set(bw * 0.62 * (o.fluff > 1 ? 1.25 : 1.05), bh * 0.62 * (o.fluff > 1 ? 1.3 : 1.05), bl * 0.56); add(f, 0, 0.02, 0, torso); }
  if (o.shell) { const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(o.shell)); sh.scale.set(bw * 0.62, bh * 1.6, bl * 0.6); add(sh, 0, bh * 0.2, 0, torso); }
  const R = rng(o.id.length * 7919 + o.n.length * 31);
  const pat = o.pat;
  if (pat === 'stripes') for (let i = 0; i < 7; i++) add(bx(bw + 0.012, bh * 0.75, 0.035), 0, bh * 0.12, -bl / 2 + 0.08 + i * (bl - 0.16) / 6, torso).material = M(o.d);
  if (pat === 'spots' || pat === 'rosette') for (let i = 0; i < 18; i++) { const side = R() < 0.5 ? -1 : 1, top = R() < 0.3; const s = add(bx(top ? 0.05 : 0.012, 0.05, 0.05, o.d), top ? (R() - 0.5) * bw * 0.8 : side * (bw / 2 + 0.004), top ? bh / 2 + 0.004 : (R() - 0.3) * bh * 0.7, (R() - 0.5) * bl * 0.9, torso); if (top) s.scale.y = 0.2; }
  if (pat === 'patch' || pat === 'patches') for (let i = 0; i < (pat === 'patches' ? 14 : 5); i++) { const side = R() < 0.5 ? -1 : 1, sz = pat === 'patches' ? 0.07 : 0.14; add(bx(0.012, sz, sz * 1.3, o.d), side * (bw / 2 + 0.004), (R() - 0.4) * bh * 0.6, (R() - 0.5) * bl * 0.85, torso); }
  if (pat === 'saddle') add(bx(bw + 0.01, bh * 0.45, bl * 0.6, o.d), 0, bh * 0.3, -0.02, torso);
  if (pat === 'panda') { add(bx(bw + 0.01, bh * 0.5, bl * 0.28, o.d), 0, 0.02, bl * 0.18, torso); }
  if (pat === 'scales') for (let i = 0; i < 8; i++) add(bx(0.06, 0.04, 0.06, o.d), 0, bh / 2 + 0.02, -bl / 2 + 0.06 + i * bl / 8, torso);
  if (pat === 'collar' || pat === 'mask') add(bx(bw + 0.01, bh * 0.8, 0.08, pat === 'collar' ? '#ffffff' : o.b), 0, 0, bl / 2 - 0.04, torso);
  if (o.hump) for (let i = 0; i < o.hump; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), M(o.c)); h.scale.set(bw * 0.38, bh * 0.55, bl * 0.18); add(h, 0, bh / 2, (o.hump > 1 ? (i ? -1 : 1) * bl * 0.16 : 0), torso); }
  // 頸 + 頭
  const front = bl / 2, topY = yB + bh / 2 + (fLeg - leg) * 0.5;
  const head = new THREE.Group(); inner.add(head);
  let hy = topY - hh * 0.15, hz = front + hl * 0.25;
  if (o.neck) {
    const nk = bx(bw * 0.42, o.neck + hh * 0.4, bw * 0.42, o.c); add(nk, 0, topY + o.neck / 2 - bh * 0.15, front - bw * 0.15); nk.rotation.x = 0.25;
    if (o.mane) add(bx(0.05, o.neck * 0.9, bw * 0.3, o.mane), 0, topY + o.neck / 2, front - bw * 0.3).rotation.x = 0.25;
    if (pat === 'patches') for (let i = 0; i < 5; i++) add(bx(bw * 0.43, 0.06, 0.06, o.d), 0, topY + i * o.neck / 5, front - bw * 0.15 + 0.01).rotation.x = 0.25;
    if (pat === 'stripes') for (let i = 0; i < 4; i++) add(bx(bw * 0.44, 0.03, bw * 0.44, o.d), 0, topY + i * o.neck / 4, front - bw * 0.15).rotation.x = 0.25;
    hy = topY + o.neck - bh * 0.05; hz = front + hl * 0.2;
  }
  if (o.ape) { hy = topY + hh * 0.1; hz = front * 0.6; }
  head.position.set(0, hy, hz);
  const hc = pat === 'points' ? o.b : o.c;
  add(bx(hw, hh, hl, hc), 0, 0, 0, head);
  if (o.mane && !o.neck) { const mn = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), M(o.mane)); mn.scale.set(hw * 0.95, hh * 1.0, hl * 0.6); add(mn, 0, 0, -hl * 0.15, head); }
  if (o.ape) add(bx(hw * 0.8, hh * 0.45, 0.05, o.b), 0, -hh * 0.12, hl / 2 + 0.01, head);
  if (pat === 'mask') add(bx(hw * 0.6, hh * 0.5, 0.012, o.b), 0, -hh * 0.1, hl / 2 + 0.005, head);
  if (pat === 'panda') { [-1, 1].forEach(s => add(bx(0.07, 0.06, 0.012, o.d), s * hw * 0.22, hh * 0.08, hl / 2 + 0.006, head)); }
  if (pat === 'wrinkle') for (let i = 0; i < 3; i++) add(bx(hw + 0.01, 0.015, hl * 0.8, o.d === '#222' ? '#a87a44' : o.d), 0, hh * 0.3 - i * 0.05, 0, head);
  // 嘴 + 鼻 + 眼
  if (sn > 0) {
    const sw = Math.min(hw * 0.6, 0.2);
    add(bx(sw, hh * 0.45, sn, pat === 'points' || pat === 'tan' ? o.b : o.b), 0, -hh * 0.2, hl / 2 + sn / 2, head);
    add(bx(sw * 0.35, 0.04, 0.03, '#1a1a1a'), 0, -hh * 0.02, hl / 2 + sn + 0.005, head);
    if (pat === 'beard') add(bx(sw * 0.9, hh * 0.35, 0.06, '#d8d8d8'), 0, -hh * 0.45, hl / 2 + sn * 0.6, head);
  }
  [-1, 1].forEach(s => add(bx(0.035, 0.035, 0.015, '#111'), s * hw * 0.24, hh * 0.12, hl / 2 + 0.006, head));
  // 耳
  const earC = pat === 'points' ? o.b : o.c;
  [-1, 1].forEach(s => {
    if (o.ear === 'up') { const e = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.2, hh * 0.5, 4), M(earC)); e.rotation.y = Math.PI / 4; add(e, s * hw * 0.33, hh * 0.68, -hl * 0.1, head); }
    else if (o.ear === 'big') { const e = new THREE.Mesh(new THREE.ConeGeometry(hw * 0.28, hh * 0.85, 4), M(earC)); e.rotation.y = Math.PI / 4; e.rotation.z = -s * 0.35; add(e, s * hw * 0.42, hh * 0.78, -hl * 0.1, head); }
    else if (o.ear === 'flop') add(bx(0.04, hh * 0.75, hl * 0.4, o.ear === 'flop' && o.d === '#2a2a2a' ? o.d : earC), s * (hw / 2 + 0.02), -hh * 0.1, -hl * 0.05, head);
    else if (o.ear === 'round') { const e = new THREE.Mesh(new THREE.SphereGeometry(hw * 0.15, 8, 6), M(pat === 'panda' ? o.d : earC)); add(e, s * hw * 0.4, hh * 0.52, -hl * 0.1, head); }
    else if (o.ear === 'long') add(bx(hw * 0.18, hh * 1.4, 0.05, earC), s * hw * 0.22, hh * 1.1, -hl * 0.15, head);
    else if (o.ear === 'side') add(bx(hw * 0.35, 0.05, hh * 0.25, earC), s * (hw / 2 + hw * 0.15), hh * 0.25, -hl * 0.1, head);
    else if (o.ear === 'elephant') add(bx(0.04, hh * 1.3, hl * 1.4, o.c), s * (hw / 2 + 0.03), 0, -hl * 0.3, head);
  });
  // 角 / 象鼻
  if (o.trunk) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.14, hw * 0.22, hh * 1.7, 8), M(o.c)); t.rotation.x = 0.25; add(t, 0, -hh * 0.75, hl / 2 + 0.06, head);
    [-1, 1].forEach(s => { const tk = new THREE.Mesh(new THREE.ConeGeometry(0.03, hh * 0.8, 6), M('#fffbea')); tk.rotation.x = -2.2; add(tk, s * hw * 0.28, -hh * 0.4, hl / 2 + 0.1, head); });
  }
  if (o.horn === 'rhino') { const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), M('#d8d0c0')); h.rotation.x = 0.3; add(h, 0, hh * 0.2, hl / 2 + sn * 0.6, head); }
  if (o.horn === 'tri') { [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 6), M('#f2ead8')); h.rotation.x = 1.0; add(h, s * hw * 0.25, hh * 0.45, hl * 0.3, head); }); const fr = bx(hw * 1.5, hh * 1.4, 0.04, o.b); add(fr, 0, hh * 0.4, -hl * 0.45, head).rotation.x = -0.4; }
  if (o.horn === 'ossicone') [-1, 1].forEach(s => add(bx(0.03, hh * 0.6, 0.03, o.d), s * hw * 0.2, hh * 0.75, -hl * 0.15, head));
  if (o.horn === 'antler') [-1, 1].forEach(s => { const a = add(bx(0.025, hh * 1.2, 0.025, '#8a6a42'), s * hw * 0.25, hh * 1.0, -hl * 0.1, head); a.rotation.z = -s * 0.4; add(bx(0.02, 0.02, hh * 0.6, '#8a6a42'), s * hw * 0.45, hh * 1.2, 0, head); add(bx(0.02, hh * 0.4, 0.02, '#8a6a42'), s * hw * 0.55, hh * 1.4, -hl * 0.1, head).rotation.z = -s * 0.6; });
  if (o.horn === 'cow' || o.horn === 'goat') [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.025, hh * 0.5, 6), M(o.horn === 'cow' ? '#efe6d0' : '#9e8f78')); h.rotation.z = -s * (o.horn === 'cow' ? 1.1 : 0.3); h.rotation.x = o.horn === 'goat' ? -0.5 : 0; add(h, s * hw * 0.45, hh * 0.5, -hl * 0.1, head); });
  // 腳
  const legs = [];
  [[-1, 1, fLeg], [1, 1, fLeg], [-1, -1, leg], [1, -1, leg]].forEach(([sx, sz, L]) => {
    const p = new THREE.Group(); p.position.set(sx * (bw / 2 - legW / 2), L, sz * (bl / 2 - legW * 0.8) * (o.ape && sz > 0 ? 0.7 : 1)); inner.add(p);
    const lw = legW * (o.hop && sz < 0 ? 1.4 : 1);
    add(bx(lw, L, lw, o.c), 0, -L / 2, 0, p);
    const pawC = pat === 'socks' || pat === 'points' ? o.d === '#f7efe0' ? o.c : (pat === 'points' ? o.b : o.d) : pat === 'tan' ? o.b : (o.ape ? o.d : (o.id === 'shiba' || o.id === 'akita' || o.id === 'tong' ? o.b : o.c));
    add(bx(lw * 1.1, Math.min(0.06, L * 0.2), lw * 1.25, pawC), 0, -L + 0.03, 0.01, p);
    legs.push(p);
  });
  // 尾
  let tail = null;
  const tb = new THREE.Group(); tb.position.set(0, yB + bh * 0.25, -bl / 2); inner.add(tb);
  const tc = o.c;
  if (o.tail === 'curl') { tail = new THREE.Mesh(new THREE.TorusGeometry(bw * 0.28, bw * 0.12, 6, 12), M(tc)); tail.rotation.y = Math.PI / 2; tail.position.set(0, bh * 0.4, 0.02); tb.add(tail); tail = tb; }
  else if (o.tail === 'long' || o.tail === 'cat' || o.tail === 'tuft' || o.tail === 'fox' || o.tail === 'fluffy' || o.tail === 'roo' || o.tail === 'croc') {
    const len = { long: bl * 0.55, cat: bl * 0.8, tuft: bl * 0.6, fox: bl * 0.75, fluffy: bl * 0.5, roo: bl * 1.3, croc: bl * 0.9 }[o.tail];
    const th = o.tail === 'fox' || o.tail === 'fluffy' ? bw * 0.35 : o.tail === 'roo' || o.tail === 'croc' ? bw * 0.4 : Math.max(0.03, bw * 0.12);
    const t = add(bx(th, th, len, tc), 0, 0, -len / 2, tb);
    if (o.tail === 'croc' || o.tail === 'roo') { t.scale.set(1, 1, 1); tb.rotation.x = -0.2; t.geometry = new THREE.CylinderGeometry(th * 0.15, th * 0.6, len, 6).rotateX(Math.PI / 2); }
    else tb.rotation.x = o.tail === 'cat' ? 0.9 : o.tail === 'tuft' ? -0.8 : o.tail === 'fox' ? -0.15 : 0.35;
    if (o.tail === 'tuft') add(bx(th * 2.5, th * 2.5, th * 3, o.mane || o.d), 0, 0, -len, tb);
    if (o.tail === 'fox') add(bx(th * 1.05, th * 1.05, len * 0.25, '#ffffff'), 0, 0, -len * 0.95, tb);
    tail = tb;
  } else if (o.tail === 'short') { add(bx(bw * 0.15, bw * 0.15, bw * 0.3, tc), 0, 0, -bw * 0.12, tb); tb.rotation.x = 0.5; tail = tb; }
  else if (o.tail === 'pom') { const p = new THREE.Mesh(new THREE.SphereGeometry(bw * 0.2, 8, 6), M(tc)); add(p, 0, bh * 0.15, -0.02, tb); tail = tb; }
  inner.traverse(m => { if (m.isMesh) m.castShadow = true; });
  g.scale.setScalar(o.s);
  g.userData = { legs, tail, phase: 0, inner, hop: !!o.hop, ape: !!o.ape, size: o.s * Math.max(bl, 0.6), id: o.id, def: o };
  return g;
}

export function animatePet(d, moving, dt) {
  const u = d.userData;
  if (moving) u.phase += dt * (u.hop ? 9 : 14) / Math.sqrt(Math.max(0.6, d.scale.x)); else u.phase *= 0.9;
  const s = Math.sin(u.phase);
  if (u.hop) {
    u.inner.position.y = moving ? Math.abs(s) * 0.25 : 0;
    u.legs.forEach((l, i) => l.rotation.x = moving ? (i > 1 ? -Math.abs(s) * 0.8 : 0.3) : 0);
  } else {
    u.legs[0].rotation.x = s * 0.8; u.legs[3].rotation.x = s * 0.8; u.legs[1].rotation.x = -s * 0.8; u.legs[2].rotation.x = -s * 0.8;
  }
  if (u.tail) u.tail.rotation.z = Math.sin(performance.now() / 120) * 0.35;
}
