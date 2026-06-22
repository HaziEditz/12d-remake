import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SpinnerInput } from "@/components/spinner-input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Paywall } from "@/components/paywall";
import { useAuth } from "@/lib/auth-context";
import { getLevelInfo } from "@/lib/levels";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  PieChart,
  Target,
  BookOpen,
  BarChart2,
  Trophy,
  Users,
  Zap,
  ShoppingBag,
  Flame,
  Star,
  ArrowRight,
  Wallet,
  Activity,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { PortfolioItem, Lesson, LessonProgress } from "@shared/schema";

const portfolioItemSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10),
  name: z.string().min(1, "Name is required"),
  purchasePrice: z.coerce.number().positive("Must be positive"),
  currentPrice: z.coerce.number().positive("Must be positive"),
  quantity: z.coerce.number().positive("Must be positive"),
  notes: z.string().optional(),
});

type PortfolioFormData = z.infer<typeof portfolioItemSchema>;

// ─── Learning Activity Heatmap ───────────────────────────────────────────────

const WEEKS = 15;
const DAYS = 7;

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function LearningActivity() {
  const { user } = useAuth();
  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/lessons/progress"],
    enabled: !!user,
  });

  if (!user) return null;

  // Build date → count map from completedAt timestamps
  const countByDay = new Map<string, number>();
  for (const p of progress ?? []) {
    if (!p.completed || !p.completedAt) continue;
    const key = toDateKey(new Date(p.completedAt));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  // Build grid: WEEKS columns × 7 rows, newest column on the right
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Align to the start of the current week (Sunday)
  const startOfGrid = new Date(today);
  startOfGrid.setDate(today.getDate() - (today.getDay()) - (WEEKS - 1) * 7);

  const cells: { date: Date; key: string; count: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: Date; key: string; count: number }[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + w * 7 + d);
      const key = toDateKey(date);
      col.push({ date, key, count: countByDay.get(key) ?? 0 });
    }
    cells.push(col);
  }

  // Month labels: find the first cell of each month and label it
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  cells.forEach((col, wi) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: wi, label: col[0].date.toLocaleString("default", { month: "short" }) });
      lastMonth = m;
    }
  });

  // Weekly bar data (last 8 weeks)
  const weeklyBars = cells.slice(-8).map((col, i) => ({
    label: i === 7 ? "This wk" : `${(7 - i)}w ago`,
    total: col.reduce((s, c) => s + c.count, 0),
  }));
  const maxBar = Math.max(...weeklyBars.map(b => b.total), 1);

  // Summary stats
  const totalCompleted = countByDay.size > 0 ? [...countByDay.values()].reduce((a, b) => a + b, 0) : 0;
  const streak = (user as any).lessonStreak ?? 0;
  const activeDaysLast30 = [...countByDay.entries()]
    .filter(([key]) => {
      const d = new Date(key);
      const diff = (today.getTime() - d.getTime()) / 86400000;
      return diff <= 30;
    }).length;

  const cellColor = (count: number, isFuture: boolean) => {
    if (isFuture) return "bg-muted/30";
    if (count === 0) return "bg-muted/60 dark:bg-muted/30";
    if (count === 1) return "bg-primary/30 dark:bg-primary/25";
    if (count === 2) return "bg-primary/55 dark:bg-primary/50";
    return "bg-primary dark:bg-primary";
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Learning Activity
          </h2>
          <p className="text-sm text-muted-foreground">Your lesson completion history</p>
        </div>
        {/* Summary pills */}
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Flame className="h-4 w-4" />
              {streak}-day streak
            </div>
          )}
          <div className="text-sm text-muted-foreground hidden sm:block">
            <span className="font-semibold text-foreground">{activeDaysLast30}</span> active days (30d)
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: WEEKS * 18 }}>
              {/* Month labels */}
              <div className="flex mb-1" style={{ gap: 3 }}>
                <div style={{ width: 22 }} />
                {cells.map((col, wi) => {
                  const label = monthLabels.find(m => m.col === wi);
                  return (
                    <div key={wi} style={{ width: 14, minWidth: 14, fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                      {label ? label.label : ""}
                    </div>
                  );
                })}
              </div>

              {/* Day rows */}
              {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
                <div key={dayIdx} className="flex items-center" style={{ gap: 3, marginBottom: 3 }}>
                  {/* Day label (Mon/Wed/Fri only) */}
                  <div style={{ width: 22, fontSize: 9, color: "var(--muted-foreground)", textAlign: "right", paddingRight: 4 }}>
                    {dayIdx === 1 ? "Mon" : dayIdx === 3 ? "Wed" : dayIdx === 5 ? "Fri" : ""}
                  </div>
                  {cells.map((col, wi) => {
                    const cell = col[dayIdx];
                    const isFuture = cell.date > today;
                    const isToday = cell.key === toDateKey(today);
                    return (
                      <div
                        key={wi}
                        title={`${cell.date.toLocaleDateString("default", { month: "short", day: "numeric" })}: ${cell.count} lesson${cell.count !== 1 ? "s" : ""}`}
                        className={`rounded-sm transition-colors ${cellColor(cell.count, isFuture)} ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                        style={{ width: 14, height: 14, minWidth: 14, cursor: "default" }}
                        data-testid={isToday ? "heatmap-today" : undefined}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Colour legend */}
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Less</span>
                {[0, 1, 2, 3].map(n => (
                  <div key={n} className={`rounded-sm ${cellColor(n, false)}`} style={{ width: 12, height: 12 }} />
                ))}
                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>More</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t my-5" />

          {/* Weekly bars + stats */}
          <div className="grid md:grid-cols-2 gap-6 items-end">
            {/* Bar chart — last 8 weeks */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Weekly completions</p>
              <div className="flex items-end gap-1.5 h-16">
                {weeklyBars.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-sm transition-all ${i === weeklyBars.length - 1 ? "bg-primary" : "bg-primary/35"}`}
                      style={{ height: `${Math.round((bar.total / maxBar) * 52) + (bar.total > 0 ? 4 : 0)}px`, minHeight: bar.total > 0 ? 4 : 1 }}
                    />
                    {bar.total > 0 && (
                      <span className="text-[9px] text-muted-foreground font-medium">{bar.total}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1">
                {weeklyBars.map((_, i) => (
                  <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground/60">
                    {i === weeklyBars.length - 1 ? "Now" : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold text-primary leading-none mb-1">{totalCompleted}</p>
                <p className="text-[11px] text-muted-foreground">Total lessons</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold leading-none mb-1 flex items-center justify-center gap-0.5">
                  {streak > 0 ? <span className="text-amber-500">{streak}</span> : <span className="text-muted-foreground">0</span>}
                  {streak > 0 && <Flame className="h-4 w-4 text-amber-500" />}
                </p>
                <p className="text-[11px] text-muted-foreground">Day streak</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold leading-none mb-1">{activeDaysLast30}</p>
                <p className="text-[11px] text-muted-foreground">Active days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Lesson Recommendations ──────────────────────────────────────────────────

function LessonRecommendations() {
  const { user } = useAuth();
  const { data: lessons } = useQuery<Lesson[]>({ queryKey: ["/api/lessons"] });
  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/lessons/progress"],
    enabled: !!user,
  });

  if (!user || !lessons || lessons.length === 0) return null;

  const completedIds = new Set(
    progress?.filter(p => p.completed).map(p => p.lessonId) ?? []
  );
  const completedCount = completedIds.size;

  // Target difficulty based on progression
  const targetDiff =
    completedCount < 4 ? "beginner" :
    completedCount < 12 ? "intermediate" : "advanced";

  const diffScore = (d: string) => {
    const order = ["beginner", "intermediate", "advanced"];
    const target = order.indexOf(targetDiff);
    const actual = order.indexOf(d.toLowerCase());
    if (actual === target) return 5;
    if (actual === target - 1) return 2; // slightly easier
    if (actual === target + 1) return 1; // slightly harder
    return 0;
  };

  // Get categories already visited so we can diversify
  const visitedCategories = new Set(
    (lessons ?? []).filter(l => completedIds.has(l.id)).map(l => l.category)
  );

  const recommended = (lessons ?? [])
    .filter(l => {
      if (!l.isPublished) return false;
      if (completedIds.has(l.id)) return false;
      const prereqs = (l.prerequisites as string[] | null) ?? [];
      return prereqs.every(pid => completedIds.has(pid));
    })
    .map(l => ({
      lesson: l,
      score:
        diffScore(l.difficulty) +
        (visitedCategories.has(l.category) ? 0 : 1) - // +1 for new category
        (l.order ?? 99) * 0.01,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.lesson);

  if (recommended.length === 0) return null;

  const diffColor = (d: string) => {
    switch (d.toLowerCase()) {
      case "beginner": return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
      case "intermediate": return "text-amber-600 dark:text-amber-400 bg-amber-500/10";
      case "advanced": return "text-rose-600 dark:text-rose-400 bg-rose-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const progressLabel =
    completedCount === 0 ? "Just starting out" :
    completedCount < 5 ? `${completedCount} lessons done · building foundations` :
    completedCount < 15 ? `${completedCount} lessons done · levelling up` :
    `${completedCount} lessons done · advanced territory`;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Recommended for You
          </h2>
          <p className="text-sm text-muted-foreground">{progressLabel}</p>
        </div>
        <Link href="/lessons">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" data-testid="button-browse-all-lessons">
            Browse all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {recommended.map((lesson, idx) => (
          <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
            <Card
              className="h-full cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
              data-testid={`card-recommendation-${lesson.id}`}
            >
              <CardContent className="pt-5 pb-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {idx === 0 && completedCount === 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 bg-primary/10 text-primary border-0">Start here</Badge>
                    )}
                    <Badge variant="secondary" className={`text-[10px] capitalize ${diffColor(lesson.difficulty)}`}>
                      {lesson.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Title + description */}
                <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {lesson.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {lesson.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.duration ?? "?"}min
                    </span>
                    <span className="capitalize truncate max-w-[80px]">{lesson.category}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Trading Heatmap ─────────────────────────────────────────────────────────

type DayData = { count: number; profit: number; wins: number };

function tradingCellColor(data: DayData | undefined, isFuture: boolean) {
  if (isFuture) return "bg-muted/30";
  if (!data || data.count === 0) return "bg-muted/60 dark:bg-muted/30";
  const p = data.profit;
  if (p > 500) return "bg-emerald-600 dark:bg-emerald-500";
  if (p > 100) return "bg-emerald-500/80 dark:bg-emerald-500/70";
  if (p > 0)   return "bg-emerald-400/60 dark:bg-emerald-400/50";
  if (p > -100) return "bg-rose-400/60 dark:bg-rose-400/50";
  if (p > -500) return "bg-rose-500/80 dark:bg-rose-500/70";
  return "bg-rose-600 dark:bg-rose-500";
}

function TradingHeatmap() {
  const { user } = useAuth();
  const { data: rawData } = useQuery<Record<string, DayData>>({
    queryKey: ["/api/trading-heatmap"],
    enabled: !!user,
  });

  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfGrid = new Date(today);
  startOfGrid.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  const cells: { date: Date; key: string; data?: DayData }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: Date; key: string; data?: DayData }[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + w * 7 + d);
      const key = toDateKey(date);
      col.push({ date, key, data: rawData?.[key] });
    }
    cells.push(col);
  }

  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  cells.forEach((col, wi) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: wi, label: col[0].date.toLocaleString("default", { month: "short" }) });
      lastMonth = m;
    }
  });

  const allDays = Object.values(rawData ?? {});
  const totalTrades = allDays.reduce((s, d) => s + d.count, 0);
  const totalWins = allDays.reduce((s, d) => s + d.wins, 0);
  const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;
  const totalProfit = allDays.reduce((s, d) => s + d.profit, 0);
  const bestDay = allDays.length > 0 ? Math.max(...allDays.map(d => d.profit)) : 0;
  const activeTradeDays = allDays.filter(d => d.count > 0).length;

  // Weekly net P&L bars (last 8 weeks)
  const weeklyBars = cells.slice(-8).map((col, i) => {
    const net = col.reduce((s, c) => s + (c.data?.profit ?? 0), 0);
    return { label: i === 7 ? "Now" : "", net };
  });
  const maxAbs = Math.max(...weeklyBars.map(b => Math.abs(b.net)), 1);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-emerald-500" />
            Trading Activity
          </h2>
          <p className="text-sm text-muted-foreground">Daily simulator trade history — green = profit, red = loss</p>
        </div>
        <div className="flex items-center gap-3">
          {totalTrades > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              {winRate}% win rate
            </div>
          )}
          <div className="text-sm text-muted-foreground hidden sm:block">
            <span className="font-semibold text-foreground">{activeTradeDays}</span> active days
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="overflow-x-auto">
            <div style={{ minWidth: WEEKS * 18 }}>
              {/* Month labels */}
              <div className="flex mb-1" style={{ gap: 3 }}>
                <div style={{ width: 22 }} />
                {cells.map((col, wi) => {
                  const label = monthLabels.find(m => m.col === wi);
                  return (
                    <div key={wi} style={{ width: 14, minWidth: 14, fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                      {label ? label.label : ""}
                    </div>
                  );
                })}
              </div>

              {/* Day rows */}
              {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
                <div key={dayIdx} className="flex items-center" style={{ gap: 3, marginBottom: 3 }}>
                  <div style={{ width: 22, fontSize: 9, color: "var(--muted-foreground)", textAlign: "right", paddingRight: 4 }}>
                    {dayIdx === 1 ? "Mon" : dayIdx === 3 ? "Wed" : dayIdx === 5 ? "Fri" : ""}
                  </div>
                  {cells.map((col, wi) => {
                    const cell = col[dayIdx];
                    const isFuture = cell.date > today;
                    const isToday = cell.key === toDateKey(today);
                    const d = cell.data;
                    const tip = d
                      ? `${cell.date.toLocaleDateString("default", { month: "short", day: "numeric" })}: ${d.count} trade${d.count !== 1 ? "s" : ""}, ${d.profit >= 0 ? "+" : ""}$${d.profit.toFixed(0)}`
                      : cell.date.toLocaleDateString("default", { month: "short", day: "numeric" });
                    return (
                      <div
                        key={wi}
                        title={tip}
                        className={`rounded-sm transition-colors ${tradingCellColor(d, isFuture)} ${isToday ? "ring-1 ring-emerald-500 ring-offset-1 ring-offset-card" : ""}`}
                        style={{ width: 14, height: 14, minWidth: 14, cursor: "default" }}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 justify-end">
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Loss</span>
                  {["bg-rose-600", "bg-rose-500/80", "bg-rose-400/60"].map((c, i) => (
                    <div key={i} className={`rounded-sm ${c}`} style={{ width: 12, height: 12 }} />
                  ))}
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1">
                  {["bg-emerald-400/60", "bg-emerald-500/80", "bg-emerald-600"].map((c, i) => (
                    <div key={i} className={`rounded-sm ${c}`} style={{ width: 12, height: 12 }} />
                  ))}
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Profit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t my-5" />

          <div className="grid md:grid-cols-2 gap-6 items-end">
            {/* Weekly P&L bars */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Weekly net P&L</p>
              <div className="flex items-end gap-1.5 h-16">
                {weeklyBars.map((bar, i) => {
                  const h = Math.round((Math.abs(bar.net) / maxAbs) * 52) + (bar.net !== 0 ? 4 : 0);
                  const isPos = bar.net >= 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${i === weeklyBars.length - 1 ? (isPos ? "bg-emerald-500" : "bg-rose-500") : (isPos ? "bg-emerald-500/40" : "bg-rose-500/40")}`}
                        style={{ height: `${h}px`, minHeight: bar.net !== 0 ? 4 : 1 }}
                      />
                      {bar.net !== 0 && (
                        <span className={`text-[9px] font-medium ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isPos ? "+" : ""}{bar.net >= 0 ? "" : "-"}${Math.abs(bar.net).toFixed(0)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-1">
                {weeklyBars.map((b, i) => (
                  <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground/60">
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold leading-none mb-1">{totalTrades}</p>
                <p className="text-[11px] text-muted-foreground">Trades</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold leading-none mb-1 text-emerald-600 dark:text-emerald-400">{winRate}%</p>
                <p className="text-[11px] text-muted-foreground">Win rate</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className={`text-xl font-bold leading-none mb-1 ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(0)}
                </p>
                <p className="text-[11px] text-muted-foreground">Net P&L</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold leading-none mb-1 text-emerald-600 dark:text-emerald-400">
                  +${bestDay.toFixed(0)}
                </p>
                <p className="text-[11px] text-muted-foreground">Best day</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

type FeedItem = {
  type: "trade" | "lesson" | "achievement";
  timestamp: string;
  title: string;
  subtitle: string;
  meta?: string;
  positive?: boolean;
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function feedIcon(type: FeedItem["type"], positive?: boolean) {
  if (type === "trade") {
    return positive
      ? <TrendingUp className="h-4 w-4 text-success" />
      : <TrendingDown className="h-4 w-4 text-destructive" />;
  }
  if (type === "lesson") return <BookOpen className="h-4 w-4 text-primary" />;
  return <Trophy className="h-4 w-4 text-yellow-500" />;
}

function feedDotColor(type: FeedItem["type"], positive?: boolean) {
  if (type === "trade") return positive ? "bg-success" : "bg-destructive";
  if (type === "lesson") return "bg-primary";
  return "bg-yellow-500";
}

function ActivityFeed() {
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);

  const { data: feed, isLoading } = useQuery<FeedItem[]>({
    queryKey: ["/api/activity-feed"],
    enabled: !!user,
  });

  const visible = showAll ? (feed ?? []) : (feed ?? []).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Activity Feed
          </CardTitle>
          {(feed?.length ?? 0) > 8 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowAll(v => !v)}
              data-testid="button-toggle-feed"
            >
              {showAll ? "Show less" : `View all ${feed!.length}`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !feed || feed.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet — make a trade or complete a lesson!</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-1">
              {visible.map((item, i) => (
                <div key={i} className="flex items-start gap-3 pl-1 py-2 rounded-lg hover:bg-muted/50 transition-colors group" data-testid={`feed-item-${i}`}>
                  <div className="relative z-10 shrink-0">
                    <div className={`h-8 w-8 rounded-full border-2 border-background flex items-center justify-center ${
                      item.type === "achievement" ? "bg-yellow-500/10" :
                      item.type === "lesson" ? "bg-primary/10" :
                      item.positive ? "bg-success/10" : "bg-destructive/10"
                    }`}>
                      {feedIcon(item.type, item.positive)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${feedDotColor(item.type, item.positive)}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium leading-snug truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <div className="shrink-0 text-right pt-0.5">
                    {item.meta && (
                      <p className={`text-xs font-semibold ${item.positive ? "text-success" : "text-destructive"}`}>
                        {item.meta}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{timeAgo(item.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function WelcomeHero() {
  const { user } = useAuth();
  if (!user) return null;

  const levelInfo = getLevelInfo(user.xp);
  const xpForLevel = levelInfo.xpForLevel;
  const xpProgress = levelInfo.xpProgress;
  const xpPercent = xpForLevel > 0 ? Math.min(100, Math.round((xpProgress / xpForLevel) * 100)) : 0;
  const balance = user.simulatorBalance ?? 10000;
  const profit = user.totalProfit ?? 0;
  const streak = (user as any).lessonStreak ?? 0;
  const lessonsCompleted = user.lessonsCompleted ?? 0;
  const tier = user.membershipTier ?? "casual";

  const quickActions = [
    { label: "Simulator", icon: BarChart2, href: "/simulator", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20" },
    { label: "Lessons", icon: BookOpen, href: "/lessons", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20" },
    { label: "Leaderboard", icon: Trophy, href: "/leaderboard", color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20" },
    { label: "Friends", icon: Users, href: "/friends", color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" },
    { label: "Strategies", icon: Zap, href: "/strategies", color: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20" },
    { label: "Shop", icon: ShoppingBag, href: "/shop", color: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-indigo-500/20" },
  ];

  // Smart "where to go next" suggestion
  const suggestion = lessonsCompleted === 0
    ? { label: "Start your first lesson", href: "/lessons", icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" }
    : streak === 0
    ? { label: "Keep your streak alive — take a lesson", href: "/lessons", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" }
    : profit < 0
    ? { label: "Practice your strategy in the simulator", href: "/simulator", icon: BarChart2, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" }
    : { label: "Check the leaderboard — see your rank", href: "/leaderboard", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" };

  return (
    <div className="mb-8">
      {/* Top welcome bar */}
      <div className="rounded-2xl border bg-card p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
            {getInitials(user.displayName || user.email)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h2 className="text-xl font-bold truncate" data-testid="text-welcome-name">
              {getGreeting()}, {user.displayName || user.email.split("@")[0]}!
            </h2>
            <Badge variant="secondary" className="text-xs capitalize shrink-0">{tier}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="font-semibold text-foreground">{levelInfo.title}</span>
            <span>·</span>
            <span>Level {levelInfo.level}</span>
            <span>·</span>
            <span>{(user.xp ?? 0).toLocaleString()} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={xpPercent} className="h-1.5 flex-1 max-w-[200px]" />
            <span className="text-xs text-muted-foreground">{xpProgress}/{xpForLevel} to next level</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 sm:text-right">
          <div className="rounded-xl border bg-muted/30 px-3 py-2 min-w-[90px]" data-testid="stat-sim-balance">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Balance</p>
            <p className="text-base font-black text-foreground">${balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-3 py-2 min-w-[90px]" data-testid="stat-profit">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Profit</p>
            <p className={`text-base font-black ${profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {profit >= 0 ? "+" : ""}${profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-3 py-2 min-w-[90px]" data-testid="stat-streak">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> Streak</p>
            <p className="text-base font-black text-orange-500">{streak} day{streak !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-3 py-2 min-w-[90px]" data-testid="stat-lessons">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Lessons</p>
            <p className="text-base font-black text-foreground">{lessonsCompleted}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {quickActions.map(action => (
          <Link key={action.href} href={action.href}>
            <button
              data-testid={`btn-quick-${action.label.toLowerCase()}`}
              className={`w-full rounded-xl border px-2 py-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${action.color}`}
            >
              <action.icon className="h-5 w-5" />
              {action.label}
            </button>
          </Link>
        ))}
      </div>

      {/* Where to go next */}
      <Link href={suggestion.href}>
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity ${suggestion.bg}`} data-testid="card-next-suggestion">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${suggestion.bg}`}>
            <suggestion.icon className={`h-4 w-4 ${suggestion.color}`} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Where to go next</p>
            <p className={`text-sm font-bold ${suggestion.color}`}>{suggestion.label}</p>
          </div>
          <ArrowRight className={`h-4 w-4 ${suggestion.color} shrink-0`} />
        </div>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  const { data: portfolio, isLoading } = useQuery<PortfolioItem[]>({
    queryKey: ["/api/portfolio"],
  });

  const form = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioItemSchema),
    defaultValues: {
      symbol: "",
      name: "",
      purchasePrice: 0,
      currentPrice: 0,
      quantity: 0,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PortfolioFormData) => apiRequest("POST", "/api/portfolio", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Investment added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add investment", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PortfolioFormData }) =>
      apiRequest("PATCH", `/api/portfolio/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Investment updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update investment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/portfolio/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({ title: "Investment removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove investment", variant: "destructive" });
    },
  });

  const onSubmit = (data: PortfolioFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    form.reset({
      symbol: item.symbol,
      name: item.name,
      purchasePrice: item.purchasePrice,
      currentPrice: item.currentPrice,
      quantity: item.quantity,
      notes: item.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingItem(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const totalValue = portfolio?.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0) ?? 0;
  const totalCost = portfolio?.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0) ?? 0;
  const totalGainLoss = totalValue - totalCost;
  const percentageChange = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

  const chartData = [
    { name: "Jan", value: totalCost * 0.95 },
    { name: "Feb", value: totalCost * 0.98 },
    { name: "Mar", value: totalCost * 1.02 },
    { name: "Apr", value: totalCost * 0.99 },
    { name: "May", value: totalCost * 1.05 },
    { name: "Jun", value: totalValue },
  ];

  if (isLoading) {
    return (
      <Paywall featureName="the Dashboard">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-36 w-full rounded-2xl mb-4" />
          <div className="grid grid-cols-6 gap-2 mb-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          <Skeleton className="h-12 rounded-xl mb-8" />
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </Paywall>
    );
  }

  return (
    <Paywall featureName="the Dashboard">
      <div className="container mx-auto px-4 py-8">

        <WelcomeHero />

        <LearningActivity />

        <TradingHeatmap />

        <LessonRecommendations />

        <div className="mb-8">
          <ActivityFeed />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Portfolio</h2>
            <p className="text-muted-foreground text-sm">Track and manage your investment portfolio</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleOpenDialog} data-testid="button-add-investment">
                <Plus className="h-4 w-4" />
                Add Investment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Investment" : "Add Investment"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Symbol</FormLabel>
                          <FormControl>
                            <Input placeholder="AAPL" data-testid="input-symbol" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Apple Inc." data-testid="input-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" data-testid="input-purchase-price" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Price</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" data-testid="input-current-price" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <SpinnerInput
                              value={field.value}
                              onChange={(val) => field.onChange(val)}
                              min={0.01}
                              step={0.1}
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Any notes about this investment" data-testid="input-notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-investment"
                  >
                    {editingItem ? "Update Investment" : "Add Investment"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold" data-testid="text-total-value">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${totalGainLoss >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  {totalGainLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
              <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`} data-testid="text-gain-loss">
                {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-1">({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)</span>
              </p>
              <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-chart-3" />
                </div>
              </div>
              <p className="text-2xl font-bold" data-testid="text-investments-count">
                {portfolio?.length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Investments</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Performance Tracker</CardTitle>
            <CardDescription>Your portfolio performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Investments</CardTitle>
            <CardDescription>Manage your tracked investments</CardDescription>
          </CardHeader>
          <CardContent>
            {(!portfolio || portfolio.length === 0) ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No investments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your investments to monitor your portfolio growth.
                </p>
                <Button onClick={handleOpenDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Investment
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {portfolio.map((item) => {
                  const gainLoss = (item.currentPrice - item.purchasePrice) * item.quantity;
                  const percentage = ((item.currentPrice - item.purchasePrice) / item.purchasePrice) * 100;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                      data-testid={`row-investment-${item.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">
                          {item.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{item.symbol}</p>
                          <p className="text-sm text-muted-foreground">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(item.currentPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className={`text-sm ${gainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {gainLoss >= 0 ? '+' : ''}{percentage.toFixed(2)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Paywall>
  );
}
