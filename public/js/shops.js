// 商店街：麥當勞、肯德基、吉野家、大八坊酒樓、百佳、惠康、銀行（全部程式即場畫，唔用 logo 圖片）
import * as THREE from 'three';
import * as T from './textures.js';
import { goldMat, buildAvatar } from './avatar.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const Z0 = 36, DEPTH = 12, Z1 = Z0 + DEPTH, H = 4.2;

// 每間舖嘅位置同外觀（顏色以研究資料覆蓋）
export const SHOP_LAYOUT = [
  { key: 'mcd', type: 'fast', cx: -40, w: 11, colors: ['#da291c', '#ffc72c'], sign: "麥當勞 McDonald's", act: '🍔 點餐' },
  { key: 'kfc', type: 'fast', cx: -28, w: 11, colors: ['#e4002b', '#ffffff'], sign: '肯德基 KFC', act: '🍗 點餐' },
  { key: 'yoshinoya', type: 'bar', cx: -16.5, w: 10, colors: ['#f08200', '#5a2d0c'], sign: '吉野家 Yoshinoya', act: '🍚 點餐' },
  { key: 'restaurant', type: 'chinese', cx: 0, w: 18, colors: ['#b3121b', '#f5c242'], sign: '大八坊酒樓', act: '🥢 睇餐牌點菜' },
  { key: 'parknshop', type: 'market', cx: 18, w: 15, colors: ['#e60012', '#0055a5'], sign: '百佳 PARKnSHOP', act: '🛒 入去購物' },
  { key: 'wellcome', type: 'market', cx: 34.5, w: 15, colors: ['#e2231a', '#ffd400'], sign: '惠康 Wellcome', act: '🛒 入去購物' },
  { key: 'bank', type: 'bank', cx: 50, w: 12, colors: ['#0b4f8a', '#d4af37'], sign: '金條銀行 GOLD BANK', act: '🏦 銀行櫃位' },
];

function menuBoardTex(title, items, bg, fg, accent) {
  return T.canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, 0, w, 70);
    g.fillStyle = bg; g.font = 'bold 48px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, w / 2, 37);
    g.textAlign = 'left'; g.font = '30px sans-serif';
    const cols = 2, rows = Math.ceil(Math.min(items.length, 16) / cols);
    items.slice(0, 16).forEach((it, i) => {
      const c = Math.floor(i / rows), r = i % rows, x = 30 + c * (w / cols), y = 105 + r * ((h - 120) / rows);
      g.fillStyle = fg; g.fillText(`${it.e || '•'} ${it.n}`, x, y);
      g.fillStyle = accent; g.textAlign = 'right'; g.fillText(`$${it.p}`, x + w / cols - 50, y); g.textAlign = 'left';
    });
  });
}

export function buildShops(scene, api, SHOPS = {}) {
  const colliders = [], interactables = [], updaters = [], spots = {};
  // NPC 用嘅位置（座位、通道、櫃位），要同下面擺設嘅位置一致
  function shopSpots(S, cx, x0, x1) {
    const base = { key: S.key, type: S.type, cx, street: [cx, 31], doorOut: [cx, Z0 - 1.4], doorIn: [cx, Z0 + 1.2] };
    if (S.type === 'fast') {
      const ax = cx + 0.8, seats = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < Math.floor((S.w - 3) / 2.6); c++) {
        const tx = x0 + 2.4 + c * 2.6, tz = Z0 + 2.2 + r * 2.6;
        if ((Math.abs(tx - cx) < 1.6 && r === 0) || Math.abs(tx - ax) > 2) continue;
        seats.push({ x: tx, z: tz - 0.8, face: 0 }, { x: tx, z: tz + 0.8, face: Math.PI });
      }
      return { ...base, aisle: ax, counter: [ax, Z1 - 4.4], seats };
    }
    if (S.type === 'bar') {
      const seats = [];
      for (let i = 0; i < 6; i++) seats.push({ x: x0 + 2.2 + i * ((S.w - 4.4) / 5), z: Z0 + 3.9, face: 0, high: true });
      return { ...base, front: Z0 + 3.0, seats };
    }
    if (S.type === 'chinese') {
      const seats = [];
      [3.2, 6.6].forEach(dz => {
        seats.push({ x: cx - 5 + 1.35, z: Z0 + dz, face: -Math.PI / 2 });
        seats.push({ x: cx - 1.35, z: Z0 + dz, face: Math.PI / 2 });
      });
      return { ...base, entry: [[cx - 1.8, Z0 + 1.4], [cx - 2.5, Z0 + 2.3]], aisle: cx - 2.5, seats };
    }
    if (S.type === 'market') {
      const gaps = [cx - 2.15, cx + 2.15];
      return { ...base, gaps, front: Z0 + 2.8, browseZ: [Z0 + 4.5, Z0 + 6.5, Z0 + 8.5], shelfX: [x0 + 3.2, cx, x0 + 11.8], checkout: [x0 + 4.6, Z0 + 1.6] };
    }
    const tellers = [0, 1, 2, 3].map(i => [x0 + 2 + i * ((S.w - 4) / 3), Z1 - 4.4]);
    return { ...base, hall: [cx, Z0 + 6.5], tellers };
  }
  const addCol = (x0, y0, z0, x1, y1, z1) => colliders.push({ min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)] });
  const mesh = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const box = (x0, y0, z0, x1, y1, z1, mat, col = true) => {
    const m = mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (col) addCol(x0, y0, z0, x1, y1, z1); return m;
  };
  const glass = new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3, depthWrite: false });
  const sign = (text, bg, fg, w, h, x, y, z, ry = Math.PI, font) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: T.signTex(text, bg, fg, 1024, Math.round(1024 * h / w), font || `bold ${Math.round(700 * h / w)}px sans-serif`) }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
  };
  const inter = (pos, r, label, act) => interactables.push({ pos: new THREE.Vector3(...pos), r, label, act });
  const chair = (x, z, ry, mat) => {
    box(x - 0.22, 0.42, z - 0.22, x + 0.22, 0.47, z + 0.22, mat, false);
    const back = mesh(new THREE.BoxGeometry(0.44, 0.5, 0.05), mat, x, 0.72, z); back.position.x += Math.sin(ry) * -0.2; back.position.z += Math.cos(ry) * -0.2; back.rotation.y = ry;
    [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([a, b]) => mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), std('#555', { metalness: 0.7 }), x + a, 0.21, z + b));
  };

  for (const S of SHOP_LAYOUT) {
    const data = SHOPS[S.key] || {};
    const colors = (data.colors && data.colors.length >= 2 ? data.colors : S.colors).map(c => c.toLowerCase());
    const [c1, c2] = colors;
    const name = S.type === 'bank' ? '金條銀行' : (data.name || S.sign.split(' ')[0]);
    const signText = S.sign;
    const items = data.items || [];
    const x0 = S.cx - S.w / 2, x1 = S.cx + S.w / 2, cx = S.cx;
    const wallM = std(S.type === 'chinese' ? '#7a1a14' : S.type === 'bank' ? '#e8e4da' : '#f2efe8');
    const outM = std(c1, { roughness: 0.5 });
    // 外牆 / 屋頂
    box(x0 - 0.2, 0, Z1, x1 + 0.2, H, Z1 + 0.2, outM);
    box(x0 - 0.2, 0, Z0, x0, H, Z1, outM);
    box(x1, 0, Z0, x1 + 0.2, H, Z1, outM);
    box(x0 - 0.3, H, Z0 - 0.3, x1 + 0.3, H + 0.3, Z1 + 0.3, std('#444'));
    // 內牆面
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(S.w, H), wallM); inner.position.set(cx, H / 2, Z1 - 0.01); inner.rotation.y = Math.PI; scene.add(inner);
    // 玻璃門面 + 門口
    const dw = 1.4;
    box(x0, 0, Z0 - 0.08, cx - dw, 0.5, Z0 + 0.08, outM);
    box(cx + dw, 0, Z0 - 0.08, x1, 0.5, Z0 + 0.08, outM);
    const g1 = mesh(new THREE.BoxGeometry(cx - dw - x0, 2.6, 0.05), glass, (x0 + cx - dw) / 2, 1.8, Z0); g1.castShadow = false;
    const g2 = mesh(new THREE.BoxGeometry(x1 - cx - dw, 2.6, 0.05), glass, (x1 + cx + dw) / 2, 1.8, Z0); g2.castShadow = false;
    addCol(x0, 0, Z0 - 0.08, cx - dw, 3.1, Z0 + 0.08); addCol(cx + dw, 0, Z0 - 0.08, x1, 3.1, Z0 + 0.08);
    box(x0, 3.1, Z0 - 0.15, x1, H, Z0 + 0.15, outM);
    [x0, cx - dw, cx + dw, x1].forEach(x => mesh(new THREE.BoxGeometry(0.1, 3.1, 0.12), std('#333', { metalness: 0.6 }), x, 1.55, Z0));
    // 招牌 + 簷篷
    sign(signText, c1, c2, Math.min(S.w - 1, 9), 1.0, cx, H - 0.45, Z0 - 0.17, Math.PI);
    const awn = mesh(new THREE.BoxGeometry(S.w, 0.08, 1.4), std(c2), cx, 3.15, Z0 - 0.7); awn.rotation.x = -0.18;
    // 地板 + 天花燈
    const floorT = S.type === 'chinese' ? T.tileTex(S.w / 3, DEPTH / 3, '#8a2a20', '#6a1a12') : S.type === 'market' ? T.tileTex(S.w / 2, DEPTH / 2, '#e9e9e9', '#cfcfcf') : T.tileTex(S.w / 2, DEPTH / 2, '#e6dccb', '#c9b99a');
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(S.w, DEPTH), std('#fff', { map: floorT })); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.012, Z0 + DEPTH / 2); fl.receiveShadow = true; scene.add(fl);
    for (let i = 0; i < Math.floor(S.w / 3); i++) for (let k = 0; k < 3; k++)
      mesh(new THREE.BoxGeometry(1.2, 0.04, 0.4), new THREE.MeshBasicMaterial({ color: '#fffbea' }), x0 + 1.5 + i * 3, H - 0.03, Z0 + 2 + k * 3.8).castShadow = false;
    // 店內用品
    const ctx = { S, cx, x0, x1, c1, c2, items, name, box, mesh, sign, chair, inter, data };
    if (S.type === 'fast') fastFood(ctx);
    else if (S.type === 'bar') bar(ctx);
    else if (S.type === 'chinese') chinese(ctx);
    else if (S.type === 'market') market(ctx);
    else bank(ctx);
    spots[S.key] = shopSpots(S, cx, x0, x1);
    // 門口互動（入去之後先開餐牌，銀行除外）
    const actZ = { fast: Z1 - 4, bar: Z0 + 3.2, chinese: Z0 + 2.2, market: Z0 + 2.4 }[S.type];
    if (S.type !== 'bank') inter([cx, 0, actZ], 2.6, () => `${S.act}（${name}）`, () => api.openShop(S.key, name, colors));
    else {
      inter([cx, 0, Z1 - 4.2], 2.6, () => '🙋 搵櫃位職員（提錢 / 開保險箱）', () => api.bankTeller(name));
    }
  }

  // ---------- 快餐店（麥當勞 / KFC）----------
  function fastFood({ S, cx, x0, x1, c1, c2, items, name, box, mesh, sign, chair }) {
    const cz = Z1 - 3.4;
    // 櫃位 + 收銀機
    box(x0 + 0.8, 0, cz - 0.4, x1 - 0.8, 1.05, cz + 0.4, std(c1, { roughness: 0.4 }));
    box(x0 + 0.7, 1.05, cz - 0.5, x1 - 0.7, 1.1, cz + 0.5, std('#ddd', { metalness: 0.3, roughness: 0.3 }), false);
    for (let i = 0; i < 3; i++) {
      const rx = cx - 2.2 + i * 2.2;
      mesh(new THREE.BoxGeometry(0.4, 0.12, 0.3), std('#222'), rx, 1.17, cz - 0.1);
      const scr = mesh(new THREE.BoxGeometry(0.36, 0.26, 0.03), new THREE.MeshBasicMaterial({ color: '#3fa9f5' }), rx, 1.38, cz - 0.15); scr.rotation.x = -0.3;
    }
    // 廚房：炸爐、煎板、飲品機、層架
    const steel = std('#c9ced3', { metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      box(x0 + 1 + i * 1.1, 0, Z1 - 1.3, x0 + 1.9 + i * 1.1, 0.95, Z1 - 0.3, steel);
      mesh(new THREE.BoxGeometry(0.7, 0.02, 0.7), std('#d9a520', { metalness: 0.3, roughness: 0.2 }), x0 + 1.45 + i * 1.1, 0.96, Z1 - 0.8).castShadow = false;
    }
    box(cx - 1, 0, Z1 - 1.3, cx + 1.4, 0.95, Z1 - 0.3, steel);
    mesh(new THREE.BoxGeometry(2.3, 0.03, 0.9), std('#333', { metalness: 0.6 }), cx + 0.2, 0.97, Z1 - 0.8);
    box(x1 - 2.4, 0, Z1 - 1.0, x1 - 1.0, 1.7, Z1 - 0.3, std('#888', { metalness: 0.6 }));
    for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), std('#222'), x1 - 2.2 + i * 0.35, 1.0, Z1 - 1.05);
    // 餐牌燈箱（真實價錢）
    const groups = [items.filter(i => /套餐|超值|餐/.test(i.cat || '')), items.filter(i => !/套餐|超值|餐/.test(i.cat || ''))];
    const boardW = Math.min(4, (S.w - 2) / 2);
    [0, 1].forEach(k => {
      const list = groups[k].length ? groups[k] : items.slice(k * 12, k * 12 + 12);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardW / 2), new THREE.MeshBasicMaterial({ map: menuBoardTex(k ? `${name} 單點` : `${name} 套餐`, list, '#1a1a1a', '#ffffff', c2 === '#ffffff' ? c1 : c2) }));
      m.position.set(cx + (k ? 1 : -1) * (boardW / 2 + 0.1), 2.75, Z1 - 0.03); m.rotation.y = Math.PI; scene.add(m);
    });
    // 自助點餐機（入口側）
    for (let i = 0; i < 2; i++) {
      const kx = x0 + 0.6, kz = Z0 + 2 + i * 1.4;
      box(kx - 0.2, 0, kz - 0.3, kx + 0.2, 1.7, kz + 0.3, std('#f4f4f4'));
      const s = mesh(new THREE.BoxGeometry(0.02, 0.9, 0.5), new THREE.MeshBasicMaterial({ color: c1 }), kx + 0.21, 1.2, kz); s.castShadow = false;
      sign('自助點餐', '#111', '#fff', 0.45, 0.12, kx + 0.23, 1.6, kz, Math.PI / 2, 'bold 60px sans-serif');
    }
    // 餐枱椅
    const tableM = std('#b07a46'), chairM = std(c1);
    for (let r = 0; r < 2; r++) for (let c = 0; c < Math.floor((S.w - 3) / 2.6); c++) {
      const tx = x0 + 2.4 + c * 2.6, tz = Z0 + 2.2 + r * 2.6;
      if (Math.abs(tx - cx) < 1.6 && r === 0) continue;
      box(tx - 0.45, 0.72, tz - 0.45, tx + 0.45, 0.76, tz + 0.45, tableM);
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), std('#555', { metalness: 0.7 }), tx, 0.36, tz);
      chair(tx, tz - 0.8, 0, chairM); chair(tx, tz + 0.8, Math.PI, chairM);
    }
    // 垃圾桶 / 餐盤回收
    box(x1 - 0.9, 0, Z0 + 0.6, x1 - 0.3, 1.0, Z0 + 1.4, std('#5a4632'));
    sign('多謝 THANK YOU', '#5a4632', '#fff', 0.5, 0.14, x1 - 0.6, 0.8, Z0 + 0.59, Math.PI, 'bold 50px sans-serif');
    if (S.key === 'kfc') {
      // 紅白直間牆 + 全家桶裝飾
      const stripe = T.canvasTex(256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#e4002b'; g.fillRect(i * 32, 0, 32, 64); } }, 6, 1);
      [x0 + 0.02, x1 - 0.02].forEach((x, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH - 1, 1), std('#fff', { map: stripe })); p.position.set(x, 3.4, Z0 + DEPTH / 2); p.rotation.y = i ? -Math.PI / 2 : Math.PI / 2; scene.add(p); });
      const bucket = mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.55, 16), std('#fff', { map: stripe }), cx + 3, 1.38, cz);
    }
  }

  // ---------- 吉野家（日式吧枱）----------
  function bar({ S, cx, x0, x1, c1, c2, items, name, box, mesh, sign }) {
    const woodM = std('#fff', { map: T.woodTex(2) });
    // U 型吧枱
    box(x0 + 1.5, 0, Z0 + 4.5, x1 - 1.5, 0.95, Z0 + 5.2, woodM);
    box(x0 + 1.5, 0, Z0 + 5.2, x0 + 2.2, 0.95, Z1 - 2.2, woodM);
    box(x1 - 2.2, 0, Z0 + 5.2, x1 - 1.5, 0.95, Z1 - 2.2, woodM);
    // 高櫈
    for (let i = 0; i < 6; i++) {
      const sx = x0 + 2.2 + i * ((S.w - 4.4) / 5);
      mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), std(c1), sx, 0.7, Z0 + 3.9);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), std('#444', { metalness: 0.7 }), sx, 0.35, Z0 + 3.9);
    }
    // 廚房：大鍋牛肉、飯煲
    const steel = std('#c9ced3', { metalness: 0.85, roughness: 0.3 });
    box(x0 + 2.5, 0, Z1 - 1.3, x1 - 2.5, 0.9, Z1 - 0.3, steel);
    for (let i = 0; i < 2; i++) {
      mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.35, 18), steel, cx - 1.2 + i * 2.4, 1.07, Z1 - 0.8);
      mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 18), std('#7a3e16'), cx - 1.2 + i * 2.4, 1.24, Z1 - 0.8).castShadow = false;
    }
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 14), std('#f2f2f2'), cx, 1.1, Z1 - 0.8);
    // 餐牌
    const m = new THREE.Mesh(new THREE.PlaneGeometry(S.w - 2, (S.w - 2) / 2.2), new THREE.MeshBasicMaterial({ map: menuBoardTex(`${name} 餐牌`, items, '#2b1608', '#fff', c1) }));
    m.position.set(cx, 2.8, Z1 - 0.03); m.rotation.y = Math.PI; scene.add(m);
    // 暖簾
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.6, 0.6, 0.02), std(c1, { side: THREE.DoubleSide }), cx - 0.95 + i * 0.63, 2.75, Z0 + 0.25);
    // 兩張二人枱
    [x0 + 1.4, x1 - 1.4].forEach(tx => { box(tx - 0.4, 0.72, Z0 + 1.6, tx + 0.4, 0.76, Z0 + 2.4, woodM); });
  }

  // ---------- 酒樓 ----------
  function chinese({ S, cx, x0, x1, c1, c2, items, name, box, mesh, sign, chair }) {
    const red = std('#c41e1e', { roughness: 0.6 }), goldTrim = goldMat;
    // 舞台 + 龍鳳牆
    box(x0 + 3, 0, Z1 - 2.2, x1 - 3, 0.35, Z1 - 0.2, std('#5a0d0d'));
    const dp = T.canvasTex(1024, 384, (g, w, h) => {
      g.fillStyle = '#9c0f0f'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f5c242'; g.lineWidth = 14; g.strokeRect(16, 16, w - 32, h - 32);
      g.fillStyle = '#f5c242'; g.font = 'bold 150px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('龍 囍 鳳', w / 2, h / 2 + 8);
      g.font = '90px serif'; g.fillText('🐉', 110, h / 2); g.fillText('🦚', w - 110, h / 2);
    });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(S.w - 7, (S.w - 7) * 0.375), new THREE.MeshBasicMaterial({ map: dp }));
    dm.position.set(cx, 2.4, Z1 - 0.03); dm.rotation.y = Math.PI; scene.add(dm);
    // 圓枱（紅枱布）+ 8 張椅
    const cloth = std('#d62424', { roughness: 0.9 }), chairM = std('#6b1a10');
    const spots = [[-5, 3.2], [0, 3.2], [5, 3.2], [-5, 6.6], [5, 6.6], [0, 6.6]];
    spots.forEach(([dx, dz]) => {
      const tx = cx + dx, tz = Z0 + dz;
      const top = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.05, 24), std('#f5f5f5'), tx, 0.76, tz);
      mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.7, 24, 1, true), cloth, tx, 0.42, tz).material.side = THREE.DoubleSide;
      mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 20), std('#e8e8e8', { metalness: 0.4 }), tx, 0.8, tz);
      addCol(tx - 0.9, 0, tz - 0.9, tx + 0.9, 0.78, tz + 0.9);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), std('#fff'), tx + Math.cos(a) * 0.7, 0.8, tz + Math.sin(a) * 0.7);
        chair(tx + Math.cos(a) * 1.35, tz + Math.sin(a) * 1.35, -a - Math.PI / 2, chairM);
      }
    });
    // 燈籠
    for (let i = 0; i < 6; i++) {
      const lx = x0 + 2 + i * ((S.w - 4) / 5), lz = Z0 + 5;
      const l = mesh(new THREE.SphereGeometry(0.32, 14, 10), std('#e01010', { emissive: '#600000' }), lx, 3.4, lz); l.scale.y = 1.25;
      mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10), goldTrim, lx, 3.82, lz); mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10), goldTrim, lx, 2.98, lz);
      updaters.push((dt, t) => { l.rotation.y = Math.sin(t + i) * 0.2; });
    }
    // 海鮮魚缸（側牆）
    const tank = new THREE.MeshStandardMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const tz = Z0 + 2 + i * 1.6;
      box(x0 + 0.2, 0, tz - 0.7, x0 + 1.2, 0.8, tz + 0.7, std('#333'));
      const tk = mesh(new THREE.BoxGeometry(1.0, 1.0, 1.4), tank, x0 + 0.7, 1.3, tz); tk.castShadow = false;
      for (let f = 0; f < 3; f++) {
        const fish = mesh(new THREE.ConeGeometry(0.07, 0.25, 6), std(['#ff7a2a', '#ffd23a', '#e04040'][f]), x0 + 0.7, 1.1 + f * 0.25, tz);
        fish.rotation.z = Math.PI / 2;
        updaters.push((dt, t) => { const a = t * (0.6 + f * 0.2) + i; fish.position.z = tz + Math.sin(a) * 0.5; fish.position.x = x0 + 0.7 + Math.cos(a) * 0.3; fish.rotation.y = a; });
      }
      sign(['龍蝦', '石斑', '游水蝦'][i], '#03396c', '#fff', 0.8, 0.22, x0 + 1.22, 1.95, tz, Math.PI / 2, 'bold 120px sans-serif');
    }
    // 點心車
    const cartX = cx + 2.4, cartZ = Z0 + 1.6;
    box(cartX - 0.5, 0, cartZ - 0.35, cartX + 0.5, 0.85, cartZ + 0.35, std('#c9ced3', { metalness: 0.85, roughness: 0.3 }));
    for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 14), std('#c89a5a'), cartX - 0.3 + (i % 3) * 0.3, 0.92 + Math.floor(i / 3) * 0.11, cartZ);
    sign('點心', '#c41e1e', '#fff', 0.5, 0.2, cartX, 1.25, cartZ - 0.36, Math.PI, 'bold 140px sans-serif');
    // 接待處 + 餐牌
    box(cx - 3.6, 0, Z0 + 0.8, cx - 2.2, 1.1, Z0 + 1.5, red);
    sign('歡迎光臨', '#c41e1e', '#f5c242', 1.2, 0.3, cx - 2.9, 1.5, Z0 + 0.79, Math.PI, 'bold 150px serif');
    const mb = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: menuBoardTex(`${name} 點心・小菜`, items, '#3a0505', '#ffe9b0', '#f5c242') }));
    mb.position.set(x1 - 0.03, 2.3, Z0 + 4); mb.rotation.y = -Math.PI / 2; scene.add(mb);
    // 吊燈
    for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.4, 12), goldTrim, cx - 5 + i * 5, H - 0.4, Z0 + 5);
  }

  // ---------- 超級市場 ----------
  function market({ S, cx, x0, x1, c1, c2, items, name, box, mesh, sign }) {
    const shelfM = std('#e8e8e8', { metalness: 0.2 });
    const cats = [...new Set(items.map(i => i.cat))].slice(0, 6);
    const nAisle = 3;
    const prodGeo = new THREE.BoxGeometry(0.22, 0.3, 0.16);
    const total = nAisle * 2 * 4 * 22;
    const prods = new THREE.InstancedMesh(prodGeo, std('#fff', { roughness: 0.5 }), total);
    const col = new THREE.Color(), mtx = new THREE.Matrix4(); let n = 0;
    const palette = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#ffffff', '#00acc1', '#6d4c41', '#f06292'];
    for (let a = 0; a < nAisle; a++) {
      const ax = x0 + 3.2 + a * ((S.w - 6.4) / (nAisle - 1));
      const az0 = Z0 + 3.6, az1 = Z1 - 2.6;
      box(ax - 0.45, 0, az0, ax + 0.45, 1.9, az1, shelfM);
      for (let side = -1; side <= 1; side += 2) for (let lv = 0; lv < 4; lv++) {
        mesh(new THREE.BoxGeometry(0.03, 0.02, az1 - az0), std('#bbb'), ax + side * 0.46, 0.25 + lv * 0.45, (az0 + az1) / 2).castShadow = false;
        for (let k = 0; k < 22 && n < total; k++) {
          mtx.makeTranslation(ax + side * 0.52, 0.42 + lv * 0.45, az0 + 0.2 + k * ((az1 - az0 - 0.4) / 21));
          prods.setMatrixAt(n, mtx); prods.setColorAt(n, col.set(palette[(a * 7 + lv * 3 + k * (side > 0 ? 1 : 2)) % palette.length])); n++;
        }
      }
      sign(cats[a * 2] ? `${cats[a * 2]}｜${cats[a * 2 + 1] || ''}` : '貨品', c1, '#fff', 1.6, 0.35, ax, 3.1, (az0 + az1) / 2, Math.PI, 'bold 110px sans-serif');
    }
    prods.instanceMatrix.needsUpdate = true; scene.add(prods);
    // 雪櫃牆（後面，發光）
    const fz = Z1 - 0.6;
    box(x0 + 0.5, 0, fz - 0.4, x1 - 0.5, 2.3, fz + 0.4, std('#dfe6ea', { metalness: 0.4 }));
    const fridgeGlow = mesh(new THREE.BoxGeometry(S.w - 1.2, 1.8, 0.02), new THREE.MeshBasicMaterial({ color: '#e8f6ff' }), cx, 1.2, fz - 0.41); fridgeGlow.castShadow = false;
    const bottles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), std('#fff'), 120); let b = 0;
    for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 30; k++) { mtx.makeTranslation(x0 + 0.9 + k * ((S.w - 1.8) / 29), 0.5 + lv * 0.45, fz - 0.43); bottles.setMatrixAt(b, mtx); bottles.setColorAt(b, col.set(palette[(k + lv) % palette.length])); b++; }
    bottles.instanceMatrix.needsUpdate = true; scene.add(bottles);
    for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.02, 1.8, 0.03), std('#999', { metalness: 0.8 }), x0 + 0.6 + i * ((S.w - 1.2) / 4), 1.2, fz - 0.43);
    sign('凍櫃 飲品・奶類', '#0b5ea8', '#fff', 2.4, 0.35, cx, 2.6, fz - 0.42, Math.PI, 'bold 110px sans-serif');
    // 生果 / 蔬菜檔
    const fx = x1 - 1.4, fzc = Z0 + 2.4;
    const stand = mesh(new THREE.BoxGeometry(1.8, 0.8, 1.2), std('#fff', { map: T.woodTex() }), fx, 0.4, fzc); addCol(fx - 0.9, 0, fzc - 0.6, fx + 0.9, 0.8, fzc + 0.6);
    const fruitCols = ['#ff8c00', '#d50000', '#ffd600', '#7cb342'];
    const fruits = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), std('#fff', { roughness: 0.4 }), 96); let f = 0;
    for (let i = 0; i < 12; i++) for (let k = 0; k < 8; k++) { mtx.makeTranslation(fx - 0.8 + i * 0.145, 0.87, fzc - 0.5 + k * 0.14); fruits.setMatrixAt(f, mtx); fruits.setColorAt(f, col.set(fruitCols[Math.floor(i / 3)])); f++; }
    fruits.instanceMatrix.needsUpdate = true; scene.add(fruits);
    sign('新鮮生果蔬菜', '#2e7d32', '#fff', 1.6, 0.3, fx, 1.6, fzc - 0.62, Math.PI, 'bold 110px sans-serif');
    // 收銀處 x2（入口側）+ 購物籃
    for (let i = 0; i < 2; i++) {
      const kx = x0 + 1.6 + i * 2.4, kz = Z0 + 1.6;
      box(kx - 0.35, 0, kz - 0.9, kx + 0.35, 0.9, kz + 0.9, std(c1));
      mesh(new THREE.BoxGeometry(0.5, 0.02, 1.4), std('#111'), kx, 0.91, kz).castShadow = false;
      mesh(new THREE.BoxGeometry(0.35, 0.25, 0.25), std('#333'), kx + 0.15, 1.05, kz + 0.75);
      sign(`${i + 1}`, '#111', '#ff0', 0.3, 0.3, kx, 2.2, kz, Math.PI, 'bold 600px sans-serif');
    }
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.45, 0.22, 0.32), std(i % 2 ? c1 : c2, { roughness: 0.5 }), cx - 0.3, 0.11 + i * 0.12, Z0 + 0.8);
    // 手推車
    const cart = new THREE.Group(); cart.position.set(cx + 1.6, 0, Z0 + 1.2); scene.add(cart);
    mesh(new THREE.BoxGeometry(0.6, 0.45, 0.85), std('#aaa', { metalness: 0.8, wireframe: true }), 0, 0.75, 0, cart);
    mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), std('#e00'), 0, 1.05, -0.45, cart);
  }

  // ---------- 銀行 ----------
  function bank({ S, cx, x0, x1, c1, c2, name, box, mesh, sign, chair }) {
    // 櫃位（玻璃分隔）
    const cz = Z1 - 3.4;
    box(x0 + 0.8, 0, cz - 0.4, x1 - 0.8, 1.1, cz + 0.4, std('#3b2a1a', { roughness: 0.4 }));
    for (let i = 0; i < 4; i++) {
      const tx = x0 + 2 + i * ((S.w - 4) / 3);
      const g = mesh(new THREE.BoxGeometry(1.6, 1.0, 0.03), new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.25, depthWrite: false }), tx, 1.6, cz); g.castShadow = false;
      sign(`${i + 1} 號櫃位`, c1, '#fff', 0.8, 0.22, tx, 2.3, cz - 0.02, Math.PI, 'bold 150px sans-serif');
      mesh(new THREE.BoxGeometry(0.35, 0.25, 0.04), new THREE.MeshBasicMaterial({ color: '#222' }), tx, 1.25, cz + 0.2);
    }
    // 櫃位職員（2 號 + 3 號櫃位有人）
    [[1, { gender: 'f', skin: '#f1c27d', hat: 'none', shirt: '#ffffff', pants: '#1d3b6e', hair: '#1b1b1b' }, '陳小姐'], [2, { gender: 'm', skin: '#e0ac69', hat: 'none', shirt: '#dfe9f5', pants: '#263238', hair: '#2b2b2b' }, '李先生']].forEach(([i, look, nm]) => {
      const tx = x0 + 2 + i * ((S.w - 4) / 3);
      const av = buildAvatar(look); av.position.set(tx, 0, cz + 0.85); av.rotation.y = Math.PI; scene.add(av);
      box(tx - 0.3, 0, cz + 1.1, tx + 0.3, 0.5, cz + 1.5, std('#333'), false);
      sign(`職員 ${nm}`, '#ffffff', c1, 0.6, 0.15, tx, 1.95, cz - 0.03, Math.PI, 'bold 120px sans-serif');
    });
    // 金庫門
    const vault = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 32), std('#9aa0a6', { metalness: 0.95, roughness: 0.25 }), cx, 1.6, Z1 - 0.2); vault.rotation.x = Math.PI / 2;
    const wheel = mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 24), goldMat, cx, 1.6, Z1 - 0.38);
    for (let i = 0; i < 3; i++) { const sp = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), goldMat, cx, 1.6, Z1 - 0.38); sp.rotation.z = i * Math.PI / 3; }
    updaters.push((dt, t) => { wheel.rotation.z = Math.sin(t * 0.5) * 0.3; });
    // 金條展示
    for (let i = 0; i < 9; i++) mesh(new THREE.BoxGeometry(0.3, 0.1, 0.14), goldMat, cx - 2.4 + (i % 3) * 0.32, 1.17 + Math.floor(i / 3) * 0.1, cz);
    // 攞籌機 + 叫號顯示
    box(x0 + 0.6, 0, Z0 + 1.2, x0 + 1.1, 1.3, Z0 + 1.7, std('#fafafa'));
    const q = T.canvasTex(512, 128, (g) => { g.fillStyle = '#100'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#ff3b2b'; g.font = 'bold 56px monospace'; g.textAlign = 'center'; g.fillText('請 A023 到 3號櫃位', 256, 82); });
    const qd = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshBasicMaterial({ map: q })); qd.position.set(cx, 3.3, cz - 0.05); qd.rotation.y = Math.PI; scene.add(qd);
    // 櫃員機（ATM，入口側牆）
    for (let i = 0; i < 2; i++) {
      const az = Z0 + 2 + i * 1.3;
      box(x1 - 0.8, 0, az - 0.4, x1 - 0.1, 1.8, az + 0.4, std('#2b3a4a', { metalness: 0.4 }));
      mesh(new THREE.BoxGeometry(0.02, 0.35, 0.45), new THREE.MeshBasicMaterial({ color: '#4fc3f7' }), x1 - 0.81, 1.35, az).castShadow = false;
      sign('ATM', c1, '#fff', 0.5, 0.15, x1 - 0.81, 1.7, az, -Math.PI / 2, 'bold 300px sans-serif');
    }
    inter([x1 - 1.6, 0, Z0 + 2.6], 1.6, () => '🏧 用櫃員機', () => api.openBank(name));
    // 等候梳化 + 植物
    for (let i = 0; i < 3; i++) chair(x0 + 2.5 + i * 0.7, Z0 + 4.2, Math.PI, std('#1d3b6e'));
    mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.5, 10), std('#6d4c41'), x0 + 0.7, 0.25, Z0 + 4.2);
    mesh(new THREE.SphereGeometry(0.45, 10, 8), std('#2e7d32'), x0 + 0.7, 0.9, Z0 + 4.2);
  }

  return { colliders, interactables, spots, update: (dt, t) => updaters.forEach(f => f(dt, t)) };
}
