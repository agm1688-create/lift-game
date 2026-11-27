// 夜晚鎖：香港時間晚上 10 點後（到朝早 6 點），要輸入密碼先可以繼續玩
// 密碼 = 當日日期（年 + 月 + 日，8 個數字），解咗鎖今晚就唔使再輸入
const CSS = `
#nightLock, #pwAsk { position:fixed; inset:0; z-index:90; background:radial-gradient(#1a2a5a,#060a1a); display:none; align-items:center; justify-content:center; color:#fff; font-family:system-ui,sans-serif; padding:10px; }
#nightLock .nb, #pwAsk .nb { width:min(380px,94vw); text-align:center; }
#nightLock h2, #pwAsk h2 { margin:0 0 4px; font-size:26px; color:#ffe082; }
#nightLock .sub, #pwAsk .sub { font-size:15px; opacity:.9; margin-bottom:10px; }
#nightLock .pw, #pwAsk .pw { font:700 30px 'Courier New',monospace; letter-spacing:6px; background:#0008; border:2px solid #90caf9; border-radius:12px; padding:8px; min-height:44px; margin:6px 0; }
#nightLock .msg, #pwAsk .msg { min-height:22px; color:#ff8a80; font-weight:700; }
#nightLock .pad, #pwAsk .pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:8px; }
#nightLock .pad button, #pwAsk .pad button { padding:12px 0; font-size:22px; font-weight:700; border-radius:12px; border:0; background:#e3f2fd; color:#0d2440; cursor:pointer; }
#nightLock .pad button.ok, #pwAsk .pad button.ok { background:#43a047; color:#fff; }
#nightLock .pad button.del, #pwAsk .pad button.del { background:#ef9a9a; }
#nightLock.shake .nb, #pwAsk.shake .nb { animation:nlShake .35s; }
@keyframes nlShake { 25% { transform:translateX(-10px); } 75% { transform:translateX(10px); } }
@media (max-height:520px) { #nightLock h2, #pwAsk h2 { font-size:20px; } #nightLock .pad button, #pwAsk .pad button { padding:6px 0; font-size:18px; } #nightLock .pw, #pwAsk .pw { font-size:22px; min-height:32px; padding:4px; } }
`;
// 香港時間
export function hkNow(d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(d).map(p => [p.type, p.value]));
  return { y: parts.year, m: parts.month, d: parts.day, h: (+parts.hour) % 24 };
}
export const ADMIN_PW = '8844';
// 呢部機嘅編號（隨機，記喺呢部機）：忘記密碼時，登入過嘅機可以直接重設
export function deviceId() {
  let d = null; try { d = localStorage.getItem('liftDev'); } catch { }
  if (!/^[0-9a-f]{32}$/.test(d || '')) {
    d = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem('liftDev', d); } catch { }
  }
  return d;
}
export const todayPw = () => { const n = hkNow(); return `${n.y}${n.m}${n.d}`; };
export const nightId = () => { const n = hkNow(); if (n.h >= 22) return `${n.y}${n.m}${n.d}`; const y = hkNow(new Date(Date.now() - 864e5)); return `${y.y}${y.m}${y.d}`; };
export const isNight = () => { const h = hkNow().h; return h >= 22 || h < 6; };
const injectCSS = () => { if (document.getElementById('nlCSS')) return; const st = document.createElement('style'); st.id = 'nlCSS'; st.textContent = CSS; document.head.appendChild(st); };
// 登入密碼：8844 = 管理員（唔使做小測）；今日日期（年月日 8 個數字）= 普通玩家
export function askLogin(api, name, onOk) {
  injectCSS();
  let el = document.getElementById('pwAsk');
  if (!el) { el = document.createElement('div'); el.id = 'pwAsk'; document.body.appendChild(el); }
  let input = '', busy = false, mode = 'login', first = '';   // mode：login 登入 / new 輸入新密碼 / again 再輸入一次
  const onKey = e => { if (/^Digit\d$|^Numpad\d$/.test(e.code)) key(e.code.slice(-1)); else if (e.code === 'Backspace') key('del'); else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('ok'); else return; e.preventDefault(); e.stopPropagation(); };
  function render(msg = '') {
    const title = mode === 'login' ? '🔑 會員登入' : '🔁 重設密碼';
    const sub = mode === 'login' ? '請輸入密碼' : mode === 'new' ? '請輸入<b>新密碼</b>（4–8 個數字）' : '請<b>再輸入一次</b>新密碼';
    el.innerHTML = `<div class="nb"><h2>${title}</h2><div class="sub">會員：<b>${name.replace(/[<&>]/g, '')}</b>　${sub}</div>
      <div class="pw">${input.replace(/./g, '●') || '&nbsp;'}</div><div class="msg">${msg}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join('')}<button class="del" data-k="del">⌫</button><button data-k="0">0</button><button class="ok" data-k="ok">✔</button></div>
      <div style="display:flex;gap:8px;margin-top:12px"><button data-k="back" style="flex:1;padding:9px;border-radius:10px;border:1px solid #fff8;background:none;color:#fff;font-size:15px;cursor:pointer">${mode === 'login' ? '↩ 返回改會員名' : '↩ 返回登入'}</button><button data-k="forgot"${mode === 'login' ? '' : ' hidden'} style="flex:1;padding:9px;border-radius:10px;border:1px solid #ffd54f;background:none;color:#ffd54f;font-size:15px;cursor:pointer">🙋 忘記密碼</button></div></div>`;
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => key(b.dataset.k));
  }
  const close = () => { el.style.display = 'none'; removeEventListener('keydown', onKey, true); };
  function key(k) {
    api.sfx?.click?.();
    if (k === 'back') { if (mode !== 'login') { mode = 'login'; input = ''; first = ''; return render(); } return close(); }
    if (k === 'forgot') {
      // 同一部機（之前用呢個會員登入過）可以直接設新密碼
      if (busy) return; mode = 'new'; input = ''; first = '';
      return render('<span style="color:#ffe082">呢部機之前用呢個會員登入過，就可以直接設新密碼</span>');
    }
    if (/^\d$/.test(k)) { if (input.length < 8) input += k; return render(); }
    if (k === 'del') { input = input.slice(0, -1); return render(); }
    if (k !== 'ok' || busy) return;
    if (mode === 'new') {
      if (!/^\d{4,8}$/.test(input) || input === ADMIN_PW) { input = ''; return render('❌ 新密碼要 4–8 個數字'); }
      first = input; input = ''; mode = 'again'; return render();
    }
    if (mode === 'again') {
      if (input !== first) { input = ''; first = ''; mode = 'new'; return render('❌ 兩次唔一樣，請重新輸入新密碼'); }
      busy = true; render('⏳ 重設緊…');
      return fetch('api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, dev: deviceId(), pin: input }) })
        .then(r => r.json()).catch(() => ({ err: '連唔到伺服器，請再試' }))
        .then(r => {
          busy = false; input = ''; first = '';
          if (r.ok) { close(); api.toast?.('✅ 已經設好新密碼，下次用新密碼登入', 4000); if (isNight()) api.store?.set('nightOK', nightId()); return onOk(r.role, r.token || '', r.acct || null); }
          mode = 'login';
          if (!r.notDevice) return render('❌ ' + (r.err || '重設唔到，請再試'));
          // 第二部機：唔可以直接重設，改為通知管理員
          render('⏳ 呢部機未用過呢個會員登入，通知緊管理員…');
          fetch('api/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
            .then(x => x.json()).catch(() => ({ err: '連唔到伺服器' }))
            .then(x => render(x.ok ? '<span style="color:#ffcc80">呢部機未用過呢個會員登入，唔可以直接重設。<br>✅ 已經通知管理員幫你設新密碼。</span>' : '❌ ' + x.err));
        });
    }
    busy = true; render('⏳ 登入緊…');
    fetch('api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, pin: input, dev: deviceId() }) })
      .then(r => r.json()).catch(() => ({ err: '連唔到伺服器，請再試' }))
      .then(r => {
        busy = false;
        if (!r.ok) { input = ''; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); clearTimeout(el._shk); el._shk = setTimeout(() => el.classList.remove('shake'), 400);   /* 只震一次：之後撳掣重畫唔會再震 */ return render('❌ ' + (r.err || '密碼唔啱')); }
        close();
        if (isNight()) api.store?.set('nightOK', nightId());   // 夜晚登入咗就唔使再輸多次
        onOk(r.role, r.token || '', r.acct || null);
      });
  }
  addEventListener('keydown', onKey, true);
  render(); el.style.display = 'flex';
}
export function buildNightLock(api) {
  injectCSS();
  const el = document.createElement('div'); el.id = 'nightLock'; document.body.appendChild(el);
  let input = '', locked = false;
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
      if (input === password() || input === ADMIN_PW) { api.store.set('nightOK', nightId()); locked = false; el.style.display = 'none'; input = ''; api.sfx?.pickup(); api.toast?.('🔓 密碼啱，可以繼續玩。唔好玩太夜呀！', 3500); return; }
      input = ''; api.sfx?.error(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); clearTimeout(el._shk); el._shk = setTimeout(() => el.classList.remove('shake'), 400);   /* 只震一次：之後撳掣重畫唔會再震 */
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

// 通用密碼框（例如關英文發音）：密碼同夜晚鎖一樣 = 今日日期（年月日 8 個數字）
export function askPassword(api, title, sub, onOk) {
  let el = document.getElementById('pwAsk');
  if (!el) { el = document.createElement('div'); el.id = 'pwAsk'; document.body.appendChild(el); }
  let input = '';
  const n = hkNow(), pw = `${n.y}${n.m}${n.d}`;
  const close = () => { el.style.display = 'none'; removeEventListener('keydown', onKey, true); };
  function render(msg = '') {
    el.innerHTML = `<div class="nb"><h2>${title}</h2><div class="sub">${sub}</div>
      <div class="pw">${input.replace(/./g, '●') || '&nbsp;'}</div><div class="msg">${msg}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join('')}<button class="del" data-k="del">⌫</button><button data-k="0">0</button><button class="ok" data-k="ok">✔</button></div>
      <div style="margin-top:10px"><button data-k="x" style="padding:8px 18px;border-radius:10px;border:1px solid #fff8;background:none;color:#fff;font-size:15px;cursor:pointer">取消</button></div></div>`;
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => key(b.dataset.k));
  }
  function key(k) {
    api.sfx?.click();
    if (k === 'x') return close();
    if (/^\d$/.test(k)) { if (input.length < 8) input += k; return render(); }
    if (k === 'del') { input = input.slice(0, -1); return render(); }
    if (k === 'ok') { if (input === pw) { close(); onOk(); return; } input = ''; api.sfx?.error(); return render('❌ 密碼唔啱'); }
  }
  function onKey(e) {
    if (/^Digit\d$|^Numpad\d$/.test(e.code)) key(e.code.slice(-1));
    else if (e.code === 'Backspace') key('del'); else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('ok'); else if (e.code === 'Escape') key('x');
    e.stopPropagation(); e.preventDefault();
  }
  addEventListener('keydown', onKey, true);
  render(); el.style.display = 'flex';
}
