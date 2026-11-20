// 會員系統：會員帳戶、登入紀錄（時間 / 遊戲時間 / IP）、遊戲時間幣、金幣
// 有 DATABASE_URL（例如 Neon / Supabase 免費 Postgres）就存落資料庫；冇就存喺 data/accounts.json（本機測試用）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ADMIN_PW = process.env.ADMIN_PASSWORD || '8844';
const FILE = path.join(__dirname, 'data', 'accounts.json');
const MAX_SESSIONS = 3000;

const DEF = { minPerCoin: 10, goldPerQuiz: 1, goldPerTimeCoin: 10, applyCoins: 3, applyOpen: 1 };
let S = { settings: { ...DEF }, members: [], sessions: [], apps: [], nextId: 1, nextSid: 1, nextAid: 1 };
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
  S.settings = Object.assign({ ...DEF }, S.settings); S.apps = S.apps || []; S.nextAid = S.nextAid || 1; S.helps = S.helps || []; S.nextHid = S.nextHid || 1;
  if (S.apps.length) dirty = true;
  for (const a of S.apps.splice(0)) if (!byName(a.name)) S.members.push({ id: S.nextId++, name: a.name, pin: a.pin, timeCoins: Number(S.settings.applyCoins) || 0, creditSec: 0, gold: 0, totalSec: 0, created: Date.now(), lastIp: a.ip });
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

// 會員名：中文、英文字母、數字，最多 10 個字
const NAME_RE = /^[㐀-鿿A-Za-z0-9]{1,10}$/;
const nameOK = n => NAME_RE.test(n);
const NAME_ERR = '會員名只可以用中文、英文字母同數字，最多 10 個字';

// ---------- 申請做會員 ----------
function apply(name, pin, ip) {
  name = String(name || '').trim(); pin = String(pin || '');
  if (!Number(S.settings.applyOpen)) return { ok: false, err: '暫時唔接受申請，請直接搵管理員' };
  if (!nameOK(name)) return { ok: false, err: NAME_ERR };
  if (!/^\d{4}$/.test(pin)) return { ok: false, err: '密碼要啱啱好 4 個數字' };
  if (pin === ADMIN_PW) return { ok: false, err: '呢個密碼唔用得，請揀過第二個' };
  if (byName(name)) return { ok: false, err: '呢個會員名已經有人用咗' };
  if (S.apps.some(a => a.name.toLowerCase() === name.toLowerCase())) return { ok: false, err: '呢個會員名已經有人用咗' };
  // 防亂開：同一個 IP 24 小時內最多開 5 個帳戶
  const day = Date.now() - 864e5;
  if (S.members.filter(m => m.createdIp === ip && m.created > day).length >= 5) return { ok: false, err: '今日呢度開咗好多個帳戶，聽日再試或者搵管理員' };
  // 唔使批：即刻開帳戶，送時間幣，可以即刻玩
  const m = { id: S.nextId++, name, pin: hashPin(pin), timeCoins: Number(S.settings.applyCoins) || 0, creditSec: 0, gold: 0, totalSec: 0, created: Date.now(), createdIp: ip, token: crypto.randomBytes(16).toString('hex') };
  S.members.push(m); touch();
  return { ok: true, role: 'member', name: m.name, token: m.token, acct: acct(m) };
}

// ---------- 遊戲登入 ----------
function login(name, pin, ip) {
  if (blocked(ip)) return { ok: false, err: '試錯太多次，請等 1 分鐘再試' };
  pin = String(pin || '');
  if (pin === ADMIN_PW) return { ok: true, role: 'admin' };
  const m = byName(name || '');
  if (!m) { const a = S.apps.find(x => x.name.toLowerCase() === String(name || '').trim().toLowerCase()); if (a) return { ok: false, err: '你嘅申請仲未批准，請等管理員' }; }
  if (!m || !pinOK(pin, m.pin)) { fail(ip); return { ok: false, err: '冇呢個會員，或者密碼唔啱' }; }
  if (!m.token) { m.token = crypto.randomBytes(16).toString('hex'); touch(); }
  return { ok: true, role: 'member', token: m.token, acct: acct(m) };
}
const byToken = t => t && S.members.find(m => m.token === t);
// 記住呢部機：用通行證直接登入
function resume(token, ip) {
  if (blocked(ip)) return { ok: false, err: '試錯太多次，請等 1 分鐘再試' };
  const m = byToken(String(token || ''));
  if (!m) { fail(ip); return { ok: false, err: '要再輸入一次密碼' }; }
  return { ok: true, role: 'member', name: m.name, token: m.token, acct: acct(m) };
}
// 忘記密碼：通知管理員
function forgot(name, ip) {
  name = String(name || '').trim().slice(0, 16);
  if (!name) return { ok: false, err: '先填會員名' };
  if (S.helps.filter(h => h.ip === ip).length >= 5 || S.helps.length >= 100) return { ok: false, err: '求助太多，請直接搵管理員' };
  const m = byName(name);
  if (!S.helps.some(h => h.name.toLowerCase() === name.toLowerCase())) { S.helps.push({ id: S.nextHid++, name, mid: m ? m.id : 0, ip, at: Date.now() }); touch(); }
  return { ok: true };
}

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
    apps: S.apps.map(a => ({ id: a.id, name: a.name, ip: a.ip, at: a.at })),
    helps: S.helps.map(h => ({ id: h.id, name: h.name, mid: byId(h.mid) ? h.mid : 0, ip: h.ip, at: h.at })),
  };
}
function adminAction(a) {
  const num = v => Math.round(Number(v) || 0);
  const pinRule = p => /^\d{4,8}$/.test(String(p)) && String(p) !== ADMIN_PW;
  if (a.op === 'create') {
    const name = String(a.name || '').trim();
    if (!nameOK(name)) return { err: NAME_ERR };
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
    if (a.applyCoins != null) s.applyCoins = Math.min(1000, Math.max(0, num(a.applyCoins)));
    if (a.applyOpen != null) s.applyOpen = a.applyOpen ? 1 : 0;
    touch(); return { ok: true };
  }
  if (a.op === 'helpDone') { S.helps = S.helps.filter(h => h.id !== Number(a.id)); touch(); return { ok: true }; }
  if (a.op === 'approve' || a.op === 'reject') {
    const ap = S.apps.find(x => x.id === Number(a.id)); if (!ap) return { err: '搵唔到呢個申請' };
    S.apps = S.apps.filter(x => x !== ap);
    if (a.op === 'approve') {
      if (byName(ap.name)) { touch(); return { err: '已經有同名會員，申請已刪除' }; }
      S.members.push({ id: S.nextId++, name: ap.name, pin: ap.pin, timeCoins: Number(S.settings.applyCoins) || 0, creditSec: 0, gold: 0, totalSec: 0, created: Date.now(), lastIp: ap.ip });
    }
    touch(); return { ok: true };
  }
  const m = byId(Number(a.id)); if (!m) return { err: '搵唔到會員' };
  if (a.op === 'coins') { m.timeCoins = Math.max(0, (m.timeCoins || 0) + num(a.n)); }
  else if (a.op === 'gold') m.gold = Math.max(0, (m.gold || 0) + num(a.n));
  else if (a.op === 'pin') { if (!pinRule(a.pin)) return { err: '密碼要 4–8 個數字（唔可以同管理員密碼一樣）' }; m.pin = hashPin(a.pin); m.token = null; S.helps = S.helps.filter(h => h.mid !== m.id); }
  else if (a.op === 'logoutAll') m.token = null;
  else if (a.op === 'delete') S.members = S.members.filter(x => x !== m);
  else return { err: '唔識呢個動作' };
  touch(); return { ok: true, changed: m.id };
}

module.exports = { load, flush, apply, login, resume, forgot, byToken, startSession, tick, endSession, quizOK, exchange, acctOf, adminLogin, isAdmin, adminState, adminAction };
