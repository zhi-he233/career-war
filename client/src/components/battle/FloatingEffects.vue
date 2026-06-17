<script setup lang="ts">
import type { PlayerEmoteEvent } from "@career-war/shared";

export type FloatingEffect = {
  rollId: string;
  type: "damage" | "heal" | "noEffect";
  playerId: string;
  value: number;
  key: string;
};

export type VisibleEmote = PlayerEmoteEvent & {
  key: string;
  emoji: string;
};

defineProps<{
  floatingEffect: FloatingEffect | undefined;
}>();
</script>

<template>
  <transition name="float-pop">
    <b
      v-if="floatingEffect?.type === 'damage'"
      :key="floatingEffect.key"
      class="float-number damage-pop"
    >-{{ floatingEffect.value }}</b>
  </transition>
  <transition name="float-pop">
    <b
      v-if="floatingEffect?.type === 'heal'"
      :key="floatingEffect.key"
      class="float-number heal-pop"
    >+{{ floatingEffect.value }}</b>
  </transition>
  <transition name="float-pop">
    <b
      v-if="floatingEffect?.type === 'noEffect'"
      :key="floatingEffect.key"
      class="float-number no-pop"
    >无效</b>
  </transition>
</template>
