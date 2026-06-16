import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, TrendingUp, Crown, Sparkles, ShieldCheck, Globe, Users, UserPlus, UserCheck, Coins } from "lucide-react";
import type { User } from "@shared/schema";
import { getLevelInfo } from "@/lib/levels";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getMembershipBadge(tier: string | null | undefined, status: string | null | undefined) {
  if (status !== "active" || !tier) return null;
  
  if (tier === "premium") {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs">
        <Crown className="w-3 h-3 mr-1" />
        12Digits+
      </Badge>
    );
  }
  if (tier === "casual") {
    return (
      <Badge variant="secondary" className="text-xs">
        Casual
      </Badge>
    );
  }
  if (tier === "school") {
    return (
      <Badge variant="outline" className="text-xs">
        School
      </Badge>
    );
  }
  return null;
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<string>("global");
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isTokensTab = scope === "tokens";

  const { data: leaderboard, isLoading } = useQuery<User[]>({
    queryKey: [`/api/leaderboard?scope=${scope}`],
    enabled: !isTokensTab,
  });

  const { data: tokenLeaderboard = [], isLoading: tokenLoading } = useQuery<any[]>({
    queryKey: ["/api/fun-zone/token-leaderboard"],
    enabled: isTokensTab,
  });

  const friendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await apiRequest("POST", "/api/friends/request", { friendId });
      return res.json();
    },
    onSuccess: (_, friendId) => {
      setSentRequests(prev => new Set([...prev, friendId]));
      toast({ title: "Friend request sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/10 to-gray-400/5 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/10 to-amber-600/5 border-amber-600/30";
      default:
        return "";
    }
  };

  if (isLoading && !isTokensTab) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground">Top traders ranked by total profit</p>
          </div>
        </div>

        <Tabs value={scope} onValueChange={setScope} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-4 md:w-[380px]">
            <TabsTrigger value="global" className="flex items-center gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" />
              Global
            </TabsTrigger>
            <TabsTrigger value="class" className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Local
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center gap-1.5 text-xs" data-testid="tab-token-leaderboard">
              <Coins className="h-3.5 w-3.5" />
              Tokens
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Token Leaderboard */}
      {isTokensTab && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Token Leaderboard
            </CardTitle>
            <CardDescription>Students ranked by classroom tokens earned</CardDescription>
          </CardHeader>
          <CardContent>
            {tokenLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : tokenLeaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No token data yet</h3>
                <p className="text-muted-foreground">Students earn tokens by playing games in the Fun Zone!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokenLeaderboard.map((entry: any, index: number) => {
                  const rank = index + 1;
                  const isMe = currentUser?.id === entry.id;
                  return (
                    <div key={entry.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getRankStyle(rank)} ${isMe ? "ring-1 ring-primary/50" : ""}`} data-testid={`row-token-leaderboard-${rank}`}>
                      <div className="w-10 flex items-center justify-center shrink-0">
                        {getRankIcon(rank) || <span className="text-lg font-bold text-muted-foreground">#{rank}</span>}
                      </div>
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={entry.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(entry.displayName ?? "?")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{entry.displayName}</p>
                          {isMe && <Badge className="text-xs">You</Badge>}
                        </div>
                        {entry.equippedTitle && <p className="text-xs text-muted-foreground">{entry.equippedTitle}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span className="text-lg font-bold text-amber-500">{(entry.classroomTokens ?? 0).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">tokens</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Standard Leaderboard */}
      {!isTokensTab && (
        <>
          {leaderboard && leaderboard.length > 0 && (
            <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-4 border-yellow-500">
                        <AvatarImage src={(leaderboard[0] as any)?.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {getInitials(leaderboard[0]?.displayName ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <Badge className="mb-1">Top Trader</Badge>
                      <h2 className="text-2xl font-bold">{leaderboard[0]?.displayName}</h2>
                      <p className="text-muted-foreground">Leading the charts</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-success">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-3xl font-bold">
                        +${(leaderboard[0]?.totalProfit ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rankings</CardTitle>
              <CardDescription>{leaderboard?.length ?? 0} traders on the leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              {(!leaderboard || leaderboard.length === 0) ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {scope === "class" ? "No classmates found" : scope === "friends" ? "No friends yet" : "No rankings yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {scope === "class"
                      ? "Join a school class to see classmates here, or ask your teacher to enroll you."
                      : scope === "friends"
                      ? "Add friends to compare your trading performance with them."
                      : "Start trading in the simulator to appear on the leaderboard!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((user, index) => {
                    const rank = index + 1;
                    const isMe = currentUser?.id === user.id;
                    const alreadySent = sentRequests.has(user.id);
                    return (
                      <div key={user.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getRankStyle(rank)}`} data-testid={`row-leaderboard-${rank}`}>
                        <Link href={`/users/${user.id}`} className="flex items-center gap-4 flex-1 min-w-0 hover-elevate cursor-pointer">
                          <div className="w-12 flex items-center justify-center">
                            {getRankIcon(rank) || (
                              <span className="text-xl font-bold text-muted-foreground">#{rank}</span>
                            )}
                          </div>
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={(user as any).avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(user.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background">
                              {getLevelInfo(user.xp).level}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{user.displayName}</p>
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1">
                                <ShieldCheck className="h-3 w-3 text-primary" />
                                {getLevelInfo(user.xp).title}
                              </Badge>
                              {getMembershipBadge(user.membershipTier, user.membershipStatus)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{user.lessonsCompleted ?? 0} lessons</span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-lg font-bold ${(user.totalProfit ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {(user.totalProfit ?? 0) >= 0 ? '+' : ''}${(user.totalProfit ?? 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Balance: ${(user.simulatorBalance ?? 10000).toLocaleString()}
                            </p>
                          </div>
                          {!isMe && currentUser && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0"
                              title={alreadySent ? "Request sent" : "Add friend"}
                              disabled={alreadySent || friendMutation.isPending}
                              data-testid={`button-add-friend-${user.id}`}
                              onClick={(e) => { e.preventDefault(); friendMutation.mutate(user.id); }}>
                              {alreadySent ? <UserCheck className="h-4 w-4 text-green-500" /> : <UserPlus className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
