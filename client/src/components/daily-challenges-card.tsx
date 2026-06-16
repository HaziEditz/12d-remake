import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Target, CheckCircle2, Gift } from "lucide-react";
import { fireBurst } from "@/lib/confetti";
import { useAuth } from "@/lib/auth-context";

interface Challenge {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
  emoji: string;
}

interface ChallengesData {
  date: string;
  challenges: Challenge[];
}

export function DailyChallengesCard({ variant = "default" }: { variant?: "default" | "primary" }) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const isPrimary = variant === "primary";

  const { data, isLoading } = useQuery<ChallengesData>({
    queryKey: ["/api/academy/daily-challenges"],
  });

  const claimMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/academy/daily-challenges/${id}/claim`);
      return res.json();
    },
    onSuccess: (result: any) => {
      if (result.success) {
        fireBurst();
        toast({ title: "Challenge complete!", description: result.message });
      } else {
        toast({ title: "Not yet", description: result.message, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/academy/daily-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refreshUser();
    },
  });

  const containerClass = isPrimary
    ? "rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4"
    : "rounded-2xl border border-border bg-card p-4";

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="h-32 animate-pulse" />
      </div>
    );
  }
  if (!data) return null;

  const completedCount = data.challenges.filter((c) => c.progress >= c.target).length;

  return (
    <div className={containerClass} data-testid="daily-challenges-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isPrimary ? "bg-amber-400" : "bg-primary/15"}`}>
            <Target className={`h-4 w-4 ${isPrimary ? "text-white" : "text-primary"}`} />
          </div>
          <div>
            <p className={`text-sm font-black ${isPrimary ? "text-amber-900" : "text-foreground"}`}>Daily Challenges</p>
            <p className={`text-[11px] ${isPrimary ? "text-amber-600" : "text-muted-foreground"}`}>
              Resets in {Math.ceil((24 - new Date().getHours()))}h • {completedCount}/{data.challenges.length} done
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.challenges.map((c) => {
          const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
          const ready = c.progress >= c.target && !c.claimed;
          return (
            <div
              key={c.id}
              className={`p-2.5 rounded-xl border transition-all ${
                c.claimed
                  ? isPrimary ? "bg-emerald-50 border-emerald-200 opacity-70" : "bg-emerald-500/5 border-emerald-500/20 opacity-70"
                  : ready
                  ? isPrimary ? "bg-amber-100 border-amber-400 shadow-sm" : "bg-primary/10 border-primary/40 shadow-sm"
                  : isPrimary ? "bg-white border-amber-100" : "bg-muted/30 border-border"
              }`}
              data-testid={`challenge-${c.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{c.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isPrimary ? "text-amber-900" : "text-foreground"}`}>
                      {c.title}
                    </p>
                    <p className={`text-[11px] ${isPrimary ? "text-amber-600" : "text-muted-foreground"}`}>
                      {c.description}
                    </p>
                  </div>
                </div>
                {c.claimed ? (
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    Claimed
                  </div>
                ) : ready ? (
                  <button
                    onClick={() => claimMutation.mutate(c.id)}
                    disabled={claimMutation.isPending}
                    className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${isPrimary ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-primary text-primary-foreground hover:opacity-90"} transition-opacity`}
                    data-testid={`button-claim-${c.id}`}
                  >
                    <Gift className="inline h-3 w-3 -mt-0.5 mr-0.5" /> +{c.reward}
                  </button>
                ) : (
                  <span className={`text-xs font-bold shrink-0 ${isPrimary ? "text-amber-700" : "text-primary"}`}>
                    +{c.reward} XP
                  </span>
                )}
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isPrimary ? "bg-amber-200" : "bg-muted"}`}>
                <div
                  className={`h-full transition-all duration-500 ${
                    c.claimed
                      ? "bg-emerald-400"
                      : ready
                      ? isPrimary ? "bg-amber-500" : "bg-primary"
                      : isPrimary ? "bg-amber-400" : "bg-primary/60"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={`text-[10px] mt-1 text-right ${isPrimary ? "text-amber-600" : "text-muted-foreground"}`}>
                {c.progress} / {c.target}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
