<script setup lang="ts">
import type { DicePanelProps } from "./types";
export type { DicePanelProps };

defineProps<DicePanelProps>();

const emit = defineEmits<{
  roll: [];
}>();
</script>

<template>
  <div
    class="dice-panel action-arena"
    :class="{
      ready: isReady,
      rolling: rollPhase === 'fast',
      slowing: rollPhase === 'slow',
      paused: rollPhase === 'pause',
      reveal: rollPhase === 'reveal',
      rolled: hasRolled
    }"
  >
    <div class="dice-visual">
      <div class="dice-box" :key="diceKey">
        <span v-for="(dice, index) in diceValues" :key="`${diceKey}-${index}`">{{ dice }}</span>
      </div>
      <transition-group name="skill-hint" tag="div" class="skill-hint-stack" aria-live="polite">
        <span v-for="hint in skillHints" :key="hint.id" class="skill-hint-badge">
          <span>{{ hint.text }}</span>
          <b v-if="hint.valueText">{{ hint.valueText }}</b>
        </span>
      </transition-group>
    </div>

    <div class="action-summary">
      <strong>{{ title }}</strong>
      <p v-if="detail">{{ detail }}</p>
      <p v-if="skillText">技能：{{ skillText }}</p>
    </div>

    <slot name="action-slots" />

    <button
      v-if="showRollButton"
      class="roll-btn"
      type="button"
      :disabled="!canRoll"
      @click="emit('roll')"
    >
      {{ rollButtonText }}
    </button>
  </div>
</template>
