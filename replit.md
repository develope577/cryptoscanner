# Crypto EMA Scanner

A real-time backend that tracks crypto symbol prices, calculates EMA100 incrementally, and pushes live updates to any connected frontend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet used — all state is in-memory)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Real-time: `ws` library (WebSocket to Binance.US + push server to frontend)

## Where things live

- Symbol list: `artifacts/api-server/src/engine/symbols.ts` — edit this to change tracked symbols
- In-memory store: `artifacts/api-server/src/engine/store.ts` — single Map, single source of truth
- EMA logic: `artifacts/api-server/src/engine/ema.ts` — incremental EMA calculation
- Candle processor: `artifacts/api-server/src/engine/processor.ts` — handles closed candles, updates state, emits events
- Binance WS: `artifacts/api-server/src/engine/binanceWs.ts` — subscribes to kline streams
- Bootstrap: `artifacts/api-server/src/engine/bootstrap.ts` — seeds EMA100 from 200 candles on startup
- Frontend WS push: `artifacts/api-server/src/wsServer.ts` — broadcasts updates to UI clients
- REST routes: `artifacts/api-server/src/routes/symbols.ts`

## Architecture decisions

- **Incremental EMA only** — EMA100 is updated in O(1) per closed candle using `(close - prevEMA) * multiplier + prevEMA`. No historical recalculation after bootstrap.
- **Closed candles only** — Binance sends tick updates continuously; we ignore all candles where `x !== true` (not yet closed). This massively reduces CPU load.
- **RAM as single source of truth** — `symbolStateMap` (a `Map<string, SymbolState>`) holds all live state. The database is not used for scanner state.
- **Internal EventEmitter** — `engineEmitter` decouples the scanner engine from the WebSocket push server. Processor emits `symbolUpdate`, WS server listens and broadcasts.
- **Binance.US API** — Used instead of binance.com because Replit servers are US-based and binance.com returns HTTP 451 (geo-blocked).

## Product

- `GET /api/symbols` — returns current state of all tracked symbols (used for frontend initial load)
- `GET /api/symbols/:symbol` — returns state for a single symbol
- `ws://<host>/api/ws` — WebSocket endpoint; backend pushes `{ type: "symbolUpdate", data: SymbolState }` on every closed candle

## SymbolState shape

```ts
{
  symbol: string;          // e.g. "BTCUSDT"
  price: number;           // last closed candle close price
  ma25: number;            // SMA of last 25 closes
  signal9: number;         // SMA of last 9 MA25 values (smoothing line)
  distanceMa25: number;    // (price - ma25) / ma25 * 100 — positive = above MA25
  volume: number;          // last closed candle volume
  crossState: "ABOVE" | "BELOW";
  lastCross: "CROSS_UP" | "CROSS_DOWN" | null;
  updatedAt: number;       // Unix timestamp ms
  closesBuffer: number[];  // last 25 closes (rolling window for live MA25)
  ma25Buffer: number[];    // last 9 MA25 values (rolling window for live Signal9)
}
```

## Indicator logic

- **MA25**: simple average of last 25 closed candle closes — exact match with TradingView, no warmup needed
- **Signal9**: SMA of last 9 MA25 values — smoothing line, like a signal line on MA25
- Bootstrap seeds both from 999 closed candles (1000 fetched, last open one dropped)
- Live updates roll the buffers on each closed 15m candle: drop oldest, add new close, recompute

## User preferences

- Using MA25 + Signal9 (SMA9 of MA25) instead of EMA — simpler, matches TradingView exactly
- Symbol list is a placeholder; user will provide the full list

## Gotchas

- The last candle from Binance REST bootstrap may be an open (in-progress) candle — its volume will be partial and will update on next close
- Binance.US does not list all Binance global pairs — verify new symbols exist on binance.us before adding
- `engineEmitter` lives in `engine/emitter.ts` to avoid circular imports between `engine/index.ts` and `engine/processor.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
