import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  User as UserIcon,
  Users,
  Coins,
  Zap,
  Gamepad2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { type Class, type User, type Assignment } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClassroomData {
  class: Class;
  teacher: { id: string; displayName: string } | null;
  classmates: { id: string; displayName: string; totalProfit: number; avatarUrl?: string | null }[];
}

interface AssignmentWithProgress extends Assignment {
  progress: {
    completed: boolean;
    currentValue: number;
  };
}

export default function ClassroomPage() {
  const { user } = useAuth();

  const { data: classroom, isLoading: classroomLoading } = useQuery<ClassroomData>({
    queryKey: ["/api/classroom"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<AssignmentWithProgress[]>({
    queryKey: ["/api/classroom/assignments"],
  });

  const { data: events } = useQuery<{ id: string; type: string; title: string; description: string; createdAt: string }[]>({
    queryKey: ["/api/classroom/events"],
  });

  if (classroomLoading || assignmentsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="container mx-auto p-6 text-center space-y-4">
        <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Classroom Joined</h2>
        <p className="text-muted-foreground">
          You are not currently enrolled in any class. Ask your teacher for a join code.
        </p>
      </div>
    );
  }

  const sortedClassmates = [...(classroom.classmates || [])].sort(
    (a, b) => (b.totalProfit || 0) - (a.totalProfit || 0)
  );

  const completedAssignments = assignments?.filter(a => a.progress.completed).length ?? 0;
  const totalAssignments = assignments?.length ?? 0;
  const assignmentProgress = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{classroom.class.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <UserIcon className="h-4 w-4" />
            Teacher: {classroom.teacher?.displayName || "Unknown"}
          </p>
          {(classroom.class as any).ageGroup && (
            <Badge variant="secondary" className="mt-2 text-xs gap-1">
              {{primary: "🎨 Primary", intermediate: "📐 Intermediate", high_school: "📊 High School"}[(classroom.class as any).ageGroup] || "High School"}
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="w-fit text-sm py-1 px-3 gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Join Code: {classroom.class.joinCode}
          </Badge>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
              <Coins className="h-4 w-4" />
              <span data-testid="text-classroom-tokens">{(user as any)?.classroomTokens ?? 0} tokens</span>
            </div>
            <Link href="/fun-zone">
              <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30">
                <Gamepad2 className="h-3.5 w-3.5" /> Fun Zone
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {events && events.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-500" /> Live Market Events
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {events.map(event => {
              const icons: Record<string, string> = { boom: "📈", crash: "📉", news: "📰", challenge: "🏆", tip: "💡" };
              const colors: Record<string, string> = { boom: "border-green-500/30 bg-green-500/5", crash: "border-red-500/30 bg-red-500/5", news: "border-blue-500/30 bg-blue-500/5", challenge: "border-amber-500/30 bg-amber-500/5", tip: "border-primary/30 bg-primary/5" };
              return (
                <div key={event.id} className={`flex-shrink-0 rounded-lg border p-3 min-w-[200px] max-w-[280px] ${colors[event.type] || "border-border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icons[event.type] || "📌"}</span>
                    <span className="font-semibold text-sm">{event.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Summary Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              My Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assignments Completed</span>
                <span className="font-medium">{completedAssignments}/{totalAssignments}</span>
              </div>
              <Progress value={assignmentProgress} className="h-2" />
            </div>
            
            <div className="pt-2 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Class Rank</p>
                <p className="text-2xl font-bold">
                  #{sortedClassmates.findIndex(c => c.id === user?.id) + 1}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Profit</p>
                <p className="text-2xl font-bold text-success">
                  ${user?.totalProfit?.toLocaleString() ?? "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Active Assignments
            </CardTitle>
            <CardDescription>Complete these tasks assigned by your teacher</CardDescription>
          </CardHeader>
          <CardContent>
            {(!assignments || assignments.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No assignments posted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const isCompleted = assignment.progress.completed;
                  const progressValue = assignment.targetValue > 0 
                    ? Math.min(100, (assignment.progress.currentValue / assignment.targetValue) * 100)
                    : isCompleted ? 100 : 0;

                  return (
                    <div 
                      key={assignment.id} 
                      className="flex flex-col p-4 rounded-lg border bg-card hover-elevate transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{assignment.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.description}
                          </p>
                        </div>
                        {isCompleted ? (
                          <Badge className="bg-success/10 text-success border-success/20 gap-1 no-default-active-elevate">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 no-default-active-elevate">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Progress: {assignment.type.replace("_", " ")}
                          </span>
                          <span className="font-medium">
                            {Math.round(progressValue)}%
                          </span>
                        </div>
                        <Progress value={progressValue} className="h-1.5" />
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Due: {assignment.dueDate ? format(new Date(assignment.dueDate), "MMM d, yyyy") : "No deadline"}
                          </span>
                        </div>
                        <span className="font-medium">
                          Goal: {assignment.type === "profit_target" ? "$" : ""}{assignment.targetValue.toLocaleString()}{assignment.type === "lesson_completion" ? " Lessons" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Leaderboard */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Class Leaderboard
            </CardTitle>
            <CardDescription>Top performers in your class</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sortedClassmates.slice(0, 10).map((classmate, index) => (
                <div 
                  key={classmate.id} 
                  className={`flex items-center gap-3 p-4 ${classmate.id === user?.id ? "bg-primary/5" : ""}`}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {index + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={classmate.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {classmate.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{classmate.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      ${classmate.totalProfit?.toLocaleString() ?? "0"} profit
                    </p>
                  </div>
                  {index === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                </div>
              ))}
              {sortedClassmates.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>No classmates yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
