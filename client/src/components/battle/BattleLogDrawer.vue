<script setup lang="ts">
import type { GameEvent } from "@career-war/shared";

defineProps<{
  visible: boolean;
  log: GameEvent[];
  newestEventId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <div v-if="visible" class="battle-log-backdrop" @click.self="emit('close')">
    <section class="log-panel battle-log-drawer">
      <div class="log-title">
        <h2>战斗日志</h2>
        <button class="detail-close-btn" type="button" aria-label="关闭日志" @click="emit('close')">×</button>
      </div>
      <ol>
        <li
          v-for="event in log"
          :key="event.id"
          :class="{ newest: event.id === newestEventId }"
        >
          <time>{{ new Date(event.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }}</time>
          <span>{{ event.message }}</span>
        </li>
        <li v-if="log.length === 0">暂无日志</li>
      </ol>
    </section>
  </div>
</template>
