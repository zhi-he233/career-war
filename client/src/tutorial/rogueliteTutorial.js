export const ROGUELITE_TUTORIAL_STORAGE_KEY = "career-war-roguelite-tutorial-done";
export function hasDoneRogueliteTutorial() {
    if (typeof window === "undefined")
        return true;
    return window.localStorage.getItem(ROGUELITE_TUTORIAL_STORAGE_KEY) === "true";
}
export function finishRogueliteTutorial() {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(ROGUELITE_TUTORIAL_STORAGE_KEY, "true");
}
