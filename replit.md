# 12Digits Trading Education Platform

## Overview

12Digits is a professional trading education platform that provides real-time market simulation, structured lessons, and comprehensive tools for learning to trade. The platform targets three membership tiers: School (for educators/students), Casual (individual learners), and 12Digits+ (premium features). 

**Casual Tier Features** (Free):
- Lessons, Simulator, Dashboard, Leaderboard, Achievements
- Watchlist - Track favorite stocks with price monitoring
- Trading Tips - Daily tips and market insights

**All Logged-In Features** (all tiers):
- Strategies - Strategy library (no paywall, accessible to all users)
- Risk Calculator - Accessible from main navbar for all users

**Premium Features** (12Digits+ or Trial Users):
- Command Center (Terminal), Analytics
- Trade Journal, News Feed, Economic Calendar
- Friends System - Connect with other traders, send/accept friend requests

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Charts**: Recharts for performance graphs, lightweight-charts for candlestick trading charts

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy, session-based auth using express-session with memory store
- **API Design**: RESTful endpoints under `/api` prefix
- **Build Process**: Custom esbuild script that bundles server code, Vite builds client

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema management (`drizzle-kit push`)
- **Key Tables**: users, lessons, lessonProgress, trades, portfolioItems, assignments, strategies

### Authentication & Authorization
- **Method**: Session-based authentication with Passport.js LocalStrategy
- **Password Hashing**: bcryptjs
- **Session Storage**: In-memory store (memorystore package)
- **Role System**: Three roles - student, teacher, admin
- **Default Admin**: Hardcoded admin user created on startup (admin@12digits.com / 12digits!)
- **Trial Access**: 14-day trial is available to new teacher/casual/premium users only. Students (role=student) do NOT receive a trial — they must be enrolled in a class by a teacher to gain access.

### Simulated Stock Prices
- Prices stored in-memory in `storage.ts` (`simulatedPrices: Record<string,number>`)
- Default seed prices set on startup: AAPL ($185.50), MSFT ($415.20), BTC ($43,250), etc.
- Updated via `POST /api/simulated-prices/update`; retrieved via `GET /api/simulated-prices`

### Simulator Chart
- Uses lightweight-charts (TradingView library) for candlestick charts
- Text color explicitly set based on dark/light mode detection (`document.documentElement.classList.contains('dark')`) to ensure timestamp visibility in both modes

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route page components
│   ├── lib/             # Utilities, auth context, query client
│   └── hooks/           # Custom React hooks
├── server/              # Express backend
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database operations layer
│   ├── paypal.ts        # Payment integration
│   └── db.ts            # Database connection
├── shared/              # Shared code between client/server
│   └── schema.ts        # Drizzle schema definitions
└── migrations/          # Database migrations
```

## School System (School World)

The School System is a completely separate, immersive visual environment at `/school/*` routes. It has its own layout (`client/src/layouts/school-layout.tsx`) with distinct sidebar, branding, and CSS theme (`school-world` class in `index.css`). The main navbar shows a "School World" button for users with `membershipTier === "school"`. School pages skip the main Navbar entirely (handled in `AppContent` in `App.tsx`).

### Routes
- `/school` — Hub/entry page (`pages/school/hub.tsx`)
- `/school/student` — Age-adapted student dashboard (`pages/school/student-dashboard.tsx`)
- `/school/teacher` — Teacher Command Centre (`pages/school/teacher-dashboard.tsx`)
- `/school/fun-zone` — Age-adapted Fun Zone with mini-games (`pages/school/fun-zone.tsx`)
- `/school/simulator` — School-themed trading simulator with 5 chart themes & 3 layouts (`pages/school/simulator.tsx`)
- `/school/leaderboard` — Class-scoped + global leaderboard with medals (`pages/school/leaderboard.tsx`)
- `/school/lessons` — School-themed lesson grid with progress bars (`pages/school/lessons.tsx`)
- `/school/chat` — Per-class group chat; teachers can post announcements (`pages/school/chat.tsx`)

### Age Groups (defined in `shared/schema.ts`)
- `primary` (ages 6–10): Colorful, large emojis, coin animations, simple words
- `intermediate` (ages 11–13): Badges, progress bars, portfolio basics
- `high_school` (ages 14–18): Full interface — charts, trades, complex assignments

### School Features
- **Join Code Enrollment**: `POST /api/classroom/join` with `{ joinCode }` — students enter teacher-given code to join class. Register page shows join code step after signup. Hub shows join code prompt for students with no class.
- **Classroom Tokens**: Stored as `classroomTokens` on users table; awarded by Fun Zone games
- **Token Shop**: Fun Zone has a shop tab where students spend tokens on cosmetics (titles/frames). New columns: `purchasedCosmetics` (JSON array), `equippedTitle`, `equippedFrame`. Routes: POST `/api/school/shop/purchase`, POST `/api/school/shop/equip`. Equipped titles and frames appear in the school leaderboard.
- **Market Events**: Teachers post boom/crash/news/tip events to classes
- **Assignments**: profit_target, lesson_completion, portfolio_balance types with student progress tracking
- **Class Group Chat**: `classGroupMessages` table (classId, senderId, content, messageType). `GET/POST /api/classroom/chat`. Teacher can post announcements (pinned card styling). Polls every 3s.
- **Class Leaderboard**: Rankings scoped to class via `/api/leaderboard?scope=class`
- **Fun Zone Games**: Age-adapted mini-games (Coin Rain, Piggy Bank Builder, Stock Guesser, Budget Boss, Finance Quiz, Market Prediction, Investment Quiz, Strategy Challenge, Word Scramble, Market Memory). Token rewards rebalanced: Primary 2–8, Intermediate 3–14, HS 5–20.
- **Daily Reward & Login Streak**: `loginStreak`, `lastLoginDate`, `dailyRewardClaimedAt` on users table. `POST /api/fun-zone/daily-claim` returns `{ success, tokens, streak }`. Base 5 tokens + 2 per streak day capped at day 6 (max 17).
- **Mystery Blind Bags**: Starter (15 tokens), Crypto (30), Legend (50). `POST /api/shop/open-bag`. Returns random collectible from `user_inventory` table with rarity tiers (common/rare/epic/legendary). Reveal modal shown on open.
- **Power-Ups**: 3 types stored in `user_inventory`. `POST /api/shop/buy-item`.
- **Inventory Tab**: Collection grid showing owned collectibles and power-ups by rarity.
- **Trade Tab**: Send/accept/reject/cancel trade offers between classmates via `trade_offers` table. `GET /api/trades`, `POST /api/trades`, `POST /api/trades/:id/respond`.
- **Token Leaderboard**: `GET /api/fun-zone/token-leaderboard`. Added as a 4th tab ("Tokens") on the global `/leaderboard` page.
- **Spin / Roulette** (`view === "spin"`): 3 tiers — Basic (5t), Premium (15t), Elite (35t) — with animated SVG spin wheel. Tier-weighted random outcomes (tokens, common/rare/epic/legendary collectibles). `POST /api/fun-zone/spin`. History saved to `spin_history` table. SpinResultModal reveals reward after wheel settles.
- **Student Marketplace** (`view === "market"`): Classmates list tradable collectibles at custom prices (max 200t). Instant secure token transfer. `GET /api/marketplace`, `POST /api/marketplace`, `POST /api/marketplace/:id/buy`, `DELETE /api/marketplace/:id`. `student_marketplace_listings` table (status: active/sold/cancelled). Items marked `tradable=false` while listed; restored on cancel. Cannot buy own listings.
- **Daily Deals**: Shop tab now has a "Daily Deals" section — 5 date-seeded discounted items (20–40% off) with live countdown to midnight reset. `GET /api/fun-zone/daily-deals`. Works with existing purchase/open-bag/buy-item endpoints.
- **Cinematic Blind Bag Reveal**: Multi-phase `BagRevealModal` — shake (900ms) → burst particles (500ms) → item reveal with glow + star-pop animation (600ms) → done.
- **Random Game Drops**: 15% chance on `handleEarnTokens` to toast a random bonus item drop notification.
- **Simulator → Token Conversion Panel**: Info panel in Games tab explains $100 simulated profit = 1 token with example rate table.
- **Token Bug Fix**: `/api/fun-zone/score` now awards tokens before saving score, so missing game/score fields don't prevent token credit. `awardTokensMutation` calls `refreshUser()` on success.
- **Chat System Full Overhaul** (`client/src/pages/school/chat.tsx`): Three tabs — "Class Chat", "Groups", "DMs". Complete redesign with all social features.
  - **Edit/Delete**: Three-dot menu (⋯) on hover with Reply/Edit/Pin/Delete options in a clean dropdown. No more absolute-positioned buttons.
  - **Private DMs**: Full direct messaging between classmates. List of conversations with online status, unread badges, last message preview. DM thread with edit/delete own messages, reply/quoting.
  - **Message Reactions**: Six preset emoji reactions (👍❤️😂😮😢🔥) on hover → emoji picker appears → click to toggle. Reaction counts shown as chips below message bubble.
  - **Reply/Quoting**: Click Reply in the context menu to quote a specific message. Quoted message shows above the new message in the input area and in the sent bubble.
  - **Pinned Messages**: Teacher can pin messages via the context menu. Pinned banner at top of class chat shows latest pinned message.
  - **Online/Offline Status**: Green/grey dot on user avatars. `lastSeenAt` updated every 60s. Users active in last 5 min show as online.
  - **Typing Indicators**: In-memory per-chatId typing map on server. User typing event fires on keypress. "X is typing..." with animated dots shown in class chat.
- **New DB Tables**: `class_message_reactions` (messageId, userId, emoji), `class_direct_messages` (classId, senderId, receiverId, content, replyToId, isRead). Added `replyToId` + `isPinned` to `class_group_messages`. Added `replyToId` to `class_group_chat_messages`. Added `lastSeenAt` to `users`.
- **New API Routes**: `POST/GET /api/classroom/chat/:id/pin`, `GET /api/classroom/chat/pinned`, `POST/DELETE /api/classroom/chat/:id/react`, `GET /api/classroom/chat/reactions`, `POST/DELETE /api/group-chats/:id/messages/:msgId/react`, `GET /api/dms/conversations`, `GET /api/dms/unread`, `GET/POST /api/dms/:userId`, `PUT/DELETE /api/dms/:userId/:msgId`, `POST /api/classroom/ping`, `POST/GET /api/classroom/typing`, `GET /api/classroom/online`.
- **Expanded Token Shop**: Added Stickers (10 items), Badges (6 items). Titles expanded to 14. Frames expanded to 8. Lower prices across the board. Shop items use `sw-shop-item` CSS class for hover animations.
- **School System CSS Animations**: New keyframes: `sw-slide-up`, `sw-pop-in`, `sw-glow-pulse`, `sw-streak-fire`, `sw-badge-spin`, `sw-shimmer-fast`, `sw-number-pop`, `sw-rainbow-border`. Helper classes: `sw-game-card` (hover lift), `sw-shop-item` (hover scale), `sw-stagger` (staggered children entry).
- **Simulator Settings**: Persisted to `localStorage["school-sim-settings"]` — theme (default/neon/ocean/sunset/matrix), layout (standard/compact/wide), showGrid, showVolume
- **School World Economy**: Full virtual classroom economy. Tables: `economySettings`, `economyBalances`, `economyTransactions`, `economySavings`, `economyJobs`, `economyExpenses`, `economyAuctions`, `economyAuctionBids`, `economyStoreItems`, `economyPurchases`, `economyChallenges`, `classroomAssets`, `studentAssets`.
  - Students: earn coins from lessons (50), quizzes (25 if ≥60%), assignments (100); manage savings with interest; bid in auctions; buy from store; purchase assets (property/business/investment) that add to net worth and generate passive income; view net worth breakdown and class leaderboard.
  - Teachers (via EconomyTab in teacher dashboard): create/delete jobs, expenses, auctions, store items, assets, challenges; trigger economy events (bonus/fine/fine-percent/interest); award coins to students; process asset income; configure currency name/symbol/rewards.
  - Simulator profits auto-convert to economy coins via `/api/economy/convert-profit` (configurable rate in economy settings).
  - Net worth = cash + savings + simulator balance + asset portfolio value - outstanding loan balances. Simulator balance shown separately in net worth breakdown as USD ($).
  - **Loans**: Teachers issue loans (`POST /api/economy/loans`) to students with configurable amount, interest rate %, and due date. Students repay via `/api/economy/loans/:id/repay`. Teachers trigger interest accrual via `/api/economy/loans/apply-interest`. Outstanding loans appear in student wallet tab and reduce net worth. Paid-off loans shown in history. `economy_loans` table: id, classId, studentId, principal, balance, interestRate, isActive, dueDate.
  - API prefix: `/api/economy/*`. Routes include assets, my-assets, net-worth, net-worth-leaderboard, process-asset-income.
  - Student economy page: `/school/economy` (5 tabs: Wallet, Assets, Auctions, Store, Rankings).

## Casual Plan Features

Users with `membershipTier === "casual"` get distinct features:
- **Portfolio Analysis** at `/casual/portfolio` (`pages/casual-portfolio-analysis.tsx`) — P&L history, sector breakdown, risk metrics (win rate, risk/reward, expectancy, profit factor, max drawdown), cumulative P&L sparkline
- **Friends** — prominently shown in navbar for casual users
- **`casual-world` CSS class** — applied to the root div in AppContent for casual users; defines `--casual-accent` CSS variable
- Navbar: Friends and Portfolio buttons highlighted in purple for casual users (both desktop and mobile/dropdown)

## External Dependencies

### Payment Processing
- **PayPal Server SDK**: Handles subscription payments for membership tiers
- **Configuration**: Requires `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` environment variables
- **Mode**: Sandbox in development, Production when `NODE_ENV=production`

### Database
- **PostgreSQL**: Primary database
- **Connection**: Via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with node-postgres driver

### Object Storage (S3-Compatible)
- **Purpose**: User avatar uploads and file storage
- **Configuration**: Works with AWS S3, Cloudflare R2, DigitalOcean Spaces, or any S3-compatible service
- **Required Environment Variables**:
  - `S3_BUCKET` - Bucket name
  - `S3_REGION` - AWS region (default: us-east-1)
  - `S3_ACCESS_KEY_ID` - Access key
  - `S3_SECRET_ACCESS_KEY` - Secret key
  - `S3_ENDPOINT` - (Optional) Custom endpoint for non-AWS S3 services

### Stock Market Data
- **Finnhub API**: Real-time stock quotes and market data
- **Configuration**: Requires `FINNHUB_API_KEY` environment variable

### Firebase Authentication (Optional)
- **Purpose**: Google sign-in authentication
- **Required Environment Variables**:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_APP_ID`

### Third-Party UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **Recharts**: Data visualization for dashboard performance tracking
- **lightweight-charts**: TradingView-style candlestick charts for simulator
- **react-hook-form**: Form handling with Zod validation
- **date-fns**: Date formatting utilities

### Development Tools
- **Replit Plugins**: vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner
- **Google Fonts**: Inter, DM Sans, Space Grotesk, Geist Mono for typography

## Academy Gamification (April 2026)

The Academy (`/lessons`) and School Worlds Academy (`/school/lessons`) share a common gamification layer:

### Backend
- New user fields in `shared/schema.ts`: `lessonStreak`, `lessonStreakBest`, `lastLessonDate`, `streakFreezes` (default 2), `comboBest`, `dailyChallengesData` (jsonb), `luckyBonusClaimedAt`.
- XP curve: `floor(50 * (level-1)^1.6)`, levels 1–100, with rank titles (Beginner → Apprentice → Trader → Expert → Master → Legend).
- New storage methods (in `server/storage.ts`):
  - `completeLessonAndAward` — awards base XP scaled by difficulty (15/20/30), 20% surprise bonus, streak update with freeze logic, milestone bonuses at days 3/7/14/30/60/100.
  - `awardQuizXp` — applies combo multiplier (3×=1.5, 5×=2, 7×=2.5, 10×=3) and time bonus.
  - `getDailyChallenges` / `claimChallenge` — 3 daily challenges (deterministic per date) from a 6-pool, awarding XP + tokens.
  - `getLearningStats` — aggregate stats card (accuracy, recent improvement, best combo, streak).
  - `claimLuckyBonus` / `getLuckyBonusStatus` — once-per-day weighted random reward.
- New routes:
  - Updated `POST /api/lessons/:id/complete` returns full reward result.
  - Updated `POST /api/lessons/:id/quiz/attempt` accepts `comboMultiplier`, `timeBonus`, `bestCombo`.
  - `GET/POST /api/academy/daily-challenges`, `/api/academy/lucky-bonus`, `GET /api/academy/stats`.

### Frontend
- New components in `client/src/components/`:
  - `xp-progress-header` — level + XP progress bar with rank title.
  - `streak-badge` — daily streak with flame, freezes count.
  - `daily-challenges-card` — 3 daily challenges with claim buttons + confetti.
  - `lucky-bonus-card` — daily spinning reward.
  - `learning-stats-card` — accuracy, best combo, best streak.
  - `lesson-completion-modal` — confetti + level up + streak celebration.
  - `enhanced-quiz` — combo system, optional 15s timed mode, instant feedback, fun messages, time bonus, hype messages on combo milestones.
- Confetti utility in `client/src/lib/confetti.ts` (canvas-based, no external dep).
- `client/src/lib/levels.ts` updated with new XP curve matching backend.
- All cards accept `variant="primary"` for kid-friendly amber styling on School Worlds (when `class.ageGroup === "primary"`).
- Wired into `client/src/pages/lessons.tsx`, `client/src/pages/school/lessons.tsx`, and `client/src/pages/lesson-detail.tsx`.

### Phase 2 (April 2026)

**Bug fixes**: Gamification mutations (lesson complete, quiz attempt, daily-challenge claim, lucky-bonus claim) now also call `refreshUser()` from `auth-context` so the React state actually picks up new XP/streak/freeze values. Previously only the React Query cache was invalidated, but the auth-context state held the stale snapshot, so cards like `StreakBadge` (which reads `user.lessonStreak` directly from auth) showed stale numbers.

**Quiz must be passed to complete a lesson**: In `lesson-detail.tsx`, the lesson now queries `/api/lessons/:id/quiz` to determine if a quiz exists and what the best attempt was. If a quiz exists and the user hasn't scored ≥60%, the "Mark Complete" button switches to "Take Quiz to Complete" (disabled-style), shows a toast, and scrolls to the quiz. When the quiz is passed, the quiz's `onPassed` callback automatically fires `markCompleteMutation` so the lesson is awarded right away.

**Teacher → Student lesson assignments**:
- Schema: added `lessonId` (nullable varchar) and `createdAt` to `assignments`. New type value `"lesson"` represents a per-lesson assignment.
- Storage: `getStudentLessonAssignments(userId)` returns all `type="lesson"` assignments across the student's classes, joined with the lesson and the user's lesson-completion status.
- Routes: `GET /api/academy/assignments` (student) returns the above. `GET /api/teacher/assignments/:id/progress` now returns one row per student in the assignment's class with `completed`/`completedAt`, inferring completion from `lessonProgress` for `type="lesson"`, so teachers can see who hasn't started.
- Teacher UI (`client/src/pages/school/teacher-dashboard.tsx`): Assignment dialog now offers a `Lesson` type with a lesson dropdown; auto-fills title/description from the chosen lesson. Each assignment card now shows class name, lesson title (when applicable), an overdue indicator, and a per-class progress bar (`X/Y done`).
- Student UI: New `client/src/components/assignments-panel.tsx`, mounted in both `/lessons` and `/school/lessons` next to the streak badge — shows incomplete assignments first (overdue first), with due dates and a clickable lesson link.