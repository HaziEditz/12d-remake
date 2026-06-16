import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SchoolLayout from "@/layouts/school-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Users, GraduationCap, Target, Zap, Plus, Search,
  BarChart3, TrendingUp, Coins, Trash2, CheckCircle2,
  Clock, Sparkles, ChevronRight, Copy, Receipt, Gavel, ShoppingBag, Briefcase, Trophy,
  Home, Building2, CreditCard
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const tabs = ["Overview", "Classes", "Students", "Assignments", "Market Events", "Economy", "Analytics"] as const;
type Tab = typeof tabs[number];

const createClassSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  ageGroup: z.enum(["primary", "intermediate", "high_school"]),
});

const createAssignmentSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["profit_target", "lesson_completion", "portfolio_balance", "lesson"]),
  targetValue: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional(),
  classId: z.string().optional(),
  lessonId: z.string().optional(),
});

const createEventSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  type: z.enum(["boom", "crash", "news", "tip"]),
  title: z.string().min(2),
  description: z.string().optional(),
});

export default function TeacherCommandCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [studentSearch, setStudentSearch] = useState("");
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/teacher/classes"] });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/teacher/students"] });
  const { data: assignments = [] } = useQuery<any[]>({ queryKey: ["/api/teacher/assignments"] });
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/classroom/events"] });
  const { data: lessonsList = [] } = useQuery<any[]>({ queryKey: ["/api/lessons"] });

  const avgBalance = students.length > 0
    ? students.reduce((s: number, u: any) => s + parseFloat(u.simulatorBalance ?? "10000"), 0) / students.length
    : 10000;

  const pendingAssignments = assignments.filter((a: any) => !a.completed).length;

  // Create class
  const classForm = useForm({ resolver: zodResolver(createClassSchema), defaultValues: { name: "", ageGroup: "high_school" as const } });
  const createClassMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/teacher/classes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      classForm.reset();
      setClassDialogOpen(false);
      toast({ title: "Class created!" });
    },
  });

  // Create assignment
  const assignmentForm = useForm({ resolver: zodResolver(createAssignmentSchema), defaultValues: { title: "", description: "", type: "lesson" as const, targetValue: 0, lessonId: "", classId: "", dueDate: "" } });
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => {
      const payload: any = { ...data };
      if (payload.type === "lesson") {
        if (!payload.lessonId) throw new Error("Please select a lesson");
        // Auto-fill title from lesson if blank
        const lesson = lessonsList.find((l: any) => l.id === payload.lessonId);
        if (!payload.title || payload.title.length < 2) payload.title = `Read: ${lesson?.title ?? "Lesson"}`;
        if (!payload.description) payload.description = lesson?.description ?? `Complete the lesson and pass the quiz.`;
        payload.targetValue = 1;
      }
      // strip empty strings so backend nulls them
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      return apiRequest("POST", "/api/teacher/assignments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      assignmentForm.reset();
      setAssignmentDialogOpen(false);
      toast({ title: "Assignment created!" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create assignment", description: err?.message ?? "Try again.", variant: "destructive" });
    },
  });

  // Create event
  const eventForm = useForm({ resolver: zodResolver(createEventSchema), defaultValues: { classId: "", type: "news" as const, title: "", description: "" } });
  const createEventMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/classroom/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classroom/events"] });
      eventForm.reset();
      setEventDialogOpen(false);
      toast({ title: "Event posted!" });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/teacher/classes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] }),
  });

  const filteredStudents = students.filter((s: any) =>
    s.displayName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const analyticsData = classes.map((cls: any) => {
    const classStudents = students.filter((s: any) => s.classId === cls.id);
    const avgBal = classStudents.length > 0
      ? classStudents.reduce((sum: number, s: any) => sum + parseFloat(s.simulatorBalance ?? "10000"), 0) / classStudents.length
      : 10000;
    return { name: cls.name, balance: Math.round(avgBal), students: classStudents.length };
  });

  return (
    <SchoolLayout>
      <div className="p-5 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-teal-700 via-cyan-700 to-blue-800">
          <div className="absolute inset-0 sw-shimmer-bg opacity-20" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Zap className="h-6 w-6 text-teal-300" /> Command Centre
              </h1>
              <p className="text-teal-200 text-sm mt-0.5">Welcome back, {user?.displayName?.split(" ")[0]} — manage your classes below</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold gap-1.5" data-testid="button-create-class">
                    <Plus className="h-4 w-4" /> New Class
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0f172a] border-white/10">
                  <DialogHeader><DialogTitle className="text-white">Create a Class</DialogTitle></DialogHeader>
                  <Form {...classForm}>
                    <form onSubmit={classForm.handleSubmit(d => createClassMutation.mutate(d))} className="space-y-4">
                      <FormField control={classForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-300">Class Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Period 3 Economics" className="bg-white/5 border-white/20 text-white" data-testid="input-class-name" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={classForm.control} name="ageGroup" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-300">Age Group</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-age-group"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="bg-[#0f172a] border-white/20">
                              <SelectItem value="primary">Primary (Ages 6–10)</SelectItem>
                              <SelectItem value="intermediate">Intermediate (Ages 11–13)</SelectItem>
                              <SelectItem value="high_school">High School (Ages 14–18)</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white" disabled={createClassMutation.isPending} data-testid="button-submit-class">
                        {createClassMutation.isPending ? "Creating..." : "Create Class"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Students", value: students.length, icon: Users, color: "text-teal-400" },
            { label: "Active Classes", value: classes.length, icon: GraduationCap, color: "text-purple-400" },
            { label: "Pending Assignments", value: pendingAssignments, icon: Target, color: "text-blue-400" },
            { label: "Avg Balance", value: `$${Math.round(avgBalance).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400" },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 bg-white/5 border border-white/10" data-testid={`stat-teacher-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-slate-500 text-xs">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab ? "bg-teal-600 text-white shadow" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              data-testid={`tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && <OverviewTab classes={classes} students={students} assignments={assignments} events={events} />}
        {activeTab === "Classes" && <ClassesTab classes={classes} deleteClass={(id) => deleteClassMutation.mutate(id)} classDialogOpen={classDialogOpen} setClassDialogOpen={setClassDialogOpen} />}
        {activeTab === "Students" && <StudentsTab students={filteredStudents} search={studentSearch} setSearch={setStudentSearch} />}
        {activeTab === "Assignments" && (
          <AssignmentsTab
            assignments={assignments}
            classes={classes}
            lessonsList={lessonsList}
            dialogOpen={assignmentDialogOpen}
            setDialogOpen={setAssignmentDialogOpen}
            form={assignmentForm}
            onSubmit={(d: any) => createAssignmentMutation.mutate(d)}
            isPending={createAssignmentMutation.isPending}
          />
        )}
        {activeTab === "Market Events" && (
          <MarketEventsTab
            events={events}
            classes={classes}
            dialogOpen={eventDialogOpen}
            setDialogOpen={setEventDialogOpen}
            form={eventForm}
            onSubmit={(d: any) => createEventMutation.mutate(d)}
            isPending={createEventMutation.isPending}
          />
        )}
        {activeTab === "Analytics" && <AnalyticsTab analyticsData={analyticsData} students={students} assignments={assignments} />}
        {activeTab === "Economy" && <EconomyTab classes={classes} students={students} />}
      </div>
    </SchoolLayout>
  );
}

function OverviewTab({ classes, students, assignments, events }: any) {
  const recentStudents = [...students].sort((a, b) => b.xp - a.xp).slice(0, 5);
  const recentEvents = events.slice(0, 3);
  const pendingCount = assignments.filter((a: any) => !a.completed).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-xl p-5 bg-white/5 border border-white/10">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-400" /> Top Students by XP
        </h3>
        <div className="space-y-2">
          {recentStudents.map((s: any, i: number) => (
            <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <span className={`text-sm font-black w-5 ${i === 0 ? "text-amber-400" : "text-slate-600"}`}>#{i+1}</span>
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-xs font-black text-white">
                {s.displayName?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-300 flex-1 truncate font-semibold">{s.displayName}</span>
              <div className="flex items-center gap-1 text-purple-400">
                <Zap className="h-3 w-3" />
                <span className="text-xs font-bold">{s.xp ?? 0} XP</span>
              </div>
            </div>
          ))}
          {recentStudents.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No students yet</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-400" /> Assignment Status
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-blue-400">{pendingCount}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-400">{assignments.length - pendingCount}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="flex-1">
              <Progress value={assignments.length > 0 ? ((assignments.length - pendingCount) / assignments.length) * 100 : 0} className="h-3" />
              <p className="text-xs text-slate-500 mt-1">{assignments.length > 0 ? Math.round(((assignments.length - pendingCount) / assignments.length) * 100) : 0}% completion rate</p>
            </div>
          </div>
        </div>

        {recentEvents.length > 0 && (
          <div className="rounded-xl p-5 bg-white/5 border border-white/10">
            <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" /> Recent Events
            </h3>
            <div className="space-y-2">
              {recentEvents.map((e: any) => (
                <div key={e.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${getEventBg(e.type)}`}>
                  <span className="text-xl">{getEventEmoji(e.type)}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{e.title}</p>
                    <p className="text-xs text-slate-500">{getEventLabel(e.type)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClassesTab({ classes, deleteClass, classDialogOpen, setClassDialogOpen }: any) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      {classes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls: any) => (
            <div key={cls.id} className="rounded-xl p-5 bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all" data-testid={`class-card-${cls.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white">{cls.name}</h3>
                  <Badge className={`mt-1 text-xs ${getAgeGroupStyle(cls.ageGroup)}`}>
                    {getAgeGroupLabel(cls.ageGroup)}
                  </Badge>
                </div>
                <Button size="sm" variant="ghost" className="text-slate-600 hover:text-rose-400 h-7 w-7 p-0" onClick={() => deleteClass(cls.id)} data-testid={`button-delete-class-${cls.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <p>Join Code:</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-teal-400 text-base font-bold tracking-wider">{cls.joinCode}</code>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-500 hover:text-teal-400" onClick={() => copyCode(cls.joinCode)} data-testid={`button-copy-code-${cls.id}`}>
                    {copied === cls.joinCode ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <GraduationCap className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-400 font-bold mb-1">No classes yet</h3>
          <p className="text-slate-600 text-sm mb-4">Create your first class to get started</p>
          <Button onClick={() => setClassDialogOpen(true)} className="bg-teal-600 hover:bg-teal-500 text-white" data-testid="button-create-first-class">
            <Plus className="h-4 w-4 mr-1.5" /> Create a Class
          </Button>
        </div>
      )}
    </div>
  );
}

function StudentsTab({ students, search, setSearch }: any) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-slate-600"
          data-testid="input-student-search"
        />
      </div>
      {students.length > 0 ? (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-4 sm:grid-cols-6 px-4 py-2.5 bg-white/5 text-xs text-slate-500 font-semibold">
            <span className="col-span-2">Student</span>
            <span className="hidden sm:block">Balance</span>
            <span className="hidden sm:block">XP</span>
            <span>Level</span>
            <span>Tokens</span>
          </div>
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto scrollbar-hide">
            {students.map((s: any) => {
              const level = Math.min(Math.floor((s.xp ?? 0) / 100) + 1, 100);
              return (
                <div key={s.id} className="grid grid-cols-4 sm:grid-cols-6 px-4 py-3 hover:bg-white/3 transition-colors items-center" data-testid={`student-row-${s.id}`}>
                  <div className="col-span-2 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                      {s.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{s.displayName}</p>
                      <p className="text-xs text-slate-600 truncate">{s.email}</p>
                    </div>
                  </div>
                  <span className="hidden sm:block text-sm text-emerald-400 font-mono">${parseFloat(s.simulatorBalance ?? "10000").toLocaleString()}</span>
                  <span className="hidden sm:block text-sm text-purple-400 font-bold">{s.xp ?? 0}</span>
                  <span className="text-sm text-teal-400 font-bold">Lv.{level}</span>
                  <span className="text-sm text-amber-400 font-bold flex items-center gap-1">
                    <Coins className="h-3 w-3" />{s.classroomTokens ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No students found. Share your class join code with students.</p>
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ assignments, classes, lessonsList = [], dialogOpen, setDialogOpen, form, onSubmit, isPending }: any) {
  const watchType = form.watch("type");
  const isLessonType = watchType === "lesson";
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""} total</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white gap-1.5" data-testid="button-create-assignment">
              <Plus className="h-4 w-4" /> New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Create Assignment</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel className="text-slate-300">Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-assignment-type"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-[#0f172a] border-white/20">
                        <SelectItem value="lesson">Lesson — students must complete a specific lesson</SelectItem>
                        <SelectItem value="profit_target">Profit Target</SelectItem>
                        <SelectItem value="lesson_completion">Lesson Count Goal</SelectItem>
                        <SelectItem value="portfolio_balance">Portfolio Balance</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                {isLessonType && (
                  <FormField control={form.control} name="lessonId" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Lesson</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-assignment-lesson"><SelectValue placeholder="Pick a lesson…" /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/20 max-h-72">
                          {lessonsList.map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="text-slate-300">{isLessonType ? "Title (auto-fills if blank)" : "Title"}</FormLabel><FormControl><Input {...field} placeholder={isLessonType ? "e.g. Read & quiz: Intro to Charts" : "e.g. Earn $500 profit"} className="bg-white/5 border-white/20 text-white" data-testid="input-assignment-title" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel className="text-slate-300">Instructions (optional)</FormLabel><FormControl><Textarea {...field} placeholder="What should students do?" className="bg-white/5 border-white/20 text-white" data-testid="input-assignment-description" /></FormControl></FormItem>
                )} />
                {!isLessonType && (
                  <FormField control={form.control} name="targetValue" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Target Value</FormLabel><FormControl><Input {...field} type="number" placeholder="100" className="bg-white/5 border-white/20 text-white" data-testid="input-assignment-target" /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-slate-300">Due Date (optional)</FormLabel><FormControl><Input {...field} type="date" className="bg-white/5 border-white/20 text-white" data-testid="input-assignment-due" /></FormControl></FormItem>
                )} />
                {classes.length > 0 && (
                  <FormField control={form.control} name="classId" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Assign to Class (optional)</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-assignment-class"><SelectValue placeholder="All classes" /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/20">
                          {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white" disabled={isPending} data-testid="button-submit-assignment">
                  {isPending ? "Creating..." : "Create Assignment"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <AssignmentCard key={a.id} assignment={a} lessonsList={lessonsList} classes={classes} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="mb-3">No assignments yet</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-500 text-white" data-testid="button-create-first-assignment">
            <Plus className="h-4 w-4 mr-1.5" /> Create Assignment
          </Button>
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment: a, lessonsList, classes }: any) {
  const lesson = a.lessonId ? lessonsList.find((l: any) => l.id === a.lessonId) : null;
  const cls = a.classId ? classes.find((c: any) => c.id === a.classId) : null;
  const { data: progressList = [] } = useQuery<any[]>({
    queryKey: ["/api/teacher/assignments", a.id, "progress"],
  });
  const completedCount = progressList.filter((p: any) => p.completed).length;
  const totalStudents = progressList.length;
  const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();

  return (
    <div className="rounded-xl p-4 bg-white/5 border border-white/10 hover:border-teal-500/20 transition-all" data-testid={`assignment-card-${a.id}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-white">{a.title}</p>
          {lesson && <p className="text-xs text-teal-400 mt-0.5 truncate">📖 {lesson.title}</p>}
          {a.description && <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Badge className={`text-xs ${getAssignmentTypeStyle(a.type)}`}>{getAssignmentTypeLabel(a.type)}</Badge>
          {cls && <Badge variant="outline" className="text-xs border-white/20 text-slate-300">{cls.name}</Badge>}
          {a.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
              <Clock className="h-3 w-3" />{new Date(a.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {totalStudents > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
              style={{ width: `${Math.round((completedCount / totalStudents) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-white tabular-nums" data-testid={`text-progress-${a.id}`}>
            {completedCount}/{totalStudents} done
          </span>
        </div>
      )}
      {totalStudents === 0 && a.classId && (
        <p className="text-xs text-slate-600 mt-2">No students in this class yet.</p>
      )}
    </div>
  );
}

function MarketEventsTab({ events, classes, dialogOpen, setDialogOpen, form, onSubmit, isPending }: any) {
  const previewType = form.watch?.("type") ?? "news";
  const previewTitle = form.watch?.("title") ?? "Your event title";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-slate-400 text-sm">{events.length} active event{events.length !== 1 ? "s" : ""}</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white gap-1.5" data-testid="button-post-event">
                <Plus className="h-4 w-4" /> Post Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a] border-white/10">
              <DialogHeader><DialogTitle className="text-white">Post Market Event</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="classId" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Class</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-event-class"><SelectValue placeholder="Choose a class" /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/20">
                          {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-event-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="bg-[#0f172a] border-white/20">
                          <SelectItem value="boom">🚀 Market Boom</SelectItem>
                          <SelectItem value="crash">📉 Market Crash</SelectItem>
                          <SelectItem value="news">📰 News Alert</SelectItem>
                          <SelectItem value="tip">💡 Trading Tip</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Title</FormLabel><FormControl><Input {...field} placeholder="e.g. Tech stocks surge 20%!" className="bg-white/5 border-white/20 text-white" data-testid="input-event-title" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel className="text-slate-300">Description (optional)</FormLabel><FormControl><Textarea {...field} placeholder="Describe the market event..." className="bg-white/5 border-white/20 text-white" data-testid="input-event-description" /></FormControl></FormItem>
                  )} />
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white" disabled={isPending || classes.length === 0} data-testid="button-submit-event">
                    {isPending ? "Posting..." : "Post Event"}
                  </Button>
                  {classes.length === 0 && <p className="text-xs text-rose-400 text-center">Create a class first to post events</p>}
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((e: any) => (
              <div key={e.id} className={`rounded-xl p-4 border ${getEventBg(e.type)}`} data-testid={`event-card-${e.id}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{getEventEmoji(e.type)}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{e.title}</p>
                    {e.description && <p className="text-xs text-slate-400 mt-0.5">{e.description}</p>}
                    <Badge className={`mt-1.5 text-xs ${getEventBadgeStyle(e.type)}`}>{getEventLabel(e.type)}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No events posted yet</p>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className="rounded-xl p-5 bg-white/5 border border-white/10">
        <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-400" /> Student Preview
        </h3>
        <p className="text-slate-500 text-xs mb-4">This is how students will see the event:</p>
        <div className={`rounded-xl p-4 border ${getEventBg(previewType)}`}>
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0 sw-float">{getEventEmoji(previewType)}</span>
            <div>
              <Badge className={`text-xs mb-1 ${getEventBadgeStyle(previewType)}`}>{getEventLabel(previewType)}</Badge>
              <p className="font-black text-white">{previewTitle || "Your event title"}</p>
              <p className="text-xs text-slate-400 mt-1">Just now • From your teacher</p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
          <p className="text-xs text-slate-500 text-center">
            {getEventHint(previewType)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ analyticsData, students, assignments }: any) {
  const topStudents = [...students].sort((a, b) => parseFloat(b.simulatorBalance ?? "10000") - parseFloat(a.simulatorBalance ?? "10000")).slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5 bg-white/5 border border-white/10">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-teal-400" /> Average Balance by Class
        </h3>
        {analyticsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, "Avg Balance"]} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
              <Bar dataKey="balance" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Create classes and add students to see analytics</p>
          </div>
        )}
      </div>

      <div className="rounded-xl p-5 bg-white/5 border border-white/10">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" /> Top Performers
        </h3>
        {topStudents.length > 0 ? (
          <div className="space-y-2">
            {topStudents.map((s: any, i: number) => {
              const bal = parseFloat(s.simulatorBalance ?? "10000");
              const pct = ((bal - 10000) / 10000 * 100).toFixed(1);
              return (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-testid={`analytics-student-${s.id}`}>
                  <span className={`text-xs font-black w-6 text-center ${i === 0 ? "text-amber-400" : "text-slate-600"}`}>#{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-teal-600/30 border border-teal-500/30 flex items-center justify-center text-xs font-black text-teal-300">
                    {s.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300 flex-1 truncate">{s.displayName}</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">${bal.toLocaleString()}</span>
                  <span className={`text-xs font-bold ${parseFloat(pct) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {parseFloat(pct) >= 0 ? "+" : ""}{pct}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-6">No students yet</p>
        )}
      </div>
    </div>
  );
}

/* ===== HELPERS ===== */
function getAgeGroupLabel(g: string) {
  return g === "primary" ? "Primary (6–10)" : g === "intermediate" ? "Intermediate (11–13)" : "High School (14–18)";
}
function getAgeGroupStyle(g: string) {
  return g === "primary" ? "bg-amber-500/20 text-amber-300" : g === "intermediate" ? "bg-purple-500/20 text-purple-300" : "bg-teal-500/20 text-teal-300";
}
function EconomyTab({ classes, students }: { classes: any[]; students: any[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id ?? "");
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [auctionDialogOpen, setAuctionDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [awardData, setAwardData] = useState({ studentId: "", amount: "", description: "" });
  const [jobData, setJobData] = useState({ title: "", description: "", payAmount: "", payFrequency: "weekly" });
  const [auctionData, setAuctionData] = useState({ title: "", description: "", emoji: "🎁", startingBid: "", endDate: "" });
  const [storeData, setStoreData] = useState({ name: "", description: "", emoji: "🎁", price: "", stock: "" });
  const [expenseData, setExpenseData] = useState({ name: "", description: "", amount: "", frequency: "weekly" });
  const [settingsData, setSettingsData] = useState<any>(null);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [challengeData, setChallengeData] = useState({ title: "", description: "", emoji: "🏆", type: "most_coins", rewardAmount: "", rewardDescription: "", endDate: "" });
  const [eventData, setEventData] = useState({ amount: "", percent: "", description: "", mode: "bonus" as "bonus" | "fine" | "fine_percent" | "interest" });
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetData, setAssetData] = useState({ name: "", description: "", emoji: "🏠", type: "property", price: "", value: "", passiveIncome: "", incomeFrequency: "weekly", maintenanceCost: "", maintenanceFrequency: "weekly", maxOwners: "" });
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [loanData, setLoanData] = useState({ studentId: "", amount: "", interestRate: "10", dueDate: "" });

  const { data: balances = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/balances", selectedClassId],
    queryFn: () => fetch(`/api/economy/balances?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/economy/settings", selectedClassId],
    queryFn: () => fetch(`/api/economy/settings?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: jobsData } = useQuery<any>({
    queryKey: ["/api/economy/jobs", selectedClassId],
    queryFn: () => fetch(`/api/economy/jobs?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: auctions = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/auctions", selectedClassId],
    queryFn: () => fetch(`/api/economy/auctions?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: storeItems = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/store", selectedClassId],
    queryFn: () => fetch(`/api/economy/store?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/expenses", selectedClassId],
    queryFn: () => fetch(`/api/economy/expenses?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: challenges = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/challenges", selectedClassId],
    queryFn: () => fetch(`/api/economy/challenges?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: classroomAssets = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/assets", selectedClassId],
    queryFn: () => fetch(`/api/economy/assets?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: classLoans = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/loans", selectedClassId],
    queryFn: () => fetch(`/api/economy/loans?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });
  const { data: classLeaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/leaderboard", selectedClassId],
    queryFn: () => fetch(`/api/economy/leaderboard?classId=${selectedClassId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedClassId,
  });

  const jobs: any[] = jobsData?.jobs ?? [];
  const jobAssignments: any[] = jobsData?.assignments ?? [];

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/economy/balances", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/settings", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/jobs", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/auctions", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/store", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/expenses", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/challenges", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/leaderboard", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/assets", selectedClassId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/loans", selectedClassId] });
  };

  const createAsset = async () => {
    await apiRequest("POST", "/api/economy/assets", {
      classId: selectedClassId,
      ...assetData,
      price: Number(assetData.price),
      value: Number(assetData.value) || Number(assetData.price),
      passiveIncome: Number(assetData.passiveIncome) || 0,
      maintenanceCost: Number(assetData.maintenanceCost) || 0,
      maxOwners: assetData.maxOwners ? Number(assetData.maxOwners) : null,
    });
    invalidateAll();
    toast({ title: "Asset created!" });
    setAssetDialogOpen(false);
    setAssetData({ name: "", description: "", emoji: "🏠", type: "property", price: "", value: "", passiveIncome: "", incomeFrequency: "weekly", maintenanceCost: "", maintenanceFrequency: "weekly", maxOwners: "" });
  };

  const processAssetIncome = async () => {
    const r = await apiRequest("POST", "/api/economy/process-asset-income", { classId: selectedClassId }) as any;
    const data = await r.json();
    invalidateAll();
    toast({ title: `Asset income processed!`, description: `${data.incomeCount} income payments, ${data.maintenanceCount} maintenance charges` });
  };

  const issueLoan = async () => {
    await apiRequest("POST", "/api/economy/loans", {
      classId: selectedClassId,
      studentId: loanData.studentId,
      amount: Number(loanData.amount),
      interestRate: Number(loanData.interestRate),
      dueDate: loanData.dueDate || undefined,
    });
    invalidateAll();
    qc.invalidateQueries({ queryKey: ["/api/economy/loans", selectedClassId] });
    toast({ title: "Loan issued!" });
    setLoanDialogOpen(false);
    setLoanData({ studentId: "", amount: "", interestRate: "10", dueDate: "" });
  };

  const applyLoanInterest = async () => {
    const r = await apiRequest("POST", "/api/economy/loans/apply-interest", { classId: selectedClassId }) as any;
    const data = await r.json();
    qc.invalidateQueries({ queryKey: ["/api/economy/loans", selectedClassId] });
    toast({ title: "Loan interest applied!", description: `${data.count} loan(s) updated` });
  };

  const saveSettings = async () => {
    const defaults = { currencyName: "Coins", currencySymbol: "🪙", lessonReward: 50, quizReward: 25, assignmentReward: 100, simulatorConversionRate: 0.1, savingsInterestRate: 5 };
    const payload = { ...defaults, ...(settings ?? {}), ...(settingsData ?? {}), classId: selectedClassId, isActive: true };
    await apiRequest("POST", "/api/economy/settings", payload);
    qc.invalidateQueries({ queryKey: ["/api/economy/settings", selectedClassId] });
    toast({ title: "Economy settings saved!" });
  };

  const awardCurrency = async () => {
    await apiRequest("POST", "/api/economy/award", { classId: selectedClassId, ...awardData, amount: Number(awardData.amount) });
    qc.invalidateQueries({ queryKey: ["/api/economy/balances", selectedClassId] });
    toast({ title: "Currency awarded!" });
    setAwardDialogOpen(false);
    setAwardData({ studentId: "", amount: "", description: "" });
  };

  const createChallenge = async () => {
    await apiRequest("POST", "/api/economy/challenges", {
      classId: selectedClassId, ...challengeData,
      rewardAmount: Number(challengeData.rewardAmount) || 0,
      endDate: challengeData.endDate ? new Date(challengeData.endDate).toISOString() : undefined,
    });
    invalidateAll();
    toast({ title: "Challenge created!" });
    setChallengeDialogOpen(false);
    setChallengeData({ title: "", description: "", emoji: "🏆", type: "most_coins", rewardAmount: "", rewardDescription: "", endDate: "" });
  };

  const triggerEvent = async () => {
    const desc = eventData.description || undefined;
    if (eventData.mode === "bonus") {
      const r = await apiRequest("POST", "/api/economy/events/bonus", { classId: selectedClassId, amount: Number(eventData.amount), description: desc }) as any;
      toast({ title: `Bonus sent to ${r.awarded} student(s)!` });
    } else if (eventData.mode === "fine") {
      const r = await apiRequest("POST", "/api/economy/events/fine", { classId: selectedClassId, amount: Number(eventData.amount), description: desc }) as any;
      toast({ title: `Charged ${r.charged} student(s)!` });
    } else if (eventData.mode === "fine_percent") {
      const r = await apiRequest("POST", "/api/economy/events/fine-percent", { classId: selectedClassId, percent: Number(eventData.percent), description: desc }) as any;
      toast({ title: `Charged ${r.charged} student(s) ${eventData.percent}%!` });
    } else if (eventData.mode === "interest") {
      const r = await apiRequest("POST", "/api/economy/savings/apply-interest", { classId: selectedClassId }) as any;
      toast({ title: `Applied ${r.rate}% interest to ${r.applied} saver(s)!` });
    }
    invalidateAll();
    setEventData({ amount: "", percent: "", description: "", mode: "bonus" });
  };

  const createJob = async () => {
    await apiRequest("POST", "/api/economy/jobs", { classId: selectedClassId, ...jobData, payAmount: Number(jobData.payAmount) });
    invalidateAll();
    toast({ title: "Job created!" });
    setJobDialogOpen(false);
    setJobData({ title: "", description: "", payAmount: "", payFrequency: "weekly" });
  };

  const payAllJobs = async () => {
    const result = await apiRequest("POST", "/api/economy/jobs/pay-all", { classId: selectedClassId }) as any;
    invalidateAll();
    toast({ title: `Paid ${result?.paid ?? 0} job holder(s)!` });
  };

  const createAuction = async () => {
    await apiRequest("POST", "/api/economy/auctions", { classId: selectedClassId, ...auctionData, startingBid: Number(auctionData.startingBid), endDate: new Date(auctionData.endDate).toISOString() });
    invalidateAll();
    toast({ title: "Auction created!" });
    setAuctionDialogOpen(false);
    setAuctionData({ title: "", description: "", emoji: "🎁", startingBid: "", endDate: "" });
  };

  const createStoreItem = async () => {
    const payload: any = { classId: selectedClassId, ...storeData, price: Number(storeData.price) };
    if (storeData.stock) payload.stock = Number(storeData.stock); else payload.stock = null;
    await apiRequest("POST", "/api/economy/store", payload);
    invalidateAll();
    toast({ title: "Store item added!" });
    setStoreDialogOpen(false);
    setStoreData({ name: "", description: "", emoji: "🎁", price: "", stock: "" });
  };

  const createExpense = async () => {
    await apiRequest("POST", "/api/economy/expenses", { classId: selectedClassId, ...expenseData, amount: Number(expenseData.amount) });
    invalidateAll();
    toast({ title: "Expense created!" });
    setExpenseDialogOpen(false);
    setExpenseData({ name: "", description: "", amount: "", frequency: "weekly" });
  };

  const collectExpense = async (expenseId: string) => {
    const result = await apiRequest("POST", `/api/economy/expenses/${expenseId}/collect`, { classId: selectedClassId }) as any;
    invalidateAll();
    toast({ title: `Collected from ${result?.charged ?? 0} student(s)!` });
  };

  const assignJob = async (jobId: string, studentId: string) => {
    await apiRequest("POST", `/api/economy/jobs/${jobId}/assign`, { studentId, classId: selectedClassId });
    invalidateAll();
    toast({ title: "Job assigned!" });
  };

  const classStudents = students.filter((s: any) => balances.some((b: any) => b.id === s.id) || true);
  const currencyName = settings?.currencyName ?? "Coins";
  const currencySymbol = settings?.currencySymbol ?? "🪙";
  const activeAuctions = auctions.filter((a: any) => a.isActive);

  const InputStyle = "bg-white/5 border-white/20 text-white text-sm";
  const LabelStyle = "text-xs text-slate-400 font-semibold mb-1";

  return (
    <div className="space-y-6">
      {/* Class Selector */}
      {classes.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Class:</span>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm">
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* Economy Settings */}
      <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
        <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-400" /> Economy Settings
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Currency Name", key: "currencyName", placeholder: "Coins" },
            { label: "Currency Symbol", key: "currencySymbol", placeholder: "🪙" },
            { label: `${currencySymbol} per Lesson`, key: "lessonReward", type: "number", placeholder: "50" },
            { label: `${currencySymbol} per Quiz`, key: "quizReward", type: "number", placeholder: "25" },
            { label: `${currencySymbol} per Assignment`, key: "assignmentReward", type: "number", placeholder: "100" },
            { label: "Simulator Conversion %", key: "simulatorConversionRate", type: "number", placeholder: "10" },
          ].map(({ label, key, type = "text", placeholder }) => (
            <div key={key}>
              <p className={LabelStyle}>{label}</p>
              <Input
                type={type}
                placeholder={placeholder}
                value={settingsData?.[key] ?? settings?.[key] ?? ""}
                onChange={e => setSettingsData((prev: any) => ({ ...(prev ?? settings ?? {}), [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                className={InputStyle}
                data-testid={`input-economy-${key}`}
              />
            </div>
          ))}
        </div>
        <Button onClick={saveSettings} className="bg-teal-600 hover:bg-teal-500 text-white font-bold" data-testid="button-save-economy">
          Save Settings
        </Button>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1.5" data-testid="button-award-currency">
              <Coins className="h-4 w-4" /> Award Currency
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Award Currency</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <p className={LabelStyle}>Student</p>
                <select value={awardData.studentId} onChange={e => setAwardData(p => ({ ...p, studentId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" data-testid="select-award-student">
                  <option value="">Select student...</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                </select>
              </div>
              <div>
                <p className={LabelStyle}>Amount</p>
                <Input type="number" placeholder="50" value={awardData.amount} onChange={e => setAwardData(p => ({ ...p, amount: e.target.value }))} className={InputStyle} data-testid="input-award-amount" />
              </div>
              <div>
                <p className={LabelStyle}>Note (optional)</p>
                <Input placeholder="e.g. Great participation today!" value={awardData.description} onChange={e => setAwardData(p => ({ ...p, description: e.target.value }))} className={InputStyle} data-testid="input-award-description" />
              </div>
              <Button onClick={awardCurrency} disabled={!awardData.studentId || !awardData.amount} className="w-full bg-amber-600 hover:bg-amber-500 text-white" data-testid="button-submit-award">Award</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold gap-1.5" data-testid="button-create-expense">
              <Receipt className="h-4 w-4" /> New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Create Expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><p className={LabelStyle}>Name</p><Input placeholder="e.g. Rent" value={expenseData.name} onChange={e => setExpenseData(p => ({ ...p, name: e.target.value }))} className={InputStyle} /></div>
              <div><p className={LabelStyle}>Amount</p><Input type="number" placeholder="50" value={expenseData.amount} onChange={e => setExpenseData(p => ({ ...p, amount: e.target.value }))} className={InputStyle} /></div>
              <div><p className={LabelStyle}>Frequency</p>
                <select value={expenseData.frequency} onChange={e => setExpenseData(p => ({ ...p, frequency: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="once">One-time</option>
                </select>
              </div>
              <Button onClick={createExpense} disabled={!expenseData.name || !expenseData.amount} className="w-full bg-red-600 hover:bg-red-500 text-white">Create Expense</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold gap-1.5" data-testid="button-create-job">
              <Briefcase className="h-4 w-4" /> New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Create Classroom Job</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><p className={LabelStyle}>Job Title</p><Input placeholder="e.g. Class Banker" value={jobData.title} onChange={e => setJobData(p => ({ ...p, title: e.target.value }))} className={InputStyle} /></div>
              <div><p className={LabelStyle}>Description (optional)</p><Input placeholder="What does this job involve?" value={jobData.description} onChange={e => setJobData(p => ({ ...p, description: e.target.value }))} className={InputStyle} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className={LabelStyle}>Pay Amount</p><Input type="number" placeholder="25" value={jobData.payAmount} onChange={e => setJobData(p => ({ ...p, payAmount: e.target.value }))} className={InputStyle} /></div>
                <div><p className={LabelStyle}>Pay Frequency</p>
                  <select value={jobData.payFrequency} onChange={e => setJobData(p => ({ ...p, payFrequency: e.target.value }))} className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <Button onClick={createJob} disabled={!jobData.title || !jobData.payAmount} className="w-full bg-blue-600 hover:bg-blue-500 text-white">Create Job</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={auctionDialogOpen} onOpenChange={setAuctionDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold gap-1.5" data-testid="button-create-auction">
              <Gavel className="h-4 w-4" /> New Auction
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Create Auction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1"><p className={LabelStyle}>Emoji</p><Input placeholder="🎁" value={auctionData.emoji} onChange={e => setAuctionData(p => ({ ...p, emoji: e.target.value }))} className={InputStyle} /></div>
                <div className="col-span-3"><p className={LabelStyle}>Item/Reward</p><Input placeholder="e.g. Free homework pass" value={auctionData.title} onChange={e => setAuctionData(p => ({ ...p, title: e.target.value }))} className={InputStyle} /></div>
              </div>
              <div><p className={LabelStyle}>Description (optional)</p><Input placeholder="What is this reward?" value={auctionData.description} onChange={e => setAuctionData(p => ({ ...p, description: e.target.value }))} className={InputStyle} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className={LabelStyle}>Starting Bid</p><Input type="number" placeholder="1" value={auctionData.startingBid} onChange={e => setAuctionData(p => ({ ...p, startingBid: e.target.value }))} className={InputStyle} /></div>
                <div><p className={LabelStyle}>End Date & Time</p><Input type="datetime-local" value={auctionData.endDate} onChange={e => setAuctionData(p => ({ ...p, endDate: e.target.value }))} className={InputStyle} /></div>
              </div>
              <Button onClick={createAuction} disabled={!auctionData.title || !auctionData.startingBid || !auctionData.endDate} className="w-full bg-amber-600 hover:bg-amber-500 text-white">Create Auction</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold gap-1.5" data-testid="button-create-store-item">
              <ShoppingBag className="h-4 w-4" /> Add Store Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10">
            <DialogHeader><DialogTitle className="text-white">Add Store Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1"><p className={LabelStyle}>Emoji</p><Input placeholder="🎁" value={storeData.emoji} onChange={e => setStoreData(p => ({ ...p, emoji: e.target.value }))} className={InputStyle} /></div>
                <div className="col-span-3"><p className={LabelStyle}>Item Name</p><Input placeholder="e.g. Snack pass" value={storeData.name} onChange={e => setStoreData(p => ({ ...p, name: e.target.value }))} className={InputStyle} /></div>
              </div>
              <div><p className={LabelStyle}>Description</p><Input placeholder="What is this item?" value={storeData.description} onChange={e => setStoreData(p => ({ ...p, description: e.target.value }))} className={InputStyle} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className={LabelStyle}>Price ({currencySymbol})</p><Input type="number" placeholder="100" value={storeData.price} onChange={e => setStoreData(p => ({ ...p, price: e.target.value }))} className={InputStyle} /></div>
                <div><p className={LabelStyle}>Stock (leave empty = unlimited)</p><Input type="number" placeholder="—" value={storeData.stock} onChange={e => setStoreData(p => ({ ...p, stock: e.target.value }))} className={InputStyle} /></div>
              </div>
              <Button onClick={createStoreItem} disabled={!storeData.name || !storeData.price} className="w-full bg-purple-600 hover:bg-purple-500 text-white">Add to Store</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Student Balances */}
      <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
        <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-400" /> Student Balances — {currencyName}
        </h3>
        {balances.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No economy data yet. Set up the economy settings to get started.</p>
        ) : (
          <div className="space-y-2">
            {[...balances].sort((a: any, b: any) => b.balance - a.balance).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-testid={`economy-student-${s.id}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                  {s.displayName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{s.displayName}</p>
                </div>
                <span className="font-bold text-amber-300 text-sm">{currencySymbol}{(s.balance ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses */}
      {expenses.length > 0 && (
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-red-400" /> Active Expenses
          </h3>
          <div className="space-y-2">
            {expenses.map((exp: any) => (
              <div key={exp.id} className="flex items-center gap-3 rounded-xl p-3 bg-red-500/5 border border-red-500/15">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{exp.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{exp.frequency} · {currencySymbol}{exp.amount} per student</p>
                </div>
                <Button size="sm" onClick={() => collectExpense(exp.id)} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold" data-testid={`button-collect-${exp.id}`}>Collect</Button>
                <Button size="sm" variant="ghost" onClick={() => apiRequest("DELETE", `/api/economy/expenses/${exp.id}`).then(invalidateAll)} className="text-slate-500 hover:text-red-400 text-xs">Remove</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs */}
      {jobs.length > 0 && (
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-400" /> Classroom Jobs
            </h3>
            <Button size="sm" onClick={payAllJobs} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1" data-testid="button-pay-all-jobs">
              <Coins className="h-3 w-3" /> Pay All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jobs.map((job: any) => {
              const assigned = jobAssignments.filter((a: any) => a.jobId === job.id);
              return (
                <div key={job.id} className="rounded-xl p-4 bg-blue-500/5 border border-blue-500/15">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white text-sm">{job.title}</p>
                      <p className="text-xs text-slate-500">{currencySymbol}{job.payAmount} / {job.payFrequency}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => apiRequest("DELETE", `/api/economy/jobs/${job.id}`).then(invalidateAll)} className="text-slate-600 hover:text-red-400 text-xs h-6 px-1">✕</Button>
                  </div>
                  {assigned.length > 0 ? (
                    <div className="text-xs text-slate-400">Assigned: {assigned.map((a: any) => a.studentName).join(", ")}</div>
                  ) : (
                    <select onChange={e => e.target.value && assignJob(job.id, e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-slate-400 text-xs mt-1">
                      <option value="">Assign to student...</option>
                      {students.map((s: any) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auctions */}
      {activeAuctions.length > 0 && (
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-amber-400" /> Live Auctions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeAuctions.map((a: any) => (
              <div key={a.id} className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/15 flex justify-between items-start" data-testid={`teacher-auction-${a.id}`}>
                <div>
                  <p className="font-bold text-white text-sm">{a.emoji} {a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">High bid: {currencySymbol}{a.currentHighBid ?? 0} · Ends {new Date(a.endDate).toLocaleDateString()}</p>
                </div>
                <Button size="sm" onClick={() => apiRequest("POST", `/api/economy/auctions/${a.id}/close`, {}).then(() => { invalidateAll(); toast({ title: "Auction closed!" }); })}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0" data-testid={`button-close-auction-${a.id}`}>Close</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store Items */}
      {storeItems.length > 0 && (
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-purple-400" /> Classroom Store
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {storeItems.map((item: any) => (
              <div key={item.id} className="rounded-xl p-3 bg-purple-500/5 border border-purple-500/15 relative">
                <Button size="sm" variant="ghost" onClick={() => apiRequest("DELETE", `/api/economy/store/${item.id}`).then(invalidateAll)} className="absolute top-1 right-1 text-slate-600 hover:text-red-400 h-5 w-5 p-0">✕</Button>
                <span className="text-2xl">{item.emoji}</span>
                <p className="font-bold text-white text-xs mt-1 truncate">{item.name}</p>
                <p className="text-purple-300 font-bold text-xs">{currencySymbol}{item.price}</p>
                {item.stock !== null && <p className="text-slate-500 text-xs">{item.stock} left</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets */}
      <div className="rounded-2xl p-5 bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-white text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-400" /> Assets
          </h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={processAssetIncome}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs" data-testid="button-process-asset-income">
              <Zap className="h-3 w-3 mr-1" /> Pay Income
            </Button>
            <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs" data-testid="button-open-create-asset">
                  <Plus className="h-3 w-3 mr-1" /> Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0f172a] border-white/10 max-w-md">
                <DialogHeader><DialogTitle className="text-white">Create Asset</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="flex gap-2">
                    <Input placeholder="Emoji" value={assetData.emoji} onChange={e => setAssetData(p => ({ ...p, emoji: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white w-16 text-center text-lg" />
                    <Input placeholder="Asset name" value={assetData.name} onChange={e => setAssetData(p => ({ ...p, name: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white flex-1" data-testid="input-asset-name" />
                  </div>
                  <Input placeholder="Description (optional)" value={assetData.description} onChange={e => setAssetData(p => ({ ...p, description: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white" />
                  <div className="grid grid-cols-3 gap-2">
                    {["property", "business", "investment"].map(t => (
                      <button key={t} onClick={() => setAssetData(p => ({ ...p, type: t }))}
                        className={`rounded-lg p-2 text-xs font-bold capitalize transition-all ${assetData.type === t ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                        data-testid={`button-type-${t}`}>
                        {t === "property" ? "🏠" : t === "business" ? "🏢" : "📈"} {t}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Purchase Price *</p>
                      <Input type="number" placeholder="500" value={assetData.price} onChange={e => setAssetData(p => ({ ...p, price: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" data-testid="input-asset-price" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Net Worth Value</p>
                      <Input type="number" placeholder="Same as price" value={assetData.value} onChange={e => setAssetData(p => ({ ...p, value: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Passive Income</p>
                      <Input type="number" placeholder="0" value={assetData.passiveIncome} onChange={e => setAssetData(p => ({ ...p, passiveIncome: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Income Frequency</p>
                      <select value={assetData.incomeFrequency} onChange={e => setAssetData(p => ({ ...p, incomeFrequency: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white/5 border border-white/20 text-white text-sm px-2">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Maintenance Cost</p>
                      <Input type="number" placeholder="0" value={assetData.maintenanceCost} onChange={e => setAssetData(p => ({ ...p, maintenanceCost: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Max Owners (optional)</p>
                      <Input type="number" placeholder="∞" value={assetData.maxOwners} onChange={e => setAssetData(p => ({ ...p, maxOwners: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" />
                    </div>
                  </div>
                  <Button onClick={createAsset} disabled={!assetData.name || !assetData.price}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold" data-testid="button-create-asset">
                    Create Asset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">Create assets students can purchase. Press "Pay Income" to distribute passive income to all owners.</p>
        {(classroomAssets as any[]).length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No assets yet. Add some for students to invest in!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(classroomAssets as any[]).map((asset: any) => (
              <div key={asset.id} className="rounded-xl p-4 bg-white/5 border border-white/10 flex flex-col gap-2" data-testid={`asset-card-${asset.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{asset.emoji}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{asset.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{asset.type}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost"
                    onClick={() => apiRequest("DELETE", `/api/economy/assets/${asset.id}`, {}).then(() => { invalidateAll(); toast({ title: "Asset deleted" }); })}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 -mt-1 -mr-1 h-7 w-7 p-0" data-testid={`button-delete-asset-${asset.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="bg-white/8 rounded-md px-2 py-0.5 text-slate-300">💰 {asset.price} to buy</span>
                  {asset.passiveIncome > 0 && <span className="bg-emerald-500/15 rounded-md px-2 py-0.5 text-emerald-300">+{asset.passiveIncome}/{asset.incomeFrequency}</span>}
                  {asset.maintenanceCost > 0 && <span className="bg-red-500/15 rounded-md px-2 py-0.5 text-red-300">-{asset.maintenanceCost} upkeep</span>}
                  {asset.maxOwners !== null && <span className="bg-blue-500/15 rounded-md px-2 py-0.5 text-blue-300">{asset.maxOwners} max owners</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Economy Events */}
      <div className="rounded-2xl p-5 bg-rose-500/5 border border-rose-500/20">
        <h3 className="font-black text-white text-base mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-rose-400" /> Economy Events
        </h3>
        <p className="text-xs text-slate-500 mb-4">Trigger class-wide financial events that affect all students at once.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {(["bonus", "fine", "fine_percent", "interest"] as const).map(m => (
            <button key={m} onClick={() => setEventData(d => ({ ...d, mode: m }))}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all ${eventData.mode === m ? m === "bonus" ? "bg-emerald-500 text-white" : m === "fine" || m === "fine_percent" ? "bg-rose-500 text-white" : "bg-teal-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              data-testid={`button-event-mode-${m}`}>
              {m === "bonus" ? "💰 Class Bonus" : m === "fine" ? "💸 Class Fine" : m === "fine_percent" ? "📊 % Fine" : "🏦 Apply Interest"}
            </button>
          ))}
        </div>
        {(eventData.mode === "bonus" || eventData.mode === "fine") && (
          <div className="flex gap-2 mb-3">
            <Input type="number" placeholder={`Amount (${currencySymbol})`} value={eventData.amount} onChange={e => setEventData(d => ({ ...d, amount: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-event-amount" />
            <Input placeholder="Description (optional)" value={eventData.description} onChange={e => setEventData(d => ({ ...d, description: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-event-description" />
          </div>
        )}
        {eventData.mode === "fine_percent" && (
          <div className="flex gap-2 mb-3">
            <Input type="number" placeholder="Percent (e.g. 10)" value={eventData.percent} onChange={e => setEventData(d => ({ ...d, percent: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-event-percent" />
            <Input placeholder="Description (optional)" value={eventData.description} onChange={e => setEventData(d => ({ ...d, description: e.target.value }))}
              className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
        )}
        {eventData.mode === "interest" && (
          <p className="text-xs text-slate-400 mb-3">
            Will apply <span className="text-teal-300 font-bold">{settings?.savingsInterestRate ?? 0}%</span> interest to all student savings accounts.
            Interest rate can be changed in Settings above.
          </p>
        )}
        <Button onClick={triggerEvent}
          disabled={!selectedClassId || (eventData.mode !== "interest" && eventData.mode !== "fine_percent" && !eventData.amount) || (eventData.mode === "fine_percent" && !eventData.percent)}
          className={`text-white font-bold text-sm ${eventData.mode === "bonus" ? "bg-emerald-600 hover:bg-emerald-500" : eventData.mode === "interest" ? "bg-teal-600 hover:bg-teal-500" : "bg-rose-600 hover:bg-rose-500"}`}
          data-testid="button-trigger-event">
          {eventData.mode === "bonus" ? "Send Bonus to All" : eventData.mode === "fine" ? "Charge All Students" : eventData.mode === "fine_percent" ? "Apply % Fine to All" : "Apply Savings Interest"}
        </Button>
      </div>

      {/* Loans */}
      <div className="rounded-2xl p-5 bg-orange-500/5 border border-orange-500/20">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-white text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-orange-400" /> Student Loans
          </h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyLoanInterest}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs" data-testid="button-apply-loan-interest">
              <Zap className="h-3 w-3 mr-1" /> Apply Interest
            </Button>
            <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs" data-testid="button-open-issue-loan">
                  <Plus className="h-3 w-3 mr-1" /> Issue Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0f172a] border-white/10 max-w-sm">
                <DialogHeader><DialogTitle className="text-white">Issue Loan to Student</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Student</p>
                    <select value={loanData.studentId} onChange={e => setLoanData(p => ({ ...p, studentId: e.target.value }))}
                      className="w-full h-9 rounded-md bg-white/5 border border-white/20 text-white text-sm px-2" data-testid="select-loan-student">
                      <option value="">Select student…</option>
                      {(balances as any[]).map((s: any) => (
                        <option key={s.id ?? s.studentId} value={s.id ?? s.studentId}>{s.displayName ?? (s.id ?? s.studentId)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Loan Amount *</p>
                      <Input type="number" placeholder="500" value={loanData.amount} onChange={e => setLoanData(p => ({ ...p, amount: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" data-testid="input-loan-amount" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Interest Rate %</p>
                      <Input type="number" placeholder="10" value={loanData.interestRate} onChange={e => setLoanData(p => ({ ...p, interestRate: e.target.value }))}
                        className="bg-white/5 border-white/20 text-white" data-testid="input-loan-rate" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Due Date (optional)</p>
                    <Input type="date" value={loanData.dueDate} onChange={e => setLoanData(p => ({ ...p, dueDate: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white" />
                  </div>
                  <Button onClick={issueLoan} disabled={!loanData.studentId || !loanData.amount}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold" data-testid="button-issue-loan">
                    Issue Loan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">Issue loans to students. Press "Apply Interest" to charge interest on all outstanding balances.</p>
        {(classLoans as any[]).filter((l: any) => l.loan?.isActive).length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active loans.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(classLoans as any[]).filter((l: any) => l.loan?.isActive).map((item: any) => {
              const { loan, displayName } = item;
              const pctPaid = loan.principal > 0 ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100) : 0;
              return (
                <div key={loan.id} className="rounded-xl p-3 bg-white/5 border border-white/10 flex items-center gap-3" data-testid={`loan-row-${loan.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-white text-sm">{displayName}</p>
                      <span className="text-xs text-orange-300 bg-orange-500/15 rounded-md px-1.5 py-0.5">{loan.interestRate}% interest</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctPaid}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-orange-300">{currencySymbol}{loan.balance.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">of {currencySymbol}{loan.principal.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Challenges */}
      <div className="rounded-2xl p-5 bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" /> Challenges
            </h3>
            <p className="text-xs text-slate-500">Create class challenges visible on students' Economy page.</p>
          </div>
          <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1" data-testid="button-create-challenge">
                <Plus className="h-3 w-3" /> New Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a] border-white/10">
              <DialogHeader><DialogTitle className="text-white">Create Challenge</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Emoji" value={challengeData.emoji} onChange={e => setChallengeData(d => ({ ...d, emoji: e.target.value }))}
                    className="w-20 bg-white/5 border-white/10 text-white text-center text-lg" maxLength={2} data-testid="input-challenge-emoji" />
                  <Input placeholder="Challenge title *" value={challengeData.title} onChange={e => setChallengeData(d => ({ ...d, title: e.target.value }))}
                    className="flex-1 bg-white/5 border-white/10 text-white" data-testid="input-challenge-title" />
                </div>
                <Input placeholder="Description (optional)" value={challengeData.description} onChange={e => setChallengeData(d => ({ ...d, description: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white" data-testid="input-challenge-description" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Challenge Type</p>
                  <select value={challengeData.type} onChange={e => setChallengeData(d => ({ ...d, type: e.target.value }))}
                    className="w-full bg-[#1e293b] border border-white/10 text-white rounded-lg px-3 py-2 text-sm" data-testid="select-challenge-type">
                    <option value="most_coins">Most Coins</option>
                    <option value="most_savings">Most Savings</option>
                    <option value="most_lessons">Most Lessons Completed</option>
                    <option value="most_quizzes">Most Quizzes Passed</option>
                    <option value="custom">Custom / Manual</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input type="number" placeholder={`Reward (${currencySymbol})`} value={challengeData.rewardAmount}
                    onChange={e => setChallengeData(d => ({ ...d, rewardAmount: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white" data-testid="input-challenge-reward" />
                  <Input placeholder="Reward description" value={challengeData.rewardDescription}
                    onChange={e => setChallengeData(d => ({ ...d, rewardDescription: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white" data-testid="input-challenge-reward-desc" />
                </div>
                <Input type="datetime-local" value={challengeData.endDate} onChange={e => setChallengeData(d => ({ ...d, endDate: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-sm" data-testid="input-challenge-end-date" />
                <Button onClick={createChallenge} disabled={!challengeData.title} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold" data-testid="button-submit-challenge">
                  Create Challenge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {(challenges as any[]).length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No challenges yet. Create one to motivate students!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(challenges as any[]).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl p-3 bg-amber-500/10 border border-amber-500/20" data-testid={`challenge-row-${c.id}`}>
                <span className="text-xl">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{c.title}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${c.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>{c.isActive ? "Active" : "Closed"}</span>
                    {c.rewardAmount > 0 && <span className="text-xs text-amber-300">{currencySymbol}{c.rewardAmount} reward</span>}
                    {c.endDate && <span className="text-xs text-slate-500">ends {format(new Date(c.endDate), "MMM d")}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {c.isActive && (
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-amber-400 text-xs h-7" data-testid={`button-close-challenge-${c.id}`}
                      onClick={() => apiRequest("POST", `/api/economy/challenges/${c.id}/close`, {}).then(invalidateAll)}>
                      Close
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-400 h-7 w-7 p-0" data-testid={`button-delete-challenge-${c.id}`}
                    onClick={() => apiRequest("DELETE", `/api/economy/challenges/${c.id}`).then(invalidateAll)}>✕</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class Leaderboard */}
      {classLeaderboard.length > 0 && (
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
          <h3 className="font-black text-white text-base mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" /> Class Leaderboard
          </h3>
          <div className="space-y-1.5">
            {classLeaderboard.slice(0, 10).map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/3" data-testid={`leaderboard-teacher-row-${s.id}`}>
                <span className="w-6 text-center text-sm font-black text-slate-500">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.displayName}</p>
                </div>
                <span className="font-bold text-amber-300 text-sm">{currencySymbol}{(s.balance ?? 0).toLocaleString()}</span>
                {s.savingsBalance > 0 && <span className="text-xs text-emerald-400 font-medium">+{currencySymbol}{s.savingsBalance} saved</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getEventEmoji(type: string) {
  return { boom: "🚀", crash: "📉", news: "📰", tip: "💡" }[type] ?? "📢";
}
function getEventLabel(type: string) {
  return { boom: "Market Boom", crash: "Market Crash", news: "News Alert", tip: "Trading Tip" }[type] ?? "Event";
}
function getEventBg(type: string) {
  return { boom: "bg-emerald-500/10 border-emerald-500/25", crash: "bg-rose-500/10 border-rose-500/25", news: "bg-blue-500/10 border-blue-500/25", tip: "bg-amber-500/10 border-amber-500/25" }[type] ?? "bg-white/5 border-white/10";
}
function getEventBadgeStyle(type: string) {
  return { boom: "bg-emerald-500/20 text-emerald-400", crash: "bg-rose-500/20 text-rose-400", news: "bg-blue-500/20 text-blue-400", tip: "bg-amber-500/20 text-amber-400" }[type] ?? "bg-white/10 text-white";
}
function getEventHint(type: string) {
  return {
    boom: "Students will see this as a positive market signal — great time to buy!",
    crash: "Students will see this as a market warning — time to be cautious or sell.",
    news: "Students will receive this as a general market update.",
    tip: "Students will receive this as a teaching moment from you.",
  }[type] ?? "Students will see this event in their dashboard.";
}
function getAssignmentTypeLabel(type: string) {
  return { profit_target: "Profit Target", lesson_completion: "Lesson", portfolio_balance: "Balance" }[type] ?? type;
}
function getAssignmentTypeStyle(type: string) {
  return { profit_target: "bg-emerald-500/20 text-emerald-400", lesson_completion: "bg-blue-500/20 text-blue-400", portfolio_balance: "bg-purple-500/20 text-purple-400" }[type] ?? "bg-white/10 text-white";
}
