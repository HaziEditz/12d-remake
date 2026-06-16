import { PremiumPaywall } from "@/components/paywall";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Crown, 
  Calculator,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Percent,
  Info,
  Shield,
  Zap
} from "lucide-react";
import { useState, useMemo } from "react";

function RiskCalculatorContent() {
  const { user } = useAuth();
  const accountBalance = user?.simulatorBalance ?? 10000;
  
  const [entryPrice, setEntryPrice] = useState("100");
  const [stopLoss, setStopLoss] = useState("95");
  const [takeProfit, setTakeProfit] = useState("110");
  const [riskPercent, setRiskPercent] = useState([2]);
  const [leverage, setLeverage] = useState("1");

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;
    const target = parseFloat(takeProfit) || 0;
    const risk = riskPercent[0] / 100;
    const lev = parseFloat(leverage) || 1;

    const riskPerShare = Math.abs(entry - stop);
    const rewardPerShare = Math.abs(target - entry);
    const riskRewardRatio = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;
    
    const dollarRisk = accountBalance * risk;
    const positionSize = riskPerShare > 0 ? Math.floor(dollarRisk / riskPerShare) : 0;
    const positionValue = positionSize * entry;
    
    const potentialLoss = positionSize * riskPerShare;
    const potentialProfit = positionSize * rewardPerShare;
    
    const breakEvenWinRate = riskRewardRatio > 0 ? (1 / (1 + riskRewardRatio)) * 100 : 0;
    const breakEvenMove = entry > 0 ? (riskPerShare / entry) * 100 : 0;
    
    const marginRequired = lev > 0 ? positionValue / lev : positionValue;
    
    const isLong = entry > stop;

    return {
      riskPerShare: riskPerShare.toFixed(2),
      rewardPerShare: rewardPerShare.toFixed(2),
      riskRewardRatio: riskRewardRatio.toFixed(2),
      dollarRisk: dollarRisk.toFixed(2),
      positionSize,
      positionValue: positionValue.toFixed(2),
      potentialLoss: potentialLoss.toFixed(2),
      potentialProfit: potentialProfit.toFixed(2),
      breakEvenWinRate: breakEvenWinRate.toFixed(1),
      breakEvenMove: breakEvenMove.toFixed(2),
      marginRequired: marginRequired.toFixed(2),
      isLong,
      percentOfAccount: ((positionValue / accountBalance) * 100).toFixed(1)
    };
  }, [entryPrice, stopLoss, takeProfit, riskPercent, accountBalance, leverage]);

  const riskLevel = useMemo(() => {
    const ratio = parseFloat(calculations.riskRewardRatio);
    if (ratio >= 3) return { level: "Excellent", color: "text-green-500", bg: "bg-green-500/10" };
    if (ratio >= 2) return { level: "Good", color: "text-green-500", bg: "bg-green-500/10" };
    if (ratio >= 1.5) return { level: "Acceptable", color: "text-amber-500", bg: "bg-amber-500/10" };
    if (ratio >= 1) return { level: "Marginal", color: "text-amber-500", bg: "bg-amber-500/10" };
    return { level: "Poor", color: "text-red-500", bg: "bg-red-500/10" };
  }, [calculations.riskRewardRatio]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-risk-title">Risk Calculator</h1>
            <p className="text-muted-foreground">Calculate optimal position size and risk/reward</p>
          </div>
          <Badge className="ml-auto bg-gradient-to-r from-amber-500 to-amber-600">Premium</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Trade Parameters
              </CardTitle>
              <CardDescription>Enter your trade details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account Balance</p>
                  <p className="text-xl font-bold">${accountBalance.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="entry" className="flex items-center gap-2 mb-2">
                    Entry Price
                  </Label>
                  <Input
                    id="entry"
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="font-mono"
                    data-testid="input-entry-price"
                  />
                </div>

                <div>
                  <Label htmlFor="stop" className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Stop Loss
                  </Label>
                  <Input
                    id="stop"
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="font-mono border-red-500/30"
                    data-testid="input-stop-loss"
                  />
                </div>

                <div>
                  <Label htmlFor="target" className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Take Profit
                  </Label>
                  <Input
                    id="target"
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="font-mono border-green-500/30"
                    data-testid="input-take-profit"
                  />
                </div>

                <div>
                  <Label htmlFor="leverage" className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Leverage (x:1)
                  </Label>
                  <Input
                    id="leverage"
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    className="font-mono border-amber-500/30"
                    data-testid="input-leverage"
                    min="1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Risk per Trade
                    </Label>
                    <span className="font-mono font-semibold">{riskPercent[0]}%</span>
                  </div>
                  <Slider
                    value={riskPercent}
                    onValueChange={setRiskPercent}
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="py-2"
                    data-testid="slider-risk-percent"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative (0.5%)</span>
                    <span>Aggressive (10%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Position Sizing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Shares to Buy</p>
                    <p className="text-3xl font-bold font-mono" data-testid="text-position-size">{calculations.positionSize}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Position Value</p>
                    <p className="text-2xl font-bold font-mono">${parseFloat(calculations.positionValue).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{calculations.percentOfAccount}% of account</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      Max Loss
                    </p>
                    <p className="text-xl font-bold font-mono text-red-500">-${calculations.potentialLoss}</p>
                    <p className="text-xs text-muted-foreground">${calculations.riskPerShare}/share</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      Target Profit
                    </p>
                    <p className="text-xl font-bold font-mono text-green-500">+${calculations.potentialProfit}</p>
                    <p className="text-xs text-muted-foreground">${calculations.rewardPerShare}/share</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg ${riskLevel.bg} border`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Risk/Reward Ratio</span>
                    <Badge variant="outline" className={riskLevel.color}>
                      {riskLevel.level}
                    </Badge>
                  </div>
                  <p className={`text-3xl font-bold ${riskLevel.color}`} data-testid="text-rr-ratio">
                    1:{calculations.riskRewardRatio}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Break-even Win Rate</p>
                    <p className="text-lg font-bold font-mono">{calculations.breakEvenWinRate}%</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Break-even Move</p>
                    <p className="text-lg font-bold font-mono">{calculations.breakEvenMove}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Margin Required</p>
                    <p className="text-lg font-bold font-mono">${parseFloat(calculations.marginRequired).toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Trade Direction</p>
                    <p className={`text-lg font-bold ${calculations.isLong ? "text-green-500" : "text-red-500"}`}>
                      {calculations.isLong ? "Long" : "Short"}
                    </p>
                  </div>
                </div>

                {parseFloat(calculations.riskRewardRatio) < 1.5 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Risk/reward ratio is below 1.5:1. Consider adjusting your stop loss or take profit levels for better risk management.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Risk Management Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-500">Conservative (1-2%)</h4>
                <p className="text-sm text-muted-foreground">
                  Recommended for beginners. Preserves capital during losing streaks and allows for consistent growth.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-amber-500">Moderate (2-5%)</h4>
                <p className="text-sm text-muted-foreground">
                  For experienced traders. Offers good profit potential with manageable drawdowns.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-red-500">Aggressive (5-10%)</h4>
                <p className="text-sm text-muted-foreground">
                  High risk strategy. Can lead to significant profits or losses. Only for very experienced traders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RiskCalculatorPage() {
  return (
    <PremiumPaywall featureName="Risk Calculator">
      <RiskCalculatorContent />
    </PremiumPaywall>
  );
}
