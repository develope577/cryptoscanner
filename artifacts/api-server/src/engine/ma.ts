export const MA25_PERIOD = 25;
export const SIGNAL9_PERIOD = 9;

export function calcMA25(closes: number[]): number {
  const window = closes.slice(-MA25_PERIOD);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

export function calcSignal9(ma25Values: number[]): number {
  const window = ma25Values.slice(-SIGNAL9_PERIOD);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

export function calcDistance(price: number, ma: number): number {
  if (ma === 0) return 0;
  return ((price - ma) / ma) * 100;
}

export function bootstrapBuffers(closes: number[]): {
  closesBuffer: number[];
  ma25Buffer: number[];
  ma25: number;
  signal9: number;
} {
  if (closes.length < MA25_PERIOD) {
    return { closesBuffer: closes.slice(), ma25Buffer: [], ma25: 0, signal9: 0 };
  }

  const ma25Values: number[] = [];
  for (let i = MA25_PERIOD - 1; i < closes.length; i++) {
    const window = closes.slice(i - MA25_PERIOD + 1, i + 1);
    const ma = window.reduce((a, b) => a + b, 0) / MA25_PERIOD;
    ma25Values.push(ma);
  }

  const closesBuffer = closes.slice(-MA25_PERIOD);
  const ma25Buffer = ma25Values.slice(-SIGNAL9_PERIOD);
  const ma25 = ma25Values[ma25Values.length - 1]!;
  const signal9 =
    ma25Buffer.length === SIGNAL9_PERIOD
      ? ma25Buffer.reduce((a, b) => a + b, 0) / SIGNAL9_PERIOD
      : ma25Buffer.reduce((a, b) => a + b, 0) / ma25Buffer.length;

  return { closesBuffer, ma25Buffer, ma25, signal9 };
}
