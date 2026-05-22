export const MA25_PERIOD = 25;

export function calcMA25(closes: number[]): number {
  const window = closes.slice(-MA25_PERIOD);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

export function calcDistance(price: number, ma: number): number {
  if (ma === 0) return 0;
  return ((price - ma) / ma) * 100;
}

export function bootstrapMA25(closes: number[]): {
  closesBuffer: number[];
  ma25: number;
} {
  const closesBuffer = closes.slice(-MA25_PERIOD);
  const ma25 = closesBuffer.reduce((a, b) => a + b, 0) / closesBuffer.length;
  return { closesBuffer, ma25 };
}
