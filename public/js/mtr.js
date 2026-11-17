// 地鐵（港鐵 10 條綫、98 個站）：地面有每個站嘅入口，入去係地底大堂 + 月台，入閘揀目的地，上車有中英文報站
import * as THREE from 'three';
import { Batch, CHUNK, EXCL } from './city.js';
import { IM, signMat, sign } from './interiors.js';
import * as TX from './textures.js';
import { ST, LINES, WALKS, geo } from './mtr_data.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...e });
const lineOf = v => Math.round((v + 100) / CHUNK) * CHUNK - 100;
export const STATION = { x: 6600, z: 900 }, CAR = { x: 6600, z: 1200 };
export const LINE_OF = Object.fromEntries(LINES.map(l => [l.id, l]));
// 每個站喺邊條綫
export const LINES_AT = {};
LINES.forEach(l => l.r.forEach(r => r.forEach(k => { (LINES_AT[k] = LINES_AT[k] || new Set()).add(l.id); })));
const OVERRIDE = { LHP: [4428, 2600, -Math.PI / 2] };   // 康城站：喺日出康城商場門口

// ---------- 入口位置：真實位置 → 擺喺最近條馬路旁邊嘅行人路 ----------
export const ENTR = {};
{
  const placed = [];
  for (const [k, s] of Object.entries(ST)) {
    let [x, z] = geo(s[2], s[3]), yaw;
    if (OVERRIDE[k]) { [x, z, yaw] = OVERRIDE[k]; }
    else {
      const rx = lineOf(x), rz = lineOf(z);
      if (Math.abs(x - rx) < Math.abs(z - rz)) { const sd = x < rx ? -1 : 1; x = rx + sd * 9.5; yaw = sd < 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { const sd = z < rz ? -1 : 1; z = rz + sd * 9.5; yaw = sd < 0 ? 0 : Math.PI; }
      // 唔好同其他站入口太近，亦唔好喺路口中間
      for (let n = 0; n < 12; n++) {
        const along = Math.abs(Math.sin(yaw)) > 0.5 ? 'z' : 'x';
        const clash = placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 26);
        const cross = along === 'z' ? Math.abs(z - lineOf(z)) < 16 : Math.abs(x - lineOf(x)) < 16;
        const excl = EXCL.some(r => x > r.x0 - 2 && x < r.x1 + 2 && z > r.z0 - 2 && z < r.z1 + 2);
        if (!clash && !cross && !excl) break;
        if (along === 'z') z += 30; else x += 30;
      }
    }
    placed.push([x, z]); ENTR[k] = { x, z, yaw };
  }
}

// ---------- 路線搜尋（最少站數，轉綫加罰）----------
function buildGraph() {
  const adj = {};
  const add = (a, b, line) => { (adj[a] = adj[a] || []).push({ to: b, line }); (adj[b] = adj[b] || []).push({ to: a, line }); };
  LINES.forEach(l => l.r.forEach(r => { for (let i = 1; i < r.length; i++) add(r[i - 1], r[i], l.id); }));
  WALKS.forEach(([a, b]) => add(a, b, 'WALK'));
  return adj;
}
const ADJ = buildGraph();
export function findRoute(from, to) {
  if (from === to) return null;
  const dist = new Map(), prev = new Map(), Q = [];
  const key = (s, l) => s + '|' + l;
  const start = key(from, ''); dist.set(start, 0); Q.push([0, from, '']);
  while (Q.length) {
    Q.sort((a, b) => a[0] - b[0]); const [d, s, l] = Q.shift();
    if (d > dist.get(key(s, l))) continue;
    if (s === to) {
      // 還原路線
      const legs = []; let cur = key(s, l);
      while (prev.has(cur)) { const p = prev.get(cur); legs.unshift({ from: p.s, to: cur.split('|')[0], line: cur.split('|')[1] }); cur = key(p.s, p.l); }
      return legs;
    }
    for (const e of ADJ[s] || []) {
      const nd = d + (e.line === 'WALK' ? 2 : 1) + (l && e.line !== l ? 4 : 0);
      const k = key(e.to, e.line);
      if (nd < (dist.get(k) ?? 1e9)) { dist.set(k, nd); prev.set(k, { s, l }); Q.push([nd, e.to, e.line]); }
    }
  }
  return null;
}
export function fareOf(legs) {
  const n = legs.filter(l => l.line !== 'WALK').length, ael = legs.some(l => l.line === 'AEL');
  return Math.round(Math.min(48, 4.5 + n * 1.3) + (ael ? 55 : 0));
}

// ---------- 招牌貼圖 ----------
function nameTex(zh, en, color) {
  return TX.canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.fillStyle = color; g.fillRect(0, h - 36, w, 36);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 110px sans-serif'; g.fillText(zh, w / 2, 86);
    g.font = 'bold 56px sans-serif'; g.fillText(en, w / 2, 176);
  });
}

export function buildMTR(scene, api) {
  const inter = [];
  // ===== 地面入口（98 個，一個 Mesh）=====
  const EB = new Batch();
  const red = std('#c62828'), glassR = std('#263238', { metalness: 0.4 }), white = std('#fafafa');
  for (const [k, e] of Object.entries(ENTR)) {
    const c = Math.cos(e.yaw), s = Math.sin(e.yaw);
    const P = (lx, lz) => [e.x + lx * c + lz * s, e.z - lx * s + lz * c];
    const box = (lx0, y0, lz0, lx1, y1, lz1, m, col = true) => { const [ax, az] = P(lx0, lz0), [bx, bz] = P(lx1, lz1); EB.box(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), m, col); };
    box(-2.2, 0, -3, 2.2, 0.3, 3, std('#9e9e9e'), false);
    box(-2.2, 0, -3, -1.9, 2.8, 3, white); box(1.9, 0, -3, 2.2, 2.8, 3, white); box(-2.2, 0, -3.3, 2.2, 2.8, -3, white);
    box(-2.3, 2.8, -3.4, 2.3, 3.3, 3.2, red, false);
    box(-1.9, 0.02, -2.9, 1.9, 0.04, 2.9, glassR, false);
    const [ix, iz] = P(0, 4);
    inter.push({ pos: new V3(ix, 0, iz), r: 3.2, label: () => `🚇 入 ${ST[k][0]}站（港鐵 ${[...LINES_AT[k]].map(id => LINE_OF[id].zh).join('、')}）`, act: () => enter(k) });
  }
  const eg = EB.build(); scene.add(eg);
  // 附近入口先貼站名牌（慳記憶體）
  const signs = new Map();
  function updateSigns(p) {
    for (const [k, e] of Object.entries(ENTR)) {
      const d = Math.hypot(e.x - p.x, e.z - p.z), has = signs.get(k);
      if (d < 260 && !has) {
        const line = LINE_OF[[...LINES_AT[k]][0]];
        const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: nameTex(ST[k][0] + '站', ST[k][1], line.c), side: THREE.DoubleSide }));
        m.position.set(e.x + Math.sin(e.yaw) * 3.25, 3.05, e.z + Math.cos(e.yaw) * 3.25); m.rotation.y = e.yaw; scene.add(m);
        const logo = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), new THREE.MeshBasicMaterial({ map: TX.signTex('🚇', '#c62828', '#fff', 128, 128, 'bold 80px sans-serif') }));
        logo.position.set(e.x + Math.sin(e.yaw) * 3.3, 4.4, e.z + Math.cos(e.yaw) * 3.3); logo.rotation.y = e.yaw; scene.add(logo);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), std('#555')); pole.position.set(logo.position.x, 3.7, logo.position.z); scene.add(pole);
        signs.set(k, [m, logo, pole]);
      } else if (d > 320 && has) { has.forEach(o => { scene.remove(o); o.material.map?.dispose(); o.material.dispose(); o.geometry.dispose(); }); signs.delete(k); }
    }
  }

  // ===== 地底車站（所有站共用一個模板，招牌會變）=====
  const B = new Batch(), X = STATION.x, Z = STATION.z;
  const b = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + Math.min(x0, x1), y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), y1, Z + Math.max(z0, z1), m, col);
  const floor = std('#fff', { map: TX.tileTex(1, 1, '#e8e4dc', '#cfc9bd') }), wall = std('#eceff1'), dark = std('#37474f'), steel = std('#b0bec5', { metalness: 0.8, roughness: 0.3 });
  b(-16, -0.4, -44, 16, 0, 20, floor);
  b(-16, 4.6, -44, 16, 4.9, 20, std('#f5f5f5'));
  b(-16.3, 0, -44, -16, 4.6, 20, wall); b(16, 0, -44, 16.3, 4.6, 20, wall); b(-16, 0, -44.3, 16, 4.6, -44, wall); b(-16, 0, 20, 16, 4.6, 20.3, wall);
  for (let z = -40; z < 18; z += 6) b(-6, 4.55, z, 6, 4.6, z + 3, IM.light, false);
  // 出口樓梯（裝飾）
  for (let k = 0; k < 8; k++) b(-3, k * 0.45, 17 + k * 0.4, 3, k * 0.45 + 0.45, 20, std('#9e9e9e'));
  sign(B, X, 4.0, Z + 16.6, 6, 0.7, signMat('⬆ 出口 EXIT', '#ffd600', '#111'), '-z');
  // 售票機 / 客務中心
  for (let k = 0; k < 3; k++) { b(-15.8, 0, 5 + k * 2.2, -14.8, 1.9, 6.6 + k * 2.2, std('#1565c0')); b(-14.79, 1.0, 5.3 + k * 2.2, -14.75, 1.6, 6.3 + k * 2.2, IM.screen, false); }
  sign(B, X - 15.7, 2.6, Z + 7.5, 5, 0.6, signMat('🎫 售票機 TICKETS', '#1565c0'), '+x');
  b(11, 0, 6, 15.8, 1.1, 11, std('#eceff1')); sign(B, X + 13.4, 2.6, Z + 11.05, 5, 0.6, signMat('客務中心 CUSTOMER SERVICE', '#00695c'), '+z');
  // 入閘機（中間有位行）
  for (let k = -4; k <= 4; k++) { const x = k * 1.8; b(x - 0.25, 0, 1.4, x + 0.25, 1.05, 3.2, steel); b(x - 0.26, 1.05, 1.5, x + 0.26, 1.1, 1.9, std('#ffd600'), false); }
  b(-16, 0, 2.2, -7.6, 1.05, 2.4, steel); b(7.6, 0, 2.2, 16, 1.05, 2.4, steel);
  sign(B, X, 3.9, Z + 2.2, 7, 0.7, signMat('入閘 ⇩ 往月台 TO PLATFORMS', '#263238', '#fff'), '+z');
  // 月台（島式），兩邊路軌 + 幕門
  b(-16, -1.3, -44, -6, -0.4, 0, std('#555'), false); b(6, -1.3, -44, 16, -0.4, 0, std('#555'), false);
  b(-16, 0, -44, -6, 0.0, 0, std('#555'), false);
  B.cols.push({ min: [X - 16, -0.4, Z - 44], max: [X - 6, 0, Z] }, { min: [X + 6, -0.4, Z - 44], max: [X + 16, 0, Z] });
  for (const sx of [-1, 1]) {
    for (let z = -42; z < -1; z += 4) { b(sx * 6 - 0.08, 0, z, sx * 6 + 0.08, 2.4, z + 4, IM.glass, false); b(sx * 6 - 0.1, 2.4, z, sx * 6 + 0.1, 2.9, z + 4, dark, false); }
    B.cols.push({ min: [X + sx * 6 - 0.1, 0, Z - 44], max: [X + sx * 6 + 0.1, 2.9, Z] });
  }
  for (let z = -40; z < -2; z += 8) b(-0.35, 0, z, 0.35, 4.6, z + 0.7, std('#cfd8dc'));
  for (let z = -36; z < -4; z += 10) { b(-2.6, 0, z, -1.4, 0.45, z + 3, IM.wood); b(1.4, 0, z, 2.6, 0.45, z + 3, IM.wood); }
  // 列車（停喺東邊，門打開）
  const trainM = std('#e0e0e0', { metalness: 0.6, roughness: 0.3 });
  b(7, 0, -42, 11, 3.4, -2, trainM, false);
  for (let z = -40; z < -3; z += 4.5) b(6.95, 1.2, z, 7, 2.2, z + 3, std('#1e2a33'), false);
  const stripeMat = std('#c62828'); b(6.94, 0.5, -42, 6.96, 0.8, -2, stripeMat, false);
  const g = B.build(); scene.add(g);
  // 動態站名牌
  const boards = [];
  const boardMat = new THREE.MeshBasicMaterial({ map: nameTex('—', '', '#c62828') });
  [[X - 15.9, 2.8, Z + 12, Math.PI / 2], [X + 15.9, 2.8, Z - 12, -Math.PI / 2], [X - 15.9, 2.8, Z - 25, Math.PI / 2], [X, 3.6, Z - 6, 0], [X, 3.6, Z - 6.01, Math.PI], [X + 15.9, 2.8, Z + 14, -Math.PI / 2]].forEach(([x, y, z, ry]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), boardMat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); boards.push(m);
  });
  function setBoards(k) {
    const line = LINE_OF[[...LINES_AT[k]][0]];
    boardMat.map?.dispose(); boardMat.map = nameTex(ST[k][0], ST[k][1], line.c); boardMat.needsUpdate = true;
    stripeMat.color.set(line.c);
  }
  inter.push({ pos: new V3(X - 13, 0, Z + 7.5), r: 3, label: () => '🎫 售票機：揀目的地買車飛', act: () => buy() });
  inter.push({ pos: new V3(X, 0, Z + 3.5), r: 4, label: () => ticket ? `🎫 入閘（去 ${ST[ticket.to][0]}）` : '🎫 入閘：揀目的地', act: () => ticket ? api.toast('✅ 已經入咗閘，行去月台上車') : buy() });
  inter.push({ pos: new V3(X, 0, Z + 15), r: 3, label: () => '🚪 出站（返上街）', act: () => exit() });
  inter.push({ pos: new V3(X + 4.8, 0, Z - 20), r: 4, label: () => ticket ? `🚇 上車：去 ${ST[ticket.to][0]}` : '🚇 上車（要先喺閘口揀目的地）', act: () => board() });
  inter.push({ pos: new V3(X + 13, 0, Z + 9), r: 3, label: () => '🙋 客務中心：問路', act: () => api.say('Hello! Welcome to the M T R. Where would you like to go today?', '你好！歡迎乘搭港鐵，今日想去邊度？', { force: true }) });

  // ===== 車廂（坐車時用）=====
  const C = new Batch(), CX = CAR.x, CZ = CAR.z;
  const c = (x0, y0, z0, x1, y1, z1, m, col = true) => C.box(CX + Math.min(x0, x1), y0, CZ + Math.min(z0, z1), CX + Math.max(x0, x1), y1, CZ + Math.max(z0, z1), m, col);
  c(-1.6, -0.3, -11, 1.6, 0, 11, std('#90a4ae'));
  c(-1.6, 2.4, -11, 1.6, 2.6, 11, std('#eceff1'));
  c(-1.8, 0, -11, -1.6, 2.4, 11, std('#eceff1')); c(1.6, 0, -11, 1.8, 2.4, 11, std('#eceff1')); c(-1.6, 0, -11.2, 1.6, 2.4, -11, std('#cfd8dc')); c(-1.6, 0, 11, 1.6, 2.4, 11.2, std('#cfd8dc'));
  for (const sx of [-1, 1]) for (let z = -9; z < 9; z += 6) { c(sx * 1.6 - sx * 0.5, 0, z, sx * 1.6, 0.45, z + 3.6, std('#c62828')); c(sx * 1.6 - sx * 0.1, 0.45, z, sx * 1.6, 1.0, z + 3.6, std('#c62828'), false); }
  for (let z = -10; z <= 10; z += 2.5) c(-0.04, 0, z, 0.04, 2.4, z + 0.08, steel, false);
  c(-1.5, 2.2, -11, -1.45, 2.25, 11, steel, false); c(1.45, 2.2, -11, 1.5, 2.25, 11, steel, false);
  for (let z = -10; z < 10; z += 5) c(-0.4, 2.38, z, 0.4, 2.4, z + 3, IM.light, false);
  const cg = C.build(); scene.add(cg);
  // 隧道窗（貼圖郁動）
  const tunTex = TX.canvasTex(512, 128, (g2, w, h) => { g2.fillStyle = '#20262b'; g2.fillRect(0, 0, w, h); g2.fillStyle = '#3a434b'; for (let x = 0; x < w; x += 64) g2.fillRect(x, 0, 8, h); g2.fillStyle = '#ffe9a8'; g2.fillRect(200, 52, 90, 10); g2.fillStyle = '#556'; g2.fillRect(0, 96, w, 6); });
  tunTex.wrapS = THREE.RepeatWrapping; tunTex.repeat.set(4, 1);
  const winMat = new THREE.MeshBasicMaterial({ map: tunTex });
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.9), winMat); w.position.set(CX + sx * 1.58, 1.55, CZ); w.rotation.y = -sx * Math.PI / 2; scene.add(w); }
  // 車廂顯示屏
  const ledC = document.createElement('canvas'); ledC.width = 1024; ledC.height = 128;
  const ledT = new THREE.CanvasTexture(ledC); ledT.colorSpace = THREE.SRGBColorSpace;
  const leds = [-6, 6].map(z => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.35), new THREE.MeshBasicMaterial({ map: ledT })); m.position.set(CX, 2.15, CZ + z); m.rotation.y = z < 0 ? 0 : Math.PI; scene.add(m); return m; });
  function led(text, color = '#ff9100') { const g2 = ledC.getContext('2d'); g2.fillStyle = '#111'; g2.fillRect(0, 0, 1024, 128); g2.fillStyle = color; g2.font = 'bold 64px sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(text, 512, 66); ledT.needsUpdate = true; }

  // ===== 狀態 =====
  let cur = null, ticket = null, ride = null;
  function enter(k) {
    if (api.busy()) return api.toast('要先落車 / 落機先入到地鐵站');
    cur = k; ticket = null; setBoards(k);
    const lines = [...LINES_AT[k]].map(id => LINE_OF[id]);
    api.sfx.door();
    api.blackout(() => {
      api.teleport(X, 0.05, Z + 13); api.face(Math.PI);
      api.toast(`🚇 ${ST[k][0]}站 ${ST[k][1]}（${lines.map(l => l.zh).join('、')}）\n去售票機 / 閘口揀目的地，再行落月台上車`, 4500);
      api.say(`Welcome to ${ST[k][1]} station. This station is on the ${lines.map(l => l.en).join(' and the ')}.`, `歡迎嚟到${ST[k][0]}站，呢個站有${lines.map(l => l.zh).join('同')}。`, { force: true });
    }, 800);
  }
  function exit() {
    const k = cur; const e = ENTR[k] || ENTR.CEN; ticket = null;
    api.sfx.door();
    api.blackout(() => { api.teleport(e.x + Math.sin(e.yaw) * 5, 0.1, e.z + Math.cos(e.yaw) * 5); api.face(e.yaw); api.loadCity(); api.toast(`🚶 出咗${ST[k][0]}站`); }, 700);
  }
  function buy() {
    if (!cur) return;
    const opts = [];
    LINES.forEach(l => {
      opts.push({ head: `${l.zh} ${l.en}` });
      const seen = new Set();
      l.r.forEach(r => r.forEach(k => { if (seen.has(k)) return; seen.add(k); opts.push({ label: `${ST[k][0]}`, sub: ST[k][1], on: k === cur, fn: () => pick(k) }); }));
    });
    api.choose(`🎫 由 ${ST[cur][0]} 去邊個站？`, opts, '撳一個站，會自動計路線（要唔要轉車）同車費', 120);
    api.say('Where would you like to go? Please choose a station.', '你想去邊度？請揀一個站。');
  }
  function pick(k) {
    if (k === cur) return api.toast('你已經喺呢個站喇');
    const legs = findRoute(cur, k); if (!legs) return api.toast('揾唔到路線');
    const fare = fareOf(legs);
    const changes = []; let prevL = null; legs.forEach(l => { if (l.line !== 'WALK' && prevL && l.line !== prevL) changes.push(`${ST[l.from][0]}轉${LINE_OF[l.line].zh}`); if (l.line !== 'WALK') prevL = l.line; });
    const n = legs.filter(l => l.line !== 'WALK').length;
    api.choose(`🎫 ${ST[cur][0]} → ${ST[k][0]}`, [
      { label: `💳 拍卡入閘（$${fare}）`, sub: `${n} 個站${changes.length ? '，' + changes.join('，') : '，唔使轉車'}`, fn: () => pay(k, legs, fare) },
      { label: '↩ 揀過第二個站', fn: () => buy() },
    ], `路線：${legs.map(l => l.line === 'WALK' ? '🚶 行路' : LINE_OF[l.line].zh).filter((v, i, a) => v !== a[i - 1]).join(' → ')}`);
  }
  function pay(k, legs, fare) {
    if (!api.pay(fare)) { api.sfx.error(); return api.toast(`💸 唔夠錢（車費 $${fare}），去銀行提錢先`, 3500); }
    ticket = { to: k, legs, fare }; api.sfx.beep();
    api.toast(`✅ 嘟！入咗閘（$${fare}）。行落月台，撳「🚇 上車」`, 3500);
    api.say(`Beep! Please go down to the platform. The train to ${ST[k][1]} is coming.`, `嘟！請落月台，往${ST[k][0]}嘅列車即將到站。`, { force: true });
  }
  function board() {
    if (!ticket) { api.toast('要先喺閘口 / 售票機揀目的地'); return buy(); }
    const legs = ticket.legs;
    // 每段：{ from, to, line }；中途站
    ride = { legs, i: 0, t: 0, dwell: 0, to: ticket.to, said: -1 };
    ticket = null; api.sfx.door();
    api.blackout(() => {
      api.teleport(CX, 0.05, CZ + 2); api.face(Math.PI);
      const l = LINE_OF[legs[0].line] || LINE_OF.TWL;
      api.say(`This is the ${l.en}. ${'Please mind the gap.'}`, `呢度係${l.zh}，請小心月台空隙。`, { force: true });
      announce();
    }, 700);
  }
  const SEG = 6.5, DWELL = 2.2;
  function announce() {
    const L = ride.legs[ride.i]; if (!L) return;
    const line = LINE_OF[L.line];
    if (L.line === 'WALK') { led(`🚶 行去 ${ST[L.to][0]} ${ST[L.to][1]}`, '#69f0ae'); api.say(`Please walk to ${ST[L.to][1]} station to change trains.`, `請行去${ST[L.to][0]}站轉車。`, { force: true }); return; }
    led(`下一站 ${ST[L.to][0]}  Next: ${ST[L.to][1]}`, line ? line.c : '#ff9100');
    api.say(`Next station, ${ST[L.to][1]}.`, `下一站：${ST[L.to][0]}`, { force: true, gap: 0 });
  }
  function step(dt) {
    if (!ride) return null;
    const R = ride;
    tunTex.offset.x += dt * (R.dwell > 0 ? 0 : 3.2);
    if (R.dwell > 0) { R.dwell -= dt; if (R.dwell <= 0) { R.i++; if (R.i >= R.legs.length) return arrive(); announce(); } return { i: R.i, n: R.legs.length }; }
    R.t += dt;
    if (R.t >= SEG) {
      R.t = 0; const L = R.legs[R.i], nx = R.legs[R.i + 1];
      if (nx) {
        const change = nx.line !== 'WALK' && L.line !== nx.line && L.line !== 'WALK';
        api.say(change ? `This is ${ST[L.to][1]}. Please change to the ${LINE_OF[nx.line].en}.` : `This is ${ST[L.to][1]}.`, change ? `${ST[L.to][0]}到喇，請轉乘${LINE_OF[nx.line].zh}。` : `${ST[L.to][0]}到喇。`, { force: true, gap: 0 });
        led(`${ST[L.to][0]} ${ST[L.to][1]}`, '#fff');
        if (change) api.toast(`🔁 ${ST[L.to][0]}站轉車：轉乘${LINE_OF[nx.line].zh}`, 3000);
        R.dwell = change ? DWELL + 1.5 : DWELL;
      } else return arrive();
    }
    return { i: R.i, n: R.legs.length };
  }
  function arrive() {
    const k = ride.to; ride = null; cur = k; setBoards(k);
    led(`${ST[k][0]} ${ST[k][1]}`, '#fff');
    api.say(`This is ${ST[k][1]}. Please mind the gap. Thank you for travelling with us!`, `${ST[k][0]}到喇，落車請小心月台空隙，多謝乘搭！`, { force: true, gap: 0 });
    api.sfx.ding();
    api.blackout(() => { api.teleport(X + 4, 0.05, Z - 14); api.face(0); api.toast(`🚇 到咗${ST[k][0]}站！行返上大堂，撳「🚪 出站」就返上街`, 4000); }, 700);
    return { done: true };
  }
  function skip() { if (!ride) return; const k = ride.to; ride.legs = [ride.legs[ride.legs.length - 1]]; ride.i = 0; ride.t = SEG; ride.dwell = 0; ride.to = k; }
  function cancel() { ride = null; ticket = null; }
  const insideStation = p => Math.abs(p.x - X) < 17 && p.z > Z - 45 && p.z < Z + 21 && p.y > -5 && p.y < 10;
  const insideCar = p => Math.abs(p.x - CX) < 2 && Math.abs(p.z - CZ) < 12 && p.y > -5 && p.y < 10;
  function update(dt, p) {
    const inS = insideStation(p), inC = insideCar(p);
    g.visible = boards[0].visible = inS || Math.abs(p.x - X) < 300; boards.forEach(m => m.visible = g.visible);
    cg.visible = inC || ride !== null || Math.abs(p.x - CX) < 300;
    eg.visible = Math.abs(p.x) < 5200;
    if (!inS && !inC && !ride && Math.abs(p.x) < 5200) updateSigns(p);
    if (ride && !inC) { api.teleport(CX, 0.05, CZ + 2); }
  }
  return {
    colliders: B.cols.concat(C.cols, EB.cols), interactables: inter, update, step, skip, cancel,
    riding: () => !!ride, inside: p => insideStation(p) || insideCar(p), label: () => cur ? `🚇 ${ST[cur][0]}站` : '🚇 地鐵站',
    rideInfo: () => ride && ride.legs[ride.i] ? ride.legs[ride.i] : null,
  };
}
