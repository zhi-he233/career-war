import { type RogueliteTutorialStep } from "./rogueliteTutorial";
export declare function useRogueliteTutorial(): {
    currentStep: import("vue").Ref<RogueliteTutorialStep | null, RogueliteTutorialStep | null>;
    isActive: import("vue").ComputedRef<boolean>;
    hasCompleted: import("vue").ComputedRef<boolean>;
    refresh: () => void;
    startIfNeeded: () => void;
    advanceTo: (step: RogueliteTutorialStep) => void;
    complete: () => void;
};
