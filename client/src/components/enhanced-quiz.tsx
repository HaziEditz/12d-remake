import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  HelpCircle, AlertCircle, RefreshCw, CheckCircle2, XCircle, Flame, Clock, Sparkles, Zap, Trophy, ChevronRight,
} from "lucide-react";
import type { Quiz, QuizAttempt } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fireBurst } from "@/lib/confetti";
import { playClickSound, playErrorSound, playLessonCompleteSound } from "@/lib/sounds";
import { useAuth } from "@/lib/auth-context";

const CORRECT_MESSAGES = ["Nice!", "Boom!", "Got it!", "Sweet!", "Yes!", "Easy!", "Crisp!"];
const HYPE_AT_COMBO: Record<number, string> = {
  3: "🔥 Hot streak!",
  5: "🚀 Unstoppable!",
  7: "⭐ Legendary!",
  10: "👑 GODLIKE!",
};

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export function EnhancedQuizSection({ lessonId, onPassed }: { lessonId: string; onPassed?: () => void }) {
  const { refreshUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [feedbackIndex, setFeedbackIndex] = useState<number | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [started, setStarted] = useState(false);
  const [timedMode, setTimedMode] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [comboToast, setComboToast] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timeBonus, setTimeBonus] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [popupXp, setPopupXp] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: quizData, isLoading } = useQuery<{ quiz: Quiz; bestAttempt: QuizAttempt | null }>({
    queryKey: ["/api/lessons", lessonId, "quiz"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { score: number; total: number; comboMultiplier: number; timeBonus: number; bestCombo: number }) => {
      const res = await apiRequest("POST", `/api/lessons/${lessonId}/quiz/attempt`, data);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", lessonId, "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/daily-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/stats"] });
      refreshUser();
      if (result?.passed && onPassed) onPassed();
    },
  });

  const questions = (quizData?.quiz?.questions as Question[]) || [];
  const currentQuestion = questions[currentIndex];

  // Timer for timed mode
  useEffect(() => {
    if (!started || showResults || feedbackIndex !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (!timedMode) return;
    setTimeLeft(15);
    setQuestionStartTime(Date.now());
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAnswer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, currentIndex, timedMode, showResults, feedbackIndex]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!quizData?.quiz || questions.length === 0) return null;
  const { bestAttempt } = quizData;

  function handleAnswer(answerIdx: number) {
    if (feedbackIndex !== null) return;
    const correctIdx = currentQuestion.correctIndex;
    const isCorrect = answerIdx === correctIdx;
    setFeedbackIndex(answerIdx);
    setFeedbackCorrect(isCorrect);

    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = answerIdx;
    setSelectedAnswers(newAnswers);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > bestCombo) setBestCombo(newCombo);

      // Time bonus calculation
      let bonus = 0;
      if (timedMode) {
        const elapsed = (Date.now() - questionStartTime) / 1000;
        bonus = Math.max(0, Math.floor(15 - elapsed));
        setTimeBonus((tb) => tb + bonus);
      }
      const popup = 5 * Math.max(1, comboMultiplier(newCombo)) + bonus;
      setPopupXp(popup);
      playClickSound();
      if (HYPE_AT_COMBO[newCombo]) {
        setComboToast(HYPE_AT_COMBO[newCombo]);
        fireBurst();
        setTimeout(() => setComboToast(null), 1500);
      }
    } else {
      setCombo(0);
      setPopupXp(null);
      playErrorSound();
    }
    setTimeout(() => setPopupXp(null), 900);
  }

  function comboMultiplier(c: number) {
    if (c >= 10) return 3;
    if (c >= 7) return 2.5;
    if (c >= 5) return 2;
    if (c >= 3) return 1.5;
    return 1;
  }

  function nextQuestion() {
    setFeedbackIndex(null);
    setFeedbackCorrect(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    let score = 0;
    selectedAnswers.forEach((a, i) => { if (a === questions[i].correctIndex) score++; });
    setShowResults(true);
    const mult = comboMultiplier(bestCombo);
    submitMutation.mutate({ score, total: questions.length, comboMultiplier: mult, timeBonus, bestCombo });
    if (score / questions.length >= 0.8) {
      fireBurst();
      playLessonCompleteSound();
    }
  }

  function reset() {
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setFeedbackIndex(null);
    setFeedbackCorrect(null);
    setShowResults(false);
    setStarted(true);
    setCombo(0);
    setBestCombo(0);
    setTimeBonus(0);
    setQuestionStartTime(Date.now());
    setTimeLeft(15);
  }

  if (!started && !showResults) {
    return (
      <Card className="mb-8 border-primary/20 bg-primary/5 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle>Lesson Quiz</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bestAttempt && (
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Your Best Score</p>
              <p className="text-2xl font-bold text-primary">
                {bestAttempt.score} / {bestAttempt.total}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({Math.round((bestAttempt.score / bestAttempt.total) * 100)}%)
                </span>
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Answer correctly in a row to build a combo and earn bonus XP. Pass with at least 60% to unlock rewards!
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl border bg-background">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <Label htmlFor="timed-mode" className="font-bold cursor-pointer">Challenge Mode</Label>
                <p className="text-[11px] text-muted-foreground">15 seconds per question. Faster = more XP.</p>
              </div>
            </div>
            <Switch id="timed-mode" checked={timedMode} onCheckedChange={setTimedMode} data-testid="switch-timed-mode" />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => { setStarted(true); setQuestionStartTime(Date.now()); }} className="w-full sm:w-auto gap-2" data-testid="button-start-quiz">
            <Zap className="h-4 w-4" />
            {bestAttempt ? "Retake Quiz" : "Start Quiz"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (showResults) {
    const score = selectedAnswers.reduce((acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 60;

    return (
      <Card className="mb-8 overflow-hidden">
        <CardHeader className={`${passed ? "bg-emerald-500/10" : "bg-amber-500/10"} border-b`}>
          <CardTitle className="text-center">{passed ? "Quiz Passed! 🎉" : "Try Again!"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center h-24 w-24 rounded-full ${passed ? "bg-emerald-500/15" : "bg-amber-500/15"} mb-4`}>
              <span className={`text-3xl font-black ${passed ? "text-emerald-500" : "text-amber-500"}`}>{pct}%</span>
            </div>
            <h3 className="text-2xl font-bold mb-1" data-testid="text-quiz-score">
              {score} / {questions.length} Correct
            </h3>
            <p className="text-muted-foreground">
              {pct >= 80 ? "Excellent work! You've mastered this lesson." :
               pct >= 60 ? "Nice work! You passed." :
               "Keep studying! Try again to pass."}
            </p>
          </div>

          {bestCombo >= 3 && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-500">Best combo: {bestCombo}× ({comboMultiplier(bestCombo)}× XP)</span>
              </div>
              {timeBonus > 0 && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-500">+{timeBonus} time bonus</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-3">
                  {selectedAnswers[idx] === q.correctIndex ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium">{q.question}</p>
                </div>
                <div className="grid gap-2 ml-8">
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`text-sm p-2 rounded ${
                        oi === q.correctIndex
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/30"
                          : oi === selectedAnswers[idx]
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-3 ml-8 p-3 bg-primary/5 rounded-md flex gap-2 text-sm border border-primary/10">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                    <p><span className="font-bold">Explanation:</span> {q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4 bg-muted/20 border-t py-6">
          <Button variant="outline" onClick={reset} className="gap-2" data-testid="button-retake-quiz">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Question view
  const q = currentQuestion;
  const correctIdx = q.correctIndex;
  const isAnswered = feedbackIndex !== null;

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Question {currentIndex + 1} of {questions.length}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {combo > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30" data-testid="combo-display">
                <Flame className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                <span className="text-xs font-black text-orange-500">{combo}× combo</span>
              </div>
            )}
            {timedMode && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${timeLeft <= 5 ? "bg-destructive/15 border border-destructive/30" : "bg-amber-500/15 border border-amber-500/30"}`} data-testid="timer-display">
                <Clock className={`h-3.5 w-3.5 ${timeLeft <= 5 ? "text-destructive" : "text-amber-500"}`} />
                <span className={`text-xs font-black tabular-nums ${timeLeft <= 5 ? "text-destructive" : "text-amber-500"}`}>{timeLeft}s</span>
              </div>
            )}
          </div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </CardHeader>

      <CardContent className="pt-6 relative">
        {comboToast && (
          <div className="absolute inset-x-0 -top-2 flex justify-center pointer-events-none z-10">
            <div className="px-4 py-2 rounded-full bg-orange-500 text-white font-black text-sm shadow-lg animate-bounce">
              {comboToast}
            </div>
          </div>
        )}
        {popupXp !== null && (
          <div className="absolute right-4 top-2 pointer-events-none z-10">
            <div className="px-3 py-1.5 rounded-full bg-yellow-400 text-yellow-900 font-black text-sm shadow-lg" style={{ animation: "xpFloat 0.9s ease-out forwards" }}>
              +{popupXp} XP
            </div>
            <style>{`@keyframes xpFloat { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 30% { transform: translateY(-10px) scale(1.1); opacity: 1; } 100% { transform: translateY(-40px) scale(1); opacity: 0; } }`}</style>
          </div>
        )}

        <h3 className="text-lg sm:text-xl font-semibold mb-6">{q.question}</h3>

        <div className="grid gap-3">
          {q.options.map((opt, idx) => {
            let stateClass = "border bg-background hover:bg-muted/50 cursor-pointer";
            if (isAnswered) {
              if (idx === correctIdx) {
                stateClass = "border-2 border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
              } else if (idx === feedbackIndex) {
                stateClass = "border-2 border-destructive bg-destructive/10 text-destructive animate-shake";
              } else {
                stateClass = "border bg-muted/30 opacity-60";
              }
            }
            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={isAnswered}
                className={`w-full text-left flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${stateClass}`}
                data-testid={`answer-option-${idx}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  isAnswered && idx === correctIdx ? "bg-emerald-500 text-white" :
                  isAnswered && idx === feedbackIndex ? "bg-destructive text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isAnswered && idx === correctIdx ? <CheckCircle2 className="h-4 w-4" /> :
                   isAnswered && idx === feedbackIndex ? <XCircle className="h-4 w-4" /> :
                   String.fromCharCode(65 + idx)}
                </div>
                <span className="font-medium flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={`mt-4 p-3 rounded-xl border ${feedbackCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/5 border-destructive/30"}`}>
            <div className="flex items-start gap-2">
              {feedbackCorrect ? (
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-bold text-sm ${feedbackCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {feedbackCorrect ? CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)] : "Not quite — here's why:"}
                </p>
                {q.explanation && <p className="text-sm text-muted-foreground mt-1">{q.explanation}</p>}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end border-t pt-4">
        <Button onClick={nextQuestion} disabled={!isAnswered} className="gap-2" data-testid="button-next-question">
          {currentIndex === questions.length - 1 ? (
            <>Finish <Trophy className="h-4 w-4" /></>
          ) : (
            <>Next <ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </CardFooter>

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </Card>
  );
}
