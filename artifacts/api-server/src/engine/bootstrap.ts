import { SYMBOLS } from "./symbols.js";
import { set } from "./store.js";
import { bootstrapMA25, calcDistance } from "./ma.js";
import { calculateInitialEma200 } from "./ema.js";
import { logger } from "../lib/logger.js";
import type { CrossState } from "./types.js";

const BINANCE_REST = "https://api.binance.com/api/v3/klines";
const KLINE_LIMIT = 1000; // Binance max
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;

interface RawKline {
  close: number;
  volume: number;
}

async function fetchKlines(symbol: string, interval: string): Promise<RawKline[]> {
  const url = `${BINANCE_REST}?symbol=${symbol}&interval=${interval}&limit=${KLINE_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Binance REST error for ${symbol} ${interval}: ${res.status} ${res.statusText}`);
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
          // Fetch 15m candles for MA25 and 4h candles for EMA200 in parallel
          const [klines15m, klines4h] = await Promise.all([
            fetchKlines(symbol, "15m"),
            fetchKlines(symbol, "4h"),
          ]);

          if (klines15m.length === 0) {
            logger.warn({ symbol }, "No 15m klines returned, skipping");
            return;
          }

          // Drop last candle (may be open) from both intervals
          const closed15m = klines15m.slice(0, -1);
          const closed4h = klines4h.slice(0, -1);

          const closes15m = closed15m.map((k) => k.close);
          const closes4h = closed4h.map((k) => k.close);

          const lastKline = closed15m[closed15m.length - 1]!;
          const price = lastKline.close;
          const volume = lastKline.volume;

          // MA25 from 15m closes
          const { closesBuffer, ma25 } = bootstrapMA25(closes15m);
          const distanceMa25 = calcDistance(price, ma25);
          const crossState: CrossState = price >= ma25 ? "ABOVE" : "BELOW";

          // EMA200 from 4h closes — seeded with SMA(200), display only
          const ema200 = calculateInitialEma200(closes4h);
          const distanceEma200 = calcDistance(price, ema200);

          set({
            symbol,
            price,
            ma25,
            ema200,
            distanceMa25,
            distanceEma200,
            volume,
            crossState,
            lastCross: null,
            updatedAt: Date.now(),
            closesBuffer,
          });

          logger.info(
            {
              symbol,
              price,
              ma25: ma25.toFixed(4),
              ema200: ema200.toFixed(4),
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
