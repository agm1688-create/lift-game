// 小測：每位會員由管理員設定——程度（香港 / 台灣 小一至小六）、每隔幾多分鐘、英文 / 數學 / 混合、
// 要連續答啱 1 條定 2 條、有冇提示。答啱英文小測之後 3 分鐘再有一條英文生字題（答錯唔罰，答啱為止）
import { makeQ, LEVEL_NAMES } from './quizbank.js';
export const VOCAB_AFTER = 3 * 60;
export const DEF_CFG = { level: 2, region: 'HK', every: 3, subject: 'en', need: 2, tips: 1 };
const CSS = `
#quizModal { position:fixed; inset:0; z-index:64; background:rgba(10,15,40,.8); display:none; align-items:center; justify-content:center; padding:8px; font-family:system-ui,sans-serif; }
#quizModal .qb { width:min(600px,96vw); max-height:96dvh; overflow-y:auto; background:#fffdf5; color:#222; border:5px solid #7e57c2; border-radius:18px; padding:14px 18px; text-align:center; box-shadow:0 10px 40px #0008; }
#quizModal h2 { margin:0 0 4px; color:#5e35b1; font-size:22px; }
#quizModal .sub { font-size:14px; color:#555; }
#quizModal .q { font-size:24px; font-weight:700; margin:12px 0 8px; line-height:1.3; }
#quizModal .ops { display:grid; gap:8px; }
#quizModal .ops button { padding:12px 14px; font-size:20px; border-radius:12px; border:3px solid #b39ddb; background:#fff; color:#222; text-align:left; cursor:pointer; }
#quizModal .ops button b { color:#7e57c2; margin-right:10px; }
#quizModal .ops button.right { background:#c8e6c9; border-color:#43a047; }
#quizModal .ops button.wrong { background:#ffcdd2; border-color:#e53935; }
#quizModal .msg { min-height:24px; margin-top:8px; font-weight:700; font-size:16px; }
#quizModal .prog { font-size:15px; margin-top:2px; }
#quizModal .hint { margin-top:6px; background:#fff8e1; border:2px dashed #ffb300; border-radius:10px; padding:4px 12px; cursor:pointer; font-size:15px; color:#6d4c41; }
#quizModal .say { margin-left:6px; background:#ede7f6; border:0; border-radius:10px; padding:4px 10px; cursor:pointer; font-size:16px; }
@media (max-height:500px) { #quizModal .q { font-size:19px; margin:6px 0; } #quizModal .ops button { padding:7px 10px; font-size:17px; } #quizModal h2 { font-size:18px; } }
`;

const LET = ['A', 'B', 'C', 'D'];

export function buildQuiz(api) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'quizModal'; document.body.appendChild(el);
  const S = Object.assign({ played: 0, vocabIn: -1, mode: null, streak: 0, q: null }, api.store.get('quiz2', {}));
  const save = () => api.store.set('quiz2', S);
  let cfg = { ...DEF_CFG }, saveT = 0, locked = false, hintOpen = false;
  const every = () => Math.max(1, Number(cfg.every) || 3) * 60;
  const need = () => (Number(cfg.need) === 1 ? 1 : 2);
  const subjOf = () => cfg.subject === 'mix' ? (Math.random() < 0.5 ? 'en' : 'math') : cfg.subject === 'math' ? 'math' : 'en';
  const lvName = () => (LEVEL_NAMES[cfg.region] || LEVEL_NAMES.HK)[Math.min(6, Math.max(1, cfg.level)) - 1];
  function newQ(subject) {
    const q = makeQ(subject, Math.min(6, Math.max(1, Number(cfg.level) || 2)), cfg.region === 'TW' ? 'TW' : 'HK');
    return { ...q, subject };
  }
  const speakQ = q => api.say(q.say?.en || '', q.say?.zh || '', { force: true, now: true });
  function open(mode) {
    S.mode = mode; S.streak = 0; S.q = newQ(mode === 'v' ? 'vocab' : subjOf()); save(); hintOpen = false;
    api.onOpen?.(); api.sfx.ding();
    render(''); el.style.display = 'flex';
    const m = S.q.subject === 'math';
    api.say(mode === 'v' ? 'Word quiz! What does this word mean?' : m ? 'Maths quiz time!' : 'English quiz time! Choose the correct answer.', mode === 'v' ? '生字小測！呢個英文字係咩意思？' : m ? '數學小測時間！' : '英文小測時間！揀正確答案。', { force: true, now: true });
    setTimeout(() => S.q && speakQ(S.q), 2200);
  }
  function render(msg, color = '#2e7d32', mark = null) {
    const q = S.q; if (!q) return;
    const v = S.mode === 'v', m = q.subject === 'math', N = need();
    const title = v ? '🔤 英文生字小測' : m ? '🧮 數學小測' : '📝 英文小測';
    const qText = v ? `「${q.text}」係咩意思？` : String(q.text).replace(/_{2,}/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>');
    el.innerHTML = `<div class="qb"><h2>${title}<span style="font-size:14px;color:#888;margin-left:8px">${lvName()}</span></h2>
      <div class="sub">${v ? '睇英文，揀中文意思。答錯唔罰，答啱為止 😊' : N === 1 ? '答啱 <b>1 條</b>就可以繼續玩' : `要<b>連續答啱 ${N} 條</b>先可以繼續玩；答錯要再答多一條`}</div>
      ${!v && N > 1 ? `<div class="prog">連續答啱：${'⭐'.repeat(S.streak)}${'☆'.repeat(Math.max(0, N - S.streak))}</div>` : ''}
      <div class="q">${qText}${q.say?.en ? '<button class="say" title="再聽一次">🔊</button>' : ''}</div>
      ${cfg.tips && q.tip && !v ? (hintOpen ? `<div class="hint">💡 ${q.tip}</div>` : '<button class="hint">💡 睇提示</button>') : ''}
      <div class="ops">${q.ops.map((o, i) => `<button data-i="${i}" class="${mark && mark[i] ? mark[i] : ''}"><b>${LET[i]}.</b>${o}</button>`).join('')}</div>
      <div class="msg" style="color:${color}">${msg}</div></div>`;
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => answer(+b.dataset.i));
    el.querySelector('.say')?.addEventListener('click', () => speakQ(q));
    const hb = el.querySelector('button.hint'); if (hb) hb.onclick = () => { hintOpen = true; api.sfx.click?.(); render(msg, color, mark); };
  }
  function answer(i) {
    const q = S.q; if (!q || locked) return;
    const ok = i === q.ans, mark = []; mark[i] = ok ? 'right' : 'wrong'; if (!ok && S.mode !== 'v') mark[q.ans] = 'right';
    if (ok) { api.sfx.pickup(); api.onQuizOK?.(); } else api.sfx.error();
    if (S.mode === 'v') {
      if (!ok) { render(`❌ 唔係喎，再試吓！`, '#c62828', mark); api.say('Try again!', '再試吓！', { force: true, now: true }); return; }
      render(`✅ 啱咗！${q.text} = ${q.ops[q.ans]}`, '#2e7d32', mark);
      api.say(`Correct! ${q.text}.`, `啱咗！${q.text} = ${q.ops[q.ans]}`, { force: true, now: true });
      locked = true; setTimeout(() => { locked = false; close(); }, 1600);
      return;
    }
    const N = need();
    if (ok) {
      S.streak++;
      if (S.streak >= N) {
        render(N > 1 ? `🎉 連續答啱 ${N} 條！可以繼續玩喇` : '🎉 答啱咗！可以繼續玩喇', '#2e7d32', mark);
        api.say(N > 1 ? 'Excellent! You got two right in a row. Well done!' : 'Correct! Well done!', N > 1 ? '好叻！連續答啱兩條！' : '答啱咗！好叻！', { force: true, now: true });
        const hadEn = cfg.subject !== 'math';
        locked = true; setTimeout(() => { locked = false; if (hadEn) S.vocabIn = VOCAB_AFTER; close(); }, 1800); return;
      }
      render(`✅ 啱咗！再答多 ${N - S.streak} 條`, '#2e7d32', mark); api.say('Correct! One more question.', '啱咗！再答多一條。', { force: true, now: true });
    } else {
      S.streak = 0;
      render(`❌ 正確答案係 ${LET[q.ans]}. ${q.ops[q.ans]}${cfg.tips && q.tip ? `　💡 ${q.tip}` : ''}<br>再答多一條${N > 1 ? `，要連續答啱 ${N} 條` : ''}`, '#c62828', mark);
      api.say(`The answer is ${q.ops[q.ans]}. Let us try another one.`, `答案係 ${q.ops[q.ans]}，試多一條。`, { force: true, now: true });
    }
    locked = true;
    setTimeout(() => { locked = false; hintOpen = false; S.q = newQ(subjOf()); save(); render(''); speakQ(S.q); }, ok ? 1300 : 3200);
    save();
  }
  function close() { el.style.display = 'none'; S.mode = null; S.q = null; S.played = 0; hintOpen = false; save(); }
  // 重新整理之後：仲喺小測就再彈出嚟
  function resume() { if (S.mode && S.q && S.q.say) { render(''); el.style.display = 'flex'; } else if (S.mode) { S.mode = null; S.q = null; } }
  function update(dt, blocked) {
    if (S.mode) return;
    if (blocked) return;
    S.played += dt;
    if (S.vocabIn > 0) { S.vocabIn -= dt; if (S.vocabIn <= 0) { S.vocabIn = -1; open('v'); return; } }
    if (S.played >= every()) { S.played = 0; open('g'); return; }
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  }
  // 管理員改咗設定：即時生效
  function config(c) {
    if (!c) return;
    const old = JSON.stringify(cfg); cfg = { ...DEF_CFG, ...c };
    if (S.played > every()) S.played = every() - 5;
    if (old !== JSON.stringify(cfg) && S.mode && S.q) render('');
  }
  const left = () => Math.max(0, every() - S.played);
  return { update, resume, close, active: () => !!S.mode, open, left, config, cfg: () => cfg, state: S, subjectName: () => cfg.subject === 'math' ? '數學' : cfg.subject === 'mix' ? '英文 / 數學' : '英文' };
}
