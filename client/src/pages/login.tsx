import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Loader2, Eye, EyeOff, Check, ShieldAlert } from "lucide-react";

const ORBS = [
  { size: 320, x: "-10%", y: "-10%", color: "hsl(199 89% 38%)", delay: 0 },
  { size: 240, x: "70%", y: "60%", color: "hsl(270 70% 55%)", delay: 3 },
  { size: 200, x: "40%", y: "-5%", color: "hsl(174 72% 40%)", delay: 6 },
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const redirectTo = new URLSearchParams(window.location.search).get("redirect");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const user = await login(data.identifier, data.password);
      setLoginSuccess(true);
      toast({ title: "Welcome back!", description: "Entering your world…" });
      setTimeout(() => {
        if (redirectTo) {
          setLocation(redirectTo);
          return;
        }
        const role = (user as any)?.role;
        const tier = (user as any)?.membershipTier;
        if (role === "teacher" || role === "student" || tier === "school") {
          setLocation("/school");
        } else {
          setLocation("/dashboard");
        }
      }, 900);
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background overflow-hidden relative">
      {/* Animated background orbs */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none transition-opacity duration-1000"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            filter: "blur(80px)",
            opacity: mounted ? 0.12 : 0,
            animation: `orb-pulse ${8 + i * 2}s ease-in-out ${orb.delay}s infinite`,
          }}
        />
      ))}

      {/* World-enter overlay on success */}
      {loginSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-spin" style={{ borderTopColor: "transparent" }} />
                <Check className="w-7 h-7 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
            </div>
            <p className="text-foreground font-semibold text-lg">Entering your world…</p>
            <p className="text-muted-foreground text-sm">Preparing your dashboard</p>
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent strip */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-cyan-400 to-purple-500" />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4 group">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary transition-transform group-hover:scale-105">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold">12Digits</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to continue your journey</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`} style={{ transitionDelay: "100ms" }}>
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Username</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="you@example.com"
                            data-testid="input-identifier"
                            className="transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`} style={{ transitionDelay: "200ms" }}>
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
                              placeholder="Enter your password"
                              data-testid="input-password"
                              className="transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
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

                <div className={`transition-all duration-400 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "300ms" }}>
                  <Button
                    type="submit"
                    className="w-full font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
                    disabled={isLoading}
                    data-testid="button-submit-login"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : "Sign in"}
                  </Button>
                </div>
              </form>
            </Form>

            <div className={`mt-6 text-center text-sm transition-all duration-400 ${mounted ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "400ms" }}>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                Sign up
              </Link>
            </div>

            <div className={`mt-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 transition-all duration-400 ${mounted ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "500ms" }}>
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <p><strong>Disclaimer:</strong> This is not financial advice. 12Digits is for educational purposes only. Always consult a qualified financial professional before making investment decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
