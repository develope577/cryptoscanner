export const EMA200_PERIOD = 200;
export const EMA200_MULTIPLIER = 2 / (EMA200_PERIOD + 1);

export function calculateInitialEma200(closes: number[]): number {
  if (closes.length < EMA200_PERIOD) return 0;
  let ema = closes.slice(0, EMA200_PERIOD).reduce((a, b) => a + b, 0) / EMA200_PERIOD;
  for (let i = EMA200_PERIOD; i < closes.length; i++) {
    ema = (closes[i]! - ema) * EMA200_MULTIPLIER + ema;
  }
  return ema;
}

export function updateEma200(prevEma: number, close: number): number {
  return (close - prevEma) * EMA200_MULTIPLIER + prevEma;
}
