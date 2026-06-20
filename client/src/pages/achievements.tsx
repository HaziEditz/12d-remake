import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { Trophy, Zap, Award, Lock, Star, Users, Target, Flame, TrendingUp, BookOpen, Wallet, Crown, Layers, Shield, CheckCircle2 } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: number;
  xpReward: number;
  unlocked?: boolean;
  unlockedAt?: string;
  progress?: number;
}

interface AchievementStat {
  achievementId: string;
  count: number;
  percentage: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; gradient: string; accent: string; textColor: string; borderColor: string }> = {
  trading:   { label: "Trading",    color: "#3b82f6", gradient: "from-blue-600/20 to-blue-500/5",     accent: "bg-blue-500",   textColor: "text-blue-400",   borderColor: "border-blue-500/40" },
  learning:  { label: "Learning",   color: "#10b981", gradient: "from-emerald-600/20 to-emerald-500/5", accent: "bg-emerald-500", textColor: "text-emerald-400", borderColor: "border-emerald-500/40" },
  balance:   { label: "Balance",    color: "#f59e0b", gradient: "from-amber-600/20 to-amber-500/5",    accent: "bg-amber-500",  textColor: "text-amber-400",  borderColor: "border-amber-500/40" },
  social:    { label: "Social",     color: "#a855f7", gradient: "from-purple-600/20 to-purple-500/5",  accent: "bg-purple-500", textColor: "text-purple-400", borderColor: "border-purple-500/40" },
  milestone: { label: "Milestones", color: "#f97316", gradient: "from-orange-600/20 to-orange-500/5", accent: "bg-orange-500", textColor: "text-orange-400", borderColor: "border-orange-500/40" },
};

function getDifficulty(xpReward: number): { label: string; stars: number; color: string; bg: string } {
  if (xpReward <= 25)  return { label: "Easy",      stars: 1, color: "text-emerald-400", bg: "bg-emerald-400/15 border-emerald-400/40" };
  if (xpReward <= 100) return { label: "Medium",    stars: 2, color: "text-amber-400",   bg: "bg-amber-400/15 border-amber-400/40" };
  if (xpReward <= 300) return { label: "Hard",      stars: 3, color: "text-red-400",     bg: "bg-red-400/15 border-red-400/40" };
                       return { label: "Legendary", stars: 4, color: "text-purple-400",  bg: "bg-purple-400/15 border-purple-400/40" };
}

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h % 1000) / 1000;
}

function getSimulatedRarity(achievement: Achievement, realPercentage?: number): number {
  if (realPercentage !== undefined && realPercentage > 0) return realPercentage;
  const diff = getDifficulty(achievement.xpReward);
  const base = diff.stars === 1 ? 55 : diff.stars === 2 ? 28 : diff.stars === 3 ? 8 : 1.5;
  const noise = (seededRandom(achievement.id) - 0.5) * (base * 0.4);
  return Math.max(0.1, Math.min(99, base + noise));
}

// Hexagonal badge SVG component
function BadgeHex({ color, unlocked, progress = 0, size = 80, children }: {
  color: string; unlocked: boolean; progress?: number; size?: number; children: React.ReactNode;
}) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const points = [0, 60, 120, 180, 240, 300]
    .map(a => { const rad = (a * Math.PI) / 180; return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`; })
    .join(" ");
  const innerR = r - 6;
  const innerPoints = [0, 60, 120, 180, 240, 300]
    .map(a => { const rad = (a * Math.PI) / 180; return `${cx + innerR * Math.cos(rad)},${cy + innerR * Math.sin(rad)}`; })
    .join(" ");

  // Progress arc on the outer ring
  const arcR = r - 2;
  const circumference = 2 * Math.PI * arcR;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: unlocked ? `drop-shadow(0 0 8px ${color}60)` : "grayscale(1) opacity(0.45)" }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={unlocked ? 0.9 : 0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={unlocked ? 0.5 : 0.15} />
        </linearGradient>
        <filter id="innerShadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Outer border hex */}
      <polygon points={points} fill={unlocked ? color : "#374151"} opacity={unlocked ? 0.25 : 0.4} />
      {/* Inner gradient hex */}
      <polygon points={innerPoints} fill={`url(#grad-${color.replace("#","")})`} />
      {/* Progress ring (only if in-progress) */}
      {!unlocked && progress > 0 && progress < 100 && (
        <circle cx={cx} cy={cy} r={arcR} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circumference} strokeDashoffset={progressOffset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} opacity={0.7} />
      )}
      {/* Shine overlay for unlocked */}
      {unlocked && (
        <polygon points={innerPoints} fill="white" opacity={0.08} />
      )}
      {/* Icon */}
      <foreignObject x={size * 0.22} y={size * 0.22} width={size * 0.56} height={size * 0.56}>
        <div className="flex items-center justify-center w-full h-full">
          {children}
        </div>
      </foreignObject>
      {/* Unlocked checkmark */}
      {unlocked && (
        <circle cx={size - 10} cy={size - 10} r={7} fill="#10b981" stroke="white" strokeWidth="1.5" />
      )}
      {unlocked && (
        <path d={`M ${size - 13.5} ${size - 10} L ${size - 11} ${size - 7.5} L ${size - 6.5} ${size - 13}`} stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp:    <TrendingUp className="w-full h-full" />,
  BookOpen:      <BookOpen className="w-full h-full" />,
  Award:         <Award className="w-full h-full" />,
  Trophy:        <Trophy className="w-full h-full" />,
  Crown:         <Crown className="w-full h-full" />,
  Zap:           <Zap className="w-full h-full" />,
  Star:          <Star className="w-full h-full" />,
  Wallet:        <Wallet className="w-full h-full" />,
  Target:        <Target className="w-full h-full" />,
  Flame:         <Flame className="w-full h-full" />,
  Shield:        <Shield className="w-full h-full" />,
  Layers:        <Layers className="w-full h-full" />,
  Users:         <Users className="w-full h-full" />,
  CheckCircle2:  <CheckCircle2 className="w-full h-full" />,
};

function getIconNode(iconName: string, color: string, size: number): React.ReactNode {
  const base = ICON_MAP[iconName] || ICON_MAP["Award"];
  const px = Math.round(size * 0.32);
  return (
    <div style={{ color, width: px, height: px, opacity: 1 }}>
      {base}
    </div>
  );
}

function BadgeTooltip({ achievement, rarity, onClose }: { achievement: Achievement; rarity: number; onClose: () => void }) {
  const cfg = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.milestone;
  const diff = getDifficulty(achievement.xpReward);
  const progress = achievement.progress ?? 0;

  return (
    <div
      className="absolute z-50 w-72 rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
      style={{ bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)" }}
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${cfg.gradient} border-b border-border/40`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider ${cfg.textColor}`}>{cfg.label}</span>
          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${diff.bg} ${diff.color}`}>
            {diff.label}
          </span>
        </div>
        <h3 className="font-bold text-sm text-foreground">{achievement.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Difficulty stars */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Difficulty</span>
          <div className="flex items-center gap-1">
            {[1,2,3,4].map(i => (
              <Star key={i} className={`h-3 w-3 ${i <= diff.stars ? diff.color : "text-muted-foreground/30"}`} fill={i <= diff.stars ? "currentColor" : "none"} />
            ))}
            <span className={`text-xs font-semibold ml-1 ${diff.color}`}>{diff.label}</span>
          </div>
        </div>

        {/* XP reward */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">XP Reward</span>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-400" fill="currentColor" />
            <span className="text-xs font-bold text-yellow-400">+{achievement.xpReward} XP</span>
          </div>
        </div>

        {/* Rarity */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Rarity</span>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              {rarity < 1 ? rarity.toFixed(1) : Math.round(rarity)}% of users
            </span>
          </div>
        </div>

        {/* Progress */}
        {!achievement.unlocked && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-bold" style={{ color: cfg.color }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${cfg.color}99, ${cfg.color})` }}
              />
            </div>
          </div>
        )}

        {/* How to unlock */}
        {!achievement.unlocked && (
          <div className={`flex items-start gap-2 p-2.5 rounded-xl border ${cfg.borderColor} bg-muted/30`}>
            <Target className={`h-3.5 w-3.5 ${cfg.textColor} shrink-0 mt-0.5`} />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">How to unlock: </span>
              {achievement.description}
              {achievement.requirement > 1 && ` (${achievement.requirement} required)`}
            </p>
          </div>
        )}

        {/* Unlocked date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-400 font-medium">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        )}
      </div>
      {/* Pointer arrow */}
      <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-2 overflow-hidden">
        <div className="w-3 h-3 bg-card border border-border/60 rotate-45 translate-x-0.5 translate-y-[-6px]" />
      </div>
    </div>
  );
}

function BadgeItem({ achievement, rarity }: { achievement: Achievement; rarity: number }) {
  const [hovered, setHovered] = useState(false);
  const cfg = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.milestone;
  const diff = getDifficulty(achievement.xpReward);
  const progress = achievement.progress ?? 0;
  const BADGE_SIZE = 72;

  return (
    <div
      className="relative flex flex-col items-center gap-2 cursor-pointer group select-none"
      style={{ minWidth: 88 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`badge-achievement-${achievement.id}`}
    >
      {/* Tooltip */}
      {hovered && <BadgeTooltip achievement={achievement} rarity={rarity} onClose={() => setHovered(false)} />}

      {/* Legendary shimmer wrapper */}
      <div
        className={`relative transition-all duration-200 ${achievement.unlocked ? "scale-100 group-hover:scale-110" : "group-hover:scale-105"}`}
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
      >
        {diff.label === "Legendary" && achievement.unlocked && (
          <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `radial-gradient(circle, ${cfg.color}40 0%, transparent 70%)` }} />
        )}
        <BadgeHex color={cfg.color} unlocked={!!achievement.unlocked} progress={progress} size={BADGE_SIZE}>
          {getIconNode(achievement.icon, achievement.unlocked ? cfg.color : "#6b7280", BADGE_SIZE)}
        </BadgeHex>
      </div>

      {/* Badge name */}
      <p className={`text-[10px] font-semibold text-center leading-tight max-w-[80px] ${achievement.unlocked ? "text-foreground" : "text-muted-foreground/50"}`}>
        {achievement.name}
      </p>

      {/* Difficulty dots */}
      <div className="flex gap-0.5">
        {[1,2,3,4].map(i => (
          <div key={i} className={`w-1 h-1 rounded-full ${i <= diff.stars ? (achievement.unlocked ? diff.color.replace("text-","bg-") : "bg-muted-foreground/30") : "bg-muted-foreground/15"}`} />
        ))}
      </div>
    </div>
  );
}

function CategorySash({ category, achievements, stats }: { category: string; achievements: Achievement[]; stats: AchievementStat[] }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.milestone;
  const scrollRef = useRef<HTMLDivElement>(null);
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;

  const getRarity = (id: string) => {
    const stat = stats.find(s => s.achievementId === id);
    const achievement = achievements.find(a => a.id === id)!;
    return getSimulatedRarity(achievement, stat?.percentage);
  };

  // Sort: unlocked first, then by progress desc, then by xpReward
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    if (!a.unlocked && !b.unlocked) return (b.progress ?? 0) - (a.progress ?? 0);
    return 0;
  });

  return (
    <div className="mb-8">
      {/* Sash band header */}
      <div className={`relative flex items-center gap-4 px-5 py-3 rounded-t-2xl bg-gradient-to-r ${cfg.gradient} border border-b-0 ${cfg.borderColor}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full" style={{ background: cfg.color }} />
          <div>
            <h2 className={`font-bold text-sm ${cfg.textColor}`}>{cfg.label}</h2>
            <p className="text-[11px] text-muted-foreground">{unlocked}/{total} earned</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="h-1.5 w-32 rounded-full bg-black/20 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${total > 0 ? (unlocked / total) * 100 : 0}%`, background: cfg.color }} />
          </div>
          <span className="text-xs font-bold" style={{ color: cfg.color }}>{total > 0 ? Math.round((unlocked / total) * 100) : 0}%</span>
        </div>
        {/* Decorative diagonal lines (sash texture) */}
        <div className="absolute inset-0 rounded-t-2xl overflow-hidden pointer-events-none opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute h-[200%] w-px -rotate-[30deg]" style={{ background: cfg.color, left: `${i * 5}%`, top: "-50%" }} />
          ))}
        </div>
      </div>

      {/* Badge scroll area */}
      <div
        ref={scrollRef}
        className={`flex items-start gap-4 px-5 py-5 overflow-x-auto border border-t-0 ${cfg.borderColor} rounded-b-2xl bg-card/50 scrollbar-hide`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sorted.map(achievement => (
          <BadgeItem key={achievement.id} achievement={achievement} rarity={getRarity(achievement.id)} />
        ))}
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const { user } = useAuth();

  const { data: achievements, isLoading } = useQuery<Achievement[]>({
    queryKey: user ? ["/api/user/achievements"] : ["/api/achievements"],
  });

  const { data: stats = [] } = useQuery<AchievementStat[]>({
    queryKey: ["/api/achievements/stats"],
  });

  const grouped = achievements?.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, Achievement[]>) ?? {};

  const totalAchievements = achievements?.length ?? 0;
  const unlockedCount = achievements?.filter(a => a.unlocked).length ?? 0;
  const totalXP = achievements?.filter(a => a.unlocked).reduce((sum, a) => sum + a.xpReward, 0) ?? 0;
  const completionPct = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

  const categoryOrder = ["trading", "learning", "balance", "social", "milestone"];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-28 w-full mb-6 rounded-2xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-44 w-full mb-5 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight mb-1" data-testid="text-achievements-title">
          Achievement Sash
        </h1>
        <p className="text-muted-foreground text-sm">
          Earn badges by trading, learning, and hitting milestones. Every badge tells your story.
        </p>
      </div>

      {/* Stats banner */}
      {user && (
        <div className="relative mb-8 rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-card to-muted/30">
          <div className="absolute inset-0 opacity-5">
            {[...Array(30)].map((_, i) => (
              <div key={i} className="absolute h-[300%] w-px -rotate-[20deg] bg-foreground" style={{ left: `${i * 3.5}%`, top: "-100%" }} />
            ))}
          </div>
          <div className="relative grid grid-cols-4 divide-x divide-border/50">
            <div className="p-5 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-400" fill="currentColor" />
              <p className="text-2xl font-black" data-testid="text-unlocked-count">{unlockedCount}</p>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
            <div className="p-5 text-center">
              <div className="text-muted-foreground text-sm mx-auto mb-2 font-bold">{totalAchievements}</div>
              <p className="text-2xl font-black">{completionPct}%</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
            <div className="p-5 text-center">
              <Zap className="h-6 w-6 mx-auto mb-2 text-blue-400" fill="currentColor" />
              <p className="text-2xl font-black" data-testid="text-total-xp">{totalXP.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
            <div className="p-5 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-purple-400" fill="currentColor" />
              <p className="text-2xl font-black">
                {achievements?.filter(a => a.unlocked && getDifficulty(a.xpReward).label === "Legendary").length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Legendary</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">Overall Progress</span>
              <span className="text-xs font-bold text-foreground">{unlockedCount} / {totalAchievements}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${completionPct}%`, background: "linear-gradient(90deg, #3b82f6, #a855f7, #f59e0b)" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Difficulty legend */}
      <div className="flex flex-wrap items-center gap-3 mb-6 text-xs">
        <span className="text-muted-foreground font-medium">Difficulty:</span>
        {[
          { label: "Easy",      stars: 1, color: "text-emerald-400", bg: "bg-emerald-400/15 border-emerald-400/40" },
          { label: "Medium",    stars: 2, color: "text-amber-400",   bg: "bg-amber-400/15 border-amber-400/40" },
          { label: "Hard",      stars: 3, color: "text-red-400",     bg: "bg-red-400/15 border-red-400/40" },
          { label: "Legendary", stars: 4, color: "text-purple-400",  bg: "bg-purple-400/15 border-purple-400/40" },
        ].map(d => (
          <div key={d.label} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${d.bg}`}>
            <div className="flex gap-0.5">
              {[1,2,3,4].map(i => (
                <Star key={i} className={`h-2.5 w-2.5 ${i <= d.stars ? d.color : "text-muted-foreground/20"}`} fill={i <= d.stars ? "currentColor" : "none"} />
              ))}
            </div>
            <span className={`font-semibold ${d.color}`}>{d.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-2">|</span>
        <span className="text-muted-foreground text-xs flex items-center gap-1">
          <Users className="h-3 w-3" /> Rarity shown on hover
        </span>
      </div>

      {/* Category sashes */}
      {categoryOrder
        .filter(cat => grouped[cat]?.length > 0)
        .map(category => (
          <CategorySash
            key={category}
            category={category}
            achievements={grouped[category]}
            stats={stats}
          />
        ))}

      {/* Any extra categories not in the order */}
      {Object.entries(grouped)
        .filter(([cat]) => !categoryOrder.includes(cat))
        .map(([category, catAchievements]) => (
          <CategorySash key={category} category={category} achievements={catAchievements} stats={stats} />
        ))}

      {!achievements?.length && (
        <div className="text-center py-20">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-bold mb-2">No achievements yet</h3>
          <p className="text-muted-foreground">Start trading and learning to earn your first badge.</p>
        </div>
      )}
    </div>
  );
}
