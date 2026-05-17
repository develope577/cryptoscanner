import { createServer } from "http";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startEngine } from "./engine/index.js";
import { createWsServer } from "./wsServer.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

createWsServer(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

startEngine().catch((err) => {
  logger.error({ err }, "Scanner engine failed to start");
  process.exit(1);
});
