import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { School } from "@shared/schema";
import { TrendingUp, Loader2, Eye, EyeOff, GraduationCap, Check, ArrowRight, KeyRound, ShieldAlert, UserRound, Clock } from "lucide-react";

const ORBS = [
  { size: 280, x: "80%", y: "-5%", color: "hsl(199 89% 38%)", delay: 1 },
  { size: 220, x: "-5%", y: "55%", color: "hsl(142 71% 35%)", delay: 4 },
  { size: 180, x: "45%", y: "70%", color: "hsl(270 70% 55%)", delay: 2 },
];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const redirectTo = new URLSearchParams(window.location.search).get("redirect");

  const { data: schools = [], isLoading: isLoadingSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "", role: "casual" },
  });

  const watchRole = form.watch("role");
  const isTeacher = watchRole === "teacher";
  const isStudent = watchRole === "student";
  const isStandard = watchRole === "casual";

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      await register(data);
      setRegisterSuccess(true);

      if (redirectTo) {
        toast({ title: "Account created!", description: "Returning to your page…" });
        setTimeout(() => setLocation(redirectTo), 900);
      } else if (isTeacher) {
        toast({ title: "Account created!", description: "Heading to school setup…" });
        setTimeout(() => setLocation("/school-plan"), 900);
      } else if (isStudent) {
        toast({ title: "Account created!", description: "Welcome! Let's get you into a class." });
        setTimeout(() => setShowJoinCode(true), 600);
      } else {
        // Standard / casual user → straight to dashboard
        toast({ title: "Account created!", description: "Welcome to 12Digits! Your 14-day trial has started." });
        setTimeout(() => setLocation("/dashboard"), 900);
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setLocation("/dashboard");
      return;
    }
    setJoinLoading(true);
    try {
      await apiRequest("POST", "/api/classroom/join", { joinCode: joinCode.toUpperCase().trim() });
      toast({ title: "Joined your class!", description: "Entering school world…" });
      setTimeout(() => setLocation("/school"), 800);
    } catch (error) {
      toast({
        title: "Invalid join code",
        description: "Check your code and try again, or skip to continue.",
        variant: "destructive",
      });
    } finally {
      setJoinLoading(false);
    }
  };

  // Colour theme per role
  const accentClass = isTeacher
    ? "border-teal-500/40 shadow-teal-500/10"
    : isStudent
    ? "border-blue-500/40 shadow-blue-500/10"
    : "border-border";

  const barClass = isTeacher
    ? "from-teal-400 via-cyan-400 to-emerald-400"
    : isStudent
    ? "from-blue-400 via-indigo-400 to-purple-400"
    : "from-primary via-cyan-400 to-purple-500";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background overflow-hidden relative">
      {/* Background orbs */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none transition-opacity duration-1000"
          style={{
            width: orb.size, height: orb.size,
            left: orb.x, top: orb.y,
            background: orb.color, filter: "blur(80px)",
            opacity: mounted ? 0.1 : 0,
            animation: `orb-pulse ${9 + i * 2}s ease-in-out ${orb.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Join Code Step (students only) ────────────────────────────── */}
      {showJoinCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="w-full max-w-sm mx-4 bg-card border border-border rounded-2xl p-8 shadow-2xl" style={{ animation: "slide-in-left 0.4s ease-out" }}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-3">
                <KeyRound className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-xl font-black text-foreground">Join Your Class</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the join code your teacher gave you. You can skip this and join later from your hub.
              </p>
            </div>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoinClass()}
              placeholder="e.g. X5N09P"
              maxLength={8}
              data-testid="input-join-code"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-foreground placeholder-muted-foreground/40 focus:border-blue-500/50 outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setLocation("/dashboard")}
                data-testid="button-skip-join"
                className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold text-sm hover:bg-muted/80 transition-all"
              >
                Skip for now
              </button>
              <button
                onClick={handleJoinClass}
                disabled={joinLoading}
                data-testid="button-join-class"
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {joinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Join Class</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success overlay ────────────────────────────────────────────── */}
      {registerSuccess && !showJoinCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-spin" style={{ borderTopColor: "transparent" }} />
                <Check className="w-7 h-7 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
            </div>
            <p className="text-foreground font-semibold text-lg">
              {isTeacher ? "Opening School World…" : "Welcome aboard!"}
            </p>
            <p className="text-muted-foreground text-sm">Preparing your experience</p>
          </div>
        </div>
      )}

      {/* ── Role banners ───────────────────────────────────────────────── */}
      {isTeacher && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 fade-in">
          <div className="flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 text-teal-400 rounded-full px-5 py-2 text-sm font-medium shadow-lg">
            <GraduationCap className="w-4 h-4" />
            Teachers get full access — we'll set up your school next!
          </div>
        </div>
      )}
      {isStandard && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 fade-in">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary rounded-full px-5 py-2 text-sm font-medium shadow-lg">
            <Clock className="w-4 h-4" />
            14-day free trial included — no credit card needed
          </div>
        </div>
      )}
      {isStudent && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 fade-in">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 text-blue-400 rounded-full px-5 py-2 text-sm font-medium shadow-lg">
            <GraduationCap className="w-4 h-4" />
            You'll enter your class join code after signing up
          </div>
        </div>
      )}

      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div className={`relative z-10 w-full max-w-md transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className={`bg-card border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${accentClass}`}>
          <div className={`h-1 w-full bg-gradient-to-r transition-all duration-500 ${barClass}`} />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4 group">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-105 ${
                  isTeacher ? "bg-teal-500" : isStudent ? "bg-blue-500" : "bg-primary"
                }`}>
                  {isTeacher ? <GraduationCap className="h-5 w-5 text-white" /> : isStudent ? <UserRound className="h-5 w-5 text-white" /> : <TrendingUp className="h-5 w-5 text-primary-foreground" />}
                </div>
                <span className="text-2xl font-bold">12Digits</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">
                {isTeacher ? "Create Teacher Account" : isStudent ? "Create Student Account" : "Create Your Account"}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isTeacher ? "Joining thousands of educators" : isStudent ? "Ready to start learning?" : "Join thousands learning to trade"}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Display Name */}
                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`} style={{ transitionDelay: "80ms" }}>
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" data-testid="input-displayname" className="transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email */}
                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`} style={{ transitionDelay: "150ms" }}>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" data-testid="input-email" className="transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password */}
                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`} style={{ transitionDelay: "220ms" }}>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a password"
                              data-testid="input-password"
                              className="transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                              {...field}
                            />
                            <Button
                              type="button" variant="ghost" size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Role selector */}
                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`} style={{ transitionDelay: "290ms" }}>
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I am a…</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role" className={`transition-all ${
                              isTeacher ? "border-teal-500/50 focus:border-teal-500" :
                              isStudent ? "border-blue-500/50 focus:border-blue-500" : ""
                            }`}>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="casual">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                Standard User
                                <span className="text-[10px] text-muted-foreground ml-1">(individual learner)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="student">
                              <div className="flex items-center gap-2">
                                <UserRound className="h-3.5 w-3.5 text-blue-400" />
                                Student
                                <span className="text-[10px] text-muted-foreground ml-1">(in a class)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="teacher">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-3.5 w-3.5 text-teal-400" />
                                Teacher
                                <span className="text-[10px] text-muted-foreground ml-1">(run a classroom)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ── Student-only fields ─────────────────────────────── */}
                {isStudent && (
                  <div className={`space-y-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 transition-all duration-400 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "360ms" }}>
                    <p className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" /> Student details
                    </p>

                    <FormField
                      control={form.control}
                      name="schoolId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-school">
                                <SelectValue placeholder={isLoadingSchools ? "Loading schools…" : "Select your school"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schools.map((school) => (
                                <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                              ))}
                              <SelectItem value="other">Other / Not Listed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(form.watch("schoolId") === "other" || !form.watch("schoolId")) && (
                      <FormField
                        control={form.control}
                        name="schoolEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Email <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your@school.edu" data-testid="input-school-email" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      You'll enter your class join code on the next screen.
                    </p>
                  </div>
                )}

                {/* ── Teacher info box ────────────────────────────────── */}
                {isTeacher && (
                  <div className="bg-teal-500/10 border border-teal-500/25 rounded-xl p-3 fade-in">
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-teal-300">
                        After creating your account, we'll take you to set up your School Plan — complete with your classes, students, and assignments.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Standard user trial note ────────────────────────── */}
                {isStandard && (
                  <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 fade-in">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-muted-foreground">
                        You get a <strong className="text-foreground">14-day free trial</strong> with access to premium features — no credit card required. After that, choose a plan to continue.
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className={`w-full font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isTeacher ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-teal-500/25 border-0" :
                    isStudent ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-blue-500/25 border-0" :
                    "hover:shadow-primary/25"
                  }`}
                  disabled={isLoading}
                  data-testid="button-submit-register"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isLoading
                    ? "Creating account…"
                    : isTeacher
                    ? "Create Teacher Account →"
                    : isStudent
                    ? "Create Student Account →"
                    : "Create Account & Start Trial →"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                Sign in
              </Link>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <p><strong>Disclaimer:</strong> This is not financial advice. 12Digits is for educational purposes only. Always consult a qualified financial professional before making investment decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
