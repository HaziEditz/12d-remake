import { PremiumPaywall } from "@/components/paywall";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Crown, 
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  BookOpen,
  Target,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  type: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  notes: string;
  strategy: string;
  emotions: string;
  lessons: string;
}

function JournalEntry({ entry, expanded, onToggle }: { entry: JournalEntry; expanded: boolean; onToggle: () => void }) {
  const isProfit = entry.pnl >= 0;
  
  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover-elevate"
        onClick={onToggle}
        data-testid={`journal-entry-${entry.id}`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${entry.type === "buy" ? "bg-green-500/10" : "bg-red-500/10"}`}>
              {entry.type === "buy" ? (
                <TrendingUp className={`w-5 h-5 text-green-500`} />
              ) : (
                <TrendingDown className={`w-5 h-5 text-red-500`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{entry.symbol}</span>
                <Badge variant="outline" className="text-xs">{entry.strategy}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{entry.date}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Entry/Exit</p>
              <p className="font-mono text-sm">${entry.entryPrice.toFixed(2)} / ${entry.exitPrice.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="font-mono text-sm">{entry.quantity}</p>
            </div>
            <div className="text-right min-w-[80px]">
              <p className="text-sm text-muted-foreground">P&L</p>
              <p className={`font-mono font-semibold ${isProfit ? "text-green-500" : "text-red-500"}`}>
                {isProfit ? "+" : ""}{entry.pnl.toFixed(2)}
              </p>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>
      
      {expanded && (
        <CardContent className="pt-0 pb-4 border-t">
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <MessageSquare className="w-4 h-4" />
                Trade Notes
              </div>
              <p className="text-sm text-muted-foreground">{entry.notes}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Target className="w-4 h-4" />
                Emotions
              </div>
              <p className="text-sm text-muted-foreground">{entry.emotions}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <BookOpen className="w-4 h-4" />
                Lessons Learned
              </div>
              <p className="text-sm text-muted-foreground">{entry.lessons}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function TradeJournalContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    symbol: "",
    strategy: "",
    entryPrice: "",
    exitPrice: "",
    quantity: "",
    type: "buy" as "buy" | "sell",
    notes: "",
    emotions: "",
    lessons: ""
  });

  const { data: journalEntries = [], isLoading: isJournalLoading } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal'],
    retry: false,
  });

  const { data: simulatorTrades = [] } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
  });

  const allEntries = [
    ...journalEntries,
    ...simulatorTrades
      .filter(t => t.status === 'closed')
      .map(t => ({
        id: `sim-${t.id}`,
        date: new Date(t.closedAt || t.openedAt || Date.now()).toISOString().split('T')[0],
        symbol: t.symbol,
        type: t.type as "buy" | "sell",
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice || 0,
        quantity: t.quantity,
        pnl: t.profit || 0,
        notes: `Simulator trade${t.leverage && t.leverage > 1 ? ` (${t.leverage}x leverage)` : ''}`,
        strategy: "Simulator",
        emotions: "N/A",
        lessons: "N/A"
      }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = isJournalLoading;
  const entries = allEntries;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/journal", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal'] });
      setShowAddForm(false);
      setFormData({
        symbol: "",
        strategy: "",
        entryPrice: "",
        exitPrice: "",
        quantity: "",
        type: "buy",
        notes: "",
        emotions: "",
        lessons: ""
      });
      toast({ title: "Journal entry saved" });
    },
    onError: () => {
      toast({ title: "Failed to save entry", variant: "destructive" });
    }
  });

  const handleSaveEntry = () => {
    const entryPrice = parseFloat(formData.entryPrice) || 0;
    const exitPrice = parseFloat(formData.exitPrice) || 0;
    const quantity = parseFloat(formData.quantity) || 0;
    const pnl = (exitPrice - entryPrice) * quantity * (formData.type === "sell" ? -1 : 1);
    
    createMutation.mutate({
      symbol: formData.symbol.toUpperCase(),
      type: formData.type,
      entryPrice,
      exitPrice,
      quantity,
      pnl,
      notes: formData.notes,
      strategy: formData.strategy,
      emotions: formData.emotions,
      lessons: formData.lessons,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredEntries = entries.filter(entry => 
    entry.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = allEntries.length > 0 ? {
    totalTrades: allEntries.length,
    winRate: Math.round((allEntries.filter(e => e.pnl > 0).length / allEntries.length) * 100),
    totalPnl: allEntries.reduce((sum, e) => sum + e.pnl, 0),
    avgWin: allEntries.filter(e => e.pnl > 0).length > 0 
      ? allEntries.filter(e => e.pnl > 0).reduce((sum, e) => sum + e.pnl, 0) / allEntries.filter(e => e.pnl > 0).length
      : 0,
    avgLoss: allEntries.filter(e => e.pnl < 0).length > 0
      ? allEntries.filter(e => e.pnl < 0).reduce((sum, e) => sum + e.pnl, 0) / allEntries.filter(e => e.pnl < 0).length
      : 0,
  } : {
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    avgWin: 0,
    avgLoss: 0
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-journal-title">Trade Journal</h1>
            <p className="text-muted-foreground">Track, analyze, and improve your trading</p>
          </div>
          <Badge className="ml-auto bg-gradient-to-r from-amber-500 to-amber-600">Premium</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats.totalTrades}</p>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.winRate}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className={`text-2xl font-bold ${stats.totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                ${stats.totalPnl.toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Total P&L</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-500">${stats.avgWin.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Avg Win</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-500">${stats.avgLoss.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Avg Loss</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-journal"
            />
          </div>
          <Button variant="outline" className="gap-2" data-testid="button-filter-journal">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button className="gap-2" onClick={() => setShowAddForm(!showAddForm)} data-testid="button-add-entry">
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">New Journal Entry</CardTitle>
              <CardDescription>Record your trade with notes and reflections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Symbol</label>
                  <Input 
                    placeholder="AAPL" 
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                    data-testid="input-new-symbol" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Strategy</label>
                  <Input 
                    placeholder="Breakout, Momentum, etc." 
                    value={formData.strategy}
                    onChange={(e) => setFormData({...formData, strategy: e.target.value})}
                    data-testid="input-new-strategy" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Entry Price</label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                    data-testid="input-new-entry" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Exit Price</label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.exitPrice}
                    onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                    data-testid="input-new-exit" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Quantity</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    data-testid="input-new-quantity" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Trade Type</label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant={formData.type === "buy" ? "default" : "outline"}
                      onClick={() => setFormData({...formData, type: "buy"})}
                      className="flex-1"
                      data-testid="button-type-buy"
                    >
                      Buy
                    </Button>
                    <Button 
                      type="button"
                      variant={formData.type === "sell" ? "default" : "outline"}
                      onClick={() => setFormData({...formData, type: "sell"})}
                      className="flex-1"
                      data-testid="button-type-sell"
                    >
                      Sell
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Trade Notes</label>
                  <Textarea 
                    placeholder="What was your reasoning for this trade?" 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    data-testid="input-new-notes" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Emotions & Mindset</label>
                  <Textarea 
                    placeholder="How did you feel during this trade?" 
                    value={formData.emotions}
                    onChange={(e) => setFormData({...formData, emotions: e.target.value})}
                    data-testid="input-new-emotions" 
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Lessons Learned</label>
                  <Textarea 
                    placeholder="What can you learn from this trade?" 
                    value={formData.lessons}
                    onChange={(e) => setFormData({...formData, lessons: e.target.value})}
                    data-testid="input-new-lessons" 
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleSaveEntry} 
                  disabled={createMutation.isPending || !formData.symbol}
                  data-testid="button-save-entry"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Entry
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading journal entries...</p>
              </CardContent>
            </Card>
          ) : filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No journal entries yet</h3>
                <p className="text-muted-foreground mb-4">Start tracking your trades to improve your performance</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredEntries.map((entry) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradeJournalPage() {
  return (
    <PremiumPaywall featureName="Trade Journal">
      <TradeJournalContent />
    </PremiumPaywall>
  );
}
