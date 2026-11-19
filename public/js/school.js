// 上課時間：每玩 10 分鐘，自動傳送去學校課室上數學堂（香港小學二年級：兩位數加數 / 減數）
// 答啱 2 條就可以返去上一刻嘅位置；唔揀 / 唔答，就要等 20 分鐘先返得去玩
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign, exhaustFan } from './interiors.js';
import { buildAvatar } from './avatar.js';
import { numWords } from './english.js';

export const CLASSROOM = { x: 6600, z: 300 };
export const PLAY_SEC = 10 * 60, WAIT_SEC = 20 * 60, NEED = 2;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...e });
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// 小二程度：兩位數 ± 兩位數，答案喺 100 以內，有進位 / 退位
export function makeQuestion(op) {
  if (op === '+') {
    let a, b;
    do { a = R(10, 89); b = R(10, 89); } while (a + b > 99 || (Math.random() < 0.6 && (a % 10) + (b % 10) < 10));
    return { a, b, op: '+', ans: a + b };
  }
  let a, b;
  do { a = R(20, 99); b = R(10, 89); } while (b >= a || (Math.random() < 0.6 && (a % 10) >= (b % 10)));
  return { a, b, op: '−', ans: a - b };
}

const CSS = `
#schoolModal { position:fixed; inset:0; z-index:60; background:rgba(10,20,40,.72); display:flex; align-items:center; justify-content:center; padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom)); }
#schoolModal .sbox { background:#1f3d2b; border:6px solid #8d6e63; border-radius:16px; color:#fff; width:min(560px,96vw); max-height:96dvh; overflow-y:auto; padding:14px 16px; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,.5); font-family:system-ui,sans-serif; }
#schoolModal h2 { margin:0 0 4px; color:#ffd864; font-size:24px; }
#schoolModal .sub { font-size:15px; opacity:.9; margin-bottom:8px; }
#schoolModal .wait { font-size:15px; background:rgba(0,0,0,.3); border-radius:10px; padding:6px; margin:6px 0; }
#schoolModal .wait b { color:#ffb74d; font-size:18px; }
#schoolModal .pick { display:flex; gap:10px; justify-content:center; margin:10px 0; }
#schoolModal .pick button { flex:1; max-width:220px; padding:16px 10px; border-radius:14px; font-size:24px; font-weight:bold; color:#2a1a00; background:linear-gradient(#ffe082,#ffb300); border:0; cursor:pointer; }
#schoolModal .pick button.sub2 { background:linear-gradient(#90caf9,#42a5f5); color:#0d2440; }
#schoolModal .q { font-family:'Courier New',monospace; font-size:40px; font-weight:bold; line-height:1.15; display:inline-block; text-align:right; margin:6px 0; letter-spacing:4px; }
#schoolModal .q .line { border-top:4px solid #fff; margin-top:4px; padding-top:2px; min-height:46px; color:#ffd864; }
#schoolModal .prog { font-size:16px; margin:4px 0; }
#schoolModal .msg { min-height:24px; font-size:17px; font-weight:bold; }
#schoolModal .pad { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; max-width:420px; margin:8px auto 0; }
#schoolModal .pad button { padding:12px 0; font-size:22px; font-weight:bold; border-radius:10px; border:0; background:#f5f0e1; color:#222; cursor:pointer; }
#schoolModal .pad button.ok { grid-column:span 2; background:#43a047; color:#fff; }
#schoolModal .pad button.del { background:#ef9a9a; }
#schoolModal .pad button:active { transform:scale(.95); }
#schoolHint { position:absolute; left:calc(10px + env(safe-area-inset-left)); bottom:calc(150px + env(safe-area-inset-bottom)); background:rgba(0,0,0,.45); color:#fff; font-size:12px; padding:3px 8px; border-radius:8px; pointer-events:none; }
@media (max-height:500px) { #schoolModal .sbox { padding:8px 12px; } #schoolModal h2 { font-size:19px; } #schoolModal .q { font-size:28px; } #schoolModal .q .line { min-height:32px; } #schoolModal .pad button { padding:7px 0; font-size:18px; } #schoolModal .pick button { padding:10px; font-size:20px; } }
`;

export function buildSchool(scene, api) {
  // ===== 課室（地圖以外嘅獨立房間）=====
  const B = new Batch();
  const X = CLASSROOM.x, Z = CLASSROOM.z, W = 7, D = 6, H = 3.3;
  const b = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + Math.min(x0, x1), y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), y1, Z + Math.max(z0, z1), m, col);
  const wall = std('#f3e9d2'), wood = IM.wood, blue = std('#1e88e5'), green = std('#1f3d2b', { roughness: 0.9 });
  b(-W - 1, -0.3, -D - 1, W + 1, 0, D + 1, std('#c8a46e'));
  b(-W, 0, -D - 0.2, W, H, -D, wall); b(-W, 0, D, W, H, D + 0.2, wall); b(-W - 0.2, 0, -D, -W, H, D, wall); b(W, 0, -D, W + 0.2, H, D, wall);
  b(-W, H, -D, W, H + 0.2, D, std('#f6f6f4'));
  for (let x = -W + 2; x < W; x += 4) for (let z = -D + 2; z < D; z += 4) b(x - 0.7, H - 0.03, z - 0.2, x + 0.7, H, z + 0.2, IM.light, false);
  // 黑板 + 窗
  b(-3.5, 0.9, -D, 3.5, 2.6, -D + 0.06, green, false);
  b(-3.6, 0.85, -D, 3.6, 0.9, -D + 0.15, wood, false);
  for (let z = -D + 1.5; z < D - 1; z += 2.6) b(W - 0.04, 1.0, z, W, 2.4, z + 1.8, IM.glass, false);
  sign(B, X - W + 0.05, 2.4, Z, 4.5, 0.6, signMat('📚 2A 班 數學堂', '#c0392b'), '+x');
  sign(B, X - W + 0.05, 1.6, Z, 4.5, 0.5, signMat('答啱 2 條就可以落堂 ✏️', '#1565c0'), '+x');
  // 老師枱 + 學生枱
  b(1.6, 0, -D + 1.2, 3.4, 0.78, -D + 2.0, wood);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const x = -4.8 + c * 2.4, z = -2.2 + r * 2.0;
    b(x - 0.4, 0.7, z - 0.3, x + 0.4, 0.74, z + 0.3, wood, false); b(x - 0.38, 0, z - 0.02, x + 0.38, 0.7, z + 0.02, std('#9e9e9e'), false);
    b(x - 0.2, 0.42, z + 0.45, x + 0.2, 0.46, z + 0.85, blue, false); b(x - 0.2, 0.46, z + 0.8, x + 0.2, 0.9, z + 0.85, blue, false);
    B.cols.push({ min: [X + x - 0.4, 0, Z + z - 0.3], max: [X + x + 0.4, 0.74, Z + z + 0.3] });
  }
  exhaustFan(B, X + 5, 2.5, Z + D - 0.02, '-z');
  const g = B.build(); scene.add(g);
  const teacher = buildAvatar({ gender: 'f', skin: '#f1c27d', hat: 'none', shirt: '#8e24aa', pants: '#37474f', hair: '#4e2a12' });
  teacher.position.set(X + 2.5, 0, Z - D + 2.6); scene.add(teacher);
  // 黑板上嘅題目（動態）
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 256;
  const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.6), new THREE.MeshBasicMaterial({ map: btex })); board.position.set(X, 1.75, Z - D + 0.07); scene.add(board);
  function drawBoard(text) { const c = bc.getContext('2d'); c.fillStyle = '#1f3d2b'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#f5f5f5'; c.font = 'bold 96px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 512, 132); btex.needsUpdate = true; }
  drawBoard('上課啦！');

  // ===== 介面 =====
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const modal = document.createElement('div'); modal.id = 'schoolModal'; modal.style.display = 'none'; document.body.appendChild(modal);
  const hint = document.createElement('div'); hint.id = 'schoolHint'; document.getElementById('hud').appendChild(hint);

  // 狀態（存喺瀏覽器，重新整理都唔可以走堂）
  const S = Object.assign({ played: 0, lesson: null }, api.store.get('school', {}));
  // lesson = { start(ms), back:[x,y,z], op, correct, q }
  const save = () => api.store.set('school', S);
  let saveT = 0, warned = false, input = '';
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const left = () => Math.max(0, WAIT_SEC - (Date.now() - S.lesson.start) / 1000);

  function render(msg = '', ok = null) {
    const L = S.lesson; if (!L) { modal.style.display = 'none'; return; }
    modal.style.display = 'flex';
    const wait = `<div class="wait">⏳ 唔揀 / 唔答都得，但要等 <b id="schWait">${fmt(left())}</b> 先可以返去玩</div>`;
    if (!L.op) {
      modal.innerHTML = `<div class="sbox"><h2>🔔 上課時間！</h2><div class="sub">你玩咗 10 分鐘，老師叫你返學校上數學堂。<br>揀一樣做，答啱 <b>${NEED} 條</b>就可以即刻返去頭先嘅位置繼續玩！</div>
        <div class="pick"><button data-op="+">➕ 加數</button><button data-op="-" class="sub2">➖ 減數</button></div>${wait}</div>`;
      modal.querySelectorAll('[data-op]').forEach(btn => btn.onclick = () => { api.sfx.click(); L.op = btn.dataset.op; L.q = makeQuestion(L.op); input = ''; save(); drawBoard(`${L.q.a} ${L.q.op} ${L.q.b} = ?`); render(); askQ(L.q); });
      return;
    }
    const q = L.q;
    modal.innerHTML = `<div class="sbox"><h2>${L.op === '+' ? '➕ 加數' : '➖ 減數'}（小二）</h2>
      <div class="prog">答啱咗 <b>${L.correct} / ${NEED}</b> 條 ${'⭐'.repeat(L.correct)}</div>
      <div class="q"><div>${q.a}</div><div>${q.op} ${q.b}</div><div class="line">${input || '&nbsp;'}</div></div>
      <div class="msg" style="color:${ok === false ? '#ff8a80' : '#b9f6ca'}">${msg}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button class="del" data-n="del">⌫</button><button data-n="clr">C</button><button class="ok" data-n="ok">✔ 交答案</button></div>
      <div style="font-size:13px;margin-top:6px"><button data-n="switch" style="background:none;border:1px solid #fff8;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer">🔄 轉做${L.op === '+' ? '減數' : '加數'}</button></div>
      ${wait}</div>`;
    modal.querySelectorAll('[data-n]').forEach(btn => btn.onclick = () => key(btn.dataset.n));
  }
  const qEn = q => `What is ${numWords(q.a)} ${q.op === '+' ? 'plus' : 'minus'} ${numWords(q.b)}?`;
  const askQ = q => api.say?.(qEn(q), `${q.a} ${q.op} ${q.b} 等於幾多？`, { force: true });
  function key(k) {
    const L = S.lesson; if (!L || !L.q) return;
    api.sfx.click();
    if (/^\d$/.test(k)) { if (input.length < 3) input = (input + k).replace(/^0(\d)/, '$1'); return render(); }
    if (k === 'del') { input = input.slice(0, -1); return render(); }
    if (k === 'clr') { input = ''; return render(); }
    if (k === 'switch') { L.op = L.op === '+' ? '-' : '+'; L.q = makeQuestion(L.op); input = ''; save(); drawBoard(`${L.q.a} ${L.q.op} ${L.q.b} = ?`); return render(); }
    if (k === 'ok') {
      if (input === '') return render('先輸入答案啦 ✏️', false);
      const q = L.q;
      if (+input === q.ans) {
        L.correct++; api.sfx.pickup();
        if (L.correct >= NEED) { save(); api.say?.('Excellent! You got them all right. Class is over. Goodbye!', '好叻！全部答啱，落堂喇，拜拜！', { force: true }); return finish(true); }
        L.q = makeQuestion(L.op); input = ''; save(); drawBoard(`${L.q.a} ${L.q.op} ${L.q.b} = ?`);
        api.say?.(`Well done! That is correct. Next question: ${qEn(L.q)}`, `啱咗，好叻！下一條：${L.q.a} ${L.q.op} ${L.q.b}`, { force: true });
        return render(`✅ 啱咗！${q.a} ${q.op} ${q.b} = ${q.ans}。再答多 ${NEED - L.correct} 條！`, true);
      }
      api.sfx.error();
      const tip = q.op === '+' ? '提示：先加個位，夠 10 就要進位 1 去十位。' : '提示：先減個位，唔夠減就要向十位借 1（即係借 10）。';
      L.q = makeQuestion(L.op); input = ''; save(); drawBoard(`${L.q.a} ${L.q.op} ${L.q.b} = ?`);
      api.say?.(`Oops! ${numWords(q.a)} ${q.op === '+' ? 'plus' : 'minus'} ${numWords(q.b)} is ${numWords(q.ans)}. Let us try another one: ${qEn(L.q)}`, `唔啱喎，答案係 ${q.ans}。試下呢條。`, { force: true });
      return render(`❌ 唔啱喎，${q.a} ${q.op} ${q.b} = ${q.ans}。${tip} 試下呢條：`, false);
    }
  }
  addEventListener('keydown', e => {
    if (!S.lesson || !S.lesson.q) return;
    if (/^Digit\d$|^Numpad\d$/.test(e.code)) key(e.code.slice(-1));
    else if (e.code === 'Backspace') key('del');
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('ok');
  });

  function start() {
    if (S.lesson) return;
    const back = api.prepare();                     // 落車 / 落機，記低而家位置
    S.lesson = { start: Date.now(), back, op: null, correct: 0, q: null }; S.played = 0; save();
    api.sfx.ding(); api.toast('🔔 叮噹～上課時間！', 3000);
    api.say?.('Ding dong! Good morning, class! It is time for maths. Do you want to do addition or subtraction?', '叮噹！同學早晨！上數學堂喇，想做加數定減數？', { force: true });
    api.blackout(() => { api.teleport(X - 2.4, 0.05, Z + 0.8); api.face(Math.PI); drawBoard('上課啦！揀加數定減數？'); render(); }, 900);
  }
  function finish(passed) {
    const L = S.lesson; if (!L) return;
    const back = L.back; S.lesson = null; S.played = 0; warned = false; save();
    modal.style.display = 'none'; drawBoard('落堂啦！👋');
    api.blackout(() => { api.teleport(back[0], back[1], back[2]); api.toast(passed ? '🎉 答啱晒！落堂啦，返到頭先嘅位置繼續玩 👋' : '⏰ 等夠 20 分鐘，可以返去玩喇', 3500); }, 900);
    api.sfx.ding();
  }
  // 重新整理之後：仲喺堂上就即刻返去課室
  function resume() { if (api.admin) { if (S.lesson) { S.lesson = null; save(); } return; } if (S.lesson) { api.teleport(X - 2.4, 0.05, Z + 0.8); api.face(Math.PI); if (S.lesson.q) drawBoard(`${S.lesson.q.a} ${S.lesson.q.op} ${S.lesson.q.b} = ?`); render(); } }

  function update(dt, pos) {
    const near = Math.abs(pos.x - X) < 300 && Math.abs(pos.z - Z) < 300; g.visible = board.visible = teacher.visible = near;
    if (S.lesson) {
      const l = left(); const el = document.getElementById('schWait'); if (el) el.textContent = fmt(l);
      if (l <= 0) { finish(false); return; }
      else if (Math.hypot(pos.x - X, pos.z - Z) > 30) { api.teleport(X - 2.4, 0.05, Z + 0.8); }   // 唔准走堂
      hint.textContent = `📚 上緊數學堂（答啱 ${S.lesson.correct}/${NEED}）`;
      return;
    }
    if (api.admin) { hint.textContent = '📚 管理員：免上堂'; return; }
    if (api.blocked && api.blocked()) { hint.textContent = ''; return; }
    S.played += dt;
    const rem = PLAY_SEC - S.played;
    hint.textContent = `📚 ${fmt(Math.max(0, rem))} 後上數學堂`;
    if (rem < 60 && !warned) { warned = true; api.toast('🔔 仲有 1 分鐘就要返學校上數學堂喇！', 3500); }
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
    if (rem <= 0) start();
  }
  return { colliders: B.cols, update, start, resume, active: () => !!S.lesson, state: S, finish, key, inside: p => Math.abs(p.x - X) < W + 1 && Math.abs(p.z - Z) < D + 1 };
}
