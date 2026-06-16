import type { CSSProperties } from "react";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ShopFrame {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  color: string;
  glowColor: string;
  desc: string;
}

export interface ShopTitle {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  desc: string;
}

export interface ShopPack {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  emoji: string;
  desc: string;
  guarantee: string;
  possibleItems: string[];
}

export interface ShopBadge {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  emoji: string;
  desc: string;
}

export interface RouletteSlot {
  id: string;
  label: string;
  emoji: string;
  color: string;
  reward: { type: "balance" | "item"; amount?: number; itemId?: string; itemType?: "frame" | "title" | "badge" };
  weight: number;
  rarity: Rarity;
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    "text-slate-400 border-slate-500/40 bg-slate-500/8",
  uncommon:  "text-green-400 border-green-500/40 bg-green-500/8",
  rare:      "text-blue-400 border-blue-500/40 bg-blue-500/8",
  epic:      "text-purple-400 border-purple-500/40 bg-purple-500/8",
  legendary: "text-yellow-400 border-yellow-500/40 bg-yellow-500/8",
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common:    "",
  uncommon:  "shadow-green-500/20",
  rare:      "shadow-blue-500/25",
  epic:      "shadow-purple-500/30",
  legendary: "shadow-yellow-500/35",
};

export const FRAMES: ShopFrame[] = [
  // Common (500–900)
  { id: "frame-silver",      name: "Silver Frame",    price: 500,   rarity: "common",    color: "#94a3b8", glowColor: "transparent",  desc: "Clean silver border" },
  { id: "frame-steel",       name: "Steel Frame",     price: 600,   rarity: "common",    color: "#9ca3af", glowColor: "transparent",  desc: "Industrial steel ring" },
  { id: "frame-sand",        name: "Sandy Dunes",     price: 550,   rarity: "common",    color: "#d4a574", glowColor: "transparent",  desc: "Warm sandy tone" },
  { id: "frame-slate",       name: "Slate Grey",      price: 500,   rarity: "common",    color: "#64748b", glowColor: "transparent",  desc: "Cool dark slate" },
  { id: "frame-mint",        name: "Mint Fresh",      price: 700,   rarity: "common",    color: "#86efac", glowColor: "transparent",  desc: "Crisp mint border" },
  // Uncommon (1000–1800)
  { id: "frame-neon-blue",   name: "Neon Blue",       price: 1000,  rarity: "uncommon",  color: "#60a5fa", glowColor: "#60a5fa50",   desc: "Electric blue glow" },
  { id: "frame-purple-glow", name: "Purple Glow",     price: 1200,  rarity: "uncommon",  color: "#c084fc", glowColor: "#c084fc50",   desc: "Mystic purple aura" },
  { id: "frame-teal-wave",   name: "Teal Wave",       price: 1100,  rarity: "uncommon",  color: "#2dd4bf", glowColor: "#2dd4bf40",   desc: "Oceanic teal shimmer" },
  { id: "frame-coral",       name: "Coral Reef",      price: 1300,  rarity: "uncommon",  color: "#fb7185", glowColor: "#fb718540",   desc: "Vibrant coral glow" },
  { id: "frame-lime",        name: "Lime Light",      price: 1150,  rarity: "uncommon",  color: "#a3e635", glowColor: "#a3e63540",   desc: "Bright lime electric" },
  { id: "frame-amber",       name: "Amber Glow",      price: 1400,  rarity: "uncommon",  color: "#fbbf24", glowColor: "#fbbf2440",   desc: "Warm amber radiance" },
  { id: "frame-indigo",      name: "Indigo Night",    price: 1600,  rarity: "uncommon",  color: "#818cf8", glowColor: "#818cf840",   desc: "Deep indigo haze" },
  { id: "frame-crimson",     name: "Crimson Edge",    price: 1800,  rarity: "uncommon",  color: "#f87171", glowColor: "#f8717140",   desc: "Bold crimson ring" },
  // Rare (2000–3500)
  { id: "frame-gold",        name: "Gold Frame",      price: 2000,  rarity: "rare",      color: "#fbbf24", glowColor: "#fbbf2450",   desc: "Gleaming gold border" },
  { id: "frame-emerald",     name: "Emerald",         price: 2200,  rarity: "rare",      color: "#34d399", glowColor: "#34d39950",   desc: "Rich emerald glow" },
  { id: "frame-rose-gold",   name: "Rose Gold",       price: 2500,  rarity: "rare",      color: "#fda4af", glowColor: "#fda4af50",   desc: "Elegant rose gold" },
  { id: "frame-ocean-deep",  name: "Ocean Deep",      price: 2800,  rarity: "rare",      color: "#0ea5e9", glowColor: "#0ea5e960",   desc: "Depths of the ocean" },
  { id: "frame-violet",      name: "Violet Haze",     price: 3000,  rarity: "rare",      color: "#a855f7", glowColor: "#a855f760",   desc: "Dreamy violet haze" },
  { id: "frame-solar",       name: "Solar Flare",     price: 3200,  rarity: "rare",      color: "#f59e0b", glowColor: "#f59e0b70",   desc: "Blazing solar ring" },
  { id: "frame-glacier",     name: "Glacier",         price: 3500,  rarity: "rare",      color: "#bae6fd", glowColor: "#bae6fd50",   desc: "Icy glacier shimmer" },
  // Epic (4000–8000)
  { id: "frame-fire",        name: "Fire Ring",       price: 4000,  rarity: "epic",      color: "#f97316", glowColor: "#f9731660",   desc: "Blazing fire effect" },
  { id: "frame-diamond",     name: "Diamond",         price: 5000,  rarity: "epic",      color: "#a5f3fc", glowColor: "#a5f3fc60",   desc: "Crystal clear border" },
  { id: "frame-midnight",    name: "Midnight",        price: 5500,  rarity: "epic",      color: "#4f46e5", glowColor: "#4f46e570",   desc: "Eternal midnight glow" },
  { id: "frame-inferno",     name: "Inferno",         price: 6500,  rarity: "epic",      color: "#dc2626", glowColor: "#dc262670",   desc: "Infernal burning ring" },
  { id: "frame-aurora",      name: "Aurora",          price: 7000,  rarity: "epic",      color: "#06b6d4", glowColor: "#06b6d470",   desc: "Northern aurora lights" },
  { id: "frame-nebula",      name: "Nebula",          price: 8000,  rarity: "epic",      color: "#9333ea", glowColor: "#9333ea75",   desc: "Cosmic nebula swirl" },
  // Legendary (10000+)
  { id: "frame-rainbow",     name: "Rainbow",         price: 12000, rarity: "legendary", color: "rainbow", glowColor: "#fbbf2440",   desc: "All the colours, all at once" },
  { id: "frame-void",        name: "Void",            price: 18000, rarity: "legendary", color: "#1e1b4b", glowColor: "#7c3aed60",   desc: "Darkness that glows" },
  { id: "frame-cosmic",      name: "Cosmic King",     price: 25000, rarity: "legendary", color: "cosmic",  glowColor: "#fbbf2480",   desc: "Ruler of the cosmos" },
  { id: "frame-godmode",     name: "God Mode",        price: 50000, rarity: "legendary", color: "#ffd700", glowColor: "#ffd70080",   desc: "Ascended beyond limits" },
];

export const TITLES: ShopTitle[] = [
  // Common (200–500)
  { id: "title-bull",          name: "🐂 Bull Market",      price: 200,   rarity: "common",    desc: "Always bullish" },
  { id: "title-day-trader",    name: "📈 Day Trader",       price: 250,   rarity: "common",    desc: "In and out daily" },
  { id: "title-risk-taker",    name: "⚡ Risk Taker",       price: 200,   rarity: "common",    desc: "High risk, high reward" },
  { id: "title-newbie",        name: "🌱 Newbie",           price: 150,   rarity: "common",    desc: "Just getting started" },
  { id: "title-hodler",        name: "💪 Hodler",           price: 300,   rarity: "common",    desc: "Strong hands always" },
  { id: "title-buyer",         name: "🛒 Buyer",            price: 200,   rarity: "common",    desc: "Always buying the dip" },
  { id: "title-watcher",       name: "👁️ Market Watcher",  price: 250,   rarity: "common",    desc: "Watching every candle" },
  { id: "title-student",       name: "📚 Student",          price: 200,   rarity: "common",    desc: "Still learning" },
  { id: "title-degen",         name: "🎰 Degen",            price: 400,   rarity: "common",    desc: "A proud degen" },
  { id: "title-the-planner",   name: "📋 The Planner",      price: 350,   rarity: "common",    desc: "Always has a plan" },
  // Uncommon (500–900)
  { id: "title-bear-slayer",   name: "🐻 Bear Slayer",      price: 500,   rarity: "uncommon",  desc: "Profits in downturns" },
  { id: "title-chart-wizard",  name: "🧙 Chart Wizard",     price: 600,   rarity: "uncommon",  desc: "Reads charts like a book" },
  { id: "title-profit-hunter", name: "🎯 Profit Hunter",    price: 700,   rarity: "uncommon",  desc: "Always finding the edge" },
  { id: "title-scalper",       name: "⚔️ Scalper",          price: 550,   rarity: "uncommon",  desc: "Quick in and out" },
  { id: "title-swing-king",    name: "🏄 Swing King",       price: 650,   rarity: "uncommon",  desc: "Riding every wave" },
  { id: "title-breakout",      name: "🚀 Breakout",         price: 750,   rarity: "uncommon",  desc: "Catches every breakout" },
  { id: "title-contrarian",    name: "🔄 Contrarian",       price: 800,   rarity: "uncommon",  desc: "Bets against the crowd" },
  { id: "title-liquidated",    name: "💀 Liquidated",       price: 500,   rarity: "uncommon",  desc: "Been through it all" },
  { id: "title-macro-mind",    name: "🌍 Macro Mind",       price: 700,   rarity: "uncommon",  desc: "Thinks big picture" },
  { id: "title-chart-reader",  name: "📉 Chart Reader",     price: 600,   rarity: "uncommon",  desc: "Never misses a signal" },
  // Rare (1000–2000)
  { id: "title-diamond-hands", name: "💎 Diamond Hands",   price: 1000,  rarity: "rare",      desc: "Never sells at a loss" },
  { id: "title-the-analyst",   name: "📊 The Analyst",     price: 1200,  rarity: "rare",      desc: "Backed by data" },
  { id: "title-market-guru",   name: "🔮 Market Guru",     price: 1500,  rarity: "rare",      desc: "Future sight" },
  { id: "title-options-chad",  name: "🎲 Options Chad",    price: 1100,  rarity: "rare",      desc: "Lives for volatility" },
  { id: "title-dark-pool",     name: "🌑 Dark Pool",       price: 1800,  rarity: "rare",      desc: "Trades in the shadows" },
  { id: "title-quant",         name: "🤖 The Quant",       price: 2000,  rarity: "rare",      desc: "Algorithms only" },
  { id: "title-risk-manager",  name: "🛡️ Risk Manager",   price: 1600,  rarity: "rare",      desc: "Losses are managed" },
  { id: "title-long-term",     name: "⌛ Long Term",       price: 1400,  rarity: "rare",      desc: "Patience is a strategy" },
  { id: "title-crypto-bull",   name: "🟡 Crypto Bull",     price: 1300,  rarity: "rare",      desc: "Believes in the future" },
  { id: "title-tape-reader",   name: "🎞️ Tape Reader",    price: 1700,  rarity: "rare",      desc: "Old school precision" },
  // Epic (2500–5000)
  { id: "title-hedge-fund",    name: "🏦 Hedge Fund",      price: 2500,  rarity: "epic",      desc: "Institutional grade" },
  { id: "title-wolf",          name: "🐺 Wolf of Wall St", price: 3500,  rarity: "epic",      desc: "Feared on the market" },
  { id: "title-alpha-seeker",  name: "⚡ Alpha Seeker",    price: 4000,  rarity: "epic",      desc: "Always hunting alpha" },
  { id: "title-market-maker",  name: "⚙️ Market Maker",   price: 4500,  rarity: "epic",      desc: "Sets the price" },
  { id: "title-trillion",      name: "💹 Trillion Vision", price: 5000,  rarity: "epic",      desc: "Eyes on trillions" },
  // Legendary (6000+)
  { id: "title-whale",         name: "🐋 Whale",           price: 7000,  rarity: "legendary", desc: "Moves markets" },
  { id: "title-legend",        name: "👑 Legend",          price: 10000, rarity: "legendary", desc: "Truly untouchable" },
  { id: "title-oracle",        name: "🔭 The Oracle",      price: 12000, rarity: "legendary", desc: "Sees what others can't" },
  { id: "title-sovereign",     name: "⚜️ Sovereign",      price: 15000, rarity: "legendary", desc: "Above all markets" },
  { id: "title-god-tier",      name: "✨ God Tier",        price: 25000, rarity: "legendary", desc: "You have transcended" },
];

export const BADGES: ShopBadge[] = [
  // Common
  { id: "badge-rocket",    name: "🚀 Rocket",       price: 300,   rarity: "common",    emoji: "🚀", desc: "To the moon" },
  { id: "badge-fire",      name: "🔥 Fire",         price: 300,   rarity: "common",    emoji: "🔥", desc: "You're on fire" },
  { id: "badge-money",     name: "💰 Money Bag",    price: 400,   rarity: "common",    emoji: "💰", desc: "All about the money" },
  { id: "badge-chart",     name: "📈 Chart Up",     price: 350,   rarity: "common",    emoji: "📈", desc: "Always going up" },
  { id: "badge-skull",     name: "💀 Skull",        price: 350,   rarity: "common",    emoji: "💀", desc: "High risk lifestyle" },
  { id: "badge-trophy",    name: "🏆 Trophy",       price: 400,   rarity: "common",    emoji: "🏆", desc: "Winner's badge" },
  { id: "badge-gem",       name: "💎 Gem",          price: 450,   rarity: "uncommon",  emoji: "💎", desc: "Pure diamond" },
  { id: "badge-crown",     name: "👑 Crown",        price: 600,   rarity: "uncommon",  emoji: "👑", desc: "Royal status" },
  { id: "badge-lightning", name: "⚡ Lightning",    price: 500,   rarity: "uncommon",  emoji: "⚡", desc: "Speed and power" },
  { id: "badge-shield",    name: "🛡️ Shield",      price: 550,   rarity: "uncommon",  emoji: "🛡️", desc: "Protecting gains" },
  { id: "badge-dragon",    name: "🐉 Dragon",       price: 1500,  rarity: "rare",      emoji: "🐉", desc: "Dragon of the market" },
  { id: "badge-unicorn",   name: "🦄 Unicorn",      price: 2000,  rarity: "rare",      emoji: "🦄", desc: "Rare and magical" },
  { id: "badge-galaxy",    name: "🌌 Galaxy",       price: 3000,  rarity: "epic",      emoji: "🌌", desc: "Cosmic traveller" },
  { id: "badge-nuclear",   name: "☢️ Nuclear",      price: 4000,  rarity: "epic",      emoji: "☢️", desc: "Radioactive returns" },
  { id: "badge-infinity",  name: "♾️ Infinity",     price: 8000,  rarity: "legendary", emoji: "♾️", desc: "Infinite profit mind" },
];

export const PACKS: ShopPack[] = [
  {
    id: "pack-starter",
    name: "Starter Pack",
    price: 600,
    rarity: "common",
    emoji: "📦",
    desc: "A mix of common & uncommon cosmetics. Great for new traders.",
    guarantee: "1–2 common or uncommon items",
    possibleItems: ["frame-silver","frame-steel","frame-mint","title-bull","title-day-trader","title-risk-taker","title-newbie","title-hodler","badge-rocket","badge-fire","badge-money"],
  },
  {
    id: "pack-trader",
    name: "Trader Pack",
    price: 1500,
    rarity: "uncommon",
    emoji: "💼",
    desc: "Solid uncommon and rare items for active traders.",
    guarantee: "1 uncommon + 1 bonus item",
    possibleItems: ["frame-neon-blue","frame-coral","frame-teal-wave","title-bear-slayer","title-chart-wizard","title-scalper","badge-gem","badge-lightning"],
  },
  {
    id: "pack-pro",
    name: "Pro Pack",
    price: 3000,
    rarity: "rare",
    emoji: "💰",
    desc: "Guaranteed rare item plus a bonus. For serious traders.",
    guarantee: "1 rare item + 1 uncommon bonus",
    possibleItems: ["frame-gold","frame-emerald","frame-rose-gold","frame-ocean-deep","title-diamond-hands","title-the-analyst","title-market-guru","title-quant","badge-dragon","badge-unicorn"],
  },
  {
    id: "pack-elite",
    name: "Elite Pack",
    price: 6000,
    rarity: "epic",
    emoji: "⚡",
    desc: "Rare to epic items, great value for dedicated traders.",
    guarantee: "1 rare or epic item guaranteed",
    possibleItems: ["frame-fire","frame-diamond","frame-midnight","frame-aurora","title-hedge-fund","title-wolf","title-market-maker","badge-galaxy","badge-nuclear"],
  },
  {
    id: "pack-legend",
    name: "Legend Pack",
    price: 12000,
    rarity: "legendary",
    emoji: "💫",
    desc: "Guaranteed epic or legendary cosmetic. Only for the elite.",
    guarantee: "1 epic or legendary item guaranteed",
    possibleItems: ["frame-rainbow","frame-void","frame-cosmic","title-whale","title-legend","title-oracle","badge-infinity"],
  },
  {
    id: "pack-god",
    name: "God Pack",
    price: 30000,
    rarity: "legendary",
    emoji: "🌟",
    desc: "The ultimate pack. Guaranteed legendary or ultra-rare item.",
    guarantee: "Legendary guaranteed. May contain God Mode.",
    possibleItems: ["frame-godmode","frame-cosmic","frame-rainbow","title-god-tier","title-sovereign","title-oracle","badge-infinity"],
  },
];

export const ROULETTE_SLOTS: RouletteSlot[] = [
  { id: "slot-lose",      label: "Nothing",    emoji: "💸", color: "#374151", reward: { type: "balance", amount: 0 },                         weight: 20, rarity: "common" },
  { id: "slot-50",        label: "$50",         emoji: "💵", color: "#6b7280", reward: { type: "balance", amount: 50 },                        weight: 15, rarity: "common" },
  { id: "slot-100",       label: "$100",        emoji: "💵", color: "#6b7280", reward: { type: "balance", amount: 100 },                       weight: 15, rarity: "common" },
  { id: "slot-200",       label: "$200",        emoji: "💰", color: "#16a34a", reward: { type: "balance", amount: 200 },                       weight: 12, rarity: "uncommon" },
  { id: "slot-500",       label: "$500",        emoji: "💰", color: "#16a34a", reward: { type: "balance", amount: 500 },                       weight: 10, rarity: "uncommon" },
  { id: "slot-1000",      label: "$1,000",      emoji: "🤑", color: "#2563eb", reward: { type: "balance", amount: 1000 },                      weight: 8,  rarity: "rare" },
  { id: "slot-2500",      label: "$2,500",      emoji: "🤑", color: "#2563eb", reward: { type: "balance", amount: 2500 },                      weight: 6,  rarity: "rare" },
  { id: "slot-5000",      label: "$5,000",      emoji: "💎", color: "#7c3aed", reward: { type: "balance", amount: 5000 },                      weight: 4,  rarity: "epic" },
  { id: "slot-frame-r",   label: "Rare Frame",  emoji: "🖼️", color: "#7c3aed", reward: { type: "item", itemId: "frame-gold",    itemType: "frame" }, weight: 5,  rarity: "rare" },
  { id: "slot-frame-e",   label: "Epic Frame",  emoji: "✨", color: "#9333ea", reward: { type: "item", itemId: "frame-fire",    itemType: "frame" }, weight: 3,  rarity: "epic" },
  { id: "slot-title-r",   label: "Rare Title",  emoji: "🏷️", color: "#2563eb", reward: { type: "item", itemId: "title-diamond-hands", itemType: "title" }, weight: 4, rarity: "rare" },
  { id: "slot-jackpot",   label: "JACKPOT! 🎉", emoji: "🌟", color: "#d97706", reward: { type: "balance", amount: 20000 },                     weight: 1,  rarity: "legendary" },
  { id: "slot-badge",     label: "Badge",       emoji: "🏆", color: "#16a34a", reward: { type: "item", itemId: "badge-trophy",  itemType: "badge" }, weight: 7, rarity: "common" },
];

// Returns inline style for a frame ring on an avatar
export function getFrameStyle(frameId: string | null | undefined): CSSProperties {
  if (!frameId) return {};
  const frame = FRAMES.find(f => f.id === frameId);
  if (!frame) return {};
  if (frame.color === "rainbow") {
    return {
      outline: "2.5px solid transparent",
      outlineOffset: "2px",
      background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #3b82f6, #10b981) border-box",
      borderRadius: "9999px",
      boxShadow: "0 0 12px 2px #fbbf2440",
    };
  }
  if (frame.color === "cosmic") {
    return {
      outline: "2.5px solid transparent",
      outlineOffset: "2px",
      background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #7c3aed, #2563eb, #06b6d4, #7c3aed) border-box",
      borderRadius: "9999px",
      boxShadow: "0 0 16px 4px #7c3aed60",
      animation: "spin 4s linear infinite",
    };
  }
  return {
    outline: `2.5px solid ${frame.color}`,
    outlineOffset: "2px",
    boxShadow: frame.glowColor !== "transparent" ? `0 0 10px 2px ${frame.glowColor}` : undefined,
    borderRadius: "9999px",
  };
}

export function getAllItems(): Array<{ id: string; name: string; rarity: Rarity; type: "frame" | "title" | "badge" }> {
  return [
    ...FRAMES.map(f => ({ id: f.id, name: f.name, rarity: f.rarity, type: "frame" as const })),
    ...TITLES.map(t => ({ id: t.id, name: t.name, rarity: t.rarity, type: "title" as const })),
    ...BADGES.map(b => ({ id: b.id, name: b.name, rarity: b.rarity, type: "badge" as const })),
  ];
}

export function getItemById(id: string) {
  return getAllItems().find(i => i.id === id);
}
