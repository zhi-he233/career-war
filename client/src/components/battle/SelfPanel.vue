<script setup lang="ts">
import type { SelfPanelVM } from "./types";
export type { SelfPanelVM };

defineProps<{
  data: SelfPanelVM;
}>();

const emit = defineEmits<{
  showDetail: [];
}>();
</script>

<template>
  <section
    class="self-panel"
    :class="{ active: data.isCurrentTurn, dead: data.isDead }"
  >
    <!-- avatar + floating effects -->
    <button
      class="self-avatar"
      type="button"
      aria-label="查看自己详情"
      @click="emit('showDetail')"
    >
      <span>{{ data.avatarEmoji }}</span>

      <transition name="emote-bubble">
        <span v-if="data.emote" :key="data.emote.key" class="emote-bubble">{{ data.emote.emoji }}</span>
      </transition>

      <transition name="float-pop">
        <b v-if="data.damageEffect" :key="data.damageEffect.key" class="float-number damage-pop">-{{ data.damageEffect.value }}</b>
      </transition>
      <transition name="float-pop">
        <b v-if="data.healEffect" :key="data.healEffect.key" class="float-number heal-pop">+{{ data.healEffect.value }}</b>
      </transition>
      <transition name="float-pop">
        <b v-if="data.noEffect" :key="data.noEffect.key" class="float-number no-pop">无效</b>
      </transition>
    </button>

    <!-- identity + stats -->
    <div class="self-main">
      <div class="self-title">
        <strong>{{ data.nickname }}</strong>
        <span>{{ data.characterName }}</span>
      </div>

      <div class="self-meta">
        <span>♥ {{ data.hp }}/{{ data.maxHp }}</span>
        <span v-if="data.shield > 0">🛡 {{ data.shield }}</span>
        <span v-for="(tag, i) in data.statusTags" :key="i">{{ tag }}</span>
        <span v-if="data.skillHintText">{{ data.skillHintText }}</span>
        <span v-if="data.lastRollText">{{ data.lastRollText }}</span>
      </div>

      <!-- HP bar -->
      <div class="self-hp-bar" aria-label="自己的血量">
        <i :style="{ width: `${data.hpPercent}%` }"></i>
      </div>
    </div>

    <!-- detail button -->
    <button
      class="seat-info-btn self-info-btn"
      type="button"
      aria-label="查看自己详情"
      @click="emit('showDetail')"
    >i</button>
  </section>
</template>
