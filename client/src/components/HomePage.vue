<script setup lang="ts">
import { defineAsyncComponent, onUnmounted, ref } from "vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import HomeOverlay from "./home/HomeOverlay.vue";

type SceneMode = "roguelite" | "pvp" | "pve" | "profile" | "rules" | "editor" | "characters";

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
const revealed = ref(false);
const transitioning = ref(false);
const webglFailed = ref(false);
let transitionTimer: number | undefined;

const HomeCampScene = defineAsyncComponent(() => import("./home/HomeCampScene.vue"));

function revealScene(): void {
  if (transitioning.value) return;
  revealed.value = true;
}

function handleSceneSelect(mode: SceneMode): void {
  if (transitioning.value) return;
  if (mode === "rules") {
    showRules.value = true;
    return;
  }
  if (mode === "editor") {
    emit("selectEditor");
    return;
  }
  if (mode === "characters") {
    emit("selectCharacterEditor");
    return;
  }

  transitioning.value = true;
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    transitioning.value = false;
    if (mode === "roguelite") emit("selectRoguelite");
    if (mode === "pvp") emit("selectPvp");
    if (mode === "pve") emit("selectPve");
    if (mode === "profile") emit("selectProfile");
  }, 600);
}

onUnmounted(() => {
  window.clearTimeout(transitionTimer);
});
</script>

<template>
  <section class="home-page home-scene-page" :class="{ revealed, transitioning, 'webgl-failed': webglFailed }">
    <HomeCampScene
      :revealed="revealed"
      :transitioning="transitioning"
      @fail="webglFailed = true"
      @reveal="revealScene"
      @select="handleSceneSelect"
    />

    <div class="home-atmosphere" aria-hidden="true">
      <i class="mist mist-a"></i>
      <i class="mist mist-b"></i>
      <i class="mist mist-c"></i>
      <i class="mist mist-vignette"></i>
    </div>

    <HomeOverlay
      :player-name="playerName"
      :is-logged-in="isLoggedIn"
      :revealed="revealed"
      :transitioning="transitioning"
      :editor-ui-enabled="editorUiEnabled"
      @update-player-name="emit('updatePlayerName', $event)"
      @reveal="revealScene"
      @select="handleSceneSelect"
    />

    <div class="home-transition-fog" aria-hidden="true"></div>

    <RuleGuideDialog v-if="showRules" mode="roguelite" @close="showRules = false" />
  </section>
</template>

<style scoped>
.home-scene-page {
  position: relative;
  min-height: calc(100svh - 84px);
  height: min(780px, calc(100svh - 84px));
  overflow: hidden;
  border: 2px solid var(--cw-table-line);
  border-radius: 16px;
  background: #1c302d;
  box-shadow: var(--cw-table-shadow);
  isolation: isolate;
}

.home-atmosphere {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}

.mist {
  position: absolute;
  display: block;
  border-radius: 999px;
  filter: blur(30px);
  mix-blend-mode: screen;
  opacity: 0.55;
  transform: translate3d(0, 0, 0);
  transition: opacity 700ms ease, transform 700ms ease;
}

.mist-a {
  left: -18%;
  top: 22%;
  width: 78%;
  height: 34%;
  background:
    radial-gradient(ellipse at 25% 50%, rgba(221, 246, 238, 0.78), transparent 58%),
    radial-gradient(ellipse at 72% 52%, rgba(161, 216, 219, 0.36), transparent 62%);
  animation: home-mist-left 9s ease-in-out infinite alternate;
}

.mist-b {
  right: -16%;
  top: 35%;
  width: 68%;
  height: 42%;
  background:
    radial-gradient(ellipse at 38% 42%, rgba(226, 247, 239, 0.7), transparent 58%),
    radial-gradient(ellipse at 76% 62%, rgba(131, 196, 204, 0.3), transparent 60%);
  animation: home-mist-right 11s ease-in-out infinite alternate;
}

.mist-c {
  left: 8%;
  bottom: -10%;
  width: 78%;
  height: 32%;
  background: radial-gradient(ellipse at 50% 30%, rgba(212, 240, 232, 0.58), transparent 62%);
  filter: blur(38px);
  opacity: 0.42;
  animation: home-mist-bottom 12s ease-in-out infinite alternate;
}

.mist-vignette {
  inset: -8%;
  width: auto;
  height: auto;
  border-radius: 0;
  background:
    radial-gradient(circle at 48% 40%, transparent 34%, rgba(13, 31, 29, 0.24) 66%, rgba(5, 17, 17, 0.58) 100%),
    linear-gradient(90deg, rgba(5, 18, 18, 0.62), transparent 18%, transparent 82%, rgba(5, 18, 18, 0.54));
  filter: none;
  mix-blend-mode: multiply;
  opacity: 0.82;
}

.home-scene-page.revealed .mist-a {
  opacity: 0.28;
  transform: translateX(-10%) translateY(-4%) scale(1.16);
}

.home-scene-page.revealed .mist-b {
  opacity: 0.32;
  transform: translateX(8%) translateY(3%) scale(1.12);
}

.home-scene-page.revealed .mist-c {
  opacity: 0.24;
}

.home-scene-page.transitioning .mist-a,
.home-scene-page.transitioning .mist-b,
.home-scene-page.transitioning .mist-c {
  opacity: 0.78;
  transform: scale(1.22);
}

.home-transition-fog {
  position: absolute;
  inset: -10%;
  z-index: 8;
  pointer-events: none;
  opacity: 0;
  background:
    radial-gradient(ellipse at 48% 58%, rgba(238, 247, 240, 0.98), rgba(191, 224, 219, 0.78) 36%, transparent 62%),
    radial-gradient(ellipse at 20% 78%, rgba(231, 247, 239, 0.78), transparent 42%),
    radial-gradient(ellipse at 84% 70%, rgba(220, 242, 238, 0.72), transparent 42%);
  filter: blur(14px);
  transform: scale(0.82);
  transition: opacity 600ms ease, transform 600ms ease;
}

@keyframes home-mist-left {
  from {
    transform: translateX(-4%) translateY(1%);
  }
  to {
    transform: translateX(8%) translateY(-3%);
  }
}

@keyframes home-mist-right {
  from {
    transform: translateX(5%) translateY(-2%);
  }
  to {
    transform: translateX(-8%) translateY(3%);
  }
}

@keyframes home-mist-bottom {
  from {
    transform: translateX(-3%);
  }
  to {
    transform: translateX(5%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mist {
    animation: none;
  }
}

.home-scene-page.transitioning .home-transition-fog {
  opacity: 1;
  transform: scale(1.15);
}

.home-scene-page.webgl-failed {
  background:
    radial-gradient(circle at 50% 12%, rgba(128, 81, 201, 0.24), transparent 32%),
    linear-gradient(180deg, #263f38 0%, #172722 100%);
}

@media (max-width: 480px) {
  .home-scene-page {
    height: calc(100svh - 76px);
    min-height: 560px;
    border-radius: 14px;
  }
}

@media (max-height: 690px) {
  .home-scene-page {
    min-height: 510px;
  }
}
</style>
