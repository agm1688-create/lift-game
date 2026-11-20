// 會員系統：會員帳戶、登入紀錄（時間 / 遊戲時間 / IP）、遊戲時間幣、金幣
// 有 DATABASE_URL（例如 Neon / Supabase 免費 Postgres）就存落資料庫；冇就存喺 data/accounts.json（本機測試用）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ADMIN_PW = process.env.ADMIN_PASSWORD || '8844';
const FILE = path.join(__dirname, 'data', 'accounts.json');
const MAX_SESSIONS = 3000;

let S = { settings: { minPerCoin: 10, goldPerQuiz: 1, goldPerTimeCoin: 10 }, members: [], sessions: [], nextId: 1, nextSid: 1 };
let pool = null, dirty = false;
const storage = () => (pool ? 'database' : 'file');

// ---------- 儲存 ----------
async function load() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
    await pool.query('CREATE TABLE IF NOT EXISTS lift_kv (k TEXT PRIMARY KEY, v JSONB NOT NULL)');
    const r = await pool.query("SELECT v FROM lift_kv WHERE k = 'accounts'");
    if (r.rows[0]) S = Object.assign(S, r.rows[0].v);
  } else if (fs.existsSync(FILE)) {
    try { S = Object.assign(S, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { console.error('accounts.json 讀唔到', e); }
  }
  S.settings = Object.assign({ minPerCoin: 10, goldPerQuiz: 1, goldPerTimeCoin: 10 }, S.settings);
  console.log(`會員系統：${S.members.length} 個會員（儲存：${storage()}）`);
}
async function flush() {
  if (!dirty) return; dirty = false;
  const json = JSON.stringify(S);
  try {
    if (pool) await pool.query("INSERT INTO lift_kv (k, v) VALUES ('accounts', $1) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v", [json]);
    else { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, json); }
  } catch (e) { dirty = true; console.error('儲存會員資料失敗', e.message); }
}
const touch = () => { dirty = true; };
setInterval(flush, 3000);

// ---------- 工具 ----------
const hashPin = (pin, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(String(pin), salt, 24).toString('hex');
const pinOK = (pin, h) => { if (!h) return false; const [salt] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(hashPin(pin, salt)), Buffer.from(h)); };
const coinSec = () => Math.max(1, Number(S.settings.minPerCoin) || 10) * 60;
const timeLeft = m => Math.max(0, Math.round((m.creditSec || 0) + (m.timeCoins || 0) * coinSec()));
const byId = id => S.members.find(m => m.id === id);
const byName = name => S.members.find(m => m.name.toLowerCase() === String(name).trim().toLowerCase());
const acct = m => ({ name: m.name, timeCoins: m.timeCoins, gold: m.gold, timeLeft: timeLeft(m), minPerCoin: S.settings.minPerCoin, goldPerTimeCoin: S.settings.goldPerTimeCoin });

// 登入失敗太多次就暫停（每個 IP）
const fails = new Map();
const blocked = ip => { const f = fails.get(ip); return f && f.n >= 6 && Date.now() - f.t < 60000; };
const fail = ip => { const f = fails.get(ip) || { n: 0, t: 0 }; if (Date.now() - f.t > 60000) f.n = 0; f.n++; f.t = Date.now(); fails.set(ip, f); };

// ---------- 遊戲登入 ----------
function login(name, pin, ip) {
  if (blocked(ip)) return { ok: false, err: '試錯太多次，請等 1 分鐘再試' };
  pin = String(pin || '');
  if (pin === ADMIN_PW) return { ok: true, role: 'admin' };
  const m = byName(name || '');
  if (!m || !pinOK(pin, m.pin)) { fail(ip); return { ok: false, err: '冇呢個會員，或者密碼唔啱' }; }
  if (!m.token) { m.token = crypto.randomBytes(16).toString('hex'); touch(); }
  return { ok: true, role: 'member', token: m.token, acct: acct(m) };
}
const byToken = t => t && S.members.find(m => m.token === t);

// ---------- 遊戲中：開始 / 心跳 / 結束 ----------
function startSession(token, ip) {
  const m = byToken(token); if (!m) return null;
  const now = Date.now();
  const s = { id: S.nextSid++, mid: m.id, name: m.name, ip, start: now, end: now, sec: 0 };
  S.sessions.push(s); if (S.sessions.length > MAX_SESSIONS) S.sessions.splice(0, S.sessions.length - MAX_SESSIONS);
  m.lastLogin = now; m.lastIp = ip; touch();
  return { m, s };
}
// 玩咗 sec 秒：扣時間（用完一個時間幣就開下一個），返回 acct；冇時間就 timeup
function tick(link, sec) {
  const { m, s } = link; if (!byId(m.id)) return { gone: true };
  if (timeLeft(m) <= 0) return { acct: acct(m), timeup: true };
  m.creditSec = (m.creditSec || 0) - sec;
  while (m.creditSec <= 0 && (m.timeCoins || 0) > 0) { m.timeCoins--; m.creditSec += coinSec(); }
  if (m.creditSec < 0) m.creditSec = 0;
  m.totalSec = (m.totalSec || 0) + sec; s.sec += sec; s.end = Date.now(); touch();
  return { acct: acct(m), timeup: timeLeft(m) <= 0 };
}
function endSession(link) { if (!link) return; link.s.end = Date.now(); touch(); }
function quizOK(link) { const m = link && byId(link.m.id); if (!m) return null; m.gold = (m.gold || 0) + (Number(S.settings.goldPerQuiz) || 0); touch(); return acct(m); }
function exchange(link) {
  const m = link && byId(link.m.id); if (!m) return { err: '冇帳戶' };
  const cost = Number(S.settings.goldPerTimeCoin) || 0;
  if (cost <= 0) return { err: '管理員未開放金幣換時間幣' };
  if ((m.gold || 0) < cost) return { err: `唔夠金幣（要 ${cost} 個）` };
  m.gold -= cost; m.timeCoins = (m.timeCoins || 0) + 1; touch();
  return { acct: acct(m) };
}
const acctOf = link => { const m = link && byId(link.m.id); return m ? acct(m) : null; };

// ---------- 管理員 ----------
const adminTokens = new Map();   // token -> 到期時間
function adminLogin(pw, ip) {
  if (blocked(ip)) return { ok: false, err: '試錯太多次，請等 1 分鐘再試' };
  if (String(pw) !== ADMIN_PW) { fail(ip); return { ok: false, err: '管理員密碼唔啱' }; }
  const t = crypto.randomBytes(18).toString('hex'); adminTokens.set(t, Date.now() + 12 * 3600e3);
  return { ok: true, token: t };
}
const isAdmin = t => { const e = adminTokens.get(t); return !!e && e > Date.now(); };
function adminState(onlineIds) {
  return {
    storage: storage(), settings: S.settings, now: Date.now(),
    members: S.members.map(m => ({ id: m.id, name: m.name, timeCoins: m.timeCoins || 0, gold: m.gold || 0, timeLeft: timeLeft(m), totalSec: m.totalSec || 0, lastLogin: m.lastLogin || 0, lastIp: m.lastIp || '', created: m.created, online: onlineIds.has(m.id) })),
    sessions: S.sessions.slice(-400).reverse(),
  };
}
function adminAction(a) {
  const num = v => Math.round(Number(v) || 0);
  const pinRule = p => /^\d{4,8}$/.test(String(p)) && String(p) !== ADMIN_PW;
  if (a.op === 'create') {
    const name = String(a.name || '').trim().slice(0, 16);
    if (!name) return { err: '要有會員名' };
    if (byName(name)) return { err: '已經有同名會員' };
    if (!pinRule(a.pin)) return { err: '密碼要 4–8 個數字（唔可以同管理員密碼一樣）' };
    S.members.push({ id: S.nextId++, name, pin: hashPin(a.pin), timeCoins: Math.max(0, num(a.timeCoins)), creditSec: 0, gold: Math.max(0, num(a.gold)), totalSec: 0, created: Date.now() });
    touch(); return { ok: true };
  }
  if (a.op === 'settings') {
    const s = S.settings;
    s.minPerCoin = Math.min(600, Math.max(1, num(a.minPerCoin) || s.minPerCoin));
    s.goldPerQuiz = Math.min(1000, Math.max(0, num(a.goldPerQuiz)));
    s.goldPerTimeCoin = Math.min(100000, Math.max(0, num(a.goldPerTimeCoin)));
    touch(); return { ok: true };
  }
  const m = byId(Number(a.id)); if (!m) return { err: '搵唔到會員' };
  if (a.op === 'coins') { m.timeCoins = Math.max(0, (m.timeCoins || 0) + num(a.n)); }
  else if (a.op === 'gold') m.gold = Math.max(0, (m.gold || 0) + num(a.n));
  else if (a.op === 'pin') { if (!pinRule(a.pin)) return { err: '密碼要 4–8 個數字（唔可以同管理員密碼一樣）' }; m.pin = hashPin(a.pin); m.token = null; }
  else if (a.op === 'delete') S.members = S.members.filter(x => x !== m);
  else return { err: '唔識呢個動作' };
  touch(); return { ok: true, changed: m.id };
}

module.exports = { load, flush, login, byToken, startSession, tick, endSession, quizOK, exchange, acctOf, adminLogin, isAdmin, adminState, adminAction };
