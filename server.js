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
  const snap = {};
  for (const [id, p] of players) if (p.st) snap[id] = p.st;
  broadcast({ t: 'snap', p: snap });
}, 100);

server.listen(PORT, () => console.log(`搭Lift遊戲 running: http://localhost:${PORT}`));
