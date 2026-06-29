export type RogueliteTutorialStep = "map-node" | "roll-dice" | "choose-reward" | "done";
export declare const ROGUELITE_TUTORIAL_STORAGE_KEY = "career-war-roguelite-tutorial-done";
export declare function hasDoneRogueliteTutorial(): boolean;
export declare function finishRogueliteTutorial(): void;
