<script setup lang="ts">
import { computed } from "vue";
import type { DicePanelProps } from "./types";
export type { DicePanelProps };

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
        <span v-for="(dice, index) in props.diceValues" :key="`${props.diceKey}-${index}`">{{ dice }}</span>
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
      type="button"
      :disabled="!props.canRoll"
      @click="emit('roll')"
    >
      {{ props.rollButtonText }}
    </button>
  </div>
</template>
