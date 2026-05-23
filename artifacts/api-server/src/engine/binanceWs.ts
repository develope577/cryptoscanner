import WebSocket from "ws";
import { SYMBOLS } from "./symbols.js";
import { processClosedCandle, process4hCandle } from "./processor.js";
import { logger } from "../lib/logger.js";

const BINANCE_WS_BASE = "wss://stream.binance.com:9443/ws";
const RECONNECT_DELAY_MS = 5000;
const SUBSCRIBE_BATCH_SIZE = 50;

interface BinanceKlinePayload {
  e: "kline";
  s: string;
  k: {
    t: number;
    T: number;
    s: string;
    i: string;
    c: string;
    v: string;
    x: boolean;
  };
}

let activeWs: WebSocket | null = null;

function buildSubscribeMessage(streams: string[], id: number) {
  return JSON.stringify({ method: "SUBSCRIBE", params: streams, id });
}

function connect(): void {
  const ws = new WebSocket(`${BINANCE_WS_BASE}/stream`);
  activeWs = ws;

  ws.on("open", () => {
    logger.info("Binance WebSocket connected");

    // Subscribe to both 15m (MA25) and 4h (EMA200) streams for all symbols
    const streams15m = SYMBOLS.map((s) => `${s.toLowerCase()}@kline_15m`);
    const streams4h = SYMBOLS.map((s) => `${s.toLowerCase()}@kline_4h`);
    const allStreams = [...streams15m, ...streams4h];

    for (let i = 0; i < allStreams.length; i += SUBSCRIBE_BATCH_SIZE) {
      const batch = allStreams.slice(i, i + SUBSCRIBE_BATCH_SIZE);
      ws.send(buildSubscribeMessage(batch, i / SUBSCRIBE_BATCH_SIZE + 1));
    }

    logger.info({ symbols: SYMBOLS.length, streams: allStreams.length }, "Subscribed to kline streams");
  });

  ws.on("message", (raw: Buffer) => {
    let parsed: { stream?: string; data?: BinanceKlinePayload } | BinanceKlinePayload;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const payload: BinanceKlinePayload | undefined =
      "data" in parsed ? parsed.data : "k" in parsed ? (parsed as BinanceKlinePayload) : undefined;

    if (!payload || payload.e !== "kline") return;

    const kline = payload.k;
    if (!kline.x) return; // Only process closed candles

    if (kline.i === "15m") {
      processClosedCandle({
        symbol: kline.s,
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
      });
    } else if (kline.i === "4h") {
      process4hCandle({
        symbol: kline.s,
        close: parseFloat(kline.c),
      });
    }
  });

  ws.on("error", (err) => {
    logger.error({ err }, "Binance WebSocket error");
  });

  ws.on("close", (code, reason) => {
    logger.warn({ code, reason: reason.toString() }, "Binance WebSocket closed — reconnecting");
    activeWs = null;
    setTimeout(connect, RECONNECT_DELAY_MS);
  });
}

export function startBinanceWs(): void {
  connect();
}

export function stopBinanceWs(): void {
  if (activeWs) {
    activeWs.removeAllListeners("close");
    activeWs.close();
    activeWs = null;
  }
}
