<script setup lang="ts">
import { characterList, ROGUELITE_PLAYER_START } from "@career-war/shared";
import { onUnmounted, ref } from "vue";
import { hasDoneRogueliteTutorial } from "../tutorial/rogueliteTutorial";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import cardRogueUrl from "../assets/art/homepage/card_rogue.png";
import cardTrainingUrl from "../assets/art/homepage/card_training.png";
import cardVersusUrl from "../assets/art/homepage/card_versus.png";
import diceOneUrl from "../assets/art/homepage/dice_1.png";
import propCandleUrl from "../assets/art/homepage/prop_candle.png";
import propTankardUrl from "../assets/art/homepage/prop_tankard.png";
import rogueliteObjectUrl from "../assets/art/homepage/roguelite_object.png";
import tavernTableUrl from "../assets/art/homepage/tavern_table.webp";

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
const showDevTools = ref(false);
const isRolling = ref(false);
let rollingTimer: number | undefined;
const rogueliteStartCharacter = characterList.find((item) => item.id === ROGUELITE_PLAYER_START.characterId);
const rogueliteStartHp = rogueliteStartCharacter?.maxHp ?? 20;
const rogueliteStartName = rogueliteStartCharacter?.name ?? "拳手";
const showRogueliteTutorialIntro = !hasDoneRogueliteTutorial();

const homepageArtVars = {
  "--home-tavern-table": `url(${tavernTableUrl})`,
  "--home-card-rogue": `url(${cardRogueUrl})`,
  "--home-card-versus": `url(${cardVersusUrl})`,
  "--home-card-training": `url(${cardTrainingUrl})`,
};

function handleDiceClick() {
  if (isRolling.value) return;

  isRolling.value = true;
  rollingTimer = window.setTimeout(() => {
    isRolling.value = false;
    rollingTimer = undefined;
    emit("selectRoguelite");
  }, 850);
}

onUnmounted(() => {
  if (rollingTimer !== undefined) {
    window.clearTimeout(rollingTimer);
  }
});
</script>

<template>
  <section class="home-page game-home" :style="homepageArtVars">
    <section class="home-roguelite-cover" aria-labelledby="home-roguelite-title">
      <div v-if="editorUiEnabled" class="home-dev-corner">
        <button class="home-dev-toggle" type="button" :aria-expanded="showDevTools" aria-label="打开编辑工具" @click="showDevTools = !showDevTools">⚙</button>
        <div v-if="showDevTools" class="home-dev-popover">
          <button type="button" @click="emit('selectEditor')">肉鸽数据</button>
          <button type="button" @click="emit('selectCharacterEditor')">职业编辑</button>
        </div>
      </div>

      <div class="home-cover-head">
        <span class="home-cover-kicker">酒馆委托</span>
        <div class="home-cover-tools">
          <button class="ghost-btn home-rule-chip" type="button" @click="showRules = true">规则</button>
          <span class="home-dice-mark" aria-hidden="true">
            <img :src="diceOneUrl" alt="" />
          </span>
        </div>
      </div>
      <div class="home-cover-copy">
        <h2 id="home-roguelite-title">酒馆委托</h2>
        <p>投下命运骰，接下这局冒险。</p>
        <p v-if="showRogueliteTutorialIntro" class="home-tutorial-line">首次挑战会带你熟悉路线、战斗和词条。</p>
      </div>
      <button
        class="home-table-focus fate-dice-cta"
        :class="{ 'is-rolling': isRolling }"
        type="button"
        aria-label="点击命运骰，接下这局冒险"
        :disabled="isRolling"
        @click="handleDiceClick"
      >
        <img class="home-main-object" :src="rogueliteObjectUrl" alt="" />
        <img class="home-prop home-prop-candle" :src="propCandleUrl" alt="" />
        <img class="home-prop home-prop-tankard" :src="propTankardUrl" alt="" />
        <span class="home-table-hint">点击命运骰，接下这局冒险</span>
      </button>
      <div class="home-run-strip" aria-label="本局预览">
        <span>第 1 局</span>
        <span>{{ rogueliteStartName }}</span>
        <span>HP {{ rogueliteStartHp }}</span>
        <span>金币 0</span>
        <span>祝福 0</span>
      </div>
    </section>

    <section class="home-quick-panel" aria-label="其他入口">
      <div class="home-quick-grid">
        <button class="secondary-btn home-mode-entry home-mode-entry--training" type="button" @click="emit('selectPve')">
          <span>人机练习</span>
        </button>
        <button class="secondary-btn home-mode-entry home-mode-entry--versus" type="button" @click="emit('selectPvp')">
          <span>经典对战</span>
        </button>
        <button class="ghost-btn home-mode-entry home-mode-entry--profile" type="button" @click="emit('selectProfile')">
          <span>玩家档案</span>
        </button>
      </div>
    </section>

    <RuleGuideDialog v-if="showRules" mode="roguelite" @close="showRules = false" />
  </section>
</template>

<style scoped>
.home-page.game-home {
  display: grid !important;
  grid-template-rows: minmax(0, 1fr) auto !important;
  gap: 6px !important;
  min-height: 0;
  height: calc(100svh - 80px);
  padding: 0 0 4px !important;
}

.home-roguelite-cover,
.home-quick-panel {
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
  gap: 9px;
  min-height: 0;
  overflow: hidden;
  padding: 12px 12px 11px;
  background:
    linear-gradient(180deg, rgba(15, 10, 6, 0.04), rgba(15, 10, 6, 0.26)),
    var(--home-tavern-table) center / cover no-repeat,
    #4b2a14;
}

.home-roguelite-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 0;
  border-radius: 12px;
  background:
    radial-gradient(circle at 52% 46%, rgba(255, 199, 88, 0.22), transparent 30%),
    radial-gradient(circle at 50% 100%, rgba(0, 0, 0, 0.30), transparent 46%);
  pointer-events: none;
}

.home-dev-corner {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 4;
}

.home-dev-toggle {
  display: grid;
  place-items: center;
  width: 28px;
  min-height: 28px;
  border: 1px solid rgba(255, 231, 162, 0.28);
  border-radius: 999px;
  padding: 0;
  background: rgba(34, 20, 10, 0.58);
  color: rgba(255, 243, 194, 0.78);
  font-size: 11px;
  font-weight: 900;
}

.home-dev-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  display: grid;
  gap: 5px;
  min-width: 106px;
  border: 1px solid rgba(255, 231, 162, 0.24);
  border-radius: 10px;
  padding: 6px;
  background: rgba(34, 20, 10, 0.88);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.26);
}

.home-dev-popover button {
  border: 0;
  border-radius: 7px;
  padding: 6px 8px;
  background: rgba(255, 247, 220, 0.08);
  color: #fff3c2;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
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
  min-height: 24px;
  border: 2px solid rgba(255, 231, 162, 0.42);
  border-radius: 999px;
  padding: 0 9px;
  background: rgba(48, 28, 13, 0.76);
  color: #fff3c2;
  font-size: 13px;
  font-weight: 1000;
}

.home-rule-chip {
  min-height: 28px !important;
  padding: 5px 10px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  font-weight: 1000 !important;
}

.home-dice-mark {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform: rotate(-7deg);
}

.home-dice-mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.home-cover-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
}

.home-cover-copy h2 {
  margin: 0;
  color: #fff0b8;
  font-size: clamp(32px, 9vw, 46px);
  font-weight: 1000;
  line-height: 1;
  letter-spacing: 0;
  text-shadow: 0 2px 0 rgba(47, 24, 9, 0.9), 0 12px 26px rgba(0, 0, 0, 0.44);
}

.home-cover-copy p {
  margin: 0;
  max-width: 260px;
  color: #f7d89d;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
}

.home-cover-copy .home-tutorial-line {
  color: #ffd98f;
  font-size: 11px;
}

.home-table-focus {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  min-height: clamp(112px, 20vh, 154px);
  border: 0;
  border-radius: 18px;
  padding: 0;
  background: radial-gradient(circle at 50% 54%, rgba(255, 200, 86, 0.20), transparent 47%);
  cursor: pointer;
  overflow: hidden;
  outline: none;
}

.home-table-focus::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 52%;
  width: min(44vw, 164px);
  height: min(44vw, 164px);
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 207, 96, 0.24), transparent 64%);
  transform: translate(-50%, -50%);
  animation: homeDicePulse 2.8s ease-in-out infinite;
  pointer-events: none;
}

.home-table-focus::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 66%;
  width: min(34vw, 142px);
  height: min(9vw, 34px);
  border: 2px solid rgba(255, 217, 108, 0.0);
  border-radius: 999px;
  box-shadow: 0 0 0 rgba(255, 217, 108, 0);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.home-table-focus:disabled {
  cursor: wait;
}

.home-table-focus:focus-visible {
  box-shadow: 0 0 0 3px rgba(255, 231, 162, 0.45);
}

.home-main-object {
  position: absolute;
  left: 50%;
  top: 48%;
  width: min(36vw, 150px);
  max-width: 42%;
  transform: translate(-50%, -50%);
  filter:
    drop-shadow(0 4px 0 rgba(0, 0, 0, 0.55))
    drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35));
  image-rendering: pixelated;
  transition: transform 150ms ease, filter 150ms ease;
}

.fate-dice-cta .home-main-object {
  animation: homeDiceBreath 2.8s ease-in-out infinite;
}

.home-table-focus:hover .home-main-object,
.home-table-focus:focus-visible .home-main-object {
  transform: translate(-50%, -52%) scale(1.04);
  filter:
    drop-shadow(0 4px 0 rgba(0, 0, 0, 0.55))
    drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35))
    drop-shadow(0 0 14px rgba(255, 195, 80, 0.85));
}

.fate-dice-cta.is-rolling::before {
  animation: homeDicePulse 0.85s ease-in-out forwards;
}

.fate-dice-cta.is-rolling::after {
  animation: homeDiceRing 0.85s ease-in-out forwards;
}

.fate-dice-cta.is-rolling .home-main-object {
  animation: fateDiceRoll 0.85s ease-in-out forwards;
}

.home-prop {
  position: absolute;
  width: 48px;
  opacity: 0.92;
  filter:
    drop-shadow(0 3px 0 rgba(0, 0, 0, 0.50))
    drop-shadow(0 1px 0 rgba(0, 0, 0, 0.30));
  image-rendering: pixelated;
}

.home-prop-candle {
  left: 8%;
  bottom: 7%;
}

.home-prop-tankard {
  right: 9%;
  bottom: 9%;
}

.home-table-hint {
  position: absolute;
  left: 50%;
  bottom: 2px;
  z-index: 2;
  border: 1px solid rgba(255, 231, 162, 0.34);
  border-radius: 999px;
  padding: 3px 9px;
  background: rgba(36, 20, 9, 0.62);
  color: #ffe8a7;
  font-size: 11px;
  font-weight: 1000;
  transform: translateX(-50%);
  pointer-events: none;
}

.home-run-strip {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 6px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 231, 162, 0.24);
  border-radius: 999px;
  background: rgba(42, 25, 13, 0.42);
  color: rgba(255, 238, 187, 0.92);
  font-size: 11px;
  font-weight: 900;
  text-align: center;
  backdrop-filter: blur(2px);
}

.home-run-strip span:not(:last-child)::after {
  content: "·";
  margin-left: 6px;
  color: rgba(255, 231, 162, 0.42);
}

.home-quick-panel,
.home-dev-panel {
  display: grid;
  gap: 6px;
  padding: 3px 8px 0;
}

.home-quick-panel {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.home-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 11px;
  align-items: center;
}

.home-mode-entry,
.home-dev-btn {
  min-width: 0;
  overflow: visible;
  min-height: 36px;
  padding: 6px 7px !important;
  border-radius: 13px !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-mode-entry {
  position: relative;
  isolation: isolate;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #2b1708 !important;
  opacity: 0.92;
}

.home-mode-entry::before {
  content: "";
  position: absolute;
  inset: -8px -10px;
  z-index: -1;
  background: var(--mode-card-bg) center / 100% 100% no-repeat;
  filter: drop-shadow(0 4px 0 rgba(45, 36, 21, 0.52));
}

.home-mode-entry--training {
  transform: rotate(-2deg);
}

.home-mode-entry--versus {
  transform: rotate(1.5deg) translateY(-2px);
}

.home-mode-entry--profile {
  transform: rotate(-1deg);
}

.home-mode-entry span {
  position: relative;
  z-index: 1;
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-mode-entry--training {
  --mode-card-bg: var(--home-card-training);
}

.home-mode-entry--versus {
  --mode-card-bg: var(--home-card-versus);
}

.home-mode-entry--profile {
  --mode-card-bg: var(--home-card-training);
}

@keyframes homeDicePulse {
  0%,
  100% {
    opacity: 0.54;
    transform: translate(-50%, -50%) scale(0.94);
  }

  50% {
    opacity: 0.92;
    transform: translate(-50%, -50%) scale(1.06);
  }
}

@keyframes homeDiceBreath {
  0%,
  100% {
    filter:
      drop-shadow(0 4px 0 rgba(0, 0, 0, 0.55))
      drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35))
      drop-shadow(0 0 8px rgba(255, 196, 76, 0.36));
  }

  50% {
    filter:
      drop-shadow(0 4px 0 rgba(0, 0, 0, 0.55))
      drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35))
      drop-shadow(0 0 15px rgba(255, 204, 88, 0.62));
  }
}

@keyframes fateDiceRoll {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
    filter: drop-shadow(0 0 10px rgba(255, 190, 80, 0.60));
  }

  20% {
    transform: translate(-50%, -53%) rotate(-12deg) scale(1.08);
  }

  45% {
    transform: translate(-50%, -50%) rotate(18deg) scale(1.12);
    filter: drop-shadow(0 0 26px rgba(255, 215, 100, 1));
  }

  70% {
    transform: translate(-50%, -52%) rotate(-8deg) scale(1.06);
  }

  100% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
    filter: drop-shadow(0 0 34px rgba(255, 225, 120, 1));
  }
}

@keyframes homeDiceRing {
  0% {
    border-color: rgba(255, 217, 108, 0);
    box-shadow: 0 0 0 rgba(255, 217, 108, 0);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.84);
  }

  45% {
    border-color: rgba(255, 225, 120, 0.80);
    box-shadow: 0 0 22px rgba(255, 211, 91, 0.80);
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.04);
  }

  100% {
    border-color: rgba(255, 225, 120, 0.36);
    box-shadow: 0 0 32px rgba(255, 211, 91, 0.56);
    opacity: 0.72;
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (max-width: 380px), (max-height: 690px) {
  .home-page.game-home {
    gap: 5px !important;
    height: calc(100svh - 72px);
    padding-top: 0 !important;
  }

  .home-roguelite-cover {
    gap: 9px;
    padding: 12px 10px;
  }

  .home-table-focus {
    min-height: clamp(104px, 18vh, 124px);
  }

  .home-main-object {
    width: min(31vw, 118px);
  }

  .home-prop {
    width: 38px;
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

  .home-run-strip {
    padding: 3px 6px;
    font-size: 10px;
  }

  .home-quick-panel,
  .home-dev-panel {
    gap: 5px;
    padding: 3px 8px 0;
  }

  .home-mode-entry,
  .home-dev-btn {
    min-height: 34px !important;
    font-size: 12px !important;
  }
}
</style>
