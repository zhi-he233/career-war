<script setup lang="ts">
import type { SummonerSkillId } from "@career-war/shared";

export interface SummonerSkillItem {
  id: SummonerSkillId;
  name: string;
  description: string;
}

defineProps<{
  skills: SummonerSkillItem[];
  selectedSkillId: SummonerSkillId;
  selectedSkillName: string;
  getSkillTag: (id: SummonerSkillId) => string;
}>();

const emit = defineEmits<{
  (e: "selectSkill", skill: SummonerSkillItem): void;
  (e: "openSkillDetails", skill: SummonerSkillItem): void;
}>();
</script>

<template>
  <section class="summoner-select-panel">
    <div class="settings-title">
      <h2>召唤师技能</h2>
      <span class="hint">每人选择 1 个</span>
    </div>
    <div class="summoner-options">
      <article
        v-for="skill in skills"
        :key="skill.id"
        class="summoner-option"
        :class="{ selected: selectedSkillId === skill.id }"
        role="button"
        tabindex="0"
        @click="emit('selectSkill', skill)"
        @keydown.enter.prevent="emit('selectSkill', skill)"
        @keydown.space.prevent="emit('selectSkill', skill)"
      >
        <span class="summoner-option-main">
          <strong>{{ skill.name }}</strong>
          <small>{{ getSkillTag(skill.id) }}</small>
          <em class="summoner-option-description">{{ skill.description }}</em>
        </span>
        <button
          class="seat-info-btn summoner-info-btn"
          type="button"
          aria-label="查看技能详情"
          @click.stop="emit('openSkillDetails', skill)"
        >
          i
        </button>
      </article>
    </div>
    <p class="hint">当前已选择：{{ selectedSkillName }}</p>
  </section>
</template>
