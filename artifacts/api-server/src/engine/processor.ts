import { get, set } from "./store.js";
import { calcMA25, calcDistance, MA25_PERIOD } from "./ma.js";
import { updateEma200 } from "./ema.js";
import { engineEmitter } from "./emitter.js";
import { logger } from "../lib/logger.js";
import type { CrossState, LastCross } from "./types.js";

export interface ClosedCandle {
  symbol: string;
  close: number;
  volume: number;
}

// Called on every closed 15m candle — updates MA25, distance, cross state
export function processClosedCandle(candle: ClosedCandle): void {
  const current = get(candle.symbol);
  if (!current) {
    logger.warn({ symbol: candle.symbol }, "processClosedCandle: symbol not in store, skipping");
    return;
  }

  // Roll closes buffer: drop oldest, add new close
  const closesBuffer = [...current.closesBuffer.slice(-(MA25_PERIOD - 1)), candle.close];

  const ma25 = calcMA25(closesBuffer);
  const newPrice = candle.close;
  const distanceMa25 = calcDistance(newPrice, ma25);

  const prevCrossState = current.crossState;
  const newCrossState: CrossState = newPrice >= ma25 ? "ABOVE" : "BELOW";

  let lastCross: LastCross = current.lastCross;
  if (prevCrossState === "BELOW" && newCrossState === "ABOVE") {
    lastCross = "CROSS_UP";
    logger.info({ symbol: candle.symbol, price: newPrice, ma25 }, "CROSS UP detected");
  } else if (prevCrossState === "ABOVE" && newCrossState === "BELOW") {
    lastCross = "CROSS_DOWN";
    logger.info({ symbol: candle.symbol, price: newPrice, ma25 }, "CROSS DOWN detected");
  }

  const updated = {
    ...current,
    price: newPrice,
    ma25,
    distanceMa25,
    volume: candle.volume,
    crossState: newCrossState,
    lastCross,
    updatedAt: Date.now(),
    closesBuffer,
  };

  set(updated);
  engineEmitter.emit("symbolUpdate", updated);
}

// Called on every closed 4h candle — updates EMA200 only (display only, no distance)
export function process4hCandle(candle: { symbol: string; close: number }): void {
  const current = get(candle.symbol);
  if (!current) return;

  const ema200 = updateEma200(current.ema200, candle.close);

  const updated = { ...current, ema200 };
  set(updated);
  engineEmitter.emit("symbolUpdate", updated);
}
