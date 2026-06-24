import { type ComputedRef } from "vue";
import type { GameEvent, Player, Room } from "@career-war/shared";
/**
 * Pure text/display computed properties extracted from BattlePage.vue.
 * No socket, no DOM, no game-rule mutations — just string generation.
 */
type DiceMode = "guard_check" | "action_roll" | null;
export interface UseBattleTextsParams {
    room: ComputedRef<Room>;
    playerId: string;
    isDuoMode: ComputedRef<boolean>;
    isPveMode: ComputedRef<boolean>;
    isRogueliteMode: ComputedRef<boolean>;
    activePlayer: ComputedRef<Player | undefined>;
    isSelfDead: ComputedRef<boolean>;
    isRolling: ComputedRef<boolean>;
    isPendingMine: ComputedRef<boolean>;
    isDecisionMine: ComputedRef<boolean>;
    isGuardCheckMine: ComputedRef<boolean>;
    pendingRoll: ComputedRef<Room["pendingRoll"]>;
    pendingRollDecision: ComputedRef<Room["pendingRollDecision"]>;
    pendingGuardCheck: ComputedRef<Room["pendingGuardCheck"]>;
    guardCheckActor: ComputedRef<Player | undefined>;
    visibleRoll: ComputedRef<GameEvent | undefined>;
    visibleGuardCheckEvent: ComputedRef<GameEvent | undefined>;
    displayedGuardDice: ComputedRef<string | number>;
    currentDiceMode: ComputedRef<DiceMode>;
    selectedTargetText: ComputedRef<string>;
    actionStageText: ComputedRef<string>;
}
export declare function useBattleTexts(params: UseBattleTextsParams): {
    winnerText: ComputedRef<string>;
    opponentPanelTitle: ComputedRef<"敌人" | "AI 敌人" | "其他玩家">;
    opponentPanelHint: ComputedRef<"点击敌人头像选择攻击目标" | "点击头像选择攻击目标">;
    latestDiceText: ComputedRef<string>;
    dicePanelTitle: ComputedRef<string>;
    dicePanelDetail: ComputedRef<string | undefined>;
    currentActionTitle: ComputedRef<string>;
    currentDiceValueText: ComputedRef<string>;
    currentActionLines: ComputedRef<string[]>;
    rollButtonText: ComputedRef<"等待架盾判定" | "摇骰中..." | "投骰" | "等待选择" | "继续投骰" | "等待继续投骰">;
};
export {};
