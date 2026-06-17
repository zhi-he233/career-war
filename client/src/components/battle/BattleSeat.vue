<script setup lang="ts">
/** Display-ready data for a single seat on the combat board.
 *  All complex logic lives in BattlePage; this is a pure render contract. */
export interface SeatViewModel {
  playerId: string;
  playerNumber: number;
  nickname: string;
  isDead: boolean;
  isActive: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  isHit: boolean;
  isHealed: boolean;
  isBlocked: boolean;
  avatarEmoji: string;
  statusText: string;
  hp: number;
  maxHp: number;
  shield: number;
  lastRollText: string;
  characterName: string;
  seatTags: string[];
  /** Label shown above avatar when seat is a valid click target (e.g. "可攻击" / "可行动") */
  attackableLabel: string;
  /** Label shown when this seat is the current selection (e.g. "目标" / "行动") */
  targetLabel: string;
  isHost: boolean;
  hasInvincible: boolean;
  /** Short-lived animation effects rendered inside the seat button */
  damageEffect?: { key: string; value: number };
  healEffect?: { key: string; value: number };
  noEffect?: { key: string };
  emote?: { key: string; emoji: string };
}

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

      <transition name="emote-bubble">
        <span v-if="seat.emote" :key="seat.emote.key" class="emote-bubble">{{ seat.emote.emoji }}</span>
      </transition>

      <transition name="float-pop">
        <b v-if="seat.damageEffect" :key="seat.damageEffect.key" class="float-number damage-pop">-{{ seat.damageEffect.value }}</b>
      </transition>
      <transition name="float-pop">
        <b v-if="seat.healEffect" :key="seat.healEffect.key" class="float-number heal-pop">+{{ seat.healEffect.value }}</b>
      </transition>
      <transition name="float-pop">
        <b v-if="seat.noEffect" :key="seat.noEffect.key" class="float-number no-pop">无效</b>
      </transition>
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
