// 英文聽力：唔同情景（搭車、買嘢、銀行、上堂、交通燈…）都會用瀏覽器內置把聲講英文
// 畫面同時出英文字幕 + 中文意思，幫小朋友練 listening
const CSS = `
#engSub { position:fixed; left:50%; bottom:calc(128px + env(safe-area-inset-bottom)); transform:translateX(-50%); max-width:min(680px,92vw); background:rgba(13,40,80,.9); color:#fff; border:2px solid #64b5f6; border-radius:14px; padding:6px 14px; font:600 17px system-ui,sans-serif; text-align:center; z-index:25; pointer-events:none; transition:opacity .3s; opacity:0; }
#engSub small { display:block; font-size:13px; color:#bbdefb; font-weight:400; }
@media (max-height:500px) { #engSub { font-size:14px; bottom:calc(96px + env(safe-area-inset-bottom)); padding:4px 10px; } #engSub small { font-size:11px; } }
`;
let enabled = true, voice = null, sub = null, hideT = 0, store = null;
const queue = [], lastSaid = new Map();
let speaking = false;
const synth = () => window.speechSynthesis;

function pickVoice() {
  const vs = synth()?.getVoices() || [];
  const en = vs.filter(v => /^en[-_]/i.test(v.lang));
  voice = en.find(v => /en[-_]GB/i.test(v.lang) && /female|libby|sonia|serena|google uk english female/i.test(v.name))
    || en.find(v => /google (uk|us) english/i.test(v.name)) || en.find(v => /en[-_](GB|US)/i.test(v.lang)) || en[0] || null;
}
export function initEnglish(s) {
  store = s; enabled = s.get('eng', true);
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  sub = document.createElement('div'); sub.id = 'engSub'; document.body.appendChild(sub);
  if (synth()) { pickVoice(); synth().onvoiceschanged = pickVoice; }
}
// 撳「開始」嗰下要喺使用者手勢入面行一次，手機先肯出聲
export function unlockSpeech() { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth()?.speak(u); } catch { } }
export const englishOn = () => enabled;
export function setEnglish(on) { enabled = on; store?.set('eng', on); if (!on) { queue.length = 0; synth()?.cancel(); speaking = false; showSub(null); } }

function showSub(item) {
  if (!sub) return;
  clearTimeout(hideT);
  if (!item) { sub.style.opacity = 0; return; }
  sub.innerHTML = ''; sub.append('🔊 ' + item.en);
  if (item.zh) { const s = document.createElement('small'); s.textContent = item.zh; sub.appendChild(s); }
  sub.style.opacity = 1;
  hideT = setTimeout(() => sub.style.opacity = 0, Math.max(3000, item.en.length * 95));
}
function next() {
  if (speaking || !queue.length) return;
  const item = queue.shift(); speaking = true; showSub(item);
  const done = () => { speaking = false; setTimeout(next, 250); };
  if (!synth()) { setTimeout(done, Math.max(1500, item.en.length * 70)); return; }
  try {
    const u = new SpeechSynthesisUtterance(item.en);
    if (voice) u.voice = voice; u.lang = voice?.lang || 'en-GB'; u.rate = item.rate || 0.88; u.pitch = 1.05;
    u.onend = done; u.onerror = done;
    synth().speak(u);
    setTimeout(() => { if (speaking && !synth().speaking) done(); }, Math.max(4000, item.en.length * 120));
  } catch { done(); }
}
// say('This is a taxi.', '呢架係的士。')；同一句 25 秒內唔會重複講（force 就照講）
export function say(en, zh = '', opt = {}) {
  if (!enabled || !en) return;
  const now = performance.now(), key = opt.key || en;
  if (!opt.force && now - (lastSaid.get(key) || -1e9) < (opt.gap ?? 25000)) return;
  lastSaid.set(key, now);
  if (opt.now) { queue.length = 0; synth()?.cancel(); speaking = false; }
  if (queue.length > 2) queue.splice(0, queue.length - 2);
  queue.push({ en, zh, rate: opt.rate });
  next();
}

// ---------- 常用詞彙 ----------
export const VEH = {
  bike: ['This is a motorbike. Remember to wear a helmet!', '呢架係電單車（motorbike），記得戴頭盔！'],
  plane: ['This is a small plane. Push the throttle to take off!', '呢架係小型飛機（plane），加油門就可以起飛！'],
  heli: ['This is a helicopter. The rotor on top goes round and round.', '呢架係直升機（helicopter），頂頭個螺旋槳會一直轉。'],
  jumbo: ['This is a jumbo jet. It can carry four hundred passengers.', '呢架係巨無霸客機（jumbo jet），可以載四百個乘客。'],
  fighter: ['This is a fighter jet. It can fly faster than sound!', '呢架係戰鬥機（fighter jet），飛得比聲音仲快！'],
  taxi: ['This is a taxi. Where would you like to go?', '呢架係的士（taxi），你想去邊度？'],
  minibus: ['This is a minibus. It has sixteen seats.', '呢架係小巴（minibus），有十六個座位。'],
  bus: ['This is a double-decker bus. Let us sit on the upper deck!', '呢架係雙層巴士（double-decker bus），一齊坐上層！'],
  boat: ['This is a tour boat. Welcome aboard! Sit down and enjoy the view.', '呢隻係觀光船（tour boat），歡迎上船！坐低慢慢欣賞風景。'],
  mtr: ['This is the M T R. Please mind the gap between the train and the platform.', '呢架係港鐵（MTR），請小心月台空隙。'],
  sky: ['This is the sky train. It runs high above the road.', '呢架係空中輕軌（sky train），喺馬路上面高高咁行。'],
  mech: ['This is a giant robot! Press jump to fly with your jet pack.', '呢部係巨型機甲（giant robot），撳跳就可以噴射飛起！'],
  camper: ['This is a camper van. You can sleep and cook inside.', '呢架係露營車（camper van），入面可以瞓覺同煮嘢食。'],
  fire: ['This is a fire engine. Nee naw, nee naw!', '呢架係消防車（fire engine）。'],
  police: ['This is a police car. The police officer is chasing a thief!', '呢架係警車（police car），警察追緊個賊！'],
};
export const ITEM = {
  ext: ['This is a fire extinguisher. Use it to put out fires.', '呢個係滅火筒（fire extinguisher），用嚟救火。'],
  phone: ['This is a mobile phone.', '呢部係手機（mobile phone）。'],
  router: ['This is a router. It gives us Wi-Fi.', '呢部係路由器（router），有 Wi-Fi 用。'],
  gold: ['This is a gold bar. It is very valuable!', '呢條係金條（gold bar），好值錢㗎！'],
  silver: ['This is a silver bar.', '呢條係銀條（silver bar）。'],
};
export const PET_EN = {
  shiba: 'Shiba Inu', akita: 'Akita', golden: 'Golden Retriever', labY: 'yellow Labrador', labB: 'black Labrador', husky: 'Siberian Husky', malamute: 'Alaskan Malamute',
  samoyed: 'Samoyed', corgi: 'Corgi', chihuahua: 'Chihuahua', poodle: 'Poodle', poodleW: 'white toy Poodle', chow: 'Chow Chow', gsd: 'German Shepherd', border: 'Border Collie',
  dalmatian: 'Dalmatian', tong: 'local Hong Kong dog', frenchie: 'French Bulldog', bulldog: 'English Bulldog', bichon: 'Bichon Frise', schnauzer: 'Schnauzer', dachshund: 'Dachshund',
  doberman: 'Doberman', pom: 'Pomeranian', pug: 'Pug', shihtzu: 'Shih Tzu', yorkie: 'Yorkshire Terrier', maltese: 'Maltese', beagle: 'Beagle', greatdane: 'Great Dane',
  stbernard: 'Saint Bernard', rottweiler: 'Rottweiler', sharpei: 'Shar Pei', sheltie: 'Shetland Sheepdog', papillon: 'Papillon', greyhound: 'Greyhound', shepherdW: 'White Swiss Shepherd',
  catOrange: 'orange tabby cat', catBlack: 'black cat', catBritish: 'British Shorthair cat', catSiamese: 'Siamese cat', catPersian: 'Persian cat',
  lion: 'lion', lioness: 'lioness', tiger: 'tiger', tigerW: 'white tiger', leopard: 'leopard', cheetah: 'cheetah', panther: 'black panther', gorilla: 'gorilla', orangutan: 'orangutan',
  chimp: 'chimpanzee', elephant: 'elephant', giraffe: 'giraffe', zebra: 'zebra', rhino: 'rhinoceros', hippo: 'hippopotamus', bearB: 'brown bear', bearP: 'polar bear', panda: 'giant panda',
  wolf: 'wolf', fox: 'fox', deer: 'deer', kangaroo: 'kangaroo', camel: 'camel', crocodile: 'crocodile', dino: 'Triceratops dinosaur', horse: 'horse', pony: 'pony', cow: 'cow', pig: 'pig',
  sheep: 'sheep', goat: 'goat', donkey: 'donkey', rabbit: 'rabbit', hamster: 'hamster', turtle: 'turtle',
};
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function numWords(n) {
  n = Math.round(n); if (n < 0) return 'minus ' + numWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numWords(n % 100) : '');
  if (n < 1e6) return numWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? (n % 1000 < 100 ? ' and ' : ' ') + numWords(n % 1000) : '');
  return String(n);
}
const a = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
export const article = a;
