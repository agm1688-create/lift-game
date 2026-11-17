// 夜晚鎖：香港時間晚上 10 點後（到朝早 6 點），要輸入密碼先可以繼續玩
// 密碼 = 當日日期（年 + 月 + 日，8 個數字），解咗鎖今晚就唔使再輸入
const CSS = `
#nightLock { position:fixed; inset:0; z-index:90; background:radial-gradient(#1a2a5a,#060a1a); display:none; align-items:center; justify-content:center; color:#fff; font-family:system-ui,sans-serif; padding:10px; }
#nightLock .nb { width:min(380px,94vw); text-align:center; }
#nightLock h2 { margin:0 0 4px; font-size:26px; color:#ffe082; }
#nightLock .sub { font-size:15px; opacity:.9; margin-bottom:10px; }
#nightLock .pw { font:700 30px 'Courier New',monospace; letter-spacing:6px; background:#0008; border:2px solid #90caf9; border-radius:12px; padding:8px; min-height:44px; margin:6px 0; }
#nightLock .msg { min-height:22px; color:#ff8a80; font-weight:700; }
#nightLock .pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:8px; }
#nightLock .pad button { padding:12px 0; font-size:22px; font-weight:700; border-radius:12px; border:0; background:#e3f2fd; color:#0d2440; cursor:pointer; }
#nightLock .pad button.ok { background:#43a047; color:#fff; }
#nightLock .pad button.del { background:#ef9a9a; }
#nightLock.shake .nb { animation:nlShake .35s; }
@keyframes nlShake { 25% { transform:translateX(-10px); } 75% { transform:translateX(10px); } }
@media (max-height:520px) { #nightLock h2 { font-size:20px; } #nightLock .pad button { padding:6px 0; font-size:18px; } #nightLock .pw { font-size:22px; min-height:32px; padding:4px; } }
`;
// 香港時間
export function hkNow(d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(d).map(p => [p.type, p.value]));
  return { y: parts.year, m: parts.month, d: parts.day, h: (+parts.hour) % 24 };
}
export function buildNightLock(api) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'nightLock'; document.body.appendChild(el);
  let input = '', locked = false;
  const nightId = () => { const n = hkNow(); if (n.h >= 22) return `${n.y}${n.m}${n.d}`; const y = hkNow(new Date(Date.now() - 864e5)); return `${y.y}${y.m}${y.d}`; };
  const isNight = () => { const h = hkNow().h; return h >= 22 || h < 6; };
  const password = () => { const n = hkNow(); return `${n.y}${n.m}${n.d}`; };
  function render(msg = '') {
    el.innerHTML = `<div class="nb"><h2>🌙 夜喇，夠鐘瞓覺！</h2>
      <div class="sub">而家係香港時間晚上 10 點後。<br>要輸入密碼先可以繼續玩。</div>
      <div class="pw">${input.replace(/./g, '●') || '&nbsp;'}</div><div class="msg">${msg}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}<button class="del" data-k="del">⌫</button><button data-k="0">0</button><button class="ok" data-k="ok">🔓</button></div></div>`;
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => key(b.dataset.k));
  }
  function key(k) {
    if (!locked) return;
    api.sfx?.click();
    if (/^\d$/.test(k)) { if (input.length < 8) input += k; return render(); }
    if (k === 'del') { input = input.slice(0, -1); return render(); }
    if (k === 'ok') {
      if (input === password()) { api.store.set('nightOK', nightId()); locked = false; el.style.display = 'none'; input = ''; api.sfx?.pickup(); api.toast?.('🔓 密碼啱，可以繼續玩。唔好玩太夜呀！', 3500); return; }
      input = ''; api.sfx?.error(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      return render('❌ 密碼唔啱，再試過');
    }
  }
  addEventListener('keydown', e => {
    if (!locked) return;
    if (/^Digit\d$|^Numpad\d$/.test(e.code)) key(e.code.slice(-1));
    else if (e.code === 'Backspace') key('del'); else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('ok');
    e.stopPropagation();
  }, true);
  function check() {
    if (locked) return;
    if (isNight() && api.store.get('nightOK', '') !== nightId()) {
      locked = true; input = ''; render(); el.style.display = 'flex';
      api.onLock?.();
    }
  }
  check(); setInterval(check, 15000);
  return { locked: () => locked, check };
}
