export type RollPhase = "idle" | "fast" | "slow" | "pause" | "reveal";
export type RollMode = "normal" | "guard";
/**
 * Pure dice-roll animation state machine.
 *
 * Owns: phase transitions, dice ticker, timers, cleanup.
 * Does NOT own: socket calls, room state, game effects, combat logic.
 */
export declare function useDiceAnimation(): {
    rollPhase: import("vue").Ref<RollPhase, RollPhase>;
    rollMode: import("vue").Ref<RollMode, RollMode>;
    rollingDice: import("vue").Ref<number, number>;
    isRolling: import("vue").ComputedRef<boolean>;
    startAnimation: (mode: RollMode, onReveal: () => void) => void;
    reveal: () => void;
    finishReveal: () => void;
    clearAllTimers: () => void;
};
