// 香港鐵路網：10 條綫、98 個站（站名中英文同真實港鐵一樣）
// 座標用真實經緯度（大約）按比例縮落 10 公里 × 10 公里嘅遊戲地圖
// 每個站：[中文, English, 緯度, 經度]
export const ST = {
  KET: ['堅尼地城', 'Kennedy Town', 22.2814, 114.1289], HKU: ['香港大學', 'HKU', 22.2841, 114.1351], SYP: ['西營盤', 'Sai Ying Pun', 22.2856, 114.1426],
  SHW: ['上環', 'Sheung Wan', 22.2866, 114.1516], CEN: ['中環', 'Central', 22.2819, 114.1581], ADM: ['金鐘', 'Admiralty', 22.2794, 114.1650],
  WAC: ['灣仔', 'Wan Chai', 22.2775, 114.1732], CAB: ['銅鑼灣', 'Causeway Bay', 22.2803, 114.1838], TIH: ['天后', 'Tin Hau', 22.2825, 114.1919],
  FOH: ['炮台山', 'Fortress Hill', 22.2880, 114.1935], NOP: ['北角', 'North Point', 22.2911, 114.2005], QUB: ['鰂魚涌', 'Quarry Bay', 22.2876, 114.2098],
  TAK: ['太古', 'Tai Koo', 22.2847, 114.2161], SWH: ['西灣河', 'Sai Wan Ho', 22.2822, 114.2220], SKW: ['筲箕灣', 'Shau Kei Wan', 22.2790, 114.2288],
  HFC: ['杏花邨', 'Heng Fa Chuen', 22.2770, 114.2400], CHW: ['柴灣', 'Chai Wan', 22.2646, 114.2370],
  TST: ['尖沙咀', 'Tsim Sha Tsui', 22.2973, 114.1722], JOR: ['佐敦', 'Jordan', 22.3050, 114.1716], YMT: ['油麻地', 'Yau Ma Tei', 22.3129, 114.1706],
  MOK: ['旺角', 'Mong Kok', 22.3193, 114.1694], PRE: ['太子', 'Prince Edward', 22.3245, 114.1683], SSP: ['深水埗', 'Sham Shui Po', 22.3307, 114.1622],
  CSW: ['長沙灣', 'Cheung Sha Wan', 22.3355, 114.1563], LCK: ['荔枝角', 'Lai Chi Kok', 22.3373, 114.1480], MEF: ['美孚', 'Mei Foo', 22.3383, 114.1379],
  LAK: ['荔景', 'Lai King', 22.3485, 114.1262], KWF: ['葵芳', 'Kwai Fong', 22.3570, 114.1310], KWH: ['葵興', 'Kwai Hing', 22.3630, 114.1311],
  TWH: ['大窩口', 'Tai Wo Hau', 22.3707, 114.1250], TSW: ['荃灣', 'Tsuen Wan', 22.3735, 114.1176],
  WHA: ['黃埔', 'Whampoa', 22.3049, 114.1898], HOM: ['何文田', 'Ho Man Tin', 22.3094, 114.1825], SKM: ['石硤尾', 'Shek Kip Mei', 22.3317, 114.1687],
  KOT: ['九龍塘', 'Kowloon Tong', 22.3370, 114.1760], LOF: ['樂富', 'Lok Fu', 22.3380, 114.1873], WTS: ['黃大仙', 'Wong Tai Sin', 22.3418, 114.1938],
  DIH: ['鑽石山', 'Diamond Hill', 22.3400, 114.2016], CHH: ['彩虹', 'Choi Hung', 22.3349, 114.2089], KOB: ['九龍灣', 'Kowloon Bay', 22.3232, 114.2141],
  NTK: ['牛頭角', 'Ngau Tau Kok', 22.3155, 114.2190], KWT: ['觀塘', 'Kwun Tong', 22.3122, 114.2263], LAT: ['藍田', 'Lam Tin', 22.3071, 114.2334],
  YAT: ['油塘', 'Yau Tong', 22.2980, 114.2370], TIK: ['調景嶺', 'Tiu Keng Leng', 22.3046, 114.2526],
  TKO: ['將軍澳', 'Tseung Kwan O', 22.3075, 114.2600], HAH: ['坑口', 'Hang Hau', 22.3155, 114.2645], POA: ['寶琳', 'Po Lam', 22.3225, 114.2580], LHP: ['康城', 'LOHAS Park', 22.2955, 114.2690],
  HOK: ['香港', 'Hong Kong', 22.2849, 114.1583], KOW: ['九龍', 'Kowloon', 22.3046, 114.1616], OLY: ['奧運', 'Olympic', 22.3178, 114.1600],
  NAC: ['南昌', 'Nam Cheong', 22.3266, 114.1537], TSY: ['青衣', 'Tsing Yi', 22.3585, 114.1076], SUN: ['欣澳', 'Sunny Bay', 22.3310, 114.0590],
  TUC: ['東涌', 'Tung Chung', 22.2893, 113.9414], AIR: ['機場', 'Airport', 22.3158, 113.9366], AWE: ['博覽館', 'AsiaWorld-Expo', 22.3215, 113.9425],
  DIS: ['迪士尼', 'Disneyland Resort', 22.3154, 114.0450],
  EXC: ['會展', 'Exhibition Centre', 22.2827, 114.1750], HUH: ['紅磡', 'Hung Hom', 22.3030, 114.1815], MKK: ['旺角東', 'Mong Kok East', 22.3220, 114.1724],
  TAW: ['大圍', 'Tai Wai', 22.3729, 114.1786], SHT: ['沙田', 'Sha Tin', 22.3824, 114.1873], FOT: ['火炭', 'Fo Tan', 22.3953, 114.1981],
  RAC: ['馬場', 'Racecourse', 22.4006, 114.2032], UNI: ['大學', 'University', 22.4135, 114.2101], TAP: ['大埔墟', 'Tai Po Market', 22.4447, 114.1704],
  TWO: ['太和', 'Tai Wo', 22.4510, 114.1612], FAN: ['粉嶺', 'Fanling', 22.4921, 114.1387], SHS: ['上水', 'Sheung Shui', 22.5014, 114.1280],
  LOW: ['羅湖', 'Lo Wu', 22.5283, 114.1133], LMC: ['落馬洲', 'Lok Ma Chau', 22.5148, 114.0656],
  WKS: ['烏溪沙', 'Wu Kai Sha', 22.4290, 114.2437], MOS: ['馬鞍山', 'Ma On Shan', 22.4249, 114.2318], HEO: ['恒安', 'Heng On', 22.4180, 114.2247],
  TSH: ['大水坑', 'Tai Shui Hang', 22.4084, 114.2223], SHM: ['石門', 'Shek Mun', 22.3876, 114.2086], CIO: ['第一城', 'City One', 22.3826, 114.2033],
  STW: ['沙田圍', 'Sha Tin Wai', 22.3770, 114.1946], CKT: ['車公廟', 'Che Kung Temple', 22.3745, 114.1859], HIK: ['顯徑', 'Hin Keng', 22.3632, 114.1709],
  KAT: ['啟德', 'Kai Tak', 22.3305, 114.1993], SUW: ['宋皇臺', 'Sung Wong Toi', 22.3255, 114.1912], TKW: ['土瓜灣', 'To Kwa Wan', 22.3176, 114.1877],
  ETS: ['尖東', 'East Tsim Sha Tsui', 22.2952, 114.1746], AUS: ['柯士甸', 'Austin', 22.3044, 114.1663], TWW: ['荃灣西', 'Tsuen Wan West', 22.3684, 114.1094],
  KSR: ['錦上路', 'Kam Sheung Road', 22.4348, 114.0632], YUL: ['元朗', 'Yuen Long', 22.4461, 114.0352], LOP: ['朗屏', 'Long Ping', 22.4483, 114.0256],
  TIS: ['天水圍', 'Tin Shui Wai', 22.4483, 114.0045], SIH: ['兆康', 'Siu Hong', 22.4110, 113.9784], TUM: ['屯門', 'Tuen Mun', 22.3953, 113.9733],
  OCP: ['海洋公園', 'Ocean Park', 22.2486, 114.1745], WCH: ['黃竹坑', 'Wong Chuk Hang', 22.2480, 114.1680], LET: ['利東', 'Lei Tung', 22.2420, 114.1560],
  SOH: ['海怡半島', 'South Horizons', 22.2425, 114.1490],
};
// 綫（branch 用另一條 route 表示，同一個 id）
export const LINES = [
  { id: 'ISL', zh: '港島綫', en: 'Island Line', c: '#007dc5', r: [['KET', 'HKU', 'SYP', 'SHW', 'CEN', 'ADM', 'WAC', 'CAB', 'TIH', 'FOH', 'NOP', 'QUB', 'TAK', 'SWH', 'SKW', 'HFC', 'CHW']] },
  { id: 'TWL', zh: '荃灣綫', en: 'Tsuen Wan Line', c: '#e2231a', r: [['CEN', 'ADM', 'TST', 'JOR', 'YMT', 'MOK', 'PRE', 'SSP', 'CSW', 'LCK', 'MEF', 'LAK', 'KWF', 'KWH', 'TWH', 'TSW']] },
  { id: 'KTL', zh: '觀塘綫', en: 'Kwun Tong Line', c: '#00ab4e', r: [['WHA', 'HOM', 'YMT', 'MOK', 'PRE', 'SKM', 'KOT', 'LOF', 'WTS', 'DIH', 'CHH', 'KOB', 'NTK', 'KWT', 'LAT', 'YAT', 'TIK']] },
  { id: 'TKL', zh: '將軍澳綫', en: 'Tseung Kwan O Line', c: '#7d499d', r: [['NOP', 'QUB', 'YAT', 'TIK', 'TKO', 'HAH', 'POA'], ['TKO', 'LHP']] },
  { id: 'TCL', zh: '東涌綫', en: 'Tung Chung Line', c: '#f7943e', r: [['HOK', 'KOW', 'OLY', 'NAC', 'LAK', 'TSY', 'SUN', 'TUC']] },
  { id: 'AEL', zh: '機場快綫', en: 'Airport Express', c: '#00888a', r: [['HOK', 'KOW', 'TSY', 'AIR', 'AWE']] },
  { id: 'DRL', zh: '迪士尼綫', en: 'Disneyland Resort Line', c: '#f173ac', r: [['SUN', 'DIS']] },
  { id: 'EAL', zh: '東鐵綫', en: 'East Rail Line', c: '#5eb6e4', r: [['ADM', 'EXC', 'HUH', 'MKK', 'KOT', 'TAW', 'SHT', 'FOT', 'RAC', 'UNI', 'TAP', 'TWO', 'FAN', 'SHS', 'LOW'], ['SHS', 'LMC']] },
  { id: 'TML', zh: '屯馬綫', en: 'Tuen Ma Line', c: '#923011', r: [['WKS', 'MOS', 'HEO', 'TSH', 'SHM', 'CIO', 'STW', 'CKT', 'TAW', 'HIK', 'DIH', 'KAT', 'SUW', 'TKW', 'HOM', 'HUH', 'ETS', 'AUS', 'NAC', 'MEF', 'TWW', 'KSR', 'YUL', 'LOP', 'TIS', 'SIH', 'TUM']] },
  { id: 'SIL', zh: '南港島綫', en: 'South Island Line', c: '#bac429', r: [['ADM', 'OCP', 'WCH', 'LET', 'SOH']] },
];
// 行路轉車（唔使出閘）
export const WALKS = [['CEN', 'HOK'], ['TST', 'ETS']];
// 經緯度 → 遊戲座標
const LNG0 = 114.1028, LAT0 = 22.385, KX = 27072, KZ = 29081;
export const geo = (lat, lng) => [(lng - LNG0) * KX, (LAT0 - lat) * KZ];
