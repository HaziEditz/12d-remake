export interface LevelInfo {
  level: number;
  title: string;
  currentXp: number;
  xpToNext: number;
  progress: number;
  xpInLevel: number;
  xpForLevel: number;
}

function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level - 1, 1.6));
}

function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 100 && xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function getLevelInfo(xp: number | null | undefined): LevelInfo {
  const currentXp = xp ?? 0;
  const level = levelFromXp(currentXp);

  let title = "Beginner";
  if (level >= 76) title = "Legend";
  else if (level >= 51) title = "Master";
  else if (level >= 31) title = "Expert";
  else if (level >= 16) title = "Trader";
  else if (level >= 6) title = "Apprentice";

  const startXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const xpInLevel = currentXp - startXp;
  const xpForThisLevel = Math.max(1, nextXp - startXp);
  const xpToNext = Math.max(0, nextXp - currentXp);
  const progress = Math.min(100, Math.round((xpInLevel / xpForThisLevel) * 100));

  return {
    level,
    title,
    currentXp,
    xpToNext,
    progress,
    xpInLevel,
    xpForLevel: xpForThisLevel,
  };
}

export function getLevelColor(level: number): string {
  if (level >= 76) return "from-yellow-400 to-amber-500";
  if (level >= 51) return "from-purple-500 to-fuchsia-500";
  if (level >= 31) return "from-blue-500 to-cyan-500";
  if (level >= 16) return "from-emerald-500 to-teal-500";
  if (level >= 6) return "from-sky-500 to-indigo-500";
  return "from-slate-500 to-slate-600";
}
