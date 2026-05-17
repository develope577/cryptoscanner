import WebSocket from "ws";
import { SYMBOLS } from "./symbols.js";
import { processClosedCandle } from "./processor.js";
import { logger } from "../lib/logger.js";

const BINANCE_WS_BASE = "wss://stream.binance.us:9443/ws";
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

function buildSubscribeMessage(symbols: string[], id: number) {
  const streams = symbols.map((s) => `${s.toLowerCase()}@kline_1m`);
  return JSON.stringify({ method: "SUBSCRIBE", params: streams, id });
}

function connect(): void {
  const ws = new WebSocket(`${BINANCE_WS_BASE}/stream`);
  activeWs = ws;

  ws.on("open", () => {
    logger.info("Binance WebSocket connected");

    for (let i = 0; i < SYMBOLS.length; i += SUBSCRIBE_BATCH_SIZE) {
      const batch = SYMBOLS.slice(i, i + SUBSCRIBE_BATCH_SIZE);
      const msg = buildSubscribeMessage(batch, i / SUBSCRIBE_BATCH_SIZE + 1);
      ws.send(msg);
    }

    logger.info({ count: SYMBOLS.length }, "Subscribed to kline streams");
  });

  ws.on("message", (raw: Buffer) => {
    let parsed: { stream?: string; data?: BinanceKlinePayload } | BinanceKlinePayload;

    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const payload: BinanceKlinePayload | undefined =
      "data" in parsed ? parsed.data : ("k" in parsed ? (parsed as BinanceKlinePayload) : undefined);

    if (!payload || payload.e !== "kline") return;

    const kline = payload.k;

    if (!kline.x) return;

    processClosedCandle({
      symbol: kline.s,
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
    });
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
