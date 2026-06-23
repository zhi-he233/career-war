import type { PlayerProfile } from "../types/profile";
export declare function useProfile(): {
    /** Current player profile (null while loading or on error). */
    profile: import("vue").Ref<{
        user: {
            userId: string;
            username: string;
            displayName: string;
            title: string;
            avatarCareerId: string;
        };
        progress: {
            level: number;
            exp: number;
            expToNext: number;
            coins: number;
            rankTitle: string;
        };
        pvp: {
            wins: number;
            totalGames: number;
            winRate: number;
            streak: number;
            recentResults: Array<"win" | "loss">;
        };
        roguelite: {
            highestStage: number;
            bossesDefeated: number;
            maxSingleDamage: number;
            maxDamageTaken: number;
            maxHealing: number;
        };
        careers: {
            favoriteCareer: string;
            bestWinRateCareer: string;
            recentCareers: string[];
        };
        achievements: {
            id: string;
            name: string;
            description: string;
            icon: string;
            unlocked: boolean;
            progress?: number | undefined;
            maxProgress?: number | undefined;
        }[];
    } | null, PlayerProfile | {
        user: {
            userId: string;
            username: string;
            displayName: string;
            title: string;
            avatarCareerId: string;
        };
        progress: {
            level: number;
            exp: number;
            expToNext: number;
            coins: number;
            rankTitle: string;
        };
        pvp: {
            wins: number;
            totalGames: number;
            winRate: number;
            streak: number;
            recentResults: Array<"win" | "loss">;
        };
        roguelite: {
            highestStage: number;
            bossesDefeated: number;
            maxSingleDamage: number;
            maxDamageTaken: number;
            maxHealing: number;
        };
        careers: {
            favoriteCareer: string;
            bestWinRateCareer: string;
            recentCareers: string[];
        };
        achievements: {
            id: string;
            name: string;
            description: string;
            icon: string;
            unlocked: boolean;
            progress?: number | undefined;
            maxProgress?: number | undefined;
        }[];
    } | null>;
    /** True while the profile is being fetched/generated. */
    loading: import("vue").Ref<boolean, boolean>;
    /** Error message if profile generation failed. */
    error: import("vue").Ref<string, string>;
    /** Manually refresh the profile. Replace internals for real API. */
    refreshProfile: () => Promise<void>;
    /** Convenience: true once a profile is available. */
    hasProfile: import("vue").ComputedRef<boolean>;
};
