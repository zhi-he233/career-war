<script setup lang="ts">
import { ref } from "vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";

defineProps<{
  playerName: string;
  isLoggedIn: boolean;
  editorUiEnabled?: boolean;
}>();

const emit = defineEmits<{
  updatePlayerName: [value: string];
  selectPvp: [];
  selectPve: [];
  selectRoguelite: [];
  selectProfile: [];
  selectEditor: [];
}>();

const showRules = ref(false);
</script>

<template>
  <section class="home-page game-home">
    <div class="home-topline">
      <label class="home-name-field">
        <span>{{ isLoggedIn ? "游戏名" : "游客游戏名" }}</span>
        <input
          :value="playerName"
          maxlength="12"
          :readonly="isLoggedIn"
          placeholder="输入你的游戏名"
          @input="emit('updatePlayerName', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

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
      <button v-if="editorUiEnabled" class="ghost-btn home-profile-btn" type="button" @click="emit('selectEditor')">数据编辑器</button>
    </div>

    <RuleGuideDialog v-if="showRules" @close="showRules = false" />
  </section>
</template>

<style scoped>
.home-topline {
  display: grid;
  min-width: 0;
}

.home-name-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 1px solid rgba(17, 17, 17, 0.32);
  border-radius: 12px;
  padding: 6px 8px;
  background: rgba(255, 250, 240, 0.8);
}

.home-name-field span {
  color: #3f3f46;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.home-name-field input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #111111;
  font-size: 14px;
  font-weight: 900;
  outline: none;
}

.home-name-field input[readonly] {
  opacity: 0.78;
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
