<script setup lang="ts">
import type { SummonerSkillId } from "@career-war/shared";

export interface SummonerSkillItem {
  id: SummonerSkillId;
  name: string;
  description: string;
}

defineProps<{
  skill: SummonerSkillItem;
  selectedSkillId: SummonerSkillId;
  getSkillTag: (id: SummonerSkillId) => string;
}>();

const emit = defineEmits<{
  (e: "select"): void;
  (e: "close"): void;
}>();
</script>

<template>
  <div class="character-detail-backdrop skill-detail-backdrop" @click.self="emit('close')">
    <section
      class="character-detail-panel skill-detail-panel"
      role="dialog"
      aria-modal="true"
      :aria-label="skill.name"
    >
      <header class="character-detail-header">
        <div>
          <span class="detail-status">{{ getSkillTag(skill.id) }}</span>
          <h2>{{ skill.name }}</h2>
          <p>
            {{ selectedSkillId === skill.id ? "当前已选择" : "可选择的召唤师技能" }}
          </p>
        </div>
        <button class="detail-close-btn" type="button" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div class="character-detail-body">
        <h3>技能说明</h3>
        <p>{{ skill.description }}</p>
      </div>

      <footer class="character-detail-actions">
        <button class="primary-btn" type="button" @click="emit('select')">选择</button>
        <button class="ghost-btn" type="button" @click="emit('close')">关闭</button>
      </footer>
    </section>
  </div>
</template>
