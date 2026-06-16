import { useAuth } from "@/lib/auth-context";
import { getLevelInfo, getLevelColor } from "@/lib/levels";
import { Sparkles, Zap } from "lucide-react";

export function XpProgressHeader({ variant = "default" }: { variant?: "default" | "primary" }) {
  const { user } = useAuth();
  const xp = user?.xp ?? 0;
  const info = getLevelInfo(xp);
  const gradient = getLevelColor(info.level);
  const isPrimary = variant === "primary";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 ${
        isPrimary
          ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
          : "bg-gradient-to-r from-card to-muted/40 border-border"
      }`}
      data-testid="xp-progress-header"
    >
      <div className="flex items-center gap-4">
        <div className={`relative h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <span className="text-xl font-black text-white drop-shadow" data-testid="text-level">
            {info.level}
          </span>
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 drop-shadow" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <p className={`text-sm font-bold ${isPrimary ? "text-amber-900" : "text-foreground"}`}>
              {info.title} <span className="text-xs font-medium opacity-70">• Lv {info.level}</span>
            </p>
            <p className={`text-xs font-semibold tabular-nums ${isPrimary ? "text-amber-700" : "text-muted-foreground"}`} data-testid="text-xp">
              {info.xpInLevel} / {info.xpForLevel} XP
            </p>
          </div>
          <div className={`h-2.5 w-full rounded-full overflow-hidden ${isPrimary ? "bg-amber-200" : "bg-muted"}`}>
            <div
              className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out relative`}
              style={{ width: `${info.progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className={`text-[11px] font-medium ${isPrimary ? "text-amber-600" : "text-muted-foreground"}`}>
              <Zap className="inline h-3 w-3 -mt-0.5 mr-0.5" />
              {info.xpToNext} XP to level {info.level + 1}
            </p>
            <p className={`text-[11px] font-bold ${isPrimary ? "text-amber-600" : "text-primary"}`}>
              Total {xp} XP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
