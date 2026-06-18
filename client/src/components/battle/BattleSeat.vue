<script setup lang="ts">
import type { SeatViewModel } from "./types";
export type { SeatViewModel };

defineProps<{
  seat: SeatViewModel;
}>();

const emit = defineEmits<{
  seatClick: [playerId: string];
  infoClick: [playerId: string];
}>();
</script>

<template>
  <article
    class="battle-seat"
    :class="{
      active: seat.isActive,
      dead: seat.isDead,
      selectable: seat.isSelectable,
      selected: seat.isSelected,
      hit: seat.isHit,
      healed: seat.isHealed,
      blocked: seat.isBlocked
    }"
  >
    <button
      class="seat-button"
      type="button"
      :aria-pressed="seat.isSelected"
      :aria-label="`${seat.playerNumber}号 ${seat.nickname}，${seat.statusText}`"
      @click="emit('seatClick', seat.playerId)"
    >
      <!-- floating marks -->
      <span v-if="seat.isSelectable && seat.attackableLabel" class="attackable-mark">{{ seat.attackableLabel }}</span>
      <span v-if="seat.isSelected && seat.targetLabel" class="target-mark">{{ seat.targetLabel }}</span>
      <span v-if="seat.hasInvincible" class="invincible-mark" aria-label="无敌">✨</span>
      <span v-if="seat.isHost" class="seat-host-mark">房</span>

      <span class="avatar-ring">
        <span class="avatar-emoji">{{ seat.avatarEmoji }}</span>
      </span>

      <!-- death overlay: 💀 icon in addition to grayscale -->
      <span v-if="seat.isDead" class="dead-label">💀 已死亡</span>
    </button>

    <!-- name row with larger info button -->
    <div class="seat-name-row">
      <strong>{{ seat.playerNumber }}号 {{ seat.nickname }}</strong>
      <button
        class="seat-info-btn"
        type="button"
        aria-label="查看玩家详情"
        @click.stop="emit('infoClick', seat.playerId)"
      >i</button>
    </div>

    <div class="seat-tags">
      <span v-for="(tag, i) in seat.seatTags" :key="i">{{ tag }}</span>
    </div>

    <div class="seat-stats">
      <span>♥ {{ seat.hp }}</span>
      <span v-if="seat.shield > 0">🛡 {{ seat.shield }}</span>
    </div>
    <div v-if="seat.lastRollText" class="seat-roll">{{ seat.lastRollText }}</div>
    <span class="seat-status">{{ seat.statusText }}</span>
  </article>
</template>
