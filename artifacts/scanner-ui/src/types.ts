export interface SymbolState {
  symbol: string;
  price: number;
  ema100: number;
  distance100: number;
  volume: number;
  crossState: "ABOVE" | "BELOW";
  lastCross: "CROSS_UP" | "CROSS_DOWN" | null;
  updatedAt: number;
}
