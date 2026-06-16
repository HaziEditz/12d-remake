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
                if (!canMarkComplete) {
                  toast({ title: "Pass the quiz first", description: "Score at least 60% on the quiz below to complete this lesson.", variant: "destructive" });
                  document.querySelector("[data-testid='answer-option-0']")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  return;
                }
                markCompleteMutation.mutate();
              }}
              disabled={markCompleteMutation.isPending}
              className="gap-2"
              variant={isCompleted ? "outline" : !canMarkComplete ? "secondary" : "default"}
              data-testid="button-mark-complete"
              title={!canMarkComplete ? "Pass the quiz to complete this lesson" : undefined}
            >
              <CheckCircle2 className="h-4 w-4" />
              {markCompleteMutation.isPending
                ? "Saving..."
                : isCompleted
                ? "Completed"
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
