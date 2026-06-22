import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { pool } from "./db";
import ConnectPgSimple from "connect-pg-simple";
let createPaypalOrder: any, capturePaypalOrder: any, loadPaypalDefault: any;
const paypalReady = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
if (paypalReady) {
  const paypal = await import("./paypal");
  createPaypalOrder = paypal.createPaypalOrder;
  capturePaypalOrder = paypal.capturePaypalOrder;
  loadPaypalDefault = paypal.loadPaypalDefault;
} else {
  console.warn("PayPal credentials not configured - PayPal routes will return 503");
  const unavailable = (_req: Request, res: Response) => res.status(503).json({ error: "PayPal not configured" });
  createPaypalOrder = unavailable;
  capturePaypalOrder = unavailable;
  loadPaypalDefault = unavailable;
}
import { insertUserSchema, insertLessonSchema, insertTradeSchema, insertPortfolioItemSchema, insertAssignmentSchema, insertClassSchema, insertChatMessageSchema, updateProfileSchema, insertLessonNoteSchema } from "@shared/schema";
import type { User, Trade } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupWebSocket } from "./websocket";

const pgSession = ConnectPgSimple(session);

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      displayName: string;
      role: string;
    }
  }
}

// Create hardcoded admin user if not exists
async function ensureAdminUser() {
  const adminEmail = "admin@12digits.com";
  const existingAdmin = await storage.getUserByEmail(adminEmail);
  if (!existingAdmin) {
    await storage.createUser({
      email: adminEmail,
      password: "12digits!",
      displayName: "Admin",
      role: "admin",
    });
    console.log("Admin user created: admin@12digits.com / 12digits!");
  }
}

// Seed default promo codes (idempotent - will insert or update)
async function seedPromoCodes() {
  const promoCodesToSeed = [
    { code: "sbhsontop", tier: "school", description: "School plan promo code", maxUses: null, isActive: true },
    { code: "12digits!", tier: "casual", description: "Casual plan promo code", maxUses: null, isActive: true },
    { code: "tradersarecool", tier: "premium", description: "12Digits+ premium plan promo code", maxUses: null, isActive: true },
  ];

  for (const promoData of promoCodesToSeed) {
    const existing = await storage.getPromoCodeByCode(promoData.code);
    if (!existing) {
      await storage.createPromoCode(promoData);
    }
  }
}

// Seed achievements (idempotent - will insert or update)
async function seedAchievements() {
  const achievementsList = [
    // ===== TRADING ACHIEVEMENTS (30) =====
    { id: "first-trade", name: "First Trade", description: "Execute your first trade", icon: "TrendingUp", category: "trading", requirement: 1, xpReward: 10 },
    { id: "day-trader", name: "Day Trader", description: "Complete 10 trades", icon: "TrendingUp", category: "trading", requirement: 10, xpReward: 25 },
    { id: "active-trader", name: "Active Trader", description: "Complete 50 trades", icon: "TrendingUp", category: "trading", requirement: 50, xpReward: 50 },
    { id: "master-trader", name: "Master Trader", description: "Complete 100 trades", icon: "Zap", category: "trading", requirement: 100, xpReward: 100 },
    { id: "trading-legend", name: "Trading Legend", description: "Complete 500 trades", icon: "Award", category: "trading", requirement: 500, xpReward: 250 },
    { id: "first-profit", name: "First Profit", description: "Make your first profitable trade", icon: "DollarSign", category: "trading", requirement: 1, xpReward: 15 },
    { id: "winning-streak", name: "Winning Streak", description: "5 profitable trades in a row", icon: "Zap", category: "trading", requirement: 5, xpReward: 50 },
    { id: "double-down", name: "Double Down", description: "Make $1,000 total profit", icon: "DollarSign", category: "trading", requirement: 1000, xpReward: 75 },
    { id: "high-roller", name: "High Roller", description: "Make $5,000 total profit", icon: "DollarSign", category: "trading", requirement: 5000, xpReward: 150 },
    { id: "mogul", name: "Mogul", description: "Make $10,000 total profit", icon: "Award", category: "trading", requirement: 10000, xpReward: 300 },
    { id: "trade-200", name: "Seasoned Trader", description: "Complete 200 trades", icon: "TrendingUp", category: "trading", requirement: 200, xpReward: 150 },
    { id: "trade-1000", name: "Market Veteran", description: "Complete 1,000 trades", icon: "Trophy", category: "trading", requirement: 1000, xpReward: 500 },
    { id: "profit-25k", name: "Quarter Million", description: "Make $25,000 total profit", icon: "DollarSign", category: "trading", requirement: 25000, xpReward: 400 },
    { id: "profit-50k", name: "Fifty Grand", description: "Make $50,000 total profit", icon: "Crown", category: "trading", requirement: 50000, xpReward: 600 },
    { id: "profit-100k", name: "Six Figures", description: "Make $100,000 total profit", icon: "Award", category: "trading", requirement: 100000, xpReward: 1000 },
    { id: "buy-specialist", name: "Bull Master", description: "Complete 50 buy orders", icon: "ArrowUp", category: "trading", requirement: 50, xpReward: 75 },
    { id: "sell-specialist", name: "Bear Master", description: "Complete 50 sell orders", icon: "ArrowDown", category: "trading", requirement: 50, xpReward: 75 },
    { id: "quick-flip", name: "Quick Flip", description: "Close a trade within 5 minutes of opening", icon: "Clock", category: "trading", requirement: 1, xpReward: 25 },
    { id: "patient-trader", name: "Patient Trader", description: "Hold a position for over 24 hours", icon: "Timer", category: "trading", requirement: 1, xpReward: 30 },
    { id: "tech-trader", name: "Tech Trader", description: "Trade 10 different tech stocks", icon: "Cpu", category: "trading", requirement: 10, xpReward: 60 },
    { id: "diversifier", name: "Diversifier", description: "Trade 20 different stocks", icon: "Layers", category: "trading", requirement: 20, xpReward: 80 },
    { id: "portfolio-builder", name: "Portfolio Builder", description: "Trade 50 different stocks", icon: "Grid", category: "trading", requirement: 50, xpReward: 150 },
    { id: "limit-order-pro", name: "Limit Order Pro", description: "Execute 10 limit orders", icon: "Target", category: "trading", requirement: 10, xpReward: 50 },
    { id: "stop-loss-master", name: "Stop Loss Master", description: "Use stop loss on 20 trades", icon: "Shield", category: "trading", requirement: 20, xpReward: 60 },
    { id: "risk-manager", name: "Risk Manager", description: "Use take profit on 20 trades", icon: "ShieldCheck", category: "trading", requirement: 20, xpReward: 60 },
    { id: "comeback-kid", name: "Comeback Kid", description: "Recover from a 20% portfolio loss", icon: "RefreshCw", category: "trading", requirement: 1, xpReward: 100 },
    { id: "no-loss-day", name: "Perfect Day", description: "Complete 5 trades in one day with no losses", icon: "CheckCircle", category: "trading", requirement: 5, xpReward: 75 },
    { id: "morning-trader", name: "Early Market", description: "Execute a trade before 10 AM", icon: "Sunrise", category: "trading", requirement: 1, xpReward: 15 },
    { id: "after-hours", name: "After Hours", description: "Execute a trade after 4 PM", icon: "Moon", category: "trading", requirement: 1, xpReward: 15 },
    { id: "big-position", name: "Big Position", description: "Open a position worth over $10,000", icon: "Scale", category: "trading", requirement: 10000, xpReward: 50 },

    // ===== LEARNING ACHIEVEMENTS (25) =====
    { id: "student", name: "Student", description: "Complete your first lesson", icon: "BookOpen", category: "learning", requirement: 1, xpReward: 10 },
    { id: "scholar", name: "Scholar", description: "Complete 5 lessons", icon: "BookOpen", category: "learning", requirement: 5, xpReward: 30 },
    { id: "graduate", name: "Graduate", description: "Complete 10 lessons", icon: "GraduationCap", category: "learning", requirement: 10, xpReward: 60 },
    { id: "professor", name: "Professor", description: "Complete 25 lessons", icon: "GraduationCap", category: "learning", requirement: 25, xpReward: 125 },
    { id: "valedictorian", name: "Valedictorian", description: "Complete all available lessons", icon: "Award", category: "learning", requirement: 100, xpReward: 500 },
    { id: "lesson-15", name: "Knowledge Seeker", description: "Complete 15 lessons", icon: "Search", category: "learning", requirement: 15, xpReward: 80 },
    { id: "lesson-50", name: "Expert Learner", description: "Complete 50 lessons", icon: "Brain", category: "learning", requirement: 50, xpReward: 200 },
    { id: "lesson-75", name: "Almost There", description: "Complete 75 lessons", icon: "Target", category: "learning", requirement: 75, xpReward: 350 },
    { id: "first-quiz", name: "Quiz Taker", description: "Complete your first quiz", icon: "HelpCircle", category: "learning", requirement: 1, xpReward: 15 },
    { id: "quiz-master", name: "Quiz Master", description: "Score 100% on 5 quizzes", icon: "CheckSquare", category: "learning", requirement: 5, xpReward: 75 },
    { id: "perfect-score", name: "Perfect Score", description: "Score 100% on 10 quizzes", icon: "Award", category: "learning", requirement: 10, xpReward: 150 },
    { id: "basics-complete", name: "Fundamentals", description: "Complete all beginner lessons", icon: "BookMarked", category: "learning", requirement: 1, xpReward: 50 },
    { id: "advanced-learner", name: "Advanced Learner", description: "Complete all advanced lessons", icon: "Rocket", category: "learning", requirement: 1, xpReward: 200 },
    { id: "strategy-student", name: "Strategy Student", description: "Learn 5 trading strategies", icon: "Lightbulb", category: "learning", requirement: 5, xpReward: 100 },
    { id: "chart-reader", name: "Chart Reader", description: "Complete all chart analysis lessons", icon: "BarChart2", category: "learning", requirement: 1, xpReward: 75 },
    { id: "technical-analyst", name: "Technical Analyst", description: "Complete all technical analysis lessons", icon: "Activity", category: "learning", requirement: 1, xpReward: 100 },
    { id: "fundamental-analyst", name: "Fundamental Analyst", description: "Complete all fundamental analysis lessons", icon: "FileText", category: "learning", requirement: 1, xpReward: 100 },
    { id: "options-student", name: "Options Student", description: "Complete options trading lessons", icon: "Shuffle", category: "learning", requirement: 1, xpReward: 80 },
    { id: "crypto-curious", name: "Crypto Curious", description: "Complete cryptocurrency lessons", icon: "Coins", category: "learning", requirement: 1, xpReward: 80 },
    { id: "forex-learner", name: "Forex Learner", description: "Complete forex trading lessons", icon: "Globe", category: "learning", requirement: 1, xpReward: 80 },
    { id: "study-streak-3", name: "Study Streak", description: "Study for 3 days in a row", icon: "Flame", category: "learning", requirement: 3, xpReward: 30 },
    { id: "study-streak-7", name: "Week of Learning", description: "Study for 7 days in a row", icon: "Flame", category: "learning", requirement: 7, xpReward: 70 },
    { id: "study-streak-30", name: "Month of Learning", description: "Study for 30 days in a row", icon: "Flame", category: "learning", requirement: 30, xpReward: 300 },
    { id: "note-taker", name: "Note Taker", description: "Take notes on 10 lessons", icon: "Edit", category: "learning", requirement: 10, xpReward: 40 },
    { id: "bookmarker", name: "Bookmarker", description: "Bookmark 5 lessons for later", icon: "Bookmark", category: "learning", requirement: 5, xpReward: 20 },

    // ===== BALANCE ACHIEVEMENTS (20) =====
    { id: "starter", name: "Starter", description: "Reach $6,000 balance", icon: "Wallet", category: "balance", requirement: 6000, xpReward: 20 },
    { id: "growing", name: "Growing", description: "Reach $10,000 balance", icon: "Wallet", category: "balance", requirement: 10000, xpReward: 50 },
    { id: "wealthy", name: "Wealthy", description: "Reach $15,000 balance", icon: "CreditCard", category: "balance", requirement: 15000, xpReward: 100 },
    { id: "rich", name: "Rich", description: "Reach $25,000 balance", icon: "DollarSign", category: "balance", requirement: 25000, xpReward: 200 },
    { id: "elite", name: "Elite", description: "Reach $50,000 balance", icon: "Crown", category: "balance", requirement: 50000, xpReward: 500 },
    { id: "balance-75k", name: "75K Club", description: "Reach $75,000 balance", icon: "Crown", category: "balance", requirement: 75000, xpReward: 750 },
    { id: "balance-100k", name: "100K Club", description: "Reach $100,000 balance", icon: "Trophy", category: "balance", requirement: 100000, xpReward: 1000 },
    { id: "balance-150k", name: "150K Milestone", description: "Reach $150,000 balance", icon: "Star", category: "balance", requirement: 150000, xpReward: 1250 },
    { id: "balance-200k", name: "200K Legend", description: "Reach $200,000 balance", icon: "Award", category: "balance", requirement: 200000, xpReward: 1500 },
    { id: "balance-500k", name: "Half Millionaire", description: "Reach $500,000 balance", icon: "Gem", category: "balance", requirement: 500000, xpReward: 2500 },
    { id: "balance-1m", name: "Millionaire", description: "Reach $1,000,000 balance", icon: "Crown", category: "balance", requirement: 1000000, xpReward: 5000 },
    { id: "double-up", name: "Double Up", description: "Double your starting balance", icon: "ArrowUpCircle", category: "balance", requirement: 10000, xpReward: 100 },
    { id: "triple-threat", name: "Triple Threat", description: "Triple your starting balance", icon: "ArrowUpCircle", category: "balance", requirement: 15000, xpReward: 200 },
    { id: "five-bagger", name: "Five Bagger", description: "5x your starting balance", icon: "Rocket", category: "balance", requirement: 25000, xpReward: 400 },
    { id: "ten-bagger", name: "Ten Bagger", description: "10x your starting balance", icon: "Rocket", category: "balance", requirement: 50000, xpReward: 750 },
    { id: "recovery-pro", name: "Recovery Pro", description: "Return to profit after a drawdown", icon: "TrendingUp", category: "balance", requirement: 1, xpReward: 50 },
    { id: "consistent-gains", name: "Consistent Gains", description: "Gain balance 5 days in a row", icon: "BarChart", category: "balance", requirement: 5, xpReward: 100 },
    { id: "monthly-growth", name: "Monthly Growth", description: "Grow balance every week for a month", icon: "Calendar", category: "balance", requirement: 4, xpReward: 200 },
    { id: "profit-margin", name: "High Margin", description: "Achieve 50% profit margin", icon: "Percent", category: "balance", requirement: 50, xpReward: 150 },
    { id: "cash-reserve", name: "Cash Reserve", description: "Maintain $5,000 cash while invested", icon: "PiggyBank", category: "balance", requirement: 5000, xpReward: 60 },

    // ===== SOCIAL ACHIEVEMENTS (25) =====
    { id: "public-profile", name: "Public Profile", description: "Add a bio to your profile", icon: "User", category: "social", requirement: 1, xpReward: 10 },
    { id: "picture-perfect", name: "Picture Perfect", description: "Add an avatar to your profile", icon: "Image", category: "social", requirement: 1, xpReward: 10 },
    { id: "networker", name: "Networker", description: "Add your first friend", icon: "UserPlus", category: "social", requirement: 1, xpReward: 15 },
    { id: "popular", name: "Popular", description: "Have 10 friends", icon: "Users", category: "social", requirement: 10, xpReward: 50 },
    { id: "influencer", name: "Influencer", description: "Have 25 friends", icon: "Heart", category: "social", requirement: 25, xpReward: 100 },
    { id: "social-butterfly", name: "Social Butterfly", description: "Have 50 friends", icon: "Users", category: "social", requirement: 50, xpReward: 200 },
    { id: "community-leader", name: "Community Leader", description: "Have 100 friends", icon: "Crown", category: "social", requirement: 100, xpReward: 400 },
    { id: "first-chat", name: "First Chat", description: "Send your first chat message", icon: "MessageCircle", category: "social", requirement: 1, xpReward: 10 },
    { id: "chatty", name: "Chatty", description: "Send 50 chat messages", icon: "MessageCircle", category: "social", requirement: 50, xpReward: 40 },
    { id: "conversationalist", name: "Conversationalist", description: "Send 200 chat messages", icon: "MessageSquare", category: "social", requirement: 200, xpReward: 100 },
    { id: "messenger", name: "Messenger", description: "Send 500 chat messages", icon: "Mail", category: "social", requirement: 500, xpReward: 200 },
    { id: "profile-complete", name: "Complete Profile", description: "Fill out all profile fields", icon: "CheckCircle", category: "social", requirement: 1, xpReward: 25 },
    { id: "share-strategy", name: "Strategy Sharer", description: "Share a trading strategy", icon: "Share2", category: "social", requirement: 1, xpReward: 30 },
    { id: "strategy-creator", name: "Strategy Creator", description: "Create 5 trading strategies", icon: "Lightbulb", category: "social", requirement: 5, xpReward: 100 },
    { id: "helpful-trader", name: "Helpful Trader", description: "Help 5 friends with trades", icon: "HelpingHand", category: "social", requirement: 5, xpReward: 75 },
    { id: "mentor", name: "Mentor", description: "Mentor 10 new traders", icon: "Users", category: "social", requirement: 10, xpReward: 150 },
    { id: "team-player", name: "Team Player", description: "Participate in a group challenge", icon: "Flag", category: "social", requirement: 1, xpReward: 50 },
    { id: "challenge-winner", name: "Challenge Winner", description: "Win a trading challenge", icon: "Trophy", category: "social", requirement: 1, xpReward: 200 },
    { id: "leaderboard-climber", name: "Leaderboard Climber", description: "Improve your leaderboard rank by 10 positions", icon: "ArrowUp", category: "social", requirement: 10, xpReward: 75 },
    { id: "top-100", name: "Top 100", description: "Reach top 100 on the leaderboard", icon: "Medal", category: "social", requirement: 1, xpReward: 100 },
    { id: "top-50", name: "Top 50", description: "Reach top 50 on the leaderboard", icon: "Medal", category: "social", requirement: 1, xpReward: 150 },
    { id: "top-25", name: "Top 25", description: "Reach top 25 on the leaderboard", icon: "Medal", category: "social", requirement: 1, xpReward: 175 },
    { id: "referral-1", name: "Recruiter", description: "Refer 1 new user", icon: "UserPlus", category: "social", requirement: 1, xpReward: 50 },
    { id: "referral-5", name: "Ambassador", description: "Refer 5 new users", icon: "UserPlus", category: "social", requirement: 5, xpReward: 200 },
    { id: "referral-10", name: "Super Ambassador", description: "Refer 10 new users", icon: "Star", category: "social", requirement: 10, xpReward: 400 },

    // ===== MILESTONE ACHIEVEMENTS (30) =====
    { id: "early-bird", name: "Early Bird", description: "Log in for the first time", icon: "Star", category: "milestone", requirement: 1, xpReward: 5 },
    { id: "dedicated", name: "Dedicated", description: "Log in for 7 days", icon: "Star", category: "milestone", requirement: 7, xpReward: 35 },
    { id: "committed", name: "Committed", description: "Log in for 30 days", icon: "Trophy", category: "milestone", requirement: 30, xpReward: 150 },
    { id: "premium-member", name: "Premium Member", description: "Subscribe to a premium plan", icon: "Crown", category: "milestone", requirement: 1, xpReward: 50 },
    { id: "top-10", name: "Top 10", description: "Reach top 10 on the leaderboard", icon: "Trophy", category: "milestone", requirement: 1, xpReward: 200 },
    { id: "login-14", name: "Two Weeks In", description: "Log in for 14 days", icon: "Calendar", category: "milestone", requirement: 14, xpReward: 70 },
    { id: "login-60", name: "Two Months Strong", description: "Log in for 60 days", icon: "Calendar", category: "milestone", requirement: 60, xpReward: 300 },
    { id: "login-90", name: "Quarter Year", description: "Log in for 90 days", icon: "Calendar", category: "milestone", requirement: 90, xpReward: 450 },
    { id: "login-180", name: "Half Year", description: "Log in for 180 days", icon: "Calendar", category: "milestone", requirement: 180, xpReward: 900 },
    { id: "login-365", name: "One Year", description: "Log in for 365 days", icon: "Award", category: "milestone", requirement: 365, xpReward: 1825 },
    { id: "xp-100", name: "XP Collector", description: "Earn 100 XP", icon: "Zap", category: "milestone", requirement: 100, xpReward: 10 },
    { id: "xp-500", name: "XP Hunter", description: "Earn 500 XP", icon: "Zap", category: "milestone", requirement: 500, xpReward: 50 },
    { id: "xp-1000", name: "XP Master", description: "Earn 1,000 XP", icon: "Zap", category: "milestone", requirement: 1000, xpReward: 100 },
    { id: "xp-5000", name: "XP Legend", description: "Earn 5,000 XP", icon: "Crown", category: "milestone", requirement: 5000, xpReward: 500 },
    { id: "xp-10000", name: "XP Champion", description: "Earn 10,000 XP", icon: "Trophy", category: "milestone", requirement: 10000, xpReward: 1000 },
    { id: "level-5", name: "Level 5", description: "Reach level 5", icon: "ArrowUp", category: "milestone", requirement: 5, xpReward: 25 },
    { id: "level-10", name: "Level 10", description: "Reach level 10", icon: "ArrowUp", category: "milestone", requirement: 10, xpReward: 50 },
    { id: "level-25", name: "Level 25", description: "Reach level 25", icon: "ArrowUp", category: "milestone", requirement: 25, xpReward: 125 },
    { id: "level-50", name: "Level 50", description: "Reach level 50", icon: "Star", category: "milestone", requirement: 50, xpReward: 250 },
    { id: "level-100", name: "Level 100", description: "Reach level 100", icon: "Crown", category: "milestone", requirement: 100, xpReward: 500 },
    { id: "achievement-10", name: "Achiever", description: "Unlock 10 achievements", icon: "Award", category: "milestone", requirement: 10, xpReward: 50 },
    { id: "achievement-25", name: "Trophy Hunter", description: "Unlock 25 achievements", icon: "Award", category: "milestone", requirement: 25, xpReward: 125 },
    { id: "achievement-50", name: "Collector", description: "Unlock 50 achievements", icon: "Award", category: "milestone", requirement: 50, xpReward: 250 },
    { id: "achievement-100", name: "Completionist", description: "Unlock 100 achievements", icon: "Crown", category: "milestone", requirement: 100, xpReward: 500 },
    { id: "first-week", name: "First Week", description: "Complete your first week of trading", icon: "Calendar", category: "milestone", requirement: 7, xpReward: 35 },
    { id: "first-month", name: "First Month", description: "Complete your first month of trading", icon: "Calendar", category: "milestone", requirement: 30, xpReward: 150 },
    { id: "simulator-pro", name: "Simulator Pro", description: "Use the simulator for 10 hours", icon: "Clock", category: "milestone", requirement: 10, xpReward: 100 },
    { id: "command-center", name: "Command Center", description: "Access the command center terminal", icon: "Terminal", category: "milestone", requirement: 1, xpReward: 25 },
    { id: "analytics-user", name: "Data Driven", description: "View analytics 10 times", icon: "BarChart2", category: "milestone", requirement: 10, xpReward: 40 },
    { id: "watchlist-pro", name: "Watchlist Pro", description: "Add 20 stocks to your watchlist", icon: "Eye", category: "milestone", requirement: 20, xpReward: 60 },
  ];

  for (const achievement of achievementsList) {
    await storage.upsertAchievement(achievement);
  }
  console.log("Synced 130 achievements");
}

// Helper function to calculate max consecutive profitable trades
function calculateMaxWinningStreak(trades: Trade[]): number {
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.executedAt ?? 0).getTime() - new Date(b.executedAt ?? 0).getTime()
  );
  let maxStreak = 0;
  let currentStreak = 0;
  for (const trade of sortedTrades) {
    if (trade.profit && trade.profit > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
}

// Retroactive achievement check - awards achievements based on current user stats
async function checkAndAwardAchievements(userId: string): Promise<void> {
  const user = await storage.getUserById(userId);
  if (!user) return;

  const trades = await storage.getTradesByUser(userId);
  const lessonProgress = await storage.getLessonProgress(userId);
  const completedLessons = lessonProgress.filter(lp => lp.completed).length;
  const balance = user.simulatorBalance ?? 10000;
  const totalProfit = user.totalProfit ?? 0;
  const profitableTrades = trades.filter(t => t.profit && t.profit > 0);
  
  const totalLessonsCount = await storage.getLessonsCount();
  const leaderboard = await storage.getLeaderboard();
  const userRank = leaderboard.findIndex(u => u.id === userId) + 1;
  const maxWinningStreak = calculateMaxWinningStreak(trades);

  const achievements = await storage.getAchievements();
  const userAchievements = await storage.getUserAchievements(userId);

  let xpEarned = 0;

  for (const achievement of achievements) {
    const existingUa = userAchievements.find(ua => ua.achievementId === achievement.id);
    if (existingUa && existingUa.progress === 100) continue;

    let currentProgress = 0;
    let shouldUnlock = false;

    switch (achievement.category) {
      case "trading":
        if (achievement.id === "first-trade") {
          currentProgress = trades.length >= 1 ? 100 : 0;
        } else if (achievement.id === "day-trader") {
          currentProgress = Math.min(100, (trades.length / 10) * 100);
        } else if (achievement.id === "active-trader") {
          currentProgress = Math.min(100, (trades.length / 50) * 100);
        } else if (achievement.id === "master-trader") {
          currentProgress = Math.min(100, (trades.length / 100) * 100);
        } else if (achievement.id === "trading-legend") {
          currentProgress = Math.min(100, (trades.length / 500) * 100);
        } else if (achievement.id === "first-profit") {
          currentProgress = profitableTrades.length >= 1 ? 100 : 0;
        } else if (achievement.id === "double-down") {
          currentProgress = Math.min(100, (totalProfit / 1000) * 100);
        } else if (achievement.id === "high-roller") {
          currentProgress = Math.min(100, (totalProfit / 5000) * 100);
        } else if (achievement.id === "mogul") {
          currentProgress = Math.min(100, (totalProfit / 10000) * 100);
        } else if (achievement.id === "winning-streak") {
          currentProgress = Math.min(100, (maxWinningStreak / 5) * 100);
        }
        break;

      case "learning":
        if (achievement.id === "student") {
          currentProgress = completedLessons >= 1 ? 100 : 0;
        } else if (achievement.id === "scholar") {
          currentProgress = Math.min(100, (completedLessons / 5) * 100);
        } else if (achievement.id === "graduate") {
          currentProgress = Math.min(100, (completedLessons / 10) * 100);
        } else if (achievement.id === "professor") {
          currentProgress = Math.min(100, (completedLessons / 25) * 100);
        } else if (achievement.id === "valedictorian") {
          if (totalLessonsCount > 0 && completedLessons >= totalLessonsCount) {
            currentProgress = 100;
          } else if (totalLessonsCount > 0) {
            currentProgress = Math.min(99, (completedLessons / totalLessonsCount) * 100);
          }
        }
        break;

      case "balance":
        if (achievement.id === "starter") {
          currentProgress = balance >= 6000 ? 100 : Math.min(99, (balance / 6000) * 100);
        } else if (achievement.id === "growing") {
          currentProgress = balance >= 10000 ? 100 : Math.min(99, (balance / 10000) * 100);
        } else if (achievement.id === "wealthy") {
          currentProgress = balance >= 15000 ? 100 : Math.min(99, (balance / 15000) * 100);
        } else if (achievement.id === "rich") {
          currentProgress = balance >= 25000 ? 100 : Math.min(99, (balance / 25000) * 100);
        } else if (achievement.id === "elite") {
          currentProgress = balance >= 50000 ? 100 : Math.min(99, (balance / 50000) * 100);
        }
        break;

      case "social":
        if (achievement.id === "public-profile") {
          currentProgress = user.bio ? 100 : 0;
        } else if (achievement.id === "picture-perfect") {
          currentProgress = user.avatarUrl ? 100 : 0;
        } else if (achievement.id === "top-100") {
          currentProgress = (userRank > 0 && userRank <= 100) ? 100 : 0;
        } else if (achievement.id === "top-50") {
          currentProgress = (userRank > 0 && userRank <= 50) ? 100 : 0;
        } else if (achievement.id === "top-25") {
          currentProgress = (userRank > 0 && userRank <= 25) ? 100 : 0;
        }
        break;

      case "milestone":
        if (achievement.id === "early-bird") {
          currentProgress = 100;
        } else if (achievement.id === "premium-member") {
          currentProgress = user.subscriptionId ? 100 : 0;
        } else if (achievement.id === "top-10") {
          currentProgress = (userRank > 0 && userRank <= 10) ? 100 : 0;
        }
        break;
    }

    shouldUnlock = currentProgress >= 100;
    const roundedProgress = Math.round(currentProgress);

    if (existingUa) {
      if (roundedProgress > (existingUa.progress ?? 0)) {
        await storage.updateUserAchievement(existingUa.id, {
          progress: roundedProgress,
          unlockedAt: shouldUnlock ? new Date() : null,
        });
        if (shouldUnlock) {
          xpEarned += achievement.xpReward;
        }
      }
    } else if (roundedProgress > 0) {
      await storage.createUserAchievement({
        userId: userId,
        achievementId: achievement.id,
        progress: roundedProgress,
        unlockedAt: shouldUnlock ? new Date() : null,
      });
      if (shouldUnlock) {
        xpEarned += achievement.xpReward;
      }
    }
  }

  if (xpEarned > 0) {
    await storage.updateUser(userId, {
      xp: (user.xp ?? 0) + xpEarned,
    });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Setup WebSocket for real-time chat
  setupWebSocket(httpServer);
  
  // Session setup
  const isProduction = process.env.NODE_ENV === "production";
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "12digits-secret-key-change-in-prod",
      resave: false,
      saveUninitialized: false,
      store: new pgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: isProduction,
        sameSite: isProduction ? "lax" : "lax",
        httpOnly: true,
      },
      proxy: isProduction,
    })
  );
  
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "identifier" },
      async (identifier, password, done) => {
        try {
          let user = await storage.getUserByEmail(identifier);
          if (!user) {
            const byUsername = await storage.getUserByUsername(identifier);
            if (byUsername) user = byUsername;
          }
          if (!user) {
            return done(null, false, { message: "Invalid email, username, or password" });
          }
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email, username, or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user as User)?.role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  const requireTeacher = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (req.isAuthenticated() && (user?.role === "teacher" || user?.role === "admin")) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  async function seedMarketInsights() {
    const count = await storage.getMarketInsightsCount();
    if (count >= 5) return;
    const insights = [
      { title: "Federal Reserve Policy Shift", summary: "The Fed's pivot signals potential rate cuts ahead, historically favorable for equities and rate-sensitive sectors like tech and real estate.", sector: "policy", sentiment: "bullish" },
      { title: "AI Sector Momentum", summary: "AI infrastructure spending accelerates, creating multi-year tailwinds for chipmakers and cloud providers, though elevated valuations require selective stock-picking.", sector: "sector", sentiment: "bullish" },
      { title: "Oil Market Supply Tension", summary: "OPEC+ cuts provide a price floor around $75-80/bbl for Brent crude while geopolitical risks and Chinese demand remain key variables.", sector: "commodities", sentiment: "neutral" },
      { title: "Bitcoin Halving Cycle", summary: "The fourth halving and growing institutional adoption via spot ETFs create a favorable demand-supply dynamic, though regulatory uncertainty adds volatility risk.", sector: "crypto", sentiment: "bullish" },
      { title: "Emerging Markets Divergence", summary: "India outperforms on domestic growth while China struggles with property debt; selective EM exposure beats broad index funds in this environment.", sector: "macro", sentiment: "neutral" },
      { title: "European Recession Risk", summary: "Eurozone stagnation persists as Germany contracts for a second year; ECB easing ahead of the Fed may compress the euro but benefit USD-revenue exporters.", sector: "macro", sentiment: "bearish" },
      { title: "Healthcare Innovation Wave", summary: "GLP-1 drugs and next-gen gene therapies are driving a healthcare renaissance with defensive growth characteristics and a projected $150B anti-obesity market by 2030.", sector: "sector", sentiment: "bullish" },
      { title: "Bond Market Signals", summary: "The prolonged yield curve inversion may normalize as the Fed cuts rates, positioning long-duration Treasuries for strong total returns in a risk-off scenario.", sector: "macro", sentiment: "neutral" },
      { title: "Small Cap Opportunity", summary: "The Russell 2000 trades at its widest discount to the S&P 500 in decades; rate cuts could unlock significant outperformance in this rate-sensitive cohort.", sector: "technical", sentiment: "bullish" },
      { title: "Corporate Earnings Resilience", summary: "S&P 500 margins remain above pre-pandemic norms despite compression fears, with earnings breadth broadening beyond the Magnificent Seven mega-caps.", sector: "macro", sentiment: "bullish" },
      { title: "Uranium Bull Market", summary: "Nuclear energy's policy tailwind and a severely undersupplied long-term contract market are driving uranium prices to multi-year highs with leveraged upside in miners.", sector: "commodities", sentiment: "bullish" },
      { title: "Consumer Spending Bifurcation", summary: "High-income consumers drive luxury and travel spending while lower-income households face rising credit delinquencies, rewarding premium and value brands over mid-tier.", sector: "macro", sentiment: "neutral" },
      { title: "Japanese Equity Breakout", summary: "Corporate governance reforms and yen weakness push Japanese equities to 30-year highs, though BOJ normalization risk and yen appreciation could weigh on exporters.", sector: "macro", sentiment: "bullish" },
      { title: "Cyber Security Spending Acceleration", summary: "AI-driven attacks force non-discretionary security budget increases; cloud-native platforms are taking share from legacy hardware in a structurally growing market.", sector: "sector", sentiment: "bullish" },
      { title: "Real Estate Market Reset", summary: "Elevated office vacancies and rate-locked homeowners suppress CRE values and transaction volume; meaningful rate declines could unlock significant pent-up residential demand.", sector: "macro", sentiment: "bearish" },
    ];
    for (const insight of insights) {
      await storage.createMarketInsight({ ...insight, isPublished: true });
    }
  }

  // Ensure admin exists and seed achievements
  await ensureAdminUser();
  await seedPromoCodes();
  await seedAchievements();
  await seedMarketInsights();

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const user = await storage.createUser(data);
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        const { password: _, ...safeUser } = user;
        res.json({ user: safeUser });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { identifier, email, password } = req.body;
      const lookup = identifier || email;
      if (!lookup || !password) {
        return res.status(400).json({ message: "Email/username and password are required" });
      }
      let user = await storage.getUserByEmail(lookup);
      if (!user) {
        user = await storage.getUserByUsername(lookup);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid email, username, or password" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email, username, or password" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user!;
        res.json({ user: safeUser });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = req.user as User;
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // Lessons routes
  app.get("/api/lessons", async (req, res) => {
    const allLessons = await storage.getLessons();
    res.json(allLessons);
  });

  app.get("/api/lessons/progress", requireAuth, async (req, res) => {
    const user = req.user as User;
    const progress = await storage.getLessonProgress(user.id);
    res.json(progress);
  });

  app.get("/api/lessons/:id", async (req, res) => {
    const lesson = await storage.getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    res.json(lesson);
  });

  app.post("/api/lessons/:id/progress", requireAuth, async (req, res) => {
    const user = req.user as User;
    const { completed } = req.body;
    await storage.updateLessonProgress(user.id, req.params.id, completed);
    if (completed) {
      await checkAndAwardAchievements(user.id);
      // Auto-award classroom currency for lesson completion
      try {
        const studentClasses = await storage.getClassesByStudent(user.id);
        for (const cls of studentClasses) {
          const settings = await storage.getEconomySettings(cls.id);
          if (settings && settings.isActive && settings.lessonReward > 0) {
            await storage.addCurrencyTransaction({ classId: cls.id, studentId: user.id, amount: settings.lessonReward, type: "lesson", description: "Completed a lesson", referenceId: req.params.id });
          }
        }
      } catch {}
    }
    res.json({ success: true });
  });

  // Lesson Notes
  app.get("/api/lessons/:id/notes", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const notes = await storage.getLessonNotes(user.id, req.params.id);
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lessons/:id/notes", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Note content is required" });
      const note = await storage.createLessonNote(user.id, req.params.id, content.trim());
      res.json(note);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/lessons/:lessonId/notes/:noteId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Note content is required" });
      const note = await storage.updateLessonNote(user.id, req.params.noteId, content.trim());
      if (!note) return res.status(404).json({ message: "Note not found" });
      res.json(note);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/lessons/:lessonId/notes/:noteId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.deleteLessonNote(user.id, req.params.noteId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lessons/:id/complete", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const lesson = await storage.getLessonById(req.params.id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });

      // Base XP scales with lesson difficulty
      const diff = (lesson.difficulty || "beginner").toLowerCase();
      const baseXp = diff === "advanced" ? 30 : diff === "intermediate" ? 20 : 15;

      const result = await storage.completeLessonAndAward(user.id, req.params.id, baseXp);
      await checkAndAwardAchievements(user.id);

      // Award classroom currency in school context
      try {
        const studentClasses = await storage.getClassesByStudent(user.id);
        for (const cls of studentClasses) {
          const settings = await storage.getEconomySettings(cls.id);
          if (settings && settings.isActive && settings.lessonReward > 0 && result.isNewCompletion) {
            await storage.addCurrencyTransaction({ classId: cls.id, studentId: user.id, amount: settings.lessonReward, type: "lesson", description: "Completed a lesson", referenceId: req.params.id });
          }
        }
      } catch {}

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/lessons/:id/quiz", requireAuth, async (req, res) => {
    try {
      const quiz = await storage.getQuizByLessonId(req.params.id);
      if (!quiz) return res.status(404).json({ message: "No quiz for this lesson" });
      const user = req.user as User;
      const best = await storage.getBestQuizAttempt(user.id, req.params.id);
      res.json({ quiz, bestAttempt: best || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lessons/:id/quiz/attempt", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { score, total, comboMultiplier = 1, timeBonus = 0, bestCombo = 0 } = req.body;

      const result = await storage.awardQuizXp(user.id, req.params.id, score, total, comboMultiplier, timeBonus);

      // Track best combo
      if (bestCombo && bestCombo > (user.comboBest ?? 0)) {
        await storage.updateUser(user.id, { comboBest: bestCombo });
      }

      // Auto-award classroom currency for passing a quiz (>= 60%)
      if (result.passed) {
        try {
          const studentClasses = await storage.getClassesByStudent(user.id);
          for (const cls of studentClasses) {
            const settings = await storage.getEconomySettings(cls.id);
            if (settings && settings.isActive && settings.quizReward > 0) {
              await storage.addCurrencyTransaction({ classId: cls.id, studentId: user.id, amount: settings.quizReward, type: "quiz", description: `Passed a quiz (${score}/${total})`, referenceId: req.params.id });
            }
          }
        } catch {}
      }

      await checkAndAwardAchievements(user.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Daily Challenges
  app.get("/api/academy/daily-challenges", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const data = await storage.getDailyChallenges(user.id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/academy/daily-challenges/:id/claim", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.claimChallenge(user.id, req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Learning stats
  app.get("/api/academy/assignments", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const items = await storage.getStudentLessonAssignments(user.id);
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/academy/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const stats = await storage.getLearningStats(user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lucky bonus
  app.get("/api/academy/lucky-bonus", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const status = await storage.getLuckyBonusStatus(user.id);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/academy/lucky-bonus/claim", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.claimLuckyBonus(user.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/price-alerts", requireAuth, async (req, res) => {
    const user = req.user as User;
    const alerts = await storage.getPriceAlertsByUser(user.id);
    res.json(alerts);
  });

  app.post("/api/price-alerts", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const alert = await storage.createPriceAlert({ ...req.body, userId: user.id });
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/price-alerts/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.deletePriceAlert(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schools", async (req, res) => {
    try {
      const allSchools = await storage.getSchools();
      res.json(allSchools.map(s => ({ id: s.id, name: s.name })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Trades routes
  app.get("/api/trades/limits", requireAuth, async (req, res) => {
    const user = req.user as User;
    const DEMO_DAILY_TRADE_LIMIT = 5;
    const isTrialUser = user.membershipStatus !== "active" && user.role !== "admin";
    
    if (!isTrialUser) {
      return res.json({ isLimited: false, remaining: -1, limit: -1 });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const lastTradeDate = user.lastTradeDate || "";
    let dailyCount = user.dailyTradesCount ?? 0;
    
    // Reset count if it's a new day
    if (lastTradeDate !== today) {
      dailyCount = 0;
    }
    
    res.json({
      isLimited: true,
      remaining: Math.max(0, DEMO_DAILY_TRADE_LIMIT - dailyCount),
      limit: DEMO_DAILY_TRADE_LIMIT,
      used: dailyCount
    });
  });

  app.get("/api/trades", requireAuth, async (req, res) => {
    const user = req.user as User;
    if (req.query.open) {
      // Return both open and pending trades for the active trades view
      const activeTrades = await storage.getAllActiveTrades(user.id);
      res.json(activeTrades);
    } else if (req.query.pending) {
      const pendingTrades = await storage.getPendingTrades(user.id);
      res.json(pendingTrades);
    } else {
      const allTrades = await storage.getTradesByUser(user.id);
      res.json(allTrades);
    }
  });

  app.post("/api/trades", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.isFrozen) {
        return res.status(403).json({ message: "Your trading account has been frozen by an admin." });
      }
      const { orderType = "market", triggerPrice, stopLossPrice, takeProfitPrice, trailingPercent, ...rest } = req.body;
      
      // Validate order type
      const validOrderTypes = ["market", "limit", "stop", "stop_loss", "take_profit", "trailing_stop", "oco"];
      if (!validOrderTypes.includes(orderType)) {
        return res.status(400).json({ message: "Invalid order type" });
      }
      
      // Determine status based on order type
      const isMarketOrder = orderType === "market";
      const status = isMarketOrder ? "open" : "pending";
      
      // Validate trigger prices for non-market orders
      if (!isMarketOrder) {
        if (orderType === "limit" || orderType === "stop") {
          if (!triggerPrice || triggerPrice <= 0) {
            return res.status(400).json({ message: "Trigger price is required for limit/stop orders" });
          }
        }
        if (orderType === "stop_loss" && (!stopLossPrice || stopLossPrice <= 0)) {
          return res.status(400).json({ message: "Stop loss price is required" });
        }
        if (orderType === "take_profit" && (!takeProfitPrice || takeProfitPrice <= 0)) {
          return res.status(400).json({ message: "Take profit price is required" });
        }
        if (orderType === "trailing_stop" && (!trailingPercent || trailingPercent <= 0 || trailingPercent > 50)) {
          return res.status(400).json({ message: "Trailing percent must be between 0 and 50" });
        }
        if (orderType === "oco") {
          if (!stopLossPrice || !takeProfitPrice || stopLossPrice <= 0 || takeProfitPrice <= 0) {
            return res.status(400).json({ message: "Both stop loss and take profit prices are required for OCO orders" });
          }
        }
      }
      
      const data = insertTradeSchema.parse({ 
        ...rest, 
        userId: user.id,
        orderType,
        status,
        triggerPrice: triggerPrice || null,
        stopLossPrice: stopLossPrice || null,
        takeProfitPrice: takeProfitPrice || null,
        trailingPercent: trailingPercent || null,
        trailingHighPrice: orderType === "trailing_stop" ? rest.entryPrice : null,
      });
      
      // Check if user is on trial (demo) and enforce trade limits
      const DEMO_DAILY_TRADE_LIMIT = 5;
      const isTrialUser = user.membershipStatus !== "active" && user.role !== "admin";
      
      if (isTrialUser) {
        const today = new Date().toISOString().split('T')[0];
        const lastTradeDate = user.lastTradeDate || "";
        let dailyCount = user.dailyTradesCount ?? 0;
        
        // Reset count if it's a new day
        if (lastTradeDate !== today) {
          dailyCount = 0;
        }
        
        if (dailyCount >= DEMO_DAILY_TRADE_LIMIT) {
          return res.status(400).json({ 
            message: `Demo accounts are limited to ${DEMO_DAILY_TRADE_LIMIT} trades per day. Upgrade to Casual or Premium for unlimited trades!`,
            tradeLimitReached: true
          });
        }
        
        // Update trade count
        await storage.updateUser(user.id, {
          dailyTradesCount: dailyCount + 1,
          lastTradeDate: today
        });
      }
      
      // Check if user has enough balance (for market orders that execute immediately)
      // With leverage, you only need margin = position_value / leverage
      if (isMarketOrder) {
        const positionValue = data.quantity * data.entryPrice;
        const leverageMultiplier = data.leverage ?? 1;
        const requiredMargin = positionValue / leverageMultiplier;
        if ((user.simulatorBalance ?? 5000) < requiredMargin) {
          return res.status(400).json({ message: "Insufficient balance" });
        }
      }

      const trade = await storage.createTrade(data);
      
      // Check and award achievements after creating a trade
      await checkAndAwardAchievements(user.id);
      
      res.json(trade);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/trades/:id/close", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const { exitPrice } = req.body;

      // Lock check to prevent double closing/double profit exploit
      const existingTrade = await storage.getTradeById(id);
      if (!existingTrade || existingTrade.userId !== user.id || existingTrade.status !== "open") {
        return res.status(400).json({ message: "Trade not found, already closed, or unauthorized" });
      }

      const trade = await storage.closeTrade(id, exitPrice);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      // Check and award achievements after closing a trade
      // Non-blocking for performance
      checkAndAwardAchievements(user.id).catch(console.error);

      // Award / deduct League Points based on trade P&L (non-blocking)
      Promise.resolve().then(async () => {
        try {
          const profit = trade.profit ?? 0;
          const entryValue = (trade.quantity ?? 0) * (trade.entryPrice ?? 0);
          if (entryValue <= 0) return;
          const profitPct = (profit / entryValue) * 100;
          if (profit > 0) {
            const rr = trade.stopLoss && trade.takeProfit
              ? Math.abs((trade.takeProfit - trade.entryPrice) / (trade.entryPrice - trade.stopLoss))
              : 1;
            let lp = Math.min(50, Math.max(5, Math.floor(profitPct * 3)));
            if (rr >= 2) lp += 20; // discipline bonus
            await storage.awardLP(user.id, lp);
          } else if (profit < 0) {
            const lp = Math.min(30, Math.max(3, Math.floor(Math.abs(profitPct) * 2)));
            await storage.awardLP(user.id, -lp);
          }
        } catch (_) {}
      });
      
      res.json(trade);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/trades/:id/cancel", requireAuth, async (req, res) => {
    try {
      const existingTrade = await storage.getTradeById(req.params.id);
      if (!existingTrade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      if (existingTrade.status !== "pending") {
        return res.status(400).json({ message: "Only pending orders can be cancelled" });
      }
      const trade = await storage.cancelTrade(req.params.id);
      res.json(trade);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Per-user rate limit for check-triggers (prevents refresh exploit)
  const checkTriggersLastCall = new Map<string, number>();

  // Price monitoring endpoint - checks and executes pending orders based on current prices
  app.post("/api/trades/check-triggers", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { prices: clientPrices } = req.body as { prices: Record<string, number> };

      // Rate limit: ignore calls within 5 seconds of the last one for this user
      const now = Date.now();
      const lastCall = checkTriggersLastCall.get(user.id) ?? 0;
      if (now - lastCall < 5000) {
        return res.json({ executed: 0, closed: 0, executedTrades: [], closedTrades: [], rateLimited: true });
      }
      checkTriggersLastCall.set(user.id, now);

      // Always use server-authoritative prices for trigger evaluation.
      // Client prices are only used as a fallback for symbols the server doesn't track.
      const serverPrices = await storage.getSimulatedPrices();
      const prices: Record<string, number> = { ...clientPrices };
      for (const [symbol, serverPrice] of Object.entries(serverPrices)) {
        prices[symbol] = serverPrice; // server price always wins
      }

      if (!prices || typeof prices !== 'object') {
        return res.status(400).json({ message: "Prices object is required" });
      }

      const pendingTrades = await storage.getPendingTrades(user.id);
      const openTrades = await storage.getOpenTrades(user.id);
      const executedTrades: Trade[] = [];
      const closedTrades: Trade[] = [];

      // Check pending orders for execution
      for (const trade of pendingTrades) {
        const currentPrice = prices[trade.symbol];
        if (currentPrice === undefined) continue;

        let shouldExecute = false;

        switch (trade.orderType) {
          case "limit":
            // Limit buy: execute when price drops to or below trigger
            // Limit sell: execute when price rises to or above trigger
            if (trade.type === "buy" && trade.triggerPrice && currentPrice <= trade.triggerPrice) {
              shouldExecute = true;
            } else if (trade.type === "sell" && trade.triggerPrice && currentPrice >= trade.triggerPrice) {
              shouldExecute = true;
            }
            break;

          case "stop":
            // Stop buy: execute when price rises to or above trigger
            // Stop sell: execute when price drops to or below trigger
            if (trade.type === "buy" && trade.triggerPrice && currentPrice >= trade.triggerPrice) {
              shouldExecute = true;
            } else if (trade.type === "sell" && trade.triggerPrice && currentPrice <= trade.triggerPrice) {
              shouldExecute = true;
            }
            break;

          case "stop_loss":
          case "take_profit":
          case "trailing_stop":
            // These orders open immediately at current price, then monitor for exit
            shouldExecute = true;
            break;

          case "oco":
            // OCO opens immediately, then monitors for SL or TP exit
            shouldExecute = true;
            break;
        }

        if (shouldExecute) {
          // Execute the pending order - set status to open, use stored entryPrice or current price
          const entryPriceToUse = trade.entryPrice > 0 ? trade.entryPrice : currentPrice;
          const executedTrade = await storage.updateTrade(trade.id, {
            status: "open",
            entryPrice: entryPriceToUse,
            trailingHighPrice: trade.orderType === "trailing_stop" ? entryPriceToUse : trade.trailingHighPrice,
          });
          if (executedTrade) {
            executedTrades.push(executedTrade);
          }
        }
      }

      // Check open trades for exit conditions (SL, TP, trailing stop, OCO)
      const allOpenTrades = [...openTrades, ...executedTrades.filter(t => t.status === "open")];
      
      for (const trade of allOpenTrades) {
        const currentPrice = prices[trade.symbol];
        if (currentPrice === undefined) continue;

        let shouldClose = false;
        let exitReason = "";

        // Check stop loss
        if (trade.stopLossPrice) {
          if (trade.type === "buy" && currentPrice <= trade.stopLossPrice) {
            shouldClose = true;
            exitReason = "stop_loss";
          } else if (trade.type === "sell" && currentPrice >= trade.stopLossPrice) {
            shouldClose = true;
            exitReason = "stop_loss";
          }
        }

        // Check take profit
        if (!shouldClose && trade.takeProfitPrice) {
          if (trade.type === "buy" && currentPrice >= trade.takeProfitPrice) {
            shouldClose = true;
            exitReason = "take_profit";
          } else if (trade.type === "sell" && currentPrice <= trade.takeProfitPrice) {
            shouldClose = true;
            exitReason = "take_profit";
          }
        }

        // Check trailing stop
        if (!shouldClose && trade.trailingPercent && trade.trailingHighPrice) {
          if (trade.type === "buy") {
            // For buy trades: track highest price, stop triggers when price drops by trailingPercent from high
            if (currentPrice > trade.trailingHighPrice) {
              // Price went higher, update the trailing high
              await storage.updateTrade(trade.id, { trailingHighPrice: currentPrice });
            } else {
              // Check if price has dropped enough to trigger stop
              const trailingStopPrice = trade.trailingHighPrice * (1 - trade.trailingPercent / 100);
              if (currentPrice <= trailingStopPrice) {
                shouldClose = true;
                exitReason = "trailing_stop";
              }
            }
          } else {
            // For sell trades: track lowest price, stop triggers when price rises by trailingPercent from low
            if (currentPrice < trade.trailingHighPrice) {
              // Price went lower, update the trailing low
              await storage.updateTrade(trade.id, { trailingHighPrice: currentPrice });
            } else {
              // Check if price has risen enough to trigger stop
              const trailingStopPrice = trade.trailingHighPrice * (1 + trade.trailingPercent / 100);
              if (currentPrice >= trailingStopPrice) {
                shouldClose = true;
                exitReason = "trailing_stop";
              }
            }
          }
        }

        if (shouldClose) {
          const closedTrade = await storage.closeTrade(trade.id, currentPrice);
          if (closedTrade) {
            closedTrades.push(closedTrade);
          }
        }
      }

      res.json({
        executed: executedTrades.length,
        closed: closedTrades.length,
        executedTrades,
        closedTrades,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio", requireAuth, async (req, res) => {
    const user = req.user as User;
    const portfolio = await storage.getPortfolio(user.id);
    res.json(portfolio);
  });

  app.post("/api/portfolio", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const data = insertPortfolioItemSchema.parse({ ...req.body, userId: user.id });
      const item = await storage.createPortfolioItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/portfolio/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.updatePortfolioItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Portfolio item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/portfolio/:id", requireAuth, async (req, res) => {
    await storage.deletePortfolioItem(req.params.id);
    res.json({ success: true });
  });

  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    const scope = req.query.scope as string | undefined;
    const userId = req.user?.id;
    const leaderboard = await storage.getLeaderboard(scope, userId);
    const safeLeaderboard = leaderboard.map(({ password, ...user }) => user);
    res.json(safeLeaderboard);
  });

  // Stock quotes using Finnhub API
  app.get("/api/stocks/quote/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const apiKey = process.env.FINNHUB_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ message: "Finnhub API key not configured" });
      }

      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Finnhub API returned ${response.status}`);
      }

      const data = await response.json();
      
      // Finnhub returns: c (current), d (change), dp (percent change), h (high), l (low), o (open), pc (prev close)
      if (data.c === 0 && data.d === null) {
        return res.status(404).json({ message: "Symbol not found or no data available" });
      }

      res.json({
        symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stock quote" });
    }
  });

  // Batch stock quotes for multiple symbols
  app.post("/api/stocks/quotes", async (req, res) => {
    try {
      const { symbols } = req.body;
      const apiKey = process.env.FINNHUB_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ message: "Finnhub API key not configured" });
      }

      if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ message: "symbols array is required" });
      }

      // Limit to prevent abuse
      const limitedSymbols = symbols.slice(0, 15);
      
      const quotes = await Promise.all(
        limitedSymbols.map(async (symbol: string) => {
          try {
            const response = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
            );
            
            if (!response.ok) {
              return { symbol, error: true };
            }

            const data = await response.json();
            
            if (data.c === 0 && data.d === null) {
              return { symbol, error: true };
            }

            return {
              symbol,
              price: data.c,
              change: data.d,
              changePercent: data.dp,
              high: data.h,
              low: data.l,
              open: data.o,
              previousClose: data.pc,
            };
          } catch {
            return { symbol, error: true };
          }
        })
      );

      res.json(quotes);

      // Background: Check price alerts
      try {
        const activeAlerts = await storage.getActivePriceAlerts();
        if (activeAlerts.length > 0) {
          for (const quote of quotes) {
            if (quote.error) continue;
            
            const relevantAlerts = activeAlerts.filter(a => a.symbol === quote.symbol);
            for (const alert of relevantAlerts) {
              let isTriggered = false;
              if (alert.direction === "above" && quote.price >= alert.targetPrice) {
                isTriggered = true;
              } else if (alert.direction === "below" && quote.price <= alert.targetPrice) {
                isTriggered = true;
              }

              if (isTriggered) {
                await storage.triggerPriceAlert(alert.id);
                await storage.createNotification({
                  userId: alert.userId,
                  type: "price_alert",
                  title: `Price Alert: ${alert.symbol}`,
                  message: `${alert.symbol} has gone ${alert.direction} $${alert.targetPrice} (Current: $${quote.price})`,
                  data: { symbol: alert.symbol, price: quote.price, alertId: alert.id },
                  isRead: false
                });
              }
            }
          }
        }
      } catch (alertError) {
        console.error("Error checking price alerts:", alertError);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stock quotes" });
    }
  });

  // Admin routes
  app.get("/api/admin/lessons", requireAdmin, async (req, res) => {
    const allLessons = await storage.getLessons();
    res.json(allLessons);
  });

  app.post("/api/admin/lessons", requireAdmin, async (req, res) => {
    try {
      const data = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(data);
      res.json(lesson);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    try {
      const lesson = await storage.updateLesson(req.params.id, req.body);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/quizzes/:lessonId", requireAdmin, async (req, res) => {
    try {
      const quiz = await storage.getQuizByLessonId(req.params.lessonId);
      res.json(quiz || null);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.post("/api/admin/quizzes", requireAdmin, async (req, res) => {
    try {
      const { lessonId, questions } = req.body;
      const existing = await storage.getQuizByLessonId(lessonId);
      if (existing) {
        const updated = await storage.updateQuiz(existing.id, { questions });
        return res.json(updated);
      }
      const quiz = await storage.createQuiz({ lessonId, questions });
      res.json(quiz);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.delete("/api/admin/quizzes/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteQuiz(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.delete("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    await storage.deleteLesson(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    const [usersCount, lessonsCount, tradesCount] = await Promise.all([
      storage.getUsersCount(),
      storage.getLessonsCount(),
      storage.getTotalTradesCount(),
    ]);
    res.json({ users: usersCount, lessons: lessonsCount, trades: tradesCount });
  });

  app.get("/api/admin/db-storage", requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          pg_database_size(current_database()) AS used_bytes,
          pg_size_pretty(pg_database_size(current_database())) AS used_pretty
      `);
      const usedBytes = parseInt(result.rows[0].used_bytes, 10);
      res.json({ usedBytes, usedPretty: result.rows[0].used_pretty });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Admin Balance Management ────────────────────────────────────────────────
  app.get("/api/admin/users-list", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/admin/users/:id/reset-balance", requireAdmin, async (req, res) => {
    try {
      const amount = typeof req.body.amount === "number" ? req.body.amount : 10000;
      await storage.resetUserBalance(req.params.id, amount);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/admin/users/:id/set-balance", requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      if (typeof amount !== "number" || amount < 0) return res.status(400).json({ message: "Invalid amount" });
      await storage.updateUser(req.params.id, { simulatorBalance: amount });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/admin/reset-all-balances", requireAdmin, async (req, res) => {
    try {
      const amount = typeof req.body.amount === "number" ? req.body.amount : 10000;
      await storage.resetAllBalances(amount);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/admin/close-open-trades", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      const count = userId
        ? await storage.closeAllOpenTradesForUser(userId)
        : await storage.closeAllOpenTrades();
      res.json({ success: true, closedCount: count });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Teacher routes
  app.get("/api/teacher/students", requireTeacher, async (req, res) => {
    const user = req.user as User;
    const students = await storage.getStudentsByTeacher(user.id);
    const safeStudents = students.map(({ password, ...s }) => s);
    res.json(safeStudents);
  });

  app.post("/api/teacher/students", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const { email } = req.body;
      const student = await storage.getUserByEmail(email);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      await storage.updateUser(student.id, { teacherId: user.id });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/teacher/assignments", requireTeacher, async (req, res) => {
    const user = req.user as User;
    const teacherAssignments = await storage.getAssignmentsByTeacher(user.id);
    res.json(teacherAssignments);
  });

  app.post("/api/teacher/assignments", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const data = insertAssignmentSchema.parse({ ...req.body, teacherId: user.id });
      const assignment = await storage.createAssignment(data);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/teacher/assignments/:id/progress", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const assignment = await storage.getAssignmentById(req.params.id);
      if (!assignment || assignment.teacherId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const explicitProgress = await storage.getAssignmentProgress(req.params.id);

      // Build a "per student" view across the assignment's class so teachers see
      // who hasn't started yet, not just who has progress rows.
      let classStudents: any[] = [];
      if (assignment.classId) {
        classStudents = await storage.getStudentsByClass(assignment.classId);
      }

      // For lesson-type assignments, infer completion from lesson progress
      const out: any[] = [];
      const seenStudentIds = new Set<string>();
      for (const s of classStudents) {
        seenStudentIds.add(s.id);
        const explicit = explicitProgress.find(p => p.studentId === s.id);
        let completed = explicit?.completed ?? false;
        let completedAt = explicit?.completedAt ?? null;
        if (!completed && assignment.type === "lesson" && assignment.lessonId) {
          const lp = await storage.getLessonProgress(s.id);
          const match = lp.find(p => p.lessonId === assignment.lessonId && p.completed);
          if (match) {
            completed = true;
            completedAt = match.completedAt ?? null;
          }
        }
        out.push({
          studentId: s.id,
          studentName: s.displayName ?? s.email,
          completed,
          completedAt,
          currentValue: explicit?.currentValue ?? 0,
        });
      }
      // Include any progress rows for students no longer in the class (defensive)
      for (const p of explicitProgress) {
        if (!seenStudentIds.has(p.studentId)) {
          out.push({ studentId: p.studentId, studentName: "(removed)", completed: p.completed ?? false, completedAt: p.completedAt, currentValue: p.currentValue ?? 0 });
        }
      }
      res.json(out);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Teacher Class Management Routes
  app.get("/api/teacher/classes", requireTeacher, async (req, res) => {
    const user = req.user as User;
    const teacherClasses = await storage.getClassesByTeacher(user.id);
    res.json(teacherClasses);
  });

  app.post("/api/teacher/classes", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const { name, description } = req.body;
      
      // Generate a random join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Get or create school for this teacher
      let school = await storage.getSchoolByAdmin(user.id);
      if (!school) {
        school = await storage.createSchool({
          name: `${user.displayName}'s School`,
          adminUserId: user.id,
        });
      }
      
      const classData = {
        schoolId: school.id,
        teacherId: user.id,
        name,
        description: description || null,
        joinCode,
      };
      
      const newClass = await storage.createClass(classData);
      res.json(newClass);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/teacher/classes/:id", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const cls = await storage.getClassById(req.params.id);
      if (!cls || cls.teacherId !== user.id) {
        return res.status(403).json({ message: "Not authorized to delete this class" });
      }
      await storage.deleteClass(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/teacher/classes/:id/students", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const cls = await storage.getClassById(req.params.id);
      if (!cls || cls.teacherId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const students = await storage.getStudentsByClass(req.params.id);
      
      // Get progress data for each student
      const studentsWithProgress = await Promise.all(students.map(async (student) => {
        const progress = await storage.getLessonProgress(student.id);
        const trades = await storage.getTradesByUser(student.id);
        const completedLessons = progress.filter(p => p.completed).length;
        const totalTrades = trades.length;
        const profitableTrades = trades.filter(t => t.profit && t.profit > 0).length;
        
        return {
          id: student.id,
          displayName: student.displayName,
          email: student.email,
          avatarUrl: student.avatarUrl,
          lessonsCompleted: completedLessons,
          totalProfit: student.totalProfit ?? 0,
          simulatorBalance: student.simulatorBalance ?? 10000,
          totalTrades,
          profitableTrades,
        };
      }));
      
      res.json(studentsWithProgress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/teacher/classes/:id/students", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const cls = await storage.getClassById(req.params.id);
      if (!cls || cls.teacherId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { displayName, email } = req.body;
      
      if (!displayName || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      
      // Check if student email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      
      // Generate secure random password server-side
      const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      
      // Create student account
      const student = await storage.createUser({
        email,
        password: generatedPassword,
        displayName,
        role: "student",
        membershipTier: "school",
        membershipStatus: "active",
        teacherId: user.id,
        subscriptionId: `SCHOOL-MANAGED-${Date.now()}`,
      });
      
      // Add student to class
      await storage.addStudentToClass({
        classId: req.params.id,
        studentId: student.id,
      });
      
      res.json({ 
        success: true, 
        student: { 
          id: student.id, 
          displayName: student.displayName, 
          email: student.email,
          temporaryPassword: generatedPassword,
        } 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/teacher/classes/:classId/students/:studentId", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const cls = await storage.getClassById(req.params.classId);
      if (!cls || cls.teacherId !== user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.removeStudentFromClass(req.params.classId, req.params.studentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Classroom routes (for students)
  app.get("/api/classroom", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const classes = await storage.getClassesByStudent(user.id);
      if (!classes.length) return res.status(404).json({ message: "No class found" });
      
      const cls = classes[0];
      const teacher = await storage.getUserById(cls.teacherId);
      const classmates = await storage.getStudentsByClass(cls.id);
      
      res.json({
        class: cls,
        teacher: teacher ? { id: teacher.id, displayName: teacher.displayName } : null,
        classmates: classmates.map(c => ({ id: c.id, displayName: c.displayName, totalProfit: c.totalProfit, avatarUrl: c.avatarUrl })),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/classroom/assignments", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const classes = await storage.getClassesByStudent(user.id);
      if (!classes.length) return res.json([]);
      
      const classIds = classes.map(c => c.id);
      const allAssignments: Assignment[] = [];
      for (const classId of classIds) {
        const classAssignments = await storage.getAssignmentsByClass(classId);
        allAssignments.push(...classAssignments);
      }
      
      const studentProgress = await storage.getAssignmentProgressForStudent(user.id);
      
      const assignmentsWithProgress = allAssignments.map(assignment => {
        const progress = studentProgress.find(p => p.assignmentId === assignment.id);
        return {
          ...assignment,
          progress: progress || { completed: false, currentValue: 0 }
        };
      });
      
      res.json(assignmentsWithProgress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/classroom/assignments/:id/progress", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { currentValue, completed } = req.body;
      const progress = await storage.updateAssignmentProgress({
        assignmentId: req.params.id,
        studentId: user.id,
        currentValue: currentValue || 0,
        completed: completed || false,
        completedAt: completed ? new Date() : null,
      });
      // Auto-award currency for completing an assignment
      if (completed) {
        try {
          const studentClasses = await storage.getClassesByStudent(user.id);
          for (const cls of studentClasses) {
            const settings = await storage.getEconomySettings(cls.id);
            if (settings && settings.isActive && settings.assignmentReward > 0) {
              await storage.addCurrencyTransaction({ classId: cls.id, studentId: user.id, amount: settings.assignmentReward, type: "assignment", description: "Completed an assignment", referenceId: req.params.id });
            }
          }
        } catch {}
      }
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/classroom/join", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { joinCode } = req.body;
      if (!joinCode) return res.status(400).json({ message: "Join code is required" });
      const cls = await storage.getClassByJoinCode(joinCode.toUpperCase().trim());
      if (!cls) return res.status(404).json({ message: "Invalid join code. Please check and try again." });
      const existing = await storage.getClassesByStudent(user.id);
      if (existing.find(c => c.id === cls.id)) {
        return res.json({ class: cls, alreadyEnrolled: true });
      }
      await storage.addStudentToClass({ classId: cls.id, studentId: user.id });
      await storage.updateUser(user.id, { teacherId: cls.teacherId, membershipTier: "school", membershipStatus: "active" });
      res.json({ class: cls, alreadyEnrolled: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/classroom/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role === "teacher" || user.role === "admin") {
        const teacherClasses = await storage.getClassesByTeacher(user.id);
        const classId = req.query.classId as string | undefined;
        if (classId) {
          const events = await storage.getClassroomEvents(classId);
          return res.json(events);
        }
        const allEvents = [];
        for (const cls of teacherClasses) {
          const events = await storage.getClassroomEvents(cls.id);
          allEvents.push(...events);
        }
        return res.json(allEvents);
      }
      const classStudent = await storage.getClassesByStudent(user.id);
      if (!classStudent.length) return res.json([]);
      const events = await storage.getClassroomEvents(classStudent[0].id);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/classroom/events", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "teacher" && user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
      const { classId, type, title, description } = req.body;
      const event = await storage.createClassroomEvent({ classId, teacherId: user.id, type, title, description });
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/classroom/events/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "teacher" && user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
      await storage.deleteClassroomEvent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/classroom/chat", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        classId = req.query.classId as string;
        if (!classId) {
          const teacherClasses = await storage.getClassesByTeacher(user.id);
          classId = teacherClasses[0]?.id;
        }
      } else {
        const studentClasses = await storage.getClassesByStudent(user.id);
        classId = studentClasses[0]?.id;
      }
      if (!classId) return res.json([]);
      const messages = await storage.getClassGroupMessages(classId, 200);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/classroom/chat", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content, messageType, classId: reqClassId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message cannot be empty" });
      let classId = reqClassId;
      if (!classId) {
        if (user.role === "teacher" || user.role === "admin") {
          const teacherClasses = await storage.getClassesByTeacher(user.id);
          classId = teacherClasses[0]?.id;
        } else {
          const studentClasses = await storage.getClassesByStudent(user.id);
          classId = studentClasses[0]?.id;
        }
      }
      if (!classId) return res.status(400).json({ message: "No classroom found" });
      const type = (user.role === "teacher" || user.role === "admin") && messageType === "announcement" ? "announcement" : "message";
      const msg = await storage.createClassGroupMessage({ classId, senderId: user.id, content: content.trim(), messageType: type });
      const sender = await storage.getUserById(user.id);
      res.json({ ...msg, senderName: sender?.displayName ?? "Unknown", senderRole: user.role });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/classroom/chat/unread", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        const teacherClasses = await storage.getClassesByTeacher(user.id);
        classId = teacherClasses[0]?.id;
      } else {
        const studentClasses = await storage.getClassesByStudent(user.id);
        classId = studentClasses[0]?.id;
      }
      if (!classId) return res.json({ count: 0 });
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await storage.getClassGroupMessageCount(classId, since);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Edit a class chat message (own messages only)
  app.put("/api/classroom/chat/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const updated = await storage.editClassGroupMessage(req.params.id, user.id, content.trim());
      if (!updated) return res.status(403).json({ message: "Cannot edit this message" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete a class chat message (own messages only)
  app.delete("/api/classroom/chat/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const ok = await storage.deleteClassGroupMessage(req.params.id, user.id);
      if (!ok) return res.status(403).json({ message: "Cannot delete this message" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Group Chats
  app.get("/api/group-chats", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId = req.query.classId as string | undefined;
      if (!classId) {
        if (user.role === "teacher" || user.role === "admin") {
          const tc = await storage.getClassesByTeacher(user.id);
          classId = tc[0]?.id;
        } else {
          const sc = await storage.getClassesByStudent(user.id);
          classId = sc[0]?.id;
        }
      }
      if (!classId) return res.json([]);
      const chats = await storage.getGroupChats(classId, user.id);
      res.json(chats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/group-chats", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { name, memberIds, classId: reqClassId } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Group name required" });
      let classId = reqClassId;
      if (!classId) {
        if (user.role === "teacher" || user.role === "admin") {
          const tc = await storage.getClassesByTeacher(user.id);
          classId = tc[0]?.id;
        } else {
          const sc = await storage.getClassesByStudent(user.id);
          classId = sc[0]?.id;
        }
      }
      if (!classId) return res.status(400).json({ message: "No class found" });
      const chat = await storage.createGroupChat({ classId, name: name.trim(), createdById: user.id }, memberIds ?? []);
      res.json(chat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/group-chats/:id/members", requireAuth, async (req, res) => {
    try {
      const members = await storage.getGroupChatMembers(req.params.id);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/group-chats/:id/members", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      await storage.addGroupChatMember(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/group-chats/:id/members/:userId", requireAuth, async (req, res) => {
    try {
      await storage.removeGroupChatMember(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/group-chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const messages = await storage.getGroupChatMessages(req.params.id, user.id, 200);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/group-chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const member = await storage.getGroupChatMembers(req.params.id);
      if (!member.find(m => m.userId === user.id)) return res.status(403).json({ message: "Not a member" });
      const msg = await storage.sendGroupChatMessage({ chatId: req.params.id, senderId: user.id, content: content.trim() });
      const sender = await storage.getUserById(user.id);
      res.json({ ...msg, senderName: sender?.displayName ?? "Unknown", senderRole: user.role });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/group-chats/:id/messages/:msgId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const updated = await storage.editGroupChatMessage(req.params.msgId, user.id, content.trim());
      if (!updated) return res.status(403).json({ message: "Cannot edit this message" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/group-chats/:id/messages/:msgId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const ok = await storage.deleteGroupChatMessage(req.params.msgId, user.id);
      if (!ok) return res.status(403).json({ message: "Cannot delete this message" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // === PIN MESSAGES ===
  app.post("/api/classroom/chat/:id/pin", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.role !== "teacher" && user.role !== "admin") return res.status(403).json({ message: "Only teachers can pin messages" });
      const { pin } = req.body;
      await storage.pinClassMessage(req.params.id, pin !== false);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/classroom/chat/pinned", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        classId = req.query.classId as string;
        if (!classId) { const cls = await storage.getClassesByTeacher(user.id); classId = cls[0]?.id; }
      } else {
        const cls = await storage.getClassesByStudent(user.id);
        classId = cls[0]?.id;
      }
      if (!classId) return res.json([]);
      const pinned = await storage.getPinnedClassMessages(classId);
      res.json(pinned);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === MESSAGE REACTIONS ===
  app.post("/api/classroom/chat/:id/react", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ message: "Emoji required" });
      const reaction = await storage.addMessageReaction({ messageId: req.params.id, userId: user.id, emoji });
      res.json(reaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/classroom/chat/:id/react", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { emoji } = req.body;
      await storage.removeMessageReaction(req.params.id, user.id, emoji);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/classroom/chat/reactions", requireAuth, async (req, res) => {
    try {
      const ids = (req.query.ids as string ?? "").split(",").filter(Boolean);
      const reactions = await storage.getMessageReactions(ids);
      res.json(reactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === GROUP CHAT REACTIONS ===
  app.post("/api/group-chats/:id/messages/:msgId/react", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ message: "Emoji required" });
      const reaction = await storage.addMessageReaction({ messageId: req.params.msgId, userId: user.id, emoji });
      res.json(reaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/group-chats/:id/messages/:msgId/react", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { emoji } = req.body;
      await storage.removeMessageReaction(req.params.msgId, user.id, emoji);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // === DIRECT MESSAGES ===
  app.get("/api/dms/conversations", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        const cls = await storage.getClassesByTeacher(user.id);
        classId = cls[0]?.id;
      } else {
        const cls = await storage.getClassesByStudent(user.id);
        classId = cls[0]?.id;
      }
      if (!classId) return res.json([]);
      const convos = await storage.getDMConversations(user.id, classId);
      res.json(convos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dms/unread", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        const cls = await storage.getClassesByTeacher(user.id);
        classId = cls[0]?.id;
      } else {
        const cls = await storage.getClassesByStudent(user.id);
        classId = cls[0]?.id;
      }
      if (!classId) return res.json({ count: 0 });
      const count = await storage.getDMUnreadCount(user.id, classId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dms/:userId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        const cls = await storage.getClassesByTeacher(user.id);
        classId = cls[0]?.id;
      } else {
        const cls = await storage.getClassesByStudent(user.id);
        classId = cls[0]?.id;
      }
      if (!classId) return res.json([]);
      await storage.markDMsRead(user.id, req.params.userId, classId);
      const messages = await storage.getDMMessages(user.id, req.params.userId, classId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dms/:userId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content, replyToId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Message cannot be empty" });
      let classId: string | undefined;
      if (user.role === "teacher" || user.role === "admin") {
        const cls = await storage.getClassesByTeacher(user.id);
        classId = cls[0]?.id;
      } else {
        const cls = await storage.getClassesByStudent(user.id);
        classId = cls[0]?.id;
      }
      if (!classId) return res.status(400).json({ message: "Not in a class" });
      const msg = await storage.sendDM({ classId, senderId: user.id, receiverId: req.params.userId, content: content.trim(), replyToId });
      res.json(msg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/dms/:userId/:msgId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      const msg = await storage.editDM(req.params.msgId, user.id, content);
      if (!msg) return res.status(403).json({ message: "Cannot edit this message" });
      res.json(msg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/dms/:userId/:msgId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const ok = await storage.deleteDM(req.params.msgId, user.id);
      if (!ok) return res.status(403).json({ message: "Cannot delete this message" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // === PRESENCE / TYPING ===
  const typingMap = new Map<string, { userId: string; name: string; expires: number }[]>();

  app.post("/api/classroom/ping", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.updateLastSeen(user.id);
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  app.post("/api/classroom/typing", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { chatId } = req.body;
      const key = chatId ?? "global";
      const now = Date.now();
      const entries = (typingMap.get(key) ?? []).filter(e => e.userId !== user.id && e.expires > now);
      entries.push({ userId: user.id, name: user.displayName, expires: now + 4000 });
      typingMap.set(key, entries);
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  app.get("/api/classroom/typing", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { chatId } = req.query;
      const key = (chatId as string) ?? "global";
      const now = Date.now();
      const entries = (typingMap.get(key) ?? []).filter(e => e.userId !== user.id && e.expires > now);
      res.json(entries.map(e => e.name));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/classroom/online", requireAuth, async (req, res) => {
    try {
      const ids = (req.query.ids as string ?? "").split(",").filter(Boolean);
      const result = await storage.getOnlineUsers(ids);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/fun-zone/leaderboard/:game", requireAuth, async (req, res) => {
    try {
      const leaderboard = await storage.getFunZoneLeaderboard(req.params.game);
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/fun-zone/score", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { game, score, tokensEarned } = req.body;
      // Server-side cap: no game can award more than 15 tokens per submission
      const MAX_TOKENS_PER_GAME = 15;
      const raw = Number(tokensEarned) || 0;
      const tokens = Math.min(MAX_TOKENS_PER_GAME, Math.max(0, raw));
      if (tokens > 0) await storage.addClassroomTokens(user.id, tokens);
      if (game) {
        const saved = await storage.saveFunZoneScore({ userId: user.id, game, score: Number(score) || 0, tokensEarned: tokens });
        return res.json(saved);
      }
      res.json({ success: true, tokensEarned: tokens });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/fun-zone/claim-simulator", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (user.membershipTier !== "school" && user.role !== "student") {
        return res.status(403).json({ message: "School members only" });
      }
      const result = await storage.claimSimulatorTokens(user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/school/shop/purchase", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { cosmeticId, cost } = req.body;
      if (!cosmeticId || typeof cost !== "number") return res.status(400).json({ message: "Invalid request" });
      const result = await storage.purchaseCosmetic(user.id, cosmeticId, cost);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/school/shop/equip", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { type, value } = req.body;
      if (!["title", "frame"].includes(type)) return res.status(400).json({ message: "Invalid type" });
      await storage.equipCosmetic(user.id, type, value ?? null);
      const updated = await storage.getUserById(user.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Global Shop (uses simulatorBalance as currency) ──────────────────────
  app.post("/api/global-shop/purchase", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { itemId, price } = req.body;
      if (!itemId || typeof price !== "number") return res.status(400).json({ message: "Invalid request" });
      const balance = user.simulatorBalance ?? 0;
      if (balance < price) return res.status(400).json({ message: "Insufficient balance" });
      const owned: string[] = (() => { try { return JSON.parse(user.purchasedCosmetics ?? "[]"); } catch { return []; } })();
      if (owned.includes(itemId)) return res.status(400).json({ message: "Already owned" });
      owned.push(itemId);
      const updated = await storage.updateUser(user.id, {
        simulatorBalance: Math.round((balance - price) * 100) / 100,
        purchasedCosmetics: JSON.stringify(owned),
      });
      res.json({ success: true, user: updated });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/global-shop/pack-open", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { packId, price } = req.body;
      if (!packId || typeof price !== "number") return res.status(400).json({ message: "Invalid request" });
      const balance = user.simulatorBalance ?? 0;
      if (balance < price) return res.status(400).json({ message: "Insufficient balance" });

      const packRewards: Record<string, string[]> = {
        "pack-starter": ["frame-silver","frame-steel","frame-mint","title-bull","title-day-trader","title-risk-taker","title-newbie","title-hodler","badge-rocket","badge-fire","badge-money"],
        "pack-trader":  ["frame-neon-blue","frame-coral","frame-teal-wave","title-bear-slayer","title-chart-wizard","title-scalper","badge-gem","badge-lightning"],
        "pack-pro":     ["frame-gold","frame-emerald","frame-rose-gold","frame-ocean-deep","title-diamond-hands","title-the-analyst","title-market-guru","title-quant","badge-dragon","badge-unicorn"],
        "pack-elite":   ["frame-fire","frame-diamond","frame-midnight","frame-aurora","title-hedge-fund","title-wolf","title-market-maker","badge-galaxy","badge-nuclear"],
        "pack-legend":  ["frame-rainbow","frame-void","frame-cosmic","title-whale","title-legend","title-oracle","badge-infinity"],
        "pack-god":     ["frame-godmode","frame-cosmic","frame-rainbow","title-god-tier","title-sovereign","title-oracle","badge-infinity"],
      };
      const pool = packRewards[packId] ?? packRewards["pack-starter"];
      const rewardId = pool[Math.floor(Math.random() * pool.length)];

      const owned: string[] = (() => { try { return JSON.parse(user.purchasedCosmetics ?? "[]"); } catch { return []; } })();
      if (!owned.includes(rewardId)) owned.push(rewardId);

      const updated = await storage.updateUser(user.id, {
        simulatorBalance: Math.round((balance - price) * 100) / 100,
        purchasedCosmetics: JSON.stringify(owned),
      });
      res.json({ success: true, rewardId, user: updated });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/global-shop/equip", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { type, value } = req.body;
      if (!["title", "frame"].includes(type)) return res.status(400).json({ message: "Invalid type" });
      await storage.equipCosmetic(user.id, type, value ?? null);
      const updated = await storage.getUserById(user.id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/fun-zone/daily-claim", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.claimDailyReward(user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const items = await storage.getInventory(user.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/shop/buy-item", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { itemId, itemType, cost } = req.body;
      if (!itemId || !itemType || typeof cost !== "number") return res.status(400).json({ message: "Invalid request" });
      const result = await storage.buyShopItem(user.id, itemId, itemType, cost);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/shop/open-bag", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { bagId, cost } = req.body;
      if (!bagId || typeof cost !== "number") return res.status(400).json({ message: "Invalid request" });
      const result = await storage.openBlindBag(user.id, bagId, cost);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/trades", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const trades = await storage.getTradeOffers(user.id);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trades/offer", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { toUserId, offeredInventoryIds, requestedInventoryIds, tokenBonus, message } = req.body;
      if (!toUserId) return res.status(400).json({ message: "Target user required" });
      if (!Array.isArray(offeredInventoryIds) && !Array.isArray(requestedInventoryIds)) {
        return res.status(400).json({ message: "Must offer or request at least one item" });
      }
      const offer = await storage.createTradeOffer(user.id, toUserId, offeredInventoryIds || [], requestedInventoryIds || [], tokenBonus || 0, message || "");
      res.json(offer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/trades/:id/respond", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { action } = req.body;
      if (!["accept", "reject", "cancel"].includes(action)) return res.status(400).json({ message: "Invalid action" });
      const result = await storage.respondToTradeOffer(req.params.id, user.id, action);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/fun-zone/token-leaderboard", requireAuth, async (req, res) => {
    try {
      const leaders = await storage.getTokenLeaderboard();
      res.json(leaders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Spin / Roulette ─────────────────────────────────────────────────
  const SPIN_COLLECTIBLES = [
    { id: "col-coin", emoji: "🪙", name: "Gold Coin", rarity: "common" },
    { id: "col-chart-up", emoji: "📈", name: "Bull Chart", rarity: "common" },
    { id: "col-piggy", emoji: "🐷", name: "Piggy Bank", rarity: "common" },
    { id: "col-notepad", emoji: "📔", name: "Trade Journal", rarity: "common" },
    { id: "col-rocket", emoji: "🚀", name: "Moon Rocket", rarity: "rare" },
    { id: "col-crown", emoji: "👑", name: "Gold Crown", rarity: "rare" },
    { id: "col-gem", emoji: "💚", name: "Emerald Gem", rarity: "rare" },
    { id: "col-lightning", emoji: "⚡", name: "Lightning Bolt", rarity: "rare" },
    { id: "col-diamond", emoji: "💎", name: "Diamond", rarity: "epic" },
    { id: "col-fire", emoji: "🔥", name: "Fire Badge", rarity: "epic" },
    { id: "col-dragon", emoji: "🐉", name: "Dragon", rarity: "epic" },
    { id: "col-unicorn", emoji: "🦄", name: "Unicorn", rarity: "legendary" },
    { id: "col-golden-bull", emoji: "🐂", name: "Golden Bull", rarity: "legendary" },
  ];

  const SPIN_TIERS: Record<string, { cost: number; weights: Record<string, number> }> = {
    basic:   { cost: 5,  weights: { "tokens_small": 40, "tokens_medium": 10, "collectible_common": 30, "collectible_rare": 15, "collectible_epic": 4, "collectible_legendary": 1 } },
    premium: { cost: 15, weights: { "tokens_small": 20, "tokens_medium": 20, "tokens_large": 5, "collectible_common": 20, "collectible_rare": 25, "collectible_epic": 8, "collectible_legendary": 2 } },
    elite:   { cost: 35, weights: { "tokens_medium": 15, "tokens_large": 20, "tokens_xl": 5, "collectible_common": 10, "collectible_rare": 25, "collectible_epic": 20, "collectible_legendary": 5 } },
  };

  function weightedRandom(weights: Record<string, number>): string {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (const [key, w] of Object.entries(weights)) { rand -= w; if (rand <= 0) return key; }
    return Object.keys(weights)[0];
  }

  app.post("/api/fun-zone/spin", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { tier } = req.body;
      const spinConfig = SPIN_TIERS[tier];
      if (!spinConfig) return res.status(400).json({ message: "Invalid spin tier" });
      const cost = spinConfig.cost;
      const balance = user.classroomTokens ?? 0;
      if (balance < cost) return res.status(400).json({ message: "Not enough tokens" });

      const outcome = weightedRandom(spinConfig.weights);
      let rewardType = "tokens", rewardAmount = 0, rewardId = null as string | null, rewardName = "", rewardEmoji = "🪙", rarity = "common";

      // Token rewards: small = partial refund, medium = break-even to profit, large/xl = jackpot
      if (outcome === "tokens_small")  { rewardAmount = cost + Math.floor(Math.random() * 4) - 1; rewardName = `${rewardAmount} Tokens`; }
      else if (outcome === "tokens_medium") { rewardAmount = cost + Math.floor(Math.random() * 8) + 3; rewardName = `${rewardAmount} Tokens`; }
      else if (outcome === "tokens_large")  { rewardAmount = cost + Math.floor(Math.random() * 15) + 8; rewardName = `${rewardAmount} Tokens`; }
      else if (outcome === "tokens_xl")     { rewardAmount = cost + Math.floor(Math.random() * 20) + 20; rewardName = `${rewardAmount} Tokens`; }
      else {
        rewardType = "collectible";
        const rarityMatch = outcome.split("_")[1] as "common" | "rare" | "epic" | "legendary";
        rarity = rarityMatch;
        const pool = SPIN_COLLECTIBLES.filter(c => c.rarity === rarityMatch);
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        rewardId = chosen.id; rewardName = chosen.name; rewardEmoji = chosen.emoji;
      }

      // Deduct tokens
      await storage.updateUserTokens(user.id, -cost);
      // Award tokens if token reward
      if (rewardType === "tokens" && rewardAmount > 0) await storage.updateUserTokens(user.id, rewardAmount);
      // Award collectible if collectible reward
      if (rewardType === "collectible" && rewardId) {
        await storage.addInventoryItem(user.id, rewardId, "collectible", rarity, 1);
      }
      // Save to spin_history
      await storage.saveSpinHistory({ userId: user.id, spinTier: tier, tokensSpent: cost, rewardType, rewardId, rewardAmount: rewardType === "tokens" ? rewardAmount : null, rewardName, rewardEmoji, rarity });

      res.json({ success: true, outcome, rewardType, rewardAmount, rewardId, rewardName, rewardEmoji, rarity, tokensSpent: cost, netTokens: rewardType === "tokens" ? rewardAmount - cost : -cost });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Blackjack Result ─────────────────────────────────────────────
  app.post("/api/fun-zone/blackjack-result", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { bet, netChange } = req.body;
      if (typeof bet !== "number" || bet < 1) return res.status(400).json({ message: "Invalid bet" });
      if (typeof netChange !== "number") return res.status(400).json({ message: "Invalid result" });
      const balance = user.classroomTokens ?? 0;
      // Validate: if losing, must have enough tokens
      if (netChange < 0 && balance < Math.abs(netChange)) {
        return res.status(400).json({ message: "Insufficient tokens" });
      }
      await storage.updateUserTokens(user.id, netChange);
      const updatedUser = await storage.getUserById(user.id);
      res.json({ success: true, newBalance: updatedUser?.classroomTokens ?? 0, netChange });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Daily Deals ─────────────────────────────────────────────────────
  const DAILY_DEAL_POOL = [
    { id: "title-bull", name: "Bull 🐂", type: "title", basePrice: 8, emoji: "🐂" },
    { id: "title-hodler", name: "HODLer 💪", type: "title", basePrice: 10, emoji: "💪" },
    { id: "title-day-trader", name: "Day Trader", type: "title", basePrice: 12, emoji: "📊" },
    { id: "title-diamond", name: "Diamond Hands 💎", type: "title", basePrice: 15, emoji: "💎" },
    { id: "title-analyst", name: "Chart Analyst 📊", type: "title", basePrice: 18, emoji: "📊" },
    { id: "title-whale", name: "Crypto Whale 🐋", type: "title", basePrice: 25, emoji: "🐋" },
    { id: "frame-silver", name: "Silver Frame", type: "frame", basePrice: 15, emoji: "⬜" },
    { id: "frame-blue", name: "Neon Blue Frame", type: "frame", basePrice: 20, emoji: "🟦" },
    { id: "frame-green", name: "Emerald Frame", type: "frame", basePrice: 20, emoji: "🟩" },
    { id: "frame-fire", name: "Fire Frame 🔥", type: "frame", basePrice: 28, emoji: "🔥" },
    { id: "sticker-rocket", name: "Rocket Sticker 🚀", type: "sticker", basePrice: 5, emoji: "🚀" },
    { id: "sticker-gem", name: "Gem Sticker 💎", type: "sticker", basePrice: 8, emoji: "💎" },
    { id: "sticker-crown", name: "Crown Sticker 👑", type: "sticker", basePrice: 10, emoji: "👑" },
    { id: "sticker-money", name: "Money Bag 💰", type: "sticker", basePrice: 12, emoji: "💰" },
    { id: "bag-starter", name: "Starter Pack", type: "blind_bag", basePrice: 15, emoji: "🎒" },
    { id: "bag-crypto", name: "Crypto Pack", type: "blind_bag", basePrice: 30, emoji: "💎" },
    { id: "pu-double-tokens", name: "2× Token Boost", type: "power_up", basePrice: 20, emoji: "🎯" },
    { id: "pu-shield", name: "Loss Shield", type: "power_up", basePrice: 15, emoji: "🛡️" },
  ];

  app.get("/api/fun-zone/daily-deals", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const seed = today.split("-").reduce((a, b) => a * 31 + parseInt(b), 1);
      const shuffled = [...DAILY_DEAL_POOL].sort((a, b) => {
        const ha = (seed * 9301 + (DAILY_DEAL_POOL.indexOf(a) * 49297)) % 233280;
        const hb = (seed * 9301 + (DAILY_DEAL_POOL.indexOf(b) * 49297)) % 233280;
        return ha - hb;
      });
      const deals = shuffled.slice(0, 5).map((item, i) => {
        const discountPct = [30, 25, 35, 20, 40][i % 5];
        const salePrice = Math.max(1, Math.floor(item.basePrice * (1 - discountPct / 100)));
        return { ...item, salePrice, discountPct, expiresAt: new Date(new Date().setHours(23,59,59,0)).toISOString() };
      });
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Student Marketplace ──────────────────────────────────────────────
  app.get("/api/marketplace", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const listings = await storage.getMarketplaceListings(user.id);
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/marketplace", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { inventoryId, price } = req.body;
      if (!inventoryId || typeof price !== "number" || price < 1) return res.status(400).json({ message: "inventoryId and price (≥1) required" });
      if (price > 200) return res.status(400).json({ message: "Max listing price is 200 tokens" });
      const result = await storage.createMarketplaceListing(user.id, inventoryId, price);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/marketplace/:id/buy", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.buyMarketplaceListing(req.params.id, user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/marketplace/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.cancelMarketplaceListing(req.params.id, user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/marketplace/history", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json(await storage.getMarketplaceHistory(user.id));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Auctions ─────────────────────────────────────────────────────────────
  app.get("/api/marketplace/auctions", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json(await storage.getAuctions(user.id));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/marketplace/auctions", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { inventoryId, startPrice, durationMinutes } = req.body;
      if (!inventoryId || typeof startPrice !== "number" || startPrice < 1) return res.status(400).json({ message: "inventoryId and startPrice (≥1) required" });
      const dur = Math.min(Math.max(Number(durationMinutes) || 60, 30), 1440);
      res.json(await storage.createAuction(user.id, inventoryId, startPrice, dur));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/marketplace/auctions/:id/bid", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { amount } = req.body;
      if (typeof amount !== "number" || amount < 1) return res.status(400).json({ message: "amount required" });
      res.json(await storage.placeBid(req.params.id, user.id, amount));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/marketplace/auctions/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json(await storage.cancelAuction(req.params.id, user.id));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Bets ─────────────────────────────────────────────────────────────────
  app.get("/api/marketplace/bets", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json(await storage.getBets(user.id));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/marketplace/bets", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { question, optionA, optionB, expiresInMinutes } = req.body;
      if (!question?.trim()) return res.status(400).json({ message: "question required" });
      res.json(await storage.createBet(user.id, question.trim(), optionA?.trim() || "Yes", optionB?.trim() || "No", Number(expiresInMinutes) || 60));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/marketplace/bets/:id/enter", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { option, amount } = req.body;
      if (!["A","B"].includes(option) || typeof amount !== "number" || amount < 1) return res.status(400).json({ message: "option (A/B) and amount (≥1) required" });
      res.json(await storage.enterBet(req.params.id, user.id, option, amount));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/marketplace/bets/:id/resolve", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { result } = req.body;
      if (!["A","B","cancel"].includes(result)) return res.status(400).json({ message: "result must be A, B, or cancel" });
      res.json(await storage.resolveBet(req.params.id, user.id, result));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get("/api/marketplace/bets/my-entries", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      res.json(await storage.getMyBetEntries(user.id));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // PayPal routes with error handling
  app.get("/setup", async (req, res) => {
    try {
      await loadPaypalDefault(req, res);
    } catch (error) {
      console.error("PayPal setup error:", error);
      res.status(500).json({ error: "PayPal configuration error. Please check your credentials." });
    }
  });
  
  app.post("/order", async (req, res) => {
    try {
      await createPaypalOrder(req, res);
    } catch (error) {
      console.error("PayPal order error:", error);
      res.status(500).json({ error: "Failed to create PayPal order" });
    }
  });
  
  app.post("/order/:orderID/capture", async (req, res) => {
    try {
      await capturePaypalOrder(req, res);
    } catch (error) {
      console.error("PayPal capture error:", error);
      res.status(500).json({ error: "Failed to capture PayPal order" });
    }
  });

  // Promo code redemption route
  app.post("/api/payments/redeem-promo", requireAuth, async (req, res) => {
    try {
      const { promoCode } = req.body;
      const user = req.user as User;

      const promoRecord = await storage.getPromoCodeByCode(promoCode);
      if (!promoRecord || !promoRecord.isActive) {
        return res.status(400).json({ error: "Invalid or expired promo code" });
      }

      if (promoRecord.maxUses !== null && promoRecord.maxUses !== undefined && (promoRecord.usedCount ?? 0) >= promoRecord.maxUses) {
        return res.status(400).json({ error: "This promo code has reached its usage limit" });
      }

      const tierRank: Record<string, number> = { school: 1, casual: 2, premium: 3 };
      const currentTierRank = user.membershipTier ? (tierRank[user.membershipTier] || 0) : 0;
      const newTierRank = tierRank[promoRecord.tier] || 0;

      if (user.membershipStatus === "active" && currentTierRank >= newTierRank) {
        return res.status(400).json({ error: "You already have this tier or a higher membership" });
      }

      await storage.updateUser(user.id, {
        membershipTier: promoRecord.tier,
        membershipStatus: "active",
        subscriptionId: `PROMO-${promoRecord.code}-${Date.now()}`,
      });

      await storage.incrementPromoCodeUsed(promoRecord.id);

      const tierNames: Record<string, string> = { school: "School Plan", casual: "Casual Plan", premium: "12Digits+ Premium" };
      res.json({ success: true, message: `Promo code redeemed! You now have free ${tierNames[promoRecord.tier] || promoRecord.tier} access.` });
    } catch (error) {
      console.error("Promo redemption error:", error);
      res.status(500).json({ error: "Failed to redeem promo code" });
    }
  });

  // Subscription payment routes
  app.post("/api/payments/activate-subscription", requireAuth, async (req, res) => {
    try {
      const { tier, orderId } = req.body;
      const user = req.user as User;

      const validTiers = ["school", "casual", "premium"];
      if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }

      // Define tier priorities to prevent downgrades
      const tierPriority: Record<string, number> = { premium: 3, casual: 2, school: 1 };
      const currentPriority = user.membershipTier ? (tierPriority[user.membershipTier] || 0) : 0;
      const targetPriority = tierPriority[tier] || 0;

      // Check if user already has an active subscription with higher or equal tier
      if (user.membershipStatus === "active" && user.subscriptionId && currentPriority >= targetPriority) {
        return res.status(400).json({ 
          error: currentPriority === targetPriority 
            ? "You already have this subscription tier" 
            : "You cannot downgrade to a lower tier. Please cancel your current subscription first." 
        });
      }

      // Update user's subscription status
      const updateData: any = {
        membershipTier: tier,
        membershipStatus: "active",
        subscriptionId: orderId,
      };

      // Upgrade balance to $10,000 for 12Digits+ (premium)
      if (tier === "premium") {
        updateData.simulatorBalance = 10000;
      }

      await storage.updateUser(user.id, updateData);

      res.json({ success: true });
    } catch (error) {
      console.error("Subscription activation error:", error);
      res.status(500).json({ error: "Failed to activate subscription" });
    }
  });

  app.get("/api/simulated-prices", async (_req, res) => {
    try {
      const prices = await storage.getSimulatedPrices();
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/simulated-prices/update", async (req, res) => {
    try {
      const { symbol, price } = req.body;
      if (!symbol || typeof price !== "number") {
        return res.status(400).json({ message: "Invalid symbol or price" });
      }
      await storage.updateSimulatedPrice(symbol, price);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Profile routes
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const data = updateProfileSchema.parse(req.body);

      const updates: Partial<User> = {};
      if (data.displayName !== undefined) updates.displayName = data.displayName;
      if (data.bio !== undefined) updates.bio = data.bio;
      if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

      if (data.username !== undefined) {
        if (data.username) {
          const existing = await storage.getUserByUsername(data.username);
          if (existing && existing.id !== user.id) {
            return res.status(400).json({ message: "Username already taken" });
          }
        }
        updates.username = data.username;
      }

      await storage.updateUser(user.id, updates);
      const updatedUser = await storage.getUserById(user.id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = updatedUser;
      res.json({ user: safeUser });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/user/password", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, fullUser.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const results = await storage.searchUsers(query);
      const safeResults = results.map(({ password, ...user }) => user);
      res.json(safeResults);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/ping", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const status = req.body?.status === "idle" ? "idle" : "online";
      await storage.updateLastSeen(user.id, status);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/presence", requireAuth, async (req, res) => {
    try {
      const ids = String(req.query.ids || "").split(",").map(s => s.trim()).filter(Boolean);
      if (!ids.length) return res.json({});
      const presence = await storage.getUserPresence(ids);
      res.json(presence);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const publicProfile = {
        id: user.id,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        membershipTier: user.membershipTier,
        lessonsCompleted: user.lessonsCompleted,
        totalProfit: user.totalProfit,
        xp: user.xp,
        lastSeenAt: user.lastSeenAt,
        presenceStatus: user.presenceStatus ?? "offline",
        equippedFrame: user.equippedFrame ?? null,
        equippedTitle: user.equippedTitle ?? null,
        purchasedCosmetics: user.purchasedCosmetics ?? "[]",
      };
      
      res.json(publicProfile);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/trades", async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const allTrades = await storage.getTradesByUser(req.params.id);
      const recent = allTrades
        .sort((a, b) => new Date(b.openedAt ?? 0).getTime() - new Date(a.openedAt ?? 0).getTime())
        .slice(0, 8)
        .map(t => ({
          id: t.id,
          symbol: t.symbol,
          type: t.type,
          quantity: t.quantity,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          profit: t.profit,
          status: t.status,
          openedAt: t.openedAt,
          closedAt: t.closedAt,
          leverage: t.leverage,
        }));
      res.json(recent);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Achievements routes
  app.get("/api/achievements", async (req, res) => {
    try {
      const allAchievements = await storage.getAchievements();
      res.json(allAchievements);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/achievements/stats", async (req, res) => {
    try {
      const stats = await storage.getAchievementStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/user/achievements", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const userAchievementsList = await storage.getUserAchievements(user.id);
      const allAchievements = await storage.getAchievements();
      
      const achievementsWithProgress = allAchievements.map(achievement => {
        const userAchievement = userAchievementsList.find(ua => ua.achievementId === achievement.id);
        return {
          ...achievement,
          unlocked: !!userAchievement && (userAchievement.progress ?? 0) >= 100,
          unlockedAt: userAchievement?.unlockedAt,
          progress: userAchievement?.progress ?? 0,
        };
      });
      
      res.json(achievementsWithProgress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/achievements", async (req, res) => {
    try {
      const userAchievementsList = await storage.getUserAchievements(req.params.id);
      const allAchievements = await storage.getAchievements();
      
      const unlockedAchievements = allAchievements
        .filter(achievement => {
          const ua = userAchievementsList.find(u => u.achievementId === achievement.id);
          return ua && (ua.progress ?? 0) >= 100;
        })
        .map(achievement => {
          const ua = userAchievementsList.find(u => u.achievementId === achievement.id);
          return {
            ...achievement,
            unlockedAt: ua?.unlockedAt,
          };
        });
      
      res.json(unlockedAchievements);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Object storage routes for profile picture uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectKey = await objectStorageService.getObjectKey(req.path);
      await objectStorageService.downloadObject(objectKey, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/user/avatar", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { avatarURL } = req.body;
      const objectStorageService = new ObjectStorageService();
      const avatarPath = objectStorageService.normalizeObjectEntityPath(avatarURL);
      await storage.updateUser(user.id, { avatarUrl: avatarPath });
      res.json({ avatarPath });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Retroactive achievement check endpoint
  app.post("/api/achievements/check", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await checkAndAwardAchievements(user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete account endpoint
  app.delete("/api/user/account", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Delete all user-related data
      await storage.deleteUserAccount(user.id);
      
      // Logout the user
      req.logout(() => {
        res.json({ success: true });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Public Tips & Insights routes (for regular users)
  app.get("/api/tips", async (req, res) => {
    try {
      const tips = await storage.getTradingTips();
      res.json(tips);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/insights", async (req, res) => {
    try {
      const insights = await storage.getMarketInsights();
      res.json(insights);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Tips management routes
  app.get("/api/admin/tips", requireAdmin, async (req, res) => {
    try {
      const tips = await storage.getAllTradingTips();
      res.json(tips);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/tips", requireAdmin, async (req, res) => {
    try {
      const tip = await storage.createTradingTip(req.body);
      res.json(tip);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/tips/:id", requireAdmin, async (req, res) => {
    try {
      const tip = await storage.updateTradingTip(req.params.id, req.body);
      if (!tip) {
        return res.status(404).json({ message: "Tip not found" });
      }
      res.json(tip);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/tips/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteTradingTip(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Insights management routes
  app.get("/api/admin/insights", requireAdmin, async (req, res) => {
    try {
      const insights = await storage.getAllMarketInsights();
      res.json(insights);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/insights", requireAdmin, async (req, res) => {
    try {
      const insight = await storage.createMarketInsight(req.body);
      res.json(insight);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/insights/:id", requireAdmin, async (req, res) => {
    try {
      const insight = await storage.updateMarketInsight(req.params.id, req.body);
      if (!insight) {
        return res.status(404).json({ message: "Insight not found" });
      }
      res.json(insight);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/insights/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMarketInsight(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Public strategies route
  app.get("/api/strategies", async (req, res) => {
    try {
      const strategies = await storage.getStrategies();
      res.json(strategies);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Strategies management routes
  app.get("/api/admin/strategies", requireAdmin, async (req, res) => {
    try {
      const strategies = await storage.getAllStrategies();
      res.json(strategies);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/strategies", requireAdmin, async (req, res) => {
    try {
      const strategy = await storage.createStrategy(req.body);
      res.json(strategy);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/strategies/:id", requireAdmin, async (req, res) => {
    try {
      const strategy = await storage.updateStrategy(req.params.id, req.body);
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/strategies/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteStrategy(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/promo-codes", requireAdmin, async (req, res) => {
    try {
      const codes = await storage.getPromoCodes();
      res.json(codes);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/promo-codes", requireAdmin, async (req, res) => {
    try {
      const code = await storage.createPromoCode(req.body);
      res.json(code);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/promo-codes/:id", requireAdmin, async (req, res) => {
    try {
      const code = await storage.updatePromoCode(req.params.id, req.body);
      if (!code) return res.status(404).json({ message: "Promo code not found" });
      res.json(code);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/promo-codes/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deletePromoCode(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/financial", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getFinancialStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Middleware for features requiring any paid membership (casual, school, premium) or trial
  const requirePaidMembership = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Admin always has access
    if (user.role === "admin") {
      return next();
    }
    // Active subscription
    if (user.membershipStatus === "active") {
      return next();
    }
    // Check trial period (14 days)
    const TRIAL_DAYS = 14;
    if (user.trialStartDate) {
      const trialStart = new Date(user.trialStartDate);
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceStart < TRIAL_DAYS) {
        return next();
      }
    }
    res.status(403).json({ message: "This feature requires a paid membership" });
  };

  // Middleware for premium-only features (12Digits+ tier, School Plan, or trial users only)
  const requirePremiumContent = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Admin always has access
    if (user.role === "admin") {
      return next();
    }
    // Premium tier subscription
    if (user.membershipTier === "premium" && user.membershipStatus === "active") {
      return next();
    }
    // School Plan users get full premium access
    if (user.membershipTier === "school" && user.membershipStatus === "active") {
      return next();
    }
    // Check trial period (14 days) - trial users get premium access
    const TRIAL_DAYS = 14;
    if (user.trialStartDate) {
      const trialStart = new Date(user.trialStartDate);
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceStart < TRIAL_DAYS) {
        return next();
      }
    }
    res.status(403).json({ message: "This feature requires 12Digits+ Premium or a trial subscription" });
  };

  // Casual+ access: casual, premium, school tier users (and trial/admin)
  const requireCasualOrHigher = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role === "admin") return next();
    const activeTiers = ["casual", "premium", "school"];
    if (activeTiers.includes(user.membershipTier ?? "") && user.membershipStatus === "active") return next();
    if (user.trialStartDate) {
      const days = Math.floor((Date.now() - new Date(user.trialStartDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days < 14) return next();
    }
    res.status(403).json({ message: "This feature requires a Casual or higher plan" });
  };

  app.get("/api/friends", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const friends = await storage.getFriends(user.id);
      res.json(friends);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/friends/requests", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const requests = await storage.getFriendRequests(user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/request", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const { friendId } = req.body;
      
      if (!friendId) {
        return res.status(400).json({ message: "Friend ID is required" });
      }
      
      if (friendId === user.id) {
        return res.status(400).json({ message: "You cannot send a friend request to yourself" });
      }
      
      const friendUser = await storage.getUserById(friendId);
      if (!friendUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const friendship = await storage.sendFriendRequest(user.id, friendId);
      
      await storage.createNotification({
        userId: friendId,
        type: "friend_request",
        title: "New Friend Request",
        message: `${user.displayName} sent you a friend request`,
        data: { friendshipId: friendship.id, senderId: user.id },
        isRead: false,
      });
      
      res.json(friendship);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/accept/:id", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const friendshipId = req.params.id;
      
      const friendship = await storage.getFriendshipById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      if (friendship.friendId !== user.id) {
        return res.status(403).json({ message: "You can only accept requests sent to you" });
      }
      
      const updated = await storage.acceptFriendRequest(friendshipId);
      
      await storage.createNotification({
        userId: friendship.userId,
        type: "friend_accepted",
        title: "Friend Request Accepted",
        message: `${user.displayName} accepted your friend request`,
        data: { friendshipId: friendship.id },
        isRead: false,
      });
      
      await checkAndAwardAchievements(user.id);
      await checkAndAwardAchievements(friendship.userId);
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/reject/:id", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const friendshipId = req.params.id;
      
      const friendship = await storage.getFriendshipById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      if (friendship.friendId !== user.id) {
        return res.status(403).json({ message: "You can only reject requests sent to you" });
      }
      
      await storage.rejectFriendRequest(friendshipId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/friends/:id", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.removeFriend(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/search", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query);
      const safeUsers = users.map(u => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Chat Messages (Casual+ feature)
  app.get("/api/chat/:friendId", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const friendId = req.params.friendId;
      const messages = await storage.getChatMessages(user.id, friendId);
      await storage.markMessagesAsRead(friendId, user.id);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/chat", requireAuth, requireCasualOrHigher, async (req, res) => {
    try {
      const user = req.user as User;
      const parsed = insertChatMessageSchema.parse({
        senderId: user.id,
        receiverId: req.body.receiverId,
        content: req.body.content,
      });
      const message = await storage.sendChatMessage(parsed);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/chat/unread/count", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/chat/:messageId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const msg = await storage.editChatMessage(req.params.messageId, user.id, content.trim());
      if (!msg) return res.status(404).json({ message: "Message not found" });
      res.json(msg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/chat/:messageId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.deleteChatMessage(req.params.messageId, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Group Chats
  app.get("/api/group-chats", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const groups = await storage.getUserGroupChats(user.id);
      res.json(groups);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/group-chats", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { name, emoji = "💬", memberIds = [] } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name required" });
      const group = await storage.createFriendGroupChat(name.trim(), user.id, emoji, memberIds);
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/group-chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getGroupChatMessages(req.params.id);
      res.json(msgs);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/group-chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content, replyToId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const msg = await storage.sendGroupChatMessage(req.params.id, user.id, content.trim(), replyToId);
      res.json(msg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/group-chats/:groupId/messages/:messageId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      const msg = await storage.editGroupChatMessage(req.params.messageId, user.id, content);
      res.json(msg);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/group-chats/:groupId/messages/:messageId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.deleteGroupChatMessage(req.params.messageId, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/group-chats/:id/invite", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      await storage.addGroupChatMember(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/group-chats/:id/leave", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.removeGroupChatMember(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cosmetic Marketplace
  app.get("/api/cosmetic-market", requireAuth, async (req, res) => {
    try {
      const listings = await storage.getCosmeticListings();
      res.json(listings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/cosmetic-market", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { itemId, itemType, price } = req.body;
      if (!itemId || !itemType || typeof price !== "number" || price <= 0) {
        return res.status(400).json({ message: "Invalid listing data" });
      }
      const owned: string[] = (() => { try { return JSON.parse(user.purchasedCosmetics ?? "[]"); } catch { return []; } })();
      if (!owned.includes(itemId)) return res.status(400).json({ message: "You don't own this item" });
      const listing = await storage.createCosmeticListing(user.id, itemId, itemType, price);
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/cosmetic-market/:id/buy", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.buyCosmeticListing(req.params.id, user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cosmetic-market/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.cancelCosmeticListing(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Shop Roulette
  app.post("/api/global-shop/spin", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { cost } = req.body;
      if (typeof cost !== "number" || cost <= 0) return res.status(400).json({ message: "Invalid cost" });
      const balance = user.simulatorBalance ?? 0;
      if (balance < cost) return res.status(400).json({ message: "Insufficient balance" });

      const { ROULETTE_SLOTS } = await import("../client/src/lib/shop-catalog.js").catch(() => ({ ROULETTE_SLOTS: [] as any[] }));
      let slots = ROULETTE_SLOTS;
      if (!slots?.length) {
        // Fallback if import fails
        slots = [
          { id: "slot-50",   reward: { type: "balance", amount: 50   }, weight: 20 },
          { id: "slot-100",  reward: { type: "balance", amount: 100  }, weight: 15 },
          { id: "slot-500",  reward: { type: "balance", amount: 500  }, weight: 10 },
          { id: "slot-1000", reward: { type: "balance", amount: 1000 }, weight: 5  },
          { id: "slot-lose", reward: { type: "balance", amount: 0    }, weight: 25 },
        ];
      }

      const totalWeight = slots.reduce((s: number, r: any) => s + r.weight, 0);
      let rng = Math.random() * totalWeight;
      let chosen = slots[0];
      for (const slot of slots) {
        if (rng < slot.weight) { chosen = slot; break; }
        rng -= slot.weight;
      }

      const owned: string[] = (() => { try { return JSON.parse(user.purchasedCosmetics ?? "[]"); } catch { return []; } })();
      let balanceChange = -cost;
      let rewardDesc = "Nothing";

      if (chosen.reward.type === "balance") {
        balanceChange += (chosen.reward.amount ?? 0);
        rewardDesc = chosen.reward.amount ? `$${chosen.reward.amount.toLocaleString()}` : "Nothing";
      } else if (chosen.reward.type === "item" && chosen.reward.itemId) {
        if (!owned.includes(chosen.reward.itemId)) owned.push(chosen.reward.itemId);
        rewardDesc = chosen.reward.itemId;
      }

      const newBalance = Math.round((balance + balanceChange) * 100) / 100;
      await storage.updateUser(user.id, {
        simulatorBalance: newBalance,
        purchasedCosmetics: JSON.stringify(owned),
      });

      res.json({ success: true, slot: chosen, rewardDesc, newBalance });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ── Casino Games (Simulator Balance) ────────────────────────────────────────

  app.post("/api/global-shop/blackjack-result", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { bet, netChange } = req.body;
      if (typeof bet !== "number" || bet < 1) return res.status(400).json({ message: "Invalid bet" });
      if (typeof netChange !== "number") return res.status(400).json({ message: "Invalid result" });
      const balance = user.simulatorBalance ?? 0;
      if (netChange < 0 && balance < Math.abs(netChange)) return res.status(400).json({ message: "Insufficient balance" });
      const newBalance = Math.round((balance + netChange) * 100) / 100;
      await storage.updateUser(user.id, { simulatorBalance: newBalance });
      res.json({ success: true, newBalance, netChange });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/global-shop/coinflip", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { bet, choice } = req.body;
      if (typeof bet !== "number" || bet < 1) return res.status(400).json({ message: "Invalid bet" });
      if (choice !== "heads" && choice !== "tails") return res.status(400).json({ message: "Invalid choice" });
      const balance = user.simulatorBalance ?? 0;
      if (balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      const result = Math.random() < 0.5 ? "heads" : "tails";
      const won = result === choice;
      const netChange = won ? bet : -bet;
      const newBalance = Math.round((balance + netChange) * 100) / 100;
      await storage.updateUser(user.id, { simulatorBalance: newBalance });
      res.json({ success: true, result, won, netChange, newBalance });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/global-shop/crash-result", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { bet, netChange } = req.body;
      if (typeof bet !== "number" || bet < 1) return res.status(400).json({ message: "Invalid bet" });
      if (typeof netChange !== "number") return res.status(400).json({ message: "Invalid result" });
      const balance = user.simulatorBalance ?? 0;
      if (netChange < 0 && balance < Math.abs(netChange)) return res.status(400).json({ message: "Insufficient balance" });
      const newBalance = Math.round((balance + netChange) * 100) / 100;
      await storage.updateUser(user.id, { simulatorBalance: newBalance });
      res.json({ success: true, newBalance, netChange });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/global-shop/hilo-result", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { bet, netChange } = req.body;
      if (typeof bet !== "number" || bet < 1) return res.status(400).json({ message: "Invalid bet" });
      if (typeof netChange !== "number") return res.status(400).json({ message: "Invalid result" });
      const balance = user.simulatorBalance ?? 0;
      if (netChange < 0 && balance < Math.abs(netChange)) return res.status(400).json({ message: "Insufficient balance" });
      const newBalance = Math.round((balance + netChange) * 100) / 100;
      await storage.updateUser(user.id, { simulatorBalance: newBalance });
      res.json({ success: true, newBalance, netChange });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Watchlist API
  app.get("/api/watchlist", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const items = await storage.getWatchlist(user.id);
      res.json(items);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/watchlist", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { symbol, name } = req.body;
      if (!symbol || !name) {
        return res.status(400).json({ message: "Symbol and name are required" });
      }
      const item = await storage.addWatchlistItem({ userId: user.id, symbol, name });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/watchlist/:symbol", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.removeWatchlistItem(user.id, req.params.symbol);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Journal API (Premium feature)
  app.get("/api/journal", requireAuth, requirePremiumContent, async (req, res) => {
    try {
      const user = req.user as User;
      const entries = await storage.getJournalEntries(user.id);
      res.json(entries);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/journal", requireAuth, requirePremiumContent, async (req, res) => {
    try {
      const user = req.user as User;
      const entry = await storage.createJournalEntry({
        userId: user.id,
        symbol: req.body.symbol,
        type: req.body.type,
        entryPrice: req.body.entryPrice,
        exitPrice: req.body.exitPrice,
        quantity: req.body.quantity,
        pnl: req.body.pnl,
        notes: req.body.notes,
        strategy: req.body.strategy,
        emotions: req.body.emotions,
        lessons: req.body.lessons,
        date: req.body.date,
        tradeId: req.body.tradeId,
      });
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/journal/:id", requireAuth, requirePremiumContent, async (req, res) => {
    try {
      const entry = await storage.updateJournalEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/journal/:id", requireAuth, requirePremiumContent, async (req, res) => {
    try {
      await storage.deleteJournalEntry(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Notifications API
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const notifications = await storage.getNotifications(user.id);
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const notification = await storage.markNotificationRead(req.params.id, user.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.markAllNotificationsRead(user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.deleteNotification(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/user/onboarding", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const updatedUser = await storage.updateUser(user.id, { 
        onboardingCompleted: req.body.onboardingCompleted 
      });
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== CLASSROOM ECONOMY ROUTES =====

  // Economy Settings
  app.get("/api/economy/settings", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const settings = await storage.getEconomySettings(classId);
      res.json(settings || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/economy/settings", requireTeacher, async (req, res) => {
    try {
      const { classId, ...data } = req.body;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const settings = await storage.upsertEconomySettings(classId, data);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Student Balance & Transactions
  app.get("/api/economy/balance", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const balance = await storage.getStudentBalance(classId, user.id);
      const savingsBalance = await storage.getSavingsBalance(user.id, classId);
      const transactions = await storage.getStudentTransactions(classId, user.id, 50);
      const myJobs = await storage.getJobAssignmentsByStudent(user.id, classId);
      const purchases = await storage.getPurchasesByStudent(user.id, classId);
      res.json({ balance, savingsBalance, transactions, myJobs, purchases });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/economy/balances", requireTeacher, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const balances = await storage.getAllStudentBalances(classId);
      const students = await storage.getStudentsByClass(classId);
      const result = students.map(s => ({
        ...s,
        balance: balances.find(b => b.studentId === s.id)?.balance ?? 0,
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Manual Currency Award
  app.post("/api/economy/award", requireTeacher, async (req, res) => {
    try {
      const { classId, studentId, amount, description } = req.body;
      if (!classId || !studentId || !amount) return res.status(400).json({ message: "classId, studentId, amount required" });
      const tx = await storage.addCurrencyTransaction({ classId, studentId, amount: Number(amount), type: "teacher_award", description: description || "Teacher award" });
      res.json(tx);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Simulator profit → currency conversion
  app.post("/api/economy/convert-profit", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId, profit } = req.body;
      if (!classId || profit === undefined) return res.status(400).json({ message: "classId and profit required" });
      const settings = await storage.getEconomySettings(classId);
      if (!settings || !settings.isActive) return res.status(400).json({ message: "Economy not active for this class" });
      const amount = Math.floor(Math.max(0, profit) * settings.simulatorConversionRate);
      if (amount <= 0) return res.json({ amount: 0 });
      const tx = await storage.addCurrencyTransaction({ classId, studentId: user.id, amount, type: "simulator", description: `Converted simulator profit ($${profit.toFixed(2)})` });
      res.json({ amount, transaction: tx });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Expenses
  app.get("/api/economy/expenses", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const expenses = await storage.getExpensesByClass(classId);
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/economy/expenses", requireTeacher, async (req, res) => {
    try {
      const expense = await storage.createExpense(req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/economy/expenses/:id", requireTeacher, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/economy/expenses/:id/collect", requireTeacher, async (req, res) => {
    try {
      const { classId } = req.body;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const expenses = await storage.getExpensesByClass(classId);
      const expense = expenses.find(e => e.id === req.params.id);
      if (!expense) return res.status(404).json({ message: "Expense not found" });
      const students = await storage.getStudentsByClass(classId);
      for (const student of students) {
        await storage.chargeExpenseToStudent(expense.id, student.id, classId, expense.amount, expense.name);
      }
      res.json({ success: true, charged: students.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Jobs
  app.get("/api/economy/jobs", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const jobs = await storage.getJobsByClass(classId);
      const assignments = await storage.getJobAssignmentsByClass(classId);
      res.json({ jobs, assignments });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/economy/jobs", requireTeacher, async (req, res) => {
    try {
      const job = await storage.createJob(req.body);
      res.json(job);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/economy/jobs/:id", requireTeacher, async (req, res) => {
    try {
      await storage.deleteJob(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/economy/jobs/:id/assign", requireTeacher, async (req, res) => {
    try {
      const { studentId, classId } = req.body;
      const assignment = await storage.assignJob(req.params.id, studentId, classId);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/economy/jobs/:jobId/assign/:studentId", requireTeacher, async (req, res) => {
    try {
      await storage.unassignJob(req.params.jobId, req.params.studentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/economy/jobs/pay-all", requireTeacher, async (req, res) => {
    try {
      const { classId } = req.body;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const assignments = await storage.getJobAssignmentsByClass(classId);
      for (const a of assignments) {
        await storage.payJobHolder(a.id, a.studentId, classId, a.payAmount, a.jobTitle);
      }
      res.json({ success: true, paid: assignments.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Auctions
  app.get("/api/economy/auctions", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const auctions = await storage.getAuctionsByClass(classId);
      const now = new Date();
      // Auto-close expired active auctions
      for (const a of auctions) {
        if (a.isActive && new Date(a.endDate) < now) {
          await storage.closeAuction(a.id);
        }
      }
      res.json(await storage.getAuctionsByClass(classId));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/economy/auctions", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const auction = await storage.createAuction({ ...req.body, teacherId: user.id });
      res.json(auction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/economy/auctions/:id/bid", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { amount, classId } = req.body;
      const auction = await storage.getAuction(req.params.id);
      if (!auction || !auction.isActive) return res.status(400).json({ message: "Auction is not active" });
      if (new Date(auction.endDate) < new Date()) return res.status(400).json({ message: "Auction has ended" });
      const minBid = Math.max(auction.startingBid, (auction.currentHighBid ?? 0) + 1);
      if (Number(amount) < minBid) return res.status(400).json({ message: `Minimum bid is ${minBid}` });
      const balance = await storage.getStudentBalance(classId, user.id);
      if (balance < Number(amount)) return res.status(400).json({ message: "Insufficient balance" });
      const bid = await storage.placeBid(req.params.id, user.id, classId, Number(amount));
      res.json(bid);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/economy/auctions/:id/bids", requireAuth, async (req, res) => {
    try {
      const bids = await storage.getBidsByAuction(req.params.id);
      res.json(bids);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/economy/auctions/:id/close", requireTeacher, async (req, res) => {
    try {
      const auction = await storage.closeAuction(req.params.id);
      res.json(auction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/economy/auctions/:id", requireTeacher, async (req, res) => {
    try {
      await storage.deleteAuction(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Store
  app.get("/api/economy/store", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const items = await storage.getStoreItemsByClass(classId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/economy/store", requireTeacher, async (req, res) => {
    try {
      const item = await storage.createStoreItem(req.body);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/economy/store/:id", requireTeacher, async (req, res) => {
    try {
      await storage.deleteStoreItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/economy/store/:id/buy", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId } = req.body;
      const [item] = await (async () => {
        const items = await storage.getStoreItemsByClass(classId);
        return items.filter(i => i.id === req.params.id);
      })();
      if (!item) return res.status(404).json({ message: "Item not found" });
      const balance = await storage.getStudentBalance(classId, user.id);
      if (balance < item.price) return res.status(400).json({ message: "Insufficient balance" });
      const purchase = await storage.purchaseStoreItem(req.params.id, user.id, classId);
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Savings
  app.post("/api/economy/savings/deposit", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId, amount } = req.body;
      if (!classId || !amount || amount <= 0) return res.status(400).json({ message: "Invalid request" });
      await storage.depositToSavings(user.id, classId, Math.floor(amount));
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.post("/api/economy/savings/withdraw", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId, amount } = req.body;
      if (!classId || !amount || amount <= 0) return res.status(400).json({ message: "Invalid request" });
      await storage.withdrawFromSavings(user.id, classId, Math.floor(amount));
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.get("/api/economy/savings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const classId = req.query.classId as string;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const savings = await storage.getSavingsBalance(user.id, classId);
      res.json({ savings });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/savings/apply-interest", requireTeacher, async (req, res) => {
    try {
      const { classId } = req.body;
      const settings = await storage.getEconomySettings(classId);
      const rate = settings?.savingsInterestRate ?? 5;
      const count = await storage.applySavingsInterestToAll(classId, rate);
      res.json({ success: true, applied: count, rate });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Economy Events (bulk)
  app.post("/api/economy/events/bonus", requireTeacher, async (req, res) => {
    try {
      const { classId, amount, description } = req.body;
      if (!classId || !amount || amount <= 0) return res.status(400).json({ message: "Invalid request" });
      const count = await storage.classBonus(classId, Math.floor(amount), description || `Class bonus: ${amount} coins`);
      res.json({ success: true, awarded: count });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/events/fine", requireTeacher, async (req, res) => {
    try {
      const { classId, amount, description } = req.body;
      if (!classId || !amount || amount <= 0) return res.status(400).json({ message: "Invalid request" });
      const count = await storage.classFine(classId, Math.floor(amount), description || `Class fine: ${amount} coins`);
      res.json({ success: true, charged: count });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/events/fine-percent", requireTeacher, async (req, res) => {
    try {
      const { classId, percent, description } = req.body;
      if (!classId || !percent || percent <= 0) return res.status(400).json({ message: "Invalid request" });
      const count = await storage.classFinePercent(classId, percent, description || `Class tax: ${percent}%`);
      res.json({ success: true, charged: count });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Challenges
  app.get("/api/economy/challenges", requireAuth, async (req, res) => {
    try {
      const classId = req.query.classId as string;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const challenges = await storage.getChallengesByClass(classId);
      res.json(challenges);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/challenges", requireTeacher, async (req, res) => {
    try {
      const user = req.user as User;
      const data = { ...req.body, teacherId: user.id };
      const challenge = await storage.createChallenge(data);
      res.json(challenge);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.delete("/api/economy/challenges/:id", requireTeacher, async (req, res) => {
    try {
      await storage.deleteChallenge(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/challenges/:id/close", requireTeacher, async (req, res) => {
    try {
      const { winnerId, classId } = req.body;
      const challenges = await storage.getChallengesByClass(classId);
      const challenge = challenges.find(c => c.id === req.params.id);
      if (!challenge) return res.status(404).json({ message: "Challenge not found" });
      await storage.closeChallengeAndAward(req.params.id, winnerId, classId, challenge.rewardAmount ?? 0, challenge.title);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Class Leaderboard
  app.get("/api/economy/leaderboard", requireAuth, async (req, res) => {
    try {
      const classId = req.query.classId as string;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const leaderboard = await storage.getClassLeaderboard(classId);
      res.json(leaderboard);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Assets ────────────────────────────────────────────────────
  app.get("/api/economy/assets", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const assets = await storage.getClassroomAssets(classId);
      res.json(assets);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/assets", requireTeacher, async (req, res) => {
    try {
      const asset = await storage.createClassroomAsset(req.body);
      res.json(asset);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.delete("/api/economy/assets/:id", requireTeacher, async (req, res) => {
    try {
      await storage.deleteClassroomAsset(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.post("/api/economy/assets/:id/buy", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId } = req.body;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const sa = await storage.purchaseClassroomAsset(classId, user.id, req.params.id);
      res.json(sa);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.get("/api/economy/my-assets", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const assets = await storage.getStudentAssets(classId, user.id);
      res.json(assets);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/process-asset-income", requireTeacher, async (req, res) => {
    try {
      const { classId } = req.body;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const result = await storage.processAssetIncome(classId);
      res.json(result);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.get("/api/economy/net-worth", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const netWorth = await storage.getStudentNetWorth(classId, user.id);
      res.json(netWorth);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/economy/net-worth-leaderboard", requireAuth, async (req, res) => {
    try {
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      const leaderboard = await storage.getClassNetWorthLeaderboard(classId);
      res.json(leaderboard);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // ─── Loans ────────────────────────────────────────────────────
  app.get("/api/economy/loans", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId } = req.query as { classId: string };
      if (!classId) return res.status(400).json({ message: "classId required" });
      if (user.role === "teacher") {
        const loans = await storage.getClassLoans(classId);
        res.json(loans);
      } else {
        const loans = await storage.getStudentLoans(classId, user.id);
        res.json(loans);
      }
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/economy/loans", requireTeacher, async (req, res) => {
    try {
      const { classId, studentId, amount, interestRate, dueDate } = req.body;
      if (!classId || !studentId || !amount) return res.status(400).json({ message: "classId, studentId, and amount required" });
      const loan = await storage.issueLoan(classId, studentId, Number(amount), Number(interestRate ?? 10), dueDate ? new Date(dueDate) : undefined);
      res.json(loan);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.post("/api/economy/loans/apply-interest", requireTeacher, async (req, res) => {
    try {
      const { classId } = req.body;
      if (!classId) return res.status(400).json({ message: "classId required" });
      const result = await storage.applyLoanInterest(classId);
      res.json(result);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  app.post("/api/economy/loans/:id/repay", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { classId, amount } = req.body;
      if (!classId || !amount) return res.status(400).json({ message: "classId and amount required" });
      const result = await storage.repayLoan(classId, user.id, req.params.id, Number(amount));
      res.json(result);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  });

  // ─── Trading Leagues Routes ────────────────────────────────────────────────

  app.get("/api/leagues/me", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const stats = await storage.ensureLeagueStats(user.id);
      const season = await storage.ensureCurrentSeason();
      res.json({ stats, season });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get("/api/leagues/leaderboard", requireAuth, async (_req, res) => {
    try {
      const rows = await storage.getLeagueLeaderboard(50);
      res.json(rows);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get("/api/leagues/season/leaderboard", requireAuth, async (_req, res) => {
    try {
      const rows = await storage.getSeasonLeaderboard(50);
      res.json(rows);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/rival/match", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const rivalId = await storage.matchRival(user.id);
      res.json({ rivalId });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get("/api/leagues/rival", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const stats = await storage.getLeagueStats(user.id);
      if (!stats?.rivalId) return res.json({ rival: null });
      const [rivalStats, rivalUser] = await Promise.all([
        storage.getLeagueStats(stats.rivalId),
        storage.getUserById(stats.rivalId),
      ]);
      res.json({ rival: { ...rivalStats, displayName: rivalUser?.displayName, avatarUrl: rivalUser?.avatarUrl, username: rivalUser?.username } });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Showdowns
  app.get("/api/leagues/showdowns", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const list = await storage.getShowdowns(user.id);
      const enriched = await Promise.all(list.map(async s => {
        const [c, ee] = await Promise.all([storage.getUserById(s.challengerId), storage.getUserById(s.challengeeId)]);
        return { ...s, challengerName: c?.displayName, challengeeName: ee?.displayName, challengerAvatar: c?.avatarUrl, challengeeAvatar: ee?.avatarUrl };
      }));
      res.json(enriched);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/showdowns", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { challengeeId, timeframe } = req.body;
      if (!challengeeId || !["1h","1d","1w"].includes(timeframe)) return res.status(400).json({ message: "challengeeId and timeframe (1h/1d/1w) required" });
      const showdown = await storage.createShowdown(user.id, challengeeId, timeframe);
      res.json(showdown);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/showdowns/:id/accept", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const sd = await storage.acceptShowdown(req.params.id, user.id);
      res.json(sd);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/showdowns/:id/decline", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const sd = await storage.declineShowdown(req.params.id, user.id);
      res.json(sd);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/showdowns/:id/resolve", requireAuth, async (req, res) => {
    try {
      const sd = await storage.resolveShowdown(req.params.id);
      res.json(sd);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Hedge Funds
  app.get("/api/leagues/hedge-funds/mine", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const result = await storage.getUserHedgeFund(user.id);
      res.json(result);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get("/api/leagues/hedge-funds", requireAuth, async (_req, res) => {
    try {
      const funds = await storage.getHedgeFundLeaderboard();
      res.json(funds);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/hedge-funds", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { name, description, emoji } = req.body;
      if (!name) return res.status(400).json({ message: "Fund name is required" });
      const fund = await storage.createHedgeFund(user.id, name, description ?? "", emoji ?? "🏦");
      res.json(fund);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/hedge-funds/join", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { joinCode } = req.body;
      if (!joinCode) return res.status(400).json({ message: "Join code required" });
      const fund = await storage.joinHedgeFund(user.id, joinCode);
      res.json(fund);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/hedge-funds/leave", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.leaveHedgeFund(user.id);
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // Weekly Challenges
  app.get("/api/leagues/challenges", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const completions = await storage.getWeeklyChallengeCompletions(user.id);
      const completedKeys = new Set(completions.map(c => c.challengeKey.split("_").slice(1).join("_")));
      const challenges = [
        { id: "profit-target", title: "Profit Target", description: "Achieve 5%+ return on a single winning trade", type: "profit_pct", target: 5, lpReward: 150, emoji: "📈" },
        { id: "risk-manager", title: "Risk Manager", description: "Close 3 trades where you set a stop-loss", type: "stop_loss_trades", target: 3, lpReward: 125, emoji: "🛡️" },
        { id: "win-streak", title: "Win Streak", description: "Close 5 consecutive profitable trades", type: "win_streak", target: 5, lpReward: 200, emoji: "🔥" },
        { id: "discipline", title: "Disciplined Trader", description: "Set both stop-loss and take-profit on 5 trades", type: "full_risk_trades", target: 5, lpReward: 175, emoji: "⚖️" },
        { id: "volume", title: "Active Trader", description: "Close at least 10 trades this week", type: "trade_volume", target: 10, lpReward: 100, emoji: "⚡" },
      ];
      res.json(challenges.map(c => ({ ...c, completed: completedKeys.has(c.id) })));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post("/api/leagues/challenges/:id/claim", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const challengeMap: Record<string, number> = {
        "profit-target": 150, "risk-manager": 125, "win-streak": 200,
        "discipline": 175, "volume": 100,
      };
      const lp = challengeMap[req.params.id];
      if (!lp) return res.status(404).json({ message: "Challenge not found" });
      await storage.completeLeagueChallenge(user.id, req.params.id, lp);
      res.json({ ok: true, lpAwarded: lp });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Admin Console Commands ───────────────────────────────────────────────────
  app.post("/api/admin/console", requireAdmin, async (req, res) => {
    const { command } = req.body as { command: string };
    if (!command || typeof command !== "string") {
      return res.status(400).json({ output: "No command provided.", success: false });
    }

    const raw = command.startsWith("/") ? command.slice(1).trim() : command.trim();
    const parts = raw.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    // Helper: find user by displayName, username, or email (case-insensitive)
    async function findPlayer(query: string) {
      const all = await storage.getAllUsers();
      const q = query.toLowerCase();
      return all.find(u =>
        u.displayName?.toLowerCase() === q ||
        u.username?.toLowerCase() === q ||
        u.email?.toLowerCase() === q
      );
    }

    try {
      if (cmd === "give") {
        const rawAmount = parts[parts.length - 1];
        const playerName = parts.slice(1, parts.length - 1).join(" ");
        if (!playerName || !rawAmount || parts.length < 3) return res.json({ output: "Usage: /give <user> <amount>", success: false });
        const amount = parseFloat(rawAmount);
        if (isNaN(amount) || amount <= 0) return res.json({ output: "Amount must be a positive number.", success: false });
        const target = await findPlayer(playerName);
        if (!target) return res.json({ output: `User "${playerName}" not found.`, success: false });
        const newBalance = (target.simulatorBalance ?? 0) + amount;
        await storage.updateUser(target.id, { simulatorBalance: newBalance });
        return res.json({ output: `✓ Gave $${amount.toLocaleString()} to ${target.displayName}. New balance: $${newBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, success: true });

      } else if (cmd === "take") {
        const rawAmount = parts[parts.length - 1];
        const playerName = parts.slice(1, parts.length - 1).join(" ");
        if (!playerName || !rawAmount || parts.length < 3) return res.json({ output: "Usage: /take <user> <amount>", success: false });
        const amount = parseFloat(rawAmount);
        if (isNaN(amount) || amount <= 0) return res.json({ output: "Amount must be a positive number.", success: false });
        const target = await findPlayer(playerName);
        if (!target) return res.json({ output: `User "${playerName}" not found.`, success: false });
        const newBalance = Math.max(0, (target.simulatorBalance ?? 0) - amount);
        await storage.updateUser(target.id, { simulatorBalance: newBalance });
        return res.json({ output: `✓ Took $${amount.toLocaleString()} from ${target.displayName}. New balance: $${newBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, success: true });

      } else if (cmd === "freeze") {
        const playerName = parts.slice(1).join(" ");
        if (!playerName) return res.json({ output: "Usage: /freeze <user>", success: false });
        const target = await findPlayer(playerName);
        if (!target) return res.json({ output: `User "${playerName}" not found.`, success: false });
        if (target.isFrozen) return res.json({ output: `${target.displayName} is already frozen. Use /unfreeze to lift the freeze.`, success: false });
        await storage.updateUser(target.id, { isFrozen: true });
        return res.json({ output: `✓ ${target.displayName}'s trading account has been frozen.`, success: true });

      } else if (cmd === "unfreeze") {
        const playerName = parts.slice(1).join(" ");
        if (!playerName) return res.json({ output: "Usage: /unfreeze <user>", success: false });
        const target = await findPlayer(playerName);
        if (!target) return res.json({ output: `User "${playerName}" not found.`, success: false });
        await storage.updateUser(target.id, { isFrozen: false });
        return res.json({ output: `✓ ${target.displayName}'s account has been unfrozen. Trading resumed.`, success: true });

      } else if (cmd === "reset") {
        const playerName = parts.slice(1).join(" ");
        if (!playerName) return res.json({ output: "Usage: /reset <user>", success: false });
        const target = await findPlayer(playerName);
        if (!target) return res.json({ output: `User "${playerName}" not found.`, success: false });
        await storage.resetUserBalance(target.id, 5000);
        await storage.updateUser(target.id, { totalProfit: 0, isFrozen: false });
        return res.json({ output: `✓ ${target.displayName}'s portfolio has been wiped. Balance reset to $5,000.00.`, success: true });

      } else if (cmd === "assets") {
        const playerName = parts.slice(1).join(" ");
        if (!playerName) return res.json({ output: "Usage: /assets <user>", success: false });
        const target = await findPlayer(playerName);
        if (!target) return res.json({ output: `User "${playerName}" not found.`, success: false });
        const items = await storage.getPortfolioItems(target.id);
        const openTrades = await storage.getTrades(target.id);
        const openPositions = openTrades.filter(t => t.status === "open");
        if (items.length === 0 && openPositions.length === 0) {
          return res.json({ output: `${target.displayName} has no holdings. Balance: $${(target.simulatorBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, success: true });
        }
        const lines = [`${target.displayName} — Balance: $${(target.simulatorBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`];
        if (items.length > 0) {
          lines.push("Holdings:");
          items.forEach(item => lines.push(`  ${item.symbol}: ${item.quantity} shares @ $${item.currentPrice?.toFixed(2) ?? item.purchasePrice.toFixed(2)}`));
        }
        if (openPositions.length > 0) {
          lines.push("Open Trades:");
          openPositions.forEach(t => lines.push(`  ${t.type.toUpperCase()} ${t.quantity} ${t.symbol} @ $${t.entryPrice.toFixed(2)}`));
        }
        return res.json({ output: lines.join("\n"), success: true });

      } else if (cmd === "list") {
        const all = await storage.getAllUsers();
        if (all.length === 0) return res.json({ output: "No users found.", success: true });
        const lines = ["Users:"];
        for (const u of all) {
          const bal = `$${(u.simulatorBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const frozen = u.isFrozen ? " [FROZEN]" : "";
          const role = u.role === "admin" ? " (admin)" : "";
          lines.push(`  ${u.displayName ?? u.email}${role}${frozen} — ${bal}`);
        }
        return res.json({ output: lines.join("\n"), success: true });

      } else if (cmd === "help") {
        return res.json({
          output: [
            "Available commands:",
            "  /give <user> <amount>  — Grant cash to a user",
            "  /take <user> <amount>  — Fine a user",
            "  /freeze <user>         — Block a user from trading",
            "  /unfreeze <user>       — Lift a trading freeze",
            "  /reset <user>          — Wipe portfolio back to $5,000",
            "  /assets <user>         — View a user's holdings",
            "  /list                  — List all users and balances",
            "  /help                  — Show this list",
          ].join("\n"),
          success: true
        });

      } else {
        return res.json({ output: `Unknown command: "${cmd}". Type /help for available commands.`, success: false });
      }
    } catch (err: any) {
      return res.status(500).json({ output: `Error: ${err.message}`, success: false });
    }
  });

  // Background achievement check loop
  setInterval(async () => {
    try {
      const leaderboard = await storage.getLeaderboard();
      for (const user of leaderboard) {
        await checkAndAwardAchievements(user.id);
      }
    } catch (error) {
      console.error("Error in background achievement check:", error);
    }
  }, 60000); // Check every minute for active users
}
