import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useSymbols } from "../hooks/useSymbols";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Activity } from "lucide-react";
import { SymbolState } from "../types";

function formatVol(vol: number) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + "M";
  if (vol >= 1000) return (vol / 1000).toFixed(1) + "K";
  return vol.toString();
}

function SymbolCard({ symbol }: { symbol: SymbolState }) {
  const displaySym = symbol.symbol.replace("USDT", "");
  const [flash, setFlash] = useState(false);
  const lastUpdate = useRef(symbol.updatedAt);

  useEffect(() => {
    if (symbol.updatedAt > lastUpdate.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      lastUpdate.current = symbol.updatedAt;
      return () => clearTimeout(t);
    }
  }, [symbol.updatedAt]);

  const isPos = symbol.distance100 >= 0;
  const distColor = isPos ? "text-primary" : "text-destructive";
  const sign = isPos ? "+" : "";

  return (
    <Link href={`/symbol/${symbol.symbol}`} className="block">
      <div 
        className={`border border-border bg-card p-4 rounded-sm transition-colors hover:border-muted-foreground ${flash ? 'animate-flash' : ''}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xl font-bold font-sans tracking-tight text-foreground">{displaySym}</span>
          <span className={`text-lg font-bold font-mono ${distColor}`}>
            {sign}{symbol.distance100.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-end text-sm text-muted-foreground font-mono mt-4">
          <div className="flex flex-col gap-1">
            <span>Price: {symbol.price.toFixed(4)}</span>
            <span>EMA: {symbol.ema100.toFixed(4)}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            {symbol.volume > 0 && <span>Vol: {formatVol(symbol.volume)}</span>}
            {symbol.lastCross === "CROSS_UP" && <span className="text-primary font-bold text-xs bg-primary/10 px-2 py-0.5 rounded-sm">CROSS UP</span>}
            {symbol.lastCross === "CROSS_DOWN" && <span className="text-destructive font-bold text-xs bg-destructive/10 px-2 py-0.5 rounded-sm">CROSS DOWN</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ListingPage() {
  const { symbols, wsStatus } = useSymbols();
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    let list = Array.from(symbols.values());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q));
    }
    list.sort((a, b) => sortDesc ? b.distance100 - a.distance100 : a.distance100 - b.distance100);
    return list;
  }, [symbols, search, sortDesc]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Activity className="text-primary w-6 h-6" />
            <h1 className="text-2xl font-sans font-bold tracking-tight">EMA100 SCANNER</h1>
            <div className="flex items-center gap-2 ml-4">
              <span className={`w-2 h-2 rounded-full ${wsStatus === 'open' ? 'bg-primary' : wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-destructive'}`}></span>
              <span className="text-xs text-muted-foreground uppercase font-mono">{wsStatus}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search symbol..." 
                className="pl-9 font-mono bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setSortDesc(!sortDesc)}
              title="Toggle Sort"
              className="bg-card"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSorted.map(sym => (
            <SymbolCard key={sym.symbol} symbol={sym} />
          ))}
          {filteredAndSorted.length === 0 && symbols.size > 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground font-mono">
              No symbols match "{search}"
            </div>
          )}
          {symbols.size === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground font-mono animate-pulse">
              Loading market data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
