// 題庫：香港（HK）同台灣（TW）小一至小六 —— 英文文法（en）、英文生字（vocab）、數學（math）
// makeQ(subject, level, region) -> { text, ops, ans, tip, say: { en, zh } }
export const LEVEL_NAMES = { HK: ['小一', '小二', '小三', '小四', '小五', '小六'], TW: ['一年級', '二年級', '三年級', '四年級', '五年級', '六年級'] };

// ---------- 英文文法 ----------
// [題目（___ = 空格）, '正確答案|錯誤1|錯誤2', 提示]
// 共用（兩地通用、冇英美串法分別）
const S_BE = [
  ['I ___ a boy.', 'am|is|are', 'I 用 am'],
  ['She ___ my friend.', 'is|am|are', 'She 用 is'],
  ['They ___ students.', 'are|is|am', 'They 用 are'],
  ['You ___ tall.', 'are|is|am', 'You 用 are'],
  ['It ___ a cat.', 'is|are|am', 'It 用 is'],
  ['We ___ in the classroom.', 'are|am|is', 'We 用 are'],
  ['He ___ seven years old.', 'is|are|am', 'He 用 is'],
  ['The apples ___ red.', 'are|is|am', 'apples 是多個，用 are'],
  ['My dog ___ very cute.', 'is|are|am', 'My dog = It，用 is'],
  ['Tom and Ann ___ my friends.', 'are|is|am', '兩個人 = They，用 are'],
  ['___ you happy? Yes, I am.', 'Are|Is|Am', 'you 的問句用 Are'],
  ['___ he a doctor? Yes, he is.', 'Is|Are|Am', 'he 的問句用 Is'],
];
const S_AAN = [
  ['I have ___ apple.', 'an|a|two', 'apple 母音 a 開頭，用 an'],
  ['This is ___ dog.', 'a|an|two', 'dog 子音 d 開頭，用 a'],
  ['It is ___ egg.', 'an|a|two', 'egg 母音 e 開頭，用 an'],
  ['He is ___ boy.', 'a|an|two', 'boy 子音 b 開頭，用 a'],
  ['I can see ___ elephant.', 'an|a|two', 'elephant 母音 e 開頭，用 an'],
  ['That is ___ bird.', 'a|an|two', 'bird 子音 b 開頭，用 a'],
  ['I want ___ ice cream.', 'an|a|two', 'ice 母音 i 開頭，用 an'],
  ['It is ___ pen.', 'a|an|two', 'pen 子音 p 開頭，用 a'],
  ['There is ___ owl in the tree.', 'an|a|two', 'owl 母音 o 開頭，用 an'],
  ['She is ___ girl.', 'a|an|two', 'girl 子音 g 開頭，用 a'],
  ['He has ___ orange.', 'an|a|two', 'orange 母音 o 開頭，用 an'],
];
const S_PC = [
  ['Look! The girl ___ dancing.', 'is|are|am', 'The girl = She，用 is + -ing'],
  ['The boys are ___ football now.', 'playing|play|plays', 'are + 動詞 -ing'],
  ['I am ___ my homework now.', 'doing|do|does', 'am + 動詞 -ing'],
  ['We ___ having lunch now.', 'are|is|am', 'We 用 are + -ing'],
  ['Listen! The baby is ___.', 'crying|cry|cries', 'is + 動詞 -ing'],
  ['He is ___ in the pool.', 'swimming|swiming|swims', 'swim 要重複 m：swimming'],
  ['She is ___ a letter.', 'writing|writeing|writes', 'write 去 e 加 ing'],
  ['What ___ you doing? I am reading.', 'are|is|do', 'you 用 are + -ing'],
  ['The dog is ___ after the ball.', 'running|runing|runs', 'run 要重複 n：running'],
  ['My grandpa is ___ dinner now.', 'cooking|cook|cooks', 'now：is + cooking'],
  ['Is it raining now? Yes, it ___.', 'is|does|are', 'Is it ...? → Yes, it is.'],
  ['They are not ___ TV now.', 'watching|watch|watches', 'are not + 動詞 -ing'],
];
const S_PAST_REG = [
  ['Yesterday I ___ my room.', 'cleaned|clean|cleans', 'yesterday 用過去式：加 ed'],
  ['We ___ football last Sunday.', 'played|play|plays', 'last Sunday 用過去式：played'],
  ['She ___ the door five minutes ago.', 'opened|open|opens', 'ago 用過去式：opened'],
  ['He ___ to music last night.', 'listened|listen|listens', 'last night 用過去式'],
  ['They ___ in the park yesterday.', 'walked|walk|walks', 'yesterday 用過去式：walked'],
  ['The frog ___ into the pond a minute ago.', 'jumped|jump|jumps', 'ago 用過去式：jumped'],
  ['My sister ___ a cake last week.', 'baked|bakeed|bakes', 'bake 字尾是 e，只加 d'],
  ['The baby ___ last night.', 'cried|cryed|cries', '子音 + y：去 y 加 ied'],
  ['He ___ the box last Monday.', 'carried|carryed|carries', 'carry → carried'],
  ['The car ___ at the red light yesterday.', 'stopped|stoped|stops', 'stop 要重複 p 再加 ed'],
  ['I ___ my grandparents last weekend.', 'visited|visit|visits', 'last weekend 用過去式'],
  ['She ___ for the bus yesterday.', 'waited|wait|waits', 'yesterday 用過去式：waited'],
];
const S_PAST_IRR = [
  ['I ___ a rainbow yesterday.', 'saw|seed|see', 'see 的過去式是 saw'],
  ['She ___ a new dress last week.', 'bought|buyed|buys', 'buy 的過去式是 bought'],
  ['We ___ to the beach last summer.', 'went|goed|go', 'go 的過去式是 went'],
  ['He ___ his homework last night.', 'did|doed|does', 'do 的過去式是 did'],
  ['They ___ ice cream yesterday.', 'ate|eated|eat', 'eat 的過去式是 ate'],
  ['I ___ a letter to my friend yesterday.', 'wrote|writed|write', 'write 的過去式是 wrote'],
  ['My dad ___ me a story last night.', 'told|telled|tells', 'tell 的過去式是 told'],
  ['The bell ___ at nine yesterday.', 'rang|ringed|rings', 'ring 的過去式是 rang'],
  ['She ___ a picture last Sunday.', 'drew|drawed|draws', 'draw 的過去式是 drew'],
  ['We ___ our bikes yesterday.', 'rode|rided|ride', 'ride 的過去式是 rode'],
  ['He ___ his keys last week.', 'lost|losed|loses', 'lose 的過去式是 lost'],
  ['I ___ a funny dream last night.', 'had|haved|have', 'have 的過去式是 had'],
  ['Ann ___ me a card last year.', 'gave|gived|gives', 'give 的過去式是 gave'],
];
const S_FUT = [
  ['Tomorrow I ___ visit my aunt.', 'will|was|did', 'tomorrow 用將來式 will'],
  ['Look at the dark clouds! It is going to ___.', 'rain|rains|rained', 'going to + 原形動詞'],
  ['We ___ going to have a picnic next Sunday.', 'are|is|will', 'We are going to ...'],
  ['She will ___ a song at the show.', 'sing|sings|sang', 'will + 原形動詞'],
  ['I think it ___ be sunny tomorrow.', 'will|is|was', 'tomorrow 用 will'],
  ['He is going ___ play basketball.', 'to|for|at', 'be going to + 動詞'],
  ['___ you come to my party tomorrow?', 'Will|Did|Are', '將來的問句用 Will you ...?'],
  ['Next year I ___ be ten.', 'will|am|was', 'next year 用 will'],
  ['My brother is going to ___ a model plane.', 'make|makes|made', 'going to + 原形動詞'],
  ["It's a holiday tomorrow. We ___ not go to school.", 'will|did|are', 'tomorrow 用 will not'],
];
const S_COMP = [
  ['An elephant is ___ than a dog.', 'bigger|biger|big', 'big 要重複 g 再加 er'],
  ['Tom is ___ than Sam.', 'taller|tall|more tall', '比較兩個：tall + er'],
  ['A plane is ___ than a car.', 'faster|fast|fastest', '比較兩樣用 -er + than'],
  ['My bag is ___ than your bag.', 'heavier|heavyer|heavy', 'y 變 i 再加 er'],
  ['This book is ___ than that one.', 'more interesting|interestinger|most interesting', '長的形容詞用 more'],
  ['Summer is ___ than winter.', 'hotter|hoter|hot', 'hot 要重複 t 再加 er'],
  ['A mouse is ___ than a cat.', 'smaller|small|more small', 'small + er'],
  ['Today is ___ than yesterday.', 'colder|cold|coldest', '比較兩天用 colder'],
  ['My sister is ___ than me.', 'younger|young|youngest', '比較兩個人：younger'],
  ['This test is ___ than the last one.', 'easier|easyer|more easy', 'easy → easier'],
  ['Your picture is ___ than mine.', 'better|gooder|more good', 'good 的比較級是 better'],
];
const S_WH = [
  ['___ is your teacher? Miss Lee is.', 'Who|What|Where', '問人用 Who'],
  ['___ is the cat? It is under the bed.', 'Where|Who|When', '問地方用 Where'],
  ['___ do you get up? At seven o\'clock.', 'When|Where|Who', '問時間用 When'],
  ['___ much is this pen? It is ten dollars.', 'How|What|Who', '問價錢用 How much'],
  ['___ many apples do you have? Three.', 'How|What|Which', '問數量用 How many'],
  ['___ are you sad? Because I lost my toy.', 'Why|What|Who', '答 Because，問句用 Why'],
  ['___ do you like, apples or bananas?', 'Which|Who|Where', '二選一用 Which'],
  ["___ time is it? It's three o'clock.", 'What|When|Who', '問幾點：What time'],
  ['___ do you go to school? By bus.', 'How|What|Who', '問方法用 How'],
  ["___ pencil is this? It is Ann's.", 'Whose|Who|Where', '問是誰的：Whose'],
  ['___ is your birthday? It is in May.', 'When|Where|Who', '問日子用 When'],
];
const S_PP = [
  ['I have ___ my homework.', 'finished|finish|finishing', 'have + 過去分詞'],
  ['She has ___ to Japan twice.', 'been|be|was', 'has been = 去過'],
  ['We have ___ here for five years.', 'lived|live|living', 'have + 過去分詞'],
  ['He ___ already eaten his lunch.', 'has|have|is', 'He 用 has + 過去分詞'],
  ['Have you ever ___ a panda?', 'seen|saw|see', 'see → saw → seen'],
  ['They have ___ this film before.', 'watched|watch|watching', 'have + 過去分詞'],
  ['I have known her ___ three years.', 'for|since|ago', '一段時間用 for'],
  ['He has lived here ___ 2019.', 'since|for|ago', '由某個時間開始用 since'],
  ['Have you finished your homework ___?', 'yet|already|ago', '問句尾用 yet'],
  ['I have ___ cleaned my room.', 'already|yet|ago', '已經：already'],
  ['She has ___ a new bike.', 'bought|buyed|buy', 'buy → bought → bought'],
];
const S_SUP = [
  ['Tom is the ___ boy in our class.', 'tallest|taller|tall', 'the + 最高級 -est'],
  ['This is the ___ day of the year.', 'hottest|hotest|hotter', 'hot → hottest'],
  ['The blue whale is the ___ animal in the world.', 'biggest|bigest|bigger', 'big → biggest'],
  ['This is the ___ book in the library.', 'most interesting|interestingest|more interesting', '長的形容詞用 the most'],
  ['She is the ___ runner in the school.', 'fastest|faster|fast', 'the + fastest'],
  ['It is the ___ film I have ever seen.', 'best|goodest|better', 'good → better → best'],
  ['This is the ___ question in the test.', 'easiest|easyest|easier', 'easy → easiest'],
  ['Who is the ___ person in your family?', 'oldest|older|old', 'the + oldest'],
  ['That was the ___ day of my life!', 'happiest|happyest|happier', 'happy → happiest'],
  ['This is the ___ way to go home.', 'shortest|shorter|short', 'the + shortest'],
];
const S_CONJ = [
  ['I was tired, ___ I went to bed early.', 'so|because|but', '結果用 so'],
  ["I like apples ___ I don't like pears.", 'but|so|because', '意思相反用 but'],
  ['He stayed at home ___ he was sick.', 'because|so|but', '原因用 because'],
  ['It was raining, ___ we took an umbrella.', 'so|because|or', '結果用 so'],
  ['She is small ___ she is very strong.', 'but|so|because', '意思相反用 but'],
  ['Do you want tea ___ milk?', 'or|so|because', '二選一用 or'],
  ['We were late ___ we missed the bus.', 'because|so|but', '原因用 because'],
  ['I am hungry, ___ I will eat a sandwich.', 'so|but|or', '結果用 so'],
  ['I have a cat ___ a dog.', 'and|because|so', '加上另一樣用 and'],
  ['Wash your hands ___ you eat.', 'before|because|so', '吃東西之前：before'],
  ['___ it was cold, he did not wear a coat.', 'Although|Because|So', '雖然：Although'],
];
const S_PASS = [
  ['The cake ___ made by my grandma.', 'was|were|did', '被動式：was + 過去分詞'],
  ['English ___ spoken in many countries.', 'is|are|does', 'English 用 is + 過去分詞'],
  ['The window was ___ by the ball.', 'broken|broke|break', 'break → broke → broken'],
  ['These photos were ___ by my uncle.', 'taken|took|take', 'take → took → taken'],
  ['The letters ___ sent yesterday.', 'were|was|are', '多封信 + 過去：were'],
  ['The classroom is ___ every day.', 'cleaned|clean|cleaning', 'is + 過去分詞 cleaned'],
  ['This song was ___ by a famous singer.', 'sung|sang|sing', 'sing → sang → sung'],
  ['The story was ___ by a young girl.', 'written|wrote|write', 'write → wrote → written'],
  ['Rice ___ grown in many places.', 'is|are|does', 'Rice 不可數，用 is'],
  ['The lost dog was found ___ a kind boy.', 'by|with|from', '被動式「被某人」用 by'],
];

// 香港各級
const HK1 = [...S_BE, ...S_AAN,
  ['___ is my bag. (近、一個)', 'This|These|Those', '近、一個：This'],
  ['___ is a bird. (遠、一隻)', 'That|These|Those', '遠、一個：That'],
  ['Look at ___ plane! It is far away.', 'that|this|these', '遠嘅嘢用 that'],
  ['___ is my pencil. It is in my hand.', 'This|That|Those', '喺手上（近）用 This'],
  ['I have three ___.', 'dogs|dog|a dog', '三隻要加 s：dogs'],
  ['There are two ___ on the desk.', 'books|book|a book', '兩本要加 s：books'],
  ['I can see four ___.', 'ducks|duck|a duck', '四隻要加 s：ducks'],
  ['She has two ___.', 'dolls|doll|a doll', '兩個要加 s：dolls'],
  ['One cat, two ___.', 'cats|cat|cates', '眾數加 s：cats'],
  ['One bus, two ___.', 'buses|buss|bus', 'bus 尾係 s，加 es'],
  ['The banana is ___.', 'yellow|blue|black', '香蕉係黃色：yellow'],
  ['The grass is ___.', 'green|pink|purple', '草係綠色：green'],
  ['The sky is ___.', 'blue|brown|orange', '天空係藍色：blue'],
  ['A panda is black and ___.', 'white|red|green', '熊貓係黑色同白色'],
  ['A cow says ___.', 'moo|woof|quack', '牛叫 moo'],
  ['A ___ can fly.', 'bird|fish|pig', '雀仔識飛'],
  ['A ___ lives in the sea.', 'fish|lion|cow', '魚住喺海入面'],
  ['The elephant is ___.', 'big|small|short', '大笨象好大：big'],
  ['My favourite colour is red. I like my ___ ball.', 'red|blue|green', '最鍾意紅色：red'],
  ['Hello! ___ name is Amy.', 'My|I|Me', '「我嘅」名字：My name'],
  ['___ are you? I am fine, thank you.', 'How|What|Who', '問好唔好：How are you?'],
  ['Good ___! (朝早)', 'morning|night|evening', '朝早講 Good morning'],
];
const HK2 = [
  ['I have two ___.', 'cats|cat|a cat', '兩隻或以上要用眾數，加 s：cats'],
  ['There are three ___ on the table.', 'boxes|box|boxs', 'box 嘅眾數係加 es：boxes'],
  ['She has five ___.', 'buses|bus|buss', 'bus 尾係 s，眾數加 es：buses'],
  ['Look at the two ___!', 'babies|babys|baby', '子音 + y 結尾：去 y 加 ies'],
  ['I can see many ___ in the sky.', 'birds|bird|a bird', 'many 後面要用眾數'],
  ['He eats an ___ every day.', 'apple|apples|banana', 'an 後面接單數，母音開頭：an apple'],
  ['I have ___ egg.', 'an|a|the', 'egg 係母音 e 開頭，用 an'],
  ['She has ___ umbrella.', 'an|a|two', 'umbrella 係母音 u 開頭，用 an'],
  ['This is ___ book.', 'a|an|some', 'book 係子音 b 開頭，用 a'],
  ['Look at ___ sun! It is so bright.', 'the|a|an', '世界上只有一個太陽，用 the'],
  ['I want ___ orange, please.', 'an|a|these', 'orange 係母音 o 開頭，用 an'],
  ['My dad drives ___ bus.', 'a|an|those', 'bus 係子音開頭，用 a'],
  ['Tom is my friend. ___ is eight.', 'He|She|They', 'Tom 係男仔，用 He'],
  ['Mary and I are sisters. ___ like dancing.', 'We|They|She', 'Mary and I = We'],
  ['This is my mum. ___ is a teacher.', 'She|He|It', 'mum 係女性，用 She'],
  ['I have a dog. ___ is brown.', 'It|He|They', '動物 / 物件用 It'],
  ['Peter and Sam are my friends. I like ___.', 'them|they|their', '放喺動詞後面用 them'],
  ["Please help ___. I can't open the door.", 'me|I|my', '放喺 help 後面用 me'],
  ['This is ___ bag.', "Tom's|Tom|Toms", "表示「Tom 嘅」：Tom's"],
  ['That is ___ pencil. (May)', "May's|Mays|May", "May 嘅鉛筆：May's pencil"],
  ['This is ___ room. (my sister)', "my sister's|my sisters|my sister", "my sister's room = 我家姐嘅房"],
  ['I love ___ cat. It is very cute.', 'my|me|I', '「我嘅」用 my'],
  ['___ is my pencil. (近、一枝)', 'This|These|Those', '近、一個：This'],
  ['___ are my shoes. (近、幾對)', 'These|This|That', '近、眾數：These'],
  ['Look at ___ birds in the tree. (遠、幾隻)', 'those|this|that', '遠、眾數：those'],
  ['___ is a big plane in the sky. (遠、一架)', 'That|These|Those', '遠、一個：That'],
  ['I have ___ sweets.', 'some|any|a', '肯定句用 some'],
  ['Do you have ___ pencils?', 'any|a|an', '問句用 any'],
  ["I don't have ___ money.", 'any|some|a', '否定句用 any'],
  ['There is ___ milk in the bottle.', 'some|any|an', '肯定句用 some'],
  ['The cat is ___ the box. (喺盒入面)', 'in|on|under', '入面：in'],
  ['The book is ___ the table. (喺枱面)', 'on|in|under', '上面：on'],
  ['The ball is ___ the chair. (喺櫈下面)', 'under|on|in', '下面：under'],
  ["I get up ___ seven o'clock.", 'at|in|on', '時間點用 at'],
  ['My birthday is ___ May.', 'in|at|on', '月份用 in'],
  ['We go to church ___ Sunday.', 'on|in|at', '星期幾用 on'],
  ['The shop is ___ the bank and the school.', 'between|under|in', '喺兩樣嘢中間：between'],
  ['The dog is ___ the tree. (喺樹後面)', 'behind|in front of|on', '後面：behind'],
  ['It is a ___ dog.', 'small brown|brown small|smalls brown', '大細先，顏色後：small brown'],
  ['The elephant is very ___.', 'big|bigly|bigs', '形容詞：big'],
  ['I have a ___ ball.', 'red|reds|redly', '形容詞放名詞前面，唔加 s'],
  ['He ___ football every day.', 'plays|play|playing', 'He / She / It 後面動詞加 s'],
  ['They ___ to school by bus.', 'go|goes|going', 'They 後面動詞唔加 s'],
  ['My sister ___ pandas.', 'likes|like|liking', 'My sister = She，加 s'],
  ['My brother and his friend ___ football.', 'play|plays|playing', '兩個人 = They，唔加 s'],
  ['She ___ TV after dinner.', 'watches|watch|watching', 'watch 尾係 ch，加 es'],
  ['The cat ___ milk.', 'drinks|drink|drinking', 'The cat = It，加 s'],
  ['I ___ a student.', 'am|is|are', 'I 用 am'],
  ['We ___ happy.', 'are|am|is', 'We 用 are'],
  ['It ___ a sunny day.', 'is|am|are', 'It 用 is'],
  ['Tom ___ a new bike.', 'has|have|haves', 'He / Tom 用 has'],
  ['Look! The boy ___ running.', 'is|are|am', 'Look 即係而家：is + running'],
  ['They are ___ now.', 'swimming|swim|swims', '現在進行式：are + swimming'],
  ['I am ___ a book now.', 'reading|read|reads', 'am + reading（-ing）'],
  ['She ___ singing a song now.', 'is|are|do', 'She + is + singing'],
  ['I play badminton every Sunday. / I ___ badminton now.', 'am playing|play|played', 'now 用現在進行式'],
  ['Yesterday I ___ to the park.', 'went|go|goes', 'yesterday 用過去式：go → went'],
  ['Last Sunday, we ___ cake.', 'ate|eat|eats', 'last Sunday 用過去式：eat → ate'],
  ['I ___ happy yesterday.', 'was|am|were', 'I 嘅過去式用 was'],
  ['They ___ at home last night.', 'were|was|is', 'They 嘅過去式用 were'],
  ['He ___ football yesterday.', 'played|play|plays', '規則動詞過去式加 ed'],
  ['We ___ a film last week.', 'watched|watch|watches', 'last week 用過去式：watched'],
  ['Last Sunday, I ___ my grandma.', 'visited|visit|visits', '過去式：visited'],
  ['___ is your name? My name is Ann.', 'What|Where|Who', '問名用 What'],
  ['___ do you live? I live in Tsuen Wan.', 'Where|When|Who', '問地方用 Where'],
  ['___ is that man? He is my uncle.', 'Who|What|How', '問人用 Who'],
  ['___ old are you? I am seven.', 'How|What|Where', '問年紀：How old'],
  ['___ is your birthday? It is in June.', 'When|Who|Where', '問時間用 When'],
  ['___ you like ice cream? Yes, I do.', 'Do|Does|Are', 'You 問句用 Do'],
  ["___ he like apples? No, he doesn't.", 'Does|Do|Is', 'He 問句用 Does'],
  ['___ she your sister? Yes, she is.', 'Is|Are|Do', 'She + is → Is she ...?'],
  ['You ___ cross the road at a red light.', "mustn't|must|can", "紅燈唔可以過馬路：mustn't"],
  ['You ___ wear a seat belt in the car.', "must|mustn't|are", '一定要：must'],
  ['I ___ swim. I learned last year.', "can|can't|am", '識得：can'],
  ['She ___ to do her homework now.', 'has|have|having', 'She 用 has to'],
  ['We ___ to go to school on Monday.', 'have|has|having', 'We 用 have to'],
  ['Which sentence is correct?', 'My name is Tom.|my name is tom.|My name is tom', '句首大寫、名字大寫、句尾加 full stop'],
  ['Which sentence is correct?', 'What is your name?|what is your name.|What is your name.', '問句句尾用 question mark (?)'],
  ['Which sentence is correct?', 'I like Hong Kong.|I like hong kong.|i like Hong Kong.', '地方名同 I 都要大寫'],
];
const HK3 = [...S_PC, ...S_PAST_REG, ...S_COMP, ...S_WH,
  ['Are there ___ eggs in the fridge?', 'any|some|a', '問句用 any'],
  ['I want ___ water, please.', 'some|any|a', '肯定句用 some'],
  ["There aren't ___ apples left.", 'any|some|a', '否定句用 any'],
  ['She has ___ new toys.', 'some|any|a', '肯定句用 some'],
  ['Is there ___ juice in the cup?', 'any|some|an', '問句用 any'],
  ["We don't have ___ homework today.", 'any|some|a', '否定句用 any'],
];
const HK4 = [...S_PAST_IRR, ...S_FUT,
  ['How ___ apples are there?', 'many|much|lot', '可數名詞用 many'],
  ['How ___ water do you drink?', 'much|many|lot', '不可數名詞用 much'],
  ["There isn't ___ milk left.", 'much|many|a', 'milk 不可數，用 much'],
  ['I have ___ friends.', 'many|much|a', 'friends 可數，用 many'],
  ['How ___ money do you have?', 'much|many|lot', 'money 不可數，用 much'],
  ['There are ___ books on the shelf.', 'many|much|a', 'books 可數，用 many'],
  ['I ___ brush my teeth before bed. (每晚都會)', 'always|never|sometimes', '每次都會：always'],
  ['He ___ eats carrots. He hates them. (從來唔)', 'never|always|usually', '從來唔：never'],
  ['She is ___ late for school. (間中)', 'sometimes|never|always', '間中：sometimes'],
  ['I usually ___ to school by bus.', 'go|goes|going', 'I 後面動詞唔加 s'],
  ['Which sentence is correct?', 'He always gets up early.|He gets always up early.|Always he gets up early.', '頻率副詞放喺主要動詞前面'],
  ['How ___ do you go swimming? Twice a week.', 'often|many|much', '問幾耐一次：How often'],
  ['I would like ___ bread, please.', 'some|a|an', 'bread 不可數，用 some'],
  ['There is ___ rice in the bowl.', 'some|a|many', 'rice 不可數，用 some'],
  ['Which word is uncountable?', 'water|apple|egg', '水數唔到，係不可數名詞'],
  ['Which word is countable?', 'banana|milk|sugar', '香蕉可以一隻兩隻咁數'],
  ['I need two ___ of paper.', 'pieces|piece|papers', '紙用 pieces of paper 嚟數'],
];
const HK5 = [...S_PP, ...S_SUP, ...S_CONJ,
  ['You ___ brush your teeth every day.', "should|shouldn't|can't", '應該：should'],
  ['You ___ eat too many sweets.', "shouldn't|should|must", '唔應該：shouldn\'t'],
  ['You ___ stop at a red light.', "must|mustn't|may", '一定要：must'],
  ['We ___ talk loudly in the library.', "mustn't|must|should", '唔准：mustn\'t'],
  ['It is cold. You ___ wear a coat.', "should|shouldn't|mustn't", '凍就應該着外套'],
  ['Students ___ wear their uniform at school.', "must|mustn't|can't", '校規：must'],
  ['The boy ___ is singing is my brother.', 'who|which|what', '講人用 who'],
  ['This is the book ___ I like best.', 'which|who|where', '講物件用 which'],
  ['I have a dog ___ can swim.', 'which|who|whose', '講動物用 which'],
  ['She is the teacher ___ teaches us music.', 'who|which|what', '講人用 who'],
  ['The cake ___ Mum made was yummy.', 'which|who|where', '講物件用 which'],
  ['Do you know the girl ___ lives next door?', 'who|which|what', '講人用 who'],
];
const HK6 = [...S_PASS,
  ['If it rains, we ___ stay at home.', 'will|would|are', 'If + 現在式，will + 動詞'],
  ['If you study hard, you ___ pass the test.', 'will|did|were', 'If + 現在式，will + 動詞'],
  ['If she ___ early, she will catch the bus.', 'leaves|will leave|left', 'If 句子用現在式'],
  ['I will be happy if you ___ to my party.', 'come|will come|came', 'if 句子用現在式'],
  ['If I ___ time, I will help you.', 'have|will have|had', 'If 句子用現在式'],
  ['What will you do if it ___ sunny tomorrow?', 'is|will be|was', 'if 句子用現在式'],
  ["If we don't hurry, we ___ be late.", 'will|are|did', 'If + 現在式，will + 動詞'],
  ['Tom said, "I am hungry." → Tom said that he ___ hungry.', 'was|is|am', '轉述：am → was'],
  ['Mary said, "I like cats." → Mary said that she ___ cats.', 'liked|likes|like', '轉述：現在式變過去式'],
  ['He said, "I can swim." → He said that he ___ swim.', 'could|can|will', '轉述：can → could'],
  ['She said, "I will come." → She said that she ___ come.', 'would|will|can', '轉述：will → would'],
  ['Dad said, "I am tired." → Dad said that ___ was tired.', 'he|I|she', 'Dad 係男性，I 變 he'],
  ['Amy said, "My bag is red." → Amy said that ___ bag was red.', 'her|my|his', 'Amy 係女仔，my 變 her'],
  ['You are a student, ___?', "aren't you|are you|don't you", '肯定句 → 否定 tag'],
  ['She can swim, ___?', "can't she|can she|doesn't she", 'can → can\'t she'],
  ['He likes pizza, ___?', "doesn't he|does he|isn't he", 'likes → doesn\'t he'],
  ['They went home, ___?', "didn't they|did they|weren't they", '過去式 → didn\'t they'],
  ["It isn't cold, ___?", "is it|isn't it|does it", '否定句 → 肯定 tag'],
  ['We will win, ___?', "won't we|will we|don't we", "will → won't we"],
  ["You don't like milk, ___?", "do you|don't you|are you", '否定句 → 肯定 tag'],
  ['I enjoy ___ books.', 'reading|to read|read', 'enjoy + -ing'],
  ['She wants ___ a doctor.', 'to be|being|be', 'want + to + 動詞'],
  ['He finished ___ his homework.', 'doing|to do|do', 'finish + -ing'],
  ['We decided ___ to the zoo.', 'to go|going|go', 'decide + to + 動詞'],
  ['I am good at ___.', 'swimming|to swim|swim', '介詞 at 後面用 -ing'],
  ['They hope ___ the match.', 'to win|winning|win', 'hope + to + 動詞'],
  ['Do you mind ___ the window?', 'opening|to open|open', 'mind + -ing'],
  ['Thank you for ___ me.', 'helping|to help|help', '介詞 for 後面用 -ing'],
];

// 台灣各級（美式拼法；三年級正式開始，一、二年級很淺）
const TW1 = [
  ['Which is the capital letter of "b"?', 'B|D|P', '小寫 b 的大寫是 B'],
  ['Which is the small letter of "G"?', 'g|q|j', '大寫 G 的小寫是 g'],
  ['A, B, C, ___', 'D|E|F', '字母順序：A B C D'],
  ['Which letter comes after M?', 'N|L|O', 'M 後面是 N'],
  ['Which letter comes before F?', 'E|G|D', 'F 前面是 E'],
  ['Which is the capital letter of "a"?', 'A|E|O', '小寫 a 的大寫是 A'],
  ['Which is the small letter of "R"?', 'r|n|h', '大寫 R 的小寫是 r'],
  ['Which is the capital letter of "e"?', 'E|F|A', '小寫 e 的大寫是 E'],
  ['Which is the small letter of "D"?', 'd|b|p', '大寫 D 的小寫是 d'],
  ['Which is the capital letter of "q"?', 'Q|O|G', '小寫 q 的大寫是 Q'],
  ['X, Y, ___', 'Z|W|V', '最後三個字母：X Y Z'],
  ['How many letters are there in the English alphabet?', '26|24|20', '英文字母一共有 26 個'],
  ['"cat" starts with ___.', 'c|d|b', 'cat 第一個字母是 c'],
  ['"dog" starts with ___.', 'd|b|g', 'dog 第一個字母是 d'],
  ['"bag" starts with ___.', 'b|d|p', 'bag 第一個字母是 b'],
  ['"fish" starts with ___.', 'f|v|s', 'fish 第一個字母是 f'],
  ['"sun" starts with ___.', 's|z|t', 'sun 第一個字母是 s'],
  ['"pig" starts with ___.', 'p|b|q', 'pig 第一個字母是 p'],
  ['"hat" starts with ___.', 'h|n|a', 'hat 第一個字母是 h'],
  ['"map" starts with ___.', 'm|n|w', 'map 第一個字母是 m'],
  ['"ten" starts with ___.', 't|d|f', 'ten 第一個字母是 t'],
  ['"egg" starts with ___.', 'e|a|i', 'egg 第一個字母是 e'],
  ['"red" starts with ___.', 'r|l|w', 'red 第一個字母是 r'],
  ['Which word starts with "b"?', 'ball|doll|pen', 'ball 是 b 開頭'],
  ['Which word starts with "m"?', 'moon|noon|soon', 'moon 是 m 開頭'],
  ['Which word starts with "s"?', 'six|fix|mix', 'six 是 s 開頭'],
  ['Which word rhymes with "cat"?', 'hat|dog|cup', 'cat 和 hat 都有 -at'],
  ['Which word rhymes with "pen"?', 'ten|pin|pan', 'pen 和 ten 都有 -en'],
  ['Hello! I ___ Amy.', 'am|is|are', 'I 用 am'],
  ['Good ___! (早安)', 'morning|night|bye', '早安：Good morning'],
  ['___ you! (謝謝)', 'Thank|Thanks|Think', '謝謝：Thank you'],
];
const TW2 = [
  ["What's this? It's a ___. (一隻貓)", 'cat|dog|pig', '貓：cat'],
  ["What's this? It's a ___. (一本書)", 'book|bag|pen', '書：book'],
  ["What's this? It's an ___. (一顆蘋果)", 'apple|egg|ink', '蘋果：apple'],
  ["What's this? It's a ___. (一支鉛筆)", 'pencil|ruler|eraser', '鉛筆：pencil'],
  ["What's this? It's a ___. (一隻鳥)", 'bird|fish|frog', '鳥：bird'],
  ["What's this? It's a ___. (一顆球)", 'ball|box|bed', '球：ball'],
  ["What's this? It's an ___. (一把雨傘)", 'umbrella|apple|egg', '雨傘：umbrella'],
  ["What color is it? It's ___. (紅色)", 'red|blue|green', '紅色：red'],
  ["What color is it? It's ___. (黃色)", 'yellow|purple|white', '黃色：yellow'],
  ["What color is the sky? It's ___.", 'blue|black|pink', '天空是藍色：blue'],
  ['How many? ___. (3)', 'Three|Two|Five', '3 = three'],
  ['How many cats? ___ cats. (5)', 'Five|Four|Nine', '5 = five'],
  ['one, two, ___', 'three|four|five', '1、2、3：three'],
  ['six, seven, ___', 'eight|nine|ten', '6、7、8：eight'],
  ["___ are you? I'm fine, thank you.", 'How|What|Who', '問好：How are you?'],
  ["What's your name? ___ name is Ben.", 'My|I|Me', '我的名字：My name'],
  ['Nice to ___ you.', 'meet|eat|sit', '很高興認識你：Nice to meet you'],
  ['Good ___! (晚安)', 'night|morning|day', '晚安：Good night'],
  ['Stand ___. (起立)', 'up|down|in', '起立：Stand up'],
  ['Sit ___. (坐下)', 'down|up|on', '坐下：Sit down'],
  ['Open your ___. (打開你的書)', 'book|desk|ruler', '書：book'],
  ['I ___ a boy.', 'am|is|are', 'I 用 am'],
  ['She ___ a girl.', 'is|am|are', 'She 用 is'],
  ['This is my ___. (媽媽)', 'mom|dad|sister', '媽媽：mom'],
  ['This is my ___. (爸爸)', 'dad|mom|brother', '爸爸：dad'],
  ['I like ___. (狗)', 'dogs|cats|birds', '狗：dogs'],
  ['Which word is a color?', 'green|apple|seven', 'green 是綠色'],
  ['Which word is a number?', 'nine|nice|nose', 'nine 是 9'],
  ['Which word is an animal?', 'tiger|table|teacher', 'tiger 是老虎'],
  ['Goodbye! See you ___!', 'tomorrow|yesterday|now', '明天見：See you tomorrow'],
];
const TW3 = [...S_BE, ...S_AAN,
  ['___ is my bag. (近、一個)', 'This|These|Those', '近的、一個：This'],
  ['___ are my pencils. (近、很多枝)', 'These|This|That', '近的、很多個：These'],
  ['___ is a tree. (遠、一棵)', 'That|Those|These', '遠的、一個：That'],
  ['___ are birds. (遠、很多隻)', 'Those|That|This', '遠的、很多個：Those'],
  ['These ___ my books.', 'are|is|am', 'These 用 are'],
  ['This ___ my cat.', 'is|are|am', 'This 用 is'],
  ['I like ___. (香蕉)', 'bananas|banana|a bananas', '說喜歡某種東西用複數：bananas'],
  ['I ___ apples.', 'like|likes|liking', 'I 後面用 like'],
  ['Do you like cats? Yes, I ___.', 'do|am|does', 'Do you ...? → Yes, I do.'],
  ["Do you like milk? No, I ___.", "don't|doesn't|am not", "Do you ...? → No, I don't."],
  ['What do you like? I ___ ice cream.', 'like|likes|am', 'I like ...'],
  ['10 + 10 = ___', 'twenty|twelve|two', '20 = twenty'],
  ['How do you say 15?', 'fifteen|fifty|five', '15 = fifteen'],
  ['How do you say 40?', 'forty|fourteen|fourty', '40 = forty（沒有 u）'],
  ['How do you say 100?', 'one hundred|ten|one thousand', '100 = one hundred'],
  ['How do you say 13?', 'thirteen|thirty|three', '13 = thirteen'],
  ['How do you say 72?', 'seventy-two|seventeen-two|seven-two', '72 = seventy-two'],
  ['How many legs does a dog have? It has ___ legs.', 'four|two|six', '狗有四條腿：four'],
  ['How old are you? I am ___. (九歲)', 'nine|five|ten', '9 = nine'],
];
const TW4 = [...S_PC, ...S_WH,
  ['I ___ swim. (會)', 'can|cans|am', '會：can'],
  ['She can ___ the piano.', 'play|plays|playing', 'can + 原形動詞'],
  ['Can you ride a bike? Yes, I ___.', 'can|do|am', 'Can you ...? → Yes, I can.'],
  ["Birds can fly, but fish ___.", "can't|can|isn't", '魚不會飛：can\'t'],
  ['___ he dance? Yes, he can.', 'Can|Does|Is', '回答 he can，問句用 Can'],
  ['A penguin ___ fly.', "can't|can|cans", '企鵝不會飛：can\'t'],
  ['There ___ a cat on the bed.', 'is|are|am', '一隻：There is'],
  ['There ___ three books on the desk.', 'are|is|am', '很多本：There are'],
  ['There ___ some milk in the glass.', 'is|are|am', 'milk 不可數，用 is'],
  ['___ there any pens in your bag? Yes, there are.', 'Are|Is|Do', '回答 there are，問句用 Are'],
  ['Is there a park near your home? Yes, there ___.', 'is|are|has', 'Is there ...? → Yes, there is.'],
  ['There are five ___ in the zoo.', 'monkeys|monkey|monkies', 'monkey 是母音 + y，直接加 s'],
];
const TW5 = [...S_PAST_REG, ...S_PAST_IRR, ...S_FUT, ...S_COMP];
const TW6 = [...S_PP, ...S_SUP, ...S_CONJ, ...S_PASS];
const EN = { HK: [HK1, HK2, HK3, HK4, HK5, HK6], TW: [TW1, TW2, TW3, TW4, TW5, TW6] };

// ---------- 英文生字 ----------
// 每級幾組主題（同組嘅意思做錯誤選項）：'英文=中文,英文=中文,...'
const VOC = {
  HK: [
    ['apple=蘋果,banana=香蕉,orange=橙,grapes=提子,pear=梨', 'cat=貓,dog=狗,bird=雀仔,fish=魚,pig=豬,duck=鴨', 'red=紅色,blue=藍色,green=綠色,yellow=黃色,black=黑色,white=白色',
      'eye=眼,ear=耳仔,nose=鼻,mouth=口,hand=手', 'one=一,two=二,three=三,four=四,five=五,ten=十', 'mum=媽媽,dad=爸爸,brother=哥哥 / 弟弟,sister=家姐 / 妹妹,baby=BB / 嬰兒'],
    ['bread=麵包,rice=飯,noodles=麵,egg=雞蛋,milk=牛奶,juice=果汁,ice cream=雪糕', 'elephant=大笨象,tiger=老虎,monkey=馬騮,rabbit=兔仔,panda=熊貓,giraffe=長頸鹿',
      'pencil=鉛筆,rubber=擦膠,ruler=間尺,schoolbag=書包,desk=書枱,chair=櫈', 'bus=巴士,taxi=的士,bicycle=單車,train=火車,plane=飛機,boat=船',
      'sun=太陽,moon=月亮,star=星星,rain=雨,cloud=雲', 'happy=開心,sad=傷心,angry=嬲,hungry=肚餓,tired=攰'],
    ['strawberry=士多啤梨,potato=薯仔,carrot=紅蘿蔔,tomato=番茄,sandwich=三文治,biscuit=餅乾', 'library=圖書館,hospital=醫院,supermarket=超級市場,post office=郵局,park=公園,playground=遊樂場',
      'doctor=醫生,nurse=護士,police officer=警察,firefighter=消防員,cook=廚師,postman=郵差', 'kitchen=廚房,bedroom=睡房,living room=客廳,bathroom=浴室,sofa=梳化,fridge=雪櫃',
      'Monday=星期一,Wednesday=星期三,Friday=星期五,Saturday=星期六,Sunday=星期日', 'football=足球,basketball=籃球,badminton=羽毛球,swimming=游水'],
    ['spring=春天,summer=夏天,autumn=秋天,winter=冬天,windy=大風,cloudy=多雲', 'drawing=畫畫,singing=唱歌,dancing=跳舞,cooking=煮嘢食,reading=閱讀,hiking=行山',
      'clean=乾淨,dirty=污糟,noisy=嘈,quiet=靜,heavy=重,light=輕', 'minibus=小巴,ferry=渡輪,tram=電車,lift=電梯,escalator=扶手電梯,traffic light=交通燈',
      'jacket=外套,sweater=冷衫,shorts=短褲,socks=襪,shoes=鞋,cap=帽', 'January=一月,March=三月,July=七月,October=十月,December=十二月'],
    ['recycle=循環再用,rubbish=垃圾,plastic=塑膠,pollution=污染,energy=能源', 'healthy=健康,exercise=運動,vegetables=蔬菜,fever=發燒,cough=咳',
      'passport=護照,airport=機場,hotel=酒店,luggage=行李,map=地圖,ticket=飛 / 車票', 'air conditioner=冷氣機,washing machine=洗衣機,microwave=微波爐,fan=風扇,television=電視',
      'borrow=借,return=還,invite=邀請,celebrate=慶祝,practise=練習,decide=決定', 'dangerous=危險,careful=小心,polite=有禮貌,brave=勇敢,excited=興奮'],
    ['experience=經驗,competition=比賽,volunteer=義工,community=社區,festival=節日', 'computer=電腦,internet=互聯網,password=密碼,website=網站,email=電郵',
      'nervous=緊張,proud=自豪,disappointed=失望,surprised=驚訝,confident=有信心', 'environment=環境,forest=森林,island=島,mountain=山,ocean=海洋,desert=沙漠',
      'protect=保護,improve=改善,prepare=準備,discover=發現,explain=解釋,imagine=想像', 'scientist=科學家,engineer=工程師,architect=建築師,pilot=機師,reporter=記者'],
  ],
  TW: [
    ['red=紅色,blue=藍色,green=綠色,yellow=黃色,white=白色', 'cat=貓,dog=狗,bird=鳥,fish=魚,pig=豬', 'one=一,two=二,three=三,four=四,five=五,six=六',
      'mom=媽媽,dad=爸爸,brother=哥哥 / 弟弟,sister=姊姊 / 妹妹,baby=嬰兒', 'eye=眼睛,ear=耳朵,nose=鼻子,mouth=嘴巴,hand=手', 'book=書,pen=筆,bag=書包,ball=球,cup=杯子'],
    ['apple=蘋果,banana=香蕉,orange=柳橙,grape=葡萄,lemon=檸檬', 'monkey=猴子,tiger=老虎,rabbit=兔子,elephant=大象,bear=熊,lion=獅子',
      'seven=七,eight=八,nine=九,ten=十,eleven=十一,twelve=十二', 'pencil=鉛筆,eraser=橡皮擦,ruler=尺,desk=書桌,chair=椅子',
      'happy=快樂的,sad=難過的,hot=熱的,cold=冷的', 'milk=牛奶,egg=蛋,rice=飯,water=水,cake=蛋糕'],
    ['strawberry=草莓,ice cream=冰淇淋,potato=馬鈴薯,hamburger=漢堡,noodles=麵,juice=果汁', 'bus=公車,taxi=計程車,bike=腳踏車,train=火車,car=汽車,airplane=飛機',
      'sunny=晴朗的,rainy=下雨的,cloudy=多雲的,windy=颳風的', 'head=頭,leg=腿,foot=腳,arm=手臂,face=臉',
      'Monday=星期一,Tuesday=星期二,Thursday=星期四,Saturday=星期六,Sunday=星期日', 'purple=紫色,pink=粉紅色,brown=咖啡色,gray=灰色,black=黑色'],
    ['school=學校,park=公園,library=圖書館,hospital=醫院,zoo=動物園,supermarket=超市', 'teacher=老師,doctor=醫生,nurse=護士,police officer=警察,farmer=農夫,cook=廚師',
      'kitchen=廚房,bedroom=臥室,living room=客廳,bathroom=浴室,sofa=沙發,refrigerator=冰箱', 'baseball=棒球,basketball=籃球,swimming=游泳,jump rope=跳繩,dodgeball=躲避球',
      'run=跑,jump=跳,sing=唱歌,dance=跳舞,draw=畫畫', 'morning=早上,afternoon=下午,evening=傍晚,night=晚上'],
    ['spring=春天,summer=夏天,fall=秋天,winter=冬天', 'jacket=夾克,sweater=毛衣,T-shirt=T恤,shorts=短褲,socks=襪子,shoes=鞋子',
      'birthday=生日,weekend=週末,vacation=假期,festival=節日,party=派對', 'tall=高的,short=矮的,heavy=重的,thin=瘦的,strong=強壯的,fast=快的',
      'January=一月,April=四月,August=八月,November=十一月,December=十二月', 'post office=郵局,bookstore=書店,convenience store=便利商店,MRT station=捷運站,department store=百貨公司'],
    ['recycle=回收,trash=垃圾,plastic=塑膠,pollution=污染,energy=能源', 'healthy=健康的,exercise=運動,vegetable=蔬菜,fever=發燒,cough=咳嗽',
      'passport=護照,airport=機場,hotel=飯店,map=地圖,ticket=票', 'air conditioner=冷氣機,washing machine=洗衣機,microwave=微波爐,fan=電風扇,TV=電視',
      'nervous=緊張的,proud=驕傲的,excited=興奮的,surprised=驚訝的,bored=無聊的', 'scientist=科學家,engineer=工程師,pilot=飛行員,reporter=記者,artist=藝術家',
      'borrow=借入,protect=保護,practice=練習,invite=邀請,celebrate=慶祝'],
  ],
};
// 拆成 [英文, 中文, 組別]
const VB = {};
for (const rg of ['HK', 'TW']) VB[rg] = VOC[rg].map(groups => groups.flatMap((g, gi) => g.split(',').map(p => { const [w, m] = p.split('='); return [w, m, gi]; })));

// ---------- 工具 ----------
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = n => String(Math.round(n * 100) / 100);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n, d) => { const g = gcd(n, d); return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; };
const T = (rg, hk, tw) => (rg === 'HK' ? hk : tw);
const money = (rg, n) => (rg === 'HK' ? `$${n}` : `${n} 元`);
function finish(text, correct, wrongs, tip, en, zh) {
  const ops = shuffle([correct, ...wrongs]);
  return { text, ops, ans: ops.indexOf(correct), tip, say: { en, zh } };
}
// 數學題：ans 同 wrongs 可以係數字或者字串；f 將數字變做選項文字；唔夠就用 ans±1、±2 補
function mq(rg, text, ans, wrongs, tip, en = '', f = fmt) {
  const c = typeof ans === 'number' ? f(ans) : ans, out = [];
  const add = w => {
    if (out.length >= 2 || w === undefined || w === null) return;
    if (typeof w === 'number' && (!isFinite(w) || w < 0)) return;
    const s = typeof w === 'number' ? f(w) : String(w);
    if (s && s !== c && !out.includes(s)) out.push(s);
  };
  shuffle(wrongs.slice()).forEach(add);
  if (typeof ans === 'number') { const st = Number.isInteger(ans) ? 1 : 0.1; for (const k of [1, -1, 2, -2, 3, 10]) add(Math.round((ans + k * st) * 100) / 100); }
  return finish(text, c, out, tip, en, zhRead(rg, text));
}
function zhRead(rg, t) {
  return t.replace(/(\d+)\/(\d+)/g, '$2分之$1').replace(/×/g, '乘').replace(/÷/g, '除以').replace(/ \+ /g, '加').replace(/ − /g, '減')
    .replace(/= \? (\S+)$/, T(rg, '等於幾多$1？', '等於多少$1？')).replace(/= \?/g, T(rg, '等於幾多？', '等於多少？'))
    .replace(/\$(\d+(\.\d+)?)/g, '$1 元').replace(/___/g, '空格');
}
const W = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by' };
const enArith = (a, op, b) => `What is ${a} ${W[op]} ${b}?`;
function arith(rg, a, op, b, ans, wrongs, tip) { return mq(rg, `${a} ${op} ${b} = ?`, ans, wrongs, tip, enArith(a, op, b)); }

// ---------- 數學 ----------
const M = {};
M[1] = [
  rg => { const a = R(1, 10), b = R(1, 10), s = a + b; return arith(rg, a, '+', b, s, [s + 1, s - 1, s + 2, Math.abs(a - b)], T(rg, `由 ${a} 再數多 ${b} 個就係 ${s}`, `從 ${a} 往後數 ${b} 個就是 ${s}`)); },
  rg => { const a = R(5, 20), b = R(1, a - 1), d = a - b; return arith(rg, a, '−', b, d, [d + 1, d - 1, a + b], T(rg, `由 ${a} 倒數 ${b} 個就係 ${d}`, `從 ${a} 往回數 ${b} 個就是 ${d}`)); },
  rg => {
    const top = rg === 'HK' ? 50 : 100, s = new Set(); while (s.size < 3) s.add(R(1, top));
    const n = [...s], big = Math.random() < 0.5, ans = big ? Math.max(...n) : Math.min(...n);
    return mq(rg, T(rg, `${n.join('、')} 入面邊個數最${big ? '大' : '細'}？`, `${n.join('、')} 中哪個數最${big ? '大' : '小'}？`), ans, n.filter(x => x !== ans),
      T(rg, '先比十位，十位一樣再比個位', '先比十位，十位一樣再比個位'));
  },
  rg => {
    const st = pick([1, 1, 2, 5, 10]), a = R(0, 10) * (st === 1 ? 1 : st) + (st === 1 ? 1 : 0), seq = [0, 1, 2, 3, 4].map(i => a + i * st), k = R(1, 3), ans = seq[k];
    const shown = seq.map((x, i) => (i === k ? '___' : x)).join(', ');
    return mq(rg, T(rg, `${shown}　空格係幾多？`, `${shown}　空格是多少？`), ans, [ans + 1, ans - 1, ans + st + 1, ans + 2 * st], T(rg, `每次加 ${st}`, `每次加 ${st}`));
  },
  rg => {
    const [c1, c2] = rg === 'HK' ? pick([[10, 1], [5, 1], [5, 2], [10, 2], [10, 5]]) : pick([[10, 1], [5, 1], [10, 5], [50, 10]]);
    const x = R(1, 3), y = R(1, 4), ans = c1 * x + c2 * y;
    return mq(rg, T(rg, `${x} 個 $${c1} 硬幣同 ${y} 個 $${c2} 硬幣，一共幾多錢？`, `${x} 個 ${c1} 元硬幣和 ${y} 個 ${c2} 元硬幣，一共多少元？`), ans,
      [x + y, c1 + c2, c1 * x + y, x + c2 * y, ans + c2], T(rg, `${c1}×${x} + ${c2}×${y} = ${ans}`, `${c1}×${x} + ${c2}×${y} = ${ans}`), '', n => money(rg, n));
  },
];
M[2] = [
  rg => { let a, b; do { a = R(11, 79); b = R(11, 89 - a + 10); } while ((a % 10) + (b % 10) < 10 || a + b > 99); const s = a + b; return arith(rg, a, '+', b, s, [s - 10, s + 10, s + 1, s - 1], T(rg, '個位相加超過 10，要進位去十位', '個位相加滿 10，要進位到十位')); },
  rg => { let a, b; do { a = R(30, 99); b = R(11, a - 5); } while ((a % 10) >= (b % 10)); const d = a - b; return arith(rg, a, '−', b, d, [d + 10, d - 10, d + 1], T(rg, '個位唔夠減，要向十位借 1', '個位不夠減，要向十位借 1')); },
  rg => {
    const a = rg === 'HK' ? pick([2, 5, 10]) : R(2, 9), b = R(1, rg === 'HK' ? 10 : 9), p = a * b;
    return arith(rg, a, '×', b, p, [a * (b + 1), a * (b - 1), a + b, p + 1], T(rg, `${a} 嘅乘數表：${a} × ${b} = ${p}`, `九九乘法：${a} × ${b} = ${p}`));
  },
  rg => {
    const h = R(1, 12), half = Math.random() < 0.5, nx = h % 12 + 1, pv = (h + 10) % 12 + 1;
    const fmtT = (H, m) => (rg === 'HK' ? (m ? `${H} 時 30 分` : `${H} 時正`) : (m ? `${H} 點半` : `${H} 點整`));
    const text = half ? T(rg, `時鐘嘅短針喺 ${h} 同 ${nx} 中間，長針指住 6，而家係幾點？`, `時鐘的短針在 ${h} 和 ${nx} 中間，長針指著 6，現在是幾點？`)
      : T(rg, `時鐘嘅短針指住 ${h}，長針指住 12，而家係幾點？`, `時鐘的短針指著 ${h}，長針指著 12，現在是幾點？`);
    return mq(rg, text, fmtT(h, half), half ? [fmtT(nx, true), fmtT(h, false), fmtT(6, false)] : [fmtT(nx, false), fmtT(h, true), fmtT(pv, false)],
      half ? T(rg, '長針指住 6 即係 30 分', '長針指著 6 就是半點') : T(rg, '長針指住 12 即係正', '長針指著 12 就是整點'));
  },
  rg => {
    const have = pick([20, 50, 100]), cost = R(have === 20 ? 6 : 11, have - 3), ch = have - cost, it = pick(T(rg, ['一本簿', '一枝筆', '一盒顏色筆', '一個波'], ['一本筆記本', '一支筆', '一盒色鉛筆', '一顆球']));
    return mq(rg, T(rg, `你有 $${have}，買咗${it}用咗 $${cost}，仲剩幾多錢？`, `你有 ${have} 元，買了${it}花了 ${cost} 元，還剩多少元？`), ch,
      [ch + 10, ch - 10, ch + 1, have + cost], T(rg, `${have} − ${cost} = ${ch}`, `${have} − ${cost} = ${ch}`), '', n => money(rg, n));
  },
];
M[3] = [
  rg => { const a = R(105, 689), b = R(105, 989 - a), s = a + b; return arith(rg, a, '+', b, s, [s + 10, s - 10, s + 100, s - 1], '由個位加起，記得進位'); },
  rg => { const a = R(300, 999), b = R(101, a - 50), d = a - b; return arith(rg, a, '−', b, d, [d + 10, d - 10, d + 100, d + 1], T(rg, '由個位減起，唔夠減要借位', '由個位減起，不夠減要借位')); },
  rg => { const a = R(12, 99), b = R(2, 9), p = a * b; return arith(rg, a, '×', b, p, [p + 10, p - 10, p + b, p - b], T(rg, `${a} × ${b}：先乘個位，再乘十位`, `${a} × ${b}：先乘個位，再乘十位`)); },
  rg => { const b = R(2, 9), q = R(2, 12), a = b * q; return arith(rg, a, '÷', b, q, [q + 1, q - 1, a - b], T(rg, `諗乘數表：${b} × ${q} = ${a}`, `想乘法：${b} × ${q} = ${a}`)); },
  rg => {
    if (Math.random() < 0.5) {
      const s = new Set(); while (s.size < 3) s.add(R(2, 10)); const d = [...s], big = Math.random() < 0.5, ans = `1/${big ? Math.min(...d) : Math.max(...d)}`;
      return mq(rg, T(rg, `${d.map(x => `1/${x}`).join('、')} 邊個最${big ? '大' : '細'}？`, `${d.map(x => `1/${x}`).join('、')} 哪個最${big ? '大' : '小'}？`), ans, d.map(x => `1/${x}`),
        T(rg, '分子都係 1，分母越細，分數越大', '分子都是 1，分母越小，分數越大'));
    }
    const d = R(5, 12), s = new Set(); while (s.size < 3) s.add(R(1, d - 1)); const n = [...s], ans = `${Math.max(...n)}/${d}`;
    return mq(rg, T(rg, `${n.map(x => `${x}/${d}`).join('、')} 邊個最大？`, `${n.map(x => `${x}/${d}`).join('、')} 哪個最大？`), ans, n.map(x => `${x}/${d}`),
      T(rg, '分母一樣，分子越大，分數越大', '分母相同，分子越大，分數越大'));
  },
  rg => {
    const n = R(2, 9), k = R(0, 2), cm = T(rg, 'cm', '公分'), m = T(rg, 'm', '公尺'), g = T(rg, 'g', '公克'), kg = T(rg, 'kg', '公斤');
    if (k === 0) return mq(rg, `${n} ${m} = ? ${cm}`, n * 100, [n * 10, n * 1000, n + 100], `1 ${m} = 100 ${cm}`);
    if (k === 1) return mq(rg, `${n} ${kg} = ? ${g}`, n * 1000, [n * 100, n * 10, n + 1000], `1 ${kg} = 1000 ${g}`);
    return mq(rg, `${n * 100} ${cm} = ? ${m}`, n, [n * 10, n * 100, n + 1], `100 ${cm} = 1 ${m}`);
  },
];
M[4] = [
  rg => { const a = R(12, 49), b = R(11, 29), p = a * b; return arith(rg, a, '×', b, p, [a * (b % 10) + a * Math.floor(b / 10), p + 10, p - a, p + a], T(rg, `${a} × ${b}：十位嗰行要乘 10`, `${a} × ${b}：十位那行要乘 10`)); },
  rg => {
    const b = R(3, 9), q = R(3, 15), r = R(1, b - 1), a = b * q + r, s = (x, y) => `${x} 餘 ${y}`;
    return mq(rg, `${a} ÷ ${b} = ?`, s(q, r), [r + 1 < b ? s(q, r + 1) : s(q, r - 1), s(q + 1, r), s(q - 1, r + b)], T(rg, `${b} × ${q} = ${b * q}，仲多 ${r}；餘數要細過 ${b}`, `${b} × ${q} = ${b * q}，還多 ${r}；餘數要小於 ${b}`), `What is ${a} divided by ${b}?`);
  },
  rg => {
    const d = R(5, 12), add = Math.random() < 0.5; let a, b, n;
    do { a = R(1, d - 2); b = R(1, d - 2); n = add ? a + b : a - b; } while (n <= 0 || n >= d || gcd(n, d) !== 1);
    const op = add ? '+' : '−';
    return mq(rg, `${a}/${d} ${op} ${b}/${d} = ?`, `${n}/${d}`, [add ? `${n}/${2 * d}` : `${n}/0`, `${n + 1}/${d}`, `${n - 1}/${d}`, `${n}/${d + 1}`].filter(x => !/\/0$/.test(x) && !/^0\//.test(x)),
      T(rg, `分母唔變，分子${add ? '相加' : '相減'}`, `分母不變，分子${add ? '相加' : '相減'}`), `What is ${a} over ${d} ${add ? 'plus' : 'minus'} ${b} over ${d}?`);
  },
  rg => {
    const L = R(4, 15), Wd = R(2, L - 1), per = Math.random() < 0.5, cm = T(rg, 'cm', '公分'), cm2 = T(rg, 'cm²', '平方公分');
    const t = per ? T(rg, `長方形長 ${L} cm、闊 ${Wd} cm，周界係幾多 cm？`, `長方形長 ${L} 公分、寬 ${Wd} 公分，周長是多少公分？`)
      : T(rg, `長方形長 ${L} cm、闊 ${Wd} cm，面積係幾多 cm²？`, `長方形長 ${L} 公分、寬 ${Wd} 公分，面積是多少平方公分？`);
    return per ? mq(rg, t, 2 * (L + Wd), [L * Wd, L + Wd, 2 * L + Wd], T(rg, `周界 = (長 + 闊) × 2`, `周長 = (長 + 寬) × 2`))
      : mq(rg, t, L * Wd, [2 * (L + Wd), L + Wd, L * Wd + L], T(rg, `面積 = 長 × 闊（${cm2}）`, `面積 = 長 × 寬（${cm2}）`));
  },
  rg => {
    const A = R(11, 89), B = R(11, 89), add = Math.random() < 0.5, x = Math.max(A, B), y = Math.min(A, B) === x ? x - 5 : Math.min(A, B);
    const a = add ? A / 10 : x / 10, b = add ? B / 10 : y / 10, ans = add ? (A + B) / 10 : (x - y) / 10;
    return arith(rg, fmt(a), add ? '+' : '−', fmt(b), ans, [ans + 1, ans - 1, ans + 0.1, ans * 10], '小數點對齊再計');
  },
];
const avgQ = rg => {
  const n = R(3, 4), avg = R(10, 40), d = Array.from({ length: n - 1 }, () => R(-6, 6)); d.push(-d.reduce((s, x) => s + x, 0));
  const nums = d.map(x => avg + x), sum = nums.reduce((s, x) => s + x, 0);
  return mq(rg, T(rg, `${nums.join('、')} 嘅平均數係幾多？`, `${nums.join('、')} 的平均數是多少？`), avg, [sum, avg + 1, avg - 1, Math.round(sum / (n + 1))],
    T(rg, `平均數 = 總和 ${sum} ÷ ${n}`, `平均數 = 總和 ${sum} ÷ ${n}`));
};
M[5] = [
  rg => {
    let d1, k, d2, a, b, add, num;
    do { d1 = R(2, 6); k = R(2, 3); d2 = d1 * k; a = R(1, d1 - 1); b = R(1, d2 - 1); add = Math.random() < 0.5; num = add ? a * k + b : a * k - b; } while (num <= 0 || num >= d2 || (add && a * k + b === d2));
    const ans = frac(num, d2), op = add ? '+' : '−';
    return mq(rg, `${a}/${d1} ${op} ${b}/${d2} = ?`, ans, [frac(add ? a + b : Math.abs(a - b) || 1, d1 + d2), frac(add ? a + b : Math.abs(a - b) || 1, d2), frac(num + 1, d2), num > 1 ? frac(num - 1, d2) : frac(num + 2, d2)],
      T(rg, `先通分：${a}/${d1} = ${a * k}/${d2}，答案要約簡`, `先通分：${a}/${d1} = ${a * k}/${d2}，答案要約分`), `What is ${a} over ${d1} ${add ? 'plus' : 'minus'} ${b} over ${d2}?`);
  },
  rg => {
    const k = R(0, 2);
    if (k === 0) { const X = R(11, 999), f = pick([10, 100]), x = X / 100, ans = x * f; return arith(rg, fmt(x), '×', f, ans, [x * (f === 10 ? 100 : 10), x / 10, ans + 1], `乘 ${f}：小數點向右移 ${f === 10 ? 1 : 2} 位`); }
    if (k === 1) { const X = R(11, 999), x = X / 10, ans = X / 100; return arith(rg, fmt(x), '÷', 10, ans, [x * 10, x, ans + 1], '除以 10：小數點向左移 1 位'); }
    const n = R(5, 999), ans = n / 100; return arith(rg, n, '÷', 100, ans, [n / 10, n * 100, ans * 10 + 0.1], '除以 100：小數點向左移 2 位');
  },
  rg => { const A = R(2, 29), b = R(2, 9), ans = (A * b) / 10; return arith(rg, fmt(A / 10), '×', b, ans, [A * b, (A * b) / 100, ans + 0.1, ans + 1], T(rg, `先計 ${A} × ${b} = ${A * b}，再點返小數點`, `先算 ${A} × ${b} = ${A * b}，再標上小數點`)); },
  rg => {
    const k = R(0, 2), cm = T(rg, 'cm', '公分');
    if (k === 0) { const b = R(4, 20), h = R(3, 12), ans = (b * h) / 2; return mq(rg, T(rg, `三角形底 ${b} cm、高 ${h} cm，面積係幾多 cm²？`, `三角形底 ${b} 公分、高 ${h} 公分，面積是多少平方公分？`), ans, [b * h, b + h, ans + b], '三角形面積 = 底 × 高 ÷ 2'); }
    if (k === 1) { const b = R(4, 15), h = R(3, 12), ans = b * h; return mq(rg, T(rg, `平行四邊形底 ${b} cm、高 ${h} cm，面積係幾多 cm²？`, `平行四邊形底 ${b} 公分、高 ${h} 公分，面積是多少平方公分？`), ans, [ans / 2, 2 * (b + h), ans + b], '平行四邊形面積 = 底 × 高'); }
    const l = R(2, 9), w = R(2, 9), h = R(2, 9), v = l * w * h;
    return mq(rg, T(rg, `長方體長 ${l} cm、闊 ${w} cm、高 ${h} cm，體積係幾多 cm³？`, `長方體長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分，體積是多少立方公分？`), v, [l * w + h, l + w + h, 2 * (l * w + w * h + l * h), v + l * w], T(rg, '體積 = 長 × 闊 × 高', '體積 = 長 × 寬 × 高'));
  },
  rg => (rg === 'HK' ? avgQ(rg) : M[5][2](rg)), // 平均數（HK）；TW 五年級換做小數乘法
  rg => {
    const k = R(0, 2);
    if (k === 0) { const per = R(4, 12), box = R(3, 9), ans = per * box; return mq(rg, T(rg, `每盒有 ${per} 件蛋撻，${box} 盒一共有幾多件？`, `每盒有 ${per} 個蛋塔，${box} 盒一共有多少個？`), ans, [per + box, ans + per, ans - per], T(rg, `每盒數量 × 盒數 = ${per} × ${box}`, `每盒數量 × 盒數 = ${per} × ${box}`)); }
    if (k === 1) { const kids = R(3, 9), each = R(3, 12), tot = kids * each; return mq(rg, T(rg, `${tot} 粒糖平均分俾 ${kids} 個小朋友，每人有幾多粒？`, `${tot} 顆糖平分給 ${kids} 個小朋友，每人有多少顆？`), each, [tot - kids, each + 1, each - 1, tot + kids], `總數 ÷ 人數 = ${tot} ÷ ${kids}`); }
    const p = R(3, 15) * 0.5, n = R(2, 6), ans = p * n;
    return mq(rg, T(rg, `一枝筆 $${fmt(p)}，買 ${n} 枝要幾多錢？`, `一支筆 ${fmt(p)} 元，買 ${n} 支要多少元？`), ans, [p + n, ans + 1, ans - 0.5, ans + p], `單價 × 數量 = ${fmt(p)} × ${n}`, '', x => money(rg, fmt(x)));
  },
];
M[6] = [
  rg => {
    if (Math.random() < 0.5) {
      const p = pick([10, 20, 25, 50, 75, 5, 30, 40]), y = pick([20, 40, 60, 80, 100, 120, 200, 400]), ans = (p * y) / 100;
      if (!Number.isInteger(ans)) return M[6][0](rg);
      return mq(rg, T(rg, `${y} 嘅 ${p}% 係幾多？`, `${y} 的 ${p}% 是多少？`), ans, [p, y - ans, (p * y) / 10, ans + 10], `${y} × ${p}/100 = ${ans}`);
    }
    const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 10], [3, 10], [7, 10], [1, 20]]), pc = (100 * n) / d;
    return mq(rg, T(rg, `${n}/${d} 等於百分之幾？`, `${n}/${d} 等於百分之多少？`), `${pc}%`, [`${n}${d}%`, `${100 - pc}%`, `${pc / 10}%`, `${pc + 5}%`].filter(x => x !== `${pc}%`), `${n}/${d} = ${n * (100 / d)}/100 = ${pc}%`);
  },
  rg => {
    if (rg === 'HK') return M[6][4](rg);
    if (Math.random() < 0.5) {
      let x, y; do { x = R(1, 9); y = R(1, 9); } while (x === y || gcd(x, y) !== 1); const g = R(2, 9);
      return mq(rg, `把 ${g * x}:${g * y} 化成最簡單整數比`, `${x}:${y}`, [`${y}:${x}`, `${x + 1}:${y}`, `${x}:${y + 1}`], `前項和後項同除以 ${g}`);
    }
    const x = R(1, 5), y = R(1, 5), u = R(2, 8), tot = (x + y) * u;
    return mq(rg, `${tot} 顆糖按 ${x}:${y} 分給哥哥和弟弟，哥哥分到幾顆？`, x * u, [y * u, x * u + u, u, x * u + 1], `${tot} ÷ (${x} + ${y}) × ${x} = ${x * u}`);
  },
  rg => {
    const t = R(2, 6), v = R(8, 18) * 5, d = v * t, k = R(0, 2), km = T(rg, 'km', '公里');
    if (k === 0) return mq(rg, T(rg, `一架車 ${t} 小時行咗 ${d} km，平均速率係每小時幾多 km？`, `一輛車 ${t} 小時行駛了 ${d} 公里，平均時速是多少公里？`), v, [d * t, d - t, v + 5, v - 5], '速率 = 距離 ÷ 時間');
    if (k === 1) return mq(rg, T(rg, `一架車每小時行 ${v} km，${t} 小時行幾多 km？`, `一輛車時速 ${v} 公里，${t} 小時行駛多少公里？`), d, [v + t, d + v, d - v], '距離 = 速率 × 時間');
    return mq(rg, T(rg, `一架車每小時行 ${v} km，行 ${d} km 要幾多小時？`, `一輛車時速 ${v} 公里，行駛 ${d} 公里要幾小時？`), t, [t + 1, t - 1, t + 2], `時間 = 距離 ÷ 速率（${km}）`);
  },
  rg => {
    const r = R(1, 10), k = R(0, 2), cm = T(rg, 'cm', '公分');
    const C = (2 * 314 * r) / 100, A = (314 * r * r) / 100;
    if (k === 0) return mq(rg, T(rg, `圓形半徑 ${r} cm，圓周係幾多 cm？（π = 3.14）`, `圓的半徑 ${r} 公分，圓周長是多少公分？（π = 3.14）`), C, [(314 * r) / 100, A === C ? A + 1 : A, C + 3.14], '圓周 = 2 × π × 半徑');
    if (k === 1) return mq(rg, T(rg, `圓形直徑 ${2 * r} cm，圓周係幾多 cm？（π = 3.14）`, `圓的直徑 ${2 * r} 公分，圓周長是多少公分？（π = 3.14）`), C, [(314 * 4 * r) / 100, C / 2, C + 1], '圓周 = π × 直徑');
    return mq(rg, T(rg, `圓形半徑 ${r} cm，面積係幾多 cm²？（π = 3.14）`, `圓的半徑 ${r} 公分，面積是多少平方公分？（π = 3.14）`), A, [C, (314 * 4 * r * r) / 100, (314 * r) / 100], '圓面積 = π × 半徑 × 半徑');
  },
  rg => {
    const k = R(0, 3), x = R(2, 15), a = R(2, 9);
    const ask = T(rg, 'x 係幾多？', 'x 是多少？');
    if (k === 0) { const b = x + a; return mq(rg, `x + ${a} = ${b}，${ask}`, x, [b + a, x + 1, b], `x = ${b} − ${a}`); }
    if (k === 1) { const b = x; const X = x + a; return mq(rg, `x − ${a} = ${b}，${ask}`, X, [b - a, X + 1, X - 1], `x = ${b} + ${a}`); }
    if (k === 2) { const b = a * x; return mq(rg, `${a} × x = ${b}，${ask}`, x, [b - a, b * a, x + 1], `x = ${b} ÷ ${a}`); }
    const b = x; return mq(rg, `x ÷ ${a} = ${b}，${ask}`, a * b, [b - a > 0 ? b - a : b + a + 1, a + b, a * b + a], `x = ${b} × ${a}`);
  },
  avgQ,
];

// ---------- makeQ ----------
const last = {};
function bankQ(subject, lv, rg) {
  const list = subject === 'en' ? EN[rg][lv - 1] : VB[rg][lv - 1], key = `${subject}|${lv}|${rg}`;
  let i; do { i = Math.floor(Math.random() * list.length); } while (i === last[key] && list.length > 1);
  last[key] = i;
  if (subject === 'en') {
    const [text, opts, tip] = list[i], [c, ...w] = opts.split('|');
    const en = text.replace(/_{2,}/g, 'blank').replace(/\([^)]*\)|（[^）]*）/g, '').replace(/\s+/g, ' ').trim();
    return finish(text, c, w, tip, en, T(rg, '揀正確答案', '選出正確答案'));
  }
  const [w, m, g] = list[i], same = shuffle(list.filter(x => x[2] === g && x[1] !== m).map(x => x[1]));
  const wrongs = [...new Set(same)].slice(0, 2);
  if (wrongs.length < 2) for (const x of shuffle(list.map(y => y[1]))) if (x !== m && !wrongs.includes(x) && wrongs.length < 2) wrongs.push(x);
  return finish(w, m, wrongs, T(rg, `${w} 即係「${m}」`, `${w} 是「${m}」的意思`), w, T(rg, `「${w}」係咩意思？`, `「${w}」是什麼意思？`));
}
export function makeQ(subject, level, region) {
  const rg = region === 'TW' ? 'TW' : 'HK', lv = Math.min(6, Math.max(1, Math.round(Number(level) || 1)));
  const sub = subject === 'vocab' || subject === 'math' ? subject : 'en';
  if (sub !== 'math') return bankQ(sub, lv, rg);
  const key = `math|${lv}|${rg}`;
  let q, n = 0;
  do { q = pick(M[lv])(rg); } while (q.text === last[key] && ++n < 20);
  last[key] = q.text;
  return q;
}
