import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  TrendingUp, TrendingDown,
  BookOpen, 
  Crown,
  GraduationCap,
  Zap,
  Target,
  User,
  Award,
  Star,
  DollarSign,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserPlus,
  UserCheck,
  UserMinus,
  MessageSquare,
  MoreVertical,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getLevelInfo } from "@/lib/levels";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { getFrameStyle } from "@/lib/shop-catalog";

interface PublicUser {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  membershipTier: string | null;
  lessonsCompleted: number | null;
  totalProfit: number | null;
  xp: number | null;
  lastSeenAt: string | null;
  presenceStatus: string | null;
  equippedFrame: string | null;
  equippedTitle: string | null;
  purchasedCosmetics: string;
}

interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  unlockedAt: string;
}

interface RecentTrade {
  id: string;
  symbol: string;
  type: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  profit: number | null;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  leverage: number | null;
}

const categoryIcons: Record<string, any> = {
  trading: TrendingUp,
  learning: BookOpen,
  balance: DollarSign,
  social: Users,
  milestone: Calendar,
};

const getCategoryIcon = (category: string) => categoryIcons[category] || Award;

function getPresenceInfo(lastSeenAt: string | null, presenceStatus?: string | null): {
  status: "online" | "idle" | "offline"; label: string;
} {
  if (!lastSeenAt) return { status: "offline", label: "Never active" };
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff > 3 * 60 * 1000) {
    return { status: "offline", label: `Active ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}` };
  }
  if (presenceStatus === "idle") return { status: "idle", label: "Idle" };
  return { status: "online", label: "Active now" };
}

function getOnlineStatus(lastSeenAt: string | null): { isOnline: boolean } {
  if (!lastSeenAt) return { isOnline: false };
  return { isOnline: Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000 };
}

function OnlineBadge({ lastSeenAt, presenceStatus }: { lastSeenAt: string | null; presenceStatus?: string | null }) {
  const { status, label } = getPresenceInfo(lastSeenAt, presenceStatus);
  const dotColor = status === "online"
    ? "bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.5)]"
    : status === "idle"
    ? "bg-yellow-400 shadow-[0_0_6px_2px_rgba(250,204,21,0.5)]"
    : "bg-muted-foreground/40";
  const textColor = status === "online" ? "text-green-500" : status === "idle" ? "text-yellow-400" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5 text-sm" data-testid="status-online">
      <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className={`font-medium ${textColor}`}>{label}</span>
    </div>
  );
}

function RecentTradesCard({ trades }: { trades: RecentTrade[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? trades : trades.slice(0, 4);

  if (trades.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No trades yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Trades
        </CardTitle>
        <CardDescription>Last {trades.length} trades</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {visible.map((trade) => {
            const isLong = trade.type === "long" || trade.type === "buy";
            const isOpen = trade.status === "open";
            const profitVal = trade.profit ?? 0;
            const profitPositive = profitVal >= 0;
            const TradeArrow = isLong ? ArrowUpRight : ArrowDownRight;
            return (
              <div
                key={trade.id}
                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors"
                data-testid={`trade-row-${trade.id}`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isLong ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <TradeArrow className={`h-5 w-5 ${isLong ? "text-green-500" : "text-red-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{trade.symbol}</span>
                    <Badge variant="outline" className={`text-xs py-0 px-1.5 ${isLong ? "border-green-500/40 text-green-600 dark:text-green-400" : "border-red-500/40 text-red-600 dark:text-red-400"}`}>
                      {trade.type.toUpperCase()}
                    </Badge>
                    {(trade.leverage ?? 1) > 1 && (
                      <Badge variant="secondary" className="text-xs py-0 px-1.5">{trade.leverage}x</Badge>
                    )}
                    <Badge
                      variant={isOpen ? "default" : "secondary"}
                      className={`text-xs py-0 px-1.5 ml-auto ${isOpen ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10" : ""}`}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Entry: <span className="text-foreground">${trade.entryPrice.toFixed(2)}</span>
                    </span>
                    {trade.exitPrice && (
                      <span className="text-xs text-muted-foreground">
                        Exit: <span className="text-foreground">${trade.exitPrice.toFixed(2)}</span>
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Qty: {trade.quantity}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {trade.profit !== null ? (
                    <p className={`text-sm font-bold ${profitPositive ? "text-green-500" : "text-red-500"}`}>
                      {profitPositive ? "+" : ""}${profitVal.toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  {trade.openedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(trade.openedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {trades.length > 4 && (
          <div className="px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1 text-muted-foreground"
              onClick={() => setShowAll(!showAll)}
              data-testid="button-toggle-trades"
            >
              {showAll ? (
                <><ChevronUp className="h-4 w-4" /> Show Less</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> View All {trades.length} Trades</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AchievementsCard({ achievements }: { achievements: UserAchievement[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? achievements : achievements.slice(0, 6);
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Achievements ({achievements.length})
        </CardTitle>
        <CardDescription>Unlocked achievements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((achievement) => {
            const CategoryIcon = getCategoryIcon(achievement.category);
            return (
              <div
                key={achievement.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                data-testid={`achievement-${achievement.id}`}
              >
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon className="h-5 w-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{achievement.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600">+{achievement.xpReward} XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {achievements.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 gap-1 text-muted-foreground"
            onClick={() => setShowAll(!showAll)}
            data-testid="button-toggle-achievements"
          >
            {showAll ? (
              <><ChevronUp className="h-4 w-4" /> Show Less</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> View All {achievements.length} Achievements</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicProfilePage() {
  const [, params] = useRoute("/users/:id");
  const userId = params?.id;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  const { data: profile, isLoading, error } = useQuery<PublicUser>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: achievements } = useQuery<UserAchievement[]>({
    queryKey: ["/api/users", userId, "achievements"],
    enabled: !!userId,
  });

  const { data: recentTrades } = useQuery<RecentTrade[]>({
    queryKey: ["/api/users", userId, "trades"],
    enabled: !!userId,
  });

  // Fetch current user's friends to determine friendship state
  const { data: myFriendsRaw = [] } = useQuery<{friendship: any; friend: {id: string}}[]>({
    queryKey: ["/api/friends"],
    enabled: !!currentUser && currentUser.id !== userId,
  });
  const existingFriendship = myFriendsRaw.find(f => f.friend.id === userId);
  const isFriend = !!existingFriendship;

  const friendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/friends/request", { friendId: userId });
    },
    onSuccess: () => {
      setFriendRequestSent(true);
      toast({ title: "Friend request sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    },
  });

  const unfriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest("DELETE", `/api/friends/${friendshipId}`);
    },
    onSuccess: () => {
      toast({ title: "Friend removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getMembershipIcon = (tier: string | null | undefined) => {
    switch (tier) {
      case "premium": return Crown;
      case "school": return GraduationCap;
      case "casual": return Zap;
      default: return Target;
    }
  };

  const getMembershipLabel = (tier: string | null | undefined) => {
    switch (tier) {
      case "premium": return "12Digits+";
      case "school": return "School Plan";
      case "casual": return "Casual";
      default: return "Free Trial";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <User className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">User Not Found</h2>
              <p className="text-muted-foreground">
                This user profile doesn't exist or is not available.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const MembershipIcon = getMembershipIcon(profile.membershipTier);
  const { isOnline } = getOnlineStatus(profile.lastSeenAt);

  const stats = [
    {
      label: "Total Profit/Loss",
      value: `${(profile.totalProfit ?? 0) >= 0 ? '+' : ''}$${(profile.totalProfit ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: (profile.totalProfit ?? 0) >= 0 ? "text-green-500" : "text-destructive"
    },
    {
      label: "Lessons Completed",
      value: profile.lessonsCompleted ?? 0,
      icon: BookOpen,
      color: "text-primary"
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24" style={getFrameStyle(profile.equippedFrame) as any}>
                <AvatarImage src={profile.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(profile.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center border-4 border-background text-xs font-bold text-primary-foreground">
                {getLevelInfo(profile.xp).level}
              </div>
              {isOnline && (
                <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background shadow-[0_0_8px_2px_rgba(34,197,94,0.5)]" />
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-2xl font-bold" data-testid="text-public-profile-name">
                  {profile.displayName}
                </h1>
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  {getLevelInfo(profile.xp).title}
                </Badge>
              </div>
              {profile.equippedTitle && (
                <div className="flex items-center justify-center mb-2">
                  <span className="text-sm font-semibold text-primary/80 bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5" data-testid="badge-equipped-title">
                    {profile.equippedTitle}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1" data-testid="badge-public-membership">
                  <MembershipIcon className="h-3 w-3" />
                  {getMembershipLabel(profile.membershipTier)}
                </Badge>
                <Badge variant="outline" className="capitalize" data-testid="badge-public-role">
                  {profile.role}
                </Badge>
              </div>
              <OnlineBadge lastSeenAt={profile.lastSeenAt} presenceStatus={profile.presenceStatus} />
              {/* Equipped cosmetics / stickers */}
              {(() => {
                const owned: string[] = (() => { try { return JSON.parse(profile.purchasedCosmetics || "[]"); } catch { return []; } })();
                const stickers = owned.filter(id => id.startsWith("sticker-"));
                const badges = owned.filter(id => id.startsWith("badge-"));
                const STICKER_MAP: Record<string, string> = {
                  "sticker-rocket": "🚀", "sticker-chart": "📈", "sticker-gem": "💎",
                  "sticker-fire": "🔥", "sticker-crown": "👑", "sticker-brain": "🧠",
                  "sticker-money": "💰", "sticker-star": "⭐", "sticker-dragon": "🐉", "sticker-unicorn": "🦄",
                };
                const BADGE_MAP: Record<string, string> = {
                  "badge-early": "🌱", "badge-active": "📊", "badge-streak-7": "🔥",
                  "badge-top-gamer": "🎮", "badge-scholar": "🎓", "badge-whale": "🐋",
                };
                if (stickers.length === 0 && badges.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2" data-testid="cosmetics-display">
                    {stickers.map(id => STICKER_MAP[id] && (
                      <span key={id} className="text-xl" title={id.replace("sticker-", "")}>{STICKER_MAP[id]}</span>
                    ))}
                    {badges.map(id => BADGE_MAP[id] && (
                      <span key={id} className="text-xl" title={id.replace("badge-", "")}>{BADGE_MAP[id]}</span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {profile.bio && (
              <p className="text-muted-foreground max-w-md" data-testid="text-public-bio">
                {profile.bio}
              </p>
            )}

            {currentUser && currentUser.id !== profile.id && (
              <div className="flex items-center gap-2" data-testid="profile-actions">
                {isFriend ? (
                  <>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => navigate(`/messages?dm=${profile.id}`)}
                      data-testid="button-message-friend"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="px-2" data-testid="button-friend-menu">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={unfriendMutation.isPending}
                          onClick={() => unfriendMutation.mutate(existingFriendship!.friendship.id)}
                          data-testid="button-unfriend"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfriend
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toast({ title: "Blocked", description: `${profile.displayName} has been blocked.` })}
                          data-testid="button-block"
                        >
                          Block
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button
                    variant={friendRequestSent ? "secondary" : "default"}
                    size="sm"
                    className="gap-2"
                    disabled={friendRequestSent || friendMutation.isPending}
                    onClick={() => friendMutation.mutate()}
                    data-testid="button-add-friend-profile"
                  >
                    {friendRequestSent ? (
                      <><UserCheck className="h-4 w-4" /> Request Sent</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Add Friend</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RecentTradesCard trades={recentTrades ?? []} />

      {achievements && achievements.length > 0 && (
        <AchievementsCard achievements={achievements} />
      )}
    </div>
  );
}
