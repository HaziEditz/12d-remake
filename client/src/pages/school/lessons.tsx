import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import SchoolLayout from "@/layouts/school-layout";
import { BookOpen, CheckCircle, Lock, Clock, Star, Zap, Play, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { XpProgressHeader } from "@/components/xp-progress-header";
import { StreakBadge } from "@/components/streak-badge";
import { DailyChallengesCard } from "@/components/daily-challenges-card";
import { LuckyBonusCard } from "@/components/lucky-bonus-card";
import { LearningStatsCard } from "@/components/learning-stats-card";
import { AssignmentsPanel } from "@/components/assignments-panel";

const difficultyColors: Record<string, string> = {
  beginner: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  intermediate: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

const categoryEmojis: Record<string, string> = {
  basics: "📖",
  stocks: "📈",
  crypto: "🪙",
  forex: "💱",
  risk: "🛡️",
  analysis: "🔬",
  strategies: "🎯",
  psychology: "🧠",
  options: "⚙️",
  etf: "📊",
};

export default function SchoolLessons() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: classData } = useQuery<any>({
    queryKey: ["/api/classroom"],
    enabled: user?.role === "student",
  });

  const { data: lessons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: progressList = [] } = useQuery<any[]>({
    queryKey: ["/api/lessons/progress"],
  });

  const ageGroup = classData?.class?.ageGroup ?? "high_school";
  const isPrimary = ageGroup === "primary";

  const completedIds = new Set((progressList as any[]).filter(p => p.completed).map(p => p.lessonId));

  const grouped = (lessons as any[]).reduce((acc: Record<string, any[]>, l: any) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category].push(l);
    return acc;
  }, {});

  const totalCompleted = completedIds.size;
  const totalLessons = lessons.length;
  const progressPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  const cardBg = isPrimary ? "bg-amber-50 border-amber-200" : "bg-[#0d1a2e] border-[#1e3050]";
  const headingColor = isPrimary ? "text-amber-900" : "text-white";
  const subColor = isPrimary ? "text-amber-700" : "text-slate-400";
  const accentColor = isPrimary ? "bg-amber-500" : "bg-teal-500";

  return (
    <SchoolLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentColor}`}>
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-black ${headingColor}`}>
                {isPrimary ? "📚 Learning Adventures!" : "Lessons"}
              </h1>
              <p className={`text-sm ${subColor}`}>
                {isPrimary ? "Choose a lesson to start learning!" : "Master trading concepts at your own pace"}
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-bold ${headingColor}`}>
                {isPrimary ? "⭐ Your Progress" : "Overall Progress"}
              </span>
              <span className={`text-sm font-black ${isPrimary ? "text-amber-600" : "text-teal-400"}`}>
                {totalCompleted}/{totalLessons} complete
              </span>
            </div>
            <div className={`w-full h-3 rounded-full ${isPrimary ? "bg-amber-200" : "bg-white/10"}`}>
              <div
                className={`h-3 rounded-full transition-all duration-500 ${isPrimary ? "bg-amber-500" : "bg-teal-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className={`text-xs mt-1.5 ${subColor}`}>{progressPct}% complete</p>
          </div>
        </div>

        {/* Gamification grid */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 space-y-4">
            <XpProgressHeader variant={isPrimary ? "primary" : "default"} />
            <LearningStatsCard variant={isPrimary ? "primary" : "default"} />
          </div>
          <div className="space-y-4">
            <StreakBadge variant={isPrimary ? "primary" : "default"} />
            <AssignmentsPanel variant={isPrimary ? "primary" : "default"} linkBase="/school/lessons" />
            <LuckyBonusCard variant={isPrimary ? "primary" : "default"} />
            <DailyChallengesCard variant={isPrimary ? "primary" : "default"} />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-44 rounded-2xl border animate-pulse ${cardBg}`} />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className={`h-14 w-14 mx-auto mb-4 opacity-30 ${isPrimary ? "text-amber-500" : "text-teal-500"}`} />
            <p className={`text-lg font-bold ${headingColor}`}>No lessons available yet</p>
            <p className={`text-sm ${subColor}`}>Your teacher will add lessons soon</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, catLessons]) => (
              <div key={category}>
                <h2 className={`font-black text-base mb-3 flex items-center gap-2 ${headingColor}`}>
                  <span className="text-xl">{categoryEmojis[category] ?? "📘"}</span>
                  <span className="capitalize">{category}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isPrimary ? "bg-amber-200 text-amber-700" : "bg-teal-500/20 text-teal-400"}`}>
                    {(catLessons as any[]).filter(l => completedIds.has(l.id)).length}/{(catLessons as any[]).length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(catLessons as any[]).map((lesson: any, idx: number) => {
                    const isCompleted = completedIds.has(lesson.id);
                    const isLocked = idx > 0 && !completedIds.has((catLessons as any[])[idx - 1]?.id);
                    return (
                      <button
                        key={lesson.id}
                        data-testid={`lesson-card-${lesson.id}`}
                        onClick={() => !isLocked && setLocation(`/lessons/${lesson.id}`)}
                        disabled={isLocked}
                        className={`text-left p-5 rounded-2xl border transition-all duration-200 group ${
                          isLocked
                            ? `opacity-50 cursor-not-allowed ${cardBg}`
                            : isCompleted
                            ? isPrimary
                              ? "bg-amber-100 border-amber-300 hover:bg-amber-200"
                              : "bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/15"
                            : `${cardBg} hover:border-${isPrimary ? "amber" : "teal"}-500/50 hover:scale-[1.02]`
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                            isCompleted
                              ? isPrimary ? "bg-amber-500" : "bg-teal-600"
                              : isLocked ? "bg-white/10" : isPrimary ? "bg-amber-200" : "bg-white/10"
                          }`}>
                            {isLocked ? <Lock className="h-4 w-4 text-slate-500" /> :
                             isCompleted ? <CheckCircle className="h-4 w-4 text-white" /> :
                             <span>{categoryEmojis[lesson.category] ?? "📘"}</span>}
                          </div>
                          {!isLocked && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${difficultyColors[lesson.difficulty] ?? difficultyColors.beginner}`}>
                              {lesson.difficulty}
                            </span>
                          )}
                        </div>
                        <h3 className={`font-bold text-sm leading-tight mb-1 ${headingColor}`}>
                          {isPrimary && isCompleted ? "⭐ " : ""}{lesson.title}
                        </h3>
                        <p className={`text-xs line-clamp-2 mb-3 ${subColor}`}>{lesson.description}</p>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 text-xs ${subColor}`}>
                            <Clock className="h-3 w-3" />
                            <span>{lesson.duration}m</span>
                          </div>
                          {!isLocked && !isCompleted && (
                            <div className={`ml-auto flex items-center gap-1 text-xs font-bold ${isPrimary ? "text-amber-600" : "text-teal-400"} group-hover:gap-2 transition-all`}>
                              <Play className="h-3 w-3" />
                              <span>Start</span>
                              <ChevronRight className="h-3 w-3" />
                            </div>
                          )}
                          {isCompleted && (
                            <div className={`ml-auto flex items-center gap-1 text-xs font-bold ${isPrimary ? "text-amber-600" : "text-teal-400"}`}>
                              <Zap className="h-3 w-3" />
                              <span>+{lesson.xpReward ?? 10} XP</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
