import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import SchoolLayout from "@/layouts/school-layout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { createChart, ColorType, CandlestickSeries, CandlestickData, Time } from "lightweight-charts";
import {
  TrendingUp, TrendingDown, DollarSign, Settings, X, ChevronDown,
  Palette, Layout, BarChart2, Zap, RefreshCw, Activity
} from "lucide-react";
import type { Trade } from "@shared/schema";

const SYMBOLS = [
  "AAPL", "TSLA", "GOOGL", "MSFT", "NVDA", "META", "AMZN",
  "BTC/USD", "ETH/USD", "SOL/USD",
  "SPY", "QQQ"
];

const SYMBOL_BASE_PRICES: Record<string, number> = {
  AAPL: 195, TSLA: 420, GOOGL: 175, MSFT: 430, NVDA: 140, META: 590, AMZN: 220,
  "BTC/USD": 102000, "ETH/USD": 3900, "SOL/USD": 225,
  SPY: 605, QQQ: 525,
};

const CHART_THEMES = {
  default: { name: "Default", up: "#26a69a", down: "#ef5350", bg: "#0d1a2e", grid: "#1e3050" },
  neon: { name: "Neon", up: "#39ff14", down: "#ff2079", bg: "#0a0015", grid: "#1a0030" },
  ocean: { name: "Ocean", up: "#00bfff", down: "#ff6b6b", bg: "#011627", grid: "#012a45" },
  sunset: { name: "Sunset", up: "#f9a825", down: "#e53935", bg: "#1a0a00", grid: "#2d1500" },
  matrix: { name: "Matrix", up: "#00ff41", down: "#00cc33", bg: "#001100", grid: "#003300" },
};

type ThemeKey = keyof typeof CHART_THEMES;
type LayoutKey = "standard" | "compact" | "wide";

interface SimSettings {
  theme: ThemeKey;
  layout: LayoutKey;
  showVolume: boolean;
  showGrid: boolean;
}

const DEFAULT_SETTINGS: SimSettings = { theme: "default", layout: "standard", showVolume: true, showGrid: true };

function generateCandles(count: number, basePrice: number): CandlestickData[] {
  const data: CandlestickData[] = [];
  let price = basePrice;
  const now = Date.now();
  const interval = 60000;
  for (let i = count; i >= 0; i--) {
    const time = Math.floor((now - i * interval) / 1000) as Time;
    const change = (Math.random() - 0.5) * 0.004 * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 0.002 * price;
    const low = Math.min(open, close) - Math.random() * 0.002 * price;
    data.push({ time, open, high, low, close });
    price = close;
  }
  return data;
}

export default function SchoolSimulator() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [symbol, setSymbol] = useState("BTC/USD");
  const [price, setPrice] = useState(SYMBOL_BASE_PRICES["BTC/USD"]);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SimSettings>(() => {
    try {
      const s = localStorage.getItem("school-sim-settings");
      return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const theme = CHART_THEMES[settings.theme];

  const saveSettings = (next: SimSettings) => {
    setSettings(next);
    localStorage.setItem("school-sim-settings", JSON.stringify(next));
  };

  const { data: openTrades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades?open=true"],
    refetchInterval: 5000,
  });

  const tradeMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/trades", data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/trades?open=true"] });
      refreshUser();
      toast({ title: `${side === "buy" ? "🟢 Bought" : "🔴 Sold"} ${quantity} ${symbol}`, description: `@ $${price.toFixed(2)}` });
    },
    onError: (e: any) => toast({ title: "Trade failed", description: e.message, variant: "destructive" }),
  });

  const { data: classData } = useQuery<any>({
    queryKey: ["/api/classroom"],
    enabled: user?.role === "student",
  });
  const classId = classData?.class?.id;

  const closeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const res = await apiRequest("PATCH", `/api/trades/${tradeId}/close`, { exitPrice: price });
      return res.json();
    },
    onSuccess: async (trade: any) => {
      await qc.invalidateQueries({ queryKey: ["/api/trades?open=true"] });
      refreshUser();
      const profit = trade?.profit ?? 0;
      if (profit > 0 && classId) {
        try {
          const r = await apiRequest("POST", "/api/economy/convert-profit", { classId, profit });
          const data = await r.json();
          if (data.amount > 0) {
            toast({ title: "Trade closed!", description: `Profit converted: +${data.amount} class coins 🪙` });
            qc.invalidateQueries({ queryKey: ["/api/economy/balance", classId] });
            return;
          }
        } catch {}
      }
      toast({ title: "Trade closed", description: profit >= 0 ? `Profit: $${profit?.toFixed(2) ?? "0"}` : `Loss: $${Math.abs(profit ?? 0).toFixed(2)}` });
    },
    onError: (e: any) => toast({ title: "Failed to close", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    const initial = generateCandles(200, SYMBOL_BASE_PRICES[symbol] ?? 100);
    setCandles(initial);
    setPrice(initial[initial.length - 1].close);
  }, [symbol]);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: { background: { type: ColorType.Solid, color: theme.bg }, textColor: "#94a3b8" },
      grid: {
        vertLines: { color: settings.showGrid ? theme.grid : "transparent" },
        horzLines: { color: settings.showGrid ? theme.grid : "transparent" },
      },
      rightPriceScale: { borderColor: theme.grid },
      timeScale: { borderColor: theme.grid, timeVisible: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: theme.up, downColor: theme.down,
      borderUpColor: theme.up, borderDownColor: theme.down,
      wickUpColor: theme.up, wickDownColor: theme.down,
    });
    series.setData(candles);
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { ro.disconnect(); };
  }, [candles, settings.theme, settings.showGrid]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice(prev => {
        const change = (Math.random() - 0.5) * 0.004 * prev;
        const newPrice = Math.max(prev + change, 0.01);
        const now = Math.floor(Date.now() / 1000) as Time;
        if (seriesRef.current) {
          seriesRef.current.update({ time: now, open: prev, high: Math.max(prev, newPrice), low: Math.min(prev, newPrice), close: newPrice });
        }
        return newPrice;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { toast({ title: "Invalid quantity", variant: "destructive" }); return; }
    tradeMutation.mutate({ symbol, type: side, quantity: qty, entryPrice: price, orderType: "market", leverage: 1 });
  };

  const calcPnl = (t: Trade) => {
    const mult = t.type === "buy" ? 1 : -1;
    return ((price - t.entryPrice) / t.entryPrice) * t.entryPrice * t.quantity * mult * (t.leverage ?? 1);
  };

  const chartColSpan = settings.layout === "wide" ? "col-span-3" : settings.layout === "compact" ? "col-span-2" : "col-span-2";

  const isPrimary = false;

  return (
    <SchoolLayout>
      <div className="flex flex-col h-full overflow-hidden" style={{ background: "#081220" }}>
        <div className="px-4 py-3 border-b border-[#1e3050] flex items-center gap-3 bg-[#0d1526] flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <h1 className="font-black text-white text-base">School Simulator</h1>

          <div className="flex items-center gap-1.5 ml-2">
            {SYMBOLS.map(s => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                data-testid={`symbol-${s}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${symbol === s ? "bg-teal-600 text-white" : "bg-white/8 text-slate-400 hover:bg-white/15 hover:text-white"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="h-4 w-4 text-teal-400" />
              <span className="font-black text-teal-400">{price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <span className="text-xs text-slate-400">Balance:</span>
            <span className="text-xs font-bold text-white">${(user as any)?.simulatorBalance?.toLocaleString() ?? "5,000"}</span>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              data-testid="button-sim-settings"
              className={`ml-2 p-1.5 rounded-lg transition-all ${settingsOpen ? "bg-teal-600 text-white" : "bg-white/8 text-slate-400 hover:bg-white/15"}`}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {settingsOpen && (
            <div className="w-64 flex-shrink-0 border-r border-[#1e3050] bg-[#0d1526] p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-white text-sm">Customise</h2>
                <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-teal-400" />
                  <p className="text-xs font-bold text-white">Chart Theme</p>
                </div>
                <div className="space-y-1.5">
                  {(Object.entries(CHART_THEMES) as [ThemeKey, typeof CHART_THEMES.default][]).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => saveSettings({ ...settings, theme: key })}
                      data-testid={`theme-${key}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${settings.theme === key ? "bg-teal-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"}`}
                    >
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-sm" style={{ background: t.up }} />
                        <span className="w-3 h-3 rounded-sm" style={{ background: t.down }} />
                      </div>
                      {t.name}
                      {settings.theme === key && <Zap className="h-3 w-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layout className="h-4 w-4 text-teal-400" />
                  <p className="text-xs font-bold text-white">Layout</p>
                </div>
                <div className="space-y-1.5">
                  {(["standard", "compact", "wide"] as LayoutKey[]).map(l => (
                    <button
                      key={l}
                      onClick={() => saveSettings({ ...settings, layout: l })}
                      data-testid={`layout-${l}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${settings.layout === l ? "bg-teal-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"}`}
                    >
                      {l}
                      {settings.layout === l && <Zap className="h-3 w-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="h-4 w-4 text-teal-400" />
                  <p className="text-xs font-bold text-white">Display</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => saveSettings({ ...settings, showGrid: !settings.showGrid })}
                    data-testid="toggle-grid"
                    className={`w-9 h-5 rounded-full transition-all relative ${settings.showGrid ? "bg-teal-600" : "bg-white/20"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.showGrid ? "left-4" : "left-0.5"}`} />
                  </div>
                  <span className="text-xs text-slate-400">Show Grid</span>
                </label>
              </div>

              <button
                onClick={() => saveSettings(DEFAULT_SETTINGS)}
                data-testid="button-reset-settings"
                className="mt-5 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white text-xs font-semibold transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                Reset to Default
              </button>
            </div>
          )}

          <div className={`flex flex-1 overflow-hidden ${settings.layout === "wide" ? "flex-col" : ""}`}>
            <div ref={containerRef} className="flex-1 min-h-0" style={{ background: theme.bg }} />

            <div className={`flex-shrink-0 overflow-y-auto border-l border-[#1e3050] ${settings.layout === "compact" ? "w-56" : "w-72"} bg-[#0d1526]`}>
              <div className="p-4 border-b border-[#1e3050]">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Place Trade</p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    onClick={() => setSide("buy")}
                    data-testid="button-buy"
                    className={`py-2.5 rounded-xl text-sm font-black transition-all ${side === "buy" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setSide("sell")}
                    data-testid="button-sell"
                    className={`py-2.5 rounded-xl text-sm font-black transition-all ${side === "sell" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                  >
                    SELL
                  </button>
                </div>
                <div className="mb-3">
                  <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    data-testid="input-quantity"
                    className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold focus:border-teal-500/50 outline-none"
                  />
                </div>
                <div className="mb-3 p-3 rounded-xl bg-white/5">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Price</span>
                    <span className="text-white font-bold">${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Value</span>
                    <span className="text-teal-400 font-bold">${(price * parseFloat(quantity || "0")).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <button
                  onClick={handleTrade}
                  disabled={tradeMutation.isPending}
                  data-testid="button-execute-trade"
                  className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                    side === "buy"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20"
                      : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/20"
                  } disabled:opacity-50`}
                >
                  {tradeMutation.isPending ? "..." : `${side === "buy" ? "BUY" : "SELL"} ${symbol}`}
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  Open Positions
                  {(openTrades as Trade[]).filter(t => t.symbol === symbol).length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">
                      {(openTrades as Trade[]).filter(t => t.symbol === symbol).length}
                    </span>
                  )}
                </p>
                {(openTrades as Trade[]).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No open positions</p>
                ) : (
                  <div className="space-y-2">
                    {(openTrades as Trade[]).map(t => {
                      const pnl = calcPnl(t);
                      const pnlPct = ((pnl / (t.entryPrice * t.quantity)) * 100).toFixed(2);
                      return (
                        <div key={t.id} data-testid={`position-${t.id}`} className="p-3 rounded-xl bg-white/5 border border-white/8">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {t.type === "buy"
                                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                              <span className="text-white font-bold text-xs">{t.symbol}</span>
                            </div>
                            <button
                              onClick={() => closeMutation.mutate(t.id)}
                              data-testid={`close-trade-${t.id}`}
                              className="text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Qty: {t.quantity}</span>
                            <span className={`font-black ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
