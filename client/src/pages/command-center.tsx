import { PremiumPaywall } from "@/components/paywall";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Crown, 
  TrendingUp, 
  TrendingDown, 
  Star,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Eye,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, CandlestickSeries } from "lightweight-charts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WatchlistStock = { symbol: string; name: string; price: number; change: number; changePercent: number; volume: string };

const DEFAULT_WATCHLIST: WatchlistStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: 195.00, change: 2.34, changePercent: 1.25, volume: "52.3M" },
  { symbol: "MSFT", name: "Microsoft", price: 430.00, change: 4.12, changePercent: 1.10, volume: "28.1M" },
  { symbol: "GOOGL", name: "Alphabet", price: 175.00, change: -1.23, changePercent: -0.86, volume: "21.7M" },
  { symbol: "AMZN", name: "Amazon", price: 220.00, change: 3.45, changePercent: 1.97, volume: "45.2M" },
  { symbol: "NVDA", name: "NVIDIA", price: 140.00, change: 12.45, changePercent: 2.58, volume: "41.8M" },
  { symbol: "TSLA", name: "Tesla", price: 420.00, change: -5.30, changePercent: -2.09, volume: "98.4M" },
  { symbol: "META", name: "Meta", price: 590.00, change: 8.20, changePercent: 1.65, volume: "15.3M" },
  { symbol: "JPM", name: "JPMorgan", price: 245.00, change: 1.85, changePercent: 0.96, volume: "8.7M" },
];

const ALL_ADDABLE_STOCKS: { symbol: string; name: string; price: number }[] = [
  { symbol: "NFLX", name: "Netflix", price: 900.00 },
  { symbol: "AMD", name: "AMD", price: 125.00 },
  { symbol: "DIS", name: "Disney", price: 115.00 },
  { symbol: "PYPL", name: "PayPal", price: 90.00 },
  { symbol: "UBER", name: "Uber", price: 65.00 },
  { symbol: "COIN", name: "Coinbase", price: 320.00 },
  { symbol: "BA", name: "Boeing", price: 175.00 },
  { symbol: "V", name: "Visa", price: 315.00 },
  { symbol: "SPY", name: "S&P 500 ETF", price: 605.00 },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", price: 525.00 },
  { symbol: "DIA", name: "Dow Jones ETF", price: 440.00 },
  { symbol: "BTC/USD", name: "Bitcoin", price: 102000.00 },
  { symbol: "ETH/USD", name: "Ethereum", price: 3900.00 },
  { symbol: "SOL/USD", name: "Solana", price: 225.00 },
];

const marketOverview = [
  { name: "S&P 500", value: "4,783.45", change: "+0.82%", up: true },
  { name: "NASDAQ", value: "15,095.14", change: "+1.12%", up: true },
  { name: "DOW", value: "37,545.33", change: "+0.45%", up: true },
  { name: "VIX", value: "12.45", change: "-3.21%", up: false },
];

function generateCandlestickData(basePrice: number, days: number) {
  const data = [];
  let currentPrice = basePrice;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const volatility = 0.02;
    const trend = Math.random() > 0.45 ? 1 : -1;
    const change = currentPrice * volatility * Math.random() * trend;
    
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.abs(change) * Math.random();
    const low = Math.min(open, close) - Math.abs(change) * Math.random();
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
    
    currentPrice = close;
  }
  
  return data;
}

function MiniChart({ symbol, basePrice }: { symbol: string; basePrice: number }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(156, 163, 175, 0.9)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 180,
      timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
      },
      crosshair: {
        mode: 0,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    const data = generateCandlestickData(basePrice, 60);
    candlestickSeries.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [basePrice]);

  return <div ref={chartContainerRef} className="w-full" />;
}

function CommandCenterContent() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [watchlistStocks, setWatchlistStocks] = useState<WatchlistStock[]>(DEFAULT_WATCHLIST);
  const [selectedSymbols, setSelectedSymbols] = useState(["AAPL", "MSFT", "NVDA", "TSLA"]);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("100");
  const [quickTradeSymbol, setQuickTradeSymbol] = useState("AAPL");
  const [recentTrades, setRecentTrades] = useState<{type: string, symbol: string, qty: number, total: number}[]>([]);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [addStockSymbol, setAddStockSymbol] = useState("");

  const selectedStocks = watchlistStocks.filter(s => selectedSymbols.includes(s.symbol));

  useEffect(() => {
    const interval = setInterval(() => {
      setWatchlistStocks(prev => prev.map(stock => {
        const volatility = stock.price > 10000 ? 0.001 : 0.002;
        const change = (Math.random() - 0.48) * volatility * stock.price;
        const newPrice = Math.max(stock.price + change, 0.01);
        const newChange = newPrice - DEFAULT_WATCHLIST.find(d => d.symbol === stock.symbol)?.price || 0;
        const base = DEFAULT_WATCHLIST.find(d => d.symbol === stock.symbol)?.price ?? newPrice;
        const newChangePercent = ((newPrice - base) / base) * 100;
        return { ...stock, price: newPrice, change: newPrice - base, changePercent: newChangePercent };
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const availableToAdd = ALL_ADDABLE_STOCKS.filter(
    s => !watchlistStocks.some(w => w.symbol === s.symbol)
  );

  const handleAddStock = () => {
    if (!addStockSymbol) return;
    const stock = ALL_ADDABLE_STOCKS.find(s => s.symbol === addStockSymbol);
    if (!stock) return;
    const newStock: WatchlistStock = {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      change: 0,
      changePercent: 0,
      volume: "N/A",
    };
    setWatchlistStocks(prev => [...prev, newStock]);
    setAddStockOpen(false);
    setAddStockSymbol("");
    toast({ title: `${stock.symbol} added to watchlist` });
  };

  const handleRemoveStock = (symbol: string) => {
    setWatchlistStocks(prev => prev.filter(s => s.symbol !== symbol));
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
    if (quickTradeSymbol === symbol) {
      const remaining = watchlistStocks.filter(s => s.symbol !== symbol);
      if (remaining.length > 0) setQuickTradeSymbol(remaining[0].symbol);
    }
  };

  const tradeMutation = useMutation({
    mutationFn: async (tradeData: { symbol: string; type: "buy" | "sell"; quantity: number; entryPrice: number }) => {
      const res = await apiRequest("POST", "/api/trades", tradeData);
      return res.json();
    },
    onSuccess: async (data, variables) => {
      const total = variables.quantity * variables.entryPrice;
      setRecentTrades(prev => [
        { type: variables.type.toUpperCase(), symbol: variables.symbol, qty: variables.quantity, total },
        ...prev.slice(0, 4)
      ]);
      toast({
        title: `${variables.type === "buy" ? "Bought" : "Sold"} ${variables.symbol}`,
        description: `${variables.quantity} shares at $${variables.entryPrice.toFixed(2)} = $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      await refreshUser();
    },
    onError: (error: Error) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Could not execute trade",
        variant: "destructive",
      });
    },
  });

  const handleExecuteTrade = () => {
    const stock = watchlistStocks.find(s => s.symbol === quickTradeSymbol);
    if (!stock || !quantity || parseInt(quantity) <= 0) return;
    
    tradeMutation.mutate({
      symbol: quickTradeSymbol,
      type: orderType,
      quantity: parseInt(quantity),
      entryPrice: stock.price,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Stock to Watchlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={addStockSymbol} onValueChange={setAddStockSymbol}>
              <SelectTrigger data-testid="select-add-stock">
                <SelectValue placeholder="Choose a stock..." />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map(s => (
                  <SelectItem key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleAddStock}
                disabled={!addStockSymbol}
                data-testid="button-confirm-add-stock"
              >
                Add to Watchlist
              </Button>
              <Button variant="outline" onClick={() => setAddStockOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border-b bg-card/50 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-command-center-title">Command Center</h1>
              <p className="text-xs text-muted-foreground">Professional Trading Terminal</p>
            </div>
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600">Premium</Badge>
          </div>
          
          <div className="flex items-center gap-6">
            {marketOverview.map((market) => (
              <div key={market.name} className="text-center">
                <p className="text-xs text-muted-foreground">{market.name}</p>
                <p className="font-mono font-semibold">{market.value}</p>
                <p className={`text-xs font-medium ${market.up ? "text-green-500" : "text-red-500"}`}>
                  {market.change}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Watchlist
                  </CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setAddStockOpen(true)}
                    disabled={availableToAdd.length === 0}
                    title="Add stock to watchlist"
                    data-testid="button-add-watchlist"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {watchlistStocks.map((stock) => {
                    const isSelected = selectedSymbols.includes(stock.symbol);
                    const isUp = stock.change >= 0;
                    return (
                      <div
                        key={stock.symbol}
                        className={`group px-4 py-2 cursor-pointer ${isSelected ? "bg-muted/50" : "hover:bg-muted/30"}`}
                        onClick={() => {
                          if (selectedSymbols.length < 4 || isSelected) {
                            setSelectedSymbols(
                              isSelected
                                ? selectedSymbols.filter(s => s !== stock.symbol)
                                : [...selectedSymbols.slice(-3), stock.symbol]
                            );
                          }
                        }}
                        data-testid={`watchlist-item-${stock.symbol}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isSelected && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            <div>
                              <p className="font-semibold text-sm">{stock.symbol}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[80px]">{stock.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-right">
                              <p className="font-mono text-sm">${stock.price.toFixed(2)}</p>
                              <div className={`flex items-center gap-1 text-xs ${isUp ? "text-green-500" : "text-red-500"}`}>
                                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%</span>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStock(stock.symbol);
                              }}
                              title={`Remove ${stock.symbol}`}
                              data-testid={`button-remove-${stock.symbol}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              {selectedStocks.slice(0, 4).map((stock) => (
                <Card key={stock.symbol} className="overflow-hidden">
                  <CardHeader className="py-2 px-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{stock.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {stock.volume}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">${stock.price.toFixed(2)}</span>
                        <span className={`text-xs font-medium ${stock.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <MiniChart symbol={stock.symbol} basePrice={stock.price} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3">
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Quick Trade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Symbol</label>
                    <select
                      value={quickTradeSymbol}
                      onChange={(e) => setQuickTradeSymbol(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      data-testid="select-trade-symbol"
                    >
                      {watchlistStocks.map((stock) => (
                        <option key={stock.symbol} value={stock.symbol}>
                          {stock.symbol} - ${stock.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={orderType === "buy" ? "default" : "outline"}
                      className={orderType === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => setOrderType("buy")}
                      data-testid="button-buy"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Buy
                    </Button>
                    <Button
                      variant={orderType === "sell" ? "default" : "outline"}
                      className={orderType === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                      onClick={() => setOrderType("sell")}
                      data-testid="button-sell"
                    >
                      <TrendingDown className="w-4 h-4 mr-1" />
                      Sell
                    </Button>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="font-mono"
                      data-testid="input-quantity"
                    />
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Cost</span>
                      <span className="font-mono font-semibold">
                        ${(parseFloat(quantity || "0") * (watchlistStocks.find(s => s.symbol === quickTradeSymbol)?.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission</span>
                      <span className="font-mono text-green-500">$0.00</span>
                    </div>
                  </div>

                  <Button 
                    className={`w-full ${orderType === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                    data-testid="button-execute-trade"
                    onClick={handleExecuteTrade}
                    disabled={tradeMutation.isPending || !quantity || parseInt(quantity) <= 0}
                  >
                    {tradeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {orderType === "buy" ? "Buy" : "Sell"} {quickTradeSymbol}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs space-y-2">
                    {recentTrades.length === 0 ? (
                      <p className="text-muted-foreground text-center py-2">No recent trades</p>
                    ) : (
                      recentTrades.map((trade, i) => (
                        <div 
                          key={i} 
                          className={`flex items-center justify-between p-2 rounded ${trade.type === "BUY" ? "bg-green-500/10" : "bg-red-500/10"}`}
                        >
                          <span>{trade.type} {trade.symbol} x{trade.qty}</span>
                          <span className={trade.type === "BUY" ? "text-green-500" : "text-red-500"}>
                            {trade.type === "BUY" ? "+" : "-"}${trade.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4 text-sm overflow-x-auto">
                <div className="flex items-center gap-6 min-w-0">
                  <span className="text-muted-foreground whitespace-nowrap">Market Status:</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Open
                  </Badge>
                  <span className="text-muted-foreground whitespace-nowrap">|</span>
                  <span className="whitespace-nowrap">Available Balance: <span className="font-semibold text-green-500">${user?.simulatorBalance?.toLocaleString() ?? "10,000"}</span></span>
                  <span className="text-muted-foreground whitespace-nowrap">|</span>
                  <span className="whitespace-nowrap">Buying Power: <span className="font-semibold">${((user?.simulatorBalance ?? 10000) * 2).toLocaleString()}</span></span>
                  <span className="text-muted-foreground whitespace-nowrap">|</span>
                  <span className="whitespace-nowrap">Day's P&L: <span className="font-semibold text-green-500">+$1,245.50</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CommandCenterPage() {
  return (
    <PremiumPaywall featureName="Command Center">
      <CommandCenterContent />
    </PremiumPaywall>
  );
}
