import { useAuth } from "@/lib/auth-context";

const DEFAULTS: Record<string, boolean> = {
  priceAlerts: true,
  achievements: true,
  friendRequests: true,
  lessonReminders: true,
  tradeConfirmations: true,
  marketEvents: true,
  weeklyDigest: false,
};

export function useNotifPref(key: string): boolean {
  const { user } = useAuth();
  const prefs = (user as any)?.notificationPrefs as Record<string, boolean> | null | undefined;
  if (!prefs || prefs[key] === undefined) return DEFAULTS[key] ?? true;
  return prefs[key];
}

export function getNotifPrefForType(
  notifType: string,
  prefs: Record<string, boolean> | null | undefined
): boolean {
  const map: Record<string, string> = {
    friend_request: "friendRequests",
    friend_accepted: "friendRequests",
    trade_executed: "tradeConfirmations",
    trade_closed: "tradeConfirmations",
    achievement_unlocked: "achievements",
    price_alert: "priceAlerts",
    assignment: "lessonReminders",
    classroom_message: "marketEvents",
  };
  const key = map[notifType];
  if (!key) return true;
  if (!prefs || prefs[key] === undefined) return DEFAULTS[key] ?? true;
  return prefs[key];
}
