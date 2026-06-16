import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target, 
  Shield, 
  Zap,
  Clock,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Library,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";

const strategies = [
  {
    id: "momentum",
    name: "Momentum Trading",
    description: "Capitalize on existing market trends by buying stocks showing upward momentum",
    difficulty: "Intermediate",
    timeframe: "Short-term",
    riskLevel: "Medium",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    details: [
      "Look for stocks with high relative strength",
      "Enter when price breaks above resistance",
      "Use moving averages for trend confirmation",
      "Set stop-loss below recent swing low"
    ],
    expectedReturn: "15-25%",
    holdingPeriod: "Days to Weeks"
  },
  {
    id: "value",
    name: "Value Investing",
    description: "Find undervalued stocks trading below their intrinsic value for long-term gains",
    difficulty: "Advanced",
    timeframe: "Long-term",
    riskLevel: "Low",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    details: [
      "Analyze P/E ratio and compare to industry",
      "Check price-to-book value ratio",
      "Look for strong cash flow and low debt",
      "Be patient - value takes time to realize"
    ],
    expectedReturn: "8-15%",
    holdingPeriod: "Months to Years"
  },
  {
    id: "swing",
    name: "Swing Trading",
    description: "Capture gains from stock price swings over several days to weeks",
    difficulty: "Intermediate",
    timeframe: "Medium-term",
    riskLevel: "Medium",
    icon: Activity,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    details: [
      "Identify stocks in a trading range",
      "Buy at support, sell at resistance",
      "Use RSI for overbought/oversold signals",
      "Trail stops as position moves in your favor"
    ],
    expectedReturn: "10-20%",
    holdingPeriod: "3-10 Days"
  },
  {
    id: "breakout",
    name: "Breakout Strategy",
    description: "Enter trades when price breaks through key support or resistance levels",
    difficulty: "Beginner",
    timeframe: "Short-term",
    riskLevel: "High",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    details: [
      "Draw horizontal lines at key price levels",
      "Wait for price to close above/below level",
      "Volume should confirm the breakout",
      "Set target at next resistance/support"
    ],
    expectedReturn: "20-40%",
    holdingPeriod: "Hours to Days"
  },
  {
    id: "dividend",
    name: "Dividend Investing",
    description: "Build wealth through consistent dividend payments from stable companies",
    difficulty: "Beginner",
    timeframe: "Long-term",
    riskLevel: "Low",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    details: [
      "Focus on dividend yield above 3%",
      "Check dividend growth history (5+ years)",
      "Analyze payout ratio (below 60% ideal)",
      "Reinvest dividends for compound growth"
    ],
    expectedReturn: "6-10%",
    holdingPeriod: "Years"
  },
  {
    id: "short",
    name: "Short Selling",
    description: "Profit from declining stock prices by selling borrowed shares",
    difficulty: "Advanced",
    timeframe: "Short-term",
    riskLevel: "Very High",
    icon: TrendingDown,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    details: [
      "Identify overvalued or declining stocks",
      "Look for bearish chart patterns",
      "Always use stop-loss orders",
      "Be aware of unlimited loss potential"
    ],
    expectedReturn: "15-30%",
    holdingPeriod: "Days to Weeks"
  }
];

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Beginner": return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "Intermediate": return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
    case "Advanced": return "bg-red-500/20 text-red-700 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getRiskColor(risk: string) {
  switch (risk) {
    case "Low": return "text-green-600 dark:text-green-400";
    case "Medium": return "text-amber-600 dark:text-amber-400";
    case "High": return "text-orange-600 dark:text-orange-400";
    case "Very High": return "text-red-600 dark:text-red-400";
    default: return "text-muted-foreground";
  }
}

type Strategy = typeof strategies[number];

function StrategyContent() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
            <Library className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-strategies-title">Strategy Library</h1>
            <p className="text-muted-foreground">Proven trading strategies to boost your performance</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <Card key={strategy.id} className="overflow-hidden" data-testid={`card-strategy-${strategy.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 rounded-lg ${strategy.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${strategy.color}`} />
                    </div>
                    <Badge className={getDifficultyColor(strategy.difficulty)}>
                      {strategy.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{strategy.name}</CardTitle>
                  <CardDescription>{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{strategy.timeframe}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${getRiskColor(strategy.riskLevel)}`} />
                      <span className={getRiskColor(strategy.riskLevel)}>{strategy.riskLevel} Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                      <span>{strategy.expectedReturn}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span>{strategy.holdingPeriod}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Key Points:</p>
                    <ul className="text-xs space-y-1">
                      {strategy.details.slice(0, 3).map((detail, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">-</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm" 
                    data-testid={`button-learn-${strategy.id}`}
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8">
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold">Want to practice these strategies?</h3>
                <p className="text-sm text-muted-foreground">Try them risk-free in our trading simulator</p>
              </div>
              <Button asChild data-testid="button-go-simulator">
                <a href="/simulator">
                  <Activity className="w-4 h-4 mr-2" />
                  Open Simulator
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedStrategy} onOpenChange={(open) => !open && setSelectedStrategy(null)}>
        <DialogContent className="max-w-lg">
          {selectedStrategy && (() => {
            const Icon = selectedStrategy.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-lg ${selectedStrategy.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${selectedStrategy.color}`} />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedStrategy.name}</DialogTitle>
                      <Badge className={getDifficultyColor(selectedStrategy.difficulty)}>
                        {selectedStrategy.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <DialogDescription>{selectedStrategy.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Timeframe</p>
                        <p className="text-sm font-medium">{selectedStrategy.timeframe}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${getRiskColor(selectedStrategy.riskLevel)}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Level</p>
                        <p className={`text-sm font-medium ${getRiskColor(selectedStrategy.riskLevel)}`}>{selectedStrategy.riskLevel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Return</p>
                        <p className="text-sm font-medium">{selectedStrategy.expectedReturn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Holding Period</p>
                        <p className="text-sm font-medium">{selectedStrategy.holdingPeriod}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Key Strategy Points
                    </h4>
                    <ul className="space-y-2">
                      {selectedStrategy.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className="w-full" onClick={() => setSelectedStrategy(null)} data-testid="button-close-strategy">
                    Got It
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StrategiesPage() {
  return <StrategyContent />;
}
