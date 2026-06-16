# 12Digits Trading Education Platform - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing from professional trading platforms like Sabio Trade, Robinhood, TradingView, and Webull to create a credible, sophisticated fintech education experience. The design must convey trust, professionalism, and data clarity while remaining accessible for students and educators.

## Core Design Principles

1. **Data-First Clarity**: Charts, numbers, and performance metrics take visual priority
2. **Professional Credibility**: Clean, sophisticated aesthetic that inspires confidence in financial education
3. **Functional Hierarchy**: Tools and actions are immediately accessible without visual clutter
4. **Tier Differentiation**: Subtle visual indicators distinguish membership levels without creating friction

---

## Typography System

**Primary Font**: Inter or DM Sans via Google Fonts (professional, excellent readability for data)
**Accent Font**: Space Grotesk or Manrope for headings (modern, technical feel)

**Scale**:
- Hero Headlines: text-5xl to text-6xl, font-bold
- Section Headers: text-3xl to text-4xl, font-semibold
- Card Titles: text-xl, font-semibold
- Body Text: text-base, font-normal
- Data/Numbers: text-2xl to text-4xl, font-bold (for simulator balances, stats)
- Labels/Metadata: text-sm, font-medium
- Fine Print: text-xs

**Hierarchy Notes**: Use font weight and size contrast aggressively. Financial data (balances, profits, losses) should be larger and bolder than surrounding text.

---

## Layout System

**Spacing Primitives**: Tailwind units of 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-20
- Card gaps: gap-6 to gap-8
- Tight spacing for data rows: gap-2 to gap-4

**Grid Strategy**:
- Landing page features: grid-cols-1 md:grid-cols-3
- Simulator layout: Split screen with 70/30 ratio (chart/controls)
- Dashboard: Two-column (md:grid-cols-2) for stats, single column for performance graph
- Admin panels: Sidebar navigation (w-64) + main content area
- Leaderboard: Single column with alternating row treatments

**Container Widths**:
- Landing page: max-w-7xl
- Application pages: max-w-full (utilize full viewport for data)
- Content modals: max-w-2xl

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed position with subtle shadow
- Logo left, main navigation center, user profile/balance right
- Height: h-16
- Active state: underline or pill-style background
- Mobile: Hamburger menu with slide-out drawer

**Sidebar Navigation** (Teacher Admin, Settings):
- Width: w-64 on desktop, collapsible
- Icon + label pattern
- Active state: subtle background fill with indicator bar

### Cards & Containers
**Standard Card**:
- Rounded corners: rounded-lg
- Shadow: shadow-md, hover:shadow-lg transition
- Padding: p-6

**Data Card** (Dashboard stats):
- Compact design with large numbers
- Icon or indicator at top
- Label below number
- Padding: p-4 to p-6

**Lesson Card**:
- Thumbnail/icon area (h-32 to h-40)
- Title, description, progress bar
- Call-to-action button
- Hover: subtle lift effect (translate-y)

### Forms & Inputs
**Input Fields**:
- Border: border-2, focus:border-accent
- Rounded: rounded-lg
- Padding: px-4 py-3
- Labels above inputs with text-sm font-semibold

**Buttons**:
- Primary CTA: Large (px-8 py-3), rounded-lg, font-semibold
- Secondary: Outlined variant
- Danger/Sell: Distinct treatment for trading actions
- Icon buttons: Square (h-10 w-10) with centered icon

**Trading Controls** (Simulator):
- Buy/Sell buttons: Full-width or split 50/50
- Amount input with increment/decrement controls
- Position cards showing open trades with close button

### Data Visualization
**Candlestick Chart** (Simulator):
- Full viewport height minus navigation and controls
- Zoomable, scrollable with gesture support
- Time period toggles (1m, 5m, 1h, 1d, 1w)
- Clean grid lines, minimal distractions

**Performance Graph** (Dashboard):
- Line or area chart
- Height: h-64 to h-80
- Interactive tooltips on hover
- Legend positioned top-right

**Progress Bars** (Lessons):
- Height: h-2
- Rounded-full
- Smooth fill animation

### Tables & Lists
**Leaderboard Table**:
- Sticky header row
- Alternating row backgrounds
- Top 3 entries with special treatment (medals/icons)
- Columns: Rank, User, Profit/Loss, Win Rate

**Investment List** (Dashboard):
- Each row: Symbol, Purchase Price, Current Price, Gain/Loss %, Action buttons
- Edit/Delete icons aligned right
- Divider lines between rows

### Modals & Overlays
**Payment Modal**:
- Centered, max-w-lg
- Plan details, pricing toggle (monthly/yearly)
- PayPal button integration
- Backdrop blur effect

**Lesson Completion Modal**:
- Celebratory design with progress stats
- Next lesson CTA
- Share achievement option

---

## Landing Page Structure

**Hero Section**:
- Full viewport height (min-h-screen)
- Large hero image: Professional trading desk setup, multiple monitors showing charts, modern office environment - conveys sophistication and credibility
- Headline overlay with blurred background for buttons
- Primary CTA: "Start Free Trial" + Secondary: "View Plans"
- Subheadline highlighting key value: "Master Trading with Real-Time Simulation"

**Membership Comparison Section**:
- Three-column grid (stacks on mobile)
- Feature checkmarks with clear tier differentiation
- Pricing toggle: Monthly/Yearly with savings badge
- Each plan card with CTA button

**Features Showcase** (4-6 feature cards):
- Grid layout with icons
- Real-time simulator preview
- Teacher admin dashboard preview
- Performance tracking highlights

**Social Proof**:
- Student testimonials with photos
- School partnerships logos
- Stats: "10,000+ Trades Executed" type metrics

**CTA Section**:
- Simplified plan selection
- "Get Started Today" with urgency element

**Footer**:
- Links: About, Support, Terms, Privacy
- Contact information
- Social media icons

---

## Application Pages Layout

**Lessons Page**:
- Filter/sort bar at top
- Grid of lesson cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Progress summary widget (sticky or at top): "X of Y Completed"

**Dashboard Page**:
- Stats row at top: 3-4 data cards (Total Value, Gains/Losses, # Investments, Win Rate)
- Investment list below
- Performance Tracker graph: Full-width, prominent
- Add Investment button: Floating action button (bottom-right) or top-right CTA

**Simulator Page**:
- Chart dominates left/center (70% width on desktop)
- Control panel right sidebar (30%): Account balance, buy/sell controls, open positions
- Bottom ticker: Real-time price updates
- Mobile: Stack vertically with chart taking priority

**Teacher Admin Panel**:
- Sidebar navigation with sections: Students, Assignments, Analytics, Messages
- Main area: Data table or dashboard based on section
- Quick actions toolbar

**Admin Panel** (Lesson Management):
- List view of all lessons with edit/delete actions
- Create Lesson form: Rich text editor, media upload, metadata
- Preview mode

---

## Images

**Hero Image**: Professional trading environment - multiple monitors displaying candlestick charts and market data, clean modern desk setup, natural lighting from window. Image should be high-quality, aspirational, and convey expertise. Position: Full-width background, subtly darkened overlay for text readability.

**Feature Section Images**: Screenshots of actual simulator interface, dashboard graphs, lesson interface - use real interface mockups to demonstrate functionality.

**Testimonial Photos**: Headshots of diverse students/teachers (placeholder or stock photos of professionals in educational settings).

---

## Animations

Use sparingly and purposefully:
- Smooth transitions on hover states (150ms-300ms)
- Chart data loading: Fade-in or draw-in animation
- Modal entrances: Scale + fade
- Success states: Subtle confetti or checkmark animation
- No distracting scroll animations or parallax effects