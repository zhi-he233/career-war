<script setup lang="ts">
import { characterList, ROGUELITE_PLAYER_START } from "@career-war/shared";
import { onUnmounted, ref } from "vue";
import { hasDoneRogueliteTutorial } from "../tutorial/rogueliteTutorial";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import cardRogueUrl from "../assets/art/homepage/card_rogue.png";
import cardTrainingUrl from "../assets/art/homepage/card_training.png";
import cardVersusUrl from "../assets/art/homepage/card_versus.png";
import dice1Url from "../assets/art/homepage/dice_1.png";
import dice2Url from "../assets/art/homepage/dice_2.png";
import dice3Url from "../assets/art/homepage/dice_3.png";
import dice4Url from "../assets/art/homepage/dice_4.png";
import dice5Url from "../assets/art/homepage/dice_5.png";
import dice6Url from "../assets/art/homepage/dice_6.png";
import propCandleUrl from "../assets/art/homepage/prop_candle.png";
import propTankardUrl from "../assets/art/homepage/prop_tankard.png";
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

const diceFaces = [dice1Url, dice2Url, dice3Url, dice4Url, dice5Url, dice6Url];
const currentDiceFace = ref(dice1Url);
const isRolling = ref(false);
let rollTimers: number[] = [];

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

function preloadDiceFaces() {
  diceFaces.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

function clearRollTimers() {
  rollTimers.forEach((id) => window.clearTimeout(id));
  rollTimers = [];
}

function pickRandomFace(except?: string) {
  const pool = except ? diceFaces.filter((face) => face !== except) : diceFaces;
  return pool[Math.floor(Math.random() * pool.length)];
}

function handleDiceClick() {
  if (isRolling.value) return;

  isRolling.value = true;
  clearRollTimers();

  const intervals = [60, 65, 70, 80, 95, 120, 160, 220, 300];
  let elapsed = 0;

  intervals.forEach((delay, index) => {
    elapsed += delay;
    const timer = window.setTimeout(() => {
      const isLast = index === intervals.length - 1;

      if (isLast) {
        currentDiceFace.value = diceFaces[Math.floor(Math.random() * diceFaces.length)];

        window.setTimeout(() => {
          isRolling.value = false;
          emit("selectRoguelite");
        }, 180);

        return;
      }

      currentDiceFace.value = pickRandomFace(currentDiceFace.value);
    }, elapsed);

    rollTimers.push(timer);
  });
}

preloadDiceFaces();

onUnmounted(() => {
  clearRollTimers();
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
            <img :src="dice1Url" alt="" />
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
        <img class="home-fate-dice" :class="{ 'is-rolling': isRolling }" :src="currentDiceFace" alt="命运骰" />
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
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.home-table-focus::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 52%;
  width: min(44vw, 164px);
  height: min(44vw, 164px);
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 207, 96, 0.20), transparent 62%);
  transform: translate(-50%, -50%);
  animation: dice-ring-pulse 2.8s ease-in-out infinite;
  pointer-events: none;
}

.home-table-focus:disabled {
  cursor: wait;
}

/* ── fate dice: single element, amber-warmed to match tavern ── */
.home-fate-dice {
  position: absolute;
  left: 50%;
  top: 44%;
  width: min(26vw, 110px);
  max-width: 36%;
  transform: translate(-50%, -50%);
  image-rendering: pixelated;
  filter:
    sepia(0.45)
    saturate(1.6)
    brightness(1.15)
    drop-shadow(0 4px 0 rgba(0, 0, 0, 0.52))
    drop-shadow(0 2px 0 rgba(0, 0, 0, 0.30));
  transition: transform 180ms ease, filter 180ms ease;
  animation: dice-idle-glow 2.8s ease-in-out infinite;
}

.home-fate-dice:hover,
.home-table-focus:focus-visible .home-fate-dice {
  filter:
    sepia(0.40)
    saturate(1.7)
    brightness(1.22)
    drop-shadow(0 4px 0 rgba(0, 0, 0, 0.52))
    drop-shadow(0 2px 0 rgba(0, 0, 0, 0.30))
    drop-shadow(0 0 16px rgba(255, 205, 90, 0.88));
  transform: translate(-50%, -54%) scale(1.06);
}

/* rolling: face-switching via JS, CSS only adds body shake + heavy glow */
.home-fate-dice.is-rolling {
  animation: dice-roll-body 0.9s ease-in-out both;
  filter:
    sepia(0.35)
    saturate(1.8)
    brightness(1.25)
    drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35))
    drop-shadow(0 0 28px rgba(255, 215, 90, 1));
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

@keyframes dice-ring-pulse {
  0%,
  100% {
    opacity: 0.48;
    transform: translate(-50%, -50%) scale(0.94);
  }
  50% {
    opacity: 0.88;
    transform: translate(-50%, -50%) scale(1.06);
  }
}

@keyframes dice-idle-glow {
  0%,
  100% {
    filter:
      sepia(0.45) saturate(1.6) brightness(1.15)
      drop-shadow(0 4px 0 rgba(0, 0, 0, 0.52))
      drop-shadow(0 2px 0 rgba(0, 0, 0, 0.30))
      drop-shadow(0 0 8px rgba(255, 196, 76, 0.36));
  }
  50% {
    filter:
      sepia(0.45) saturate(1.6) brightness(1.15)
      drop-shadow(0 4px 0 rgba(0, 0, 0, 0.52))
      drop-shadow(0 2px 0 rgba(0, 0, 0, 0.30))
      drop-shadow(0 0 16px rgba(255, 204, 88, 0.66));
  }
}

@keyframes dice-roll-body {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  20% {
    transform: translate(-50%, -53%) rotate(-5deg) scale(1.04);
  }
  45% {
    transform: translate(-50%, -48%) rotate(6deg) scale(1.08);
  }
  70% {
    transform: translate(-50%, -51%) rotate(-3deg) scale(1.04);
  }
  100% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
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

  .home-fate-dice {
    width: min(22vw, 86px);
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
