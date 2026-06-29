import { computed, ref } from "vue";
import {
  finishRogueliteTutorial,
  hasDoneRogueliteTutorial,
  type RogueliteTutorialStep,
} from "./rogueliteTutorial";

const currentStep = ref<RogueliteTutorialStep | null>(null);
const completedInMemory = ref(hasDoneRogueliteTutorial());

const STEP_ORDER: RogueliteTutorialStep[] = [
  "map-node",
  "roll-dice",
  "choose-reward",
  "done",
];

function stepIndex(step: RogueliteTutorialStep): number {
  return STEP_ORDER.indexOf(step);
}

function setStep(step: RogueliteTutorialStep): void {
  if (completedInMemory.value) return;
  if (currentStep.value && stepIndex(step) < stepIndex(currentStep.value)) return;
  currentStep.value = step;
}

export function useRogueliteTutorial() {
  function refresh(): void {
    completedInMemory.value = hasDoneRogueliteTutorial();
    if (completedInMemory.value) currentStep.value = null;
  }

  function startIfNeeded(): void {
    refresh();
    if (!completedInMemory.value && currentStep.value === null) {
      currentStep.value = "map-node";
    }
  }

  function advanceTo(step: RogueliteTutorialStep): void {
    setStep(step);
  }

  function complete(): void {
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
