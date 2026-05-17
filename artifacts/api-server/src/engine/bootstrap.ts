import { SYMBOLS } from "./symbols.js";
import { set } from "./store.js";
import {
  calculateInitialEma,
  calculateDistance,
  EMA100_PERIOD,
  EMA100_MULTIPLIER,
  EMA200_PERIOD,
  EMA200_MULTIPLIER,
} from "./ema.js";
import { logger } from "../lib/logger.js";
import type { CrossState } from "./types.js";

const BINANCE_REST = "https://api.binance.us/api/v3/klines";
const KLINE_INTERVAL = "15m";
const KLINE_LIMIT = 400;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;

interface RawKline {
  openTime: number;
  close: number;
  volume: number;
}

async function fetchKlines(symbol: string): Promise<RawKline[]> {
  const url = `${BINANCE_REST}?symbol=${symbol}&interval=${KLINE_INTERVAL}&limit=${KLINE_LIMIT}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Binance REST error for ${symbol}: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as unknown[][];

  return raw.map((k) => ({
    openTime: k[0] as number,
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bootstrap(): Promise<void> {
  logger.info({ count: SYMBOLS.length }, "Bootstrapping symbol states from Binance");

  for (let i = 0; i < SYMBOLS.length; i += BATCH_SIZE) {
    const batch = SYMBOLS.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const klines = await fetchKlines(symbol);

          if (klines.length === 0) {
            logger.warn({ symbol }, "No klines returned, skipping");
            return;
          }

          // Drop the last candle — it may be the currently-open (not yet closed) candle.
          // Always seed EMA and set price from fully closed candles only.
          const closedKlines = klines.slice(0, -1);
          const closes = closedKlines.map((k) => k.close);
          const lastKline = closedKlines[closedKlines.length - 1]!;
          const price = lastKline.close;
          const volume = lastKline.volume;

          // EMA100: seed = SMA(100), then EMA from candle 101 onward
          const ema100 = calculateInitialEma(closes, EMA100_PERIOD, EMA100_MULTIPLIER);
          const distance100 = calculateDistance(price, ema100);

          // EMA200: seed = SMA(200), then EMA from candle 201 onward
          const ema200 = calculateInitialEma(closes, EMA200_PERIOD, EMA200_MULTIPLIER);
          const distance200 = calculateDistance(price, ema200);

          const crossState: CrossState = price >= ema100 ? "ABOVE" : "BELOW";

          set({
            symbol,
            price,
            ema100,
            distance100,
            ema200,
            distance200,
            volume,
            crossState,
            lastCross: null,
            updatedAt: Date.now(),
          });

          logger.info(
            {
              symbol,
              price,
              ema100: Math.round(ema100),
              ema200: Math.round(ema200),
              distance100: distance100.toFixed(2),
              distance200: distance200.toFixed(2),
            },
            "Bootstrapped"
          );
        } catch (err) {
          logger.error({ symbol, err }, "Failed to bootstrap symbol");
        }
      })
    );

    if (i + BATCH_SIZE < SYMBOLS.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  logger.info({ bootstrapped: symbolStateMap.size }, "Bootstrap complete");
}

import { symbolStateMap } from "./store.js";
