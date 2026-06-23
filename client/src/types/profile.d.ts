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
    winRate: number;
    streak: number;
    recentResults: Array<"win" | "loss">;
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
    favoriteCareer: string;
    bestWinRateCareer: string;
    recentCareers: string[];
}
/** A single achievement entry. */
export interface ProfileAchievement {
    id: string;
    name: string;
    description: string;
    icon: string;
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
