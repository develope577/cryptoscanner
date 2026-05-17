import { SYMBOLS } from "./symbols.js";
import { set } from "./store.js";
import { bootstrapBuffers, calcDistance } from "./ma.js";
import { logger } from "../lib/logger.js";
import type { CrossState } from "./types.js";

const BINANCE_REST = "https://api.binance.us/api/v3/klines";
const KLINE_INTERVAL = "15m";
const KLINE_LIMIT = 1000; // Binance max
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;

interface RawKline {
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

          // Drop the last candle — it may be the currently-open (not yet closed) candle
          const closed = klines.slice(0, -1);
          const closes = closed.map((k) => k.close);
          const lastKline = closed[closed.length - 1]!;
          const price = lastKline.close;
          const volume = lastKline.volume;

          // MA25: SMA of last 25 closes. Signal9: SMA of last 9 MA25 values.
          const { closesBuffer, ma25Buffer, ma25, signal9 } = bootstrapBuffers(closes);
          const distanceMa25 = calcDistance(price, ma25);
          const crossState: CrossState = price >= ma25 ? "ABOVE" : "BELOW";

          set({
            symbol,
            price,
            ma25,
            signal9,
            distanceMa25,
            volume,
            crossState,
            lastCross: null,
            updatedAt: Date.now(),
            closesBuffer,
            ma25Buffer,
          });

          logger.info(
            {
              symbol,
              price,
              ma25: ma25.toFixed(4),
              signal9: signal9.toFixed(4),
              distanceMa25: distanceMa25.toFixed(2),
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
