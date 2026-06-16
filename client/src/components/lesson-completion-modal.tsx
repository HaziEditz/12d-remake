import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Flame, ChevronRight, Snowflake, Trophy, Star } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";
import { getLevelInfo, getLevelColor } from "@/lib/levels";
import { playLessonCompleteSound, playAchievementSound } from "@/lib/sounds";

export interface CompletionResult {
  xpAwarded: number;
  bonusXp: number;
  newXp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  streak: number;
  bestStreak: number;
  streakProtected: boolean;
  isNewCompletion: boolean;
}

const HYPE_MESSAGES = [
  "You're on fire! 🔥",
  "Crushing it!",
  "Too easy for you!",
  "That was clean!",
  "Knowledge unlocked!",
  "You're unstoppable!",
  "Smart move!",
  "Brain power!",
];

interface Props {
  open: boolean;
  onClose: () => void;
  result: CompletionResult | null;
  onNext?: () => void;
  hasNext?: boolean;
  variant?: "default" | "primary";
}

export function LessonCompletionModal({ open, onClose, result, onNext, hasNext, variant = "default" }: Props) {
  const isPrimary = variant === "primary";

  useEffect(() => {
    if (open && result) {
      const t1 = setTimeout(() => {
        fireConfetti({ particleCount: result.leveledUp ? 200 : 120 });
        if (result.leveledUp) playAchievementSound();
        else playLessonCompleteSound();
      }, 200);
      return () => clearTimeout(t1);
    }
  }, [open, result]);

  if (!result) return null;

  const newLevelInfo = getLevelInfo(result.newXp);
  const gradient = getLevelColor(newLevelInfo.level);
  const hype = HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 gap-0">
        <DialogTitle className="sr-only">Lesson Complete</DialogTitle>
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-br ${gradient} p-6 text-center text-white`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-4 text-2xl">⭐</div>
            <div className="absolute top-6 right-6 text-xl">✨</div>
            <div className="absolute bottom-4 left-8 text-2xl">💫</div>
            <div className="absolute bottom-2 right-4 text-xl">🌟</div>
          </div>
          <div className="relative">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm mb-3 animate-bounce">
              <Trophy className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-black mb-1" data-testid="text-completion-title">
              {result.isNewCompletion ? "Lesson Complete!" : "Lesson Reviewed!"}
            </h2>
            <p className="text-sm font-semibold text-white/90">{hype}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* XP gain */}
          <div className="text-center" data-testid="text-xp-gained">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-black text-2xl">
              <Sparkles className="h-6 w-6" />+{result.xpAwarded} XP
            </div>
            {result.bonusXp > 0 && (
              <p className="text-xs font-bold text-amber-500 mt-2 animate-pulse" data-testid="text-bonus-xp">
                ✨ Surprise bonus +{result.bonusXp} XP!
              </p>
            )}
          </div>

          {/* Level up celebration */}
          {result.leveledUp && (
            <div className={`p-4 rounded-2xl bg-gradient-to-r ${gradient} text-white text-center`} data-testid="text-level-up">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Level Up!</p>
              <p className="text-3xl font-black flex items-center justify-center gap-2">
                <Star className="h-6 w-6" />
                Level {result.newLevel}
                <Star className="h-6 w-6" />
              </p>
              <p className="text-xs font-medium opacity-90">{newLevelInfo.title}</p>
            </div>
          )}

          {/* Level progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Lv {newLevelInfo.level} • {newLevelInfo.title}</span>
              <span className="text-muted-foreground tabular-nums">{newLevelInfo.xpInLevel} / {newLevelInfo.xpForLevel} XP</span>
            </div>
            <Progress value={newLevelInfo.progress} className="h-3" />
            <p className="text-[11px] text-muted-foreground text-right">
              {newLevelInfo.xpToNext} XP to Lv {newLevelInfo.level + 1}
            </p>
          </div>

          {/* Streak update */}
          {result.isNewCompletion && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30" data-testid="text-streak">
              <Flame className="h-7 w-7 text-orange-500 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              <div className="flex-1">
                <p className="text-sm font-black text-orange-500">{result.streak} day streak!</p>
                <p className="text-[11px] text-muted-foreground">
                  {result.streakProtected ? (
                    <span className="inline-flex items-center gap-1"><Snowflake className="h-3 w-3 text-cyan-500" /> Streak freeze used!</span>
                  ) : result.streak === 1 ? "You started a new streak!" : `Best: ${result.bestStreak} days`}
                </p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-close-modal">
              Close
            </Button>
            {hasNext && onNext && (
              <Button onClick={onNext} className="flex-1 gap-1" data-testid="button-next-from-modal">
                Next Lesson <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
