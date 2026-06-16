import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, CheckCircle2, Clock, ChevronRight } from "lucide-react";

interface AssignmentItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  lessonId: string | null;
  dueDate: string | null;
  completed: boolean;
  lesson?: { id: string; title: string; difficulty?: string } | null;
}

export function AssignmentsPanel({ variant = "default", linkBase = "/lessons" }: { variant?: "default" | "primary"; linkBase?: string }) {
  const [, navigate] = useLocation();
  const { data: items = [], isLoading } = useQuery<AssignmentItem[]>({
    queryKey: ["/api/academy/assignments"],
  });

  if (isLoading || items.length === 0) return null;

  const isPrimary = variant === "primary";
  const containerClass = isPrimary
    ? "rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4"
    : "rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4";

  // Sort: incomplete first (overdue first within), then completed
  const now = Date.now();
  const sorted = [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDue - bDue;
  });

  const pendingCount = items.filter(i => !i.completed).length;

  return (
    <div className={containerClass} data-testid="assignments-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className={`h-4 w-4 ${isPrimary ? "text-blue-600" : "text-blue-400"}`} />
          <p className={`text-sm font-black ${isPrimary ? "text-blue-900" : "text-foreground"}`}>From your teacher</p>
        </div>
        {pendingCount > 0 && (
          <span className={`text-xs font-bold ${isPrimary ? "text-blue-600" : "text-blue-400"}`} data-testid="text-pending-count">
            {pendingCount} pending
          </span>
        )}
      </div>
      <div className="space-y-2">
        {sorted.slice(0, 5).map((a) => {
          const overdue = a.dueDate && !a.completed && new Date(a.dueDate).getTime() < now;
          const lessonHref = a.lessonId ? `${linkBase}/${a.lessonId}` : null;
          return (
            <button
              key={a.id}
              onClick={() => lessonHref && navigate(lessonHref)}
              disabled={!lessonHref}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                isPrimary
                  ? "bg-white hover:bg-blue-50 border border-blue-100"
                  : "bg-card hover:bg-muted/50 border border-border"
              } ${a.completed ? "opacity-60" : ""} ${lessonHref ? "cursor-pointer" : "cursor-default"}`}
              data-testid={`assignment-item-${a.id}`}
            >
              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                a.completed ? "bg-emerald-500/15 text-emerald-500" : overdue ? "bg-red-500/15 text-red-500" : isPrimary ? "bg-blue-100 text-blue-600" : "bg-blue-500/15 text-blue-400"
              }`}>
                {a.completed ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isPrimary ? "text-slate-900" : "text-foreground"}`}>
                  {a.lesson?.title ?? a.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {a.completed ? (
                    <span className="text-[11px] font-semibold text-emerald-500">Completed</span>
                  ) : a.dueDate ? (
                    <span className={`text-[11px] flex items-center gap-1 font-medium ${overdue ? "text-red-500" : isPrimary ? "text-slate-500" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3" />
                      {overdue ? "Overdue · " : "Due "}
                      {new Date(a.dueDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-medium ${isPrimary ? "text-slate-500" : "text-muted-foreground"}`}>No due date</span>
                  )}
                </div>
              </div>
              {lessonHref && !a.completed && (
                <ChevronRight className={`h-4 w-4 shrink-0 ${isPrimary ? "text-blue-400" : "text-muted-foreground"}`} />
              )}
            </button>
          );
        })}
      </div>
      {items.length > 5 && (
        <p className={`text-[11px] text-center mt-3 ${isPrimary ? "text-blue-600/70" : "text-muted-foreground"}`}>
          +{items.length - 5} more assignment{items.length - 5 === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
