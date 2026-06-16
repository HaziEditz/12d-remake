import { useQuery } from "@tanstack/react-query";
import { Trophy, Target, Flame, TrendingUp, Brain, Zap } from "lucide-react";

interface Stats {
  totalLessons: number;
  completedLessons: number;
  totalQuizAttempts: number;
  avgAccuracy: number;
  bestStreak: number;
  currentStreak: number;
  bestCombo: number;
  recentAccuracy: number;
  improvedBy: number;
}

export function LearningStatsCard({ variant = "default" }: { variant?: "default" | "primary" }) {
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/academy/stats"] });
  const isPrimary = variant === "primary";

  if (!stats) return null;

  const cells = [
    { icon: Target, label: "Accuracy", value: `${stats.avgAccuracy}%`, color: "text-emerald-500" },
    { icon: Flame, label: "Best Streak", value: `${stats.bestStreak}d`, color: "text-orange-500" },
    { icon: Zap, label: "Best Combo", value: `${stats.bestCombo}×`, color: "text-yellow-500" },
    { icon: Brain, label: "Quizzes", value: `${stats.totalQuizAttempts}`, color: "text-purple-500" },
  ];

  const containerClass = isPrimary
    ? "rounded-2xl border-2 border-amber-200 bg-white p-4"
    : "rounded-2xl border border-border bg-card p-4";

  return (
    <div className={containerClass} data-testid="learning-stats-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${isPrimary ? "text-amber-500" : "text-primary"}`} />
          <p className={`text-sm font-black ${isPrimary ? "text-amber-900" : "text-foreground"}`}>Your Stats</p>
        </div>
        {stats.improvedBy > 0 && (
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-500" data-testid="text-improvement">
            <TrendingUp className="h-3 w-3" />
            +{stats.improvedBy}% improvement!
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-2 p-2.5 rounded-xl ${isPrimary ? "bg-amber-50" : "bg-muted/30"}`}
            data-testid={`stat-${c.label.toLowerCase().replace(" ", "-")}`}
          >
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <div className="leading-tight">
              <p className={`text-base font-black ${isPrimary ? "text-amber-900" : "text-foreground"}`}>{c.value}</p>
              <p className={`text-[10px] ${isPrimary ? "text-amber-600" : "text-muted-foreground"}`}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
