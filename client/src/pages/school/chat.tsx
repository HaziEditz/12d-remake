import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import SchoolLayout from "@/layouts/school-layout";
import {
  Send, Megaphone, MessageCircle, Users, Pin, GraduationCap,
  Pencil, Trash2, Check, X, Plus, ChevronLeft, Hash, MoreHorizontal,
  Reply, Mail, Circle, ArrowLeft, AtSign
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MainTab = "class" | "groups" | "dms";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(date: string | Date) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ name, role, size = "sm", online }: { name: string; role?: string; size?: "sm" | "md"; online?: boolean }) {
  const isTeacher = role === "teacher" || role === "admin";
  const s = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className="relative flex-shrink-0">
      <div className={`${s} rounded-full flex items-center justify-center font-black ${isTeacher ? "bg-teal-600 text-white" : "bg-slate-700 text-white"}`}>
        {isTeacher ? <GraduationCap className="h-3.5 w-3.5" /> : name?.charAt(0).toUpperCase()}
      </div>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0b1120] ${online ? "bg-emerald-400" : "bg-slate-600"}`} />
      )}
    </div>
  );
}

function ReactionBar({ messageId, reactions, userId, isPrimary, onReact }: {
  messageId: string; reactions: any[]; userId: string; isPrimary: boolean;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const grouped: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
    grouped[r.emoji].count++;
    if (r.userId === userId) grouped[r.emoji].mine = true;
  }
  if (!Object.keys(grouped).length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${mine
            ? (isPrimary ? "bg-amber-200 border border-amber-400 text-amber-800" : "bg-teal-500/30 border border-teal-500/60 text-white")
            : (isPrimary ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-white/8 border border-white/15 text-slate-300 hover:bg-white/15")
          }`}
        >
          <span>{emoji}</span>
          <span className="font-bold">{count}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({ onSelect, onClose, isPrimary }: { onSelect: (e: string) => void; onClose: () => void; isPrimary: boolean }) {
  return (
    <div className={`flex gap-1 p-1.5 rounded-xl border shadow-xl z-50 ${isPrimary ? "bg-white border-amber-200" : "bg-[#0d1526] border-white/20"}`}>
      {EMOJI_REACTIONS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
      ))}
    </div>
  );
}

function QuotePreview({ msg, onClear, isPrimary, textMuted, accentText }: { msg: any; onClear: () => void; isPrimary: boolean; textMuted: string; accentText: string }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-2 mb-2 rounded-xl border-l-2 ${isPrimary ? "bg-amber-50 border-amber-400" : "bg-white/5 border-teal-500"}`}>
      <Reply className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${accentText}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${accentText}`}>{msg.senderName ?? "You"}</p>
        <p className={`text-xs truncate ${textMuted}`}>{msg.isDeleted ? "Deleted message" : msg.content}</p>
      </div>
      <button onClick={onClear} className={`${textMuted} hover:text-red-400 flex-shrink-0`}><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function QuotedMessage({ msgId, messages }: { msgId: string; messages: any[] }) {
  const quoted = messages.find(m => m.id === msgId);
  if (!quoted) return null;
  return (
    <div className="border-l-2 border-white/30 pl-2 mb-1.5 opacity-70">
      <p className="text-xs font-semibold opacity-80">{quoted.senderName}</p>
      <p className="text-xs truncate">{quoted.isDeleted ? "Deleted message" : quoted.content}</p>
    </div>
  );
}

function MessageMenu({ isMe, isTeacher, isTeacherMsg, isPinned, onEdit, onDelete, onReply, onPin, onUnpin, onClose, isPrimary, textMuted }: any) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={menuRef} className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-0 z-50 min-w-[140px] rounded-xl border shadow-xl py-1 ${isPrimary ? "bg-white border-amber-200" : "bg-[#0d1526] border-white/20"}`}>
      <button onClick={onReply} className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${isPrimary ? "hover:bg-amber-50 text-amber-800" : "hover:bg-white/8 text-slate-200"}`}>
        <Reply className="h-3.5 w-3.5" /> Reply
      </button>
      {isMe && !isTeacherMsg && (
        <button onClick={onEdit} className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${isPrimary ? "hover:bg-amber-50 text-amber-800" : "hover:bg-white/8 text-slate-200"}`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      )}
      {isTeacher && !isPinned && (
        <button onClick={onPin} className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${isPrimary ? "hover:bg-amber-50 text-amber-600" : "hover:bg-white/8 text-teal-400"}`}>
          <Pin className="h-3.5 w-3.5" /> Pin
        </button>
      )}
      {isTeacher && isPinned && (
        <button onClick={onUnpin} className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${isPrimary ? "hover:bg-amber-50 text-amber-600" : "hover:bg-white/8 text-slate-400"}`}>
          <Pin className="h-3.5 w-3.5" /> Unpin
        </button>
      )}
      {(isMe || isTeacher) && (
        <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      )}
    </div>
  );
}

export default function SchoolChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<MainTab>("class");
  const [message, setMessage] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Group chats
  const [activeGroupChat, setActiveGroupChat] = useState<any | null>(null);
  const [groupMessage, setGroupMessage] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingGroupMsgId, setEditingGroupMsgId] = useState<string | null>(null);
  const [editGroupContent, setEditGroupContent] = useState("");

  // DMs
  const [activeDMUser, setActiveDMUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [dmMessage, setDmMessage] = useState("");
  const [editingDmId, setEditingDmId] = useState<string | null>(null);
  const [editDmContent, setEditDmContent] = useState("");

  // Reactions + reply
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [groupReplyTo, setGroupReplyTo] = useState<any | null>(null);
  const [dmReplyTo, setDmReplyTo] = useState<any | null>(null);

  // Context menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const groupEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  // ── Data fetching ──────────────────────────────────────────────
  const { data: classData } = useQuery<any>({
    queryKey: ["/api/classroom"],
    enabled: user?.role === "student",
  });

  const { data: teacherClasses = [] } = useQuery<any[]>({
    queryKey: ["/api/teacher/classes"],
    enabled: isTeacher,
  });

  const chatClassId = isTeacher
    ? (selectedClass || (teacherClasses as any[])[0]?.id)
    : classData?.class?.id;

  const ageGroup = classData?.class?.ageGroup ?? "high_school";
  const isPrimary = ageGroup === "primary";

  const classmates: any[] = classData?.classmates ?? [];
  const allClassmates = isTeacher ? [] : classmates;

  const currentClassName = isTeacher
    ? (teacherClasses as any[]).find(c => c.id === chatClassId)?.name ?? "Class Chat"
    : classData?.class?.name ?? "Class Chat";

  const hasClass = isTeacher ? (teacherClasses as any[]).length > 0 : !!classData?.class;

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/classroom/chat", chatClassId],
    queryFn: async () => {
      const url = chatClassId ? `/api/classroom/chat?classId=${chatClassId}` : "/api/classroom/chat";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!chatClassId && tab === "class",
  });

  const { data: pinnedMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/classroom/chat/pinned", chatClassId],
    queryFn: async () => {
      const url = chatClassId ? `/api/classroom/chat/pinned?classId=${chatClassId}` : "/api/classroom/chat/pinned";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
    enabled: !!chatClassId && tab === "class",
  });

  const messageIds = (messages as any[]).map(m => m.id).join(",");
  const { data: reactions = [] } = useQuery<any[]>({
    queryKey: ["/api/classroom/chat/reactions", messageIds],
    queryFn: async () => {
      if (!messageIds) return [];
      const res = await fetch(`/api/classroom/chat/reactions?ids=${messageIds}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!messageIds && tab === "class",
  });

  const { data: typingUsers = [] } = useQuery<string[]>({
    queryKey: ["/api/classroom/typing", chatClassId],
    queryFn: async () => {
      const res = await fetch(`/api/classroom/typing?chatId=${chatClassId ?? "global"}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 2000,
    enabled: !!chatClassId && tab === "class",
  });

  const { data: groupChats = [] } = useQuery<any[]>({
    queryKey: ["/api/group-chats"],
    refetchInterval: 5000,
    enabled: !!chatClassId && tab === "groups",
  });

  const { data: groupMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/group-chats", activeGroupChat?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/group-chats/${activeGroupChat!.id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!activeGroupChat,
  });

  const groupMessageIds = (groupMessages as any[]).map(m => m.id).join(",");
  const { data: groupReactions = [] } = useQuery<any[]>({
    queryKey: ["/api/classroom/chat/reactions", groupMessageIds],
    queryFn: async () => {
      if (!groupMessageIds) return [];
      const res = await fetch(`/api/classroom/chat/reactions?ids=${groupMessageIds}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!groupMessageIds && !!activeGroupChat,
  });

  const { data: dmConversations = [] } = useQuery<any[]>({
    queryKey: ["/api/dms/conversations"],
    refetchInterval: 5000,
    enabled: !!chatClassId && tab === "dms",
  });

  const { data: dmMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/dms", activeDMUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/dms/${activeDMUser!.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!activeDMUser,
  });

  const { data: dmUnread } = useQuery<{ count: number }>({
    queryKey: ["/api/dms/unread"],
    refetchInterval: 10000,
    enabled: !!chatClassId,
  });

  // Online status for classmates
  const classmateIds = allClassmates.map((c: any) => c.id).join(",");
  const { data: onlineStatus = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/classroom/online", classmateIds],
    queryFn: async () => {
      if (!classmateIds) return {};
      const res = await fetch(`/api/classroom/online?ids=${classmateIds}`, { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 15000,
    enabled: !!classmateIds,
  });

  // Ping presence
  useEffect(() => {
    const ping = () => { fetch("/api/classroom/ping", { method: "POST", credentials: "include" }); };
    ping();
    const iv = setInterval(ping, 60000);
    return () => clearInterval(iv);
  }, []);

  // Auto scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { groupEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [groupMessages]);
  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages]);

  // Typing indicator
  const sendTyping = useCallback(() => {
    const chatId = activeGroupChat ? activeGroupChat.id : (activeDMUser ? undefined : chatClassId);
    if (!chatId) return;
    fetch("/api/classroom/typing", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId }) });
  }, [chatClassId, activeGroupChat, activeDMUser]);

  // ── Mutations ──────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/classroom/chat", data),
    onSuccess: () => {
      setMessage(""); setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["/api/classroom/chat", chatClassId] });
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => apiRequest("PUT", `/api/classroom/chat/${id}`, { content }),
    onSuccess: () => { setEditingId(null); qc.invalidateQueries({ queryKey: ["/api/classroom/chat", chatClassId] }); },
    onError: (e: any) => toast({ title: "Failed to edit", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/classroom/chat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/classroom/chat", chatClassId] }),
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) => apiRequest("POST", `/api/classroom/chat/${id}/pin`, { pin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/classroom/chat", chatClassId] });
      qc.invalidateQueries({ queryKey: ["/api/classroom/chat/pinned", chatClassId] });
      toast({ title: "Message pinned" });
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji, remove }: { id: string; emoji: string; remove?: boolean }) =>
      remove ? apiRequest("DELETE", `/api/classroom/chat/${id}/react`, { emoji }) : apiRequest("POST", `/api/classroom/chat/${id}/react`, { emoji }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["/api/classroom/chat/reactions", messageIds] }),
  });

  const groupReactMutation = useMutation({
    mutationFn: ({ chatId, msgId, emoji, remove }: { chatId: string; msgId: string; emoji: string; remove?: boolean }) =>
      remove ? apiRequest("DELETE", `/api/group-chats/${chatId}/messages/${msgId}/react`, { emoji }) : apiRequest("POST", `/api/group-chats/${chatId}/messages/${msgId}/react`, { emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/classroom/chat/reactions", groupMessageIds] }),
  });

  const sendGroupMutation = useMutation({
    mutationFn: (data: { content: string; replyToId?: string }) =>
      apiRequest("POST", `/api/group-chats/${activeGroupChat?.id}/messages`, data),
    onSuccess: () => {
      setGroupMessage(""); setGroupReplyTo(null);
      qc.invalidateQueries({ queryKey: ["/api/group-chats", activeGroupChat?.id, "messages"] });
      qc.invalidateQueries({ queryKey: ["/api/group-chats"] });
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; memberIds: string[] }) => apiRequest("POST", "/api/group-chats", data),
    onSuccess: (data: any) => {
      setShowCreateGroup(false); setNewGroupName(""); setSelectedMembers([]);
      qc.invalidateQueries({ queryKey: ["/api/group-chats"] });
      setActiveGroupChat(data);
    },
    onError: (e: any) => toast({ title: "Failed to create group", description: e.message, variant: "destructive" }),
  });

  const editGroupMsgMutation = useMutation({
    mutationFn: ({ msgId, content }: { msgId: string; content: string }) =>
      apiRequest("PUT", `/api/group-chats/${activeGroupChat?.id}/messages/${msgId}`, { content }),
    onSuccess: () => { setEditingGroupMsgId(null); qc.invalidateQueries({ queryKey: ["/api/group-chats", activeGroupChat?.id, "messages"] }); },
    onError: (e: any) => toast({ title: "Failed to edit", description: e.message, variant: "destructive" }),
  });

  const deleteGroupMsgMutation = useMutation({
    mutationFn: (msgId: string) => apiRequest("DELETE", `/api/group-chats/${activeGroupChat?.id}/messages/${msgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/group-chats", activeGroupChat?.id, "messages"] }),
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const sendDmMutation = useMutation({
    mutationFn: (data: { content: string; replyToId?: string }) => apiRequest("POST", `/api/dms/${activeDMUser!.id}`, data),
    onSuccess: () => {
      setDmMessage(""); setDmReplyTo(null);
      qc.invalidateQueries({ queryKey: ["/api/dms", activeDMUser?.id] });
      qc.invalidateQueries({ queryKey: ["/api/dms/conversations"] });
    },
    onError: (e: any) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const editDmMutation = useMutation({
    mutationFn: ({ msgId, content }: { msgId: string; content: string }) => apiRequest("PUT", `/api/dms/${activeDMUser!.id}/${msgId}`, { content }),
    onSuccess: () => { setEditingDmId(null); qc.invalidateQueries({ queryKey: ["/api/dms", activeDMUser?.id] }); },
    onError: (e: any) => toast({ title: "Failed to edit", description: e.message, variant: "destructive" }),
  });

  const deleteDmMutation = useMutation({
    mutationFn: (msgId: string) => apiRequest("DELETE", `/api/dms/${activeDMUser!.id}/${msgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/dms", activeDMUser?.id] }),
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  // ── Event handlers ──────────────────────────────────────────────
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate({ content: message.trim(), messageType: isAnnouncement && isTeacher ? "announcement" : "message", classId: chatClassId, replyToId: replyTo?.id });
  };

  const handleGroupSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupMessage.trim()) return;
    sendGroupMutation.mutate({ content: groupMessage.trim(), replyToId: groupReplyTo?.id });
  };

  const handleDmSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmMessage.trim()) return;
    sendDmMutation.mutate({ content: dmMessage.trim(), replyToId: dmReplyTo?.id });
  };

  const handleReact = (msgId: string, emoji: string) => {
    const existingReaction = (reactions as any[]).find(r => r.messageId === msgId && r.userId === user?.id && r.emoji === emoji);
    reactMutation.mutate({ id: msgId, emoji, remove: !!existingReaction });
    setShowEmojiFor(null);
  };

  const handleGroupReact = (msgId: string, emoji: string) => {
    const existingReaction = (groupReactions as any[]).find(r => r.messageId === msgId && r.userId === user?.id && r.emoji === emoji);
    groupReactMutation.mutate({ chatId: activeGroupChat?.id, msgId, emoji, remove: !!existingReaction });
    setShowEmojiFor(null);
  };

  // ── Theme helpers ──────────────────────────────────────────────
  const bg = isPrimary ? "bg-amber-50" : "bg-[#0b1120]";
  const border = isPrimary ? "border-amber-200" : "border-[#1e2d4a]";
  const headerBg = isPrimary ? "bg-amber-50 border-amber-200" : "bg-[#0d1526] border-[#1e2d4a]";
  const textPrimary = isPrimary ? "text-amber-900" : "text-white";
  const textMuted = isPrimary ? "text-amber-700" : "text-slate-400";
  const accentBg = isPrimary ? "bg-amber-500" : "bg-teal-600";
  const accentText = isPrimary ? "text-amber-600" : "text-teal-400";
  const myBubble = isPrimary ? "bg-amber-500 text-white" : "bg-teal-600 text-white";
  const theirBubble = isPrimary ? "bg-white border border-amber-200 text-amber-900" : "bg-white/10 text-white";
  const inputBg = isPrimary
    ? "bg-white border-amber-300 text-amber-900 placeholder-amber-400 focus:border-amber-500"
    : "bg-white/8 border-white/10 text-white placeholder-slate-500 focus:border-teal-500/50";
  const tabActive = isPrimary ? "bg-amber-500 text-white" : "bg-teal-600 text-white";
  const tabInactive = isPrimary ? "text-amber-700 hover:bg-amber-100" : "text-slate-400 hover:bg-white/5";

  // ── Render helpers ──────────────────────────────────────────────
  function renderMessageBubble(msg: any, {
    isMe, isTeacherMsg, editingThisId, editThisContent, onSaveEdit, onCancelEdit, onChangeEdit,
    allReactions, onReact, replyMessages, isGroup
  }: {
    isMe: boolean; isTeacherMsg: boolean;
    editingThisId: string | null; editThisContent: string;
    onSaveEdit: () => void; onCancelEdit: () => void; onChangeEdit: (v: string) => void;
    allReactions: any[]; onReact: (msgId: string, emoji: string) => void;
    replyMessages: any[]; isGroup?: boolean;
  }) {
    const msgReactions = allReactions.filter(r => r.messageId === msg.id);
    const isEditing = editingThisId === msg.id;
    const isMenuOpen = openMenuId === msg.id;
    const isEmojiOpen = showEmojiFor === msg.id;

    return (
      <div className={`relative flex gap-2 ${isMe ? "flex-row-reverse" : ""}`} onClick={() => { if (isMenuOpen) setOpenMenuId(null); }}>
        <Avatar name={msg.senderName} role={isTeacherMsg ? "teacher" : "student"} />
        <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && (
            <span className={`text-xs font-semibold ${isTeacherMsg ? accentText : textMuted}`}>
              {msg.senderName}{isTeacherMsg ? " 👨‍🏫" : ""}
            </span>
          )}
          {isEditing ? (
            <div className="flex gap-1.5 items-center">
              <input
                value={editThisContent} onChange={e => onChangeEdit(e.target.value)} autoFocus
                className={`rounded-xl px-3 py-2 text-sm border outline-none ${inputBg}`}
                onKeyDown={e => { if (e.key === "Escape") onCancelEdit(); if (e.key === "Enter") onSaveEdit(); }}
              />
              <button onClick={onSaveEdit} className="text-emerald-400 hover:text-emerald-300"><Check className="h-4 w-4" /></button>
              <button onClick={onCancelEdit} className={textMuted}><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="relative group">
              {/* Hover actions row */}
              <div className={`absolute ${isMe ? "right-full pr-2" : "left-full pl-2"} top-1 hidden group-hover:flex items-center gap-1 z-10`}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEmojiFor(isEmojiOpen ? null : msg.id); setOpenMenuId(null); }}
                  className={`p-1.5 rounded-lg text-xs transition-all ${isPrimary ? "bg-white border border-amber-200 text-amber-600 hover:bg-amber-50" : "bg-[#0d1526] border border-white/20 text-slate-400 hover:text-white"}`}
                  title="React"
                >
                  😊
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : msg.id); setShowEmojiFor(null); }}
                  className={`p-1.5 rounded-lg transition-all ${isPrimary ? "bg-white border border-amber-200 text-amber-600 hover:bg-amber-50" : "bg-[#0d1526] border border-white/20 text-slate-400 hover:text-white"}`}
                  title="More options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Emoji picker */}
              {isEmojiOpen && (
                <div className={`absolute ${isMe ? "right-0" : "left-0"} bottom-full mb-2 z-50`}>
                  <EmojiPicker onSelect={e => onReact(msg.id, e)} onClose={() => setShowEmojiFor(null)} isPrimary={isPrimary} />
                </div>
              )}

              {/* Context menu */}
              {isMenuOpen && (
                <MessageMenu
                  isMe={isMe} isTeacher={isTeacher} isTeacherMsg={isTeacherMsg}
                  isPinned={msg.isPinned}
                  onEdit={() => {
                    setEditingId(isGroup ? null : msg.id);
                    if (isGroup) setEditingGroupMsgId(msg.id);
                    if (isGroup) setEditGroupContent(msg.content);
                    else setEditContent(msg.content);
                    setOpenMenuId(null);
                  }}
                  onDelete={() => {
                    if (isGroup) deleteGroupMsgMutation.mutate(msg.id);
                    else deleteMutation.mutate(msg.id);
                    setOpenMenuId(null);
                  }}
                  onReply={() => {
                    if (isGroup) setGroupReplyTo(msg);
                    else setReplyTo(msg);
                    setOpenMenuId(null);
                    inputRef.current?.focus();
                  }}
                  onPin={() => { pinMutation.mutate({ id: msg.id, pin: true }); setOpenMenuId(null); }}
                  onUnpin={() => { pinMutation.mutate({ id: msg.id, pin: false }); setOpenMenuId(null); }}
                  onClose={() => setOpenMenuId(null)}
                  isPrimary={isPrimary} textMuted={textMuted}
                />
              )}

              {/* Bubble */}
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isMe ? `${myBubble} rounded-tr-sm` : `${theirBubble} rounded-tl-sm`} ${msg.isDeleted ? "opacity-50 italic" : ""}`}>
                {msg.replyToId && <QuotedMessage msgId={msg.replyToId} messages={replyMessages} />}
                {msg.isPinned && !isGroup && (
                  <div className={`flex items-center gap-1 text-xs mb-1 ${isMe ? "text-white/60" : accentText}`}>
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </div>
                )}
                <span>{msg.content}</span>
                {msg.editedAt && !msg.isDeleted && (
                  <span className={`text-xs ml-1.5 opacity-60`}>(edited)</span>
                )}
              </div>

              {/* Reactions */}
              <ReactionBar
                messageId={msg.id}
                reactions={msgReactions}
                userId={user?.id ?? ""}
                isPrimary={isPrimary}
                onReact={onReact}
              />
            </div>
          )}
          <span className={`text-xs ${textMuted}`}>{formatTime(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  // ── Pinned banner ──────────────────────────────────────────────
  const PinnedBanner = () => {
    if (!(pinnedMessages as any[]).length) return null;
    const latest = (pinnedMessages as any[])[0];
    return (
      <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs ${isPrimary ? "bg-amber-100 border-amber-200" : "bg-teal-500/10 border-teal-500/20"}`}>
        <Pin className={`h-3.5 w-3.5 flex-shrink-0 ${accentText}`} />
        <span className={`font-bold ${accentText}`}>Pinned:</span>
        <span className={`flex-1 truncate ${isPrimary ? "text-amber-800" : "text-slate-300"}`}>{latest.content}</span>
        {(pinnedMessages as any[]).length > 1 && (
          <span className={`${textMuted} flex-shrink-0`}>+{(pinnedMessages as any[]).length - 1} more</span>
        )}
      </div>
    );
  };

  // ── New DM helper ──────────────────────────────────────────────
  function startDM(person: any) {
    setActiveDMUser({ id: person.id ?? person.partnerId, name: person.displayName ?? person.partnerName, role: person.role ?? person.partnerRole ?? "student" });
    setTab("dms");
  }

  // ── Main render ────────────────────────────────────────────────
  return (
    <SchoolLayout>
      <div className={`flex flex-col h-full ${bg}`} onClick={() => { setOpenMenuId(null); setShowEmojiFor(null); }}>

        {/* Header */}
        <div className={`px-5 py-3 border-b flex items-center gap-3 ${headerBg}`}>
          {activeGroupChat ? (
            <>
              <button onClick={() => { setActiveGroupChat(null); setTab("groups"); }} className={`${textMuted} hover:${textPrimary}`} data-testid="button-back-to-groups">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accentBg}`}><Hash className="h-4 w-4 text-white" /></div>
              <div className="flex-1 min-w-0">
                <h1 className={`font-black text-sm truncate ${textPrimary}`}>{activeGroupChat.name}</h1>
                <p className={`text-xs ${textMuted}`}>{activeGroupChat.memberCount} members</p>
              </div>
            </>
          ) : activeDMUser ? (
            <>
              <button onClick={() => setActiveDMUser(null)} className={`${textMuted} hover:${textPrimary}`} data-testid="button-back-to-dms">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Avatar name={activeDMUser.name} role={activeDMUser.role} size="md" online={onlineStatus[activeDMUser.id]} />
              <div className="flex-1 min-w-0">
                <h1 className={`font-black text-sm truncate ${textPrimary}`}>{activeDMUser.name}</h1>
                <p className={`text-xs ${onlineStatus[activeDMUser.id] ? "text-emerald-400" : textMuted}`}>
                  {onlineStatus[activeDMUser.id] ? "● Online" : "Offline"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accentBg}`}><MessageCircle className="h-4 w-4 text-white" /></div>
              <div className="flex-1 min-w-0">
                <h1 className={`font-black text-sm ${textPrimary}`}>{isPrimary ? "💬 Class Chat" : "Class Chat"}</h1>
                <p className={`text-xs ${textMuted}`}>{currentClassName}</p>
              </div>
              {isTeacher && (teacherClasses as any[]).length > 1 && (
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} data-testid="select-chat-class"
                  className={`text-xs rounded-lg px-2 py-1 border ${isPrimary ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-[#1e3050] border-[#2a4070] text-white"}`}>
                  {(teacherClasses as any[]).map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                </select>
              )}
              <div className={`flex items-center gap-1 text-xs ${textMuted}`}><Users className="h-3.5 w-3.5" /><span>{classmates.length + 1}</span></div>
            </>
          )}
        </div>

        {/* Tabs */}
        {hasClass && !activeGroupChat && !activeDMUser && (
          <div className={`flex px-4 pt-3 gap-1.5 border-b pb-3 ${border}`}>
            {(["class", "groups", "dms"] as MainTab[]).map(t => {
              const labels: Record<MainTab, any> = {
                class: <><MessageCircle className="h-3.5 w-3.5" />Class Chat</>,
                groups: <><Hash className="h-3.5 w-3.5" />Groups</>,
                dms: (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />DMs
                    {(dmUnread?.count ?? 0) > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-px min-w-[18px] text-center">{dmUnread!.count}</span>
                    )}
                  </span>
                ),
              };
              return (
                <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${tab === t ? tabActive : tabInactive}`}>
                  {labels[t]}
                </button>
              );
            })}
          </div>
        )}

        {!hasClass ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <MessageCircle className={`h-16 w-16 opacity-20 ${isPrimary ? "text-amber-500" : "text-teal-500"}`} />
            <div className="text-center">
              <p className={`font-bold text-lg ${textPrimary}`}>No Classroom Yet</p>
              <p className={`text-sm mt-1 ${textMuted}`}>{isTeacher ? "Create a class to start chatting." : "Join a class to access the chat."}</p>
            </div>
          </div>

        ) : activeGroupChat ? (
          /* === GROUP CHAT THREAD === */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(groupMessages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                  <Hash className={`h-12 w-12 opacity-20 ${accentText}`} />
                  <p className={`text-sm font-semibold ${textMuted}`}>No messages yet. Be the first!</p>
                </div>
              ) : (
                (() => {
                  let lastDate = "";
                  return (groupMessages as any[]).map((msg: any) => {
                    const isMe = msg.senderId === user?.id;
                    const isTeacherMsg = msg.senderRole === "teacher" || msg.senderRole === "admin";
                    const msgDate = formatDate(msg.createdAt);
                    const showDate = msgDate !== lastDate;
                    lastDate = msgDate;
                    return (
                      <div key={msg.id} data-testid={`group-msg-${msg.id}`}>
                        {showDate && <div className="text-center my-2"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPrimary ? "bg-amber-100 text-amber-600" : "bg-white/10 text-slate-400"}`}>{msgDate}</span></div>}
                        {editingGroupMsgId === msg.id ? (
                          <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar name={msg.senderName} role={isTeacherMsg ? "teacher" : "student"} />
                            <div className="flex gap-1.5 items-center">
                              <input value={editGroupContent} onChange={e => setEditGroupContent(e.target.value)} autoFocus
                                className={`rounded-xl px-3 py-2 text-sm border outline-none ${inputBg}`}
                                onKeyDown={e => { if (e.key === "Escape") setEditingGroupMsgId(null); if (e.key === "Enter") editGroupMsgMutation.mutate({ msgId: msg.id, content: editGroupContent }); }} />
                              <button onClick={() => editGroupMsgMutation.mutate({ msgId: msg.id, content: editGroupContent })} className="text-emerald-400"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingGroupMsgId(null)} className={textMuted}><X className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ) : renderMessageBubble(msg, {
                          isMe, isTeacherMsg,
                          editingThisId: editingGroupMsgId,
                          editThisContent: editGroupContent,
                          onSaveEdit: () => editGroupMsgMutation.mutate({ msgId: msg.id, content: editGroupContent }),
                          onCancelEdit: () => setEditingGroupMsgId(null),
                          onChangeEdit: setEditGroupContent,
                          allReactions: groupReactions as any[],
                          onReact: handleGroupReact,
                          replyMessages: groupMessages as any[],
                          isGroup: true,
                        })}
                      </div>
                    );
                  });
                })()
              )}
              <div ref={groupEndRef} />
            </div>
            <div className={`p-4 border-t ${headerBg}`}>
              {groupReplyTo && <QuotePreview msg={groupReplyTo} onClear={() => setGroupReplyTo(null)} isPrimary={isPrimary} textMuted={textMuted} accentText={accentText} />}
              <form onSubmit={handleGroupSend} className="flex gap-2">
                <input ref={inputRef} value={groupMessage} onChange={e => { setGroupMessage(e.target.value); sendTyping(); }}
                  placeholder="Message group..." data-testid="input-group-message" maxLength={500}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none transition-colors ${inputBg}`} />
                <button type="submit" disabled={!groupMessage.trim() || sendGroupMutation.isPending} data-testid="button-send-group"
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isPrimary ? "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40" : "bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"}`}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>

        ) : activeDMUser ? (
          /* === DM THREAD === */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(dmMessages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                  <Mail className={`h-12 w-12 opacity-20 ${accentText}`} />
                  <p className={`text-sm font-semibold ${textMuted}`}>Start your conversation with {activeDMUser.name}!</p>
                </div>
              ) : (
                (() => {
                  let lastDate = "";
                  return (dmMessages as any[]).map((msg: any) => {
                    const isMe = msg.senderId === user?.id;
                    const msgDate = formatDate(msg.createdAt);
                    const showDate = msgDate !== lastDate;
                    lastDate = msgDate;
                    return (
                      <div key={msg.id} data-testid={`dm-msg-${msg.id}`}>
                        {showDate && <div className="text-center my-2"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPrimary ? "bg-amber-100 text-amber-600" : "bg-white/10 text-slate-400"}`}>{msgDate}</span></div>}
                        {editingDmId === msg.id ? (
                          <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar name={msg.senderName} />
                            <div className="flex gap-1.5 items-center">
                              <input value={editDmContent} onChange={e => setEditDmContent(e.target.value)} autoFocus
                                className={`rounded-xl px-3 py-2 text-sm border outline-none ${inputBg}`}
                                onKeyDown={e => { if (e.key === "Escape") setEditingDmId(null); if (e.key === "Enter") editDmMutation.mutate({ msgId: msg.id, content: editDmContent }); }} />
                              <button onClick={() => editDmMutation.mutate({ msgId: msg.id, content: editDmContent })} className="text-emerald-400"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingDmId(null)} className={textMuted}><X className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ) : (
                          <div className={`relative flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar name={msg.senderName} online={!isMe ? onlineStatus[activeDMUser.id] : undefined} />
                            <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                              {!isMe && <span className={`text-xs font-semibold ${textMuted}`}>{msg.senderName}</span>}
                              <div className="relative group">
                                <div className={`absolute ${isMe ? "right-full pr-2" : "left-full pl-2"} top-1 hidden group-hover:flex items-center gap-1 z-10`}>
                                  <button onClick={(e) => { e.stopPropagation(); setDmReplyTo(msg); inputRef.current?.focus(); }}
                                    className={`p-1.5 rounded-lg transition-all ${isPrimary ? "bg-white border border-amber-200 text-amber-600 hover:bg-amber-50" : "bg-[#0d1526] border border-white/20 text-slate-400 hover:text-white"}`} title="Reply">
                                    <Reply className="h-3.5 w-3.5" />
                                  </button>
                                  {isMe && !msg.isDeleted && <>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingDmId(msg.id); setEditDmContent(msg.content); }}
                                      className={`p-1.5 rounded-lg transition-all ${isPrimary ? "bg-white border border-amber-200 text-amber-600 hover:bg-amber-50" : "bg-[#0d1526] border border-white/20 text-slate-400 hover:text-white"}`}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteDmMutation.mutate(msg.id); }}
                                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>}
                                </div>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isMe ? `${myBubble} rounded-tr-sm` : `${theirBubble} rounded-tl-sm`} ${msg.isDeleted ? "opacity-50 italic" : ""}`}>
                                  {msg.replyToId && <QuotedMessage msgId={msg.replyToId} messages={dmMessages as any[]} />}
                                  {msg.content}
                                  {msg.editedAt && !msg.isDeleted && <span className="text-xs ml-1.5 opacity-60">(edited)</span>}
                                </div>
                              </div>
                              <span className={`text-xs ${textMuted}`}>{formatTime(msg.createdAt)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
              <div ref={dmEndRef} />
            </div>
            <div className={`p-4 border-t ${headerBg}`}>
              {dmReplyTo && <QuotePreview msg={dmReplyTo} onClear={() => setDmReplyTo(null)} isPrimary={isPrimary} textMuted={textMuted} accentText={accentText} />}
              <form onSubmit={handleDmSend} className="flex gap-2">
                <input ref={inputRef} value={dmMessage} onChange={e => setDmMessage(e.target.value)}
                  placeholder={`Message ${activeDMUser.name}...`} data-testid="input-dm-message" maxLength={500}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none transition-colors ${inputBg}`} />
                <button type="submit" disabled={!dmMessage.trim() || sendDmMutation.isPending} data-testid="button-send-dm"
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isPrimary ? "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40" : "bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"}`}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>

        ) : tab === "class" ? (
          /* === CLASS CHAT === */
          <>
            <PinnedBanner />
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className={`h-14 rounded-2xl animate-pulse ${isPrimary ? "bg-amber-100" : "bg-white/5"}`} />)}</div>
              ) : (messages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                  <MessageCircle className={`h-12 w-12 opacity-20 ${isPrimary ? "text-amber-500" : "text-teal-500"}`} />
                  <p className={`text-sm font-semibold ${textMuted}`}>{isPrimary ? "Be the first to say hello! 👋" : "No messages yet. Start the conversation!"}</p>
                </div>
              ) : (
                (() => {
                  let lastDate = "";
                  return (messages as any[]).map((msg: any) => {
                    const isMe = msg.senderId === user?.id;
                    const isAnn = msg.messageType === "announcement";
                    const isTeacherMsg = msg.senderRole === "teacher" || msg.senderRole === "admin";
                    const msgDate = formatDate(msg.createdAt);
                    const showDate = msgDate !== lastDate;
                    lastDate = msgDate;

                    if (isAnn) {
                      return (
                        <div key={msg.id}>
                          {showDate && <div className="text-center my-2"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPrimary ? "bg-amber-100 text-amber-600" : "bg-white/10 text-slate-400"}`}>{msgDate}</span></div>}
                          <div data-testid={`chat-announcement-${msg.id}`} className={`p-4 rounded-2xl border-l-4 ${isPrimary ? "bg-amber-100 border-amber-500" : "bg-teal-500/10 border-teal-500"}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Pin className={`h-3.5 w-3.5 ${accentText}`} />
                              <span className={`text-xs font-black uppercase tracking-wide ${accentText}`}>Announcement</span>
                              <span className={`text-xs ml-auto ${textMuted}`}>{msg.senderName}</span>
                            </div>
                            <p className={`text-sm font-semibold ${textPrimary}`}>{msg.content}</p>
                            <p className={`text-xs mt-1 ${textMuted}`}>{formatTime(msg.createdAt)}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} data-testid={`chat-message-${msg.id}`}>
                        {showDate && <div className="text-center my-2"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPrimary ? "bg-amber-100 text-amber-600" : "bg-white/10 text-slate-400"}`}>{msgDate}</span></div>}
                        {editingId === msg.id ? (
                          <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar name={msg.senderName} role={isTeacherMsg ? "teacher" : "student"} />
                            <div className="flex gap-1.5 items-center">
                              <input value={editContent} onChange={e => setEditContent(e.target.value)} autoFocus
                                className={`rounded-xl px-3 py-2 text-sm border outline-none ${inputBg}`}
                                onKeyDown={e => { if (e.key === "Escape") setEditingId(null); if (e.key === "Enter") editMutation.mutate({ id: msg.id, content: editContent }); }} />
                              <button onClick={() => editMutation.mutate({ id: msg.id, content: editContent })} className="text-emerald-400"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className={textMuted}><X className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ) : renderMessageBubble(msg, {
                          isMe, isTeacherMsg,
                          editingThisId: editingId,
                          editThisContent: editContent,
                          onSaveEdit: () => editMutation.mutate({ id: msg.id, content: editContent }),
                          onCancelEdit: () => setEditingId(null),
                          onChangeEdit: setEditContent,
                          allReactions: reactions as any[],
                          onReact: handleReact,
                          replyMessages: messages as any[],
                        })}
                      </div>
                    );
                  });
                })()
              )}
              {/* Typing indicator */}
              {(typingUsers as string[]).length > 0 && (
                <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                  <div className="flex gap-0.5">{[0,1,2].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${accentBg} animate-bounce`} style={{ animationDelay: `${i * 150}ms` }} />)}</div>
                  <span>{(typingUsers as string[]).join(", ")} {(typingUsers as string[]).length === 1 ? "is" : "are"} typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={`p-4 border-t ${headerBg}`}>
              {replyTo && <QuotePreview msg={replyTo} onClear={() => setReplyTo(null)} isPrimary={isPrimary} textMuted={textMuted} accentText={accentText} />}
              {isTeacher && (
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setIsAnnouncement(!isAnnouncement)} data-testid="toggle-announcement"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAnnouncement ? (isPrimary ? "bg-amber-500 text-white" : "bg-teal-600 text-white") : (isPrimary ? "bg-amber-200 text-amber-700 hover:bg-amber-300" : "bg-white/10 text-slate-400 hover:bg-white/15")}`}>
                    <Megaphone className="h-3.5 w-3.5" />{isAnnouncement ? "Announcement ON" : "Post as Announcement"}
                  </button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-2">
                <input ref={inputRef} value={message} onChange={e => { setMessage(e.target.value); sendTyping(); }}
                  placeholder={isPrimary ? "Type your message here... 😊" : "Message your class..."}
                  data-testid="input-chat-message" maxLength={500}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none transition-colors ${inputBg}`} />
                <button type="submit" disabled={!message.trim() || sendMutation.isPending} data-testid="button-send-chat"
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 ${isPrimary ? "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40" : "bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"}`}>
                  <Send className="h-4 w-4" />{!isPrimary && "Send"}
                </button>
              </form>
            </div>
          </>

        ) : tab === "groups" ? (
          /* === GROUP CHATS LIST === */
          showCreateGroup ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowCreateGroup(false)} className={`${textMuted} hover:${textPrimary}`} data-testid="button-cancel-create-group"><ChevronLeft className="h-5 w-5" /></button>
                <h2 className={`font-black text-base ${textPrimary}`}>New Group Chat</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-bold ${textMuted} uppercase tracking-wide`}>Group Name</label>
                  <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Study Squad..." data-testid="input-group-name"
                    className={`mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm border outline-none ${inputBg}`} />
                </div>
                {!isTeacher && allClassmates.length > 0 && (
                  <div>
                    <label className={`text-xs font-bold ${textMuted} uppercase tracking-wide`}>Add Classmates</label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {allClassmates.map((cm: any) => (
                        <button key={cm.id} onClick={() => setSelectedMembers(prev => prev.includes(cm.id) ? prev.filter(id => id !== cm.id) : [...prev, cm.id])}
                          data-testid={`member-option-${cm.id}`}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${selectedMembers.includes(cm.id) ? (isPrimary ? "bg-amber-100 border border-amber-400" : "bg-teal-500/20 border border-teal-500/40") : (isPrimary ? "bg-white border border-amber-200 hover:bg-amber-50" : "bg-white/5 border border-white/10 hover:bg-white/8")}`}>
                          <Avatar name={cm.displayName} online={onlineStatus[cm.id]} />
                          <span className={`font-semibold flex-1 text-left ${textPrimary}`}>{cm.displayName}</span>
                          {selectedMembers.includes(cm.id) && <Check className="h-4 w-4 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => createGroupMutation.mutate({ name: newGroupName, memberIds: selectedMembers })}
                  disabled={!newGroupName.trim() || createGroupMutation.isPending} data-testid="button-create-group"
                  className={`w-full py-3 rounded-xl font-black text-sm transition-all ${isPrimary ? "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40" : "bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"}`}>
                  {createGroupMutation.isPending ? "Creating..." : "Create Group Chat"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 flex items-center justify-between">
                <p className={`text-xs font-bold uppercase tracking-wide ${textMuted}`}>Groups ({(groupChats as any[]).length})</p>
                <button onClick={() => setShowCreateGroup(true)} data-testid="button-new-group"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPrimary ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-teal-600 text-white hover:bg-teal-500"}`}>
                  <Plus className="h-3.5 w-3.5" /> New Group
                </button>
              </div>
              {(groupChats as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 px-8">
                  <Hash className={`h-14 w-14 opacity-20 ${isPrimary ? "text-amber-500" : "text-teal-500"}`} />
                  <div className="text-center">
                    <p className={`font-bold ${textPrimary}`}>No Group Chats Yet</p>
                    <p className={`text-sm mt-1 ${textMuted}`}>Create a private group with classmates!</p>
                  </div>
                  <button onClick={() => setShowCreateGroup(true)} data-testid="button-create-first-group"
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isPrimary ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-teal-600 text-white hover:bg-teal-500"}`}>
                    <Plus className="h-4 w-4" /> Create Group
                  </button>
                </div>
              ) : (
                <div className="px-4 space-y-2 pb-4">
                  {(groupChats as any[]).map((gc: any) => (
                    <button key={gc.id} onClick={() => setActiveGroupChat(gc)} data-testid={`group-chat-${gc.id}`}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${isPrimary ? "bg-white border-amber-200 hover:bg-amber-50" : "bg-white/5 border-white/10 hover:bg-white/8"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${accentBg} text-white flex-shrink-0`}>{gc.name.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${textPrimary}`}>{gc.name}</p>
                        <p className={`text-xs truncate mt-0.5 ${textMuted}`}>{gc.lastMessage ?? `${gc.memberCount} members`}</p>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${textMuted}`}><Users className="h-3 w-3" /><span>{gc.memberCount}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )

        ) : (
          /* === DMs LIST === */
          activeDMUser ? null : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${textMuted}`}>Direct Messages</p>

                {/* Classmates you can DM */}
                {allClassmates.length > 0 && (
                  <div className="mb-5">
                    <p className={`text-xs font-semibold mb-2 ${textMuted}`}>Classmates</p>
                    <div className="space-y-1.5">
                      {allClassmates.map((cm: any) => {
                        const convo = (dmConversations as any[]).find(c => c.partnerId === cm.id);
                        return (
                          <button key={cm.id} onClick={() => startDM(cm)} data-testid={`dm-classmate-${cm.id}`}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isPrimary ? "hover:bg-amber-100" : "hover:bg-white/8"}`}>
                            <Avatar name={cm.displayName} online={onlineStatus[cm.id]} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${textPrimary}`}>{cm.displayName}</p>
                              {convo ? (
                                <p className={`text-xs truncate ${textMuted}`}>{convo.lastMessage}</p>
                              ) : (
                                <p className={`text-xs ${textMuted}`}>Start a conversation</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {convo?.unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-px">{convo.unreadCount}</span>
                              )}
                              {onlineStatus[cm.id] ? (
                                <span className="text-emerald-400 text-xs font-semibold">Online</span>
                              ) : (
                                <span className={`text-xs ${textMuted}`}>Offline</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent conversations */}
                {(dmConversations as any[]).length > 0 && (
                  <div>
                    <p className={`text-xs font-semibold mb-2 ${textMuted}`}>Recent</p>
                    <div className="space-y-1.5">
                      {(dmConversations as any[]).map((c: any) => (
                        <button key={c.partnerId} onClick={() => startDM({ id: c.partnerId, displayName: c.partnerName, role: c.partnerRole })}
                          data-testid={`dm-convo-${c.partnerId}`}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isPrimary ? "hover:bg-amber-100" : "hover:bg-white/8"}`}>
                          <Avatar name={c.partnerName} role={c.partnerRole} size="md" online={onlineStatus[c.partnerId]} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${textPrimary}`}>{c.partnerName}</p>
                            <p className={`text-xs truncate ${textMuted}`}>{c.lastMessage}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {c.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-px">{c.unreadCount}</span>
                            )}
                            <span className={`text-xs ${textMuted}`}>{formatTime(c.lastAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {allClassmates.length === 0 && (dmConversations as any[]).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Mail className={`h-14 w-14 opacity-20 ${accentText}`} />
                    <div className="text-center">
                      <p className={`font-bold ${textPrimary}`}>No Messages Yet</p>
                      <p className={`text-sm mt-1 ${textMuted}`}>You'll see classmates here once you join a class.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </SchoolLayout>
  );
}
