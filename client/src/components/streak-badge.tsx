import { Flame, Snowflake } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function StreakBadge({ variant = "default" }: { variant?: "default" | "primary" | "compact" }) {
  const { user } = useAuth();
  const streak = (user as any)?.lessonStreak ?? 0;
  const freezes = (user as any)?.streakFreezes ?? 0;

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1 text-sm font-bold" data-testid="streak-badge">
        <Flame className={`h-4 w-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        <span className={streak > 0 ? "text-orange-500" : "text-muted-foreground"}>{streak}</span>
      </div>
    );
  }

  const isPrimary = variant === "primary";
  const containerClass = isPrimary
    ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300"
    : "flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30";

  return (
    <div className={containerClass} data-testid="streak-badge">
      <div className={`relative ${streak > 0 ? "animate-pulse" : ""}`}>
        <Flame className={`h-7 w-7 ${streak > 0 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "text-muted-foreground"}`} />
      </div>
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black ${isPrimary ? "text-orange-700" : "text-orange-500"}`} data-testid="text-streak-count">
            {streak}
          </span>
          <span className={`text-xs font-semibold ${isPrimary ? "text-orange-600" : "text-orange-400"}`}>
            day{streak === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-medium ${isPrimary ? "text-orange-600/70" : "text-muted-foreground"}`}>Streak</span>
          {freezes > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-cyan-500" title="Streak freezes available">
              <Snowflake className="h-2.5 w-2.5" />
              {freezes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
