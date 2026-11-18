// 搭 Lift 遊戲 — 主程式
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld, LIFT_DEF } from './world.js';
import { buildLifts, isMoving } from './lifts.js';
import { buildAvatar, animateAvatar, itemMesh, SKINS, SHIRTS, HATS, HAIRS, PANTS } from './avatar.js';
import { Net, Voice } from './net.js';
import { initAudio, sfx } from './audio.js';
import { altOfFloor, layerName, fmtAlt, floorLabel, MAX_FLOOR } from './alt.js';
import { buildShops } from './shops.js';
import { buildNPCs } from './npcs.js';
import { buildHotel, roomDoor, ROOM_TYPES } from './hotel.js';
import { buildPark } from './park.js';
import { playMusic, currentMusic, TRACKS } from './music.js';
import { buildBike, bikePose, buildCampers } from './vehicles.js';
import { buildAirport, Flight, buildAircraft, AIR_KINDS, RUNWAY } from './airport.js';
import { buildArena, buildMech, animateMech, inStage, KAIJU, MECHS } from './arena.js';
import { buildVillage, OX as VOX, OZ as VOZ } from './village.js';
import { HKG } from './hkg_data.js';
import { PETS, PET_CATS, petIndex, buildPet, animatePet } from './pets.js';
import { buildVault } from './vault.js';
import { buildApartments } from './apartments.js';
import { buildSchool } from './school.js';
import { TRANSIT, transitIndex, buildTransitModel, planRoute, routeAt, buildTransitStand } from './transit.js';
import { buildCity, district, DISTRICT_COLOR, DISTRICT_NAME, LANDMARKS, CHUNK, TOWN, HALF_WORLD, VILLAGE, AIRPORT, ARENA, RIVER, LOHAS, HARBOUR, TUNNELS, DISNEY, OCEAN } from './city.js';
import { buildTraffic } from './traffic.js';
import { buildEvents } from './events.js';
import { buildJail } from './jail.js';
import { buildNightLock, askPassword } from './nightlock.js';
import { buildRiver, SEATS as BOAT_SEATS, buildBoat, PATH as BOAT_PATH } from './river.js';
import { buildMTR, ENTR as MTR_ENTR } from './mtr.js';
import { ST as MTR_ST, LINES as MTR_LINES } from './mtr_data.js';
import { buildSkytrain, SKY_PATH, SKY_STATIONS } from './skytrain.js';
import { buildLohas } from './lohas.js';
import { buildLiftRoom } from './liftroom.js';
import { buildTunnels } from './tunnel.js';
import { buildLearn, MACHINES } from './learn.js';
import { buildPeds } from './peds.js';
import { buildThemeParks } from './themeparks.js';
import { junctionsNear } from './traffic.js';
import { englishVoices, voiceScore, setVoice, currentVoice, setRate, currentRate, initEnglish, unlockSpeech, say, setEnglish, englishOn, VEH, ITEM, PET_EN, numWords, article } from './english.js';

// 真實餐牌 / 價錢 / 金價（網上資料整理，喺 catalog.js）
let CATALOG = { SHOPS: {}, GOLD: { tael_buy: 30000, tael_sell: 32000 } };
try { CATALOG = await import('./catalog.js'); } catch (e) { console.warn('catalog.js 載入失敗', e); }

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches;
const V3 = THREE.Vector3;

// ================= 全屏 =================
// iPad / Android / 電腦：用 Fullscreen API；iPhone 嘅 Safari 唔支援網頁全屏，要「加入主畫面」由 icon 開先有全屏
const isIOS = /iP(hone|od|ad)/.test(navigator.platform) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function enterFullscreen(showHelp) {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) { if (showHelp) fsHelp(); return; }
  try {
    Promise.resolve(req.call(el)).then(() => { try { screen.orientation?.lock?.('landscape')?.catch?.(() => { }); } catch { } })
      .catch(() => { if (showHelp) fsHelp(); });
    // 有啲 iPad 唔會報錯但又冇全屏：半秒後檢查
    if (showHelp) setTimeout(() => { if (!fsEl()) fsHelp(); }, 700);
  } catch { if (showHelp) fsHelp(); }
}
function exitFullscreen() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f) f.call(document); }
function fsHelp() {
  let el = document.getElementById('fsHelp');
  if (!el) {
    el = document.createElement('div'); el.id = 'fsHelp';
    el.style.cssText = 'position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:12px;font-family:system-ui,sans-serif';
    document.body.appendChild(el);
  }
  const ios = isIOS;
  el.innerHTML = `<div style="background:#13233a;border:3px solid #ffc83d;border-radius:16px;color:#fff;max-width:520px;width:100%;max-height:94dvh;overflow:auto;padding:14px 18px;font-size:16px;line-height:1.5">
    <div style="font-size:20px;font-weight:700;color:#ffc83d;margin-bottom:6px">📱 點樣全屏玩？</div>
    ${ios ? `<div>iPhone 嘅 Safari <b>唔支援網頁全屏</b>（Apple 嘅限制），所以撳全屏掣冇反應。</div>
    <div style="margin-top:8px;font-weight:700">✅ 方法一（最好，真正全屏）：加入主畫面</div>
    <ol style="margin:4px 0 0 20px;padding:0"><li>喺 Safari 撳 <b>分享</b> 掣（⬆️ 方格加箭咀）</li><li>揀 <b>「加入主畫面」</b></li><li>撳 <b>「加入」</b></li><li>返去手機主畫面，撳 <b>「搭Lift」</b> 個金色圖示開遊戲 → 就會全屏，冇網址列！</li></ol>
    <div style="margin-top:8px;font-weight:700">方法二：收埋 Safari 工具列</div>
    <div>打橫部手機，撳網址列左邊嘅 <b>「aA」</b> → <b>「隱藏工具列」</b>。</div>`
    : `<div>呢個瀏覽器唔俾網頁全屏。可以試下：</div><ol style="margin:4px 0 0 20px;padding:0"><li>用 Chrome 開遊戲再撳 ⛶ 全屏</li><li>或者喺瀏覽器選單揀「加到主畫面 / 安裝 App」，之後由 icon 開就會全屏</li></ol>`}
    <button id="fsHelpOk" style="margin-top:12px;width:100%;padding:10px;border:0;border-radius:12px;background:#ffc83d;color:#222;font-size:17px;font-weight:700">知道喇</button></div>`;
  el.style.display = 'flex';
  el.querySelector('#fsHelpOk').onclick = () => el.style.display = 'none';
}

// ================= 開始畫面：角色設計 =================
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
initEnglish(store);
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
optRow($('optHair'), HAIRS.map(v => ({ v })), 'hair', (b, it) => { b.className = 'sw'; b.style.background = it.v; });
optRow($('optPants'), PANTS.map(v => ({ v })), 'pants', (b, it) => { b.className = 'sw'; b.style.background = it.v; });
rebuildPreview();

$('go').onclick = () => {
  const name = ($('name').value.trim() || '玩家' + Math.floor(Math.random() * 1000)).slice(0, 16);
  store.set('look', look); store.set('name', name);
  initAudio(); unlockSpeech();
  if (isTouch) enterFullscreen(false);
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
  const P = { pos: SPAWN.clone(), vy: 0, face: Math.PI, grounded: true, ride: -1, rideObj: null, seat: null, flight: null, mech: null, bike: false, camper: -1, lp: new V3(), scale: 1, held: null, inv: new Set(), gold: 0, dog: false, fallFrom: 0, spraying: false, anim: 0, wifi: false };
  let camYaw = 0, camPitch = 0.32, camDist = 6, firstPerson = false;
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
    pickup: (kind, obj) => { obj.visible = false; P.inv.add(kind); setHeld(kind); sfx.pickup(); renderInv(); if (ITEM[kind]) say(...ITEM[kind]); toast({ ext: '🧯 拎咗滅火筒（撳互動掣噴）', phone: '📱 拎咗手機', router: '📶 拎咗 Router' }[kind]); },
    silver: () => { E.silver = (E.silver || 0) + 1; saveEcon(); sfx.pickup(); say(...ITEM.silver, { gap: 60000 }); toast(`🥈 銀條 +1（共 ${E.silver} 條）— 可以拎去銀行賣`); },
    gold: () => { P.gold++; saveEcon(); sfx.pickup(); say(...ITEM.gold, { gap: 60000 }); toast(`🥇 金條 +1（共 ${P.gold} 條）— 可以拎去銀行存或者賣`); },
    toiletLight: () => toiletLight,
    setToiletLight: on => { setToiletLight(on); net.send({ t: 'world', toiletLight: on }); sfx.click(); },
    hasDog: () => !!P.pet,
    petName: () => P.pet ? PETS[petIndex(P.pet)].n : '',
    toggleDog: () => openPetShop(),
    vet: () => { if (!P.pet) return toast('你未有寵物喎，去隔籬寵物店領養啦'); sfx.bark(); toast(`🩺 獸醫：你隻${PETS[petIndex(P.pet)].n}好健康！❤️`); },
    liftSpeed: i => { const L = lifts.lifts[i]; return L ? Math.sign(L.vy) : 0; },
    keyPrompt, liftCmd: (id, cmd, floor) => net.send({ t: 'lift', id, cmd, floor }),
    now: () => net.now(), playerY: () => P.pos.y,
    arrived: id => { const L = lifts.lifts[id]; if (Math.abs(P.pos.y - L.y) < 40) { sfx.ding(); if (lifts.insideCar(P.pos) === L) say(`Ding! This is floor ${numWords(Math.max(1, Math.round(L.floor)))}. The doors are opening.`, `叮！${floorLabel(Math.round(L.floor))} 樓到喇，開門喇。`, { force: true }); } },
  };
  api.openShop = (key, name, colors) => openShop(key, name, colors);
  api.openBank = name => openBank(name);
  api.sfx = sfx; api.toast = (m, ms) => toast(m, ms);
  api.hotelCheckin = () => openCheckin();
  api.sleep = () => doSleep();
  api.boardRide = i => boardRide(i);
  api.enterCamper = k => enterCamper(k);
  api.startFlight = (kind, x, z, yaw, color) => startFlight(kind, x, z, yaw, color);
  api.toMech = st => toMech(st);
  api.pickMech = () => pickMech();
  const world = buildWorld(scene, api);
  const lifts = buildLifts(scene, api);
  const shops = buildShops(scene, api, CATALOG.SHOPS);
  const npcs = buildNPCs(scene, shops.spots);
  const hotel = buildHotel(scene, api);
  const park = buildPark(scene, api);
  const campers = buildCampers(scene, api);
  const airport = buildAirport(scene, api);
  const arena = buildArena(scene, api);
  const village = buildVillage(scene, { tp: (x, y, z) => api.teleport(x, y, z), aptLift: info => apartments.liftMenu(info, true) });
  api.face = f => { P.face = f; camYaw = f - Math.PI; };
  api.nap = () => blackout(() => toast('☀️ 瞓醒啦！精神晒～', 2500), 2200);
  const vault = buildVault(scene, api);
  const apartments = buildApartments(scene, api);
  api.transitPick = id => transitPick(id);
  const stand = buildTransitStand(scene, api);
  // 每玩 15 分鐘返學校上數學堂
  api.store = store;
  api.prepare = () => {
    const wasAir = !!P.flight || P.pos.y > 150;
    leaveAll();
    closeMap(); document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    return [+P.pos.x.toFixed(2), wasAir ? 0.1 : +(P.pos.y + 0.05).toFixed(2), +P.pos.z.toFixed(2)];
  };
  const school = buildSchool(scene, api);
  setTimeout(() => school.resume(), 0);
  // ===== 新功能：英文聽力、監倉、城市河、地鐵、空中輕軌、日出康城、夜晚鎖 =====
  api.say = say; api.isTouch = isTouch;
  api.pay = n => { if (E.cash < n) return false; E.cash = Math.round((E.cash - n) * 10) / 10; saveEcon(); return true; };
  api.reward = n => { E.cash = Math.round((E.cash + n) * 10) / 10; saveEcon(); };
  api.busy = () => !!(P.seat || P.flight || P.mech || P.transit || P.pass || P.boat || P.shuttle || P.cable || sky.riding() || mtr.riding());
  api.loadCity = () => city.loadAll(P.pos);
  api.blocked = () => jail.active() || nightLock.locked();
  api.boatTicket = () => boatTicket();
  api.shuttle = (k, to) => shuttle(k, to);
  api.spraying = () => P.spraying; api.pos = () => P.pos;
  const nightLock = buildNightLock({ store, sfx, toast: (m, ms) => toast(m, ms), onLock: () => { stowBike(); say('It is late at night. Time to go to bed! Good night!', '夜喇，夠鐘瞓覺喇！早唞！', { force: true }); } });
  const jail = buildJail(scene, api);
  const river = buildRiver(scene, api);
  const mtr = buildMTR(scene, api);
  const sky = buildSkytrain(scene, api);
  const lohas = buildLohas(scene, api);
  const shuttleStand = buildShuttleStand();
  const liftRoom = buildLiftRoom(scene, api);
  const tunnels = buildTunnels(scene, api);
  const themeParks = buildThemeParks(scene, api, park.rides);
  const learn = buildLearn({ say, sfx });
  const acDisplay = buildACDisplay();
  api.machineRoom = (name, backFn) => { leaveAll(); liftRoom.enter(name, backFn); };
  setTimeout(() => jail.resume(), 0);
  campers.list.forEach(c => c.inter.show = () => P.camper !== c.k);
  const staticCols = world.colliders.concat(lifts.staticCols, shops.colliders, hotel.colliders, park.colliders, airport.colliders, arena.colliders, village.colliders, vault.colliders, apartments.colliders, stand.colliders, school.colliders, jail.colliders, river.colliders, mtr.colliders, sky.colliders, lohas.colliders, shuttleStand.colliders, liftRoom.colliders, tunnels.colliders, themeParks.colliders, acDisplay.colliders);
  const interactables = world.interactables.concat(lifts.interactables, shops.interactables, hotel.interactables, park.interactables, campers.interactables, airport.interactables, arena.interactables, village.interactables, vault.interactables, apartments.interactables, stand.interactables, river.interactables, mtr.interactables, sky.interactables, lohas.interactables, shuttleStand.interactables, liftRoom.interactables, tunnels.interactables, themeParks.interactables);
  // 碰撞格仔（酒店有幾千個碰撞盒，只計玩家附近嗰啲）
  const GRID = 8, grid = new Map(), bigCols = [];
  const isBig = c => c.max[0] - c.min[0] > 200 || c.max[2] - c.min[2] > 200;
  function forCells(c, fn) {
    for (let gx = Math.floor(c.min[0] / GRID); gx <= Math.floor(c.max[0] / GRID); gx++)
      for (let gz = Math.floor(c.min[2] / GRID); gz <= Math.floor(c.max[2] / GRID); gz++) fn(gx * 100003 + gz);
  }
  function gridAdd(list) {
    for (const c of list) { if (isBig(c)) { bigCols.push(c); continue; } forCells(c, k => { let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(c); }); }
  }
  function gridRemove(list) {
    const set = new Set(list);
    for (const c of list) { if (isBig(c)) continue; forCells(c, k => { const l = grid.get(k); if (!l) return; const f = l.filter(x => !set.has(x)); if (f.length) grid.set(k, f); else grid.delete(k); }); }
  }
  gridAdd(staticCols);
  // 大地圖（10 公里 × 10 公里，分區載入）
  const city = buildCity(scene, { add: gridAdd, remove: gridRemove });
  api.city = city;
  const traffic = buildTraffic(scene, api);
  const events = buildEvents(scene, api);
  const peds = buildPeds(scene, api);
  let colStamp = 0;
  function nearCols(x, z, r, withBig = true) {
    colStamp++; const out = withBig ? bigCols.slice() : [];
    for (let gx = Math.floor((x - r) / GRID); gx <= Math.floor((x + r) / GRID); gx++)
      for (let gz = Math.floor((z - r) / GRID); gz <= Math.floor((z + r) / GRID); gz++) {
        const l = grid.get(gx * 100003 + gz); if (!l) continue;
        for (const c of l) if (c._s !== colStamp) { c._s = colStamp; out.push(c); }
      }
    return out;
  }
  const camBlockers = [];
  scene.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && !o.material.transparent && o.position.y < 20 && o.position.y > -10) { o.geometry.computeBoundingBox(); const s = o.geometry.boundingBox.getSize(new V3()); if (Math.max(s.x, s.y, s.z) > 1.5 && Math.min(s.x, s.y, s.z) < 0.5 && o.parent === scene) camBlockers.push(o); } });
  function setToiletLight(on) { toiletLight = on; world.setToiletLight(on); }

  // ================= 錢包 / 銀行 / 背包（存喺呢部機嘅瀏覽器）=================
  const E = Object.assign({ cash: 100, save: 0, vault: 0, gold: 0, silver: 0, bag: {} }, store.get('econ', {}));
  P.gold = E.gold;
  const money = n => 'HK$' + (Math.round(n * 10) / 10).toLocaleString('en-HK');
  function saveEcon() {
    E.gold = P.gold; store.set('econ', E);
    $('goldTxt').textContent = P.gold; $('silverTxt').textContent = E.silver || 0; $('cashTxt').textContent = money(E.cash);
  }
  saveEcon();
  const GOLD = CATALOG.GOLD || {};
  const goldBuy = GOLD.tael_buy || GOLD.gram_buy * 37.429 || 30000;   // 銀行收購價（每両）
  const goldSell = GOLD.tael_sell || goldBuy * 1.05;
  const SILVER_BUY = 280;   // 銀條收購價（每両，估算：國際銀價約每安士 US$31 × 1.2 安士 × 7.8 再減手續費）
  const closeModal = id => $(id).classList.add('hidden');
  // 通用選擇視窗：opts = [{ label, sub, fn, on, head }]
  function choose(title, opts, sub = '', minW = 240) {
    $('chTitle').textContent = title; $('chSub').textContent = sub;
    const box = $('chOpts'); box.innerHTML = ''; box.style.setProperty('--chw', minW + 'px');
    opts.forEach(o => {
      if (o.head) { const h = document.createElement('div'); h.className = 'chHead'; h.textContent = o.head; box.appendChild(h); return; }
      const b = document.createElement('button'); b.className = 'keyBtn' + (o.on ? ' on' : '');
      b.textContent = o.label; if (o.sub) { const sm = document.createElement('small'); sm.textContent = o.sub; b.appendChild(sm); }
      b.onclick = () => { sfx.click(); if (!o.keep) closeModal('chooseModal'); o.fn(); };
      box.appendChild(b);
    });
    $('chooseModal').classList.remove('hidden'); box.scrollTop = 0;
  }
  $('chClose').onclick = () => closeModal('chooseModal');
  api.choose = choose;

  // ---------- 商店 / 餐廳 ----------
  let shopKey = null, shopCat = '全部';
  const cart = new Map();
  function openShop(key, name, colors) {
    const data = CATALOG.SHOPS[key] || {};
    shopKey = key; shopCat = '全部'; cart.clear();
    const box = $('shopModal').querySelector('.box');
    box.style.setProperty('--shopC', colors[0]); box.style.setProperty('--shopT', colors[1] === '#ffffff' ? '#fff' : colors[1]);
    $('shopName').textContent = `${data.name || name}${data.en ? ' ' + data.en : ''}`;
    if (!(data.items || []).length) { toast('呢間舖暫時未有貨品資料'); return; }
    renderShop(); $('shopModal').classList.remove('hidden'); sfx.click();
    if (/parknshop|wellcome|market/.test(key)) say('Hello! Welcome to the supermarket. What would you like to buy today?', '你好！歡迎光臨超級市場，今日想買啲咩？', { key: 'shop' + key });
    else say('Hello! Welcome. What would you like to eat? Our burgers and drinks are very nice.', '你好！歡迎光臨，想食啲咩？', { key: 'shop' + key });
  }
  function renderShop() {
    const items = CATALOG.SHOPS[shopKey].items;
    const cats = ['全部', ...new Set(items.map(i => i.cat || '其他'))];
    $('shopTabs').innerHTML = '';
    cats.forEach(c => { const b = document.createElement('button'); b.textContent = c; if (c === shopCat) b.className = 'on'; b.onclick = () => { shopCat = c; renderShop(); }; $('shopTabs').appendChild(b); });
    $('shopItems').innerHTML = '';
    items.filter(i => shopCat === '全部' || (i.cat || '其他') === shopCat).forEach(it => {
      const b = document.createElement('button'); b.className = 'item';
      b.innerHTML = `<span class="em">${it.e || '🛍️'}</span><span class="nm">${it.n}</span><span class="pr">$${it.p}${it.est ? '<small style="opacity:.6"> 約</small>' : ''}</span>`;
      b.onclick = () => { cart.set(it.n, { it, q: (cart.get(it.n)?.q || 0) + 1 }); sfx.beep(); renderCart(); };
      $('shopItems').appendChild(b);
    });
    renderCart();
  }
  function cartTotal() { let t = 0; for (const { it, q } of cart.values()) t += it.p * q; return Math.round(t * 10) / 10; }
  function renderCart() {
    $('shopCash').textContent = `💵 ${money(E.cash)}`;
    const el = $('cartList'); el.innerHTML = cart.size ? '' : '<div style="opacity:.6">撳左邊貨品加入</div>';
    for (const [n, { it, q }] of cart) {
      const row = document.createElement('div'); row.className = 'cl';
      row.innerHTML = `<span>${it.e || ''} ${n}</span><button>−</button><b>${q}</b><button>+</button>`;
      const [minus, plus] = row.querySelectorAll('button');
      minus.onclick = () => { if (q <= 1) cart.delete(n); else cart.set(n, { it, q: q - 1 }); renderCart(); };
      plus.onclick = () => { cart.set(n, { it, q: q + 1 }); renderCart(); };
      el.appendChild(row);
    }
    $('cartTotal').textContent = `合計 ${money(cartTotal())}`;
  }
  $('checkout').onclick = () => {
    const total = cartTotal();
    if (!cart.size) return toast('購物籃係空嘅');
    if (total > E.cash) { sfx.error(); return toast(`💸 唔夠錢！要 ${money(total)}，你得 ${money(E.cash)}。去銀行賣金條或者提錢啦`, 3500); }
    E.cash = Math.round((E.cash - total) * 10) / 10;
    let count = 0;
    for (const [n, { it, q }] of cart) { const b = E.bag[n] || { e: it.e, c: 0, shop: shopKey, cat: it.cat }; b.c += q; E.bag[n] = b; count += q; }
    cart.clear(); saveEcon(); sfx.pickup(); renderCart();
    toast(`🧾 多謝惠顧！共 ${count} 件，${money(total)}，已放入🎒背包`, 3000);
    say(`That will be ${numWords(Math.round(total))} dollars, please. Thank you very much! Have a nice day!`, `一共 ${money(total)}，多謝惠顧！祝你有美好嘅一日！`, { force: true });
  };
  $('shopClose').onclick = () => closeModal('shopModal');

  // ---------- 背包 ----------
  const nonFood = /日用|清潔|紙|家居|個人護理|洗|用品/;
  function renderBag() {
    const el = $('bagList'); el.innerHTML = '';
    const row = (em, name, btn, fn) => { const d = document.createElement('div'); d.className = 'item'; d.innerHTML = `<span class="em">${em}</span><span class="nm"></span><span></span><button class="opt">${btn}</button>`; d.querySelector('.nm').textContent = name; d.querySelector('button').onclick = () => { sfx.click(); fn(); renderBag(); }; el.appendChild(d); };
    if (P.pet) { const pt = PETS[petIndex(P.pet)]; row(pt.e, `${pt.n}（跟住你）`, '🎒 收埋', () => { E.petBag = P.pet; setMyPet(null); saveEcon(); toast(`🎒 ${pt.n}收咗入背包，唔會再顯示`); }); }
    else if (E.petBag && petIndex(E.petBag) >= 0) { const pt = PETS[petIndex(E.petBag)]; row(pt.e, `${pt.n}（喺背包入面）`, '🐾 放出嚟', () => { setMyPet(E.petBag); E.petBag = null; saveEcon(); sfx.bark(); toast(`${pt.e} ${pt.n}出嚟喇，會跟住你`); }); }
    if (E.bikeBag) row('🏍', '電單車（喺背包入面）', '🏍 拎出嚟揸', () => { closeModal('bagModal'); rideFromBag(); });
    else if (P.bike) row('🏍', '電單車（揸緊）', '🎒 收埋', () => bikeToBag());
    else { const pb = PARK.find(v => v.k === 'bike'); if (pb) row('🏍', `電單車（泊咗喺${dirName(pb.x - P.pos.x, pb.z - P.pos.z)}面 ${Math.round(Math.hypot(pb.x - P.pos.x, pb.z - P.pos.z))} 米）`, '🎒 收返入背包', () => { dropParked(pb); E.bikeBag = true; saveEcon(); toast('🎒 電單車收返入背包'); }); }
    const entries = Object.entries(E.bag).filter(([, b]) => b.c > 0);
    if (!entries.length) el.insertAdjacentHTML('beforeend', '<div style="padding:10px;opacity:.7">食物 / 用品：空空如也。去餐廳或者超市買嘢啦！</div>');
    entries.forEach(([n, b]) => {
      const use = nonFood.test(b.cat || '') ? '用' : /飲|茶|咖啡|奶|汽水|果汁/.test((b.cat || '') + n) ? '飲' : '食';
      const d = document.createElement('div'); d.className = 'item';
      d.innerHTML = `<span class="em">${b.e || '🛍️'}</span><span class="nm">${n}</span><span>x ${b.c}</span><button class="opt">${use}</button>`;
      d.querySelector('button').onclick = () => {
        b.c--; if (b.c <= 0) delete E.bag[n]; saveEcon(); sfx.pickup();
        toast(use === '用' ? `🧻 用咗 ${n}` : use === '飲' ? `🥤 飲咗 ${n}，好解渴！` : `😋 食咗 ${n}，好味！`); renderBag();
        say(use === '用' ? 'All clean now!' : use === '飲' ? 'Ahh! This drink is so refreshing.' : 'Yummy! This is delicious.', use === '用' ? '乾淨晒！' : use === '飲' ? '好解渴！' : '好好味！', { gap: 8000 });
      };
      el.appendChild(d);
    });
  }
  $('btnBag').onclick = () => { renderBag(); $('bagModal').classList.remove('hidden'); sfx.click(); };
  $('bagClose').onclick = () => closeModal('bagModal');

  // ---------- 銀行 ----------
  function openBank(name) { $('bankName').textContent = name; $('bankMsg').textContent = ''; renderBank(); $('bankModal').classList.remove('hidden'); sfx.click(); }
  function renderBank() {
    $('bCash').textContent = money(E.cash); $('bSave').textContent = money(E.save);
    $('bSilver').textContent = `${E.silver || 0} 條`; $('silverPrice').textContent = `銀價（每條 = 1 両 / 37.429 克）：銀行收購約 ${money(SILVER_BUY)}（估算參考價）`;
    $('bGold').textContent = `${P.gold} 條`; $('bVault').textContent = `${E.vault} 條`; $('bVaultS').textContent = `${E.vaultS || 0} 條`;
    $('goldPrice').textContent = `今日金價（每條 = 1 両 / 37.429 克 足金）：銀行收購 ${money(goldBuy)}｜賣出 ${money(goldSell)}${GOLD.date ? '（' + GOLD.date + ' 參考價）' : ''}`;
    $('bankModal').querySelector('.box').style.setProperty('--shopC', '#0b4f8a');
  }
  const bankActions = {
    depGold1: () => P.gold > 0 ? (P.gold--, E.vault++, '🥇 存咗 1 條金條入保險箱') : '你身上冇金條',
    depGoldAll: () => { if (!P.gold) return '你身上冇金條'; const n = P.gold; E.vault += n; P.gold = 0; return `🥇 存咗 ${n} 條金條入保險箱`; },
    wdGold1: () => E.vault > 0 ? (E.vault--, P.gold++, '🥇 由保險箱攞咗 1 條金條') : '保險箱冇金條',
    sell1: () => sellBars('g', 1), sellAll: () => sellBars('g', Infinity),
    sellS1: () => sellBars('s', 1), sellSAll: () => sellBars('s', Infinity),
    dep100: () => dep(100), dep1000: () => dep(1000), depAll: () => dep(E.cash),
    wd100: () => wd(100), wd1000: () => wd(1000), wdAll: () => wd(E.save),
  };
  // 賣金條 / 銀條：先賣身上嘅，身上冇就由保險箱直接賣（唔使再自己入金庫拎）
  function sellBars(kind, n) {
    const gold = kind === 'g', price = gold ? goldBuy : SILVER_BUY, nm = gold ? '金條' : '銀條';
    let hand = gold ? P.gold : (E.silver || 0), box = gold ? E.vault : (E.vaultS || 0);
    if (hand + box <= 0) { sfx.error(); return `你身上同保險箱都冇${nm}可以賣。去公園執，或者喺機場 / 屋苑搵下！`; }
    const fromHand = Math.min(hand, n), fromBox = Math.min(box, n - fromHand), k = fromHand + fromBox;
    if (gold) { P.gold -= fromHand; E.vault -= fromBox; } else { E.silver = hand - fromHand; E.vaultS = box - fromBox; }
    E.cash = Math.round((E.cash + k * price) * 10) / 10; saveEcon(); sfx.pickup();
    say(`You sold ${numWords(k)} ${gold ? 'gold' : 'silver'} bar${k > 1 ? 's' : ''}. Here is ${numWords(Math.round(k * price))} dollars.`, `你賣咗 ${k} 條${nm}，收到 ${money(k * price)}。`, { force: true });
    return `${gold ? '💰' : '🥈'} 賣咗 ${k} 條${nm}${fromBox ? `（其中 ${fromBox} 條由保險箱直接賣）` : ''}，收到 ${money(k * price)}`;
  }
  function sellMenu(name) {
    const back = () => sellMenu(name), show = m => { toast(m, 3500); renderBank(); back(); };
    choose('💰 賣金條 / 銀條', [
      { head: `🥇 金條：每條收購 ${money(goldBuy)}` },
      { label: '🥇 賣 1 條金條', sub: `身上 ${P.gold} 條｜保險箱 ${E.vault} 條`, fn: () => show(sellBars('g', 1)) },
      { label: '🥇 全部金條賣晒', sub: `共 ${P.gold + E.vault} 條 = ${money((P.gold + E.vault) * goldBuy)}`, fn: () => show(sellBars('g', Infinity)) },
      { head: `🥈 銀條：每條收購 ${money(SILVER_BUY)}` },
      { label: '🥈 賣 1 條銀條', sub: `身上 ${E.silver || 0} 條｜保險箱 ${E.vaultS || 0} 條`, fn: () => show(sellBars('s', 1)) },
      { label: '🥈 全部銀條賣晒', sub: `共 ${(E.silver || 0) + (E.vaultS || 0)} 條 = ${money(((E.silver || 0) + (E.vaultS || 0)) * SILVER_BUY)}`, fn: () => show(sellBars('s', Infinity)) },
    ], `${name}｜身上現金 ${money(E.cash)}`, 200);
  }
  function dep(a) { a = Math.min(a, E.cash); if (a <= 0) return '你身上冇現金'; E.cash -= a; E.save += a; return `🏦 存入 ${money(a)}`; }
  function wd(a) { a = Math.min(a, E.save); if (a <= 0) return '戶口冇錢'; E.save -= a; E.cash += a; return `🏧 提取 ${money(a)}`; }
  document.querySelectorAll('#bankModal [data-b]').forEach(b => b.onclick = () => {
    const msg = bankActions[b.dataset.b]();
    E.cash = Math.round(E.cash * 10) / 10; E.save = Math.round(E.save * 10) / 10;
    saveEcon(); renderBank(); $('bankMsg').textContent = msg; sfx.beep();
  });
  $('bankClose').onclick = () => closeModal('bankModal');
  // 櫃位職員：揀服務
  function bankTeller(name) {
    say('Good morning! How can I help you today? Would you like to take out money, or open your safe deposit box?', '早晨！今日有咩可以幫到你？想提錢，定係打開保險箱？', { force: true });
    choose(`🙋 ${name}職員：你好！請問今日要咩服務？`, [
      { label: '💰 賣金條 / 銀條', sub: '身上或者保險箱入面嘅金條、銀條都賣得，即刻收現金', fn: () => sellMenu(name) },
      { label: '💵 提錢 / 存錢', sub: '現金戶口：提款、存款', fn: () => openBank(name) },
      { label: '🔐 打開保險箱', sub: '職員帶你入金庫，親眼睇住你嘅保險箱，放入金條或者銀條（唔可以放現金）', fn: () => enterVault() },
      { label: '📈 查詢今日金價', sub: '每條 1 両（37.429 克）', fn: () => toast(`📈 金條：銀行收購 ${money(goldBuy)}｜賣出 ${money(goldSell)}；銀條收購約 ${money(SILVER_BUY)}`, 4500) },
    ], `身上現金 ${money(E.cash)}｜戶口 ${money(E.save)}｜身上金條 ${P.gold}、銀條 ${E.silver || 0}｜保險箱金條 ${E.vault}、銀條 ${E.vaultS || 0}`);
  }
  // 黑畫面過場（搭 Lift、入金庫、上車）
  function blackout(fn, ms = 900) {
    const f = $('flash'); f.style.transition = 'opacity .35s'; f.style.background = '#000'; f.style.opacity = 1;
    setTimeout(() => { fn(); f.style.opacity = 0; setTimeout(() => { f.style.background = ''; f.style.transition = ''; }, 450); }, ms);
  }
  api.blackout = blackout;
  let vaultBack = null;
  function enterVault() {
    vaultBack = P.pos.clone(); vault.setContents(E.vault, E.vaultS || 0);
    toast('👩‍💼 職員：請跟我嚟，金庫喺地庫，要過兩道閘…', 2200); sfx.door();
    say('Please follow me. This is the safe deposit box room. You can keep gold bars and silver bars here, but not cash.', '請跟我嚟。呢度係保險箱室，可以放金條同銀條，但唔可以放現金。', { force: true });
    blackout(() => { api.teleport(vault.entry.x, vault.entry.y, vault.entry.z); P.face = Math.PI; camYaw = 0; toast('🔐 你入咗金庫。行去中間張枱就可以打開你嘅保險箱', 3500); }, 900);
  }
  function leaveVault() {
    const b = vaultBack || new V3(50, 0, 41);
    sfx.door(); api.teleport(b.x, 0.05, b.z); toast('🏦 返到銀行大堂');
  }
  function vaultMenu() {
    const n = (v) => v || 0;
    const mv = (msg) => { E.vaultS = n(E.vaultS); saveEcon(); vault.setContents(E.vault, E.vaultS); sfx.pickup(); toast(msg); vaultMenu(); };
    const no = (msg) => { sfx.error(); toast(msg, 3000); vaultMenu(); };
    choose('🔐 你嘅保險箱 No.0888', [
      { head: '放入保險箱' },
      { label: '🥇 放 1 條金條', fn: () => P.gold > 0 ? (P.gold--, E.vault++, mv('🥇 放咗 1 條金條入保險箱')) : no('你身上冇金條') },
      { label: '🥇 全部金條放入', fn: () => { if (!P.gold) return no('你身上冇金條'); const k = P.gold; E.vault += k; P.gold = 0; mv(`🥇 放咗 ${k} 條金條入保險箱`); } },
      { label: '🥈 放 1 條銀條', fn: () => n(E.silver) > 0 ? (E.silver--, E.vaultS = n(E.vaultS) + 1, mv('🥈 放咗 1 條銀條入保險箱')) : no('你身上冇銀條') },
      { label: '🥈 全部銀條放入', fn: () => { const k = n(E.silver); if (!k) return no('你身上冇銀條'); E.vaultS = n(E.vaultS) + k; E.silver = 0; mv(`🥈 放咗 ${k} 條銀條入保險箱`); } },
      { label: '💵 放現金入去', sub: '保險箱唔收現金', fn: () => no('❌ 保險箱唔可以存放現金！現金請返櫃位存入戶口') },
      { head: '由保險箱拎出嚟' },
      { label: '🥇 拎 1 條金條', fn: () => E.vault > 0 ? (E.vault--, P.gold++, mv('🥇 拎咗 1 條金條出嚟')) : no('保險箱冇金條') },
      { label: '🥇 全部金條拎走', fn: () => { if (!E.vault) return no('保險箱冇金條'); const k = E.vault; P.gold += k; E.vault = 0; mv(`🥇 拎咗 ${k} 條金條出嚟`); } },
      { label: '🥈 拎 1 條銀條', fn: () => n(E.vaultS) > 0 ? (E.vaultS--, E.silver = n(E.silver) + 1, mv('🥈 拎咗 1 條銀條出嚟')) : no('保險箱冇銀條') },
      { label: '🥈 全部銀條拎走', fn: () => { const k = n(E.vaultS); if (!k) return no('保險箱冇銀條'); E.silver = n(E.silver) + k; E.vaultS = 0; mv(`🥈 拎咗 ${k} 條銀條出嚟`); } },
    ], `保險箱入面：🥇 金條 ${E.vault} 條、🥈 銀條 ${n(E.vaultS)} 條
你身上：🥇 金條 ${P.gold} 條、🥈 銀條 ${n(E.silver)} 條、💵 現金 ${money(E.cash)}`, 200);
  }
  api.bankTeller = bankTeller; api.vaultMenu = vaultMenu; api.leaveVault = leaveVault;

  // ---------- 我嘅角色 ----------
  const me = buildAvatar(look); scene.add(me);
  // ---------- 寵物（狗、貓、野獸、農場動物）----------
  let myDog = null;
  function setPetModel(holder, key, id, owner) {
    // holder[key] = 寵物模型；id 換咗就重新砌
    const cur = holder[key];
    if (cur && cur.userData.id === id) return;
    if (cur) scene.remove(cur);
    holder[key] = null;
    if (!id) return;
    const g = buildPet(id); scene.add(g); holder[key] = g;
    const sz = g.userData.size; g.position.set(owner.x + 1 + sz * 0.5, owner.y, owner.z + 1 + sz * 0.5);
  }
  const myPetHolder = {};
  function setMyPet(id) { P.pet = id; store.set('pet', id || ''); setPetModel(myPetHolder, 'g', id, P.pos); myDog = myPetHolder.g; }
  function openPetShop() {
    const opts = [];
    if (P.pet) opts.push({ label: `🔙 送 ${PETS[petIndex(P.pet)].n} 返寵物店`, sub: '之後可以再揀過另一隻', fn: () => { const n = PETS[petIndex(P.pet)].n; setMyPet(null); toast(`🐾 ${n}返咗寵物店`); } });
    for (const [cat, title] of PET_CATS) {
      opts.push({ head: title });
      PETS.filter(p => p.cat === cat).forEach(p => opts.push({ label: `${p.e} ${p.n}`, sub: PET_EN[p.id] || '', on: P.pet === p.id, fn: () => { setMyPet(p.id); sfx.bark(); toast(`${p.e} 你領養咗${p.n}！佢會跟住你`, 3000); say(`This is ${article(PET_EN[p.id] || 'pet')}. Please take good care of it!`, `呢隻係${p.n}，要好好照顧佢呀！`, { force: true }); } }));
    }
    say('Welcome to the pet shop! Which animal would you like to adopt?', '歡迎嚟到寵物店！你想領養邊隻動物？');
    choose('🐾 寵物店：揀一隻寵物', opts, `狗有 ${PETS.filter(p => p.cat === 'dog').length} 個品種，仲有貓、獅子、老虎、大猩猩、大笨象等等。一次養一隻，跟住你周圍行。`, 150);
  }
  { const saved = store.get('pet', ''); if (saved && petIndex(saved) >= 0) setTimeout(() => setMyPet(saved), 0); }
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
    ['⚙️ 入 Lift 頂機房睇零件（學英文）', 'top', 'go', 5],
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
      say(`Going ${f > L.floor ? 'up' : 'down'} to floor ${numWords(f)}.`, `${f > L.floor ? '上' : '落'}去 ${f} 樓。`, { force: true });
      toast(f > 1000 ? `🚀 出發去 ${f} 樓 — 大氣層 / 太空站！` : f > 100 ? `☁️ 出發去 ${f} 樓 — 上天空！` : `🛗 去 ${f} 樓`);
    }
    else if (k === 'top') { const L2 = L; api.machineRoom(L2.def.name, () => { api.teleport(L2.def.x, L2.y + 0.1, L2.def.z); }); }
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
  function toggleFP() {
    firstPerson = !firstPerson; sfx.click();
    $('btnFP').classList.toggle('on', firstPerson);
    if (firstPerson) camPitch = 0; else camPitch = Math.max(camPitch, -0.2) || 0.32;
    toast(firstPerson ? '👁 第一身視角（拖畫面望四周，向上拖望天）' : '🎥 第三身視角');
  }
  $('btnFP').onclick = toggleFP;
  addEventListener('keydown', e => { if (e.code === 'KeyV' && e.target.tagName !== 'INPUT') toggleFP(); });
  $('btnFull').onclick = () => {
    sfx.click();
    if (fsEl()) return exitFullscreen();
    if (isStandalone()) return toast('📱 而家已經係全屏 App 模式', 2500);
    const hasApi = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
    if (!hasApi && isIOS && store.get('fsHelpSeen', false)) return toast('📱 iPhone Safari 唔俾網頁全屏（Apple 限制）\n用主畫面「搭Lift」圖示開就全屏；或者撳 aA →「隱藏工具列」', 5000);
    if (!hasApi && isIOS) store.set('fsHelpSeen', true);
    enterFullscreen(true);
  };
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
    if (ptrs.size === 1) { camYaw -= (e.clientX - p.x) * 0.006; camPitch = Math.min(1.45, Math.max(firstPerson ? -1.45 : -1.2, camPitch + (e.clientY - p.y) * 0.005)); }
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) camDist = Math.min(40, Math.max(1.5, dist0 * pinch0 / d)); $('zoomRange').value = camDist; }
  });
  const tapAt = new Map();
  cv.addEventListener('pointerdown', e => tapAt.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }));
  cv.addEventListener('pointerup', e => {
    const d = tapAt.get(e.pointerId); tapAt.delete(e.pointerId);
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 450) return;
    if (!liftRoom.inside(P.pos)) return;
    const r = cv.getBoundingClientRect();
    liftRoom.pick(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  });
  const ptrEnd = e => { ptrs.delete(e.pointerId); pinch0 = 0; };
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { camDist = Math.min(40, Math.max(1.5, camDist * (1 + Math.sign(e.deltaY) * 0.1))); $('zoomRange').value = camDist; e.preventDefault(); }, { passive: false });
  $('jump').addEventListener('pointerdown', e => { jump(); e.preventDefault(); });
  $('act').addEventListener('pointerdown', e => { doAct(); e.preventDefault(); });
  function jump() {
    if (P.flight || P.transit || P.boat || P.shuttle || P.cable || sky.riding()) return; if (P.seat) return leaveRide();
    if (P.mech) { P.vy = Math.min(26, Math.max(P.vy, 0) + 13); P.grounded = false; P.ride = -1; P.rideObj = null; P.mech.jetT = 0.6; sfx.jet(); return; }
    if (P.grounded) { P.vy = P.mech ? 16 : 8; P.grounded = false; P.ride = -1; P.rideObj = null; } }

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
    if (P.boat) return endBoat(true);
    if (P.shuttle) { P.shuttle.t = P.shuttle.dur; return; }
    if (sky.riding()) return sky.alight();
    if (P.cable) return leaveCable();
    if (mtr.riding() && !curInter) return mtr.skip();
    if (P.transit) return endTransit(true);
    if (P.pass) return leavePass();
    if (P.flight) return exitFlight();
    if (P.seat) return leaveRide();
    if (P.mech && !curInter) return mechPunch();
    if (curInter) { curInter.act(); return; }
    if (!P.held && !bikeOn && peds.nearest(P.pos, P.face)) return doPunch();
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
  function physics(dt, mv, colsOverride) {
    const cols = colsOverride || nearCols(P.pos.x, P.pos.z, 3).concat(lifts.dynamicColliders(), hotel.dynamicColliders(), traffic.colliders());
    if (P.rideObj) P.pos.y += P.rideObj.y - P.rideObj.prevY;
    P.pos.x += mv.x * dt; P.pos.z += mv.z * dt;
    const prevY = P.pos.y;
    P.vy -= (P.mech ? 12 : GRAV) * dt;
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
      P.pos.y = best; P.vy = 0; P.grounded = true; P.ride = bc.lift ?? -1; P.rideObj = bc.lift !== undefined ? lifts.lifts[bc.lift] : (bc.mv || null);
      if (!wasGrounded && P.fallFrom - best > 40) toast(`🪂 安全著陸！跌咗 ${fmtAlt(P.fallFrom - best)}`);
      P.fallFrom = best;
    } else { P.grounded = false; P.ride = -1; P.rideObj = null; if (P.pos.y > P.fallFrom) P.fallFrom = P.pos.y; }
    if (!colsOverride && P.pos.y < -60) { api.teleport(SPAWN.x, 0, SPAWN.z); toast('返回出生點'); }
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
    const dog = null;
    remotes.set(id, { id, name, look, av, tag, dog, voiceOn: false, st: null, pos: new V3(0, -999, 0), face: 0 });
  }
  function removeRemote(id) { const r = remotes.get(id); if (!r) return; scene.remove(r.av, r.tag); if (r.dog) scene.remove(r.dog); remotes.delete(id); voice.remove(id); }

  function onNet(m) {
    switch (m.t) {
      case 'welcome':
        m.lifts.forEach((s, i) => i < 2 ? lifts.lifts[i].state = s : hotel.setState(i - 2, s));
        setToiletLight(m.world.toiletLight);
        m.players.forEach(p => { addRemote(p); voice.call(p.id); });
        toast(`歡迎 ${myName}！你有 Lift 1 同 Lift 2 嘅 Key 🔑`, 3500);
        break;
      case 'join': addRemote(m); toast(`👋 ${m.name} 入咗遊戲`); break;
      case 'leave': { const r = remotes.get(m.id); if (r) toast(`${r.name} 走咗`); removeRemote(m.id); break; }
      case 'snap': for (const id in m.p) { const r = remotes.get(+id); if (r) r.st = m.p[id]; } if (m.m) { arena.setMonster(m.m); monSt = m.m; } break;
      case 'lifts': m.lifts.forEach((s, i) => i < 2 ? lifts.lifts[i].state = s : hotel.setState(i - 2, s)); break;
      case 'world': setToiletLight(m.world.toiletLight); break;
      case 'ev': if (m.kind === 'boom') doBoom(m.lift); else if (m.kind === 'alarm') doAlarm(); else if (m.kind && m.kind[0] === 'k') kaijuEvent(m); break;
      case 'rtc': voice.onSignal(m.from, m.data); break;
    }
  }
  net.send({ t: 'hello', name: myName, look });
  setInterval(() => {
    const L = P.ride >= 0 ? lifts.lifts[P.ride] : null;
    net.send({ t: 'st', s: { p: [+P.pos.x.toFixed(2), +(P.pos.y - (L ? L.y : 0)).toFixed(2), +P.pos.z.toFixed(2)], rl: L ? L.id : -1, r: +P.face.toFixed(2), a: P.anim, h: P.held, dg: P.pet ? petIndex(P.pet) + 1 : 0, sc: P.scale, sp: P.spraying ? 1 : 0, v: voice.enabled ? 1 : 0, sd: P.seat ? [P.seat.r, P.seat.s] : 0, bk: bikeOn ? 1 : 0, fl: P.flight ? [AIR_KINDS.indexOf(P.flight.kind), +P.flight.yaw.toFixed(2), +P.flight.pitch.toFixed(2), +P.flight.roll.toFixed(2), P.flight.color] : P.shuttle ? [1, +P.shuttle.yaw.toFixed(2), 0, 0, '#ff6f00'] : 0, bt: P.boat ? [+P.face.toFixed(2), P.boat.seat] : 0, sk: sky.riding() || P.cable ? 1 : 0, mk: P.mech ? P.mech.style + 1 : 0, ma: P.mech ? (P.mech.punchT > 0 ? 1 : P.mech.beamT > 0 ? 2 : 0) : 0, cp: P.camper, af: apartments.key(), tr: P.transit ? [transitIndex(P.transit.t.id), +P.transit.yaw.toFixed(2)] : 0, ps: P.pass || 0, lp: P.camper >= 0 ? [+P.lp.x.toFixed(2), +P.lp.y.toFixed(2), +P.lp.z.toFixed(2)] : 0 } });
  }, 100);

  function dogFollow(dog, owner, face, dt) {
    if (!dog) return;
    const k = Math.max(1, dog.userData.size * 0.9), side = 0.6 * k;
    const tgt = new V3(owner.x - Math.sin(face) * 1.1 * k + Math.cos(face) * side, owner.y, owner.z - Math.cos(face) * 1.1 * k - Math.sin(face) * side);
    const d = tmpV.subVectors(tgt, dog.position); d.y = 0; const dist = d.length();
    dog.position.y = owner.y;
    if (dist > 15) dog.position.copy(tgt);
    else if (dist > 0.3) { const sp = Math.min(dist * 3, 9); dog.position.addScaledVector(d.normalize(), sp * dt); dog.rotation.y = Math.atan2(d.x, d.z); }
    animatePet(dog, dist > 0.4, dt);
  }

  // ---------- HUD ----------
  let hudT = 0;
  function updateHUD(inCar) {
    const a = P.pos.y;
    const inHotel = hotel.inside(P.pos);
    $('floorBig').textContent = inCar ? `${LIFT_DEF[inCar.id].cargo ? '貨' : '客'}Lift ${floorLabel(Math.round(inCar.floor))}F` : P.flight ? { plane: '✈ 小型飛機', heli: '🚁 直升機', jumbo: '🛫 巨無霸客機', fighter: '🛩 戰鬥機' }[P.flight.kind] : P.mech ? `🤖 機甲 HP ${Math.max(0, Math.round(P.mech.hp))}` : P.seat ? `🎢 ${park.rides[P.seat.r].name}` : P.transit ? `${P.transit.t.e} ${P.transit.t.n} → ${P.transit.d.name}` : P.pass ? `🙋 坐順風車` : P.cable ? '🚡 金色纜車' : liftRoom.inside(P.pos) ? liftRoom.label() : tunnels.inside(P.pos) ? tunnels.label() : P.boat ? `🚢 城市河觀光船（${BOAT_SEATS[P.boat.seat].n}）` : P.shuttle ? `🚁 直通直升機 → ${P.shuttle.name}` : sky.riding() ? '🚝 空中輕軌' : mtr.riding() ? (mtr.rideInfo() ? `🚇 下一站 ${MTR_ST[mtr.rideInfo().to][0]}` : '🚇 港鐵列車') : jail.active() ? '⛓ 監倉' : mtr.inside(P.pos) ? mtr.label() : P.camper >= 0 ? campers.list[P.camper].name : school.active() ? '🏫 學校數學堂' : apartments.label() ? apartments.label() : vault.inside(P.pos) ? '🔐 銀行金庫' : inHotel ? (a > 79 ? '柏熙 天台' : `柏熙 ${hotel.playerFloor(P.pos)}F`) : (a < -1 ? '機房 M' : a < 1 ? '地面 G' : `離地 ${fmtAlt(a)}`);
    $('altTxt').textContent = fmtAlt(a);
    $('layerTxt').textContent = layerName(a);
    $('onlineTxt').textContent = remotes.size + 1;
  }

  // ================= 機動遊戲：上車 / 落車 =================
  const seatP = new V3(), seatQ = new THREE.Quaternion(), seatS = new V3(), tmpUp = new V3(), tmpQ2 = new THREE.Quaternion(), tmpE = new THREE.Euler();
  function seatWorld(o) { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(seatP, seatQ, seatS); }
  function sitPose(av, dt, thrill) {
    animateAvatar(av, 0, dt); const u = av.userData;
    u.body.position.y = -0.36; u.body.rotation.x = 0; u.legL.rotation.x = u.legR.rotation.x = -Math.PI / 2;
    if (thrill) { u.armL.rotation.x = u.armR.rotation.x = -2.9; u.armL.rotation.z = 0.25; u.armR.rotation.z = -0.25; }
    else { u.armL.rotation.x = u.armR.rotation.x = -0.6; }
  }
  let fpBeforeRide = false;
  function boardRide(i) {
    const r = park.rides[i]; if (!r) return;
    const taken = new Set([...remotes.values()].filter(x => x.st?.sd && x.st.sd[0] === i).map(x => x.st.sd[1]));
    const free = r.seats.map((_, k) => k).filter(k => !taken.has(k));
    if (!free.length) return toast('坐滿咗，等陣先');
    if (P.held) setHeld(P.held);
    P.seat = { r: i, s: free[Math.floor(Math.random() * free.length)] };
    fpBeforeRide = firstPerson; firstPerson = true; camYaw = 0; camPitch = 0; $('btnFP').classList.add('on');
    say('Hold on tight! Here we go! Wheee!', '坐穩扶好！出發喇！', { gap: 10000 });
    sfx.whoosh(); toast(`🎢 ${r.name}：${r.info || ''}\n（撳「落車」或者「跳」離開；👁 可以轉第三身）`, 4000);
  }
  function leaveRide() {
    const r = park.rides[P.seat.r]; P.seat = null;
    api.teleport(r.board.exit[0], 0.05, r.board.exit[1]);
    me.rotation.set(0, P.face, 0); me.userData.body.position.y = 0;
    firstPerson = fpBeforeRide; camPitch = firstPerson ? 0 : 0.32; $('btnFP').classList.toggle('on', firstPerson);
    toast('🚶 落咗車'); sfx.click();
  }
  // 鏡頭唔好穿牆（酒店房入面用第三身都得）
  function camRayCols(o, d, max, list) {
    let best = max;
    for (const c of list || nearCols(o.x, o.z, max + 1, false)) {
      if (c.max[1] - c.min[1] < 0.3 && c.max[1] < o.y - 0.5) continue;
      let t0 = 0, t1 = best, ok = true;
      for (let a = 0; a < 3 && ok; a++) {
        const oa = a === 0 ? o.x : a === 1 ? o.y : o.z, da = a === 0 ? d.x : a === 1 ? d.y : d.z;
        if (Math.abs(da) < 1e-8) { if (oa < c.min[a] || oa > c.max[a]) ok = false; continue; }
        let n = (c.min[a] - oa) / da, f = (c.max[a] - oa) / da; if (n > f) [n, f] = [f, n];
        t0 = Math.max(t0, n); t1 = Math.min(t1, f); if (t0 > t1) ok = false;
      }
      if (ok && t0 > 0.05) best = Math.min(best, Math.max(0.5, t0 - 0.3));
    }
    return best;
  }

  // ================= 柏熙酒店：Lift 面板、Check-in、瞓覺 =================
  let hotelCar = null;
  const hpKeys = $('hpKeys');
  [...Array.from({ length: 20 }, (_, i) => [String(i + 1), i + 1]), ['🔓 開門', 'open'], ['關門', 'close']].forEach(([label, k]) => {
    const b = document.createElement('button'); b.textContent = label; if (typeof k === 'string') { b.className = 'wide'; b.style.gridColumn = 'span ' + (k === 'open' ? 3 : 2); }
    b.onclick = () => {
      const c = hotelCar; if (!c) return; sfx.click();
      if (k === 'open') return api.liftCmd(c.id, 'open');
      if (k === 'close') return api.liftCmd(c.id, 'close');
      if (c.moving) return toast('電梯行緊，等陣先');
      if (Math.round(c.floor) === k) return api.liftCmd(c.id, 'open');
      api.liftCmd(c.id, 'goto', k); toast(k === 20 ? '👑 去 20 樓總統套房' : `🛗 去 ${k} 樓`);
    };
    hpKeys.appendChild(b);
  });
  const PRICES = { single: 1880, double: 2680, suite: 68000 };
  const RNAME = { single: '豪華單人房', double: '豪華雙人房', suite: '總統套房' };
  function openCheckin() {
    $('hmCash').textContent = `💵 你身上有 ${money(E.cash)}` + (E.room ? `｜你而家住緊 ${E.room.no} 號房（${RNAME[E.room.type]}）` : '');
    $('hmMsg').textContent = ''; $('hotelModal').classList.remove('hidden'); sfx.click();
    say('Welcome to the hotel! Would you like a single room, a double room, or the presidential suite?', '歡迎嚟到酒店！你想要單人房、雙人房，定係總統套房？');
  }
  document.querySelectorAll('#hotelModal [data-room]').forEach(b => b.onclick = () => {
    const type = b.dataset.room, price = PRICES[type];
    if (E.cash < price) { sfx.error(); $('hmMsg').textContent = `💸 唔夠錢！要 ${money(price)}。可以去銀行賣金條或者提錢。`; return; }
    let no;
    if (type === 'suite') no = 2001;
    else { const ks = ROOM_TYPES.map((t, k) => t === type ? k : -1).filter(k => k >= 0); no = (2 + Math.floor(Math.random() * 18)) * 100 + ks[Math.floor(Math.random() * ks.length)] + 1; }
    E.cash = Math.round((E.cash - price) * 10) / 10; E.room = { no, type }; saveEcon(); showRoomMark(); sfx.pickup();
    const fl = Math.floor(no / 100);
    $('hmMsg').textContent = `✅ 入住成功！房號 ${no}（${RNAME[type]}）— 搭 Lift 或者行樓梯上 ${fl} 樓，跟住金色箭咀搵間房。`;
    toast(`🔑 房卡：${no} 號房，${fl} 樓`, 3500);
  });
  $('hmClose').onclick = () => closeModal('hotelModal');
  const roomMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: TXsign('⬇ 你間房', '#ffd54f', '#3a2a10'), depthTest: false })); roomMark.scale.set(2.4, 0.6, 1); roomMark.visible = false; roomMark.renderOrder = 5; scene.add(roomMark);
  function TXsign(text, bg, fg) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, 248, 56, 24); g.fill(); g.fillStyle = fg; g.font = 'bold 32px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function showRoomMark() { const p = E.room && roomDoor(E.room.no); roomMark.visible = !!p; if (p) { roomMark.position.copy(p); roomMark.userData.y = p.y; } }
  showRoomMark();
  function doSleep() {
    if (!E.room) { sfx.error(); return toast('🛎 要先去 1 樓大堂接待處 Check-in 先可以瞓喎'); }
    const f = $('flash'); f.style.transition = 'opacity 1s'; f.style.background = '#000'; f.style.opacity = 1;
    toast('😴 Zzz… Zzz…', 2500); say('Good night! Sweet dreams.', '早唞！發個好夢。', { force: true });
    setTimeout(() => { f.style.opacity = 0; toast('☀️ 瞓醒啦！精神晒～', 2500); setTimeout(() => f.style.background = '', 1100); }, 2600);
  }

  // ================= 背景音樂（3 首揀）=================
  const musicBox = $('musicBox');
  const mOpts = [['🔇 關', 0], ...TRACKS.map((t, i) => [`🎵 ${i + 1}. ${t.name}`, i + 1])];
  function renderMusic() {
    musicBox.innerHTML = '';
    mOpts.forEach(([label, i]) => { const b = document.createElement('button'); b.textContent = label; if (currentMusic() === i) b.className = 'on'; b.onclick = () => { playMusic(i); store.set('music', i); renderMusic(); $('btnMusic').classList.toggle('on', i > 0); }; musicBox.appendChild(b); });
  }
  $('btnEng').classList.toggle('on', englishOn());
  $('btnEng').onclick = () => {
    sfx.click();
    if (!englishOn()) { setEnglish(true); $('btnEng').classList.add('on'); toast('🔤 英文發音：開（唔同情景都會講英文，有中文字幕）'); say('Hello! Let us learn English together.', '你好！一齊學英文啦！', { force: true }); return; }
    engMenu();
  };
  // 揀把聲（最自然嘅排最前）+ 語速；關閉要密碼
  function engMenu() {
    const cur = currentVoice(), vs = englishVoices().slice(0, 12);
    const tag = v => { const sc = voiceScore(v); return sc >= 60 ? '⭐⭐⭐ 好自然' : sc >= 40 ? '⭐⭐ 幾自然' : '⭐ 普通'; };
    const sample = () => say('Hello! I am your English teacher. Let us learn English together. This is a double-decker bus.', '你好！我係你嘅英文老師，一齊學英文啦！', { force: true, now: true, key: 'sample' + Date.now() });
    const opts = [{ head: '🔊 揀把聲（撳一下會試聽）' }];
    vs.forEach(v => opts.push({ label: `${v === cur ? '✅ ' : ''}${v.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()}`, sub: `${v.lang}｜${tag(v)}`, keep: true, fn: () => { setVoice(v.voiceURI); sample(); engMenu(); } }));
    if (!vs.length) opts.push({ label: '（呢部機冇英文語音）', sub: '去手機設定下載英文語音', fn: () => { } });
    opts.push({ head: '🐢 講嘢速度' });
    [[0.85, '🐢 慢啲（初學）'], [0.95, '🙂 正常'], [1.05, '🐇 快啲（好似真人）']].forEach(([r, n]) => opts.push({ label: `${Math.abs(currentRate() - r) < 0.01 ? '✅ ' : ''}${n}`, keep: true, fn: () => { setRate(r); sample(); engMenu(); } }));
    opts.push({ head: '其他' });
    opts.push({ label: '🔇 關閉英文發音', sub: '要輸入密碼', fn: () => askPassword({ sfx }, '🔤 關閉英文發音', '英文發音預設係開住，幫你練英文聽力。<br>要輸入密碼先可以關。', () => { setEnglish(false); $('btnEng').classList.remove('on'); toast('🔤 英文發音：關'); }) });
    const hint = isIOS ? 'iPhone 想把聲更自然：設定 → 輔助使用 → 朗讀內容 → 聲音 → 英文，下載「Premium / 增強」聲（例如 Ava、Zoe、Evan），再返嚟揀' : '揀 ⭐⭐⭐ 嗰啲聲最自然（例如 Natural / Online / Google）';
    choose('🔤 英文發音設定', opts, `而家用緊：${cur ? cur.name : '預設聲'}｜${hint}`, 200);
  }
  $('btnMusic').onclick = () => { musicBox.classList.toggle('hidden'); renderMusic(); sfx.click(); };
  { const m = store.get('music', 1); playMusic(m); $('btnMusic').classList.toggle('on', m > 0); }

  // ================= 電單車 / 露營車 =================
  const myBike = buildBike(); myBike.visible = false; scene.add(myBike);
  let bikeOn = false, bikeLean = 0, bikeSpin = 0;
  function isIndoors() {
    const p = P.pos, tb = world.toiletBounds;
    if (P.seat || P.flight || P.mech || P.transit || P.pass || P.camper >= 0 || p.y < -1 || P.boat || P.shuttle || P.cable) return true;
    if (tunnels.inside(p)) return false;   // 海底隧道入面可以揸電單車
    if (liftRoom.inside(p)) return true;
    if (lifts.insideCar(p) || hotel.insideCar(p) || hotel.inside(p) || vault.inside(p) || apartments.inside(p) || school.inside(p) || jail.inside(p) || mtr.inside(p)) return true;
    if (p.x > 4440 && p.x < 4680 && p.z > 2520 && p.z < 2680 && p.y < 13) return true;   // 康城商場
    if (p.x > tb.x0 && p.x < tb.x1 && p.z > tb.z0 && p.z < tb.z1 && p.y < tb.y1) return true;
    if (p.z > 36 && p.z < 48 && p.x > -46 && p.x < 56.5 && p.y < 4.5) return true;   // 商店街
    if (p.x > -26 && p.x < -10 && p.z > -18 && p.z < -6 && p.y < 4) return true;   // 寵物店 / 獸醫
    return false;
  }
  $('btnBike').onclick = () => {
    sfx.click();
    if (P.bike) return bikeToBag();
    const pb = PARK.find(v => v.k === 'bike');
    if (pb && !E.bikeBag) {
      const d = Math.hypot(pb.x - P.pos.x, pb.z - P.pos.z);
      if (d < 12 && Math.abs(pb.y - P.pos.y) < 3) return useParked(pb);
      return choose('🏍 你架電單車泊咗喺第度', [
        { label: '🚶 我自己行過去', sub: `喺你${dirName(pb.x - P.pos.x, pb.z - P.pos.z)}面大約 ${Math.round(d)} 米`, fn: () => toast(`🏍 電單車喺你${dirName(pb.x - P.pos.x, pb.z - P.pos.z)}面大約 ${Math.round(d)} 米（地圖上有 🏍 記號）`, 4000) },
        { label: '🚚 叫拖車送過嚟（$50）', sub: '拖車即刻送到你身邊', fn: () => { if (isIndoors()) return toast('要喺室外先叫到拖車'); if (!api.pay(50)) return toast('💸 唔夠錢叫拖車'); dropParked(pb); if (P.held) setHeld(P.held); P.bike = true; $('btnBike').classList.add('on'); toast('🚚 拖車送咗電單車嚟！'); say('The tow truck brought your motorbike. Here you are!', '拖車將你架電單車送咗嚟！'); } },
        { label: '🎒 收返入背包', sub: '隔空收返入背包，之後喺邊度都可以即刻拎出嚟揸', fn: () => { dropParked(pb); E.bikeBag = true; saveEcon(); toast('🎒 電單車收返入背包。再撳 🏍 就拎出嚟揸'); } },
      ], '交通工具泊喺邊度就喺邊度，唔會自己消失；收咗入背包就唔受呢個限制');
    }
    rideFromBag();
  };
  function bikeToBag() { P.bike = false; lastBike = null; E.bikeBag = true; saveEcon(); $('btnBike').classList.remove('on'); toast('🎒 電單車收咗入背包（唔會泊喺街），再撳 🏍 就拎出嚟揸'); }
  function rideFromBag() {
    if (isIndoors()) return toast('🏍 要喺室外先揸得電單車');
    if (P.held) setHeld(P.held);
    E.bikeBag = false; saveEcon();
    P.bike = true; $('btnBike').classList.add('on'); toast('🏍 揸電單車！喺室外快 3 倍；再撳 🏍 就收入背包'); say(...VEH.bike);
  }
  addEventListener('keydown', e => { if (e.code === 'KeyB' && e.target.tagName !== 'INPUT') $('btnBike').click(); });
  function enterCamper(k) {
    const c = campers.list[k];
    P.camper = k; P.lp.set(0.9, 0.85, -1.1); P.vy = 0; P.rideObj = null; P.ride = -1;
    c.toWorld(P.lp, P.pos);
    say(...VEH.camper);
    sfx.door(); toast(c.moving ? `🚐 跳咗上${c.name.slice(3)}！佢行緊，可以喺入面周圍行` : `🚐 上咗${c.name.slice(3)}，${Math.ceil(c.restLeft)} 秒後開車，會圍住成個小鎮行一圈`, 3500);
  }

  // ================= 大地圖（可以縮放 / 拖動；撳一下傳送）=================
  const mapCv = $('mapCv'), mg = mapCv.getContext('2d');
  const MAP = { cx: 0, cz: 0, s: 0.1, min: 0, max: 6, W: 600, H: 600, dpr: 1 };   // s = 每米幾多 px
  function mapResize() {
    const r = mapCv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    MAP.W = Math.max(200, r.width); MAP.H = Math.max(200, r.height); MAP.dpr = dpr;
    mapCv.width = Math.round(MAP.W * dpr); mapCv.height = Math.round(MAP.H * dpr);
    MAP.min = Math.min(MAP.W, MAP.H) / (HALF_WORLD * 2);
    MAP.s = Math.max(MAP.min, Math.min(MAP.max, MAP.s));
  }
  const w2m = (x, z) => [(x - MAP.cx) * MAP.s + MAP.W / 2, (z - MAP.cz) * MAP.s + MAP.H / 2];
  const m2w = (px, py) => [(px - MAP.W / 2) / MAP.s + MAP.cx, (py - MAP.H / 2) / MAP.s + MAP.cz];
  function mapClamp() { const lim = HALF_WORLD; MAP.cx = Math.max(-lim, Math.min(lim, MAP.cx)); MAP.cz = Math.max(-lim, Math.min(lim, MAP.cz)); }
  function mapZoom(f, px = MAP.W / 2, py = MAP.H / 2) {
    const [wx, wz] = m2w(px, py);
    MAP.s = Math.max(MAP.min, Math.min(MAP.max, MAP.s * f));
    MAP.cx = wx - (px - MAP.W / 2) / MAP.s; MAP.cz = wz - (py - MAP.H / 2) / MAP.s; mapClamp(); drawMap();
  }
  const rectM = (r, fill) => { const [a, b] = w2m(r.x0, r.z0), [c, d] = w2m(r.x1, r.z1); mg.fillStyle = fill; mg.fillRect(a, b, c - a, d - b); };
  function label(txt, x, z, size = 18) {
    const [px, py] = w2m(x, z); if (px < -200 || px > MAP.W + 200 || py < -40 || py > MAP.H + 40) return;
    mg.font = `bold ${size}px system-ui, sans-serif`; mg.textAlign = 'center'; mg.textBaseline = 'middle';
    mg.lineWidth = 4; mg.strokeStyle = 'rgba(255,255,255,.92)'; mg.strokeText(txt, px, py); mg.fillStyle = '#111'; mg.fillText(txt, px, py);
  }
  function polyM(flat, ox, oz, fill, stroke) {
    mg.beginPath(); for (let i = 0; i < flat.length; i += 2) { const [px, py] = w2m(flat[i] + ox, flat[i + 1] + oz); i ? mg.lineTo(px, py) : mg.moveTo(px, py); } mg.closePath();
    if (fill) { mg.fillStyle = fill; mg.fill(); } if (stroke) { mg.strokeStyle = stroke; mg.lineWidth = 1; mg.stroke(); }
  }
  function drawMap() {
    const g = mg, s = MAP.s;
    g.setTransform(MAP.dpr, 0, 0, MAP.dpr, 0, 0);
    g.fillStyle = '#335'; g.fillRect(0, 0, MAP.W, MAP.H);
    // 區塊（只畫睇得到嘅）
    const [wx0, wz0] = m2w(0, 0), [wx1, wz1] = m2w(MAP.W, MAP.H);
    const i0 = Math.max(-24, Math.floor((wx0 + 100) / CHUNK)), i1 = Math.min(24, Math.ceil((wx1 + 100) / CHUNK));
    const j0 = Math.max(-24, Math.floor((wz0 + 100) / CHUNK)), j1 = Math.min(24, Math.ceil((wz1 + 100) / CHUNK));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const t = district(i, j); if (t === 'none') continue;
      const [x, y] = w2m(i * CHUNK - 100, j * CHUNK - 100); g.fillStyle = DISTRICT_COLOR[t]; g.fillRect(x, y, CHUNK * s + 0.5, CHUNK * s + 0.5);
    }
    // 馬路網
    g.strokeStyle = s > 0.4 ? '#555' : 'rgba(60,60,60,.55)'; g.lineWidth = Math.max(1, 12 * s);
    g.beginPath();
    for (let k = i0; k <= i1 + 1; k++) { const [v] = w2m(k * CHUNK - 100, 0); g.moveTo(v, 0); g.lineTo(v, MAP.H); }
    for (let k = j0; k <= j1 + 1; k++) { const [, v] = w2m(0, k * CHUNK - 100); g.moveTo(0, v); g.lineTo(MAP.W, v); }
    g.stroke();
    rectM(TOWN, '#ffd54f');
    rectM(RUNWAY, '#3c3f44');
    rectM(VILLAGE, DISTRICT_COLOR.village);
    if (village.sea) polyM(village.sea, 0, 0, '#4aa3df');
    rectM(RIVER, '#cfd8dc'); rectM({ x0: -840, x1: 240, z0: -840, z1: -360 }, '#4fc3f7'); rectM({ x0: -800, x1: 200, z0: -800, z1: -400 }, '#81c784');
    rectM({ x0: HARBOUR.x0, x1: HARBOUR.x1, z0: HARBOUR.z0 + 6, z1: HARBOUR.z1 - 6 }, '#4aa3df');
    g.save(); g.setLineDash([6, 4]); g.strokeStyle = '#ffeb3b'; g.lineWidth = Math.max(2, 6 * s);
    TUNNELS.forEach(t => { const [a, b] = w2m(t.x, HARBOUR.z0), [, d] = w2m(t.x, HARBOUR.z1); g.beginPath(); g.moveTo(a, b); g.lineTo(a, d); g.stroke(); }); g.restore();
    rectM(DISNEY, '#f8bbd0'); rectM(OCEAN, '#b2ebf2');
    rectM(LOHAS, '#e1bee7'); rectM({ x0: 4800, x1: 4894, z0: 2300, z1: 2894 }, '#4aa3df'); rectM({ x0: 4300, x1: 4800, z0: 2830, z1: 2894 }, '#4aa3df');
    // 空中輕軌（藍色虛線）
    g.save(); g.strokeStyle = '#0288d1'; g.lineWidth = Math.max(2, 5 * s); g.setLineDash([8, 5]); g.beginPath();
    SKY_PATH.pts.forEach((q, i) => { const [px, py] = w2m(q.x, q.z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); g.restore();
    // 港鐵綫
    g.lineWidth = Math.max(2.5, 7 * s); g.lineJoin = 'round';
    MTR_LINES.forEach(l => l.r.forEach(r => { g.strokeStyle = l.c; g.beginPath(); r.forEach((k, i) => { const e = MTR_ENTR[k], [px, py] = w2m(e.x, e.z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); }));
    for (const k in MTR_ENTR) { const e = MTR_ENTR[k], [px, py] = w2m(e.x, e.z); if (px < -20 || px > MAP.W + 20 || py < -20 || py > MAP.H + 20) continue; g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, Math.max(3, Math.min(7, 9 * s)), 0, 7); g.fill(); g.stroke(); }
    for (const st of SKY_STATIONS) { const [px, py] = w2m(st.x, st.z); g.fillStyle = '#0288d1'; g.fillRect(px - 4, py - 4, 8, 8); }
    { const pb = PARK.find(v => v.k === 'bike'); if (pb) { const [px, py] = w2m(pb.x, pb.z); g.font = '18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏍', px, py); } }
    PARK.filter(v => v.k !== 'bike').forEach(v => { const [px, py] = w2m(v.x, v.z); g.font = '16px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v.k === 'heli' ? '🚁' : '✈', px, py); });
    // 拉近啲就畫埋豪景花園每座樓 + 柏熙酒店
    if (s > 0.25) {
      for (const r of HKG.r) { if (r[1] <= 2.5) continue; g.strokeStyle = r[0] === 'motorway' ? '#ef6c00' : '#666'; g.lineWidth = Math.max(1, r[1] * s); g.beginPath(); for (let i = 0; i < r[3].length; i += 2) { const [px, py] = w2m(r[3][i] + VOX, r[3][i + 1] + VOZ); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
      for (const [name, , kind, flat] of HKG.b) polyM(flat, VOX, VOZ, kind === 'park' ? '#9e9e9e' : kind === 'apt' ? '#fff3e0' : '#d7ccc8', '#5d4037');
      if (s > 2.2) for (const [name, , kind, flat] of HKG.b) { if (kind !== 'apt' && kind !== 'mall') continue; let x = 0, z = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; z += flat[i + 1]; } label(name.split(' ')[0], x / (flat.length / 2) + VOX, z / (flat.length / 2) + VOZ, 13); }
      const [hx, hy] = w2m(55, -125); g.fillStyle = '#c9a227'; g.beginPath(); g.arc(hx, hy, Math.max(4, 70 * s), 0, 7); g.fill();
    }
    // 地方名（大字）
    const big = s < 0.2 ? 16 : 19;
    label('🏙 小鎮（柏熙酒店・遊樂場）', 0, s > 0.25 ? -330 : 190, big);
    LANDMARKS.forEach(l => label(l.name, l.i * CHUNK, l.j * CHUNK, big));
    label('✈ 國際機場', 820, s > 0.25 ? -320 : -90, big);
    label('🏘 豪景花園', VOX, s > 0.25 ? VILLAGE.z0 - 25 : VOZ, big);
    label('⚔ 怪獸決戰場', -1700, -100, big);
    label('🏰 迪士尼樂園', -1600, 2000, big); label('🐬 海洋公園', 2200, 4000, big);
    label('🚢 城市河', -300, -600, big); label('🌊 海港', 600 + 1800, 2800, big);
    if (s > 0.15) TUNNELS.forEach(t => label('🚇' + t.n, t.x, 2800, 13)); label('🌅 日出康城', 4600, 2600, big);
    if (s > 0.12) for (const k in MTR_ENTR) { const e = MTR_ENTR[k]; label(MTR_ST[k][0], e.x, e.z - 16 / s * 0.6, s > 0.5 ? 14 : 11); }
    if (s > 0.2) for (const st of SKY_STATIONS) label('🚝' + st.n, st.x, st.z + 14 / s * 0.6, 12);
    if (s > 0.6) { label('🏨 柏熙酒店', 55, -125, 15); }
    // 玩家
    for (const r of remotes.values()) { if (!r.st) continue; const [x, y] = w2m(r.pos.x, r.pos.z); g.fillStyle = '#2196f3'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.stroke(); }
    const [px, py] = w2m(P.pos.x, P.pos.z);
    g.save(); g.translate(px, py); g.rotate(-P.face + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#d32f2f'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 4); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
    // 比例尺
    const nice = [10, 20, 50, 100, 200, 500, 1000, 2000], L = nice.find(n => n * s > 70) || 2000;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, MAP.H - 34, L * s + 90, 26); g.fillStyle = '#fff'; g.fillRect(16, MAP.H - 24, L * s, 5);
    g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(L >= 1000 ? `${L / 1000} 公里` : `${L} 米`, 24 + L * s, MAP.H - 21);
    const t = district(Math.round(P.pos.x / CHUNK), Math.round(P.pos.z / CHUNK));
    $('mapInfo').textContent = `你而家喺：${DISTRICT_NAME[t] || '野外'}（${Math.round(P.pos.x)}, ${Math.round(P.pos.z)}）`;
  }
  let mapTimer = null;
  function openMap() {
    $('mapModal').classList.remove('hidden'); mapResize();
    if (!MAP.opened) { MAP.opened = true; MAP.s = Math.max(MAP.min, 0.12); }
    MAP.cx = P.pos.x; MAP.cz = P.pos.z; mapClamp();
    drawMap(); clearInterval(mapTimer); mapTimer = setInterval(drawMap, 500); sfx.click();
  }
  let mapPick = null;
  function closeMap() { $('mapModal').classList.add('hidden'); clearInterval(mapTimer); mapPick = null; $('mapPickHint').classList.add('hidden'); }
  $('btnMap').onclick = openMap; $('mapClose').onclick = closeMap;
  $('mapIn').onclick = () => mapZoom(1.6); $('mapOut').onclick = () => mapZoom(1 / 1.6);
  $('mapAll').onclick = () => { MAP.s = MAP.min; MAP.cx = MAP.cz = 0; drawMap(); };
  $('mapMe').onclick = () => { MAP.cx = P.pos.x; MAP.cz = P.pos.z; MAP.s = Math.max(MAP.s, 0.5); drawMap(); };
  addEventListener('resize', () => { if (!$('mapModal').classList.contains('hidden')) { mapResize(); drawMap(); } });
  addEventListener('keydown', e => { if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') ($('mapModal').classList.contains('hidden') ? openMap() : closeMap()); });
  mapCv.addEventListener('wheel', e => { e.preventDefault(); const r = mapCv.getBoundingClientRect(); mapZoom(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  // 拖動 / 兩隻手指縮放 / 撳一下（冇郁）就傳送
  const mptrs = new Map(); let mdrag = null;
  mapCv.addEventListener('pointerdown', e => {
    mapCv.setPointerCapture(e.pointerId); mptrs.set(e.pointerId, [e.clientX, e.clientY]);
    mdrag = { moved: mptrs.size > 1, x: e.clientX, y: e.clientY, cx: MAP.cx, cz: MAP.cz, pinch: null };
    if (mptrs.size === 2) { const [a, b] = [...mptrs.values()]; mdrag.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: MAP.s }; }
  });
  mapCv.addEventListener('pointermove', e => {
    if (!mdrag || !mptrs.has(e.pointerId)) return; mptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (mptrs.size === 2 && mdrag.pinch) {
      const [a, b] = [...mptrs.values()], r = mapCv.getBoundingClientRect(), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      mapZoom(mdrag.pinch.s * d / mdrag.pinch.d / MAP.s, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); mdrag.moved = true; return;
    }
    if (Math.hypot(e.clientX - mdrag.x, e.clientY - mdrag.y) > 6) mdrag.moved = true;
    if (mdrag.moved && mptrs.size === 1) { MAP.cx = mdrag.cx - (e.clientX - mdrag.x) / MAP.s; MAP.cz = mdrag.cz - (e.clientY - mdrag.y) / MAP.s; mapClamp(); drawMap(); }
  });
  const mptrEnd = e => {
    if (!mptrs.has(e.pointerId)) return; mptrs.delete(e.pointerId);
    if (!mdrag || mptrs.size) { if (mptrs.size === 1 && mdrag) { const [p] = [...mptrs.values()]; mdrag = { moved: true, x: p[0], y: p[1], cx: MAP.cx, cz: MAP.cz }; } return; }
    const wasTap = !mdrag.moved && e.type === 'pointerup'; mdrag = null;
    if (!wasTap) return;
    const r = mapCv.getBoundingClientRect();
    let [x, z] = m2w(e.clientX - r.left, e.clientY - r.top);
    if (mapPick) { const f = mapPick; closeMap(); f(x, z); return; }
    mapTeleport(x, z);
  };
  ['pointerup', 'pointercancel'].forEach(t => mapCv.addEventListener(t, mptrEnd));
  function mapTeleport(x0, z0) {
    const { x, z, name } = resolveDest(x0, z0);
    leaveAll();
    api.teleport(x, 0.1, z); city.loadAll(P.pos); closeMap();
    sfx.whoosh(); toast(`✨ 傳送咗去 ${name}`);
  }
  // 地圖上一點 → 實際去到嘅位置（小鎮 / 屋苑 / 機場 / 怪獸場有指定入口；其他去最近嘅馬路）
  function resolveDest(x, z) {
    x = Math.max(-HALF_WORLD + 20, Math.min(HALF_WORLD - 20, x)); z = Math.max(-HALF_WORLD + 20, Math.min(HALF_WORLD - 20, z));
    const inR = R => x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1;
    let name;
    if (inR(TOWN)) { x = SPAWN.x; z = SPAWN.z; name = '小鎮'; }
    else if (inR(VILLAGE)) { x = village.center.x; z = village.center.z; name = '豪景花園'; }
    else if (inR(AIRPORT)) { x = airport.spawn.x; z = airport.spawn.z; name = '國際機場'; }
    else if (inR(ARENA)) { x = arena.gate.x; z = arena.gate.z; name = '怪獸決戰場（閘口）'; }
    else if (inR(RIVER)) { x = river.pier.x; z = river.pier.z; name = '城市河碼頭'; }
    else if (inR(HARBOUR)) { const tn = TUNNELS.reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a); z = z < 2800 ? HARBOUR.z0 - 10 : HARBOUR.z1 + 10; x = tn.x; name = `${tn.n}隧道口`; }
    else if (inR(DISNEY)) { x = themeParks.gate.disney.x; z = themeParks.gate.disney.z; name = '迪士尼樂園'; }
    else if (inR(OCEAN)) { x = themeParks.gate.ocean.x; z = themeParks.gate.ocean.z; name = '海洋公園'; }
    else if (inR(LOHAS)) { x = lohas.center.x; z = lohas.center.z; name = '日出康城'; }
    else {
      // 傳送去最近嘅馬路（唔會卡喺大廈入面）
      const rx = Math.round((x + 100) / CHUNK) * CHUNK - 100, rz = Math.round((z + 100) / CHUNK) * CHUNK - 100;
      if (Math.abs(x - rx) < Math.abs(z - rz)) x = rx; else z = rz;
      name = DISTRICT_NAME[district(Math.round(x / CHUNK), Math.round(z / CHUNK))] || '野外';
    }
    return { x, z, name };
  }

  // ================= 的士 / 小巴 / 雙層巴士 =================
  function transitPick(id) {
    const t = TRANSIT[transitIndex(id)];
    if (P.transit) return toast('你已經喺車上');
    if (P.flight || P.mech || P.seat || P.pass) return toast('要先落車 / 落機先可以叫車');
    if (vault.inside(P.pos) || apartments.inside(P.pos) || hotel.inside(P.pos) || P.pos.y > 3) return toast('🚕 要喺街上先叫到車');
    openMap(); mapPick = (x, z) => startTransit(id, resolveDest(x, z));
    $('mapPickHint').textContent = `${t.e} 撳地圖揀你想${t.n}送你去邊度（${t.desc}）`; $('mapPickHint').classList.remove('hidden');
  }
  function startTransit(id, d) {
    const t = TRANSIT[transitIndex(id)];
    if (P.camper >= 0) { P.camper = -1; P.rideObj = null; }
    stowBike();
    const R = planRoute(P.pos, d, TOWN);
    if (R.L < 30) return toast('📍 你已經喺附近喇，行過去啦');
    const fare = t.fare(R.L);
    if (E.cash < fare) { sfx.error(); return toast(`💸 唔夠錢俾車費（要 ${money(fare)}）。去銀行提錢先啦`, 3500); }
    E.cash -= fare; saveEcon();
    const m = buildTransitModel(id); scene.add(m);
    const dur = Math.max(8, Math.min(45, R.L / t.speed / 4));
    P.transit = { t, m, R, d, time: 0, dur, yaw: routeAt(R, 0, m.position) };
    m.rotation.y = P.transit.yaw;
    say(...VEH[id]);
    sfx.door(); toast(`${t.e} 上咗${t.n}，去 ${d.name}（約 ${(R.L / 1000).toFixed(1)} 公里，車費 ${money(fare)}）。撳「⏩ 即刻到站」可以跳過`, 4000);
  }
  const trTmp = new V3(), trSeat = new V3();
  function transitStep(dt) {
    const T = P.transit; T.time += dt;
    const u = Math.min(1, T.time / T.dur), e = u < 0.1 ? 5 * u * u : u > 0.9 ? 1 - 5 * (1 - u) ** 2 : 0.05 + (u - 0.1) * (0.9 / 0.8);
    let yaw = routeAt(T.R, T.R.L * Math.min(1, e), trTmp);
    if (T.R.tunnel && !T.tunnelDone && T.R.L * e > T.R.tunnel[0]) {
      // 經海底隧道：黑畫面一閃就到對岸
      T.tunnelDone = true; const tgt = T.R.tunnel[1] / T.R.L;
      while (T.time < T.dur) { T.time += 0.05; const u2 = Math.min(1, T.time / T.dur), e2 = u2 < 0.1 ? 5 * u2 * u2 : u2 > 0.9 ? 1 - 5 * (1 - u2) ** 2 : 0.05 + (u2 - 0.1) * (0.9 / 0.8); if (e2 >= tgt) break; }
      const f = $('flash'); f.style.transition = 'none'; f.style.background = '#000'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .8s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 850); });
      toast('🌊 經海底隧道過咗海', 2500); say('We are going through the tunnel under the sea.', '我哋經海底隧道過海。', { gap: 30000 });
    }
    let dy = yaw - T.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); T.yaw += dy * Math.min(1, dt * 6);
    T.m.position.copy(trTmp); T.m.rotation.y = T.yaw;
    T.m.userData.wheels.forEach(w => w.rotation.x += dt * 25 * (u < 1 ? 1 : 0));
    T.m.updateMatrixWorld(true); trSeat.copy(T.m.userData.seat).applyMatrix4(T.m.matrixWorld);
    P.pos.copy(trSeat); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.face = T.yaw;
    me.position.copy(trSeat); me.rotation.set(0, T.yaw, 0); me.scale.setScalar(1); sitPose(me, dt, false);
    if (ptrs.size === 0) { let d = T.yaw + Math.PI - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 1.2); }
    if (u >= 1) endTransit();
  }
  function endTransit(skip) {
    const T = P.transit; if (!T) return;
    P.transit = null; scene.remove(T.m);
    const d = T.d, hw = T.t.id === 'bus' ? 1.3 : 1.0;
    const yaw = routeAt(T.R, T.R.L, trTmp);
    api.teleport(d.x + Math.cos(yaw) * (hw + 1.5), 0.1, d.z - Math.sin(yaw) * (hw + 1.5));
    if (skip) city.loadAll(P.pos);
    sfx.ding(); toast(`${T.t.e} 到咗 ${d.name}！多謝搭${T.t.n} 🙏`, 3000);
  }
  $('btnTaxi').onclick = () => {
    sfx.click();
    if (P.transit) return toast('你已經喺車上');
    choose('🚕 叫車：揀交通工具', TRANSIT.map(t => ({ label: `${t.e} ${t.n}`, sub: t.desc, fn: () => transitPick(t.id) })), '揀完再喺大地圖撳你想去嘅位置，車會沿住馬路送你去。小鎮西面（露營車站旁邊）都有交通總站。');
  };

  // ================= 落晒所有交通工具（傳送 / 上堂 / 坐監之前用）=================
  function leaveAll() {
    if (P.seat) leaveRide(); if (P.flight) endFlight(); if (P.mech) mechOff(); if (P.transit) endTransit(); if (P.pass) leavePass();
    if (P.boat) endBoat(false); if (P.shuttle) endShuttle(false); mtr.cancel(); sky.cancel(); P.cable = null;
    if (P.camper >= 0) { P.camper = -1; P.rideObj = null; }
    stowBike();
  }

  // ================= 泊車：喺邊度落機 / 落車就泊喺邊度，交通工具唔會消失（記住喺呢部機）=================
  const PARK = store.get('parked', []).filter(v => v && v.k);
  const savePark = () => store.set('parked', PARK.map(({ k, x, y, z, yaw, c }) => ({ k, x, y, z, yaw, c })));
  const PARK_LABEL = { plane: '✈ 揸返你架小型飛機', heli: '🚁 揸返你架直升機', jumbo: '🛫 揸返你架巨無霸', fighter: '🛩 揸返你架戰鬥機', bike: '🏍 揸返你架電單車' };
  function showParked(v) {
    const m = v.k === 'bike' ? buildBike() : buildAircraft(v.k, v.c || '#e53935');
    m.position.set(v.x, v.y, v.z); m.rotation.y = v.yaw; scene.add(m);
    const it = { pos: new V3(v.x, v.y, v.z), r: v.k === 'jumbo' ? 14 : v.k === 'bike' ? 2.4 : 5.5, label: () => PARK_LABEL[v.k], act: () => useParked(v), show: () => !P.flight && !P.bike };
    interactables.push(it); v._m = m; v._it = it;
  }
  function dropParked(v) { if (v._m) scene.remove(v._m); const i = interactables.indexOf(v._it); if (i >= 0) interactables.splice(i, 1); const j = PARK.indexOf(v); if (j >= 0) PARK.splice(j, 1); savePark(); }
  function parkVeh(v) {
    if (v.k === 'bike') PARK.filter(o => o.k === 'bike').forEach(dropParked);
    else { const air = PARK.filter(o => o.k !== 'bike'); if (air.length >= 8) dropParked(air[0]); }
    Object.assign(v, { x: +v.x.toFixed(2), y: +Math.max(0, v.y).toFixed(2), z: +v.z.toFixed(2), yaw: +v.yaw.toFixed(3) });
    PARK.push(v); showParked(v); savePark();
  }
  function useParked(v) {
    if (v.k === 'bike') { dropParked(v); if (P.held) setHeld(P.held); P.bike = true; P.face = v.yaw; $('btnBike').classList.add('on'); sfx.click(); toast('🏍 揸返電單車'); say(...VEH.bike); return; }
    dropParked(v); startFlight(v.k, v.x, v.z, v.yaw, v.c, v.y);
  }
  setTimeout(() => PARK.slice().forEach(showParked), 0);
  let lastBike = null;
  function stowBike() {
    if (!P.bike) return;
    if (lastBike) parkVeh({ k: 'bike', ...lastBike });
    P.bike = false; lastBike = null; $('btnBike').classList.remove('on');
  }
  const dirName = (dx, dz) => ['東', '東南', '南', '西南', '西', '西北', '北', '東北'][((Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) % 8) + 8) % 8];

  // ================= 城市河觀光船 =================
  function boatTicket() {
    if (P.boat) return;
    if (api.busy()) return toast('要先落車 / 落機');
    say('Welcome to the River Cruise! Where would you like to sit? At the front, in the middle, or at the back?', '歡迎乘搭城市河觀光船！你想坐船頭、中間定船尾？', { force: true });
    choose('🎫 城市河觀光船：揀座位', BOAT_SEATS.map((st, i) => ({ label: `${st.n}（$${st.price}）`, sub: st.d, fn: () => buyBoat(i) })), `船會圍住城市河行一圈（大約 ${Math.round(BOAT_PATH.L / 12.5 / 60)} 分鐘），沿途有摩天輪、城市塔、燈塔、天際線、寶塔同音樂噴泉，導遊會用英文介紹`);
  }
  function buyBoat(i) {
    const st = BOAT_SEATS[i];
    if (!api.pay(st.price)) { sfx.error(); return toast(`💸 唔夠錢（船飛 $${st.price}）`, 3000); }
    stowBike(); sfx.pickup();
    toast(`🎫 買咗${st.n}位（$${st.price}），上船喇！撳「⏩ 返碼頭」可以提早落船`, 4000);
    say(`Here is your ticket. Your seat is at ${st.en} of the boat. ${VEH.boat[0]}`, `呢張係你嘅船飛，座位喺${st.n}。${VEH.boat[1]}`, { force: true });
    blackout(() => { P.boat = { seat: i }; river.startRide(i); }, 700);
  }
  function boatStep(dt) {
    const o = river.step(dt); if (!o) { P.boat = null; return; }
    P.pos.copy(o.pos); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.face = o.yaw;
    me.position.copy(o.pos); me.rotation.set(0, o.yaw, 0); me.scale.setScalar(1); sitPose(me, dt, false);
    if (ptrs.size === 0 && !firstPerson) { let d = o.yaw + Math.PI - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 0.8); }
    if (o.done) endBoat(true);
  }
  function endBoat(tp = true) {
    if (!P.boat) return; river.endRide(); P.boat = null;
    if (tp) { api.teleport(river.pier.x, 0.1, river.pier.z); toast('🚢 返到碼頭，多謝乘搭！', 3000); say('We are back at the pier. Thank you for joining the river cruise. Goodbye!', '返到碼頭喇，多謝乘搭觀光船，拜拜！', { force: true }); }
  }

  // ================= 豪景花園 ⇄ 日出康城：直通直升機 / 小巴 =================
  function buildShuttleStand() {
    const vc = village.center, inter = [], cols = [];
    const pad = new V3(vc.x + 46, 0, vc.z - 16), bus = new V3(vc.x - 46, 0, vc.z + 4);
    const padM = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ map: TXsign('H', '#2b2f36', '#ffd54f') }));
    padM.rotation.x = -Math.PI / 2; padM.position.set(pad.x, 0.06, pad.z); scene.add(padM);
    const heli = buildAircraft('heli', '#ff6f00'); heli.position.copy(pad); heli.rotation.y = Math.PI / 2; scene.add(heli);
    const mb = buildTransitModel('minibus'); mb.position.copy(bus); scene.add(mb);
    cols.push({ min: [bus.x - 1.1, 0, bus.z - 3], max: [bus.x + 1.1, 2.5, bus.z + 3] });
    const mkSign = (txt, bg, x, z) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.8), new THREE.MeshBasicMaterial({ map: TXsign(txt, bg, '#fff'), side: THREE.DoubleSide })); s.position.set(x, 2.6, z); scene.add(s); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), new THREE.MeshStandardMaterial({ color: '#555' })); p.position.set(x, 1.2, z - 0.02); scene.add(p); };
    mkSign('🚁 直航日出康城', '#e65100', pad.x - 11, pad.z + 6); mkSign('🚐 直通小巴：日出康城', '#2e7d32', bus.x + 3, bus.z + 5);
    inter.push({ pos: new V3(pad.x - 10, 0, pad.z), r: 5, label: () => '🚁 搭直通直升機去日出康城（$120）', act: () => shuttle('heli', 'lohas') });
    inter.push({ pos: new V3(bus.x + 2.6, 0, bus.z), r: 4, label: () => '🚐 搭直通小巴去日出康城（$12）', act: () => shuttle('minibus', 'lohas') });
    return { interactables: inter, colliders: cols, pad, bus, heli };
  }
  function shuttle(kind, to) {
    if (P.shuttle || P.transit) return toast('你已經喺車上 / 機上');
    if (P.flight || P.mech || P.seat || P.pass || P.boat) return toast('要先落車 / 落機');
    const dst = to === 'lohas' ? { pad: lohas.pad, bus: lohas.bus, name: '日出康城', en: 'LOHAS Park' } : { pad: shuttleStand.pad, bus: shuttleStand.bus, name: '豪景花園', en: 'Hong Kong Garden' };
    stowBike();
    if (kind === 'minibus') { say(`${VEH.minibus[0]} It goes straight to ${dst.en}.`, `${VEH.minibus[1]}直達${dst.name}。`, { force: true }); return startTransit('minibus', { x: dst.bus.x + 4, z: dst.bus.z, name: dst.name }); }
    if (!api.pay(120)) { sfx.error(); return toast('💸 唔夠錢（直升機 $120）', 3000); }
    const from = to === 'lohas' ? shuttleStand.pad : lohas.pad;
    const m = buildAircraft('heli', '#ff6f00'); scene.add(m); m.position.set(from.x, 0, from.z);
    const seat = new THREE.Object3D(); seat.position.copy(m.userData.seat); m.add(seat);
    const dist = Math.hypot(dst.pad.x - from.x, dst.pad.z - from.z);
    P.shuttle = { m, seat, from: from.clone(), to: dst.pad.clone(), t: 0, dur: Math.max(25, dist / 90 + 18), name: dst.name, en: dst.en, yaw: Math.atan2(dst.pad.x - from.x, dst.pad.z - from.z) };
    if (to === 'lohas') shuttleStand.heli.visible = false;
    firstPerson = false; $('btnFP').classList.remove('on'); camPitch = 0.25;
    sfx.whoosh(); toast(`🚁 直通直升機起飛！去${dst.name}（約 ${Math.round(P.shuttle.dur)} 秒）\n撳「⏩ 即刻到」可以跳過`, 4000);
    say(`${VEH.heli[0]} We are flying to ${dst.en}. Please fasten your seat belt.`, `${VEH.heli[1]}我哋飛去${dst.name}，請扣好安全帶。`, { force: true });
  }
  function shuttleStep(dt) {
    const S = P.shuttle; S.t += dt;
    const u = Math.min(1, S.t / S.dur), k = u < 0.15 ? 0 : u > 0.85 ? 1 : (u - 0.15) / 0.7, e = k * k * (3 - 2 * k);
    const h = 160 * Math.max(0, Math.min(1, S.t / 8, (S.dur - S.t) / 8));
    S.m.position.set(S.from.x + (S.to.x - S.from.x) * e, h, S.from.z + (S.to.z - S.from.z) * e);
    S.m.rotation.set(k > 0 && k < 1 ? -0.14 : 0, S.yaw, 0, 'YXZ');
    if (S.m.userData.rotor) S.m.userData.rotor.rotation.y += dt * 30; if (S.m.userData.tail) S.m.userData.tail.rotation.x += dt * 40;
    P.pos.copy(S.m.position); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.face = S.yaw;
    seatWorld(S.seat); me.position.copy(seatP); me.quaternion.copy(seatQ); me.scale.setScalar(1); sitPose(me, dt, false);
    if (ptrs.size === 0) { let d = S.yaw + Math.PI - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 1.2); }
    if (u >= 1) endShuttle(true);
  }
  function endShuttle(arrived) {
    const S = P.shuttle; if (!S) return; P.shuttle = null; scene.remove(S.m); shuttleStand.heli.visible = true;
    if (arrived) { api.teleport(S.to.x - 12, 0.1, S.to.z + 3); city.loadAll(P.pos); sfx.ding(); toast(`🚁 到咗${S.name}！`, 3000); say(`We have arrived. Welcome to ${S.en}!`, `到喇！歡迎嚟到${S.name}！`, { force: true }); }
  }

  // ================= 空中輕軌：坐喺車廂 =================
  function skyStep(dt) {
    const o = sky.step(); if (!o) return;
    P.pos.copy(o.pos); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.face = o.yaw;
    me.position.copy(o.pos); me.rotation.set(0, o.yaw, 0); me.scale.setScalar(1); sitPose(me, dt, false);
    if (ptrs.size === 0 && !firstPerson) { let d = o.yaw + Math.PI - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 1.2); }
  }

  // ================= 金色纜車（酒店外面個湖）=================
  const CB = world.cable, TAU = Math.PI * 2;
  const cabAng = i => elapsed * CB.speed + i / CB.cabins.length * TAU;
  const angD = a => { let d = (a - CB.S) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  function cabinAtStation() { let best = -1, bd = 1e9; CB.cabins.forEach((c, i) => { const d = Math.abs(angD(cabAng(i))); if (d < bd) { bd = d; best = i; } }); return bd < 0.07 ? best : -1; }
  function nextCabinSec() { let m = 1e9; CB.cabins.forEach((c, i) => { let d = (CB.S - cabAng(i)) % TAU; if (d < 0) d += TAU; m = Math.min(m, d / CB.speed); }); return m; }
  api.cableLabel = () => cabinAtStation() >= 0 ? '🚡 上纜車！' : `🚡 下一架纜車 ${Math.ceil(nextCabinSec())} 秒後到`;
  api.cableBoard = () => {
    const i = cabinAtStation(); if (i < 0) return toast(`🚡 纜車未到，等多 ${Math.ceil(nextCabinSec())} 秒`);
    stowBike(); P.cable = { i }; sfx.door();
    toast('🚡 上咗金色纜車！圍住個湖轉一圈，返到站撳「🚪 落纜車」', 4000);
    say('This is a cable car. It hangs from a strong steel cable. Enjoy the view!', '呢架係纜車（cable car），吊喺好堅固嘅鋼纜上面，慢慢欣賞風景啦！', { force: true });
  };
  api.cableLift = up => { sfx.door(); blackout(() => { const q = up ? CB.lift : CB.ground; api.teleport(q.x, q.y, q.z); if (up) toast('🚡 纜車站月台：纜車經過嗰陣撳「🚡 上纜車」', 3500); }, 500); };
  function cableStep(dt) {
    const c = CB.cabins[P.cable.i], a = cabAng(P.cable.i);
    P.pos.set(c.position.x, c.position.y - 4.0, c.position.z); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y;
    P.face = Math.atan2(-Math.sin(a) * 66, Math.cos(a) * 28);
    me.position.copy(P.pos); me.rotation.set(0, P.face, 0); me.scale.setScalar(1); sitPose(me, dt, false);
  }
  function leaveCable() {
    if (!P.cable) return;
    const atSt = cabinAtStation() === P.cable.i; P.cable = null;
    const go = () => { api.teleport(CB.plat.x, CB.plat.y, CB.plat.z); toast('🚶 喺纜車站落咗車'); };
    if (atSt) { go(); sfx.click(); } else blackout(go, 500);
  }

  // ================= 出拳打路人 / 俾路人打 =================
  function doPunch() {
    if (P.mech || P.flight || P.transit || P.seat || P.boat || P.shuttle || P.cable || bikeOn) return;
    P.punchT = 0.3; sfx.whoosh();
    if (peds.punch(P.pos, P.face)) { sfx.boom(); shake = Math.max(shake, 0.25); }
  }
  api.walkSpeed = () => 7.5 * (0.7 + 0.3 * P.scale);
  api.hitPlayer = dir => {
    if (api.busy() || bikeOn) return;
    P.pos.addScaledVector(dir, 2.2); P.vy = 4; P.grounded = false; shake = Math.max(shake, 0.6); sfx.error();
    const f = $('flash'); f.style.transition = 'none'; f.style.background = 'rgba(255,0,0,.4)'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 550); });
    toast('💥 俾個路人打咗一拳！快啲走！🏃（揸電單車走得快啲）', 2000);
    say('Ouch! Run away!', '好痛！快啲走！', { gap: 5000 });
  };

  // ================= 冷氣機展示（學英文）=================
  function buildACDisplay() {
    const B = new THREE.Group(), cols = [], x0 = 30, z0 = 26;
    const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); m.position.set(x, y, z); m.castShadow = true; B.add(m); return m; };
    box(6, 3, 0.3, '#eceff1', x0, 1.5, z0); cols.push({ min: [x0 - 3, 0, z0 - 0.15], max: [x0 + 3, 3, z0 + 0.15] });
    box(0.8, 0.5, 0.7, '#f5f5f5', x0 - 1.5, 1.6, z0 + 0.4); for (let k = 0; k < 6; k++) box(0.7, 0.02, 0.02, '#90a4ae', x0 - 1.5, 1.45 + k * 0.05, z0 + 0.76);
    box(1.1, 0.32, 0.25, '#fafafa', x0 + 1.4, 2.4, z0 + 0.3); box(0.9, 0.65, 0.35, '#eceff1', x0 + 1.4, 0.35, z0 + 0.9);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), new THREE.MeshStandardMaterial({ color: '#78909c' })); fan.rotation.x = Math.PI / 2; fan.position.set(x0 + 1.25, 0.35, z0 + 1.08); B.add(fan);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.7), new THREE.MeshBasicMaterial({ map: TXsign('❄️ 冷氣機展示', '#0277bd', '#fff') })); sg.position.set(x0, 2.75, z0 + 0.16); B.add(sg);
    scene.add(B);
    return { colliders: cols, spots: [{ x: x0 - 1.5, z: z0 + 1.6, key: 'acWindow' }, { x: x0 + 1.4, z: z0 + 1.8, key: 'acSplit' }] };
  }

  // ================= 附近有咩機械可以學英文 =================
  const learnSpots = [];
  setTimeout(() => {
    const kindOf = l => /巨無霸/.test(l) ? 'jumbo' : /戰鬥機/.test(l) ? 'fighter' : /直升機/.test(l) ? 'heli' : /飛機/.test(l) ? 'plane' : /的士/.test(l) ? 'taxi' : /小巴/.test(l) ? 'minibus' : /巴士/.test(l) ? 'bus' : null;
    airport.interactables.concat(stand.interactables, shuttleStand.interactables, lohas.interactables).forEach(it => { const k = kindOf(it.label()); if (k) learnSpots.push({ x: it.pos.x, y: it.pos.y, z: it.pos.z, r: k === 'jumbo' ? 16 : 7, key: k }); });
    acDisplay.spots.forEach(a => learnSpots.push({ ...a, y: 0, r: 3.2 }));
    learnSpots.push({ x: river.pier.x, y: 0, z: river.pier.z - 6, r: 9, key: 'boat' });
    learnSpots.push({ x: world.cable.plat.x, y: world.cable.plat.y, z: world.cable.plat.z, r: 8, key: 'cable' }, { x: world.cable.ground.x, y: 0, z: world.cable.ground.z, r: 4, key: 'cable' });
    learnSpots.push({ x: -186, y: 0, z: 9, r: 6, key: 'wheel' }, { x: arena.base.x, y: 0, z: arena.base.z, r: 8, key: 'mech' });
    sky.stations.forEach(si => learnSpots.push({ x: si.plat.x, y: si.plat.y, z: si.plat.z, r: 12, key: 'sky' }));
  }, 0);
  function learnNear() {
    if (P.flight || P.transit || P.boat || P.shuttle || P.cable || P.seat || P.pass || sky.riding() || mtr.riding() || school.active() || jail.active() || learn.isOpen()) return null;
    if (liftRoom.inside(P.pos)) return 'machine';
    if (lifts.insideCar(P.pos) || hotel.insideCar(P.pos)) return 'lift';
    if (P.mech) return 'mech';
    if (bikeOn) return 'bike';
    if (mtr.inside(P.pos)) return 'mtr';
    const p = P.pos; let best = null, bd = 1e9;
    const cand = (x, z, r, key, y = 0) => { const d = Math.hypot(p.x - x, p.z - z); if (d < r && d < bd && Math.abs(p.y - y) < 5) { bd = d; best = key; } };
    for (const s2 of learnSpots) cand(s2.x, s2.z, s2.r, s2.key, s2.y);
    PARK.forEach(v => cand(v.x, v.z, v.k === 'jumbo' ? 16 : v.k === 'bike' ? 2.5 : 7, v.k, v.y));
    campers.list.forEach(c => c.inter && cand(c.inter.pos.x, c.inter.pos.z, 7, 'camper', c.inter.pos.y));
    traffic.cars.forEach(c => { if (c.alive && !c.knock) cand(c.x, c.z, 4.5, c.kind || 'sedan'); });
    if (events.truck.visible) cand(events.truck.position.x, events.truck.position.z, 7, 'fire');
    if (events.pcar.visible) cand(events.pcar.position.x, events.pcar.position.z, 4.5, 'police');
    if (Math.abs(p.x) < 5000 && Math.abs(p.z) < 5000) for (const j of junctionsNear(p.x, p.z, 20)) [[-7.6, -7.6], [7.6, 7.6], [7.6, -7.6], [-7.6, 7.6]].forEach(([dx, dz]) => cand(j.x + dx, j.z + dz, 2.6, 'light'));
    return best;
  }

  // ================= 沖紅燈：罰 $100；唔夠錢就坐監 3 分鐘 =================
  function redLight() {
    sfx.siren();
    if (E.cash >= 100) {
      E.cash = Math.round((E.cash - 100) * 10) / 10; saveEcon();
      toast('🚨 沖紅燈！交通警察罰款 $100\n紅燈要停車，綠燈先好行！', 4500);
      say('You ran a red light! The fine is one hundred dollars. Red means stop!', '你沖紅燈！罰款一百蚊。紅燈即係要停！', { force: true });
    } else {
      say('You ran a red light, and you do not have enough money to pay the fine. You must go to jail for three minutes!', '你沖紅燈，又唔夠錢交罰款，要坐監三分鐘！', { force: true });
      jail.arrest(180, '🚦 沖紅燈，又唔夠錢交 $100 罰款');
    }
  }
  api.onRelease = () => say('You are free now. Remember: red means stop, green means go!', '你可以走喇。記住：紅燈停，綠燈行！', { force: true });

  // ================= 搭順風車：坐其他玩家架電單車 / 飛機（每架最多載 1 個人）=================
  const VEH_NAME = s => s.bk ? '電單車尾座' : s.fl ? ({ plane: '小型飛機', heli: '直升機', jumbo: '巨無霸', fighter: '戰鬥機' }[AIR_KINDS[s.fl[0]]] || '飛機') + '後座' : '';
  function riderTaken(id) { for (const r of remotes.values()) if (r.st && r.st.ps === id && r.id !== id) return true; return false; }
  function passInteract() {
    if (P.pass || P.transit || P.flight || P.mech || P.seat || P.camper >= 0) return null;
    let best = null, bd = 1e9;
    for (const r of remotes.values()) {
      const s = r.st; if (!s || !(s.bk || s.fl) || s.ps) continue;
      const lim = s.fl ? (AIR_KINDS[s.fl[0]] === 'jumbo' ? 18 : 7) : 2.8, d = Math.hypot(r.pos.x - P.pos.x, r.pos.z - P.pos.z);
      if (d < lim && Math.abs(r.pos.y - P.pos.y) < (s.fl ? 6 : 2.5) && d < bd) { bd = d; best = r; }
    }
    if (!best) return null;
    const r = best;
    return { label: () => `🙋 坐 ${r.name} 嘅${VEH_NAME(r.st)}`, act: () => { if (riderTaken(r.id)) return toast('😅 呢架車已經載咗 1 個人，坐唔落喇'); P.pass = r.id; stowBike(); sfx.door(); toast(`🙋 你坐咗 ${r.name} 嘅${VEH_NAME(r.st)}！撳「🚪 落車」就落`, 3500); } };
  }
  function leavePass() {
    const r = remotes.get(P.pass); P.pass = 0;
    const base = r ? r.pos : P.pos;
    api.teleport(base.x + 1.5, Math.max(0, base.y) + 0.1, base.z + 1.5);
    toast('🚪 落咗車');
  }
  // 乘客位置（司機背後 / 機艙後座），out = 腳底位置；喺飛機入面回傳 true（方向用 psQ）
  const psQ = new THREE.Quaternion();
  function riderSpot(dPos, dFace, st, plane, out) {
    if (st.fl && plane) { seatWorld(plane.userData.seatObj); psQ.copy(seatQ); out.copy(seatP).add(trTmp.set(0, 0.15, -1.1).applyQuaternion(seatQ)); return true; }
    out.set(dPos.x - Math.sin(dFace) * 0.55, dPos.y + 0.5, dPos.z - Math.cos(dFace) * 0.55); return false;
  }
  function passStep(dt) {
    const r = remotes.get(P.pass);
    if (!r || !r.st || !(r.st.bk || r.st.fl)) { leavePass(); return; }
    const inPlane = riderSpot(r.pos, r.face, r.st, r.plane, trSeat);
    P.pos.copy(trSeat); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.face = r.face;
    me.position.copy(trSeat); if (inPlane) me.quaternion.copy(psQ); else me.rotation.set(0, r.face, 0); me.scale.setScalar(1); sitPose(me, dt, false);
    if (!inPlane) bikePose(me);
  }


  // ================= 飛機 / 直升機 =================
  let flUp = false, flDown = false;
  const holdBtn = (id, on) => { const b = $(id); const set = v => e => { on(v); e.preventDefault(); }; b.addEventListener('pointerdown', set(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, set(false))); };
  holdBtn('flUp', v => flUp = v); holdBtn('flDown', v => flDown = v);
  $('flExit').onclick = () => exitFlight();
  function startFlight(kind, x, z, yaw, color, y = 0) {
    if (P.seat) leaveRide(); if (P.mech) mechOff(); P.camper = -1; stowBike();
    if (P.held) setHeld(P.held);
    const F = new Flight(kind, x, z, yaw); F.color = color; F.pos.y = y || 0;
    say(...VEH[kind]);
    F.model = buildAircraft(kind, color); scene.add(F.model);
    F.seat = new THREE.Object3D(); F.seat.position.copy(F.model.userData.seat); F.model.add(F.seat);
    P.flight = F; firstPerson = false; $('btnFP').classList.remove('on'); camPitch = 0.2; camYaw = yaw + Math.PI;
    $('flightPanel').classList.remove('hidden'); $('rbtn').classList.add('hidden'); sfx.whoosh();
    const vt = { plane: 100, jumbo: 220, fighter: 230 }[kind];
    toast(kind !== 'heli' ? `✈ 撳住右下角「⬆」加油門，去到 ${vt} km/h 再拉搖桿向後就起飛\n搖桿左右轉彎；只可以喺公路或者機場升降` : '🚁 撳住「⬆」升高、「⬇」降落，搖桿前後左右飛\n只可以喺公路、機場或者停機坪降落', 6000);
  }
  function endFlight(noPark) {
    const F = P.flight; if (!F) return; scene.remove(F.model);
    if (!noPark) parkVeh({ k: F.kind, x: F.pos.x, y: F.ground ? F.pos.y : 0, z: F.pos.z, yaw: F.yaw, c: F.color }); P.flight = null; $('flightPanel').classList.add('hidden'); $('rbtn').classList.remove('hidden'); me.rotation.set(0, P.face, 0); me.userData.body.position.y = 0; }
  function exitFlight() {
    const F = P.flight; if (!F) return;
    if (!(F.ground && F.speed < 3)) return toast('要停喺地面先落得機');
    const side = new V3(Math.cos(F.yaw), 0, -Math.sin(F.yaw));
    const p = F.pos.clone().addScaledVector(side, { plane: 6.5, heli: 3.5, jumbo: 12, fighter: 4.5 }[F.kind]);
    endFlight(); api.teleport(p.x, p.y + 0.1, p.z); sfx.door(); toast('🚶 落咗機。架機泊咗喺度，下次行返嚟撳「揸返」就得', 3500);
  }
  function crashFlight() {
    endFlight(true);
    sfx.boom(); shake = 1.2; const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity 1.5s'; f.style.opacity = 0; });
    api.teleport(airport.spawn.x, 0.1, airport.spawn.z); city.loadAll(P.pos);
    toast('💥 墜機！（純屬遊戲）你返咗去機場，可以再租過架', 4000);
  }
  function flightHit(p, ground) {
    for (const c of nearCols(p.x, p.z, 8, false)) {
      if (c.max[1] < 0.6) continue;
      const r = P.flight && P.flight.kind === 'jumbo' ? 5 : 3.2;
      if (p.x > c.min[0] - r && p.x < c.max[0] + r && p.z > c.min[2] - r && p.z < c.max[2] + r && p.y + 2.5 > c.min[1] && p.y + 0.4 < c.max[1]) return c;
    }
    return null;
  }

  // ================= 機甲 + 怪獸 =================
  let myMech = buildMech(0); myMech.visible = false; scene.add(myMech);
  let monSt = null;
  // 揀機甲（3 揀 1）
  function pickMech() {
    const el = $('mechCards'); el.innerHTML = '';
    MECHS.forEach((m, k) => {
      const b = document.createElement('button'); b.className = 'mcard';
      b.innerHTML = `<span class="sw" style="background:linear-gradient(135deg,${m.armor} 0 40%,${m.main} 40% 70%,${m.acc} 70%)"></span><b>${m.name}</b><small>${m.desc}</small>`;
      b.onclick = () => { $('mechModal').classList.add('hidden'); toMech(k); };
      el.appendChild(b);
    });
    $('mechModal').classList.remove('hidden'); sfx.click();
  }
  $('mechClose').onclick = () => $('mechModal').classList.add('hidden');
  function toMech(style = 0) {
    if (P.held) setHeld(P.held); stowBike();
    if (myMech.userData.style !== style) { scene.remove(myMech); myMech = buildMech(style); scene.add(myMech); attachJets(); }
    P.mech = { hp: 300, punchT: 0, beamT: 0, beamCd: 0, style, since: performance.now(), shield: false, dash: null, iframe: 0, dashCd: 0, jetT: 0 };
    say(...VEH.mech);
    api.teleport(arena.gate.x, 0.1, arena.gate.z); P.face = -Math.PI / 2; camYaw = Math.PI / 2; camPitch = 0.25; firstPerson = false; $('btnFP').classList.remove('on');
    $('mechPanel').classList.remove('hidden'); $('fightHud').classList.remove('hidden');
    sfx.whoosh(); shake = 0.6; toast(`🤖 ${MECHS[style].name} 變身完成！` + '👊 出拳、⚡ 光炮、🛡 盾牌（擋 80% 傷害）\n快速撳兩下 ◀ / ▶ = 極速閃避；撳「跳」= 噴射飛起（可以一直撳）', 6000);
  }
  function mechOff(msg) {
    if (!P.mech) return; P.mech = null; myMech.visible = false; shieldMesh.visible = false; arena.fireBeam(null, null, false); $('mkShield').classList.remove('on');
    $('mechPanel').classList.add('hidden'); $('fightHud').classList.add('hidden');
    api.teleport(arena.base.x, 0.1, arena.base.z); toast(msg || '🙂 變返人');
  }
  // 盾牌（擋 80% 傷害）、極速閃避、噴射
  const shieldMesh = new THREE.Group();
  { const m = new THREE.Mesh(new THREE.CircleGeometry(11, 6), new THREE.MeshBasicMaterial({ color: '#40c4ff', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })); shieldMesh.add(m);
    const e = new THREE.Mesh(new THREE.RingGeometry(10.4, 11, 6), new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.85, side: THREE.DoubleSide })); shieldMesh.add(e); }
  shieldMesh.visible = false; scene.add(shieldMesh);
  const jetMat = new THREE.MeshBasicMaterial({ color: '#ff9100', transparent: true, opacity: 0.85, depthWrite: false });
  const jets = [-2.2, 2.2].map(x => { const c = new THREE.Mesh(new THREE.ConeGeometry(1.3, 7, 12), jetMat); c.rotation.x = Math.PI; c.position.set(x, -3, 0); c.visible = false; return c; });
  function attachJets() { jets.forEach(j => myMech.add(j)); }
  attachJets();
  function toggleShield(on) { if (!P.mech) return; P.mech.shield = on ?? !P.mech.shield; $('mkShield').classList.toggle('on', P.mech.shield); sfx.click(); if (P.mech.shield) say('Shield up!', '盾牌！', { gap: 20000 }); }
  function mechDash(side) {
    const M = P.mech; if (!M || M.dashCd > 0) return;
    const r = new V3(Math.cos(camYaw), 0, -Math.sin(camYaw)).multiplyScalar(side * 115);
    M.dash = { vx: r.x, vz: r.z, t: 0.32 }; M.iframe = performance.now() + 700; M.dashCd = 0.55;
    sfx.whoosh(); shake = Math.max(shake, 0.3);
    say(side < 0 ? 'Dash to the left!' : 'Dash to the right!', side < 0 ? '極速向左閃！' : '極速向右閃！', { gap: 15000 });
  }
  const tapT = {};
  addEventListener('keydown', e => {
    if (!P.mech || e.repeat || e.target.tagName === 'INPUT') return;
    const side = (e.code === 'ArrowLeft' || e.code === 'KeyA') ? -1 : (e.code === 'ArrowRight' || e.code === 'KeyD') ? 1 : 0;
    if (side) { const now = performance.now(); if (now - (tapT[side] || 0) < 300) { mechDash(side); tapT[side] = 0; } else tapT[side] = now; }
    if (e.code === 'KeyQ') toggleShield();
  });
  function monDist() { return monSt ? Math.hypot(arena.mon.pos.x - P.pos.x, arena.mon.pos.z - P.pos.z) : 1e9; }
  function mechPunch() {
    const M = P.mech; if (!M || M.punchT > 0) return;
    M.punchT = 0.5; sfx.whoosh();
    if (!monSt || monSt.s === 'dead') return toast('👾 而家冇怪獸，等緊下一隻出嚟');
    // 近身就衝前：150 米內撳出拳會自動衝埋去怪獸面前
    const d0 = monDist();
    if (d0 > 150) return toast(`太遠喇！怪獸喺 ${Math.round(d0)} 米外，行近啲（150 米內）先出拳，或者用 ⚡ 光炮`);
    if (d0 > 34) { const k = (d0 - 32) / d0; P.pos.x += (arena.mon.pos.x - P.pos.x) * k; P.pos.z += (arena.mon.pos.z - P.pos.z) * k; }
    P.face = Math.atan2(arena.mon.pos.x - P.pos.x, arena.mon.pos.z - P.pos.z);
    setTimeout(() => { if (P.mech && monSt && monSt.s !== 'dead' && monDist() < 80) hitKaiju(60); }, 250);
  }
  function mechBeam() {
    const M = P.mech; if (!M || M.beamCd > 0) return;
    if (!monSt || monSt.s === 'dead') return toast('👾 而家冇怪獸，等緊下一隻出嚟');
    if (monDist() > 250) return toast(`光炮射程 250 米，怪獸喺 ${Math.round(monDist())} 米外，行近啲先射`);
    M.beamCd = 3; M.beamT = 0.8; sfx.alarm(0.3);
    setTimeout(() => { if (P.mech) hitKaiju(110); }, 300);
  }
  // 打中：即刻喺自己畫面扣血（伺服器之後會同步返真正血量）+ 彈出傷害數字
  function hitKaiju(dmg) {
    net.send({ t: 'khit', dmg }); sfx.boom(); shake = 0.5; hitFx();
    monSt.hp = Math.max(0, monSt.hp - dmg); arena.setMonster(monSt);
    const el = document.createElement('div'); el.className = 'dmgPop'; el.textContent = `-${dmg}`;
    el.style.left = (45 + Math.random() * 10) + '%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
  }
  function hitFx() { const f = $('flash'); f.style.transition = 'none'; f.style.background = 'radial-gradient(rgba(255,255,255,.6),transparent 60%)'; f.style.opacity = 0.7; requestAnimationFrame(() => { f.style.transition = 'opacity .4s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 450); }); }
  $('mkPunch').onclick = () => mechPunch(); $('mkBeam').onclick = () => mechBeam();
  $('mkShield').onclick = () => toggleShield(); $('mkDashL').onclick = () => mechDash(-1); $('mkDashR').onclick = () => mechDash(1); $('mkOff').onclick = () => { if (P.mech && performance.now() - P.mech.since > 1500) mechOff(); };
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.code === 'KeyF') { if (P.mech) mechPunch(); else doPunch(); } if (e.code === 'KeyR') mechBeam(); });
  function mechUpdate(dt, moving) {
    const M = P.mech;
    if (!inStage(P.pos)) return mechOff('🙂 行出咗決戰場，變返人');
    M.punchT -= dt; M.beamT -= dt; M.beamCd -= dt; M.dashCd -= dt; M.jetT -= dt;
    if (P.pos.y > 140 && P.vy > 0) P.vy = 0;
    shieldMesh.visible = M.shield; if (M.shield) { shieldMesh.position.set(P.pos.x + Math.sin(P.face) * 7, P.pos.y + 16, P.pos.z + Math.cos(P.face) * 7); shieldMesh.rotation.set(0, P.face, 0); }
    jets.forEach(j => { j.visible = M.jetT > 0 || (!P.grounded && P.vy > 0); j.scale.y = 0.7 + Math.random() * 0.6; });
    if (monSt && monSt.s !== 'dead') { const dx = P.pos.x - arena.mon.pos.x, dz = P.pos.z - arena.mon.pos.z, d = Math.hypot(dx, dz); if (d < 28 && d > 0.01) { P.pos.x += dx / d * (28 - d); P.pos.z += dz / d * (28 - d); } }
    myMech.position.copy(P.pos); myMech.rotation.set(0, P.face, 0);
    animateMech(myMech, moving, dt, Math.max(0, M.punchT), Math.max(0, M.beamT));
    if (M.beamT > 0 && monSt && monSt.s !== 'dead') { const from = P.pos.clone().add(new V3(Math.sin(P.face) * 3, 19, Math.cos(P.face) * 3)); arena.fireBeam(from, arena.mon.pos.clone().add(new V3(0, 25, 0)), true); P.face = Math.atan2(arena.mon.pos.x - P.pos.x, arena.mon.pos.z - P.pos.z); }
    else arena.fireBeam(null, null, false);
    $('mkBeam').textContent = M.beamCd > 0 ? `⚡ ${Math.ceil(M.beamCd)}` : '⚡ 光炮';
    if (monSt) { $('khName').textContent = `👾 ${KAIJU[monSt.ty].name}${monSt.s === 'dead' ? '（已打低！等緊下一隻）' : ''}`; $('khBar').style.width = (100 * monSt.hp / monSt.mx) + '%'; }
    $('myBar').style.width = Math.max(0, M.hp / 3) + '%';
  }
  function monTargetPos() { if (!monSt || !monSt.tg) return null; if (monSt.tg === net.id) return P.pos; const r = remotes.get(monSt.tg); return r ? r.pos : null; }
  function kaijuEvent(m) {
    if (m.kind === 'kAtk' && m.to === net.id && P.mech) {
      setTimeout(() => {
        if (!P.mech) return; const range = m.a === 'swipe' ? 75 : 240;
        if (monDist() > range) return;
        if (P.mech.iframe > performance.now()) { toast('💨 閃避成功！怪獸打唔中你', 1500); say('You dodged it! Great job!', '閃避成功！好嘢！', { gap: 20000 }); return; }
        const dmg = P.mech.shield ? Math.max(1, Math.round(m.dmg * 0.2)) : m.dmg;
        P.mech.hp -= dmg; shake = P.mech.shield ? 0.4 : 1; sfx.boom();
        if (P.mech.shield) { toast(`🛡 盾牌擋咗 80%！只係 -${dmg}`, 1300); if (P.mech.hp > 0) return; }
        const f = $('flash'); f.style.transition = 'none'; f.style.background = 'rgba(255,0,0,.45)'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 650); });
        toast(m.a === 'swipe' ? `💢 俾怪獸掃中！-${m.dmg}` : `🔥 俾怪獸光線射中！-${m.dmg}`, 1200);
        if (P.mech.hp <= 0) mechOff('💥 機甲俾怪獸打爆咗！（純屬遊戲）再入基地變身過啦');
      }, m.a === 'swipe' ? 800 : 1200);
    }
    if (m.kind === 'kDead' && inStage(P.pos)) { toast(`🎉 ${m.by} 打低咗 ${KAIJU[m.ty].name}！12 秒後會有新怪獸`, 4000); sfx.pickup(); }
    if (m.kind === 'kSpawn' && inStage(P.pos)) { toast(`⚠️ 新怪獸出現：${KAIJU[m.ty].name}！`, 3000); sfx.alarm(1); }
  }
  function remoteVehicles(r, s, dt) {
    if (s.fl) {
      const kind = AIR_KINDS[s.fl[0]] || 'plane';
      if (!r.plane || r.plane.userData.kind !== kind) { if (r.plane) scene.remove(r.plane); r.plane = buildAircraft(kind, s.fl[4] || '#e53935'); const so = new THREE.Object3D(); so.position.copy(r.plane.userData.seat); r.plane.add(so); r.plane.userData.seatObj = so; scene.add(r.plane); }
      r.plane.visible = true; r.plane.position.copy(r.pos); r.plane.rotation.set(-s.fl[2], s.fl[1], -s.fl[3], 'YXZ');
      if (r.plane.userData.prop) r.plane.userData.prop.rotation.z += dt * 30; if (r.plane.userData.rotor) r.plane.userData.rotor.rotation.y += dt * 25;
    } else if (r.plane) r.plane.visible = false;
    if (s.mk) {
      if (!r.mech || r.mech.userData.style !== s.mk - 1) { if (r.mech) scene.remove(r.mech); r.mech = buildMech(s.mk - 1); scene.add(r.mech); }
      r.mech.visible = true; r.mech.position.copy(r.pos); r.mech.rotation.set(0, r.face, 0); animateMech(r.mech, s.a === 1, dt, s.ma === 1 ? 0.25 : 0, s.ma === 2 ? 0.5 : 0);
      r.av.visible = false;
    } else { if (r.mech) r.mech.visible = false; r.av.visible = true; }
  }

  if (location.search.includes('debug')) window.__g = { learn, peds, themeParks, learnNear, doPunch, world, traffic, events, jail, river, mtr, sky, lohas, nightLock, PARK, shuttleStand, redLight, boatTicket, shuttle, mechDash, toggleShield, say, school, pick: (x, z) => { const f = mapPick; if (f) { closeMap(); f(x, z); } }, P, E, lifts, vault, apartments, remotes, P_api: api, park, hotel, campers, city, airport, arena, village, net, api, camera, scene, setFP: v => { firstPerson = v; }, tick: n => { for (let i = 0; i < n; i++) frame(); }, cam: (y, p, d) => { camYaw = y; camPitch = p; if (d) camDist = d; } };

  // ================= 主迴圈 =================
  const clock = new THREE.Clock();
  const ray = new THREE.Raycaster();
  let elapsed = 0, honkT = 1, learnT = 0; const lastRam = new V3();
  function loop() { requestAnimationFrame(loop); frame(); }
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    const T = net.now();
    lifts.update(dt, T);
    hotel.update(dt, T, P.pos);
    park.update(T / 1000);

    // 移動輸入
    let ix = joy.x, iy = joy.y;
    if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (school.active() || nightLock.locked()) { ix = iy = 0; }
    const im = Math.hypot(ix, iy); if (im > 1) { ix /= im; iy /= im; }
    const fwd = new V3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), right = new V3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    campers.update(T);
    city.update(P.pos);
    // 入室內 / 上其他車：電單車自動泊喺最後喺室外嘅位置（唔會消失）
    // 電單車：行經室內 / 舖頭範圍只係暫時落車行路，出返室外自動再揸（唔會無端端俾你落車）；
    // 只有離開咗落車位置好遠（例如傳送、搭 Lift 入金庫 / 地鐵）先將架車泊喺最後嗰個位
    { const nowBike = P.bike && !isIndoors() && !P.boat && !P.shuttle && !sky.riding();
      if (nowBike) lastBike = { x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.face };
      else if (P.bike && lastBike && Math.hypot(P.pos.x - lastBike.x, P.pos.z - lastBike.z) > 40) { stowBike(); toast('🅿️ 電單車泊返喺你頭先落車嘅位置', 2500); }
      bikeOn = nowBike; }
    const speed = P.mech ? 16 : (bikeOn ? 22 : 7.5) * (0.7 + 0.3 * P.scale);
    const mv = fwd.multiplyScalar(iy * speed).addScaledVector(right, ix * speed);
    if (P.mech && P.mech.dash && P.mech.dash.t > 0) { mv.x += P.mech.dash.vx; mv.z += P.mech.dash.vz; P.mech.dash.t -= dt; }
    let turn = 0;
    if (mv.lengthSq() > 0.01) { const tf = Math.atan2(mv.x, mv.z); let df = tf - P.face; df = Math.atan2(Math.sin(df), Math.cos(df)); turn = df; P.face += df * Math.min(1, dt * (bikeOn ? 7 : 14)); }
    airport.update(P.pos); village.update(P.pos); vault.update(P.pos); apartments.update(P.pos); school.update(dt, P.pos);
    liftRoom.update(P.pos); tunnels.update(dt, P.pos); themeParks.update(dt, T / 1000, P.pos);
    jail.update(dt, P.pos); river.update(dt, T, P.pos); mtr.update(dt, P.pos); sky.update(dt, P.pos); lohas.update(P.pos);
    const mtrInfo = mtr.step(dt);
    if (P.boat) boatStep(dt);
    else if (P.shuttle) shuttleStep(dt);
    else if (sky.riding()) skyStep(dt);
    else if (P.cable) cableStep(dt);
    else if (P.transit) transitStep(dt);
    else if (P.pass) passStep(dt);
    else if (P.flight) {
      // 揸緊飛機 / 直升機
      const F = P.flight;
      const ev = F.step(dt, { x: ix, y: iy, up: keys.Space || flUp, down: keys.KeyC || keys.ShiftLeft || flDown, camYaw }, flightHit);
      if (ev === 'crash') crashFlight();
      else if (ev && ev !== P.flight._lastEv) {
        const msg = { offroad: '🛑 呢度唔係公路 / 機場：唔會爆，但只可以慢慢滑行，返去公路先起飛得', noland: '🚁 呢度唔可以降落：要喺公路、機場或者停機坪', bump: '💥 撞到嘢！飛機彈開咗（唔會爆）', hard: '🛬 砰！硬著陸，不過飛機冇事', soft: '🛬 安全降落咗（唔喺公路，要慢慢滑行返公路先起飛）', roof: '🏢 停咗喺天台，冇事' }[ev];
        if (msg) toast(msg, 3000);
        if (ev === 'bump') { sfx.boom(); shake = 0.6; say('Bump! Be careful. The plane is OK.', '撞到嘢！小心啲，飛機冇事。', { gap: 15000 }); }
      }
      if (P.flight) {
        P.flight._lastEv = ev;
        const m = F.model; m.position.copy(F.pos); m.rotation.set(-F.pitch, F.yaw, -F.roll, 'YXZ');
        if (m.userData.flame) m.userData.flame.scale.setScalar(0.3 + F.throttle);
        if (m.userData.prop) m.userData.prop.rotation.z = F.spin; if (m.userData.rotor) { m.userData.rotor.rotation.y = F.spin; m.userData.tail.rotation.x = F.spin * 1.5; }
        P.pos.copy(F.pos); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.face = F.yaw;
        seatWorld(F.seat); me.position.copy(seatP); me.quaternion.copy(seatQ); me.scale.setScalar(1); sitPose(me, dt, false);
        $('flInfo').textContent = `${{ plane: '✈', heli: '🚁', jumbo: '🛫', fighter: '🛩' }[F.kind]} 速度 ${Math.round(F.speed * 3.6)} km/h ｜ 高度 ${Math.round(F.pos.y)} 米${F.kind !== 'heli' ? ` ｜ 油門 ${Math.round(F.throttle * 100)}%` : ''}${F.ground ? ' ｜ 喺地面' : ''}`;
        if (ptrs.size === 0) { let d = F.yaw + Math.PI - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 1.5); }
      }
    } else if (P.seat) {
      // 坐緊機動遊戲：位置 / 方向跟座位
      const r = park.rides[P.seat.r];
      seatWorld(r.seats[P.seat.s]);
      P.pos.copy(seatP); P.vy = 0; P.grounded = true; P.fallFrom = P.pos.y; P.anim = 0;
      me.position.copy(seatP); me.quaternion.copy(seatQ); me.scale.setScalar(P.scale);
      sitPose(me, dt, r.thrill);
    } else {
      if (P.camper >= 0) {
        // 喺露營車入面：用車廂本地座標計物理，車行緊都可以企定 / 行嚟行去
        const c = campers.list[P.camper];
        P.face += c.yaw - c.prevYaw;
        const wp = P.pos.clone(); P.pos.copy(P.lp);
        physics(dt, c.rotL(mv), c.cols);
        P.lp.copy(P.pos); c.toWorld(P.lp, P.pos);
        if (Math.abs(P.lp.x) > 1.6 || Math.abs(P.lp.z) > 4.6 || P.lp.y < 0.2) { P.camper = -1; P.rideObj = null; P.fallFrom = P.pos.y; toast(`🚶 落咗${c.name.slice(3)}`); }
      } else physics(dt, mv);
      P.anim = !P.grounded && P.vy < -12 ? 2 : (mv.lengthSq() > 0.01 ? 1 : 0);
      me.position.copy(P.pos); me.rotation.set(0, P.face, 0); me.scale.setScalar(P.scale);
      if (bikeOn) {
        animateAvatar(me, 0, dt); bikePose(me); me.position.y += 0.42 * P.scale;
        myBike.visible = true; myBike.position.copy(P.pos); myBike.scale.setScalar(P.scale);
        bikeLean += ((mv.lengthSq() > 1 ? -turn * 0.9 : 0) - bikeLean) * Math.min(1, dt * 6);
        myBike.rotation.set(0, P.face, Math.max(-0.5, Math.min(0.5, bikeLean)));
        me.rotation.z = myBike.rotation.z;
        bikeSpin += Math.sqrt(mv.x * mv.x + mv.z * mv.z) * dt / 0.36; myBike.userData.wheels.forEach(w => w.rotation.x = bikeSpin);
      } else {
        myBike.visible = false;
        animateAvatar(me, P.anim, dt, Math.min(1.4, im + 0.3));
        if (P.punchT > 0) { P.punchT -= dt; me.userData.armR.rotation.x = -1.7; me.userData.armR.rotation.z = 0; }
      }
      if (P.mech) mechUpdate(dt, mv.lengthSq() > 0.01);
    }
    myMech.visible = !!P.mech;
    // 交通燈、車、城市突發事件
    { const tr = traffic.update(dt, T, P.pos, bikeOn);
      if (tr.red) redLight();
      if (tr.honk) { honkT -= dt; if (honkT <= 0) { honkT = 4; sfx.horn(); } } else honkT = 0.8; }
    events.update(dt, P.pos, school.active() || jail.active() || api.busy());
    peds.update(dt, P.pos, school.active() || jail.active() || mtr.inside(P.pos) || tunnels.inside(P.pos));
    // 好似 GTA 咁：揸電單車 / 機甲 / 飛機撞飛啲車、消防車、警車、空中輕軌
    { const v = trTmp.copy(P.pos).sub(lastRam).divideScalar(Math.max(dt, 1e-3)); lastRam.copy(P.pos);
      const sp = Math.hypot(v.x, v.z), can = (bikeOn || P.mech || (P.flight && P.pos.y < 30)) && sp > (P.mech ? 1 : 4) && sp < 400;
      if (can) {
        const R = P.mech ? 7 : P.flight ? ({ jumbo: 9, plane: 4, fighter: 4, heli: 4 }[P.flight.kind]) : 1.1;
        const n = traffic.knock(P.pos, v, R) + events.knock(P.pos, v, R) + sky.knock(P.pos, v, R);
        if (n) { sfx.boom(); shake = Math.max(shake, 0.5); toast(n > 1 ? `💥 一下撞飛咗 ${n} 架車！` : '💥 撞飛咗！', 1500); say('Crash! Boom! Look out!', '撞飛咗！小心呀！', { gap: 8000 }); }
      } }
    learnT -= dt; if (learnT <= 0) { learnT = 0.25; learn.setNear(learnNear()); }
    arena.update(dt, T, P.pos, monTargetPos());
    if (myDog) myDog.visible = !(P.cable || P.boat || P.shuttle || P.transit || P.flight || P.seat || P.pass || sky.riding());
    dogFollow(myDog, P.pos, P.face, dt);
    if (P.spraying) emitSpray(me);

    // 遠端玩家
    for (const r of remotes.values()) {
      const s = r.st; if (!s) continue;
      const baseY = s.rl >= 0 ? lifts.lifts[s.rl].y : 0;
      const rc = s.cp >= 0 && s.lp ? campers.list[s.cp] : null;
      const tgt = rc ? rc.toWorld(new V3(...s.lp)) : new V3(s.p[0], s.p[1] + baseY, s.p[2]);
      if (rc) r.pos.copy(tgt);
      else if (r.pos.distanceTo(tgt) > 8 || s.rl >= 0) { r.pos.x += (tgt.x - r.pos.x) * Math.min(1, dt * 12); r.pos.z += (tgt.z - r.pos.z) * Math.min(1, dt * 12); r.pos.y = tgt.y; if (r.pos.distanceTo(tgt) > 8) r.pos.copy(tgt); }
      else r.pos.lerp(tgt, Math.min(1, dt * 12));
      let df = s.r - r.face; df = Math.atan2(Math.sin(df), Math.cos(df)); r.face += df * Math.min(1, dt * 12);
      const rr = s.sd && park.rides[s.sd[0]], rs = rr && rr.seats[s.sd[1]];
      remoteVehicles(r, s, dt);
      // 其他玩家搭緊的士 / 小巴 / 巴士
      if (s.tr) {
        const id = (TRANSIT[s.tr[0]] || TRANSIT[0]).id;
        if (!r.tveh || r.tveh.userData.id !== id) { if (r.tveh) scene.remove(r.tveh); r.tveh = buildTransitModel(id); scene.add(r.tveh); }
        const sv = r.tveh.userData.seat, cs = Math.cos(s.tr[1]), sn = Math.sin(s.tr[1]);
        r.tveh.visible = true; r.tveh.rotation.y = s.tr[1];
        r.tveh.position.set(r.pos.x - (sv.x * cs + sv.z * sn), r.pos.y - sv.y, r.pos.z - (-sv.x * sn + sv.z * cs));
        r.av.position.copy(r.pos); r.av.rotation.set(0, s.tr[1], 0); sitPose(r.av, dt, false); attachHeld(r.av, null);
        r.tag.position.set(r.pos.x, r.pos.y + 2.15, r.pos.z);
        continue;
      } else if (r.tveh) r.tveh.visible = false;
      // 其他玩家坐緊觀光船 / 空中輕軌
      if (s.bt) {
        if (!r.boat) { r.boat = buildBoat('#1565c0'); scene.add(r.boat); }
        const sv = r.boat.userData.seats[s.bt[1]] || r.boat.userData.seats[0], cs = Math.cos(s.bt[0]), sn = Math.sin(s.bt[0]);
        r.boat.visible = true; r.boat.rotation.y = s.bt[0];
        r.boat.position.set(r.pos.x - (sv.x * cs + sv.z * sn), r.pos.y - sv.y, r.pos.z - (-sv.x * sn + sv.z * cs));
        r.av.position.copy(r.pos); r.av.rotation.set(0, s.bt[0], 0); sitPose(r.av, dt, false); attachHeld(r.av, null);
        r.tag.position.set(r.pos.x, r.pos.y + 2.15, r.pos.z);
        continue;
      } else if (r.boat) r.boat.visible = false;
      if (s.sk) { r.av.position.copy(r.pos); r.av.rotation.set(0, r.face, 0); sitPose(r.av, dt, false); attachHeld(r.av, null); r.tag.position.set(r.pos.x, r.pos.y + 2.15, r.pos.z); continue; }
      // 坐緊順風車（司機可以係我或者其他玩家）
      if (s.ps) {
        const dme = s.ps === net.id, dr = dme ? null : remotes.get(s.ps);
        if (dme ? (bikeOn || P.flight) : (dr && dr.st)) {
          const inPlane = riderSpot(dme ? P.pos : dr.pos, dme ? P.face : dr.face, dme ? { bk: bikeOn ? 1 : 0, fl: P.flight ? 1 : 0 } : dr.st, dme ? (P.flight ? { userData: { seatObj: P.flight.seat } } : null) : dr.plane, trSeat);
          r.pos.copy(trSeat); r.av.position.copy(trSeat);
          if (inPlane) r.av.quaternion.copy(psQ); else r.av.rotation.set(0, dme ? P.face : dr.face, 0);
          sitPose(r.av, dt, false); if (!inPlane) bikePose(r.av); attachHeld(r.av, null);
          r.tag.position.set(r.pos.x, r.pos.y + 2.15, r.pos.z);
          if (dme && !r.rodeMe) { r.rodeMe = true; toast(`🙋 ${r.name} 坐咗你架車！`); }
          continue;
        }
      }
      r.rodeMe = false;
      if (s.fl) {
        const m = r.plane; seatWorld(m.userData.seatObj); r.av.position.copy(seatP); r.av.quaternion.copy(seatQ); sitPose(r.av, dt, false); attachHeld(r.av, null);
      } else if (rs) {
        seatWorld(rs); r.pos.copy(seatP); r.av.position.copy(seatP); r.av.quaternion.copy(seatQ); r.av.scale.setScalar(s.sc || 1);
        sitPose(r.av, dt, rr.thrill); attachHeld(r.av, null);
      } else {
        r.av.position.copy(r.pos); r.av.rotation.set(0, r.face, 0); r.av.scale.setScalar(s.sc || 1);
        if (s.bk) {
          if (!r.bike) { r.bike = buildBike('#1e88e5'); scene.add(r.bike); }
          animateAvatar(r.av, 0, dt); bikePose(r.av); r.av.position.y += 0.42 * (s.sc || 1); attachHeld(r.av, null);
          r.bike.visible = true; r.bike.position.copy(r.pos); r.bike.rotation.set(0, r.face, 0); r.bike.scale.setScalar(s.sc || 1);
          r.bike.userData.wheels.forEach(w => w.rotation.x -= (s.a === 1 ? 20 : 0) * dt);
        } else {
          if (r.bike) r.bike.visible = false;
          animateAvatar(r.av, s.a, dt); attachHeld(r.av, s.h);
        }
      }
      r.tag.position.set(r.pos.x, r.pos.y + 2.15 * (s.sc || 1), r.pos.z);
      if (!!s.v !== r.voiceOn) { r.voiceOn = !!s.v; scene.remove(r.tag); r.tag = nameTag(r.name, r.voiceOn); scene.add(r.tag); }
      { const pid = s.dg ? (PETS[s.dg - 1] || PETS[0]).id : null; if ((r.dog ? r.dog.userData.id : null) !== pid) setPetModel(r, 'dog', pid, r.pos); }
      dogFollow(r.dog, r.pos, r.face, dt);
      if (s.sp) emitSpray(r.av);
      // 住宅樓層共用模板：唔同座 / 唔同層嘅玩家唔好見到
      const hideR = (s.af || '') !== apartments.key();
      if (hideR) r.av.visible = false; r.tag.visible = !hideR; if (r.dog) r.dog.visible = !hideR;
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
    curInter = P.seat || P.flight || P.transit || P.pass || P.boat || P.shuttle || P.cable || sky.riding() ? null : (findInteract() || passInteract());
    const lbl = P.cable ? (cabinAtStation() === P.cable.i ? '🚪 落纜車' : '⏩ 返去纜車站') : P.boat ? '⏩ 返碼頭' : P.shuttle ? '⏩ 即刻到' : sky.riding() ? (sky.docked() ? '🚪 落車' : null) : (mtr.riding() && !curInter) ? '⏩ 即刻到站' : P.transit ? '⏩ 即刻到站' : P.pass ? '🚪 落車' : P.flight ? (P.flight.ground && P.flight.speed < 3 ? '🚪 落機' : null) : P.seat ? '🚪 落車' : curInter ? curInter.label() : P.mech ? '👊 出拳' : (P.held ? useLabel() : (!bikeOn && peds.nearest(P.pos, P.face) ? '👊 打佢' : null));
    $('act').classList.toggle('hidden', !lbl); if (lbl && $('act').textContent !== lbl) $('act').textContent = lbl;

    // 電梯面板
    const inCar = lifts.insideCar(P.pos);
    if (inCar !== panelLift) { panelLift = inCar; lpInput = ''; $('lpInput').textContent = ''; $('liftPanel').classList.toggle('hidden', !inCar); if (inCar) $('lpTitle').textContent = `${inCar.def.name}（1–10000 樓）`; }
    if (inCar) {
      const mvg = isMoving(inCar.state, T);
      $('lpDisp').textContent = (mvg ? (inCar.state.to > inCar.state.from ? '▲ ' : '▼ ') : '') + floorLabel(Math.round(inCar.floor)) + (inCar.door > 0.5 ? ' 🚪' : '');
    }

    // 酒店 Lift 面板
    const hCar = hotel.insideCar(P.pos);
    if (hCar !== hotelCar) { hotelCar = hCar; $('hotelPanel').classList.toggle('hidden', !hCar); if (hCar) $('hpTitle').textContent = `柏熙酒店 ${hCar.id - 1}號 Lift（1–20 樓）`; }
    if (hCar) $('hpDisp').textContent = (hCar.moving ? (hCar.state.to > hCar.state.from ? '▲ ' : '▼ ') : '') + Math.round(hCar.floor) + (hCar.door > 0.5 ? ' 🚪' : '');
    if (roomMark.visible) roomMark.position.y = roomMark.userData.y + 2.6 + Math.sin(elapsed * 3) * 0.15;

    // 室內判斷
    const tb = world.toiletBounds;
    const inToilet = P.pos.x > tb.x0 && P.pos.x < tb.x1 && P.pos.z > tb.z0 && P.pos.z < tb.z1 && P.pos.y < tb.y1;
    world.update(dt, elapsed, P.pos, camera, inToilet);
    shops.update(dt, elapsed);
    npcs.update(dt, T);

    // 鏡頭
    const target = new V3(P.pos.x, P.pos.y + (P.mech ? 20 : P.shuttle ? 2.5 : P.flight ? (P.flight.kind === 'jumbo' ? 10 : 2.5) : 1.5 * P.scale), P.pos.z);
    if (P.flight && firstPerson) seatWorld(P.flight.seat);
    const dir = new V3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch));
    let look = null;
    if ((P.seat || P.flight) && firstPerson) {
      // 坐機動遊戲第一身：鏡頭跟住座位一齊翻轉
      me.visible = false;
      camera.position.copy(seatP).addScaledVector(tmpUp.set(0, 1, 0).applyQuaternion(seatQ), 1.25 * P.scale);
      camera.quaternion.copy(seatQ).multiply(tmpQ2.setFromEuler(tmpE.set(-camPitch, Math.PI + camYaw, 0, 'YXZ')));
    } else if (firstPerson) {
      // 第一身：鏡頭喺眼睛位置，可以自由向上望天、向下望地
      me.visible = false;
      camera.position.set(P.pos.x, P.pos.y + 1.6 * P.scale, P.pos.z);
      look = camera.position.clone().sub(dir);
      P.face = camYaw + Math.PI;
    } else {
      me.visible = true;
      let dist = camDist * Math.max(1, P.scale * 0.8);
      if (P.transit) dist = Math.max(dist, { taxi: 9, minibus: 11, bus: 16 }[P.transit.t.id]); else if (P.boat) dist = Math.max(dist, 13); else if (P.cable) dist = Math.max(dist, 9); else if (P.shuttle) dist = Math.max(dist, 16); else if (sky.riding()) dist = Math.max(dist, 16); else if (P.mech) dist = Math.max(dist, 60); else if (P.flight) dist = Math.max(dist, { plane: 18, heli: 16, jumbo: 80, fighter: 24 }[P.flight.kind]);
      me.visible = !P.mech;
      ray.set(target, dir); ray.far = dist;
      const hit = ray.intersectObjects(camBlockers, false)[0];
      if (hit) dist = Math.max(0.6, hit.distance - 0.25);
      if (P.camper >= 0) { const c = campers.list[P.camper]; dist = Math.min(dist, camRayCols(c.toLocal(target), c.rotL(dir), dist, c.cols)); }
      else if (!P.seat && !P.flight && !P.transit && !P.pass && !P.boat && !P.shuttle && !P.cable && !sky.riding()) dist = Math.min(dist, camRayCols(target, dir, dist));
      camera.position.copy(target).addScaledVector(dir, dist);
      // 鏡頭唔可以穿落地底；向上望時鏡頭貼地，視線向天空抬高
      if (camera.position.y < P.pos.y + 0.25) camera.position.y = P.pos.y + 0.25;
      if (P.pos.y < -1 && camera.position.y > -0.6) camera.position.y = -0.6;
      look = target.clone();
      if (camPitch < 0) look.y += -camPitch * dist * 1.4;
    }
    if (shake > 0 && look) { camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; shake = Math.max(0, shake - dt * 0.8); }
    if (look) camera.lookAt(look);

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
