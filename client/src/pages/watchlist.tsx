import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Search,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Bell
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getStockLogoUrl } from "@/lib/stock-logos";
import { PriceAlertDialog } from "@/components/price-alert-dialog";

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isLoading?: boolean;
  hasError?: boolean;
}

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  error?: boolean;
}

const AVAILABLE_STOCKS: Record<string, { name: string }> = {
  AAPL: { name: "Apple Inc." },
  GOOGL: { name: "Alphabet Inc." },
  MSFT: { name: "Microsoft Corp." },
  AMZN: { name: "Amazon.com Inc." },
  TSLA: { name: "Tesla Inc." },
  NVDA: { name: "NVIDIA Corp." },
  META: { name: "Meta Platforms" },
  JPM: { name: "JPMorgan Chase" },
  V: { name: "Visa Inc." },
  JNJ: { name: "Johnson & Johnson" },
  WMT: { name: "Walmart Inc." },
  PG: { name: "Procter & Gamble" },
  DIS: { name: "Walt Disney Co." },
  NFLX: { name: "Netflix Inc." },
  AMD: { name: "AMD Inc." },
};

export default function WatchlistPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    
    try {
      const response = await apiRequest("POST", "/api/stocks/quotes", { symbols });
      const quotes: StockQuote[] = await response.json();
      
      setWatchlist(prev => prev.map(item => {
        const quote = quotes.find(q => q.symbol === item.symbol);
        if (quote && !quote.error) {
          return {
            ...item,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            isLoading: false,
            hasError: false,
          };
        } else if (quote?.error) {
          return { ...item, isLoading: false, hasError: true };
        }
        return item;
      }));
      
      setLastUpdated(new Date());
    } catch (error) {
      setWatchlist(prev => prev.map(item => ({
        ...item,
        isLoading: false,
        hasError: true
      })));
      toast({
        title: "Failed to fetch stock prices",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadWatchlistFromAPI();
    } else {
      setIsInitialLoading(false);
    }
  }, [isAuthenticated]);

  const loadWatchlistFromAPI = async () => {
    try {
      const response = await apiRequest("GET", "/api/watchlist");
      const items = await response.json();
      const watchlistItems = items.map((item: any) => ({
        symbol: item.symbol,
        name: item.name,
        price: 0,
        change: 0,
        changePercent: 0,
        isLoading: true,
      }));
      setWatchlist(watchlistItems);
      if (watchlistItems.length > 0) {
        fetchQuotes(watchlistItems.map((w: WatchlistItem) => w.symbol));
      }
    } catch (error) {
      console.error("Failed to load watchlist", error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const filteredStocks = Object.entries(AVAILABLE_STOCKS)
    .filter(([symbol, data]) => 
      !watchlist.some(w => w.symbol === symbol) &&
      (symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
       data.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const addToWatchlist = async (symbol: string) => {
    const stock = AVAILABLE_STOCKS[symbol];
    if (stock) {
      const newItem: WatchlistItem = { 
        symbol, 
        name: stock.name, 
        price: 0, 
        change: 0, 
        changePercent: 0,
        isLoading: true 
      };
      setWatchlist(prev => [...prev, newItem]);
      setSearchTerm("");
      setShowSearch(false);
      
      try {
        await apiRequest("POST", "/api/watchlist", { symbol, name: stock.name });
      } catch (error) {
        console.error("Failed to save to watchlist", error);
        setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
        toast({ title: "Failed to save stock to watchlist", variant: "destructive" });
        return;
      }
      
      try {
        const response = await apiRequest("POST", "/api/stocks/quotes", { symbols: [symbol] });
        const quotes: StockQuote[] = await response.json();
        const quote = quotes[0];
        
        if (quote && !quote.error) {
          setWatchlist(prev => prev.map(item => 
            item.symbol === symbol
              ? { ...item, price: quote.price, change: quote.change, changePercent: quote.changePercent, isLoading: false }
              : item
          ));
        } else {
          setWatchlist(prev => prev.map(item => 
            item.symbol === symbol
              ? { ...item, isLoading: false, hasError: true }
              : item
          ));
        }
      } catch {
        setWatchlist(prev => prev.map(item => 
          item.symbol === symbol
            ? { ...item, isLoading: false, hasError: true }
            : item
        ));
      }
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    const removedItem = watchlist.find(w => w.symbol === symbol);
    setWatchlist(watchlist.filter(w => w.symbol !== symbol));
    try {
      await apiRequest("DELETE", `/api/watchlist/${symbol}`);
    } catch (error) {
      console.error("Failed to remove from watchlist", error);
      if (removedItem) {
        setWatchlist(prev => [...prev, removedItem]);
      }
      toast({ title: "Failed to remove stock from watchlist", variant: "destructive" });
    }
  };

  const refreshPrices = async () => {
    setIsRefreshing(true);
    setWatchlist(prev => prev.map(item => ({ ...item, isLoading: true })));
    
    const symbols = watchlist.map(w => w.symbol);
    await fetchQuotes(symbols);
    
    setIsRefreshing(false);
    toast({ title: "Prices refreshed" });
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Watchlist</h1>
        <p className="text-muted-foreground mb-4">Sign in to track your favorite stocks</p>
        <Link href="/login">
          <Button data-testid="button-login-watchlist">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-watchlist-title">
            <Star className="h-8 w-8 text-amber-500" />
            My Watchlist
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Real-time stock prices</p>
            {lastUpdated && (
              <Badge variant="outline" className="text-xs">
                <Wifi className="h-3 w-3 mr-1 text-success" />
                Updated {lastUpdated.toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={refreshPrices} 
            disabled={isRefreshing}
            data-testid="button-refresh-prices"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowSearch(!showSearch)} data-testid="button-add-stock">
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
        </div>
      </div>

      {showSearch && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Add Stock to Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol or company name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-stock"
                />
              </div>
            </div>
            {searchTerm && (
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {filteredStocks.length > 0 ? (
                  filteredStocks.slice(0, 5).map(([symbol, data]) => (
                    <Button
                      key={symbol}
                      variant="ghost"
                      className="flex items-center justify-between w-full h-auto p-2 bg-muted/50"
                      onClick={() => addToWatchlist(symbol)}
                      data-testid={`button-add-${symbol.toLowerCase()}`}
                    >
                      <div className="text-left">
                        <span className="font-semibold">{symbol}</span>
                        <span className="text-muted-foreground ml-2 text-sm">{data.name}</span>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No stocks found</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {watchlist.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
            <p className="text-muted-foreground mb-4">Add stocks to start tracking their prices</p>
            <Button onClick={() => setShowSearch(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Stock
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {watchlist.map((item) => (
            <Card key={item.symbol} className="hover-elevate" data-testid={`card-stock-${item.symbol.toLowerCase()}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-lg" data-testid={`avatar-stock-${item.symbol.toLowerCase()}`}>
                      <AvatarImage 
                        src={getStockLogoUrl(item.symbol) || ""} 
                        alt={item.symbol} 
                        className="object-contain p-2 bg-white"
                      />
                      <AvatarFallback className="bg-primary/10 font-bold text-primary rounded-lg">
                        {item.symbol.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-symbol-${item.symbol.toLowerCase()}`}>{item.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                  </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {item.isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-muted-foreground">Loading...</span>
                          </div>
                        ) : item.hasError ? (
                          <div className="flex items-center gap-2">
                            <WifiOff className="h-4 w-4 text-destructive" />
                            <span className="text-muted-foreground text-sm">Unavailable</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-xl font-bold" data-testid={`text-price-${item.symbol.toLowerCase()}`}>
                              ${item.price.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-1 justify-end">
                              {item.change >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-success" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-destructive" />
                              )}
                              <Badge 
                                variant="outline" 
                                className={item.change >= 0 ? "text-success border-success" : "text-destructive border-destructive"}
                              >
                                {item.change >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!item.isLoading && !item.hasError && (
                          <PriceAlertDialog 
                            symbol={item.symbol} 
                            currentPrice={item.price} 
                            type="watchlist"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromWatchlist(item.symbol)}
                          className="text-muted-foreground"
                          data-testid={`button-remove-${item.symbol.toLowerCase()}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Popular Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(AVAILABLE_STOCKS)
              .filter(([symbol]) => !watchlist.some(w => w.symbol === symbol))
              .slice(0, 8)
              .map(([symbol]) => (
                <Badge
                  key={symbol}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => addToWatchlist(symbol)}
                  data-testid={`badge-add-${symbol.toLowerCase()}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {symbol}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
