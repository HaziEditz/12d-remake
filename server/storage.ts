import { db } from "./db";
import { eq, desc, asc, and, isNull, ilike, or, sql, sum, ne, inArray } from "drizzle-orm";
import { 
  users, lessons, lessonProgress, trades, portfolioItems, assignments, strategies,
  schools, classes, classStudents, achievements, userAchievements, tradingTips, marketInsights,
  friendships, chatMessages, watchlistItems, journalEntries, notifications, promoCodes,
  quizzes, quizAttempts, priceAlerts, classroomEvents, funZoneScores, classGroupMessages,
  classroomEconomySettings, classroomCurrencyTransactions, classroomExpenses, classroomExpensePayments,
  classroomJobs, classroomJobAssignments, classroomAuctions, classroomAuctionBids,
  classroomStoreItems, classroomStorePurchases, classroomChallenges, economyLoans,
  classroomAssets, studentAssets, userInventory, tradeOffers, studentMarketplaceListings, spinHistory,
  marketplaceAuctions, auctionBids, marketplaceBets, betEntries,
  classGroupChats, classGroupChatMembers, classGroupChatMessages,
  classMessageReactions, classDirectMessages,
  friendGroupChats, friendGroupChatMembers, friendGroupChatMessages, cosmeticListings,
  playerLeagueStats, showdowns, hedgeFunds, hedgeFundMembers, challengeCompletions, leagueSeasons,
  type User, type InsertUser, type Lesson, type InsertLesson, type LessonProgress,
  type Trade, type InsertTrade, type PortfolioItem, type InsertPortfolioItem,
  type Assignment, type InsertAssignment, type School, type InsertSchool,
  type Class, type InsertClass, type ClassStudent, type InsertClassStudent,
  type Achievement, type InsertAchievement, type UserAchievement, type InsertUserAchievement,
  type TradingTip, type InsertTradingTip, type MarketInsight, type InsertMarketInsight,
  type Friendship, type InsertFriendship, type Strategy, type InsertStrategy,
  type ChatMessage, type InsertChatMessage,
  type FriendGroupChat, type FriendGroupChatMessage, type CosmeticListing,
  type WatchlistItem, type InsertWatchlistItem, type JournalEntry, type InsertJournalEntry,
  type Notification, type InsertNotification,
  type PromoCode, type InsertPromoCode,
  type Quiz, type InsertQuiz, type QuizAttempt, type InsertQuizAttempt,
  type PriceAlert, type InsertPriceAlert,
  type ClassroomEvent, type InsertClassroomEvent,
  type FunZoneScore, type InsertFunZoneScore,
  type ClassGroupMessage, type InsertClassGroupMessage,
  type ClassGroupChat, type InsertClassGroupChat,
  type ClassGroupChatMember, type InsertClassGroupChatMember,
  type ClassGroupChatMessage, type InsertClassGroupChatMessage,
  type ClassMessageReaction, type InsertClassMessageReaction,
  type ClassDirectMessage, type InsertClassDirectMessage,
  type ClassroomEconomySettings, type InsertClassroomEconomySettings,
  type ClassroomCurrencyTransaction, type InsertClassroomCurrencyTransaction,
  type ClassroomExpense, type InsertClassroomExpense,
  type ClassroomJob, type InsertClassroomJob,
  type ClassroomJobAssignment,
  type ClassroomAuction, type InsertClassroomAuction,
  type ClassroomAuctionBid,
  type ClassroomStoreItem, type InsertClassroomStoreItem,
  type ClassroomStorePurchase,
  type ClassroomChallenge, type InsertClassroomChallenge,
  type ClassroomAsset, type InsertClassroomAsset, type StudentAsset,
  type UserInventory, type InsertUserInventory,
  type TradeOffer,
  type PlayerLeagueStat, type Showdown, type HedgeFund, type HedgeFundMember,
  type LeagueSeason, type ChallengeCompletion
} from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  createUser(data: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getLeaderboard(scope?: string, userId?: string): Promise<User[]>;
  getStudentsByTeacher(teacherId: string): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  
  // Lessons
  createLesson(data: InsertLesson): Promise<Lesson>;
  getLessons(): Promise<Lesson[]>;
  getLessonById(id: string): Promise<Lesson | undefined>;
  updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<void>;
  
  // Lesson Progress
  getLessonProgress(userId: string): Promise<LessonProgress[]>;
  updateLessonProgress(userId: string, lessonId: string, completed: boolean): Promise<void>;
  
  // Trades
  createTrade(data: InsertTrade): Promise<Trade>;
  getOpenTrades(userId: string): Promise<Trade[]>;
  getPendingTrades(userId: string): Promise<Trade[]>;
  getAllActiveTrades(userId: string): Promise<Trade[]>;
  updateTrade(id: string, data: Partial<Trade>): Promise<Trade | undefined>;
  closeTrade(id: string, exitPrice: number): Promise<Trade | undefined>;
  cancelTrade(id: string): Promise<Trade | undefined>;
  getTradesByUser(userId: string): Promise<Trade[]>;
  getTotalTradesCount(): Promise<number>;
  getTradeById(id: string): Promise<Trade | undefined>;
  
  // Portfolio
  getPortfolio(userId: string): Promise<PortfolioItem[]>;
  createPortfolioItem(data: InsertPortfolioItem): Promise<PortfolioItem>;
  updatePortfolioItem(id: string, data: Partial<PortfolioItem>): Promise<PortfolioItem | undefined>;
  deletePortfolioItem(id: string): Promise<void>;
  
  // Assignments
  createAssignment(data: InsertAssignment): Promise<Assignment>;
  getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>;
  getAssignmentsByClass(classId: string): Promise<Assignment[]>;
  getAssignmentProgress(assignmentId: string): Promise<AssignmentProgress[]>;
  getAssignmentProgressForStudent(studentId: string): Promise<AssignmentProgress[]>;
  updateAssignmentProgress(data: InsertAssignmentProgress): Promise<AssignmentProgress>;
  getAssignmentById(id: string): Promise<Assignment | undefined>;
  
  // Admin stats
  getUsersCount(): Promise<number>;
  getLessonsCount(): Promise<number>;
  getAllUsers(): Promise<Array<Pick<User, "id" | "email" | "displayName" | "role" | "membershipTier" | "simulatorBalance" | "totalProfit" | "createdAt">>>;
  resetUserBalance(userId: string, amount: number): Promise<void>;
  resetAllBalances(amount: number): Promise<void>;
  closeAllOpenTradesForUser(userId: string): Promise<number>;
  closeAllOpenTrades(): Promise<number>;
  
  // Schools
  createSchool(data: InsertSchool): Promise<School>;
  getSchoolByAdmin(adminUserId: string): Promise<School | undefined>;
  updateSchool(id: string, data: Partial<School>): Promise<School | undefined>;
  
  // Schools
  getSchools(): Promise<School[]>;

  // Classes
  createClass(data: InsertClass): Promise<Class>;
  getClassesByTeacher(teacherId: string): Promise<Class[]>;
  getClassById(id: string): Promise<Class | undefined>;
  getClassByJoinCode(joinCode: string): Promise<Class | undefined>;
  deleteClass(id: string): Promise<void>;
  
  // Class Students
  addStudentToClass(data: InsertClassStudent): Promise<ClassStudent>;
  getStudentsByClass(classId: string): Promise<User[]>;
  removeStudentFromClass(classId: string, studentId: string): Promise<void>;
  getClassesByStudent(studentId: string): Promise<Class[]>;

  // Class Group Chat
  getClassGroupMessages(classId: string, limit?: number): Promise<(ClassGroupMessage & { senderName: string; senderRole: string })[]>;
  createClassGroupMessage(data: InsertClassGroupMessage): Promise<ClassGroupMessage>;
  getClassGroupMessageCount(classId: string, since?: Date): Promise<number>;
  editClassGroupMessage(messageId: string, userId: string, content: string): Promise<ClassGroupMessage | undefined>;
  deleteClassGroupMessage(messageId: string, userId: string): Promise<boolean>;
  // Group Chats (within a class)
  getGroupChats(classId: string, userId: string): Promise<(ClassGroupChat & { memberCount: number; lastMessage?: string })[]>;
  createGroupChat(data: InsertClassGroupChat, memberIds: string[]): Promise<ClassGroupChat>;
  getGroupChatMembers(chatId: string): Promise<{ userId: string; displayName: string; role: string }[]>;
  addGroupChatMember(chatId: string, userId: string): Promise<void>;
  removeGroupChatMember(chatId: string, userId: string): Promise<void>;
  getGroupChatMessages(chatId: string, userId: string, limit?: number): Promise<(ClassGroupChatMessage & { senderName: string; senderRole: string })[]>;
  sendGroupChatMessage(data: InsertClassGroupChatMessage): Promise<ClassGroupChatMessage>;
  editGroupChatMessage(messageId: string, userId: string, content: string): Promise<ClassGroupChatMessage | undefined>;
  deleteGroupChatMessage(messageId: string, userId: string): Promise<boolean>;
  // Pin/unpin class message
  pinClassMessage(messageId: string, pin: boolean): Promise<void>;
  getPinnedClassMessages(classId: string): Promise<(ClassGroupMessage & { senderName: string })[]>;
  // Message reactions
  addMessageReaction(data: InsertClassMessageReaction): Promise<ClassMessageReaction>;
  removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void>;
  getMessageReactions(messageIds: string[]): Promise<ClassMessageReaction[]>;
  // Direct Messages
  getDMConversations(userId: string, classId: string): Promise<{ partnerId: string; partnerName: string; partnerRole: string; lastMessage: string; lastAt: Date; unreadCount: number }[]>;
  getDMMessages(userId: string, partnerId: string, classId: string, limit?: number): Promise<(ClassDirectMessage & { senderName: string })[]>;
  sendDM(data: InsertClassDirectMessage): Promise<ClassDirectMessage>;
  editDM(messageId: string, userId: string, content: string): Promise<ClassDirectMessage | undefined>;
  deleteDM(messageId: string, userId: string): Promise<boolean>;
  markDMsRead(userId: string, partnerId: string, classId: string): Promise<void>;
  getDMUnreadCount(userId: string, classId: string): Promise<number>;
  // Online presence
  updateLastSeen(userId: string, status?: string): Promise<void>;
  getOnlineUsers(userIds: string[]): Promise<Record<string, boolean>>;
  getUserPresence(userIds: string[]): Promise<Record<string, "online" | "idle" | "offline">>;
  
  // Achievements
  createAchievement(data: InsertAchievement): Promise<Achievement>;
  upsertAchievement(data: InsertAchievement): Promise<Achievement>;
  getAchievements(): Promise<Achievement[]>;
  getAchievementById(id: string): Promise<Achievement | undefined>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  updateAchievementProgress(userId: string, achievementId: string, progress: number): Promise<void>;
  createUserAchievement(data: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievement(id: string, updates: Partial<UserAchievement>): Promise<UserAchievement | undefined>;
  getAchievementStats(): Promise<{achievementId: string, count: number, percentage: number}[]>;
  
  // Trading Tips
  createTradingTip(data: InsertTradingTip): Promise<TradingTip>;
  getTradingTips(): Promise<TradingTip[]>;
  getAllTradingTips(): Promise<TradingTip[]>;
  getTradingTipById(id: string): Promise<TradingTip | undefined>;
  updateTradingTip(id: string, data: Partial<TradingTip>): Promise<TradingTip | undefined>;
  deleteTradingTip(id: string): Promise<void>;
  
  // Market Insights
  createMarketInsight(data: InsertMarketInsight): Promise<MarketInsight>;
  getMarketInsights(): Promise<MarketInsight[]>;
  getAllMarketInsights(): Promise<MarketInsight[]>;
  getMarketInsightById(id: string): Promise<MarketInsight | undefined>;
  updateMarketInsight(id: string, data: Partial<MarketInsight>): Promise<MarketInsight | undefined>;
  deleteMarketInsight(id: string): Promise<void>;
  getMarketInsightsCount(): Promise<number>;

  // Strategies
  createStrategy(data: InsertStrategy): Promise<Strategy>;
  getStrategies(): Promise<Strategy[]>;
  getAllStrategies(): Promise<Strategy[]>;
  getStrategyById(id: string): Promise<Strategy | undefined>;
  updateStrategy(id: string, data: Partial<Strategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: string): Promise<void>;
  
  // Friends
  getFriends(userId: string): Promise<{friendship: Friendship, friend: User}[]>;
  getFriendRequests(userId: string): Promise<{friendship: Friendship, sender: User}[]>;
  sendFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  acceptFriendRequest(id: string): Promise<Friendship | undefined>;
  rejectFriendRequest(id: string): Promise<void>;
  removeFriend(id: string, userId: string): Promise<void>;
  getFriendshipById(id: string): Promise<Friendship | undefined>;
  getFriendCount(userId: string): Promise<number>;
  
  // Simulated Prices
  getSimulatedPrices(): Promise<Record<string, number>>;
  updateSimulatedPrice(symbol: string, price: number): Promise<void>;
  
  // Chat Messages
  getChatMessages(userId1: string, userId2: string): Promise<ChatMessage[]>;
  sendChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(senderId: string, receiverId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  editChatMessage(id: string, userId: string, content: string): Promise<ChatMessage | undefined>;
  deleteChatMessage(id: string, userId: string): Promise<void>;

  // Group Chats
  createFriendGroupChat(name: string, creatorId: string, emoji: string, memberIds: string[]): Promise<FriendGroupChat>;
  getUserGroupChats(userId: string): Promise<Array<FriendGroupChat & { members: string[]; lastMessage?: any }>>;
  getGroupChatById(groupId: string): Promise<FriendGroupChat | undefined>;
  addGroupChatMember(groupId: string, userId: string): Promise<void>;
  removeGroupChatMember(groupId: string, userId: string): Promise<void>;
  getGroupChatMessages(groupId: string): Promise<FriendGroupChatMessage[]>;
  sendGroupChatMessage(groupId: string, senderId: string, content: string, replyToId?: string): Promise<FriendGroupChatMessage>;
  editGroupChatMessage(id: string, userId: string, content: string): Promise<FriendGroupChatMessage | undefined>;
  deleteGroupChatMessage(id: string, userId: string): Promise<void>;

  // Cosmetic Marketplace
  getCosmeticListings(): Promise<Array<CosmeticListing & { seller: { displayName: string; avatarUrl: string | null } }>>;
  createCosmeticListing(sellerId: string, itemId: string, itemType: string, price: number): Promise<CosmeticListing>;
  buyCosmeticListing(listingId: string, buyerId: string): Promise<{ listing: CosmeticListing; newBalance: number }>;
  cancelCosmeticListing(listingId: string, sellerId: string): Promise<void>;
  
  // Watchlist
  getWatchlist(userId: string): Promise<WatchlistItem[]>;
  addWatchlistItem(data: InsertWatchlistItem): Promise<WatchlistItem>;
  removeWatchlistItem(userId: string, symbol: string): Promise<void>;
  
  // Journal
  getJournalEntries(userId: string): Promise<JournalEntry[]>;
  createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, data: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string): Promise<void>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;

  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  getPromoCodes(): Promise<PromoCode[]>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: string): Promise<void>;
  incrementPromoCodeUsed(id: string): Promise<void>;

  createQuiz(data: InsertQuiz): Promise<Quiz>;
  getQuizByLessonId(lessonId: string): Promise<Quiz | undefined>;
  updateQuiz(id: string, data: Partial<Quiz>): Promise<Quiz | undefined>;
  deleteQuiz(id: string): Promise<void>;
  createQuizAttempt(data: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]>;
  getBestQuizAttempt(userId: string, lessonId: string): Promise<QuizAttempt | undefined>;

  createPriceAlert(data: InsertPriceAlert): Promise<PriceAlert>;
  getPriceAlertsByUser(userId: string): Promise<PriceAlert[]>;
  deletePriceAlert(id: string, userId: string): Promise<void>;
  triggerPriceAlert(id: string): Promise<void>;
  getActivePriceAlerts(): Promise<PriceAlert[]>;

  getUserByUsername(username: string): Promise<User | undefined>;
  getFinancialStats(): Promise<{ totalUsers: number; activeSubscribers: number; trialUsers: number; byTier: Record<string, number>; recentSignups: User[] }>;
  createClassroomEvent(data: InsertClassroomEvent): Promise<ClassroomEvent>;
  getClassroomEvents(classId: string): Promise<ClassroomEvent[]>;
  deleteClassroomEvent(id: string): Promise<void>;
  addClassroomTokens(userId: string, tokens: number): Promise<void>;
  purchaseCosmetic(userId: string, cosmeticId: string, cost: number): Promise<{ success: boolean; message: string; newBalance: number }>;
  equipCosmetic(userId: string, type: "title" | "frame", value: string | null): Promise<void>;
  saveFunZoneScore(data: InsertFunZoneScore): Promise<FunZoneScore>;
  getFunZoneLeaderboard(game: string): Promise<{ userId: string; displayName: string; score: number }[]>;
  claimDailyReward(userId: string): Promise<{ success: boolean; tokens: number; streak: number; message: string }>;
  getInventory(userId: string): Promise<UserInventory[]>;
  addToInventory(data: InsertUserInventory): Promise<UserInventory>;
  removeFromInventory(id: string, userId: string): Promise<void>;
  buyShopItem(userId: string, itemId: string, itemType: string, cost: number): Promise<{ success: boolean; message: string; item?: UserInventory }>;
  openBlindBag(userId: string, bagId: string, cost: number): Promise<{ success: boolean; item?: UserInventory; rarity?: string; message: string }>;
  getTradeOffers(userId: string): Promise<TradeOffer[]>;
  createTradeOffer(fromUserId: string, toUserId: string, offeredInventoryIds: string[], requestedInventoryIds: string[], tokenBonus: number, message: string): Promise<TradeOffer>;
  respondToTradeOffer(id: string, userId: string, action: "accept" | "reject" | "cancel"): Promise<{ success: boolean; message: string }>;
  getTokenLeaderboard(): Promise<{ userId: string; displayName: string; classroomTokens: number; loginStreak: number }[]>;
  updateUserTokens(userId: string, delta: number): Promise<void>;
  claimSimulatorTokens(userId: string): Promise<{ tokensAwarded: number; totalClaimed: number }>;
  addInventoryItem(userId: string, itemId: string, itemType: string, rarity: string, quantity: number): Promise<UserInventory>;
  saveSpinHistory(data: { userId: string; spinTier: string; tokensSpent: number; rewardType: string; rewardId?: string | null; rewardAmount?: number | null; rewardName: string; rewardEmoji: string; rarity: string }): Promise<void>;
  // Academy gamification
  completeLessonAndAward(userId: string, lessonId: string, baseXp: number): Promise<{ xpAwarded: number; newXp: number; leveledUp: boolean; oldLevel: number; newLevel: number; streak: number; bestStreak: number; streakProtected: boolean; bonusXp: number; isNewCompletion: boolean }>;
  awardQuizXp(userId: string, lessonId: string, score: number, total: number, comboMultiplier: number, timeBonus: number): Promise<{ xpAwarded: number; newXp: number; leveledUp: boolean; oldLevel: number; newLevel: number; passed: boolean }>;
  getStudentLessonAssignments(userId: string): Promise<any[]>;
  getDailyChallenges(userId: string): Promise<{ date: string; challenges: { id: string; type: string; title: string; description: string; target: number; progress: number; reward: number; claimed: boolean; emoji: string }[] }>;
  updateChallengeProgress(userId: string, type: string, increment: number): Promise<void>;
  claimChallenge(userId: string, challengeId: string): Promise<{ success: boolean; xpAwarded: number; tokensAwarded: number; message: string }>;
  getLearningStats(userId: string): Promise<{ totalLessons: number; completedLessons: number; totalQuizAttempts: number; avgAccuracy: number; bestStreak: number; currentStreak: number; bestCombo: number; recentAccuracy: number; improvedBy: number }>;
  claimLuckyBonus(userId: string): Promise<{ success: boolean; xpAwarded: number; tokensAwarded: number; rewardEmoji: string; rewardName: string; message: string }>;
  getLuckyBonusStatus(userId: string): Promise<{ available: boolean; nextAvailable: string | null }>;
  getMarketplaceListings(userId: string): Promise<any[]>;
  createMarketplaceListing(userId: string, inventoryId: string, price: number): Promise<{ success: boolean; message: string; listing?: any }>;
  buyMarketplaceListing(listingId: string, buyerId: string): Promise<{ success: boolean; message: string }>;
  cancelMarketplaceListing(listingId: string, userId: string): Promise<{ success: boolean; message: string }>;
  getMarketplaceHistory(userId: string): Promise<any[]>;
  // Auctions
  getAuctions(userId: string): Promise<any[]>;
  createAuction(userId: string, inventoryId: string, startPrice: number, durationMinutes: number): Promise<{ success: boolean; message: string; auction?: any }>;
  placeBid(auctionId: string, bidderId: string, amount: number): Promise<{ success: boolean; message: string }>;
  cancelAuction(auctionId: string, userId: string): Promise<{ success: boolean; message: string }>;
  settleExpiredAuctions(classId: string): Promise<void>;
  // Bets
  getBets(userId: string): Promise<any[]>;
  createBet(userId: string, question: string, optionA: string, optionB: string, expiresInMinutes: number): Promise<{ success: boolean; message: string; bet?: any }>;
  enterBet(betId: string, userId: string, option: string, amount: number): Promise<{ success: boolean; message: string }>;
  resolveBet(betId: string, userId: string, result: string): Promise<{ success: boolean; message: string; payouts?: any[] }>;
  cancelBet(betId: string, userId: string): Promise<{ success: boolean; message: string }>;
  getMyBetEntries(userId: string): Promise<any[]>;
  // Trading Leagues
  ensureLeagueStats(userId: string): Promise<PlayerLeagueStat>;
  getLeagueStats(userId: string): Promise<PlayerLeagueStat | undefined>;
  awardLP(userId: string, amount: number): Promise<PlayerLeagueStat>;
  getLeagueLeaderboard(limit?: number): Promise<Array<PlayerLeagueStat & { displayName: string; avatarUrl: string | null; equippedTitle: string | null; username: string | null }>>;
  getSeasonLeaderboard(limit?: number): Promise<Array<PlayerLeagueStat & { displayName: string; avatarUrl: string | null; username: string | null }>>;
  matchRival(userId: string): Promise<string | null>;
  createShowdown(challengerId: string, challengeeId: string, timeframe: string): Promise<Showdown>;
  getShowdowns(userId: string): Promise<Showdown[]>;
  acceptShowdown(showdownId: string, userId: string): Promise<Showdown>;
  declineShowdown(showdownId: string, userId: string): Promise<Showdown>;
  resolveShowdown(showdownId: string): Promise<Showdown>;
  createHedgeFund(ownerId: string, name: string, description: string, emoji: string): Promise<HedgeFund>;
  joinHedgeFund(userId: string, joinCode: string): Promise<HedgeFund>;
  leaveHedgeFund(userId: string): Promise<void>;
  getUserHedgeFund(userId: string): Promise<{ fund: HedgeFund; members: Array<{ userId: string; displayName: string; lp: number; role: string; weeklyLpContrib: number }> } | null>;
  getHedgeFundLeaderboard(): Promise<Array<HedgeFund & { memberCount: number }>>;
  getCurrentSeason(): Promise<LeagueSeason | null>;
  ensureCurrentSeason(): Promise<LeagueSeason>;
  getWeeklyChallengeCompletions(userId: string): Promise<ChallengeCompletion[]>;
  completeLeagueChallenge(userId: string, challengeKey: string, lpReward: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      ...data,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getLeaderboard(scope?: string, userId?: string): Promise<User[]> {
    if (scope === "class" && userId) {
      const enrollments = await db.select().from(classStudents).where(eq(classStudents.studentId, userId));
      if (enrollments.length > 0) {
        const classIds = enrollments.map(e => e.classId);
        const classmateEnrollments = await db.select().from(classStudents).where(sql`${classStudents.classId} IN ${classIds}`);
        const classmateIds = [...new Set(classmateEnrollments.map(e => e.studentId))];
        return db.select().from(users).where(sql`${users.id} IN ${classmateIds}`).orderBy(desc(users.totalProfit));
      }
      return []; // Not enrolled in any class — return empty instead of all users
    } else if (scope === "friends" && userId) {
      const friendsData = await this.getFriends(userId);
      const friendIds = friendsData.map(f => f.friend.id);
      friendIds.push(userId); // Include self in friends leaderboard
      return db.select().from(users).where(sql`${users.id} IN ${friendIds}`).orderBy(desc(users.totalProfit));
    }
    return db.select().from(users).orderBy(desc(users.totalProfit)).limit(50);
  }

  async getStudentsByTeacher(teacherId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.teacherId, teacherId));
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(users)
      .where(
        or(
          ilike(users.displayName, searchPattern),
          ilike(users.email, searchPattern)
        )
      )
      .limit(20);
  }

  // Lessons
  async createLesson(data: InsertLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessons).values(data).returning();
    return lesson;
  }

  async getLessons(): Promise<Lesson[]> {
    return db.select().from(lessons).where(eq(lessons.isPublished, true)).orderBy(lessons.order);
  }

  async getLessonById(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    return lesson;
  }

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson | undefined> {
    const [lesson] = await db.update(lessons).set(data).where(eq(lessons.id, id)).returning();
    return lesson;
  }

  async deleteLesson(id: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  // Lesson Progress
  async getLessonProgress(userId: string): Promise<LessonProgress[]> {
    return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
  }

  async updateLessonProgress(userId: string, lessonId: string, completed: boolean): Promise<void> {
    const existing = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
      .limit(1);
    
    const wasCompleted = existing.length > 0 && existing[0].completed;
    const isNewCompletion = completed && !wasCompleted;
    const isUncompletion = !completed && wasCompleted;
    
    if (existing.length > 0) {
      await db.update(lessonProgress)
        .set({ completed, completedAt: completed ? new Date() : null })
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    } else {
      await db.insert(lessonProgress).values({
        userId,
        lessonId,
        completed,
        completedAt: completed ? new Date() : null,
      });
    }
    
    // Update user's lessonsCompleted count
    if (isNewCompletion || isUncompletion) {
      const user = await this.getUserById(userId);
      if (user) {
        const currentCount = user.lessonsCompleted ?? 0;
        const newCount = isNewCompletion ? currentCount + 1 : Math.max(0, currentCount - 1);
        await this.updateUser(userId, { lessonsCompleted: newCount });
      }
    }
  }

  // Trades
  async createTrade(data: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(data).returning();
    return trade;
  }

  async getOpenTrades(userId: string): Promise<Trade[]> {
    return db.select().from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "open")));
  }

  async getPendingTrades(userId: string): Promise<Trade[]> {
    return db.select().from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "pending")));
  }

  async getAllActiveTrades(userId: string): Promise<Trade[]> {
    return db.select().from(trades)
      .where(and(
        eq(trades.userId, userId),
        or(eq(trades.status, "open"), eq(trades.status, "pending"))
      ));
  }

  async updateTrade(id: string, data: Partial<Trade>): Promise<Trade | undefined> {
    const [trade] = await db.update(trades).set(data).where(eq(trades.id, id)).returning();
    return trade;
  }

  async getTradeById(id: string): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    return trade;
  }

  async cancelTrade(id: string): Promise<Trade | undefined> {
    const [trade] = await db.update(trades)
      .set({ status: "cancelled", closedAt: new Date() })
      .where(eq(trades.id, id))
      .returning();
    return trade;
  }

  async closeTrade(id: string, exitPrice: number): Promise<Trade | undefined> {
    // First fetch the trade to get entryPrice, quantity, leverage, userId
    const [trade] = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    if (!trade) return undefined;

    const leverage = trade.leverage ?? 1;
    const baseProfit = trade.type === "buy" 
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;
    const profit = baseProfit * leverage;

    // Atomic update: only succeeds if trade is still open.
    // If two requests race, only ONE will update (0 rows = already closed).
    const [updatedTrade] = await db.update(trades)
      .set({ 
        status: "closed", 
        exitPrice, 
        closedAt: new Date(),
        profit,
      })
      .where(and(eq(trades.id, id), eq(trades.status, "open")))
      .returning();

    if (!updatedTrade) {
      // Another concurrent request already closed this trade — return it without crediting balance again
      const [existing] = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
      return existing;
    }

    // Update user balance and total profit (only runs once per trade)
    const user = await this.getUserById(trade.userId);
    if (user) {
      await this.updateUser(user.id, {
        simulatorBalance: Math.round(((user.simulatorBalance ?? 0) + profit) * 100) / 100,
        totalProfit: Math.round(((user.totalProfit ?? 0) + profit) * 100) / 100,
      });
    }

    return updatedTrade;
  }

  async getTradesByUser(userId: string): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId));
  }

  async getTotalTradesCount(): Promise<number> {
    const result = await db.select().from(trades);
    return result.length;
  }

  // Portfolio
  async getPortfolio(userId: string): Promise<PortfolioItem[]> {
    return db.select().from(portfolioItems).where(eq(portfolioItems.userId, userId));
  }

  async createPortfolioItem(data: InsertPortfolioItem): Promise<PortfolioItem> {
    const [item] = await db.insert(portfolioItems).values(data).returning();
    return item;
  }

  async updatePortfolioItem(id: string, data: Partial<PortfolioItem>): Promise<PortfolioItem | undefined> {
    const [item] = await db.update(portfolioItems).set(data).where(eq(portfolioItems.id, id)).returning();
    return item;
  }

  async deletePortfolioItem(id: string): Promise<void> {
    await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
  }

  // Assignments
  async createAssignment(data: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(data).returning();
    return assignment;
  }

  async getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.teacherId, teacherId));
  }

  async getAssignmentsByClass(classId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.classId, classId));
  }

  async getAssignmentProgress(assignmentId: string): Promise<AssignmentProgress[]> {
    return db.select().from(assignmentProgress).where(eq(assignmentProgress.assignmentId, assignmentId));
  }

  async getAssignmentProgressForStudent(studentId: string): Promise<AssignmentProgress[]> {
    return db.select().from(assignmentProgress).where(eq(assignmentProgress.studentId, studentId));
  }

  async updateAssignmentProgress(data: InsertAssignmentProgress): Promise<AssignmentProgress> {
    const existing = await db.select().from(assignmentProgress)
      .where(and(eq(assignmentProgress.assignmentId, data.assignmentId), eq(assignmentProgress.studentId, data.studentId)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(assignmentProgress)
        .set(data)
        .where(eq(assignmentProgress.id, existing[0].id))
        .returning();
      return updated;
    }

    const [inserted] = await db.insert(assignmentProgress).values(data).returning();
    return inserted;
  }

  async getAssignmentById(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    return assignment;
  }

  // Admin stats
  async getUsersCount(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async getLessonsCount(): Promise<number> {
    const result = await db.select().from(lessons);
    return result.length;
  }

  async getAllUsers(): Promise<Array<Pick<User, "id" | "email" | "displayName" | "role" | "membershipTier" | "simulatorBalance" | "totalProfit" | "createdAt">>> {
    const rows = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      membershipTier: users.membershipTier,
      simulatorBalance: users.simulatorBalance,
      totalProfit: users.totalProfit,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.simulatorBalance));
    return rows;
  }

  async resetUserBalance(userId: string, amount: number): Promise<void> {
    // Close all open trades first (they would otherwise continue to credit balance)
    await db.update(trades)
      .set({ status: "closed", closedAt: new Date(), exitPrice: 0, profit: 0 })
      .where(and(eq(trades.userId, userId), eq(trades.status, "open")));
    await db.update(trades)
      .set({ status: "cancelled" })
      .where(and(eq(trades.userId, userId), eq(trades.status, "pending")));
    // Reset balance
    await this.updateUser(userId, { simulatorBalance: amount, totalProfit: 0 });
  }

  async resetAllBalances(amount: number): Promise<void> {
    // Close all open/pending trades for non-admin users
    const nonAdminUsers = await db.select({ id: users.id }).from(users).where(ne(users.role, "admin"));
    for (const u of nonAdminUsers) {
      await db.update(trades)
        .set({ status: "closed", closedAt: new Date(), exitPrice: 0, profit: 0 })
        .where(and(eq(trades.userId, u.id), eq(trades.status, "open")));
      await db.update(trades)
        .set({ status: "cancelled" })
        .where(and(eq(trades.userId, u.id), eq(trades.status, "pending")));
    }
    // Reset all non-admin balances
    await db.update(users)
      .set({ simulatorBalance: amount, totalProfit: 0 })
      .where(ne(users.role, "admin"));
  }

  async closeAllOpenTradesForUser(userId: string): Promise<number> {
    const openTrades = await db.select().from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "open")));
    for (const trade of openTrades) {
      await db.update(trades)
        .set({ status: "closed", closedAt: new Date(), exitPrice: trade.entryPrice, profit: 0 })
        .where(and(eq(trades.id, trade.id), eq(trades.status, "open")));
    }
    await db.update(trades)
      .set({ status: "cancelled" })
      .where(and(eq(trades.userId, userId), eq(trades.status, "pending")));
    return openTrades.length;
  }

  async closeAllOpenTrades(): Promise<number> {
    const openTrades = await db.select().from(trades).where(eq(trades.status, "open"));
    for (const trade of openTrades) {
      await db.update(trades)
        .set({ status: "closed", closedAt: new Date(), exitPrice: trade.entryPrice, profit: 0 })
        .where(and(eq(trades.id, trade.id), eq(trades.status, "open")));
    }
    await db.update(trades)
      .set({ status: "cancelled" })
      .where(eq(trades.status, "pending"));
    return openTrades.length;
  }

  // Schools
  async createSchool(data: InsertSchool): Promise<School> {
    const [school] = await db.insert(schools).values(data).returning();
    return school;
  }

  async getSchoolByAdmin(adminUserId: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.adminUserId, adminUserId)).limit(1);
    return school;
  }

  async updateSchool(id: string, data: Partial<School>): Promise<School | undefined> {
    const [school] = await db.update(schools).set(data).where(eq(schools.id, id)).returning();
    return school;
  }

  async getSchools(): Promise<School[]> {
    return db.select().from(schools);
  }

  // Classes
  async createClass(data: InsertClass): Promise<Class> {
    const [cls] = await db.insert(classes).values(data).returning();
    return cls;
  }

  async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    return db.select().from(classes).where(eq(classes.teacherId, teacherId));
  }

  async getClassById(id: string): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return cls;
  }

  async getClassByJoinCode(joinCode: string): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.joinCode, joinCode)).limit(1);
    return cls;
  }

  async deleteClass(id: string): Promise<void> {
    await db.delete(classStudents).where(eq(classStudents.classId, id));
    await db.delete(classes).where(eq(classes.id, id));
  }

  // Class Students
  async addStudentToClass(data: InsertClassStudent): Promise<ClassStudent> {
    const [cs] = await db.insert(classStudents).values(data).returning();
    return cs;
  }

  async getStudentsByClass(classId: string): Promise<User[]> {
    const studentLinks = await db.select().from(classStudents).where(eq(classStudents.classId, classId));
    const studentIds = studentLinks.map(s => s.studentId);
    if (studentIds.length === 0) return [];
    const students = await db.select().from(users);
    return students.filter(u => studentIds.includes(u.id));
  }

  async removeStudentFromClass(classId: string, studentId: string): Promise<void> {
    await db.delete(classStudents).where(
      and(eq(classStudents.classId, classId), eq(classStudents.studentId, studentId))
    );
  }

  async getClassesByStudent(studentId: string): Promise<Class[]> {
    const enrollments = await db.select().from(classStudents).where(eq(classStudents.studentId, studentId));
    const classIds = enrollments.map(e => e.classId);
    if (classIds.length === 0) return [];
    const allClasses = await db.select().from(classes);
    return allClasses.filter(c => classIds.includes(c.id));
  }

  // Class Group Chat
  async getClassGroupMessages(classId: string, limit = 100): Promise<(ClassGroupMessage & { senderName: string; senderRole: string })[]> {
    const messages = await db.select().from(classGroupMessages)
      .where(eq(classGroupMessages.classId, classId))
      .orderBy(asc(classGroupMessages.createdAt))
      .limit(limit);
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const senders = senderIds.length > 0 ? await db.select({ id: users.id, displayName: users.displayName, role: users.role }).from(users).where(inArray(users.id, senderIds)) : [];
    return messages.map(m => ({
      ...m,
      senderName: senders.find(s => s.id === m.senderId)?.displayName ?? "Unknown",
      senderRole: senders.find(s => s.id === m.senderId)?.role ?? "student",
    }));
  }

  async createClassGroupMessage(data: InsertClassGroupMessage): Promise<ClassGroupMessage> {
    const [msg] = await db.insert(classGroupMessages).values(data).returning();
    return msg;
  }

  async getClassGroupMessageCount(classId: string, since?: Date): Promise<number> {
    const msgs = since
      ? await db.select().from(classGroupMessages).where(and(eq(classGroupMessages.classId, classId), sql`${classGroupMessages.createdAt} > ${since}`))
      : await db.select().from(classGroupMessages).where(eq(classGroupMessages.classId, classId));
    return msgs.length;
  }

  async editClassGroupMessage(messageId: string, userId: string, content: string): Promise<ClassGroupMessage | undefined> {
    const [msg] = await db.update(classGroupMessages)
      .set({ content, editedAt: new Date() })
      .where(and(eq(classGroupMessages.id, messageId), eq(classGroupMessages.senderId, userId)))
      .returning();
    return msg;
  }

  async deleteClassGroupMessage(messageId: string, userId: string): Promise<boolean> {
    const msg = await db.select().from(classGroupMessages).where(eq(classGroupMessages.id, messageId)).limit(1);
    if (!msg[0]) return false;
    if (msg[0].senderId !== userId) return false;
    await db.update(classGroupMessages).set({ isDeleted: true, content: "This message was deleted." }).where(eq(classGroupMessages.id, messageId));
    return true;
  }

  async getGroupChats(classId: string, userId: string): Promise<(ClassGroupChat & { memberCount: number; lastMessage?: string })[]> {
    const memberEntries = await db.select({ chatId: classGroupChatMembers.chatId }).from(classGroupChatMembers).where(eq(classGroupChatMembers.userId, userId));
    const chatIds = memberEntries.map(e => e.chatId);
    if (chatIds.length === 0) return [];
    const chats = await db.select().from(classGroupChats).where(and(eq(classGroupChats.classId, classId), inArray(classGroupChats.id, chatIds)));
    const result = await Promise.all(chats.map(async c => {
      const members = await db.select().from(classGroupChatMembers).where(eq(classGroupChatMembers.chatId, c.id));
      const lastMsgs = await db.select().from(classGroupChatMessages).where(eq(classGroupChatMessages.chatId, c.id)).orderBy(desc(classGroupChatMessages.createdAt)).limit(1);
      return { ...c, memberCount: members.length, lastMessage: lastMsgs[0]?.isDeleted ? "Message deleted" : lastMsgs[0]?.content };
    }));
    return result;
  }

  async createGroupChat(data: InsertClassGroupChat, memberIds: string[]): Promise<ClassGroupChat> {
    const [chat] = await db.insert(classGroupChats).values(data).returning();
    const uniqueIds = [...new Set([data.createdById, ...memberIds])];
    await db.insert(classGroupChatMembers).values(uniqueIds.map(uid => ({ chatId: chat.id, userId: uid })));
    return chat;
  }

  async getGroupChatMembers(chatId: string): Promise<{ userId: string; displayName: string; role: string }[]> {
    const members = await db.select({ userId: classGroupChatMembers.userId }).from(classGroupChatMembers).where(eq(classGroupChatMembers.chatId, chatId));
    const userIds = members.map(m => m.userId);
    if (userIds.length === 0) return [];
    const userList = await db.select({ id: users.id, displayName: users.displayName, role: users.role }).from(users).where(inArray(users.id, userIds));
    return userList.map(u => ({ userId: u.id, displayName: u.displayName ?? "Unknown", role: u.role }));
  }

  async addGroupChatMember(chatId: string, userId: string): Promise<void> {
    const existing = await db.select().from(classGroupChatMembers).where(and(eq(classGroupChatMembers.chatId, chatId), eq(classGroupChatMembers.userId, userId))).limit(1);
    if (!existing[0]) await db.insert(classGroupChatMembers).values({ chatId, userId });
  }

  async removeGroupChatMember(chatId: string, userId: string): Promise<void> {
    await db.delete(classGroupChatMembers).where(and(eq(classGroupChatMembers.chatId, chatId), eq(classGroupChatMembers.userId, userId)));
  }

  async getGroupChatMessages(chatId: string, userId: string, limit = 100): Promise<(ClassGroupChatMessage & { senderName: string; senderRole: string })[]> {
    const member = await db.select().from(classGroupChatMembers).where(and(eq(classGroupChatMembers.chatId, chatId), eq(classGroupChatMembers.userId, userId))).limit(1);
    if (!member[0]) return [];
    const messages = await db.select().from(classGroupChatMessages).where(eq(classGroupChatMessages.chatId, chatId)).orderBy(asc(classGroupChatMessages.createdAt)).limit(limit);
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const senders = senderIds.length > 0 ? await db.select({ id: users.id, displayName: users.displayName, role: users.role }).from(users).where(inArray(users.id, senderIds)) : [];
    return messages.map(m => ({
      ...m,
      senderName: senders.find(s => s.id === m.senderId)?.displayName ?? "Unknown",
      senderRole: senders.find(s => s.id === m.senderId)?.role ?? "student",
    }));
  }

  async sendGroupChatMessage(data: InsertClassGroupChatMessage): Promise<ClassGroupChatMessage> {
    const [msg] = await db.insert(classGroupChatMessages).values(data).returning();
    return msg;
  }

  async editGroupChatMessage(messageId: string, userId: string, content: string): Promise<ClassGroupChatMessage | undefined> {
    const [msg] = await db.update(classGroupChatMessages)
      .set({ content, editedAt: new Date() })
      .where(and(eq(classGroupChatMessages.id, messageId), eq(classGroupChatMessages.senderId, userId)))
      .returning();
    return msg;
  }

  async deleteGroupChatMessage(messageId: string, userId: string): Promise<boolean> {
    const msg = await db.select().from(classGroupChatMessages).where(eq(classGroupChatMessages.id, messageId)).limit(1);
    if (!msg[0] || msg[0].senderId !== userId) return false;
    await db.update(classGroupChatMessages).set({ isDeleted: true, content: "This message was deleted." }).where(eq(classGroupChatMessages.id, messageId));
    return true;
  }

  async pinClassMessage(messageId: string, pin: boolean): Promise<void> {
    await db.update(classGroupMessages).set({ isPinned: pin }).where(eq(classGroupMessages.id, messageId));
  }

  async getPinnedClassMessages(classId: string): Promise<(ClassGroupMessage & { senderName: string })[]> {
    const msgs = await db.select().from(classGroupMessages)
      .where(and(eq(classGroupMessages.classId, classId), eq(classGroupMessages.isPinned, true)))
      .orderBy(desc(classGroupMessages.createdAt)).limit(5);
    const result = [];
    for (const m of msgs) {
      const u = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, m.senderId)).limit(1);
      result.push({ ...m, senderName: u[0]?.displayName ?? "Unknown" });
    }
    return result;
  }

  async addMessageReaction(data: InsertClassMessageReaction): Promise<ClassMessageReaction> {
    const existing = await db.select().from(classMessageReactions)
      .where(and(eq(classMessageReactions.messageId, data.messageId), eq(classMessageReactions.userId, data.userId), eq(classMessageReactions.emoji, data.emoji)))
      .limit(1);
    if (existing[0]) return existing[0];
    const [reaction] = await db.insert(classMessageReactions).values(data).returning();
    return reaction;
  }

  async removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(classMessageReactions).where(and(eq(classMessageReactions.messageId, messageId), eq(classMessageReactions.userId, userId), eq(classMessageReactions.emoji, emoji)));
  }

  async getMessageReactions(messageIds: string[]): Promise<ClassMessageReaction[]> {
    if (!messageIds.length) return [];
    return db.select().from(classMessageReactions).where(inArray(classMessageReactions.messageId, messageIds));
  }

  async getDMConversations(userId: string, classId: string): Promise<{ partnerId: string; partnerName: string; partnerRole: string; lastMessage: string; lastAt: Date; unreadCount: number }[]> {
    const sent = await db.select().from(classDirectMessages).where(and(eq(classDirectMessages.classId, classId), eq(classDirectMessages.senderId, userId)));
    const received = await db.select().from(classDirectMessages).where(and(eq(classDirectMessages.classId, classId), eq(classDirectMessages.receiverId, userId)));
    const partnerIds = new Set<string>();
    for (const m of sent) partnerIds.add(m.receiverId);
    for (const m of received) partnerIds.add(m.senderId);
    const result = [];
    for (const partnerId of partnerIds) {
      const partner = await db.select({ displayName: users.displayName, role: users.role }).from(users).where(eq(users.id, partnerId)).limit(1);
      const allMsgs = [...sent.filter(m => m.receiverId === partnerId), ...received.filter(m => m.senderId === partnerId)]
        .filter(m => !m.isDeleted).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      const unread = received.filter(m => m.senderId === partnerId && !m.isRead).length;
      if (allMsgs.length > 0) {
        result.push({ partnerId, partnerName: partner[0]?.displayName ?? "Unknown", partnerRole: partner[0]?.role ?? "student", lastMessage: allMsgs[0].content, lastAt: allMsgs[0].createdAt!, unreadCount: unread });
      }
    }
    return result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }

  async getDMMessages(userId: string, partnerId: string, classId: string, limit = 100): Promise<(ClassDirectMessage & { senderName: string })[]> {
    const msgs = await db.select().from(classDirectMessages)
      .where(and(eq(classDirectMessages.classId, classId), or(and(eq(classDirectMessages.senderId, userId), eq(classDirectMessages.receiverId, partnerId)), and(eq(classDirectMessages.senderId, partnerId), eq(classDirectMessages.receiverId, userId)))))
      .orderBy(asc(classDirectMessages.createdAt)).limit(limit);
    const result = [];
    for (const m of msgs) {
      const u = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, m.senderId)).limit(1);
      result.push({ ...m, senderName: u[0]?.displayName ?? "Unknown" });
    }
    return result;
  }

  async sendDM(data: InsertClassDirectMessage): Promise<ClassDirectMessage> {
    const [msg] = await db.insert(classDirectMessages).values(data).returning();
    return msg;
  }

  async editDM(messageId: string, userId: string, content: string): Promise<ClassDirectMessage | undefined> {
    const [msg] = await db.update(classDirectMessages).set({ content, editedAt: new Date() }).where(and(eq(classDirectMessages.id, messageId), eq(classDirectMessages.senderId, userId))).returning();
    return msg;
  }

  async deleteDM(messageId: string, userId: string): Promise<boolean> {
    const msg = await db.select().from(classDirectMessages).where(eq(classDirectMessages.id, messageId)).limit(1);
    if (!msg[0] || msg[0].senderId !== userId) return false;
    await db.update(classDirectMessages).set({ isDeleted: true, content: "This message was deleted." }).where(eq(classDirectMessages.id, messageId));
    return true;
  }

  async markDMsRead(userId: string, partnerId: string, classId: string): Promise<void> {
    await db.update(classDirectMessages).set({ isRead: true }).where(and(eq(classDirectMessages.classId, classId), eq(classDirectMessages.senderId, partnerId), eq(classDirectMessages.receiverId, userId)));
  }

  async getDMUnreadCount(userId: string, classId: string): Promise<number> {
    const msgs = await db.select().from(classDirectMessages).where(and(eq(classDirectMessages.classId, classId), eq(classDirectMessages.receiverId, userId), eq(classDirectMessages.isRead, false)));
    return msgs.length;
  }

  async updateLastSeen(userId: string, status: string = "online"): Promise<void> {
    const validStatus = ["online", "idle"].includes(status) ? status : "online";
    await db.update(users).set({ lastSeenAt: new Date(), presenceStatus: validStatus }).where(eq(users.id, userId));
  }

  async getOnlineUsers(userIds: string[]): Promise<Record<string, boolean>> {
    if (!userIds.length) return {};
    const cutoff = new Date(Date.now() - 3 * 60 * 1000);
    const rows = await db.select({ id: users.id, lastSeenAt: users.lastSeenAt }).from(users).where(inArray(users.id, userIds));
    const result: Record<string, boolean> = {};
    for (const u of rows) {
      result[u.id] = u.lastSeenAt ? u.lastSeenAt > cutoff : false;
    }
    return result;
  }

  async getUserPresence(userIds: string[]): Promise<Record<string, "online" | "idle" | "offline">> {
    if (!userIds.length) return {};
    const cutoff = new Date(Date.now() - 3 * 60 * 1000);
    const rows = await db.select({ id: users.id, lastSeenAt: users.lastSeenAt, presenceStatus: users.presenceStatus }).from(users).where(inArray(users.id, userIds));
    const result: Record<string, "online" | "idle" | "offline"> = {};
    for (const u of rows) {
      if (!u.lastSeenAt || u.lastSeenAt <= cutoff) {
        result[u.id] = "offline";
      } else {
        result[u.id] = (u.presenceStatus === "idle" ? "idle" : "online") as "online" | "idle";
      }
    }
    return result;
  }

  // Achievements
  async createAchievement(data: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db.insert(achievements).values(data).returning();
    return achievement;
  }

  async upsertAchievement(data: InsertAchievement): Promise<Achievement> {
    const existing = await this.getAchievementById(data.id);
    if (existing) {
      const [updated] = await db.update(achievements)
        .set(data)
        .where(eq(achievements.id, data.id))
        .returning();
      return updated;
    }
    return this.createAchievement(data);
  }

  async getAchievements(): Promise<Achievement[]> {
    return db.select().from(achievements);
  }

  async getAchievementById(id: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1);
    return achievement;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    const existing = await db.select().from(userAchievements)
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)))
      .limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const [ua] = await db.insert(userAchievements).values({
      userId,
      achievementId,
      progress: 100,
    }).returning();
    return ua;
  }

  async updateAchievementProgress(userId: string, achievementId: string, progress: number): Promise<void> {
    const existing = await db.select().from(userAchievements)
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(userAchievements)
        .set({ progress, unlockedAt: progress >= 100 ? new Date() : null })
        .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
    } else {
      await db.insert(userAchievements).values({
        userId,
        achievementId,
        progress,
        unlockedAt: progress >= 100 ? new Date() : null,
      });
    }
  }

  async createUserAchievement(data: InsertUserAchievement): Promise<UserAchievement> {
    const [ua] = await db.insert(userAchievements).values(data).returning();
    return ua;
  }

  async updateUserAchievement(id: string, updates: Partial<UserAchievement>): Promise<UserAchievement | undefined> {
    const [ua] = await db.update(userAchievements).set(updates).where(eq(userAchievements.id, id)).returning();
    return ua;
  }

  async getAchievementStats(): Promise<{achievementId: string, count: number, percentage: number}[]> {
    const allTraders = await db.select().from(users).where(eq(users.role, "student"));
    const traderCount = allTraders.length || 1;
    const allUserAchievements = await db.select().from(userAchievements).where(eq(userAchievements.progress, 100));
    const countMap = new Map<string, number>();
    for (const ua of allUserAchievements) {
      countMap.set(ua.achievementId, (countMap.get(ua.achievementId) || 0) + 1);
    }
    const allAchievements = await db.select().from(achievements);
    return allAchievements.map(a => ({
      achievementId: a.id,
      count: countMap.get(a.id) || 0,
      percentage: Math.round(((countMap.get(a.id) || 0) / traderCount) * 100)
    }));
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Delete user achievements
    await db.delete(userAchievements).where(eq(userAchievements.userId, userId));
    
    // Delete trades
    await db.delete(trades).where(eq(trades.userId, userId));
    
    // Delete portfolio items
    await db.delete(portfolioItems).where(eq(portfolioItems.userId, userId));
    
    // Delete lesson progress
    await db.delete(lessonProgress).where(eq(lessonProgress.userId, userId));
    
    // Remove from class enrollments
    await db.delete(classStudents).where(eq(classStudents.studentId, userId));
    
    // If teacher, delete their classes
    await db.delete(classes).where(eq(classes.teacherId, userId));
    
    // Delete assignments created by this user (if teacher)
    await db.delete(assignments).where(eq(assignments.teacherId, userId));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  // Trading Tips
  async createTradingTip(data: InsertTradingTip): Promise<TradingTip> {
    const [tip] = await db.insert(tradingTips).values(data).returning();
    return tip;
  }

  async getTradingTips(): Promise<TradingTip[]> {
    return db.select().from(tradingTips).where(eq(tradingTips.isPublished, true)).orderBy(desc(tradingTips.createdAt));
  }

  async getAllTradingTips(): Promise<TradingTip[]> {
    return db.select().from(tradingTips).orderBy(desc(tradingTips.createdAt));
  }

  async getTradingTipById(id: string): Promise<TradingTip | undefined> {
    const [tip] = await db.select().from(tradingTips).where(eq(tradingTips.id, id)).limit(1);
    return tip;
  }

  async updateTradingTip(id: string, data: Partial<TradingTip>): Promise<TradingTip | undefined> {
    const [tip] = await db.update(tradingTips).set(data).where(eq(tradingTips.id, id)).returning();
    return tip;
  }

  async deleteTradingTip(id: string): Promise<void> {
    await db.delete(tradingTips).where(eq(tradingTips.id, id));
  }

  // Market Insights
  async createMarketInsight(data: InsertMarketInsight): Promise<MarketInsight> {
    const [insight] = await db.insert(marketInsights).values(data).returning();
    return insight;
  }

  async getMarketInsights(): Promise<MarketInsight[]> {
    return db.select().from(marketInsights).where(eq(marketInsights.isPublished, true)).orderBy(desc(marketInsights.createdAt));
  }

  async getAllMarketInsights(): Promise<MarketInsight[]> {
    return db.select().from(marketInsights).orderBy(desc(marketInsights.createdAt));
  }

  async getMarketInsightById(id: string): Promise<MarketInsight | undefined> {
    const [insight] = await db.select().from(marketInsights).where(eq(marketInsights.id, id)).limit(1);
    return insight;
  }

  async updateMarketInsight(id: string, data: Partial<MarketInsight>): Promise<MarketInsight | undefined> {
    const [insight] = await db.update(marketInsights).set(data).where(eq(marketInsights.id, id)).returning();
    return insight;
  }

  async deleteMarketInsight(id: string): Promise<void> {
    await db.delete(marketInsights).where(eq(marketInsights.id, id));
  }

  async getMarketInsightsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(marketInsights);
    return Number(result[0].count);
  }

  // Strategies
  async createStrategy(data: InsertStrategy): Promise<Strategy> {
    const [strategy] = await db.insert(strategies).values(data).returning();
    return strategy;
  }

  async getStrategies(): Promise<Strategy[]> {
    return db.select().from(strategies).where(eq(strategies.isPublished, true)).orderBy(desc(strategies.createdAt));
  }

  async getAllStrategies(): Promise<Strategy[]> {
    return db.select().from(strategies).orderBy(desc(strategies.createdAt));
  }

  async getStrategyById(id: string): Promise<Strategy | undefined> {
    const [strategy] = await db.select().from(strategies).where(eq(strategies.id, id)).limit(1);
    return strategy;
  }

  async updateStrategy(id: string, data: Partial<Strategy>): Promise<Strategy | undefined> {
    const [strategy] = await db.update(strategies).set(data).where(eq(strategies.id, id)).returning();
    return strategy;
  }

  async deleteStrategy(id: string): Promise<void> {
    await db.delete(strategies).where(eq(strategies.id, id));
  }

  // Friends
  async getFriends(userId: string): Promise<{friendship: Friendship, friend: User}[]> {
    const sent = await db.select().from(friendships).where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")));
    const received = await db.select().from(friendships).where(and(eq(friendships.friendId, userId), eq(friendships.status, "accepted")));
    
    const result: {friendship: Friendship, friend: User}[] = [];
    for (const f of sent) {
      const friend = await this.getUserById(f.friendId);
      if (friend) result.push({ friendship: f, friend });
    }
    for (const f of received) {
      const friend = await this.getUserById(f.userId);
      if (friend) result.push({ friendship: f, friend });
    }
    return result;
  }

  async getFriendRequests(userId: string): Promise<{friendship: Friendship, sender: User}[]> {
    const requests = await db.select().from(friendships).where(and(eq(friendships.friendId, userId), eq(friendships.status, "pending")));
    const result: {friendship: Friendship, sender: User}[] = [];
    for (const f of requests) {
      const sender = await this.getUserById(f.userId);
      if (sender) result.push({ friendship: f, sender });
    }
    return result;
  }

  async sendFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    // Check if friendship already exists in either direction
    const existingSent = await db.select().from(friendships).where(
      and(eq(friendships.userId, userId), eq(friendships.friendId, friendId))
    ).limit(1);
    const existingReceived = await db.select().from(friendships).where(
      and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
    ).limit(1);
    
    if (existingSent.length > 0 || existingReceived.length > 0) {
      throw new Error("Friendship already exists or pending");
    }
    
    const [friendship] = await db.insert(friendships).values({ userId, friendId, status: "pending" }).returning();
    return friendship;
  }

  async acceptFriendRequest(id: string): Promise<Friendship | undefined> {
    const [friendship] = await db.update(friendships).set({ status: "accepted" }).where(eq(friendships.id, id)).returning();
    return friendship;
  }

  async rejectFriendRequest(id: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, id));
  }

  async removeFriend(id: string, userId: string): Promise<void> {
    const f = await this.getFriendshipById(id);
    if (f && (f.userId === userId || f.friendId === userId)) {
      await db.delete(friendships).where(eq(friendships.id, id));
    }
  }

  async getFriendshipById(id: string): Promise<Friendship | undefined> {
    const [f] = await db.select().from(friendships).where(eq(friendships.id, id)).limit(1);
    return f;
  }

  async getFriendCount(userId: string): Promise<number> {
    const friends = await this.getFriends(userId);
    return friends.length;
  }

  // Simulated Prices
  private simulatedPrices: Record<string, number> = {
    AAPL: 185.50,
    MSFT: 415.20,
    GOOGL: 175.80,
    AMZN: 198.30,
    META: 520.40,
    TSLA: 248.60,
    NVDA: 875.30,
    BTC: 43250.00,
    ETH: 2580.00,
    SPY: 508.75,
    QQQ: 437.20,
    NFLX: 625.80,
    AMD: 178.40,
    DIS: 112.60,
    COIN: 185.30,
  };

  async getSimulatedPrices(): Promise<Record<string, number>> {
    return this.simulatedPrices;
  }

  async updateSimulatedPrice(symbol: string, price: number): Promise<void> {
    this.simulatedPrices[symbol] = price;
  }

  // Chat Messages
  async getChatMessages(userId1: string, userId2: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(
        or(
          and(eq(chatMessages.senderId, userId1), eq(chatMessages.receiverId, userId2)),
          and(eq(chatMessages.senderId, userId2), eq(chatMessages.receiverId, userId1))
        )
      )
      .orderBy(asc(chatMessages.createdAt));
  }

  async sendChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(data).returning();
    return message;
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    await db.update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.senderId, senderId), eq(chatMessages.receiverId, receiverId)));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(and(eq(chatMessages.receiverId, userId), eq(chatMessages.isRead, false)));
    return result[0]?.count ?? 0;
  }

  async editChatMessage(id: string, userId: string, content: string): Promise<ChatMessage | undefined> {
    const [msg] = await db.update(chatMessages)
      .set({ content, editedAt: new Date() })
      .where(and(eq(chatMessages.id, id), eq(chatMessages.senderId, userId)))
      .returning();
    return msg;
  }

  async deleteChatMessage(id: string, userId: string): Promise<void> {
    await db.update(chatMessages)
      .set({ deletedAt: new Date(), content: "This message was deleted." })
      .where(and(eq(chatMessages.id, id), eq(chatMessages.senderId, userId)));
  }

  async createFriendGroupChat(name: string, creatorId: string, emoji: string, memberIds: string[]): Promise<FriendGroupChat> {
    const [group] = await db.insert(friendGroupChats).values({ name, creatorId, avatarEmoji: emoji }).returning();
    const allMembers = [...new Set([creatorId, ...memberIds])];
    await db.insert(friendGroupChatMembers).values(allMembers.map(uid => ({ groupId: group.id, userId: uid })));
    return group;
  }

  async getUserGroupChats(userId: string): Promise<Array<FriendGroupChat & { members: string[]; lastMessage?: any }>> {
    const memberships = await db.select({ groupId: friendGroupChatMembers.groupId })
      .from(friendGroupChatMembers).where(eq(friendGroupChatMembers.userId, userId));
    if (!memberships.length) return [];
    const groupIds = memberships.map(m => m.groupId);
    const groups = await db.select().from(friendGroupChats).where(inArray(friendGroupChats.id, groupIds));
    const members = await db.select().from(friendGroupChatMembers).where(inArray(friendGroupChatMembers.groupId, groupIds));
    return groups.map(g => ({
      ...g,
      members: members.filter(m => m.groupId === g.id).map(m => m.userId),
    }));
  }

  async getGroupChatById(groupId: string): Promise<FriendGroupChat | undefined> {
    const [g] = await db.select().from(friendGroupChats).where(eq(friendGroupChats.id, groupId));
    return g;
  }

  async addGroupChatMember(groupId: string, userId: string): Promise<void> {
    await db.insert(friendGroupChatMembers).values({ groupId, userId }).onConflictDoNothing();
  }

  async removeGroupChatMember(groupId: string, userId: string): Promise<void> {
    await db.delete(friendGroupChatMembers)
      .where(and(eq(friendGroupChatMembers.groupId, groupId), eq(friendGroupChatMembers.userId, userId)));
  }

  async getGroupChatMessages(groupId: string): Promise<FriendGroupChatMessage[]> {
    return db.select().from(friendGroupChatMessages)
      .where(eq(friendGroupChatMessages.groupId, groupId))
      .orderBy(asc(friendGroupChatMessages.createdAt))
      .limit(200);
  }

  async sendGroupChatMessage(groupId: string, senderId: string, content: string, replyToId?: string): Promise<FriendGroupChatMessage> {
    const [msg] = await db.insert(friendGroupChatMessages)
      .values({ groupId, senderId, content, replyToId: replyToId ?? null })
      .returning();
    return msg;
  }

  async editGroupChatMessage(id: string, userId: string, content: string): Promise<FriendGroupChatMessage | undefined> {
    const [msg] = await db.update(friendGroupChatMessages)
      .set({ content, editedAt: new Date() })
      .where(and(eq(friendGroupChatMessages.id, id), eq(friendGroupChatMessages.senderId, userId)))
      .returning();
    return msg;
  }

  async deleteGroupChatMessage(id: string, userId: string): Promise<void> {
    await db.update(friendGroupChatMessages)
      .set({ deletedAt: new Date(), content: "This message was deleted." })
      .where(and(eq(friendGroupChatMessages.id, id), eq(friendGroupChatMessages.senderId, userId)));
  }

  async getCosmeticListings(): Promise<Array<CosmeticListing & { seller: { displayName: string; avatarUrl: string | null } }>> {
    const rows = await db.select({
      listing: cosmeticListings,
      seller: { displayName: users.displayName, avatarUrl: users.avatarUrl },
    }).from(cosmeticListings)
      .leftJoin(users, eq(cosmeticListings.sellerId, users.id))
      .where(eq(cosmeticListings.status, "active"))
      .orderBy(desc(cosmeticListings.createdAt));
    return rows.map(r => ({ ...r.listing, seller: r.seller ?? { displayName: "Unknown", avatarUrl: null } }));
  }

  async createCosmeticListing(sellerId: string, itemId: string, itemType: string, price: number): Promise<CosmeticListing> {
    const [listing] = await db.insert(cosmeticListings).values({ sellerId, itemId, itemType, price }).returning();
    return listing;
  }

  async buyCosmeticListing(listingId: string, buyerId: string): Promise<{ listing: CosmeticListing; newBalance: number }> {
    const [listing] = await db.select().from(cosmeticListings).where(eq(cosmeticListings.id, listingId));
    if (!listing || listing.status !== "active") throw new Error("Listing not found or already sold");
    if (listing.sellerId === buyerId) throw new Error("Cannot buy your own listing");
    const buyer = await this.getUserById(buyerId);
    if (!buyer) throw new Error("Buyer not found");
    const balance = buyer.simulatorBalance ?? 0;
    if (balance < listing.price) throw new Error("Insufficient balance");

    // Transfer item from seller to buyer
    const buyerOwned: string[] = (() => { try { return JSON.parse(buyer.purchasedCosmetics ?? "[]"); } catch { return []; } })();
    if (!buyerOwned.includes(listing.itemId)) buyerOwned.push(listing.itemId);

    // Remove from seller
    const seller = await this.getUserById(listing.sellerId);
    if (seller) {
      const sellerOwned: string[] = (() => { try { return JSON.parse(seller.purchasedCosmetics ?? "[]"); } catch { return []; } })();
      const newSellerOwned = sellerOwned.filter(id => id !== listing.itemId);
      await this.updateUser(seller.id, {
        simulatorBalance: Math.round(((seller.simulatorBalance ?? 0) + listing.price) * 100) / 100,
        purchasedCosmetics: JSON.stringify(newSellerOwned),
      });
    }

    // Update buyer
    await this.updateUser(buyerId, {
      simulatorBalance: Math.round((balance - listing.price) * 100) / 100,
      purchasedCosmetics: JSON.stringify(buyerOwned),
    });

    // Mark sold
    const [updated] = await db.update(cosmeticListings)
      .set({ status: "sold" })
      .where(eq(cosmeticListings.id, listingId))
      .returning();

    return { listing: updated, newBalance: Math.round((balance - listing.price) * 100) / 100 };
  }

  async cancelCosmeticListing(listingId: string, sellerId: string): Promise<void> {
    await db.update(cosmeticListings)
      .set({ status: "cancelled" })
      .where(and(eq(cosmeticListings.id, listingId), eq(cosmeticListings.sellerId, sellerId)));
  }

  // Watchlist
  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    return db.select().from(watchlistItems).where(eq(watchlistItems.userId, userId)).orderBy(desc(watchlistItems.addedAt));
  }

  async addWatchlistItem(data: InsertWatchlistItem): Promise<WatchlistItem> {
    const [item] = await db.insert(watchlistItems).values(data).returning();
    return item;
  }

  async removeWatchlistItem(userId: string, symbol: string): Promise<void> {
    await db.delete(watchlistItems).where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.symbol, symbol)));
  }

  // Journal
  async getJournalEntries(userId: string): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt));
  }

  async createJournalEntry(data: InsertJournalEntry): Promise<JournalEntry> {
    const [entry] = await db.insert(journalEntries).values(data).returning();
    return entry;
  }

  async updateJournalEntry(id: string, data: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const [entry] = await db.update(journalEntries).set(data).where(eq(journalEntries.id, id)).returning();
    return entry;
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count ?? 0;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [code] = await db.insert(promoCodes).values({ ...data, code: data.code.toUpperCase() }).returning();
    return code;
  }

  async getPromoCodes(): Promise<PromoCode[]> {
    return await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [result] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return result;
  }

  async updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const [result] = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return result;
  }

  async deletePromoCode(id: string): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async incrementPromoCodeUsed(id: string): Promise<void> {
    await db.update(promoCodes).set({ usedCount: sql`${promoCodes.usedCount} + 1` }).where(eq(promoCodes.id, id));
  }

  async createQuiz(data: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(data).returning();
    return quiz;
  }

  async getQuizByLessonId(lessonId: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
    return quiz;
  }

  async updateQuiz(id: string, data: Partial<Quiz>): Promise<Quiz | undefined> {
    const [quiz] = await db.update(quizzes).set(data).where(eq(quizzes.id, id)).returning();
    return quiz;
  }

  async deleteQuiz(id: string): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }

  async createQuizAttempt(data: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db.insert(quizAttempts).values(data).returning();
    return attempt;
  }

  async getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]> {
    return await db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.completedAt));
  }

  async getBestQuizAttempt(userId: string, lessonId: string): Promise<QuizAttempt | undefined> {
    const attempts = await db.select().from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.lessonId, lessonId)))
      .orderBy(desc(quizAttempts.score));
    return attempts[0];
  }

  async createPriceAlert(data: InsertPriceAlert): Promise<PriceAlert> {
    const [alert] = await db.insert(priceAlerts).values(data).returning();
    return alert;
  }

  async getPriceAlertsByUser(userId: string): Promise<PriceAlert[]> {
    return await db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId)).orderBy(desc(priceAlerts.createdAt));
  }

  async deletePriceAlert(id: string, userId: string): Promise<void> {
    await db.delete(priceAlerts).where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));
  }

  async triggerPriceAlert(id: string): Promise<void> {
    await db.update(priceAlerts).set({ triggered: true }).where(eq(priceAlerts.id, id));
  }

  async getActivePriceAlerts(): Promise<PriceAlert[]> {
    return await db.select().from(priceAlerts).where(eq(priceAlerts.triggered, false));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getFinancialStats(): Promise<{ totalUsers: number; activeSubscribers: number; trialUsers: number; byTier: Record<string, number>; recentSignups: User[] }> {
    const allUsers = await db.select().from(users).where(sql`${users.role} != 'admin'`);
    const totalUsers = allUsers.length;
    const activeSubscribers = allUsers.filter(u => u.membershipStatus === "active").length;
    const trialUsers = allUsers.filter(u => u.membershipStatus !== "active").length;
    const byTier: Record<string, number> = { school: 0, casual: 0, premium: 0 };
    for (const u of allUsers.filter(u => u.membershipStatus === "active" && u.membershipTier)) {
      const tier = u.membershipTier!;
      byTier[tier] = (byTier[tier] || 0) + 1;
    }
    const recentSignups = await db.select().from(users).where(sql`${users.role} != 'admin'`).orderBy(desc(users.trialStartDate)).limit(10);
    return { totalUsers, activeSubscribers, trialUsers, byTier, recentSignups };
  }

  async createClassroomEvent(data: InsertClassroomEvent): Promise<ClassroomEvent> {
    const [event] = await db.insert(classroomEvents).values(data).returning();
    return event;
  }

  async getClassroomEvents(classId: string): Promise<ClassroomEvent[]> {
    return db.select().from(classroomEvents).where(and(eq(classroomEvents.classId, classId), eq(classroomEvents.isActive, true))).orderBy(desc(classroomEvents.createdAt));
  }

  async deleteClassroomEvent(id: string): Promise<void> {
    await db.update(classroomEvents).set({ isActive: false }).where(eq(classroomEvents.id, id));
  }

  async addClassroomTokens(userId: string, tokens: number): Promise<void> {
    await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${tokens}` }).where(eq(users.id, userId));
  }

  async purchaseCosmetic(userId: string, cosmeticId: string, cost: number): Promise<{ success: boolean; message: string; newBalance: number }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found", newBalance: 0 };
    const balance = user.classroomTokens ?? 0;
    if (balance < cost) return { success: false, message: "Not enough tokens", newBalance: balance };
    const owned: string[] = JSON.parse(user.purchasedCosmetics ?? "[]");
    if (owned.includes(cosmeticId)) return { success: false, message: "Already owned", newBalance: balance };
    owned.push(cosmeticId);
    const newBalance = balance - cost;
    await db.update(users).set({ classroomTokens: newBalance, purchasedCosmetics: JSON.stringify(owned) }).where(eq(users.id, userId));
    return { success: true, message: "Purchased!", newBalance };
  }

  async equipCosmetic(userId: string, type: "title" | "frame", value: string | null): Promise<void> {
    if (type === "title") {
      await db.update(users).set({ equippedTitle: value }).where(eq(users.id, userId));
    } else {
      await db.update(users).set({ equippedFrame: value }).where(eq(users.id, userId));
    }
  }

  async saveFunZoneScore(data: InsertFunZoneScore): Promise<FunZoneScore> {
    const [score] = await db.insert(funZoneScores).values(data).returning();
    return score;
  }

  async getFunZoneLeaderboard(game: string): Promise<{ userId: string; displayName: string; score: number }[]> {
    const results = await db.select({ userId: funZoneScores.userId, score: funZoneScores.score, displayName: users.displayName })
      .from(funZoneScores)
      .innerJoin(users, eq(funZoneScores.userId, users.id))
      .where(eq(funZoneScores.game, game))
      .orderBy(desc(funZoneScores.score))
      .limit(20);
    return results;
  }

  async claimDailyReward(userId: string): Promise<{ success: boolean; tokens: number; streak: number; message: string }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, tokens: 0, streak: 0, message: "User not found" };
    const today = new Date().toISOString().split("T")[0];
    if (user.dailyRewardClaimedAt === today) {
      return { success: false, tokens: 0, streak: user.loginStreak ?? 0, message: "Already claimed today" };
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const streak = user.lastLoginDate === yesterday ? (user.loginStreak ?? 0) + 1 : 1;
    const base = 5;
    const streakBonus = Math.min(streak - 1, 6) * 2;
    const tokens = base + streakBonus;
    await db.update(users).set({
      classroomTokens: sql`${users.classroomTokens} + ${tokens}`,
      loginStreak: streak,
      lastLoginDate: today,
      dailyRewardClaimedAt: today,
    }).where(eq(users.id, userId));
    return { success: true, tokens, streak, message: `Day ${streak} streak! +${tokens} tokens` };
  }

  async getInventory(userId: string): Promise<UserInventory[]> {
    return await db.select().from(userInventory).where(eq(userInventory.userId, userId)).orderBy(desc(userInventory.createdAt));
  }

  async addToInventory(data: InsertUserInventory): Promise<UserInventory> {
    const existing = await db.select().from(userInventory)
      .where(and(eq(userInventory.userId, data.userId), eq(userInventory.itemId, data.itemId), eq(userInventory.itemType, data.itemType)));
    if (existing.length > 0 && data.itemType === "power_up") {
      const [updated] = await db.update(userInventory)
        .set({ quantity: sql`${userInventory.quantity} + 1` })
        .where(eq(userInventory.id, existing[0].id))
        .returning();
      return updated;
    }
    const [item] = await db.insert(userInventory).values(data).returning();
    return item;
  }

  async removeFromInventory(id: string, userId: string): Promise<void> {
    await db.delete(userInventory).where(and(eq(userInventory.id, id), eq(userInventory.userId, userId)));
  }

  async buyShopItem(userId: string, itemId: string, itemType: string, cost: number): Promise<{ success: boolean; message: string; item?: UserInventory }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };
    const balance = user.classroomTokens ?? 0;
    if (balance < cost) return { success: false, message: "Not enough tokens" };
    await db.update(users).set({ classroomTokens: balance - cost }).where(eq(users.id, userId));
    const item = await this.addToInventory({ userId, itemId, itemType, rarity: null, quantity: 1, tradable: true });
    return { success: true, message: "Purchased!", item };
  }

  async openBlindBag(userId: string, bagId: string, cost: number): Promise<{ success: boolean; item?: UserInventory; rarity?: string; message: string }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };
    const balance = user.classroomTokens ?? 0;
    if (balance < cost) return { success: false, message: "Not enough tokens" };
    // Validate cost matches expected bag price to prevent tampering
    const VALID_BAGS: Record<string, number> = { "bag-starter": 15, "bag-crypto": 30, "bag-legend": 50 };
    const expectedCost = VALID_BAGS[bagId];
    if (!expectedCost) return { success: false, message: "Invalid bag" };
    if (cost !== expectedCost) return { success: false, message: "Invalid bag cost" };
    await db.update(users).set({ classroomTokens: balance - expectedCost }).where(eq(users.id, userId));
    const rand = Math.random();
    let rarity: string;
    // Per-bag rarity odds matching UI descriptions
    if (bagId === "bag-legend") {
      rarity = rand < 0.05 ? "legendary" : rand < 0.25 ? "epic" : rand < 0.60 ? "rare" : "common";
    } else if (bagId === "bag-crypto") {
      rarity = rand < 0.03 ? "legendary" : rand < 0.15 ? "epic" : rand < 0.50 ? "rare" : "common";
    } else {
      // bag-starter
      rarity = rand < 0.01 ? "legendary" : rand < 0.05 ? "epic" : rand < 0.30 ? "rare" : "common";
    }
    const pools: Record<string, string[]> = {
      common: ["col-coin", "col-chart-up", "col-piggy", "col-notepad", "col-lock", "col-receipt"],
      rare: ["col-rocket", "col-crown", "col-gem", "col-trophy", "col-lightning"],
      epic: ["col-diamond", "col-fire", "col-dragon", "col-crystal-ball"],
      legendary: ["col-unicorn", "col-rainbow-star", "col-golden-bull"],
    };
    const pool = pools[rarity];
    const itemId = pool[Math.floor(Math.random() * pool.length)];
    const item = await this.addToInventory({ userId, itemId, itemType: "collectible", rarity, quantity: 1, tradable: true });
    return { success: true, item, rarity, message: `Got a ${rarity} collectible!` };
  }

  async getTradeOffers(userId: string): Promise<TradeOffer[]> {
    return await db.select().from(tradeOffers)
      .where(or(eq(tradeOffers.fromUserId, userId), eq(tradeOffers.toUserId, userId)))
      .orderBy(desc(tradeOffers.createdAt))
      .limit(50);
  }

  async createTradeOffer(fromUserId: string, toUserId: string, offeredInventoryIds: string[], requestedInventoryIds: string[], tokenBonus: number, message: string): Promise<TradeOffer> {
    const [offer] = await db.insert(tradeOffers).values({
      fromUserId, toUserId,
      offeredInventoryIds: JSON.stringify(offeredInventoryIds),
      requestedInventoryIds: JSON.stringify(requestedInventoryIds),
      tokenBonus: tokenBonus || 0,
      status: "pending",
      message,
    }).returning();
    return offer;
  }

  async respondToTradeOffer(id: string, userId: string, action: "accept" | "reject" | "cancel"): Promise<{ success: boolean; message: string }> {
    const [offer] = await db.select().from(tradeOffers).where(eq(tradeOffers.id, id));
    if (!offer) return { success: false, message: "Trade not found" };
    if (offer.status !== "pending") return { success: false, message: "Trade is no longer pending" };
    if (action === "cancel" && offer.fromUserId !== userId) return { success: false, message: "Not your trade" };
    if ((action === "accept" || action === "reject") && offer.toUserId !== userId) return { success: false, message: "Not your trade" };
    if (action === "accept") {
      const offeredIds: string[] = JSON.parse(offer.offeredInventoryIds || "[]");
      const requestedIds: string[] = JSON.parse(offer.requestedInventoryIds || "[]");
      for (const invId of offeredIds) {
        await db.update(userInventory).set({ userId: offer.toUserId }).where(and(eq(userInventory.id, invId), eq(userInventory.userId, offer.fromUserId)));
      }
      for (const invId of requestedIds) {
        await db.update(userInventory).set({ userId: offer.fromUserId }).where(and(eq(userInventory.id, invId), eq(userInventory.userId, offer.toUserId)));
      }
      if (offer.tokenBonus && offer.tokenBonus > 0) {
        const from = await this.getUserById(offer.fromUserId);
        if (from && (from.classroomTokens ?? 0) >= offer.tokenBonus) {
          await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} - ${offer.tokenBonus}` }).where(eq(users.id, offer.fromUserId));
          await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${offer.tokenBonus}` }).where(eq(users.id, offer.toUserId));
        }
      }
    }
    await db.update(tradeOffers).set({ status: action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled", respondedAt: new Date() }).where(eq(tradeOffers.id, id));
    return { success: true, message: action === "accept" ? "Trade accepted!" : action === "reject" ? "Trade rejected" : "Trade cancelled" };
  }

  async getTokenLeaderboard(): Promise<{ userId: string; displayName: string; classroomTokens: number; loginStreak: number }[]> {
    const results = await db.select({ userId: users.id, displayName: users.displayName, classroomTokens: users.classroomTokens, loginStreak: users.loginStreak })
      .from(users)
      .where(sql`${users.classroomTokens} > 0`)
      .orderBy(desc(users.classroomTokens))
      .limit(50);
    return results;
  }

  async updateUserTokens(userId: string, delta: number): Promise<void> {
    if (delta >= 0) {
      await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${delta}` }).where(eq(users.id, userId));
    } else {
      const absDelta = Math.abs(delta);
      await db.update(users).set({ classroomTokens: sql`GREATEST(0, ${users.classroomTokens} - ${absDelta})` }).where(eq(users.id, userId));
    }
  }

  async claimSimulatorTokens(userId: string): Promise<{ tokensAwarded: number; totalClaimed: number }> {
    const [user] = await db.select({ totalProfit: users.totalProfit, simulatorTokensClaimed: users.simulatorTokensClaimed })
      .from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const profit = Math.max(0, user.totalProfit ?? 0);
    const alreadyClaimed = user.simulatorTokensClaimed ?? 0;
    const claimable = Math.floor(profit / 100) - alreadyClaimed;
    if (claimable <= 0) return { tokensAwarded: 0, totalClaimed: alreadyClaimed };
    const newClaimed = alreadyClaimed + claimable;
    await db.update(users).set({
      classroomTokens: sql`${users.classroomTokens} + ${claimable}`,
      simulatorTokensClaimed: newClaimed,
    }).where(eq(users.id, userId));
    return { tokensAwarded: claimable, totalClaimed: newClaimed };
  }

  async addInventoryItem(userId: string, itemId: string, itemType: string, rarity: string, quantity: number): Promise<UserInventory> {
    return await this.addToInventory({ userId, itemId, itemType, rarity, quantity, tradable: true });
  }

  async saveSpinHistory(data: { userId: string; spinTier: string; tokensSpent: number; rewardType: string; rewardId?: string | null; rewardAmount?: number | null; rewardName: string; rewardEmoji: string; rarity: string }): Promise<void> {
    await db.insert(spinHistory).values({
      userId: data.userId, spinTier: data.spinTier, tokensSpent: data.tokensSpent,
      rewardType: data.rewardType, rewardId: data.rewardId ?? null, rewardAmount: data.rewardAmount ?? null,
      rewardName: data.rewardName, rewardEmoji: data.rewardEmoji, rarity: data.rarity,
    });
  }

  async getMarketplaceListings(userId: string): Promise<any[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];
    const classId = await this.getUserClassId(userId);
    if (!classId) return [];
    return await db.select().from(studentMarketplaceListings)
      .where(and(eq(studentMarketplaceListings.classId, classId), eq(studentMarketplaceListings.status, "active")))
      .orderBy(desc(studentMarketplaceListings.createdAt));
  }

  private async getUserClassId(userId: string): Promise<string | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    if (user.role === "teacher" || user.role === "admin") {
      const cls = await db.select().from(classes).where(eq(classes.teacherId, userId)).limit(1);
      return cls[0]?.id ?? null;
    }
    const enrollment = await db.select().from(classStudents).where(eq(classStudents.studentId, userId)).limit(1);
    return enrollment[0]?.classId ?? null;
  }

  async createMarketplaceListing(userId: string, inventoryId: string, price: number): Promise<{ success: boolean; message: string; listing?: any }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };
    const [invItem] = await db.select().from(userInventory).where(and(eq(userInventory.id, inventoryId), eq(userInventory.userId, userId)));
    if (!invItem) return { success: false, message: "Item not found in your inventory" };
    if (!invItem.tradable) return { success: false, message: "This item cannot be traded" };
    // Check if already listed
    const existing = await db.select().from(studentMarketplaceListings)
      .where(and(eq(studentMarketplaceListings.inventoryId, inventoryId), eq(studentMarketplaceListings.status, "active")));
    if (existing.length > 0) return { success: false, message: "Item is already listed" };
    const classId = await this.getUserClassId(userId);
    if (!classId) return { success: false, message: "You must be in a class to list items" };
    // Look up item name/emoji
    const COLLECTIBLE_INFO: Record<string, { emoji: string; name: string }> = {
      "col-coin": { emoji: "🪙", name: "Gold Coin" }, "col-chart-up": { emoji: "📈", name: "Bull Chart" },
      "col-piggy": { emoji: "🐷", name: "Piggy Bank" }, "col-notepad": { emoji: "📔", name: "Trade Journal" },
      "col-lock": { emoji: "🔒", name: "Safety Lock" }, "col-receipt": { emoji: "🧾", name: "Trade Receipt" },
      "col-rocket": { emoji: "🚀", name: "Moon Rocket" }, "col-crown": { emoji: "👑", name: "Gold Crown" },
      "col-gem": { emoji: "💚", name: "Emerald Gem" }, "col-trophy": { emoji: "🏆", name: "Bronze Trophy" },
      "col-lightning": { emoji: "⚡", name: "Lightning Bolt" }, "col-diamond": { emoji: "💎", name: "Diamond" },
      "col-fire": { emoji: "🔥", name: "Fire Badge" }, "col-dragon": { emoji: "🐉", name: "Dragon" },
      "col-crystal-ball": { emoji: "🔮", name: "Crystal Ball" }, "col-unicorn": { emoji: "🦄", name: "Unicorn" },
      "col-rainbow-star": { emoji: "🌟", name: "Rainbow Star" }, "col-golden-bull": { emoji: "🐂", name: "Golden Bull" },
      "pu-double-tokens": { emoji: "🎯", name: "2× Token Boost" }, "pu-shield": { emoji: "🛡️", name: "Loss Shield" },
      "pu-xp-boost": { emoji: "⚡", name: "XP Boost" },
    };
    const info = COLLECTIBLE_INFO[invItem.itemId] ?? { emoji: "🎁", name: invItem.itemId };
    const [listing] = await db.insert(studentMarketplaceListings).values({
      classId, sellerId: userId, sellerName: user.displayName,
      inventoryId, itemId: invItem.itemId, itemType: invItem.itemType,
      itemName: info.name, itemEmoji: info.emoji, rarity: invItem.rarity, price,
    }).returning();
    // Reserve item (mark as not tradable until sold/cancelled)
    await db.update(userInventory).set({ tradable: false }).where(eq(userInventory.id, inventoryId));
    return { success: true, message: "Listed successfully!", listing };
  }

  async buyMarketplaceListing(listingId: string, buyerId: string): Promise<{ success: boolean; message: string }> {
    const [listing] = await db.select().from(studentMarketplaceListings).where(eq(studentMarketplaceListings.id, listingId));
    if (!listing || listing.status !== "active") return { success: false, message: "Listing not found or already sold" };
    if (listing.sellerId === buyerId) return { success: false, message: "You can't buy your own listing" };
    const buyer = await this.getUserById(buyerId);
    if (!buyer) return { success: false, message: "Buyer not found" };
    if ((buyer.classroomTokens ?? 0) < listing.price) return { success: false, message: "Not enough tokens" };
    // Transfer tokens
    await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} - ${listing.price}` }).where(eq(users.id, buyerId));
    await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${listing.price}` }).where(eq(users.id, listing.sellerId));
    // Transfer item
    await db.update(userInventory).set({ userId: buyerId, tradable: true }).where(eq(userInventory.id, listing.inventoryId));
    // Mark listing sold
    await db.update(studentMarketplaceListings).set({ status: "sold" }).where(eq(studentMarketplaceListings.id, listingId));
    return { success: true, message: `Purchased ${listing.itemName}!` };
  }

  async cancelMarketplaceListing(listingId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const [listing] = await db.select().from(studentMarketplaceListings).where(eq(studentMarketplaceListings.id, listingId));
    if (!listing || listing.status !== "active") return { success: false, message: "Listing not found or already completed" };
    if (listing.sellerId !== userId) return { success: false, message: "Not your listing" };
    await db.update(userInventory).set({ tradable: true }).where(eq(userInventory.id, listing.inventoryId));
    await db.update(studentMarketplaceListings).set({ status: "cancelled" }).where(eq(studentMarketplaceListings.id, listingId));
    return { success: true, message: "Listing cancelled" };
  }

  async getMarketplaceHistory(userId: string): Promise<any[]> {
    const classId = await this.getUserClassId(userId);
    if (!classId) return [];
    return await db.select().from(studentMarketplaceListings)
      .where(and(eq(studentMarketplaceListings.classId, classId), eq(studentMarketplaceListings.status, "sold")))
      .orderBy(desc(studentMarketplaceListings.createdAt))
      .limit(20);
  }

  // ── Auctions ────────────────────────────────────────────────────────────────
  private COLLECTIBLE_INFO: Record<string, { emoji: string; name: string }> = {
    "col-coin": { emoji: "🪙", name: "Gold Coin" }, "col-chart-up": { emoji: "📈", name: "Bull Chart" },
    "col-piggy": { emoji: "🐷", name: "Piggy Bank" }, "col-notepad": { emoji: "📔", name: "Trade Journal" },
    "col-lock": { emoji: "🔒", name: "Safety Lock" }, "col-receipt": { emoji: "🧾", name: "Trade Receipt" },
    "col-rocket": { emoji: "🚀", name: "Moon Rocket" }, "col-crown": { emoji: "👑", name: "Gold Crown" },
    "col-gem": { emoji: "💚", name: "Emerald Gem" }, "col-trophy": { emoji: "🏆", name: "Bronze Trophy" },
    "col-lightning": { emoji: "⚡", name: "Lightning Bolt" }, "col-diamond": { emoji: "💎", name: "Diamond" },
    "col-fire": { emoji: "🔥", name: "Fire Badge" }, "col-dragon": { emoji: "🐉", name: "Dragon" },
    "col-crystal-ball": { emoji: "🔮", name: "Crystal Ball" }, "col-unicorn": { emoji: "🦄", name: "Unicorn" },
    "col-rainbow-star": { emoji: "🌟", name: "Rainbow Star" }, "col-golden-bull": { emoji: "🐂", name: "Golden Bull" },
    "pu-double-tokens": { emoji: "🎯", name: "2× Token Boost" }, "pu-shield": { emoji: "🛡️", name: "Loss Shield" },
    "pu-xp-boost": { emoji: "⚡", name: "XP Boost" },
  };

  async getAuctions(userId: string): Promise<any[]> {
    const classId = await this.getUserClassId(userId);
    if (!classId) return [];
    await this.settleExpiredAuctions(classId);
    return await db.select().from(marketplaceAuctions)
      .where(and(eq(marketplaceAuctions.classId, classId), eq(marketplaceAuctions.status, "active")))
      .orderBy(asc(marketplaceAuctions.endTime));
  }

  async createAuction(userId: string, inventoryId: string, startPrice: number, durationMinutes: number): Promise<{ success: boolean; message: string; auction?: any }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };
    const [invItem] = await db.select().from(userInventory).where(and(eq(userInventory.id, inventoryId), eq(userInventory.userId, userId)));
    if (!invItem) return { success: false, message: "Item not found in your inventory" };
    if (!invItem.tradable) return { success: false, message: "This item is already listed elsewhere" };
    const classId = await this.getUserClassId(userId);
    if (!classId) return { success: false, message: "You must be in a class to auction items" };
    const info = this.COLLECTIBLE_INFO[invItem.itemId] ?? { emoji: "🎁", name: invItem.itemId };
    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);
    const [auction] = await db.insert(marketplaceAuctions).values({
      classId, sellerId: userId, sellerName: user.displayName,
      inventoryId, itemId: invItem.itemId, itemName: info.name, itemEmoji: info.emoji,
      rarity: invItem.rarity, startPrice, currentBid: 0, endTime, status: "active",
    }).returning();
    await db.update(userInventory).set({ tradable: false }).where(eq(userInventory.id, inventoryId));
    return { success: true, message: "Auction started!", auction };
  }

  async placeBid(auctionId: string, bidderId: string, amount: number): Promise<{ success: boolean; message: string }> {
    const [auction] = await db.select().from(marketplaceAuctions).where(eq(marketplaceAuctions.id, auctionId));
    if (!auction || auction.status !== "active") return { success: false, message: "Auction not found or ended" };
    if (new Date() > auction.endTime) return { success: false, message: "Auction has ended" };
    if (auction.sellerId === bidderId) return { success: false, message: "Cannot bid on your own auction" };
    const minBid = Math.max(auction.startPrice, auction.currentBid + 1);
    if (amount < minBid) return { success: false, message: `Minimum bid is ${minBid} tokens` };
    const bidder = await this.getUserById(bidderId);
    if (!bidder) return { success: false, message: "Bidder not found" };
    if ((bidder.classroomTokens ?? 0) < amount) return { success: false, message: "Not enough tokens" };
    // Refund previous bidder
    if (auction.currentBidderId) {
      await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${auction.currentBid}` }).where(eq(users.id, auction.currentBidderId));
    }
    // Deduct tokens from new bidder
    await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} - ${amount}` }).where(eq(users.id, bidderId));
    // Record bid
    await db.insert(auctionBids).values({ auctionId, bidderId, bidderName: bidder.displayName, amount });
    await db.update(marketplaceAuctions).set({ currentBid: amount, currentBidderId: bidderId, currentBidderName: bidder.displayName }).where(eq(marketplaceAuctions.id, auctionId));
    return { success: true, message: `Bid of ${amount} tokens placed!` };
  }

  async cancelAuction(auctionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const [auction] = await db.select().from(marketplaceAuctions).where(eq(marketplaceAuctions.id, auctionId));
    if (!auction || auction.status !== "active") return { success: false, message: "Auction not found" };
    if (auction.sellerId !== userId) return { success: false, message: "Not your auction" };
    if (auction.currentBid > 0 && auction.currentBidderId) {
      await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${auction.currentBid}` }).where(eq(users.id, auction.currentBidderId));
    }
    await db.update(userInventory).set({ tradable: true }).where(eq(userInventory.id, auction.inventoryId));
    await db.update(marketplaceAuctions).set({ status: "cancelled" }).where(eq(marketplaceAuctions.id, auctionId));
    return { success: true, message: "Auction cancelled and item returned" };
  }

  async settleExpiredAuctions(classId: string): Promise<void> {
    const expired = await db.select().from(marketplaceAuctions)
      .where(and(eq(marketplaceAuctions.classId, classId), eq(marketplaceAuctions.status, "active")));
    const now = new Date();
    for (const auction of expired) {
      if (auction.endTime > now) continue;
      if (auction.currentBid > 0 && auction.currentBidderId) {
        // Transfer item to winner; tokens already deducted at bid time, pay seller
        await db.update(userInventory).set({ userId: auction.currentBidderId, tradable: true }).where(eq(userInventory.id, auction.inventoryId));
        await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${auction.currentBid}` }).where(eq(users.id, auction.sellerId));
        await db.update(marketplaceAuctions).set({ status: "ended" }).where(eq(marketplaceAuctions.id, auction.id));
      } else {
        // No bids — return item to seller
        await db.update(userInventory).set({ tradable: true }).where(eq(userInventory.id, auction.inventoryId));
        await db.update(marketplaceAuctions).set({ status: "ended" }).where(eq(marketplaceAuctions.id, auction.id));
      }
    }
  }

  // ── Bets ────────────────────────────────────────────────────────────────────
  async getBets(userId: string): Promise<any[]> {
    const classId = await this.getUserClassId(userId);
    if (!classId) return [];
    const bets = await db.select().from(marketplaceBets)
      .where(and(eq(marketplaceBets.classId, classId), or(eq(marketplaceBets.status, "open"), eq(marketplaceBets.status, "locked"))))
      .orderBy(desc(marketplaceBets.createdAt));
    const entries = await db.select().from(betEntries).where(eq(betEntries.userId, userId));
    return bets.map(b => ({
      ...b,
      myEntry: entries.find(e => e.betId === b.id) ?? null,
    }));
  }

  async createBet(userId: string, question: string, optionA: string, optionB: string, expiresInMinutes: number): Promise<{ success: boolean; message: string; bet?: any }> {
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };
    const classId = await this.getUserClassId(userId);
    if (!classId) return { success: false, message: "You must be in a class" };
    const expiresAt = expiresInMinutes > 0 ? new Date(Date.now() + expiresInMinutes * 60 * 1000) : null;
    const [bet] = await db.insert(marketplaceBets).values({
      classId, creatorId: userId, creatorName: user.displayName,
      question, optionA, optionB, expiresAt,
    }).returning();
    return { success: true, message: "Bet created!", bet };
  }

  async enterBet(betId: string, userId: string, option: string, amount: number): Promise<{ success: boolean; message: string }> {
    if (!["A", "B"].includes(option)) return { success: false, message: "Invalid option" };
    const [bet] = await db.select().from(marketplaceBets).where(eq(marketplaceBets.id, betId));
    if (!bet || bet.status !== "open") return { success: false, message: "Bet is not open" };
    if (bet.expiresAt && new Date() > bet.expiresAt) return { success: false, message: "Bet has expired" };
    const existing = await db.select().from(betEntries).where(and(eq(betEntries.betId, betId), eq(betEntries.userId, userId)));
    if (existing.length > 0) return { success: false, message: "You already entered this bet" };
    const user = await this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };
    if ((user.classroomTokens ?? 0) < amount) return { success: false, message: "Not enough tokens" };
    await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} - ${amount}` }).where(eq(users.id, userId));
    await db.insert(betEntries).values({ betId, userId, userName: user.displayName, option, amount });
    if (option === "A") {
      await db.update(marketplaceBets).set({ totalPoolA: sql`${marketplaceBets.totalPoolA} + ${amount}` }).where(eq(marketplaceBets.id, betId));
    } else {
      await db.update(marketplaceBets).set({ totalPoolB: sql`${marketplaceBets.totalPoolB} + ${amount}` }).where(eq(marketplaceBets.id, betId));
    }
    return { success: true, message: `Bet placed: ${amount} tokens on ${option === "A" ? bet.optionA : bet.optionB}` };
  }

  async resolveBet(betId: string, userId: string, result: string): Promise<{ success: boolean; message: string; payouts?: any[] }> {
    if (!["A", "B", "cancel"].includes(result)) return { success: false, message: "Invalid result" };
    const [bet] = await db.select().from(marketplaceBets).where(eq(marketplaceBets.id, betId));
    if (!bet) return { success: false, message: "Bet not found" };
    if (bet.creatorId !== userId) return { success: false, message: "Only the bet creator can resolve it" };
    if (bet.status === "resolved" || bet.status === "cancelled") return { success: false, message: "Bet already resolved" };
    if (result === "cancel") {
      const allEntries = await db.select().from(betEntries).where(eq(betEntries.betId, betId));
      for (const entry of allEntries) {
        await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${entry.amount}` }).where(eq(users.id, entry.userId));
      }
      await db.update(marketplaceBets).set({ status: "cancelled", resolvedAt: new Date() }).where(eq(marketplaceBets.id, betId));
      return { success: true, message: "Bet cancelled, all tokens refunded" };
    }
    const winningEntries = await db.select().from(betEntries).where(and(eq(betEntries.betId, betId), eq(betEntries.option, result)));
    const totalPool = (bet.totalPoolA ?? 0) + (bet.totalPoolB ?? 0);
    const winningPool = result === "A" ? (bet.totalPoolA ?? 0) : (bet.totalPoolB ?? 0);
    const payouts: any[] = [];
    for (const entry of winningEntries) {
      const share = winningPool > 0 ? Math.floor((entry.amount / winningPool) * totalPool) : 0;
      await db.update(users).set({ classroomTokens: sql`${users.classroomTokens} + ${share}` }).where(eq(users.id, entry.userId));
      await db.update(betEntries).set({ payout: share }).where(eq(betEntries.id, entry.id));
      payouts.push({ userName: entry.userName, payout: share });
    }
    await db.update(marketplaceBets).set({ status: "resolved", result, resolvedAt: new Date() }).where(eq(marketplaceBets.id, betId));
    return { success: true, message: `Bet resolved! ${result === "A" ? bet.optionA : bet.optionB} wins`, payouts };
  }

  async cancelBet(betId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.resolveBet(betId, userId, "cancel");
  }

  async getMyBetEntries(userId: string): Promise<any[]> {
    return await db.select().from(betEntries).where(eq(betEntries.userId, userId)).orderBy(desc(betEntries.createdAt)).limit(20);
  }

  async checkAndAwardAchievements(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const trades = await this.getTradesByUser(userId);
    const lessonProgress = await this.getLessonProgress(userId);
    const completedLessons = lessonProgress.filter(lp => lp.completed).length;
    const balance = Number(user.simulatorBalance ?? 5000);
    
    const achievements = await this.getAchievements();
    const userAchievements = await this.getUserAchievements(userId);

    for (const achievement of achievements) {
      const existingUa = userAchievements.find(ua => ua.achievementId === achievement.id);
      if (existingUa && existingUa.progress === 100) continue;

      let currentProgress = 0;

      switch (achievement.category) {
        case "trading":
          if (achievement.id === "first-trade") {
            currentProgress = trades.length >= 1 ? 100 : 0;
          } else if (achievement.id === "day-trader") {
            currentProgress = Math.min(100, (trades.length / 10) * 100);
          }
          break;
        case "learning":
          if (achievement.id === "student") {
            currentProgress = completedLessons >= 1 ? 100 : 0;
          }
          break;
        case "balance":
          if (achievement.id === "starter") {
            currentProgress = balance >= 6000 ? 100 : 0;
          } else if (achievement.id === "growing") {
            currentProgress = balance >= 10000 ? 100 : 0;
          }
          break;
      }

      if (currentProgress > (existingUa?.progress ?? 0)) {
        await this.updateAchievementProgress(userId, achievement.id, currentProgress);
      }
    }
  }

  // ===== CLASSROOM ECONOMY =====

  async getEconomySettings(classId: string): Promise<ClassroomEconomySettings | undefined> {
    const [settings] = await db.select().from(classroomEconomySettings).where(eq(classroomEconomySettings.classId, classId));
    return settings;
  }

  async upsertEconomySettings(classId: string, data: Partial<InsertClassroomEconomySettings>): Promise<ClassroomEconomySettings> {
    const existing = await this.getEconomySettings(classId);
    if (existing) {
      const [updated] = await db.update(classroomEconomySettings).set(data).where(eq(classroomEconomySettings.classId, classId)).returning();
      return updated;
    }
    const [created] = await db.insert(classroomEconomySettings).values({ classId, ...data }).returning();
    return created;
  }

  async addCurrencyTransaction(data: InsertClassroomCurrencyTransaction): Promise<ClassroomCurrencyTransaction> {
    const [tx] = await db.insert(classroomCurrencyTransactions).values(data).returning();
    return tx;
  }

  async getStudentBalance(classId: string, studentId: string): Promise<number> {
    const result = await db.select({ total: sum(classroomCurrencyTransactions.amount) })
      .from(classroomCurrencyTransactions)
      .where(and(eq(classroomCurrencyTransactions.classId, classId), eq(classroomCurrencyTransactions.studentId, studentId)));
    return Number(result[0]?.total ?? 0);
  }

  async getStudentTransactions(classId: string, studentId: string, limit = 50): Promise<ClassroomCurrencyTransaction[]> {
    return db.select().from(classroomCurrencyTransactions)
      .where(and(eq(classroomCurrencyTransactions.classId, classId), eq(classroomCurrencyTransactions.studentId, studentId)))
      .orderBy(desc(classroomCurrencyTransactions.createdAt))
      .limit(limit);
  }

  async getAllStudentBalances(classId: string): Promise<{ studentId: string; balance: number }[]> {
    const results = await db.select({ studentId: classroomCurrencyTransactions.studentId, balance: sum(classroomCurrencyTransactions.amount) })
      .from(classroomCurrencyTransactions)
      .where(eq(classroomCurrencyTransactions.classId, classId))
      .groupBy(classroomCurrencyTransactions.studentId);
    return results.map(r => ({ studentId: r.studentId, balance: Number(r.balance ?? 0) }));
  }

  // Expenses
  async createExpense(data: InsertClassroomExpense): Promise<ClassroomExpense> {
    const [expense] = await db.insert(classroomExpenses).values(data).returning();
    return expense;
  }

  async getExpensesByClass(classId: string): Promise<ClassroomExpense[]> {
    return db.select().from(classroomExpenses)
      .where(and(eq(classroomExpenses.classId, classId), eq(classroomExpenses.isActive, true)))
      .orderBy(desc(classroomExpenses.createdAt));
  }

  async deleteExpense(id: string): Promise<void> {
    await db.update(classroomExpenses).set({ isActive: false }).where(eq(classroomExpenses.id, id));
  }

  async chargeExpenseToStudent(expenseId: string, studentId: string, classId: string, amount: number, name: string): Promise<void> {
    await db.insert(classroomExpensePayments).values({ expenseId, studentId, classId, amount });
    await this.addCurrencyTransaction({ classId, studentId, amount: -amount, type: "expense", description: `Expense: ${name}`, referenceId: expenseId });
  }

  async getExpensePaymentsByStudent(studentId: string, classId: string): Promise<any[]> {
    return db.select({ id: classroomExpensePayments.id, expenseId: classroomExpensePayments.expenseId, amount: classroomExpensePayments.amount, paidAt: classroomExpensePayments.paidAt, name: classroomExpenses.name })
      .from(classroomExpensePayments)
      .innerJoin(classroomExpenses, eq(classroomExpensePayments.expenseId, classroomExpenses.id))
      .where(and(eq(classroomExpensePayments.studentId, studentId), eq(classroomExpensePayments.classId, classId)))
      .orderBy(desc(classroomExpensePayments.paidAt));
  }

  // Jobs
  async createJob(data: InsertClassroomJob): Promise<ClassroomJob> {
    const [job] = await db.insert(classroomJobs).values(data).returning();
    return job;
  }

  async getJobsByClass(classId: string): Promise<ClassroomJob[]> {
    return db.select().from(classroomJobs)
      .where(and(eq(classroomJobs.classId, classId), eq(classroomJobs.isActive, true)))
      .orderBy(desc(classroomJobs.createdAt));
  }

  async deleteJob(id: string): Promise<void> {
    await db.update(classroomJobs).set({ isActive: false }).where(eq(classroomJobs.id, id));
    await db.delete(classroomJobAssignments).where(eq(classroomJobAssignments.jobId, id));
  }

  async assignJob(jobId: string, studentId: string, classId: string): Promise<ClassroomJobAssignment> {
    const [assignment] = await db.insert(classroomJobAssignments).values({ jobId, studentId, classId }).returning();
    return assignment;
  }

  async unassignJob(jobId: string, studentId: string): Promise<void> {
    await db.delete(classroomJobAssignments).where(and(eq(classroomJobAssignments.jobId, jobId), eq(classroomJobAssignments.studentId, studentId)));
  }

  async getJobAssignmentsByClass(classId: string): Promise<(ClassroomJobAssignment & { jobTitle: string; payAmount: number; studentName: string })[]> {
    const results = await db.select({
      id: classroomJobAssignments.id, jobId: classroomJobAssignments.jobId,
      studentId: classroomJobAssignments.studentId, classId: classroomJobAssignments.classId,
      assignedAt: classroomJobAssignments.assignedAt, lastPaidAt: classroomJobAssignments.lastPaidAt,
      jobTitle: classroomJobs.title, payAmount: classroomJobs.payAmount, studentName: users.displayName
    })
      .from(classroomJobAssignments)
      .innerJoin(classroomJobs, eq(classroomJobAssignments.jobId, classroomJobs.id))
      .innerJoin(users, eq(classroomJobAssignments.studentId, users.id))
      .where(eq(classroomJobAssignments.classId, classId));
    return results as any;
  }

  async getJobAssignmentsByStudent(studentId: string, classId: string): Promise<(ClassroomJobAssignment & { jobTitle: string; payAmount: number; payFrequency: string })[]> {
    const results = await db.select({
      id: classroomJobAssignments.id, jobId: classroomJobAssignments.jobId,
      studentId: classroomJobAssignments.studentId, classId: classroomJobAssignments.classId,
      assignedAt: classroomJobAssignments.assignedAt, lastPaidAt: classroomJobAssignments.lastPaidAt,
      jobTitle: classroomJobs.title, payAmount: classroomJobs.payAmount, payFrequency: classroomJobs.payFrequency
    })
      .from(classroomJobAssignments)
      .innerJoin(classroomJobs, eq(classroomJobAssignments.jobId, classroomJobs.id))
      .where(and(eq(classroomJobAssignments.studentId, studentId), eq(classroomJobAssignments.classId, classId)));
    return results as any;
  }

  async payJobHolder(assignmentId: string, studentId: string, classId: string, amount: number, jobTitle: string): Promise<void> {
    await db.update(classroomJobAssignments).set({ lastPaidAt: new Date() }).where(eq(classroomJobAssignments.id, assignmentId));
    await this.addCurrencyTransaction({ classId, studentId, amount, type: "job", description: `Job pay: ${jobTitle}`, referenceId: assignmentId });
  }

  // Auctions
  async createAuction(data: InsertClassroomAuction): Promise<ClassroomAuction> {
    const [auction] = await db.insert(classroomAuctions).values(data).returning();
    return auction;
  }

  async getAuctionsByClass(classId: string): Promise<ClassroomAuction[]> {
    return db.select().from(classroomAuctions)
      .where(eq(classroomAuctions.classId, classId))
      .orderBy(desc(classroomAuctions.createdAt));
  }

  async getAuction(id: string): Promise<ClassroomAuction | undefined> {
    const [auction] = await db.select().from(classroomAuctions).where(eq(classroomAuctions.id, id));
    return auction;
  }

  async placeBid(auctionId: string, studentId: string, classId: string, amount: number): Promise<ClassroomAuctionBid> {
    const [bid] = await db.insert(classroomAuctionBids).values({ auctionId, studentId, classId, amount }).returning();
    await db.update(classroomAuctions).set({ currentHighBid: amount, currentHighBidderId: studentId }).where(eq(classroomAuctions.id, auctionId));
    return bid;
  }

  async getBidsByAuction(auctionId: string): Promise<(ClassroomAuctionBid & { studentName: string })[]> {
    const results = await db.select({ id: classroomAuctionBids.id, auctionId: classroomAuctionBids.auctionId, studentId: classroomAuctionBids.studentId, classId: classroomAuctionBids.classId, amount: classroomAuctionBids.amount, createdAt: classroomAuctionBids.createdAt, studentName: users.displayName })
      .from(classroomAuctionBids)
      .innerJoin(users, eq(classroomAuctionBids.studentId, users.id))
      .where(eq(classroomAuctionBids.auctionId, auctionId))
      .orderBy(desc(classroomAuctionBids.amount));
    return results as any;
  }

  async closeAuction(auctionId: string): Promise<ClassroomAuction> {
    const auction = await this.getAuction(auctionId);
    if (!auction) throw new Error("Auction not found");
    const winnerId = auction.currentHighBidderId;
    if (winnerId && auction.currentHighBid && auction.currentHighBid > 0) {
      await this.addCurrencyTransaction({ classId: auction.classId, studentId: winnerId, amount: -(auction.currentHighBid), type: "auction", description: `Won auction: ${auction.title}`, referenceId: auctionId });
    }
    const [closed] = await db.update(classroomAuctions).set({ isActive: false, winnerId, closedAt: new Date() }).where(eq(classroomAuctions.id, auctionId)).returning();
    return closed;
  }

  async deleteAuction(id: string): Promise<void> {
    await db.update(classroomAuctions).set({ isActive: false }).where(eq(classroomAuctions.id, id));
  }

  // Store
  async createStoreItem(data: InsertClassroomStoreItem): Promise<ClassroomStoreItem> {
    const [item] = await db.insert(classroomStoreItems).values(data).returning();
    return item;
  }

  async getStoreItemsByClass(classId: string): Promise<ClassroomStoreItem[]> {
    return db.select().from(classroomStoreItems)
      .where(and(eq(classroomStoreItems.classId, classId), eq(classroomStoreItems.isActive, true)))
      .orderBy(asc(classroomStoreItems.price));
  }

  async deleteStoreItem(id: string): Promise<void> {
    await db.update(classroomStoreItems).set({ isActive: false }).where(eq(classroomStoreItems.id, id));
  }

  async purchaseStoreItem(itemId: string, studentId: string, classId: string): Promise<ClassroomStorePurchase> {
    const [item] = await db.select().from(classroomStoreItems).where(eq(classroomStoreItems.id, itemId));
    if (!item) throw new Error("Item not found");
    if (item.stock !== null && item.stock <= 0) throw new Error("Out of stock");
    if (item.stock !== null) {
      await db.update(classroomStoreItems).set({ stock: item.stock - 1 }).where(eq(classroomStoreItems.id, itemId));
    }
    const [purchase] = await db.insert(classroomStorePurchases).values({ itemId, studentId, classId, price: item.price }).returning();
    await this.addCurrencyTransaction({ classId, studentId, amount: -item.price, type: "purchase", description: `Bought: ${item.name}`, referenceId: itemId });
    return purchase;
  }

  async getPurchasesByStudent(studentId: string, classId: string): Promise<(ClassroomStorePurchase & { itemName: string; emoji: string })[]> {
    const results = await db.select({ id: classroomStorePurchases.id, itemId: classroomStorePurchases.itemId, studentId: classroomStorePurchases.studentId, classId: classroomStorePurchases.classId, price: classroomStorePurchases.price, purchasedAt: classroomStorePurchases.purchasedAt, itemName: classroomStoreItems.name, emoji: classroomStoreItems.emoji })
      .from(classroomStorePurchases)
      .innerJoin(classroomStoreItems, eq(classroomStorePurchases.itemId, classroomStoreItems.id))
      .where(and(eq(classroomStorePurchases.studentId, studentId), eq(classroomStorePurchases.classId, classId)))
      .orderBy(desc(classroomStorePurchases.purchasedAt));
    return results as any;
  }

  // Savings
  async getSavingsBalance(studentId: string, classId: string): Promise<number> {
    const txs = await db.select().from(classroomCurrencyTransactions)
      .where(and(
        eq(classroomCurrencyTransactions.studentId, studentId),
        eq(classroomCurrencyTransactions.classId, classId),
        inArray(classroomCurrencyTransactions.type, ["savings_deposit", "savings_withdrawal", "savings_interest"])
      ));
    let savings = 0;
    for (const tx of txs) {
      if (tx.type === "savings_deposit") savings += Math.abs(tx.amount);
      else if (tx.type === "savings_withdrawal") savings -= Math.abs(tx.amount);
      else if (tx.type === "savings_interest") savings += tx.amount;
    }
    return Math.max(0, savings);
  }

  async depositToSavings(studentId: string, classId: string, amount: number): Promise<void> {
    const balance = await this.getStudentBalance(classId, studentId);
    if (balance < amount) throw new Error("Insufficient balance");
    await this.addCurrencyTransaction({ classId, studentId, amount: -amount, type: "savings_deposit", description: `Deposited ${amount} to savings` });
  }

  async withdrawFromSavings(studentId: string, classId: string, amount: number): Promise<void> {
    const savings = await this.getSavingsBalance(studentId, classId);
    if (savings < amount) throw new Error("Insufficient savings balance");
    await this.addCurrencyTransaction({ classId, studentId, amount: amount, type: "savings_withdrawal", description: `Withdrew ${amount} from savings` });
  }

  async applySavingsInterestToAll(classId: string, interestRate: number): Promise<number> {
    const enrollments = await db.select().from(classStudents).where(eq(classStudents.classId, classId));
    let count = 0;
    for (const enrollment of enrollments) {
      const savings = await this.getSavingsBalance(enrollment.studentId, classId);
      if (savings > 0) {
        const interest = Math.floor(savings * (interestRate / 100));
        if (interest > 0) {
          await this.addCurrencyTransaction({ classId, studentId: enrollment.studentId, amount: interest, type: "savings_interest", description: `Savings interest (${interestRate}%)` });
          count++;
        }
      }
    }
    return count;
  }

  // Economy Events (bulk actions)
  async classBonus(classId: string, amount: number, description: string): Promise<number> {
    const enrollments = await db.select().from(classStudents).where(eq(classStudents.classId, classId));
    for (const e of enrollments) {
      await this.addCurrencyTransaction({ classId, studentId: e.studentId, amount, type: "teacher_award", description });
    }
    return enrollments.length;
  }

  async classFine(classId: string, amount: number, description: string): Promise<number> {
    const enrollments = await db.select().from(classStudents).where(eq(classStudents.classId, classId));
    let count = 0;
    for (const e of enrollments) {
      const balance = await this.getStudentBalance(classId, e.studentId);
      const charge = Math.min(amount, balance);
      if (charge > 0) {
        await this.addCurrencyTransaction({ classId, studentId: e.studentId, amount: -charge, type: "expense", description });
        count++;
      }
    }
    return count;
  }

  async classFinePercent(classId: string, percent: number, description: string): Promise<number> {
    const enrollments = await db.select().from(classStudents).where(eq(classStudents.classId, classId));
    let count = 0;
    for (const e of enrollments) {
      const balance = await this.getStudentBalance(classId, e.studentId);
      const charge = Math.floor(balance * (percent / 100));
      if (charge > 0) {
        await this.addCurrencyTransaction({ classId, studentId: e.studentId, amount: -charge, type: "expense", description });
        count++;
      }
    }
    return count;
  }

  // Challenges
  async getChallengesByClass(classId: string): Promise<ClassroomChallenge[]> {
    return db.select().from(classroomChallenges).where(eq(classroomChallenges.classId, classId)).orderBy(desc(classroomChallenges.createdAt));
  }

  async createChallenge(data: InsertClassroomChallenge): Promise<ClassroomChallenge> {
    const [challenge] = await db.insert(classroomChallenges).values(data).returning();
    return challenge;
  }

  async deleteChallenge(id: string): Promise<void> {
    await db.update(classroomChallenges).set({ isActive: false }).where(eq(classroomChallenges.id, id));
  }

  async closeChallengeAndAward(challengeId: string, winnerId: string, classId: string, rewardAmount: number, challengeTitle: string): Promise<void> {
    await db.update(classroomChallenges).set({ isActive: false, winnerId }).where(eq(classroomChallenges.id, challengeId));
    if (rewardAmount > 0) {
      await this.addCurrencyTransaction({ classId, studentId: winnerId, amount: rewardAmount, type: "teacher_award", description: `Won challenge: ${challengeTitle}` });
    }
  }

  async getClassLeaderboard(classId: string): Promise<{ id: string; displayName: string; balance: number; savingsBalance: number }[]> {
    const enrollments = await db.select({ studentId: classStudents.studentId, displayName: users.displayName })
      .from(classStudents)
      .innerJoin(users, eq(classStudents.studentId, users.id))
      .where(eq(classStudents.classId, classId));
    const result = [];
    for (const e of enrollments) {
      const balance = await this.getStudentBalance(classId, e.studentId);
      const savingsBalance = await this.getSavingsBalance(e.studentId, classId);
      result.push({ id: e.studentId, displayName: e.displayName, balance, savingsBalance });
    }
    return result.sort((a, b) => b.balance - a.balance);
  }

  // ─── Assets ────────────────────────────────────────────────────
  async getClassroomAssets(classId: string): Promise<ClassroomAsset[]> {
    return db.select().from(classroomAssets)
      .where(and(eq(classroomAssets.classId, classId), eq(classroomAssets.isActive, true)))
      .orderBy(classroomAssets.createdAt);
  }

  async createClassroomAsset(data: InsertClassroomAsset): Promise<ClassroomAsset> {
    const [asset] = await db.insert(classroomAssets).values(data).returning();
    return asset;
  }

  async deleteClassroomAsset(id: string): Promise<void> {
    await db.update(classroomAssets).set({ isActive: false }).where(eq(classroomAssets.id, id));
  }

  async getStudentAssets(classId: string, studentId: string): Promise<(StudentAsset & { asset: ClassroomAsset })[]> {
    const rows = await db.select({ sa: studentAssets, a: classroomAssets })
      .from(studentAssets)
      .innerJoin(classroomAssets, eq(studentAssets.assetId, classroomAssets.id))
      .where(and(eq(studentAssets.classId, classId), eq(studentAssets.studentId, studentId)));
    return rows.map(r => ({ ...r.sa, asset: r.a }));
  }

  async countAssetOwners(assetId: string): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(studentAssets)
      .where(eq(studentAssets.assetId, assetId));
    return Number(count);
  }

  async purchaseClassroomAsset(classId: string, studentId: string, assetId: string): Promise<StudentAsset> {
    const asset = await db.select().from(classroomAssets).where(eq(classroomAssets.id, assetId)).limit(1).then(r => r[0]);
    if (!asset) throw new Error("Asset not found");
    if (asset.maxOwners !== null) {
      const count = await this.countAssetOwners(assetId);
      if (count >= asset.maxOwners) throw new Error("Asset is fully owned");
    }
    const balance = await this.getStudentBalance(classId, studentId);
    if (balance < asset.price) throw new Error("Insufficient balance");
    await this.addCurrencyTransaction({ classId, studentId, amount: -asset.price, type: "purchase", description: `Bought asset: ${asset.name}`, referenceId: assetId });
    const [sa] = await db.insert(studentAssets).values({ classId, studentId, assetId }).returning();
    return sa;
  }

  async processAssetIncome(classId: string): Promise<{ incomeCount: number; maintenanceCount: number }> {
    const enrollments = await db.select({ studentId: classStudents.studentId })
      .from(classStudents).where(eq(classStudents.classId, classId));
    let incomeCount = 0, maintenanceCount = 0;
    for (const e of enrollments) {
      const ownedAssets = await this.getStudentAssets(classId, e.studentId);
      for (const owned of ownedAssets) {
        const asset = owned.asset;
        if (asset.passiveIncome && asset.passiveIncome > 0) {
          await this.addCurrencyTransaction({ classId, studentId: e.studentId, amount: asset.passiveIncome, type: "interest", description: `Income from: ${asset.name}`, referenceId: owned.id });
          await db.update(studentAssets).set({ lastIncomePaidAt: new Date() }).where(eq(studentAssets.id, owned.id));
          incomeCount++;
        }
        if (asset.maintenanceCost && asset.maintenanceCost > 0) {
          const balance = await this.getStudentBalance(classId, e.studentId);
          const charge = Math.min(balance, asset.maintenanceCost);
          if (charge > 0) {
            await this.addCurrencyTransaction({ classId, studentId: e.studentId, amount: -charge, type: "expense", description: `Maintenance: ${asset.name}`, referenceId: owned.id });
            await db.update(studentAssets).set({ lastMaintenancePaidAt: new Date() }).where(eq(studentAssets.id, owned.id));
            maintenanceCount++;
          }
        }
      }
    }
    return { incomeCount, maintenanceCount };
  }

  async getStudentNetWorth(classId: string, studentId: string): Promise<{ cash: number; savings: number; assetValue: number; simulatorBalance: number; loanBalance: number; total: number }> {
    const cash = await this.getStudentBalance(classId, studentId);
    const savings = await this.getSavingsBalance(studentId, classId);
    const ownedAssets = await this.getStudentAssets(classId, studentId);
    const assetValue = ownedAssets.reduce((sum, sa) => sum + (sa.asset.value ?? 0), 0);
    const user = await this.getUserById(studentId);
    const simulatorBalance = user?.simulatorBalance ?? 0;
    const loans = await this.getStudentLoans(classId, studentId);
    const loanBalance = loans.filter(l => l.isActive).reduce((sum, l) => sum + l.balance, 0);
    const total = Math.round(cash + savings + assetValue + simulatorBalance - loanBalance);
    return { cash, savings, assetValue, simulatorBalance: Math.round(simulatorBalance), loanBalance, total };
  }

  async getClassNetWorthLeaderboard(classId: string): Promise<{ id: string; displayName: string; netWorth: number; cash: number; assetValue: number; simulatorBalance: number }[]> {
    const enrollments = await db.select({ studentId: classStudents.studentId, displayName: users.displayName })
      .from(classStudents).innerJoin(users, eq(classStudents.studentId, users.id))
      .where(eq(classStudents.classId, classId));
    const result = [];
    for (const e of enrollments) {
      const nw = await this.getStudentNetWorth(classId, e.studentId);
      result.push({ id: e.studentId, displayName: e.displayName, netWorth: nw.total, cash: nw.cash, assetValue: nw.assetValue, simulatorBalance: nw.simulatorBalance });
    }
    return result.sort((a, b) => b.netWorth - a.netWorth);
  }

  // ─── Loans ──────────────────────────────────────────────────────
  async getStudentLoans(classId: string, studentId: string) {
    return db.select().from(economyLoans)
      .where(and(eq(economyLoans.classId, classId), eq(economyLoans.studentId, studentId)))
      .orderBy(desc(economyLoans.createdAt));
  }

  async getClassLoans(classId: string) {
    return db.select({ loan: economyLoans, displayName: users.displayName })
      .from(economyLoans)
      .innerJoin(users, eq(economyLoans.studentId, users.id))
      .where(eq(economyLoans.classId, classId))
      .orderBy(desc(economyLoans.createdAt));
  }

  async issueLoan(classId: string, studentId: string, amount: number, interestRate: number, dueDate?: Date) {
    const [loan] = await db.insert(economyLoans).values({
      classId, studentId, principal: amount, balance: amount, interestRate, isActive: true, dueDate: dueDate ?? null,
    }).returning();
    await this.addCurrencyTransaction({ classId, studentId, amount, type: "loan", description: `Loan received: ${amount} coins (${interestRate}% interest)` });
    return loan;
  }

  async repayLoan(classId: string, studentId: string, loanId: string, amount: number) {
    const [loan] = await db.select().from(economyLoans).where(and(eq(economyLoans.id, loanId), eq(economyLoans.studentId, studentId)));
    if (!loan || !loan.isActive) throw new Error("Loan not found or already paid off");
    const balance = await this.getStudentBalance(classId, studentId);
    if (balance < amount) throw new Error("Insufficient balance");
    const repayAmount = Math.min(amount, loan.balance);
    const newBalance = loan.balance - repayAmount;
    await db.update(economyLoans).set({ balance: newBalance, isActive: newBalance > 0 }).where(eq(economyLoans.id, loanId));
    await this.addCurrencyTransaction({ classId, studentId, amount: -repayAmount, type: "loan_repayment", description: `Loan repayment: ${repayAmount} coins` });
    return { repaid: repayAmount, remaining: newBalance };
  }

  async applyLoanInterest(classId: string) {
    const activeLoans = await db.select().from(economyLoans).where(and(eq(economyLoans.classId, classId), eq(economyLoans.isActive, true)));
    let count = 0;
    for (const loan of activeLoans) {
      const interest = Math.round(loan.balance * loan.interestRate / 100);
      if (interest > 0) {
        const newBalance = loan.balance + interest;
        await db.update(economyLoans).set({ balance: newBalance }).where(eq(economyLoans.id, loan.id));
        count++;
      }
    }
    return { count };
  }

  // ===== ACADEMY GAMIFICATION =====

  private getXpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(50 * Math.pow(level - 1, 1.6));
  }

  private getLevelFromXp(xp: number): number {
    let level = 1;
    while (level < 100 && this.getXpForLevel(level + 1) <= xp) level += 1;
    return level;
  }

  async completeLessonAndAward(userId: string, lessonId: string, baseXp: number) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    const existing = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
      .limit(1);
    const wasCompleted = existing.length > 0 && existing[0].completed;
    const isNewCompletion = !wasCompleted;

    if (existing.length > 0) {
      await db.update(lessonProgress).set({ completed: true, completedAt: new Date() })
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    } else {
      await db.insert(lessonProgress).values({ userId, lessonId, completed: true, completedAt: new Date() });
    }

    const oldXp = user.xp ?? 0;
    const oldLevel = this.getLevelFromXp(oldXp);

    let xpAwarded = 0;
    let bonusXp = 0;
    let streak = user.lessonStreak ?? 0;
    let bestStreak = user.lessonStreakBest ?? 0;
    let streakProtected = false;
    let streakFreezes = user.streakFreezes ?? 0;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (isNewCompletion) {
      xpAwarded = baseXp;
      // Random surprise bonus (20% chance)
      if (Math.random() < 0.2) {
        bonusXp = Math.floor(Math.random() * 20) + 10;
      }

      // Streak update — only on first lesson of the day
      if (user.lastLessonDate !== today) {
        if (user.lastLessonDate === yesterday) {
          streak = streak + 1;
        } else if (user.lastLessonDate && user.lastLessonDate !== yesterday && streakFreezes > 0) {
          // Use a streak freeze to keep streak alive after missed day(s)
          streak = streak + 1;
          streakFreezes = streakFreezes - 1;
          streakProtected = true;
        } else {
          streak = 1;
        }
        if (streak > bestStreak) bestStreak = streak;

        // Streak milestone bonuses
        if ([3, 7, 14, 30, 60, 100].includes(streak)) {
          bonusXp += streak * 5;
          // Bonus freeze on big milestones
          if (streak === 7 || streak === 30) streakFreezes = Math.min(3, streakFreezes + 1);
        }
      }
    }

    const totalAwarded = xpAwarded + bonusXp;
    const newXp = oldXp + totalAwarded;
    const newLevel = this.getLevelFromXp(newXp);
    const leveledUp = newLevel > oldLevel;

    const completedCount = isNewCompletion ? (user.lessonsCompleted ?? 0) + 1 : user.lessonsCompleted ?? 0;

    await db.update(users).set({
      xp: newXp,
      lessonsCompleted: completedCount,
      lessonStreak: streak,
      lessonStreakBest: bestStreak,
      lastLessonDate: today,
      streakFreezes,
    }).where(eq(users.id, userId));

    // Update daily challenge progress
    if (isNewCompletion) {
      await this.updateChallengeProgress(userId, "lessons", 1);
      await this.updateChallengeProgress(userId, "xp", totalAwarded);
    }

    return {
      xpAwarded: totalAwarded,
      newXp,
      leveledUp,
      oldLevel,
      newLevel,
      streak,
      bestStreak,
      streakProtected,
      bonusXp,
      isNewCompletion,
    };
  }

  async awardQuizXp(userId: string, lessonId: string, score: number, total: number, comboMultiplier: number, timeBonus: number) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    await db.insert(quizAttempts).values({ userId, lessonId, score, total });

    const passed = total > 0 && score / total >= 0.6;
    const oldXp = user.xp ?? 0;
    const oldLevel = this.getLevelFromXp(oldXp);

    // Base XP per correct answer * combo multiplier + time bonus
    const baseXp = score * 5;
    const multiplied = Math.round(baseXp * Math.max(1, comboMultiplier));
    const xpAwarded = passed ? multiplied + (timeBonus || 0) : Math.floor(score * 2);

    const newXp = oldXp + xpAwarded;
    const newLevel = this.getLevelFromXp(newXp);
    const leveledUp = newLevel > oldLevel;

    await db.update(users).set({ xp: newXp }).where(eq(users.id, userId));

    if (xpAwarded > 0) {
      await this.updateChallengeProgress(userId, "xp", xpAwarded);
    }
    if (passed) {
      await this.updateChallengeProgress(userId, "quizzes", 1);
    }

    return { xpAwarded, newXp, leveledUp, oldLevel, newLevel, passed };
  }

  private generateDailyChallenges(date: string) {
    const challengePool = [
      { id: "complete_lessons_2", type: "lessons", title: "Lesson Hunter", description: "Complete 2 lessons today", target: 2, reward: 50, emoji: "📚" },
      { id: "complete_lessons_3", type: "lessons", title: "Knowledge Seeker", description: "Complete 3 lessons today", target: 3, reward: 80, emoji: "🎓" },
      { id: "earn_xp_50", type: "xp", title: "XP Sprint", description: "Earn 50 XP today", target: 50, reward: 30, emoji: "⚡" },
      { id: "earn_xp_100", type: "xp", title: "XP Marathon", description: "Earn 100 XP today", target: 100, reward: 60, emoji: "🚀" },
      { id: "pass_quiz_2", type: "quizzes", title: "Quiz Master", description: "Pass 2 quizzes today", target: 2, reward: 40, emoji: "🧠" },
      { id: "pass_quiz_1", type: "quizzes", title: "Quick Win", description: "Pass 1 quiz today", target: 1, reward: 20, emoji: "✅" },
    ];
    // Pick 3 deterministic-ish based on date
    const seed = date.split("-").reduce((a, p) => a + parseInt(p, 10), 0);
    const shuffled = [...challengePool].sort((a, b) => ((seed * (a.id.length + 1)) % 7) - ((seed * (b.id.length + 1)) % 7));
    const picks = shuffled.slice(0, 3);
    return picks.map(p => ({ ...p, progress: 0, claimed: false }));
  }

  async getStudentLessonAssignments(userId: string): Promise<any[]> {
    const studentClasses = await this.getClassesByStudent(userId);
    if (studentClasses.length === 0) return [];
    const classIds = studentClasses.map(c => c.id);
    const all = await db.select().from(assignments)
      .where(and(
        eq(assignments.type, "lesson"),
        inArray(assignments.classId, classIds),
      ))
      .orderBy(desc(assignments.createdAt));
    // Get lesson + completion status for each
    const out: any[] = [];
    const userProgress = await this.getLessonProgress(userId);
    for (const a of all) {
      let lesson: any = null;
      if (a.lessonId) {
        lesson = await this.getLessonById(a.lessonId);
      }
      const completed = a.lessonId
        ? userProgress.some(p => p.lessonId === a.lessonId && p.completed)
        : false;
      out.push({ ...a, lesson, completed });
    }
    return out;
  }

  async getDailyChallenges(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const today = new Date().toISOString().split("T")[0];
    const stored = (user.dailyChallengesData as any) || null;
    if (!stored || stored.date !== today) {
      const challenges = this.generateDailyChallenges(today);
      const data = { date: today, challenges };
      await db.update(users).set({ dailyChallengesData: data }).where(eq(users.id, userId));
      return data;
    }
    return stored;
  }

  async updateChallengeProgress(userId: string, type: string, increment: number): Promise<void> {
    const data = await this.getDailyChallenges(userId);
    let changed = false;
    for (const c of data.challenges) {
      if (c.type === type && !c.claimed && c.progress < c.target) {
        c.progress = Math.min(c.target, c.progress + increment);
        changed = true;
      }
    }
    if (changed) {
      await db.update(users).set({ dailyChallengesData: data }).where(eq(users.id, userId));
    }
  }

  async claimChallenge(userId: string, challengeId: string) {
    const data = await this.getDailyChallenges(userId);
    const challenge = data.challenges.find((c: any) => c.id === challengeId);
    if (!challenge) return { success: false, xpAwarded: 0, tokensAwarded: 0, message: "Challenge not found" };
    if (challenge.claimed) return { success: false, xpAwarded: 0, tokensAwarded: 0, message: "Already claimed" };
    if (challenge.progress < challenge.target) return { success: false, xpAwarded: 0, tokensAwarded: 0, message: "Not yet completed" };

    challenge.claimed = true;
    const xpReward = challenge.reward;
    const tokenReward = Math.floor(challenge.reward / 5);

    await db.update(users).set({
      dailyChallengesData: data,
      xp: sql`${users.xp} + ${xpReward}`,
      classroomTokens: sql`${users.classroomTokens} + ${tokenReward}`,
    }).where(eq(users.id, userId));

    return { success: true, xpAwarded: xpReward, tokensAwarded: tokenReward, message: `Got ${xpReward} XP!` };
  }

  async getLearningStats(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const totalLessonsCount = await this.getLessonsCount();
    const progress = await this.getLessonProgress(userId);
    const completed = progress.filter(p => p.completed).length;
    const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.completedAt));

    let totalCorrect = 0;
    let totalQ = 0;
    for (const a of attempts) { totalCorrect += a.score; totalQ += a.total; }
    const avgAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    const recent = attempts.slice(0, 5);
    const older = attempts.slice(5, 15);
    const recentAcc = recent.length > 0 ? Math.round((recent.reduce((s, a) => s + a.score, 0) / recent.reduce((s, a) => s + a.total, 0)) * 100) : 0;
    const olderAcc = older.length > 0 ? Math.round((older.reduce((s, a) => s + a.score, 0) / older.reduce((s, a) => s + a.total, 0)) * 100) : 0;
    const improvedBy = olderAcc > 0 ? recentAcc - olderAcc : 0;

    return {
      totalLessons: totalLessonsCount,
      completedLessons: completed,
      totalQuizAttempts: attempts.length,
      avgAccuracy,
      bestStreak: user.lessonStreakBest ?? 0,
      currentStreak: user.lessonStreak ?? 0,
      bestCombo: user.comboBest ?? 0,
      recentAccuracy: recentAcc,
      improvedBy,
    };
  }

  async getLuckyBonusStatus(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const today = new Date().toISOString().split("T")[0];
    const available = user.luckyBonusClaimedAt !== today;
    return { available, nextAvailable: available ? null : new Date(Date.now() + 86400000).toISOString().split("T")[0] };
  }

  // ─── Trading Leagues ───────────────────────────────────────────────────────

  async ensureLeagueStats(userId: string): Promise<PlayerLeagueStat> {
    const existing = await db.select().from(playerLeagueStats).where(eq(playerLeagueStats.userId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [row] = await db.insert(playerLeagueStats).values({ userId }).returning();
    return row;
  }

  async getLeagueStats(userId: string): Promise<PlayerLeagueStat | undefined> {
    const [row] = await db.select().from(playerLeagueStats).where(eq(playerLeagueStats.userId, userId)).limit(1);
    return row;
  }

  async awardLP(userId: string, amount: number): Promise<PlayerLeagueStat> {
    await this.ensureLeagueStats(userId);
    const delta = Math.round(amount);
    const [updated] = await db.update(playerLeagueStats).set({
      lp: sql`GREATEST(0, ${playerLeagueStats.lp} + ${delta})`,
      weeklyLp: sql`GREATEST(0, ${playerLeagueStats.weeklyLp} + ${delta})`,
      seasonLp: sql`GREATEST(0, ${playerLeagueStats.seasonLp} + ${delta})`,
      peakLp: sql`GREATEST(${playerLeagueStats.peakLp}, ${playerLeagueStats.lp} + ${delta})`,
      updatedAt: new Date(),
    }).where(eq(playerLeagueStats.userId, userId)).returning();

    // Sync hedge fund contribution
    const membership = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.userId, userId)).limit(1);
    if (membership[0] && delta > 0) {
      await db.update(hedgeFundMembers).set({ weeklyLpContrib: sql`${hedgeFundMembers.weeklyLpContrib} + ${delta}` }).where(eq(hedgeFundMembers.userId, userId));
      await db.update(hedgeFunds).set({
        weeklyLpTotal: sql`${hedgeFunds.weeklyLpTotal} + ${delta}`,
        allTimeLpTotal: sql`${hedgeFunds.allTimeLpTotal} + ${delta}`,
      }).where(eq(hedgeFunds.id, membership[0].fundId));
    }

    // Sync rival weekly LP
    if (delta > 0) {
      const stats = updated;
      if (stats.rivalId) {
        // weekly rivalry tracked by comparing weeklyLp each week — no extra table needed
      }
    }

    return updated;
  }

  async getLeagueLeaderboard(limit = 50) {
    const rows = await db.select({
      userId: playerLeagueStats.userId,
      lp: playerLeagueStats.lp,
      weeklyLp: playerLeagueStats.weeklyLp,
      seasonLp: playerLeagueStats.seasonLp,
      peakLp: playerLeagueStats.peakLp,
      rivalId: playerLeagueStats.rivalId,
      rivalWins: playerLeagueStats.rivalWins,
      rivalLosses: playerLeagueStats.rivalLosses,
      showdownWins: playerLeagueStats.showdownWins,
      showdownLosses: playerLeagueStats.showdownLosses,
      weeklyResetAt: playerLeagueStats.weeklyResetAt,
      updatedAt: playerLeagueStats.updatedAt,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      equippedTitle: users.equippedTitle,
      username: users.username,
    }).from(playerLeagueStats)
      .innerJoin(users, eq(playerLeagueStats.userId, users.id))
      .orderBy(desc(playerLeagueStats.lp))
      .limit(limit);
    return rows;
  }

  async getSeasonLeaderboard(limit = 50) {
    const rows = await db.select({
      userId: playerLeagueStats.userId,
      lp: playerLeagueStats.lp,
      weeklyLp: playerLeagueStats.weeklyLp,
      seasonLp: playerLeagueStats.seasonLp,
      peakLp: playerLeagueStats.peakLp,
      rivalId: playerLeagueStats.rivalId,
      rivalWins: playerLeagueStats.rivalWins,
      rivalLosses: playerLeagueStats.rivalLosses,
      showdownWins: playerLeagueStats.showdownWins,
      showdownLosses: playerLeagueStats.showdownLosses,
      weeklyResetAt: playerLeagueStats.weeklyResetAt,
      updatedAt: playerLeagueStats.updatedAt,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      username: users.username,
    }).from(playerLeagueStats)
      .innerJoin(users, eq(playerLeagueStats.userId, users.id))
      .orderBy(desc(playerLeagueStats.seasonLp))
      .limit(limit);
    return rows;
  }

  async matchRival(userId: string): Promise<string | null> {
    const myStats = await this.ensureLeagueStats(userId);
    // Find closest LP player who is not already my rival and not me
    const candidates = await db.select({
      userId: playerLeagueStats.userId,
      lp: playerLeagueStats.lp,
    }).from(playerLeagueStats)
      .where(and(ne(playerLeagueStats.userId, userId)))
      .orderBy(desc(playerLeagueStats.lp))
      .limit(100);

    if (candidates.length === 0) return null;

    // Find closest LP
    const sorted = candidates.sort((a, b) => Math.abs(a.lp - myStats.lp) - Math.abs(b.lp - myStats.lp));
    const rival = sorted[0];
    if (!rival) return null;

    await db.update(playerLeagueStats).set({ rivalId: rival.userId }).where(eq(playerLeagueStats.userId, userId));
    return rival.userId;
  }

  async createShowdown(challengerId: string, challengeeId: string, timeframe: string): Promise<Showdown> {
    const [challengerStats] = await Promise.all([this.ensureLeagueStats(challengerId), this.ensureLeagueStats(challengeeId)]);
    const challengeeStatsRow = await this.getLeagueStats(challengeeId);
    const now = new Date();
    const durationMs = timeframe === "1h" ? 3600000 : timeframe === "1d" ? 86400000 : 604800000;
    const [row] = await db.insert(showdowns).values({
      challengerId,
      challengeeId,
      timeframe,
      status: "pending",
      challengerLpStart: challengerStats.lp,
      challengeeLpStart: challengeeStatsRow?.lp ?? 0,
      startedAt: now,
      endsAt: new Date(now.getTime() + durationMs),
    }).returning();
    return row;
  }

  async getShowdowns(userId: string): Promise<Showdown[]> {
    return db.select().from(showdowns)
      .where(or(eq(showdowns.challengerId, userId), eq(showdowns.challengeeId, userId)))
      .orderBy(desc(showdowns.createdAt))
      .limit(20);
  }

  async acceptShowdown(showdownId: string, userId: string): Promise<Showdown> {
    const [row] = await db.update(showdowns).set({ status: "active", startedAt: new Date() })
      .where(and(eq(showdowns.id, showdownId), eq(showdowns.challengeeId, userId))).returning();
    return row;
  }

  async declineShowdown(showdownId: string, userId: string): Promise<Showdown> {
    const [row] = await db.update(showdowns).set({ status: "declined" })
      .where(and(eq(showdowns.id, showdownId), eq(showdowns.challengeeId, userId))).returning();
    return row;
  }

  async resolveShowdown(showdownId: string): Promise<Showdown> {
    const [sd] = await db.select().from(showdowns).where(eq(showdowns.id, showdownId)).limit(1);
    if (!sd || sd.status === "completed") return sd;

    const [cStats, eeStats] = await Promise.all([
      this.getLeagueStats(sd.challengerId),
      this.getLeagueStats(sd.challengeeId),
    ]);

    const cGained = (cStats?.lp ?? sd.challengerLpStart!) - sd.challengerLpStart!;
    const eeGained = (eeStats?.lp ?? sd.challengeeLpStart!) - sd.challengeeLpStart!;
    const winnerId = cGained >= eeGained ? sd.challengerId : sd.challengeeId;
    const loserId = winnerId === sd.challengerId ? sd.challengeeId : sd.challengerId;

    // Award LP bonus to winner
    await this.awardLP(winnerId, 100);
    await db.update(playerLeagueStats).set({ showdownWins: sql`${playerLeagueStats.showdownWins} + 1` }).where(eq(playerLeagueStats.userId, winnerId));
    await db.update(playerLeagueStats).set({ showdownLosses: sql`${playerLeagueStats.showdownLosses} + 1` }).where(eq(playerLeagueStats.userId, loserId));

    const [updated] = await db.update(showdowns).set({
      status: "completed",
      winnerUserId: winnerId,
      challengerLpGained: cGained,
      challengeeLpGained: eeGained,
    }).where(eq(showdowns.id, showdownId)).returning();
    return updated;
  }

  async createHedgeFund(ownerId: string, name: string, description: string, emoji: string): Promise<HedgeFund> {
    // Check user doesn't already have a fund
    const existing = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.userId, ownerId)).limit(1);
    if (existing[0]) throw new Error("Already a member of a hedge fund. Leave first.");
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [fund] = await db.insert(hedgeFunds).values({ name, description, ownerId, joinCode, logoEmoji: emoji || "🏦" }).returning();
    await db.insert(hedgeFundMembers).values({ userId: ownerId, fundId: fund.id, role: "owner" });
    return fund;
  }

  async joinHedgeFund(userId: string, joinCode: string): Promise<HedgeFund> {
    const existing = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.userId, userId)).limit(1);
    if (existing[0]) throw new Error("Already in a hedge fund. Leave first.");
    const [fund] = await db.select().from(hedgeFunds).where(eq(hedgeFunds.joinCode, joinCode.toUpperCase())).limit(1);
    if (!fund) throw new Error("Invalid join code.");
    const members = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.fundId, fund.id));
    if (members.length >= 20) throw new Error("Hedge fund is full (max 20 members).");
    await db.insert(hedgeFundMembers).values({ userId, fundId: fund.id, role: "member" });
    return fund;
  }

  async leaveHedgeFund(userId: string): Promise<void> {
    const [membership] = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.userId, userId)).limit(1);
    if (!membership) return;
    await db.delete(hedgeFundMembers).where(eq(hedgeFundMembers.userId, userId));
    // If owner left, transfer ownership or dissolve
    const remaining = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.fundId, membership.fundId));
    if (remaining.length === 0) {
      await db.delete(hedgeFunds).where(eq(hedgeFunds.id, membership.fundId));
    } else if (membership.role === "owner") {
      await db.update(hedgeFundMembers).set({ role: "owner" }).where(eq(hedgeFundMembers.userId, remaining[0].userId));
      await db.update(hedgeFunds).set({ ownerId: remaining[0].userId }).where(eq(hedgeFunds.id, membership.fundId));
    }
  }

  async getUserHedgeFund(userId: string) {
    const [membership] = await db.select().from(hedgeFundMembers).where(eq(hedgeFundMembers.userId, userId)).limit(1);
    if (!membership) return null;
    const [fund] = await db.select().from(hedgeFunds).where(eq(hedgeFunds.id, membership.fundId)).limit(1);
    if (!fund) return null;
    const allMembers = await db.select({
      userId: hedgeFundMembers.userId,
      role: hedgeFundMembers.role,
      weeklyLpContrib: hedgeFundMembers.weeklyLpContrib,
      displayName: users.displayName,
    }).from(hedgeFundMembers)
      .innerJoin(users, eq(hedgeFundMembers.userId, users.id))
      .where(eq(hedgeFundMembers.fundId, fund.id));

    const memberIds = allMembers.map(m => m.userId);
    const statsRows = memberIds.length > 0
      ? await db.select({ userId: playerLeagueStats.userId, lp: playerLeagueStats.lp }).from(playerLeagueStats).where(sql`${playerLeagueStats.userId} = ANY(${memberIds})`)
      : [];
    const statsMap = Object.fromEntries(statsRows.map(s => [s.userId, s.lp]));

    return {
      fund,
      members: allMembers.map(m => ({ ...m, lp: statsMap[m.userId] ?? 0 })),
    };
  }

  async getHedgeFundLeaderboard() {
    const funds = await db.select().from(hedgeFunds).orderBy(desc(hedgeFunds.allTimeLpTotal)).limit(20);
    const counts = await Promise.all(funds.map(f =>
      db.select({ count: sql<number>`count(*)` }).from(hedgeFundMembers).where(eq(hedgeFundMembers.fundId, f.id))
    ));
    return funds.map((f, i) => ({ ...f, memberCount: Number(counts[i][0]?.count ?? 0) }));
  }

  async getCurrentSeason(): Promise<LeagueSeason | null> {
    const [row] = await db.select().from(leagueSeasons).where(eq(leagueSeasons.isActive, true)).limit(1);
    return row ?? null;
  }

  async ensureCurrentSeason(): Promise<LeagueSeason> {
    const existing = await this.getCurrentSeason();
    if (existing) return existing;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const seasons = await db.select().from(leagueSeasons).orderBy(desc(leagueSeasons.number)).limit(1);
    const nextNum = (seasons[0]?.number ?? 0) + 1;
    const [row] = await db.insert(leagueSeasons).values({ number: nextNum, startDate: now, endDate: end, isActive: true }).returning();
    return row;
  }

  async getWeeklyChallengeCompletions(userId: string): Promise<ChallengeCompletion[]> {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    return db.select().from(challengeCompletions)
      .where(and(eq(challengeCompletions.userId, userId), sql`${challengeCompletions.completedAt} >= ${weekStart}`));
  }

  async completeLeagueChallenge(userId: string, challengeKey: string, lpReward: number): Promise<void> {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const fullKey = `${weekStart.toISOString().split("T")[0]}_${challengeKey}`;
    const existing = await db.select().from(challengeCompletions)
      .where(and(eq(challengeCompletions.userId, userId), eq(challengeCompletions.challengeKey, fullKey))).limit(1);
    if (existing[0]) return; // already claimed this week
    await db.insert(challengeCompletions).values({ userId, challengeKey: fullKey, lpAwarded: lpReward });
    await this.awardLP(userId, lpReward);
  }

  async claimLuckyBonus(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    const today = new Date().toISOString().split("T")[0];
    if (user.luckyBonusClaimedAt === today) {
      return { success: false, xpAwarded: 0, tokensAwarded: 0, rewardEmoji: "⏰", rewardName: "Already Claimed", message: "Come back tomorrow!" };
    }

    const rewards = [
      { weight: 40, xp: 25, tokens: 5, emoji: "✨", name: "Sparkle Bonus" },
      { weight: 25, xp: 50, tokens: 10, emoji: "💫", name: "Star Bonus" },
      { weight: 15, xp: 75, tokens: 15, emoji: "🌟", name: "Bright Bonus" },
      { weight: 10, xp: 100, tokens: 25, emoji: "💎", name: "Gem Bonus" },
      { weight: 7, xp: 150, tokens: 40, emoji: "🏆", name: "Trophy Bonus" },
      { weight: 3, xp: 250, tokens: 75, emoji: "👑", name: "Royal Bonus" },
    ];
    const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = rewards[0];
    for (const reward of rewards) {
      if (r < reward.weight) { chosen = reward; break; }
      r -= reward.weight;
    }

    await db.update(users).set({
      xp: sql`${users.xp} + ${chosen.xp}`,
      classroomTokens: sql`${users.classroomTokens} + ${chosen.tokens}`,
      luckyBonusClaimedAt: today,
    }).where(eq(users.id, userId));

    return { success: true, xpAwarded: chosen.xp, tokensAwarded: chosen.tokens, rewardEmoji: chosen.emoji, rewardName: chosen.name, message: `${chosen.emoji} ${chosen.name}! +${chosen.xp} XP, +${chosen.tokens} tokens` };
  }
}

export const storage = new DatabaseStorage();
