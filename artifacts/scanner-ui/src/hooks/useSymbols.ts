import { useState, useEffect, useRef, useCallback } from "react";
import { SymbolState } from "../types";

export function useSymbols() {
  const [symbols, setSymbols] = useState<Map<string, SymbolState>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<"connecting" | "open" | "closed">("closed");
  const wsRef = useRef<WebSocket | null>(null);

  const fetchInitial = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/symbols");
      const data: SymbolState[] = await res.json();
      setSymbols((prev) => {
        const next = new Map(prev);
        for (const sym of data) {
          next.set(sym.symbol, sym);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to fetch initial symbols", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();

    const connectWs = () => {
      setWsStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus("open");
      ws.onclose = () => setWsStatus("closed");
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "symbolUpdate" && msg.data) {
            setSymbols((prev) => {
              const next = new Map(prev);
              next.set(msg.data.symbol, msg.data);
              return next;
            });
          }
        } catch (e) {
          console.error("Failed to parse ws message", e);
        }
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchInitial]);

  return { symbols, isLoading, wsStatus };
}
