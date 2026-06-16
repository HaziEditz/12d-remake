import { PremiumPaywall } from "@/components/paywall";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  Target,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Loader2
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell
} from "recharts";
import type { Trade } from "@shared/schema";

const SECTOR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
];

const STOCK_SECTORS: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Technology",
  AMZN: "Consumer",
  TSLA: "Automotive",
  META: "Technology",
  NVDA: "Technology",
  JPM: "Finance",
  V: "Finance",
  JNJ: "Healthcare",
  PFE: "Healthcare",
  UNH: "Healthcare",
  XOM: "Energy",
  CVX: "Energy",
  WMT: "Consumer",
  KO: "Consumer",
  DIS: "Entertainment",
  NFLX: "Entertainment",
  BA: "Industrial",
  CAT: "Industrial",
};

function getSector(symbol: string): string {
  return STOCK_SECTORS[symbol.toUpperCase()] || "Other";
}

function AnalyticsContent() {
  const { user } = useAuth();

  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
  });

  const closedTrades = trades.filter(t => t.status === "closed" && t.profit !== null);
  
  const winningTrades = closedTrades.filter(t => (t.profit ?? 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.profit ?? 0) < 0);
  const winRate = closedTrades.length > 0 
    ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1)
    : "0.0";
  
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0);
  const avgProfitPerTrade = closedTrades.length > 0 
    ? (totalProfit / closedTrades.length).toFixed(2)
    : "0.00";
  
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0) / losingTrades.length)
    : 0;
  const riskReward = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : "N/A";

  const performanceData = (() => {
    const monthlyData: Record<string, { profit: number; trades: number }> = {};
    closedTrades.forEach(trade => {
      if (trade.closedAt) {
        const date = new Date(trade.closedAt);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { profit: 0, trades: 0 };
        }
        monthlyData[monthKey].profit += trade.profit ?? 0;
        monthlyData[monthKey].trades += 1;
      }
    });
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, profit: Math.round(data.profit), trades: data.trades }))
      .slice(-6);
  })();

  const sectorAllocation = (() => {
    const sectorData: Record<string, number> = {};
    closedTrades.forEach(trade => {
      const sector = getSector(trade.symbol);
      sectorData[sector] = (sectorData[sector] || 0) + 1;
    });
    const total = closedTrades.length || 1;
    return Object.entries(sectorData)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: SECTOR_COLORS[index % SECTOR_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  const weeklyActivity = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData: Record<string, { trades: number; wins: number }> = {};
    days.forEach(day => { dayData[day] = { trades: 0, wins: 0 }; });
    
    closedTrades.forEach(trade => {
      if (trade.closedAt) {
        const dayName = days[new Date(trade.closedAt).getDay()];
        dayData[dayName].trades += 1;
        if ((trade.profit ?? 0) > 0) dayData[dayName].wins += 1;
      }
    });
    
    return days.slice(1, 6).map(day => ({
      day,
      trades: dayData[day].trades,
      winRate: dayData[day].trades > 0 
        ? Math.round((dayData[day].wins / dayData[day].trades) * 100)
        : 0
    }));
  })();

  const tradingPatterns = (() => {
    const hourData: Record<number, { trades: number; wins: number }> = {};
    for (let h = 9; h <= 16; h++) { hourData[h] = { trades: 0, wins: 0 }; }
    
    closedTrades.forEach(trade => {
      if (trade.openedAt) {
        const hour = new Date(trade.openedAt).getHours();
        if (hour >= 9 && hour <= 16) {
          hourData[hour].trades += 1;
          if ((trade.profit ?? 0) > 0) hourData[hour].wins += 1;
        }
      }
    });
    
    return Object.entries(hourData).map(([hour, data]) => ({
      hour: `${hour}${parseInt(hour) < 12 ? 'am' : 'pm'}`,
      success: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 50
    }));
  })();

  const bestDayIndex = weeklyActivity.reduce((best, curr, idx) => 
    curr.winRate > weeklyActivity[best].winRate ? idx : best, 0);
  const bestDay = weeklyActivity[bestDayIndex]?.day || "N/A";
  
  const bestHourData = tradingPatterns.reduce((best, curr) => 
    curr.success > best.success ? curr : best, { hour: "N/A", success: 0 });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Advanced Analytics</h1>
            <p className="text-muted-foreground">Deep insights into your trading performance</p>
          </div>
          <Badge className="ml-auto bg-gradient-to-r from-amber-500 to-amber-600">
            Premium
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-green-500" data-testid="text-win-rate">{winRate}%</p>
                </div>
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>{winningTrades.length} wins / {closedTrades.length} trades</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Profit/Trade</p>
                  <p className={`text-2xl font-bold ${parseFloat(avgProfitPerTrade) >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-avg-profit">
                    ${avgProfitPerTrade}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>Total: ${totalProfit.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Risk/Reward</p>
                  <p className="text-2xl font-bold" data-testid="text-risk-reward">1:{riskReward}</p>
                </div>
                <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>Avg win: ${avgWin.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold" data-testid="text-total-trades">{trades.length}</p>
                </div>
                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>{closedTrades.length} closed</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profit Over Time</CardTitle>
              <CardDescription>Monthly profit performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#10b981" 
                        fill="url(#profitGradient)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No closed trades yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sector Allocation</CardTitle>
              <CardDescription>Trade distribution by sector</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center">
                {sectorAllocation.length > 0 ? (
                  <>
                    <ResponsiveContainer width="50%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={sectorAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {sectorAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {sectorAllocation.map((sector) => (
                        <div key={sector.name} className="flex items-center gap-2 text-sm">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: sector.color }}
                          />
                          <span>{sector.name}</span>
                          <span className="text-muted-foreground ml-auto">{sector.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No trades yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Trading Activity</CardTitle>
              <CardDescription>Trades by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="trades" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Best Trading Hours</CardTitle>
              <CardDescription>Success rate by time of day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tradingPatterns}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" className="text-xs" />
                    <YAxis className="text-xs" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="success" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trading Insights</CardTitle>
            <CardDescription>Personalized recommendations based on your trading patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">Best Day</span>
                </div>
                <p className="text-sm">
                  {closedTrades.length > 0 
                    ? `Your best win rate is on ${bestDay} at ${weeklyActivity[bestDayIndex]?.winRate || 0}%. Consider focusing your trading on this day.`
                    : "Complete more trades to see your best performing day."}
                </p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Best Hour</span>
                </div>
                <p className="text-sm">
                  {closedTrades.length > 0 
                    ? `Your peak success rate is at ${bestHourData.hour} (${bestHourData.success}%). Consider timing entries around this hour.`
                    : "Complete more trades to identify your best trading hours."}
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-400">Performance</span>
                </div>
                <p className="text-sm">
                  {closedTrades.length >= 10
                    ? parseFloat(winRate) >= 50
                      ? `Great work! Your ${winRate}% win rate shows solid decision making. Keep refining your strategy.`
                      : `Your win rate is ${winRate}%. Focus on trade quality over quantity to improve results.`
                    : "Complete at least 10 trades to unlock detailed performance insights."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PremiumPaywall featureName="Advanced Analytics">
      <AnalyticsContent />
    </PremiumPaywall>
  );
}
