import { computed, onUnmounted, ref } from "vue";
/**
 * Pure dice-roll animation state machine.
 *
 * Owns: phase transitions, dice ticker, timers, cleanup.
 * Does NOT own: socket calls, room state, game effects, combat logic.
 */
export function useDiceAnimation() {
    const rollPhase = ref("idle");
    const rollMode = ref("normal");
    const rollingDice = ref(1);
    const isRolling = computed(() => rollPhase.value !== "idle" && rollPhase.value !== "reveal");
    let rollingTimer;
    const timers = [];
    /* ---- dice ticker ---- */
    function startDiceTicker(interval) {
        window.clearInterval(rollingTimer);
        rollingTimer = window.setInterval(() => {
            rollingDice.value = randomDice();
        }, interval);
    }
    function randomDice() {
        return Math.floor(Math.random() * 6) + 1;
    }
    /* ---- animation lifecycle ---- */
    /**
     * Start the full roll-animation pipeline.
     * @param mode       "normal" for attack roll, "guard" for guard-check roll
     * @param onReveal   called when the animation reaches the reveal point (~680 ms);
     *                   BattlePage should update game state and call finishReveal().
     */
    function startAnimation(mode, onReveal) {
        if (isRolling.value)
            return;
        clearAllTimers();
        rollMode.value = mode;
        rollPhase.value = "fast";
        rollingDice.value = randomDice();
        startDiceTicker(55);
        // fast → slow
        timers.push(window.setTimeout(() => {
            rollPhase.value = "slow";
            startDiceTicker(110);
        }, 240));
        // slow → pause
        timers.push(window.setTimeout(() => {
            rollPhase.value = "pause";
            window.clearInterval(rollingTimer);
            rollingTimer = undefined;
        }, 500));
        // pause → reveal (primary trigger)
        timers.push(window.setTimeout(onReveal, 680));
        // safety / late-reveal fallback
        timers.push(window.setTimeout(onReveal, 820));
        // absolute timeout — force idle if something hangs
        timers.push(window.setTimeout(() => {
            if (rollPhase.value !== "idle") {
                rollPhase.value = "idle";
                rollMode.value = "normal";
                window.clearInterval(rollingTimer);
                rollingTimer = undefined;
            }
        }, 1200));
    }
    /** Transition into the reveal phase (call when server result arrives). */
    function reveal() {
        if (rollPhase.value === "idle" || rollPhase.value === "reveal")
            return;
        window.clearInterval(rollingTimer);
        rollingTimer = undefined;
        rollPhase.value = "reveal";
    }
    /** Transition from reveal back to idle with a small delay. */
    function finishReveal() {
        timers.push(window.setTimeout(() => {
            rollPhase.value = "idle";
            rollMode.value = "normal";
        }, rollMode.value === "guard" ? 420 : 220));
    }
    /* ---- cleanup ---- */
    function clearAllTimers() {
        window.clearInterval(rollingTimer);
        while (timers.length)
            window.clearTimeout(timers.pop());
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
