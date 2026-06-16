import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Pencil, Trash2, CornerUpLeft, X, Check, Users, MessageSquare, Plus } from "lucide-react";
import type { User, ChatMessage } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface FriendChatProps {
  friend: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = "dm" | "groups";

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
      <span className="font-medium">{name}</span> is typing
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
    </div>
  );
}

function MessageBubble({
  msg, isMine, senderName, onEdit, onDelete, onReply,
}: {
  msg: any; isMine: boolean; senderName: string;
  onEdit: (msg: any) => void; onDelete: (msg: any) => void; onReply: (msg: any) => void;
}) {
  const [hover, setHover] = useState(false);
  const isDeleted = !!msg.deletedAt;

  return (
    <div className={`group flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs shrink-0 mt-auto">
          {senderName[0]?.toUpperCase()}
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
        {msg.replyToId && (
          <div className={`text-[10px] text-muted-foreground px-2 py-1 rounded-md bg-muted/40 border-l-2 border-muted-foreground/30 mb-0.5 ${isMine ? "text-right" : ""}`}>
            ↩ Replying to a message
          </div>
        )}
        <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"} ${isDeleted ? "opacity-50 italic" : ""}`}>
          {msg.content}
          {msg.editedAt && !isDeleted && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), "h:mm a")}</span>
          {hover && isMine && !isDeleted && (
            <div className="flex gap-1 animate-in fade-in">
              <button onClick={() => onReply(msg)} className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors" title="Reply"><CornerUpLeft className="w-3 h-3" /></button>
              <button onClick={() => onEdit(msg)} className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors" title="Edit"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => onDelete(msg)} className="text-muted-foreground hover:text-red-400 p-0.5 rounded transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
            </div>
          )}
          {hover && !isMine && !isDeleted && (
            <button onClick={() => onReply(msg)} className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors animate-in fade-in" title="Reply"><CornerUpLeft className="w-3 h-3" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FriendChat({ friend, open, onOpenChange }: FriendChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [view, setView] = useState<View>("dm");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [groupMsg, setGroupMsg] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", friend?.id],
    enabled: !!friend?.id && open && view === "dm",
  });

  const { data: groupChats = [] } = useQuery<any[]>({
    queryKey: ["/api/group-chats"],
    enabled: open && view === "groups",
  });

  const { data: groupMsgsData = [] } = useQuery<any[]>({
    queryKey: ["/api/group-chats", activeGroupId, "messages"],
    queryFn: () => fetch(`/api/group-chats/${activeGroupId}/messages`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeGroupId,
    refetchInterval: 3000,
  });

  const allMessages = [...messages, ...realtimeMessages.filter(rm => !messages.some(m => m.id === rm.id))]
    .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  // WebSocket
  useEffect(() => {
    if (!open || !user?.id) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    socket.onopen = () => { socket.send(JSON.stringify({ type: "auth", userId: user.id })); setIsConnected(true); };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message") {
        setRealtimeMessages(prev => [...prev, data.message]);
        queryClient.invalidateQueries({ queryKey: ["/api/chat/unread/count"] });
      } else if (data.type === "message_edited") {
        setRealtimeMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
        queryClient.invalidateQueries({ queryKey: ["/api/chat", friend?.id] });
      } else if (data.type === "message_deleted") {
        setRealtimeMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, deletedAt: new Date().toISOString(), content: "This message was deleted." } : m));
      } else if (data.type === "typing") {
        setTypingUsers(prev => { const s = new Set(prev); if (data.isTyping) s.add(data.senderId); else s.delete(data.senderId); return s; });
      } else if (data.type === "new_group_message") {
        if (data.groupId === activeGroupId) setGroupMessages(prev => [...prev, data.message]);
        queryClient.invalidateQueries({ queryKey: ["/api/group-chats", data.groupId, "messages"] });
      }
    };
    socket.onclose = () => setIsConnected(false);
    setWs(socket);
    return () => { socket.close(); setWs(null); setIsConnected(false); };
  }, [open, user?.id]);

  useEffect(() => { if (activeGroupId) setGroupMessages(groupMsgsData); }, [groupMsgsData, activeGroupId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [allMessages.length, groupMessages.length]);

  // Mutations
  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => apiRequest("PUT", `/api/chat/${id}`, { content }),
    onSuccess: () => { setEditingMsg(null); queryClient.invalidateQueries({ queryKey: ["/api/chat", friend?.id] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat", friend?.id] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/group-chats", { name, emoji: "💬" }),
    onSuccess: () => { setShowCreateGroup(false); setNewGroupName(""); queryClient.invalidateQueries({ queryKey: ["/api/group-chats"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function sendTyping(isTyping: boolean) {
    if (!ws || !friend?.id) return;
    ws.send(JSON.stringify({ type: "typing", receiverId: friend.id, isTyping }));
  }

  function handleSend() {
    if (!message.trim() || !ws || !friend?.id) return;
    if (editingMsg) {
      editMutation.mutate({ id: editingMsg.id, content: message.trim() });
      setMessage(""); return;
    }
    ws.send(JSON.stringify({ type: "chat", receiverId: friend.id, content: message.trim(), replyToId: replyingTo?.id ?? null }));
    setMessage(""); setReplyingTo(null); sendTyping(false);
  }

  function handleGroupSend() {
    if (!groupMsg.trim() || !ws || !activeGroupId) return;
    ws.send(JSON.stringify({ type: "group_message", groupId: activeGroupId, content: groupMsg.trim() }));
    setGroupMsg("");
  }

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value);
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  }

  const activeGroup = groupChats.find((g: any) => g.id === activeGroupId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[460px] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-card/50">
          <div className="flex gap-1 bg-muted/60 p-0.5 rounded-lg">
            <button onClick={() => setView("dm")} className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${view === "dm" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />DM
            </button>
            <button onClick={() => setView("groups")} className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${view === "groups" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <Users className="w-3.5 h-3.5 inline mr-1" />Groups
            </button>
          </div>
          {view === "dm" && friend && (
            <div className="flex items-center gap-2 ml-1">
              <Avatar className="w-7 h-7"><AvatarImage src={friend.avatarUrl ?? ""} /><AvatarFallback className="text-xs">{friend.displayName?.[0]}</AvatarFallback></Avatar>
              <span className="font-medium text-sm">{friend.displayName}</span>
              {isConnected && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            </div>
          )}
          {view === "groups" && activeGroupId && (
            <div className="flex items-center gap-2 ml-1">
              <button onClick={() => setActiveGroupId(null)} className="text-muted-foreground hover:text-foreground p-1 rounded"><X className="w-3.5 h-3.5" /></button>
              <span className="font-medium text-sm">{activeGroup?.name ?? "Group"}</span>
            </div>
          )}
        </div>

        {/* DM View */}
        {view === "dm" && (
          <>
            <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef as any}>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : allMessages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-10">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Start a conversation with {friend?.displayName}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {allMessages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === user?.id}
                      senderName={msg.senderId === user?.id ? user?.displayName ?? "You" : friend?.displayName ?? "Friend"}
                      onEdit={m => { setEditingMsg(m); setMessage(m.content); }}
                      onDelete={m => deleteMutation.mutate(m.id)}
                      onReply={m => setReplyingTo(m)} />
                  ))}
                </div>
              )}
            </ScrollArea>
            {typingUsers.size > 0 && <TypingIndicator name={friend?.displayName ?? "Friend"} />}
            {(replyingTo || editingMsg) && (
              <div className="mx-3 mb-1 px-3 py-1.5 bg-muted/60 rounded-lg flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{editingMsg ? "Editing:" : "Replying to:"}</span>
                <span className="flex-1 truncate text-foreground">{(editingMsg ?? replyingTo)?.content}</span>
                <button onClick={() => { setEditingMsg(null); setReplyingTo(null); setMessage(""); }}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
              </div>
            )}
            <div className="px-3 pb-4 flex gap-2">
              <Input value={message} onChange={handleTyping} placeholder={editingMsg ? "Edit message…" : "Message…"}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1 text-sm" />
              <Button size="sm" onClick={handleSend} disabled={!message.trim() || !isConnected} className="px-3">
                {editingMsg ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        )}

        {/* Groups View — List */}
        {view === "groups" && !activeGroupId && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Group Chats</h3>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCreateGroup(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />New Group
              </Button>
            </div>
            {showCreateGroup && (
              <div className="mx-4 mt-3 p-3 bg-muted/40 rounded-xl flex gap-2">
                <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name…" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && createGroupMutation.mutate(newGroupName)} />
                <Button size="sm" onClick={() => createGroupMutation.mutate(newGroupName)} disabled={!newGroupName.trim() || createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }}><X className="w-3.5 h-3.5" /></Button>
              </div>
            )}
            <ScrollArea className="flex-1 px-3 py-3">
              {groupChats.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-10">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No group chats yet.</p>
                  <p className="text-xs mt-1">Create one to chat with multiple friends.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {groupChats.map((g: any) => (
                    <button key={g.id} onClick={() => setActiveGroupId(g.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card hover:bg-muted/60 border border-transparent hover:border-border transition-all text-left">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">{g.avatarEmoji ?? "💬"}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.members?.length ?? 0} member{g.members?.length !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Groups View — Messages */}
        {view === "groups" && activeGroupId && (
          <>
            <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef as any}>
              {groupMessages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-10">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {groupMessages.map((msg: any) => (
                    <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === user?.id}
                      senderName={msg.senderId === user?.id ? user?.displayName ?? "You" : "Member"}
                      onEdit={() => {}} onDelete={() => {}} onReply={() => {}} />
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="px-3 pb-4 flex gap-2">
              <Input value={groupMsg} onChange={e => setGroupMsg(e.target.value)} placeholder="Message group…"
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleGroupSend()} className="flex-1 text-sm" />
              <Button size="sm" onClick={handleGroupSend} disabled={!groupMsg.trim() || !isConnected} className="px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
