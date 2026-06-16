import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { canAccessPremiumContent } from "@/lib/subscription";
import type { TradingTip, MarketInsight } from "@shared/schema";
import { 
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Target,
  Shield,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Sparkles
} from "lucide-react";

const ICON_MAP: Record<string, typeof Lightbulb> = {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Target,
  Shield,
  AlertTriangle,
};

const DEFAULT_TIPS: Omit<TradingTip, 'id' | 'createdAt'>[] = [
  {
    title: "Always Use Stop Losses",
    content: "Never enter a trade without a predetermined exit point. Stop losses protect your capital and remove emotional decision-making from your trading. Set your stop loss at a level that invalidates your trade thesis.",
    category: "risk",
    difficulty: "beginner",
    iconName: "Shield",
    isPublished: true,
  },
  {
    title: "The 1% Rule",
    content: "Never risk more than 1% of your total trading capital on a single trade. This means if you have $10,000, your maximum loss on any trade should be $100. This ensures you can survive a string of losses.",
    category: "risk",
    difficulty: "beginner",
    iconName: "Target",
    isPublished: true,
  },
  {
    title: "Trade With the Trend",
    content: "The trend is your friend. Trading in the direction of the primary trend increases your probability of success. Use higher timeframes to identify the trend and lower timeframes for entry points.",
    category: "strategy",
    difficulty: "intermediate",
    iconName: "TrendingUp",
    isPublished: true,
  },
  {
    title: "Control Your Emotions",
    content: "Fear and greed are the two biggest enemies of traders. Stick to your trading plan regardless of how you feel. If you're feeling emotional, step away from the screen.",
    category: "psychology",
    difficulty: "beginner",
    iconName: "AlertTriangle",
    isPublished: true,
  },
];

const DEFAULT_INSIGHTS: Omit<MarketInsight, 'id' | 'createdAt'>[] = [
  {
    title: "Tech Sector Shows Strength",
    summary: "Technology stocks continue to lead market gains as AI adoption accelerates across industries. Major tech companies report strong earnings guidance.",
    sentiment: "bullish",
    sector: "Technology",
    isPublished: true,
  },
  {
    title: "Fed Rate Decision Impact",
    summary: "Markets await the Federal Reserve's next interest rate decision. Current expectations suggest rates will remain unchanged, providing stability.",
    sentiment: "neutral",
    sector: "Macro",
    isPublished: true,
  },
];

function getTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function TipsPage() {
  const { isAuthenticated, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: tips = [], isLoading: tipsLoading } = useQuery<TradingTip[]>({
    queryKey: ["/api/tips"],
  });

  const { data: insights = [], isLoading: insightsLoading } = useQuery<MarketInsight[]>({
    queryKey: ["/api/insights"],
  });

  const displayTips = tips.length > 0 ? tips : DEFAULT_TIPS.map((tip, i) => ({
    ...tip,
    id: `default-${i}`,
    createdAt: new Date(),
  })) as TradingTip[];

  const displayInsights = insights.length > 0 ? insights : DEFAULT_INSIGHTS.map((insight, i) => ({
    ...insight,
    id: `default-${i}`,
    createdAt: new Date(),
  })) as MarketInsight[];

  const [dailyTip, setDailyTip] = useState<TradingTip | null>(null);

  useEffect(() => {
    if (displayTips.length > 0 && !dailyTip) {
      setDailyTip(displayTips[Math.floor(Math.random() * displayTips.length)]);
    }
  }, [displayTips, dailyTip]);

  const refreshDailyTip = () => {
    if (displayTips.length > 0) {
      const newTip = displayTips[Math.floor(Math.random() * displayTips.length)];
      setDailyTip(newTip);
    }
  };

  const filteredTips = selectedCategory === "all" 
    ? displayTips 
    : displayTips.filter(tip => tip.category === selectedCategory);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish": return "text-success";
      case "bearish": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-success/10 text-success border-success/20";
      case "intermediate": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "advanced": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "strategy": return "bg-primary/10 text-primary border-primary/20";
      case "psychology": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "risk": return "bg-destructive/10 text-destructive border-destructive/20";
      case "market": return "bg-success/10 text-success border-success/20";
      default: return "";
    }
  };

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Lightbulb;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Trading Tips & Insights</h1>
        <p className="text-muted-foreground mb-4">Sign in to access trading tips and market insights</p>
        <Link href="/login">
          <Button data-testid="button-login-tips">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (tipsLoading || insightsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-48 w-full mb-8" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-tips-title">
          <Lightbulb className="h-8 w-8 text-amber-500" />
          Trading Tips & Insights
        </h1>
        <p className="text-muted-foreground mt-1">Learn essential trading concepts and stay informed</p>
      </div>

      {dailyTip && (
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Daily Trading Tip</CardTitle>
                <p className="text-sm text-muted-foreground">Wisdom for today's trading session</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={refreshDailyTip} data-testid="button-refresh-tip">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-semibold mb-2" data-testid="text-daily-tip-title">{dailyTip.title}</h3>
            <p className="text-muted-foreground mb-4" data-testid="text-daily-tip-content">{dailyTip.content}</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={`capitalize ${getDifficultyColor(dailyTip.difficulty)}`}>
                {dailyTip.difficulty}
              </Badge>
              <Badge variant="outline" className={`capitalize ${getCategoryColor(dailyTip.category)}`}>
                {dailyTip.category}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-12">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Trading Tips
            </h2>
            <div className="flex flex-wrap gap-2">
              {["all", "strategy", "psychology", "risk", "market"].map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                  data-testid={`button-category-${category}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredTips.map((tip) => {
              const Icon = getIcon(tip.iconName);
              return (
                <Card key={tip.id} className="hover-elevate" data-testid={`card-tip-${tip.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-2">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{tip.content}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className={`capitalize ${getDifficultyColor(tip.difficulty)}`}>
                            {tip.difficulty}
                          </Badge>
                          <Badge variant="outline" className={`capitalize ${getCategoryColor(tip.category)}`}>
                            {tip.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Market Insights
          </h2>
          <div className="grid gap-4">
            {displayInsights.map((insight) => (
              <Card key={insight.id} className="hover-elevate" data-testid={`card-insight-${insight.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary">{insight.sector}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {insight.createdAt ? getTimeSince(new Date(insight.createdAt)) : "Recently"}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2" data-testid={`text-insight-title-${insight.id}`}>{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">{insight.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {insight.sentiment === "bullish" ? (
                        <TrendingUp className={`h-5 w-5 ${getSentimentColor(insight.sentiment)}`} />
                      ) : insight.sentiment === "bearish" ? (
                        <TrendingDown className={`h-5 w-5 ${getSentimentColor(insight.sentiment)}`} />
                      ) : (
                        <ChevronRight className={`h-5 w-5 ${getSentimentColor(insight.sentiment)}`} />
                      )}
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${
                          insight.sentiment === "bullish" 
                            ? "text-success border-success" 
                            : insight.sentiment === "bearish"
                            ? "text-destructive border-destructive"
                            : ""
                        }`}
                      >
                        {insight.sentiment}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!canAccessPremiumContent(user) && (
            <Card className="mt-6">
              <CardContent className="py-8 text-center">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">Want More Insights?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Premium for real-time news feed and market analysis
                </p>
                <Link href="/pricing">
                  <Button data-testid="button-view-premium">View Premium</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
