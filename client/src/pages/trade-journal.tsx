import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { PremiumPaywall } from "@/components/paywall";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, TrendingUp, TrendingDown, Search, Pencil, Trash2,
  Brain, Target, Lightbulb, ChevronDown, ChevronUp, Filter,
  Download, List, CalendarDays, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import type { JournalEntry } from "@shared/schema";

type Trade = {
  id: string; symbol: string; type: string; quantity: number;
  entryPrice: number; exitPrice?: number; profit?: number;
  status: string; closedAt?: string; openedAt?: string;
};

const STRATEGY_OPTS = [
  "Trend Following", "Breakout", "Mean Reversion", "Scalping",
  "Swing Trade", "News Play", "Support/Resistance", "Other",
];

const EMOTION_OPTS: { label: string; emoji: string }[] = [
  { label: "Calm & Focused", emoji: "😌" },
  { label: "Confident",      emoji: "💪" },
  { label: "Greedy",         emoji: "🤑" },
  { label: "Fearful",        emoji: "😨" },
  { label: "FOMO",           emoji: "😰" },
  { label: "Revenge Trading",emoji: "😤" },
  { label: "Disciplined",    emoji: "🎯" },
  { label: "Uncertain",      emoji: "🤔" },
];

const EMOJI: Record<string, string> = Object.fromEntries(EMOTION_OPTS.map(e => [e.label, e.emoji]));

type FormState = {
  symbol: string; type: string; date: string;
  entryPrice: string; exitPrice: string; quantity: string; pnl: string;
  strategy: string; emotions: string; notes: string; lessons: string;
  tradeId: string;
};

const emptyForm = (): FormState => ({
  symbol: "", type: "buy",
  date: new Date().toISOString().slice(0, 10),
  entryPrice: "", exitPrice: "", quantity: "", pnl: "",
  strategy: "", emotions: "", notes: "", lessons: "", tradeId: "",
});

function fromTrade(t: Trade): Partial<FormState> {
  return {
    symbol: t.symbol, type: t.type,
    entryPrice: String(t.entryPrice),
    exitPrice: t.exitPrice != null ? String(t.exitPrice) : "",
    quantity: String(t.quantity),
    pnl: t.profit != null ? String(t.profit) : "",
    tradeId: t.id,
    date: (t.closedAt ?? t.openedAt)
      ? new Date(t.closedAt ?? t.openedAt!).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}

function pnlColor(v: number | null | undefined) {
  if (v == null) return "text-muted-foreground";
  return v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500";
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4 text-center">
      <p className="text-2xl font-bold leading-none mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

// ─── Calendar Heatmap ────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type DayData = { pnl: number; entries: JournalEntry[]; count: number };

function dayBg(d: DayData | undefined, today: boolean): string {
  if (!d || d.count === 0) return today ? "ring-2 ring-primary bg-muted/30" : "bg-muted/20";
  const abs = Math.abs(d.pnl);
  // intensity tiers
  const tier = abs < 50 ? 1 : abs < 200 ? 2 : abs < 500 ? 3 : 4;
  if (d.pnl > 0) {
    const shades = ["bg-emerald-500/20","bg-emerald-500/40","bg-emerald-500/60","bg-emerald-500/80"];
    return shades[tier - 1] + (today ? " ring-2 ring-primary" : "");
  } else {
    const shades = ["bg-rose-500/20","bg-rose-500/40","bg-rose-500/60","bg-rose-500/80"];
    return shades[tier - 1] + (today ? " ring-2 ring-primary" : "");
  }
}

function CalendarHeatmap({
  entries,
  onOpenCreate,
  onEdit,
  onDeleteConfirm,
}: {
  entries: JournalEntry[];
  onOpenCreate: () => void;
  onEdit: (e: JournalEntry) => void;
  onDeleteConfirm: (id: string) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDate = new Date();

  const [year, setYear]   = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth()); // 0-based
  const [selected, setSelected] = useState<string | null>(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }
  function goToday() {
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth());
    setSelected(null);
  }

  // Build day map for the entire dataset (all months)
  const dayMap = useMemo(() => {
    const map: Record<string, DayData> = {};
    for (const e of entries) {
      const key = e.date.slice(0, 10);
      if (!map[key]) map[key] = { pnl: 0, entries: [], count: 0 };
      map[key].pnl   += e.pnl ?? 0;
      map[key].count += 1;
      map[key].entries.push(e);
    }
    return map;
  }, [entries]);

  // Build grid for current month
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // Monthly stats
  const monthEntries = entries.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const mPnl   = monthEntries.reduce((s, e) => s + (e.pnl ?? 0), 0);
  const mWins  = monthEntries.filter(e => (e.pnl ?? 0) > 0).length;
  const mLoss  = monthEntries.filter(e => (e.pnl ?? 0) < 0).length;
  // trading days in month
  const tradingDays = new Set(monthEntries.map(e => e.date.slice(0, 10))).size;

  const selectedEntries = selected ? (dayMap[selected]?.entries ?? []) : [];

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold w-40 text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs ml-1" onClick={goToday}>
            Today
          </Button>
        </div>

        {/* Monthly summary chips */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          {tradingDays > 0 && (
            <>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {tradingDays} day{tradingDays !== 1 ? "s" : ""} traded
              </span>
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {mWins}W
              </span>
              <span className="px-2 py-1 rounded-full bg-rose-500/10 text-rose-500">
                {mLoss}L
              </span>
              <span className={`px-2 py-1 rounded-full font-semibold ${
                mPnl >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                           : "bg-rose-500/10 text-rose-500"
              }`}>
                {mPnl >= 0 ? "+" : ""}${mPnl.toFixed(0)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b">
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              if (day === null) {
                return <div key={di} className="aspect-square border-r border-b last:border-r-0 bg-muted/5" />;
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const data = dayMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;
              return (
                <button
                  key={di}
                  className={`aspect-square border-r border-b last:border-r-0 flex flex-col items-center justify-center gap-0.5 transition-all hover:opacity-90 relative ${
                    dayBg(data, isToday)
                  } ${isSelected ? "ring-2 ring-inset ring-primary/70" : ""}`}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  data-testid={`day-cell-${dateStr}`}
                >
                  <span className={`text-xs font-medium leading-none ${
                    isToday ? "text-primary font-bold" : data?.count ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {day}
                  </span>
                  {data && data.count > 0 && (
                    <span className={`text-[9px] leading-none font-semibold ${
                      data.pnl >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {data.pnl >= 0 ? "+" : ""}${Math.abs(data.pnl) < 1000 ? data.pnl.toFixed(0) : `${(data.pnl / 1000).toFixed(1)}k`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {["bg-muted/20","bg-emerald-500/20","bg-emerald-500/40","bg-emerald-500/60","bg-emerald-500/80"].map((c, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${c} border border-border/30`} />
          ))}
        </div>
        <span>More profit</span>
        <div className="flex gap-1 ml-2">
          {["bg-rose-500/20","bg-rose-500/40","bg-rose-500/60","bg-rose-500/80"].map((c, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${c} border border-border/30`} />
          ))}
        </div>
        <span>Loss</span>
      </div>

      {/* Selected day panel */}
      {selected && (
        <Card className="mt-4">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {new Date(selected + "T00:00:00").toLocaleDateString("default", {
                weekday: "long", month: "long", day: "numeric", year: "numeric"
              })}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {selectedEntries.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">No entries on this day.</p>
                <Button size="sm" variant="outline" onClick={onOpenCreate} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Log a trade for this day
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
                  >
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
                      entry.type === "buy"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    }`}>
                      {entry.symbol.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{entry.symbol}</span>
                        {entry.strategy && <Badge variant="secondary" className="text-xs">{entry.strategy}</Badge>}
                        {entry.emotions && <span title={entry.emotions}>{EMOJI[entry.emotions] ?? "🧠"}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.quantity} @ ${Number(entry.entryPrice).toFixed(2)}
                        {entry.exitPrice != null ? ` → $${Number(entry.exitPrice).toFixed(2)}` : ""}
                      </p>
                      {entry.notes && <p className="text-xs mt-1 line-clamp-2">{entry.notes}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {entry.pnl != null && (
                        <p className={`text-sm font-bold ${pnlColor(entry.pnl)}`}>
                          {entry.pnl >= 0 ? "+" : ""}${Number(entry.pnl).toFixed(2)}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => onEdit(entry)} data-testid={`button-cal-edit-${entry.id}`}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={() => onDeleteConfirm(entry.id)} data-testid={`button-cal-delete-${entry.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Day summary */}
                {selectedEntries.length > 1 && (
                  <div className={`text-right text-sm font-semibold pt-1 ${pnlColor(dayMap[selected]?.pnl)}`}>
                    Day total: {(dayMap[selected]?.pnl ?? 0) >= 0 ? "+" : ""}${(dayMap[selected]?.pnl ?? 0).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TradeJournalPage() {
  return (
    <PremiumPaywall featureName="Trade Journal">
      <JournalContent />
    </PremiumPaywall>
  );
}

function JournalContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [view, setView]                   = useState<"list" | "calendar">("list");
  const [search, setSearch]               = useState("");
  const [filterStrategy, setFilterStrategy] = useState("all");
  const [filterType, setFilterType]       = useState("all");
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editEntry, setEditEntry]         = useState<JournalEntry | null>(null);
  const [form, setForm]                   = useState<FormState>(emptyForm());
  const [showImport, setShowImport]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
    enabled: !!user,
  });

  const { data: allTrades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    enabled: !!user,
  });
  const closedTrades = allTrades.filter(t => t.status === "closed").slice(0, 20);

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/journal", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Entry saved" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiRequest("PATCH", `/api/journal/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Entry updated" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/journal/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      toast({ title: "Entry deleted" });
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditEntry(null);
    setForm(emptyForm());
    setShowImport(false);
    setDialogOpen(true);
  }

  function openEdit(entry: JournalEntry) {
    setEditEntry(entry);
    setForm({
      symbol: entry.symbol, type: entry.type, date: entry.date,
      entryPrice: String(entry.entryPrice),
      exitPrice: entry.exitPrice != null ? String(entry.exitPrice) : "",
      quantity: String(entry.quantity),
      pnl: entry.pnl != null ? String(entry.pnl) : "",
      strategy: entry.strategy ?? "",
      emotions: entry.emotions ?? "",
      notes: entry.notes ?? "",
      lessons: entry.lessons ?? "",
      tradeId: entry.tradeId ?? "",
    });
    setShowImport(false);
    setDialogOpen(true);
  }

  function setField(k: keyof FormState) {
    return (v: string) => setForm(prev => ({ ...prev, [k]: v }));
  }

  function handleImportTrade(t: Trade) {
    setForm(prev => ({ ...prev, ...fromTrade(t) }));
    setShowImport(false);
  }

  function handleSubmit() {
    if (!form.symbol.trim())  return toast({ title: "Symbol is required", variant: "destructive" });
    if (!form.date)            return toast({ title: "Date is required", variant: "destructive" });
    if (!form.entryPrice)      return toast({ title: "Entry price is required", variant: "destructive" });
    if (!form.quantity)        return toast({ title: "Quantity is required", variant: "destructive" });

    const payload = {
      symbol: form.symbol.trim().toUpperCase(),
      type: form.type,
      date: form.date,
      entryPrice: parseFloat(form.entryPrice),
      exitPrice:  form.exitPrice  ? parseFloat(form.exitPrice)  : undefined,
      quantity:   parseFloat(form.quantity),
      pnl:        form.pnl        ? parseFloat(form.pnl)        : undefined,
      strategy:   form.strategy   || undefined,
      emotions:   form.emotions   || undefined,
      notes:      form.notes      || undefined,
      lessons:    form.lessons    || undefined,
      tradeId:    form.tradeId    || undefined,
    };

    editEntry
      ? updateMutation.mutate({ id: editEntry.id, data: payload })
      : createMutation.mutate(payload);
  }

  const filtered = useMemo(() => {
    let list = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.symbol.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q) ||
        (e.strategy ?? "").toLowerCase().includes(q) ||
        (e.lessons ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStrategy !== "all") list = list.filter(e => e.strategy === filterStrategy);
    if (filterType !== "all")     list = list.filter(e => e.type === filterType);
    return list;
  }, [entries, search, filterStrategy, filterType]);

  const totalPnl   = entries.reduce((s, e) => s + (e.pnl ?? 0), 0);
  const wins       = entries.filter(e => (e.pnl ?? 0) > 0).length;
  const losses     = entries.filter(e => (e.pnl ?? 0) < 0).length;
  const winRate    = entries.length > 0 ? Math.round((wins / entries.length) * 100) : 0;
  const avgWin     = wins  > 0 ? entries.filter(e => (e.pnl ?? 0) > 0).reduce((s, e) => s + (e.pnl ?? 0), 0) / wins  : 0;
  const avgLoss    = losses > 0 ? entries.filter(e => (e.pnl ?? 0) < 0).reduce((s, e) => s + (e.pnl ?? 0), 0) / losses : 0;
  const strategies = [...new Set(entries.map(e => e.strategy).filter(Boolean) as string[])];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-journal-title">
            <BookOpen className="h-6 w-6 text-primary" />
            Trade Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Annotate your trades, track emotions, and learn from every decision
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border p-0.5 bg-muted/40">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("list")}
              data-testid="button-view-list"
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("calendar")}
              data-testid="button-view-calendar"
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Button onClick={openCreate} className="gap-2" data-testid="button-add-entry">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatPill label="Entries"    value={String(entries.length)} />
          <StatPill label="Win Rate"   value={`${winRate}%`} sub={`${wins}W / ${losses}L`} />
          <StatPill label="Net P&L"    value={`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(0)}`} />
          <StatPill label="Avg Win"    value={`+$${avgWin.toFixed(0)}`} />
          <StatPill label="Avg Loss"   value={`-$${Math.abs(avgLoss).toFixed(0)}`} />
        </div>
      )}

      {/* Filters (only in list view when there are entries) */}
      {view === "list" && entries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search symbol, notes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-journal"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-28 h-9" data-testid="select-filter-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStrategy} onValueChange={setFilterStrategy}>
            <SelectTrigger className="w-40 h-9" data-testid="select-filter-strategy">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All strategies</SelectItem>
              {strategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Calendar view ─────────────────────────── */}
      {view === "calendar" && (
        isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <CalendarHeatmap
            entries={entries}
            onOpenCreate={openCreate}
            onEdit={openEdit}
            onDeleteConfirm={setDeleteConfirm}
          />
        )
      )}

      {/* ── List view ─────────────────────────────── */}
      {view === "list" && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No journal entries yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start logging your trades to spot patterns, track your mindset, and improve over time.
              </p>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Entry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No entries match your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => {
                const isExpanded = expandedId === entry.id;
                const pnl = entry.pnl;
                return (
                  <Card
                    key={entry.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    data-testid={`card-entry-${entry.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                          entry.type === "buy"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}>
                          {entry.symbol.slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{entry.symbol}</span>
                            <Badge variant="outline" className={`text-xs capitalize ${
                              entry.type === "buy"
                                ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                                : "border-rose-500/50 text-rose-500"
                            }`}>
                              {entry.type === "buy" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {entry.type}
                            </Badge>
                            {entry.strategy && <Badge variant="secondary" className="text-xs">{entry.strategy}</Badge>}
                            {entry.emotions && (
                              <span className="text-base" title={entry.emotions}>{EMOJI[entry.emotions] ?? "🧠"}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(entry.date).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
                            {" · "}{entry.quantity} units @ ${Number(entry.entryPrice).toFixed(2)}
                            {entry.exitPrice != null ? ` → $${Number(entry.exitPrice).toFixed(2)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {pnl != null && (
                            <div className="text-right">
                              <p className={`text-sm font-bold ${pnlColor(pnl)}`}>
                                {pnl >= 0 ? "+" : ""}${Number(pnl).toFixed(2)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">P&L</p>
                            </div>
                          )}
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {!isExpanded && entry.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1 pl-[52px]">{entry.notes}</p>
                      )}

                      {isExpanded && (
                        <div className="mt-4 pl-[52px] space-y-4" onClick={e => e.stopPropagation()}>
                          {entry.notes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                <Brain className="h-3.5 w-3.5" /> Trade Notes
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                          )}
                          {entry.emotions && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                <span className="text-sm">{EMOJI[entry.emotions] ?? "🧠"}</span> Emotional State
                              </p>
                              <p className="text-sm">{entry.emotions}</p>
                            </div>
                          )}
                          {entry.lessons && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Lessons Learned
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{entry.lessons}</p>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="gap-1.5 h-8"
                              onClick={() => openEdit(entry)} data-testid={`button-edit-${entry.id}`}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button size="sm" variant="outline"
                              className="gap-1.5 h-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(entry.id)} data-testid={`button-delete-${entry.id}`}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Strategy breakdown */}
          {strategies.length >= 2 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" /> Strategy Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {strategies.map(s => {
                    const group = entries.filter(e => e.strategy === s);
                    const gWins = group.filter(e => (e.pnl ?? 0) > 0).length;
                    const gPnl  = group.reduce((sum, e) => sum + (e.pnl ?? 0), 0);
                    const gRate = Math.round((gWins / group.length) * 100);
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-40 truncate">{s}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full transition-all ${gPnl >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                            style={{ width: `${gRate}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-14 text-right">{gRate}% win</span>
                        <span className={`text-xs font-semibold w-16 text-right ${pnlColor(gPnl)}`}>
                          {gPnl >= 0 ? "+" : ""}${Math.abs(gPnl).toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emotion vs Performance */}
          {entries.some(e => e.emotions) && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" /> Emotion vs. Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EMOTION_OPTS.filter(opt => entries.some(e => e.emotions === opt.label)).map(opt => {
                    const group = entries.filter(e => e.emotions === opt.label);
                    const gPnl  = group.reduce((s, e) => s + (e.pnl ?? 0), 0);
                    const gWins = group.filter(e => (e.pnl ?? 0) > 0).length;
                    return (
                      <div key={opt.label} className="rounded-xl bg-muted/40 p-3 text-center">
                        <span className="text-2xl">{opt.emoji}</span>
                        <p className="text-xs font-medium mt-1 truncate">{opt.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${pnlColor(gPnl)}`}>
                          {gPnl >= 0 ? "+" : ""}${Math.abs(gPnl).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{group.length} trade{group.length !== 1 ? "s" : ""} · {gWins}W</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Import from closed trade */}
            {!editEntry && closedTrades.length > 0 && (
              <div>
                <Button
                  variant="outline" size="sm"
                  className="gap-2 w-full justify-start"
                  onClick={() => setShowImport(v => !v)}
                  data-testid="button-import-trade"
                >
                  <Download className="h-4 w-4" />
                  Import from a recent closed trade
                  {showImport
                    ? <ChevronUp className="h-3.5 w-3.5 ml-auto" />
                    : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
                </Button>
                {showImport && (
                  <div className="mt-2 rounded-lg border bg-muted/30 divide-y max-h-44 overflow-y-auto">
                    {closedTrades.map(t => (
                      <button
                        key={t.id}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                        onClick={() => handleImportTrade(t)}
                        data-testid={`import-trade-${t.id}`}
                      >
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          t.type === "buy"
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/20 text-rose-500"
                        }`}>{t.type.toUpperCase()}</span>
                        <span className="font-semibold text-sm">{t.symbol}</span>
                        <span className="text-xs text-muted-foreground flex-1">
                          {t.quantity} @ ${Number(t.entryPrice).toFixed(2)}
                          {t.exitPrice != null ? ` → $${Number(t.exitPrice).toFixed(2)}` : ""}
                        </span>
                        {t.profit != null && (
                          <span className={`text-xs font-semibold ${pnlColor(t.profit)}`}>
                            {t.profit >= 0 ? "+" : ""}${Number(t.profit).toFixed(2)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Symbol / Type / Date */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Symbol *</label>
                <Input
                  placeholder="AAPL"
                  value={form.symbol}
                  onChange={e => setField("symbol")(e.target.value.toUpperCase())}
                  data-testid="input-symbol"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type *</label>
                <Select value={form.type} onValueChange={setField("type")}>
                  <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setField("date")(e.target.value)}
                  data-testid="input-date"
                />
              </div>
            </div>

            {/* Prices / Qty / PnL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Entry Price *</label>
                <Input type="number" step="0.01" placeholder="0.00"
                  value={form.entryPrice} onChange={e => setField("entryPrice")(e.target.value)}
                  data-testid="input-entry-price" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Exit Price</label>
                <Input type="number" step="0.01" placeholder="0.00"
                  value={form.exitPrice} onChange={e => setField("exitPrice")(e.target.value)}
                  data-testid="input-exit-price" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity *</label>
                <Input type="number" step="0.01" placeholder="1"
                  value={form.quantity} onChange={e => setField("quantity")(e.target.value)}
                  data-testid="input-quantity" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">P&L ($)</label>
                <Input type="number" step="0.01" placeholder="e.g. 142.50"
                  value={form.pnl} onChange={e => setField("pnl")(e.target.value)}
                  data-testid="input-pnl" />
              </div>
            </div>

            {/* Strategy */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Strategy</label>
              <Select
                value={form.strategy || "__none"}
                onValueChange={v => setField("strategy")(v === "__none" ? "" : v)}
              >
                <SelectTrigger data-testid="select-strategy">
                  <SelectValue placeholder="Select a strategy…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— No strategy —</SelectItem>
                  {STRATEGY_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Emotion picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Emotional State</label>
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTS.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setField("emotions")(form.emotions === opt.label ? "" : opt.label)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.emotions === opt.label
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                    data-testid={`emotion-${opt.label.toLowerCase().replace(/[\s&]/g, "-")}`}
                  >
                    <span>{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5" /> Trade Notes
              </label>
              <Textarea
                placeholder="What happened? Why did you take this trade? Was the setup valid?"
                className="resize-none" rows={3}
                value={form.notes}
                onChange={e => setField("notes")(e.target.value)}
                data-testid="textarea-notes"
              />
            </div>

            {/* Lessons */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Lessons Learned
              </label>
              <Textarea
                placeholder="What would you do differently? What did this trade teach you?"
                className="resize-none" rows={2}
                value={form.lessons}
                onChange={e => setField("lessons")(e.target.value)}
                data-testid="textarea-lessons"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSubmit} disabled={isPending} data-testid="button-save-entry">
                {isPending ? "Saving…" : editEntry ? "Save Changes" : "Add Entry"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete entry?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This journal entry will be permanently removed.</p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive" className="flex-1"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
