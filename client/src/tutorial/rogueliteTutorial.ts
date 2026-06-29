export type RogueliteTutorialStep =
  | "map-node"
  | "roll-dice"
  | "choose-reward"
  | "done";

export const ROGUELITE_TUTORIAL_STORAGE_KEY = "career-war-roguelite-tutorial-done";

export function hasDoneRogueliteTutorial(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ROGUELITE_TUTORIAL_STORAGE_KEY) === "true";
}

export function finishRogueliteTutorial(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROGUELITE_TUTORIAL_STORAGE_KEY, "true");
}
