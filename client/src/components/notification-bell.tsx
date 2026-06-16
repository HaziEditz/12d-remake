import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, UserPlus, TrendingUp, MessageCircle, Award, X, GraduationCap, BookOpen } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

const notificationIcons: Record<string, typeof Bell> = {
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  trade_executed: TrendingUp,
  trade_closed: TrendingUp,
  chat_message: MessageCircle,
  classroom_message: GraduationCap,
  assignment: BookOpen,
  achievement_unlocked: Award,
  price_alert: Bell,
};

const notificationRoutes: Record<string, string> = {
  friend_request: "/friends",
  friend_accepted: "/friends",
  trade_executed: "/simulator",
  trade_closed: "/simulator",
  chat_message: "/friends",
  classroom_message: "/school/chat",
  assignment: "/school/student",
  achievement_unlocked: "/achievements",
  price_alert: "/simulator",
};

function requestPushPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendPushNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    } catch (e) {
      // Some browsers block notifications in certain contexts
    }
  }
}

export function NotificationBell() {
  const [, navigate] = useLocation();
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (notifications.length === 0) return;
    if (isFirstLoad.current) {
      notifications.forEach(n => seenIds.current.add(n.id));
      isFirstLoad.current = false;
      return;
    }
    notifications.forEach(n => {
      if (!seenIds.current.has(n.id) && !n.isRead) {
        sendPushNotification(n.title, n.message);
        seenIds.current.add(n.id);
      }
    });
  }, [notifications]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const route = notificationRoutes[notification.type];
    if (route) {
      navigate(route);
    }
  };

  const handleEnableAlerts = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
  };

  const supportsPush = typeof window !== "undefined" && "Notification" in window;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="font-semibold">Notifications</span>
          <div className="flex items-center gap-1">
            {supportsPush && pushPermission !== "granted" && pushPermission !== "denied" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEnableAlerts}
                className="text-xs h-7 text-primary"
                data-testid="button-enable-push"
              >
                <Bell className="h-3 w-3 mr-1" />
                Enable alerts
              </Button>
            )}
            {supportsPush && pushPermission === "granted" && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Bell className="h-3 w-3" /> Alerts on
              </span>
            )}
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !notification.isRead ? "bg-muted/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.createdAt
                        ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification.id);
                    }}
                    data-testid={`button-delete-notification-${notification.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
