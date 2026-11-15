// 樓層 ↔ 高度（米）
// 1–100 樓：正常大廈（每層 3.5m）
// 101–1000 樓：慢慢升上天空，見到雲同飛機（到 12km）
// 1001–10000 樓：穿過大氣層，去到太空站（到 420km）
// 0 = 電梯機房（地底）
export const MAX_FLOOR = 10000;
export const MACHINE_ROOM_Y = -7;
export const ISS_FLOOR = 9800;

export function altOfFloor(f) {
  if (f <= 0.5) return MACHINE_ROOM_Y * (1 - f / 0.5) + 0; // 0 → -7, 0.5 → 0
  if (f <= 1) return 0;
  if (f <= 100) return (f - 1) * 3.5;
  if (f <= 1000) return 346.5 + (f - 100) / 900 * (12000 - 346.5);
  return 12000 + (f - 1000) / 9000 * 408000;
}

export function layerName(a) {
  if (a < -1) return '地底・電梯機房';
  if (a < 350) return '大廈樓層';
  if (a < 12000) return '對流層・雲同飛機';
  if (a < 50000) return '平流層';
  if (a < 85000) return '中氣層';
  if (a < 100000) return '熱氣層';
  if (a < 380000) return '🚀 太空（已過卡門線）';
  return '🛰️ 國際太空站軌道';
}

export function fmtAlt(a) {
  if (Math.abs(a) < 1000) return `${Math.abs(a) < 0.5 ? '0' : a.toFixed(0)} m`;
  return `${(a / 1000).toFixed(a < 100000 ? 1 : 0)} km`;
}

export const floorLabel = f => f === 0 ? 'M' : String(f);
