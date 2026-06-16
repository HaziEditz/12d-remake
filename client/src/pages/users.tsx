import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, TrendingUp, BookOpen, Crown, GraduationCap, Zap } from "lucide-react";

interface PublicUser {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  membershipTier: string | null;
  membershipStatus: string | null;
  lessonsCompleted: number | null;
  totalProfit: number | null;
}

function getMembershipBadge(tier: string | null, status: string | null) {
  if (status !== "active" || !tier) return null;
  
  if (tier === "premium") {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs">
        <Crown className="w-3 h-3 mr-1" />
        12Digits+
      </Badge>
    );
  }
  if (tier === "school") {
    return (
      <Badge variant="outline" className="text-xs">
        <GraduationCap className="w-3 h-3 mr-1" />
        School
      </Badge>
    );
  }
  if (tier === "casual") {
    return (
      <Badge variant="secondary" className="text-xs">
        <Zap className="w-3 h-3 mr-1" />
        Casual
      </Badge>
    );
  }
  return null;
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: users, isLoading } = useQuery<PublicUser[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Find Traders</h1>
          <p className="text-muted-foreground">Search for traders by name</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-user-search"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {searchQuery.length < 2 
              ? "Type at least 2 characters to search"
              : `${users?.length ?? 0} traders found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Search for Traders</h3>
              <p className="text-muted-foreground">
                Enter a name to find other traders on the platform
              </p>
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <Link key={user.id} href={`/users/${user.id}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-lg border hover-elevate cursor-pointer"
                    data-testid={`row-user-${user.id}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{user.displayName}</p>
                        {getMembershipBadge(user.membershipTier, user.membershipStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {user.lessonsCompleted ?? 0} lessons
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-bold flex items-center gap-1 ${(user.totalProfit ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        <TrendingUp className="h-4 w-4" />
                        {(user.totalProfit ?? 0) >= 0 ? '+' : ''}${(user.totalProfit ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No traders found</h3>
              <p className="text-muted-foreground">
                Try a different search term
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
