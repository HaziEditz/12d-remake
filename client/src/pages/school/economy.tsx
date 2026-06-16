import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import SchoolLayout from "@/layouts/school-layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Coins, TrendingUp, TrendingDown, Briefcase, ShoppingBag, Gavel,
  Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, Loader2, Star,
  Receipt, PiggyBank, Trophy, Medal, Crown, Zap, Home, Building2,
  BarChart3, Wallet, ChevronRight, CreditCard, AlertTriangle, TrendingDown as LoanIcon
} from "lucide-react";
import { format } from "date-fns";

const TX_ICONS: Record<string, { icon: any; color: string }> = {
  lesson: { icon: TrendingUp, color: "text-emerald-400" },
  quiz: { icon: Star, color: "text-amber-400" },
  assignment: { icon: CheckCircle2, color: "text-teal-400" },
  job: { icon: Briefcase, color: "text-blue-400" },
  teacher_award: { icon: Star, color: "text-yellow-400" },
  simulator: { icon: TrendingUp, color: "text-cyan-400" },
  auction: { icon: Gavel, color: "text-rose-400" },
  expense: { icon: Receipt, color: "text-red-400" },
  purchase: { icon: ShoppingBag, color: "text-purple-400" },
  interest: { icon: TrendingUp, color: "text-green-400" },
  savings_deposit: { icon: PiggyBank, color: "text-blue-400" },
  savings_withdrawal: { icon: PiggyBank, color: "text-orange-400" },
  savings_interest: { icon: TrendingUp, color: "text-emerald-400" },
  loan: { icon: CreditCard, color: "text-amber-400" },
  loan_repayment: { icon: CreditCard, color: "text-red-400" },
  asset_income: { icon: Home, color: "text-blue-400" },
  asset_maintenance: { icon: Home, color: "text-red-400" },
};

const ASSET_TYPE_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  property: { icon: Home, color: "text-blue-400", label: "Property" },
  business: { icon: Building2, color: "text-amber-400", label: "Business" },
  investment: { icon: BarChart3, color: "text-emerald-400", label: "Investment" },
  vehicle: { icon: Zap, color: "text-purple-400", label: "Vehicle" },
};
const RANK_ICONS = [Crown, Medal, Trophy];

export default function SchoolEconomy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<"wallet" | "assets" | "auctions" | "store" | "leaderboard">("wallet");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [savingsDialogOpen, setSavingsDialogOpen] = useState(false);
  const [repayAmounts, setRepayAmounts] = useState<Record<string, string>>({});

  const { data: classData } = useQuery<any>({ queryKey: ["/api/classroom"] });
  const classId = classData?.class?.id;
  const ageGroup = classData?.class?.ageGroup ?? "high_school";
  const isPrimary = ageGroup === "primary";

  const { data: economyData, isLoading: balanceLoading } = useQuery<any>({
    queryKey: ["/api/economy/balance", classId],
    queryFn: () => fetch(`/api/economy/balance?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/economy/settings", classId],
    queryFn: () => fetch(`/api/economy/settings?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: netWorth } = useQuery<any>({
    queryKey: ["/api/economy/net-worth", classId],
    queryFn: () => fetch(`/api/economy/net-worth?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/expenses", classId],
    queryFn: () => fetch(`/api/economy/expenses?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: auctions = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/auctions", classId],
    queryFn: () => fetch(`/api/economy/auctions?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: storeItems = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/store", classId],
    queryFn: () => fetch(`/api/economy/store?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/leaderboard", classId],
    queryFn: () => fetch(`/api/economy/leaderboard?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: challenges = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/challenges", classId],
    queryFn: () => fetch(`/api/economy/challenges?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: marketAssets = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/assets", classId],
    queryFn: () => fetch(`/api/economy/assets?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: myAssets = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/my-assets", classId],
    queryFn: () => fetch(`/api/economy/my-assets?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });
  const { data: myLoans = [] } = useQuery<any[]>({
    queryKey: ["/api/economy/loans", classId],
    queryFn: () => fetch(`/api/economy/loans?classId=${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!classId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/economy/balance", classId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/net-worth", classId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/my-assets", classId] });
    qc.invalidateQueries({ queryKey: ["/api/economy/loans", classId] });
  };

  const bidMutation = useMutation({
    mutationFn: ({ auctionId, amount }: { auctionId: string; amount: number }) =>
      apiRequest("POST", `/api/economy/auctions/${auctionId}/bid`, { amount, classId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/economy/auctions", classId] });
      invalidateAll();
      toast({ title: "Bid placed!" });
    },
    onError: (e: any) => toast({ title: "Bid failed", description: e.message, variant: "destructive" }),
  });

  const buyMutation = useMutation({
    mutationFn: (itemId: string) => apiRequest("POST", `/api/economy/store/${itemId}/buy`, { classId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/economy/store", classId] });
      invalidateAll();
      toast({ title: "Purchased!" });
    },
    onError: (e: any) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  const buyAssetMutation = useMutation({
    mutationFn: (assetId: string) => apiRequest("POST", `/api/economy/assets/${assetId}/buy`, { classId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/economy/assets", classId] });
      invalidateAll();
      toast({ title: "Asset purchased!" });
    },
    onError: (e: any) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  const repayMutation = useMutation({
    mutationFn: ({ loanId, amount }: { loanId: string; amount: number }) =>
      apiRequest("POST", `/api/economy/loans/${loanId}/repay`, { classId, amount }),
    onSuccess: (_data, vars) => {
      invalidateAll();
      setRepayAmounts(p => { const n = { ...p }; delete n[vars.loanId]; return n; });
      toast({ title: "Loan repayment successful!" });
    },
    onError: (e: any) => toast({ title: "Repayment failed", description: e.message, variant: "destructive" }),
  });

  const depositMutation = useMutation({
    mutationFn: (amount: number) => apiRequest("POST", "/api/economy/savings/deposit", { classId, amount }),
    onSuccess: () => { invalidateAll(); toast({ title: "Deposited to savings!" }); setDepositAmount(""); setSavingsDialogOpen(false); },
    onError: (e: any) => toast({ title: "Deposit failed", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (amount: number) => apiRequest("POST", "/api/economy/savings/withdraw", { classId, amount }),
    onSuccess: () => { invalidateAll(); toast({ title: "Withdrawn from savings!" }); setWithdrawAmount(""); setSavingsDialogOpen(false); },
    onError: (e: any) => toast({ title: "Withdraw failed", description: e.message, variant: "destructive" }),
  });

  const currencyName = settings?.currencyName ?? "Coins";
  const currencySymbol = settings?.currencySymbol ?? "🪙";
  const balance = economyData?.balance ?? 0;
  const savingsBalance = economyData?.savingsBalance ?? 0;
  const transactions: any[] = economyData?.transactions ?? [];
  const myJobs: any[] = economyData?.myJobs ?? [];
  const netWorthTotal = netWorth?.total ?? 0;
  const activeLoans = (myLoans as any[]).filter((l: any) => l.isActive);
  const totalLoanBalance = activeLoans.reduce((s: number, l: any) => s + l.balance, 0);

  const activeAuctions = auctions.filter((a: any) => a.isActive && new Date(a.endDate) > new Date());
  const closedAuctions = auctions.filter((a: any) => !a.isActive || new Date(a.endDate) <= new Date());
  const activeChallenges = (challenges as any[]).filter((c: any) => c.isActive);

  const myRank = leaderboard.findIndex((s: any) => s.id === user?.id) + 1;
  const accentGrad = isPrimary ? "from-pink-400 to-rose-500" : "from-teal-500 to-cyan-600";

  const navSections = [
    { id: "wallet", label: "💰 Wallet" },
    { id: "assets", label: "🏠 Assets", count: (myAssets as any[]).length },
    { id: "auctions", label: "🔨 Auctions", count: activeAuctions.length },
    { id: "store", label: "🛍️ Store" },
    { id: "leaderboard", label: "🏆 Rankings" },
  ] as const;

  if (!classId) {
    return (
      <SchoolLayout>
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Coins className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-semibold">Join a class to access the Economy</p>
        </div>
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

        {/* Hero Balance Banner */}
        <div className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r ${accentGrad}`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Cash Balance</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl">{currencySymbol}</span>
                  <span className="text-3xl sm:text-4xl font-black text-white">{balance.toLocaleString()}</span>
                </div>
                <p className="text-white/70 mt-0.5 text-sm">{currencyName}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {myRank > 0 && (
                  <div className="bg-white/15 rounded-2xl px-3 py-2.5 text-white text-center">
                    <p className="text-xs text-white/60">Rank</p>
                    <p className="text-xl font-black">#{myRank}</p>
                  </div>
                )}
                {netWorthTotal !== 0 && (
                  <div className="bg-white/15 rounded-2xl px-3 py-2.5 text-white text-center">
                    <p className="text-xs text-white/60">Net Worth</p>
                    <p className="text-xl font-black">{currencySymbol}{netWorthTotal.toLocaleString()}</p>
                  </div>
                )}
                {totalLoanBalance > 0 && (
                  <div className="bg-red-500/30 rounded-2xl px-3 py-2.5 text-white text-center">
                    <p className="text-xs text-red-200">Debt</p>
                    <p className="text-xl font-black text-red-200">{currencySymbol}{totalLoanBalance.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
            {/* Net Worth Breakdown */}
            {netWorth && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/15 rounded-xl p-2.5 text-white">
                  <p className="text-xs text-white/60">💰 Cash</p>
                  <p className="font-bold text-sm">{currencySymbol}{(netWorth.cash ?? 0).toLocaleString()}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 text-white">
                  <p className="text-xs text-white/60">🏦 Savings</p>
                  <p className="font-bold text-sm">{currencySymbol}{(netWorth.savings ?? 0).toLocaleString()}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 text-white">
                  <p className="text-xs text-white/60">📈 Simulator</p>
                  <p className="font-bold text-sm">${(netWorth.simulatorBalance ?? 0).toLocaleString()}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 text-white">
                  <p className="text-xs text-white/60">🏠 Assets</p>
                  <p className="font-bold text-sm">{currencySymbol}{(netWorth.assetValue ?? 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section Nav */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navSections.map(({ id, label, count }: any) => (
            <button key={id} onClick={() => setActiveSection(id as any)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSection === id ? "bg-teal-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              data-testid={`nav-${id}`}>
              {label}{count > 0 ? ` (${count})` : ""}
            </button>
          ))}
        </div>

        {/* ══ WALLET ══ */}
        {activeSection === "wallet" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Active Challenges */}
              {activeChallenges.length > 0 && (
                <div className="rounded-2xl p-5 bg-amber-500/5 border border-amber-500/20">
                  <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" /> Active Challenges
                  </h2>
                  <div className="space-y-2">
                    {activeChallenges.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl p-3 bg-amber-500/10 border border-amber-500/20">
                        <span className="text-xl">{c.emoji ?? "🏆"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{c.title}</p>
                          {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                        </div>
                        {c.rewardAmount > 0 && <span className="text-amber-300 font-bold text-sm shrink-0">{currencySymbol}{c.rewardAmount}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outstanding Loans */}
              {activeLoans.length > 0 && (
                <div className="rounded-2xl p-5 bg-red-500/5 border border-red-500/20">
                  <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-red-400" /> Outstanding Loans
                    <Badge className="bg-red-500/20 text-red-300 border-0 text-xs">{currencySymbol}{totalLoanBalance.toLocaleString()} owed</Badge>
                  </h2>
                  <div className="space-y-3">
                    {activeLoans.map((loan: any) => {
                      const repayAmt = repayAmounts[loan.id] ?? "";
                      const canRepay = balance >= Number(repayAmt) && Number(repayAmt) > 0;
                      const pctPaid = loan.principal > 0 ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100) : 0;
                      return (
                        <div key={loan.id} className="rounded-xl p-4 bg-red-500/10 border border-red-500/20" data-testid={`loan-card-${loan.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-white text-sm">Loan • {loan.interestRate}% interest</p>
                              <p className="text-xs text-slate-400">Borrowed {format(new Date(loan.createdAt), "MMM d, yyyy")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-red-300">{currencySymbol}{loan.balance.toLocaleString()}</p>
                              <p className="text-xs text-slate-500">of {currencySymbol}{loan.principal.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctPaid}%` }} />
                          </div>
                          <div className="flex gap-2">
                            <Input type="number" min={1} max={Math.min(balance, loan.balance)} placeholder={`Up to ${currencySymbol}${Math.min(balance, loan.balance)}`}
                              value={repayAmt} onChange={e => setRepayAmounts(p => ({ ...p, [loan.id]: e.target.value }))}
                              className="bg-white/5 border-white/20 text-white text-sm h-8 flex-1" data-testid={`input-repay-${loan.id}`} />
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                              disabled={!canRepay || repayMutation.isPending}
                              onClick={() => repayMutation.mutate({ loanId: loan.id, amount: Number(repayAmt) })}
                              data-testid={`button-repay-${loan.id}`}>
                              {repayMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Repay"}
                            </Button>
                          </div>
                          {loan.dueDate && (
                            <p className={`text-xs mt-2 font-semibold ${new Date(loan.dueDate) < new Date() ? "text-red-400" : "text-slate-400"}`}>
                              {new Date(loan.dueDate) < new Date() ? "⚠️ Overdue" : "Due"} {format(new Date(loan.dueDate), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* My Jobs */}
              {myJobs.length > 0 && (
                <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
                  <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-400" /> My Jobs
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myJobs.map((job: any) => (
                      <div key={job.id} className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
                        <p className="font-bold text-white text-sm">{job.jobTitle}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Pay: <span className="text-blue-300 font-semibold">{currencySymbol}{job.payAmount}</span> / {job.payFrequency}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
                <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" /> Transactions
                </h2>
                {balanceLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Coins className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No transactions yet. Complete lessons to start earning!</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {transactions.map((tx: any) => {
                      const info = TX_ICONS[tx.type] ?? TX_ICONS.lesson;
                      const Icon = info.icon;
                      const isPositive = tx.amount > 0;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 shrink-0">
                            <Icon className={`h-4 w-4 ${info.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{tx.description}</p>
                            <p className="text-xs text-slate-500">{format(new Date(tx.createdAt), "MMM d, h:mm a")}</p>
                          </div>
                          <div className={`flex items-center gap-0.5 font-bold text-sm shrink-0 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                            {isPositive ? "+" : ""}{tx.amount}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Savings */}
              <div className="rounded-2xl p-5 bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-black text-white flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-emerald-400" /> Savings
                  </h2>
                  {settings?.savingsInterestRate > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">{settings.savingsInterestRate}% interest</Badge>
                  )}
                </div>
                <p className="text-2xl font-black text-emerald-300 mb-3">{currencySymbol}{savingsBalance.toLocaleString()}</p>
                <Dialog open={savingsDialogOpen} onOpenChange={setSavingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm" data-testid="button-open-savings">Manage Savings</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0f172a] border-white/10">
                    <DialogHeader><DialogTitle className="text-white">Savings Account</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-slate-400">Cash</p><p className="text-xl font-black text-white">{currencySymbol}{balance}</p></div>
                        <div className="bg-emerald-500/10 rounded-xl p-3"><p className="text-xs text-slate-400">Savings</p><p className="text-xl font-black text-emerald-300">{currencySymbol}{savingsBalance}</p></div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold mb-1">Deposit</p>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="Amount" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                            className="bg-white/5 border-white/20 text-white text-sm" max={balance} data-testid="input-deposit" />
                          <Button onClick={() => depositMutation.mutate(Number(depositAmount))} disabled={!depositAmount || Number(depositAmount) <= 0 || Number(depositAmount) > balance || depositMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" data-testid="button-deposit">
                            {depositMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deposit"}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold mb-1">Withdraw</p>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="Amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                            className="bg-white/5 border-white/20 text-white text-sm" max={savingsBalance} data-testid="input-withdraw" />
                          <Button onClick={() => withdrawMutation.mutate(Number(withdrawAmount))} disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > savingsBalance || withdrawMutation.isPending}
                            variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold" data-testid="button-withdraw">
                            {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Bills */}
              {(expenses as any[]).length > 0 && (
                <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
                  <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-red-400" /> Bills</h2>
                  <div className="space-y-2">
                    {(expenses as any[]).map((exp: any) => (
                      <div key={exp.id} className="flex justify-between items-center rounded-xl p-2.5 bg-red-500/10 border border-red-500/20">
                        <div><p className="font-semibold text-white text-xs">{exp.name}</p><p className="text-xs text-slate-500 capitalize">{exp.frequency}</p></div>
                        <span className="text-red-400 font-bold text-sm">{currencySymbol}{exp.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* My Assets Quick View */}
              {(myAssets as any[]).length > 0 && (
                <div className="rounded-2xl p-4 bg-blue-500/5 border border-blue-500/20">
                  <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2"><Home className="h-4 w-4 text-blue-400" /> My Assets</h2>
                  <div className="space-y-1.5">
                    {(myAssets as any[]).slice(0, 3).map((sa: any) => (
                      <div key={sa.id} className="flex items-center gap-2 text-xs">
                        <span className="text-base">{sa.asset?.emoji}</span>
                        <p className="text-white font-semibold flex-1 truncate">{sa.asset?.name}</p>
                        {sa.asset?.passiveIncome > 0 && <span className="text-emerald-400 font-bold">+{currencySymbol}{sa.asset.passiveIncome}</span>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveSection("assets")} className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    View all <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Paid-off Loans (history) */}
              {(myLoans as any[]).filter((l: any) => !l.isActive).length > 0 && (
                <div className="rounded-2xl p-4 bg-white/3 border border-white/8">
                  <h2 className="text-sm font-black text-white mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Paid Off Loans</h2>
                  <p className="text-xs text-slate-500">{(myLoans as any[]).filter((l: any) => !l.isActive).length} loan(s) fully repaid</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ASSETS ══ */}
        {activeSection === "assets" && (
          <div className="space-y-6">
            {/* My Owned Assets */}
            {(myAssets as any[]).length > 0 && (
              <div>
                <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-400" /> Your Portfolio
                  <Badge className="bg-blue-500/20 text-blue-300 border-0">{(myAssets as any[]).length} owned</Badge>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(myAssets as any[]).map((sa: any) => {
                    const asset = sa.asset;
                    const typeInfo = ASSET_TYPE_ICONS[asset?.type] ?? ASSET_TYPE_ICONS.property;
                    const Icon = typeInfo.icon;
                    return (
                      <div key={sa.id} className="rounded-2xl p-5 bg-blue-500/5 border border-blue-500/20" data-testid={`my-asset-${sa.id}`}>
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-3xl">{asset?.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white">{asset?.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Icon className={`h-3 w-3 ${typeInfo.color}`} />
                              <span className={`text-xs font-semibold ${typeInfo.color}`}>{typeInfo.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/5 rounded-lg p-2">
                            <p className="text-slate-400">Value</p>
                            <p className="font-bold text-white">{currencySymbol}{(asset?.value ?? 0).toLocaleString()}</p>
                          </div>
                          {asset?.passiveIncome > 0 && (
                            <div className="bg-emerald-500/10 rounded-lg p-2">
                              <p className="text-slate-400">Income</p>
                              <p className="font-bold text-emerald-300">+{currencySymbol}{asset.passiveIncome}<span className="text-slate-500 font-normal">/{asset.incomeFrequency}</span></p>
                            </div>
                          )}
                          {asset?.maintenanceCost > 0 && (
                            <div className="bg-red-500/10 rounded-lg p-2">
                              <p className="text-slate-400">Maintenance</p>
                              <p className="font-bold text-red-300">-{currencySymbol}{asset.maintenanceCost}<span className="text-slate-500 font-normal">/{asset.maintenanceFrequency}</span></p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Purchased {format(new Date(sa.purchasedAt), "MMM d, yyyy")}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Net Worth breakdown */}
            {netWorth && (
              <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
                <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-teal-400" /> Net Worth Breakdown
                </h2>
                <div className="space-y-3">
                  {[
                    { label: "💰 Cash Balance", value: netWorth.cash ?? 0, color: "bg-teal-500", prefix: currencySymbol },
                    { label: "🏦 Savings Account", value: netWorth.savings ?? 0, color: "bg-emerald-500", prefix: currencySymbol },
                    { label: "📈 Simulator Portfolio", value: netWorth.simulatorBalance ?? 0, color: "bg-cyan-500", prefix: "$" },
                    { label: "🏠 Asset Portfolio", value: netWorth.assetValue ?? 0, color: "bg-blue-500", prefix: currencySymbol },
                  ].map(({ label, value, color, prefix }) => {
                    const gross = (netWorth.cash ?? 0) + (netWorth.savings ?? 0) + (netWorth.simulatorBalance ?? 0) + (netWorth.assetValue ?? 0);
                    const pct = gross > 0 ? Math.round((value / gross) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">{label}</span>
                          <span className="font-bold text-white">{prefix}{value.toLocaleString()} <span className="text-slate-500 font-normal text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(netWorth.loanBalance ?? 0) > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-red-400">💸 Outstanding Loans (debt)</span>
                        <span className="font-bold text-red-400">-{currencySymbol}{(netWorth.loanBalance ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-white font-black">Total Net Worth</span>
                    <span className={`text-xl font-black ${netWorth.total >= 0 ? "text-teal-300" : "text-red-400"}`}>{netWorth.total < 0 ? "-" : ""}{currencySymbol}{Math.abs(netWorth.total ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Asset Marketplace */}
            <div>
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" /> Asset Marketplace
              </h2>
              {(marketAssets as any[]).length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Home className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No assets available yet. Ask your teacher to add some!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(marketAssets as any[]).map((asset: any) => {
                    const typeInfo = ASSET_TYPE_ICONS[asset.type] ?? ASSET_TYPE_ICONS.property;
                    const Icon = typeInfo.icon;
                    const canAfford = balance >= asset.price;
                    const alreadyOwned = (myAssets as any[]).some((sa: any) => sa.assetId === asset.id);
                    const atCapacity = asset.maxOwners !== null && asset.maxOwners <= 0;
                    return (
                      <div key={asset.id} className={`rounded-2xl p-5 border flex flex-col gap-3 ${canAfford && !alreadyOwned && !atCapacity ? "bg-amber-500/5 border-amber-500/20" : "bg-white/3 border-white/8"}`} data-testid={`asset-${asset.id}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{asset.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white">{asset.name}</p>
                            <div className="flex items-center gap-1"><Icon className={`h-3 w-3 ${typeInfo.color}`} /><span className={`text-xs font-semibold ${typeInfo.color}`}>{typeInfo.label}</span></div>
                          </div>
                        </div>
                        {asset.description && <p className="text-xs text-slate-400">{asset.description}</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/5 rounded-lg p-2"><p className="text-slate-400">Net Worth +</p><p className="font-bold text-white">{currencySymbol}{asset.value.toLocaleString()}</p></div>
                          {asset.passiveIncome > 0 && <div className="bg-emerald-500/10 rounded-lg p-2"><p className="text-slate-400">Income</p><p className="font-bold text-emerald-300">+{currencySymbol}{asset.passiveIncome}/{asset.incomeFrequency}</p></div>}
                          {asset.maintenanceCost > 0 && <div className="bg-red-500/10 rounded-lg p-2"><p className="text-slate-400">Upkeep</p><p className="font-bold text-red-300">-{currencySymbol}{asset.maintenanceCost}/{asset.maintenanceFrequency}</p></div>}
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-black text-lg text-amber-300">{currencySymbol}{asset.price.toLocaleString()}</span>
                          {asset.maxOwners !== null && <span className="text-xs text-slate-500">{asset.maxOwners} max owners</span>}
                        </div>
                        <Button size="sm" className={`w-full font-bold text-sm ${alreadyOwned ? "bg-white/10 text-slate-400" : canAfford && !atCapacity ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-white/5 text-slate-500"}`}
                          disabled={alreadyOwned || !canAfford || atCapacity || buyAssetMutation.isPending}
                          onClick={() => buyAssetMutation.mutate(asset.id)}
                          data-testid={`button-buy-asset-${asset.id}`}>
                          {alreadyOwned ? "Owned" : atCapacity ? "Sold Out" : !canAfford ? "Can't Afford" : buyAssetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ AUCTIONS ══ */}
        {activeSection === "auctions" && (
          <div className="space-y-6">
            {activeAuctions.length === 0 && closedAuctions.length === 0 ? (
              <div className="text-center py-16 text-slate-500"><Gavel className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No auctions yet.</p></div>
            ) : (
              <>
                {activeAuctions.length > 0 && (
                  <div>
                    <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-amber-400" /> Live Auctions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeAuctions.map((auction: any) => {
                        const timeLeft = new Date(auction.endDate).getTime() - Date.now();
                        const hoursLeft = Math.floor(timeLeft / 3600000);
                        const minutesLeft = Math.floor((timeLeft % 3600000) / 60000);
                        const myBid = bidAmounts[auction.id] ?? "";
                        const minBid = Math.max(auction.startingBid, (auction.currentHighBid ?? 0) + 1);
                        const isHighBidder = auction.currentHighBidderId === user?.id;
                        return (
                          <div key={auction.id} className="rounded-2xl p-5 bg-amber-500/5 border border-amber-500/20 flex flex-col gap-3" data-testid={`auction-card-${auction.id}`}>
                            <div className="flex items-start justify-between">
                              <div><span className="text-2xl">{auction.emoji ?? "🎁"}</span><p className="font-black text-white mt-1">{auction.title}</p></div>
                              {isHighBidder && <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">Winning!</Badge>}
                            </div>
                            <div className="flex justify-between text-sm">
                              <div><p className="text-slate-500 text-xs">Current Bid</p><p className="font-bold text-amber-300">{currencySymbol}{auction.currentHighBid ?? 0}</p></div>
                              <div className="text-right"><p className="text-slate-500 text-xs">Ends in</p><p className="font-bold text-white text-xs">{hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`}</p></div>
                            </div>
                            <div className="flex gap-2">
                              <Input type="number" min={minBid} placeholder={`Min: ${currencySymbol}${minBid}`}
                                value={myBid} onChange={e => setBidAmounts(p => ({ ...p, [auction.id]: e.target.value }))}
                                className="bg-white/5 border-white/10 text-white text-sm h-8" data-testid={`input-bid-${auction.id}`} />
                              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                                disabled={!myBid || Number(myBid) < minBid || balance < minBid || bidMutation.isPending}
                                onClick={() => bidMutation.mutate({ auctionId: auction.id, amount: Number(myBid) })}
                                data-testid={`button-bid-${auction.id}`}>
                                {bidMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Bid"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {closedAuctions.length > 0 && (
                  <div>
                    <h2 className="text-base font-bold text-slate-400 mb-3">Past Auctions</h2>
                    <div className="space-y-2">
                      {closedAuctions.slice(0, 5).map((a: any) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-xl p-3 bg-white/3 border border-white/5">
                          <span className="text-lg">{a.emoji ?? "🎁"}</span>
                          <div className="flex-1"><p className="text-sm font-semibold text-white">{a.title}</p><p className="text-xs text-slate-500">Ended {format(new Date(a.endDate), "MMM d")}</p></div>
                          {a.winnerId === user?.id ? <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">Won!</Badge> : <Badge className="bg-slate-500/20 text-slate-400 border-0 text-xs">{a.currentHighBid ? `${currencySymbol}${a.currentHighBid}` : "No bids"}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ STORE ══ */}
        {activeSection === "store" && (
          <div>
            {storeItems.length === 0 ? (
              <div className="text-center py-16 text-slate-500"><ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Store is empty.</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {storeItems.map((item: any) => {
                  const canAfford = balance >= item.price;
                  const outOfStock = item.stock !== null && item.stock <= 0;
                  return (
                    <div key={item.id} className={`rounded-2xl p-4 border flex flex-col gap-2 ${outOfStock ? "opacity-50 bg-white/3 border-white/5" : canAfford ? "bg-purple-500/5 border-purple-500/20" : "bg-white/3 border-white/10"}`} data-testid={`store-item-${item.id}`}>
                      <span className="text-3xl">{item.emoji}</span>
                      <p className="font-black text-white text-sm leading-tight">{item.name}</p>
                      {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-sm text-purple-300">{currencySymbol}{item.price}</span>
                        {item.stock !== null && <span className="text-xs text-slate-500">{item.stock} left</span>}
                      </div>
                      <Button size="sm" className={`w-full text-xs font-bold ${canAfford && !outOfStock ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-white/5 text-slate-500"}`}
                        disabled={!canAfford || outOfStock || buyMutation.isPending}
                        onClick={() => buyMutation.mutate(item.id)} data-testid={`button-buy-${item.id}`}>
                        {outOfStock ? "Out of stock" : !canAfford ? "Can't afford" : buyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Buy"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD ══ */}
        {activeSection === "leaderboard" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /> Class Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="text-center py-16 text-slate-500"><Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No rankings yet.</p></div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((student: any, index: number) => {
                  const isMe = student.id === user?.id;
                  const RankIcon = RANK_ICONS[index] ?? null;
                  const medals = ["text-yellow-400", "text-slate-300", "text-amber-600"];
                  return (
                    <div key={student.id} className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${isMe ? "bg-teal-500/10 border-teal-500/30" : "bg-white/3 border-white/8 hover:bg-white/5"}`} data-testid={`leaderboard-row-${student.id}`}>
                      <div className="w-8 text-center shrink-0">
                        {RankIcon ? <RankIcon className={`h-5 w-5 mx-auto ${medals[index]}`} /> : <span className="text-slate-500 font-bold text-sm">#{index + 1}</span>}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {student.displayName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${isMe ? "text-teal-300" : "text-white"}`}>{student.displayName}{isMe && " (You)"}</p>
                        {student.savingsBalance > 0 && <p className="text-xs text-slate-500">{currencySymbol}{student.savingsBalance} saved</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-amber-300">{currencySymbol}{(student.balance ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
