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
        <span class="home-cover-kicker">冒险委托</span>
        <div class="home-cover-tools">
          <button class="ghost-btn home-rule-chip" type="button" @click="showRules = true">规则</button>
          <span class="home-dice-mark" aria-hidden="true"><span class="cw-icon cw-icon-dice"></span></span>
        </div>
      </div>
      <div class="home-cover-copy">
        <h2 id="home-roguelite-title">迷雾森林</h2>
        <p>投下命运骰，踏入第一段冒险。</p>
        <p v-if="showRogueliteTutorialIntro" class="home-tutorial-line">首次挑战会带你熟悉路线、战斗和词条。</p>
      </div>
      <div class="home-forest-mark" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="home-run-preview" aria-label="本局预览">
        <div class="home-stage-line">
          <span>第 1 关</span>
          <strong>迷雾森林</strong>
        </div>
        <div class="home-stat-row">
          <span><i class="cw-icon cw-icon-heart" aria-hidden="true"></i><b>HP</b> {{ rogueliteStartHp }}</span>
          <span><i class="cw-icon cw-icon-coin" aria-hidden="true"></i><b>金币</b> 0</span>
          <span><i class="cw-icon cw-icon-rune" aria-hidden="true"></i><b>祝福</b> 0</span>
        </div>
        <p class="home-start-career">初始职业：{{ rogueliteStartName }}</p>
      </div>
      <button class="primary-btn home-start-btn" type="button" @click="emit('selectRoguelite')">进入迷雾</button>
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
  gap: 12px !important;
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
  border: 2px solid rgba(45, 36, 21, 0.42);
  border-radius: 12px;
  padding: 6px 8px;
  background: rgba(255, 248, 223, 0.86);
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
  border: 2px solid var(--cw-table-line);
  border-radius: 16px;
  background: var(--cw-table-paper);
  box-shadow: var(--cw-table-shadow-soft);
}

.home-roguelite-cover {
  position: relative;
  display: grid;
  align-content: center;
  gap: 13px;
  min-height: 0;
  overflow: hidden;
  padding: 16px 14px 14px;
  background:
    linear-gradient(rgba(45, 36, 21, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 36, 21, 0.05) 1px, transparent 1px),
    radial-gradient(circle at 14% 8%, rgba(128, 81, 201, 0.16), transparent 24%),
    radial-gradient(circle at 92% 24%, rgba(36, 121, 200, 0.18), transparent 30%),
    linear-gradient(180deg, #fffbed 0%, #ecdca8 100%);
  background-size: 20px 20px, 20px 20px, auto, auto, auto;
}

.home-roguelite-cover::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 1px dashed rgba(45, 36, 21, 0.24);
  border-radius: 12px;
  pointer-events: none;
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
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 2px solid rgba(45, 36, 21, 0.42);
  border-radius: 999px;
  padding: 0 10px;
  background: rgba(255, 253, 240, 0.82);
  color: var(--cw-table-ink);
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
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 2px solid var(--cw-table-line);
  border-radius: 14px;
  background: linear-gradient(180deg, #fffef6 0%, #f2d87d 100%);
  color: var(--cw-type-fate);
  font-size: 28px;
  box-shadow: 0 4px 0 rgba(45, 36, 21, 0.54);
  transform: rotate(-7deg);
}

.home-cover-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
}

.home-cover-copy h2 {
  margin: 0;
  color: var(--cw-table-ink);
  font-size: clamp(36px, 10vw, 50px);
  font-weight: 1000;
  line-height: 1;
  letter-spacing: 0;
}

.home-cover-copy p {
  margin: 0;
  max-width: 280px;
  color: #5e4a2b;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.home-cover-copy .home-tutorial-line {
  color: #6f4e22;
  font-size: 12px;
}

.home-forest-mark {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-height: 48px;
  overflow: hidden;
  border: 2px solid rgba(45, 36, 21, 0.28);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 253, 240, 0.75) 0%, rgba(168, 196, 169, 0.30) 100%),
    linear-gradient(90deg, transparent 0 18%, rgba(45, 36, 21, 0.06) 18% 19%, transparent 19% 100%);
}

.home-forest-mark span {
  align-self: end;
  justify-self: center;
  width: 54px;
  height: 42px;
  background: #5f7f59;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  opacity: 0.72;
}

.home-forest-mark span:nth-child(2) {
  width: 70px;
  height: 52px;
  background: #496c50;
  opacity: 0.8;
}

.home-forest-mark span:nth-child(3) {
  background: #31526a;
  opacity: 0.5;
}

.home-run-preview {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 2px solid rgba(45, 36, 21, 0.30);
  border-radius: 12px;
  background: rgba(255, 253, 241, 0.74);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding: 7px 6px;
  border: 2px solid var(--cw-table-line);
  border-radius: 10px;
  background: #1d2734;
  color: #ffffff;
  font-size: 13px;
  font-weight: 1000;
  text-align: center;
  white-space: nowrap;
}

.home-stat-row .cw-icon {
  font-size: 12px;
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
  position: relative;
  z-index: 1;
  min-height: 58px !important;
  border-radius: 14px !important;
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
  opacity: 0.72;
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
