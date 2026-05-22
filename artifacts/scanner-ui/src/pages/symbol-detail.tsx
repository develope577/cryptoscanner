import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useSymbols } from "../hooks/useSymbols";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

declare global {
  interface Window {
    TradingView: any;
  }
}

function formatVol(vol: number) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + "M";
  if (vol >= 1000) return (vol / 1000).toFixed(1) + "K";
  return vol.toString();
}

export default function SymbolDetailPage() {
  const params = useParams();
  const symbolStr = params.symbol || "";
  const { symbols } = useSymbols();
  const symbol = symbols.get(symbolStr);
  const [chartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    if (!symbolStr) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      setChartLoaded(true);
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: `BINANCEUS:${symbolStr}`,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          backgroundColor: "#000000",
          gridColor: "#111111",
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: "tradingview_chart",
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbolStr]);

  const displaySym = symbolStr.replace("USDT", "");

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex-none border-b border-border bg-card p-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold font-sans tracking-tight">{displaySym}</h1>
        </div>

        {symbol && (
          <div className="flex items-center gap-6 font-mono text-sm">
            <div className={`text-lg font-bold ${symbol.distanceMa25 >= 0 ? "text-primary" : "text-destructive"}`}>
              {symbol.distanceMa25 >= 0 ? "+" : ""}{symbol.distanceMa25.toFixed(2)}% vs MA25
            </div>
            <div className="hidden sm:block">
              <span className="text-muted-foreground mr-2">PRICE</span>
              <span>{symbol.price.toFixed(4)}</span>
            </div>
            <div className="hidden md:block">
              <span className="text-muted-foreground mr-2">MA25</span>
              <span>{symbol.ma25.toFixed(4)}</span>
            </div>
            <div className="hidden md:block">
              <span className="text-muted-foreground mr-2">EMA200 4h</span>
              <span>{symbol.ema200.toFixed(4)}</span>
            </div>
            {symbol.volume > 0 && (
              <div>
                <span className="text-muted-foreground mr-2">VOL</span>
                <span>{formatVol(symbol.volume)}</span>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 w-full bg-black relative">
        {!chartLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono animate-pulse">
            Loading TradingView Chart...
          </div>
        )}
        <div id="tradingview_chart" className="w-full h-full" />
      </main>
    </div>
  );
}
