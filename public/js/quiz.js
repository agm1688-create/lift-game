// 英文小測（香港小學二年級程度）
// 每玩 5 分鐘：英文文法 MC（A / B / C），要連續答啱 2 條先可以繼續；答錯就要再答多一條
// 文法過關後 3 分鐘：英文生字 MC（睇英文揀中文意思），答錯唔罰，答啱為止
export const GRAMMAR_EVERY = 3 * 60, VOCAB_AFTER = 3 * 60, NEED = 2;
// [題目, [A, B, C], 正確答案 index, 提示]
const G = [
  // 單數 / 眾數
  ['I have two ___.', ['cat', 'cats', 'a cat'], 1, '兩隻或以上要用眾數，加 s：cats'],
  ['There are three ___ on the table.', ['box', 'boxs', 'boxes'], 2, 'box 嘅眾數係加 es：boxes'],
  ['She has five ___.', ['bus', 'buses', 'buss'], 1, 'bus 尾係 s，眾數加 es：buses'],
  ['Look at the two ___!', ['babies', 'babys', 'baby'], 0, '子音 + y 結尾：去 y 加 ies'],
  ['I can see many ___ in the sky.', ['bird', 'a bird', 'birds'], 2, 'many 後面要用眾數'],
  ['He eats an ___ every day.', ['apple', 'apples', 'banana'], 0, 'an 後面接單數，母音開頭：an apple'],
  // a / an / the
  ['I have ___ egg.', ['a', 'an', 'the'], 1, 'egg 係母音 e 開頭，用 an'],
  ['She has ___ umbrella.', ['a', 'an', 'two'], 1, 'umbrella 係母音 u 開頭，用 an'],
  ['This is ___ book.', ['a', 'an', 'some'], 0, 'book 係子音 b 開頭，用 a'],
  ['Look at ___ sun! It is so bright.', ['a', 'an', 'the'], 2, '世界上只有一個太陽，用 the'],
  ['I want ___ orange, please.', ['a', 'an', 'these'], 1, 'orange 係母音 o 開頭，用 an'],
  ['My dad drives ___ bus.', ['a', 'an', 'those'], 0, 'bus 係子音開頭，用 a'],
  // 代名詞
  ['Tom is my friend. ___ is eight.', ['She', 'He', 'They'], 1, 'Tom 係男仔，用 He'],
  ['Mary and I are sisters. ___ like dancing.', ['We', 'They', 'She'], 0, 'Mary and I = We'],
  ['This is my mum. ___ is a teacher.', ['He', 'It', 'She'], 2, 'mum 係女性，用 She'],
  ['I have a dog. ___ is brown.', ['It', 'He', 'They'], 0, '動物 / 物件用 It'],
  ['Peter and Sam are my friends. I like ___.', ['they', 'them', 'their'], 1, '放喺動詞後面用 them'],
  ['Please help ___. I can\'t open the door.', ['I', 'me', 'my'], 1, '放喺 help 後面用 me'],
  // 擁有格
  ['This is ___ bag.', ['Tom', 'Toms', "Tom's"], 2, "表示「Tom 嘅」：Tom's"],
  ['That is ___ pencil. (May)', ["May's", 'Mays', 'May'], 0, "May 嘅鉛筆：May's pencil"],
  ['This is ___ room. (my sister)', ["my sisters", "my sister's", 'my sister'], 1, "my sister's room = 我家姐嘅房"],
  ['I love ___ cat. It is very cute.', ['my', 'me', 'I'], 0, '「我嘅」用 my'],
  // this / that / these / those
  ['___ is my pencil. (近、一枝)', ['This', 'These', 'Those'], 0, '近、一個：This'],
  ['___ are my shoes. (近、幾對)', ['This', 'These', 'That'], 1, '近、眾數：These'],
  ['Look at ___ birds in the tree. (遠、幾隻)', ['this', 'that', 'those'], 2, '遠、眾數：those'],
  ['___ is a big plane in the sky. (遠、一架)', ['That', 'These', 'Those'], 0, '遠、一個：That'],
  // some / any
  ['I have ___ sweets.', ['any', 'some', 'a'], 1, '肯定句用 some'],
  ['Do you have ___ pencils?', ['any', 'a', 'an'], 0, '問句用 any'],
  ["I don't have ___ money.", ['some', 'any', 'a'], 1, '否定句用 any'],
  ['There is ___ milk in the bottle.', ['some', 'any', 'an'], 0, '肯定句用 some'],
  // 介詞
  ['The cat is ___ the box. (喺盒入面)', ['on', 'in', 'under'], 1, '入面：in'],
  ['The book is ___ the table. (喺枱面)', ['on', 'in', 'under'], 0, '上面：on'],
  ['The ball is ___ the chair. (喺櫈下面)', ['on', 'in', 'under'], 2, '下面：under'],
  ['I get up ___ seven o\'clock.', ['in', 'on', 'at'], 2, '時間點用 at'],
  ['My birthday is ___ May.', ['at', 'in', 'on'], 1, '月份用 in'],
  ['We go to church ___ Sunday.', ['on', 'in', 'at'], 0, '星期幾用 on'],
  ['The shop is ___ the bank and the school.', ['between', 'under', 'in'], 0, '喺兩樣嘢中間：between'],
  ['The dog is ___ the tree. (喺樹後面)', ['in front of', 'behind', 'on'], 1, '後面：behind'],
  // 形容詞
  ['It is a ___ dog.', ['small brown', 'brown small', 'smalls brown'], 0, '大細先，顏色後：small brown'],
  ['The elephant is very ___.', ['big', 'bigly', 'bigs'], 0, '形容詞：big'],
  ['I have a ___ ball.', ['red', 'reds', 'redly'], 0, '形容詞放名詞前面，唔加 s'],
  // 簡單現在式 + 主謂一致
  ['He ___ football every day.', ['play', 'plays', 'playing'], 1, 'He / She / It 後面動詞加 s'],
  ['They ___ to school by bus.', ['go', 'goes', 'going'], 0, 'They 後面動詞唔加 s'],
  ['My sister ___ pandas.', ['like', 'likes', 'liking'], 1, 'My sister = She，加 s'],
  ['My brother and his friend ___ football.', ['plays', 'play', 'playing'], 1, '兩個人 = They，唔加 s'],
  ['She ___ TV after dinner.', ['watch', 'watches', 'watching'], 1, 'watch 尾係 ch，加 es'],
  ['The cat ___ milk.', ['drink', 'drinks', 'drinking'], 1, 'The cat = It，加 s'],
  ['I ___ a student.', ['am', 'is', 'are'], 0, 'I 用 am'],
  ['We ___ happy.', ['am', 'is', 'are'], 2, 'We 用 are'],
  ['It ___ a sunny day.', ['am', 'is', 'are'], 1, 'It 用 is'],
  ['Tom ___ a new bike.', ['have', 'has', 'haves'], 1, 'He / Tom 用 has'],
  // 現在進行式
  ['Look! The boy ___ running.', ['is', 'are', 'am'], 0, 'Look 即係而家：is + running'],
  ['They are ___ now.', ['swim', 'swimming', 'swims'], 1, '現在進行式：are + swimming'],
  ['I am ___ a book now.', ['read', 'reads', 'reading'], 2, 'am + reading（-ing）'],
  ['She ___ singing a song now.', ['is', 'are', 'do'], 0, 'She + is + singing'],
  ['I play badminton every Sunday. / I ___ badminton now.', ['play', 'am playing', 'played'], 1, 'now 用現在進行式'],
  // 簡單過去式
  ['Yesterday I ___ to the park.', ['go', 'goes', 'went'], 2, 'yesterday 用過去式：go → went'],
  ['Last Sunday, we ___ cake.', ['eat', 'ate', 'eats'], 1, 'last Sunday 用過去式：eat → ate'],
  ['I ___ happy yesterday.', ['am', 'was', 'were'], 1, 'I 嘅過去式用 was'],
  ['They ___ at home last night.', ['was', 'were', 'is'], 1, 'They 嘅過去式用 were'],
  ['He ___ football yesterday.', ['play', 'played', 'plays'], 1, '規則動詞過去式加 ed'],
  ['We ___ a film last week.', ['watched', 'watch', 'watches'], 0, 'last week 用過去式：watched'],
  ['Last Sunday, I ___ my grandma.', ['visit', 'visited', 'visits'], 1, '過去式：visited'],
  // Wh- 問句 / Yes-No 問句
  ['___ is your name? My name is Ann.', ['What', 'Where', 'Who'], 0, '問名用 What'],
  ['___ do you live? I live in Tsuen Wan.', ['When', 'Where', 'Who'], 1, '問地方用 Where'],
  ['___ is that man? He is my uncle.', ['Who', 'What', 'How'], 0, '問人用 Who'],
  ['___ old are you? I am seven.', ['What', 'How', 'Where'], 1, '問年紀：How old'],
  ['___ is your birthday? It is in June.', ['When', 'Who', 'Where'], 0, '問時間用 When'],
  ['___ you like ice cream? Yes, I do.', ['Do', 'Does', 'Are'], 0, 'You 問句用 Do'],
  ['___ he like apples? No, he doesn\'t.', ['Do', 'Does', 'Is'], 1, 'He 問句用 Does'],
  ['___ she your sister? Yes, she is.', ['Is', 'Are', 'Do'], 0, 'She + is → Is she ...?'],
  // 情態動詞
  ['You ___ cross the road at a red light.', ["must", "mustn't", 'can'], 1, '紅燈唔可以過馬路：mustn\'t'],
  ['You ___ wear a seat belt in the car.', ['must', "mustn't", 'are'], 0, '一定要：must'],
  ['I ___ swim. I learned last year.', ['can', "can't", 'am'], 0, '識得：can'],
  ['She ___ to do her homework now.', ['have', 'has', 'having'], 1, 'She 用 has to'],
  ['We ___ to go to school on Monday.', ['has', 'have', 'having'], 1, 'We 用 have to'],
  // 大階 / 標點
  ['Which sentence is correct?', ['my name is tom.', 'My name is Tom.', 'My name is tom'], 1, '句首大寫、名字大寫、句尾加 full stop'],
  ['Which sentence is correct?', ['What is your name?', 'what is your name.', 'What is your name.'], 0, '問句句尾用 question mark (?)'],
  ['Which sentence is correct?', ['I like hong kong.', 'I like Hong Kong.', 'i like Hong Kong.'], 1, '地方名同 I 都要大寫'],
];
// [英文, [A, B, C], 正確 index]
const V = [
  ['apple', ['蘋果', '香蕉', '橙'], 0], ['banana', ['西瓜', '香蕉', '葡萄'], 1], ['orange', ['橙', '梨', '芒果'], 0], ['grapes', ['士多啤梨', '提子', '菠蘿'], 1],
  ['watermelon', ['西瓜', '蜜瓜', '椰子'], 0], ['bread', ['麵包', '飯', '麵'], 0], ['rice', ['麵', '飯', '湯'], 1], ['noodles', ['餃子', '麵', '粥'], 1],
  ['egg', ['雞蛋', '雞', '魚'], 0], ['milk', ['水', '果汁', '牛奶'], 2], ['water', ['水', '茶', '汽水'], 0], ['juice', ['果汁', '咖啡', '牛奶'], 0],
  ['cat', ['狗', '貓', '兔仔'], 1], ['dog', ['狗', '馬', '豬'], 0], ['bird', ['魚', '雀仔', '蝴蝶'], 1], ['fish', ['魚', '蝦', '蟹'], 0],
  ['elephant', ['大笨象', '長頸鹿', '老虎'], 0], ['tiger', ['獅子', '老虎', '熊'], 1], ['monkey', ['猴子', '狐狸', '狼'], 0], ['rabbit', ['兔仔', '老鼠', '烏龜'], 0],
  ['panda', ['熊貓', '熊', '袋鼠'], 0], ['giraffe', ['斑馬', '長頸鹿', '駱駝'], 1], ['horse', ['牛', '馬', '羊'], 1], ['duck', ['鴨', '雞', '鵝'], 0],
  ['red', ['紅色', '藍色', '綠色'], 0], ['blue', ['黃色', '藍色', '紫色'], 1], ['green', ['綠色', '黑色', '白色'], 0], ['yellow', ['橙色', '黃色', '粉紅色'], 1],
  ['black', ['白色', '灰色', '黑色'], 2], ['white', ['白色', '黑色', '啡色'], 0], ['pink', ['粉紅色', '紫色', '紅色'], 0], ['brown', ['啡色', '灰色', '金色'], 0],
  ['school', ['醫院', '學校', '公園'], 1], ['teacher', ['老師', '醫生', '警察'], 0], ['student', ['學生', '老師', '司機'], 0], ['classroom', ['課室', '廚房', '睡房'], 0],
  ['book', ['書', '筆', '尺'], 0], ['pencil', ['擦膠', '鉛筆', '間尺'], 1], ['ruler', ['間尺', '剪刀', '膠水'], 0], ['rubber', ['擦膠', '鉛筆', '書包'], 0],
  ['schoolbag', ['書包', '手袋', '銀包'], 0], ['desk', ['書枱', '櫈', '床'], 0], ['chair', ['枱', '櫈', '門'], 1], ['door', ['窗', '門', '牆'], 1],
  ['window', ['窗', '門', '地板'], 0], ['bed', ['床', '梳化', '衣櫃'], 0], ['kitchen', ['廚房', '浴室', '客廳'], 0], ['bathroom', ['浴室', '睡房', '露台'], 0],
  ['father', ['爸爸', '媽媽', '哥哥'], 0], ['mother', ['婆婆', '媽媽', '姐姐'], 1], ['brother', ['兄弟', '姊妹', '叔叔'], 0], ['sister', ['姊妹', '兄弟', '姨媽'], 0],
  ['grandma', ['公公', '婆婆 / 嫲嫲', '姑姐'], 1], ['baby', ['嬰兒', '小朋友', '大人'], 0], ['friend', ['朋友', '鄰居', '同學'], 0], ['doctor', ['醫生', '護士', '老師'], 0],
  ['police officer', ['消防員', '警察', '司機'], 1], ['firefighter', ['消防員', '廚師', '郵差'], 0], ['driver', ['司機', '機師', '水手'], 0], ['cook', ['廚師', '侍應', '農夫'], 0],
  ['bus', ['巴士', '的士', '火車'], 0], ['taxi', ['的士', '小巴', '單車'], 0], ['train', ['火車', '飛機', '船'], 0], ['plane', ['飛機', '直升機', '火箭'], 0],
  ['bicycle', ['單車', '電單車', '私家車'], 0], ['boat', ['船', '車', '橋'], 0], ['lift', ['電梯', '樓梯', '扶手電梯'], 0], ['traffic light', ['交通燈', '街燈', '路牌'], 0],
  ['sun', ['太陽', '月亮', '星星'], 0], ['moon', ['星星', '月亮', '雲'], 1], ['star', ['星星', '太陽', '彩虹'], 0], ['rain', ['雨', '雪', '風'], 0],
  ['cloud', ['雲', '風', '雷'], 0], ['rainbow', ['彩虹', '閃電', '霧'], 0], ['hot', ['熱', '凍', '濕'], 0], ['cold', ['熱', '凍', '乾'], 1],
  ['big', ['大', '細', '長'], 0], ['small', ['大', '細', '高'], 1], ['tall', ['高', '矮', '肥'], 0], ['short', ['長', '矮 / 短', '闊'], 1],
  ['happy', ['開心', '傷心', '嬲'], 0], ['sad', ['開心', '傷心', '驚'], 1], ['angry', ['嬲', '攰', '餓'], 0], ['hungry', ['口渴', '肚餓', '眼瞓'], 1],
  ['eye', ['眼', '耳', '口'], 0], ['ear', ['鼻', '耳', '頭'], 1], ['mouth', ['口', '手', '腳'], 0], ['hand', ['手', '腳', '頸'], 0],
  ['run', ['跑', '跳', '游水'], 0], ['jump', ['行', '跳', '坐'], 1], ['swim', ['游水', '跑步', '唱歌'], 0], ['sing', ['跳舞', '唱歌', '畫畫'], 1],
  ['read', ['讀 / 閱讀', '寫', '聽'], 0], ['write', ['寫', '讀', '講'], 0], ['sleep', ['瞓覺', '食飯', '沖涼'], 0], ['play', ['玩', '做功課', '溫書'], 0],
  ['Monday', ['星期一', '星期二', '星期日'], 0], ['Sunday', ['星期六', '星期日', '星期五'], 1], ['morning', ['朝早', '下晝', '夜晚'], 0], ['night', ['朝早', '中午', '夜晚'], 2],
];
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
#quizModal .say { margin-left:6px; background:#ede7f6; border:0; border-radius:10px; padding:4px 10px; cursor:pointer; font-size:16px; }
@media (max-height:500px) { #quizModal .q { font-size:19px; margin:6px 0; } #quizModal .ops button { padding:7px 10px; font-size:17px; } #quizModal h2 { font-size:18px; } }
`;
const pick = a => a[Math.floor(Math.random() * a.length)];
const LET = ['A', 'B', 'C'];

export function buildQuiz(api) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'quizModal'; document.body.appendChild(el);
  const S = Object.assign({ played: 0, vocabIn: -1, mode: null, streak: 0, q: null }, api.store.get('quiz', {}));
  const save = () => api.store.set('quiz', S);
  let saveT = 0, lastIdx = -1, locked = false;
  const speakQ = q => api.say(q.mode === 'g' ? q.text.replace(/_{2,}/g, 'blank').replace(/\(.*?\)/g, '') : `What does ${q.text} mean?`, q.mode === 'g' ? '揀正確答案' : `「${q.text}」係咩意思？`, { force: true, now: true });
  function newQ(mode) {
    let i; do { i = Math.floor(Math.random() * (mode === 'g' ? G.length : V.length)); } while (i === lastIdx);
    lastIdx = i;
    if (mode === 'g') { const [text, ops, ans, tip] = G[i]; return { mode, text, ops, ans, tip }; }
    const [text, ops, ans] = V[i]; return { mode, text, ops, ans };
  }
  function open(mode) {
    S.mode = mode; S.streak = 0; S.q = newQ(mode); save();
    api.onOpen?.(); api.sfx.ding();
    render(''); el.style.display = 'flex';
    api.say(mode === 'g' ? 'English quiz time! Choose A, B or C.' : 'Word quiz! What does this word mean?', mode === 'g' ? '英文小測時間！揀 A、B 或 C。' : '生字小測！呢個英文字係咩意思？', { force: true, now: true });
    setTimeout(() => S.q && speakQ(S.q), 2200);
  }
  function render(msg, color = '#2e7d32', mark = null) {
    const q = S.q; if (!q) return;
    const g = q.mode === 'g';
    el.innerHTML = `<div class="qb"><h2>${g ? '📝 英文文法小測' : '🔤 英文生字小測'}</h2>
      <div class="sub">${g ? `要<b>連續答啱 ${NEED} 條</b>先可以繼續玩；答錯要再答多一條` : '睇英文，揀中文意思。答錯唔罰，答啱為止 😊'}</div>
      ${g ? `<div class="prog">連續答啱：${'⭐'.repeat(S.streak)}${'☆'.repeat(NEED - S.streak)}</div>` : ''}
      <div class="q">${g ? q.text.replace(/_{2,}/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>') : `「${q.text}」`}<button class="say" title="再聽一次">🔊</button></div>
      <div class="ops">${q.ops.map((o, i) => `<button data-i="${i}" class="${mark && mark[i] ? mark[i] : ''}"><b>${LET[i]}.</b>${o}</button>`).join('')}</div>
      <div class="msg" style="color:${color}">${msg}</div></div>`;
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => answer(+b.dataset.i));
    el.querySelector('.say').onclick = () => speakQ(q);
  }
  function answer(i) {
    const q = S.q; if (!q || locked) return;
    const ok = i === q.ans, mark = []; mark[i] = ok ? 'right' : 'wrong'; if (!ok && q.mode === 'g') mark[q.ans] = 'right';
    if (ok) { api.sfx.pickup(); api.onQuizOK?.(); } else api.sfx.error();
    if (q.mode === 'v') {
      if (!ok) { render(`❌ 唔係喎，再試吓！`, '#c62828', mark); api.say('Try again!', '再試吓！', { force: true, now: true }); return; }
      render(`✅ 啱咗！${q.text} = ${q.ops[q.ans]}`, '#2e7d32', mark);
      api.say(`Correct! ${q.text}.`, `啱咗！${q.text} = ${q.ops[q.ans]}`, { force: true, now: true });
      locked = true; setTimeout(() => { locked = false; close(); }, 1600);
      return;
    }
    if (ok) {
      S.streak++;
      if (S.streak >= NEED) { render(`🎉 連續答啱 ${NEED} 條！可以繼續玩喇`, '#2e7d32', mark); api.say('Excellent! You got two right in a row. Well done!', '好叻！連續答啱兩條！', { force: true, now: true }); locked = true; setTimeout(() => { locked = false; S.vocabIn = VOCAB_AFTER; close(); }, 1800); return; }
      render(`✅ 啱咗！再答多 ${NEED - S.streak} 條`, '#2e7d32', mark); api.say('Correct! One more question.', '啱咗！再答多一條。', { force: true, now: true });
    } else {
      S.streak = 0;
      render(`❌ 正確答案係 ${LET[q.ans]}. ${q.ops[q.ans]}　💡 ${q.tip}<br>再答多一條，要連續答啱 ${NEED} 條`, '#c62828', mark);
      api.say(`The answer is ${q.ops[q.ans]}. Let us try another one.`, `答案係 ${q.ops[q.ans]}，試多一條。`, { force: true, now: true });
    }
    locked = true;
    setTimeout(() => { locked = false; S.q = newQ('g'); save(); render(''); speakQ(S.q); }, ok ? 1300 : 3200);
    save();
  }
  function close() { el.style.display = 'none'; S.mode = null; S.q = null; S.played = S.played % GRAMMAR_EVERY; save(); }
  // 重新整理之後：仲喺小測就再彈出嚟
  function resume() { if (S.mode && S.q) { render(''); el.style.display = 'flex'; } }
  function update(dt, blocked) {
    if (S.mode) return;
    if (blocked) return;
    S.played += dt;
    if (S.vocabIn > 0) { S.vocabIn -= dt; if (S.vocabIn <= 0) { S.vocabIn = -1; open('v'); return; } }
    if (S.played >= GRAMMAR_EVERY) { S.played = 0; open('g'); return; }
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  }
  const left = () => Math.max(0, GRAMMAR_EVERY - S.played);
  return { update, resume, active: () => !!S.mode, open, left, state: S, G, V };
}
