import { get, set } from "./store.js";
import { calcMA25, calcSignal9, calcDistance, MA25_PERIOD, SIGNAL9_PERIOD } from "./ma.js";
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

  // 1. Roll closes buffer: drop oldest, add new close
  const closesBuffer = [...current.closesBuffer.slice(-(MA25_PERIOD - 1)), candle.close];

  // 2. Compute new MA25
  const ma25 = calcMA25(closesBuffer);

  // 3. Roll MA25 buffer: drop oldest, add new MA25
  const ma25Buffer = [...current.ma25Buffer.slice(-(SIGNAL9_PERIOD - 1)), ma25];

  // 4. Compute new Signal9
  const signal9 = calcSignal9(ma25Buffer);

  // 5. Compute distance and cross state
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

  // 6. Store and emit
  const updated = {
    ...current,
    price: newPrice,
    ma25,
    signal9,
    distanceMa25,
    volume: candle.volume,
    crossState: newCrossState,
    lastCross,
    updatedAt: Date.now(),
    closesBuffer,
    ma25Buffer,
  };

  set(updated);
  engineEmitter.emit("symbolUpdate", updated);
}
