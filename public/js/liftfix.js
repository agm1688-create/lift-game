// 電梯維修小遊戲：每部 Lift 第一次用之前要先維修（約 10–20 秒）
// 跟住指示，按次序撳 5 個工具掣；每一步都會讀出英文
const CSS = `
#fixModal { position:fixed; inset:0; z-index:62; background:rgba(8,16,28,.82); display:none; align-items:center; justify-content:center; padding:8px; font-family:system-ui,sans-serif; }
#fixModal .fb { width:min(620px,96vw); max-height:96dvh; overflow-y:auto; background:#1c2b3a; border:3px solid #ffb300; border-radius:16px; color:#fff; padding:12px 16px; text-align:center; }
#fixModal h2 { margin:0 0 4px; color:#ffd54f; font-size:22px; }
#fixModal .sub { font-size:14px; opacity:.9; }
#fixModal .step { margin:8px 0; font-size:18px; font-weight:700; min-height:26px; }
#fixModal .bar { height:12px; background:#0006; border-radius:8px; overflow:hidden; margin:6px 0; }
#fixModal .bar i { display:block; height:100%; width:0; background:linear-gradient(90deg,#66bb6a,#ffeb3b); transition:width .25s; }
#fixModal .tools { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:8px; }
#fixModal .tools button { padding:10px 4px; border-radius:12px; border:2px solid #455a64; background:#263849; color:#fff; font-size:13px; cursor:pointer; }
#fixModal .tools button b { display:block; font-size:28px; }
#fixModal .tools button.done { background:#2e7d32; border-color:#81c784; opacity:.6; }
#fixModal .tools button.next { border-color:#ffd54f; box-shadow:0 0 10px #ffd54f88; }
#fixModal .tools button.bad { animation:fxShake .3s; background:#b71c1c; }
#fixModal .msg { min-height:22px; font-weight:700; color:#ffcc80; margin-top:6px; }
#fixModal .x { margin-top:8px; background:none; border:1px solid #fff6; color:#fff; border-radius:10px; padding:6px 14px; cursor:pointer; }
@keyframes fxShake { 25% { transform:translateX(-6px); } 75% { transform:translateX(6px); } }
@media (max-height:500px) { #fixModal .tools button { padding:6px 2px; } #fixModal .tools button b { font-size:20px; } #fixModal h2 { font-size:18px; } }
`;
export const FIX_STEPS = [
  { e: '🔌', zh: '熄總掣', en: 'Turn off the main power.', tip: '安全第一：維修之前一定要熄電' },
  { e: '🪢', zh: '收緊鋼纜', en: 'Tighten the steel ropes.', tip: '鋼纜吊住個車廂，要夠緊先安全' },
  { e: '🛢', zh: '加潤滑油', en: 'Put oil on the sheave.', tip: '曳引輪加油，Lift 行得順' },
  { e: '🛑', zh: '檢查制動器', en: 'Check the brake.', tip: '制動器令 Lift 安全停低' },
  { e: '⚡', zh: '開電測試', en: 'Turn on the power and test the lift.', tip: '開返電，試吓上落' },
];

export function buildLiftFix(api) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'fixModal'; document.body.appendChild(el);
  const fixed = new Set(api.store.get('liftFixed', []));
  let job = null;
  const isFixed = key => fixed.has(key);
  function gate(key, name, fn) {
    if (fixed.has(key)) { fn(); return; }
    if (job) return;
    start(key, name, fn);
  }
  function start(key, name, fn) {
    const order = FIX_STEPS.map((s, i) => i).sort(() => Math.random() - 0.5);   // 工具掣次序打亂
    job = { key, name, fn, i: 0, busy: false, t0: performance.now(), order };
    render('');
    el.style.display = 'flex';
    api.say('This lift is broken. Let us fix it! First, turn off the main power.', '呢部 Lift 壞咗，一齊整好佢！第一步：熄總掣。', { force: true, now: true });
  }
  function render(msg) {
    const J = job; if (!J) return;
    const s = FIX_STEPS[J.i];
    el.innerHTML = `<div class="fb"><h2>🔧 維修 ${J.name}</h2>
      <div class="sub">呢部 Lift 壞咗，要整好先用得！跟住次序撳工具（大約 15 秒）</div>
      <div class="bar"><i style="width:${J.i / FIX_STEPS.length * 100}%"></i></div>
      <div class="step">${s ? `第 ${J.i + 1} 步：${s.e} ${s.zh}<div style="font-size:14px;font-weight:400;color:#b3e5fc">${s.en}　（${s.tip}）</div>` : '✅ 維修完成！'}</div>
      <div class="tools">${J.order.map(i => { const t = FIX_STEPS[i]; return `<button data-i="${i}" class="${i < J.i ? 'done' : i === J.i ? 'next' : ''}"><b>${t.e}</b>${t.zh}</button>`; }).join('')}</div>
      <div class="msg">${msg}</div>
      <div style="font-size:13px;opacity:.75">⏱ ${((performance.now() - J.t0) / 1000).toFixed(0)} 秒</div>
      <button class="x">遲啲先整</button></div>`;
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => tap(+b.dataset.i, b));
    el.querySelector('.x').onclick = () => { job = null; el.style.display = 'none'; };
  }
  function tap(i, b) {
    const J = job; if (!J || J.busy) return;
    if (i < J.i) return;
    if (i !== J.i) { api.sfx.error(); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); el.querySelector('.msg').textContent = `❌ 次序唔啱！而家要「${FIX_STEPS[J.i].zh}」`; return; }
    J.busy = true; api.sfx.click(); api.sfx.spray?.();
    el.querySelector('.msg').textContent = `${FIX_STEPS[i].e} ${FIX_STEPS[i].zh}中…`;
    setTimeout(() => {
      J.busy = false; J.i++; api.sfx.beep();
      if (J.i >= FIX_STEPS.length) return finish();
      api.say(`Well done! Next: ${FIX_STEPS[J.i].en}`, `做得好！下一步：${FIX_STEPS[J.i].zh}`, { force: true, now: true });
      render('✅ 做好咗！');
    }, 1100);
  }
  function finish() {
    const J = job; job = null;
    fixed.add(J.key); api.store.set('liftFixed', [...fixed]);
    const sec = ((performance.now() - J.t0) / 1000).toFixed(0);
    el.innerHTML = `<div class="fb"><h2>🎉 ${J.name} 整好咗！</h2><div class="step">用咗 ${sec} 秒，可以搭 Lift 喇 🛗</div><button class="x" style="background:#43a047;border:0;font-size:17px;padding:10px 24px">好！</button></div>`;
    api.sfx.ding(); api.say('Great job! The lift is working now. You can use it.', '好叻！部 Lift 整好咗，可以用喇。', { force: true, now: true });
    el.querySelector('.x').onclick = () => { el.style.display = 'none'; J.fn(); };
    setTimeout(() => { if (el.style.display !== 'none') { el.style.display = 'none'; J.fn(); } }, 2500);
  }
  return { gate, isFixed, active: () => !!job };
}
