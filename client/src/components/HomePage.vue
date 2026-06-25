<script setup lang="ts">
import { ref } from "vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";

const emit = defineEmits<{
  selectPvp: [];
  selectPve: [];
  selectRoguelite: [];
  selectProfile: [];
}>();

const showRules = ref(false);
</script>

<template>
  <section class="home-page game-home">
    <div class="home-topline"></div>

    <div class="home-title-card">
      <span class="home-dice-mark">🎲</span>
      <h2>职业互怼</h2>
      <p>骰子对战 · 职业技能 · 肉鸽挑战</p>
    </div>

    <div class="home-actions">
      <button class="primary-btn home-start-btn" type="button" @click="emit('selectPvp')">开始游戏</button>
      <button class="secondary-btn home-rule-btn" type="button" @click="showRules = true">规则说明</button>
      <div class="home-mode-entries" aria-label="模式入口">
        <button class="home-mode-entry secondary-btn" type="button" @click="emit('selectRoguelite')">肉鸽挑战</button>
        <button class="home-mode-entry ghost-btn" type="button" @click="emit('selectPve')">人机练习</button>
      </div>
      <button class="ghost-btn home-profile-btn" type="button" @click="emit('selectProfile')">玩家档案</button>
    </div>

    <RuleGuideDialog v-if="showRules" @close="showRules = false" />
  </section>
</template>

<style scoped>
.home-topline {
  /* kept as layout placeholder, styled only if needed later */
}

.home-profile-btn {
  grid-column: 1 / -1;
}

.home-mode-entries {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.home-mode-entry {
  min-width: 0;
  overflow: hidden;
  min-height: 44px;
  padding: 8px 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
