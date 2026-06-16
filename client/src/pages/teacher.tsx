import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Users,
  BookOpen,
  Trophy,
  TrendingUp,
  Mail,
  Target,
  Calendar
} from "lucide-react";
import type { User, Assignment } from "@shared/schema";

const addStudentSchema = z.object({
  email: z.string().email("Valid email required"),
});

const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  targetProfit: z.coerce.number().optional(),
  dueDate: z.string().optional(),
});

type AddStudentData = z.infer<typeof addStudentSchema>;
type AssignmentData = z.infer<typeof assignmentSchema>;

export default function TeacherPage() {
  const { toast } = useToast();
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  const { data: students, isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/teacher/students"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/teacher/assignments"],
  });

  const studentForm = useForm<AddStudentData>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: { email: "" },
  });

  const assignmentForm = useForm<AssignmentData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      targetProfit: undefined,
      dueDate: "",
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: (data: AddStudentData) => apiRequest("POST", "/api/teacher/students", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/students"] });
      toast({ title: "Student added successfully" });
      setIsStudentDialogOpen(false);
      studentForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to add student", variant: "destructive" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: AssignmentData) => apiRequest("POST", "/api/teacher/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/assignments"] });
      toast({ title: "Assignment created successfully" });
      setIsAssignmentDialogOpen(false);
      assignmentForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create assignment", variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const averageProgress = students?.length 
    ? students.reduce((sum, s) => sum + (s.lessonsCompleted ?? 0), 0) / students.length 
    : 0;

  const averageProfit = students?.length
    ? students.reduce((sum, s) => sum + (s.totalProfit ?? 0), 0) / students.length
    : 0;

  if (studentsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your students and assignments</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{students?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-chart-2" />
              </div>
            </div>
            <p className="text-2xl font-bold">{averageProgress.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Avg. Lessons Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${averageProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <TrendingUp className={`h-5 w-5 ${averageProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${averageProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {averageProfit >= 0 ? '+' : ''}${averageProfit.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Avg. Profit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-chart-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{assignments?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">Assignments</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Students</CardTitle>
                  <CardDescription>Manage and monitor student progress</CardDescription>
                </div>
                <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-student">
                      <Plus className="h-4 w-4" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Student</DialogTitle>
                    </DialogHeader>
                    <Form {...studentForm}>
                      <form onSubmit={studentForm.handleSubmit((d) => addStudentMutation.mutate(d))} className="space-y-4">
                        <FormField
                          control={studentForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="student@school.edu" 
                                  data-testid="input-student-email"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={addStudentMutation.isPending}
                          data-testid="button-submit-student"
                        >
                          Add Student
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(!students || students.length === 0) ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No students yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add students to your class to track their progress.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div 
                      key={student.id}
                      className="flex items-center gap-4 p-4 rounded-lg border"
                      data-testid={`row-student-${student.id}`}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={(student as any).avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(student.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{student.displayName}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Lessons</span>
                          <span className="text-sm font-medium">{student.lessonsCompleted ?? 0}/50</span>
                        </div>
                        <Progress value={((student.lessonsCompleted ?? 0) / 50) * 100} className="h-2" />
                      </div>
                      <div className="text-right min-w-24">
                        <p className={`font-semibold ${(student.totalProfit ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {(student.totalProfit ?? 0) >= 0 ? '+' : ''}${(student.totalProfit ?? 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Profit</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assignments & Challenges</CardTitle>
                  <CardDescription>Create trading challenges for your students</CardDescription>
                </div>
                <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-create-assignment">
                      <Plus className="h-4 w-4" />
                      Create Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Assignment</DialogTitle>
                    </DialogHeader>
                    <Form {...assignmentForm}>
                      <form onSubmit={assignmentForm.handleSubmit((d) => createAssignmentMutation.mutate(d))} className="space-y-4">
                        <FormField
                          control={assignmentForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Trading Challenge #1" data-testid="input-assignment-title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={assignmentForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Complete 5 profitable trades..." 
                                  data-testid="input-assignment-description"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={assignmentForm.control}
                          name="targetProfit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Profit (optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="500" 
                                  data-testid="input-target-profit"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createAssignmentMutation.isPending}
                          data-testid="button-submit-assignment"
                        >
                          Create Assignment
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(!assignments || assignments.length === 0) ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create trading challenges for your students.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div 
                      key={assignment.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`row-assignment-${assignment.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-chart-4" />
                        </div>
                        <div>
                          <p className="font-semibold">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {assignment.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {assignment.targetProfit && (
                          <Badge variant="outline">
                            Target: ${assignment.targetProfit}
                          </Badge>
                        )}
                        {assignment.dueDate && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
