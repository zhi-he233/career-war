import { computed, ref } from "vue";
import { finishRogueliteTutorial, hasDoneRogueliteTutorial, } from "./rogueliteTutorial";
const currentStep = ref(null);
const completedInMemory = ref(hasDoneRogueliteTutorial());
const STEP_ORDER = [
    "map-node",
    "roll-dice",
    "choose-reward",
    "done",
];
function stepIndex(step) {
    return STEP_ORDER.indexOf(step);
}
function setStep(step) {
    if (completedInMemory.value)
        return;
    if (currentStep.value && stepIndex(step) < stepIndex(currentStep.value))
        return;
    currentStep.value = step;
}
export function useRogueliteTutorial() {
    function refresh() {
        completedInMemory.value = hasDoneRogueliteTutorial();
        if (completedInMemory.value)
            currentStep.value = null;
    }
    function startIfNeeded() {
        refresh();
        if (!completedInMemory.value && currentStep.value === null) {
            currentStep.value = "map-node";
        }
    }
    function advanceTo(step) {
        setStep(step);
    }
    function complete() {
        finishRogueliteTutorial();
        completedInMemory.value = true;
        currentStep.value = "done";
    }
    return {
        currentStep,
        isActive: computed(() => !completedInMemory.value && currentStep.value !== null && currentStep.value !== "done"),
        hasCompleted: computed(() => completedInMemory.value),
        refresh,
        startIfNeeded,
        advanceTo,
        complete,
    };
}
