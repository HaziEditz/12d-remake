import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Terminal, ChevronUp } from "lucide-react";

interface LogEntry {
  type: "input" | "output" | "error" | "system";
  text: string;
}

function AdminConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { type: "system", text: "12Digits Admin Console v1.0" },
    { type: "system", text: "Type /help for available commands." },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMinimized) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [log, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, isMinimized]);

  const consoleMutation = useMutation({
    mutationFn: async (command: string) => {
      const res = await fetch("/api/admin/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.output || data.message || `Server error ${res.status}`);
      }
      return data as { output: string; success: boolean };
    },
    onSuccess: (data) => {
      setLog(prev => [...prev, {
        type: data.success ? "output" : "error",
        text: data.output,
      }]);
    },
    onError: (err: Error) => {
      setLog(prev => [...prev, {
        type: "error",
        text: err.message || "Request failed. Are you still logged in as admin?",
      }]);
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
      const nextIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setInput(nextIdx === -1 ? "" : history[nextIdx] ?? "");
    }
  }

  const panelHeight = isExpanded ? "520px" : "320px";

  return (
    <>
      {/* Toggle button */}
      <button
        data-testid="admin-console-toggle"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setIsMinimized(false);
          } else {
            setIsOpen(true);
            setIsMinimized(false);
          }
        }}
        title="Admin Console"
        className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold shadow-lg border transition-all duration-200 ${
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
          data-testid="admin-console-panel"
          className="fixed bottom-14 left-4 z-50 w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60 flex flex-col overflow-hidden transition-all duration-200"
          style={{ height: isMinimized ? "36px" : panelHeight }}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 select-none">
            <div className="flex items-center gap-2">
              {/* Functional traffic-light dots */}
              <div className="flex gap-1.5">
                {/* Red = close */}
                <button
                  data-testid="admin-console-close"
                  onClick={() => { setIsOpen(false); setIsMinimized(false); setIsExpanded(false); }}
                  title="Close"
                  className="group w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center"
                >
                  <span className="hidden group-hover:block text-red-900 leading-none" style={{ fontSize: "7px", lineHeight: 1 }}>✕</span>
                </button>
                {/* Yellow = minimize / restore */}
                <button
                  data-testid="admin-console-minimize"
                  onClick={() => setIsMinimized(v => !v)}
                  title={isMinimized ? "Restore" : "Minimize"}
                  className="group w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors flex items-center justify-center"
                >
                  <span className="hidden group-hover:block text-yellow-900 leading-none" style={{ fontSize: "9px", lineHeight: 1 }}>−</span>
                </button>
                {/* Green = expand / shrink */}
                <button
                  data-testid="admin-console-expand"
                  onClick={() => { setIsExpanded(v => !v); setIsMinimized(false); }}
                  title={isExpanded ? "Shrink" : "Expand"}
                  className="group w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors flex items-center justify-center"
                >
                  <span className="hidden group-hover:block text-emerald-900 leading-none" style={{ fontSize: "7px", lineHeight: 1 }}>⤢</span>
                </button>
              </div>
              <span className="text-zinc-400 text-xs font-mono ml-1">admin — console</span>
            </div>
            {isMinimized && (
              <span className="text-zinc-600 text-[10px] font-mono">minimized — click yellow to restore</span>
            )}
          </div>

          {/* Log output — hidden when minimized */}
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
                    {entry.type === "output" && (
                      <span className="text-zinc-300">{entry.text}</span>
                    )}
                    {entry.type === "error" && (
                      <span className="text-red-400">{entry.text}</span>
                    )}
                    {entry.type === "system" && (
                      <span className="text-zinc-500 italic">{entry.text}</span>
                    )}
                  </div>
                ))}
                {consoleMutation.isPending && (
                  <div className="text-zinc-500 animate-pulse">processing…</div>
                )}
                <div ref={logEndRef} />
              </div>

              {/* Input area */}
              <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
                <span className="text-emerald-400 font-mono text-xs select-none">❯</span>
                <input
                  ref={inputRef}
                  data-testid="admin-console-input"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="/give Alex 1000"
                  disabled={consoleMutation.isPending}
                  className="flex-1 bg-transparent text-white text-xs font-mono placeholder:text-zinc-600 outline-none disabled:opacity-50"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default AdminConsole;
