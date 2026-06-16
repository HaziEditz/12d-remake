import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Gamepad2, TrendingUp, TrendingDown, Brain, Coins, Trophy, Zap, Target,
  BarChart2, Clock, Star, ArrowUp, ArrowDown, CheckCircle2, XCircle, Play,
  RefreshCw, DollarSign, PieChart, Flame, Award, ChevronRight
} from "lucide-react";

const QUIZ_QUESTIONS = [
  { question: "What does 'diversification' mean in investing?", options: ["Putting all money in one stock", "Spreading investments across different assets", "Only investing in bonds", "Selling stocks frequently"], correct: 1, explanation: "Diversification reduces risk by spreading investments." },
  { question: "What is a 'bull market'?", options: ["A market for farm animals", "A falling market", "A rising market with optimism", "A flat market"], correct: 2, explanation: "A bull market is characterized by rising prices and investor optimism." },
  { question: "What does P/E ratio stand for?", options: ["Profit/Expense", "Price/Earnings", "Performance/Equity", "Portfolio/Exposure"], correct: 1, explanation: "P/E ratio = Stock Price / Earnings Per Share, used to value companies." },
  { question: "What is a 'stop-loss order'?", options: ["An order to buy more when prices drop", "A limit on how much you can invest", "An order to sell if price falls below a level", "A type of dividend"], correct: 2, explanation: "A stop-loss automatically sells to limit your losses." },
  { question: "What is a 'dividend'?", options: ["A fee paid to brokers", "A portion of company profits paid to shareholders", "A type of bond", "A stock split"], correct: 1, explanation: "Dividends are regular profit payments made to shareholders." },
  { question: "What does 'shorting a stock' mean?", options: ["Buying a small amount", "Selling borrowed shares hoping price falls", "Holding for less than a day", "Investing in small-cap stocks"], correct: 1, explanation: "Shorting means borrowing shares, selling them, and buying back lower." },
  { question: "What is an ETF?", options: ["Electronic Trading Fund", "Exchange-Traded Fund", "Equity Transfer Fee", "Emerging Tech Fund"], correct: 1, explanation: "ETFs trade on exchanges like stocks but track an index or basket." },
  { question: "What is inflation?", options: ["Rising asset prices", "General increase in prices over time", "Government spending increase", "Interest rate hike"], correct: 1, explanation: "Inflation is the rate at which purchasing power decreases over time." },
  { question: "What does 'compound interest' mean?", options: ["Simple interest on principal", "Earning interest on interest already earned", "Interest from multiple banks", "A fixed interest rate"], correct: 1, explanation: "Compound interest grows exponentially by earning interest on prior interest." },
  { question: "What is market capitalisation?", options: ["Total trading volume", "Total value of all shares outstanding", "Company's annual revenue", "Highest stock price ever"], correct: 1, explanation: "Market cap = Share price × Number of shares outstanding." },
  { question: "What is a 'bear market'?", options: ["A stable sideways market", "A rising market", "A declining market (20%+ drop)", "A cryptocurrency market"], correct: 2, explanation: "A bear market is a 20% or more decline from recent highs." },
  { question: "What is 'dollar cost averaging'?", options: ["Buying USD currency", "Investing fixed amounts at regular intervals", "Averaging your trade prices", "Investing all at once"], correct: 1, explanation: "DCA reduces timing risk by spreading purchases over time." },
  { question: "What are 'blue chip' stocks?", options: ["Cheap penny stocks", "Technology stocks only", "Well-established, financially stable companies", "Foreign stocks"], correct: 2, explanation: "Blue chips are large, reputable companies with long track records." },
  { question: "What is a 'limit order'?", options: ["An order capped at a minimum", "An order to buy/sell at a specific price or better", "An order processed at market open only", "A cancelled order"], correct: 1, explanation: "A limit order only executes at your specified price or better." },
  { question: "What is the S&P 500?", options: ["Top 500 richest people", "Index of 500 large US companies", "500 best mutual funds", "US Treasury bonds"], correct: 1, explanation: "The S&P 500 tracks 500 large US companies and is a key market benchmark." },
];

const MARKET_STOCKS = [
  { symbol: "AAPL", name: "Apple", basePrice: 175 },
  { symbol: "TSLA", name: "Tesla", basePrice: 250 },
  { symbol: "NVDA", name: "NVIDIA", basePrice: 650 },
  { symbol: "GOOGL", name: "Google", basePrice: 140 },
  { symbol: "MSFT", name: "Microsoft", basePrice: 380 },
  { symbol: "AMZN", name: "Amazon", basePrice: 180 },
  { symbol: "META", name: "Meta", basePrice: 490 },
  { symbol: "NFLX", name: "Netflix", basePrice: 620 },
];

const STRATEGY_OPTIONS = [
  { name: "Tech Giants ETF", risk: "Low-Med", expectedReturn: "+5% to +15%", icon: "💻", minReturn: 0.05, maxReturn: 0.15 },
  { name: "Crypto Bundle", risk: "Very High", expectedReturn: "-30% to +80%", icon: "₿", minReturn: -0.30, maxReturn: 0.80 },
  { name: "Government Bonds", risk: "Very Low", expectedReturn: "+2% to +4%", icon: "🏛️", minReturn: 0.02, maxReturn: 0.04 },
  { name: "Emerging Markets", risk: "High", expectedReturn: "-10% to +35%", icon: "🌍", minReturn: -0.10, maxReturn: 0.35 },
  { name: "Real Estate REIT", risk: "Medium", expectedReturn: "+4% to +12%", icon: "🏘️", minReturn: 0.04, maxReturn: 0.12 },
];

type GameState = "idle" | "playing" | "result";

function MarketPredictionGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>("idle");
  const [streak, setStreak] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [round, setRound] = useState(0);
  const [stock, setStock] = useState(MARKET_STOCKS[0]);
  const [startPrice, setStartPrice] = useState(0);
  const [endPrice, setEndPrice] = useState(0);
  const [prediction, setPrediction] = useState<"up" | "down" | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(3);

  const scoreMutation = useMutation({
    mutationFn: (data: { game: string; score: number; tokensEarned: number }) =>
      apiRequest("POST", "/api/fun-zone/score", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const startRound = useCallback(() => {
    const randomStock = MARKET_STOCKS[Math.floor(Math.random() * MARKET_STOCKS.length)];
    const base = randomStock.basePrice * (0.9 + Math.random() * 0.2);
    setStock(randomStock);
    setStartPrice(base);
    setIsCorrect(null);
    setPrediction(null);
    setGameState("playing");
    setCountdown(3);
  }, []);

  const makePrediction = (direction: "up" | "down") => {
    if (prediction) return;
    const change = (Math.random() - 0.45) * startPrice * 0.06;
    const end = startPrice + change;
    setPrediction(direction);
    setEndPrice(end);
    const correct = direction === (end > startPrice ? "up" : "down");
    setIsCorrect(correct);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const tokens = 5 + Math.floor(newStreak / 3) * 5;
      setTotalTokens(prev => prev + tokens);
      setRound(r => r + 1);
      if (round + 1 >= 5) {
        scoreMutation.mutate({ game: "market-prediction", score: totalTokens + tokens, tokensEarned: totalTokens + tokens });
        setGameState("result");
      }
    } else {
      setStreak(0);
      scoreMutation.mutate({ game: "market-prediction", score: totalTokens, tokensEarned: totalTokens });
      setGameState("result");
    }
  };

  return (
    <div className="space-y-4">
      {gameState === "idle" && (
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
            <BarChart2 className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Market Prediction</h3>
            <p className="text-muted-foreground mt-1">Predict whether a stock goes UP or DOWN. Get 5 right in a row to win!</p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto text-sm">
            <div className="bg-muted rounded-lg p-2 text-center"><div className="font-bold text-primary">+5</div><div className="text-xs text-muted-foreground">tokens/correct</div></div>
            <div className="bg-muted rounded-lg p-2 text-center"><div className="font-bold text-amber-500">+5</div><div className="text-xs text-muted-foreground">streak bonus</div></div>
            <div className="bg-muted rounded-lg p-2 text-center"><div className="font-bold text-green-500">5</div><div className="text-xs text-muted-foreground">rounds to win</div></div>
          </div>
          <Button size="lg" onClick={startRound} className="gap-2">
            <Play className="w-4 h-4" /> Start Game
          </Button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Streak: {streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">{totalTokens} tokens</span>
            </div>
            <Badge variant="outline">Round {round + 1}/5</Badge>
          </div>

          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-4xl font-bold">{stock.symbol}</div>
              <div className="text-muted-foreground">{stock.name}</div>
              <div className="text-3xl font-bold">${startPrice.toFixed(2)}</div>
              {prediction && (
                <div className={`text-2xl font-bold transition-all ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                  ${endPrice.toFixed(2)}
                  <span className="text-base ml-2">
                    {endPrice > startPrice ? "▲" : "▼"} {Math.abs(((endPrice - startPrice) / startPrice) * 100).toFixed(2)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {!prediction ? (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 gap-2 h-16" onClick={() => makePrediction("up")}>
                <ArrowUp className="w-5 h-5" /> Going UP
              </Button>
              <Button size="lg" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-2 h-16" onClick={() => makePrediction("down")}>
                <ArrowDown className="w-5 h-5" /> Going DOWN
              </Button>
            </div>
          ) : (
            <div className={`rounded-lg p-4 text-center space-y-2 ${isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="font-bold text-green-600">Correct! +{5 + Math.floor(streak / 3) * 5} tokens</p>
                  <Button size="sm" onClick={startRound}>Next Round <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="font-bold text-red-600">Wrong! Game over.</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {gameState === "result" && (
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold">Game Over!</h3>
          <p className="text-muted-foreground">You earned <span className="font-bold text-amber-500">{totalTokens} tokens</span> with a streak of {streak}!</p>
          <Button onClick={() => { setGameState("idle"); setStreak(0); setTotalTokens(0); setRound(0); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Play Again
          </Button>
        </div>
      )}
    </div>
  );
}

function InvestmentQuiz() {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>("idle");
  const [questions, setQuestions] = useState<typeof QUIZ_QUESTIONS>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [showExplanation, setShowExplanation] = useState(false);

  const scoreMutation = useMutation({
    mutationFn: (data: { game: string; score: number; tokensEarned: number }) =>
      apiRequest("POST", "/api/fun-zone/score", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  useEffect(() => {
    if (gameState !== "playing" || selected !== null) return;
    if (timeLeft === 0) { handleAnswer(-1); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, timeLeft, selected]);

  const startGame = () => {
    const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8);
    setQuestions(shuffled);
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setTimeLeft(20);
    setShowExplanation(false);
    setGameState("playing");
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    const q = questions[current];
    if (idx === q.correct) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      const tokens = score * 10;
      scoreMutation.mutate({ game: "investment-quiz", score, tokensEarned: tokens });
      setGameState("result");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowExplanation(false);
      setTimeLeft(20);
    }
  };

  if (gameState === "idle") return (
    <div className="text-center space-y-4 py-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 mb-2">
        <Brain className="w-10 h-10 text-purple-500" />
      </div>
      <h3 className="text-xl font-bold">Investment Quiz</h3>
      <p className="text-muted-foreground">8 finance questions, 20 seconds each. Earn 10 tokens per correct answer!</p>
      <Button size="lg" onClick={startGame} className="gap-2"><Play className="w-4 h-4" /> Start Quiz</Button>
    </div>
  );

  if (gameState === "result") {
    const tokens = score * 10;
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-5xl">{score >= 6 ? "🏆" : score >= 4 ? "🥈" : "📚"}</div>
        <h3 className="text-xl font-bold">{score}/{questions.length} Correct!</h3>
        <p className="text-muted-foreground">You earned <span className="font-bold text-amber-500">{tokens} tokens</span></p>
        <Button onClick={startGame}><RefreshCw className="w-4 h-4 mr-2" /> Try Again</Button>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{current + 1} / {questions.length}</Badge>
        <div className={`flex items-center gap-1 font-bold ${timeLeft <= 5 ? "text-red-500" : "text-muted-foreground"}`}>
          <Clock className="w-4 h-4" /> {timeLeft}s
        </div>
        <div className="flex items-center gap-1 text-amber-600 font-medium text-sm">
          <Star className="w-4 h-4" /> {score * 10} pts
        </div>
      </div>
      <Progress value={(timeLeft / 20) * 100} className="h-1.5" />
      <Card>
        <CardContent className="pt-4">
          <p className="font-semibold text-base mb-4">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let variant: "outline" | "default" = "outline";
              let cls = "w-full justify-start text-left h-auto py-3 px-4 ";
              if (selected !== null) {
                if (i === q.correct) cls += "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 ";
                else if (i === selected && selected !== q.correct) cls += "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 ";
              }
              return (
                <Button key={i} variant="outline" className={cls} disabled={selected !== null} onClick={() => handleAnswer(i)}>
                  <span className="text-xs font-bold mr-2 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>{opt}
                </Button>
              );
            })}
          </div>
          {showExplanation && <p className="mt-3 text-sm text-muted-foreground bg-muted rounded p-2">{q.explanation}</p>}
        </CardContent>
      </Card>
      {selected !== null && <Button onClick={nextQuestion} className="w-full">{current + 1 >= questions.length ? "See Results" : "Next Question"} <ChevronRight className="w-4 h-4 ml-1" /></Button>}
    </div>
  );
}

function StrategyChallenge() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [budget] = useState(10000);
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [results, setResults] = useState<{ option: typeof STRATEGY_OPTIONS[0]; allocated: number; returnPct: number; profit: number }[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);

  const scoreMutation = useMutation({
    mutationFn: (data: { game: string; score: number; tokensEarned: number }) =>
      apiRequest("POST", "/api/fun-zone/score", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const remaining = budget - totalAllocated;

  const setAlloc = (i: number, val: number) => {
    const current = allocations[i] || 0;
    const others = totalAllocated - current;
    const newVal = Math.max(0, Math.min(val, budget - others));
    setAllocations(prev => ({ ...prev, [i]: newVal }));
  };

  const runSimulation = () => {
    const res = STRATEGY_OPTIONS.map((opt, i) => {
      const allocated = allocations[i] || 0;
      const returnPct = opt.minReturn + Math.random() * (opt.maxReturn - opt.minReturn);
      return { option: opt, allocated, returnPct, profit: allocated * returnPct };
    });
    const total = res.reduce((s, r) => s + r.profit, 0);
    setResults(res);
    setTotalProfit(total);
    const tokens = Math.max(0, Math.floor(total / 200));
    scoreMutation.mutate({ game: "strategy-challenge", score: Math.round(total), tokensEarned: tokens });
    setGameState("result");
  };

  if (gameState === "idle") return (
    <div className="text-center space-y-4 py-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-2">
        <PieChart className="w-10 h-10 text-green-500" />
      </div>
      <h3 className="text-xl font-bold">Strategy Challenge</h3>
      <p className="text-muted-foreground">Allocate $10,000 across 5 investment types. The market will decide your fate!</p>
      <Button size="lg" onClick={() => { setAllocations({}); setGameState("playing"); }} className="gap-2"><Play className="w-4 h-4" /> Start Challenge</Button>
    </div>
  );

  if (gameState === "playing") return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Allocate Your $10,000</span>
        <Badge variant={remaining < 0 ? "destructive" : "outline"} className="gap-1">
          <DollarSign className="w-3 h-3" /> ${remaining.toLocaleString()} remaining
        </Badge>
      </div>
      <div className="space-y-3">
        {STRATEGY_OPTIONS.map((opt, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <span className="text-2xl">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{opt.name}</p>
              <p className="text-xs text-muted-foreground">Risk: {opt.risk} · {opt.expectedReturn}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                max={budget}
                step={500}
                value={allocations[i] || ""}
                placeholder="0"
                onChange={e => setAlloc(i, Number(e.target.value))}
                className="w-20 text-sm border rounded px-2 py-1 text-right bg-background"
              />
            </div>
          </div>
        ))}
      </div>
      <Button className="w-full" disabled={totalAllocated === 0} onClick={runSimulation}>
        <Zap className="w-4 h-4 mr-2" /> Run Market Simulation
      </Button>
    </div>
  );

  const totalFinal = budget + totalProfit;
  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 text-center ${totalProfit >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
        <p className="text-sm text-muted-foreground">Portfolio Result</p>
        <p className="text-3xl font-bold">${totalFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        <p className={`font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
          {totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({((totalProfit / budget) * 100).toFixed(1)}%)
        </p>
        {totalProfit > 0 && <p className="text-xs text-amber-600 mt-1">+{Math.floor(totalProfit / 200)} tokens earned</p>}
      </div>
      <div className="space-y-2">
        {results.filter(r => r.allocated > 0).map((r, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span>{r.option.icon}</span>
            <span className="flex-1">{r.option.name}</span>
            <span className="text-muted-foreground">${r.allocated.toLocaleString()}</span>
            <span className={`font-medium ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {r.profit >= 0 ? "+" : ""}${r.profit.toFixed(0)} ({(r.returnPct * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={() => { setAllocations({}); setGameState("idle"); }}>
        <RefreshCw className="w-4 h-4 mr-2" /> Try Again
      </Button>
    </div>
  );
}

// ── Blackjack ──────────────────────────────────────────────────────────────
const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
type BJCard = { suit: string; rank: string };

function cardValue(rank: string) {
  if (["J","Q","K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}
function handTotal(hand: BJCard[]) {
  let total = hand.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = hand.filter(c => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function newDeck(): BJCard[] {
  const deck: BJCard[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
  return deck.sort(() => Math.random() - 0.5);
}
function CardFace({ card, faceDown = false }: { card: BJCard; faceDown?: boolean }) {
  const red = card.suit === "♥" || card.suit === "♦";
  if (faceDown) return (
    <div className="w-12 h-18 rounded-lg border-2 border-border bg-primary/20 flex items-center justify-center text-2xl" style={{ minWidth: 48, minHeight: 72 }}>🂠</div>
  );
  return (
    <div className={`w-12 rounded-lg border-2 border-border bg-card flex flex-col items-center justify-center p-1 shadow-sm ${red ? "text-red-500" : "text-foreground"}`} style={{ minWidth: 48, minHeight: 72 }}>
      <div className="text-sm font-bold leading-none">{card.rank}</div>
      <div className="text-xl leading-none">{card.suit}</div>
    </div>
  );
}

function BlackjackGame() {
  const scoreMutation = useMutation({
    mutationFn: (data: { game: string; score: number; tokensEarned: number }) =>
      apiRequest("POST", "/api/fun-zone/score", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const [phase, setPhase] = useState<"idle"|"betting"|"playing"|"dealer"|"result">("idle");
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(500);
  const [deck, setDeck] = useState<BJCard[]>([]);
  const [player, setPlayer] = useState<BJCard[]>([]);
  const [dealer, setDealer] = useState<BJCard[]>([]);
  const [result, setResult] = useState<"win"|"lose"|"push"|null>(null);

  const startGame = () => {
    const d = newDeck();
    const p = [d.pop()!, d.pop()!];
    const deal = [d.pop()!, d.pop()!];
    setDeck(d); setPlayer(p); setDealer(deal); setResult(null); setPhase("playing");
  };

  const hit = () => {
    const d = [...deck];
    const p = [...player, d.pop()!];
    setDeck(d); setPlayer(p);
    if (handTotal(p) > 21) endRound(p, dealer, true);
  };

  const stand = () => {
    let d = [...deck];
    let deal = [...dealer];
    while (handTotal(deal) < 17) deal.push(d.pop()!);
    setDeck(d); setDealer(deal);
    endRound(player, deal, false);
  };

  const endRound = (p: BJCard[], d: BJCard[], bust: boolean) => {
    const pt = handTotal(p); const dt = handTotal(d);
    let outcome: "win"|"lose"|"push";
    if (bust) outcome = "lose";
    else if (dt > 21 || pt > dt) outcome = "win";
    else if (pt < dt) outcome = "lose";
    else outcome = "push";
    setResult(outcome);
    setPhase("result");
    const newBal = balance + (outcome === "win" ? bet : outcome === "lose" ? -bet : 0);
    setBalance(Math.max(0, newBal));
    const tokens = outcome === "win" ? Math.ceil(bet / 50) : 0;
    if (tokens > 0) scoreMutation.mutate({ game: "blackjack", score: bet, tokensEarned: tokens });
  };

  const playerTotal = handTotal(player);
  const dealerTotal = handTotal(dealer);

  if (phase === "idle") return (
    <div className="text-center space-y-4 py-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-2">
        <span className="text-4xl">🃏</span>
      </div>
      <h3 className="text-xl font-bold">Blackjack</h3>
      <p className="text-muted-foreground">Beat the dealer to 21. Earn tokens when you win!</p>
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto text-sm">
        <div className="bg-muted rounded-lg p-2 text-center"><div className="font-bold text-green-500">Win</div><div className="text-xs text-muted-foreground">2× bet back</div></div>
        <div className="bg-muted rounded-lg p-2 text-center"><div className="font-bold text-amber-500">Tokens</div><div className="text-xs text-muted-foreground">per 50 bet</div></div>
        <div className="bg-muted rounded-lg p-2 text-center"><div className="font-bold text-primary">${balance}</div><div className="text-xs text-muted-foreground">balance</div></div>
      </div>
      <Button size="lg" onClick={() => setPhase("betting")} className="gap-2"><Play className="w-4 h-4" /> Play Blackjack</Button>
    </div>
  );

  if (phase === "betting") return (
    <div className="space-y-4 text-center">
      <h3 className="text-lg font-bold">Place Your Bet</h3>
      <p className="text-muted-foreground text-sm">Balance: ${balance}</p>
      <div className="flex gap-2 justify-center flex-wrap">
        {[10,25,50,100].filter(v => v <= balance).map(v => (
          <button key={v} onClick={() => setBet(v)}
            className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${bet === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
            ${v}
          </button>
        ))}
      </div>
      <p className="font-semibold">Bet: <span className="text-primary">${bet}</span></p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => setPhase("idle")}>Cancel</Button>
        <Button onClick={startGame} disabled={bet > balance}><Zap className="w-4 h-4 mr-2" />Deal!</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Balance: <span className="font-bold text-foreground">${balance}</span></span>
        <Badge variant="outline">Bet: ${bet}</Badge>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Dealer {phase === "result" ? `— ${dealerTotal}` : ""}</p>
          <div className="flex gap-1.5 flex-wrap">
            {dealer.map((c, i) => <CardFace key={i} card={c} faceDown={phase !== "result" && i === 1} />)}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">You — {playerTotal}</p>
          <div className="flex gap-1.5 flex-wrap">
            {player.map((c, i) => <CardFace key={i} card={c} />)}
          </div>
        </div>
      </div>

      {phase === "playing" && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={hit} disabled={playerTotal >= 21}>Hit</Button>
          <Button className="flex-1" variant="outline" onClick={stand}>Stand</Button>
        </div>
      )}

      {phase === "result" && (
        <div className={`rounded-lg p-4 text-center space-y-2 ${result === "win" ? "bg-green-500/10 border border-green-500/30" : result === "push" ? "bg-muted border" : "bg-red-500/10 border border-red-500/30"}`}>
          {result === "win" && <><CheckCircle2 className="w-7 h-7 text-green-500 mx-auto" /><p className="font-bold text-green-600">You Win! +${bet}</p></>}
          {result === "push" && <><p className="text-2xl">🤝</p><p className="font-bold">Push — bet returned</p></>}
          {result === "lose" && <><XCircle className="w-7 h-7 text-red-500 mx-auto" /><p className="font-bold text-red-600">Dealer wins. -${bet}</p></>}
          <div className="flex gap-2 justify-center mt-2">
            <Button size="sm" onClick={() => setPhase("betting")} disabled={balance === 0}>Play Again</Button>
            <Button size="sm" variant="outline" onClick={() => { setBalance(500); setPhase("idle"); }}>Reset</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunZonePage() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const games = [
    { id: "market-prediction", name: "Market Prediction", description: "Predict if stocks go UP or DOWN", icon: BarChart2, color: "text-blue-500", bg: "bg-blue-500/10", component: <MarketPredictionGame /> },
    { id: "investment-quiz", name: "Investment Quiz", description: "Test your finance knowledge", icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10", component: <InvestmentQuiz /> },
    { id: "strategy-challenge", name: "Strategy Challenge", description: "Allocate your portfolio & see results", icon: PieChart, color: "text-green-500", bg: "bg-green-500/10", component: <StrategyChallenge /> },
    { id: "blackjack", name: "Blackjack", description: "Beat the dealer to 21 and earn tokens!", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10", component: <BlackjackGame /> },
  ];

  const { data: leaderboard } = useQuery<{ userId: string; displayName: string; score: number }[]>({
    queryKey: ["/api/fun-zone/leaderboard/investment-quiz"],
    enabled: !activeGame,
  });

  if (activeGame) {
    const game = games.find(g => g.id === activeGame)!;
    return (
      <div className="container max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>← Back</Button>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${game.bg}`}>
              <game.icon className={`w-5 h-5 ${game.color}`} />
            </div>
            <h1 className="text-xl font-bold">{game.name}</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            {game.component}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary" /> Fun Zone
          </h1>
          <p className="text-muted-foreground mt-1">Play mini-games and earn classroom tokens!</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Coins className="w-5 h-5" />
            <span>{(user as any)?.classroomTokens ?? 0}</span>
          </div>
          <p className="text-xs text-muted-foreground">Your tokens</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {games.map((game) => (
          <Card
            key={game.id}
            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
            onClick={() => setActiveGame(game.id)}
            data-testid={`card-game-${game.id}`}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`p-4 rounded-xl ${game.bg} flex-shrink-0`}>
                <game.icon className={`w-8 h-8 ${game.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{game.name}</h3>
                <p className="text-sm text-muted-foreground">{game.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Coins className="w-3 h-3 text-amber-500" /> Earn tokens
                  </Badge>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Quiz High Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm font-bold w-5 text-muted-foreground">#{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{entry.displayName}</span>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Star className="w-3 h-3 text-amber-500" />{entry.score}/8
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
