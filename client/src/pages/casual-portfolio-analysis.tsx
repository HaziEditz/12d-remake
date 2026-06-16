import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, BarChart2, PieChart,
  Activity, Shield, ArrowUpRight, ArrowDownRight,
  Wallet, Layers, RefreshCw, ChevronRight, Zap,
  Target, AlertTriangle, Star
} from "lucide-react";
import type { SimulatedTrade } from "@shared/schema";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#06b6d4",
  Energy: "#f59e0b",
  Finance: "#8b5cf6",
  Healthcare: "#10b981",
  Consumer: "#f97316",
  Industrial: "#6366f1",
  Crypto: "#ec4899",
  Other: "#64748b",
};

function getSector(symbol: string): string {
  const tech = ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "TSLA", "AMZN"];
  const energy = ["XOM", "CVX", "BP", "SHEL"];
  const finance = ["JPM", "BAC", "GS", "MS", "V", "MA"];
  const healthcare = ["JNJ", "PFE", "UNH", "MRK"];
  const crypto = ["BTC", "ETH", "BNB", "SOL", "ADA"];
  if (tech.some(t => symbol.includes(t))) return "Technology";
  if (energy.some(t => symbol.includes(t))) return "Energy";
  if (finance.some(t => symbol.includes(t))) return "Finance";
  if (healthcare.some(t => symbol.includes(t))) return "Healthcare";
  if (crypto.some(t => symbol.includes(t))) return "Crypto";
  return "Other";
}

function StatCard({ label, value, sub, icon: Icon, trend, color = "teal" }: any) {
  const colorMap: Record<string, string> = {
    teal: "bg-teal-500/10 border-teal-500/20 text-teal-400",
    green: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}

export default function CasualPortfolioAnalysis() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "pnl" | "risk" | "sectors">("overview");

  const { data: tradesRaw = [], isLoading } = useQuery<SimulatedTrade[]>({
    queryKey: ["/api/simulator/trades"],
  });

  const { data: portfolio } = useQuery<any>({
    queryKey: ["/api/simulator/portfolio"],
  });

  const trades = tradesRaw as SimulatedTrade[];

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.exitPrice != null);
    const open = trades.filter(t => t.exitPrice == null);

    const totalPnl = closed.reduce((acc, t) => {
      const pnl = t.type === "long"
        ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
        : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
      return acc + pnl;
    }, 0);

    const wins = closed.filter(t => {
      const pnl = t.type === "long"
        ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
        : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
      return pnl > 0;
    });

    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

    const avgWin = wins.length > 0
      ? wins.reduce((acc, t) => {
        const pnl = t.type === "long"
          ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
          : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
        return acc + pnl;
      }, 0) / wins.length
      : 0;

    const losses = closed.filter(t => {
      const pnl = t.type === "long"
        ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
        : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
      return pnl < 0;
    });

    const avgLoss = losses.length > 0
      ? Math.abs(losses.reduce((acc, t) => {
        const pnl = t.type === "long"
          ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
          : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
        return acc + pnl;
      }, 0) / losses.length)
      : 0;

    const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0;

    const sectorMap: Record<string, { count: number; pnl: number }> = {};
    for (const t of closed) {
      const sector = getSector(t.symbol);
      if (!sectorMap[sector]) sectorMap[sector] = { count: 0, pnl: 0 };
      sectorMap[sector].count++;
      const pnl = t.type === "long"
        ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
        : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
      sectorMap[sector].pnl += pnl;
    }

    const pnlHistory = closed
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .reduce((acc: { date: string; cumPnl: number }[], t) => {
        const pnl = t.type === "long"
          ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
          : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
        const last = acc.length > 0 ? acc[acc.length - 1].cumPnl : 0;
        acc.push({ date: new Date(t.createdAt).toLocaleDateString(), cumPnl: last + pnl });
        return acc;
      }, []);

    const maxDrawdown = pnlHistory.length > 0
      ? Math.min(0, Math.min(...pnlHistory.map(p => p.cumPnl)))
      : 0;

    const bestTrade = closed.reduce((best, t) => {
      const pnl = t.type === "long"
        ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
        : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
      return pnl > best ? pnl : best;
    }, 0);

    const worstTrade = closed.reduce((worst, t) => {
      const pnl = t.type === "long"
        ? (Number(t.exitPrice) - Number(t.entryPrice)) * t.quantity
        : (Number(t.entryPrice) - Number(t.exitPrice)) * t.quantity;
      return pnl < worst ? pnl : worst;
    }, 0);

    return {
      totalPnl, winRate, riskReward, avgWin, avgLoss,
      totalTrades: closed.length, openTrades: open.length,
      sectorMap, pnlHistory, maxDrawdown, bestTrade, worstTrade,
    };
  }, [trades]);

  const portfolioBalance = portfolio?.balance ?? 10000;
  const pnlColor = stats.totalPnl >= 0 ? "green" : "red";

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "pnl", label: "P&L History", icon: TrendingUp },
    { id: "sectors", label: "Sectors", icon: PieChart },
    { id: "risk", label: "Risk Metrics", icon: Shield },
  ] as const;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading portfolio data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background casual-world">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <button onClick={() => setLocation("/dashboard")} className="hover:text-foreground transition-colors">Dashboard</button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">Portfolio Analysis</span>
            </div>
            <h1 className="text-3xl font-black text-foreground">Portfolio Analysis</h1>
            <p className="text-muted-foreground mt-1">Deep insights into your trading performance</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Casual Plan</span>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total P&L"
            value={`$${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`}
            icon={stats.totalPnl >= 0 ? TrendingUp : TrendingDown}
            color={pnlColor}
            trend={portfolioBalance > 0 ? (stats.totalPnl / 10000) * 100 : 0}
          />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.totalTrades} closed trades`}
            icon={Target}
            color={stats.winRate >= 50 ? "green" : "amber"}
          />
          <StatCard
            label="Risk/Reward"
            value={stats.riskReward.toFixed(2)}
            sub="avg win / avg loss"
            icon={Activity}
            color="purple"
          />
          <StatCard
            label="Portfolio Value"
            value={`$${portfolioBalance.toLocaleString()}`}
            sub="virtual balance"
            icon={Wallet}
            color="teal"
          />
          <StatCard
            label="Open Positions"
            value={stats.openTrades}
            sub="active trades"
            icon={Layers}
            color="amber"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best / Worst Trade */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Trade Highlights
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Best Trade</p>
                      <p className="text-xs text-muted-foreground">Single trade P&L</p>
                    </div>
                  </div>
                  <p className="font-black text-emerald-400">+${stats.bestTrade.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <ArrowDownRight className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Worst Trade</p>
                      <p className="text-xs text-muted-foreground">Single trade P&L</p>
                    </div>
                  </div>
                  <p className="font-black text-red-400">${stats.worstTrade.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Avg Winning Trade</p>
                      <p className="text-xs text-muted-foreground">Mean P&L per win</p>
                    </div>
                  </div>
                  <p className="font-black text-emerald-400">+${stats.avgWin.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Avg Losing Trade</p>
                      <p className="text-xs text-muted-foreground">Mean P&L per loss</p>
                    </div>
                  </div>
                  <p className="font-black text-red-400">-${stats.avgLoss.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Win/Loss Breakdown */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Win / Loss Breakdown
              </h3>
              {stats.totalTrades === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <BarChart2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No closed trades yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Head to the Simulator to start trading!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Wins</span>
                      <span className="font-semibold text-emerald-400">{Math.round((stats.winRate / 100) * stats.totalTrades)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.winRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Losses</span>
                      <span className="font-semibold text-red-400">{Math.round(((100 - stats.winRate) / 100) * stats.totalTrades)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${100 - stats.winRate}%` }} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-xl bg-emerald-500/10">
                      <p className="text-2xl font-black text-emerald-400">{stats.winRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-primary/10">
                      <p className="text-2xl font-black text-primary">{stats.riskReward.toFixed(1)}x</p>
                      <p className="text-xs text-muted-foreground">Risk/Reward</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "pnl" && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Cumulative P&L History
            </h3>
            {stats.pnlHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No trade history yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Close some trades in the Simulator to see your P&L curve.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Simple SVG sparkline */}
                <PnlSparkline history={stats.pnlHistory} />
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {[...stats.pnlHistory].reverse().slice(0, 20).map((point, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">{point.date}</span>
                      <span className={`font-semibold text-sm ${point.cumPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {point.cumPnl >= 0 ? "+" : ""}${point.cumPnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "sectors" && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Sector Breakdown
            </h3>
            {Object.keys(stats.sectorMap).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PieChart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No sector data yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.sectorMap)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([sector, data]) => {
                    const total = Object.values(stats.sectorMap).reduce((s, d) => s + d.count, 0);
                    const pct = total > 0 ? (data.count / total) * 100 : 0;
                    const color = SECTOR_COLORS[sector] ?? "#64748b";
                    return (
                      <div key={sector}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                            <span className="text-sm font-semibold text-foreground">{sector}</span>
                            <span className="text-xs text-muted-foreground">{data.count} trade{data.count !== 1 ? "s" : ""}</span>
                          </div>
                          <span className={`text-sm font-bold ${data.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === "risk" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Risk Metrics
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: "Max Drawdown",
                    value: `$${stats.maxDrawdown.toFixed(2)}`,
                    desc: "Largest peak-to-trough decline",
                    color: "text-red-400",
                    icon: TrendingDown,
                  },
                  {
                    label: "Risk/Reward Ratio",
                    value: `${stats.riskReward.toFixed(2)}`,
                    desc: "Average win size ÷ average loss size",
                    color: stats.riskReward >= 1.5 ? "text-emerald-400" : "text-amber-400",
                    icon: Activity,
                  },
                  {
                    label: "Expectancy",
                    value: `$${((stats.winRate / 100) * stats.avgWin - (1 - stats.winRate / 100) * stats.avgLoss).toFixed(2)}`,
                    desc: "Expected profit per trade",
                    color: ((stats.winRate / 100) * stats.avgWin - (1 - stats.winRate / 100) * stats.avgLoss) >= 0 ? "text-emerald-400" : "text-red-400",
                    icon: Target,
                  },
                  {
                    label: "Profit Factor",
                    value: stats.avgLoss > 0 ? (stats.avgWin * (stats.winRate / 100) / (stats.avgLoss * (1 - stats.winRate / 100))).toFixed(2) : "∞",
                    desc: "Gross profit ÷ gross loss",
                    color: "text-primary",
                    icon: Zap,
                  },
                ].map(metric => (
                  <div key={metric.label} className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center gap-3">
                      <metric.icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                        <p className="text-xs text-muted-foreground">{metric.desc}</p>
                      </div>
                    </div>
                    <p className={`text-lg font-black ${metric.color}`}>{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Risk Assessment
              </h3>
              <div className="space-y-4">
                <RiskGauge label="Win Rate Health" value={stats.winRate} min={0} max={100} thresholds={[40, 60]} />
                <RiskGauge label="Risk/Reward Quality" value={Math.min(stats.riskReward * 50, 100)} min={0} max={100} thresholds={[40, 75]} />
                <RiskGauge
                  label="Consistency Score"
                  value={stats.totalTrades >= 10 ? Math.min(stats.winRate * 0.6 + stats.riskReward * 20, 100) : stats.totalTrades * 10}
                  min={0} max={100} thresholds={[40, 70]}
                />
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {stats.totalTrades < 10
                      ? "📊 Complete at least 10 trades for a meaningful risk assessment."
                      : stats.winRate >= 55 && stats.riskReward >= 1.5
                        ? "✅ Strong performance! Your risk management is solid."
                        : stats.winRate < 40
                          ? "⚠️ Win rate is low — consider tightening your entry criteria."
                          : "📈 You're on the right track. Focus on improving your risk/reward ratio."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PnlSparkline({ history }: { history: { date: string; cumPnl: number }[] }) {
  if (history.length < 2) return null;
  const values = history.map(h => h.cumPnl);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 600, h = 120, pad = 10;
  const points = history.map((p, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.cumPnl - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const lastVal = values[values.length - 1];
  const strokeColor = lastVal >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="w-full overflow-hidden rounded-xl bg-muted p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
          fill="url(#pnlGrad)"
          stroke="none"
        />
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function RiskGauge({ label, value, min, max, thresholds }: { label: string; value: number; min: number; max: number; thresholds: [number, number] }) {
  const pct = ((value - min) / (max - min)) * 100;
  const color = pct < thresholds[0] ? "bg-red-500" : pct < thresholds[1] ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
