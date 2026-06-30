<script setup lang="ts">
import { computed } from "vue";
import type { DicePanelProps } from "./types";
export type { DicePanelProps };
import dice1Url from "../../assets/art/homepage/dice_1.png";
import dice2Url from "../../assets/art/homepage/dice_2.png";
import dice3Url from "../../assets/art/homepage/dice_3.png";
import dice4Url from "../../assets/art/homepage/dice_4.png";
import dice5Url from "../../assets/art/homepage/dice_5.png";
import dice6Url from "../../assets/art/homepage/dice_6.png";

const DICE_FACES: Record<string, string> = {
  "1": dice1Url,
  "2": dice2Url,
  "3": dice3Url,
  "4": dice4Url,
  "5": dice5Url,
  "6": dice6Url,
};

function diceFaceSrc(value: string): string | undefined {
  return DICE_FACES[value];
}

const props = defineProps<DicePanelProps>();

const emit = defineEmits<{
  roll: [];
}>();

const hasSix = computed(() => props.diceValues.includes("6"));
const hasSkillTrigger = computed(() => props.skillHints.length > 0 || Boolean(props.skillText));
</script>

<template>
  <div
    class="dice-panel action-arena"
    :class="{
      ready: props.isReady,
      rolling: props.rollPhase === 'fast',
      slowing: props.rollPhase === 'slow',
      paused: props.rollPhase === 'pause',
      reveal: props.rollPhase === 'reveal',
      rolled: props.hasRolled,
      'jackpot-six': hasSix,
      'skill-ready': hasSkillTrigger,
      'core-roll-zone': props.showRollButton
    }"
  >
    <div class="dice-visual">
      <div class="dice-box" :key="props.diceKey">
        <img
          v-for="(dice, index) in props.diceValues"
          :key="`${props.diceKey}-${index}`"
          class="dice-face"
          :class="{ 'jackpot-glow': dice === '6' }"
          :src="diceFaceSrc(dice)"
          :alt="dice"
        />
      </div>
      <transition-group name="skill-hint" tag="div" class="skill-hint-stack" aria-live="polite">
        <span v-for="hint in props.skillHints" :key="hint.id" class="skill-hint-badge">
          <span>{{ hint.text }}</span>
          <b v-if="hint.valueText">{{ hint.valueText }}</b>
        </span>
      </transition-group>
    </div>

    <div class="action-summary">
      <strong>{{ props.title }}</strong>
      <p v-if="props.detail">{{ props.detail }}</p>
      <p v-if="props.skillText" class="skill-summary">技能：{{ props.skillText }}</p>
    </div>

    <slot name="action-slots" />

    <button
      v-if="props.showRollButton"
      class="roll-btn"
      :class="{ 'tutorial-target-control': props.tutorialFocus === 'roll' }"
      type="button"
      :disabled="!props.canRoll"
      @click="emit('roll')"
    >
      {{ props.rollButtonText }}
    </button>
  </div>
</template>

<style scoped>
.dice-face {
  width: 52px;
  height: 52px;
  image-rendering: pixelated;
  filter:
    drop-shadow(0 3px 0 rgba(45, 36, 21, 0.42))
    drop-shadow(0 0 2px rgba(45, 36, 21, 0.14));
  transition: transform 120ms ease, filter 120ms ease;
}

.dice-face.jackpot-glow {
  filter:
    drop-shadow(0 3px 0 rgba(45, 36, 21, 0.42))
    drop-shadow(0 0 10px rgba(247, 207, 69, 0.72));
}

/* animation phases — scale feedback */
.rolling .dice-face,
.slowing .dice-face {
  animation: dice-img-shake 120ms ease-in-out infinite;
}

.rolling .dice-face:nth-child(odd) {
  animation-delay: 60ms;
}

.paused .dice-face {
  transform: scale(1.06);
}

.reveal .dice-face {
  animation: dice-img-reveal 240ms ease forwards;
}

@keyframes dice-img-shake {
  0% { transform: rotate(-5deg) scale(1.02); }
  50% { transform: rotate(5deg) scale(1.05); }
  100% { transform: rotate(-5deg) scale(1.02); }
}

@keyframes dice-img-reveal {
  0% { transform: scale(0.82) rotate(-6deg); }
  60% { transform: scale(1.1) rotate(3deg); }
  100% { transform: scale(1) rotate(0); }
}

@media (max-width: 480px) {
  .dice-face {
    width: 44px;
    height: 44px;
  }
}
</style>
