export const EMA_PERIOD = 100;
export const EMA_MULTIPLIER = 2 / (EMA_PERIOD + 1);

export function calculateInitialEma(closes: number[]): number {
  if (closes.length === 0) return 0;

  const seedLength = Math.min(closes.length, EMA_PERIOD);
  let ema = closes.slice(0, seedLength).reduce((a, b) => a + b, 0) / seedLength;

  for (let i = seedLength; i < closes.length; i++) {
    ema = (closes[i]! - ema) * EMA_MULTIPLIER + ema;
  }

  return ema;
}

export function updateEma(prevEma: number, close: number): number {
  return (close - prevEma) * EMA_MULTIPLIER + prevEma;
}

export function calculateDistance(price: number, ema: number): number {
  if (ema === 0) return 0;
  return ((price - ema) / ema) * 100;
}
