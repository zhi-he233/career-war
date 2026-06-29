<script setup lang="ts">
import { characterList, ROGUELITE_PLAYER_START } from "@career-war/shared";
import { ref } from "vue";
import { hasDoneRogueliteTutorial } from "../tutorial/rogueliteTutorial";
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
  selectCharacterEditor: [];
}>();

const showRules = ref(false);
const rogueliteStartCharacter = characterList.find((item) => item.id === ROGUELITE_PLAYER_START.characterId);
const rogueliteStartHp = rogueliteStartCharacter?.maxHp ?? 20;
const rogueliteStartName = rogueliteStartCharacter?.name ?? "拳手";
const showRogueliteTutorialIntro = !hasDoneRogueliteTutorial();
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

    <section class="home-roguelite-cover" aria-labelledby="home-roguelite-title">
      <div class="home-cover-head">
        <span class="home-cover-kicker">肉鸽挑战</span>
        <div class="home-cover-tools">
          <button class="ghost-btn home-rule-chip" type="button" @click="showRules = true">规则</button>
          <span class="home-dice-mark" aria-hidden="true">🎲</span>
        </div>
      </div>
      <div class="home-cover-copy">
        <h2 id="home-roguelite-title">命运骰已就位</h2>
        <p>击败敌人，选择词条，组出你的职业流派。</p>
        <p v-if="showRogueliteTutorialIntro" class="home-tutorial-line">首次挑战会带你熟悉路线、战斗和词条。</p>
      </div>
      <div class="home-run-preview" aria-label="本局预览">
        <div class="home-stage-line">
          <span>第 1 关</span>
          <strong>迷雾森林</strong>
        </div>
        <div class="home-stat-row">
          <span><b>HP</b> {{ rogueliteStartHp }}</span>
          <span><b>金币</b> 0</span>
          <span><b>词条</b> 0</span>
        </div>
        <p class="home-start-career">初始职业：{{ rogueliteStartName }}</p>
      </div>
      <button class="primary-btn home-start-btn" type="button" @click="emit('selectRoguelite')">开始肉鸽</button>
    </section>

    <section class="home-quick-panel" aria-labelledby="home-quick-title">
      <h3 id="home-quick-title">快速入口</h3>
      <div class="home-quick-grid">
        <button class="secondary-btn home-mode-entry" type="button" @click="emit('selectPve')">人机练习</button>
        <button class="secondary-btn home-mode-entry" type="button" @click="emit('selectPvp')">经典对战</button>
        <button class="ghost-btn home-mode-entry" type="button" @click="emit('selectProfile')">玩家档案</button>
      </div>
    </section>

    <section v-if="editorUiEnabled" class="home-dev-panel" aria-labelledby="home-dev-title">
      <h3 id="home-dev-title">开发工具</h3>
      <div class="home-dev-grid">
        <button class="ghost-btn home-dev-btn" type="button" @click="emit('selectEditor')">肉鸽数据编辑器</button>
        <button class="ghost-btn home-dev-btn" type="button" @click="emit('selectCharacterEditor')">职业编辑器</button>
      </div>
    </section>

    <RuleGuideDialog v-if="showRules" mode="roguelite" @close="showRules = false" />
  </section>
</template>

<style scoped>
.home-page.game-home {
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) auto auto !important;
  gap: 10px !important;
  padding: 10px 2px 6px !important;
}

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

.home-roguelite-cover,
.home-quick-panel,
.home-dev-panel {
  min-width: 0;
  border: 2px solid #1f1f1f;
  border-radius: 18px;
  background: #fffaf0;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.84), 0 8px 18px rgba(73, 54, 28, 0.12);
}

.home-roguelite-cover {
  display: grid;
  align-content: center;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
  padding: 16px 14px;
  background:
    radial-gradient(circle at 14% 8%, rgba(247, 207, 69, 0.38), transparent 23%),
    radial-gradient(circle at 92% 24%, rgba(86, 116, 74, 0.18), transparent 28%),
    linear-gradient(180deg, #fffdf6 0%, #fff4d9 100%);
}

.home-cover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.home-cover-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-cover-kicker {
  color: #2b2b2b;
  font-size: 15px;
  font-weight: 1000;
}

.home-rule-chip {
  min-height: 34px !important;
  padding: 7px 12px !important;
  border-radius: 12px !important;
  font-size: 13px !important;
  font-weight: 1000 !important;
}

.home-dice-mark {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 2px solid #111111;
  border-radius: 16px;
  background: #f7cf45;
  font-size: 28px;
  transform: rotate(-7deg);
}

.home-cover-copy {
  display: grid;
  gap: 6px;
}

.home-cover-copy h2 {
  margin: 0;
  color: #111111;
  font-size: clamp(34px, 11vw, 52px);
  font-weight: 1000;
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.home-cover-copy p {
  margin: 0;
  max-width: 280px;
  color: #4b5563;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.home-cover-copy .home-tutorial-line {
  color: #6f4e22;
  font-size: 12px;
}

.home-run-preview {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(17, 17, 17, 0.2);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
}

.home-stage-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: #111111;
}

.home-stage-line span {
  color: #6b7280;
  font-size: 13px;
  font-weight: 900;
}

.home-stage-line strong {
  min-width: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 1000;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.home-stat-row span {
  min-width: 0;
  padding: 7px 6px;
  border-radius: 12px;
  background: #111111;
  color: #ffffff;
  font-size: 13px;
  font-weight: 1000;
  text-align: center;
  white-space: nowrap;
}

.home-stat-row b {
  font-weight: 1000;
}

.home-start-career {
  margin: 0;
  color: #4b5563;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.35;
}

.home-start-btn {
  min-height: 56px !important;
  border-radius: 16px !important;
  font-size: 19px !important;
  font-weight: 1000 !important;
}

.home-quick-panel,
.home-dev-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.home-quick-panel h3,
.home-dev-panel h3 {
  margin: 0;
  color: #111111;
  font-size: 15px;
  font-weight: 1000;
}

.home-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.home-dev-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.home-dev-panel {
  opacity: 0.86;
}

.home-mode-entry,
.home-dev-btn {
  min-width: 0;
  overflow: hidden;
  min-height: 44px;
  padding: 8px 8px !important;
  border-radius: 13px !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 380px), (max-height: 690px) {
  .home-page.game-home {
    gap: 8px !important;
    padding-top: 8px !important;
  }

  .home-roguelite-cover {
    gap: 9px;
    padding: 12px 10px;
  }

  .home-rule-chip {
    min-height: 30px !important;
    padding: 6px 9px !important;
    font-size: 12px !important;
  }

  .home-dice-mark {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }

  .home-cover-copy h2 {
    font-size: clamp(30px, 10vw, 42px);
  }

  .home-cover-copy p {
    font-size: 13px;
  }

  .home-run-preview {
    gap: 8px;
    padding: 10px;
  }

  .home-start-btn {
    min-height: 50px !important;
    font-size: 17px !important;
  }

  .home-quick-panel,
  .home-dev-panel {
    gap: 8px;
    padding: 10px;
  }

  .home-mode-entry,
  .home-dev-btn {
    min-height: 38px !important;
    font-size: 12px !important;
  }
}
</style>
