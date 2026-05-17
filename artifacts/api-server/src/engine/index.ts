export { engineEmitter } from "./emitter.js";

import { bootstrap } from "./bootstrap.js";
import { startBinanceWs } from "./binanceWs.js";
import { logger } from "../lib/logger.js";

export async function startEngine(): Promise<void> {
  logger.info("Starting scanner engine");

  await bootstrap();

  startBinanceWs();

  logger.info("Scanner engine running");
}
