import type { SymbolState } from "./types.js";

export const symbolStateMap = new Map<string, SymbolState>();

export function getAll(): SymbolState[] {
  return Array.from(symbolStateMap.values());
}

export function get(symbol: string): SymbolState | undefined {
  return symbolStateMap.get(symbol);
}

export function set(state: SymbolState): void {
  symbolStateMap.set(state.symbol, state);
}
