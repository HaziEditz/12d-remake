import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getLevelInfo } from "@/lib/levels";
import SchoolLayout from "@/layouts/school-layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Coins, Star, Zap, Gamepad2,
  BookOpen, Trophy, CheckCircle2, Clock, ChevronRight,
  Flame, Target, Award, BarChart3, Users, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

export default function StudentDashboard() {
  const { user } = useAuth();
  const levelInfo = getLevelInfo(user?.xp ?? 0);
  const tokens = (user as any)?.classroomTokens ?? 0;

  const { data: classData, isLoading: classLoading } = useQuery<any>({ queryKey: ["/api/classroom"] });
  const { data: assignments = [] } = useQuery<any[]>({ queryKey: ["/api/classroom/assignments"] });
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/classroom/events"] });
  const { data: achievements = [] } = useQuery<any[]>({ queryKey: ["/api/achievements"] });
  const { data: positions = [] } = useQuery<any[]>({ queryKey: ["/api/trades?open=true"] });
  const { data: leaderboard = [] } = useQuery<any[]>({ queryKey: ["/api/leaderboard?scope=class"] });

  const ageGroup = classData?.class?.ageGroup ?? "high_school";

  if (classLoading) {
    return (
      <SchoolLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-3 sw-spin-slow inline-block">⏳</div>
            <p className="text-slate-400 font-semibold">Loading your classroom...</p>
          </div>
        </div>
      </SchoolLayout>
    );
  }

  if (ageGroup === "primary") return <PrimaryDashboard user={user} levelInfo={levelInfo} tokens={tokens} classData={classData} assignments={assignments} achievements={achievements} />;
  if (ageGroup === "intermediate") return <IntermediateDashboard user={user} levelInfo={levelInfo} tokens={tokens} classData={classData} assignments={assignments} achievements={achievements} leaderboard={leaderboard} />;
  return <HighSchoolDashboard user={user} levelInfo={levelInfo} tokens={tokens} classData={classData} assignments={assignments} events={events} positions={positions} leaderboard={leaderboard} />;
}

/* ===== PRIMARY DASHBOARD (Ages 6-10) ===== */
function PrimaryDashboard({ user, levelInfo, tokens, classData, assignments, achievements }: any) {
  const balance = parseFloat(user?.simulatorBalance ?? "10000");
  const [shaking, setShaking] = useState(false);

  const handleTokenShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  return (
    <SchoolLayout>
      <div className="p-5 max-w-4xl mx-auto space-y-5">
        {/* XP Banner */}
        <div className="rounded-3xl overflow-hidden bg-gradient-to-r from-pink-400 to-purple-500 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/80 text-sm font-semibold">Level {levelInfo.level} ⭐</p>
              <h2 className="text-2xl font-black text-white">{levelInfo.title}</h2>
            </div>
            <div className="text-5xl sw-float">🌟</div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/80 font-semibold">
              <span>{user?.xp ?? 0} XP</span>
              <span>{levelInfo.xpToNext} to next level</span>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-yellow-300 to-white"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Piggy Bank */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg relative overflow-hidden">
            <div className="absolute top-3 right-4 text-4xl sw-float-delay">🐷</div>
            <p className="text-green-100 text-sm font-bold mb-1">My Piggy Bank</p>
            <div className="text-3xl font-black text-white">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {getCoinCount(balance).map((c, i) => (
                <span key={i} className="text-2xl sw-bounce-in" style={{ animationDelay: `${i * 0.1}s` }}>🪙</span>
              ))}
            </div>
          </div>

          {/* Token Jar */}
          <div
            className={`rounded-3xl p-6 bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg cursor-pointer relative overflow-hidden transition-transform ${shaking ? "animate-bounce" : ""}`}
            onClick={handleTokenShake}
            data-testid="card-token-jar"
          >
            <div className="absolute top-3 right-4 text-4xl sw-float">🫙</div>
            <p className="text-amber-100 text-sm font-bold mb-1">Token Jar</p>
            <div className="text-3xl font-black text-white">{tokens} Tokens</div>
            <p className="text-amber-100 text-xs mt-2 font-semibold">Tap to shake! 🎉</p>
            <div className="flex gap-1 mt-2">
              {Array.from({ length: Math.min(tokens, 8) }).map((_, i) => (
                <span key={i} className="text-xl">🪙</span>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Adventure */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg relative overflow-hidden">
          <div className="absolute top-3 right-4 text-4xl sw-float-slow">📖</div>
          <p className="text-blue-100 text-sm font-bold mb-1">Today's Adventure</p>
          {assignments.length > 0 ? (
            <div>
              <h3 className="text-xl font-black text-white">{assignments[0].title}</h3>
              <p className="text-blue-100 text-sm mt-1 mb-3">{assignments[0].description ?? "Complete your challenge!"}</p>
              <Link href="/lessons">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl px-6 text-base">
                  Start Learning! 🚀
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-black text-white">Keep Learning!</h3>
              <p className="text-blue-100 text-sm mt-1 mb-3">Explore new lessons and earn XP</p>
              <Link href="/lessons">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl px-6 text-base">
                  Go to Lessons! 📚
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Sticker Collection */}
          <div className="rounded-3xl p-5 bg-white border-2 border-amber-200 shadow-lg">
            <p className="text-amber-700 font-black text-base mb-3">⭐ My Sticker Collection</p>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {achievements.slice(0, 8).map((a: any, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-1 sw-bounce-in" style={{ animationDelay: `${i * 0.1}s` }} data-testid={`sticker-achievement-${i}`}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md" style={{ background: getAchievementColor(i) }}>
                      {getAchievementEmoji(a.type)}
                    </div>
                    <p className="text-xs text-center text-amber-700 font-semibold leading-tight truncate w-full">{a.title}</p>
                  </div>
                ))}
                {achievements.length === 0 && (
                  <p className="col-span-4 text-center text-amber-400 text-sm py-4">Complete lessons to earn stickers!</p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🌟</div>
                <p className="text-amber-600 text-sm font-semibold">Complete lessons to earn stickers!</p>
              </div>
            )}
          </div>

          {/* Fun Zone Button */}
          <Link href="/school/fun-zone">
            <div className="rounded-3xl p-6 bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg cursor-pointer hover:scale-105 transition-transform h-full flex flex-col items-center justify-center text-center relative overflow-hidden" data-testid="card-fun-zone-button">
              <div className="text-6xl mb-3 sw-bounce-in">🎮</div>
              <h3 className="text-2xl font-black text-white">Fun Games!</h3>
              <p className="text-purple-100 mt-1 font-semibold">Play and earn tokens</p>
              <div className="absolute top-2 right-3 text-2xl sw-float opacity-50">✨</div>
              <div className="absolute bottom-2 left-3 text-2xl sw-float-delay opacity-50">🌟</div>
            </div>
          </Link>
        </div>
      </div>
    </SchoolLayout>
  );
}

/* ===== INTERMEDIATE DASHBOARD (Ages 11-13) ===== */
function IntermediateDashboard({ user, levelInfo, tokens, classData, assignments, achievements, leaderboard }: any) {
  const balance = parseFloat(user?.simulatorBalance ?? "10000");
  const startBalance = 10000;
  const profitPct = ((balance - startBalance) / startBalance * 100).toFixed(1);
  const isProfit = balance >= startBalance;
  const myRank = leaderboard?.findIndex((u: any) => u.id === user?.id) + 1 || "—";

  const donutData = [
    { name: "Balance", value: balance, fill: "#14b8a6" },
    { name: "Start", value: Math.max(0, startBalance - balance), fill: "#1e293b" },
  ];

  return (
    <SchoolLayout>
      <div className="p-5 max-w-5xl mx-auto space-y-5">
        {/* Level + Tokens Banner */}
        <div className="rounded-2xl p-5 bg-gradient-to-r from-violet-600 to-purple-700 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black text-white">
                {levelInfo.level}
              </div>
              <div>
                <p className="text-purple-200 text-xs font-semibold">Current Level</p>
                <p className="text-white font-black text-lg">{levelInfo.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={levelInfo.progress} className="w-32 h-2" />
                  <span className="text-purple-200 text-xs">{levelInfo.xpToNext} XP to go</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2.5 sw-token-glow">
              <Coins className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-2xl font-black text-amber-300">{tokens}</p>
                <p className="text-amber-400 text-xs">Tokens</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Portfolio */}
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10 col-span-1">
            <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> My Portfolio</p>
            <p className="text-2xl font-black text-white">${balance.toLocaleString()}</p>
            <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isProfit ? "+" : ""}{profitPct}% from start
            </div>
            <Link href="/simulator">
              <Button size="sm" className="mt-3 w-full bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-xl">
                Open Simulator
              </Button>
            </Link>
          </div>

          {/* Class Rank */}
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10 col-span-1">
            <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> Class Rank</p>
            <p className="text-4xl font-black text-amber-400">#{myRank}</p>
            <p className="text-slate-500 text-xs mt-1">in {classData?.class?.name ?? "your class"}</p>
            <div className="mt-3 flex gap-1">
              {leaderboard.slice(0, 5).map((u: any, i: number) => (
                <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${u.id === user?.id ? "bg-amber-500 text-white" : "bg-white/10 text-slate-400"}`}>
                  {u.displayName?.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* XP / Streak */}
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10 col-span-1">
            <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-400" /> XP Points</p>
            <p className="text-4xl font-black text-orange-400">{user?.xp ?? 0}</p>
            <p className="text-slate-500 text-xs mt-1">experience points earned</p>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-700" style={{ width: `${levelInfo.progress}%` }} />
            </div>
          </div>
        </div>

        {/* Active Challenges */}
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-teal-400" /> Active Challenges
          </h3>
          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.map((a: any) => {
                const progress = Math.min(100, (a.currentValue ?? 0) / (a.targetValue ?? 1) * 100);
                return (
                  <div key={a.id} className="rounded-xl p-4 bg-white/5 border border-white/5" data-testid={`challenge-${a.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-sm text-white">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.description ?? assignmentTypeLabel(a.type)}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${a.completed ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {a.completed ? "Done ✓" : "In Progress"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1 h-2.5" />
                      <span className="text-xs text-slate-400 font-mono shrink-0">{Math.round(progress)}%</span>
                    </div>
                    {a.dueDate && (
                      <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Due {new Date(a.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active challenges right now</p>
            </div>
          )}
        </div>

        {/* Badge Wall */}
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" /> Badge Wall
          </h3>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {achievements.map((a: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1.5 sw-bounce-in" style={{ animationDelay: `${i * 0.05}s` }} data-testid={`badge-${i}`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg" style={{ background: getBadgeGradient(i) }}>
                    {getAchievementEmoji(a.type)}
                  </div>
                  <p className="text-xs text-center text-slate-400 leading-tight truncate w-full">{a.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Complete lessons and challenges to earn badges!</p>
            </div>
          )}
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/school/fun-zone">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-600 to-pink-600 cursor-pointer hover:scale-105 transition-transform text-center shadow-lg" data-testid="button-fun-zone">
              <Gamepad2 className="h-6 w-6 text-white mx-auto mb-1" />
              <p className="font-black text-white text-sm">Fun Zone 🎮</p>
            </div>
          </Link>
          <Link href="/lessons">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-600 to-indigo-600 cursor-pointer hover:scale-105 transition-transform text-center shadow-lg" data-testid="button-lessons">
              <BookOpen className="h-6 w-6 text-white mx-auto mb-1" />
              <p className="font-black text-white text-sm">Lessons 📚</p>
            </div>
          </Link>
        </div>
      </div>
    </SchoolLayout>
  );
}

/* ===== HIGH SCHOOL DASHBOARD (Ages 14-18) ===== */
function HighSchoolDashboard({ user, levelInfo, tokens, classData, assignments, events, positions, leaderboard }: any) {
  const balance = parseFloat(user?.simulatorBalance ?? "10000");
  const startBalance = 10000;
  const profit = balance - startBalance;
  const profitPct = ((profit / startBalance) * 100).toFixed(2);
  const isProfit = profit >= 0;
  const myRank = leaderboard?.findIndex((u: any) => u.id === user?.id) + 1 || "—";

  const chartData = generateMiniChart(balance);

  return (
    <SchoolLayout>
      <div className="p-5 max-w-6xl mx-auto space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Portfolio Value", value: `$${balance.toLocaleString()}`, sub: `${isProfit ? "+" : ""}${profitPct}% vs start`, color: isProfit ? "text-emerald-400" : "text-rose-400", icon: TrendingUp },
            { label: "Classroom Tokens", value: tokens, sub: "Earned in class", color: "text-amber-400", icon: Coins },
            { label: "XP Points", value: user?.xp ?? 0, sub: `Level ${levelInfo.level} • ${levelInfo.title}`, color: "text-purple-400", icon: Zap },
            { label: "Class Rank", value: `#${myRank}`, sub: classData?.class?.name ?? "Your class", color: "text-teal-400", icon: Trophy },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 bg-white/5 border border-white/10" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-slate-500 text-xs">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-600 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Portfolio Chart */}
          <div className="rounded-xl p-5 bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-400" /> Portfolio Performance
              </h3>
              <Link href="/simulator">
                <Button size="sm" variant="outline" className="text-xs h-7 border-white/20 text-slate-300 hover:bg-white/5">
                  Open Simulator <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} width={55} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, "Balance"]} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="balance" stroke={isProfit ? "#10b981" : "#ef4444"} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Open Positions */}
          <div className="rounded-xl p-5 bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-400" /> Open Positions
              </h3>
              <Link href="/simulator">
                <Button size="sm" variant="outline" className="text-xs h-7 border-white/20 text-slate-300 hover:bg-white/5">View All</Button>
              </Link>
            </div>
            {positions.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto scrollbar-hide">
                {positions.slice(0, 6).map((p: any) => {
                  const storedPrice = parseFloat(localStorage.getItem(`price_${p.symbol}`) || "0");
                  const currentPrice = storedPrice > 0 ? storedPrice : p.entryPrice;
                  const pl = (currentPrice - p.entryPrice) * p.quantity * (p.type === "sell" ? -1 : 1);
                  const plPct = p.entryPrice > 0 ? ((pl / (p.entryPrice * p.quantity)) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0" data-testid={`position-${p.symbol}`}>
                      <div>
                        <p className="font-bold text-white text-sm">{p.symbol}</p>
                        <p className="text-xs text-slate-500">{p.quantity} {p.type === "buy" ? "long" : "short"} @ ${Number(p.entryPrice).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                        </p>
                        <p className={`text-xs ${pl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{pl >= 0 ? "+" : ""}{plPct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No open positions</p>
                <Link href="/simulator"><Button size="sm" className="mt-2 bg-teal-600 hover:bg-teal-500 text-white">Start Trading</Button></Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Assignments */}
          <div className="rounded-xl p-5 bg-white/5 border border-white/10">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" /> Assignments
            </h3>
            {assignments.length > 0 ? (
              <div className="space-y-2.5">
                {assignments.map((a: any) => {
                  const progress = Math.min(100, (a.currentValue ?? 0) / (a.targetValue ?? 1) * 100);
                  return (
                    <div key={a.id} className="rounded-lg p-3 bg-white/5" data-testid={`assignment-${a.id}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-sm text-white">{a.title}</p>
                        <Badge className={`text-xs ${a.completed ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                          {a.completed ? <CheckCircle2 className="h-3 w-3" /> : assignmentTypeLabel(a.type)}
                        </Badge>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-600">{Math.round(progress)}% complete</span>
                        {a.dueDate && <span className="text-xs text-slate-600 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{new Date(a.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No assignments pending</p>
              </div>
            )}
          </div>

          {/* Class Leaderboard + Market Events */}
          <div className="space-y-4">
            <div className="rounded-xl p-5 bg-white/5 border border-white/10">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" /> Class Leaderboard
              </h3>
              {leaderboard.length > 0 ? (
                <div className="space-y-1.5">
                  {leaderboard.slice(0, 5).map((u: any, i: number) => (
                    <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${u.id === user?.id ? "bg-teal-500/10 border border-teal-500/20" : "bg-white/3"}`} data-testid={`leaderboard-row-${i}`}>
                      <span className={`text-sm font-black w-5 ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-700" : "text-slate-600"}`}>#{i+1}</span>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-black text-white">
                        {u.displayName?.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm flex-1 truncate font-semibold ${u.id === user?.id ? "text-teal-300" : "text-slate-300"}`}>{u.displayName}</span>
                      <span className={`text-xs font-bold ${parseFloat(u.totalProfit ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {parseFloat(u.totalProfit ?? 0) >= 0 ? "+" : ""}${parseFloat(u.totalProfit ?? 0).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-3">Leaderboard loading...</p>
              )}
            </div>

            {/* Live Market Events */}
            {events.length > 0 && (
              <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-400" /> Live Events
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                  {events.map((e: any) => (
                    <div key={e.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${getEventBg(e.type)}`} data-testid={`event-${e.id}`}>
                      <span className="text-lg shrink-0">{getEventEmoji(e.type)}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{e.title}</p>
                        {e.description && <p className="text-xs text-slate-400 mt-0.5">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}

/* ===== HELPERS ===== */
function getCoinCount(balance: number): number[] {
  const count = Math.min(Math.floor(balance / 2000), 5);
  return Array.from({ length: Math.max(1, count) });
}

function getAchievementEmoji(type: string) {
  const map: Record<string, string> = {
    first_trade: "🎯", profit_maker: "💰", lesson_complete: "📚", streak: "🔥",
    leaderboard: "🏆", quiz_ace: "🧠", big_win: "🌟", diversified: "🌈",
  };
  return map[type] ?? "⭐";
}

function getAchievementColor(i: number) {
  const colors = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#ef4444"];
  return colors[i % colors.length];
}

function getBadgeGradient(i: number) {
  const grads = [
    "linear-gradient(135deg,#f59e0b,#d97706)",
    "linear-gradient(135deg,#10b981,#059669)",
    "linear-gradient(135deg,#6366f1,#4f46e5)",
    "linear-gradient(135deg,#ec4899,#be185d)",
    "linear-gradient(135deg,#14b8a6,#0d9488)",
    "linear-gradient(135deg,#f97316,#ea580c)",
    "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    "linear-gradient(135deg,#ef4444,#dc2626)",
  ];
  return grads[i % grads.length];
}

function assignmentTypeLabel(type: string) {
  const map: Record<string, string> = { profit_target: "Profit", lesson_completion: "Lesson", portfolio_balance: "Balance" };
  return map[type] ?? type;
}

function getEventEmoji(type: string) {
  const map: Record<string, string> = { boom: "🚀", crash: "📉", news: "📰", tip: "💡" };
  return map[type] ?? "📢";
}

function getEventBg(type: string) {
  const map: Record<string, string> = { boom: "bg-emerald-500/10 border border-emerald-500/20", crash: "bg-rose-500/10 border border-rose-500/20", news: "bg-blue-500/10 border border-blue-500/20", tip: "bg-amber-500/10 border border-amber-500/20" };
  return map[type] ?? "bg-white/5";
}

function generateMiniChart(currentBalance: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Today"];
  let val = 10000;
  return days.map((day, i) => {
    if (i === days.length - 1) val = currentBalance;
    else val += (Math.random() - 0.48) * 300;
    return { day, balance: Math.round(val) };
  });
}
