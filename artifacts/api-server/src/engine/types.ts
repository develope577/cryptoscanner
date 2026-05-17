export type CrossState = "ABOVE" | "BELOW";
export type LastCross = "CROSS_UP" | "CROSS_DOWN" | null;

export interface SymbolState {
  symbol: string;
  price: number;
  ma25: number;
  signal9: number;
  distanceMa25: number;
  volume: number;
  crossState: CrossState;
  lastCross: LastCross;
  updatedAt: number;
  closesBuffer: number[];
  ma25Buffer: number[];
}
