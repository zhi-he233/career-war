import { type ComputedRef } from "vue";
import type { Player, Room } from "@career-war/shared";
import type { RoguelitePanelVM, RogueliteRewardOptionVM } from "../types";
/** All roguelite-related ViewModels extracted from BattlePage.vue to keep the page component manageable. */
export declare function useRogueliteViewModels(room: ComputedRef<Room>, me: ComputedRef<Player | undefined>, playerId: string): {
    roguelitePanelVM: ComputedRef<RoguelitePanelVM>;
    isRogueliteMode: ComputedRef<boolean>;
    isBossRewardPhase: ComputedRef<boolean>;
    isRogueliteContinuePhase: ComputedRef<boolean>;
    rogueliteState: ComputedRef<import("@career-war/shared").RogueliteRunState | undefined>;
    rogueliteRewardChoices: ComputedRef<import("@career-war/shared").RogueliteReward[]>;
    rogueliteAppliedRewards: ComputedRef<import("@career-war/shared").RogueliteReward[]>;
    currentRogueliteRound: ComputedRef<number>;
    rogueliteStageType: ComputedRef<"normal" | "elite" | "boss">;
    rogueliteStageTypeLabel: ComputedRef<"Boss 战" | "精英关" | "普通关">;
    rogueliteEnemyInfo: ComputedRef<{
        stageType: "normal" | "elite" | "boss";
        hpBonus: number;
        shieldBonus: number;
        damageBonus: number;
        skillNames?: string[];
        description?: string;
    } | undefined>;
    currentBossPlayer: ComputedRef<Player | undefined>;
    currentBossSkills: ComputedRef<string[]>;
    hasAnyRoguelitePerks: ComputedRef<boolean>;
    rogueliteGrowthPerks: ComputedRef<{
        perkId: string;
        level: number;
        def: {
            name: string;
            category: "growth" | "boss";
            perLevelDesc: string;
        };
    }[]>;
    rogueliteBossPerks: ComputedRef<{
        perkId: string;
        level: number;
        def: {
            name: string;
            category: "growth" | "boss";
            perLevelDesc: string;
        };
    }[]>;
    rogueliteCharacterSkills: ComputedRef<{
        skillId: string;
        level: number;
        def: {
            name: string;
            perLevelDesc: string;
        };
    }[]>;
    showRogueliteRewardCenterPrompt: ComputedRef<boolean>;
    showRogueliteCompactStatus: ComputedRef<boolean>;
    rogueliteEnemyTypeLabel: (player: Player | undefined) => string;
    rogueliteEnemyMechanicSkills: (id: string) => string[];
    isBossRewardType: (type: string) => boolean;
    isGrowthRewardType: (type: string) => boolean;
    isRogueliteSkillRewardType: (type: string) => boolean;
    rogueliteRewardRarity: (type: string) => RogueliteRewardOptionVM["rarity"];
    rogueliteRewardTags: (type: string) => string[];
    rogueliteRewardIcon: (type: string) => string;
    getRogueliteAlertText: (msg: string) => string | null;
};
