import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { engineEmitter } from "./engine/index.js";
import type { SymbolState } from "./engine/types.js";
import { logger } from "./lib/logger.js";

export function createWsServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket) => {
    logger.info("Frontend WS client connected");

    ws.on("close", () => {
      logger.info("Frontend WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "Frontend WS client error");
    });
  });

  engineEmitter.on("symbolUpdate", (state: SymbolState) => {
    const payload = JSON.stringify({ type: "symbolUpdate", data: state });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  });

  logger.info("Frontend WebSocket push server ready at /api/ws");

  return wss;
}
