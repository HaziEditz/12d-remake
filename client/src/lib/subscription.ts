import type { User } from "@shared/schema";

const TRIAL_DAYS = 14;

export function getTrialDaysRemaining(user: User | null): number {
  if (!user) return 0;
  if (!user.trialStartDate) return TRIAL_DAYS;
  
  const trialStart = new Date(user.trialStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, TRIAL_DAYS - daysSinceStart);
}

export function isTrialExpired(user: User | null): boolean {
  return getTrialDaysRemaining(user) === 0;
}

export function hasActiveSubscription(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.membershipStatus === "active" && !!user.subscriptionId) return true;
  if (user.membershipStatus === "active" && user.membershipTier === "school") return true;
  return false;
}

export function canAccessPremiumFeatures(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (hasActiveSubscription(user)) return true;
  // School students don't get a free trial — they access features via their class
  if (user.role === "student") return false;
  // All other roles (casual, teacher) get a 14-day trial
  if (!isTrialExpired(user)) return true;
  return false;
}

export function getSubscriptionStatus(user: User | null): {
  status: "trial" | "active" | "expired" | "none";
  daysRemaining: number;
  tier: string | null;
} {
  if (!user) {
    return { status: "none", daysRemaining: 0, tier: null };
  }
  
  if (hasActiveSubscription(user)) {
    return { status: "active", daysRemaining: 0, tier: user.membershipTier };
  }
  
  const daysRemaining = getTrialDaysRemaining(user);
  if (daysRemaining > 0) {
    return { status: "trial", daysRemaining, tier: null };
  }
  
  return { status: "expired", daysRemaining: 0, tier: null };
}

export function isPremiumTier(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.membershipTier === "school" && user.membershipStatus === "active") return true;
  return user.membershipTier === "premium" && user.membershipStatus === "active";
}

export function canAccessPremiumContent(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (isPremiumTier(user)) return true;
  if (isTrialUser(user)) return true;
  return false;
}

export function getTierLevel(user: User | null): "none" | "trial" | "casual" | "school" | "premium" {
  if (!user) return "none";
  if (user.role === "admin") return "premium";
  
  if (hasActiveSubscription(user)) {
    if (user.membershipTier === "premium") return "premium";
    if (user.membershipTier === "school") return "school";
    return "casual";
  }
  
  if (!isTrialExpired(user)) return "trial";
  return "none";
}

export function isTrialUser(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return false;
  if (hasActiveSubscription(user)) return false;
  return !isTrialExpired(user);
}

export function getStartingBalance(user: User | null): number {
  if (!user) return 5000;
  if (user.role === "admin") return 10000;
  if (hasActiveSubscription(user)) return 10000;
  return 5000;
}

export const DEMO_DAILY_TRADE_LIMIT = 5;

export function getTierPriority(tier: string | null | undefined): number {
  switch (tier) {
    case "premium": return 3;
    case "casual": return 2;
    case "school": return 1;
    default: return 0;
  }
}

export function isDowngrade(currentTier: string | null | undefined, targetTier: string): boolean {
  return getTierPriority(currentTier) > getTierPriority(targetTier);
}

export function canPurchasePlan(user: User | null, targetTier: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return false;
  
  // Users without active subscriptions (trial or expired) can purchase any plan
  if (!hasActiveSubscription(user)) return true;
  
  // Users with active subscriptions can only upgrade, not downgrade
  return !isDowngrade(user.membershipTier, targetTier);
}
