// 搭 Lift 遊戲 — 多人伺服器
// 靜態檔案 + WebSocket（位置同步、電梯狀態、事件、語音信令）
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

// ---------- 世界狀態 ----------
const MAX_FLOOR = 10000;
// 0、1 = 大廈 Lift（1–10000 樓）；2、3 = 柏熙酒店 Lift（1–20 樓）
const lifts = [0, 1, 2, 3].map(id => ({ id, from: 1, to: 1, t0: 0, dur: 0, doorStart: 0, doorEnd: 0, emerg: false, hotel: id >= 2 }));
const world = { toiletLight: false };
const players = new Map(); // id -> {ws, name, look, st}
let nextId = 1;

function travelTime(a, b, hotel) { return hotel ? (2 + 0.9 * Math.abs(a - b)) * 1000 : (3 + 7 * Math.log10(Math.abs(a - b) + 1)) * 1000; }
function arrival(L) { return L.t0 + L.dur; }
function moving(L, now) { return now < arrival(L); }

function liftCmd(L, m, now) {
  const busy = moving(L, now);
  switch (m.cmd) {
    case 'open': {
      if (busy) { L.pendingOpen = true; break; }
      const start = Math.max(now, arrival(L));
      if (now < L.doorEnd && now >= L.doorStart) L.doorEnd = Math.max(L.doorEnd, now + 7000);
      else { L.doorStart = start; L.doorEnd = start + 8000; }
      break;
    }
    case 'close':
      if (now < L.doorEnd && now >= L.doorStart) L.doorEnd = Math.max(now + 1000, L.doorStart + 1000);
      break;
    case 'goto':
    case 'call': {
      let f = m.cmd === 'call' && !L.hotel ? 1 : Math.round(Number(m.floor));
      if (!(L.hotel ? f >= 1 && f <= 20 : f >= 0 && f <= MAX_FLOOR) || busy) break;
      let depart = now;
      if (now < L.doorEnd) { L.doorEnd = Math.max(now + 1000, L.doorStart + 1000); depart = L.doorEnd; }
      if (f === L.to) { if (m.cmd === 'call') liftCmd(L, { cmd: 'open' }, now); break; }
      L.from = L.to; L.to = f; L.t0 = depart; L.dur = travelTime(L.from, f, L.hotel);
      if (m.cmd === 'call' || L.hotel) { L.doorStart = arrival(L) + 300; L.doorEnd = L.doorStart + 8000; }
      break;
    }
    case 'emerg': L.emerg = !L.emerg; break;
  }
}

// ---------- 怪獸（打怪獸場，所有玩家打同一隻）----------
const STAGE = { x0: -2050, x1: -1400, z0: -450, z1: 250 };
const KAIJU = [{ hp: 1200, sp: 7 }, { hp: 1500, sp: 6 }, { hp: 1800, sp: 8 }];
const mon = { ty: 0, hp: 1200, mx: 1200, x: -1725, z: -100, r: 0, s: 'idle', t0: Date.now(), cdS: 0, cdB: 0, tgt: 0, respawn: 0, wx: -1725, wz: -100 };
const inStage = p => p && p[0] > STAGE.x0 && p[0] < STAGE.x1 && p[2] > STAGE.z0 && p[2] < STAGE.z1;
function monTick(now, dt) {
  const set = (s) => { mon.s = s; mon.t0 = now; };
  if (mon.s === 'dead') { if (now > mon.respawn) { mon.ty = (mon.ty + 1) % 3; mon.mx = mon.hp = KAIJU[mon.ty].hp; mon.x = -1725; mon.z = -100; set('roar'); broadcast({ t: 'ev', kind: 'kSpawn', ty: mon.ty }); } return; }
  if ((mon.s === 'roar' && now - mon.t0 < 3000) || (mon.s === 'swipe' && now - mon.t0 < 1600) || (mon.s === 'beam' && now - mon.t0 < 2600)) return;
  // 搵最近嘅機甲
  let best = null, bd = 1e9;
  for (const [id, p] of players) { const st = p.st; if (!st || !st.mk || !inStage(st.p)) continue; const d = Math.hypot(st.p[0] - mon.x, st.p[2] - mon.z); if (d < bd) { bd = d; best = { id, st }; } }
  let tx, tz;
  if (best) { tx = best.st.p[0]; tz = best.st.p[2]; mon.tgt = best.id; }
  else { if (Math.hypot(mon.wx - mon.x, mon.wz - mon.z) < 10) { mon.wx = STAGE.x0 + 120 + Math.random() * 420; mon.wz = STAGE.z0 + 120 + Math.random() * 460; } tx = mon.wx; tz = mon.wz; mon.tgt = 0; }
  const dx = tx - mon.x, dz = tz - mon.z, d = Math.hypot(dx, dz);
  mon.r = Math.atan2(dx, dz);
  if (best && d < 48 && now > mon.cdS) { set('swipe'); mon.cdS = now + 3500; broadcast({ t: 'ev', kind: 'kAtk', a: 'swipe', to: best.id, dmg: 18 }); return; }
  if (best && d > 60 && d < 170 && now > mon.cdB) { set('beam'); mon.cdB = now + 8000; broadcast({ t: 'ev', kind: 'kAtk', a: 'beam', to: best.id, dmg: 30 }); return; }
  const stop = best ? 40 : 2;
  if (d > stop) { const sp = (best ? KAIJU[mon.ty].sp : 3) * dt; mon.x += dx / d * Math.min(sp, d - stop); mon.z += dz / d * Math.min(sp, d - stop); if (mon.s !== 'walk') set('walk'); }
  else if (mon.s !== 'idle') set('idle');
}

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function broadcast(obj, except) {
  const s = JSON.stringify(obj);
  for (const [id, p] of players) if (id !== except && p.ws.readyState === 1) p.ws.send(s);
}
function broadcastLifts() { broadcast({ t: 'lifts', lifts, now: Date.now() }); }

wss.on('connection', ws => {
  const id = nextId++;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const now = Date.now();
    const me = players.get(id);
    switch (m.t) {
      case 'hello': {
        const name = String(m.name || '玩家').slice(0, 16);
        const look = m.look || {};
        players.set(id, { ws, name, look, st: null });
        send(ws, {
          t: 'welcome', id, now, lifts, world,
          players: [...players].filter(([pid]) => pid !== id).map(([pid, p]) => ({ id: pid, name: p.name, look: p.look })),
        });
        broadcast({ t: 'join', id, name, look }, id);
        break;
      }
      case 'st': if (me) me.st = m.s; break;
      case 'ping': send(ws, { t: 'pong', c: m.c, now }); break;
      case 'lift': {
        const L = lifts[m.id]; if (!L || !me) break;
        liftCmd(L, m, now); broadcastLifts(); break;
      }
      case 'ev': if (me) broadcast({ t: 'ev', from: id, kind: String(m.kind), lift: m.lift, pos: m.pos }); break;
      case 'world': if (me && typeof m.toiletLight === 'boolean') { world.toiletLight = m.toiletLight; broadcast({ t: 'world', world }); } break;
      case 'khit': {
        const st = me && me.st, dmg = Math.min(150, Math.max(0, Number(m.dmg) || 0));
        if (!st || !st.mk || mon.s === 'dead' || Math.hypot(st.p[0] - mon.x, st.p[2] - mon.z) > 320) break;
        mon.hp = Math.max(0, mon.hp - dmg);
        if (mon.hp <= 0) { mon.s = 'dead'; mon.t0 = now; mon.respawn = now + 12000; broadcast({ t: 'ev', kind: 'kDead', by: me.name, ty: mon.ty }); }
        break;
      }
      case 'rtc': { const to = players.get(m.to); if (to && me) send(to.ws, { t: 'rtc', from: id, data: m.data }); break; }
    }
  });
  ws.on('close', () => { if (players.delete(id)) broadcast({ t: 'leave', id }); });
});

// 位置快照 10Hz；電梯 pendingOpen 處理
setInterval(() => {
  const now = Date.now();
  for (const L of lifts) if (L.pendingOpen && !moving(L, now)) { L.pendingOpen = false; liftCmd(L, { cmd: 'open' }, now); broadcastLifts(); }
  if (!players.size) return;
  monTick(now, 0.1);
  const snap = {};
  for (const [id, p] of players) if (p.st) snap[id] = p.st;
  broadcast({ t: 'snap', p: snap, m: { ty: mon.ty, hp: mon.hp, mx: mon.mx, x: +mon.x.toFixed(1), z: +mon.z.toFixed(1), r: +mon.r.toFixed(2), s: mon.s, t0: mon.t0, tg: mon.tgt } });
}, 100);

server.listen(PORT, () => console.log(`搭Lift遊戲 running: http://localhost:${PORT}`));
