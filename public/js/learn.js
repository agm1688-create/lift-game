// 機械圖解（學英文）：行近飛機、直升機、冷氣機、巴士、紅綠燈等，會出「🔍 睇內部零件」掣
// 打開後見到 3D 模型 + 每件零件（中文 + 英文），撳一下就讀出英文
import * as THREE from 'three';
import { buildAircraft } from './airport.js';
import { buildTransitModel } from './transit.js';
import { buildBike } from './vehicles.js';
import { buildCarOf } from './traffic.js';
import { buildFireTruck, buildPoliceCar } from './events.js';
import { buildBoat } from './river.js';
import { buildMech } from './arena.js';
import { buildTrain } from './skytrain.js';
import { PARTS as ROOM_PARTS } from './liftroom.js';
import { fanModel } from './interiors.js';

const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
function grp(fn) { const g = new THREE.Group(); const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(c)); m.position.set(x, y, z); g.add(m); return m; }; const cyl = (r0, r1, h, c, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 20), std(c)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; }; fn(box, cyl, g); return g; }
const MODELS = {
  camper: () => grp((box, cyl) => { box(2.4, 2.6, 6.5, '#fafafa', 0, 1.8, 0); box(2.42, 0.4, 6.5, '#26a69a', 0, 1.0, 0); box(2.42, 0.9, 1.4, '#22313f', 0, 2.3, 3.1); box(1.4, 0.1, 2.2, '#1e88e5', 0, 3.15, -1); [[-1.1, 2], [1.1, 2], [-1.1, -2], [1.1, -2]].forEach(([x, z]) => cyl(0.45, 0.45, 0.3, '#111', x, 0.45, z, 0, Math.PI / 2)); }),
  light: () => grp((box, cyl) => { cyl(0.1, 0.12, 4.5, '#37474f', 0, 2.25, 0); box(0.6, 1.6, 0.4, '#1b1b1b', 0, 4.4, 0); ['#ff2b2b', '#ffc400', '#20e070'].forEach((c, k) => cyl(0.18, 0.18, 0.1, c, 0, 4.9 - k * 0.5, 0.22, Math.PI / 2)); box(0.35, 0.6, 0.25, '#1b1b1b', 0.4, 2.6, 0); box(0.25, 0.3, 0.2, '#ffd600', 0.1, 1.2, 0.15); box(0.6, 0.9, 0.5, '#90a4ae', -0.8, 0.45, 0); }),
  acWindow: () => grp((box) => { box(0.7, 0.45, 0.6, '#eceff1', 0, 0.3, 0); for (let k = 0; k < 6; k++) box(0.6, 0.02, 0.02, '#90a4ae', 0, 0.2 + k * 0.05, 0.31); box(0.15, 0.25, 0.02, '#455a64', 0.25, 0.35, 0.31); }),
  acSplit: () => grp((box, cyl) => { box(1.0, 0.3, 0.22, '#fafafa', 0, 1.4, 0); box(0.9, 0.04, 0.02, '#90a4ae', 0, 1.27, 0.12); box(0.8, 0.6, 0.3, '#eceff1', 0, 0.3, 0.8); cyl(0.22, 0.22, 0.04, '#78909c', -0.15, 0.3, 0.96, Math.PI / 2); cyl(0.02, 0.02, 1.1, '#b87333', 0.35, 0.85, 0.45, 0.6); }),
  lift: () => grp((box) => { box(2, 2.6, 0.08, '#cfd8dc', 0, 1.3, -1); box(0.08, 2.6, 2, '#cfd8dc', -1, 1.3, 0); box(0.08, 2.6, 2, '#cfd8dc', 1, 1.3, 0); box(0.95, 2.3, 0.05, '#b0bec5', -0.48, 1.15, 1); box(0.95, 2.3, 0.05, '#b0bec5', 0.48, 1.15, 1); box(2, 0.1, 2, '#78909c', 0, 0, 0); box(0.25, 0.5, 0.04, '#263238', 0.7, 1.3, 0.95); box(0.4, 0.15, 0.05, '#111', 0, 2.45, 1.02); box(1.2, 1.4, 0.2, '#616161', 0, 0.9, -1.6); }),
  machine: () => grp((box, cyl) => { cyl(0.75, 0.75, 1.8, '#2e7d32', -0.8, 0.95, 0, 0, Math.PI / 2); cyl(0.85, 0.85, 0.5, '#b0bec5', 0.5, 0.95, 0, 0, Math.PI / 2); box(0.4, 0.9, 1.0, '#ffd600', -1.95, 0.95, 0); box(1.6, 2, 0.6, '#90a4ae', 2.4, 1, -1.2); cyl(0.4, 0.4, 0.18, '#ef6c00', 2.2, 1.2, 1, 0, Math.PI / 2); }),
  mtr: () => grp((box) => { box(3, 3.4, 12, '#e0e0e0', 0, 1.9, 0); box(3.02, 0.3, 12, '#c62828', 0, 1.0, 0); for (let z = -4.5; z <= 4.5; z += 3) box(3.04, 1, 1.6, '#1e2a33', 0, 2.4, z); box(3.04, 2.2, 1.2, '#9e9e9e', 0, 1.3, -1.5); box(3.04, 2.2, 1.2, '#9e9e9e', 0, 1.3, 1.5); }),
  wheel: () => grp((box, cyl, g) => { const t = new THREE.Mesh(new THREE.TorusGeometry(3, 0.12, 8, 40), std('#e91e63')); t.position.y = 3.8; g.add(t); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; box(0.6, 0.6, 0.6, ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5'][k % 4], Math.cos(a) * 3, 3.8 + Math.sin(a) * 3, 0); } cyl(0.15, 0.2, 4, '#eee', -0.9, 1.9, 0, 0, 0.25); cyl(0.15, 0.2, 4, '#eee', 0.9, 1.9, 0, 0, -0.25); }),
};
MODELS.cable = () => grp((box, cyl, g) => { const s = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), std('#d4af37', { metalness: 0.8, roughness: 0.25 })); s.scale.y = 0.85; s.position.y = 1.2; g.add(s); cyl(0.05, 0.05, 2, '#333', 0, 3, 0); cyl(0.04, 0.04, 8, '#222', 0, 4, 0, 0, Math.PI / 2); });

// [圖示, 中文, English]
const P = (s) => s.split('|').map(x => x.split('/'));
export const MACHINES = {
  plane: { zh: '小型飛機', en: 'Small plane', m: () => buildAircraft('plane', '#e53935'), parts: P('🌀/螺旋槳/propeller|🪽/機翼/wing|🦅/尾翼/tail fin|🧑‍✈️/駕駛艙/cockpit|🛞/起落架/landing gear|🔧/引擎/engine|⛽/油箱/fuel tank|🕹/操縱桿/control stick|🪟/擋風玻璃/windscreen|💡/航行燈/navigation light') },
  heli: { zh: '直升機', en: 'Helicopter', m: () => buildAircraft('heli', '#1565c0'), parts: P('🌀/主旋翼/main rotor|🔄/尾旋翼/tail rotor|🦯/尾桁/tail boom|🛷/起落橇/skids|🧑‍✈️/駕駛艙/cockpit|🔧/引擎/engine|🎚/總距桿/collective lever|🕹/循環桿/cyclic stick|⛽/油箱/fuel tank') },
  jumbo: { zh: '巨無霸客機', en: 'Jumbo jet', m: () => buildAircraft('jumbo', '#c62828'), parts: P('🔧/噴射引擎/jet engine|🪽/機翼/wing|🦅/垂直尾翼/vertical stabiliser|🛞/起落架/landing gear|🚪/機艙門/cabin door|💺/乘客座位/passenger seats|🧑‍✈️/駕駛艙/cockpit|🧳/貨艙/cargo hold|🚻/洗手間/toilet') },
  fighter: { zh: '戰鬥機', en: 'Fighter jet', m: () => buildAircraft('fighter', '#607d8b'), parts: P('🔥/後燃器/afterburner|🫧/座艙罩/canopy|🪽/三角翼/delta wing|📡/雷達/radar|💺/彈射座椅/ejection seat|🛞/起落架/landing gear|🔧/噴射引擎/jet engine') },
  taxi: { zh: '的士', en: 'Taxi', m: () => buildTransitModel('taxi'), parts: P('🚖/的士燈/taxi sign|🧾/咪錶/taxi meter|🛞/車轆/wheels|🔦/車頭燈/headlights|🧭/軚盤/steering wheel|💺/座位/seats|🔒/安全帶/seat belt|🪞/倒後鏡/rear-view mirror|🔧/引擎/engine|⛽/石油氣缸/gas tank|🧳/車尾箱/boot') },
  minibus: { zh: '小巴', en: 'Minibus', m: () => buildTransitModel('minibus'), parts: P('🪧/路線牌/route sign|💺/十六個座位/sixteen seats|🛑/落車鐘/stop button|🚪/趟門/sliding door|🧭/軚盤/steering wheel|📟/車速顯示/speed display|🛞/車轆/wheels|🔦/車頭燈/headlights|🔒/安全帶/seat belt') },
  bus: { zh: '雙層巴士', en: 'Double-decker bus', m: () => buildTransitModel('bus'), parts: P('🪜/樓梯/staircase|⬆️/上層/upper deck|⬇️/下層/lower deck|💳/八達通機/card reader|🛑/落車鐘/bell button|🚪/車門/doors|🧭/軚盤/steering wheel|🪧/路線顯示屏/destination display|🛞/車轆/wheels|📹/閉路電視/CCTV camera') },
  camper: { zh: '露營車', en: 'Camper van', m: MODELS.camper, parts: P('🛏/床/bed|🍳/廚房/kitchen|🚿/浴室/bathroom|🔋/電池/battery|💧/水箱/water tank|☀️/太陽能板/solar panel|⛺/遮陽篷/awning|🧭/軚盤/steering wheel|❄️/雪櫃/fridge') },
  light: { zh: '紅綠燈', en: 'Traffic light', m: MODELS.light, parts: P('🔴/紅燈/red light|🟡/黃燈/amber light|🟢/綠燈/green light|🚶/行人燈/pedestrian light|🔘/行人過路掣/push button|🔊/嘀嘀聲/beeping sound|📦/控制箱/control box|🦯/燈柱/pole|🦓/斑馬線/zebra crossing') },
  acWindow: { zh: '窗口式冷氣機', en: 'Window air conditioner', m: MODELS.acWindow, parts: P('🌬/出風口/air vent|🧊/冷凝器/condenser|❄️/蒸發器/evaporator|🌀/風扇/fan|⚙️/壓縮機/compressor|🧽/隔塵網/air filter|🎛/控制面板/control panel|📡/遙控/remote control|💧/去水喉/drain pipe|🌡/溫度計/thermostat') },
  acSplit: { zh: '分體式冷氣機', en: 'Split air conditioner', m: MODELS.acSplit, parts: P('🏠/室內機/indoor unit|🏗/室外機/outdoor unit|⚙️/壓縮機/compressor|🌀/室外風扇/outdoor fan|🧊/冷凝器/condenser|❄️/蒸發器/evaporator|🧪/雪種/refrigerant|🔗/銅喉/copper pipes|🧽/隔塵網/air filter|📡/遙控/remote control') },
  lift: { zh: '電梯', en: 'Lift', m: MODELS.lift, parts: P('🚪/電梯門/lift door|🔢/樓層掣/floor buttons|📟/樓層顯示/floor display|🔔/警鐘/alarm bell|📞/對講機/intercom|🪢/鋼纜/steel ropes|🧱/對重/counterweight|🛤/導軌/guide rails|🛑/安全鉗/safety brake|📹/閉路電視/CCTV camera|⚖️/超重警報/overload alarm') },
  machine: { zh: '電梯機房', en: 'Lift machine room', m: MODELS.machine, parts: Object.values(ROOM_PARTS).map(p => ['⚙️', p[0], p[1]]) },
  bike: { zh: '電單車', en: 'Motorbike', m: () => buildBike(), parts: P('🔧/引擎/engine|🛞/車轆/wheels|⛽/油缸/fuel tank|🎚/車頭把/handlebars|🛑/剎車/brakes|🔦/車頭燈/headlight|💨/死氣喉/exhaust pipe|⛓/鏈條/chain|🪑/座位/seat|🪞/倒後鏡/mirrors|⛑/頭盔/helmet') },
  sedan: { zh: '私家車', en: 'Car', m: () => buildCarOf('sedan', '#1565c0'), parts: P('🔧/引擎/engine|🛞/車轆/wheels|🧭/軚盤/steering wheel|🔒/安全帶/seat belt|🔦/車頭燈/headlights|🚨/剎車燈/brake lights|📯/響號/horn|🧹/水撥/windscreen wipers|🧳/車尾箱/boot|🛡/車頭蓋/bonnet|⛽/油缸/fuel tank') },
  van: { zh: '客貨車', en: 'Van', m: () => buildCarOf('van', '#fafafa'), parts: P('📦/貨倉/cargo area|🚪/趟門/sliding door|🔧/引擎/engine|🛞/車轆/wheels|🧭/軚盤/steering wheel|🔦/車頭燈/headlights|🪞/倒後鏡/side mirror') },
  truck: { zh: '貨車', en: 'Lorry', m: () => buildCarOf('truck', '#1e88e5'), parts: P('🚛/車頭/cab|📦/貨箱/container|🔧/柴油引擎/diesel engine|🛞/六個車轆/six wheels|🪝/尾板/tailgate|🔦/車頭燈/headlights|📯/響號/horn') },
  fire: { zh: '消防車', en: 'Fire engine', m: () => buildFireTruck(), parts: P('🪜/雲梯/aerial ladder|🚨/警號/siren|💡/警燈/flashing lights|💧/消防喉/fire hose|🛢/水缸/water tank|🧯/滅火筒/fire extinguisher|🪓/斧頭/axe|⛑/頭盔/helmet|🔦/電筒/torch') },
  police: { zh: '警車', en: 'Police car', m: () => buildPoliceCar(), parts: P('🚨/警號/siren|💡/警燈/flashing lights|📻/無線電/radio|🔦/電筒/torch|📹/車cam/dashboard camera|🧭/軚盤/steering wheel|🚧/雪糕筒/traffic cones|🔒/安全帶/seat belt') },
  mtr: { zh: '港鐵列車', en: 'MTR train', m: MODELS.mtr, parts: P('🚪/車門/train doors|🗺/路線圖/route map|📟/顯示屏/display screen|🧷/扶手/handrail|💺/座位/seats|🔊/廣播/announcement|🆘/緊急通話掣/emergency button|⚡/架空電纜/overhead power line|🛤/路軌/tracks|🚧/月台幕門/platform screen doors') },
  sky: { zh: '空中輕軌', en: 'Sky train', m: () => buildTrain(), parts: P('🌉/高架橋/viaduct|🚃/車卡/carriage|🪟/車窗/windows|🧷/扶手/handrail|🚪/車門/doors|⚡/供電軌/power rail|🏛/月台/platform|🛗/升降機/lift') },
  boat: { zh: '觀光船', en: 'Tour boat', m: () => buildBoat(), parts: P('⚓/錨/anchor|🛟/救生圈/life buoy|🦺/救生衣/life jacket|🚩/旗/flag|☸️/舵盤/ship\'s wheel|🔧/引擎/engine|🌀/螺旋槳/propeller|🪑/長凳/bench|⛱/上蓋/canopy') },
  mech: { zh: '巨型機甲', en: 'Giant robot', m: () => buildMech(0), parts: P('🧑‍✈️/駕駛艙/cockpit|🛡/盾牌/shield|🚀/噴射器/jet thrusters|👊/拳頭/fist|⚡/光炮/laser cannon|🦿/機械腳/robot legs|🔋/能量核心/power core|📡/感應器/sensors') },
  cable: { zh: '纜車', en: 'Cable car', m: MODELS.cable, parts: P('🪢/鋼纜/steel cable|🚡/車廂/cabin|🗼/鐵塔/tower|⚙️/驅動輪/drive wheel|🏛/纜車站/station|🔒/門鎖/door lock|🪟/玻璃窗/glass windows') },
  sofa: { zh: '梳化', en: 'Sofa', m: () => grp((box) => { box(2.2, 0.45, 0.9, '#3f5f8a', 0, 0.25, 0); box(2.2, 0.6, 0.2, '#3f5f8a', 0, 0.75, -0.35); box(0.2, 0.3, 0.9, '#3f5f8a', -1.0, 0.6, 0); box(0.2, 0.3, 0.9, '#3f5f8a', 1.0, 0.6, 0); box(0.5, 0.15, 0.4, '#ffca28', -0.5, 0.55, 0); }), parts: P('🛋/坐墊/seat cushion|🪑/靠背/backrest|💪/扶手/armrest|🟨/咕𠺢/cushion|🦵/梳化腳/sofa legs|🧵/布面/fabric cover') },
  tv: { zh: '電視機', en: 'Television', m: () => grp((box) => { box(1.6, 0.95, 0.06, '#111', 0, 1.2, 0); box(1.5, 0.85, 0.01, '#1d4f86', 0, 1.2, 0.035); box(1.8, 0.5, 0.45, '#4a3226', 0, 0.25, 0); box(0.2, 0.05, 0.08, '#333', 0.5, 0.55, 0.3); }), parts: P('📺/屏幕/screen|🔊/喇叭/speakers|📡/遙控/remote control|🔌/電線/power cable|🔘/開關掣/power button|📶/天線/antenna|🗄/電視櫃/TV cabinet') },
  dining: { zh: '飯枱', en: 'Dining table', m: () => grp((box, cyl) => { box(1.6, 0.06, 1, '#8d6e4f', 0, 0.76, 0); [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].forEach(([x, z]) => box(0.06, 0.74, 0.06, '#6d4c41', x, 0.37, z)); [[-0.4, -0.75], [0.4, -0.75], [-0.4, 0.75], [0.4, 0.75]].forEach(([x, z]) => box(0.4, 0.05, 0.4, '#37474f', x, 0.45, z)); cyl(0.12, 0.12, 0.05, '#fafafa', 0, 0.82, 0); }), parts: P('🍽/碟/plate|🥢/筷子/chopsticks|🥄/匙羹/spoon|🥣/碗/bowl|🪑/櫈/chair|🍵/杯/cup|🟫/枱面/tabletop') },
  cctv: { zh: '閉路電視', en: 'CCTV', m: () => grp((box, cyl) => { box(0.9, 0.6, 0.06, '#111', 0, 1.2, 0); box(0.85, 0.55, 0.01, '#1565c0', 0, 1.2, 0.035); cyl(0.12, 0.12, 0.45, '#eeeeee', 0.9, 1.6, 0.3, Math.PI / 2); box(0.1, 0.2, 0.1, '#bbb', 0.9, 1.8, 0.1); }), parts: P('📹/攝影機/camera|🖥/顯示屏/monitor|🔍/鏡頭/lens|💾/錄影機/video recorder|🌙/夜視燈/night vision light|🔌/電線/cable') },
  alarm: { zh: '消防鐘', en: 'Fire alarm bell', m: () => grp((box, cyl) => { cyl(0.3, 0.3, 0.12, '#d32f2f', 0, 1.5, 0, Math.PI / 2); box(0.5, 0.35, 0.08, '#c62828', 0, 0.9, 0); box(0.3, 0.2, 0.02, '#fafafa', 0, 0.9, 0.05); }), parts: P('🔔/警鐘/bell|🔴/警報掣/alarm button|🔨/玻璃錘/glass hammer|💡/警示燈/warning light|🔊/鈴聲/ringing sound|🚪/走火通道/fire exit') },
  hose: { zh: '消防喉轆', en: 'Fire hose reel', m: () => grp((box, cyl) => { cyl(0.5, 0.5, 0.25, '#d32f2f', 0, 1.2, 0, Math.PI / 2); cyl(0.15, 0.15, 0.3, '#fafafa', 0, 1.2, 0, Math.PI / 2); box(0.08, 0.6, 0.08, '#b71c1c', 0.55, 0.9, 0); box(0.1, 0.2, 0.1, '#ffca28', 0.55, 0.55, 0); }), parts: P('🌀/喉轆/reel|🧵/消防喉/fire hose|🚿/噴嘴/nozzle|🔧/水掣/water valve|💧/水管/water pipe|🧯/滅火筒/fire extinguisher') },
  stove: { zh: '煮食爐', en: 'Stove', m: () => grp((box, cyl) => { box(1, 0.9, 0.6, '#8d6e4f', 0, 0.45, 0); box(1, 0.04, 0.6, '#ccc', 0, 0.92, 0); cyl(0.15, 0.15, 0.03, '#111', -0.25, 0.95, 0); cyl(0.15, 0.15, 0.03, '#111', 0.25, 0.95, 0); }), parts: P('🔥/爐頭/burner|🎛/火掣/knob|🍳/鑊/wok|🥘/煲/pot|💨/抽油煙機/cooker hood|⛽/煤氣/gas') },
  riceCooker: { zh: '電飯煲', en: 'Rice cooker', m: () => grp((box, cyl) => { cyl(0.3, 0.3, 0.35, '#eceff1', 0, 0.2, 0); cyl(0.3, 0.28, 0.08, '#cfd8dc', 0, 0.42, 0); box(0.12, 0.06, 0.04, '#e53935', 0, 0.25, 0.3); }), parts: P('🍚/內膽/inner pot|🫕/蓋/lid|🔘/煮飯掣/cook button|💡/保溫燈/keep warm light|🥄/飯殼/rice spoon|🔌/電線/power cord') },
  microwave: { zh: '微波爐', en: 'Microwave oven', m: () => grp((box) => { box(0.6, 0.35, 0.4, '#cfd8dc', 0, 0.2, 0); box(0.38, 0.25, 0.01, '#263238', -0.08, 0.2, 0.205); box(0.1, 0.25, 0.01, '#90a4ae', 0.23, 0.2, 0.205); }), parts: P('🚪/門/door|🪟/玻璃窗/glass window|🔢/按鈕/buttons|⏲/計時器/timer|🍽/轉盤/turntable|💡/燈/light') },
  fridge: { zh: '雪櫃', en: 'Fridge', m: () => grp((box) => { box(0.8, 1.9, 0.7, '#eceff1', 0, 0.95, 0); box(0.82, 0.02, 0.72, '#90a4ae', 0, 1.3, 0); box(0.05, 0.4, 0.05, '#90a4ae', 0.32, 1.55, 0.37); box(0.05, 0.3, 0.05, '#90a4ae', 0.32, 1.0, 0.37); }), parts: P('🧊/冰格/freezer|❄️/雪櫃格/fridge compartment|🚪/雪櫃門/fridge door|🌡/溫度掣/temperature control|💡/燈/light|🥚/蛋格/egg tray|🥛/層架/shelves') },
  washer: { zh: '洗衣機', en: 'Washing machine', m: () => grp((box, cyl) => { box(0.7, 0.85, 0.65, '#fafafa', 0, 0.43, 0); cyl(0.25, 0.25, 0.02, '#90a4ae', 0, 0.45, 0.33, Math.PI / 2); box(0.5, 0.08, 0.02, '#455a64', 0, 0.78, 0.33); }), parts: P('🌀/洗衣桶/drum|🚪/門/door|🎛/程式掣/program knob|🧴/洗衣粉格/detergent drawer|💧/入水喉/water hose|🔄/脫水/spin|🔌/電線/power cord') },
  toilet: { zh: '坐廁', en: 'Toilet', m: () => grp((box, cyl) => { cyl(0.22, 0.18, 0.42, '#ffffff', 0, 0.21, 0); box(0.45, 0.45, 0.15, '#ffffff', 0, 0.62, -0.25); box(0.06, 0.04, 0.02, '#90a4ae', 0.1, 0.82, -0.17); }), parts: P('🚽/廁板/toilet seat|🪣/水箱/cistern|🔘/沖水掣/flush button|🧻/廁紙/toilet paper|💧/水/water|🪠/泵/plunger') },
  shower: { zh: '花灑', en: 'Shower', m: () => grp((box, cyl) => { cyl(0.02, 0.02, 1.8, '#b0bec5', 0, 0.9, 0); cyl(0.12, 0.08, 0.05, '#b0bec5', 0, 1.85, 0.12, Math.PI / 2); box(0.9, 0.05, 0.9, '#e0e0e0', 0, 0.02, 0.3); }), parts: P('🚿/花灑頭/shower head|🔥/熱水/hot water|❄️/凍水/cold water|🎚/水掣/tap|🧴/沐浴露/shower gel|🧽/毛巾/towel|🪟/玻璃門/glass door') },
  bed: { zh: '床', en: 'Bed', m: () => grp((box) => { box(1.4, 0.45, 2.0, '#4a3226', 0, 0.22, 0); box(1.36, 0.15, 1.96, '#fbfaf6', 0, 0.52, 0); box(1.36, 0.05, 1.3, '#d18b47', 0, 0.62, 0.3); box(0.5, 0.12, 0.35, '#ffffff', -0.3, 0.65, -0.75); box(1.4, 0.8, 0.08, '#4a3226', 0, 0.6, -1.0); }), parts: P('🛏/床褥/mattress|🛌/被/blanket|☁️/枕頭/pillow|🪵/床架/bed frame|🛏/床單/bed sheet|⏰/鬧鐘/alarm clock') },
  wardrobe: { zh: '衣櫃', en: 'Wardrobe', m: () => grp((box) => { box(1.2, 2.0, 0.6, '#8d6e4f', 0, 1.0, 0); box(0.01, 1.8, 0.01, '#3e2723', 0, 1.0, 0.305); box(0.04, 0.2, 0.04, '#ffca28', -0.08, 1.0, 0.32); box(0.04, 0.2, 0.04, '#ffca28', 0.08, 1.0, 0.32); }), parts: P('🚪/櫃門/doors|👕/衫/clothes|🧥/衣架/hangers|🗄/櫃桶/drawers|🪞/鏡/mirror|🔑/鎖/lock') },
  safe: { zh: '保險箱', en: 'Safe', m: () => grp((box, cyl) => { box(0.8, 0.9, 0.7, '#37474f', 0, 0.45, 0); cyl(0.12, 0.12, 0.04, '#ffd54f', 0, 0.55, 0.37, Math.PI / 2); box(0.2, 0.12, 0.02, '#111', 0.2, 0.75, 0.36); }), parts: P('🔐/密碼鎖/combination lock|🔢/數字鍵/keypad|🚪/厚鐵門/thick steel door|🥇/金條/gold bar|🥈/銀條/silver bar|🔑/鎖匙/key') },
  fan: { zh: '抽氣扇（前方後圓）', en: 'Exhaust fan', m: () => fanModel(), parts: P('🌀/扇葉/fan blades|⚙️/摩打/motor|⬛/方形外框/square frame|⚪/圓形摩打殼/round motor housing|🕸/防護網/safety grille|🪢/拉掣/pull cord switch|🔌/電線/power cable|🔩/螺絲/screws|💨/抽走熱氣/takes out hot air') },
  wheel: { zh: '摩天輪', en: 'Ferris wheel', m: MODELS.wheel, parts: P('🎡/輪盤/wheel|🚃/車廂/gondola|🦯/支架/support legs|⚙️/摩打/motor|💡/彩燈/lights|🎛/控制室/control room|🪢/鋼纜/steel cables') },
  // 柏熙玩具屋
  breakglass: { zh: '消防 Breakglass（打破玻璃掣）', en: 'Break glass call point', m: () => grp((box) => { ['#d32f2f', '#2e7d32', '#fbc02d', '#1565c0'].forEach((c, i) => { box(0.36, 0.36, 0.1, c, (i - 1.5) * 0.45, 1.4, 0); box(0.22, 0.22, 0.02, '#e3f2fd', (i - 1.5) * 0.45, 1.4, 0.06); }); }), parts: P('🔴/紅色：火警鐘/red: fire alarm|🟢/綠色：緊急開門/green: emergency door release|🟡/黃色：煤氣緊急截斷/yellow: emergency gas shut-off|🔵/藍色：緊急求助/blue: emergency call|🪟/玻璃片/glass panel|🔨/打破/break|🔑/復原鎖匙/reset key') },
  exitSign: { zh: '緊急出口牌', en: 'Emergency exit sign', m: () => grp((box) => { box(1.2, 0.4, 0.1, '#00c853', 0, 2.4, 0); box(0.3, 0.3, 0.02, '#ffffff', -0.35, 2.4, 0.06); box(0.08, 0.08, 0.08, '#fff176', 0.45, 2.15, 0.05); }), parts: P('🟩/綠色燈箱/green light box|🏃/走佬公仔/running man|🚪/出口/exit|➡️/箭咀/arrow|🔋/後備電池/backup battery|💡/燈膽/bulb') },
  lightSwitch: { zh: '燈掣', en: 'Light switch', m: () => grp((box) => { box(0.3, 0.42, 0.04, '#fafafa', 0, 1.3, 0); box(0.08, 0.14, 0.06, '#616161', 0, 1.34, 0.04); }), parts: P('🔘/開關掣/switch|⬆️/開/on|⬇️/關/off|💡/燈/light|🔌/電線/wire|⚡/電/electricity') },
  pedLight: { zh: '行人過路燈', en: 'Pedestrian crossing light', m: () => grp((box, cyl) => { cyl(0.07, 0.07, 2.6, '#37474f', 0, 1.3, 0); box(0.44, 0.9, 0.35, '#111', 0, 2.15, 0); box(0.3, 0.3, 0.02, '#ff2b2b', 0, 2.37, 0.18); box(0.3, 0.3, 0.02, '#20e070', 0, 1.93, 0.18); box(0.18, 0.35, 0.18, '#ffd600', 0.16, 1.17, 0); }), parts: P('🔴/紅公仔：唔好過/red man: do not cross|🟢/綠公仔：可以過/green man: cross now|✨/閃綠公仔：快啲過/flashing green man: hurry|🔘/過路掣/push button|🔊/嘀嘀聲/beeping sound|🦓/斑馬線/zebra crossing') },
  phone: { zh: '手機電話', en: 'Mobile phone', m: () => grp((box) => { box(0.4, 0.8, 0.05, '#111', 0, 0.4, 0); box(0.36, 0.7, 0.01, '#3fa9f5', 0, 0.42, 0.03); }), parts: P('📱/屏幕/screen|🔋/電池/battery|📷/鏡頭/camera|🎙/咪/microphone|🔊/喇叭/speaker|🔌/充電口/charging port|📞/打電話/make a call|💬/短訊/message') },
  goldBar: { zh: '金條', en: 'Gold bar', m: () => grp((box) => { box(0.6, 0.12, 0.28, '#ffd54f', 0, 0.06, 0); box(0.5, 0.06, 0.2, '#ffca28', 0, 0.15, 0); }), parts: P('🥇/金/gold|⚖️/重量/weight|🔢/編號/serial number|💎/純度/purity|🏦/銀行/bank|💰/值錢/valuable') },
  silverBar: { zh: '銀條', en: 'Silver bar', m: () => grp((box) => { box(0.6, 0.12, 0.28, '#e0e0e0', 0, 0.06, 0); box(0.5, 0.06, 0.2, '#bdbdbd', 0, 0.15, 0); }), parts: P('🥈/銀/silver|⚖️/重量/weight|🔢/編號/serial number|💎/純度/purity|✨/閃/shiny|💰/賣錢/sell') },
};

const CSS = `
#learnBtn { position:absolute; right:calc(24px + env(safe-area-inset-right)); bottom:112px; padding:9px 14px; border-radius:14px; background:linear-gradient(#26c6da,#00838f); color:#fff; font:700 15px system-ui,sans-serif; border:0; box-shadow:0 3px 10px #0006; z-index:6; touch-action:none; }
#learnModal { position:fixed; inset:0; z-index:58; background:rgba(5,20,35,.78); display:none; align-items:center; justify-content:center; padding:8px; }
#learnModal .lb { width:min(900px,97vw); max-height:96dvh; background:#0f2a3d; border:3px solid #26c6da; border-radius:16px; color:#fff; display:flex; flex-direction:column; overflow:hidden; font-family:system-ui,sans-serif; }
#learnModal .lh { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#00838f; }
#learnModal .lh b { font-size:20px; flex:1; } #learnModal .lh small { font-size:14px; opacity:.9; }
#learnModal .lh button { background:#004d57; border:0; color:#fff; border-radius:10px; padding:6px 12px; font-size:15px; cursor:pointer; }
#learnModal .lc { display:flex; gap:10px; padding:10px; min-height:0; flex:1; }
#learnModal canvas { width:42%; min-width:180px; aspect-ratio:1; background:radial-gradient(#2d5470,#0b1c28); border-radius:12px; align-self:flex-start; touch-action:none; }
#learnModal .lp { flex:1; display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; overflow-y:auto; align-content:start; }
#learnModal .lp button { background:#173f57; border:2px solid #2b6a8c; border-radius:12px; color:#fff; text-align:left; padding:8px 10px; cursor:pointer; display:flex; gap:8px; align-items:center; }
#learnModal .lp button.on { background:#00838f; border-color:#80deea; }
#learnModal .lp button span.e { font-size:24px; } #learnModal .lp button b { display:block; font-size:16px; } #learnModal .lp button i { font-style:normal; font-size:14px; color:#b2ebf2; }
#learnModal .lt { font-size:13px; opacity:.85; padding:0 12px 8px; }
@media (max-height:500px) { #learnModal canvas { width:34%; } #learnModal .lp button { padding:5px 8px; } #learnModal .lp button span.e { font-size:18px; } #learnModal .lp button b { font-size:14px; } #learnBtn { bottom:100px; font-size:13px; padding:7px 10px; } }
`;

export function buildLearn(api) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'learnBtn'; btn.style.display = 'none'; document.getElementById('hud').appendChild(btn);
  const modal = document.createElement('div'); modal.id = 'learnModal'; document.body.appendChild(modal);
  let curKey = null, open = false, renderer = null, scene3, cam, model = null, spin = 0, drag = null;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if (curKey) show(curKey); });
  function ensure3D(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene3 = new THREE.Scene(); scene3.add(new THREE.HemisphereLight('#fff', '#456', 1.6)); const dl = new THREE.DirectionalLight('#fff', 2); dl.position.set(3, 5, 4); scene3.add(dl);
    cam = new THREE.PerspectiveCamera(35, 1, 0.05, 2000);
  }
  let looping = false;
  function loop() {
    if (!open) { looping = false; return; }
    const cv = renderer.domElement, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (model && !drag) model.rotation.y += 0.008;
    renderer.render(scene3, cam); requestAnimationFrame(loop);
  }
  // 一個 canvas / renderer 用到尾（唔好每次開都起新 WebGL）
  modal.innerHTML = `<div class="lb"><div class="lh"><b></b><small></small><button data-a="all">🔊 全部讀</button><button data-a="x">✕</button></div>
    <div class="lc"><canvas></canvas><div class="lp"></div></div><div class="lt">撳零件就會讀出英文 · 拖住個模型可以轉嚟睇</div></div>`;
  const cv = modal.querySelector('canvas'), list = modal.querySelector('.lp');
  cv.onpointerdown = e => { if (!model) return; drag = { x: e.clientX, r: model.rotation.y }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (drag && model) model.rotation.y = drag.r + (e.clientX - drag.x) * 0.01; };
  cv.onpointerup = cv.onpointercancel = () => drag = null;
  modal.querySelector('[data-a="x"]').onclick = () => close();
  let curM = null;
  modal.querySelector('[data-a="all"]').onclick = () => curM && curM.parts.forEach(([, zh, en], i) => api.say(`${en}.`, `${zh}（${en}）`, { force: true, gap: 0, key: 'all' + i + Date.now() }));
  function show(key) {
    const M = MACHINES[key]; if (!M) return;
    curM = M; open = true;
    modal.querySelector('.lh b').textContent = `🔍 ${M.zh}`; modal.querySelector('.lh small').textContent = M.en;
    list.innerHTML = M.parts.map(([e, zh, en], i) => `<button data-i="${i}"><span class="e">${e}</span><span><b>${zh}</b><i>${en}</i></span></button>`).join('');
    list.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const [, zh, en] = M.parts[+b.dataset.i];
      list.querySelectorAll('[data-i]').forEach(x => x.classList.remove('on')); b.classList.add('on');
      api.say(`${en}.`, `${zh}（${en}）`, { force: true, now: true, rate: 0.92 });
    });
    modal.style.display = 'flex';
    if (!renderer) ensure3D(cv);
    if (model) scene3.remove(model);
    model = M.m(); scene3.add(model);
    const bb = new THREE.Box3().setFromObject(model), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    model.position.sub(c); const R = Math.max(size.x, size.y, size.z);
    cam.position.set(R * 1.1, R * 0.7, R * 1.5); cam.lookAt(0, 0, 0);
    api.say(`This is ${/^[aeiou]/i.test(M.en) ? 'an' : 'a'} ${M.en.toLowerCase()}. Tap each part to learn its name.`, `呢個係${M.zh}，撳每件零件學英文名。`, { force: true, now: true });
    api.sfx?.click();
    if (!looping) { looping = true; requestAnimationFrame(loop); }
  }
  function close() { open = false; modal.style.display = 'none'; if (model) { scene3.remove(model); model = null; } }
  function setNear(key) {
    if (key === curKey) return; curKey = key;
    if (!key) { btn.style.display = 'none'; return; }
    btn.textContent = `🔍 睇內部零件：${MACHINES[key].zh}`; btn.style.display = 'block';
  }
  return { setNear, show, close, isOpen: () => open };
}
