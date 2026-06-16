import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FRAMES, TITLES, BADGES, PACKS, ROULETTE_SLOTS, RARITY_COLORS, RARITY_GLOW,
  getFrameStyle, getItemById, type Rarity, type RouletteSlot,
} from "@/lib/shop-catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Crown, Sparkles, Star, Package, Shuffle, TrendingUp, Tag, RefreshCw,
  Gift, Check, Zap, ChevronUp, ChevronDown, Minus, Plus, TrendingDown,
  Coins, DollarSign, Spade, Diamond, Heart, Club, Flame, Gem, Dice6,
} from "lucide-react";
import { fireConfetti } from "@/lib/confetti";

// ── Types ──────────────────────────────────────────────────────────────────
type MainTab = "cosmetics" | "casino" | "packs" | "market";
type CasinoGame = "blackjack" | "roulette" | "coinflip" | "crash" | "hilo";
type CosmeticFilter = "all" | "frames" | "titles" | "badges";
type RarityFilter = "all" | Rarity;
type Suit = "♠" | "♥" | "♦" | "♣";
type CardValue = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A";
interface PlayingCard { suit: Suit; value: CardValue; hidden?: boolean }

// ── Helpers ─────────────────────────────────────────────────────────────────
function rarityLabel(r: Rarity) { return r.charAt(0).toUpperCase() + r.slice(1); }

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${RARITY_COLORS[rarity]}`}>
      {rarityLabel(rarity)}
    </span>
  );
}

function FramePreview({ frameId, size = 44 }: { frameId: string; size?: number }) {
  const style = getFrameStyle(frameId);
  return (
    <div className="flex items-center justify-center" style={{ width: size + 12, height: size + 12 }}>
      <div style={{ ...style, width: size, height: size, borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--muted))" }}>
        <span style={{ fontSize: size * 0.45 }}>👤</span>
      </div>
    </div>
  );
}

// ── Card UI ──────────────────────────────────────────────────────────────────
const SUITS: Suit[] = ["♠","♥","♦","♣"];
const VALUES: CardValue[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) for (const value of VALUES) deck.push({ suit, value });
  return deck.sort(() => Math.random() - 0.5);
}
function cardNum(card: PlayingCard): number {
  if (["J","Q","K"].includes(card.value)) return 10;
  if (card.value === "A") return 11;
  return parseInt(card.value);
}
function handValue(hand: PlayingCard[]): number {
  let total = hand.filter(c => !c.hidden).reduce((s, c) => s + cardNum(c), 0);
  let aces = hand.filter(c => !c.hidden && c.value === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function cardRank(value: CardValue): number {
  if (value === "A") return 14;
  if (["J","Q","K"].includes(value)) return 10;
  return parseInt(value);
}

function CardFace({ card, animate = false }: { card: PlayingCard; animate?: boolean }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  if (card.hidden) {
    return (
      <div className={`w-16 h-24 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center ${animate ? "animate-[card-deal_0.3s_ease-out]" : ""}`}>
        <div className="text-indigo-300 text-3xl opacity-60">🂠</div>
      </div>
    );
  }
  return (
    <div className={`w-16 h-24 rounded-xl bg-white border border-slate-200 flex flex-col items-start justify-between p-1.5 shadow-lg select-none ${animate ? "animate-[card-deal_0.3s_ease-out]" : ""}`}
      style={{ minWidth: 64 }}>
      <div className={`text-sm font-black leading-none ${isRed ? "text-red-600" : "text-slate-900"}`}>{card.value}{card.suit}</div>
      <div className={`text-2xl text-center w-full ${isRed ? "text-red-600" : "text-slate-900"}`}>{card.suit}</div>
      <div className={`text-sm font-black leading-none self-end rotate-180 ${isRed ? "text-red-600" : "text-slate-900"}`}>{card.value}{card.suit}</div>
    </div>
  );
}

// ── Chip Bet Selector ────────────────────────────────────────────────────────
const CHIPS = [
  { value: 1,      label: "$1",    bg: "bg-white border-gray-300 text-gray-900", shadow: "shadow-white/20" },
  { value: 10,     label: "$10",   bg: "bg-blue-600 border-blue-400 text-white", shadow: "shadow-blue-500/30" },
  { value: 100,    label: "$100",  bg: "bg-zinc-900 border-amber-400 text-amber-400", shadow: "shadow-amber-500/20" },
  { value: 500,    label: "$500",  bg: "bg-purple-700 border-purple-400 text-white", shadow: "shadow-purple-500/30" },
  { value: 1000,   label: "$1K",   bg: "bg-red-700 border-red-400 text-white", shadow: "shadow-red-500/30" },
  { value: 5000,   label: "$5K",   bg: "bg-yellow-500 border-yellow-300 text-black", shadow: "shadow-yellow-400/30" },
  { value: 25000,  label: "$25K",  bg: "bg-orange-500 border-orange-300 text-white", shadow: "shadow-orange-400/30" },
  { value: 100000, label: "$100K", bg: "bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-600 border-yellow-200 text-black", shadow: "shadow-yellow-400/40" },
];

function ChipBets({ bet, setBet, maxBet }: { bet: number; setBet: (n: number) => void; maxBet: number }) {
  const [customInput, setCustomInput] = useState("");
  const [customFocused, setCustomFocused] = useState(false);
  const chips = CHIPS.filter(c => c.value <= maxBet);

  function handleCustomSubmit() {
    const val = parseInt(customInput.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val) && val >= 1) {
      setBet(Math.min(val, maxBet));
    }
    setCustomInput("");
  }

  return (
    <div className="space-y-3">
      {/* Chip row */}
      <div className="flex flex-wrap gap-2 justify-center">
        {chips.map(c => (
          <button key={c.value} onClick={() => setBet(c.value)}
            className={`w-14 h-14 rounded-full border-2 font-black text-xs transition-all hover:scale-110 active:scale-95 shadow-lg ${c.bg} ${c.shadow} ${bet === c.value ? "scale-110 ring-2 ring-white/40" : "opacity-80 hover:opacity-100"}`}>
            {c.label}
          </button>
        ))}
      </div>
      {/* Custom amount input */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 flex items-center rounded-lg transition-all ${customFocused ? "ring-1 ring-amber-500/60" : ""}`}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="pl-3 text-zinc-600 text-sm font-bold select-none">$</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="custom amount"
            value={customInput}
            onChange={e => setCustomInput(e.target.value.replace(/[^0-9]/g, ""))}
            onFocus={() => setCustomFocused(true)}
            onBlur={() => setCustomFocused(false)}
            onKeyDown={e => e.key === "Enter" && handleCustomSubmit()}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-300 outline-none placeholder:text-zinc-700"
          />
        </div>
        <button onClick={handleCustomSubmit}
          className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#d4af37,#f5cc5a)" }}>
          Set
        </button>
      </div>
    </div>
  );
}

// ── Casino Panel Wrapper ─────────────────────────────────────────────────────
function CasinoPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg,#0a0a14 0%,#0e0a06 100%)", border: "1px solid rgba(212,175,55,0.25)" }}>
      <div className="relative">{children}</div>
    </div>
  );
}

// ── Blackjack ────────────────────────────────────────────────────────────────
function BlackjackGame({ balance, onRefreshUser }: { balance: number; onRefreshUser: () => void }) {
  const { toast } = useToast();
  type Phase = "bet" | "playing" | "dealer" | "result";
  const [phase, setPhase] = useState<Phase>("bet");
  const [bet, setBet] = useState(100);
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [result, setResult] = useState<"win"|"blackjack"|"push"|"lose"|null>(null);
  const [netChange, setNetChange] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dealAnim, setDealAnim] = useState(false);

  const maxBet = balance;
  const pVal = handValue(playerHand);

  async function startGame() {
    const d = buildDeck();
    const p = [d[0], d[2]];
    const dealer = [d[1], { ...d[3], hidden: true }];
    setDeck(d.slice(4));
    setPlayerHand(p);
    setDealerHand(dealer);
    setResult(null);
    setPhase("playing");
    setDealAnim(true);
    setTimeout(() => setDealAnim(false), 500);
    if (handValue(p) === 21) {
      const revDealer = dealer.map(c => ({ ...c, hidden: false }));
      setDealerHand(revDealer);
      await finishGame(p, revDealer, "blackjack");
    }
  }

  async function runDealer(d: PlayingCard[], ph: PlayingCard[], dh: PlayingCard[]): Promise<PlayingCard[]> {
    let hand = [...dh];
    let remaining = [...d];
    while (handValue(hand) < 17) {
      hand = [...hand, remaining[0]];
      remaining = remaining.slice(1);
    }
    setDealerHand(hand);
    setDeck(remaining);
    return hand;
  }

  async function finishGame(ph: PlayingCard[], dh: PlayingCard[], forcedResult?: "win"|"blackjack"|"push"|"lose") {
    const pFinal = handValue(ph);
    const dFinal = handValue(dh.map(c => ({ ...c, hidden: false })));
    let res: "win"|"blackjack"|"push"|"lose";
    if (forcedResult) res = forcedResult;
    else if (pFinal > 21) res = "lose";
    else if (dFinal > 21 || pFinal > dFinal) res = "win";
    else if (pFinal === dFinal) res = "push";
    else res = "lose";
    const net = res === "blackjack" ? Math.floor(bet * 1.5) : res === "win" ? bet : res === "push" ? 0 : -bet;
    setResult(res);
    setNetChange(net);
    setPhase("result");
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/global-shop/blackjack-result", { bet, netChange: net });
      onRefreshUser();
      if (res === "win" || res === "blackjack") fireConfetti();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setSubmitting(false);
  }

  async function hit() {
    const [card, ...rest] = deck;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(rest);
    if (handValue(newHand) >= 21) {
      const revealed = dealerHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(revealed);
      const finalDealer = await runDealer(rest, newHand, revealed);
      await finishGame(newHand, finalDealer);
    }
  }

  async function stand() {
    const revealed = dealerHand.map(c => ({ ...c, hidden: false }));
    const finalDealer = await runDealer(deck, playerHand, revealed);
    await finishGame(playerHand, finalDealer);
  }

  async function doubleDown() {
    if (balance < bet * 2) { toast({ title: "Not enough balance to double" }); return; }
    setBet(b => b * 2);
    const [card, ...rest] = deck;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(rest);
    const revealed = dealerHand.map(c => ({ ...c, hidden: false }));
    const finalDealer = await runDealer(rest, newHand, revealed);
    await finishGame(newHand, finalDealer);
  }

  const resultColors = { win: "text-emerald-400", blackjack: "text-yellow-300", push: "text-blue-400", lose: "text-red-400" };
  const resultLabel = { win: "You Win! 🎉", blackjack: "BLACKJACK! 🃏", push: "Push — Tie", lose: "Dealer Wins" };
  const resultBg = { win: "from-emerald-950/80 to-emerald-900/30 border-emerald-500/40", blackjack: "from-yellow-950/80 to-amber-900/30 border-yellow-500/40", push: "from-blue-950/80 to-blue-900/30 border-blue-500/30", lose: "from-red-950/80 to-red-900/30 border-red-500/30" };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">♠ Blackjack</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Beat the dealer to 21 — blackjack pays 3:2</p>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-950 border border-emerald-900 rounded px-1.5 py-0.5 uppercase tracking-wider">card game</span>
      </div>

      {/* Felt area */}
      {phase !== "bet" && (
        <div className="rounded-xl p-4 space-y-4" style={{ background: "radial-gradient(ellipse at center, #0d2a1a 0%, #071510 100%)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="space-y-1.5">
            <p className="text-[10px] text-emerald-600/70 uppercase tracking-[0.2em] font-bold">
              DEALER {phase === "result" ? `· ${handValue(dealerHand.map(c => ({ ...c, hidden: false })))}` : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              {dealerHand.map((card, i) => <CardFace key={i} card={card} animate={dealAnim && i < 2} />)}
            </div>
          </div>
          <div className="border-t border-emerald-900/60" />
          <div className="space-y-1.5">
            <p className="text-[10px] text-emerald-600/70 uppercase tracking-[0.2em] font-bold">YOU · {pVal}</p>
            <div className="flex gap-2 flex-wrap">
              {playerHand.map((card, i) => <CardFace key={i} card={card} animate={dealAnim && i < 2} />)}
            </div>
          </div>
        </div>
      )}

      {/* Result Banner */}
      {phase === "result" && result && (
        <div className={`rounded-xl p-4 text-center border bg-gradient-to-b animate-in fade-in slide-in-from-bottom-2 duration-300 ${resultBg[result]}`}>
          <p className={`text-2xl font-black tracking-wide ${resultColors[result]}`}>{resultLabel[result]}</p>
          <p className={`text-lg font-bold mt-1 ${netChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netChange > 0 ? `+$${netChange.toLocaleString()}` : netChange < 0 ? `-$${Math.abs(netChange).toLocaleString()}` : "No change"}
          </p>
        </div>
      )}

      {/* Bet Phase */}
      {phase === "bet" && (
        <div className="space-y-5">
          <ChipBets bet={bet} setBet={setBet} maxBet={maxBet} />
          <div className="flex items-center gap-3">
            <button onClick={() => setBet(b => Math.max(1, b - (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
              className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
              <Minus className="w-4 h-4 text-zinc-400" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-3xl font-black text-amber-400">${bet.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">bet amount</p>
            </div>
            <button onClick={() => setBet(b => Math.min(maxBet, b + (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
              className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
              <Plus className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <button onClick={startGame} disabled={bet < 1 || balance < bet}
            className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#d4af37 0%,#f5cc5a 50%,#d4af37 100%)" }}>
            ♠ Deal Cards ♠
          </button>
        </div>
      )}

      {/* Playing Phase */}
      {phase === "playing" && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={hit} className="h-12 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all hover:brightness-110 active:scale-95" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>Hit</button>
          <button onClick={stand} className="h-12 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all hover:brightness-110 active:scale-95" style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>Stand</button>
          <button onClick={doubleDown} disabled={playerHand.length !== 2 || balance < bet * 2}
            className="h-12 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40" style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)" }}>2×</button>
        </div>
      )}

      {/* Result Phase */}
      {phase === "result" && (
        <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#d4af37 0%,#f5cc5a 50%,#d4af37 100%)" }}
          onClick={() => { setPhase("bet"); setPlayerHand([]); setDealerHand([]); }}
          disabled={submitting}>
          {submitting ? "Saving..." : "Play Again"}
        </button>
      )}
    </div>
  );
}

// ── Roulette Wheel ────────────────────────────────────────────────────────────
function RouletteGame({ balance, onRefreshUser }: { balance: number; onRefreshUser: () => void }) {
  const { toast } = useToast();
  const [spinCost, setSpinCost] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<{ slot: RouletteSlot; rewardDesc: string; newBalance: number } | null>(null);

  const SPIN_COSTS = [
    { label: "$10", cost: 10 }, { label: "$100", cost: 100 }, { label: "$500", cost: 500 },
    { label: "$2K", cost: 2000 }, { label: "$10K", cost: 10000 },
  ];

  const spinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/global-shop/spin", { cost: spinCost }),
    onSuccess: async (res) => {
      const data = await res.json();
      onRefreshUser();
      const slotIndex = ROULETTE_SLOTS.findIndex((s: RouletteSlot) => s.id === data.slot.id);
      const idx = slotIndex >= 0 ? slotIndex : 0;
      const segAngle = 360 / ROULETTE_SLOTS.length;
      // FIX: land the CENTER of the slot at the pointer (top).
      const target = ((360 - (idx + 0.5) * segAngle) % 360 + 360) % 360;
      setFinalRotation(prev => {
        const currentAngle = ((prev % 360) + 360) % 360;
        const diff = ((target - currentAngle) + 360) % 360;
        return prev + 360 * 8 + diff;
      });
      setSpinning(true);
      setTimeout(() => {
        setSpinning(false);
        setSpinResult(data);
        if (data.slot.id === "slot-jackpot") fireConfetti();
        else if (data.slot.reward?.amount && data.slot.reward.amount > 0) fireConfetti();
      }, 4000);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const slotCount = ROULETTE_SLOTS.length;
  const segAngle = 360 / slotCount;
  const r = 118; const cx = 136; const cy = 136;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">◎ Roulette</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Spin for cash or rare collectibles</p>
        </div>
        <span className="text-[10px] font-bold text-red-500 bg-red-950 border border-red-900 rounded px-1.5 py-0.5 uppercase tracking-wider">wheel</span>
      </div>

      {/* Wheel */}
      <div className="relative flex justify-center items-center">
        {/* Glow ring behind wheel */}
        <div className="absolute w-72 h-72 rounded-full opacity-20 animate-pulse"
          style={{ background: "radial-gradient(circle, #d4af37 0%, transparent 70%)" }} />
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20" style={{ marginTop: -2 }}>
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[22px] border-l-transparent border-r-transparent border-t-amber-400 filter drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
          </div>
          {/* Outer decorative ring */}
          <div className="absolute inset-0 rounded-full pointer-events-none z-10" style={{ border: "3px solid rgba(212,175,55,0.6)", boxShadow: "0 0 20px rgba(212,175,55,0.3), inset 0 0 20px rgba(0,0,0,0.5)" }} />
          <svg width={272} height={272}
            style={{
              transition: spinning ? "transform 4s cubic-bezier(0.15,0.65,0.1,1)" : "none",
              transform: `rotate(${finalRotation}deg)`,
              display: "block",
            }}>
            {ROULETTE_SLOTS.map((slot, i) => {
              const startA = (i * segAngle - 90) * (Math.PI / 180);
              const endA = ((i + 1) * segAngle - 90) * (Math.PI / 180);
              const x1 = cx + r * Math.cos(startA); const y1 = cy + r * Math.sin(startA);
              const x2 = cx + r * Math.cos(endA); const y2 = cy + r * Math.sin(endA);
              const midA = ((i + 0.5) * segAngle - 90) * (Math.PI / 180);
              const tx = cx + (r * 0.68) * Math.cos(midA);
              const ty = cy + (r * 0.68) * Math.sin(midA);
              const large = segAngle > 180 ? 1 : 0;
              return (
                <g key={slot.id}>
                  <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                    fill={slot.color} stroke="#000" strokeWidth={1.5} />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize={13}
                    fill="white" fontWeight="bold" style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}>
                    {slot.emoji}
                  </text>
                </g>
              );
            })}
            {/* Hub */}
            <circle cx={cx} cy={cy} r={22} fill="#0a0a14" stroke="#d4af37" strokeWidth={2.5} />
            <circle cx={cx} cy={cy} r={12} fill="#d4af37" opacity={0.9} />
          </svg>
        </div>
      </div>

      {/* Result */}
      {spinResult && !spinning && (
        <div className="rounded-xl p-4 text-center border border-amber-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(10,10,20,0.9) 100%)" }}>
          <p className="text-3xl font-black text-amber-300 tracking-wide">{spinResult.slot.emoji} {spinResult.slot.label}</p>
          {spinResult.slot.reward?.amount && spinResult.slot.reward.amount > 0 ? (
            <p className="text-emerald-400 font-bold text-lg mt-1">+${spinResult.slot.reward.amount.toLocaleString()}</p>
          ) : spinResult.slot.reward?.type === "item" ? (
            <p className="text-purple-400 font-bold mt-1">✨ Item added to your collection!</p>
          ) : (
            <p className="text-zinc-500 mt-1">Better luck next spin!</p>
          )}
        </div>
      )}

      {/* Spin cost selector */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {SPIN_COSTS.filter(o => o.cost <= balance || o.cost === 10).map(opt => (
          <button key={opt.cost} onClick={() => setSpinCost(opt.cost)}
            className={`px-4 py-2 rounded-lg text-sm font-black border transition-all ${spinCost === opt.cost ? "text-black border-amber-400 shadow-lg shadow-amber-500/20" : "border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400"}`}
            style={spinCost === opt.cost ? { background: "linear-gradient(135deg,#d4af37,#f5cc5a)" } : { background: "rgba(10,10,20,0.8)" }}>
            {opt.label}
          </button>
        ))}
      </div>

      <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
        style={spinning || spinMutation.isPending ? { background: "#1a1a2e", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" } : { background: "linear-gradient(135deg,#d4af37 0%,#f5cc5a 50%,#d4af37 100%)", color: "#000" }}
        onClick={() => { setSpinResult(null); spinMutation.mutate(); }}
        disabled={spinning || balance < spinCost || spinMutation.isPending}>
        {spinning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Spinning...</> : <><Shuffle className="w-4 h-4" /> Spin for ${spinCost.toLocaleString()}</>}
      </button>

      {/* Prize table */}
      <details className="group">
        <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors select-none text-center">
          View prize table ▾
        </summary>
        <div className="grid grid-cols-2 gap-1 mt-2 max-h-40 overflow-y-auto pr-1">
          {ROULETTE_SLOTS.map(slot => (
            <div key={slot.id} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border border-zinc-800/80" style={{ background: "rgba(10,10,20,0.6)" }}>
              <span>{slot.emoji}</span>
              <span className="text-zinc-500 truncate flex-1">{slot.label}</span>
              <RarityBadge rarity={slot.rarity} />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ── Coin Flip ─────────────────────────────────────────────────────────────────
function CoinFlipGame({ balance, onRefreshUser }: { balance: number; onRefreshUser: () => void }) {
  const { toast } = useToast();
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<{ won: boolean; result: "heads" | "tails"; netChange: number } | null>(null);

  const flipMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/global-shop/coinflip", { bet, choice }),
    onSuccess: async (res) => {
      const data = await res.json();
      setResult(null);
      setFlipping(true);
      setTimeout(() => {
        setFlipping(false);
        setResult(data);
        onRefreshUser();
        if (data.won) fireConfetti();
      }, 1400);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">🪙 Coin Flip</h2>
          <p className="text-xs text-zinc-600 mt-0.5">50/50 — double or nothing</p>
        </div>
        <span className="text-[10px] font-bold text-amber-600 bg-amber-950 border border-amber-900 rounded px-1.5 py-0.5 uppercase tracking-wider">50/50</span>
      </div>

      {/* Coin — FIXED: perspective on PARENT, transform on CHILD */}
      <div className="flex justify-center items-center py-6">
        <div style={{ perspective: "700px" }}>
          <div className={flipping ? "animate-[casino-coin-flip_1.4s_ease-in-out]" : ""}
            style={{ transformStyle: "preserve-3d", width: 120, height: 120, position: "relative" }}>
            {/* Heads face */}
            <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0, borderRadius: "9999px",
              background: "radial-gradient(circle at 35% 35%, #f5cc5a, #d4af37, #8a6914)",
              border: "4px solid #a07820", boxShadow: "0 0 24px rgba(212,175,55,0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
              👑
            </div>
            {/* Tails face */}
            <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0, borderRadius: "9999px",
              background: "radial-gradient(circle at 35% 35%, #9ca3af, #6b7280, #374151)",
              border: "4px solid #4b5563", boxShadow: "0 0 16px rgba(107,114,128,0.3), inset 0 2px 4px rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48,
              transform: "rotateY(180deg)" }}>
              🌍
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && !flipping && (
        <div className={`rounded-xl p-4 text-center border animate-in fade-in slide-in-from-bottom-2 duration-300 ${result.won ? "border-emerald-500/40" : "border-red-500/30"}`}
          style={{ background: result.won ? "linear-gradient(135deg,rgba(16,185,129,0.1),rgba(10,10,20,0.9))" : "linear-gradient(135deg,rgba(220,38,38,0.1),rgba(10,10,20,0.9))" }}>
          <p className="text-xl font-black tracking-wide mb-1" style={{ color: result.result === "heads" ? "#d4af37" : "#9ca3af" }}>
            {result.result === "heads" ? "👑 Heads" : "🌍 Tails"}
          </p>
          <p className={`text-2xl font-black ${result.won ? "text-emerald-400" : "text-red-400"}`}>
            {result.won ? "YOU WIN!" : "You Lose"}
          </p>
          <p className={`text-lg font-bold mt-1 ${result.netChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {result.netChange > 0 ? `+$${result.netChange.toLocaleString()}` : `-$${Math.abs(result.netChange).toLocaleString()}`}
          </p>
        </div>
      )}

      {/* Side picker */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { if (!flipping) setChoice("heads"); }}
          className="py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95"
          style={choice === "heads" ? {
            background: "linear-gradient(135deg,#d4af37,#f5cc5a)", color: "#000",
            boxShadow: "0 4px 20px rgba(212,175,55,0.35)"
          } : { background: "rgba(10,10,20,0.8)", border: "1px solid rgba(212,175,55,0.25)", color: "#a09060" }}>
          👑 Heads
        </button>
        <button onClick={() => { if (!flipping) setChoice("tails"); }}
          className="py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95"
          style={choice === "tails" ? {
            background: "linear-gradient(135deg,#6b7280,#9ca3af)", color: "#000",
            boxShadow: "0 4px 20px rgba(107,114,128,0.35)"
          } : { background: "rgba(10,10,20,0.8)", border: "1px solid rgba(107,114,128,0.25)", color: "#6b7280" }}>
          🌍 Tails
        </button>
      </div>

      {/* Bet chips */}
      <ChipBets bet={bet} setBet={setBet} maxBet={balance} />
      <div className="flex items-center gap-3">
        <button onClick={() => setBet(b => Math.max(1, b - (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
          className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
          <Minus className="w-4 h-4 text-zinc-400" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-3xl font-black text-amber-400">${bet.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">bet amount</p>
        </div>
        <button onClick={() => setBet(b => Math.min(balance, b + (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
          className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
          <Plus className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
        style={flipping || flipMutation.isPending ? { background: "#1a1a2e", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" } : { background: "linear-gradient(135deg,#d4af37,#f5cc5a)", color: "#000" }}
        onClick={() => flipMutation.mutate()}
        disabled={flipping || flipMutation.isPending || balance < bet}>
        {flipping ? "Flipping..." : "🪙 Flip Coin"}
      </button>
    </div>
  );
}

// ── Crash Game ────────────────────────────────────────────────────────────────
function CrashGame({ balance, onRefreshUser }: { balance: number; onRefreshUser: () => void }) {
  const { toast } = useToast();
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<"idle" | "running" | "cashedout" | "crashed">("idle");
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashedMult, setCashedMult] = useState(0);
  const [crashPoint, setCrashPoint] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef = useRef(1.0);

  function generateCrashPoint(): number {
    const r = Math.random();
    return Math.max(1.0, 1 / (1 - r * 0.96));
  }

  async function startGame() {
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    multRef.current = 1.0;
    setMultiplier(1.0);
    setPhase("running");
    intervalRef.current = setInterval(() => {
      multRef.current = multRef.current * 1.018;
      setMultiplier(Math.round(multRef.current * 100) / 100);
      if (multRef.current >= cp) {
        clearInterval(intervalRef.current!);
        setPhase("crashed");
        apiRequest("POST", "/api/global-shop/crash-result", { bet, netChange: -bet })
          .then(() => onRefreshUser()).catch(() => {});
      }
    }, 80);
  }

  async function cashOut() {
    if (phase !== "running") return;
    clearInterval(intervalRef.current!);
    const mult = multRef.current;
    setCashedMult(Math.round(mult * 100) / 100);
    setPhase("cashedout");
    const netChange = Math.floor(bet * mult) - bet;
    try {
      await apiRequest("POST", "/api/global-shop/crash-result", { bet, netChange });
      onRefreshUser();
      fireConfetti();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const multColor = multiplier < 1.5 ? "#10b981" : multiplier < 3 ? "#f59e0b" : multiplier < 6 ? "#f97316" : "#ef4444";
  const profit = Math.floor(bet * multiplier) - bet;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">🚀 Crash</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Cash out before it crashes or lose it all</p>
        </div>
        <span className="text-[10px] font-bold text-orange-500 bg-orange-950 border border-orange-900 rounded px-1.5 py-0.5 uppercase tracking-wider">live</span>
      </div>

      {/* Multiplier display */}
      <div className="rounded-2xl p-8 text-center transition-all duration-200 relative overflow-hidden"
        style={{
          background: phase === "crashed" ? "linear-gradient(135deg,rgba(220,38,38,0.15),rgba(10,10,20,0.95))"
            : phase === "cashedout" ? "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(10,10,20,0.95))"
            : "linear-gradient(135deg,rgba(15,15,30,0.9),rgba(10,10,20,0.95))",
          border: phase === "crashed" ? "1px solid rgba(239,68,68,0.4)" : phase === "cashedout" ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(212,175,55,0.15)"
        }}>
        {phase === "crashed" ? (
          <>
            <p className="text-5xl font-black text-red-400 animate-in zoom-in-75 duration-300">💥 CRASH</p>
            <p className="text-zinc-500 mt-2 text-sm">Crashed at <span className="text-red-400 font-bold">{crashPoint.toFixed(2)}×</span></p>
            <p className="text-red-400 font-black text-lg mt-1">-${bet.toLocaleString()}</p>
          </>
        ) : phase === "cashedout" ? (
          <>
            <p className="text-6xl font-black text-emerald-400 animate-in zoom-in-75 duration-300">{cashedMult.toFixed(2)}×</p>
            <p className="text-emerald-400 font-black text-lg mt-2">+${(Math.floor(bet * cashedMult) - bet).toLocaleString()}</p>
          </>
        ) : (
          <>
            <p className="text-7xl font-black transition-colors duration-100" style={{ color: phase === "running" ? multColor : "#3f3f5a" }}>
              {phase === "running" ? `${multiplier.toFixed(2)}×` : "1.00×"}
            </p>
            {phase === "running" && <p className="text-zinc-500 mt-2 text-xs">Cash out now: <span className="text-emerald-400 font-bold">+${profit.toLocaleString()}</span></p>}
            {phase === "idle" && <p className="text-zinc-600 mt-2 text-sm">Ready to launch 🚀</p>}
          </>
        )}
      </div>

      {phase === "idle" && (
        <div className="space-y-4">
          <ChipBets bet={bet} setBet={setBet} maxBet={balance} />
          <div className="flex items-center gap-3">
            <button onClick={() => setBet(b => Math.max(1, b - (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
              className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
              <Minus className="w-4 h-4 text-zinc-400" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-3xl font-black text-amber-400">${bet.toLocaleString()}</p>
            </div>
            <button onClick={() => setBet(b => Math.min(balance, b + (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
              className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
              <Plus className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {phase === "idle" && (
        <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#d4af37,#f5cc5a)" }}
          onClick={startGame} disabled={balance < bet}>
          🚀 Launch
        </button>
      )}
      {phase === "running" && (
        <button className="w-full h-16 rounded-xl text-2xl font-black text-black transition-all hover:brightness-110 active:scale-95 animate-[casino-pulse_1s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(135deg,#10b981,#34d399)", boxShadow: "0 0 30px rgba(16,185,129,0.5)" }}
          onClick={cashOut}>
          💰 CASH OUT ${Math.floor(bet * multiplier).toLocaleString()}
        </button>
      )}
      {(phase === "crashed" || phase === "cashedout") && (
        <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] text-black transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#d4af37,#f5cc5a)" }}
          onClick={() => { setPhase("idle"); setMultiplier(1.0); }}>
          Play Again
        </button>
      )}
    </div>
  );
}

// ── Hi-Lo ─────────────────────────────────────────────────────────────────────
function HiLoGame({ balance, onRefreshUser }: { balance: number; onRefreshUser: () => void }) {
  const { toast } = useToast();
  type HiLoPhase = "bet" | "playing" | "result";
  const [phase, setPhase] = useState<HiLoPhase>("bet");
  const [bet, setBet] = useState(100);
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [currentCard, setCurrentCard] = useState<PlayingCard | null>(null);
  const [nextCard, setNextCard] = useState<PlayingCard | null>(null);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [netChange, setNetChange] = useState(0);

  const streakMultipliers = [1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 12.0, 20.0];

  function startGame() {
    const d = buildDeck();
    setDeck(d.slice(1));
    setCurrentCard(d[0]);
    setNextCard(null);
    setStreak(0);
    setMultiplier(1.0);
    setResult(null);
    setPhase("playing");
  }

  function guess(direction: "higher" | "lower") {
    if (!currentCard || deck.length === 0) return;
    const next = deck[0];
    const remaining = deck.slice(1);
    setNextCard(next);
    setDeck(remaining);
    const currentRank = cardRank(currentCard.value);
    const nextRank = cardRank(next.value);
    const correct = direction === "higher" ? nextRank > currentRank : nextRank < currentRank;
    if (nextRank === currentRank) {
      const nc = -bet;
      setNetChange(nc); setResult("lose"); setPhase("result");
      apiRequest("POST", "/api/global-shop/hilo-result", { bet, netChange: nc }).then(() => onRefreshUser()).catch(() => {});
      return;
    }
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMultiplier(streakMultipliers[Math.min(newStreak, streakMultipliers.length - 1)]);
      setTimeout(() => { setCurrentCard(next); setNextCard(null); }, 800);
    } else {
      const nc = -bet;
      setNetChange(nc); setResult("lose"); setPhase("result");
      apiRequest("POST", "/api/global-shop/hilo-result", { bet, netChange: nc }).then(() => onRefreshUser()).catch(() => {});
    }
  }

  async function cashOut() {
    const nc = Math.floor(bet * multiplier) - bet;
    setNetChange(nc); setResult("win"); setPhase("result");
    try {
      await apiRequest("POST", "/api/global-shop/hilo-result", { bet, netChange: nc });
      onRefreshUser();
      if (nc > 0) fireConfetti();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">▲▼ Hi-Lo</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Guess higher or lower — streak multipliers up to 20×</p>
        </div>
        <span className="text-[10px] font-bold text-purple-400 bg-purple-950 border border-purple-900 rounded px-1.5 py-0.5 uppercase tracking-wider">streak</span>
      </div>

      {phase !== "bet" && currentCard && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mb-2">Current</p>
              <CardFace card={currentCard} />
              <p className="text-[10px] text-zinc-500 mt-1.5">Rank {cardRank(currentCard.value)}</p>
            </div>
            <div className="text-zinc-700 text-2xl font-black">→</div>
            <div className="text-center">
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mb-2">Next</p>
              {nextCard
                ? <CardFace card={nextCard} animate />
                : <div className="w-16 h-24 rounded-xl flex items-center justify-center" style={{ border: "2px dashed rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)" }}>
                    <p className="text-2xl font-black" style={{ color: "rgba(212,175,55,0.3)" }}>?</p>
                  </div>}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Streak", value: `🔥 ${streak}`, color: "#f59e0b" },
              { label: "Multiplier", value: `${multiplier.toFixed(1)}×`, color: "#d4af37" },
              { label: "To Win", value: `$${Math.floor(bet * multiplier).toLocaleString()}`, color: "#10b981" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{s.label}</p>
                <p className="text-base font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className={`rounded-xl p-4 text-center border animate-in fade-in duration-300`}
          style={{
            background: result === "win" ? "linear-gradient(135deg,rgba(16,185,129,0.1),rgba(10,10,20,0.9))" : "linear-gradient(135deg,rgba(220,38,38,0.1),rgba(10,10,20,0.9))",
            borderColor: result === "win" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.3)"
          }}>
          <p className={`text-2xl font-black tracking-wide ${result === "win" ? "text-emerald-400" : "text-red-400"}`}>
            {result === "win" ? "Cashed Out! 🎉" : "Wrong Guess 💔"}
          </p>
          <p className={`text-lg font-bold mt-1 ${netChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netChange > 0 ? `+$${netChange.toLocaleString()}` : `-$${Math.abs(netChange).toLocaleString()}`}
          </p>
        </div>
      )}

      {phase === "bet" && (
        <div className="space-y-4">
          <ChipBets bet={bet} setBet={setBet} maxBet={balance} />
          <div className="flex items-center gap-3">
            <button onClick={() => setBet(b => Math.max(1, b - (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
              className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
              <Minus className="w-4 h-4 text-zinc-400" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-3xl font-black text-amber-400">${bet.toLocaleString()}</p>
            </div>
            <button onClick={() => setBet(b => Math.min(balance, b + (b >= 1000 ? 500 : b >= 100 ? 50 : 1)))}
              className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:border-amber-500/50 transition-colors">
              <Plus className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <p className="text-[10px] text-zinc-700 text-center tracking-wider">MULTIPLIERS: 1× · 1.5× · 2× · 3× · 5× · 8× · 12× · 20×</p>
          <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#d4af37,#f5cc5a)" }}
            onClick={startGame} disabled={balance < bet}>
            Start Game
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => guess("higher")} className="h-14 rounded-xl font-black text-base uppercase tracking-wider text-white transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}>
              <ChevronUp className="w-5 h-5" /> Higher
            </button>
            <button onClick={() => guess("lower")} className="h-14 rounded-xl font-black text-base uppercase tracking-wider text-white transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}>
              <ChevronDown className="w-5 h-5" /> Lower
            </button>
          </div>
          {streak > 0 && (
            <button onClick={cashOut} className="w-full h-11 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.4)", color: "#d4af37" }}>
              💰 Cash Out ${Math.floor(bet * multiplier).toLocaleString()} ({multiplier.toFixed(1)}×)
            </button>
          )}
        </div>
      )}

      {phase === "result" && (
        <button className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-[0.15em] text-black transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#d4af37,#f5cc5a)" }}
          onClick={() => { setPhase("bet"); setCurrentCard(null); }}>
          Play Again
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<MainTab>("cosmetics");
  const [casinoGame, setCasinoGame] = useState<CasinoGame>("blackjack");
  const [cosmeticFilter, setCosmeticFilter] = useState<CosmeticFilter>("all");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [packResult, setPackResult] = useState<{ itemId: string; type: "frame" | "title" | "badge" } | null>(null);
  const [opening, setOpening] = useState(false);
  const [listItemId, setListItemId] = useState("");
  const [listItemType, setListItemType] = useState("frame");
  const [listPrice, setListPrice] = useState("");
  const [marketFilter, setMarketFilter] = useState<"all" | "frame" | "title" | "badge">("all");
  const [marketSort, setMarketSort] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [marketSearch, setMarketSearch] = useState("");

  const owned: string[] = (() => { try { return JSON.parse(user?.purchasedCosmetics ?? "[]"); } catch { return []; } })();
  const balance = user?.simulatorBalance ?? 0;
  const equippedFrame = user?.equippedFrame ?? null;
  const equippedTitle = user?.equippedTitle ?? null;

  const { data: marketListings = [], refetch: refetchMarket } = useQuery<any[]>({
    queryKey: ["/api/cosmetic-market"],
    enabled: mainTab === "market",
  });

  const purchaseMutation = useMutation({
    mutationFn: (body: { itemId: string; price: number }) => apiRequest("POST", "/api/global-shop/purchase", body),
    onSuccess: async () => { await refreshUser(); },
    onError: (e: any) => toast({ title: "Insufficient balance", description: e.message, variant: "destructive" }),
  });

  const packOpenMutation = useMutation({
    mutationFn: ({ packId, price }: { packId: string; price: number }) =>
      apiRequest("POST", "/api/global-shop/pack-open", { packId, price }),
    onSuccess: async (res) => {
      const data = await res.json();
      await refreshUser();
      const itemType = data.rewardId?.startsWith("frame-") ? "frame" : data.rewardId?.startsWith("title-") ? "title" : "badge";
      setPackResult({ itemId: data.rewardId, type: itemType });
      fireConfetti();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const equipMutation = useMutation({
    mutationFn: (body: { type: string; value: string | null }) => apiRequest("POST", "/api/global-shop/equip", body),
    onSuccess: async () => { await refreshUser(); },
  });

  const listMutation = useMutation({
    mutationFn: (body: { itemId: string; itemType: string; price: number }) => apiRequest("POST", "/api/cosmetic-market", body),
    onSuccess: async () => {
      await refreshUser(); refetchMarket();
      setListItemId(""); setListPrice("");
      toast({ title: "Listed!", description: "Your item is now for sale." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const buyListingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/cosmetic-market/${id}/buy`, {}),
    onSuccess: async () => { await refreshUser(); refetchMarket(); fireConfetti(); toast({ title: "Purchased!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelListingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cosmetic-market/${id}`, {}),
    onSuccess: async () => { await refreshUser(); refetchMarket(); },
  });

  // Unified cosmetics list
  const allCosmetics = [
    ...FRAMES.map(f => ({ ...f, kind: "frame" as const })),
    ...TITLES.map(t => ({ ...t, kind: "title" as const })),
    ...BADGES.map(b => ({ ...b, kind: "badge" as const, color: undefined, glowColor: undefined, emoji: (b as any).emoji })),
  ];
  const filteredCosmetics = allCosmetics
    .filter(c => cosmeticFilter === "all" || c.kind + "s" === cosmeticFilter)
    .filter(c => rarityFilter === "all" || c.rarity === rarityFilter);

  const CASINO_GAMES: { id: CasinoGame; emoji: string; label: string }[] = [
    { id: "blackjack", emoji: "🃏", label: "Blackjack" },
    { id: "roulette", emoji: "🎰", label: "Roulette" },
    { id: "coinflip", emoji: "🪙", label: "Coin Flip" },
    { id: "crash", emoji: "🚀", label: "Crash" },
    { id: "hilo", emoji: "🎯", label: "Hi-Lo" },
  ];

  const MAIN_TABS: { id: MainTab; label: string; emoji: string }[] = [
    { id: "cosmetics", label: "Cosmetics", emoji: "✨" },
    { id: "casino", label: "Casino", emoji: "🎲" },
    { id: "packs", label: "Packs", emoji: "📦" },
    { id: "market", label: "Market", emoji: "🏪" },
  ];

  const RARITY_OPTIONS: { id: RarityFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "common", label: "Common" },
    { id: "uncommon", label: "Uncommon" },
    { id: "rare", label: "Rare" },
    { id: "epic", label: "Epic" },
    { id: "legendary", label: "Legendary" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">

      <div className="relative max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-amber-400">
              12Digits Shop
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Cosmetics, casino games, and player market</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
            <p className="text-2xl font-black text-green-400">${balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* ── Main Tabs ── */}
        <div className="flex gap-1 p-1 rounded-2xl border border-slate-800/80" style={{ background: "rgba(15,15,25,0.8)", backdropFilter: "blur(12px)" }}>
          {MAIN_TABS.map(t => (
            <button key={t.id} data-testid={`tab-${t.id}`} onClick={() => setMainTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all
                ${mainTab === t.id ? "text-black shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-slate-300"}`}
              style={mainTab === t.id ? { background: "#f59e0b" } : {}}>
              <span>{t.emoji}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Cosmetics ── */}
        {mainTab === "cosmetics" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
                {(["all","frames","titles","badges"] as CosmeticFilter[]).map(f => (
                  <button key={f} onClick={() => setCosmeticFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${cosmeticFilter === f ? "bg-amber-500 text-black" : "text-slate-400 hover:text-slate-200"}`}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
                {RARITY_OPTIONS.map(r => (
                  <button key={r.id} onClick={() => setRarityFilter(r.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${rarityFilter === r.id ? "bg-amber-500 text-black" : "text-slate-400 hover:text-slate-200"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredCosmetics.map(item => {
                const isOwned = owned.includes(item.id);
                const isEquipped = item.kind === "frame" ? equippedFrame === item.id : equippedTitle === item.id;
                return (
                  <div key={item.id}
                    className={`relative rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:scale-[1.02] hover:-translate-y-0.5 border cursor-default
                      ${isOwned ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 hover:border-slate-700"}
                      ${RARITY_GLOW[item.rarity] ? "shadow-lg " + RARITY_GLOW[item.rarity] : ""}`}
                    style={{ background: isOwned ? undefined : "rgba(15,15,25,0.8)" }}>
                    <div className="flex items-center justify-between w-full">
                      <RarityBadge rarity={item.rarity} />
                      <span className="text-[9px] text-slate-600 uppercase font-bold">{item.kind}</span>
                    </div>
                    {item.kind === "frame"
                      ? <FramePreview frameId={item.id} size={48} />
                      : <span className="text-4xl my-1">{(item as any).emoji}</span>}
                    <p className="text-xs font-bold text-center leading-tight text-slate-200">{item.name}</p>
                    <p className="text-[10px] text-slate-500 text-center leading-tight">{(item as any).desc}</p>
                    {isOwned ? (
                      item.kind === "badge" ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs mt-auto"><Check className="w-3 h-3" />Owned</div>
                      ) : (
                        <Button size="sm" variant={isEquipped ? "default" : "outline"} className={`w-full text-xs h-7 mt-auto ${isEquipped ? "bg-amber-500 hover:bg-amber-400 text-black border-0" : "border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-500/50"}`}
                          onClick={() => equipMutation.mutate({ type: item.kind, value: isEquipped ? null : item.id })} disabled={equipMutation.isPending}>
                          {isEquipped ? <><Check className="w-3 h-3 mr-1" />Equipped</> : "Equip"}
                        </Button>
                      )
                    ) : (
                      <Button size="sm" className="w-full text-xs h-7 mt-auto bg-amber-500 hover:bg-amber-400 text-black border-0"
                        onClick={() => {
                          if (balance < item.price) { toast({ title: "Not enough balance", variant: "destructive" }); return; }
                          purchaseMutation.mutate({ itemId: item.id, price: item.price });
                        }}
                        disabled={purchaseMutation.isPending || balance < item.price}>
                        <Zap className="w-3 h-3 mr-1" />${item.price.toLocaleString()}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredCosmetics.length === 0 && (
              <div className="text-center py-16 text-slate-600">No items match these filters.</div>
            )}
          </div>
        )}

        {/* ── Casino ── */}
        {mainTab === "casino" && (
          <div className="space-y-5">
            {/* Casino header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Casino <span className="text-amber-400">🎰</span></h2>
                <p className="text-xs text-zinc-600 mt-0.5">All bets use your simulator balance</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider">Balance</p>
                <p className="text-xl font-black text-amber-400">${balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Game selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CASINO_GAMES.map(g => {
                const active = casinoGame === g.id;
                const gameColors: Record<string, string> = {
                  blackjack: "rgba(16,185,129,0.15)", roulette: "rgba(220,38,38,0.15)",
                  coinflip: "rgba(212,175,55,0.15)", crash: "rgba(249,115,22,0.15)", hilo: "rgba(139,92,246,0.15)",
                };
                const gameBorders: Record<string, string> = {
                  blackjack: "rgba(16,185,129,0.5)", roulette: "rgba(220,38,38,0.5)",
                  coinflip: "rgba(212,175,55,0.5)", crash: "rgba(249,115,22,0.5)", hilo: "rgba(139,92,246,0.5)",
                };
                return (
                  <button key={g.id} onClick={() => setCasinoGame(g.id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl shrink-0 transition-all hover:scale-[1.03] active:scale-95"
                    style={{
                      background: active ? gameColors[g.id] : "rgba(10,10,20,0.8)",
                      border: `1px solid ${active ? gameBorders[g.id] : "rgba(255,255,255,0.05)"}`,
                      boxShadow: active ? `0 4px 20px ${gameColors[g.id]}` : "none",
                      minWidth: 80,
                    }}>
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: active ? "#d4af37" : "#4b5563" }}>{g.label}</span>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                  </button>
                );
              })}
            </div>

            {/* Game panel */}
            <CasinoPanel>
              {casinoGame === "blackjack" && <BlackjackGame balance={balance} onRefreshUser={refreshUser} />}
              {casinoGame === "roulette" && <RouletteGame balance={balance} onRefreshUser={refreshUser} />}
              {casinoGame === "coinflip" && <CoinFlipGame balance={balance} onRefreshUser={refreshUser} />}
              {casinoGame === "crash" && <CrashGame balance={balance} onRefreshUser={refreshUser} />}
              {casinoGame === "hilo" && <HiLoGame balance={balance} onRefreshUser={refreshUser} />}
            </CasinoPanel>

            <p className="text-center text-[10px] text-zinc-800 uppercase tracking-widest">All games use your simulator balance · Play responsibly</p>
          </div>
        )}

        {/* ── Packs ── */}
        {mainTab === "packs" && (
          <div className="space-y-4">
            {packResult && (() => {
              const revealItem = getItemById(packResult.itemId);
              const badgeItem = packResult.type === "badge" ? BADGES.find(b => b.id === packResult.itemId) : null;
              const titleItem = packResult.type === "title" ? TITLES.find(t => t.id === packResult.itemId) : null;
              return (
                <div className="rounded-2xl p-8 text-center border border-amber-500/40 bg-zinc-900 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-amber-400 font-bold text-2xl mb-1">🎁 Pack Opened!</p>
                  <p className="text-slate-500 text-sm mb-5">Here's what you got:</p>
                  <div className="flex flex-col items-center gap-3 mb-6">
                    {packResult.type === "frame"
                      ? <div className="flex justify-center"><FramePreview frameId={packResult.itemId} size={80} /></div>
                      : <p className="text-6xl leading-none">{badgeItem?.emoji ?? titleItem?.name?.split(" ")[0] ?? "🏷️"}</p>}
                    <div>
                      <p className="font-bold text-white text-lg">{revealItem?.name ?? packResult.itemId}</p>
                      {revealItem && <div className="flex justify-center mt-1.5"><RarityBadge rarity={revealItem.rarity} /></div>}
                      <p className="text-xs text-slate-600 mt-1 capitalize">{packResult.type}</p>
                    </div>
                  </div>
                  <Button className="bg-amber-500 hover:bg-amber-400 text-black border-0 font-bold px-8" onClick={() => setPackResult(null)}>Nice!</Button>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PACKS.map(pack => (
                <div key={pack.id}
                  className={`rounded-2xl p-5 flex flex-col gap-3 border bg-zinc-950 transition-all hover:scale-[1.01] hover:-translate-y-0.5
                    ${RARITY_GLOW[pack.rarity] ? "shadow-xl " + RARITY_GLOW[pack.rarity] : ""}
                    border-zinc-800 hover:border-zinc-700`}>
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{pack.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-200">{pack.name}</span>
                        <RarityBadge rarity={pack.rarity} />
                      </div>
                      <p className="text-[11px] text-slate-500">{pack.desc}</p>
                    </div>
                  </div>
                  <div className="rounded-xl px-3 py-2 text-xs text-slate-500 border border-slate-800 bg-slate-900/50">
                    🎁 <span className="font-medium text-slate-300">{pack.guarantee}</span>
                  </div>
                  <Button className="w-full mt-auto bg-amber-500 hover:bg-amber-400 text-black border-0 font-bold shadow-lg shadow-amber-500/15"
                    disabled={packOpenMutation.isPending || balance < pack.price}
                    onClick={async () => { setOpening(true); await packOpenMutation.mutateAsync({ packId: pack.id, price: pack.price }); setOpening(false); }}>
                    {opening && packOpenMutation.isPending
                      ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Opening...</>
                      : <><Gift className="w-4 h-4 mr-2" />Open for ${pack.price.toLocaleString()}</>}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Market ── */}
        {mainTab === "market" && (() => {
          const allCatalog = [...FRAMES, ...TITLES, ...BADGES] as Array<{ id: string; name: string; price: number; rarity: Rarity }>;
          const getRetailPrice = (id: string) => allCatalog.find(i => i.id === id)?.price ?? 0;

          const filteredListings = marketListings
            .filter((l: any) => marketFilter === "all" || l.itemType === marketFilter)
            .filter((l: any) => {
              if (!marketSearch.trim()) return true;
              const info = getItemById(l.itemId);
              return info?.name.toLowerCase().includes(marketSearch.toLowerCase()) || l.itemId.includes(marketSearch.toLowerCase());
            })
            .sort((a: any, b: any) => {
              if (marketSort === "price-asc") return a.price - b.price;
              if (marketSort === "price-desc") return b.price - a.price;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

          const listPreviewItem = listItemId ? getItemById(listItemId) : null;
          const ownedListable = (listItemType === "frame" ? FRAMES : listItemType === "title" ? TITLES : BADGES).filter(item => owned.includes(item.id));

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Item Panel */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-950 sticky top-4 space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-slate-200"><Tag className="w-4 h-4 text-amber-400" />List an Item</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Type</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {["frame","title","badge"].map(t => (
                          <button key={t} onClick={() => { setListItemType(t); setListItemId(""); }}
                            className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${listItemType === t ? "bg-amber-500 text-black border-amber-500" : "bg-zinc-900 text-slate-400 border-zinc-800 hover:border-zinc-600"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Item {ownedListable.length === 0 && <span className="text-red-400">(none owned)</span>}</label>
                      <select value={listItemId} onChange={e => setListItemId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:border-amber-500/50 outline-none">
                        <option value="">-- Select --</option>
                        {ownedListable.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </div>
                    {listPreviewItem && (
                      <div className="flex items-center gap-3 rounded-xl p-3 bg-zinc-900 border border-zinc-800">
                        {listItemType === "frame"
                          ? <FramePreview frameId={listItemId} size={36} />
                          : <span className="text-2xl">{BADGES.find(b => b.id === listItemId)?.emoji ?? "🏷️"}</span>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-300 truncate">{listPreviewItem.name}</p>
                          <RarityBadge rarity={listPreviewItem.rarity} />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-600">Retail</p>
                          <p className="text-xs text-slate-400">${getRetailPrice(listItemId).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Your Price ($)</label>
                      <Input type="number" min="1" value={listPrice} onChange={e => setListPrice(e.target.value)} placeholder="e.g. 5000"
                        className="bg-zinc-900 border-zinc-700 text-slate-300 focus:border-amber-500/50" />
                      {listPrice && listItemId && (() => {
                        const retail = getRetailPrice(listItemId);
                        const pct = retail > 0 ? Math.round(((retail - Number(listPrice)) / retail) * 100) : 0;
                        if (pct > 0) return <p className="text-xs text-green-400 mt-1">{pct}% below retail — great deal for buyers</p>;
                        if (pct < 0) return <p className="text-xs text-yellow-500 mt-1">{Math.abs(pct)}% above retail</p>;
                        return null;
                      })()}
                    </div>
                    <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black border-0 font-bold"
                      disabled={!listItemId || !listPrice || listMutation.isPending}
                      onClick={() => listMutation.mutate({ itemId: listItemId, itemType: listItemType, price: Number(listPrice) })}>
                      <Tag className="w-4 h-4 mr-2" />{listMutation.isPending ? "Listing..." : "List for Sale"}
                    </Button>
                  </div>
                  <div className="rounded-xl p-3 bg-zinc-900 border border-zinc-800 text-xs text-slate-500 space-y-1">
                    <p className="text-slate-400 font-semibold">How it works</p>
                    <p>List any owned cosmetic for sale. Buyers pay you directly — funds land in your simulator balance. Listings stay active until sold or cancelled.</p>
                  </div>
                </div>
              </div>

              {/* Listings Panel */}
              <div className="lg:col-span-2 space-y-4">
                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Active Listings", value: marketListings.length },
                    { label: "Frames", value: marketListings.filter((l: any) => l.itemType === "frame").length },
                    { label: "Lowest Price", value: marketListings.length > 0 ? `$${Math.min(...marketListings.map((l: any) => l.price)).toLocaleString()}` : "—" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 bg-zinc-900 border border-zinc-800 text-center">
                      <p className="text-lg font-bold text-amber-400">{s.value}</p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-xl overflow-hidden border border-zinc-800">
                    {(["all","frame","title","badge"] as const).map(f => (
                      <button key={f} onClick={() => setMarketFilter(f)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize transition-all ${marketFilter === f ? "bg-amber-500 text-black" : "bg-zinc-900 text-slate-400 hover:text-slate-200"}`}>
                        {f === "all" ? "All" : f + "s"}
                      </button>
                    ))}
                  </div>
                  <select value={marketSort} onChange={e => setMarketSort(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 outline-none">
                    <option value="newest">Newest first</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                  </select>
                  <Input value={marketSearch} onChange={e => setMarketSearch(e.target.value)} placeholder="Search items..."
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 text-slate-300 flex-1 min-w-32 max-w-52" />
                  <Button variant="ghost" size="sm" onClick={() => refetchMarket()} className="text-slate-500 hover:text-slate-300 h-8 px-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Listing cards */}
                {filteredListings.length === 0 ? (
                  <div className="rounded-2xl p-12 text-center border border-zinc-800 bg-zinc-900">
                    <p className="text-4xl mb-3">🏪</p>
                    <p className="font-medium text-slate-500">{marketListings.length === 0 ? "No listings yet" : "No matches found"}</p>
                    <p className="text-sm text-slate-600 mt-1">{marketListings.length === 0 ? "Be the first to list an item!" : "Try a different filter or search."}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredListings.map((listing: any) => {
                      const info = getItemById(listing.itemId);
                      const retail = getRetailPrice(listing.itemId);
                      const pct = retail > 0 ? Math.round(((retail - listing.price) / retail) * 100) : 0;
                      const isOwn = listing.sellerId === user?.id;
                      const badgeInfo = listing.itemType === "badge" ? BADGES.find(b => b.id === listing.itemId) : null;
                      return (
                        <div key={listing.id} className={`rounded-xl p-3.5 flex items-center gap-3 border transition-all ${isOwn ? "border-amber-500/20 bg-zinc-950" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                          {/* Preview */}
                          <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                            {listing.itemType === "frame"
                              ? <FramePreview frameId={listing.itemId} size={36} />
                              : <span className="text-2xl">{badgeInfo?.emoji ?? info?.name?.split(" ")[0] ?? "🏷️"}</span>}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-sm text-slate-200 truncate">{info?.name ?? listing.itemId}</p>
                              {info && <RarityBadge rarity={info.rarity} />}
                              {isOwn && <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-500/60">yours</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-600 capitalize">{listing.itemType}</span>
                              <span className="text-xs text-slate-700">·</span>
                              <span className="text-xs text-slate-500">by {listing.seller?.displayName ?? "Unknown"}</span>
                              {pct > 0 && <span className="text-[10px] text-green-500 font-semibold">{pct}% off retail</span>}
                              {pct < -5 && <span className="text-[10px] text-yellow-500 font-semibold">{Math.abs(pct)}% over retail</span>}
                            </div>
                          </div>
                          {/* Price + action */}
                          <div className="shrink-0 flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-green-400 font-bold text-sm">${listing.price?.toLocaleString()}</p>
                              {retail > 0 && <p className="text-[10px] text-slate-700">retail ${retail.toLocaleString()}</p>}
                            </div>
                            {isOwn ? (
                              <Button size="sm" variant="outline" className="text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
                                onClick={() => cancelListingMutation.mutate(listing.id)} disabled={cancelListingMutation.isPending}>
                                Cancel
                              </Button>
                            ) : (
                              <Button size="sm" className="text-xs h-8 bg-amber-500 hover:bg-amber-400 text-black border-0 font-bold shrink-0"
                                onClick={() => buyListingMutation.mutate(listing.id)} disabled={buyListingMutation.isPending || balance < listing.price}>
                                {buyListingMutation.isPending ? "..." : "Buy"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <style>{`
        @keyframes card-deal {
          0% { opacity: 0; transform: translateY(-20px) scale(0.8) rotate(-5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes casino-coin-flip {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(1440deg); }
        }
        @keyframes casino-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes casino-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.4); }
          50%       { box-shadow: 0 0 40px rgba(16,185,129,0.8); }
        }
      `}</style>
    </div>
  );
}
