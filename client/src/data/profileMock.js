// ---------------------------------------------------------------------------
// Mock profile data
// ---------------------------------------------------------------------------
// All mock data is centralized here. Components and composables should NOT
// inline mock data — they import createMockProfile() instead.
//
// When a real /api/profile/me endpoint is ready, replace the body of
// createMockProfile() with a fetch call and delete the mock helpers below.
// ---------------------------------------------------------------------------
import { characterList } from "@career-war/shared";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function seededFromUsername(username) {
    // Simple hash so the same username produces stable mock data
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = (hash * 31 + username.charCodeAt(i)) & 0x7fffffff;
    }
    return hash;
}
function seededPick(items, seed) {
    return items[seed % items.length];
}
// ---------------------------------------------------------------------------
// Static lookup tables
// ---------------------------------------------------------------------------
const TITLES = [
    "新手骰手",
    "幸运骰客",
    "职业挑战者",
    "骰子达人",
    "竞技场常客",
    "战术大师",
    "无双骰王",
];
/** Career ID pool derived from the canonical character table (implemented only). */
const CAREER_IDS = characterList
    .filter((c) => c.isImplemented)
    .map((c) => c.id);
const MOCK_ACHIEVEMENTS = [
    {
        id: "first_win",
        name: "首胜",
        description: "获得第一场胜利",
        icon: "🏆",
        unlocked: false,
        progress: 0,
        maxProgress: 1,
    },
    {
        id: "ten_wins",
        name: "十胜勇士",
        description: "累计获得 10 场胜利",
        icon: "⚔️",
        unlocked: false,
        progress: 0,
        maxProgress: 10,
    },
    {
        id: "roguelite_5",
        name: "肉鸽探险家",
        description: "肉鸽挑战到达第 5 关",
        icon: "🗡️",
        unlocked: false,
        progress: 0,
        maxProgress: 5,
    },
    {
        id: "roguelite_10",
        name: "肉鸽征服者",
        description: "肉鸽挑战到达第 10 关",
        icon: "🔥",
        unlocked: false,
        progress: 0,
        maxProgress: 10,
    },
    {
        id: "three_streak",
        name: "三连胜",
        description: "在 PVP 中获得 3 连胜",
        icon: "💪",
        unlocked: false,
        progress: 0,
        maxProgress: 3,
    },
    {
        id: "damage_50",
        name: "重击手",
        description: "单次造成 50+ 伤害",
        icon: "💥",
        unlocked: false,
    },
    {
        id: "heal_30",
        name: "妙手回春",
        description: "单次恢复 30+ 生命",
        icon: "💊",
        unlocked: false,
    },
    {
        id: "play_all_careers",
        name: "职业全览",
        description: "使用过所有职业",
        icon: "🎭",
        unlocked: false,
        progress: 0,
        maxProgress: 12,
    },
];
// ---------------------------------------------------------------------------
// Mock generators
// ---------------------------------------------------------------------------
function createMockUser(username) {
    const seed = seededFromUsername(username);
    const isGuest = username.startsWith("游客");
    return {
        userId: isGuest ? "guest" : `user_${seed.toString(36)}`,
        username,
        displayName: isGuest ? "游客骰王" : username,
        title: seededPick(TITLES, seed),
        avatarCareerId: seededPick(CAREER_IDS, seed),
    };
}
function createMockProgress(seed) {
    const level = 1 + (seed % 15);
    return {
        level,
        exp: (seed % 100) * level,
        expToNext: 100 * level,
        coins: seed % 5000,
        rankTitle: seededPick(TITLES, seed + 1),
    };
}
function createMockPvpStats(seed) {
    const totalGames = seed % 50;
    const wins = Math.floor(totalGames * (0.3 + (seed % 40) / 100));
    const recentCount = Math.min(totalGames, 10);
    const recentResults = [];
    for (let i = 0; i < recentCount; i++) {
        recentResults.push((seed + i) % 3 === 0 ? "loss" : "win");
    }
    return {
        wins,
        totalGames,
        winRate: totalGames > 0 ? wins / totalGames : 0,
        streak: (seed % 7) - 2, // -2 to +4
        recentResults,
    };
}
function createMockRogueliteStats(seed) {
    return {
        highestStage: 1 + (seed % 12),
        bossesDefeated: seed % 5,
        maxSingleDamage: 20 + (seed % 60),
        maxDamageTaken: 15 + (seed % 40),
        maxHealing: 10 + (seed % 35),
    };
}
function createMockCareerStats(seed) {
    return {
        favoriteCareer: seededPick(CAREER_IDS, seed),
        bestWinRateCareer: seededPick(CAREER_IDS, seed + 3),
        recentCareers: Array.from({ length: 3 + (seed % 3) }, (_, i) => seededPick(CAREER_IDS, seed + i * 7)),
    };
}
function createMockAchievements(seed) {
    return MOCK_ACHIEVEMENTS.map((achievement) => {
        const progress = achievement.maxProgress
            ? seed % (achievement.maxProgress + 1)
            : undefined;
        const unlocked = achievement.maxProgress
            ? progress >= achievement.maxProgress
            : seed % 3 === 0;
        return { ...achievement, unlocked, progress };
    });
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Generate a deterministic mock profile from a username.
 * Same username always returns the same mock data (for stable previews).
 *
 * When the real API is ready, this function should be replaced with:
 *   const res = await fetch("/api/profile/me", { credentials: "same-origin" });
 *   return res.json();
 */
export function createMockProfile(username) {
    const seed = seededFromUsername(username);
    return {
        user: createMockUser(username),
        progress: createMockProgress(seed),
        pvp: createMockPvpStats(seed),
        roguelite: createMockRogueliteStats(seed),
        careers: createMockCareerStats(seed),
        achievements: createMockAchievements(seed),
    };
}
/** Default guest profile used when no auth user is present. */
export const GUEST_PROFILE = createMockProfile("游客骰王");
