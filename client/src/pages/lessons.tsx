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
  Zap
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

export default function LessonsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showFilter, setShowFilter] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>

      {(!lessons || lessons.length === 0) && (
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
