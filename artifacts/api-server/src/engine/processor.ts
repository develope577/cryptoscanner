import { get, set } from "./store.js";
import { updateEma, calculateDistance } from "./ema.js";
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

  const prevPrice = current.price;
  const prevEma100 = current.ema100;

  const newEma100 = updateEma(prevEma100, candle.close);
  const newPrice = candle.close;
  const newDistance100 = calculateDistance(newPrice, newEma100);

  const prevCrossState = current.crossState;
  const newCrossState: CrossState = newPrice >= newEma100 ? "ABOVE" : "BELOW";

  let lastCross: LastCross = current.lastCross;

  if (prevCrossState === "BELOW" && newCrossState === "ABOVE") {
    lastCross = "CROSS_UP";
    logger.info({ symbol: candle.symbol, price: newPrice, ema100: newEma100 }, "CROSS UP detected");
  } else if (prevCrossState === "ABOVE" && newCrossState === "BELOW") {
    lastCross = "CROSS_DOWN";
    logger.info({ symbol: candle.symbol, price: newPrice, ema100: newEma100 }, "CROSS DOWN detected");
  }

  const updated = {
    ...current,
    price: newPrice,
    ema100: newEma100,
    distance100: newDistance100,
    volume: candle.volume,
    crossState: newCrossState,
    lastCross,
    updatedAt: Date.now(),
  };

  set(updated);

  engineEmitter.emit("symbolUpdate", updated);
}
