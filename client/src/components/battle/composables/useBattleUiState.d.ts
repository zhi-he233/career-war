import { type ComputedRef } from "vue";
import type { Player, Room } from "@career-war/shared";
/**
 * Pure UI state for BattlePage — dialog/drawer/panel visibility toggles.
 * No socket, no game logic, no seat/action ViewModels.
 */
export declare function useBattleUiState(room: ComputedRef<Room>): {
    showRuleGuide: import("vue").Ref<boolean, boolean>;
    showBattleLog: import("vue").Ref<boolean, boolean>;
    showRogueliteDetails: import("vue").Ref<boolean, boolean>;
    detailPlayerId: import("vue").Ref<string | null, string | null>;
    detailPlayer: ComputedRef<Player | undefined>;
    openPlayerDetail: (player: Player) => void;
    openPlayerDetailById: (playerId: string) => void;
    closePlayerDetail: () => void;
    toggleBattleLog: () => void;
    closeBattleLog: () => void;
    openRuleGuide: () => void;
    closeRuleGuide: () => void;
    openRogueliteDetails: () => void;
    closeRogueliteDetails: () => void;
};
