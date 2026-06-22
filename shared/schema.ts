import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const membershipTiers = ["school", "casual", "premium"] as const;
export type MembershipTier = typeof membershipTiers[number];

export const userRoles = ["student", "teacher", "admin", "casual"] as const;
export type UserRole = typeof userRoles[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("student"),
  membershipTier: text("membership_tier"),
  membershipStatus: text("membership_status").default("inactive"),
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  subscriptionId: text("subscription_id"),
  simulatorBalance: real("simulator_balance").default(5000),
  totalProfit: real("total_profit").default(0),
  lessonsCompleted: integer("lessons_completed").default(0),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  teacherId: varchar("teacher_id"),
  schoolEmail: text("school_email"),
  dailyTradesCount: integer("daily_trades_count").default(0),
  lastTradeDate: text("last_trade_date"),
  xp: integer("xp").default(0),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  username: varchar("username", { length: 50 }).unique(),
  classroomTokens: integer("classroom_tokens").default(0),
  purchasedCosmetics: text("purchased_cosmetics").default("[]"),
  equippedTitle: text("equipped_title"),
  equippedFrame: text("equipped_frame"),
  loginStreak: integer("login_streak").default(0),
  lastLoginDate: text("last_login_date"),
  dailyRewardClaimedAt: text("daily_reward_claimed_at"),
  lastSeenAt: timestamp("last_seen_at"),
  presenceStatus: text("presence_status").default("offline"),
  simulatorTokensClaimed: integer("simulator_tokens_claimed").default(0),
  lessonStreak: integer("lesson_streak").default(0),
  lessonStreakBest: integer("lesson_streak_best").default(0),
  lastLessonDate: text("last_lesson_date"),
  streakFreezes: integer("streak_freezes").default(2),
  comboBest: integer("combo_best").default(0),
  dailyChallengesData: jsonb("daily_challenges_data"),
  luckyBonusClaimedAt: text("lucky_bonus_claimed_at"),
  isFrozen: boolean("is_frozen").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  duration: integer("duration").notNull(),
  order: integer("order").notNull(),
  isPublished: boolean("is_published").default(true),
  requiresSimulation: boolean("requires_simulation").default(false),
  prerequisites: jsonb("prerequisites").default([]),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  lessonId: varchar("lesson_id").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  orderType: text("order_type").notNull().default("market"),
  quantity: real("quantity").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  triggerPrice: real("trigger_price"),
  stopLossPrice: real("stop_loss_price"),
  takeProfitPrice: real("take_profit_price"),
  trailingPercent: real("trailing_percent"),
  trailingHighPrice: real("trailing_high_price"),
  linkedTradeId: varchar("linked_trade_id"),
  leverage: real("leverage").default(1),
  profit: real("profit"),
  status: text("status").notNull().default("open"),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  purchasePrice: real("purchase_price").notNull(),
  currentPrice: real("current_price").notNull(),
  quantity: real("quantity").notNull(),
  notes: text("notes"),
});

export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull(),
  classId: varchar("class_id"), // Added classId to link assignment to a class
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("profit_target"), // profit_target, lesson_completion, portfolio_balance, lesson
  targetValue: real("target_value").notNull().default(0),
  lessonId: varchar("lesson_id"), // For type="lesson" — the specific lesson to complete
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignmentProgress = pgTable("assignment_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull(),
  studentId: varchar("student_id").notNull(),
  completed: boolean("completed").default(false),
  currentValue: real("current_value").default(0),
  completedAt: timestamp("completed_at"),
});

export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  friendId: varchar("friend_id").notNull(),
  status: text("status").notNull().default("pending"),
});

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  adminUserId: varchar("admin_user_id").notNull(),
  subscriptionId: text("subscription_id"),
  seatCount: integer("seat_count").default(0),
  seatsUsed: integer("seats_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ageGroups = ["primary", "intermediate", "high_school"] as const;
export type AgeGroup = typeof ageGroups[number];

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  joinCode: text("join_code").notNull().unique(),
  ageGroup: text("age_group").default("high_school"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classStudents = pgTable("class_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  studentId: varchar("student_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  requirement: integer("requirement").notNull(),
  xpReward: integer("xp_reward").notNull().default(10),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  achievementId: varchar("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: integer("progress").default(0),
});

export const tradingTips = pgTable("trading_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  iconName: text("icon_name").notNull().default("Lightbulb"),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketInsights = pgTable("market_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sentiment: text("sentiment").notNull(),
  sector: text("sector").notNull(),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  replyToId: varchar("reply_to_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendGroupChats = pgTable("friend_group_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  creatorId: varchar("creator_id").notNull(),
  avatarEmoji: text("avatar_emoji").default("💬"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendGroupChatMembers = pgTable("friend_group_chat_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const friendGroupChatMessages = pgTable("friend_group_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  replyToId: varchar("reply_to_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cosmeticListings = pgTable("cosmetic_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  itemId: text("item_id").notNull(),
  itemType: text("item_type").notNull(),
  price: real("price").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tradeId: varchar("trade_id"),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  quantity: real("quantity").notNull(),
  pnl: real("pnl"),
  notes: text("notes"),
  strategy: text("strategy"),
  emotions: text("emotions"),
  lessons: text("lessons"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomEvents = pgTable("classroom_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const funZoneScores = pgTable("fun_zone_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  game: text("game").notNull(),
  score: integer("score").notNull(),
  tokensEarned: integer("tokens_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classGroupMessages = pgTable("class_group_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("message"),
  isDeleted: boolean("is_deleted").default(false),
  editedAt: timestamp("edited_at"),
  replyToId: varchar("reply_to_id"),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classGroupChats = pgTable("class_group_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classGroupChatMembers = pgTable("class_group_chat_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(),
  userId: varchar("user_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const classGroupChatMessages = pgTable("class_group_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  editedAt: timestamp("edited_at"),
  replyToId: varchar("reply_to_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classMessageReactions = pgTable("class_message_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull(),
  userId: varchar("user_id").notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classDirectMessages = pgTable("class_direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  editedAt: timestamp("edited_at"),
  replyToId: varchar("reply_to_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lessonNotes = pgTable("lesson_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  lessonId: varchar("lesson_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLessonNoteSchema = createInsertSchema(lessonNotes).omit({ id: true, createdAt: true, updatedAt: true });
export type LessonNote = typeof lessonNotes.$inferSelect;
export type InsertLessonNote = z.infer<typeof insertLessonNoteSchema>;

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertLessonSchema = createInsertSchema(lessons).omit({ id: true });
export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({ id: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, openedAt: true });
export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({ id: true });
export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true });
export const insertAssignmentProgressSchema = createInsertSchema(assignmentProgress).omit({ id: true });
export const insertFriendshipSchema = createInsertSchema(friendships).omit({ id: true });
export const insertStrategySchema = createInsertSchema(strategies).omit({ id: true, createdAt: true });
export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true, createdAt: true });
export const insertClassSchema = createInsertSchema(classes).omit({ id: true, createdAt: true });
export const insertClassStudentSchema = createInsertSchema(classStudents).omit({ id: true, joinedAt: true });
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true });
export const insertTradingTipSchema = createInsertSchema(tradingTips).omit({ id: true, createdAt: true });
export const insertMarketInsightSchema = createInsertSchema(marketInsights).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, editedAt: true, deletedAt: true });
export const insertFriendGroupChatSchema = createInsertSchema(friendGroupChats).omit({ id: true, createdAt: true });
export const insertFriendGroupChatMemberSchema = createInsertSchema(friendGroupChatMembers).omit({ id: true, joinedAt: true });
export const insertFriendGroupChatMessageSchema = createInsertSchema(friendGroupChatMessages).omit({ id: true, createdAt: true, editedAt: true, deletedAt: true });
export const insertCosmeticListingSchema = createInsertSchema(cosmeticListings).omit({ id: true, createdAt: true });
export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({ id: true, addedAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertClassroomEventSchema = createInsertSchema(classroomEvents).omit({ id: true, createdAt: true });
export const insertFunZoneScoreSchema = createInsertSchema(funZoneScores).omit({ id: true, createdAt: true });
export const insertClassGroupMessageSchema = createInsertSchema(classGroupMessages).omit({ id: true, createdAt: true, editedAt: true });
export const insertClassGroupChatSchema = createInsertSchema(classGroupChats).omit({ id: true, createdAt: true });
export const insertClassGroupChatMemberSchema = createInsertSchema(classGroupChatMembers).omit({ id: true, addedAt: true });
export const insertClassGroupChatMessageSchema = createInsertSchema(classGroupChatMessages).omit({ id: true, createdAt: true, editedAt: true });
export const insertClassMessageReactionSchema = createInsertSchema(classMessageReactions).omit({ id: true, createdAt: true });
export const insertClassDirectMessageSchema = createInsertSchema(classDirectMessages).omit({ id: true, createdAt: true, editedAt: true });

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  tier: varchar("tier", { length: 20 }).notNull(),
  description: varchar("description", { length: 200 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true, usedCount: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull(),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  lessonId: varchar("lesson_id").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  targetPrice: real("target_price").notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  triggered: boolean("triggered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, completedAt: true });
export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({ id: true, createdAt: true, triggered: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignmentProgress = z.infer<typeof insertAssignmentProgressSchema>;
export type AssignmentProgress = typeof assignmentProgress.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClassStudent = z.infer<typeof insertClassStudentSchema>;
export type ClassStudent = typeof classStudents.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertTradingTip = z.infer<typeof insertTradingTipSchema>;
export type TradingTip = typeof tradingTips.$inferSelect;
export type InsertMarketInsight = z.infer<typeof insertMarketInsightSchema>;
export type MarketInsight = typeof marketInsights.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertFriendGroupChat = z.infer<typeof insertFriendGroupChatSchema>;
export type FriendGroupChat = typeof friendGroupChats.$inferSelect;
export type InsertFriendGroupChatMember = z.infer<typeof insertFriendGroupChatMemberSchema>;
export type FriendGroupChatMember = typeof friendGroupChatMembers.$inferSelect;
export type InsertFriendGroupChatMessage = z.infer<typeof insertFriendGroupChatMessageSchema>;
export type FriendGroupChatMessage = typeof friendGroupChatMessages.$inferSelect;
export type InsertCosmeticListing = z.infer<typeof insertCosmeticListingSchema>;
export type CosmeticListing = typeof cosmeticListings.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertClassroomEvent = z.infer<typeof insertClassroomEventSchema>;
export type ClassroomEvent = typeof classroomEvents.$inferSelect;
export type InsertFunZoneScore = z.infer<typeof insertFunZoneScoreSchema>;
export type FunZoneScore = typeof funZoneScores.$inferSelect;
export type InsertClassGroupMessage = z.infer<typeof insertClassGroupMessageSchema>;
export type ClassGroupMessage = typeof classGroupMessages.$inferSelect;
export type InsertClassGroupChat = z.infer<typeof insertClassGroupChatSchema>;
export type ClassGroupChat = typeof classGroupChats.$inferSelect;
export type InsertClassGroupChatMember = z.infer<typeof insertClassGroupChatMemberSchema>;
export type ClassGroupChatMember = typeof classGroupChatMembers.$inferSelect;
export type InsertClassGroupChatMessage = z.infer<typeof insertClassGroupChatMessageSchema>;
export type ClassGroupChatMessage = typeof classGroupChatMessages.$inferSelect;
export type InsertClassMessageReaction = z.infer<typeof insertClassMessageReactionSchema>;
export type ClassMessageReaction = typeof classMessageReactions.$inferSelect;
export type InsertClassDirectMessage = z.infer<typeof insertClassDirectMessageSchema>;
export type ClassDirectMessage = typeof classDirectMessages.$inferSelect;

// ===== CLASSROOM ECONOMY TABLES =====

export const classroomEconomySettings = pgTable("classroom_economy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().unique(),
  currencyName: text("currency_name").notNull().default("Coins"),
  currencySymbol: text("currency_symbol").notNull().default("🪙"),
  lessonReward: integer("lesson_reward").notNull().default(50),
  quizReward: integer("quiz_reward").notNull().default(25),
  assignmentReward: integer("assignment_reward").notNull().default(100),
  simulatorConversionRate: real("simulator_conversion_rate").notNull().default(0.1),
  savingsInterestRate: real("savings_interest_rate").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomCurrencyTransactions = pgTable("classroom_currency_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  studentId: varchar("student_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomExpenses = pgTable("classroom_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(),
  frequency: text("frequency").notNull().default("weekly"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomExpensePayments = pgTable("classroom_expense_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull(),
  studentId: varchar("student_id").notNull(),
  classId: varchar("class_id").notNull(),
  amount: integer("amount").notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
});

export const classroomJobs = pgTable("classroom_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  payAmount: integer("pay_amount").notNull(),
  payFrequency: text("pay_frequency").notNull().default("weekly"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomJobAssignments = pgTable("classroom_job_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  studentId: varchar("student_id").notNull(),
  classId: varchar("class_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  lastPaidAt: timestamp("last_paid_at"),
});

export const classroomAuctions = pgTable("classroom_auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  emoji: text("emoji").default("🎁"),
  startingBid: integer("starting_bid").notNull().default(1),
  currentHighBid: integer("current_high_bid").default(0),
  currentHighBidderId: varchar("current_high_bidder_id"),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  winnerId: varchar("winner_id"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomAuctionBids = pgTable("classroom_auction_bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auctionId: varchar("auction_id").notNull(),
  studentId: varchar("student_id").notNull(),
  classId: varchar("class_id").notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomStoreItems = pgTable("classroom_store_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  emoji: text("emoji").default("🎁"),
  stock: integer("stock"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classroomStorePurchases = pgTable("classroom_store_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull(),
  studentId: varchar("student_id").notNull(),
  classId: varchar("class_id").notNull(),
  price: integer("price").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const classroomChallenges = pgTable("classroom_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull().default("most_coins"),
  rewardAmount: integer("reward_amount").default(0),
  rewardDescription: text("reward_description"),
  emoji: text("emoji").default("🏆"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  winnerId: varchar("winner_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClassroomChallengeSchema = createInsertSchema(classroomChallenges).omit({ id: true, createdAt: true, winnerId: true });
export type ClassroomChallenge = typeof classroomChallenges.$inferSelect;
export type InsertClassroomChallenge = z.infer<typeof insertClassroomChallengeSchema>;

// Purchasable assets: housing, business, investment property
export const classroomAssets = pgTable("classroom_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji").default("🏠"),
  type: varchar("type").notNull().default("property"), // property | business | investment
  price: integer("price").notNull(),
  value: integer("value").notNull(), // net worth contribution
  passiveIncome: integer("passive_income").default(0),
  incomeFrequency: varchar("income_frequency").default("weekly"),
  maintenanceCost: integer("maintenance_cost").default(0),
  maintenanceFrequency: varchar("maintenance_frequency").default("weekly"),
  maxOwners: integer("max_owners"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student-owned assets
export const studentAssets = pgTable("student_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  studentId: varchar("student_id").notNull(),
  assetId: varchar("asset_id").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
  lastIncomePaidAt: timestamp("last_income_paid_at"),
  lastMaintenancePaidAt: timestamp("last_maintenance_paid_at"),
});

// Student loans issued by teacher
export const economyLoans = pgTable("economy_loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  studentId: varchar("student_id").notNull(),
  principal: integer("principal").notNull(),
  balance: integer("balance").notNull(),
  interestRate: integer("interest_rate").notNull().default(10), // percentage
  isActive: boolean("is_active").default(true),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClassroomAssetSchema = createInsertSchema(classroomAssets).omit({ id: true, createdAt: true });
export const insertStudentAssetSchema = createInsertSchema(studentAssets).omit({ id: true, purchasedAt: true });
export const insertEconomyLoanSchema = createInsertSchema(economyLoans).omit({ id: true, createdAt: true });
export type ClassroomAsset = typeof classroomAssets.$inferSelect;
export type InsertClassroomAsset = z.infer<typeof insertClassroomAssetSchema>;
export type StudentAsset = typeof studentAssets.$inferSelect;
export type EconomyLoan = typeof economyLoans.$inferSelect;
export type InsertEconomyLoan = z.infer<typeof insertEconomyLoanSchema>;

export const insertClassroomEconomySettingsSchema = createInsertSchema(classroomEconomySettings).omit({ id: true, createdAt: true });
export const insertClassroomCurrencyTransactionSchema = createInsertSchema(classroomCurrencyTransactions).omit({ id: true, createdAt: true });
export const insertClassroomExpenseSchema = createInsertSchema(classroomExpenses).omit({ id: true, createdAt: true });
export const insertClassroomExpensePaymentSchema = createInsertSchema(classroomExpensePayments).omit({ id: true, paidAt: true });
export const insertClassroomJobSchema = createInsertSchema(classroomJobs).omit({ id: true, createdAt: true });
export const insertClassroomJobAssignmentSchema = createInsertSchema(classroomJobAssignments).omit({ id: true, assignedAt: true });
export const insertClassroomAuctionSchema = createInsertSchema(classroomAuctions).omit({ id: true, createdAt: true, closedAt: true });
export const insertClassroomAuctionBidSchema = createInsertSchema(classroomAuctionBids).omit({ id: true, createdAt: true });
export const insertClassroomStoreItemSchema = createInsertSchema(classroomStoreItems).omit({ id: true, createdAt: true });
export const insertClassroomStorePurchaseSchema = createInsertSchema(classroomStorePurchases).omit({ id: true, purchasedAt: true });

export type ClassroomEconomySettings = typeof classroomEconomySettings.$inferSelect;
export type InsertClassroomEconomySettings = z.infer<typeof insertClassroomEconomySettingsSchema>;
export type ClassroomCurrencyTransaction = typeof classroomCurrencyTransactions.$inferSelect;
export type InsertClassroomCurrencyTransaction = z.infer<typeof insertClassroomCurrencyTransactionSchema>;
export type ClassroomExpense = typeof classroomExpenses.$inferSelect;
export type InsertClassroomExpense = z.infer<typeof insertClassroomExpenseSchema>;
export type ClassroomJob = typeof classroomJobs.$inferSelect;
export type InsertClassroomJob = z.infer<typeof insertClassroomJobSchema>;
export type ClassroomJobAssignment = typeof classroomJobAssignments.$inferSelect;
export type ClassroomAuction = typeof classroomAuctions.$inferSelect;
export type InsertClassroomAuction = z.infer<typeof insertClassroomAuctionSchema>;
export type ClassroomAuctionBid = typeof classroomAuctionBids.$inferSelect;
export type ClassroomStoreItem = typeof classroomStoreItems.$inferSelect;
export type InsertClassroomStoreItem = z.infer<typeof insertClassroomStoreItemSchema>;
export type ClassroomStorePurchase = typeof classroomStorePurchases.$inferSelect;

// ===== FUN ZONE ECONOMY: INVENTORY & TRADING =====

export const userInventory = pgTable("user_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 50 }).notNull(), // "collectible" | "power_up"
  rarity: varchar("rarity", { length: 20 }), // "common" | "rare" | "epic" | "legendary"
  quantity: integer("quantity").notNull().default(1),
  tradable: boolean("tradable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tradeOffers = pgTable("trade_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  offeredInventoryIds: text("offered_inventory_ids").notNull().default("[]"),
  requestedInventoryIds: text("requested_inventory_ids").notNull().default("[]"),
  tokenBonus: integer("token_bonus").default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const studentMarketplaceListings = pgTable("student_marketplace_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  sellerName: varchar("seller_name", { length: 100 }).notNull(),
  inventoryId: varchar("inventory_id").notNull(),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 50 }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemEmoji: varchar("item_emoji", { length: 20 }).notNull(),
  rarity: varchar("rarity", { length: 20 }),
  price: integer("price").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spinHistory = pgTable("spin_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  spinTier: varchar("spin_tier", { length: 20 }).notNull(),
  tokensSpent: integer("tokens_spent").notNull(),
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  rewardId: varchar("reward_id", { length: 100 }),
  rewardAmount: integer("reward_amount"),
  rewardName: varchar("reward_name", { length: 100 }),
  rewardEmoji: varchar("reward_emoji", { length: 20 }),
  rarity: varchar("rarity", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketplaceAuctions = pgTable("marketplace_auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  sellerName: varchar("seller_name", { length: 100 }).notNull(),
  inventoryId: varchar("inventory_id").notNull(),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemEmoji: varchar("item_emoji", { length: 20 }).notNull(),
  rarity: varchar("rarity", { length: 20 }),
  startPrice: integer("start_price").notNull(),
  currentBid: integer("current_bid").notNull().default(0),
  currentBidderId: varchar("current_bidder_id"),
  currentBidderName: varchar("current_bidder_name", { length: 100 }),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auctionBids = pgTable("auction_bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auctionId: varchar("auction_id").notNull(),
  bidderId: varchar("bidder_id").notNull(),
  bidderName: varchar("bidder_name", { length: 100 }).notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketplaceBets = pgTable("marketplace_bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull(),
  creatorId: varchar("creator_id").notNull(),
  creatorName: varchar("creator_name", { length: 100 }).notNull(),
  question: text("question").notNull(),
  optionA: varchar("option_a", { length: 100 }).notNull().default("Yes"),
  optionB: varchar("option_b", { length: 100 }).notNull().default("No"),
  totalPoolA: integer("total_pool_a").notNull().default(0),
  totalPoolB: integer("total_pool_b").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  result: varchar("result", { length: 1 }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const betEntries = pgTable("bet_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  betId: varchar("bet_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name", { length: 100 }).notNull(),
  option: varchar("option", { length: 1 }).notNull(),
  amount: integer("amount").notNull(),
  payout: integer("payout"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Trading Leagues ──────────────────────────────────────────────────────────

export const playerLeagueStats = pgTable("player_league_stats", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  lp: integer("lp").default(0).notNull(),
  weeklyLp: integer("weekly_lp").default(0).notNull(),
  seasonLp: integer("season_lp").default(0).notNull(),
  peakLp: integer("peak_lp").default(0).notNull(),
  rivalId: varchar("rival_id"),
  rivalWins: integer("rival_wins").default(0).notNull(),
  rivalLosses: integer("rival_losses").default(0).notNull(),
  showdownWins: integer("showdown_wins").default(0).notNull(),
  showdownLosses: integer("showdown_losses").default(0).notNull(),
  weeklyResetAt: timestamp("weekly_reset_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const showdowns = pgTable("showdowns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengerId: varchar("challenger_id").notNull().references(() => users.id),
  challengeeId: varchar("challengee_id").notNull().references(() => users.id),
  timeframe: text("timeframe").notNull(),
  status: text("status").default("pending").notNull(),
  challengerLpStart: integer("challenger_lp_start").default(0),
  challengeeLpStart: integer("challengee_lp_start").default(0),
  challengerLpGained: integer("challenger_lp_gained").default(0),
  challengeeLpGained: integer("challengee_lp_gained").default(0),
  winnerUserId: varchar("winner_user_id"),
  startedAt: timestamp("started_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hedgeFunds = pgTable("hedge_funds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  joinCode: text("join_code").notNull().unique(),
  logoEmoji: text("logo_emoji").default("🏦"),
  weeklyLpTotal: integer("weekly_lp_total").default(0),
  allTimeLpTotal: integer("all_time_lp_total").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hedgeFundMembers = pgTable("hedge_fund_members", {
  userId: varchar("user_id").notNull().references(() => users.id),
  fundId: varchar("fund_id").notNull().references(() => hedgeFunds.id),
  role: text("role").default("member").notNull(),
  weeklyLpContrib: integer("weekly_lp_contrib").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const challengeCompletions = pgTable("challenge_completions", {
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeKey: text("challenge_key").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  lpAwarded: integer("lp_awarded").default(0),
});

export const leagueSeasons = pgTable("league_seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: integer("number").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
});

export type PlayerLeagueStat = typeof playerLeagueStats.$inferSelect;
export type InsertPlayerLeagueStat = typeof playerLeagueStats.$inferInsert;
export type Showdown = typeof showdowns.$inferSelect;
export type InsertShowdown = typeof showdowns.$inferInsert;
export type HedgeFund = typeof hedgeFunds.$inferSelect;
export type InsertHedgeFund = typeof hedgeFunds.$inferInsert;
export type HedgeFundMember = typeof hedgeFundMembers.$inferSelect;
export type LeagueSeason = typeof leagueSeasons.$inferSelect;
export type ChallengeCompletion = typeof challengeCompletions.$inferSelect;

export const insertShowdownSchema = createInsertSchema(showdowns).omit({ id: true, createdAt: true });
export const insertHedgeFundSchema = createInsertSchema(hedgeFunds).omit({ id: true, createdAt: true });

export const insertUserInventorySchema = createInsertSchema(userInventory).omit({ id: true, createdAt: true });
export const insertTradeOfferSchema = createInsertSchema(tradeOffers).omit({ id: true, createdAt: true, respondedAt: true });
export const insertMarketplaceListingSchema = createInsertSchema(studentMarketplaceListings).omit({ id: true, createdAt: true });
export type UserInventory = typeof userInventory.$inferSelect;
export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type TradeOffer = typeof tradeOffers.$inferSelect;
export type InsertTradeOffer = z.infer<typeof insertTradeOfferSchema>;
export type MarketplaceListing = typeof studentMarketplaceListings.$inferSelect;
export type SpinHistory = typeof spinHistory.$inferSelect;
export type MarketplaceAuction = typeof marketplaceAuctions.$inferSelect;
export type AuctionBid = typeof auctionBids.$inferSelect;
export type MarketplaceBet = typeof marketplaceBets.$inferSelect;
export type BetEntry = typeof betEntries.$inferSelect;

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").optional(),
  bio: z.string().max(200, "Bio must be at most 200 characters").optional(),
  avatarUrl: z.string().url("Invalid URL").optional().nullable(),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 200 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores")
    .optional()
    .nullable(),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  role: z.enum(userRoles).optional(),
  schoolId: z.string().optional().nullable(),
  schoolEmail: z.union([z.string().email("Invalid school email"), z.literal(""), z.null()]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
