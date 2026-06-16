export type PresenceStatus = "online" | "idle" | "offline";

const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: "bg-green-500 shadow-[0_0_5px_1px_rgba(34,197,94,0.6)]",
  idle: "bg-yellow-400 shadow-[0_0_5px_1px_rgba(250,204,21,0.6)]",
  offline: "bg-slate-400",
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
};

interface StatusDotProps {
  status: PresenceStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function StatusDot({ status, className = "", size = "sm", showLabel = false }: StatusDotProps) {
  const sizeClass = size === "lg" ? "w-3.5 h-3.5" : size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";
  const dot = (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sizeClass} ${STATUS_COLORS[status]} ${className}`}
      title={STATUS_LABEL[status]}
    />
  );
  if (!showLabel) return dot;
  const labelColor = status === "online" ? "text-green-500" : status === "idle" ? "text-yellow-400" : "text-muted-foreground";
  return (
    <span className="flex items-center gap-1.5">
      {dot}
      <span className={`text-sm font-medium ${labelColor}`}>{STATUS_LABEL[status]}</span>
    </span>
  );
}

export function AvatarStatusDot({ status }: { status: PresenceStatus }) {
  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${STATUS_COLORS[status]}`}
      title={STATUS_LABEL[status]}
    />
  );
}

export function getPresenceFromLastSeen(
  lastSeenAt: string | null | undefined,
  presenceStatus?: string | null,
): PresenceStatus {
  if (!lastSeenAt) return "offline";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff > 3 * 60 * 1000) return "offline";
  return presenceStatus === "idle" ? "idle" : "online";
}
