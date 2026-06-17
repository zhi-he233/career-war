<script setup lang="ts">
export interface DicePanelProps {
  /** Current dice display values (e.g. ["3"] or ["?"]) */
  diceValues: string[];
  /** Key for Vue transition tracking */
  diceKey: string;
  /** Current animation phase */
  rollPhase: "idle" | "fast" | "slow" | "pause" | "reveal";
  /** Whether this player's turn — enables glow */
  isReady: boolean;
  /** Whether the roll result is visible */
  hasRolled: boolean;
  /** Main title text above dice (e.g. "架盾判定" / "投出了 5 点") */
  title: string;
  /** Optional subtitle / detail text */
  detail?: string;
  /** Skill trigger texts joined with ； */
  skillText: string;
  /** Floating skill hint badges */
  skillHints: Array<{ id: string; text: string; valueText?: string }>;
  /** Roll button */
  showRollButton: boolean;
  canRoll: boolean;
  rollButtonText: string;
}

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
