// 監倉：揸電單車沖紅燈又唔夠錢交罰款，就要坐監 3 分鐘（重新整理都走唔甩）
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign, exhaustFan } from './interiors.js';
import { buildAvatar } from './avatar.js';
import { makeQ } from './quizbank.js';

export const JAIL = { x: 6600, z: 600 };
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...e });
const CSS = `#jailHud { position:fixed; left:50%; top:calc(8px + env(safe-area-inset-top)); transform:translateX(-50%); background:rgba(40,10,10,.88); border:2px solid #ef5350; color:#fff; border-radius:14px; padding:8px 18px; font:700 18px system-ui,sans-serif; z-index:26; text-align:center; pointer-events:none; }
#jailHud small { display:block; font-weight:400; font-size:13px; color:#ffcdd2; }
#jailQuiz { position:fixed; inset:0; z-index:63; background:rgba(40,10,10,.78); display:none; align-items:center; justify-content:center; padding:8px; font-family:system-ui,sans-serif; }
#jailQuiz .qb { width:min(600px,96vw); max-height:96dvh; overflow-y:auto; background:#fffdf5; color:#222; border:5px solid #c62828; border-radius:18px; padding:14px 18px; text-align:center; box-shadow:0 10px 40px #0008; }
#jailQuiz h2 { margin:0 0 4px; color:#b71c1c; font-size:22px; }
#jailQuiz .sub { font-size:14px; color:#555; }
#jailQuiz .prog { font-size:16px; margin-top:4px; }
#jailQuiz .q { font-size:24px; font-weight:700; margin:12px 0 8px; line-height:1.3; }
#jailQuiz .ops { display:grid; gap:8px; }
#jailQuiz .ops button { padding:12px 14px; font-size:20px; border-radius:12px; border:3px solid #ef9a9a; background:#fff; color:#222; text-align:left; cursor:pointer; }
#jailQuiz .ops button b { color:#c62828; margin-right:10px; }
#jailQuiz .ops button.right { background:#c8e6c9; border-color:#43a047; }
#jailQuiz .ops button.wrong { background:#ffcdd2; border-color:#e53935; }
#jailQuiz .msg { min-height:24px; margin-top:8px; font-weight:700; font-size:16px; }
#jailQuiz .say { margin-left:6px; background:#ffebee; border:0; border-radius:10px; padding:4px 10px; cursor:pointer; font-size:16px; }
@media (max-height:500px) { #jailQuiz .q { font-size:19px; margin:6px 0; } #jailQuiz .ops button { padding:7px 10px; font-size:17px; } #jailQuiz .left { font-size:22px; } #jailQuiz .sub { font-size:12px; } }
#jailCutBtn { position:fixed; left:50%; top:calc(78px + env(safe-area-inset-top)); transform:translateX(-50%); z-index:27; display:none; padding:10px 18px; border-radius:14px; border:3px solid #fff3; background:linear-gradient(#ffd54f,#ffb300); color:#3e2700; font:800 17px system-ui,sans-serif; box-shadow:0 4px 14px #0007; cursor:pointer; touch-action:manipulation; }
#jailQuiz .left { font:800 30px system-ui,sans-serif; color:#b71c1c; margin:4px 0; }
#jailQuiz .delta { display:inline-block; margin-left:10px; font-size:22px; padding:2px 10px; border-radius:10px; animation:jcPop .9s ease-out; }
#jailQuiz .delta.minus { background:#c8e6c9; color:#1b5e20; } #jailQuiz .delta.plus { background:#ffcdd2; color:#b71c1c; }
#jailQuiz .ops button { touch-action:manipulation; min-height:48px; }
#jailQuiz .close { margin-top:10px; padding:10px 16px; border-radius:12px; border:2px solid #bbb; background:#fff; font-size:16px; cursor:pointer; touch-action:manipulation; }
@keyframes jcPop { 0% { transform:scale(1.6); } 100% { transform:scale(1); } }`;
// 答題出獄：要答啱幾多條數學 / 英文
const NEED = { math: 3, en: 2 };

export function buildJail(scene, api) {
  const B = new Batch();
  const X = JAIL.x, Z = JAIL.z, W = 5, D = 4, H = 3.2;
  const b = (x0, y0, z0, x1, y1, z1, m, col = true) => B.box(X + Math.min(x0, x1), y0, Z + Math.min(z0, z1), X + Math.max(x0, x1), y1, Z + Math.max(z0, z1), m, col);
  const wall = std('#9e9e9e'), steel = std('#607d8b', { metalness: 0.8, roughness: 0.3 });
  b(-W - 6, -0.3, -D - 1, W + 6, 0, D + 8, std('#757575'));
  b(-W, 0, -D - 0.3, W, H, -D, wall); b(-W - 0.3, 0, -D, -W, H, D + 7, wall); b(W, 0, -D, W + 0.3, H, D + 7, wall); b(-W, 0, D + 7, W, H, D + 7.3, wall);
  b(-W, H, -D, W, H + 0.2, D + 7.3, std('#bdbdbd'));
  // 鐵窗（前面一排鐵枝）
  for (let x = -W + 0.3; x < W; x += 0.35) b(x, 0, D, x + 0.06, H, D + 0.06, steel, false);
  b(-W, 0, D - 0.05, W, H, D + 0.1, IM.glass || steel, false);
  B.cols.push({ min: [X - W, 0, Z + D - 0.05], max: [X + W, H, Z + D + 0.12] });
  b(-W, 2.9, D, W, 3.0, D + 0.1, steel, false); b(-W, 0.1, D, W, 0.2, D + 0.1, steel, false);
  // 床、廁所、細窗
  b(-W + 0.2, 0, -D + 0.2, -W + 2.2, 0.5, -D + 1.1, std('#5d4037')); b(-W + 0.25, 0.5, -D + 0.25, -W + 2.15, 0.62, -D + 1.05, std('#eceff1'), false);
  b(W - 1.0, 0, -D + 0.2, W - 0.4, 0.45, -D + 0.8, std('#fafafa'));
  b(-1, 2.2, -D, 1, 2.7, -D + 0.05, std('#90caf9'), false);
  for (let x = -0.9; x < 1; x += 0.3) b(x, 2.2, -D + 0.05, x + 0.05, 2.7, -D + 0.1, steel, false);
  sign(B, X, 2.6, Z + D + 0.15, 4, 0.5, signMat('⛓ 警署羈留室 HOLDING CELL', '#b71c1c', '#fff'), '+z');
  sign(B, X - W + 0.05, 1.8, Z, 3.2, 0.9, signMat('🚦 紅燈要停！Red light means STOP!', '#263238', '#ffeb3b', 'bold 34px sans-serif'), '+x');
  for (let x = -W + 1.5; x < W; x += 3) b(x - 0.6, H - 0.03, -0.2, x + 0.6, H, 0.2, IM.light, false);
  exhaustFan(B, X + 3.4, 2.5, Z - D + 0.02, '+z');
  const g = B.build(); scene.add(g);
  const guard = buildAvatar({ gender: 'm', skin: '#e0ac69', hat: 'cap', shirt: '#1a237e', pants: '#1a237e', hair: '#1b1b1b' });
  guard.position.set(X + 1.5, 0, Z + D + 3); guard.rotation.y = Math.PI; scene.add(guard);

  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const hud = document.createElement('div'); hud.id = 'jailHud'; hud.style.display = 'none'; document.body.appendChild(hud);
  const S = Object.assign({ until: 0, back: null, why: '', quiz: null, cut: null }, api.store.get('jail', {}));
  const save = () => api.store.set('jail', S);
  const left = () => Math.max(0, (S.until - Date.now()) / 1000);
  const active = () => S.until > Date.now() && !!S.back;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const cell = () => { api.teleport(X, 0.05, Z); api.face(Math.PI); };

  function arrest(sec, why) {
    if (active()) return;
    const back = api.prepare();
    S.until = Date.now() + sec * 1000; S.back = back; S.why = why; S.cut = null; save();
    api.sfx.alarm(1.2);
    api.blackout(() => { cell(); api.toast(`👮 ${why}\n要坐監 ${Math.round(sec / 60)} 分鐘！\n撳「📝 答題減刑」：答啱一條減 1 分鐘，答錯加 1 分鐘`, 6000); }, 900);
  }
  function release() {
    const wasQuiz = !!S.quiz; closeQuiz(); cutOpen = false; cutBtn.style.display = 'none';
    const back = S.back; S.until = 0; S.back = null; S.quiz = null; S.cut = null; save(); hud.style.display = 'none';
    api.sfx.ding();
    api.blackout(() => { if (back) api.teleport(back[0], back[1], back[2]); api.toast(wasQuiz ? '🔓 答啱晒題目，可以出獄喇！下次唔好再搶警車喇！' : '🔓 坐完監，可以走喇。下次記住紅燈要停車！', 4000); if (wasQuiz) api.say('You answered all the questions. You are free now. Do not take police cars again!', '答啱晒，可以走喇！下次唔好再搶警車！', { force: true }); else api.onRelease?.(); }, 900);
  }
  function resume() { if (active()) cell(); else if (S.back) release(); }

  // ---------- 答題出獄（搶警車俾人捉）：答啱 3 條數學 + 2 條英文 ----------
  const qel = document.createElement('div'); qel.id = 'jailQuiz'; document.body.appendChild(qel);
  const LET = ['A', 'B', 'C', 'D'];
  let qLock = false;
  function arrestQuiz(why) {
    if (active()) return;
    const back = api.prepare();
    S.until = Date.now() + 365 * 86400e3; S.back = back; S.why = why; S.quiz = { math: 0, en: 0, q: null }; save();
    api.sfx.alarm(1.2);
    api.blackout(() => {
      cell(); api.toast(`👮 ${why}\n要答啱 3 條數學題同 2 條英文題先可以出獄！`, 5000);
      api.say('You are in jail. Answer three maths questions and two English questions correctly to get out.', '你坐監喇！答啱三條數學題同兩條英文題就可以出獄。', { force: true, now: true });

    }, 900);
  }
  function nextQ() {
    const Q = S.quiz, cfg = api.quizCfg?.() || {}, lv = Math.min(6, Math.max(1, Number(cfg.level) || 2)), rg = cfg.region === 'TW' ? 'TW' : 'HK';
    const subj = Q.math < NEED.math && (Q.en >= NEED.en || Math.random() < 0.6) ? 'math' : 'en';
    Q.q = { ...makeQ(subj, lv, rg), subject: subj }; save();
  }
  const speak = q => q?.say?.en && api.say(q.say.en, q.say.zh || '', { force: true, now: true });
  function openQuiz() {
    if (!S.quiz || !active()) return;
    if (!S.quiz.q) nextQ();
    renderQ(''); qel.style.display = 'flex'; speak(S.quiz.q);
  }
  function closeQuiz() { qel.style.display = 'none'; }
  function renderQ(msg, color = '#2e7d32', mark = null) {
    const Q = S.quiz, q = Q.q; if (!q) return;
    const m = q.subject === 'math';
    const qText = String(q.text).replace(/_{2,}/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>');
    qel.innerHTML = `<div class="qb"><h2>⛓ 答題出獄：${m ? '🧮 數學題' : '📝 英文題'}</h2>
      <div class="sub">要答啱 <b>3 條數學題</b>同 <b>2 條英文題</b>先可以出獄；答錯唔緊要，再答過另一條</div>
      <div class="prog">🧮 數學 ${'⭐'.repeat(Math.min(NEED.math, Q.math))}${'☆'.repeat(Math.max(0, NEED.math - Q.math))}　📝 英文 ${'⭐'.repeat(Math.min(NEED.en, Q.en))}${'☆'.repeat(Math.max(0, NEED.en - Q.en))}</div>
      <div class="q">${qText}${q.say?.en ? '<button class="say" title="再聽一次">🔊</button>' : ''}</div>
      <div class="ops">${q.ops.map((o, i) => `<button data-i="${i}" class="${mark && mark[i] ? mark[i] : ''}"><b>${LET[i]}.</b>${o}</button>`).join('')}</div>
      <div class="msg" style="color:${color}">${msg}</div></div>`;
    qel.querySelectorAll('[data-i]').forEach(b => b.onclick = () => answerQ(+b.dataset.i));
    qel.querySelector('.say')?.addEventListener('click', () => speak(q));
  }
  function answerQ(i) {
    const Q = S.quiz; if (!Q || !Q.q || qLock) return;
    const q = Q.q, ok = i === q.ans, mark = []; mark[i] = ok ? 'right' : 'wrong'; if (!ok) mark[q.ans] = 'right';
    if (ok) { api.sfx.pickup(); Q[q.subject === 'math' ? 'math' : 'en']++; } else api.sfx.error();
    Q.n = (Q.n || 0) + 1;
    api.qlog?.({ kind: 'jail', ev: 'q', q: `[${q.subject === 'math' ? '數學' : '英文'}] ${q.text}`, ans: q.ops[q.ans], pick: q.ops[i], tries: 1, ok: ok ? 1 : 0 });
    save();
    const done = Q.math >= NEED.math && Q.en >= NEED.en;
    if (done) { api.qlog?.({ kind: 'jail', ev: 'pass', n: Q.n, q: '監獄答題：答啱 3 數學 + 2 英文，出獄' }); renderQ('🎉 全部答啱晒！可以出獄喇', '#2e7d32', mark); qLock = true; setTimeout(() => { qLock = false; release(); }, 1600); return; }
    renderQ(ok ? '✅ 啱咗！' : `❌ 正確答案係 ${LET[q.ans]}. ${q.ops[q.ans]}${q.tip ? `　💡 ${q.tip}` : ''}`, ok ? '#2e7d32' : '#c62828', mark);
    api.say(ok ? 'Correct!' : `The answer is ${q.ops[q.ans]}.`, ok ? '啱咗！' : `答案係 ${q.ops[q.ans]}`, { force: true, now: true });
    qLock = true;
    setTimeout(() => { qLock = false; nextQ(); renderQ(''); speak(Q.q); }, ok ? 1200 : 3000);
  }
  // ---------- 答題減刑（沖紅燈等有時限嘅坐監）：答啱 −1 分鐘、答錯 +1 分鐘 ----------
  const CUT_SEC = 60, CUT_MAX = 60 * 60, CUT_GAP = 1500;   // 每條 ±1 分鐘；刑期最多 60 分鐘；兩條之間最少等 1.5 秒
  const cutBtn = document.createElement('button'); cutBtn.id = 'jailCutBtn'; cutBtn.type = 'button';
  cutBtn.innerHTML = '📝 答題減刑：答啱 −1 分鐘'; document.body.appendChild(cutBtn);
  cutBtn.addEventListener('click', () => openCut());
  let cutOpen = false, cutDelta = '';
  const timedJail = () => active() && !S.quiz;
  function cutQ() {
    const C = S.cut, cfg = api.quizCfg?.() || {}, lv = Math.min(6, Math.max(1, Number(cfg.level) || 2)), rg = cfg.region === 'TW' ? 'TW' : 'HK';
    let q = null;
    for (let t = 0; t < 40; t++) {   // 唔出重複題目
      const subj = Math.random() < 0.5 ? 'math' : 'en', c = { ...makeQ(subj, lv, rg), subject: subj };
      q = c; if (!C.seen.includes(c.text)) break;
    }
    C.seen.push(q.text); if (C.seen.length > 300) C.seen.splice(0, C.seen.length - 300);
    C.q = q; save();
  }
  function openCut() {
    if (!timedJail()) return;
    if (!S.cut) S.cut = { seen: [], ok: 0, bad: 0, n: 0, q: null, next: 0 };
    if (!S.cut.q) cutQ();
    cutOpen = true; cutDelta = ''; renderCut(''); qel.style.display = 'flex'; speak(S.cut.q);
  }
  function closeCut() { cutOpen = false; qel.style.display = 'none'; }
  function renderCut(msg, color = '#2e7d32', mark = null) {
    const C = S.cut, q = C && C.q; if (!q) return;
    const m = q.subject === 'math';
    const qText = String(q.text).replace(/_{2,}/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>');
    qel.innerHTML = `<div class="qb"><h2>📝 答題減刑：${m ? '🧮 數學題' : '📝 英文題'}</h2>
      <div class="sub">每答啱 1 條，刑期<b style="color:#2e7d32">減 1 分鐘</b>；每答錯 1 條，刑期<b style="color:#c62828">加 1 分鐘</b>。減到 0 就即刻出獄！</div>
      <div class="left">⏳ 仲要坐 <span id="jcLeft">${fmt(left())}</span>${cutDelta}</div>
      <div class="prog">✅ 答啱 ${C.ok} 條　❌ 答錯 ${C.bad} 條</div>
      <div class="q">${qText}${q.say?.en ? '<button class="say" title="再聽一次">🔊</button>' : ''}</div>
      <div class="ops">${q.ops.map((o, i) => `<button type="button" data-i="${i}" class="${mark && mark[i] ? mark[i] : ''}"><b>${LET[i]}.</b>${o}</button>`).join('')}</div>
      <div class="msg" style="color:${color}">${msg}</div>
      <button type="button" class="close">⏸ 唔答住，慢慢等</button></div>`;
    qel.querySelectorAll('[data-i]').forEach(b => b.onclick = () => answerCut(+b.dataset.i));
    qel.querySelector('.say')?.addEventListener('click', () => speak(q));
    qel.querySelector('.close').onclick = () => closeCut();
  }
  function answerCut(i) {
    const C = S.cut; if (!C || !C.q || qLock || !timedJail()) return;
    if (Date.now() < (C.next || 0)) return;   // 冷卻：唔可以連撳
    const q = C.q, ok = i === q.ans, mark = []; mark[i] = ok ? 'right' : 'wrong'; if (!ok) mark[q.ans] = 'right';
    C.n++; if (ok) C.ok++; else C.bad++;
    // 改刑期：唔會少過 0，亦唔會多過 60 分鐘
    const now = Date.now(), cur = Math.max(0, S.until - now);
    const nxt = ok ? Math.max(0, cur - CUT_SEC * 1000) : Math.min(CUT_MAX * 1000, cur + CUT_SEC * 1000);
    S.until = now + nxt; C.next = now + CUT_GAP;
    cutDelta = ok ? '<span class="delta minus">−1 分鐘</span>' : '<span class="delta plus">+1 分鐘</span>';
    if (ok) api.sfx.pickup(); else api.sfx.error();
    api.qlog?.({ kind: 'jail', ev: 'q', q: `[減刑・${q.subject === 'math' ? '數學' : '英文'}] ${q.text}`, ans: q.ops[q.ans], pick: q.ops[i], tries: 1, ok: ok ? 1 : 0 });
    C.q = null; save();
    if (nxt <= 0) {
      api.qlog?.({ kind: 'jail', ev: 'pass', n: C.n, q: `答題減刑：答啱 ${C.ok} 條、答錯 ${C.bad} 條，刑期減到 0，出獄` });
      renderCutDone(mark, q); qLock = true; setTimeout(() => { qLock = false; S.until = Date.now() - 1; save(); release(); }, 1800); return;
    }
    C.q = q; renderCut(ok ? '✅ 啱咗！刑期減 1 分鐘' : `❌ 答錯，刑期加 1 分鐘。正確答案係 ${LET[q.ans]}. ${q.ops[q.ans]}${q.tip ? `　💡 ${q.tip}` : ''}`, ok ? '#2e7d32' : '#c62828', mark); C.q = null;
    api.say(ok ? 'Correct! One minute less.' : `The answer is ${q.ops[q.ans]}. One more minute.`, ok ? '啱咗！減一分鐘。' : `答案係 ${q.ops[q.ans]}，加一分鐘。`, { force: true, now: true });
    qLock = true;
    setTimeout(() => { qLock = false; if (!cutOpen || !timedJail()) return; cutQ(); renderCut(''); speak(S.cut.q); }, ok ? 1500 : 3000);
  }
  function renderCutDone(mark, q) {
    S.cut.q = q; cutDelta = '<span class="delta minus">−1 分鐘</span>'; renderCut('🎉 刑期減到 0！可以出獄喇', '#2e7d32', mark); S.cut.q = null;
  }
  function update(dt, pos) {
    const near = Math.abs(pos.x - X) < 300 && Math.abs(pos.z - Z) < 300; g.visible = guard.visible = near;
    if (!S.back) return;
    if (!active()) { release(); return; }
    hud.style.display = 'block';
    hud.innerHTML = S.quiz ? `⛓ 坐緊監：答啱題目先可以出獄（數學 ${S.quiz.math}/${NEED.math}、英文 ${S.quiz.en}/${NEED.en}）<small>${S.why || ''}</small>` : `⛓ 坐緊監：仲有 ${fmt(left())}<small>${S.why || ''}</small>`;
    if (S.quiz && qel.style.display !== 'flex' && !qLock) openQuiz();
    // 答題減刑掣同倒數
    cutBtn.style.display = timedJail() && !cutOpen ? 'block' : 'none';
    if (cutOpen) { const e = document.getElementById('jcLeft'); if (e) e.textContent = fmt(left()); if (!timedJail()) closeCut(); }
    if (Math.abs(pos.x - X) > W + 0.5 || pos.z < Z - D - 0.5 || pos.z > Z + D + 0.5) cell();
  }
  // 變咗管理員 / 免小測：要答題先出得嘅坐監即刻放人
  const freeQuiz = () => { if (S.quiz && active()) { api.toast('👑 免小測：唔使答題，即刻出獄', 3000); release(); } };
  return { colliders: B.cols, update, arrest, arrestQuiz, resume, active, openCut, freeQuiz, quizOpen: () => qel.style.display === 'flex', inside: p => Math.abs(p.x - X) < W + 6 && p.z > Z - D - 1 && p.z < Z + D + 8 };
}
