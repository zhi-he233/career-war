<script setup lang="ts">
import type { SeatViewModel } from "./types";
export type { SeatViewModel };

const props = defineProps<{
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
      active: props.seat.isActive,
      dead: props.seat.isDead,
      shielded: props.seat.shield > 0,
      selectable: props.seat.isSelectable,
      selected: props.seat.isSelected,
      hit: props.seat.isHit,
      healed: props.seat.isHealed,
      blocked: props.seat.isBlocked
    }"
  >
    <button
      class="seat-button"
      type="button"
      :aria-pressed="props.seat.isSelected"
      :aria-label="`${props.seat.playerNumber}号 ${props.seat.nickname}，${props.seat.statusText}`"
      @click="emit('seatClick', props.seat.playerId)"
    >
      <span v-if="props.seat.isSelectable && props.seat.attackableLabel" class="attackable-mark">{{ props.seat.attackableLabel }}</span>
      <span v-if="props.seat.isSelected && props.seat.targetLabel" class="target-mark">{{ props.seat.targetLabel }}</span>
      <span v-if="props.seat.hasInvincible" class="invincible-mark" aria-label="无敌">✓</span>
      <span v-if="props.seat.isHost" class="seat-host-mark">房</span>
      <span v-if="props.seat.shield > 0" class="shield-mark" aria-label="护盾">🛡</span>

      <span class="avatar-ring" :class="{ 'has-sprite': props.seat.spriteSrc }">
        <img
          v-if="props.seat.spriteSrc"
          class="avatar-sprite"
          :src="props.seat.spriteSrc"
          :alt="props.seat.characterName"
          draggable="false"
        />
        <span v-else class="avatar-emoji">{{ props.seat.avatarEmoji }}</span>
      </span>

      <span v-if="props.seat.isDead" class="dead-label">已阵亡</span>

      <transition name="emote-bubble">
        <span v-if="props.seat.emote" :key="props.seat.emote.key" class="emote-bubble">{{ props.seat.emote.emoji }}</span>
      </transition>

      <transition name="float-pop">
        <b v-if="props.seat.damageEffect" :key="props.seat.damageEffect.key" class="float-number damage-pop" :class="{ 'big-hit': props.seat.damageEffect.value >= 8 }">-{{ props.seat.damageEffect.value }}</b>
      </transition>
      <transition name="float-pop">
        <b v-if="props.seat.healEffect" :key="props.seat.healEffect.key" class="float-number heal-pop">+{{ props.seat.healEffect.value }}</b>
      </transition>
      <transition name="float-pop">
        <b v-if="props.seat.noEffect" :key="props.seat.noEffect.key" class="float-number no-pop">格挡</b>
      </transition>
    </button>

    <div class="seat-name-row">
      <strong>{{ props.seat.playerNumber }}号 {{ props.seat.nickname }}</strong>
      <button
        class="seat-info-btn"
        type="button"
        aria-label="查看玩家详情"
        @click.stop="emit('infoClick', props.seat.playerId)"
      >i</button>
    </div>

    <div class="seat-tags">
      <span v-for="(tag, i) in props.seat.seatTags" :key="i">{{ tag }}</span>
    </div>

    <div class="seat-stats">
      <span>❤ {{ props.seat.hp }}</span>
      <span v-if="props.seat.shield > 0">🛡 {{ props.seat.shield }}</span>
    </div>
    <div v-if="props.seat.lastRollText" class="seat-roll">{{ props.seat.lastRollText }}</div>
    <span class="seat-status">{{ props.seat.statusText }}</span>
  </article>
</template>
