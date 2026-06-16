import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { getLevelInfo } from "@/lib/levels";
import {
  GraduationCap, Home, Gamepad2, BookOpen, Trophy, LogOut,
  Menu, Coins, Star, Zap, ChevronRight, TrendingUp, MessageCircle
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/school", label: "Hub", icon: Home, emoji: "🏠" },
  { href: "/school/student", label: "My Classroom", icon: GraduationCap, emoji: "🏫", studentOnly: true },
  { href: "/school/teacher", label: "Command Centre", icon: Zap, emoji: "⚡", teacherOnly: true },
  { href: "/school/simulator", label: "Simulator", icon: TrendingUp, emoji: "📊" },
  { href: "/school/economy", label: "Economy", icon: Coins, emoji: "🏦", studentOnly: true },
  { href: "/school/fun-zone", label: "Fun Zone", icon: Gamepad2, emoji: "🎮" },
  { href: "/school/lessons", label: "Academy", icon: BookOpen, emoji: "📚" },
  { href: "/school/leaderboard", label: "Leaderboard", icon: Trophy, emoji: "🏆" },
  { href: "/school/chat", label: "Class Chat", icon: MessageCircle, emoji: "💬" },
];

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => refreshUser(), 30000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  const { data: classData } = useQuery<any>({
    queryKey: ["/api/classroom"],
    enabled: user?.role === "student",
  });

  const levelInfo = getLevelInfo(user?.xp ?? 0);
  const tokens = (user as any)?.classroomTokens ?? 0;
  const isTeacher = user?.role === "teacher";
  const ageGroup = classData?.class?.ageGroup ?? "high_school";
  const isPrimary = ageGroup === "primary";

  const filteredNav = navItems.filter(item => {
    if (item.studentOnly && isTeacher) return false;
    if (item.teacherOnly && !isTeacher) return false;
    return true;
  });

  const themeClass = isPrimary ? "school-world primary-theme" : "school-world";
  const sidebarBg = isPrimary
    ? "bg-gradient-to-b from-amber-100 to-orange-50 border-amber-200"
    : "bg-gradient-to-b from-[#0d1526] to-[#0a1020] border-[#1e2d4a]";
  const sidebarText = isPrimary ? "text-amber-900" : "text-slate-200";
  const activeClass = isPrimary
    ? "bg-amber-400 text-white shadow-md"
    : "bg-teal-500/20 text-teal-300 border border-teal-500/30";
  const inactiveClass = isPrimary
    ? "hover:bg-amber-100 text-amber-800"
    : "hover:bg-white/5 text-slate-400 hover:text-slate-200";

  const Sidebar = () => (
    <div className={`flex flex-col h-full ${sidebarBg} border-r`}>
      <div className="p-5 border-b border-current/10">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPrimary ? "bg-amber-500" : "bg-teal-500"} sw-primary-glow`}>
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={`font-black text-sm leading-none ${sidebarText}`}>12Digits</p>
            <p className={`text-xs font-bold ${isPrimary ? "text-amber-600" : "text-teal-400"}`}>Schools</p>
          </div>
        </div>
      </div>

      {user && (
        <div className={`p-4 border-b border-current/10 ${isPrimary ? "bg-amber-50" : "bg-white/3"}`}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={(user as any).avatarUrl || undefined} />
              <AvatarFallback className={`text-lg font-black ${isPrimary ? "bg-amber-400 text-white" : "bg-teal-600 text-white"}`}>
                {user.displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={`font-bold text-sm truncate ${sidebarText}`}>{user.displayName}</p>
              <p className={`text-xs ${isPrimary ? "text-amber-600" : "text-teal-400"} font-semibold`}>
                Lv.{levelInfo.level} {levelInfo.title}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={isPrimary ? "text-amber-700" : "text-slate-400"}>XP</span>
              <span className={`font-bold ${isPrimary ? "text-amber-800" : "text-slate-300"}`}>{user.xp ?? 0} / {levelInfo.xpToNext + (user.xp ?? 0)}</span>
            </div>
            <Progress value={levelInfo.progress} className="h-1.5" />
          </div>
          {!isTeacher && (
            <div className={`mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl sw-token-glow ${isPrimary ? "bg-amber-400 text-white" : "bg-amber-500/15 border border-amber-500/30"}`}>
              <Coins className={`h-4 w-4 ${isPrimary ? "text-white" : "text-amber-400"}`} />
              <span className={`font-black text-sm ${isPrimary ? "text-white" : "text-amber-300"}`}>{tokens} Tokens</span>
              <Star className={`h-3 w-3 ml-auto ${isPrimary ? "text-white/70" : "text-amber-500/60"}`} />
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredNav.map(item => {
          const isActive = location === item.href || (item.href !== "/school" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all font-semibold text-sm ${isActive ? activeClass : inactiveClass}`}>
                <span className="text-base">{item.emoji}</span>
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-current/10">
        <Link href="/dashboard">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-semibold ${isPrimary ? "hover:bg-amber-100 text-amber-700" : "hover:bg-white/5 text-slate-500 hover:text-slate-300"}`}>
            <LogOut className="h-4 w-4" />
            <span>Exit School World</span>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className={`${themeClass} flex h-screen overflow-hidden`} style={{
      background: isPrimary ? "hsl(42 100% 97%)" : "hsl(215 28% 7%)"
    }}>
      {/* Floating background shapes */}
      {!isPrimary && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="sw-float absolute top-20 left-1/4 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, hsl(174 72% 40% / 0.12), transparent 70%)" }} />
          <div className="sw-float-delay absolute top-1/2 right-1/4 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, hsl(270 70% 60% / 0.08), transparent 70%)" }} />
          <div className="sw-float-slow absolute bottom-20 left-1/3 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, hsl(38 95% 54% / 0.10), transparent 70%)" }} />
        </div>
      )}
      {isPrimary && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="sw-float text-6xl absolute top-12 right-16 opacity-20">⭐</div>
          <div className="sw-float-delay text-5xl absolute top-1/3 left-8 opacity-15">🌟</div>
          <div className="sw-float-slow text-4xl absolute bottom-1/4 right-12 opacity-20">💫</div>
          <div className="sw-float text-3xl absolute bottom-16 left-1/4 opacity-15">✨</div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col flex-shrink-0 relative z-10">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile top bar */}
        <div className={`md:hidden flex items-center justify-between px-4 py-3 border-b ${isPrimary ? "bg-amber-100 border-amber-200" : "bg-[#0d1526] border-[#1e2d4a]"}`}>
          <button onClick={() => setSidebarOpen(true)} className={isPrimary ? "text-amber-800" : "text-slate-300"}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-1.5">
            <GraduationCap className={`h-5 w-5 ${isPrimary ? "text-amber-600" : "text-teal-400"}`} />
            <span className={`font-black text-sm ${isPrimary ? "text-amber-900" : "text-white"}`}>12Digits Schools</span>
          </div>
          {!isTeacher && (
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-500">{tokens}</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
