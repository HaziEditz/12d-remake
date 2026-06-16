import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { playAchievementSound } from "@/lib/sounds";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trophy, Award, TrendingUp, DollarSign, Zap, BookOpen, GraduationCap, Wallet, CreditCard, Crown, User, Image, UserPlus, Users, Heart, Star } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  unlocked?: boolean;
  unlockedAt?: string;
}

const iconMap: Record<string, any> = {
  TrendingUp, DollarSign, Zap, Award, BookOpen, GraduationCap,
  Wallet, CreditCard, Crown, User, Image, UserPlus, Users, Heart,
  Star, Trophy,
};

const categoryColors: Record<string, string> = {
  trading: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  learning: "bg-green-500/20 text-green-500 border-green-500/30",
  balance: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  social: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  milestone: "bg-orange-500/20 text-orange-500 border-orange-500/30",
};

const SEEN_ACHIEVEMENTS_KEY_PREFIX = "12digits_seen_achievements_";

function getSeenAchievements(userId: string): Set<string> {
  try {
    const stored = localStorage.getItem(SEEN_ACHIEVEMENTS_KEY_PREFIX + userId);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {}
  return new Set();
}

function saveSeenAchievements(userId: string, achievements: Set<string>): void {
  try {
    localStorage.setItem(SEEN_ACHIEVEMENTS_KEY_PREFIX + userId, JSON.stringify(Array.from(achievements)));
  } catch {}
}

interface NotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

function AchievementPopup({ achievement, onClose }: NotificationProps) {
  const IconComponent = iconMap[achievement.icon] || Trophy;
  const colorClass = categoryColors[achievement.category] || "bg-muted text-foreground";

  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <Card 
      className="w-80 shadow-lg border-2 animate-in slide-in-from-right-full duration-300"
      data-testid={`notification-achievement-${achievement.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-14 w-14 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
            <IconComponent className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Achievement Unlocked
              </p>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 shrink-0"
                onClick={onClose}
                data-testid="button-close-achievement-notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <h3 className="font-bold text-lg truncate mt-1" data-testid="text-achievement-name">
              {achievement.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            <Badge variant="secondary" className="mt-2">
              +{achievement.xpReward} XP
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AchievementNotificationProvider() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Achievement[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const lastUserIdRef = useRef<string | null>(null);

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["/api/user/achievements"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!achievements || !user) return;

    const userId = user.id;
    const isNewUser = lastUserIdRef.current !== userId;

    if (isNewUser) {
      seenRef.current = getSeenAchievements(userId);
      const unlockedIds = achievements.filter(a => a.unlocked).map(a => a.id);
      unlockedIds.forEach(id => seenRef.current.add(id));
      saveSeenAchievements(userId, seenRef.current);
      lastUserIdRef.current = userId;
      setNotifications([]);
      return;
    }

    const newlyUnlocked = achievements.filter(
      a => a.unlocked && !seenRef.current.has(a.id)
    );

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(a => seenRef.current.add(a.id));
      saveSeenAchievements(userId, seenRef.current);
      
      playAchievementSound();
      
      setNotifications(prev => [...prev, ...newlyUnlocked]);
    }
  }, [achievements, user]);

  const handleClose = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-3"
      data-testid="container-achievement-notifications"
    >
      {notifications.map(achievement => (
        <AchievementPopup
          key={achievement.id}
          achievement={achievement}
          onClose={() => handleClose(achievement.id)}
        />
      ))}
    </div>
  );
}
