import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Paywall } from "@/components/paywall";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  PlayCircle,
  ChevronRight,
  Filter,
  Lock,
  Sparkles,
  X,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Timer,
  GraduationCap,
  LayoutGrid,
  TrendingUp,
  Coins,
  Globe,
  BarChart3,
  Brain,
  Briefcase,
  Newspaper,
  Zap,
  GitFork,
} from "lucide-react";
import type { Lesson, LessonProgress } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { isTrialUser } from "@/lib/subscription";
import { XpProgressHeader } from "@/components/xp-progress-header";
import { StreakBadge } from "@/components/streak-badge";
import { DailyChallengesCard } from "@/components/daily-challenges-card";
import { LuckyBonusCard } from "@/components/lucky-bonus-card";
import { LearningStatsCard } from "@/components/learning-stats-card";
import { AssignmentsPanel } from "@/components/assignments-panel";

// ─── Prerequisite path map ───────────────────────────────────────────────────

const NODE_W = 210;
const NODE_H = 72;
const COL_GAP = 88;
const ROW_GAP = 14;

function wrapTitle(text: string): [string, string] {
  const max = 22;
  if (text.length <= max) return [text, ""];
  const idx = text.lastIndexOf(" ", max);
  if (idx === -1) return [text.slice(0, max) + "…", ""];
  const rest = text.slice(idx + 1);
  return [text.slice(0, idx), rest.length > max ? rest.slice(0, max) + "…" : rest];
}

function LessonPathMap({
  lessons,
  completedLessonIds,
  isLockedFn,
  isPrereqLockedFn,
  navigate,
}: {
  lessons: Lesson[];
  completedLessonIds: Set<string>;
  isLockedFn: (l: Lesson) => boolean;
  isPrereqLockedFn: (l: Lesson) => boolean;
  navigate: (path: string) => void;
}) {
  const PADDING = 24;

  // Build maps
  const prereqMap = new Map<string, string[]>();
  const dependentMap = new Map<string, string[]>();
  for (const l of lessons) {
    const prereqs = (l.prerequisites as string[] | null) ?? [];
    prereqMap.set(l.id, prereqs);
    if (!dependentMap.has(l.id)) dependentMap.set(l.id, []);
    for (const pid of prereqs) {
      if (!dependentMap.has(pid)) dependentMap.set(pid, []);
      dependentMap.get(pid)!.push(l.id);
    }
  }

  // Assign layers (max-depth topological)
  const layerOf = new Map<string, number>();
  const getLayer = (id: string, visited = new Set<string>()): number => {
    if (layerOf.has(id)) return layerOf.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const prereqs = prereqMap.get(id) ?? [];
    const layer = prereqs.length === 0 ? 0 : Math.max(...prereqs.map(pid => getLayer(pid, new Set(visited)))) + 1;
    layerOf.set(id, layer);
    return layer;
  };
  for (const l of lessons) getLayer(l.id);

  // Group by layer, sort by order
  const layerGroups = new Map<number, Lesson[]>();
  for (const l of lessons) {
    const layer = layerOf.get(l.id) ?? 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(l);
  }
  for (const [, g] of layerGroups) g.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Assign positions
  const posMap = new Map<string, { x: number; y: number }>();
  const maxLayer = layerGroups.size > 0 ? Math.max(...layerOf.values()) : 0;
  for (let col = 0; col <= maxLayer; col++) {
    const group = layerGroups.get(col) ?? [];
    for (let row = 0; row < group.length; row++) {
      posMap.set(group[row].id, {
        x: PADDING + col * (NODE_W + COL_GAP),
        y: PADDING + row * (NODE_H + ROW_GAP),
      });
    }
  }

  const maxRowCount = Math.max(...Array.from(layerGroups.values()).map(g => g.length), 1);
  const canvasW = PADDING * 2 + (maxLayer + 1) * NODE_W + maxLayer * COL_GAP;
  const canvasH = PADDING * 2 + maxRowCount * (NODE_H + ROW_GAP);
  const hasEdges = lessons.some(l => ((l.prerequisites as string[] | null) ?? []).length > 0);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-2.5 border-b bg-muted/30 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Learning Path</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-emerald-500 bg-emerald-500/20" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-blue-500 bg-blue-500/15" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-amber-500 bg-amber-500/15" />
          Needs prerequisites
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-slate-500/50 bg-slate-500/10" />
          Paywall locked
        </span>
        <span className="ml-auto italic">Click any lesson to open it</span>
      </div>

      {!hasEdges && (
        <div className="px-6 py-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/40 dark:border-amber-800/40 flex items-center gap-2">
          <GitFork className="h-3.5 w-3.5 shrink-0" />
          No prerequisites set yet — add them in Admin → Lessons to see the dependency tree.
        </div>
      )}

      {/* SVG map */}
      <div className="overflow-auto">
        <svg
          width={Math.max(canvasW, 320)}
          height={Math.max(canvasH, 200)}
          className="select-none block"
          style={{ minWidth: Math.max(canvasW, 320) }}
        >
          <defs>
            <marker id="pm-arrow" markerWidth={9} markerHeight={9} refX={7} refY={3} orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#64748b" fillOpacity={0.7} />
            </marker>
          </defs>

          {/* Edges */}
          {lessons.flatMap(lesson => {
            const to = posMap.get(lesson.id);
            if (!to) return [];
            return (prereqMap.get(lesson.id) ?? []).map(pid => {
              const from = posMap.get(pid);
              if (!from) return null;
              const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2;
              const x2 = to.x, y2 = to.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${pid}→${lesson.id}`}
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  markerEnd="url(#pm-arrow)"
                  opacity={0.65}
                />
              );
            }).filter(Boolean);
          })}

          {/* Nodes */}
          {lessons.map(lesson => {
            const pos = posMap.get(lesson.id);
            if (!pos) return null;
            const completed = completedLessonIds.has(lesson.id);
            const locked = isLockedFn(lesson);
            const prereqLocked = isPrereqLockedFn(lesson);

            let stroke = "#3b82f6";
            let fill = "#3b82f6";
            let fillOpacity = 0.13;
            let textFill = "#cbd5e1";
            let metaFill = "#64748b";
            if (completed) { stroke = "#22c55e"; fill = "#22c55e"; fillOpacity = 0.16; }
            else if (prereqLocked) { stroke = "#f59e0b"; fill = "#f59e0b"; fillOpacity = 0.1; }
            else if (locked) { stroke = "#64748b"; fill = "#64748b"; fillOpacity = 0.08; textFill = "#94a3b8"; }

            const [line1, line2] = wrapTitle(lesson.title);
            const titleY = line2 ? 22 : 30;

            return (
              <g
                key={lesson.id}
                transform={`translate(${pos.x},${pos.y})`}
                onClick={() => navigate(`/lessons/${lesson.id}`)}
                style={{ cursor: "pointer" }}
                data-testid={`map-node-${lesson.id}`}
              >
                {/* Drop shadow */}
                <rect x={2} y={3} width={NODE_W} height={NODE_H} rx={10} fill="black" opacity={0.18} />
                {/* Card body */}
                <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={10}
                  fill={fill} fillOpacity={fillOpacity}
                  stroke={stroke} strokeWidth={completed ? 2.5 : 1.8}
                />
                {/* Hover highlight (CSS hover on SVG group) */}
                <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={10}
                  fill="white" fillOpacity={0} stroke="none"
                  className="transition-all group-hover:fill-opacity-5"
                />
                {/* Title */}
                <text x={12} y={titleY} fontSize={12.5} fontWeight={600} fill={textFill} fontFamily="inherit">
                  {line1}
                </text>
                {line2 && (
                  <text x={12} y={titleY + 16} fontSize={12.5} fontWeight={600} fill={textFill} fontFamily="inherit">
                    {line2}
                  </text>
                )}
                {/* Meta row */}
                <text x={12} y={NODE_H - 11} fontSize={10} fill={metaFill} fontFamily="inherit" textAnchor="start">
                  {lesson.difficulty} · {lesson.duration ?? "?"}min · {lesson.category}
                </text>
                {/* Status badge */}
                {completed && (
                  <>
                    <circle cx={NODE_W - 14} cy={14} r={8} fill="#22c55e" opacity={0.95} />
                    <text x={NODE_W - 14} y={18.5} fontSize={10} textAnchor="middle" fill="white" fontWeight={700} fontFamily="inherit">✓</text>
                  </>
                )}
                {prereqLocked && !completed && (
                  <circle cx={NODE_W - 14} cy={14} r={8} fill="#f59e0b" opacity={0.9} />
                )}
                {locked && (
                  <circle cx={NODE_W - 14} cy={14} r={8} fill="#64748b" opacity={0.7} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LessonsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showFilter, setShowFilter] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  const normalizeCategory = (cat: string): string => {
    const raw = cat.toLowerCase().trim();
    const map: Record<string, string> = {
      "technical analysis": "technical",
      "technical-analysis": "technical",
      "fundamental analysis": "fundamental",
      "fundamental-analysis": "fundamental",
      "risk management": "risk",
      "risk-management": "risk",
      "chart patterns": "charts",
      "chart-patterns": "charts",
      "portfolio management": "portfolio",
      "portfolio-management": "portfolio",
      "news trading": "news",
      "news-trading": "news",
    };
    return map[raw] ?? raw;
  };

  const categories = [
    { id: "all", label: "All", icon: LayoutGrid },
    { id: "basics", label: "Basics", icon: BookOpen },
    { id: "technical", label: "Technical Analysis", icon: BarChart3 },
    { id: "fundamental", label: "Fundamentals", icon: Newspaper },
    { id: "psychology", label: "Psychology", icon: Brain },
    { id: "advanced", label: "Advanced", icon: Sparkles },
    { id: "strategies", label: "Strategies", icon: Zap },
    { id: "risk", label: "Risk Management", icon: Briefcase },
    { id: "options", label: "Options", icon: TrendingUp },
    { id: "crypto", label: "Crypto", icon: Coins },
    { id: "forex", label: "Forex", icon: Globe },
    { id: "economics", label: "Economics", icon: GraduationCap },
    { id: "charts", label: "Chart Patterns", icon: BarChart3 },
    { id: "portfolio", label: "Portfolio", icon: Briefcase },
    { id: "news", label: "News Trading", icon: Newspaper },
  ];

  const sortOptions = [
    { id: "default", label: "Default", icon: ArrowUpDown },
    { id: "az", label: "A-Z", icon: SortAsc },
    { id: "za", label: "Z-A", icon: SortDesc },
    { id: "shortest", label: "Shortest First", icon: Timer },
    { id: "longest", label: "Longest First", icon: Clock },
    { id: "beginner", label: "Beginner First", icon: GraduationCap },
    { id: "advanced", label: "Advanced First", icon: Sparkles },
  ];

  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/lessons/progress"],
    enabled: !!user,
  });

  const getDifficultyValue = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return 1;
      case "intermediate": return 2;
      case "advanced": return 3;
      default: return 0;
    }
  };

  const filteredAndSortedLessons = (lessons ?? [])
    .filter(lesson => {
      const diffMatch = filterDifficulty === "all" || lesson.difficulty.toLowerCase() === filterDifficulty;
      const catMatch = filterCategory === "all" || normalizeCategory(lesson.category) === filterCategory;
      return diffMatch && catMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "az":
          return a.title.localeCompare(b.title);
        case "za":
          return b.title.localeCompare(a.title);
        case "shortest":
          return (a.duration || 0) - (b.duration || 0);
        case "longest":
          return (b.duration || 0) - (a.duration || 0);
        case "beginner":
          return getDifficultyValue(a.difficulty) - getDifficultyValue(b.difficulty);
        case "advanced":
          return getDifficultyValue(b.difficulty) - getDifficultyValue(a.difficulty);
        default:
          return 0;
      }
    });

  const completedLessonIds = new Set(
    progress?.filter(p => p.completed).map(p => p.lessonId) ?? []
  );

  const totalLessons = lessons?.length ?? 0;
  const completedCount = completedLessonIds.size;
  const completionPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return "bg-success/10 text-success";
      case "intermediate": return "bg-chart-4/10 text-chart-4";
      case "advanced": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isDemoUser = isTrialUser(user);
  
  const isLessonLocked = (lesson: Lesson) => {
    if (!isDemoUser) return false;
    const difficulty = lesson.difficulty.toLowerCase();
    return difficulty === "intermediate" || difficulty === "advanced";
  };

  const isPrerequisiteLocked = (lesson: Lesson) => {
    if (!user) return false;
    const prereqs = (lesson.prerequisites as string[] | null) ?? [];
    if (prereqs.length === 0) return false;
    return prereqs.some(pid => !completedLessonIds.has(pid));
  };

  const availableLessons = lessons?.filter(l => !isLessonLocked(l)) ?? [];
  const lockedLessons = lessons?.filter(l => isLessonLocked(l)) ?? [];
  
  const nextLesson = availableLessons.find(l => !completedLessonIds.has(l.id));

  if (lessonsLoading) {
    return (
      <Paywall featureName="Lessons">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Paywall>
    );
  }

  return (
    <Paywall featureName="Lessons">
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lessons</h1>
          <p className="text-muted-foreground">
            Master trading through our comprehensive curriculum
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-none border-0 h-9 px-3"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-none border-0 border-l h-9 px-3"
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <GitFork className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Path Map</span>
            </Button>
          </div>
          <Button 
            variant={showFilter ? "default" : "outline"} 
            className="gap-2"
            onClick={() => setShowFilter(!showFilter)}
            data-testid="button-filter-lessons"
          >
            <Filter className="h-4 w-4" />
            Filter
            {(filterDifficulty !== "all" || filterCategory !== "all") && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {[filterDifficulty !== "all", filterCategory !== "all"].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {showFilter && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sort By</p>
                <div className="flex gap-2 flex-wrap">
                  {sortOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={sortBy === option.id ? "default" : "secondary"}
                      size="sm"
                      className="h-8 gap-1.5 rounded-full"
                      onClick={() => setSortBy(option.id)}
                      data-testid={`sort-${option.id}`}
                    >
                      <option.icon className="h-3.5 w-3.5" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Difficulty</p>
                <div className="flex gap-2 flex-wrap">
                  {["all", "beginner", "intermediate", "advanced"].map((d) => (
                    <Button
                      key={d}
                      variant={filterDifficulty === d ? "default" : "secondary"}
                      size="sm"
                      className="h-8 rounded-full capitalize"
                      onClick={() => setFilterDifficulty(d)}
                      data-testid={`filter-difficulty-${d}`}
                    >
                      {d === "all" ? "All" : d}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Category</p>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={filterCategory === cat.id ? "default" : "secondary"}
                      size="sm"
                      className="h-8 gap-1.5 rounded-full"
                      onClick={() => setFilterCategory(cat.id)}
                      data-testid={`filter-category-${cat.id}`}
                    >
                      <cat.icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              {(filterDifficulty !== "all" || filterCategory !== "all" || sortBy !== "default") && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFilterDifficulty("all"); setFilterCategory("all"); setSortBy("default"); }}
                    className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3.5 w-3.5" /> Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gamification header */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <XpProgressHeader />
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {completedCount} of {totalLessons} lessons completed
                    </p>
                  </div>
                </div>
                <div className="flex-1 max-w-sm">
                  <Progress value={completionPercentage} className="h-3" />
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{Math.round(completionPercentage)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <LearningStatsCard />
        </div>
        <div className="space-y-4">
          <StreakBadge />
          <AssignmentsPanel linkBase="/lessons" />
          <LuckyBonusCard />
          <DailyChallengesCard />
        </div>
      </div>

      {isDemoUser && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <Lock className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span>
              Demo accounts can only access beginner lessons. 
              <span className="font-medium"> Upgrade to unlock all {totalLessons} lessons!</span>
            </span>
            <Link href="/pricing">
              <Button size="sm" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Upgrade Now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {nextLesson && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-primary font-medium mb-1">Continue Learning</p>
                  <h3 className="font-semibold text-lg">{nextLesson.title}</h3>
                </div>
              </div>
              <Button 
                className="gap-2" 
                data-testid="button-continue-lesson"
                onClick={() => navigate(`/lessons/${nextLesson.id}`)}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "map" && (
        <div className="mb-6">
          <LessonPathMap
            lessons={lessons ?? []}
            completedLessonIds={completedLessonIds}
            isLockedFn={isLessonLocked}
            isPrereqLockedFn={isPrerequisiteLocked}
            navigate={navigate}
          />
        </div>
      )}

      {viewMode === "grid" && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedLessons.map((lesson) => {
          const isCompleted = completedLessonIds.has(lesson.id);
          const isLocked = isLessonLocked(lesson);
          const isPrereqLocked = !isLocked && isPrerequisiteLocked(lesson);
          const prereqCount = ((lesson.prerequisites as string[] | null) ?? []).length;
          return (
            <Card 
              key={lesson.id} 
              className={`transition-all ${isCompleted ? "opacity-75" : ""} ${isLocked ? "opacity-60" : ""} ${isPrereqLocked ? "border-amber-300/40 dark:border-amber-700/40" : ""}`}
              data-testid={`card-lesson-${lesson.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge 
                        variant="secondary" 
                        className={`capitalize ${getDifficultyColor(lesson.difficulty)}`}
                      >
                        {lesson.difficulty}
                      </Badge>
                      {isLocked && (
                        <Lock className="h-4 w-4 text-amber-500" />
                      )}
                      {isPrereqLocked && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 border-amber-400/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                          <Lock className="h-2.5 w-2.5" />
                          {prereqCount} prereq{prereqCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {isCompleted && !isLocked && !isPrereqLocked && (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {lesson.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {lesson.duration} min
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {lesson.category}
                    </Badge>
                  </div>
                  {isLocked ? (
                    <Link href="/pricing">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-1"
                        data-testid={`button-unlock-lesson-${lesson.id}`}
                      >
                        <Lock className="h-3 w-3" />
                        Unlock
                      </Button>
                    </Link>
                  ) : isPrereqLocked ? (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="gap-1 border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      data-testid={`button-prereq-lesson-${lesson.id}`}
                      onClick={() => navigate(`/lessons/${lesson.id}`)}
                    >
                      <Lock className="h-3 w-3" />
                      View
                    </Button>
                  ) : (
                    <Button 
                      variant={isCompleted ? "outline" : "default"} 
                      size="sm"
                      data-testid={`button-start-lesson-${lesson.id}`}
                      onClick={() => navigate(`/lessons/${lesson.id}`)}
                    >
                      {isCompleted ? "Review" : "Start"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>}

      {viewMode === "grid" && (!lessons || lessons.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
            <p className="text-muted-foreground">
              Lessons will appear here once they are created by an admin.
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </Paywall>
  );
}
