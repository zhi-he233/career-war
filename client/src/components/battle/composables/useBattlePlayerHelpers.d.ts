import type { ComputedRef } from "vue";
import type { Character, Player, Room, SummonerSkillId } from "@career-war/shared";
/**
 * Pure player-display helpers extracted from BattlePage.vue.
 * No socket, no game flow rules, no animation state, no emit.
 */
export interface BattlePlayerHelpersParams {
    room: ComputedRef<Room>;
    characters: Character[];
    isDuoMode: ComputedRef<boolean>;
    isRogueliteMode: ComputedRef<boolean>;
    rogueliteEnemyTypeLabel: (player: Player) => string;
    activePlayer: ComputedRef<Player | undefined>;
    pendingRoll: ComputedRef<Room["pendingRoll"]>;
    pendingRollDecision: ComputedRef<Room["pendingRollDecision"]>;
}
export declare function useBattlePlayerHelpers(params: BattlePlayerHelpersParams): {
    characterName: (id: string | undefined) => string;
    characterFor: (id: string | undefined) => Character | undefined;
    summonerSkillName: (id: SummonerSkillId | undefined) => string;
    hpPercent: (player: Player) => number;
    zhaoZilongHitText: (player: Player) => string;
    playerFallbackMark: (player: Player) => string;
    playerNumber: (player: Player) => number;
    displayCharacterName: (player: Player) => string;
    hasInvincible: (player: Player) => boolean;
    playerStatus: (player: Player) => string;
    lastRollText: (player: Player) => string;
    guardBadges: (player: Player) => string[];
    isProtectedByGuardingMountainShield: (player: Player) => boolean;
    buildSeatTags: (player: Player) => string[];
    buildDuoSeatTags: (player: Player) => string[];
};
