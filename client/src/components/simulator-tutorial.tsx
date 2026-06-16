import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles, GraduationCap, TrendingUp, TrendingDown, BookOpen } from "lucide-react";

interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  icon: string;
  tag?: "ui" | "learn";
  bullets?: string[];
  tip?: string;
}

const STEPS: TutorialStep[] = [
  // ── UI: Welcome ──────────────────────────────────────────────────────────
  {
    targetId: "sim-welcome",
    title: "Welcome to the Trading Simulator!",
    description: "Think of this like a flight simulator for pilots — you get to practice with fake money before flying the real thing. Zero risk, real market prices.",
    position: "bottom",
    icon: "🚀",
    tag: "ui",
    tip: "You start with $5,000 of virtual money. You can never lose real money here.",
  },

  // ── UI: Symbol ──────────────────────────────────────────────────────────
  {
    targetId: "sim-symbol-selector",
    title: "Pick What You Want to Trade",
    description: "This is the asset — the thing whose price you're betting will go up or down.",
    position: "bottom",
    icon: "📊",
    tag: "ui",
    bullets: [
      "🍎 Stocks — companies like Apple, Tesla, Google",
      "₿ Crypto — Bitcoin, Ethereum, Solana",
      "📦 ETFs — baskets of stocks (e.g. SPY = top 500 US companies)",
    ],
    tip: "Start with something you've heard of, like AAPL or BTC.",
  },

  // ── UI: Chart intro ─────────────────────────────────────────────────────
  {
    targetId: "sim-chart",
    title: "The Price Chart",
    description: "Each coloured bar (candle) is one minute of price action.",
    position: "left",
    icon: "🕯️",
    tag: "ui",
    bullets: [
      "🟢 Green candle — price went UP that minute",
      "🔴 Red candle — price went DOWN that minute",
      "↔️ Scroll left to see older price history",
    ],
    tip: "Don't panic at red candles — prices go up AND down constantly.",
  },

  // ── LEARN: Reading the chart ────────────────────────────────────────────
  {
    targetId: "sim-chart",
    title: "How to Read a Trend",
    description: "Zoom out and look at the big picture. Are the candles generally climbing or falling?",
    position: "left",
    icon: "📈",
    tag: "learn",
    bullets: [
      "📈 Mostly green, going higher = Uptrend (price rising)",
      "📉 Mostly red, going lower = Downtrend (price falling)",
      "↔️ No clear direction = Sideways (stay out for now)",
    ],
    tip: "Rule of thumb: trade WITH the trend, not against it. If it's going up, buy. If going down, sell.",
  },

  // ── LEARN: When to BUY ──────────────────────────────────────────────────
  {
    targetId: "sim-trade-buttons",
    title: "When to BUY",
    description: "Buying means you think the price will go UP from here. Imagine buying a pair of trainers cheap and reselling them later for more — same idea.",
    position: "left",
    icon: "🟢",
    tag: "learn",
    bullets: [
      "📈 The chart is trending upward (mostly green candles going higher)",
      "📰 Good news just came out about the company",
      "↩️ Price dipped low and just started bouncing back up",
    ],
    tip: "Your profit = (sell price − buy price) × how many units you have.",
  },

  // ── LEARN: When to SELL ─────────────────────────────────────────────────
  {
    targetId: "sim-trade-buttons",
    title: "When to SELL (Go Short)",
    description: "Selling short means you think the price will go DOWN. You sell it now, then buy it back cheaper later — keeping the difference as profit.",
    position: "left",
    icon: "🔴",
    tag: "learn",
    bullets: [
      "📉 The chart is trending downward (mostly red candles getting lower)",
      "📰 Bad news — company lost money, scandal, etc.",
      "🚫 Price hit a high point and just started dropping",
    ],
    tip: "If price goes DOWN after you sell, that's profit. If it goes UP, that's a loss.",
  },

  // ── LEARN: Why prices move ──────────────────────────────────────────────
  {
    targetId: "",
    title: "Why Do Prices Move?",
    description: "Simple: more people wanting to buy = price goes up. More people wanting to sell = price goes down.",
    position: "center",
    icon: "💡",
    tag: "learn",
    bullets: [
      "📰 News — earnings reports, product launches, scandals",
      "😨 Emotion — fear causes selling, excitement causes buying",
      "🌍 Economy — interest rates, inflation, jobs data",
      "🐋 Big players — banks and funds moving huge amounts",
    ],
    tip: "You don't need to know everything. Just watching the chart and trend is enough to start.",
  },

  // ── LEARN: Risk Management ──────────────────────────────────────────────
  {
    targetId: "",
    title: "The #1 Rule: Protect Your Money",
    description: "Even the best traders lose sometimes. The trick is making sure losses stay small and wins grow.",
    position: "center",
    icon: "🛡️",
    tag: "learn",
    bullets: [
      "📏 Never risk more than 2% of your balance on one trade",
      "🛑 Always set a Stop Loss — it auto-closes if price goes too far against you",
      "🚫 Don't trade bigger to \"win back\" a loss — that always makes it worse",
      "🏆 Small, consistent wins beat one big lucky gamble",
    ],
    tip: "With $5,000, risking 2% means a max loss of $100 per trade. Keep it small.",
  },

  // ── UI: Balance ─────────────────────────────────────────────────────────
  {
    targetId: "sim-balance",
    title: "Your Balance & P&L",
    description: "P&L means Profit & Loss — how much you're up or down on your current open trades.",
    position: "left",
    icon: "💰",
    tag: "ui",
    bullets: [
      "✅ Green number = your trades are currently winning",
      "❌ Red number = your trades are currently losing",
      "💡 It changes live every second as prices move",
    ],
    tip: "P&L only becomes real when you close the trade. Until then it's just on paper.",
  },

  // ── UI: Order Types ─────────────────────────────────────────────────────
  {
    targetId: "sim-order-type",
    title: "Order Types — How You Enter",
    description: "This controls HOW your trade opens, not just which direction.",
    position: "left",
    icon: "⚙️",
    tag: "ui",
    bullets: [
      "⚡ Market — opens instantly at the current price",
      "🎯 Limit — waits until price drops to your chosen level to buy",
      "🛑 Stop Loss — closes automatically if you're losing too much",
      "💰 Take Profit — closes automatically once you've hit your profit goal",
    ],
    tip: "Beginners: just use Market. Add Stop Loss & Take Profit once you're comfortable.",
  },

  // ── UI: Quantity ────────────────────────────────────────────────────────
  {
    targetId: "sim-quantity",
    title: "How Many Units?",
    description: "This is how much of the asset you're buying or selling. The bigger the number, the bigger your profit or loss on every price move.",
    position: "left",
    icon: "🔢",
    tag: "ui",
    bullets: [
      "📉 0.1 BTC at $100,000 = $10,000 position",
      "📈 If BTC goes up 1%, you make $100",
      "📉 If BTC goes down 1%, you lose $100",
    ],
    tip: "Start with 0.1 or 1 unit until you get the hang of it.",
  },

  // ── UI: Leverage ────────────────────────────────────────────────────────
  {
    targetId: "sim-leverage",
    title: "Leverage — Use With Caution",
    description: "Leverage lets you control a bigger position than your balance normally allows. It multiplies both wins AND losses.",
    position: "left",
    icon: "⚡",
    tag: "ui",
    bullets: [
      "1x = no leverage, normal (safest for beginners)",
      "5x = a 1% price move = 5% gain or loss for you",
      "10x = a 1% price move = 10% gain or loss for you",
    ],
    tip: "Leave it at 1x until you've made at least 10 practice trades.",
  },

  // ── UI: Buttons ─────────────────────────────────────────────────────────
  {
    targetId: "sim-trade-buttons",
    title: "Place the Trade",
    description: "Once you've picked your asset, direction, and size — hit the button!",
    position: "left",
    icon: "💹",
    tag: "ui",
    bullets: [
      "🟢 BUY = you think price goes UP",
      "🔴 SELL = you think price goes DOWN",
      "📋 Your trade appears in Active Trades below",
    ],
    tip: "You can close any trade at any time — you're never stuck.",
  },

  // ── UI: Active Trades ───────────────────────────────────────────────────
  {
    targetId: "sim-active-trades",
    title: "Manage Your Open Trades",
    description: "Once you're in a trade, watch it here. Your live P&L updates every second.",
    position: "left",
    icon: "📋",
    tag: "ui",
    bullets: [
      "✅ In profit? Hit Close to lock it in",
      "❌ Going against you? Close early to limit the loss",
      "⏳ Or hold and see — it's your call",
    ],
    tip: "The hardest part of trading is knowing when to exit. Practice closing both winners and losers.",
  },

  // ── LEARN: Closing / Action plan ────────────────────────────────────────
  {
    targetId: "",
    title: "Your First Trade Plan 🎯",
    description: "Here's a simple step-by-step for your very first trade:",
    position: "center",
    icon: "🏆",
    tag: "learn",
    bullets: [
      "1️⃣ Pick an asset you've heard of (try AAPL or BTC)",
      "2️⃣ Look at the chart — is it going up or down right now?",
      "3️⃣ If going up → BUY. If going down → SELL",
      "4️⃣ Set quantity to 0.1, leverage to 1x",
      "5️⃣ Watch the P&L — close when you're up (or down too much)",
    ],
    tip: "The simulator resets nothing — every trade teaches you something. Go explore! 🚀",
  },
];

const STORAGE_KEY = "simulator-tutorial-done-v3";

interface Rect { top: number; left: number; width: number; height: number; }

function computeTooltipStyle(rect: Rect, position: TutorialStep["position"]): React.CSSProperties {
  const W = 360, margin = 18, pad = 10;
  const vw = window.innerWidth, vh = window.innerHeight;
  let top = 0, left = 0;

  if (position === "center" || position === "bottom" && !rect.width) {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: W, zIndex: 10002 };
  }
  if (position === "bottom") { top = rect.top + rect.height + pad + margin; left = rect.left + rect.width / 2 - W / 2; }
  else if (position === "top")  { top = rect.top - pad - margin - 260;      left = rect.left + rect.width / 2 - W / 2; }
  else if (position === "left") { top = rect.top + rect.height / 2 - 140;   left = rect.left - W - margin; }
  else                          { top = rect.top + rect.height / 2 - 140;   left = rect.left + rect.width + margin; }

  top  = Math.max(margin, Math.min(top,  vh - 300));
  left = Math.max(margin, Math.min(left, vw - W - margin));
  return { position: "fixed", top, left, width: W, zIndex: 10002 };
}

interface SimulatorTutorialProps {
  onStartTour?: () => void;
  autoStart?: boolean;
}

export function SimulatorTutorial({ onStartTour, autoStart }: SimulatorTutorialProps) {
  const [active, setActive]           = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [step, setStep]               = useState(0);
  const [direction, setDirection]     = useState<"forward"|"back">("forward");
  const [tooltipKey, setTooltipKey]   = useState(0);
  const [spotlight, setSpotlight]     = useState<Rect>({ top:0, left:0, width:0, height:0 });
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const rafRef = useRef<number|null>(null);
  const PAD = 10;

  const measureStep = useCallback((s: number) => {
    const cur = STEPS[s];
    if (!cur) return;

    if (!cur.targetId) {
      // centered card — no spotlight
      setSpotlight({ top: 0, left: 0, width: 0, height: 0 });
      setTooltipStyle(computeTooltipStyle({ top:0, left:0, width:0, height:0 }, "center"));
      return;
    }

    const el = document.getElementById(cur.targetId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSpotlight({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD*2, height: r.height + PAD*2 });
    setTooltipStyle(computeTooltipStyle({ top: r.top, left: r.left, width: r.width, height: r.height }, cur.position));
  }, []);

  useEffect(() => {
    if (autoStart && !active) { setStep(0); setActive(true); }
  }, [autoStart]);

  useEffect(() => {
    if (!active) return;
    const el = document.getElementById(STEPS[step]?.targetId ?? "");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        measureStep(step);
        setTooltipKey(k => k + 1);
        setTimeout(() => setOverlayVisible(true), 30);
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

  const startTour = () => { setStep(0); setDirection("forward"); setOverlayVisible(false); setActive(true); onStartTour?.(); };

  const close = (save = true) => {
    setOverlayVisible(false);
    setTimeout(() => setActive(false), 300);
    if (save) localStorage.setItem(STORAGE_KEY, "true");
  };

  const go = (next: boolean) => {
    setDirection(next ? "forward" : "back");
    setOverlayVisible(false);
    setTimeout(() => setStep(s => next ? Math.min(s + 1, STEPS.length - 1) : Math.max(s - 1, 0)), 70);
  };

  const cur = STEPS[step];
  const isLearnStep = cur?.tag === "learn";
  const isCentered = !cur?.targetId;
  const hasSpotlight = !!cur?.targetId && !!spotlight.width;

  const spotlightBase: React.CSSProperties = {
    position: "fixed",
    top: spotlight.top, left: spotlight.left,
    width: spotlight.width, height: spotlight.height,
    borderRadius: 10, pointerEvents: "none",
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

  return (
    <>
      <style>{`
        @keyframes sim-ring-pulse {
          0%,100%{ box-shadow:0 0 0 2px hsl(var(--primary)),0 0 18px 4px hsl(var(--primary)/.4); }
          50%    { box-shadow:0 0 0 3px hsl(var(--primary)),0 0 30px 8px hsl(var(--primary)/.55); }
        }
        @keyframes sim-learn-pulse {
          0%,100%{ box-shadow:0 0 0 2px hsl(142 71% 45%),0 0 18px 4px hsl(142 71% 45%/.35); }
          50%    { box-shadow:0 0 0 3px hsl(142 71% 45%),0 0 30px 8px hsl(142 71% 45%/.5); }
        }
        @keyframes sim-overlay-in{ from{opacity:0} to{opacity:1} }
        .sim-ring-ui   { animation: sim-ring-pulse   2s ease-in-out infinite; }
        .sim-ring-learn{ animation: sim-learn-pulse  2s ease-in-out infinite; }
        .sim-overlay-in{ animation: sim-overlay-in .25s ease forwards; }
      `}</style>

      {/* Trigger button */}
      <Button
        variant="outline" size="sm" onClick={startTour}
        className="flex items-center gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:scale-105 transition-transform duration-150"
        data-testid="button-start-tour"
      >
        <GraduationCap className="h-4 w-4" />
        How it works
      </Button>

      {active && (
        <>
          {/* Dark overlay */}
          {hasSpotlight ? (
            <>
              {/* Mask with hole */}
              <div className="sim-overlay-in" style={{ position:"fixed", inset:0, zIndex:9999, pointerEvents:"none" }}>
                <svg width="100%" height="100%" style={{ position:"absolute", inset:0 }}>
                  <defs>
                    <mask id="tut-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx={10} fill="black"
                        style={{ transition:"all .45s cubic-bezier(.4,0,.2,1)" }} />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tut-mask)" />
                </svg>
              </div>
              {/* Glow ring */}
              <div className={isLearnStep ? "sim-ring-learn" : "sim-ring-ui"} style={{ ...spotlightBase, zIndex:10001 }} />
            </>
          ) : (
            /* Full dark overlay for centered steps */
            <div className="sim-overlay-in"
              style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.72)", backdropFilter:"blur(2px)" }} />
          )}

          {/* Click-away */}
          <div style={{ position:"fixed", inset:0, zIndex:10000 }} onClick={() => close(true)} />

          {/* Tooltip card */}
          <div
            key={tooltipKey}
            className="bg-card border rounded-2xl shadow-2xl pointer-events-auto select-none overflow-hidden"
            style={{
              ...tooltipAnim,
              borderColor: isLearnStep ? "hsl(142 71% 45% / 0.5)" : "hsl(var(--border) / 0.8)",
            }}
          >
            {/* Coloured top bar */}
            <div className={`h-1 w-full ${isLearnStep ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-primary to-blue-400"}`} />

            <div className="p-5">
              {/* Tag pill */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  isLearnStep
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}>
                  {isLearnStep ? <BookOpen className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                  {isLearnStep ? "Trading Lesson" : "Feature Tour"}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {step + 1} / {STEPS.length}
                </span>
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
                <div className={`rounded-lg px-3 py-2 mb-3 text-xs leading-relaxed ${
                  isLearnStep
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-primary/8 border border-primary/15 text-primary"
                }`}>
                  <span className="font-semibold">💡 </span>{cur.tip}
                </div>
              )}

              {/* Progress bar */}
              <div className="flex gap-1 mb-4">
                {STEPS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > step ? "forward" : "back"); setOverlayVisible(false); setTimeout(() => setStep(i), 70); }}
                    className="h-1.5 rounded-full flex-1 focus:outline-none"
                    style={{
                      background: i === step
                        ? (s.tag === "learn" ? "hsl(142 71% 45%)" : "hsl(var(--primary))")
                        : i < step
                        ? (s.tag === "learn" ? "hsl(142 71% 45% / 0.4)" : "hsl(var(--primary) / 0.4)")
                        : "hsl(var(--muted-foreground) / 0.2)",
                      transform: i === step ? "scaleY(1.5)" : "scaleY(1)",
                      transition: "background .3s, transform .3s",
                    }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => close(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1 rounded"
                  data-testid="button-skip-tutorial"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button variant="outline" size="sm" onClick={() => go(false)}
                      className="h-8 px-3 gap-1 hover:scale-105 transition-transform duration-150"
                      data-testid="button-tutorial-prev">
                      <ChevronLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                  )}
                  <Button size="sm" onClick={() => step < STEPS.length - 1 ? go(true) : close(true)}
                    className={`h-8 px-4 gap-1 hover:scale-105 active:scale-95 transition-transform duration-150 ${
                      isLearnStep ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
                    }`}
                    data-testid="button-tutorial-next">
                    {step === STEPS.length - 1 ? "Start Trading! 🚀" : <>Next <ChevronRight className="h-3.5 w-3.5" /></>}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function useSimulatorTutorialAutoStart() {
  const [shouldShow, setShouldShow] = useState(false);
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setShouldShow(true), 900);
      return () => clearTimeout(t);
    }
  }, []);
  return { shouldShow, setShouldShow };
}
