import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Paywall } from "@/components/paywall";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Search, Check, X, UserMinus, Loader2, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AvatarStatusDot, type PresenceStatus } from "@/components/status-dot";
import type { User, Friendship } from "@shared/schema";

interface FriendResult {
  friendship: Friendship;
  friend: User;
}

interface RequestResult {
  friendship: Friendship;
  sender: User;
}

interface SearchUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const isInTrial = () => {
    if (!user?.trialStartDate) return false;
    const TRIAL_DAYS = 14;
    const trialStart = new Date(user.trialStartDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceStart < TRIAL_DAYS;
  };
  const hasPaidAccess = user && (user.role === "admin" || (user.membershipStatus === "active" && user.subscriptionId) || isInTrial());

  const { data: friends = [], isLoading: friendsLoading } = useQuery<FriendResult[]>({
    queryKey: ["/api/friends"],
    enabled: !!hasPaidAccess,
  });

  const friendIds = friends.map(f => f.friend.id);
  const { data: presence = {} } = useQuery<Record<string, PresenceStatus>>({
    queryKey: ["/api/users/presence", friendIds.join(",")],
    queryFn: () => friendIds.length
      ? fetch(`/api/users/presence?ids=${friendIds.join(",")}`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve({}),
    enabled: friendIds.length > 0,
    refetchInterval: 30_000,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<RequestResult[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!hasPaidAccess,
  });

  const { data: searchResults = [], isLoading: searchLoading } = useQuery<SearchUser[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return apiRequest("POST", "/api/friends/request", { friendId });
    },
    onSuccess: () => {
      toast({ title: "Friend request sent" });
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/friends/accept/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({ title: "Friend request accepted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/friends/reject/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({ title: "Friend request rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/friends/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const existingFriendIds = friends.map((f) => f.friend.id);
  const filteredSearchResults = searchResults.filter(
    (u) => u.id !== user?.id && !existingFriendIds.includes(u.id)
  );

  return (
    <Paywall featureName="Friends">
      <div className="container max-w-4xl py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Friends</h1>
            <p className="text-muted-foreground">Connect with other traders</p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Friends
              </CardTitle>
              <CardDescription>Search for users by name or email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
              
              {searchLoading && (
                <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}

              {filteredSearchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {filteredSearchResults.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback>{u.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Link href={`/users/${u.id}`}>
                          <span className="font-medium hover:underline cursor-pointer" data-testid={`text-user-${u.id}`}>
                            {u.displayName}
                          </span>
                        </Link>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendRequestMutation.mutate(u.id)}
                        disabled={sendRequestMutation.isPending}
                        data-testid={`button-send-request-${u.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Friend
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !searchLoading && filteredSearchResults.length === 0 && (
                <p className="mt-4 text-muted-foreground text-sm">No users found</p>
              )}
            </CardContent>
          </Card>

          {requests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Friend Requests
                  <Badge variant="secondary">{requests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((r) => (
                      <div key={r.friendship.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={r.sender.avatarUrl || undefined} />
                            <AvatarFallback>{r.sender.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <Link href={`/users/${r.sender.id}`}>
                            <span className="font-medium hover:underline cursor-pointer" data-testid={`text-request-${r.friendship.id}`}>
                              {r.sender.displayName}
                            </span>
                          </Link>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="default"
                            onClick={() => acceptMutation.mutate(r.friendship.id)}
                            disabled={acceptMutation.isPending}
                            data-testid={`button-accept-${r.friendship.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(r.friendship.id)}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-${r.friendship.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Friends
                <Badge variant="secondary">{friends.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : friends.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You haven't added any friends yet. Use the search above to find other traders.
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => {
                    const fStatus: PresenceStatus = presence[f.friend.id] ?? "offline";
                    return (
                    <div key={f.friendship.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar>
                            <AvatarImage src={f.friend.avatarUrl || undefined} />
                            <AvatarFallback>{f.friend.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <AvatarStatusDot status={fStatus} />
                        </div>
                        <div>
                          <Link href={`/users/${f.friend.id}`}>
                            <span className="font-medium hover:underline cursor-pointer" data-testid={`text-friend-${f.friendship.id}`}>
                              {f.friend.displayName}
                            </span>
                          </Link>
                          <p className={`text-xs ${fStatus === "online" ? "text-green-500" : fStatus === "idle" ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {fStatus === "online" ? "Online" : fStatus === "idle" ? "Idle" : f.friend.bio ? f.friend.bio.slice(0, 40) : "Offline"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/messages?dm=${f.friend.id}`)}
                          title="Open chat"
                          data-testid={`button-chat-${f.friendship.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMutation.mutate(f.friendship.id)}
                          disabled={removeMutation.isPending}
                          data-testid={`button-remove-${f.friendship.id}`}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Paywall>
  );
}
