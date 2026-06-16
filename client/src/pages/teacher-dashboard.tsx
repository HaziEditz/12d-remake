import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Plus, 
  Trash2, 
  Copy, 
  TrendingUp, 
  BookOpen,
  DollarSign,
  BarChart3,
  GraduationCap,
  ChevronRight,
  Loader2,
  Trophy,
  Crown,
  Medal,
  CreditCard,
  Lock,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";

interface Class {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  createdAt: string;
}

interface StudentProgress {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  lessonsCompleted: number;
  totalProfit: number;
  simulatorBalance: number;
  totalTrades: number;
  profitableTrades: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  targetValue: number;
  dueDate: string | null;
  classId: string | null;
}

interface NewStudentResult {
  id: string;
  displayName: string;
  email: string;
  temporaryPassword: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassAgeGroup, setNewClassAgeGroup] = useState("high_school");
  const [newEventType, setNewEventType] = useState("news");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<NewStudentResult | null>(null);

  // Assignment states
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentType, setAssignmentType] = useState("profit_target");
  const [assignmentTargetValue, setAssignmentTargetValue] = useState("1000");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");

  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ["/api/teacher/classes"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<StudentProgress[]>({
    queryKey: ["/api/teacher/classes", selectedClass?.id, "students"],
    enabled: !!selectedClass,
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
  });

  const { data: classroomEvents } = useQuery<{ id: string; type: string; title: string; description: string; createdAt: string }[]>({
    queryKey: ["/api/classroom/events", selectedClass?.id],
    enabled: !!selectedClass,
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/classroom/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classroom/events", selectedClass?.id] });
      toast({ title: "Event removed" });
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/teacher/classes", { name: newClassName, description: newClassDescription, ageGroup: newClassAgeGroup });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      setNewClassName("");
      setNewClassDescription("");
      setNewClassAgeGroup("high_school");
      setCreateClassOpen(false);
      toast({ title: "Class created successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create class", description: error.message, variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/classroom/events", {
        classId: selectedClass?.id,
        type: newEventType,
        title: newEventTitle,
        description: newEventDescription,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classroom/events", selectedClass?.id] });
      setNewEventTitle("");
      setNewEventDescription("");
      setCreateEventOpen(false);
      toast({ title: "Market event posted!", description: "Your students will see this event in their classroom." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to post event", description: error.message, variant: "destructive" });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      return apiRequest("DELETE", `/api/teacher/classes/${classId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      setSelectedClass(null);
      toast({ title: "Class deleted" });
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/teacher/classes/${selectedClass?.id}/students`, {
        displayName: newStudentName,
        email: newStudentEmail,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes", selectedClass?.id, "students"] });
      setCreatedStudent(data.student);
      setNewStudentName("");
      setNewStudentEmail("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to add student", description: error.message, variant: "destructive" });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest("DELETE", `/api/teacher/classes/${selectedClass?.id}/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classes", selectedClass?.id, "students"] });
      toast({ title: "Student removed from class" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/teacher/assignments", {
        title: assignmentTitle,
        description: assignmentDescription,
        type: assignmentType,
        targetValue: parseFloat(assignmentTargetValue),
        dueDate: assignmentDueDate ? new Date(assignmentDueDate).toISOString() : null,
        classId: selectedClass?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      setAssignmentTitle("");
      setAssignmentDescription("");
      setCreateAssignmentOpen(false);
      toast({ title: "Assignment created successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create assignment", description: error.message, variant: "destructive" });
    },
  });

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Join code copied!" });
  };

  const copyCredentials = () => {
    if (createdStudent) {
      const text = `Email: ${createdStudent.email}\nPassword: ${createdStudent.temporaryPassword}`;
      navigator.clipboard.writeText(text);
      toast({ title: "Login credentials copied!" });
    }
  };

  const closeStudentDialog = () => {
    setAddStudentOpen(false);
    setCreatedStudent(null);
    setNewStudentName("");
    setNewStudentEmail("");
  };

  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]" data-testid="unauthorized-message">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">You need to be a teacher to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasActiveSubscription = user.role === "admin" || (user.membershipTier === "school" && user.membershipStatus === "active");

  if (!hasActiveSubscription && user.role === "teacher") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]" data-testid="subscription-required">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Subscription Required</h2>
            <p className="text-muted-foreground mb-6">
              To access the Teacher Dashboard and manage your students, you need an active School Plan subscription.
            </p>
            <div className="rounded-lg bg-muted p-4 mb-6 text-left">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                School Plan - $8.49/student/month
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Create unlimited classes</li>
                <li>Add and manage student accounts</li>
                <li>Track student progress and performance</li>
                <li>Class leaderboards and analytics</li>
              </ul>
            </div>
            <Link href="/pricing">
              <Button className="w-full" data-testid="button-subscribe">
                Subscribe Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <GraduationCap className="h-6 w-6" />
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your classes and track student progress</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Your Classes</CardTitle>
              <Dialog open={createClassOpen} onOpenChange={setCreateClassOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" data-testid="button-create-class">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Class</DialogTitle>
                    <DialogDescription>
                      Create a class to organize your students. You can add students after creating the class.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">Class Name</label>
                      <Input
                        placeholder="e.g., Period 3 Finance"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        data-testid="input-class-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (optional)</label>
                      <Input
                        placeholder="e.g., Intro to investing course"
                        value={newClassDescription}
                        onChange={(e) => setNewClassDescription(e.target.value)}
                        data-testid="input-class-description"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Age Group</label>
                      <Select value={newClassAgeGroup} onValueChange={setNewClassAgeGroup}>
                        <SelectTrigger data-testid="select-age-group">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">🎨 Primary (Ages 6–10)</SelectItem>
                          <SelectItem value="intermediate">📐 Intermediate (Ages 11–13)</SelectItem>
                          <SelectItem value="high_school">📊 High School (Ages 14–18)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createClassMutation.mutate()}
                      disabled={!newClassName || createClassMutation.isPending}
                      data-testid="button-submit-class"
                    >
                      {createClassMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Class
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {classesLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-classes">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !classes || classes.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-classes">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No classes yet</p>
                <p className="text-xs text-muted-foreground">Create your first class to get started</p>
              </div>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`p-3 rounded-lg cursor-pointer hover-elevate ${
                    selectedClass?.id === cls.id ? "bg-accent" : "bg-muted/50"
                  }`}
                  onClick={() => setSelectedClass(cls)}
                  data-testid={`class-item-${cls.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" data-testid={`text-class-name-${cls.id}`}>{cls.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Code: {cls.joinCode}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {!selectedClass ? (
            <Card className="flex-1 flex items-center justify-center" data-testid="no-class-selected">
              <CardContent className="text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Select a Class</h2>
                <p className="text-muted-foreground">
                  Choose a class from the sidebar to view students and their progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle data-testid="text-selected-class-name">{selectedClass.name}</CardTitle>
                      {selectedClass.description && (
                        <CardDescription>{selectedClass.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyJoinCode(selectedClass.joinCode)}
                        data-testid="button-copy-code"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Join Code: {selectedClass.joinCode}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteClassMutation.mutate(selectedClass.id)}
                        disabled={deleteClassMutation.isPending}
                        data-testid="button-delete-class"
                      >
                        {deleteClassMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {students && students.length > 0 && (
                <Card data-testid="card-class-leaderboard">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Class Leaderboard
                    </CardTitle>
                    <CardDescription>Top performing students by total profit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...students]
                        .sort((a, b) => (b.totalProfit ?? 0) - (a.totalProfit ?? 0))
                        .slice(0, 5)
                        .map((student, index) => (
                          <div 
                            key={student.id}
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                              index === 1 ? 'bg-slate-400/10 border border-slate-400/20' :
                              index === 2 ? 'bg-orange-600/10 border border-orange-600/20' :
                              'bg-muted/50'
                            }`}
                            data-testid={`leaderboard-row-${index + 1}`}
                          >
                            <div className="flex items-center justify-center w-8 h-8">
                              {index === 0 ? (
                                <Crown className="h-6 w-6 text-yellow-500" />
                              ) : index === 1 ? (
                                <Medal className="h-5 w-5 text-slate-400" />
                              ) : index === 2 ? (
                                <Medal className="h-5 w-5 text-orange-600" />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium" data-testid={`leaderboard-name-${index + 1}`}>{student.displayName}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.lessonsCompleted} lessons | {student.profitableTrades}/{student.totalTrades} wins
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${student.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`} data-testid={`leaderboard-profit-${index + 1}`}>
                                {student.totalProfit >= 0 ? '+' : ''}${student.totalProfit.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">${student.simulatorBalance.toLocaleString()}</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="students" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start border-b rounded-none px-4 bg-transparent h-12 flex-shrink-0">
                  <TabsTrigger value="students" className="gap-2">
                    <Users className="h-4 w-4" />
                    Students
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Assignments
                  </TabsTrigger>
                  <TabsTrigger value="events" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Market Events
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="flex-1 overflow-hidden flex flex-col m-0 border-0 p-0">
                  <Card className="flex-1 border-0 rounded-none shadow-none flex flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">Enrolled Students</CardTitle>
                          <CardDescription data-testid="text-student-count">{students?.length ?? 0} students in this class</CardDescription>
                        </div>
                        <Dialog open={addStudentOpen} onOpenChange={(open) => {
                          if (!open) closeStudentDialog();
                          else setAddStudentOpen(true);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-add-student">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Student
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            {createdStudent ? (
                              <>
                                <DialogHeader>
                                  <DialogTitle>Student Account Created</DialogTitle>
                                  <DialogDescription>
                                    Share these login credentials with your student. They can use these to sign in.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="p-4 rounded-lg bg-muted">
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Student Name</p>
                                        <p className="font-medium" data-testid="text-created-student-name">{createdStudent.displayName}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-medium" data-testid="text-created-student-email">{createdStudent.email}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Temporary Password</p>
                                        <p className="font-mono font-medium text-lg" data-testid="text-created-student-password">{createdStudent.temporaryPassword}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button variant="outline" onClick={copyCredentials} data-testid="button-copy-credentials">
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Credentials
                                  </Button>
                                  <Button onClick={closeStudentDialog} data-testid="button-done-creating">
                                    Done
                                  </Button>
                                </DialogFooter>
                              </>
                            ) : (
                              <>
                                <DialogHeader>
                                  <DialogTitle>Create Student Account</DialogTitle>
                                  <DialogDescription>
                                    Enter the student's details. A secure password will be automatically generated.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <label className="text-sm font-medium">Student Name</label>
                                    <Input
                                      placeholder="e.g., John Smith"
                                      value={newStudentName}
                                      onChange={(e) => setNewStudentName(e.target.value)}
                                      data-testid="input-student-name"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                      type="email"
                                      placeholder="e.g., john.smith@school.edu"
                                      value={newStudentEmail}
                                      onChange={(e) => setNewStudentEmail(e.target.value)}
                                      data-testid="input-student-email"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => addStudentMutation.mutate()}
                                    disabled={!newStudentName || !newStudentEmail || addStudentMutation.isPending}
                                    data-testid="button-submit-student"
                                  >
                                    {addStudentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Create Account
                                  </Button>
                                </DialogFooter>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                      {studentsLoading ? (
                        <div className="flex items-center justify-center py-8" data-testid="loading-students">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !students || students.length === 0 ? (
                        <div className="text-center py-8" data-testid="empty-students">
                          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No students in this class yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {students.map((student) => (
                            <div 
                              key={student.id} 
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate transition-all"
                              data-testid={`student-item-${student.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={student.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {student.displayName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium" data-testid={`student-name-${student.id}`}>{student.displayName}</p>
                                  <p className="text-xs text-muted-foreground">{student.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                  <p className="text-xs text-muted-foreground uppercase font-semibold">Progress</p>
                                  <p className="text-sm font-medium">{student.lessonsCompleted} lessons</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                  <p className="text-xs text-muted-foreground uppercase font-semibold">Balance</p>
                                  <p className="text-sm font-medium text-success">${student.simulatorBalance.toLocaleString()}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => removeStudentMutation.mutate(student.id)}
                                  disabled={removeStudentMutation.isPending}
                                  data-testid={`button-remove-student-${student.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="assignments" className="flex-1 overflow-hidden flex flex-col m-0 border-0 p-0">
                  <Card className="flex-1 border-0 rounded-none shadow-none flex flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">Class Assignments</CardTitle>
                          <CardDescription>Create and manage tasks for your students</CardDescription>
                        </div>
                        <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-create-assignment">
                              <Plus className="h-4 w-4 mr-2" />
                              New Assignment
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Create Assignment</DialogTitle>
                              <DialogDescription>
                                Assign a task to all students in {selectedClass.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Assignment Title</label>
                                <Input 
                                  placeholder="e.g., Reach $10,000 Portfolio" 
                                  value={assignmentTitle}
                                  onChange={(e) => setAssignmentTitle(e.target.value)}
                                  data-testid="input-assignment-title"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea 
                                  placeholder="Describe the goals of this assignment" 
                                  value={assignmentDescription}
                                  onChange={(e) => setAssignmentDescription(e.target.value)}
                                  className="h-20"
                                  data-testid="input-assignment-description"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Type</label>
                                  <Select value={assignmentType} onValueChange={setAssignmentType}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="profit_target">Profit Target</SelectItem>
                                      <SelectItem value="lesson_completion">Lesson Count</SelectItem>
                                      <SelectItem value="portfolio_balance">Min. Balance</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Target Value</label>
                                  <Input 
                                    type="number" 
                                    value={assignmentTargetValue}
                                    onChange={(e) => setAssignmentTargetValue(e.target.value)}
                                    data-testid="input-assignment-target"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Due Date</label>
                                <Input 
                                  type="date" 
                                  value={assignmentDueDate}
                                  onChange={(e) => setAssignmentDueDate(e.target.value)}
                                  data-testid="input-assignment-due-date"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                className="w-full"
                                onClick={() => createAssignmentMutation.mutate()}
                                disabled={!assignmentTitle || !assignmentDescription || createAssignmentMutation.isPending}
                                data-testid="button-submit-assignment"
                              >
                                {createAssignmentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Create Assignment
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                      {assignmentsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !assignments || assignments.filter(a => a.classId === selectedClass.id).length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                          <h3 className="text-lg font-medium">No assignments yet</h3>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                            Create your first assignment to start tracking student progress.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {assignments.filter(a => a.classId === selectedClass.id).map((assignment) => (
                            <div 
                              key={assignment.id} 
                              className="p-4 rounded-lg border bg-card hover-elevate transition-all"
                            >
                              <div className="flex justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{assignment.title}</h4>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                      {assignment.type.replace("_", " ")}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Target: {assignment.targetValue.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'None'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="events" className="flex-1 overflow-hidden flex flex-col m-0 border-0 p-0">
                  <Card className="flex-1 border-0 rounded-none shadow-none flex flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">Market Events</CardTitle>
                          <CardDescription>Post events that affect your classroom market simulation</CardDescription>
                        </div>
                        <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-1" data-testid="button-create-event">
                              <Plus className="h-4 w-4" /> Post Event
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Post Market Event</DialogTitle>
                              <DialogDescription>Create a market event that students see in their classroom feed.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <label className="text-sm font-medium mb-1 block">Event Type</label>
                                <Select value={newEventType} onValueChange={setNewEventType}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="boom">📈 Market Boom</SelectItem>
                                    <SelectItem value="crash">📉 Market Crash</SelectItem>
                                    <SelectItem value="news">📰 Breaking News</SelectItem>
                                    <SelectItem value="challenge">🏆 Class Challenge</SelectItem>
                                    <SelectItem value="tip">💡 Teacher Tip</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                  placeholder="e.g., Tech stocks surging today!"
                                  value={newEventTitle}
                                  onChange={e => setNewEventTitle(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Details</label>
                                <Textarea
                                  placeholder="Describe what's happening and what students should consider..."
                                  value={newEventDescription}
                                  onChange={e => setNewEventDescription(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={() => createEventMutation.mutate()} disabled={!newEventTitle || !newEventDescription || createEventMutation.isPending}>
                                {createEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Post Event
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-3">
                      {!classroomEvents || classroomEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Zap className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p>No events posted yet.</p>
                          <p className="text-xs mt-1">Post a market event to engage your students!</p>
                        </div>
                      ) : (
                        classroomEvents.map(event => {
                          const icons: Record<string, string> = { boom: "📈", crash: "📉", news: "📰", challenge: "🏆", tip: "💡" };
                          return (
                            <div key={event.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                              <div className="text-2xl flex-shrink-0">{icons[event.type] || "📌"}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{event.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{new Date(event.createdAt).toLocaleDateString()}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="flex-shrink-0 h-7 w-7" onClick={() => deleteEventMutation.mutate(event.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
