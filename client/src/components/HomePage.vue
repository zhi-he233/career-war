<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { hasDoneRogueliteTutorial } from "../tutorial/rogueliteTutorial";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import tabletopCardPveUrl from "../assets/art/homepage/tabletop_card_pve.png";
import tabletopCardProfileUrl from "../assets/art/homepage/tabletop_card_profile.png";
import tabletopCardPvpUrl from "../assets/art/homepage/tabletop_card_pvp.png";
import tabletopCandleUrl from "../assets/art/homepage/tabletop_candle.png";
import tabletopCoinPouchUrl from "../assets/art/homepage/tabletop_coin_pouch.png";
import tabletopDiceUrl from "../assets/art/homepage/tabletop_dice.png";
import tabletopMugUrl from "../assets/art/homepage/tabletop_mug.png";
import tabletopRulebookUrl from "../assets/art/homepage/tabletop_rulebook.png";
import tabletopTableUrl from "../assets/art/homepage/tabletop_table.webp";

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
const tappedProp = ref<"candle" | "mug" | "coin" | null>(null);
const currentDiceImage = ref(tabletopDiceUrl);
const diceRollFrameModules = import.meta.glob("../assets/art/homepage/tabletop_dice_roll_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const diceRollFrames = Object.entries(diceRollFrameModules)
  .sort(([a], [b]) => a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" }))
  .map(([, src]) => src);
let rollTimers: number[] = [];
let propTapTimer: number | undefined;

const showRogueliteTutorialIntro = !hasDoneRogueliteTutorial();

const homepageArtVars = {
  "--home-tabletop-table": `url(${tabletopTableUrl})`,
};

diceRollFrames.forEach((src) => {
  const image = new Image();
  image.src = src;
});

function handleDiceClick() {
  if (isRolling.value) return;

  isRolling.value = true;
  clearRollTimers();

  const frames = diceRollFrames.length > 0 ? diceRollFrames : [tabletopDiceUrl];
  frames.forEach((frame, index) => {
    const timer = window.setTimeout(() => {
      currentDiceImage.value = frame;
    }, index * 82);
    rollTimers.push(timer);
  });

  const finishTimer = window.setTimeout(() => {
    currentDiceImage.value = tabletopDiceUrl;
    isRolling.value = false;
    emit("selectRoguelite");
  }, frames.length * 82 + 140);
  rollTimers.push(finishTimer);
}

function clearRollTimers() {
  rollTimers.forEach((id) => window.clearTimeout(id));
  rollTimers = [];
}

function handlePropTap(prop: "candle" | "mug" | "coin") {
  tappedProp.value = prop;

  if (propTapTimer !== undefined) {
    window.clearTimeout(propTapTimer);
  }

  propTapTimer = window.setTimeout(() => {
    tappedProp.value = null;
    propTapTimer = undefined;
  }, 420);
}

onUnmounted(() => {
  clearRollTimers();

  if (propTapTimer !== undefined) {
    window.clearTimeout(propTapTimer);
  }
});
</script>

<template>
  <section class="home-page game-home" :style="homepageArtVars">
    <section class="home-table-scene" aria-labelledby="home-roguelite-title">
      <div v-if="editorUiEnabled" class="home-dev-corner">
        <button class="home-dev-toggle" type="button" :aria-expanded="showDevTools" aria-label="打开编辑工具" @click="showDevTools = !showDevTools">⚙</button>
        <div v-if="showDevTools" class="home-dev-popover">
          <button type="button" @click="emit('selectEditor')">肉鸽数据</button>
          <button type="button" @click="emit('selectCharacterEditor')">职业编辑</button>
        </div>
      </div>

      <div class="home-cover-copy home-table-title">
        <span class="home-cover-kicker">酒馆委托</span>
        <h2 id="home-roguelite-title">酒馆委托</h2>
        <p>投下命运骰，接下这局冒险。</p>
        <p v-if="showRogueliteTutorialIntro" class="home-tutorial-line">首次挑战会带你熟悉路线、战斗和词条。</p>
      </div>

      <button
        class="home-table-object home-dice-cta"
        :class="{ 'is-rolling': isRolling }"
        type="button"
        aria-label="点击命运骰，接下这局冒险"
        :disabled="isRolling"
        @click="handleDiceClick"
      >
        <img class="home-dice-img" :src="currentDiceImage" alt="命运骰" />
      </button>

      <button class="home-table-object home-card-entry home-card-entry--pvp" type="button" @click="emit('selectPvp')">
        <img :src="tabletopCardPvpUrl" alt="经典对战" />
      </button>

      <button class="home-table-object home-card-entry home-card-entry--pve" type="button" @click="emit('selectPve')">
        <img :src="tabletopCardPveUrl" alt="人机练习" />
      </button>

      <button class="home-table-object home-card-entry home-card-entry--profile" type="button" @click="emit('selectProfile')">
        <img :src="tabletopCardProfileUrl" alt="玩家档案" />
      </button>

      <button class="home-table-object home-rulebook" type="button" aria-label="查看规则" @click="showRules = true">
        <img :src="tabletopRulebookUrl" alt="" />
        <span>规则</span>
      </button>

      <button
        class="home-table-object home-prop-button home-prop-candle"
        :class="{ 'is-tapped': tappedProp === 'candle' }"
        type="button"
        aria-label="拨动蜡烛"
        @click="handlePropTap('candle')"
      >
        <img class="home-prop-img" :src="tabletopCandleUrl" alt="" />
      </button>
      <button
        class="home-table-object home-prop-button home-prop-mug"
        :class="{ 'is-tapped': tappedProp === 'mug' }"
        type="button"
        aria-label="轻碰酒杯"
        @click="handlePropTap('mug')"
      >
        <img class="home-prop-img" :src="tabletopMugUrl" alt="" />
      </button>
      <button
        class="home-table-object home-prop-button home-prop-coin"
        :class="{ 'is-tapped': tappedProp === 'coin' }"
        type="button"
        aria-label="摇晃钱袋"
        @click="handlePropTap('coin')"
      >
        <img class="home-prop-img" :src="tabletopCoinPouchUrl" alt="" />
      </button>
    </section>

    <RuleGuideDialog v-if="showRules" mode="roguelite" @close="showRules = false" />
  </section>
</template>

<style scoped>
.home-page.game-home {
  display: block !important;
  min-height: 0;
  height: calc(100svh - 58px);
  padding: 0 !important;
}

.home-table-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 2px solid rgba(29, 18, 9, 0.92);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.16)),
    var(--home-tabletop-table) center / cover no-repeat,
    #2a1609;
  box-shadow:
    0 5px 0 rgba(29, 18, 9, 0.72),
    0 18px 28px rgba(29, 18, 9, 0.30);
  isolation: isolate;
}

.home-table-scene::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 47%, rgba(255, 191, 78, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.10), transparent 22%, rgba(0, 0, 0, 0.18));
  pointer-events: none;
  z-index: 0;
}

.home-dev-corner {
  position: absolute;
  top: 9px;
  right: 9px;
  z-index: 20;
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

.home-cover-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  min-height: 22px;
  border: 2px solid rgba(255, 231, 162, 0.42);
  border-radius: 999px;
  padding: 0 10px;
  background: rgba(48, 28, 13, 0.64);
  color: #fff3c2;
  font-size: 12px;
  font-weight: 1000;
}

.home-cover-copy {
  position: absolute;
  left: 50%;
  top: 19%;
  z-index: 8;
  display: grid;
  gap: 4px;
  width: min(76%, 340px);
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.home-cover-copy h2 {
  margin: 0;
  color: #f8d77d;
  font-size: clamp(28px, 8.6vw, 46px);
  font-weight: 1000;
  line-height: 0.98;
  letter-spacing: 0;
  text-shadow:
    0 2px 0 rgba(54, 25, 8, 0.96),
    0 10px 18px rgba(0, 0, 0, 0.42);
}

.home-cover-copy p {
  margin: 0;
  color: #f7d89d;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.home-cover-copy .home-tutorial-line {
  color: #ffd98f;
  font-size: 11px;
}

.home-table-object {
  position: absolute;
  z-index: 5;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.home-table-object img {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  pointer-events: none;
  user-select: none;
}

.home-table-object:focus-visible {
  filter: drop-shadow(0 0 12px rgba(255, 225, 136, 0.9));
}

.home-dice-cta {
  left: 50%;
  top: 52%;
  z-index: 10;
  width: clamp(132px, 31vw, 188px);
  min-width: 120px;
  min-height: 120px;
  transform: translate(-50%, -50%);
}

.home-dice-cta::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 70%;
  width: 118%;
  height: 44%;
  border-radius: 999px;
  background:
    radial-gradient(ellipse, rgba(255, 192, 73, 0.34), transparent 56%),
    radial-gradient(ellipse, rgba(0, 0, 0, 0.34), transparent 70%);
  transform: translate(-50%, -50%);
  animation: dice-ring-pulse 2.6s ease-in-out infinite;
  pointer-events: none;
}

.home-dice-cta::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 70%;
  width: 90%;
  height: 28%;
  border: 2px solid rgba(255, 220, 116, 0);
  border-radius: 999px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.home-dice-cta:disabled {
  cursor: wait;
}

.home-dice-img {
  position: relative;
  z-index: 1;
  filter:
    drop-shadow(0 8px 7px rgba(0, 0, 0, 0.38))
    drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28))
    drop-shadow(0 0 12px rgba(255, 198, 77, 0.40));
  transition: transform 180ms ease, filter 180ms ease;
  animation: dice-idle-glow 2.8s ease-in-out infinite;
}

.home-dice-cta:hover .home-dice-img,
.home-dice-cta:focus-visible .home-dice-img {
  transform: translateY(-5px) scale(1.04);
  filter:
    drop-shadow(0 8px 7px rgba(0, 0, 0, 0.38))
    drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28))
    drop-shadow(0 0 22px rgba(255, 210, 91, 0.85));
}

.home-dice-cta.is-rolling::after {
  animation: dice-cast-ring 0.85s ease-in-out forwards;
}

.home-dice-cta.is-rolling .home-dice-img {
  animation: dice-roll-body 0.9s ease-in-out both;
  filter:
    drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35))
    drop-shadow(0 0 28px rgba(255, 215, 90, 1));
}

.home-card-entry {
  width: clamp(96px, 25vw, 150px);
  min-height: 96px;
}

.home-card-entry img {
  filter:
    drop-shadow(0 4px 0 rgba(0, 0, 0, 0.30))
    drop-shadow(0 10px 16px rgba(0, 0, 0, 0.18));
  transition: transform 150ms ease, filter 150ms ease;
}

.home-card-entry:hover img,
.home-card-entry:focus-visible img {
  filter:
    drop-shadow(0 4px 0 rgba(0, 0, 0, 0.30))
    drop-shadow(0 0 16px rgba(255, 219, 128, 0.64));
  transform: translateY(-4px);
}

.home-card-entry--pvp {
  left: 19%;
  top: 37%;
  transform: translate(-50%, -50%) rotate(-8deg);
}

.home-card-entry--pve {
  left: 20%;
  top: 61%;
  transform: translate(-50%, -50%) rotate(-10deg);
}

.home-card-entry--profile {
  left: 80%;
  top: 37%;
  transform: translate(-50%, -50%) rotate(8deg);
}

.home-rulebook {
  left: 82%;
  top: 83%;
  z-index: 8;
  width: clamp(82px, 21vw, 126px);
  transform: translate(-50%, -50%) rotate(-2deg);
}

.home-rulebook img {
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.24));
  transition: transform 150ms ease, filter 150ms ease;
}

.home-rulebook span {
  position: absolute;
  left: 47%;
  top: 50%;
  color: #ffb85d;
  font-size: clamp(14px, 3.8vw, 21px);
  font-weight: 1000;
  text-shadow: 0 2px 0 rgba(40, 19, 4, 0.74);
  transform: translate(-50%, -50%) rotate(2deg);
  pointer-events: none;
}

.home-rulebook:hover img,
.home-rulebook:focus-visible img {
  filter:
    drop-shadow(0 6px 8px rgba(0, 0, 0, 0.24))
    drop-shadow(0 0 14px rgba(255, 199, 93, 0.60));
  transform: translateY(-3px);
}

.home-prop-button {
  cursor: pointer;
}

.home-prop-img {
  filter: drop-shadow(0 5px 8px rgba(0, 0, 0, 0.24));
  transition: transform 150ms ease, filter 150ms ease;
}

.home-prop-button:hover .home-prop-img,
.home-prop-button:focus-visible .home-prop-img {
  transform: translateY(-3px);
  filter:
    drop-shadow(0 5px 8px rgba(0, 0, 0, 0.24))
    drop-shadow(0 0 12px rgba(255, 210, 104, 0.50));
}

.home-prop-button.is-tapped .home-prop-img {
  animation: prop-table-tap 420ms ease both;
}

.home-prop-candle {
  left: 16%;
  top: 86%;
  z-index: 7;
  width: clamp(58px, 15vw, 90px);
  transform: translate(-50%, -50%);
}

.home-prop-mug {
  left: 31%;
  top: 88%;
  z-index: 7;
  width: clamp(64px, 17vw, 102px);
  transform: translate(-50%, -50%) rotate(-2deg);
}

.home-prop-coin {
  left: 71%;
  top: 89%;
  z-index: 9;
  width: clamp(58px, 15vw, 90px);
  transform: translate(-50%, -50%) rotate(8deg);
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
      drop-shadow(0 8px 7px rgba(0, 0, 0, 0.38))
      drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28))
      drop-shadow(0 0 8px rgba(255, 196, 76, 0.36));
  }
  50% {
    filter:
      drop-shadow(0 8px 7px rgba(0, 0, 0, 0.38))
      drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28))
      drop-shadow(0 0 16px rgba(255, 204, 88, 0.66));
  }
}

@keyframes dice-roll-body {
  0% {
    transform: rotate(0deg) scale(1);
  }
  20% {
    transform: rotate(-12deg) scale(1.08) translateY(-5px);
  }
  45% {
    transform: rotate(18deg) scale(1.12) translateY(2px);
  }
  70% {
    transform: rotate(-8deg) scale(1.06) translateY(-3px);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}

@keyframes prop-table-tap {
  0% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  35% {
    transform: translateY(-6px) rotate(-4deg) scale(1.06);
    filter:
      drop-shadow(0 5px 8px rgba(0, 0, 0, 0.24))
      drop-shadow(0 0 16px rgba(255, 218, 113, 0.72));
  }
  70% {
    transform: translateY(1px) rotate(3deg) scale(0.99);
  }
  100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

@keyframes dice-cast-ring {
  0% {
    border-color: rgba(255, 217, 108, 0);
    box-shadow: 0 0 0 rgba(255, 217, 108, 0);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.82);
  }
  45% {
    border-color: rgba(255, 225, 120, 0.82);
    box-shadow: 0 0 24px rgba(255, 211, 91, 0.86);
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.06);
  }
  100% {
    border-color: rgba(255, 225, 120, 0.36);
    box-shadow: 0 0 34px rgba(255, 211, 91, 0.58);
    opacity: 0.72;
    transform: translate(-50%, -50%) scale(1);
  }
}

@media (max-width: 380px), (max-height: 690px) {
  .home-page.game-home {
    height: calc(100svh - 52px);
  }

  .home-cover-copy {
    top: 17%;
  }

  .home-cover-copy h2 {
    font-size: clamp(25px, 8vw, 36px);
  }

  .home-cover-copy p {
    font-size: 11px;
  }

  .home-dice-cta {
    top: 50%;
    width: clamp(112px, 29vw, 142px);
  }

  .home-card-entry {
    width: clamp(82px, 23vw, 118px);
  }

}
</style>
