import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Terminal, X, Minus, ChevronUp } from "lucide-react";

interface LogEntry {
  type: "input" | "output" | "error" | "system";
  text: string;
}

function AdminConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { type: "system", text: "12Digits Admin Console v1.0" },
    { type: "system", text: 'Type /help for available commands.' },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const consoleMutation = useMutation({
    mutationFn: (command: string) =>
      apiRequest("POST", "/api/admin/console", { command }),
    onSuccess: async (res) => {
      const data = await res.json();
      setLog(prev => [...prev, {
        type: data.success ? "output" : "error",
        text: data.output,
      }]);
    },
    onError: () => {
      setLog(prev => [...prev, { type: "error", text: "Request failed. Check your connection." }]);
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

  return (
    <>
      {/* Toggle button */}
      <button
        data-testid="admin-console-toggle"
        onClick={() => setIsOpen(v => !v)}
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
          className="fixed bottom-14 left-4 z-50 w-[480px] max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
          style={{ height: "320px" }}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-zinc-400 text-xs font-mono ml-1">admin — console</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
              data-testid="admin-console-close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Log output */}
          <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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
        </div>
      )}
    </>
  );
}

export default AdminConsole;
