import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Terminal, ChevronUp, Users, DollarSign, Lock, Unlock, Plus, Minus } from "lucide-react";
import { useLocation } from "wouter";

interface LogEntry {
  type: "input" | "output" | "error" | "system";
  text: string;
}

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  simulatorBalance: number;
  isFrozen?: boolean;
  membershipTier?: string;
}

const DEFAULT_W = 480;
const DEFAULT_H = 320;
const MIN_W = 320;
const MIN_H = 200;
const DEFAULT_X = 16;
const DEFAULT_Y_OFFSET = 60;

function AdminConsole() {
  const [location] = useLocation();
  const onAdminPage = location.startsWith("/admin");
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { type: "system", text: "12Digits Admin Console v1.0" },
    { type: "system", text: "Type /help for available commands." },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [userSearch, setUserSearch] = useState("");

  const [pos, setPos] = useState({ x: DEFAULT_X, y: -1 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && pos.y === -1) {
      setPos({ x: DEFAULT_X, y: window.innerHeight - DEFAULT_H - DEFAULT_Y_OFFSET });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isMinimized) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen, isMinimized]);

  // ── Users list ───────────────────────────────────────────────────────────────
  const { data: users = [], refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users-list"],
    enabled: isOpen && showUsers,
    staleTime: 15_000,
  });

  const filteredUsers = users.filter(u =>
    !userSearch || u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  function insertUser(name: string) {
    inputRef.current?.focus();
    setInput(prev => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === "/give" || trimmed === "/take" || trimmed === "/freeze" || trimmed === "/unfreeze") {
        return trimmed ? `${trimmed} ${name} ` : `/give ${name} `;
      }
      const parts = trimmed.split(/\s+/);
      if (parts.length === 1 && trimmed.startsWith("/")) return `${trimmed} ${name} `;
      return `${trimmed} ${name} `;
    });
  }

  function quickAction(user: AdminUser, action: "give" | "take" | "freeze") {
    inputRef.current?.focus();
    if (action === "freeze") {
      setInput(`/${user.isFrozen ? "unfreeze" : "freeze"} ${user.displayName}`);
    } else {
      setInput(`/${action} ${user.displayName} `);
    }
  }

  // ── Drag ─────────────────────────────────────────────────────────────────────
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const nx = Math.max(0, Math.min(window.innerWidth - size.w, dragStart.current.px + ev.clientX - dragStart.current.mx));
      const ny = Math.max(0, Math.min(window.innerHeight - 36, dragStart.current.py + ev.clientY - dragStart.current.my));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos, size]);

  // ── Resize ───────────────────────────────────────────────────────────────────
  const resizing = useRef(false);
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const nw = Math.max(MIN_W, resizeStart.current.w + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.h + ev.clientY - resizeStart.current.my);
      setSize({ w: nw, h: nh });
    };
    const onUp = () => { resizing.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size]);

  // ── Mutation ──────────────────────────────────────────────────────────────────
  const consoleMutation = useMutation({
    mutationFn: async (command: string) => {
      const res = await fetch("/api/admin/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.output || data.message || `Server error ${res.status}`);
      return data as { output: string; success: boolean };
    },
    onSuccess: (data) => {
      setLog(prev => [...prev, { type: data.success ? "output" : "error", text: data.output }]);
      if (showUsers) refetchUsers();
    },
    onError: (err: Error) => {
      setLog(prev => [...prev, { type: "error", text: err.message || "Request failed." }]);
    },
  });

  function submit() {
    const cmd = input.trim();
    if (!cmd) return;
    setLog(prev => [...prev, { type: "input", text: cmd }]);
    setHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    setInput("");
    consoleMutation.mutate(cmd);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      setInput(history[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? "" : history[idx] ?? "");
    }
  }

  function handleClose() { setIsOpen(false); setIsMinimized(false); setShowUsers(false); }
  function handleMinimize() { setIsMinimized(v => !v); }
  function handleOpen() { setIsOpen(true); setIsMinimized(false); }

  const totalWidth = showUsers && !isMinimized ? size.w + 240 : size.w;
  const panelStyle: React.CSSProperties = pos.y === -1
    ? { bottom: DEFAULT_Y_OFFSET, left: DEFAULT_X, width: totalWidth, height: isMinimized ? 36 : size.h }
    : { top: pos.y, left: pos.x, width: totalWidth, height: isMinimized ? 36 : size.h };

  const tierColor: Record<string, string> = {
    premium: "text-yellow-400",
    casual: "text-purple-400",
    school: "text-blue-400",
    free: "text-zinc-500",
  };

  return (
    <>
      {/* Toggle button */}
      <button
        data-testid="admin-console-toggle"
        onClick={isOpen ? handleClose : handleOpen}
        title="Admin Console"
        className={`fixed bottom-4 z-[49] flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold shadow-lg border transition-all duration-200 ${onAdminPage ? "left-60" : "left-4"} ${
          isOpen
            ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/30"
            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400"
        }`}
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>ADMIN</span>
        {!isOpen && <ChevronUp className="w-3 h-3 opacity-60" />}
      </button>

      {/* Console panel */}
      {isOpen && (
        <div
          ref={panelRef}
          data-testid="admin-console-panel"
          className="fixed z-50 rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60 flex overflow-hidden transition-[height,width] duration-150"
          style={panelStyle}
        >
          {/* ── Main console column ── */}
          <div className="flex flex-col" style={{ width: size.w, minWidth: size.w }}>
            {/* Title bar */}
            <div
              className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 select-none cursor-grab active:cursor-grabbing"
              onMouseDown={onTitleMouseDown}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <button data-testid="admin-console-close" onClick={handleClose} title="Close"
                    className="group w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center">
                    <span className="hidden group-hover:block text-red-900 leading-none" style={{ fontSize: "7px" }}>✕</span>
                  </button>
                  <button data-testid="admin-console-minimize" onClick={handleMinimize} title={isMinimized ? "Restore" : "Minimize"}
                    className="group w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors flex items-center justify-center">
                    <span className="hidden group-hover:block text-yellow-900 leading-none" style={{ fontSize: "9px" }}>−</span>
                  </button>
                  <button data-testid="admin-console-restore" onClick={() => { setSize({ w: DEFAULT_W, h: DEFAULT_H }); setIsMinimized(false); }}
                    title="Reset size"
                    className="group w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors flex items-center justify-center">
                    <span className="hidden group-hover:block text-emerald-900 leading-none" style={{ fontSize: "7px" }}>⤢</span>
                  </button>
                </div>
                <span className="text-zinc-400 text-xs font-mono ml-1">admin — console</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Users panel toggle */}
                <button
                  onClick={() => setShowUsers(v => !v)}
                  title="Toggle user list"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${showUsers ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"}`}
                >
                  <Users className="w-3 h-3" />
                  <span>Users</span>
                </button>
                {isMinimized && <span className="text-zinc-600 text-[10px] font-mono">minimized</span>}
              </div>
            </div>

            {/* Log + input */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
                  {log.map((entry, i) => (
                    <div key={i} className="whitespace-pre-wrap mb-0.5">
                      {entry.type === "input" && (
                        <span>
                          <span className="text-emerald-400">❯ </span>
                          <span className="text-white">{entry.text}</span>
                        </span>
                      )}
                      {entry.type === "output" && <span className="text-zinc-300">{entry.text}</span>}
                      {entry.type === "error" && <span className="text-red-400">{entry.text}</span>}
                      {entry.type === "system" && <span className="text-zinc-500 italic">{entry.text}</span>}
                    </div>
                  ))}
                  {consoleMutation.isPending && (
                    <div className="text-zinc-500 animate-pulse">processing…</div>
                  )}
                  <div ref={logEndRef} />
                </div>

                <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
                  <span className="text-emerald-400 font-mono text-xs select-none">❯</span>
                  <input
                    ref={inputRef}
                    data-testid="admin-console-input"
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="/give Hasnat Abdullah 1000"
                    disabled={consoleMutation.isPending}
                    className="flex-1 bg-transparent text-white text-xs font-mono placeholder:text-zinc-600 outline-none disabled:opacity-50"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div data-testid="admin-console-resize" onMouseDown={onResizeMouseDown}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end pb-0.5 pr-0.5"
                  title="Drag to resize">
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-600">
                    <path d="M9 1L1 9M9 5L5 9M9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              </>
            )}
          </div>

          {/* ── Users panel ── */}
          {showUsers && !isMinimized && (
            <div className="w-60 flex flex-col border-l border-zinc-800 bg-zinc-900/80 flex-shrink-0">
              <div className="px-2.5 py-2 border-b border-zinc-800 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Users</span>
                <span className="ml-auto text-[10px] text-zinc-600">{users.length}</span>
              </div>

              {/* Search */}
              <div className="px-2 pt-2 pb-1">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-1 rounded border border-zinc-700 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                />
              </div>

              {/* User rows */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {filteredUsers.length === 0 && (
                  <p className="text-zinc-600 text-[10px] text-center pt-4 font-mono">No users found</p>
                )}
                {filteredUsers.map(u => (
                  <div key={u.id} className="rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
                    {/* Name row */}
                    <button
                      onClick={() => insertUser(u.displayName)}
                      className="w-full text-left px-2 pt-1.5 pb-0.5 group"
                      title="Click to insert name into command"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-zinc-300">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-zinc-200 truncate group-hover:text-white">{u.displayName}</p>
                          <p className="text-[9px] text-zinc-600 truncate">{u.email}</p>
                        </div>
                        {u.membershipTier && (
                          <span className={`text-[8px] font-bold uppercase ${tierColor[u.membershipTier] ?? "text-zinc-500"}`}>
                            {u.membershipTier}
                          </span>
                        )}
                      </div>
                    </button>
                    {/* Balance + actions */}
                    <div className="px-2 pb-1.5 flex items-center justify-between">
                      <span className="text-[9px] text-emerald-500 font-mono font-semibold">
                        ${(u.simulatorBalance ?? 0).toLocaleString()}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => quickAction(u, "give")}
                          title="Give balance"
                          className="w-5 h-5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-500 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => quickAction(u, "take")}
                          title="Take balance"
                          className="w-5 h-5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => quickAction(u, "freeze")}
                          title={u.isFrozen ? "Unfreeze user" : "Freeze user"}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${u.isFrozen ? "bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400" : "bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400"}`}
                        >
                          {u.isFrozen ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default AdminConsole;
