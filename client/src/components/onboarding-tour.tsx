import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Sparkles, BookOpen, X } from "lucide-react";

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  bullets?: string[];
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "",
    title: "Welcome to 12Digits! 🚀",
    description: "Your journey to professional trading starts here. This quick tour will show you around the platform — it only takes a minute!",
    icon: "🎉",
    position: "center",
    bullets: [
      "📊 Practice trading with real-time market data",
      "📚 Learn from structured lessons at your own pace",
      "🏆 Compete on the global leaderboard",
      "💰 Start with $10,000 in virtual money — no risk!",
    ],
    tip: "You can restart this tour anytime from the Help menu.",
  },
  {
    targetId: "onboarding-nav-dashboard",
    title: "Your Dashboard",
    description: "This is your home base. See your portfolio performance, recent trades, and key stats at a glance.",
    icon: "📊",
    position: "bottom",
    bullets: [
      "📈 Track your P&L over time",
      "💼 Monitor your open positions",
      "🎯 See your trading accuracy",
    ],
    tip: "Check your dashboard daily to stay on top of your performance.",
  },
  {
    targetId: "onboarding-nav-lessons",
    title: "The Academy",
    description: "Master trading from the ground up. Bite-sized lessons take you from complete beginner to confident trader.",
    icon: "📚",
    position: "bottom",
    bullets: [
      "🎓 Structured learning path from basics to advanced",
      "✅ Quizzes to test and lock in your knowledge",
      "🔥 Build streaks and earn XP as you progress",
    ],
    tip: "Even experienced traders find lessons that sharpen their edge.",
  },
  {
    targetId: "onboarding-nav-simulator",
    title: "The Simulator",
    description: "This is where you put knowledge into action. Trade real markets with fake money — zero risk, real experience.",
    icon: "⚡",
    position: "bottom",
    bullets: [
      "📉 Real-time candlestick charts (just like the pros use)",
      "🟢 Buy when you think price goes up",
      "🔴 Sell when you think price goes down",
      "🛑 Set stop-losses to manage your risk automatically",
    ],
    tip: "Click 'How it works' in the Simulator for a full interactive walkthrough.",
  },
  {
    targetId: "onboarding-nav-leaderboard",
    title: "Leaderboard",
    description: "See how you stack up against traders worldwide. Compete, climb the ranks, and earn your reputation.",
    icon: "🏆",
    position: "bottom",
    bullets: [
      "🌍 Global rankings based on portfolio performance",
      "🎖️ Earn badges and titles for your achievements",
      "👥 Compare stats with friends",
    ],
    tip: "Consistent small gains beat big lucky wins on the leaderboard.",
  },
  {
    targetId: "onboarding-nav-achievements",
    title: "Achievements",
    description: "Unlock badges and milestones as you trade, learn, and improve. Every action earns you progress.",
    icon: "🏅",
    position: "bottom",
    bullets: [
      "🔓 130+ achievements to unlock",
      "⭐ Earn XP and level up your profile",
      "🎯 Complete special challenges for bonus rewards",
    ],
    tip: "Your first achievement unlocks the moment you make your first trade!",
  },
  {
    targetId: "onboarding-nav-watchlist",
    title: "Watchlist",
    description: "Track the assets you care about. Keep your favourites pinned so you never miss a price move.",
    icon: "👁️",
    position: "bottom",
    bullets: [
      "⭐ Add any stock, crypto, or ETF to your watchlist",
      "🔔 Get price alerts at your chosen levels",
      "📋 Quick-access your favourite assets before trading",
    ],
    tip: "A good watchlist is the first step to disciplined trading.",
  },
  {
    targetId: "",
    title: "You're Ready to Go! 🎯",
    description: "That's the tour! Head to the Simulator to make your first practice trade, or visit the Academy to start learning.",
    icon: "🚀",
    position: "center",
    bullets: [
      "1️⃣ Start in the Academy — learn the basics first",
      "2️⃣ Open the Simulator — make your first trade",
      "3️⃣ Check your Dashboard — watch your progress grow",
      "4️⃣ Climb the Leaderboard — compete with the world",
    ],
    tip: "Remember: all money here is virtual. Experiment freely and learn from every trade!",
  },
];

interface Rect { top: number; left: number; width: number; height: number; }

function computeTooltipStyle(rect: Rect, position: TourStep["position"]): React.CSSProperties {
  const W = 370, margin = 18, pad = 10;
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = 0, left = 0;

  if (position === "center" || !rect.width) {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: W, zIndex: 10002 };
  }
  if (position === "bottom") { top = rect.top + rect.height + pad + margin; left = rect.left + rect.width / 2 - W / 2; }
  else if (position === "top") { top = rect.top - pad - margin - 280; left = rect.left + rect.width / 2 - W / 2; }
  else if (position === "left") { top = rect.top + rect.height / 2 - 150; left = rect.left - W - margin; }
  else { top = rect.top + rect.height / 2 - 150; left = rect.left + rect.width + margin; }

  top  = Math.max(margin, Math.min(top,  vh - 320));
  left = Math.max(margin, Math.min(left, vw - W - margin));
  return { position: "fixed", top, left, width: W, zIndex: 10002 };
}

export function OnboardingTour() {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [tooltipKey, setTooltipKey] = useState(0);
  const [spotlight, setSpotlight] = useState<Rect>({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const rafRef = useRef<number | null>(null);
  const PAD = 8;

  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      const t = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  const measureStep = useCallback((s: number) => {
    const cur = TOUR_STEPS[s];
    if (!cur) return;
    if (!cur.targetId) {
      setSpotlight({ top: 0, left: 0, width: 0, height: 0 });
      setTooltipStyle(computeTooltipStyle({ top: 0, left: 0, width: 0, height: 0 }, "center"));
      return;
    }
    const el = document.getElementById(cur.targetId);
    if (!el) {
      setSpotlight({ top: 0, left: 0, width: 0, height: 0 });
      setTooltipStyle(computeTooltipStyle({ top: 0, left: 0, width: 0, height: 0 }, "center"));
      return;
    }
    const r = el.getBoundingClientRect();
    setSpotlight({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    setTooltipStyle(computeTooltipStyle({ top: r.top, left: r.left, width: r.width, height: r.height }, cur.position));
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = document.getElementById(TOUR_STEPS[step]?.targetId ?? "");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        measureStep(step);
        setTooltipKey(k => k + 1);
        setTimeout(() => setOverlayVisible(true), 40);
      });
    });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, step, measureStep]);

  useEffect(() => {
    if (!active) return;
    const fn = () => measureStep(step);
    window.addEventListener("resize", fn);
    window.addEventListener("scroll", fn, true);
    return () => { window.removeEventListener("resize", fn); window.removeEventListener("scroll", fn, true); };
  }, [active, step, measureStep]);

  const handleComplete = useCallback(async () => {
    setOverlayVisible(false);
    setTimeout(() => setActive(false), 300);
    try {
      await apiRequest("PATCH", "/api/user/onboarding", { onboardingCompleted: true });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch {
      // silent
    }
  }, []);

  const go = (next: boolean) => {
    setDirection(next ? "forward" : "back");
    setOverlayVisible(false);
    setTimeout(() => setStep(s => next ? Math.min(s + 1, TOUR_STEPS.length - 1) : Math.max(s - 1, 0)), 70);
  };

  if (!user || !active) return null;

  const cur = TOUR_STEPS[step];
  const isCentered = !cur?.targetId;
  const hasSpotlight = !!cur?.targetId && !!spotlight.width;

  const spotlightBase: React.CSSProperties = {
    position: "fixed",
    top: spotlight.top, left: spotlight.left,
    width: spotlight.width, height: spotlight.height,
    borderRadius: 8, pointerEvents: "none",
    transition: "top .45s cubic-bezier(.4,0,.2,1), left .45s cubic-bezier(.4,0,.2,1), width .45s cubic-bezier(.4,0,.2,1), height .45s cubic-bezier(.4,0,.2,1)",
  };

  const tooltipAnim: React.CSSProperties = {
    ...tooltipStyle,
    opacity: overlayVisible ? 1 : 0,
    transform: overlayVisible
      ? (isCentered ? "translate(-50%,-50%) scale(1)" : "translateY(0) scale(1)")
      : direction === "forward"
        ? (isCentered ? "translate(-50%,-46%) scale(0.96)" : "translateY(10px) scale(0.97)")
        : (isCentered ? "translate(-50%,-54%) scale(0.96)" : "translateY(-10px) scale(0.97)"),
    transition: "opacity .28s ease, transform .3s cubic-bezier(.34,1.2,.64,1)",
  };

  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      <style>{`
        @keyframes ob-ring-pulse {
          0%,100%{ box-shadow:0 0 0 2px hsl(var(--primary)),0 0 18px 4px hsl(var(--primary)/.4); }
          50%    { box-shadow:0 0 0 3px hsl(var(--primary)),0 0 30px 8px hsl(var(--primary)/.55); }
        }
        @keyframes ob-overlay-in { from{opacity:0} to{opacity:1} }
        .ob-ring { animation: ob-ring-pulse 2s ease-in-out infinite; }
        .ob-overlay-in { animation: ob-overlay-in .25s ease forwards; }
      `}</style>

      {/* Dark overlay */}
      {hasSpotlight ? (
        <>
          <div className="ob-overlay-in" style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
              <defs>
                <mask id="ob-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={spotlight.left} y={spotlight.top}
                    width={spotlight.width} height={spotlight.height}
                    rx={8} fill="black"
                    style={{ transition: "all .45s cubic-bezier(.4,0,.2,1)" }}
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#ob-mask)" />
            </svg>
          </div>
          <div className="ob-ring" style={{ ...spotlightBase, zIndex: 10001 }} />
        </>
      ) : (
        <div
          className="ob-overlay-in"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Click-away to skip */}
      <div style={{ position: "fixed", inset: 0, zIndex: 10000 }} onClick={handleComplete} />

      {/* Tooltip card */}
      <div
        key={tooltipKey}
        className="bg-card border border-border/80 rounded-2xl shadow-2xl pointer-events-auto select-none overflow-hidden"
        style={tooltipAnim}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-cyan-400 to-purple-500" />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-2.5 w-2.5" />
              Platform Tour
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{step + 1} / {TOUR_STEPS.length}</span>
              <button
                onClick={handleComplete}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                data-testid="button-close-tour"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl leading-none flex-shrink-0">{cur.icon}</span>
            <h3 className="font-bold text-[15px] text-foreground leading-snug pt-0.5">{cur.title}</h3>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{cur.description}</p>

          {/* Bullet points */}
          {cur.bullets && cur.bullets.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {cur.bullets.map((b, i) => (
                <li key={i} className="text-sm text-foreground/80 leading-snug pl-1">{b}</li>
              ))}
            </ul>
          )}

          {/* Tip box */}
          {cur.tip && (
            <div className="rounded-lg px-3 py-2 mb-3 text-xs leading-relaxed bg-primary/8 border border-primary/15 text-primary">
              <span className="font-semibold">💡 </span>{cur.tip}
            </div>
          )}

          {/* Progress dots */}
          <div className="flex gap-1 mb-4">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > step ? "forward" : "back"); setOverlayVisible(false); setTimeout(() => setStep(i), 70); }}
                className="h-1.5 rounded-full flex-1 focus:outline-none"
                style={{
                  background: i === step
                    ? "hsl(var(--primary))"
                    : i < step
                    ? "hsl(var(--primary) / 0.4)"
                    : "hsl(var(--muted-foreground) / 0.2)",
                  transform: i === step ? "scaleY(1.5)" : "scaleY(1)",
                  transition: "background .3s, transform .3s",
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1 rounded"
              data-testid="button-skip-tour"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => go(false)}
                  className="h-8 px-3 gap-1 hover:scale-105 transition-transform duration-150"
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}
              <Button size="sm" onClick={isLast ? handleComplete : () => go(true)}
                className="h-8 px-4 gap-1 hover:scale-105 transition-transform duration-150"
                data-testid="button-next-step"
              >
                {isLast ? "Let's go! 🚀" : <>Next <ChevronRight className="h-3.5 w-3.5" /></>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
