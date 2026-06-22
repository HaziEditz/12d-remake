import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Terminal, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";

interface LogEntry {
  type: "input" | "output" | "error" | "system";
  text: string;
}

const DEFAULT_W = 480;
const DEFAULT_H = 320;
const MIN_W = 320;
const MIN_H = 200;
const DEFAULT_X = 16;
const DEFAULT_Y_OFFSET = 60; // px above bottom

function AdminConsole() {
  const [location] = useLocation();
  const onAdminPage = location.startsWith("/admin");
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { type: "system", text: "12Digits Admin Console v1.0" },
    { type: "system", text: "Type /help for available commands." },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Position & size
  const [pos, setPos] = useState({ x: DEFAULT_X, y: -1 }); // y=-1 = unset, computed on open
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Compute initial Y on first open
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

  // ── Drag ────────────────────────────────────────────────────────────────────
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return; // don't drag when clicking dots
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

  // ── Mutation ─────────────────────────────────────────────────────────────────
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

  function handleClose() { setIsOpen(false); setIsMinimized(false); }
  function handleMinimize() { setIsMinimized(v => !v); }
  function handleOpen() { setIsOpen(true); setIsMinimized(false); }

  const panelStyle: React.CSSProperties = pos.y === -1
    ? { bottom: DEFAULT_Y_OFFSET, left: DEFAULT_X, width: size.w, height: isMinimized ? 36 : size.h }
    : { top: pos.y, left: pos.x, width: size.w, height: isMinimized ? 36 : size.h };

  return (
    <>
      {/* Toggle button — always visible to admin */}
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
          className="fixed z-50 rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60 flex flex-col overflow-hidden transition-[height] duration-150"
          style={panelStyle}
        >
          {/* Title bar — drag handle */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 select-none cursor-grab active:cursor-grabbing"
            onMouseDown={onTitleMouseDown}
          >
            <div className="flex items-center gap-2">
              {/* Traffic light dots */}
              <div className="flex gap-1.5">
                <button
                  data-testid="admin-console-close"
                  onClick={handleClose}
                  title="Close"
                  className="group w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center"
                >
                  <span className="hidden group-hover:block text-red-900 leading-none" style={{ fontSize: "7px" }}>✕</span>
                </button>
                <button
                  data-testid="admin-console-minimize"
                  onClick={handleMinimize}
                  title={isMinimized ? "Restore" : "Minimize"}
                  className="group w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors flex items-center justify-center"
                >
                  <span className="hidden group-hover:block text-yellow-900 leading-none" style={{ fontSize: "9px" }}>−</span>
                </button>
                <button
                  data-testid="admin-console-restore"
                  onClick={() => { setSize({ w: DEFAULT_W, h: DEFAULT_H }); setIsMinimized(false); }}
                  title="Reset size"
                  className="group w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors flex items-center justify-center"
                >
                  <span className="hidden group-hover:block text-emerald-900 leading-none" style={{ fontSize: "7px" }}>⤢</span>
                </button>
              </div>
              <span className="text-zinc-400 text-xs font-mono ml-1">admin — console</span>
            </div>
            {isMinimized && (
              <span className="text-zinc-600 text-[10px] font-mono pr-1">minimized</span>
            )}
          </div>

          {/* Log + input — hidden when minimized */}
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

              {/* Input row */}
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

              {/* Resize handle */}
              <div
                data-testid="admin-console-resize"
                onMouseDown={onResizeMouseDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end pb-0.5 pr-0.5"
                title="Drag to resize"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-600">
                  <path d="M9 1L1 9M9 5L5 9M9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default AdminConsole;
