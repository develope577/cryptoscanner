import { EventEmitter } from "events";
import type { SymbolState } from "./types.js";

declare interface EngineEmitter {
  emit(event: "symbolUpdate", state: SymbolState): boolean;
  on(event: "symbolUpdate", listener: (state: SymbolState) => void): this;
}

class EngineEmitter extends EventEmitter {}

export const engineEmitter = new EngineEmitter();
