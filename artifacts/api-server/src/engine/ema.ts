export const EMA100_PERIOD = 100;
export const EMA100_MULTIPLIER = 2 / (EMA100_PERIOD + 1);

export const EMA200_PERIOD = 200;
export const EMA200_MULTIPLIER = 2 / (EMA200_PERIOD + 1);

export function calculateInitialEma(closes: number[], period: number, multiplier: number): number {
  if (closes.length === 0) return 0;
  const seedLength = Math.min(closes.length, period);
  let ema = closes.slice(0, seedLength).reduce((a, b) => a + b, 0) / seedLength;
  for (let i = seedLength; i < closes.length; i++) {
    ema = (closes[i]! - ema) * multiplier + ema;
  }
  return ema;
}

export function updateEma(prevEma: number, close: number, multiplier: number): number {
  return (close - prevEma) * multiplier + prevEma;
}

export function calculateDistance(price: number, ema: number): number {
  if (ema === 0) return 0;
  return ((price - ema) / ema) * 100;
}
