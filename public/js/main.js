// 搭 Lift 遊戲 — 主程式
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld, LIFT_DEF } from './world.js';
import { buildLifts, isMoving } from './lifts.js';
import { buildAvatar, animateAvatar, buildShiba, animateShiba, itemMesh, SKINS, SHIRTS, HATS } from './avatar.js';
import { Net, Voice } from './net.js';
import { initAudio, sfx } from './audio.js';
import { altOfFloor, layerName, fmtAlt, floorLabel, MAX_FLOOR } from './alt.js';

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches;
const V3 = THREE.Vector3;

// ================= 開始畫面：角色設計 =================
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
const look = Object.assign({ gender: 'm', skin: SKINS[1], hat: 'gold', shirt: SHIRTS[1] }, store.get('look', {}));
$('name').value = store.get('name', '') || '';

const pv = { r: new THREE.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true }), s: new THREE.Scene(), c: new THREE.PerspectiveCamera(35, 3 / 4, 0.1, 50), av: null, run: true };
pv.r.setPixelRatio(Math.min(devicePixelRatio, 2));
pv.s.add(new THREE.HemisphereLight('#fff', '#556', 1.4)); const pvl = new THREE.DirectionalLight('#fff', 2); pvl.position.set(2, 3, 4); pv.s.add(pvl);
pv.c.position.set(0, 1.2, 6); pv.c.lookAt(0, 0.95, 0);
function rebuildPreview() { if (pv.av) pv.s.remove(pv.av); pv.av = buildAvatar(look); pv.s.add(pv.av); }
(function pvLoop() {
  if (!pv.run) return;
  const cv = $('preview'); const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.floor(w * pv.r.getPixelRatio())) { pv.r.setSize(w, h, false); pv.c.aspect = w / h; pv.c.updateProjectionMatrix(); }
  if (pv.av) { pv.av.rotation.y += 0.015; animateAvatar(pv.av, 1, 0.016, 0.5); }
  pv.r.render(pv.s, pv.c); requestAnimationFrame(pvLoop);
})();
function optRow(el, items, key, render) {
  el.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button'); render(b, it);
    if (look[key] === it.v) b.classList.add('on');
    b.onclick = () => { look[key] = it.v; [...el.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); rebuildPreview(); };
    el.appendChild(b);
  });
}
optRow($('optGender'), [{ v: 'm', n: '👦 男' }, { v: 'f', n: '👧 女' }], 'gender', (b, it) => { b.className = 'opt'; b.textContent = it.n; });
optRow($('optSkin'), SKINS.map(v => ({ v })), 'skin', (b, it) => { b.className = 'sw'; b.style.background = it.v; });
optRow($('optHat'), HATS.map(h => ({ v: h.id, n: h.name })), 'hat', (b, it) => { b.className = 'opt'; b.textContent = (it.v === 'gold' || it.v === 'crown' ? '👑 ' : '') + it.n; });
optRow($('optShirt'), SHIRTS.map(v => ({ v })), 'shirt', (b, it) => { b.className = 'sw'; b.style.background = it.v; });
rebuildPreview();

$('go').onclick = () => {
  const name = ($('name').value.trim() || '玩家' + Math.floor(Math.random() * 1000)).slice(0, 16);
  store.set('look', look); store.set('name', name);
  initAudio();
  if (isTouch) document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => { });
  pv.run = false; pv.r.dispose();
  $('start').classList.add('hidden'); $('hud').classList.remove('hidden');
  startGame(name);
};

// ================= 遊戲 =================
function startGame(myName) {
  const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: !isTouch, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 2e7);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

  // ---------- 玩家狀態 ----------
  const SPAWN = new V3(0, 0, 8);
  const P = { pos: SPAWN.clone(), vy: 0, face: Math.PI, grounded: true, ride: -1, scale: 1, held: null, inv: new Set(), gold: 0, dog: false, fallFrom: 0, spraying: false, anim: 0, wifi: false };
  let camYaw = 0, camPitch = 0.32, camDist = 6;
  const toast = (msg, ms = 2200) => { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.opacity = 0, ms); };

  // ---------- 網絡 ----------
  const remotes = new Map();
  let toiletLight = false;
  const net = new Net({ message: onNet, close: () => toast('⚠️ 同伺服器斷咗線，請重新整理', 6000) });
  const voice = new Voice(net);

  // ---------- 世界 + 電梯 ----------
  const api = {
    teleport: (x, y, z) => { P.pos.set(x, y, z); P.vy = 0; P.fallFrom = y; },
    alarm: () => { net.send({ t: 'ev', kind: 'alarm' }); doAlarm(); },
    pickup: (kind, obj) => { obj.visible = false; P.inv.add(kind); setHeld(kind); sfx.pickup(); renderInv(); toast({ ext: '🧯 拎咗滅火筒（撳互動掣噴）', phone: '📱 拎咗手機', router: '📶 拎咗 Router' }[kind]); },
    gold: () => { P.gold++; sfx.pickup(); $('goldTxt').textContent = P.gold; toast(`🥇 金條 +1（共 ${P.gold} 條）`); },
    toiletLight: () => toiletLight,
    setToiletLight: on => { setToiletLight(on); net.send({ t: 'world', toiletLight: on }); sfx.click(); },
    hasDog: () => P.dog,
    toggleDog: () => { P.dog = !P.dog; if (P.dog) { sfx.bark(); toast('🐕 你領養咗一隻柴犬！佢會跟住你'); } else toast('🐕 柴犬返咗寵物店'); syncDog(myDog, P.dog, P.pos); },
    vet: () => { if (!P.dog) return toast('你未有狗仔喎，去隔籬寵物店領養啦'); sfx.bark(); toast('🩺 獸醫：柴犬好健康！❤️'); },
    liftSpeed: i => { const L = lifts.lifts[i]; return L ? Math.sign(L.vy) : 0; },
    keyPrompt, liftCmd: (id, cmd, floor) => net.send({ t: 'lift', id, cmd, floor }),
    now: () => net.now(), playerY: () => P.pos.y,
    arrived: id => { const L = lifts.lifts[id]; if (Math.abs(P.pos.y - L.y) < 40) sfx.ding(); },
  };
  const world = buildWorld(scene, api);
  const lifts = buildLifts(scene, api);
  const staticCols = world.colliders.concat(lifts.staticCols);
  const interactables = world.interactables.concat(lifts.interactables);
  const camBlockers = [];
  scene.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && !o.material.transparent && o.position.y < 20 && o.position.y > -10) { o.geometry.computeBoundingBox(); const s = o.geometry.boundingBox.getSize(new V3()); if (Math.max(s.x, s.y, s.z) > 1.5 && Math.min(s.x, s.y, s.z) < 0.5 && o.parent === scene) camBlockers.push(o); } });
  function setToiletLight(on) { toiletLight = on; world.setToiletLight(on); }

  // ---------- 我嘅角色 ----------
  const me = buildAvatar(look); scene.add(me);
  const myDog = buildShiba(); myDog.visible = false; scene.add(myDog);
  function syncDog(dog, has, owner) { dog.visible = has; if (has) dog.position.set(owner.x + 1, owner.y, owner.z + 1); }
  function attachHeld(av, kind) {
    const u = av.userData; if (u.heldKind === kind) return;
    u.hand.clear(); u.heldKind = kind; u.held = kind;
    if (kind) { const m = itemMesh(kind); m.scale.setScalar(kind === 'ext' ? 1 : 1.3); if (kind === 'ext') m.rotation.x = Math.PI / 2, m.position.z = 0.1; u.hand.add(m); }
  }
  function setHeld(kind) {
    P.held = P.held === kind ? null : kind; attachHeld(me, P.held); renderInv();
    $('wifi').classList.toggle('hidden', P.held !== 'router');
  }

  // ---------- 背包 ----------
  const ICON = { phone: ['📱', '手機'], router: ['📶', 'Router'], ext: ['🧯', '滅火筒'] };
  function renderInv() {
    const el = $('inv'); el.innerHTML = '';
    ['phone', 'router', 'ext'].filter(k => P.inv.has(k)).forEach(k => {
      const b = document.createElement('button'); b.className = 'slot' + (P.held === k ? ' on' : '');
      b.innerHTML = `${ICON[k][0]}<small>${ICON[k][1]}</small>`; b.onclick = () => { sfx.click(); setHeld(k); };
      el.appendChild(b);
    });
  }

  // ---------- Key 對話框 ----------
  let keyCb = null, keyLift = 0;
  function keyPrompt(liftId, cb) {
    keyLift = liftId; keyCb = cb;
    $('keyTitle').textContent = `🔑 開 ${LIFT_DEF[liftId].name} 要入 Key`;
    $('keyModal').classList.remove('hidden');
  }
  document.querySelectorAll('.keyBtn').forEach(b => b.onclick = () => {
    const k = +b.dataset.k;
    $('keyModal').classList.add('hidden');
    if (k === keyLift) { sfx.beep(); toast('✅ Key 啱！'); keyCb?.(); }
    else { sfx.error(); toast(`❌ Key 唔啱！呢部係 ${LIFT_DEF[keyLift].name}`); }
    keyCb = null;
  });
  $('keyCancel').onclick = () => { $('keyModal').classList.add('hidden'); keyCb = null; };

  // ---------- 電梯面板 ----------
  let lpInput = '', panelLift = null;
  const keysEl = $('lpKeys'); keysEl.style.gridTemplateColumns = 'repeat(5,1fr)';
  const KEYS = [
    ...'12345'.split('').map(k => [k, k]), ...'67890'.split('').map(k => [k, k]),
    ['⌫', 'del'], ['C', 'clr'], ['前往 ▶', 'go', 'go', 3],
    ['M機房', 'mr'], ['🔑開', 'open'], ['關', 'close'], ['🚪緊急', 'em', 'em'], ['💥', 'boom', 'red'],
  ];
  KEYS.forEach(([label, k, cls, span]) => {
    const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; if (span) b.style.gridColumn = `span ${span}`;
    b.onclick = () => panelKey(k); keysEl.appendChild(b);
  });
  function panelKey(k) {
    const L = panelLift; if (!L) return;
    sfx.click();
    if (/^\d$/.test(k)) { if (lpInput.length < 5) lpInput = (lpInput + k).replace(/^0+/, ''); }
    else if (k === 'del') lpInput = lpInput.slice(0, -1);
    else if (k === 'clr') lpInput = '';
    else if (k === 'go') {
      const f = +lpInput;
      if (!(f >= 1 && f <= MAX_FLOOR)) { sfx.error(); toast('請輸入 1 – 10000 樓'); return; }
      if (isMoving(L.state, net.now())) { toast('電梯行緊，等陣先'); return; }
      api.liftCmd(L.id, 'goto', f); lpInput = '';
      toast(f > 1000 ? `🚀 出發去 ${f} 樓 — 大氣層 / 太空站！` : f > 100 ? `☁️ 出發去 ${f} 樓 — 上天空！` : `🛗 去 ${f} 樓`);
    }
    else if (k === 'mr') { if (isMoving(L.state, net.now())) return toast('電梯行緊'); api.liftCmd(L.id, 'goto', 0); toast('⚙️ 落電梯機房'); }
    else if (k === 'open') keyPrompt(L.id, () => api.liftCmd(L.id, 'open'));
    else if (k === 'close') api.liftCmd(L.id, 'close');
    else if (k === 'em') { api.liftCmd(L.id, 'emerg'); toast(L.state.emerg ? '🚪 關緊急出口' : '🚪 開咗緊急出口！小心跌落去'); }
    else if (k === 'boom') { net.send({ t: 'ev', kind: 'boom', lift: L.id }); doBoom(L.id); }
    $('lpInput').textContent = lpInput;
  }

  // ---------- CCTV ----------
  let cctvMode = 0; // 0 關, 1 = 1號lift, 2 = 2號lift
  $('btnCctv').onclick = () => {
    sfx.click(); cctvMode = (cctvMode + 1) % 3;
    $('btnCctv').classList.toggle('on', cctvMode > 0); $('cctvFrame').classList.toggle('hidden', cctvMode === 0);
    if (cctvMode) toast(`📹 CCTV：${LIFT_DEF[cctvMode - 1].name} 車廂`);
  };

  // ---------- 語音 ----------
  $('btnVoice').onclick = async () => {
    try {
      initAudio();
      const on = await voice.toggle();
      $('btnVoice').classList.toggle('on', on);
      toast(on ? '🎤 語音已開：你可以講嘢同聽到其他人' : '🔇 語音已關');
    } catch (e) { toast('🎤 開唔到咪：' + (e.message || e), 4000); }
  };
  $('btnFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => { }); };
  $('btnSize').onclick = () => $('sizeBox').classList.toggle('hidden');
  $('sizeRange').oninput = e => { P.scale = +e.target.value; };
  $('zoomRange').oninput = e => { camDist = +e.target.value; };

  // ---------- 手機 UI ----------
  function openPhone() {
    $('phoneUI').classList.remove('hidden');
    const d = new Date(); $('phClock').textContent = d.toTimeString().slice(0, 5);
    $('phAlt').textContent = `目前高度 ${fmtAlt(P.pos.y)}`;
    $('phList').innerHTML = `<li>${myName}（你）</li>` + [...remotes.values()].map(r => `<li>${r.name}</li>`).join('');
  }
  $('phClose').onclick = () => $('phoneUI').classList.add('hidden');

  // ---------- 輸入 ----------
  const keys = {};
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    keys[e.code] = true;
    if (e.code === 'Space') { jump(); e.preventDefault(); }
    if (e.code === 'KeyE') doAct();
    if (panelLift && /^Digit\d$/.test(e.code)) panelKey(e.code.slice(5));
    if (panelLift && e.code === 'Enter') panelKey('go');
    if (panelLift && e.code === 'Backspace') panelKey('del');
  });
  addEventListener('keyup', e => keys[e.code] = false);
  // 搖桿
  const joy = { x: 0, y: 0, id: null };
  const joyEl = $('joy'), knob = $('knob');
  function joyMove(e) {
    const r = joyEl.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const max = r.width / 2 - 10, d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / max; joy.y = -dy / max;
  }
  joyEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); e.preventDefault(); });
  joyEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = e => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  // 鏡頭拖動 / 縮放
  const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
  const cv = $('c');
  cv.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = camDist; } });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) { camYaw -= (e.clientX - p.x) * 0.006; camPitch = Math.min(1.45, Math.max(-0.35, camPitch + (e.clientY - p.y) * 0.005)); }
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) camDist = Math.min(40, Math.max(1.5, dist0 * pinch0 / d)); $('zoomRange').value = camDist; }
  });
  const ptrEnd = e => { ptrs.delete(e.pointerId); pinch0 = 0; };
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { camDist = Math.min(40, Math.max(1.5, camDist * (1 + Math.sign(e.deltaY) * 0.1))); $('zoomRange').value = camDist; e.preventDefault(); }, { passive: false });
  $('jump').addEventListener('pointerdown', e => { jump(); e.preventDefault(); });
  $('act').addEventListener('pointerdown', e => { doAct(); e.preventDefault(); });
  function jump() { if (P.grounded) { P.vy = 8; P.grounded = false; P.ride = -1; } }

  // ---------- 互動 ----------
  let curInter = null;
  function findInteract() {
    let best = null, bd = 1e9;
    for (const it of interactables) {
      if (it.show && !it.show()) continue;
      const dx = it.pos.x - P.pos.x, dz = it.pos.z - P.pos.z, dy = it.pos.y - P.pos.y;
      const d = Math.hypot(dx, dz);
      if (d < it.r && Math.abs(dy) < 2.5 && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  function useLabel() { return { ext: '🧯 噴滅火筒', phone: '📱 開手機', router: P.wifi ? '📶 熄 Wi-Fi' : '📶 開 Wi-Fi' }[P.held]; }
  function doAct() {
    if (curInter) { curInter.act(); return; }
    if (P.held === 'ext') { P.spraying = true; clearTimeout(doAct._s); doAct._s = setTimeout(() => P.spraying = false, 1200); sfx.spray(); }
    else if (P.held === 'phone') openPhone();
    else if (P.held === 'router') { P.wifi = !P.wifi; $('wifi').textContent = P.wifi ? `📶 Wi-Fi 已連接（${remotes.size + 1} 部裝置）` : '📶 Wi-Fi 已關'; toast($('wifi').textContent); }
  }

  // ---------- 特效：爆炸、消防鐘、滅火筒 ----------
  const fxN = 400, fxGeo = new THREE.BufferGeometry(), fxPos = new Float32Array(fxN * 3), fxVel = new Float32Array(fxN * 3);
  fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
  const fxMat = new THREE.PointsMaterial({ color: '#ff8a1e', size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fx = new THREE.Points(fxGeo, fxMat); fx.frustumCulled = false; scene.add(fx);
  const fxLight = new THREE.PointLight('#ff7a1a', 0, 40); scene.add(fxLight);
  let fxT = 99, fxLift = 0, shake = 0;
  function doBoom(liftId) {
    const L = lifts.lifts[liftId]; fxLift = liftId; fxT = 0;
    for (let i = 0; i < fxN; i++) {
      fxPos[i * 3] = 0; fxPos[i * 3 + 1] = L.h / 2; fxPos[i * 3 + 2] = 0;
      const v = new V3().randomDirection().multiplyScalar(2 + Math.random() * 9);
      fxVel[i * 3] = v.x; fxVel[i * 3 + 1] = v.y + 3; fxVel[i * 3 + 2] = v.z;
    }
    const d = P.pos.distanceTo(new V3(L.def.x, L.y, L.def.z));
    if (d < 300) { sfx.boom(); shake = Math.max(0.1, 1.2 - d / 60); const f = $('flash'); f.style.transition = 'none'; f.style.opacity = Math.max(0.2, 1 - d / 80); requestAnimationFrame(() => { f.style.transition = 'opacity 1.5s'; f.style.opacity = 0; }); }
    toast(`💥 ${LIFT_DEF[liftId].name} 爆炸咗！（純特效，會自動復原）`);
  }
  function doAlarm() { world.alarm(5); if (P.pos.distanceTo(new V3(world.pillarX, 0, -9.7)) < 120) sfx.alarm(5); toast('🔔 消防鐘響！'); }
  // 滅火筒噴霧（自己同其他人）
  const spN = 160, spGeo = new THREE.BufferGeometry(), spPos = new Float32Array(spN * 3), spVel = new Float32Array(spN * 3), spLife = new Float32Array(spN);
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sp = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: '#f4f8ff', size: 0.25, transparent: true, opacity: 0.8, depthWrite: false })); sp.frustumCulled = false; scene.add(sp);
  let spI = 0; const tmpV = new V3();
  function emitSpray(av) {
    av.userData.hand.getWorldPosition(tmpV); const f = av.rotation.y;
    for (let k = 0; k < 4; k++) {
      const i = spI++ % spN; spPos[i * 3] = tmpV.x; spPos[i * 3 + 1] = tmpV.y; spPos[i * 3 + 2] = tmpV.z;
      spVel[i * 3] = Math.sin(f) * 6 + (Math.random() - .5) * 1.5; spVel[i * 3 + 1] = (Math.random() - .3) * 1.2; spVel[i * 3 + 2] = Math.cos(f) * 6 + (Math.random() - .5) * 1.5; spLife[i] = 0.8;
    }
  }

  // ---------- 物理 ----------
  const RAD = 0.3, HGT = 1.7, STEP = 0.45, GRAV = 22;
  function pushOut(c) {
    const p = P.pos;
    const cx = Math.max(c.min[0], Math.min(p.x, c.max[0])), cz = Math.max(c.min[2], Math.min(p.z, c.max[2]));
    let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= RAD * RAD) return;
    if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (RAD - d) / d; p.x += dx * k; p.z += dz * k; return; }
    const pen = [p.x - c.min[0] + RAD, c.max[0] - p.x + RAD, p.z - c.min[2] + RAD, c.max[2] - p.z + RAD];
    const m = Math.min(...pen), i = pen.indexOf(m);
    if (i === 0) p.x -= m; else if (i === 1) p.x += m; else if (i === 2) p.z -= m; else p.z += m;
  }
  function physics(dt, mv) {
    const cols = staticCols.concat(lifts.dynamicColliders());
    if (P.ride >= 0) { const L = lifts.lifts[P.ride]; P.pos.y += L.y - L.prevY; }
    P.pos.x += mv.x * dt; P.pos.z += mv.z * dt;
    const prevY = P.pos.y;
    P.vy -= GRAV * dt;
    const term = Math.max(55, P.pos.y * 0.6);
    if (P.vy < -term || (P.pos.y > 150 && P.vy < -10)) P.vy = -term;
    P.pos.y += P.vy * dt;
    for (let it = 0; it < 2; it++) for (const c of cols) if (c.max[1] > Math.max(P.pos.y, prevY) + STEP && c.min[1] < P.pos.y + HGT) pushOut(c);
    let best = -Infinity, bc = null; const lim = Math.max(prevY, P.pos.y) + STEP;
    for (const c of cols) {
      if (P.pos.x < c.min[0] || P.pos.x > c.max[0] || P.pos.z < c.min[2] || P.pos.z > c.max[2]) continue;
      if (c.max[1] <= lim && c.max[1] > best) { best = c.max[1]; bc = c; }
    }
    const wasGrounded = P.grounded;
    if (bc && P.pos.y <= best + 0.001 && P.vy <= 0.01) {
      P.pos.y = best; P.vy = 0; P.grounded = true; P.ride = bc.lift ?? -1;
      if (!wasGrounded && P.fallFrom - best > 40) toast(`🪂 安全著陸！跌咗 ${fmtAlt(P.fallFrom - best)}`);
      P.fallFrom = best;
    } else { P.grounded = false; P.ride = -1; if (P.pos.y > P.fallFrom) P.fallFrom = P.pos.y; }
    if (P.pos.y < -60) { api.teleport(SPAWN.x, 0, SPAWN.z); toast('返回出生點'); }
  }

  // ---------- 遠端玩家 ----------
  function nameTag(name, voiceOn) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(4, 8, 248, 48, 20); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((voiceOn ? '🎤 ' : '') + name, 128, 33);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false })); s.scale.set(1.6, 0.4, 1); return s;
  }
  function addRemote({ id, name, look }) {
    if (remotes.has(id) || id === net.id) return;
    const av = buildAvatar(look); scene.add(av);
    const tag = nameTag(name, false); scene.add(tag);
    const dog = buildShiba(); dog.visible = false; scene.add(dog);
    remotes.set(id, { id, name, look, av, tag, dog, voiceOn: false, st: null, pos: new V3(0, -999, 0), face: 0 });
  }
  function removeRemote(id) { const r = remotes.get(id); if (!r) return; scene.remove(r.av, r.tag, r.dog); remotes.delete(id); voice.remove(id); }

  function onNet(m) {
    switch (m.t) {
      case 'welcome':
        m.lifts.forEach((s, i) => lifts.lifts[i].state = s);
        setToiletLight(m.world.toiletLight);
        m.players.forEach(p => { addRemote(p); voice.call(p.id); });
        toast(`歡迎 ${myName}！你有 Lift 1 同 Lift 2 嘅 Key 🔑`, 3500);
        break;
      case 'join': addRemote(m); toast(`👋 ${m.name} 入咗遊戲`); break;
      case 'leave': { const r = remotes.get(m.id); if (r) toast(`${r.name} 走咗`); removeRemote(m.id); break; }
      case 'snap': for (const id in m.p) { const r = remotes.get(+id); if (r) r.st = m.p[id]; } break;
      case 'lifts': m.lifts.forEach((s, i) => lifts.lifts[i].state = s); break;
      case 'world': setToiletLight(m.world.toiletLight); break;
      case 'ev': if (m.kind === 'boom') doBoom(m.lift); else if (m.kind === 'alarm') doAlarm(); break;
      case 'rtc': voice.onSignal(m.from, m.data); break;
    }
  }
  net.send({ t: 'hello', name: myName, look });
  setInterval(() => {
    const L = P.ride >= 0 ? lifts.lifts[P.ride] : null;
    net.send({ t: 'st', s: { p: [+P.pos.x.toFixed(2), +(P.pos.y - (L ? L.y : 0)).toFixed(2), +P.pos.z.toFixed(2)], rl: L ? L.id : -1, r: +P.face.toFixed(2), a: P.anim, h: P.held, dg: P.dog ? 1 : 0, sc: P.scale, sp: P.spraying ? 1 : 0, v: voice.enabled ? 1 : 0 } });
  }, 100);

  function dogFollow(dog, owner, face, dt) {
    if (!dog.visible) return;
    const tgt = new V3(owner.x - Math.sin(face) * 1.1 + Math.cos(face) * 0.6, owner.y, owner.z - Math.cos(face) * 1.1 - Math.sin(face) * 0.6);
    const d = tmpV.subVectors(tgt, dog.position); d.y = 0; const dist = d.length();
    dog.position.y = owner.y;
    if (dist > 15) dog.position.copy(tgt);
    else if (dist > 0.3) { const sp = Math.min(dist * 3, 9); dog.position.addScaledVector(d.normalize(), sp * dt); dog.rotation.y = Math.atan2(d.x, d.z); }
    animateShiba(dog, dist > 0.4, dt);
  }

  // ---------- HUD ----------
  let hudT = 0;
  function updateHUD(inCar) {
    const a = P.pos.y;
    $('floorBig').textContent = inCar ? `${LIFT_DEF[inCar.id].cargo ? '貨' : '客'}Lift ${floorLabel(Math.round(inCar.floor))}F` : (a < -1 ? '機房 M' : a < 1 ? '地面 G' : `離地 ${fmtAlt(a)}`);
    $('altTxt').textContent = fmtAlt(a);
    $('layerTxt').textContent = layerName(a);
    $('onlineTxt').textContent = remotes.size + 1;
  }

  // ================= 主迴圈 =================
  const clock = new THREE.Clock();
  const ray = new THREE.Raycaster();
  let elapsed = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    const T = net.now();
    lifts.update(dt, T);

    // 移動輸入
    let ix = joy.x, iy = joy.y;
    if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    const im = Math.hypot(ix, iy); if (im > 1) { ix /= im; iy /= im; }
    const fwd = new V3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), right = new V3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const speed = 7.5 * (0.7 + 0.3 * P.scale);
    const mv = fwd.multiplyScalar(iy * speed).addScaledVector(right, ix * speed);
    if (mv.lengthSq() > 0.01) { const tf = Math.atan2(mv.x, mv.z); let df = tf - P.face; df = Math.atan2(Math.sin(df), Math.cos(df)); P.face += df * Math.min(1, dt * 14); }
    physics(dt, mv);
    P.anim = !P.grounded && P.vy < -12 ? 2 : (mv.lengthSq() > 0.01 ? 1 : 0);

    me.position.copy(P.pos); me.rotation.y = P.face; me.scale.setScalar(P.scale);
    animateAvatar(me, P.anim, dt, Math.min(1.4, im + 0.3));
    dogFollow(myDog, P.pos, P.face, dt);
    if (P.spraying) emitSpray(me);

    // 遠端玩家
    for (const r of remotes.values()) {
      const s = r.st; if (!s) continue;
      const baseY = s.rl >= 0 ? lifts.lifts[s.rl].y : 0;
      const tgt = new V3(s.p[0], s.p[1] + baseY, s.p[2]);
      if (r.pos.distanceTo(tgt) > 8 || s.rl >= 0) { r.pos.x += (tgt.x - r.pos.x) * Math.min(1, dt * 12); r.pos.z += (tgt.z - r.pos.z) * Math.min(1, dt * 12); r.pos.y = tgt.y; if (r.pos.distanceTo(tgt) > 8) r.pos.copy(tgt); }
      else r.pos.lerp(tgt, Math.min(1, dt * 12));
      let df = s.r - r.face; df = Math.atan2(Math.sin(df), Math.cos(df)); r.face += df * Math.min(1, dt * 12);
      r.av.position.copy(r.pos); r.av.rotation.y = r.face; r.av.scale.setScalar(s.sc || 1);
      animateAvatar(r.av, s.a, dt); attachHeld(r.av, s.h);
      r.tag.position.set(r.pos.x, r.pos.y + 2.15 * (s.sc || 1), r.pos.z);
      if (!!s.v !== r.voiceOn) { r.voiceOn = !!s.v; scene.remove(r.tag); r.tag = nameTag(r.name, r.voiceOn); scene.add(r.tag); }
      if (!!s.dg !== r.dog.visible) syncDog(r.dog, !!s.dg, r.pos);
      dogFollow(r.dog, r.pos, r.face, dt);
      if (s.sp) emitSpray(r.av);
    }

    // 噴霧粒子
    for (let i = 0; i < spN; i++) {
      if (spLife[i] <= 0) { spPos[i * 3 + 1] = -1e5; continue; }
      spLife[i] -= dt; spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
    }
    spGeo.attributes.position.needsUpdate = true;
    // 爆炸粒子
    if (fxT < 3) {
      fxT += dt; const L = lifts.lifts[fxLift];
      fx.position.set(L.def.x, L.y, L.def.z); fxLight.position.set(L.def.x, L.y + 1.5, L.def.z);
      for (let i = 0; i < fxN; i++) { fxVel[i * 3 + 1] -= 6 * dt; fxPos[i * 3] += fxVel[i * 3] * dt; fxPos[i * 3 + 1] += fxVel[i * 3 + 1] * dt; fxPos[i * 3 + 2] += fxVel[i * 3 + 2] * dt; }
      fxGeo.attributes.position.needsUpdate = true;
      fxMat.opacity = Math.max(0, 1 - fxT / 2.5); fxMat.color.setHSL(0.08 - fxT * 0.02, 1, 0.55);
      fxLight.intensity = Math.max(0, 200 * (1 - fxT / 1.5));
      L.car.position.x = L.def.x + (fxT < 1.5 ? (Math.random() - 0.5) * 0.15 : 0);
    } else { fxMat.opacity = 0; fxLight.intensity = 0; }

    // 互動提示
    curInter = findInteract();
    const lbl = curInter ? curInter.label() : (P.held ? useLabel() : null);
    $('act').classList.toggle('hidden', !lbl); if (lbl && $('act').textContent !== lbl) $('act').textContent = lbl;

    // 電梯面板
    const inCar = lifts.insideCar(P.pos);
    if (inCar !== panelLift) { panelLift = inCar; lpInput = ''; $('lpInput').textContent = ''; $('liftPanel').classList.toggle('hidden', !inCar); if (inCar) $('lpTitle').textContent = `${inCar.def.name}（1–10000 樓）`; }
    if (inCar) {
      const mvg = isMoving(inCar.state, T);
      $('lpDisp').textContent = (mvg ? (inCar.state.to > inCar.state.from ? '▲ ' : '▼ ') : '') + floorLabel(Math.round(inCar.floor)) + (inCar.door > 0.5 ? ' 🚪' : '');
    }

    // 室內判斷
    const tb = world.toiletBounds;
    const inToilet = P.pos.x > tb.x0 && P.pos.x < tb.x1 && P.pos.z > tb.z0 && P.pos.z < tb.z1 && P.pos.y < tb.y1;
    world.update(dt, elapsed, P.pos, camera, inToilet);

    // 鏡頭
    const target = new V3(P.pos.x, P.pos.y + 1.5 * P.scale, P.pos.z);
    let dist = camDist * Math.max(1, P.scale * 0.8);
    const dir = new V3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch));
    ray.set(target, dir); ray.far = dist;
    const hit = ray.intersectObjects(camBlockers, false)[0];
    if (hit) dist = Math.max(0.6, hit.distance - 0.25);
    camera.position.copy(target).addScaledVector(dir, dist);
    if (P.pos.y < -1 && camera.position.y > -0.6) camera.position.y = -0.6;
    if (shake > 0) { camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; shake = Math.max(0, shake - dt * 0.8); }
    camera.lookAt(target);

    // 渲染
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    renderer.render(scene, camera);
    if (cctvMode) {
      const L = lifts.lifts[cctvMode - 1];
      const w = Math.round(Math.min(280, innerWidth * 0.3)), h = Math.round(w * 0.75), x = Math.round(innerWidth / 2 - w / 2), yTop = 10;
      L.cctvCam.aspect = w / h; L.cctvCam.updateProjectionMatrix();
      renderer.setScissorTest(true); renderer.setScissor(x, innerHeight - yTop - h, w, h); renderer.setViewport(x, innerHeight - yTop - h, w, h);
      renderer.render(scene, L.cctvCam);
      renderer.setScissorTest(false);
      const fr = $('cctvFrame'); Object.assign(fr.style, { left: x + 'px', top: yTop + 'px', width: w + 'px', height: h + 'px' });
      $('cctvLbl').textContent = `CAM-${L.id + 1} ${LIFT_DEF[L.id].name}${inCar === L ? '（你部）' : ''} ${floorLabel(Math.round(L.floor))}F ${new Date().toLocaleTimeString('zh-HK', { hour12: false })}`;
    }

    hudT += dt; if (hudT > 0.15) { hudT = 0; updateHUD(inCar); }
  }
  loop();
}
