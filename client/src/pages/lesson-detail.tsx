import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Paywall } from "@/components/paywall";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Lock,
} from "lucide-react";
import type { Lesson, LessonProgress, Quiz, QuizAttempt } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EnhancedQuizSection } from "@/components/enhanced-quiz";
import { LessonCompletionModal, type CompletionResult } from "@/components/lesson-completion-modal";

export default function LessonDetailPage() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/lessons/:id");
  const { toast } = useToast();
  const lessonId = params?.id;
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const { data: lesson, isLoading: lessonLoading } = useQuery<Lesson>({
    queryKey: ["/api/lessons", lessonId],
    enabled: !!lessonId,
  });

  const { data: allLessons } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: progress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/lessons/progress"],
    enabled: !!user,
  });

  const lessonProgress = progress?.find(p => p.lessonId === lessonId);
  const isCompleted = lessonProgress?.completed ?? false;

  // Prerequisites check
  const completedLessonIds = new Set(progress?.filter(p => p.completed).map(p => p.lessonId) ?? []);
  const prerequisiteIds: string[] = (lesson?.prerequisites as string[]) ?? [];
  const unmetPrerequisites = prerequisiteIds
    .filter(pid => !completedLessonIds.has(pid))
    .map(pid => allLessons?.find(l => l.id === pid))
    .filter(Boolean) as Lesson[];
  const prerequisitesMet = unmetPrerequisites.length === 0;

  // Quiz info — required to complete the lesson when one exists
  const { data: quizData } = useQuery<{ quiz: Quiz | null; bestAttempt: QuizAttempt | null }>({
    queryKey: ["/api/lessons", lessonId, "quiz"],
    enabled: !!lessonId,
  });
  const hasQuiz = !!quizData?.quiz && Array.isArray((quizData.quiz as any).questions) && (quizData.quiz as any).questions.length > 0;
  const bestQuizScore = quizData?.bestAttempt?.score ?? 0;
  const bestQuizTotal = quizData?.bestAttempt?.total ?? 0;
  const passedQuiz = bestQuizTotal > 0 && (bestQuizScore / bestQuizTotal) >= 0.6;
  const canMarkComplete = !hasQuiz || passedQuiz;

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/lessons/${lessonId}/complete`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/daily-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academy/assignments"] });
      refreshUser();
      setCompletionResult({
        xpAwarded: data.xpAwarded,
        bonusXp: data.bonusXp,
        newXp: data.newXp,
        oldLevel: data.oldLevel,
        newLevel: data.newLevel,
        leveledUp: data.leveledUp,
        streak: data.streak,
        bestStreak: data.bestStreak,
        streakProtected: data.streakProtected,
        isNewCompletion: data.isNewCompletion,
      });
      setShowCompletion(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark lesson as complete.",
        variant: "destructive",
      });
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner": return "bg-success/10 text-success";
      case "intermediate": return "bg-chart-4/10 text-chart-4";
      case "advanced": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const currentIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1;
  const prevLesson = currentIndex > 0 ? allLessons?.[currentIndex - 1] : null;
  const nextLesson = currentIndex < (allLessons?.length ?? 0) - 1 ? allLessons?.[currentIndex + 1] : null;

  if (lessonLoading) {
    return (
      <Paywall featureName="Lessons">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Paywall>
    );
  }

  if (!lesson) {
    return (
      <Paywall featureName="Lessons">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lesson not found</h3>
              <p className="text-muted-foreground mb-4">
                This lesson doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate("/lessons")} data-testid="button-back-to-lessons">
                Back to Lessons
              </Button>
            </CardContent>
          </Card>
        </div>
      </Paywall>
    );
  }

  return (
    <Paywall featureName="Lessons">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate("/lessons")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lessons
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Badge
              variant="secondary"
              className={getDifficultyColor(lesson.difficulty)}
            >
              {lesson.difficulty}
            </Badge>
            <Badge variant="outline">
              {lesson.category}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {lesson.duration} min
            </div>
            {isCompleted && (
              <div className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-lesson-title">{lesson.title}</h1>
          <p className="text-muted-foreground text-lg">{lesson.description}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Lesson Content</CardTitle>
          </CardHeader>
          <CardContent>
            {lesson.content ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
                data-testid="lesson-content"
              />
            ) : (
              <p className="text-muted-foreground italic">
                No content available for this lesson yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Prerequisites gate */}
        {!prerequisitesMet && (
          <div className="mb-6 rounded-2xl border border-amber-300/50 dark:border-amber-700/50 overflow-hidden">
            <div className="px-5 py-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-800/50 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">Complete prerequisites first</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80">Finish the lessons below before completing this one</p>
              </div>
            </div>
            <div className="p-4 space-y-2 bg-card">
              {unmetPrerequisites.map(prereq => (
                <a key={prereq.id} href={`/lessons/${prereq.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-all group">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{prereq.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{prereq.difficulty} · {prereq.duration} min</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {lesson.requiresSimulation && (
          <div className="mb-6 p-4 rounded-xl border border-blue-200/60 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <BarChart3 className="h-4.5 w-4.5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">Simulator Practice Recommended</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                This lesson is enhanced by hands-on practice. Try placing a few trades in the{" "}
                <a href="/simulator" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">Simulator</a>{" "}
                before marking it complete to reinforce what you've learned.
              </p>
            </div>
          </div>
        )}

        <EnhancedQuizSection
          lessonId={lesson.id}
          onPassed={() => {
            if (!isCompleted) markCompleteMutation.mutate();
          }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-2">
            {prevLesson && (
              <Button
                variant="outline"
                onClick={() => navigate(`/lessons/${prevLesson.id}`)}
                className="gap-2"
                data-testid="button-prev-lesson"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!prerequisitesMet) {
                  toast({ title: "Prerequisites required", description: "Complete the required lessons first.", variant: "destructive" });
                  return;
                }
                if (!canMarkComplete) {
                  toast({ title: "Pass the quiz first", description: "Score at least 60% on the quiz below to complete this lesson.", variant: "destructive" });
                  document.querySelector("[data-testid='answer-option-0']")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  return;
                }
                markCompleteMutation.mutate();
              }}
              disabled={markCompleteMutation.isPending}
              className="gap-2"
              variant={isCompleted ? "outline" : (!prerequisitesMet || !canMarkComplete) ? "secondary" : "default"}
              data-testid="button-mark-complete"
              title={!prerequisitesMet ? "Complete prerequisites first" : !canMarkComplete ? "Pass the quiz to complete this lesson" : undefined}
            >
              {!prerequisitesMet ? <Lock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {markCompleteMutation.isPending
                ? "Saving..."
                : isCompleted
                ? "Completed"
                : !prerequisitesMet
                ? "Prerequisites Required"
                : !canMarkComplete
                ? "Take Quiz to Complete"
                : "Mark Complete"}
            </Button>
            {nextLesson && (
              <Button
                variant={isCompleted ? "default" : "outline"}
                onClick={() => navigate(`/lessons/${nextLesson.id}`)}
                className="gap-2"
                data-testid="button-next-lesson"
              >
                Next Lesson
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <LessonCompletionModal
        open={showCompletion}
        onClose={() => setShowCompletion(false)}
        result={completionResult}
        onNext={nextLesson ? () => { setShowCompletion(false); navigate(`/lessons/${nextLesson.id}`); } : undefined}
        hasNext={!!nextLesson}
      />
    </Paywall>
  );
}
