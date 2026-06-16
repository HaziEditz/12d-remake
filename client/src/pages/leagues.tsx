import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Trophy, Swords, Users, Target, Crown, TrendingUp, TrendingDown,
  Star, Zap, Shield, Flame, Award, ChevronRight, Plus, LogIn,
  Clock, CheckCircle2, AlertCircle, BarChart3, RefreshCw, Lock
} from "lucide-react";

// ─── League Tier Config ────────────────────────────────────────────────────

export const LEAGUES = [
  { name: "Bronze",            minLP: 0,     maxLP: 499,   color: "#CD7F32", bg: "from-amber-900/40 to-amber-800/20", border: "border-amber-700/50", emoji: "🥉", roman: "I"   },
  { name: "Silver",            minLP: 500,   maxLP: 1499,  color: "#9CA3AF", bg: "from-slate-600/40 to-slate-500/20", border: "border-slate-500/50", emoji: "🥈", roman: "II"  },
  { name: "Gold",              minLP: 1500,  maxLP: 2999,  color: "#EAB308", bg: "from-yellow-700/40 to-yellow-600/20", border: "border-yellow-600/50", emoji: "🥇", roman: "III" },
  { name: "Diamond",           minLP: 3000,  maxLP: 5999,  color: "#67E8F9", bg: "from-cyan-800/40 to-cyan-700/20", border: "border-cyan-600/50", emoji: "💎", roman: "IV" },
  { name: "Elite",             minLP: 6000,  maxLP: 11999, color: "#A78BFA", bg: "from-violet-800/40 to-violet-700/20", border: "border-violet-600/50", emoji: "⚡", roman: "V"  },
  { name: "Hedge Fund",        minLP: 12000, maxLP: 24999, color: "#3B82F6", bg: "from-blue-800/40 to-blue-700/20", border: "border-blue-600/50", emoji: "🏦", roman: "VI" },
  { name: "Wall Street Legend",minLP: 25000, maxLP: Infinity, color: "#F5CC5A", bg: "from-yellow-600/40 to-orange-600/20", border: "border-yellow-500/50", emoji: "👑", roman: "VII" },
] as const;

export function getLeague(lp: number) {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (lp >= LEAGUES[i].minLP) return { ...LEAGUES[i], index: i };
  }
  return { ...LEAGUES[0], index: 0 };
}

function lpProgressInLeague(lp: number) {
  const league = getLeague(lp);
  if (league.maxLP === Infinity) return 100;
  const span = league.maxLP - league.minLP;
  return Math.min(100, Math.round(((lp - league.minLP) / span) * 100));
}

const TABS = [
  { id: "overview",   label: "My League",   icon: Trophy   },
  { id: "rivals",     label: "Rivals",      icon: Swords   },
  { id: "showdowns",  label: "Showdowns",   icon: Target   },
  { id: "hedgefunds", label: "Hedge Funds", icon: Users    },
  { id: "challenges", label: "Challenges",  icon: Flame    },
  { id: "leaderboard",label: "Rankings",   icon: Crown    },
] as const;
type Tab = typeof TABS[number]["id"];

// ─── Small helpers ────────────────────────────────────────────────────────────

function Avatar2({ name, url, size = 10 }: { name: string; url?: string | null; size?: number }) {
  return (
    <Avatar className={`h-${size} w-${size}`}>
      {url && <AvatarImage src={url} />}
      <AvatarFallback className="text-xs font-bold">
        {name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function LeagueBadge({ lp, size = "md" }: { lp: number; size?: "sm" | "md" | "lg" }) {
  const league = getLeague(lp);
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-3 py-1", lg: "text-base px-4 py-1.5" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${league.border} bg-black/30 ${sizes[size]}`}
      style={{ color: league.color }}
    >
      {league.emoji} {league.name}
    </span>
  );
}

function LpDelta({ v }: { v: number }) {
  if (v > 0) return <span className="text-green-400 text-xs font-bold">+{v} LP</span>;
  if (v < 0) return <span className="text-red-400 text-xs font-bold">{v} LP</span>;
  return <span className="text-zinc-500 text-xs">0 LP</span>;
}

function timeLeft(endsAt: string | null) {
  if (!endsAt) return "—";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, season }: { stats: any; season: any }) {
  const league = getLeague(stats.lp);
  const progress = lpProgressInLeague(stats.lp);
  const next = LEAGUES[league.index + 1];

  return (
    <div className="space-y-5">
      {/* Main rank card */}
      <div className={`relative rounded-2xl bg-gradient-to-br ${league.bg} border ${league.border} p-6 overflow-hidden`}>
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 70% 30%, ${league.color}, transparent 60%)` }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mb-1">Current Rank</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-5xl">{league.emoji}</span>
              <div>
                <h2 className="text-2xl font-black text-white">{league.name}</h2>
                <p className="text-sm font-bold" style={{ color: league.color }}>{stats.lp.toLocaleString()} LP</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Peak LP</p>
            <p className="text-lg font-bold text-white">{stats.peakLp.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-2">Season LP</p>
            <p className="text-sm font-bold text-amber-400">{stats.seasonLp.toLocaleString()}</p>
          </div>
        </div>

        {next && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
              <span>{league.name}</span>
              <span>{next.emoji} {next.name} in {(next.minLP - stats.lp).toLocaleString()} LP</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/40 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${league.color}cc, ${league.color})` }}
              />
            </div>
            <p className="text-right text-xs text-zinc-500 mt-1">{progress}%</p>
          </div>
        )}
        {!next && (
          <div className="mt-3 text-center">
            <span className="text-sm font-bold text-yellow-400">👑 Maximum Rank Achieved</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Weekly LP", value: stats.weeklyLp.toLocaleString(), icon: TrendingUp, color: "text-green-400" },
          { label: "Rival Wins", value: stats.rivalWins, icon: Swords, color: "text-orange-400" },
          { label: "Showdown Wins", value: stats.showdownWins, icon: Target, color: "text-violet-400" },
          { label: "W/L Ratio", value: stats.rivalWins + stats.showdownWins === 0 ? "—" : `${stats.rivalWins + stats.showdownWins}/${stats.rivalLosses + stats.showdownLosses}`, icon: BarChart3, color: "text-cyan-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <s.icon className={`h-4 w-4 mb-2 ${s.color}`} />
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Season info */}
      {season && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Season {season.number}</p>
            <p className="text-sm font-bold text-white">Ends {new Date(season.endDate).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-0.5">Your season LP</p>
            <p className="text-sm font-bold text-amber-400">{stats.seasonLp.toLocaleString()}</p>
          </div>
          <Award className="h-8 w-8 text-amber-500/60 ml-4" />
        </div>
      )}

      {/* All leagues chart */}
      <div>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">League Tiers</p>
        <div className="space-y-2">
          {[...LEAGUES].reverse().map((l, i) => {
            const isCurrentLeague = l.name === league.name;
            return (
              <div key={l.name} className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors ${isCurrentLeague ? `${l.border} bg-black/30` : "border-zinc-800/50 bg-zinc-950/50"}`}>
                <span className="text-lg w-7 text-center">{l.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isCurrentLeague ? "text-white" : "text-zinc-400"}`}>{l.name}</p>
                  <p className="text-xs text-zinc-600">{l.minLP.toLocaleString()}{l.maxLP === Infinity ? "+" : `–${l.maxLP.toLocaleString()}`} LP</p>
                </div>
                {isCurrentLeague && <Badge variant="outline" className="text-xs border-current" style={{ color: l.color }}>You are here</Badge>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Rivals Tab ───────────────────────────────────────────────────────────────

function RivalsTab({ myStats }: { myStats: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const rivalQ = useQuery<{ rival: any }>({ queryKey: ["/api/leagues/rival"] });
  const matchMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/leagues/rival/match").then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leagues/rival"] }); toast({ title: "Rival matched!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rival = rivalQ.data?.rival;
  const myLeague = getLeague(myStats.lp);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Your Rival</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Weekly head-to-head — most LP gained wins</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => matchMut.mutate()} disabled={matchMut.isPending} className="gap-1.5 text-xs border-zinc-700">
          <RefreshCw className={`h-3.5 w-3.5 ${matchMut.isPending ? "animate-spin" : ""}`} />
          Find Rival
        </Button>
      </div>

      {rivalQ.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-900" />
      ) : !rival ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
          <Swords className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">No rival yet</p>
          <p className="text-xs text-zinc-600 mb-4">Click "Find Rival" to be matched with someone at your level</p>
          <Button size="sm" onClick={() => matchMut.mutate()} disabled={matchMut.isPending} className="gap-1.5">
            <Swords className="h-3.5 w-3.5" /> Match Me
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-5">
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center">
              <Avatar2 name="You" size={14} />
              <p className="text-sm font-bold text-white mt-2">You</p>
              <LeagueBadge lp={myStats.lp} size="sm" />
              <p className="text-xl font-black text-white mt-2">{myStats.weeklyLp.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">Weekly LP</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-zinc-400">VS</span>
              <div className="h-0.5 w-8 bg-zinc-700 rounded" />
              <span className="text-xs text-zinc-600">this week</span>
            </div>
            <div className="flex-1 text-center">
              <Avatar2 name={rival.displayName ?? "?"} url={rival.avatarUrl} size={14} />
              <p className="text-sm font-bold text-white mt-2">{rival.displayName}</p>
              <LeagueBadge lp={rival.lp ?? 0} size="sm" />
              <p className="text-xl font-black text-white mt-2">{(rival.weeklyLp ?? 0).toLocaleString()}</p>
              <p className="text-xs text-zinc-500">Weekly LP</p>
            </div>
          </div>

          {/* Win bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span className="font-bold text-green-400">{myStats.weeklyLp > (rival.weeklyLp ?? 0) ? "Leading 🔥" : ""}</span>
              <span className="font-bold text-red-400">{myStats.weeklyLp < (rival.weeklyLp ?? 0) ? "Behind ⚠️" : ""}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                style={{ width: `${Math.round((myStats.weeklyLp / Math.max(1, myStats.weeklyLp + (rival.weeklyLp ?? 1))) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-zinc-800 p-3 text-center">
              <p className="text-lg font-black text-green-400">{myStats.rivalWins}</p>
              <p className="text-xs text-zinc-500">Your wins</p>
            </div>
            <div className="rounded-lg bg-zinc-800 p-3 text-center">
              <p className="text-lg font-black text-red-400">{myStats.rivalLosses}</p>
              <p className="text-xs text-zinc-500">Your losses</p>
            </div>
          </div>
        </div>
      )}

      {/* How rivalry works */}
      <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">How Rivals Work</p>
        <div className="space-y-2 text-xs text-zinc-500">
          {[
            ["🎯", "You and your rival compete each week"],
            ["📈", "LP earned from trades counts toward weekly rivalry"],
            ["🏆", "End of week: most weekly LP wins +50 bonus LP"],
            ["🔄", "Rivals reset weekly — win streaks build prestige"],
            ["⚡", "Rivals are matched by similar LP rank"],
          ].map(([icon, txt]) => (
            <div key={txt as string} className="flex gap-2">
              <span>{icon}</span><span>{txt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Showdowns Tab ───────────────────────────────────────────────────────────

function ShowdownsTab({ myStats, myUserId }: { myStats: any; myUserId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [timeframe, setTimeframe] = useState<"1h" | "1d" | "1w">("1d");

  const showdownsQ = useQuery<any[]>({ queryKey: ["/api/leagues/showdowns"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/leagues/showdowns", { challengeeId: targetId, timeframe }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leagues/showdowns"] }); setShowCreate(false); toast({ title: "Challenge sent! 🗡️" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      apiRequest("POST", `/api/leagues/showdowns/${id}/${action}`).then(r => r.json()),
    onSuccess: (_, { action }) => { qc.invalidateQueries({ queryKey: ["/api/leagues/showdowns"] }); toast({ title: action === "accept" ? "Showdown accepted! ⚔️" : "Declined." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/leagues/showdowns/${id}/resolve`).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leagues/showdowns"] }); toast({ title: "Showdown resolved!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const showdowns = showdownsQ.data ?? [];
  const pending = showdowns.filter(s => s.status === "pending" && s.challengeeId === myUserId);
  const active = showdowns.filter(s => s.status === "active");
  const history = showdowns.filter(s => s.status === "completed" || s.status === "declined");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Trading Showdowns</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Challenge anyone to a head-to-head LP battle</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Challenge
        </Button>
      </div>

      {/* Incoming challenges */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">⚔️ Incoming Challenges</p>
          {pending.map(sd => (
            <div key={sd.id} className="rounded-xl bg-orange-950/30 border border-orange-800/50 p-4 mb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar2 name={sd.challengerName ?? "?"} url={sd.challengerAvatar} size={9} />
                  <div>
                    <p className="text-sm font-bold text-white">{sd.challengerName} challenged you!</p>
                    <p className="text-xs text-zinc-500">Timeframe: {sd.timeframe === "1h" ? "1 Hour" : sd.timeframe === "1d" ? "1 Day" : "1 Week"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs border-red-800 text-red-400 hover:bg-red-950" onClick={() => respondMut.mutate({ id: sd.id, action: "decline" })}>Decline</Button>
                  <Button size="sm" className="text-xs bg-green-700 hover:bg-green-600" onClick={() => respondMut.mutate({ id: sd.id, action: "accept" })}>Accept ⚔️</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div>
          <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-2">🔥 Active Showdowns</p>
          {active.map(sd => {
            const isChallenger = sd.challengerId === myUserId;
            const myLpStart = isChallenger ? sd.challengerLpStart : sd.challengeeLpStart;
            const myCurrentLP = myStats.lp;
            const myGained = myCurrentLP - myLpStart;
            return (
              <div key={sd.id} className="rounded-xl bg-green-950/20 border border-green-800/30 p-4 mb-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar2 name={isChallenger ? (sd.challengeeName ?? "?") : (sd.challengerName ?? "?")} url={isChallenger ? sd.challengeeAvatar : sd.challengerAvatar} size={8} />
                    <div>
                      <p className="text-sm font-bold text-white">vs {isChallenger ? sd.challengeeName : sd.challengerName}</p>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        <span>{timeLeft(sd.endsAt)} left</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <LpDelta v={myGained} />
                    <p className="text-xs text-zinc-600">gained so far</p>
                  </div>
                </div>
                {new Date(sd.endsAt) <= new Date() && (
                  <Button size="sm" className="w-full text-xs mt-2" variant="outline" onClick={() => resolveMut.mutate(sd.id)}>
                    Resolve Showdown
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2">History</p>
          {history.map(sd => {
            const won = sd.winnerUserId === myUserId;
            const isChallenger = sd.challengerId === myUserId;
            const opponent = isChallenger ? sd.challengeeName : sd.challengerName;
            return (
              <div key={sd.id} className={`rounded-lg border p-3 mb-2 flex items-center justify-between ${sd.status === "declined" ? "border-zinc-800 bg-zinc-900/30" : won ? "border-green-900 bg-green-950/20" : "border-red-900/50 bg-red-950/10"}`}>
                <div className="flex items-center gap-2">
                  <span>{sd.status === "declined" ? "🚫" : won ? "🏆" : "💀"}</span>
                  <div>
                    <p className="text-xs font-bold text-white">vs {opponent}</p>
                    <p className="text-xs text-zinc-600">{sd.timeframe === "1h" ? "1h" : sd.timeframe === "1d" ? "1d" : "1w"} · {new Date(sd.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {sd.status === "completed" && (
                  <div className="text-right">
                    <LpDelta v={won ? 100 : 0} />
                    <p className="text-xs text-zinc-600">{won ? "Victory" : "Defeat"}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showdowns.length === 0 && !showdownsQ.isLoading && (
        <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
          <Target className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">No showdowns yet</p>
          <p className="text-xs text-zinc-600 mb-4">Challenge a rival or friend to a head-to-head LP battle</p>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Challenge Someone</DialogTitle>
            <DialogDescription className="text-zinc-500">Enter their User ID and pick a timeframe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Opponent User ID</label>
              <Input
                placeholder="User ID (from their profile)"
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Timeframe</label>
              <div className="grid grid-cols-3 gap-2">
                {(["1h","1d","1w"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`rounded-lg py-2 text-sm font-bold border transition-colors ${timeframe === t ? "bg-violet-700 border-violet-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                  >
                    {t === "1h" ? "1 Hour" : t === "1d" ? "1 Day" : "1 Week"}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-500">
              🏆 Winner gets <span className="text-green-400 font-bold">+100 LP</span> bonus. LP from trades during the timeframe decides the winner.
            </div>
            <Button className="w-full gap-2" onClick={() => createMut.mutate()} disabled={!targetId || createMut.isPending}>
              <Swords className="h-4 w-4" /> Send Challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Hedge Funds Tab ─────────────────────────────────────────────────────────

function HedgeFundsTab({ myUserId }: { myUserId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [fundName, setFundName] = useState("");
  const [fundDesc, setFundDesc] = useState("");
  const [fundEmoji, setFundEmoji] = useState("🏦");
  const [joinCode, setJoinCode] = useState("");

  const myFundQ = useQuery<{ fund: any; members: any[] } | null>({ queryKey: ["/api/leagues/hedge-funds/mine"] });
  const lbQ = useQuery<any[]>({ queryKey: ["/api/leagues/hedge-funds"] });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/leagues/hedge-funds", { name: fundName, description: fundDesc, emoji: fundEmoji }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leagues/hedge-funds"] }); qc.invalidateQueries({ queryKey: ["/api/leagues/hedge-funds/mine"] }); setShowCreate(false); toast({ title: "Hedge fund created! 🏦" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/leagues/hedge-funds/join", { joinCode }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leagues/hedge-funds"] }); qc.invalidateQueries({ queryKey: ["/api/leagues/hedge-funds/mine"] }); setShowJoin(false); toast({ title: "Joined the fund! 🤝" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const leaveMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/leagues/hedge-funds/leave"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/leagues/hedge-funds"] }); qc.invalidateQueries({ queryKey: ["/api/leagues/hedge-funds/mine"] }); toast({ title: "Left the fund." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const myFund = myFundQ.data;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Hedge Funds</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Team up and compete against other groups</p>
        </div>
        {!myFund && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowJoin(true)} className="text-xs border-zinc-700 gap-1">
              <LogIn className="h-3.5 w-3.5" /> Join
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
          </div>
        )}
      </div>

      {/* My fund */}
      {myFundQ.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-900" />
      ) : myFund ? (
        <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-700/40 p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-800/50 border border-blue-600/40 flex items-center justify-center text-2xl">
                {myFund.fund.logoEmoji}
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-0.5">Your Fund</p>
                <h3 className="text-lg font-black text-white">{myFund.fund.name}</h3>
                {myFund.fund.description && <p className="text-xs text-zinc-500 mt-0.5">{myFund.fund.description}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">All-time LP</p>
              <p className="text-lg font-black text-blue-400">{myFund.fund.allTimeLpTotal.toLocaleString()}</p>
            </div>
          </div>

          {/* Join code */}
          {myFund.members.find((m: any) => m.userId === myUserId)?.role === "owner" && (
            <div className="rounded-lg bg-black/40 border border-zinc-700 p-3 mb-4">
              <p className="text-xs text-zinc-500 mb-1">Invite Code (share with friends)</p>
              <p className="text-lg font-black text-white tracking-[0.3em]">{myFund.fund.joinCode}</p>
            </div>
          )}

          {/* Members */}
          <div className="space-y-2">
            {myFund.members.sort((a: any, b: any) => b.lp - a.lp).map((m: any) => (
              <div key={m.userId} className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                <Avatar2 name={m.displayName} size={7} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{m.displayName}{m.role === "owner" ? " 👑" : ""}</p>
                  <p className="text-xs text-zinc-600">+{m.weeklyLpContrib} LP this week</p>
                </div>
                <LeagueBadge lp={m.lp} size="sm" />
              </div>
            ))}
          </div>

          <Button size="sm" variant="ghost" onClick={() => leaveMut.mutate()} disabled={leaveMut.isPending}
            className="mt-4 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 w-full">
            Leave Fund
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center">
          <Users className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">No fund yet</p>
          <p className="text-xs text-zinc-600 mb-4">Create your own or join with a code</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={() => setShowJoin(true)} className="border-zinc-700 gap-1 text-xs"><LogIn className="h-3.5 w-3.5" />Join Fund</Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 text-xs"><Plus className="h-3.5 w-3.5" />Create Fund</Button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">Fund Leaderboard</p>
        {lbQ.isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : (lbQ.data ?? []).map((f, i) => (
          <div key={f.id} className={`flex items-center gap-3 rounded-xl border p-3 mb-2 ${myFund?.fund?.id === f.id ? "border-blue-700/60 bg-blue-950/20" : "border-zinc-800 bg-zinc-900/30"}`}>
            <span className="text-lg font-black text-zinc-500 w-7 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
            <span className="text-xl">{f.logoEmoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{f.name}</p>
              <p className="text-xs text-zinc-600">{f.memberCount} members · +{f.weeklyLpTotal.toLocaleString()} LP this week</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-blue-400">{f.allTimeLpTotal.toLocaleString()}</p>
              <p className="text-xs text-zinc-600">total LP</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Create Hedge Fund</DialogTitle>
            <DialogDescription className="text-zinc-500">Build your team and compete on the leaderboard</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 mb-1.5 block">Fund Name</label>
                <Input placeholder="e.g. Alpha Capital" value={fundName} onChange={e => setFundName(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              </div>
              <div className="w-20">
                <label className="text-xs text-zinc-400 mb-1.5 block">Emoji</label>
                <Input placeholder="🏦" value={fundEmoji} onChange={e => setFundEmoji(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-center text-xl" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Description (optional)</label>
              <Input placeholder="We eat volatility for breakfast" value={fundDesc} onChange={e => setFundDesc(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
            <Button className="w-full gap-2" onClick={() => createMut.mutate()} disabled={!fundName || createMut.isPending}>
              <Plus className="h-4 w-4" /> Create Fund
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Join a Fund</DialogTitle>
            <DialogDescription className="text-zinc-500">Enter the 6-character invite code</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="ABC123"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="bg-zinc-900 border-zinc-700 text-white text-center text-2xl tracking-[0.3em] font-black h-14"
              maxLength={6}
            />
            <Button className="w-full gap-2" onClick={() => joinMut.mutate()} disabled={joinCode.length !== 6 || joinMut.isPending}>
              <LogIn className="h-4 w-4" /> Join Fund
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Challenges Tab ───────────────────────────────────────────────────────────

function ChallengesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const challengesQ = useQuery<any[]>({ queryKey: ["/api/leagues/challenges"] });

  const claimMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/leagues/challenges/${id}/claim`).then(r => r.json()),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["/api/leagues/challenges"] }); qc.invalidateQueries({ queryKey: ["/api/leagues/me"] }); toast({ title: `+${data.lpAwarded} LP earned! 🎉` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const challenges = challengesQ.data ?? [];
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const nextMonday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
  const msLeft = nextMonday.getTime() - now.getTime();
  const dLeft = Math.floor(msLeft / 86400000);
  const hLeft = Math.floor((msLeft % 86400000) / 3600000);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Weekly Challenges</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Resets in {dLeft}d {hLeft}h · Complete all for bonus LP</p>
        </div>
        <div className="rounded-full bg-amber-900/40 border border-amber-700/50 px-3 py-1 text-xs font-bold text-amber-400">
          {challenges.filter(c => c.completed).length}/{challenges.length} done
        </div>
      </div>

      {challengesQ.isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900" />)}</div>
      ) : challenges.map(c => (
        <div key={c.id} className={`rounded-xl border p-4 transition-all ${c.completed ? "border-green-800/50 bg-green-950/10" : "border-zinc-800 bg-zinc-900/50"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{c.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{c.title}</p>
                  {c.completed && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{c.description}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-amber-400">+{c.lpReward} LP</p>
            </div>
          </div>
          {!c.completed && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all" style={{ width: "0%" }} />
              </div>
              <Button size="sm" variant="outline" className="text-xs border-zinc-700 gap-1 shrink-0" onClick={() => claimMut.mutate(c.id)} disabled={claimMut.isPending}>
                <CheckCircle2 className="h-3 w-3" /> Mark Done
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Educational callout */}
      <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-blue-400" /> Focus on Discipline
        </p>
        <p className="text-xs text-zinc-600 leading-relaxed">
          These challenges are designed to reward <span className="text-white">disciplined trading</span> — not reckless risk-taking.
          Setting stop-losses, maintaining risk/reward ratios, and trading consistently earn you the most LP.
          Reckless trades that lose money will <span className="text-red-400">reduce your LP</span>.
        </p>
      </div>
    </div>
  );
}

// ─── Leaderboard Tab ─────────────────────────────────────────────────────────

function LeaderboardTab({ myUserId }: { myUserId: string }) {
  const [view, setView] = useState<"overall" | "season" | "weekly">("overall");

  const overallQ = useQuery<any[]>({ queryKey: ["/api/leagues/leaderboard"] });
  const seasonQ = useQuery<any[]>({ queryKey: ["/api/leagues/season/leaderboard"] });

  const data = view === "overall" ? (overallQ.data ?? []) : (seasonQ.data ?? []);
  const loading = view === "overall" ? overallQ.isLoading : seasonQ.isLoading;

  const sorted = view === "weekly" ? [...data].sort((a, b) => b.weeklyLp - a.weeklyLp) : data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["overall","weekly","season"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold border transition-colors ${view === v ? "bg-zinc-700 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
          >
            {v === "overall" ? "🏆 Overall" : v === "weekly" ? "⚡ Weekly" : "🌟 Season"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-900" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No data yet. Start trading to earn LP!</p>
        </div>
      ) : sorted.map((row, i) => {
        const isMe = row.userId === myUserId;
        const league = getLeague(row.lp);
        const lp = view === "weekly" ? row.weeklyLp : view === "season" ? row.seasonLp : row.lp;
        const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
        return (
          <div key={row.userId} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${isMe ? "border-violet-700/60 bg-violet-950/20" : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700"}`}>
            <div className="w-7 text-center">
              {rankIcon ? <span className="text-xl">{rankIcon}</span> : <span className="text-sm font-bold text-zinc-500">#{i + 1}</span>}
            </div>
            <Avatar2 name={row.displayName} url={row.avatarUrl} size={9} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white truncate">{row.displayName}{isMe ? " (you)" : ""}</p>
                {row.equippedTitle && <span className="text-xs text-amber-400 truncate">· {row.equippedTitle}</span>}
              </div>
              <span style={{ color: league.color }} className="text-xs font-medium">{league.emoji} {league.name}</span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-white">{lp.toLocaleString()}</p>
              <p className="text-xs text-zinc-600">LP</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaguesPage() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const myDataQ = useQuery<{ stats: any; season: any }>({
    queryKey: ["/api/leagues/me"],
    enabled: !!isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <Trophy className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Trading Leagues</h2>
        <p className="text-zinc-500 mb-6">Log in to see your rank and compete with other traders</p>
        <Button onClick={() => window.location.href = "/login"}>Log In</Button>
      </div>
    );
  }

  const stats = myDataQ.data?.stats;
  const season = myDataQ.data?.season;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Trading Leagues</h1>
            <p className="text-xs text-zinc-500">Compete, climb, and prove your trading edge</p>
          </div>
        </div>
        {stats && (
          <div className="mt-3 flex items-center gap-2">
            <LeagueBadge lp={stats.lp} size="md" />
            <span className="text-sm font-bold text-white">{stats.lp.toLocaleString()} LP</span>
            <span className="text-xs text-zinc-600">· Weekly: +{stats.weeklyLp}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors flex-shrink-0 ${isActive ? "bg-zinc-700 border-zinc-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {myDataQ.isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900" />)}</div>
      ) : !stats ? (
        <div className="text-center py-10 text-zinc-600">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Could not load league data.</p>
        </div>
      ) : (
        <>
          {tab === "overview"    && <OverviewTab stats={stats} season={season} />}
          {tab === "rivals"      && <RivalsTab myStats={stats} />}
          {tab === "showdowns"   && <ShowdownsTab myStats={stats} myUserId={user!.id} />}
          {tab === "hedgefunds"  && <HedgeFundsTab myUserId={user!.id} />}
          {tab === "challenges"  && <ChallengesTab />}
          {tab === "leaderboard" && <LeaderboardTab myUserId={user!.id} />}
        </>
      )}
    </div>
  );
}
