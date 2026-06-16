import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { isPremiumTier, isTrialUser, getTrialDaysRemaining } from "@/lib/subscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, BookOpen, LayoutDashboard, LineChart, Trophy, User, LogOut,
  Menu, X, GraduationCap, Settings, Library, BarChart3, Lock, Crown,
  Award, Zap, BookOpenText, Newspaper, Calendar, Calculator, Star,
  Lightbulb, Users, ShieldCheck, HelpCircle, ShoppingBag, Clock,
  ChevronLeft, ChevronRight, Coins, MessageSquare, Swords
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { getLevelInfo } from "@/lib/levels";
import { getFrameStyle } from "@/lib/shop-catalog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const hasPremium = isPremiumTier(user);
  const onTrial = isTrialUser(user);
  const trialDays = getTrialDaysRemaining(user);

  // Ping with idle detection (Page Visibility + activity tracking)
  useEffect(() => {
    if (!isAuthenticated) return;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let currentStatus: "online" | "idle" = "online";

    const sendPing = (status: "online" | "idle") => {
      currentStatus = status;
      fetch("/api/ping", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    };

    const resetIdleTimer = () => {
      if (currentStatus === "idle") sendPing("online");
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => sendPing("idle"), 60_000);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendPing("idle");
      } else {
        resetIdleTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("mousemove", resetIdleTimer, { passive: true });
    document.addEventListener("keydown", resetIdleTimer, { passive: true });

    sendPing("online");
    resetIdleTimer();
    const interval = setInterval(() => sendPing(document.visibilityState === "hidden" ? "idle" : currentStatus), 30_000);

    return () => {
      clearInterval(interval);
      if (idleTimer) clearTimeout(idleTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("mousemove", resetIdleTimer);
      document.removeEventListener("keydown", resetIdleTimer);
    };
  }, [isAuthenticated]);

  // Scroll arrow state
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => { el.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [isAuthenticated, checkScroll]);

  // Main nav items — most used first
  const navItems = [
    { href: "/dashboard",      label: "Dashboard",   icon: LayoutDashboard, premium: false },
    { href: "/lessons",        label: "Academy",      icon: BookOpen,        premium: false },
    { href: "/simulator",      label: "Simulator",    icon: LineChart,       premium: false },
    { href: "/leaderboard",    label: "Leaderboard",  icon: Trophy,          premium: false },
    { href: "/achievements",   label: "Achievements", icon: Award,           premium: false },
    { href: "/watchlist",      label: "Watchlist",    icon: Star,            premium: false },
    { href: "/tips",           label: "Tips",         icon: Lightbulb,       premium: false },
    { href: "/leagues",        label: "Leagues",      icon: Swords,          premium: false },
    { href: "/shop",           label: "Shop",         icon: ShoppingBag,     premium: false },
    { href: "/strategies",     label: "Strategies",   icon: Library,         premium: false },
    { href: "/risk-calculator",label: "Risk Calc",    icon: Calculator,      premium: true  },
    { href: "/command-center", label: "Terminal",     icon: Zap,             premium: true  },
    { href: "/analytics",      label: "Analytics",    icon: BarChart3,       premium: true  },
  ];

  const premiumMenuItems = [
    { href: "/messages", label: "Messages",       icon: MessageSquare },
    { href: "/friends",  label: "Friends",        icon: Users       },
    { href: "/journal",  label: "Trade Journal",  icon: BookOpenText },
    { href: "/news",     label: "News Feed",       icon: Newspaper   },
    { href: "/calendar", label: "Calendar",        icon: Calendar    },
  ];

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0" data-testid="link-home">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:inline">12Digits</span>
        </Link>

        {/* ── Desktop scrollable nav ───────────────────────────────── */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center flex-1 min-w-0 mx-2 relative">
            {/* Left arrow */}
            {canScrollLeft && (
              <button
                onClick={() => navRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
                className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors z-10 mr-1"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Nav items — scrollable */}
            <div
              ref={navRef}
              className="flex items-center gap-0.5 overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href) && item.href.length > 1);
                const showLock = item.premium && !hasPremium;
                const navId = `onboarding-nav-${item.href.replace(/\//g, "").replace(/-/g, "") || "home"}`;
                return (
                  <Link key={item.href} href={item.href} className="flex-shrink-0" id={navId}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-1.5 px-2.5 h-8 text-xs font-medium whitespace-nowrap ${item.premium ? "relative" : ""} ${
                        item.href === "/shop" ? "text-primary hover:text-primary" : ""
                      }`}
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {item.label}
                      {showLock && <Lock className="h-2.5 w-2.5 text-amber-500" />}
                      {item.premium && hasPremium && <Crown className="h-2.5 w-2.5 text-amber-500" />}
                    </Button>
                  </Link>
                );
              })}

              {/* School World */}
              {(user?.role === "student" || user?.role === "teacher") && user?.membershipTier === "school" && (
                <Link href="/school" className="flex-shrink-0">
                  <Button
                    variant={location.startsWith("/school") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5 px-2.5 h-8 text-xs font-semibold border border-teal-500/30 text-teal-500 hover:text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/50 whitespace-nowrap"
                    data-testid="link-school-world"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    School World
                  </Button>
                </Link>
              )}

              {/* Casual plan extras */}
              {user?.membershipTier === "casual" && (
                <>
                  <Link href="/friends" className="flex-shrink-0">
                    <Button
                      variant={location === "/friends" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5 px-2.5 h-8 text-xs font-medium border border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50 whitespace-nowrap"
                      data-testid="link-friends"
                    >
                      <Users className="h-3.5 w-3.5" /> Friends
                    </Button>
                  </Link>
                  <Link href="/casual/portfolio" className="flex-shrink-0">
                    <Button
                      variant={location.startsWith("/casual") ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5 px-2.5 h-8 text-xs font-medium border border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50 whitespace-nowrap"
                      data-testid="link-casual-portfolio"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> Portfolio
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Right arrow */}
            {canScrollRight && (
              <button
                onClick={() => navRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
                className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-background border border-border shadow-sm hover:bg-muted transition-colors z-10 ml-1"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* ── Right-side controls ──────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAuthenticated && (
            <Button
              variant="ghost" size="icon"
              onClick={() => setHelpOpen(true)}
              title="Help & Guide"
              className="h-8 w-8"
              data-testid="button-help"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* Balance chip */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/50">
                <Coins className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                <span className="text-xs font-bold text-green-400 tabular-nums">
                  ${(user?.simulatorBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Trial chip */}
              {onTrial && (
                <Link href="/pricing">
                  <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-pointer hover:bg-amber-500/15 transition-colors">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[10px] font-bold">{trialDays}d trial</span>
                  </div>
                </Link>
              )}

              <NotificationBell />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2 h-9 relative" data-testid="button-user-menu">
                    <div className="relative">
                      <Avatar className="h-7 w-7" style={getFrameStyle(user?.equippedFrame)}>
                        <AvatarImage src={user?.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                          {getInitials(user?.displayName ?? "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground border border-background">
                        {getLevelInfo(user?.xp).level}
                      </div>
                    </div>
                    <span className="hidden sm:inline text-sm font-medium max-w-[90px] truncate">
                      {user?.displayName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-60">
                  {/* Profile header */}
                  <div className="px-3 py-2.5 flex items-center gap-3 border-b border-border">
                    <Avatar className="h-9 w-9 flex-shrink-0" style={getFrameStyle(user?.equippedFrame)}>
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {getInitials(user?.displayName ?? "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold truncate">{user?.displayName}</p>
                        <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 flex-shrink-0">
                          <ShieldCheck className="h-2.5 w-2.5 text-primary" />
                          {getLevelInfo(user?.xp).level}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-[9px] mb-0.5">
                          <span className="text-muted-foreground">{getLevelInfo(user?.xp).title}</span>
                          <span>{getLevelInfo(user?.xp).progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${getLevelInfo(user?.xp).progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance row */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-xs border-b border-border/50">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-bold text-green-400">${(user?.simulatorBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>

                  {/* Account */}
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer" data-testid="link-profile">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/shop" className="flex items-center gap-2 cursor-pointer" data-testid="link-shop-dropdown">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <span>Shop</span>
                      <Badge variant="outline" className="ml-auto text-[9px] px-1 h-4 text-primary border-primary/30">New</Badge>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer" data-testid="link-settings">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Core features */}
                  <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-primary" /> Features
                  </div>
                  {navItems.filter(i => !i.premium).map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer" data-testid={`link-menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                          <Icon className="h-4 w-4" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}

                  {/* Premium features */}
                  {hasPremium && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-500" /> Premium Tools
                      </div>
                      {[...navItems.filter(i => i.premium), ...premiumMenuItems].map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href} className="flex items-center gap-2 cursor-pointer" data-testid={`link-premium-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                              <Icon className="h-4 w-4" /> {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}

                  {/* School World */}
                  {(user?.role === "student" || user?.role === "teacher") && user?.membershipTier === "school" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/school" className="flex items-center gap-2 cursor-pointer font-semibold" data-testid="link-school-world-dropdown">
                          <GraduationCap className="h-4 w-4 text-teal-500" />
                          <span className="text-teal-500">School World</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Casual plan */}
                  {user?.membershipTier === "casual" && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-purple-400" /> Casual Plan
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href="/friends" className="flex items-center gap-2 cursor-pointer" data-testid="link-dropdown-friends">
                          <Users className="h-4 w-4 text-purple-400" /> Friends
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/casual/portfolio" className="flex items-center gap-2 cursor-pointer" data-testid="link-dropdown-casual-portfolio">
                          <BarChart3 className="h-4 w-4 text-purple-400" /> Portfolio Analysis
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Admin */}
                  {user?.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer" data-testid="link-admin">
                          <Settings className="h-4 w-4" /> Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer" data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile hamburger */}
              <Button
                variant="ghost" size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="ghost" size="sm" data-testid="button-login">Log in</Button></Link>
              <Link href="/register"><Button size="sm" data-testid="button-signup">Get Started</Button></Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Help dialog ─────────────────────────────────────────────── */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Help & Quick Guide
            </DialogTitle>
            <DialogDescription>Get started with 12Digits — your trading education platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Getting Started</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Visit <strong>Academy</strong> to work through structured lessons</li>
                <li>• Use the <strong>Simulator</strong> to practice buying and selling stocks risk-free</li>
                <li>• Check your <strong>Dashboard</strong> for a summary of your progress</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Shop</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Spend your simulator profits in the <strong>Shop</strong></li>
                <li>• Buy <strong>Profile Frames</strong> and <strong>Titles</strong> to customise your look</li>
                <li>• Open <strong>Packs</strong> for random rare cosmetics</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Simulator Tips</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Select any stock or crypto from the dropdown</li>
                <li>• Set quantity, choose order type, then click Buy or Sell</li>
                <li>• Close a trade anytime to lock in your profit or loss</li>
              </ul>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
              Need more help? Reach out at <strong>support@12digits.com</strong>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mobile menu ──────────────────────────────────────────────── */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t bg-background px-4 py-4 max-h-[80vh] overflow-y-auto">
          {/* Balance */}
          <div className="flex items-center justify-between mb-3 px-2 py-2 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground">Trading Balance</span>
            <span className="text-sm font-bold text-green-400">${(user?.simulatorBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>

          <div className="flex flex-col gap-1">
            {/* Core items */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href) && item.href.length > 1);
              const showLock = item.premium && !hasPremium;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 h-9 text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {showLock && <Lock className="h-3 w-3 text-amber-500 ml-auto" />}
                    {item.premium && hasPremium && <Crown className="h-3 w-3 text-amber-500 ml-auto" />}
                  </Button>
                </Link>
              );
            })}

            {/* Premium tools in mobile */}
            {hasPremium && (
              <>
                <div className="border-t border-border mt-1 pt-2">
                  <p className="text-[10px] text-muted-foreground px-2 py-1 flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" /> Premium Tools
                  </p>
                  {premiumMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={location === item.href ? "secondary" : "ghost"} className="w-full justify-start gap-2 h-9 text-sm">
                          <Icon className="h-4 w-4" /> {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {/* Casual */}
            {user?.membershipTier === "casual" && (
              <div className="border-t border-border mt-1 pt-2">
                <p className="text-[10px] text-muted-foreground px-2 py-1 flex items-center gap-1">
                  <Star className="h-3 w-3 text-purple-400" /> Casual Plan
                </p>
                <Link href="/friends" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={location === "/friends" ? "secondary" : "ghost"} className="w-full justify-start gap-2 h-9 text-sm text-purple-400">
                    <Users className="h-4 w-4" /> Friends
                  </Button>
                </Link>
                <Link href="/casual/portfolio" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={location.startsWith("/casual") ? "secondary" : "ghost"} className="w-full justify-start gap-2 h-9 text-sm text-purple-400">
                    <BarChart3 className="h-4 w-4" /> Portfolio Analysis
                  </Button>
                </Link>
              </div>
            )}

            {/* School World */}
            {(user?.role === "student" || user?.role === "teacher") && user?.membershipTier === "school" && (
              <div className="border-t border-border mt-1 pt-2">
                <Link href="/school" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant={location.startsWith("/school") ? "secondary" : "ghost"} className="w-full justify-start gap-2 h-9 text-sm text-teal-400">
                    <GraduationCap className="h-4 w-4" /> School World
                  </Button>
                </Link>
              </div>
            )}

            {/* Bottom links */}
            <div className="border-t border-border mt-1 pt-2 flex flex-col gap-1">
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm"><User className="h-4 w-4" /> Profile</Button>
              </Link>
              <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm"><Settings className="h-4 w-4" /> Settings</Button>
              </Link>
              <Button variant="ghost" onClick={logout} className="w-full justify-start gap-2 h-9 text-sm text-destructive" data-testid="button-logout-mobile">
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
