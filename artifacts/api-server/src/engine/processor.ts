import { get, set } from "./store.js";
import { updateEma, calculateDistance, EMA100_MULTIPLIER, EMA200_MULTIPLIER } from "./ema.js";
import { engineEmitter } from "./emitter.js";
import { logger } from "../lib/logger.js";
import type { CrossState, LastCross } from "./types.js";

export interface ClosedCandle {
  symbol: string;
  close: number;
  volume: number;
}

export function processClosedCandle(candle: ClosedCandle): void {
  const current = get(candle.symbol);

  if (!current) {
    logger.warn({ symbol: candle.symbol }, "processClosedCandle: symbol not in store, skipping");
    return;
  }

  const prevCrossState = current.crossState;

  // 1. Compute new EMAs from previous values + closed candle close price
  const newEma100 = updateEma(current.ema100, candle.close, EMA100_MULTIPLIER);
  const newEma200 = updateEma(current.ema200, candle.close, EMA200_MULTIPLIER);

  // 2. Compute distances
  const newPrice = candle.close;
  const newDistance100 = calculateDistance(newPrice, newEma100);
  const newDistance200 = calculateDistance(newPrice, newEma200);

  // 3. Detect cross on EMA100
  const newCrossState: CrossState = newPrice >= newEma100 ? "ABOVE" : "BELOW";

  let lastCross: LastCross = current.lastCross;

  if (prevCrossState === "BELOW" && newCrossState === "ABOVE") {
    lastCross = "CROSS_UP";
    logger.info({ symbol: candle.symbol, price: newPrice, ema100: newEma100 }, "CROSS UP detected");
  } else if (prevCrossState === "ABOVE" && newCrossState === "BELOW") {
    lastCross = "CROSS_DOWN";
    logger.info({ symbol: candle.symbol, price: newPrice, ema100: newEma100 }, "CROSS DOWN detected");
  }

  // 4. Store updated state
  const updated = {
    ...current,
    price: newPrice,
    ema100: newEma100,
    distance100: newDistance100,
    ema200: newEma200,
    distance200: newDistance200,
    volume: candle.volume,
    crossState: newCrossState,
    lastCross,
    updatedAt: Date.now(),
  };

  set(updated);

  engineEmitter.emit("symbolUpdate", updated);
}
