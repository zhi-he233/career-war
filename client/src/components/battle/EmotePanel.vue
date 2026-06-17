<script setup lang="ts">
import type { EmoteId } from "@career-war/shared";

type EmoteOption = {
  id: EmoteId;
  label: string;
  emoji: string;
};

const EMOTE_OPTIONS: EmoteOption[] = [
  { id: "cry", label: "大哭", emoji: "😭" },
  { id: "surprise", label: "惊讶", emoji: "😮" },
  { id: "taunt", label: "嘲讽", emoji: "😏" },
  { id: "angry", label: "愤怒", emoji: "😡" },
  { id: "like", label: "点赞", emoji: "👍" },
  { id: "question", label: "疑惑", emoji: "❓" }
];

defineProps<{
  locked: boolean;
}>();

const emit = defineEmits<{
  sendEmote: [emoteId: EmoteId];
}>();
</script>

<template>
  <section class="emote-panel" aria-label="固定表情">
    <button
      v-for="emote in EMOTE_OPTIONS"
      :key="emote.id"
      class="emote-btn"
      type="button"
      :disabled="locked"
      :title="emote.label"
      @click="emit('sendEmote', emote.id)"
    >
      <span>{{ emote.emoji }}</span>
      <small>{{ emote.label }}</small>
    </button>
  </section>
</template>
