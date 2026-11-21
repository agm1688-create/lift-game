// 柏熙玩具屋：柏熙屋企隔籬（室外樓梯再過啲）嘅一層高倉庫，入面擺滿現實世界見到嘅設備，行近可以「睇內部零件」學英文
// 有：前方後圓抽氣扇、消防喉轆、4 種顏色消防 Breakglass、緊急出口牌、可以開關嘅燈、窗口式冷氣機、分體式冷氣機、
// 馬路車紅綠燈、馬路行人過路燈（兩支燈同步轉色）、手機電話、金條、銀條
import * as THREE from 'three';
import { Batch } from './city.js';
import { IM, signMat, sign, exhaustFan } from './interiors.js';
import { hoodGeo, hoodM } from './traffic.js';

const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...e });
// 倉庫範圍（世界座標）：入口喺 z0 嗰邊（向住廣場 / 出生點）
export const TOY = { x0: -35.5, x1: -23.5, z0: 12, z1: 24, H: 4.6 };

export function buildToyHouse(scene, api) {
  const B = new Batch(), inter = [], spots = [];
  const { x0, x1, z0, z1, H } = TOY, T = 0.25;
  const dyn = new THREE.Group(); scene.add(dyn);
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); dyn.add(m); return m; };
  const spot = (x, z, key, r = 1.4) => spots.push({ x, z, y: 0, key, r });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // ---------- 外殼：彩色玩具倉庫 ----------
  const red = std('#e53935'), yellow = std('#fdd835'), blue = std('#1e88e5'), green = std('#43a047'), white = std('#fafafa');
  const wallIn = std('#fff8e1');
  B.box(x0 - 0.1, -0.25, z0 - 0.1, x1 + 0.1, 0, z1 + 0.1, std('#bcaaa4'));
  B.box(x0 + T, 0.005, z0 + T, x1 - T, 0.02, z1 - T, std('#fff', { map: IM.wood.map }), false);
  // 牆（外面一格格彩色，入面米白）
  const stripes = [red, yellow, blue, green];
  const wallX = (x, za, zb) => { for (let z = za, k = 0; z < zb - 0.01; z += 3, k++) B.box(x, 0, z, x + T, H, Math.min(zb, z + 3), stripes[k % 4]); };
  wallX(x0, z0, z1); wallX(x1 - T, z0, z1);
  for (let x = x0, k = 0; x < x1 - 0.01; x += 3, k++) B.box(x, 0, z1 - T, Math.min(x1, x + 3), H, z1, stripes[(k + 1) % 4]);
  // 前牆（有門口 2.2 米闊）
  const DX0 = -30.6, DX1 = -28.4, DH = 2.7;
  B.box(x0, 0, z0, DX0, H, z0 + T, blue); B.box(DX1, 0, z0, x1, H, z0 + T, red); B.box(DX0, DH, z0, DX1, H, z0 + T, yellow);
  // 內牆油漆（薄，唔使碰撞）
  const PT = 0.06;   // 油漆層離牆 6 厘米（太薄會閃）
  B.box(x0 + T, 0, z0 + T, x0 + T + PT, H - 0.12, z1 - T, wallIn, false); B.box(x1 - T - PT, 0, z0 + T, x1 - T, H - 0.12, z1 - T, wallIn, false);
  B.box(x0 + T, 0, z1 - T - PT, x1 - T, H - 0.12, z1 - T, wallIn, false);
  B.box(x0 + T, 0, z0 + T, DX0, H - 0.12, z0 + T + PT, wallIn, false); B.box(DX1, 0, z0 + T, x1 - T, H - 0.12, z0 + T + PT, wallIn, false); B.box(DX0, DH, z0 + T, DX1, H - 0.12, z0 + T + PT, wallIn, false);
  // 天花 + 屋頂（三角形斜頂好似玩具屋）
  B.box(x0 + T, H - 0.12, z0 + T, x1 - T, H - 0.1, z1 - T, std('#f6f6f4'), false);
  B.box(x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 0.3, z1 + 0.3, red);
  { const roof = new THREE.CylinderGeometry(0.01, (x1 - x0) / 2 + 0.6, 2.4, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, (z1 - z0 + 0.6) / (x1 - x0 + 0.6)); roof.translate((x0 + x1) / 2, H + 0.3 + 1.2, (z0 + z1) / 2); B.add(roof, std('#ff7043')); }
  // 招牌（門口上面，向住廣場）
  sign(B, (x0 + x1) / 2, H - 0.75, z0 - 0.02, 7.5, 1.1, signMat('🧸 柏熙玩具屋', '#4a148c', '#ffeb3b', 'bold 64px sans-serif'), '-z');
  // 門口兩邊積木裝飾
  [[DX0 - 0.7, red], [DX1 + 0.7, blue]].forEach(([x, m]) => { B.box(x - 0.3, 0, z0 - 0.7, x + 0.3, 0.6, z0 - 0.1, m); B.box(x - 0.22, 0.6, z0 - 0.62, x + 0.22, 1.0, z0 - 0.18, yellow, false); });

  // ---------- 可以開關嘅燈 ----------
  const lampOn = new THREE.MeshBasicMaterial({ color: '#fff7e0' }), lampOff = std('#9e9e9e');
  const lamps = [];
  for (const lx of [-32.5, -29.5, -26.5]) for (const lz of [15, 19, 22]) lamps.push(mesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), lampOn, lx, H - 0.16, lz));
  const bulb = new THREE.PointLight('#fff2d0', 0, 20, 1.2); bulb.position.set(-29.5, H - 0.6, 18); dyn.add(bulb);
  let lightsOn = true;
  const setLights = on => { lightsOn = on; lamps.forEach(m => m.material = on ? lampOn : lampOff); bulb.intensity = on ? 14 : 0; };
  setLights(true);
  // 燈掣（門口右手邊）
  const swX = DX1 + 0.45, swZ = z0 + T + 0.08;
  B.box(swX - 0.1, 1.2, swZ - 0.02, swX + 0.1, 1.45, swZ + 0.02, white, false);
  const toggle = mesh(new THREE.BoxGeometry(0.05, 0.09, 0.04), std('#616161'), swX, 1.36, swZ + 0.03);
  inter.push({ pos: V(swX, 0, z0 + 1.0), r: 1.0, label: () => lightsOn ? '💡 熄燈' : '💡 開燈', act: () => {
    setLights(!lightsOn); toggle.position.y = lightsOn ? 1.36 : 1.29; api.sfx.click();
    api.say(lightsOn ? 'Turn on the light.' : 'Turn off the light.', lightsOn ? '開燈（turn on the light）' : '熄燈（turn off the light）', { force: true, now: true });
  } });
  spot(swX, z0 + 1.0, 'lightSwitch', 1.0);

  // ---------- 緊急出口牌（門口上面，綠色發光）----------
  B.box(-30.2, DH + 0.15, z0 + T, -28.8, DH + 0.6, z0 + T + 0.16, std('#1b5e20'), false);
  sign(B, -29.5, DH + 0.375, z0 + T + 0.165, 1.3, 0.4, signMat('🏃 出口 EXIT', '#00c853', '#ffffff', 'bold 70px sans-serif'), '+z');
  spot(-29.5, z0 + 1.6, 'exitSign', 1.1);

  // ---------- 消防 Breakglass（右手邊牆，4 種顏色）----------
  const GL = [
    { c: '#d32f2f', n: '火警鐘', en: 'Fire alarm', act: () => { api.sfx.firebell(3); api.toast('🔴 紅色 Breakglass：火警鐘響！\n有火警就要即刻由出口離開', 3500); api.say('Break glass for the fire alarm. Ring ring! Leave the building now!', '紅色係火警鐘：打破玻璃，消防鐘就會響，要即刻離開！', { force: true, now: true }); } },
    { c: '#2e7d32', n: '緊急開門', en: 'Emergency door release', act: () => { api.sfx.door(); api.toast('🟢 綠色 Breakglass：緊急開門！\n電子鎖嘅門即刻打開，方便逃生', 3500); api.say('The green break glass opens the door in an emergency.', '綠色係緊急開門掣：打破玻璃，電子門鎖就會打開。', { force: true, now: true }); } },
    { c: '#fbc02d', n: '煤氣緊急截斷', en: 'Emergency gas shut-off', act: () => { api.sfx.beep(); api.toast('🟡 黃色 Breakglass：煤氣緊急截斷！\n煤氣即刻熄晒，防止爆炸', 3500); api.say('The yellow break glass shuts off the gas.', '黃色係煤氣緊急截斷掣：打破玻璃就會截斷煤氣。', { force: true, now: true }); } },
    { c: '#1565c0', n: '緊急求助', en: 'Emergency call', act: () => { api.sfx.ding(); api.toast('🔵 藍色 Breakglass：緊急求助！\n管理處 / 保安即刻收到通知', 3500); api.say('The blue break glass calls for help.', '藍色係緊急求助掣：打破玻璃，保安就會嚟幫你。', { force: true, now: true }); } },
  ];
  const gx = x1 - T - 0.08, glassMat = std('#e3f2fd', { transparent: true, opacity: 0.85, roughness: 0.1 });
  GL.forEach((g, i) => {
    const z = 14.6 + i * 1.1;
    B.box(gx - 0.08, 1.25, z - 0.18, gx, 1.61, z + 0.18, std(g.c));
    sign(B, gx - 0.09, 1.0, z, 0.9, 0.22, signMat(`${g.n}`, g.c, '#fff', 'bold 60px sans-serif'), '-x');
    const glass = mesh(new THREE.BoxGeometry(0.02, 0.22, 0.22), glassMat, gx - 0.09, 1.43, z);
    let broken = 0;
    inter.push({ pos: V(gx - 0.8, 0, z), r: 0.65, label: () => broken > Date.now() ? `🔨 ${g.n}（玻璃已爆，等陣自動復原）` : `🔨 打破${['紅', '綠', '黃', '藍'][i]}色 Breakglass（${g.n}）`, act: () => {
      if (broken > Date.now()) return api.toast('玻璃已經爆咗，等陣就會換返新嘅');
      broken = Date.now() + 8000; glass.visible = false; g.act();
      setTimeout(() => { glass.visible = true; }, 8000);
    } });
  });
  spot(gx - 0.8, 16.25, 'breakglass', 2.2);

  // ---------- 消防喉轆（右手邊牆）----------
  { const hz = 20.6, reel = new THREE.CylinderGeometry(0.34, 0.34, 0.18, 20); reel.rotateZ(Math.PI / 2); reel.translate(gx - 0.25, 1.3, hz); B.add(reel, red);
    const hub = new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12); hub.rotateZ(Math.PI / 2); hub.translate(gx - 0.25, 1.3, hz); B.add(hub, white);
    B.box(gx - 0.05, 0.6, hz - 0.45, gx, 1.8, hz + 0.45, std('#b71c1c'), false);
    sign(B, gx - 0.09, 2.05, hz, 1.0, 0.25, signMat('消防喉轆 HOSE REEL', '#b71c1c', '#fff', 'bold 44px sans-serif'), '-x');
    spot(gx - 0.9, hz, 'hose', 1.2); }

  // ---------- 冷氣機 + 抽氣扇（後牆）----------
  { const bz = z1 - T;
    // 窗口式冷氣機：穿過後牆
    B.box(-27.2, 2.0, bz - 0.35, -26.2, 2.6, z1 + 0.35, std('#f5f5f5'));
    for (let k = 0; k < 5; k++) B.box(-27.1, 2.07 + k * 0.1, bz - 0.37, -26.3, 2.09 + k * 0.1, bz - 0.35, std('#90a4ae'), false);
    spot(-26.7, bz - 1.1, 'acWindow', 1.2);
    // 分體式冷氣機：室內機喺後牆高位，室外機喺屋外
    B.box(-33.2, 3.4, bz - 0.3, -31.8, 3.78, bz, std('#fafafa'), false); B.box(-33.1, 3.42, bz - 0.32, -31.9, 3.45, bz - 0.3, std('#90a4ae'), false);
    B.box(-33.0, 0, z1 + 0.1, -31.9, 0.75, z1 + 0.5, std('#eceff1'));
    spot(-32.5, bz - 1.2, 'acSplit', 1.3);
    // 多一部分體式冷氣機室外機（壓縮機）：掛喺後牆外面嘅鐵架，有風扇網同銅喉
    { const ax0 = -25.4, ax1 = -24.2, ay = 1.5, az = z1 + 0.12;
      B.box(ax0 - 0.05, ay - 0.06, az, ax1 + 0.05, ay - 0.02, az + 0.55, std('#616161', { metalness: 0.6 }), false);   // 鐵架
      B.box(ax0, ay, az + 0.05, ax1, ay + 0.78, az + 0.5, std('#eceff1'));
      for (let k = 0; k < 6; k++) B.box(ax0 + 0.1, ay + 0.1 + k * 0.1, az + 0.5, ax0 + 0.72, ay + 0.12 + k * 0.1, az + 0.52, std('#78909c'), false);   // 風扇網
      const fan = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), std('#455a64', { side: THREE.DoubleSide })); fan.position.set(ax0 + 0.41, ay + 0.39, az + 0.515); scene.add(fan);
      B.box(ax1 - 0.12, ay + 0.78, az + 0.04, ax1 - 0.08, 3.6, az + 0.08, std('#b87333', { metalness: 0.7 }), false);   // 銅喉上牆
      B.box(ax1 - 0.32, ay + 0.78, az + 0.04, ax1 - 0.28, 3.6, az + 0.08, std('#b87333', { metalness: 0.7 }), false);
      sign(B, (ax0 + ax1) / 2 - 1.2, ay + 1.1, az - 0.08, 1.2, 0.26, signMat('壓縮機 COMPRESSOR', '#37474f', '#fff', 'bold 44px sans-serif'), '+z');
      spot((ax0 + ax1) / 2, z1 + 1.4, 'acSplit', 1.4); }
    // 前方後圓抽氣扇
    exhaustFan(B, -29.7, 3.5, bz - 0.08, '-z', 0); }

  // ---------- 馬路車紅綠燈 + 行人過路燈（左手邊，示範路口）----------
  const lit = { r: '#ff2b2b', y: '#ffc400', g: '#20e070' };
  const lampM = k => new THREE.MeshBasicMaterial({ color: '#222' });
  const tlx = x0 + 1.4;
  const carLamps = {}, pedLamps = {};
  { const tz = 15.2;
    B.box(tlx - 0.07, 0, tz - 0.07, tlx + 0.07, 3.3, tz + 0.07, std('#37474f', { metalness: 0.6 }));
    B.box(tlx - 0.25, 2.5, tz - 0.25, tlx + 0.25, 3.9, tz + 0.15, IM.black, false);
    ['r', 'y', 'g'].forEach((k, i) => { const c = new THREE.CircleGeometry(0.17, 16); c.rotateY(Math.PI / 2); carLamps[k] = mesh(c, lampM(), tlx + 0.26, 3.6 - i * 0.45, tz - 0.05); mesh(hoodGeo(0.21, 0.26).rotateY(Math.PI / 2), hoodM, tlx + 0.26, 3.6 - i * 0.45, tz - 0.05); });
    // 行人路斑馬線（地下畫幾條白線）
    for (let k = 0; k < 5; k++) B.box(x0 + 2.4 + k * 0.7, 0.025, 15.8, x0 + 2.8 + k * 0.7, 0.03, 18.6, white, false);
    sign(B, tlx + 0.2, 1.9, tz + 0.7, 1.4, 0.35, signMat('🚦 車輛交通燈', '#263238', '#fff', 'bold 54px sans-serif'), '+x');
    spot(tlx + 1.1, tz, 'light', 1.3); }
  { const pz = 19.4;
    B.box(tlx - 0.07, 0, pz - 0.07, tlx + 0.07, 2.6, pz + 0.07, std('#37474f', { metalness: 0.6 }));
    B.box(tlx - 0.22, 1.7, pz - 0.25, tlx + 0.22, 2.6, pz + 0.25, IM.black, false);
    pedLamps.r = mesh(new THREE.PlaneGeometry(0.34, 0.34).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ map: manTex('#ff2b2b', false) }), tlx + 0.23, 2.37, pz);
    pedLamps.g = mesh(new THREE.PlaneGeometry(0.34, 0.34).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ map: manTex('#20e070', true) }), tlx + 0.23, 1.93, pz);
    // 遮光罩
    [2.37, 1.93].forEach(y => mesh(hoodGeo(0.22, 0.22).rotateY(Math.PI / 2), hoodM, tlx + 0.23, y, pz));
    // 行人過路掣（黃色箱）
    B.box(tlx + 0.07, 1.0, pz - 0.12, tlx + 0.25, 1.35, pz + 0.12, std('#ffd600'), false);
    sign(B, tlx + 0.2, 0.7, pz + 0.75, 1.4, 0.35, signMat('🚶 行人過路燈', '#263238', '#fff', 'bold 54px sans-serif'), '+x');
    spot(tlx + 1.1, pz, 'pedLight', 1.3); }
  // 綠燈 10 秒 → 黃燈 3 秒 → 紅燈 12 秒（紅燈時行人綠公仔，最後 4 秒閃）
  let lastBeep = 0;
  function paintLights(t, near) {
    const u = (t / 1000) % 25, car = u < 10 ? 'g' : u < 13 ? 'y' : 'r';
    for (const k of ['r', 'y', 'g']) carLamps[k].material.color.set(car === k ? lit[k] : '#2a2a2a');
    const walk = car === 'r' && u < 24, flash = walk && u > 20 && Math.floor(t / 250) % 2;
    pedLamps.g.material.color.set(walk && !flash ? '#ffffff' : '#333333');
    pedLamps.r.material.color.set(walk ? '#333333' : '#ffffff');
    // 行人綠燈嘅「嘀嘀嘀」聲（行近先聽到）
    if (near && walk && t - lastBeep > (u > 20 ? 150 : 450)) { lastBeep = t; api.sfx.beep?.(); }
  }

  // ---------- 展示枱：手機電話、金條、銀條 ----------
  { const tx0 = -31.2, tx1 = -27.8, tz0 = 18.2, tz1 = 19.6, ty = 0.85;
    B.box(tx0, ty - 0.06, tz0, tx1, ty, tz1, IM.wood);
    [[tx0 + 0.1, tz0 + 0.1], [tx1 - 0.1, tz0 + 0.1], [tx0 + 0.1, tz1 - 0.1], [tx1 - 0.1, tz1 - 0.1]].forEach(([x, z]) => B.box(x - 0.05, 0, z - 0.05, x + 0.05, ty - 0.06, z + 0.05, IM.dark, false));
    B.cols.push({ min: [tx0, 0, tz0], max: [tx1, ty, tz1] });
    // 手機
    B.box(-30.8, ty, 18.7, -30.6, ty + 0.02, 19.05, IM.black, false); B.box(-30.79, ty + 0.021, 18.72, -30.61, ty + 0.023, 19.03, IM.screen, false);
    // 枱頭電話
    B.box(-30.3, ty, 18.6, -29.9, ty + 0.12, 19.0, std('#eceff1'), false); B.box(-30.32, ty + 0.12, 18.62, -29.88, ty + 0.18, 18.72, std('#cfd8dc'), false);
    // 金條（金字塔咁疊）
    const goldM = std('#ffd54f', { metalness: 0.9, roughness: 0.25, emissive: '#5a4000', emissiveIntensity: 0.4 }), silverM = std('#e0e0e0', { metalness: 0.95, roughness: 0.2 });
    const bars = (cx, m, rows) => { rows.forEach((n, r) => { for (let k = 0; k < n; k++) { const x = cx + (k - (n - 1) / 2) * 0.2; B.box(x - 0.08, ty + r * 0.06, 18.75, x + 0.08, ty + 0.055 + r * 0.06, 19.05, m, false); } }); };
    bars(-29.1, goldM, [4, 3, 2, 1]); bars(-28.3, silverM, [3, 2, 1]);
    sign(B, -29.5, ty + 0.16, tz0 - 0.01, 3.2, 0.3, signMat('📱 手機電話　🥇 金條　🥈 銀條（展示）', '#3e2723', '#ffe082', 'bold 40px sans-serif'), '-z');
    inter.push({ pos: V(-30.5, 0, 17.6), r: 0.8, label: () => '📱 用手機電話', act: () => { api.sfx.click(); api.openPhone?.(); api.say('This is a mobile phone. We can call our friends.', '呢部係手機（mobile phone），可以打電話俾朋友。', { force: true, now: true }); } });
    inter.push({ pos: V(-29.1, 0, 17.6), r: 0.6, label: () => '🥇 睇吓金條', act: () => { api.sfx.pickup(); api.toast('🥇 玩具屋嘅金條係展示品，摸吓都好 😄\n真金條可以去銀行金庫或者屋企保險箱', 3500); api.say('This is a gold bar. It is shiny and heavy!', '呢條係金條（gold bar），又閃又重！', { force: true, now: true }); } });
    inter.push({ pos: V(-28.3, 0, 17.6), r: 0.6, label: () => '🥈 睇吓銀條', act: () => { api.sfx.pickup(); api.toast('🥈 玩具屋嘅銀條係展示品\n真銀條可以去銀行賣', 3500); api.say('This is a silver bar.', '呢條係銀條（silver bar）。', { force: true, now: true }); } });
    spot(-30.5, 17.6, 'phone', 0.8); spot(-29.1, 17.6, 'goldBar', 0.6); spot(-28.3, 17.6, 'silverBar', 0.6);
  }

  const g = B.build(); scene.add(g);
  const near = p => Math.abs(p.x - (x0 + x1) / 2) < 60 && Math.abs(p.z - (z0 + z1) / 2) < 60;
  const inside = p => p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1 && p.y > -1 && p.y < H;
  let shown = true;
  function update(dt, t, p) {
    const n = near(p); if (n !== shown) { shown = n; g.visible = dyn.visible = n; }
    if (!n) return;
    paintLights(t, inside(p) && p.x < x0 + 5);
  }
  return { colliders: B.cols, interactables: inter, spots, update, inside, door: V((DX0 + DX1) / 2, 0.1, z0 - 1.5) };
}

// 行人燈公仔（企定紅公仔 / 行緊綠公仔）
function manTex(color, walking) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, 64, 64); x.fillStyle = color; x.strokeStyle = color; x.lineWidth = 7; x.lineCap = 'round';
  x.beginPath(); x.arc(32, 12, 7, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(32, 21); x.lineTo(32, 40);
  if (walking) { x.moveTo(32, 40); x.lineTo(22, 58); x.moveTo(32, 40); x.lineTo(42, 56); x.moveTo(32, 26); x.lineTo(20, 36); x.moveTo(32, 26); x.lineTo(44, 34); }
  else { x.moveTo(32, 40); x.lineTo(27, 58); x.moveTo(32, 40); x.lineTo(37, 58); x.moveTo(32, 26); x.lineTo(25, 40); x.moveTo(32, 26); x.lineTo(39, 40); }
  x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
