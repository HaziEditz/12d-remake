import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, MessageSquare, Users, Plus, Pencil, Trash2,
  CornerUpLeft, X, Check, Search, Settings2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getFrameStyle } from "@/lib/shop-catalog";
import { AvatarStatusDot, type PresenceStatus } from "@/components/status-dot";
import type { User } from "@shared/schema";

type SidebarTab = "dms" | "groups";

function TypingDots({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-xs text-muted-foreground">
      <span className="font-medium">{name}</span> is typing
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </span>
    </div>
  );
}

function UserAvatar({ u, size = 36, status }: { u: User; size?: number; status?: PresenceStatus }) {
  const frame = u.equippedFrame;
  const frameStyle = getFrameStyle(frame);
  return (
    <div className="relative shrink-0" style={{ width: size + (frame ? 6 : 0), height: size + (frame ? 6 : 0) }}>
      <Avatar style={{ width: size, height: size, margin: frame ? 3 : 0, ...frameStyle } as any}>
        <AvatarImage src={u.avatarUrl ?? ""} />
        <AvatarFallback className="text-xs">{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      {status && <AvatarStatusDot status={status} />}
    </div>
  );
}

function MessageBubble({
  msg, isMine, senderName, onEdit, onDelete, onReply,
}: {
  msg: any; isMine: boolean; senderName: string;
  onEdit: (m: any) => void; onDelete: (m: any) => void; onReply: (m: any) => void;
}) {
  const [hover, setHover] = useState(false);
  const isDeleted = !!msg.deletedAt;
  const isEdited = !!msg.editedAt && !isDeleted;
  return (
    <div
      className={`flex gap-2 group ${isMine ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-auto">
          {senderName[0]?.toUpperCase()}
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
        {msg.replyToId && (
          <div className="text-[10px] text-muted-foreground px-2.5 py-1 bg-muted/40 rounded-lg border-l-2 border-muted-foreground/30 mb-0.5">
            ↩ Replied to a message
          </div>
        )}
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
        } ${isDeleted ? "opacity-40 italic" : ""}`}>
          {msg.content}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt ?? Date.now()), "h:mm a")}</span>
          {isEdited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
          {hover && !isDeleted && (
            <div className="flex items-center gap-0.5 animate-in fade-in duration-100">
              <button onClick={() => onReply(msg)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Reply">
                <CornerUpLeft className="w-3 h-3" />
              </button>
              {isMine && (
                <>
                  <button onClick={() => onEdit(msg)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => onDelete(msg)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("dms");
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  // /api/friends returns { friendship, friend }[] — unwrap to User[]
  const { data: friendsRaw = [] } = useQuery<{friendship: any; friend: User}[]>({ queryKey: ["/api/friends"] });
  const friends: User[] = friendsRaw.map(f => f.friend);

  // Support opening a specific DM via ?dm=userId in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dmId = params.get("dm");
    if (dmId) {
      setActiveFriendId(dmId);
      setSidebarTab("dms");
    }
  }, []);
  const { data: groupChats = [], refetch: refetchGroups } = useQuery<any[]>({
    queryKey: ["/api/group-chats"],
    enabled: sidebarTab === "groups" || !!activeGroupId,
  });
  const { data: dmMessages = [], isLoading: dmLoading } = useQuery<any[]>({
    queryKey: ["/api/chat", activeFriendId],
    queryFn: () => fetch(`/api/chat/${activeFriendId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeFriendId,
    refetchInterval: 5000,
  });
  const { data: groupMessages = [], isLoading: groupLoading } = useQuery<any[]>({
    queryKey: ["/api/group-chats", activeGroupId, "messages"],
    queryFn: () => fetch(`/api/group-chats/${activeGroupId}/messages`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeGroupId,
    refetchInterval: 3000,
  });

  const activeFriend = friends.find((f: User) => f.id === activeFriendId);
  const activeGroup = groupChats.find((g: any) => g.id === activeGroupId);

  const friendIds = friends.map((f: User) => f.id);
  const { data: presence = {} } = useQuery<Record<string, PresenceStatus>>({
    queryKey: ["/api/users/presence", friendIds.join(",")],
    queryFn: () => friendIds.length
      ? fetch(`/api/users/presence?ids=${friendIds.join(",")}`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve({}),
    enabled: friendIds.length > 0,
    refetchInterval: 30_000,
  });

  const allDmMessages = [
    ...dmMessages,
    ...realtimeMessages.filter(rm => !dmMessages.some((m: any) => m.id === rm.id)),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const allGroupMessages = groupMessages;

  // WebSocket
  useEffect(() => {
    if (!user?.id) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    socket.onopen = () => { socket.send(JSON.stringify({ type: "auth", userId: user.id })); setIsConnected(true); };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message") {
        setRealtimeMessages(prev => [...prev, data.message]);
        queryClient.invalidateQueries({ queryKey: ["/api/chat/unread/count"] });
        queryClient.invalidateQueries({ queryKey: ["/api/chat", data.message.senderId] });
      } else if (data.type === "message_edited") {
        queryClient.invalidateQueries({ queryKey: ["/api/chat", activeFriendId] });
      } else if (data.type === "message_deleted") {
        queryClient.invalidateQueries({ queryKey: ["/api/chat", activeFriendId] });
      } else if (data.type === "typing") {
        setTypingUsers(prev => { const s = new Set(prev); if (data.isTyping) s.add(data.senderId); else s.delete(data.senderId); return s; });
      } else if (data.type === "new_group_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/group-chats", data.groupId, "messages"] });
      }
    };
    socket.onclose = () => setIsConnected(false);
    setWs(socket);
    return () => { socket.close(); };
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [allDmMessages.length, allGroupMessages.length]);

  // Mutations
  const editDmMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => apiRequest("PUT", `/api/chat/${id}`, { content }),
    onSuccess: () => { setEditingMsg(null); queryClient.invalidateQueries({ queryKey: ["/api/chat", activeFriendId] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteDmMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat", activeFriendId] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/group-chats", { name, emoji: "💬" }),
    onSuccess: () => { setShowNewGroup(false); setNewGroupName(""); refetchGroups(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/group-chats/${id}/leave`, {}),
    onSuccess: () => { setActiveGroupId(null); refetchGroups(); },
  });

  function sendTyping(isTyping: boolean) {
    if (!ws || !activeFriendId) return;
    ws.send(JSON.stringify({ type: "typing", receiverId: activeFriendId, isTyping }));
  }

  function handleSend() {
    if (!message.trim()) return;
    if (editingMsg) {
      if (editingMsg._isGroup) {
        apiRequest("PUT", `/api/group-chats/${activeGroupId}/messages/${editingMsg.id}`, { content: message.trim() })
          .then(() => queryClient.invalidateQueries({ queryKey: ["/api/group-chats", activeGroupId, "messages"] }));
      } else {
        editDmMutation.mutate({ id: editingMsg.id, content: message.trim() });
      }
      setEditingMsg(null); setMessage(""); return;
    }
    if (activeGroupId && ws) {
      ws.send(JSON.stringify({ type: "group_message", groupId: activeGroupId, content: message.trim() }));
    } else if (activeFriendId && ws) {
      ws.send(JSON.stringify({ type: "chat", receiverId: activeFriendId, content: message.trim(), replyToId: replyingTo?.id ?? null }));
    }
    setMessage(""); setReplyingTo(null); sendTyping(false);
  }

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value);
    if (activeFriendId) {
      sendTyping(true);
      if (typingRef.current) clearTimeout(typingRef.current);
      typingRef.current = setTimeout(() => sendTyping(false), 2000);
    }
  }

  const filteredFriends = (friends as User[]).filter(f =>
    f.displayName?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groupChats.filter((g: any) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = activeGroupId || activeFriendId;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className={`w-72 border-r flex flex-col bg-card/30 ${isActive ? "hidden md:flex" : "flex"}`}>
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Messages
          </h1>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs bg-background" />
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-2.5 bg-muted/60 p-0.5 rounded-lg">
            <button onClick={() => { setSidebarTab("dms"); setActiveGroupId(null); }}
              className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${sidebarTab === "dms" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              DMs
            </button>
            <button onClick={() => { setSidebarTab("groups"); setActiveFriendId(null); }}
              className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${sidebarTab === "groups" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              Groups
            </button>
          </div>
        </div>

        {/* DM List */}
        {sidebarTab === "dms" && (
          <ScrollArea className="flex-1 py-2">
            {filteredFriends.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-10">
                <p>No friends yet.</p>
                <p className="mt-1">Go to Friends to connect.</p>
              </div>
            ) : filteredFriends.map((f: User) => {
              const fStatus: PresenceStatus = presence[f.id] ?? "offline";
              return (
                <button key={f.id} onClick={() => { setActiveFriendId(f.id); setActiveGroupId(null); setSidebarTab("dms"); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left ${activeFriendId === f.id ? "bg-muted/80" : ""}`}>
                  <UserAvatar u={f} size={36} status={fStatus} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{f.displayName}</p>
                    <p className={`text-[10px] truncate ${fStatus === "online" ? "text-green-500" : fStatus === "idle" ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {fStatus === "online" ? "Online" : fStatus === "idle" ? "Idle" : (f.equippedTitle || "Offline")}
                    </p>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        )}

        {/* Group List */}
        {sidebarTab === "groups" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Group Chats</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowNewGroup(v => !v)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {showNewGroup && (
              <div className="mx-3 mb-2 flex gap-1.5">
                <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name…" className="h-7 text-xs flex-1"
                  onKeyDown={e => e.key === "Enter" && createGroupMutation.mutate(newGroupName)} />
                <Button size="sm" className="h-7 px-2" onClick={() => createGroupMutation.mutate(newGroupName)} disabled={!newGroupName.trim()}>
                  {createGroupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
              </div>
            )}
            <ScrollArea className="flex-1 py-1">
              {filteredGroups.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-8 px-4">
                  <Users className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                  <p>No groups yet. Create one!</p>
                </div>
              ) : filteredGroups.map((g: any) => (
                <button key={g.id} onClick={() => { setActiveGroupId(g.id); setActiveFriendId(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left ${activeGroupId === g.id ? "bg-muted/80" : ""}`}>
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">{g.avatarEmoji ?? "💬"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{g.members?.length ?? 0} members</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className={`flex-1 flex flex-col ${!isActive ? "hidden md:flex" : "flex"}`}>
        {!activeFriendId && !activeGroupId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a friend or group to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b bg-card/30 flex items-center gap-3">
              <button className="md:hidden mr-1 text-muted-foreground hover:text-foreground" onClick={() => { setActiveFriendId(null); setActiveGroupId(null); }}>
                <X className="w-4 h-4" />
              </button>
              {activeFriendId && activeFriend ? (
                <>
                  <Avatar className="w-8 h-8"><AvatarImage src={activeFriend.avatarUrl ?? ""} /><AvatarFallback>{activeFriend.displayName?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold text-sm">{activeFriend.displayName}</p>
                    {isConnected && <p className="text-[10px] text-green-500">Online</p>}
                  </div>
                </>
              ) : activeGroupId && activeGroup ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg">{activeGroup.avatarEmoji ?? "💬"}</div>
                  <div>
                    <p className="font-semibold text-sm">{activeGroup.name}</p>
                    <p className="text-[10px] text-muted-foreground">{activeGroup.members?.length ?? 0} members</p>
                  </div>
                  <div className="ml-auto">
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => leaveGroupMutation.mutate(activeGroupId)}>Leave</Button>
                  </div>
                </>
              ) : null}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef as any}>
              {(activeFriendId ? dmLoading : groupLoading) ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (activeFriendId ? allDmMessages : allGroupMessages).length === 0 ? (
                <div className="text-center text-muted-foreground py-14">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm mt-1">Send the first message!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {(activeFriendId ? allDmMessages : allGroupMessages).map((msg: any) => (
                    <MessageBubble key={msg.id} msg={msg}
                      isMine={msg.senderId === user?.id}
                      senderName={msg.senderId === user?.id ? user?.displayName ?? "You" : (activeFriendId ? activeFriend?.displayName ?? "Friend" : "Member")}
                      onEdit={m => { setEditingMsg({ ...m, _isGroup: !!activeGroupId }); setMessage(m.content); }}
                      onDelete={m => {
                        if (activeGroupId) {
                          apiRequest("DELETE", `/api/group-chats/${activeGroupId}/messages/${m.id}`, {})
                            .then(() => queryClient.invalidateQueries({ queryKey: ["/api/group-chats", activeGroupId, "messages"] }));
                        } else {
                          deleteDmMutation.mutate(m.id);
                        }
                      }}
                      onReply={m => setReplyingTo(m)} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Typing indicator */}
            {activeFriendId && typingUsers.size > 0 && <TypingDots name={activeFriend?.displayName ?? "Friend"} />}

            {/* Reply/Edit bar */}
            {(replyingTo || editingMsg) && (
              <div className="mx-4 mb-1 flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-lg text-xs">
                <span className="text-muted-foreground">{editingMsg ? "Editing:" : "Replying to:"}</span>
                <span className="flex-1 truncate">{(editingMsg ?? replyingTo)?.content}</span>
                <button onClick={() => { setEditingMsg(null); setReplyingTo(null); setMessage(""); }}>
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 flex gap-2">
              <Input
                value={message}
                onChange={handleTyping}
                placeholder={editingMsg ? "Edit message…" : activeFriendId ? `Message ${activeFriend?.displayName ?? ""}…` : `Message ${activeGroup?.name ?? "group"}…`}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1"
                data-testid="input-message"
              />
              <Button onClick={handleSend} disabled={!message.trim() || !isConnected} data-testid="button-send">
                {editingMsg ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
