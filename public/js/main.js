// 搭 Lift 遊戲 — 主程式
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld, LIFT_DEF } from './world.js';
import { buildLifts, isMoving } from './lifts.js';
import { buildAvatar, animateAvatar, buildShiba, animateShiba, itemMesh, SKINS, SHIRTS, HATS, HAIRS, PANTS } from './avatar.js';
import { Net, Voice } from './net.js';
import { initAudio, sfx } from './audio.js';
import { altOfFloor, layerName, fmtAlt, floorLabel, MAX_FLOOR } from './alt.js';
import { buildShops } from './shops.js';
import { buildNPCs } from './npcs.js';
import { buildHotel, roomDoor, ROOM_TYPES } from './hotel.js';
import { buildPark } from './park.js';
import { playMusic, currentMusic, TRACKS } from './music.js';
import { buildBike, bikePose, buildCampers } from './vehicles.js';
import { buildAirport, Flight, buildAircraft, AIR_KINDS } from './airport.js';
import { buildArena, buildMech, animateMech, inStage, KAIJU, MECHS } from './arena.js';
import { buildVillage } from './village.js';
import { buildCity, district, DISTRICT_COLOR, DISTRICT_NAME, LANDMARKS, CHUNK, TOWN, HALF_WORLD } from './city.js';

// 真實餐牌 / 價錢 / 金價（網上資料整理，喺 catalog.js）
let CATALOG = { SHOPS: {}, GOLD: { tael_buy: 30000, tael_sell: 32000 } };
try { CATALOG = await import('./catalog.js'); } catch (e) { console.warn('catalog.js 載入失敗', e); }

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
optRow($('optHair'), HAIRS.map(v => ({ v })), 'hair', (b, it) => { b.className = 'sw'; b.style.background = it.v; });
optRow($('optPants'), PANTS.map(v => ({ v })), 'pants', (b, it) => { b.className = 'sw'; b.style.background = it.v; });
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
    pickup: (kind, obj) => { obj.visible = false; P.inv.add(kind); setHeld(kind); sfx.pickup(); renderInv(); toast({ ext: '🧯 拎咗滅火筒（撳互動掣噴）', phone: '📱 拎咗手機', router: '📶 拎咗 Router' }[kind]); },
    silver: () => { E.silver = (E.silver || 0) + 1; saveEcon(); sfx.pickup(); toast(`🥈 銀條 +1（共 ${E.silver} 條）— 可以拎去銀行賣`); },
    gold: () => { P.gold++; saveEcon(); sfx.pickup(); toast(`🥇 金條 +1（共 ${P.gold} 條）— 可以拎去銀行存或者賣`); },
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
  const village = buildVillage(scene);
  campers.list.forEach(c => c.inter.show = () => P.camper !== c.k);
  const staticCols = world.colliders.concat(lifts.staticCols, shops.colliders, hotel.colliders, park.colliders, airport.colliders, arena.colliders, village.colliders);
  const interactables = world.interactables.concat(lifts.interactables, shops.interactables, hotel.interactables, park.interactables, campers.interactables, airport.interactables, arena.interactables);
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
  };
  $('shopClose').onclick = () => closeModal('shopModal');

  // ---------- 背包 ----------
  const nonFood = /日用|清潔|紙|家居|個人護理|洗|用品/;
  function renderBag() {
    const el = $('bagList'); el.innerHTML = '';
    const entries = Object.entries(E.bag).filter(([, b]) => b.c > 0);
    if (!entries.length) el.innerHTML = '<div style="padding:10px;opacity:.7">背包空空如也。去餐廳或者超市買嘢啦！</div>';
    entries.forEach(([n, b]) => {
      const use = nonFood.test(b.cat || '') ? '用' : /飲|茶|咖啡|奶|汽水|果汁/.test((b.cat || '') + n) ? '飲' : '食';
      const d = document.createElement('div'); d.className = 'item';
      d.innerHTML = `<span class="em">${b.e || '🛍️'}</span><span class="nm">${n}</span><span>x ${b.c}</span><button class="opt">${use}</button>`;
      d.querySelector('button').onclick = () => {
        b.c--; if (b.c <= 0) delete E.bag[n]; saveEcon(); sfx.pickup();
        toast(use === '用' ? `🧻 用咗 ${n}` : use === '飲' ? `🥤 飲咗 ${n}，好解渴！` : `😋 食咗 ${n}，好味！`); renderBag();
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
    $('bGold').textContent = `${P.gold} 條`; $('bVault').textContent = `${E.vault} 條`;
    $('goldPrice').textContent = `今日金價（每條 = 1 両 / 37.429 克 足金）：銀行收購 ${money(goldBuy)}｜賣出 ${money(goldSell)}${GOLD.date ? '（' + GOLD.date + ' 參考價）' : ''}`;
    $('bankModal').querySelector('.box').style.setProperty('--shopC', '#0b4f8a');
  }
  const bankActions = {
    depGold1: () => P.gold > 0 ? (P.gold--, E.vault++, '🥇 存咗 1 條金條入保險箱') : '你身上冇金條',
    depGoldAll: () => { if (!P.gold) return '你身上冇金條'; const n = P.gold; E.vault += n; P.gold = 0; return `🥇 存咗 ${n} 條金條入保險箱`; },
    wdGold1: () => E.vault > 0 ? (E.vault--, P.gold++, '🥇 由保險箱攞咗 1 條金條') : '保險箱冇金條',
    sell1: () => P.gold > 0 ? (P.gold--, E.cash += goldBuy, `💰 賣咗 1 條金條，收到 ${money(goldBuy)}`) : '你身上冇金條可以賣（保險箱嘅要先提出嚟）',
    sellS1: () => (E.silver || 0) > 0 ? (E.silver--, E.cash += SILVER_BUY, `🥈 賣咗 1 條銀條，收到 ${money(SILVER_BUY)}`) : '你身上冇銀條',
    sellSAll: () => { const n = E.silver || 0; if (!n) return '你身上冇銀條'; E.silver = 0; E.cash += n * SILVER_BUY; return `🥈 賣咗 ${n} 條銀條，收到 ${money(n * SILVER_BUY)}`; },
    sellAll: () => { if (!P.gold) return '你身上冇金條可以賣'; const n = P.gold, v = n * goldBuy; P.gold = 0; E.cash += v; return `💰 賣咗 ${n} 條金條，收到 ${money(v)}`; },
    dep100: () => dep(100), dep1000: () => dep(1000), depAll: () => dep(E.cash),
    wd100: () => wd(100), wd1000: () => wd(1000), wdAll: () => wd(E.save),
  };
  function dep(a) { a = Math.min(a, E.cash); if (a <= 0) return '你身上冇現金'; E.cash -= a; E.save += a; return `🏦 存入 ${money(a)}`; }
  function wd(a) { a = Math.min(a, E.save); if (a <= 0) return '戶口冇錢'; E.save -= a; E.cash += a; return `🏧 提取 ${money(a)}`; }
  document.querySelectorAll('#bankModal [data-b]').forEach(b => b.onclick = () => {
    const msg = bankActions[b.dataset.b]();
    E.cash = Math.round(E.cash * 10) / 10; E.save = Math.round(E.save * 10) / 10;
    saveEcon(); renderBank(); $('bankMsg').textContent = msg; sfx.beep();
  });
  $('bankClose').onclick = () => closeModal('bankModal');

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
  function toggleFP() {
    firstPerson = !firstPerson; sfx.click();
    $('btnFP').classList.toggle('on', firstPerson);
    if (firstPerson) camPitch = 0; else camPitch = Math.max(camPitch, -0.2) || 0.32;
    toast(firstPerson ? '👁 第一身視角（拖畫面望四周，向上拖望天）' : '🎥 第三身視角');
  }
  $('btnFP').onclick = toggleFP;
  addEventListener('keydown', e => { if (e.code === 'KeyV' && e.target.tagName !== 'INPUT') toggleFP(); });
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
    if (ptrs.size === 1) { camYaw -= (e.clientX - p.x) * 0.006; camPitch = Math.min(1.45, Math.max(firstPerson ? -1.45 : -1.2, camPitch + (e.clientY - p.y) * 0.005)); }
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) camDist = Math.min(40, Math.max(1.5, dist0 * pinch0 / d)); $('zoomRange').value = camDist; }
  });
  const ptrEnd = e => { ptrs.delete(e.pointerId); pinch0 = 0; };
  cv.addEventListener('pointerup', ptrEnd); cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', e => { camDist = Math.min(40, Math.max(1.5, camDist * (1 + Math.sign(e.deltaY) * 0.1))); $('zoomRange').value = camDist; e.preventDefault(); }, { passive: false });
  $('jump').addEventListener('pointerdown', e => { jump(); e.preventDefault(); });
  $('act').addEventListener('pointerdown', e => { doAct(); e.preventDefault(); });
  function jump() { if (P.flight) return; if (P.seat) return leaveRide(); if (P.grounded) { P.vy = P.mech ? 16 : 8; P.grounded = false; P.ride = -1; P.rideObj = null; } }

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
    if (P.flight) return exitFlight();
    if (P.seat) return leaveRide();
    if (P.mech && !curInter) return mechPunch();
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
  function physics(dt, mv, colsOverride) {
    const cols = colsOverride || nearCols(P.pos.x, P.pos.z, 3).concat(lifts.dynamicColliders(), hotel.dynamicColliders());
    if (P.rideObj) P.pos.y += P.rideObj.y - P.rideObj.prevY;
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
    const dog = buildShiba(); dog.visible = false; scene.add(dog);
    remotes.set(id, { id, name, look, av, tag, dog, voiceOn: false, st: null, pos: new V3(0, -999, 0), face: 0 });
  }
  function removeRemote(id) { const r = remotes.get(id); if (!r) return; scene.remove(r.av, r.tag, r.dog); remotes.delete(id); voice.remove(id); }

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
    net.send({ t: 'st', s: { p: [+P.pos.x.toFixed(2), +(P.pos.y - (L ? L.y : 0)).toFixed(2), +P.pos.z.toFixed(2)], rl: L ? L.id : -1, r: +P.face.toFixed(2), a: P.anim, h: P.held, dg: P.dog ? 1 : 0, sc: P.scale, sp: P.spraying ? 1 : 0, v: voice.enabled ? 1 : 0, sd: P.seat ? [P.seat.r, P.seat.s] : 0, bk: bikeOn ? 1 : 0, fl: P.flight ? [AIR_KINDS.indexOf(P.flight.kind), +P.flight.yaw.toFixed(2), +P.flight.pitch.toFixed(2), +P.flight.roll.toFixed(2), P.flight.color] : 0, mk: P.mech ? P.mech.style + 1 : 0, ma: P.mech ? (P.mech.punchT > 0 ? 1 : P.mech.beamT > 0 ? 2 : 0) : 0, cp: P.camper, lp: P.camper >= 0 ? [+P.lp.x.toFixed(2), +P.lp.y.toFixed(2), +P.lp.z.toFixed(2)] : 0 } });
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
    const inHotel = hotel.inside(P.pos);
    $('floorBig').textContent = inCar ? `${LIFT_DEF[inCar.id].cargo ? '貨' : '客'}Lift ${floorLabel(Math.round(inCar.floor))}F` : P.flight ? { plane: '✈ 小型飛機', heli: '🚁 直升機', jumbo: '🛫 巨無霸客機', fighter: '🛩 戰鬥機' }[P.flight.kind] : P.mech ? `🤖 機甲 HP ${Math.max(0, Math.round(P.mech.hp))}` : P.seat ? `🎢 ${park.rides[P.seat.r].name}` : P.camper >= 0 ? campers.list[P.camper].name : inHotel ? (a > 79 ? '柏熙 天台' : `柏熙 ${hotel.playerFloor(P.pos)}F`) : (a < -1 ? '機房 M' : a < 1 ? '地面 G' : `離地 ${fmtAlt(a)}`);
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
    toast('😴 Zzz… Zzz…', 2500);
    setTimeout(() => { f.style.opacity = 0; toast('☀️ 瞓醒啦！精神晒～', 2500); setTimeout(() => f.style.background = '', 1100); }, 2600);
  }

  // ================= 背景音樂（3 首揀）=================
  const musicBox = $('musicBox');
  const mOpts = [['🔇 關', 0], ...TRACKS.map((t, i) => [`🎵 ${i + 1}. ${t.name}`, i + 1])];
  function renderMusic() {
    musicBox.innerHTML = '';
    mOpts.forEach(([label, i]) => { const b = document.createElement('button'); b.textContent = label; if (currentMusic() === i) b.className = 'on'; b.onclick = () => { playMusic(i); store.set('music', i); renderMusic(); $('btnMusic').classList.toggle('on', i > 0); }; musicBox.appendChild(b); });
  }
  $('btnMusic').onclick = () => { musicBox.classList.toggle('hidden'); renderMusic(); sfx.click(); };
  { const m = store.get('music', 1); playMusic(m); $('btnMusic').classList.toggle('on', m > 0); }

  // ================= 電單車 / 露營車 =================
  const myBike = buildBike(); myBike.visible = false; scene.add(myBike);
  let bikeOn = false, bikeLean = 0, bikeSpin = 0;
  function isIndoors() {
    const p = P.pos, tb = world.toiletBounds;
    if (P.seat || P.flight || P.mech || P.camper >= 0 || p.y < -1) return true;
    if (lifts.insideCar(p) || hotel.insideCar(p) || hotel.inside(p)) return true;
    if (p.x > tb.x0 && p.x < tb.x1 && p.z > tb.z0 && p.z < tb.z1 && p.y < tb.y1) return true;
    if (p.z > 36 && p.z < 48 && p.x > -46 && p.x < 56.5 && p.y < 4.5) return true;   // 商店街
    if (p.x > -26 && p.x < -10 && p.z > -18 && p.z < -6 && p.y < 4) return true;   // 寵物店 / 獸醫
    return false;
  }
  $('btnBike').onclick = () => {
    P.bike = !P.bike; sfx.click(); $('btnBike').classList.toggle('on', P.bike);
    if (P.bike && P.held) setHeld(P.held);
    toast(P.bike ? (isIndoors() ? '🏍 電單車已準備好 — 出返室外就會自動揸' : '🏍 揸電單車！喺室外快 3 倍') : '🚶 落咗電單車');
  };
  addEventListener('keydown', e => { if (e.code === 'KeyB' && e.target.tagName !== 'INPUT') $('btnBike').click(); });
  function enterCamper(k) {
    const c = campers.list[k];
    P.camper = k; P.lp.set(0.9, 0.85, -1.1); P.vy = 0; P.rideObj = null; P.ride = -1;
    c.toWorld(P.lp, P.pos);
    sfx.door(); toast(c.moving ? `🚐 跳咗上${c.name.slice(3)}！佢行緊，可以喺入面周圍行` : `🚐 上咗${c.name.slice(3)}，${Math.ceil(c.restLeft)} 秒後開車，會圍住成個小鎮行一圈`, 3500);
  }

  // ================= 大地圖（撳一下傳送）=================
  const mapCv = $('mapCv'), mg = mapCv.getContext('2d'), MS = mapCv.width / (HALF_WORLD * 2);
  const w2m = (x, z) => [(x + HALF_WORLD) * MS, (z + HALF_WORLD) * MS];
  let mapBase = null;
  function drawMapBase() {
    const c = document.createElement('canvas'); c.width = c.height = mapCv.width; const g = c.getContext('2d');
    g.fillStyle = '#5a9a4a'; g.fillRect(0, 0, c.width, c.height);
    for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) {
      const t = district(i, j); if (t === 'none') continue;
      const [x, y] = w2m(i * CHUNK - 100, j * CHUNK - 100); g.fillStyle = DISTRICT_COLOR[t]; g.fillRect(x, y, CHUNK * MS + 0.5, CHUNK * MS + 0.5);
    }
    g.strokeStyle = 'rgba(60,60,60,.55)'; g.lineWidth = 1;
    for (let k = -24; k <= 25; k++) { const v = (k * CHUNK - 100 + HALF_WORLD) * MS; g.beginPath(); g.moveTo(v, 0); g.lineTo(v, c.height); g.moveTo(0, v); g.lineTo(c.width, v); g.stroke(); }
    const [tx, ty] = w2m(TOWN.x0, TOWN.z0); g.fillStyle = '#ffd54f'; g.fillRect(tx, ty, (TOWN.x1 - TOWN.x0) * MS, (TOWN.z1 - TOWN.z0) * MS);
    g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#111';
    g.fillText('🏙 小鎮（柏熙酒店・遊樂場）', w2m(0, 0)[0], w2m(0, -320)[1]);
    LANDMARKS.forEach(l => { const [x, y] = w2m(l.i * CHUNK, l.j * CHUNK); g.fillText(l.name, x, y + 4); });
    g.fillText('✈ 國際機場', w2m(800, 0)[0], w2m(0, -120)[1]); g.fillText('🏘 豪景花園', w2m(-700, 0)[0], w2m(0, 600)[1]); g.fillText('⚔ 怪獸決戰場', w2m(-1700, 0)[0], w2m(0, -100)[1]);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(8, c.height - 26, 120, 18); g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.textAlign = 'left';
    g.fillRect(14, c.height - 14, 1000 * MS, 3); g.fillText('1 公里', 14 + 1000 * MS + 6, c.height - 11);
    return c;
  }
  function drawMap() {
    if (!mapBase) mapBase = drawMapBase();
    mg.drawImage(mapBase, 0, 0);
    for (const r of remotes.values()) { if (!r.st) continue; const [x, y] = w2m(r.pos.x, r.pos.z); mg.fillStyle = '#2196f3'; mg.beginPath(); mg.arc(x, y, 5, 0, 7); mg.fill(); }
    const [px, py] = w2m(P.pos.x, P.pos.z);
    mg.save(); mg.translate(px, py); mg.rotate(-P.face + Math.PI); mg.fillStyle = '#fff'; mg.strokeStyle = '#d32f2f'; mg.lineWidth = 2;
    mg.beginPath(); mg.moveTo(0, -9); mg.lineTo(6, 7); mg.lineTo(0, 3); mg.lineTo(-6, 7); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
    const t = district(Math.round(P.pos.x / CHUNK), Math.round(P.pos.z / CHUNK));
    $('mapInfo').textContent = `你而家喺：${DISTRICT_NAME[t] || '野外'}（${Math.round(P.pos.x)}, ${Math.round(P.pos.z)}）`;
  }
  let mapTimer = null;
  function openMap() { $('mapModal').classList.remove('hidden'); drawMap(); clearInterval(mapTimer); mapTimer = setInterval(drawMap, 500); sfx.click(); }
  function closeMap() { $('mapModal').classList.add('hidden'); clearInterval(mapTimer); }
  $('btnMap').onclick = openMap; $('mapClose').onclick = closeMap;
  addEventListener('keydown', e => { if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') ($('mapModal').classList.contains('hidden') ? openMap() : closeMap()); });
  mapCv.addEventListener('pointerdown', e => {
    const r = mapCv.getBoundingClientRect();
    let x = (e.clientX - r.left) / r.width * HALF_WORLD * 2 - HALF_WORLD, z = (e.clientY - r.top) / r.height * HALF_WORLD * 2 - HALF_WORLD;
    x = Math.max(-HALF_WORLD + 20, Math.min(HALF_WORLD - 20, x)); z = Math.max(-HALF_WORLD + 20, Math.min(HALF_WORLD - 20, z));
    const inTownXZ = x > TOWN.x0 && x < TOWN.x1 && z > TOWN.z0 && z < TOWN.z1;
    if (inTownXZ) { x = SPAWN.x; z = SPAWN.z; }
    else {
      // 傳送去最近嘅馬路（唔會卡喺大廈入面）
      const rx = Math.round((x + 100) / CHUNK) * CHUNK - 100, rz = Math.round((z + 100) / CHUNK) * CHUNK - 100;
      if (Math.abs(x - rx) < Math.abs(z - rz)) x = rx; else z = rz;
    }
    if (P.seat) leaveRide(); if (P.flight) endFlight(); if (P.mech) mechOff();
    P.camper = -1; api.teleport(x, 0.1, z); city.loadAll(P.pos); closeMap();
    sfx.whoosh(); toast(`✨ 傳送咗去 ${inTownXZ ? '小鎮' : DISTRICT_NAME[district(Math.round(x / CHUNK), Math.round(z / CHUNK))] || '野外'}`);
  });

  // ================= 飛機 / 直升機 =================
  let flUp = false, flDown = false;
  const holdBtn = (id, on) => { const b = $(id); const set = v => e => { on(v); e.preventDefault(); }; b.addEventListener('pointerdown', set(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, set(false))); };
  holdBtn('flUp', v => flUp = v); holdBtn('flDown', v => flDown = v);
  $('flExit').onclick = () => exitFlight();
  function startFlight(kind, x, z, yaw, color) {
    if (P.seat) leaveRide(); if (P.mech) mechOff(); P.camper = -1;
    if (P.held) setHeld(P.held);
    const F = new Flight(kind, x, z, yaw); F.color = color;
    F.model = buildAircraft(kind, color); scene.add(F.model);
    F.seat = new THREE.Object3D(); F.seat.position.copy(F.model.userData.seat); F.model.add(F.seat);
    P.flight = F; firstPerson = false; $('btnFP').classList.remove('on'); camPitch = 0.2; camYaw = yaw + Math.PI;
    $('flightPanel').classList.remove('hidden'); $('rbtn').classList.add('hidden'); sfx.whoosh();
    const vt = { plane: 100, jumbo: 220, fighter: 230 }[kind];
    toast(kind !== 'heli' ? `✈ 撳住右下角「⬆」加油門，去到 ${vt} km/h 再拉搖桿向後就起飛\n搖桿左右轉彎；只可以喺公路或者機場升降` : '🚁 撳住「⬆」升高、「⬇」降落，搖桿前後左右飛\n只可以喺公路、機場或者停機坪降落', 6000);
  }
  function endFlight() { const F = P.flight; if (!F) return; scene.remove(F.model); P.flight = null; $('flightPanel').classList.add('hidden'); $('rbtn').classList.remove('hidden'); me.rotation.set(0, P.face, 0); me.userData.body.position.y = 0; }
  function exitFlight() {
    const F = P.flight; if (!F) return;
    if (!(F.ground && F.speed < 3)) return toast('要停喺地面先落得機');
    const side = new V3(Math.cos(F.yaw), 0, -Math.sin(F.yaw));
    const p = F.pos.clone().addScaledVector(side, { plane: 6.5, heli: 3.5, jumbo: 12, fighter: 4.5 }[F.kind]);
    endFlight(); api.teleport(p.x, p.y + 0.1, p.z); sfx.door(); toast('🚶 落咗機');
  }
  function crashFlight() {
    endFlight();
    sfx.boom(); shake = 1.2; const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity 1.5s'; f.style.opacity = 0; });
    api.teleport(airport.spawn.x, 0.1, airport.spawn.z); city.loadAll(P.pos);
    toast('💥 墜機！（純屬遊戲）你返咗去機場，可以再租過架', 4000);
  }
  function flightHit(p, ground) {
    for (const c of nearCols(p.x, p.z, 8, false)) {
      if (c.max[1] < 0.6) continue;
      const r = P.flight && P.flight.kind === 'jumbo' ? 5 : 3.2;
      if (p.x > c.min[0] - r && p.x < c.max[0] + r && p.z > c.min[2] - r && p.z < c.max[2] + r && p.y + 2.5 > c.min[1] && p.y + 0.4 < c.max[1]) return true;
    }
    return false;
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
    if (P.held) setHeld(P.held); P.bike = false; $('btnBike').classList.remove('on');
    if (myMech.userData.style !== style) { scene.remove(myMech); myMech = buildMech(style); scene.add(myMech); }
    P.mech = { hp: 300, punchT: 0, beamT: 0, beamCd: 0, style, since: performance.now() };
    api.teleport(arena.gate.x, 0.1, arena.gate.z); P.face = -Math.PI / 2; camYaw = Math.PI / 2; camPitch = 0.25; firstPerson = false; $('btnFP').classList.remove('on');
    $('mechPanel').classList.remove('hidden'); $('fightHud').classList.remove('hidden');
    sfx.whoosh(); shake = 0.6; toast(`🤖 ${MECHS[style].name} 變身完成！` + '搵怪獸打：👊 出拳（近身）、⚡ 光炮（遠距離）\n行出東面大閘就會變返人', 5000);
  }
  function mechOff(msg) {
    if (!P.mech) return; P.mech = null; myMech.visible = false; arena.fireBeam(null, null, false);
    $('mechPanel').classList.add('hidden'); $('fightHud').classList.add('hidden');
    api.teleport(arena.base.x, 0.1, arena.base.z); toast(msg || '🙂 變返人');
  }
  function monDist() { return monSt ? Math.hypot(arena.mon.pos.x - P.pos.x, arena.mon.pos.z - P.pos.z) : 1e9; }
  function mechPunch() {
    const M = P.mech; if (!M || M.punchT > 0) return;
    M.punchT = 0.5; sfx.whoosh();
    setTimeout(() => { if (P.mech && monSt && monSt.s !== 'dead' && monDist() < 58) { net.send({ t: 'khit', dmg: 60 }); sfx.boom(); shake = 0.5; hitFx(); } }, 250);
  }
  function mechBeam() {
    const M = P.mech; if (!M || M.beamCd > 0) return;
    M.beamCd = 3; M.beamT = 0.8; sfx.alarm(0.3);
    if (monSt && monSt.s !== 'dead' && monDist() < 230) setTimeout(() => { if (P.mech) { net.send({ t: 'khit', dmg: 110 }); shake = 0.4; hitFx(); } }, 300);
  }
  function hitFx() { const f = $('flash'); f.style.transition = 'none'; f.style.background = 'radial-gradient(rgba(255,255,255,.6),transparent 60%)'; f.style.opacity = 0.7; requestAnimationFrame(() => { f.style.transition = 'opacity .4s'; f.style.opacity = 0; setTimeout(() => f.style.background = '', 450); }); }
  $('mkPunch').onclick = () => mechPunch(); $('mkBeam').onclick = () => mechBeam(); $('mkOff').onclick = () => { if (P.mech && performance.now() - P.mech.since > 1500) mechOff(); };
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.code === 'KeyF') mechPunch(); if (e.code === 'KeyR') mechBeam(); });
  function mechUpdate(dt, moving) {
    const M = P.mech;
    if (!inStage(P.pos)) return mechOff('🙂 行出咗決戰場，變返人');
    M.punchT -= dt; M.beamT -= dt; M.beamCd -= dt;
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
        P.mech.hp -= m.dmg; shake = 1; sfx.boom();
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

  if (location.search.includes('debug')) window.__g = { P, park, hotel, campers, city, airport, arena, village, net, api, camera, scene, setFP: v => { firstPerson = v; }, tick: n => { for (let i = 0; i < n; i++) frame(); }, cam: (y, p, d) => { camYaw = y; camPitch = p; if (d) camDist = d; } };

  // ================= 主迴圈 =================
  const clock = new THREE.Clock();
  const ray = new THREE.Raycaster();
  let elapsed = 0;
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
    const im = Math.hypot(ix, iy); if (im > 1) { ix /= im; iy /= im; }
    const fwd = new V3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), right = new V3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    campers.update(T);
    city.update(P.pos);
    bikeOn = P.bike && !isIndoors();
    const speed = P.mech ? 16 : (bikeOn ? 22 : 7.5) * (0.7 + 0.3 * P.scale);
    const mv = fwd.multiplyScalar(iy * speed).addScaledVector(right, ix * speed);
    let turn = 0;
    if (mv.lengthSq() > 0.01) { const tf = Math.atan2(mv.x, mv.z); let df = tf - P.face; df = Math.atan2(Math.sin(df), Math.cos(df)); turn = df; P.face += df * Math.min(1, dt * (bikeOn ? 7 : 14)); }
    airport.update(P.pos); village.update(P.pos);
    if (P.flight) {
      // 揸緊飛機 / 直升機
      const F = P.flight;
      const ev = F.step(dt, { x: ix, y: iy, up: keys.Space || flUp, down: keys.KeyC || keys.ShiftLeft || flDown, camYaw }, flightHit);
      if (ev === 'crash') crashFlight();
      else if (ev && ev !== P.flight._lastEv) { if (ev === 'offroad') toast('🛑 飛機只可以喺公路或者機場升降 / 滑行'); else if (ev === 'noland') toast('🚁 呢度唔可以降落：要喺公路、機場或者停機坪'); }
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
      }
      if (P.mech) mechUpdate(dt, mv.lengthSq() > 0.01);
    }
    myMech.visible = !!P.mech;
    arena.update(dt, T, P.pos, monTargetPos());
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
    curInter = P.seat || P.flight ? null : findInteract();
    const lbl = P.flight ? (P.flight.ground && P.flight.speed < 3 ? '🚪 落機' : null) : P.seat ? '🚪 落車' : curInter ? curInter.label() : P.mech ? '👊 出拳' : (P.held ? useLabel() : null);
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
    const target = new V3(P.pos.x, P.pos.y + (P.mech ? 20 : P.flight ? (P.flight.kind === 'jumbo' ? 10 : 2.5) : 1.5 * P.scale), P.pos.z);
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
      if (P.mech) dist = Math.max(dist, 60); else if (P.flight) dist = Math.max(dist, { plane: 18, heli: 16, jumbo: 80, fighter: 24 }[P.flight.kind]);
      me.visible = !P.mech;
      ray.set(target, dir); ray.far = dist;
      const hit = ray.intersectObjects(camBlockers, false)[0];
      if (hit) dist = Math.max(0.6, hit.distance - 0.25);
      if (P.camper >= 0) { const c = campers.list[P.camper]; dist = Math.min(dist, camRayCols(c.toLocal(target), c.rotL(dir), dist, c.cols)); }
      else if (!P.seat && !P.flight) dist = Math.min(dist, camRayCols(target, dir, dist));
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
