import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage";

interface ChatClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ChatClient> = new Map();

function broadcast(userIds: string[], payload: object) {
  const data = JSON.stringify(payload);
  for (const uid of userIds) {
    const c = clients.get(uid);
    if (c && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "auth":
            userId = message.userId;
            if (userId) {
              clients.set(userId, { ws, userId });
              ws.send(JSON.stringify({ type: "connected", userId }));
            }
            break;

          case "chat":
            if (!userId || !message.receiverId || !message.content) {
              ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
              return;
            }
            const chatMessage = await storage.sendChatMessage({
              senderId: userId,
              receiverId: message.receiverId,
              content: message.content,
              replyToId: message.replyToId ?? null,
            });
            ws.send(JSON.stringify({ type: "message_sent", message: chatMessage }));
            broadcast([message.receiverId], { type: "new_message", message: chatMessage });
            break;

          case "edit_message":
            if (!userId || !message.messageId || !message.content) return;
            const edited = await storage.editChatMessage(message.messageId, userId, message.content);
            if (edited) {
              broadcast([edited.senderId, edited.receiverId], { type: "message_edited", message: edited });
            }
            break;

          case "delete_message":
            if (!userId || !message.messageId) return;
            await storage.deleteChatMessage(message.messageId, userId);
            broadcast([userId, message.receiverId].filter(Boolean), {
              type: "message_deleted", messageId: message.messageId,
            });
            break;

          case "group_message":
            if (!userId || !message.groupId || !message.content) return;
            const groupMsg = await storage.sendGroupChatMessage(
              message.groupId, userId, message.content, message.replyToId
            );
            const group = await storage.getUserGroupChats(userId);
            const thisGroup = group.find(g => g.id === message.groupId);
            const memberIds = thisGroup?.members ?? [];
            broadcast(memberIds, { type: "new_group_message", groupId: message.groupId, message: groupMsg, senderId: userId });
            ws.send(JSON.stringify({ type: "group_message_sent", message: groupMsg }));
            break;

          case "edit_group_message":
            if (!userId || !message.messageId || !message.content || !message.groupId) return;
            const editedGroup = await storage.editGroupChatMessage(message.messageId, userId, message.content);
            if (editedGroup) {
              const g = await storage.getUserGroupChats(userId);
              const grp = g.find(x => x.id === message.groupId);
              broadcast(grp?.members ?? [], { type: "group_message_edited", groupId: message.groupId, message: editedGroup });
            }
            break;

          case "delete_group_message":
            if (!userId || !message.messageId || !message.groupId) return;
            await storage.deleteGroupChatMessage(message.messageId, userId);
            const gx = await storage.getUserGroupChats(userId);
            const grpx = gx.find(x => x.id === message.groupId);
            broadcast(grpx?.members ?? [], { type: "group_message_deleted", groupId: message.groupId, messageId: message.messageId });
            break;

          case "read":
            if (!userId || !message.senderId) return;
            await storage.markMessagesAsRead(message.senderId, userId);
            ws.send(JSON.stringify({ type: "messages_read", senderId: message.senderId }));
            break;

          case "typing":
            if (!userId || !message.receiverId) return;
            broadcast([message.receiverId], { type: "typing", senderId: userId, isTyping: message.isTyping });
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
      }
    });

    ws.on("close", () => {
      if (userId) clients.delete(userId);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      if (userId) clients.delete(userId);
    });
  });

  return wss;
}
