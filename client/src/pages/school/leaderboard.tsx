import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import SchoolLayout from "@/layouts/school-layout";
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Flame } from "lucide-react";

const FRAME_CLASSES: Record<string, string> = {
  "frame-silver": "ring-2 ring-slate-400",
  "frame-blue": "ring-2 ring-blue-400 ring-offset-1 ring-offset-[#0d1a2e]",
  "frame-gold": "ring-2 ring-amber-400 ring-offset-1 ring-offset-[#0d1a2e]",
  "frame-fire": "ring-2 ring-orange-500 ring-offset-1 ring-offset-[#0d1a2e]",
  "frame-diamond": "ring-[3px] ring-cyan-400 ring-offset-2 ring-offset-[#0d1a2e]",
  "frame-rainbow": "ring-2 ring-purple-500 ring-offset-1 ring-offset-[#0d1a2e]",
};

const TITLE_LABELS: Record<string, string> = {
  "title-bull": "Bull 🐂",
  "title-bear": "Bear 🐻",
  "title-day-trader": "Day Trader",
  "title-diamond": "Diamond Hands 💎",
  "title-risk": "Risk Taker",
  "title-scholar": "The Scholar 📚",
  "title-maker": "Market Maker",
  "title-investor": "Top Investor ⭐",
  "title-professor": "The Professor 🎓",
};

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-slate-400 font-bold text-sm w-5 text-center">#{rank}</span>;
}

function getRankBg(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
  if (rank === 2) return "bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/30";
  if (rank === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-600/10 border-amber-600/30";
  return "bg-white/3 border-white/8 hover:bg-white/5";
}

export default function SchoolLeaderboard() {
  const { user } = useAuth();

  const { data: classData } = useQuery<any>({
    queryKey: ["/api/classroom"],
    enabled: user?.role === "student",
  });

  const classId = classData?.class?.id;

  const { data: classLeaderboard = [], isLoading: classLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard?scope=class"],
    refetchInterval: 30000,
  });

  const { data: globalLeaderboard = [], isLoading: globalLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 60000,
  });

  const ageGroup = classData?.class?.ageGroup ?? "high_school";
  const isPrimary = ageGroup === "primary";

  const cardBg = isPrimary
    ? "bg-amber-50 border-amber-200"
    : "bg-[#0d1a2e] border-[#1e3050]";
  const headingColor = isPrimary ? "text-amber-900" : "text-white";
  const subColor = isPrimary ? "text-amber-700" : "text-slate-400";

  const LeaderboardList = ({ data, loading, title, icon }: { data: any[]; loading: boolean; title: string; icon: React.ReactNode }) => (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className={`font-bold text-lg ${headingColor}`}>{title}</h2>
        <span className={`ml-auto text-xs font-medium ${subColor}`}>{data.length} traders</span>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className={`h-10 w-10 mx-auto mb-3 opacity-30 ${isPrimary ? "text-amber-600" : "text-teal-500"}`} />
          <p className={`text-sm ${subColor}`}>No traders yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 20).map((entry: any, i: number) => {
            const rank = i + 1;
            const isMe = entry.id === user?.id;
            return (
              <div
                key={entry.id}
                data-testid={`leaderboard-row-${entry.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getRankBg(rank)} ${isMe ? "ring-2 ring-teal-500/50" : ""}`}
              >
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(rank)}
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${isPrimary ? "bg-amber-400 text-white" : "bg-teal-600 text-white"} ${entry.equippedFrame ? FRAME_CLASSES[entry.equippedFrame] ?? "" : ""}`}>
                  {entry.displayName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`font-bold text-sm truncate ${headingColor}`}>
                      {entry.displayName}
                      {isMe && <span className="ml-1 text-xs text-teal-400">(You)</span>}
                    </p>
                    {entry.equippedTitle && TITLE_LABELS[entry.equippedTitle] && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        {TITLE_LABELS[entry.equippedTitle]}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${subColor}`}>
                    {entry.totalProfit >= 0 ? "+" : ""}${(entry.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} profit
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-black text-sm ${entry.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${(entry.simulatorBalance ?? 5000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center gap-0.5 justify-end mt-0.5">
                    <Star className="h-3 w-3 text-amber-400" />
                    <span className="text-xs text-amber-400">{entry.xp ?? 0} XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <SchoolLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPrimary ? "bg-amber-500" : "bg-teal-500"}`}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-black ${headingColor}`}>
                {isPrimary ? "⭐ Top Traders! ⭐" : "Leaderboard"}
              </h1>
              <p className={`text-sm ${subColor}`}>
                {isPrimary ? "See who has the most coins!" : "Class and global rankings"}
              </p>
            </div>
          </div>

          {user && (
            <div className={`mt-4 p-4 rounded-xl border ${isPrimary ? "bg-amber-100 border-amber-300" : "bg-teal-500/10 border-teal-500/20"}`}>
              <div className="flex items-center gap-3">
                <Flame className={`h-5 w-5 ${isPrimary ? "text-amber-600" : "text-teal-400"}`} />
                <div>
                  <p className={`font-bold text-sm ${headingColor}`}>Your Stats</p>
                  <p className={`text-xs ${subColor}`}>
                    Balance: ${(user as any).simulatorBalance?.toLocaleString() ?? "5,000"} •
                    Profit: {(user as any).totalProfit >= 0 ? "+" : ""}${(user as any).totalProfit?.toLocaleString() ?? "0"} •
                    XP: {(user as any).xp ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <LeaderboardList
            data={classLeaderboard}
            loading={classLoading}
            title={isPrimary ? "🏆 My Class" : "Class Rankings"}
            icon={<Users className={`h-5 w-5 ${isPrimary ? "text-amber-500" : "text-teal-400"}`} />}
          />
          <LeaderboardList
            data={globalLeaderboard}
            loading={globalLoading}
            title={isPrimary ? "🌍 All Schools" : "Global Rankings"}
            icon={<TrendingUp className={`h-5 w-5 ${isPrimary ? "text-amber-500" : "text-teal-400"}`} />}
          />
        </div>
      </div>
    </SchoolLayout>
  );
}
