import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, CheckCircle2, RefreshCw, Minus, Plus } from "lucide-react";
import type { SimulationChallenge } from "@shared/schema";

interface SimulatedPrices {
  [symbol: string]: number;
}

interface Holding {
  quantity: number;
  avgCost: number;
}

interface CompletedTrade {
  symbol: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  pnl?: number;
}

interface Props {
  challenge: SimulationChallenge;
  onPassed: () => void;
  isCompleted?: boolean;
}

export function LessonSimulator({ challenge, onPassed, isCompleted }: Props) {
  const [balance, setBalance] = useState(challenge.startingBalance);
  const [holdings, setHoldings] = useState<Record<string, Holding>>({});
  const [completedTrades, setCompletedTrades] = useState<CompletedTrade[]>([]);
  const [passed, setPassed] = useState(isCompleted ?? false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"trade" | "positions">("trade");

  const { data: pricesData } = useQuery<SimulatedPrices>({
    queryKey: ["/api/simulated-prices"],
    refetchInterval: 5000,
  });

  const prices = pricesData ?? {};

  const allowedSymbols = challenge.allowedSymbols?.length > 0
    ? challenge.allowedSymbols
    : Object.keys(prices).slice(0, 6);

  const totalHoldingsValue = Object.entries(holdings).reduce((sum, [sym, h]) => {
    return sum + (prices[sym] ?? 0) * h.quantity;
  }, 0);

  const totalPortfolioValue = balance + totalHoldingsValue;
  const totalPnl = totalPortfolioValue - challenge.startingBalance;
  const pnlPct = (totalPnl / challenge.startingBalance) * 100;

  function getProgress(): number {
    switch (challenge.targetType) {
      case "profit_pct":
        return Math.min(100, Math.max(0, (pnlPct / challenge.targetValue) * 100));
      case "profit_amount":
        return Math.min(100, Math.max(0, (totalPnl / challenge.targetValue) * 100));
      case "any_profit":
        return completedTrades.some(t => (t.pnl ?? 0) > 0) ? 100 : 0;
      case "complete_trade":
        return completedTrades.length > 0 ? 100 : 0;
    }
  }

  function isTargetMet(): boolean {
    switch (challenge.targetType) {
      case "profit_pct": return pnlPct >= challenge.targetValue;
      case "profit_amount": return totalPnl >= challenge.targetValue;
      case "any_profit": return completedTrades.some(t => (t.pnl ?? 0) > 0);
      case "complete_trade": return completedTrades.length > 0;
    }
  }

  function getTargetLabel(): string {
    switch (challenge.targetType) {
      case "profit_pct": return `${challenge.targetValue}% profit`;
      case "profit_amount": return `$${challenge.targetValue.toLocaleString()} profit`;
      case "any_profit": return "Make a profitable trade";
      case "complete_trade": return "Complete any trade";
    }
  }

  function handleBuy(symbol: string) {
    const price = prices[symbol];
    const qty = quantities[symbol] || 1;
    if (!price || qty <= 0) return;
    const cost = price * qty;
    if (cost > balance) return;
    setBalance(b => b - cost);
    setHoldings(h => {
      const existing = h[symbol];
      if (existing) {
        const newQty = existing.quantity + qty;
        const newAvg = ((existing.avgCost * existing.quantity) + cost) / newQty;
        return { ...h, [symbol]: { quantity: newQty, avgCost: newAvg } };
      }
      return { ...h, [symbol]: { quantity: qty, avgCost: price } };
    });
  }

  function handleSell(symbol: string) {
    const holding = holdings[symbol];
    const price = prices[symbol];
    const qty = quantities[symbol] || holding?.quantity || 1;
    if (!holding || !price || qty <= 0 || qty > holding.quantity) return;
    const proceeds = price * qty;
    const costBasis = holding.avgCost * qty;
    const pnl = proceeds - costBasis;
    setBalance(b => b + proceeds);
    setHoldings(h => {
      const remaining = holding.quantity - qty;
      if (remaining <= 0) {
        const { [symbol]: _, ...rest } = h;
        return rest;
      }
      return { ...h, [symbol]: { ...holding, quantity: remaining } };
    });
    setCompletedTrades(t => [...t, { symbol, type: "sell", quantity: qty, price, pnl }]);
  }

  useEffect(() => {
    if (!passed && isTargetMet()) {
      setPassed(true);
      setTimeout(() => onPassed(), 800);
    }
  }, [balance, holdings, completedTrades]);

  const progress = getProgress();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Target className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Simulation Challenge</p>
            <p className="text-xs text-muted-foreground">
              {challenge.description || `Target: ${getTargetLabel()}`}
            </p>
          </div>
        </div>
        {passed && (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1.5">
            <CheckCircle2 className="h-3 w-3" /> Passed
          </Badge>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Balance</p>
          <p className="text-sm font-bold">${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">P&L</p>
          <p className={`text-sm font-bold flex items-center gap-1 ${totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {totalPnl >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)</span>
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Target</p>
          <p className="text-sm font-bold text-foreground">{getTargetLabel()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progress toward target</span>
          <span className="text-xs font-bold text-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${passed ? "bg-emerald-500" : "bg-blue-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(["trade", "positions"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${tab === t ? "text-blue-500 border-b-2 border-blue-500" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "positions" ? `Positions (${Object.keys(holdings).length})` : "Trade"}
          </button>
        ))}
      </div>

      {/* Trade tab */}
      {tab === "trade" && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {allowedSymbols.filter(s => prices[s]).map(symbol => {
            const price = prices[symbol];
            const qty = quantities[symbol] || 1;
            const canBuy = price * qty <= balance;
            const hasHolding = !!holdings[symbol];
            return (
              <div key={symbol} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{symbol}</p>
                    <p className="text-sm font-semibold">${price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {hasHolding && (
                    <p className="text-[10px] text-muted-foreground">
                      Holding: {holdings[symbol].quantity} @ ${holdings[symbol].avgCost.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQuantities(q => ({ ...q, [symbol]: Math.max(1, (q[symbol] || 1) - 1) }))} className="w-5 h-5 rounded bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-xs font-mono w-6 text-center">{qty}</span>
                    <button onClick={() => setQuantities(q => ({ ...q, [symbol]: (q[symbol] || 1) + 1 }))} className="w-5 h-5 rounded bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10" onClick={() => handleBuy(symbol)} disabled={!canBuy || passed}>
                      Buy
                    </Button>
                    {hasHolding && (
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-red-500/40 text-red-500 hover:bg-red-500/10" onClick={() => handleSell(symbol)} disabled={passed}>
                        Sell
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Positions tab */}
      {tab === "positions" && (
        <div className="p-3 max-h-64 overflow-y-auto">
          {Object.keys(holdings).length === 0 && completedTrades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No positions yet. Switch to Trade to buy.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(holdings).map(([symbol, h]) => {
                const price = prices[symbol] ?? 0;
                const currentValue = price * h.quantity;
                const costBasis = h.avgCost * h.quantity;
                const pnl = currentValue - costBasis;
                return (
                  <div key={symbol} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <div>
                      <p className="text-sm font-bold">{symbol}</p>
                      <p className="text-xs text-muted-foreground">{h.quantity} shares · avg ${h.avgCost.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${currentValue.toFixed(2)}</p>
                      <p className={`text-xs font-medium ${pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {pnl >= 0 ? "+" : ""}{((pnl / costBasis) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {completedTrades.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-1">Closed Trades</p>
                  {completedTrades.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                      <span>{t.symbol} · {t.type.toUpperCase()} {t.quantity}</span>
                      {t.pnl !== undefined && (
                        <span className={t.pnl >= 0 ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                          {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pass message */}
      {passed && (
        <div className="px-4 py-3 bg-emerald-500/10 border-t border-emerald-500/30 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {isCompleted ? "You've already passed this challenge." : "Challenge complete! Lesson will be marked as done."}
          </p>
        </div>
      )}
    </div>
  );
}
