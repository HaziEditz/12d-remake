import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Plus,
  Trash2,
  BookOpen,
  Settings,
  Users,
  BarChart3,
  Clock,
  Save,
  EyeOff,
  Loader2,
  FileText,
  ArrowLeft,
  Lightbulb,
  TrendingUp,
  Target,
  Tag,
  DollarSign,
  HelpCircle,
  ChevronRight,
  Eye,
  CreditCard,
  CalendarDays,
  PieChart,
  Activity,
  Shield,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Lock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Lesson, TradingTip, MarketInsight, Strategy, User, Quiz } from "@shared/schema";

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.string().min(1, "Difficulty is required"),
  duration: z.coerce.number().positive("Duration must be positive"),
  order: z.coerce.number().min(0),
  isPublished: z.boolean().default(true),
  requiresSimulation: z.boolean().default(false),
  prerequisites: z.array(z.string()).default([]),
  simDescription: z.string().default(""),
  simStartingBalance: z.coerce.number().positive().default(10000),
  simTargetType: z.enum(["profit_pct", "profit_amount", "any_profit", "complete_trade"]).default("profit_pct"),
  simTargetValue: z.coerce.number().positive().default(10),
  simAllowedSymbols: z.string().default(""),
});

const tipSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.string().min(1, "Difficulty is required"),
  iconName: z.string().min(1, "Icon is required"),
  isPublished: z.boolean().default(true),
});

const insightSchema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().min(1, "Summary is required"),
  sentiment: z.string().min(1, "Sentiment is required"),
  sector: z.string().min(1, "Sector is required"),
  isPublished: z.boolean().default(true),
});

const strategySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.string().min(1, "Difficulty is required"),
  isPublished: z.boolean().default(true),
});

type LessonFormData = z.infer<typeof lessonSchema>;
type TipFormData = z.infer<typeof tipSchema>;
type InsightFormData = z.infer<typeof insightSchema>;
type StrategyFormData = z.infer<typeof strategySchema>;

function getDifficultyBadge(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "beginner": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800";
    case "intermediate": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800";
    case "advanced": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function getSentimentBadge(sentiment: string) {
  switch (sentiment) {
    case "bullish": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800";
    case "bearish": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function QuizEditor({ lessonId }: { lessonId: string }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [lastLoadedLessonId, setLastLoadedLessonId] = useState<string | null>(null);

  const { data: quiz, isLoading } = useQuery<Quiz | null>({
    queryKey: ["/api/admin/quizzes", lessonId],
    enabled: !!lessonId,
  });

  if (quiz && lastLoadedLessonId !== lessonId) {
    setQuestions((quiz.questions as any[]) || []);
    setLastLoadedLessonId(lessonId);
  } else if (!quiz && !isLoading && lastLoadedLessonId !== lessonId) {
    setQuestions([]);
    setLastLoadedLessonId(lessonId);
  }

  const saveQuizMutation = useMutation({
    mutationFn: (data: { lessonId: string; questions: any[] }) =>
      apiRequest("POST", "/api/admin/quizzes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quizzes", lessonId] });
      toast({ title: "Quiz saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save quiz", variant: "destructive" });
    },
  });

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
  };

  const removeQuestion = (index: number) => setQuestions(questions.filter((_, i) => i !== index));

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQ = [...questions];
    newQ[index] = { ...newQ[index], [field]: value };
    setQuestions(newQ);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQ = [...questions];
    newQ[qIndex].options[oIndex] = value;
    setQuestions(newQ);
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mt-8 pt-8 border-t">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold">Quiz Assessment</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{questions.length} question{questions.length !== 1 ? "s" : ""} defined</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Question
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveQuizMutation.mutate({ lessonId, questions })}
            disabled={saveQuizMutation.isPending}
          >
            {saveQuizMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Quiz
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl text-center">
          <HelpCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No quiz questions yet</p>
          <Button variant="link" size="sm" onClick={addQuestion} className="mt-1">
            Add the first question
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIdx) => (
            <Card key={qIdx} className="border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {qIdx + 1}
                  </span>
                  Question {qIdx + 1}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIdx)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Question</Label>
                  <Input
                    value={q.question}
                    onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                    placeholder="Enter your question..."
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt: string, oIdx: number) => (
                    <div key={oIdx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs text-muted-foreground">Option {oIdx + 1}</Label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() => updateQuestion(qIdx, "correctIndex", oIdx)}
                            className="h-3 w-3 accent-primary"
                          />
                          <span className="text-[10px] text-muted-foreground font-medium">Correct</span>
                        </label>
                      </div>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                        className={`h-9 text-sm ${q.correctIndex === oIdx ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : ""}`}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Explanation (optional)</Label>
                  <Textarea
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)}
                    placeholder="Explain why the correct answer is right..."
                    className="min-h-[70px] text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addQuestion} className="w-full h-10 border-dashed text-muted-foreground hover:text-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Question
          </Button>
        </div>
      )}
    </div>
  );
}

const navItems = [
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "tips", label: "Trading Tips", icon: Lightbulb },
  { id: "insights", label: "Market Insights", icon: TrendingUp },
  { id: "strategies", label: "Strategies", icon: Target },
  { id: "promo-codes", label: "Promo Codes", icon: Tag },
  { id: "financial", label: "Financials", icon: DollarSign },
  { id: "balances", label: "Balances", icon: Shield },
];

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("lessons");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedTip, setSelectedTip] = useState<TradingTip | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<MarketInsight | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isCreatingTip, setIsCreatingTip] = useState(false);
  const [isCreatingInsight, setIsCreatingInsight] = useState(false);
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({ queryKey: ["/api/admin/lessons"] });
  const { data: tips } = useQuery<TradingTip[]>({ queryKey: ["/api/admin/tips"] });
  const { data: insights } = useQuery<MarketInsight[]>({ queryKey: ["/api/admin/insights"] });
  const { data: strategies } = useQuery<Strategy[]>({ queryKey: ["/api/admin/strategies"] });
  const { data: stats } = useQuery<{ users: number; lessons: number; trades: number }>({ queryKey: ["/api/admin/stats"] });
  const { data: financialStats, isLoading: financialLoading } = useQuery<{
    totalUsers: number;
    activeSubscribers: number;
    trialUsers: number;
    byTier: Record<string, number>;
    recentSignups: User[];
  }>({
    queryKey: ["/api/admin/financial"],
    enabled: activeTab === "financial",
  });

  const lessonForm = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", description: "", content: "", category: "basics", difficulty: "beginner", duration: 10, order: 0, isPublished: true, requiresSimulation: false, prerequisites: [], simDescription: "", simStartingBalance: 10000, simTargetType: "profit_pct", simTargetValue: 10, simAllowedSymbols: "" },
  });
  const tipForm = useForm<TipFormData>({
    resolver: zodResolver(tipSchema),
    defaultValues: { title: "", content: "", category: "strategy", difficulty: "beginner", iconName: "Lightbulb", isPublished: true },
  });
  const insightForm = useForm<InsightFormData>({
    resolver: zodResolver(insightSchema),
    defaultValues: { title: "", summary: "", sentiment: "neutral", sector: "Macro", isPublished: true },
  });
  const strategyForm = useForm<StrategyFormData>({
    resolver: zodResolver(strategySchema),
    defaultValues: { title: "", description: "", content: "", category: "trend", difficulty: "beginner", isPublished: true },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const res = await apiRequest("POST", "/api/admin/lessons", data);
      return res.json();
    },
    onSuccess: (newLesson: Lesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Lesson created — you can now add a quiz below" });
      setIsCreatingLesson(false);
      setSelectedLesson(newLesson);
      lessonForm.reset({
        title: newLesson.title, description: newLesson.description, content: newLesson.content,
        category: newLesson.category, difficulty: newLesson.difficulty, duration: newLesson.duration,
        order: newLesson.order, isPublished: newLesson.isPublished ?? true,
        requiresSimulation: newLesson.requiresSimulation ?? false,
        prerequisites: (newLesson.prerequisites as string[]) ?? [],
      });
    },
    onError: () => toast({ title: "Failed to create lesson", variant: "destructive" }),
  });
  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LessonFormData }) => apiRequest("PATCH", `/api/admin/lessons/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Lesson updated" });
    },
    onError: () => toast({ title: "Failed to update lesson", variant: "destructive" }),
  });
  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      toast({ title: "Lesson deleted" });
      setSelectedLesson(null);
      setIsCreatingLesson(false);
    },
    onError: () => toast({ title: "Failed to delete lesson", variant: "destructive" }),
  });

  const createTipMutation = useMutation({
    mutationFn: (data: TipFormData) => apiRequest("POST", "/api/admin/tips", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tips"] });
      toast({ title: "Tip created" });
      setIsCreatingTip(false);
      setSelectedTip(null);
      tipForm.reset();
    },
    onError: () => toast({ title: "Failed to create tip", variant: "destructive" }),
  });
  const updateTipMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TipFormData }) => apiRequest("PATCH", `/api/admin/tips/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tips"] });
      toast({ title: "Tip updated" });
    },
    onError: () => toast({ title: "Failed to update tip", variant: "destructive" }),
  });
  const deleteTipMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tips"] });
      toast({ title: "Tip deleted" });
      setSelectedTip(null);
      setIsCreatingTip(false);
    },
    onError: () => toast({ title: "Failed to delete tip", variant: "destructive" }),
  });

  const createInsightMutation = useMutation({
    mutationFn: (data: InsightFormData) => apiRequest("POST", "/api/admin/insights", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      toast({ title: "Insight created" });
      setIsCreatingInsight(false);
      setSelectedInsight(null);
      insightForm.reset();
    },
    onError: () => toast({ title: "Failed to create insight", variant: "destructive" }),
  });
  const updateInsightMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsightFormData }) => apiRequest("PATCH", `/api/admin/insights/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      toast({ title: "Insight updated" });
    },
    onError: () => toast({ title: "Failed to update insight", variant: "destructive" }),
  });
  const deleteInsightMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/insights/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      toast({ title: "Insight deleted" });
      setSelectedInsight(null);
      setIsCreatingInsight(false);
    },
    onError: () => toast({ title: "Failed to delete insight", variant: "destructive" }),
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data: StrategyFormData) => apiRequest("POST", "/api/admin/strategies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({ title: "Strategy created" });
      setIsCreatingStrategy(false);
      setSelectedStrategy(null);
      strategyForm.reset();
    },
    onError: () => toast({ title: "Failed to create strategy", variant: "destructive" }),
  });
  const updateStrategyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StrategyFormData }) => apiRequest("PATCH", `/api/admin/strategies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({ title: "Strategy updated" });
    },
    onError: () => toast({ title: "Failed to update strategy", variant: "destructive" }),
  });
  const deleteStrategyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/strategies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({ title: "Strategy deleted" });
      setSelectedStrategy(null);
      setIsCreatingStrategy(false);
    },
    onError: () => toast({ title: "Failed to delete strategy", variant: "destructive" }),
  });

  const handleSelectLesson = (lesson: Lesson) => {
    setIsCreatingLesson(false);
    setSelectedLesson(lesson);
    const sc = lesson.simulationChallenge as any;
    lessonForm.reset({
      title: lesson.title, description: lesson.description, content: lesson.content,
      category: lesson.category, difficulty: lesson.difficulty, duration: lesson.duration,
      order: lesson.order, isPublished: lesson.isPublished ?? true,
      requiresSimulation: lesson.requiresSimulation ?? false,
      prerequisites: (lesson.prerequisites as string[]) ?? [],
      simDescription: sc?.description ?? "",
      simStartingBalance: sc?.startingBalance ?? 10000,
      simTargetType: sc?.targetType ?? "profit_pct",
      simTargetValue: sc?.targetValue ?? 10,
      simAllowedSymbols: (sc?.allowedSymbols ?? []).join(", "),
    });
  };
  const handleSelectTip = (tip: TradingTip) => {
    setIsCreatingTip(false);
    setSelectedTip(tip);
    tipForm.reset({ title: tip.title, content: tip.content, category: tip.category, difficulty: tip.difficulty, iconName: tip.iconName, isPublished: tip.isPublished ?? true });
  };
  const handleSelectInsight = (insight: MarketInsight) => {
    setIsCreatingInsight(false);
    setSelectedInsight(insight);
    insightForm.reset({ title: insight.title, summary: insight.summary, sentiment: insight.sentiment, sector: insight.sector, isPublished: insight.isPublished ?? true });
  };
  const handleSelectStrategy = (strategy: Strategy) => {
    setIsCreatingStrategy(false);
    setSelectedStrategy(strategy);
    strategyForm.reset({ title: strategy.title, description: strategy.description, content: strategy.content, category: strategy.category, difficulty: strategy.difficulty, isPublished: strategy.isPublished ?? true });
  };

  const handleCreateNewLesson = () => {
    setSelectedLesson(null);
    setIsCreatingLesson(true);
    lessonForm.reset({ title: "", description: "", content: "", category: "basics", difficulty: "beginner", duration: 10, order: lessons?.length ?? 0, isPublished: true, requiresSimulation: false, prerequisites: [], simDescription: "", simStartingBalance: 10000, simTargetType: "profit_pct", simTargetValue: 10, simAllowedSymbols: "" });
  };
  const handleCreateNewTip = () => {
    setSelectedTip(null);
    setIsCreatingTip(true);
    tipForm.reset({ title: "", content: "", category: "strategy", difficulty: "beginner", iconName: "Lightbulb", isPublished: true });
  };
  const handleCreateNewInsight = () => {
    setSelectedInsight(null);
    setIsCreatingInsight(true);
    insightForm.reset({ title: "", summary: "", sentiment: "neutral", sector: "Technology", isPublished: true });
  };
  const handleCreateNewStrategy = () => {
    setSelectedStrategy(null);
    setIsCreatingStrategy(true);
    strategyForm.reset({ title: "", description: "", content: "", category: "trend", difficulty: "beginner", isPublished: true });
  };

  const onSubmitLesson = (data: LessonFormData) => {
    const { simDescription, simStartingBalance, simTargetType, simTargetValue, simAllowedSymbols, ...rest } = data;
    const payload: any = {
      ...rest,
      simulationChallenge: rest.requiresSimulation ? {
        description: simDescription || "",
        startingBalance: simStartingBalance,
        targetType: simTargetType,
        targetValue: simTargetValue,
        allowedSymbols: simAllowedSymbols ? simAllowedSymbols.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      } : null,
    };
    if (selectedLesson && !isCreatingLesson) updateLessonMutation.mutate({ id: selectedLesson.id, data: payload });
    else createLessonMutation.mutate(payload);
  };
  const onSubmitTip = (data: TipFormData) => {
    if (selectedTip && !isCreatingTip) updateTipMutation.mutate({ id: selectedTip.id, data });
    else createTipMutation.mutate(data);
  };
  const onSubmitInsight = (data: InsightFormData) => {
    if (selectedInsight && !isCreatingInsight) updateInsightMutation.mutate({ id: selectedInsight.id, data });
    else createInsightMutation.mutate(data);
  };
  const onSubmitStrategy = (data: StrategyFormData) => {
    if (selectedStrategy && !isCreatingStrategy) updateStrategyMutation.mutate({ id: selectedStrategy.id, data });
    else createStrategyMutation.mutate(data);
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="unauthorized-message">
        <Card className="w-full max-w-md">
          <CardContent className="pt-10 pb-10 text-center px-8">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <Shield className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground mb-6">You need admin privileges to access this area.</p>
            <Button asChild>
              <Link href="/">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lessonsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background" data-testid="admin-dashboard">
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm" data-testid="text-admin-title">Admin Panel</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2">Content</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                data-testid={`tab-${item.id}`}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Exit Admin
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium capitalize">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5" data-testid="text-stat-users">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{stats?.users ?? 0}</span>
              <span className="text-muted-foreground hidden sm:inline">users</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="text-stat-lessons">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{stats?.lessons ?? lessons?.length ?? 0}</span>
              <span className="text-muted-foreground hidden sm:inline">lessons</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="text-stat-trades">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{stats?.trades ?? 0}</span>
              <span className="text-muted-foreground hidden sm:inline">trades</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab === "lessons" && (
            <ContentPanel
              items={lessons ?? []}
              selectedId={selectedLesson?.id ?? null}
              isCreating={isCreatingLesson}
              emptyIcon={<FileText className="h-8 w-8 text-muted-foreground/30" />}
              emptyLabel="No lessons yet"
              createLabel="New Lesson"
              onCreateNew={handleCreateNewLesson}
              onBack={() => { setSelectedLesson(null); setIsCreatingLesson(false); lessonForm.reset(); }}
              renderItem={(lesson) => (
                <ListItem
                  key={lesson.id}
                  title={lesson.title}
                  isSelected={selectedLesson?.id === lesson.id && !isCreatingLesson}
                  isPublished={lesson.isPublished ?? true}
                  onClick={() => handleSelectLesson(lesson)}
                  testId={`lesson-item-${lesson.id}`}
                  badge={<Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getDifficultyBadge(lesson.difficulty)}`}>{lesson.difficulty}</Badge>}
                  meta={<span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{lesson.duration}m</span>}
                />
              )}
              panelTitle={isCreatingLesson ? "New Lesson" : "Edit Lesson"}
              panelSubtitle={isCreatingLesson ? "Create a new curriculum module" : selectedLesson?.title}
              createTestId="button-create-lesson"
              renderActions={() => (
                <>
                  {!isCreatingLesson && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (window.confirm("Delete this lesson permanently?")) deleteLessonMutation.mutate(selectedLesson!.id); }}
                      disabled={deleteLessonMutation.isPending}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={lessonForm.handleSubmit(onSubmitLesson)}
                    disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                  >
                    {(createLessonMutation.isPending || updateLessonMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                    {isCreatingLesson ? "Create Lesson" : "Save Changes"}
                  </Button>
                </>
              )}
              renderForm={() => (
                <Form {...lessonForm}>
                  <form className="space-y-6">
                    <FormField control={lessonForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Candlestick Patterns Masterclass" className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={lessonForm.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Brief overview of what students will learn..." className="resize-none min-h-[80px]" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={lessonForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="basics">Fundamentals</SelectItem>
                              <SelectItem value="technical">Technical Analysis</SelectItem>
                              <SelectItem value="fundamental">Market Economics</SelectItem>
                              <SelectItem value="psychology">Trade Psychology</SelectItem>
                              <SelectItem value="advanced">Advanced Systems</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={lessonForm.control} name="difficulty" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={lessonForm.control} name="duration" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl><Input type="number" {...field} className="h-10" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={lessonForm.control} name="order" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order</FormLabel>
                          <FormControl><Input type="number" {...field} className="h-10" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={lessonForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <div className="rounded-lg border overflow-hidden">
                            <RichTextEditor content={field.value} onChange={field.onChange} placeholder="Write the lesson content here..." />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={lessonForm.control} name="isPublished" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <FormLabel className="text-sm font-medium">Published</FormLabel>
                          <p className="text-xs text-muted-foreground mt-0.5">Visible to students on the platform</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={lessonForm.control} name="requiresSimulation" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
                        <div>
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Requires Simulator Practice
                          </FormLabel>
                          <p className="text-xs text-muted-foreground mt-0.5">Embed a simulation challenge students must pass to complete this lesson</p>
                        </div>
                        <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />

                    {/* Simulation challenge config — shown when requiresSimulation is on */}
                    {lessonForm.watch("requiresSimulation") && (
                      <div className="rounded-lg border border-blue-200/60 dark:border-blue-800/60 overflow-hidden">
                        <div className="px-4 py-2.5 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-200/50 dark:border-blue-800/50">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5" /> Challenge Settings
                          </p>
                        </div>
                        <div className="p-4 space-y-3">
                          <FormField control={lessonForm.control} name="simDescription" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Challenge Description</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. Buy AAPL and close at a profit" className="h-9 text-sm" /></FormControl>
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField control={lessonForm.control} name="simStartingBalance" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Starting Balance ($)</FormLabel>
                                <FormControl><Input {...field} type="number" min={100} step={500} className="h-9 text-sm" /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={lessonForm.control} name="simTargetType" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Target Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="profit_pct">Profit % (e.g. 10%)</SelectItem>
                                    <SelectItem value="profit_amount">Profit Amount ($)</SelectItem>
                                    <SelectItem value="any_profit">Any Profitable Trade</SelectItem>
                                    <SelectItem value="complete_trade">Complete Any Trade</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                          </div>
                          {(lessonForm.watch("simTargetType") === "profit_pct" || lessonForm.watch("simTargetType") === "profit_amount") && (
                            <FormField control={lessonForm.control} name="simTargetValue" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Target Value {lessonForm.watch("simTargetType") === "profit_pct" ? "(%)" : "($)"}
                                </FormLabel>
                                <FormControl><Input {...field} type="number" min={1} className="h-9 text-sm" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <FormField control={lessonForm.control} name="simAllowedSymbols" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Allowed Symbols <span className="text-muted-foreground font-normal">(comma-separated, leave blank for all)</span></FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. AAPL, MSFT, BTC" className="h-9 text-sm" /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    )}

                    {/* Prerequisites section */}
                    <FormField control={lessonForm.control} name="prerequisites" render={({ field }) => {
                      const otherLessons = (lessons ?? []).filter(l => l.id !== selectedLesson?.id);
                      const selected: string[] = field.value ?? [];
                      const toggle = (id: string) => {
                        field.onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
                      };
                      return (
                        <FormItem>
                          <div className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                              <div>
                                <FormLabel className="text-sm font-medium flex items-center gap-2 mb-0">
                                  <Lock className="h-4 w-4 text-amber-500" />
                                  Prerequisites
                                </FormLabel>
                                <p className="text-xs text-muted-foreground mt-0.5">Students must complete these lessons before starting this one</p>
                              </div>
                              {selected.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{selected.length} required</Badge>
                              )}
                            </div>
                            {otherLessons.length === 0 ? (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No other lessons available</div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                                {otherLessons.sort((a, b) => a.order - b.order).map(l => (
                                  <label key={l.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={selected.includes(l.id)}
                                      onChange={() => toggle(l.id)}
                                      className="h-4 w-4 rounded accent-primary"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{l.title}</p>
                                      <p className="text-xs text-muted-foreground capitalize">{l.difficulty} · {l.category}</p>
                                    </div>
                                    {selected.includes(l.id) && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />

                    {selectedLesson && !isCreatingLesson && <QuizEditor lessonId={selectedLesson.id} />}
                  </form>
                </Form>
              )}
            />
          )}

          {activeTab === "tips" && (
            <ContentPanel
              items={tips ?? []}
              selectedId={selectedTip?.id ?? null}
              isCreating={isCreatingTip}
              emptyIcon={<Lightbulb className="h-8 w-8 text-muted-foreground/30" />}
              emptyLabel="No tips yet"
              createLabel="New Tip"
              onCreateNew={handleCreateNewTip}
              onBack={() => { setSelectedTip(null); setIsCreatingTip(false); tipForm.reset(); }}
              renderItem={(tip) => (
                <ListItem
                  key={tip.id}
                  title={tip.title}
                  isSelected={selectedTip?.id === tip.id && !isCreatingTip}
                  isPublished={tip.isPublished ?? true}
                  onClick={() => handleSelectTip(tip)}
                  testId={`tip-item-${tip.id}`}
                  badge={<Badge variant="outline" className="text-[10px] h-4 px-1.5">{tip.category}</Badge>}
                />
              )}
              panelTitle={isCreatingTip ? "New Trading Tip" : "Edit Tip"}
              panelSubtitle={isCreatingTip ? "Create a daily trading tip" : selectedTip?.title}
              createTestId="button-create-tip"
              renderActions={() => (
                <>
                  {!isCreatingTip && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (window.confirm("Delete this tip permanently?")) deleteTipMutation.mutate(selectedTip!.id); }}
                      disabled={deleteTipMutation.isPending}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={tipForm.handleSubmit(onSubmitTip)}
                    disabled={createTipMutation.isPending || updateTipMutation.isPending}
                  >
                    {(createTipMutation.isPending || updateTipMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                    {isCreatingTip ? "Create Tip" : "Save Changes"}
                  </Button>
                </>
              )}
              renderForm={() => (
                <Form {...tipForm}>
                  <form className="space-y-6">
                    <FormField control={tipForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. The Rule of Three in Price Action" className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={tipForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="strategy">Strategy</SelectItem>
                              <SelectItem value="psychology">Psychology</SelectItem>
                              <SelectItem value="risk">Risk Management</SelectItem>
                              <SelectItem value="market">Market Structure</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={tipForm.control} name="difficulty" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={tipForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Share the trading wisdom..." className="min-h-[160px] resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={tipForm.control} name="iconName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Lightbulb" className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={tipForm.control} name="isPublished" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <FormLabel className="text-sm font-medium">Published</FormLabel>
                          <p className="text-xs text-muted-foreground mt-0.5">Visible in the daily tips feed</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              )}
            />
          )}

          {activeTab === "insights" && (
            <ContentPanel
              items={insights ?? []}
              selectedId={selectedInsight?.id ?? null}
              isCreating={isCreatingInsight}
              emptyIcon={<TrendingUp className="h-8 w-8 text-muted-foreground/30" />}
              emptyLabel="No insights yet"
              createLabel="New Insight"
              onCreateNew={handleCreateNewInsight}
              onBack={() => { setSelectedInsight(null); setIsCreatingInsight(false); insightForm.reset(); }}
              renderItem={(insight) => (
                <ListItem
                  key={insight.id}
                  title={insight.title}
                  isSelected={selectedInsight?.id === insight.id && !isCreatingInsight}
                  isPublished={insight.isPublished ?? true}
                  onClick={() => handleSelectInsight(insight)}
                  testId={`insight-item-${insight.id}`}
                  badge={<Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getSentimentBadge(insight.sentiment)}`}>{insight.sentiment}</Badge>}
                  meta={<span className="text-xs text-muted-foreground">{insight.sector}</span>}
                />
              )}
              panelTitle={isCreatingInsight ? "New Market Insight" : "Edit Insight"}
              panelSubtitle={isCreatingInsight ? "Create a market insight" : selectedInsight?.title}
              createTestId="button-create-insight"
              renderActions={() => (
                <>
                  {!isCreatingInsight && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (window.confirm("Delete this insight permanently?")) deleteInsightMutation.mutate(selectedInsight!.id); }}
                      disabled={deleteInsightMutation.isPending}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={insightForm.handleSubmit(onSubmitInsight)}
                    disabled={createInsightMutation.isPending || updateInsightMutation.isPending}
                  >
                    {(createInsightMutation.isPending || updateInsightMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                    {isCreatingInsight ? "Create Insight" : "Save Changes"}
                  </Button>
                </>
              )}
              renderForm={() => (
                <Form {...insightForm}>
                  <form className="space-y-6">
                    <FormField control={insightForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Tech Sector Showing Bullish Divergence" className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={insightForm.control} name="sentiment" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sentiment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="bullish">Bullish</SelectItem>
                              <SelectItem value="bearish">Bearish</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={insightForm.control} name="sector" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sector</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Macro">Macro</SelectItem>
                              <SelectItem value="Technology">Technology</SelectItem>
                              <SelectItem value="Energy">Energy</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="Consumer">Consumer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={insightForm.control} name="summary" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Provide the market analysis summary..." className="min-h-[140px] resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={insightForm.control} name="isPublished" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <FormLabel className="text-sm font-medium">Published</FormLabel>
                          <p className="text-xs text-muted-foreground mt-0.5">Visible in the market insights feed</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              )}
            />
          )}

          {activeTab === "strategies" && (
            <ContentPanel
              items={strategies ?? []}
              selectedId={selectedStrategy?.id ?? null}
              isCreating={isCreatingStrategy}
              emptyIcon={<Target className="h-8 w-8 text-muted-foreground/30" />}
              emptyLabel="No strategies yet"
              createLabel="New Strategy"
              onCreateNew={handleCreateNewStrategy}
              onBack={() => { setSelectedStrategy(null); setIsCreatingStrategy(false); strategyForm.reset(); }}
              renderItem={(strategy) => (
                <ListItem
                  key={strategy.id}
                  title={strategy.title}
                  isSelected={selectedStrategy?.id === strategy.id && !isCreatingStrategy}
                  isPublished={strategy.isPublished ?? true}
                  onClick={() => handleSelectStrategy(strategy)}
                  testId={`strategy-item-${strategy.id}`}
                  badge={<Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getDifficultyBadge(strategy.difficulty)}`}>{strategy.difficulty}</Badge>}
                  meta={<span className="text-xs text-muted-foreground">{strategy.category}</span>}
                />
              )}
              panelTitle={isCreatingStrategy ? "New Strategy" : "Edit Strategy"}
              panelSubtitle={isCreatingStrategy ? "Create a trading strategy" : selectedStrategy?.title}
              createTestId="button-create-strategy"
              renderActions={() => (
                <>
                  {!isCreatingStrategy && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (window.confirm("Delete this strategy permanently?")) deleteStrategyMutation.mutate(selectedStrategy!.id); }}
                      disabled={deleteStrategyMutation.isPending}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={strategyForm.handleSubmit(onSubmitStrategy)}
                    disabled={createStrategyMutation.isPending || updateStrategyMutation.isPending}
                  >
                    {(createStrategyMutation.isPending || updateStrategyMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                    {isCreatingStrategy ? "Create Strategy" : "Save Changes"}
                  </Button>
                </>
              )}
              renderForm={() => (
                <Form {...strategyForm}>
                  <form className="space-y-6">
                    <FormField control={strategyForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Breakout Momentum Strategy" className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={strategyForm.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Brief description of the strategy..." className="resize-none min-h-[80px]" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={strategyForm.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="trend">Trend Following</SelectItem>
                              <SelectItem value="momentum">Momentum</SelectItem>
                              <SelectItem value="reversal">Reversal</SelectItem>
                              <SelectItem value="breakout">Breakout</SelectItem>
                              <SelectItem value="scalping">Scalping</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={strategyForm.control} name="difficulty" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={strategyForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <div className="rounded-lg border overflow-hidden">
                            <RichTextEditor content={field.value} onChange={field.onChange} placeholder="Write the strategy details here..." />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={strategyForm.control} name="isPublished" render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <FormLabel className="text-sm font-medium">Published</FormLabel>
                          <p className="text-xs text-muted-foreground mt-0.5">Visible in the strategy hub</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              )}
            />
          )}

          {activeTab === "promo-codes" && <PromoCodesTab />}
          {activeTab === "financial" && <FinancialTab financialStats={financialStats} financialLoading={financialLoading} />}
          {activeTab === "balances" && <BalancesTab />}
        </main>
      </div>
    </div>
  );
}

function ListItem({
  title, isSelected, isPublished, onClick, testId, badge, meta,
}: {
  title: string;
  isSelected: boolean;
  isPublished: boolean;
  onClick: () => void;
  testId: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? "bg-primary/5 border-primary/30"
          : "bg-background border-transparent hover:bg-muted/50 hover:border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-snug">{title}</p>
          {(badge || meta) && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {badge}
              {meta}
            </div>
          )}
        </div>
        {!isPublished && <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />}
      </div>
    </button>
  );
}

function ContentPanel<T extends { id: string }>({
  items, selectedId, isCreating, emptyIcon, emptyLabel, createLabel, onCreateNew, onBack,
  renderItem, panelTitle, panelSubtitle, createTestId, renderActions, renderForm,
}: {
  items: T[];
  selectedId: string | null;
  isCreating: boolean;
  emptyIcon: React.ReactNode;
  emptyLabel: string;
  createLabel: string;
  onCreateNew: () => void;
  onBack: () => void;
  renderItem: (item: T) => React.ReactNode;
  panelTitle: string;
  panelSubtitle?: string;
  createTestId: string;
  renderActions: () => React.ReactNode;
  renderForm: () => React.ReactNode;
}) {
  const showPanel = isCreating || !!selectedId;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 border-r flex flex-col shrink-0 bg-muted/20">
        <div className="p-3 border-b">
          <Button onClick={onCreateNew} size="sm" className="w-full gap-1.5" data-testid={createTestId}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                {emptyIcon}
                <p className="text-xs font-medium text-muted-foreground mt-3">{emptyLabel}</p>
              </div>
            ) : (
              items.map(renderItem)
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {showPanel ? (
          <>
            <div className="h-14 border-b flex items-center justify-between px-5 shrink-0 bg-background">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none truncate">{panelTitle}</p>
                  {panelSubtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{panelSubtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {renderActions()}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto px-6 py-6">
                {renderForm()}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Select an item to edit, or create a new one</p>
            <Button onClick={onCreateNew} variant="outline" size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PromoCodesTab() {
  const { toast } = useToast();
  const { data: codes = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/promo-codes"] });

  const promoSchema = z.object({
    code: z.string().min(1, "Code is required"),
    tier: z.string().min(1, "Tier is required"),
    description: z.string().optional(),
    isUnlimited: z.boolean().default(true),
    maxUses: z.coerce.number().nullable().optional(),
    isActive: z.boolean().default(true),
  });

  const form = useForm<z.infer<typeof promoSchema>>({
    resolver: zodResolver(promoSchema),
    defaultValues: { code: "", tier: "school", description: "", isUnlimited: true, maxUses: undefined, isActive: true },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const { isUnlimited, ...rest } = data;
      return apiRequest("POST", "/api/admin/promo-codes", isUnlimited ? { ...rest, maxUses: null } : rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      form.reset({ code: "", tier: "school", description: "", isUnlimited: true, maxUses: undefined, isActive: true });
      toast({ title: "Promo code created" });
    },
    onError: () => toast({ title: "Failed to create promo code", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/promo-codes/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/promo-codes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({ title: "Promo code deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const tierColors: Record<string, string> = {
    school: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    casual: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    premium: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 border-r flex flex-col shrink-0 bg-muted/20">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold mb-4">Create Promo Code</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Code</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. WELCOME2024" className="h-9 font-mono uppercase" data-testid="input-promo-code" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tier" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Tier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9" data-testid="select-promo-tier"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="premium">12Digits+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description (optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Welcome discount" className="h-9" data-testid="input-promo-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="isUnlimited" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-xs font-normal text-muted-foreground">Unlimited Uses</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-promo-unlimited" /></FormControl>
                </FormItem>
              )} />
              {!form.watch("isUnlimited") && (
                <FormField control={form.control} name="maxUses" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Max Uses</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="e.g. 100" className="h-9" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} data-testid="input-promo-max-uses" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-xs font-normal text-muted-foreground">Active on creation</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-promo-active" /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-9" disabled={createMutation.isPending} data-testid="button-create-promo">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Create Code
              </Button>
            </form>
          </Form>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 border-b flex items-center px-5 shrink-0">
          <h3 className="text-sm font-semibold">Promo Codes</h3>
          <Badge variant="secondary" className="ml-2 text-xs">{codes.length}</Badge>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
            ) : codes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-promo-codes">
                <Tag className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No promo codes yet</p>
              </div>
            ) : codes.map((code: any) => (
              <div key={code.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background" data-testid={`card-promo-${code.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-mono font-semibold text-sm" data-testid={`text-promo-code-${code.id}`}>{code.code}</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${tierColors[code.tier] ?? ""}`}>{code.tier}</Badge>
                    {!code.isActive && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {code.description && <span className="truncate max-w-[200px]">{code.description}</span>}
                    <span>{code.usedCount ?? 0}{code.maxUses ? ` / ${code.maxUses}` : " / ∞"} uses</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={code.isActive}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: code.id, isActive: v })}
                    data-testid={`switch-active-${code.id}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(code.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-promo-${code.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function FinancialTab({ financialStats, financialLoading }: {
  financialStats: any;
  financialLoading: boolean;
}) {
  if (financialLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!financialStats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No financial data available.
      </div>
    );
  }

  const tierData = Object.entries(financialStats.byTier ?? {}).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: count as number,
  }));

  const TIER_COLORS: Record<string, string> = {
    School: "#3b82f6",
    Casual: "#10b981",
    Premium: "#8b5cf6",
    Trial: "#f59e0b",
    Free: "#6b7280",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h2 className="text-base font-semibold mb-1">Financial Overview</h2>
          <p className="text-sm text-muted-foreground">Platform subscription and user metrics</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: financialStats.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
            { label: "Active Subscribers", value: financialStats.activeSubscribers ?? 0, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Trial Users", value: financialStats.trialUsers ?? 0, icon: Activity, color: "text-amber-500" },
            { label: "Free Users", value: (financialStats.totalUsers ?? 0) - (financialStats.activeSubscribers ?? 0) - (financialStats.trialUsers ?? 0), icon: XCircle, color: "text-muted-foreground" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tierData.length > 0 && (
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Users by Subscription Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {tierData.map((entry, index) => (
                        <Cell key={index} fill={TIER_COLORS[entry.name] ?? "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {financialStats.recentSignups?.length > 0 && (
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Sign-ups</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {financialStats.recentSignups.slice(0, 10).map((u: User) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                        {(u.username ?? u.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.username ?? u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.subscriptionId?.startsWith("SCHOOL-") ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">School</Badge>
                      ) : u.subscriptionTier === "premium" ? (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800">Premium</Badge>
                      ) : u.subscriptionTier === "casual" ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">Casual</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">{u.subscriptionTier ?? "Free"}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

function BalancesTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [resetAllAmount, setResetAllAmount] = useState("10000");
  const [customBalances, setCustomBalances] = useState<Record<string, string>>({});
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const { data: userList = [], refetch, isLoading } = useQuery<Array<{
    id: string; email: string; displayName: string; role: string;
    membershipTier: string; simulatorBalance: number; totalProfit: number; createdAt: string;
  }>>({ queryKey: ["/api/admin/users-list"] });

  const { data: dbStorage } = useQuery<{ usedBytes: number; usedPretty: string }>({
    queryKey: ["/api/admin/db-storage"],
  });

  const resetOneMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      apiRequest("POST", `/api/admin/users/${id}/reset-balance`, { amount }),
    onSuccess: () => { toast({ title: "Balance reset" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setOneMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      apiRequest("POST", `/api/admin/users/${id}/set-balance`, { amount }),
    onSuccess: () => { toast({ title: "Balance updated" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetAllMutation = useMutation({
    mutationFn: (amount: number) => apiRequest("POST", "/api/admin/reset-all-balances", { amount }),
    onSuccess: () => { toast({ title: "All balances reset" }); refetch(); setConfirmResetAll(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeTradesMutation = useMutation({
    mutationFn: (userId?: string) => apiRequest("POST", "/api/admin/close-open-trades", userId ? { userId } : {}),
    onSuccess: (d: any) => { toast({ title: `Closed ${d.closedCount ?? 0} open trades` }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = search.trim()
    ? userList.filter(u =>
        (u.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : userList;

  const dropdownUsers = search.trim()
    ? userList.filter(u =>
        (u.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : userList.slice(0, 8);

  const suspiciousThreshold = 500000;

  const storagePercent = dbStorage
    ? Math.min(100, Math.round((dbStorage.usedBytes / (256 * 1024 * 1024)) * 100))
    : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Balance Manager</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Reset, inspect, and correct simulator balances. Use this to clean up glitched or exploited accounts.</p>
          </div>
          {dbStorage && (
            <div className="border rounded-lg px-4 py-3 min-w-[200px] bg-muted/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Database Storage</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{dbStorage.usedPretty}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${storagePercent > 80 ? "bg-destructive" : storagePercent > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{storagePercent}% of 256 MB free tier</p>
            </div>
          )}
        </div>

        {/* Bulk actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-destructive" />Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Reset amount ($)</label>
                <Input value={resetAllAmount} onChange={e => setResetAllAmount(e.target.value)}
                  className="w-32 h-9 text-sm" type="number" min="0" />
              </div>
              {confirmResetAll ? (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-destructive font-medium">Are you sure? This resets ALL non-admin users.</span>
                  <Button size="sm" variant="destructive" disabled={resetAllMutation.isPending}
                    onClick={() => resetAllMutation.mutate(Number(resetAllAmount))}>
                    {resetAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, reset all"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmResetAll(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setConfirmResetAll(true)}>
                  <XCircle className="h-4 w-4 mr-1.5" />Reset All Balances
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={closeTradesMutation.isPending}
                onClick={() => closeTradesMutation.mutate(undefined)}>
                {closeTradesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                Force-Close All Open Trades
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Force-closing trades sets their profit to $0 and does not adjust balances. Use "Reset Balance" to fix balances after.</p>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm w-full">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              className="h-9 text-sm w-full"
            />
            {showDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg max-h-64 overflow-y-auto">
                {dropdownUsers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                ) : (
                  <>
                    {!search.trim() && (
                      <div className="px-3 py-1.5 border-b">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">All users ({userList.length})</span>
                      </div>
                    )}
                    {dropdownUsers.map(u => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                        onMouseDown={() => { setSearch(u.displayName || u.email || ""); setShowDropdown(false); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{u.displayName || "—"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[9px] py-0">{u.role}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">${(u.simulatorBalance ?? 0).toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                    {!search.trim() && userList.length > 8 && (
                      <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground text-center">
                        Type to search all {userList.length} users
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Refresh</Button>
          <span className="text-xs text-muted-foreground">{filtered.length} users</span>
        </div>

        {/* Users table */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <div className="border rounded-lg divide-y">
            {filtered.map(u => {
              const isSuspicious = (u.simulatorBalance ?? 0) > suspiciousThreshold;
              const customVal = customBalances[u.id] ?? "";
              return (
                <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${isSuspicious ? "bg-destructive/5" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{u.displayName || "—"}</span>
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">{u.role}</Badge>
                      {isSuspicious && <Badge variant="destructive" className="text-[10px] py-0 shrink-0">Suspicious</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className={`text-sm font-bold ${isSuspicious ? "text-destructive" : "text-foreground"}`}>
                      ${(u.simulatorBalance ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      P&L: {(u.totalProfit ?? 0) >= 0 ? "+" : ""}${(u.totalProfit ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="number" min="0" placeholder="Amount"
                      value={customVal}
                      onChange={e => setCustomBalances(prev => ({ ...prev, [u.id]: e.target.value }))}
                      className="w-24 h-8 text-xs"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      disabled={!customVal || setOneMutation.isPending}
                      onClick={() => { setOneMutation.mutate({ id: u.id, amount: Number(customVal) }); setCustomBalances(prev => ({ ...prev, [u.id]: "" })); }}>
                      Set
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={resetOneMutation.isPending}
                      onClick={() => resetOneMutation.mutate({ id: u.id, amount: 10000 })}>
                      Reset
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
                      disabled={closeTradesMutation.isPending}
                      onClick={() => closeTradesMutation.mutate(u.id)}
                      title="Close all open trades for this user">
                      Close Trades
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
