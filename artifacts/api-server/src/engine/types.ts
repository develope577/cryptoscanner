export type CrossState = "ABOVE" | "BELOW";
export type LastCross = "CROSS_UP" | "CROSS_DOWN" | null;

export interface SymbolState {
  symbol: string;
  price: number;
  ema100: number;
  distance100: number;
  volume: number;
  crossState: CrossState;
  lastCross: LastCross;
  updatedAt: number;
}
