import { computed, onUnmounted, ref } from "vue";

export type RollPhase = "idle" | "fast" | "slow" | "pause" | "reveal";
export type RollMode = "normal" | "guard";

/**
 * Pure dice-roll animation state machine.
 *
 * Owns: phase transitions, dice ticker, timers, cleanup.
 * Does NOT own: socket calls, room state, game effects, combat logic.
 */
export function useDiceAnimation() {
  const rollPhase = ref<RollPhase>("idle");
  const rollMode = ref<RollMode>("normal");
  const rollingDice = ref(1);

  const isRolling = computed(() => rollPhase.value !== "idle" && rollPhase.value !== "reveal");

  let rollingTimer: number | undefined;
  const timers: number[] = [];

  /* ---- dice ticker ---- */

  function startDiceTicker(interval: number): void {
    window.clearInterval(rollingTimer);
    rollingTimer = window.setInterval(() => {
      rollingDice.value = randomDice();
    }, interval);
  }

  function randomDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /* ---- animation lifecycle ---- */

  /**
   * Start the full roll-animation pipeline.
   * @param mode       "normal" for attack roll, "guard" for guard-check roll
   * @param onReveal   called when the animation reaches the reveal point (~680 ms);
   *                   BattlePage should update game state and call finishReveal().
   */
  function startAnimation(mode: RollMode, onReveal: () => void): void {
    if (isRolling.value) return;
    clearAllTimers();

    rollMode.value = mode;
    rollPhase.value = "fast";
    rollingDice.value = randomDice();
    startDiceTicker(55);

    // fast → slow
    timers.push(
      window.setTimeout(() => {
        rollPhase.value = "slow";
        startDiceTicker(110);
      }, 240)
    );

    // slow → pause
    timers.push(
      window.setTimeout(() => {
        rollPhase.value = "pause";
        window.clearInterval(rollingTimer);
        rollingTimer = undefined;
      }, 500)
    );

    // pause → reveal (primary trigger)
    timers.push(window.setTimeout(onReveal, 680));
    // safety / late-reveal fallback
    timers.push(window.setTimeout(onReveal, 820));

    // absolute timeout — force idle if something hangs
    timers.push(
      window.setTimeout(() => {
        if (rollPhase.value !== "idle") {
          rollPhase.value = "idle";
          rollMode.value = "normal";
          window.clearInterval(rollingTimer);
          rollingTimer = undefined;
        }
      }, 1200)
    );
  }

  /** Transition into the reveal phase (call when server result arrives). */
  function reveal(): void {
    if (rollPhase.value === "idle" || rollPhase.value === "reveal") return;
    window.clearInterval(rollingTimer);
    rollingTimer = undefined;
    rollPhase.value = "reveal";
  }

  /** Transition from reveal back to idle with a small delay. */
  function finishReveal(): void {
    timers.push(
      window.setTimeout(() => {
        rollPhase.value = "idle";
        rollMode.value = "normal";
      }, rollMode.value === "guard" ? 420 : 220)
    );
  }

  /* ---- cleanup ---- */

  function clearAllTimers(): void {
    window.clearInterval(rollingTimer);
    while (timers.length) window.clearTimeout(timers.pop());
    rollingTimer = undefined;
  }

  onUnmounted(() => {
    clearAllTimers();
  });

  return {
    rollPhase,
    rollMode,
    rollingDice,
    isRolling,
    startAnimation,
    reveal,
    finishReveal,
    clearAllTimers
  };
}
