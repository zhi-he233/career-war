<script setup lang="ts">
import type { SelfPanelVM } from "./types";
export type { SelfPanelVM };

defineProps<{
  data: SelfPanelVM;
  compact?: boolean;
}>();

const emit = defineEmits<{
  showDetail: [];
}>();
</script>

<template>
  <section
    class="self-panel"
    :class="{
      active: data.isCurrentTurn,
      dead: data.isDead,
      compact,
      shielded: data.shield > 0,
      danger: data.hpPercent < 30 && !data.isDead
    }"
  >
    <transition name="emote-bubble">
      <span v-if="data.emote" :key="data.emote.key" class="emote-bubble">{{ data.emote.emoji }}</span>
    </transition>

    <transition name="float-pop">
      <b v-if="data.damageEffect" :key="data.damageEffect.key" class="float-number damage-pop" :class="{ 'big-hit': data.damageEffect.value >= 8 }">-{{ data.damageEffect.value }}</b>
    </transition>
    <transition name="float-pop">
      <b v-if="data.healEffect" :key="data.healEffect.key" class="float-number heal-pop">+{{ data.healEffect.value }}</b>
    </transition>
    <transition name="float-pop">
      <b v-if="data.noEffect" :key="data.noEffect.key" class="float-number no-pop">格挡</b>
    </transition>

    <div class="self-main">
      <div class="self-title">
        <strong>{{ data.nickname }}</strong>
        <span>{{ data.characterName }}</span>
      </div>

      <div class="self-hp-row">
        <span class="self-hp-text">❤ {{ data.hp }}/{{ data.maxHp }}</span>
        <span v-if="data.shield > 0" class="self-shield-text">🛡 {{ data.shield }}</span>
        <span v-if="data.isDead" class="self-dead-tag">阵亡</span>
      </div>

      <div class="self-hp-bar" aria-label="自己的血量">
        <i :style="{ width: `${data.hpPercent}%` }"></i>
      </div>

      <div v-if="data.statusTags.length || data.skillHintText || data.lastRollText" class="self-meta">
        <span v-for="(tag, i) in data.statusTags" :key="i">{{ tag }}</span>
        <span v-if="data.skillHintText">{{ data.skillHintText }}</span>
        <span v-if="data.lastRollText">{{ data.lastRollText }}</span>
      </div>
    </div>

    <button
      class="seat-info-btn self-info-btn"
      type="button"
      aria-label="查看自己详情"
      @click="emit('showDetail')"
    >i</button>
  </section>
</template>
