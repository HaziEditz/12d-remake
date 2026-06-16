import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { 
  TrendingUp, DollarSign, Zap, Award, BookOpen, GraduationCap,
  Wallet, CreditCard, Crown, User, Image, UserPlus, Users, Heart,
  Star, Trophy, Lock
} from "lucide-react";

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

const iconMap: Record<string, any> = {
  TrendingUp, DollarSign, Zap, Award, BookOpen, GraduationCap,
  Wallet, CreditCard, Crown, User, Image, UserPlus, Users, Heart,
  Star, Trophy,
};

const categoryLabels: Record<string, string> = {
  trading: "Trading",
  learning: "Learning",
  balance: "Balance",
  social: "Social",
  milestone: "Milestones",
};

const categoryColors: Record<string, string> = {
  trading: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  learning: "bg-green-500/10 text-green-600 dark:text-green-400",
  balance: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  social: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  milestone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const IconComponent = iconMap[achievement.icon] || Award;
  const isUnlocked = achievement.unlocked;
  const progress = achievement.progress ?? 0;

  return (
    <Card 
      className={`transition-all ${isUnlocked ? '' : 'opacity-60'}`}
      data-testid={`card-achievement-${achievement.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
            isUnlocked 
              ? categoryColors[achievement.category] || 'bg-muted' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {isUnlocked ? (
              <IconComponent className="h-6 w-6" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{achievement.name}</h3>
              {isUnlocked && (
                <Badge variant="secondary" className="text-xs">
                  +{achievement.xpReward} XP
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            {!isUnlocked && progress > 0 && progress < 100 && (
              <div className="mt-2">
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
              </div>
            )}
            {isUnlocked && achievement.unlockedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AchievementsPage() {
  const { user } = useAuth();

  const { data: achievements, isLoading } = useQuery<Achievement[]>({
    queryKey: user ? ["/api/user/achievements"] : ["/api/achievements"],
  });

  const groupedAchievements = achievements?.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>) ?? {};

  const totalAchievements = achievements?.length ?? 0;
  const unlockedCount = achievements?.filter(a => a.unlocked).length ?? 0;
  const totalXP = achievements?.filter(a => a.unlocked).reduce((sum, a) => sum + a.xpReward, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-achievements-title">
          Achievements
        </h1>
        <p className="text-muted-foreground">
          Track your progress and unlock rewards as you learn to trade
        </p>
      </div>

      {user && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold" data-testid="text-unlocked-count">
                {unlockedCount}/{totalAchievements}
              </p>
              <p className="text-sm text-muted-foreground">Unlocked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold" data-testid="text-total-xp">
                {totalXP}
              </p>
              <p className="text-sm text-muted-foreground">Total XP</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">
                {totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </CardContent>
          </Card>
        </div>
      )}

      {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
        <div key={category} className="mb-8">
          <CardHeader className="px-0">
            <CardTitle className="text-lg">
              {categoryLabels[category] || category}
            </CardTitle>
          </CardHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {categoryAchievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      ))}

      {!achievements?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No achievements available</h3>
            <p className="text-muted-foreground">
              Achievements will appear here as they become available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
