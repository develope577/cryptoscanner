export interface SymbolState {
  symbol: string;
  price: number;
  ma25: number;
  signal9: number;
  distanceMa25: number;
  volume: number;
  crossState: "ABOVE" | "BELOW";
  lastCross: "CROSS_UP" | "CROSS_DOWN" | null;
  updatedAt: number;
  closesBuffer: number[];
  ma25Buffer: number[];
}
