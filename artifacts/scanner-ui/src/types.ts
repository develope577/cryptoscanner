export interface SymbolState {
  symbol: string;
  price: number;
  ma25: number;
  ema200: number;
  distanceMa25: number;
  distanceEma200: number;
  volume: number;
  crossState: "ABOVE" | "BELOW";
  lastCross: "CROSS_UP" | "CROSS_DOWN" | null;
  updatedAt: number;
  closesBuffer: number[];
}
