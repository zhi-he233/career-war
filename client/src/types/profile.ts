// ---------------------------------------------------------------------------
// Player Profile Types
// ---------------------------------------------------------------------------
// These types define the data shape for the future player profile page.
// They are consumed by useProfile() and backed by mock data for now.
// When real APIs land, only useProfile internals need to change.
// ---------------------------------------------------------------------------

/** Core identity carried by every profile variant. */
export interface ProfileUser {
  userId: string;
  username: string;
  displayName: string;
  /** Short title shown under the name, e.g. "新手骰手" */
  title: string;
  /** Career id used as the profile avatar fallback, e.g. "boxer" */
  avatarCareerId: string;
}

/** Level / currency / rank metadata. */
export interface ProfileProgress {
  level: number;
  exp: number;
  expToNext: number;
  coins: number;
  rankTitle: string;
}

/** Aggregated PVP stats (classic + duo). */
export interface ProfilePvpStats {
  wins: number;
  totalGames: number;
  winRate: number; // 0-1
  streak: number; // positive = win streak, negative = loss streak
  recentResults: Array<"win" | "loss">; // latest first, max 10
}

/** Roguelite challenge stats. */
export interface ProfileRogueliteStats {
  highestStage: number;
  bossesDefeated: number;
  maxSingleDamage: number;
  maxDamageTaken: number;
  maxHealing: number;
}

/** Career preference summary. */
export interface ProfileCareerStats {
  favoriteCareer: string; // career id most played
  bestWinRateCareer: string; // career id with highest win rate
  recentCareers: string[]; // latest-first career ids, max 5
}

/** A single achievement entry. */
export interface ProfileAchievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon key
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

/** The full player profile consumed by the UI. */
export interface PlayerProfile {
  user: ProfileUser;
  progress: ProfileProgress;
  pvp: ProfilePvpStats;
  roguelite: ProfileRogueliteStats;
  careers: ProfileCareerStats;
  achievements: ProfileAchievement[];
}
