import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Gift } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";
import { useAuth } from "@/lib/auth-context";

export function LuckyBonusCard({ variant = "default" }: { variant?: "default" | "primary" }) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [revealed, setRevealed] = useState<{ emoji: string; name: string; xp: number; tokens: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const isPrimary = variant === "primary";

  const { data: status } = useQuery<{ available: boolean; nextAvailable: string | null }>({
    queryKey: ["/api/academy/lucky-bonus"],
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/academy/lucky-bonus/claim");
      return res.json();
    },
    onSuccess: (result: any) => {
      if (result.success) {
        setSpinning(true);
        setTimeout(() => {
          setRevealed({ emoji: result.rewardEmoji, name: result.rewardName, xp: result.xpAwarded, tokens: result.tokensAwarded });
          setSpinning(false);
          fireConfetti({ particleCount: 80 });
          toast({ title: result.rewardName, description: result.message });
        }, 1100);
      } else {
        toast({ title: "Already claimed", description: result.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/academy/lucky-bonus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refreshUser();
    },
  });

  const containerClass = isPrimary
    ? "rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 p-4 overflow-hidden relative"
    : "rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-amber-500/10 p-4 overflow-hidden relative";

  return (
    <div className={containerClass} data-testid="lucky-bonus-card">
      <div className="absolute -top-4 -right-4 text-6xl opacity-10 select-none">🎁</div>
      <div className="flex items-center justify-between gap-4 relative">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl ${spinning ? "animate-spin" : ""} ${isPrimary ? "bg-purple-400" : "bg-purple-500/30"}`}>
            {revealed ? revealed.emoji : "🎁"}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-black ${isPrimary ? "text-purple-900" : "text-foreground"}`}>
              {revealed ? revealed.name : "Lucky Bonus"}
            </p>
            <p className={`text-[11px] ${isPrimary ? "text-purple-700" : "text-muted-foreground"}`}>
              {revealed
                ? `+${revealed.xp} XP, +${revealed.tokens} tokens`
                : status?.available
                ? "Free reward — once per day!"
                : "Come back tomorrow"}
            </p>
          </div>
        </div>
        <button
          onClick={() => claimMutation.mutate()}
          disabled={!status?.available || claimMutation.isPending || spinning}
          className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all ${
            !status?.available
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : isPrimary
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 hover:scale-105"
              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 hover:scale-105"
          }`}
          data-testid="button-claim-lucky"
        >
          {spinning ? "Spinning..." : revealed ? "Done!" : status?.available ? (<><Sparkles className="inline h-3 w-3 -mt-0.5 mr-1" />Claim</>) : "Tomorrow"}
        </button>
      </div>
    </div>
  );
}
