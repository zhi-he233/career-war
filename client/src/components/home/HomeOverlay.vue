<script setup lang="ts">
defineProps<{
  playerName: string;
  isLoggedIn: boolean;
  revealed: boolean;
  transitioning: boolean;
  editorUiEnabled?: boolean;
}>();

const emit = defineEmits<{
  updatePlayerName: [value: string];
  reveal: [];
  select: [mode: "roguelite" | "pvp" | "pve" | "profile" | "rules" | "editor" | "characters"];
}>();
</script>

<template>
  <div class="home-overlay" :class="{ revealed, transitioning }">
    <header class="home-scene-title" aria-label="职业互怼首页">
      <span>职业互怼</span>
      <small>{{ revealed ? "营地已展开" : "森林入口" }}</small>
    </header>

    <label class="home-scene-name">
      <span>{{ isLoggedIn ? "游戏名" : "游客游戏名" }}</span>
      <input
        :value="playerName"
        maxlength="12"
        :readonly="isLoggedIn"
        placeholder="输入你的游戏名"
        @input="emit('updatePlayerName', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <button v-if="!revealed" class="scene-start-sign" type="button" @click="emit('reveal')">
      拨开雾
    </button>

    <nav v-else class="scene-node-labels" aria-label="森林入口">
      <button class="node-label node-rogue" type="button" @click="emit('select', 'roguelite')">
        <b>肉鸽</b>
      </button>
      <button class="node-label node-pvp" type="button" @click="emit('select', 'pvp')">
        <b>对战</b>
      </button>
      <button class="node-label node-pve" type="button" @click="emit('select', 'pve')">
        <b>训练</b>
      </button>
      <button class="node-label node-profile" type="button" @click="emit('select', 'profile')">
        <b>档案</b>
      </button>
    </nav>

    <div class="scene-tools">
      <button class="scene-tool" type="button" @click="emit('select', 'rules')">规则</button>
      <template v-if="editorUiEnabled">
        <button class="scene-tool" type="button" @click="emit('select', 'editor')">肉鸽数据</button>
        <button class="scene-tool" type="button" @click="emit('select', 'characters')">职业编辑</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.home-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  color: #fff7dc;
  text-shadow: 0 2px 0 rgba(18, 15, 10, 0.38), 0 8px 18px rgba(18, 15, 10, 0.34);
}

.home-overlay button,
.home-overlay input,
.home-overlay label {
  pointer-events: auto;
}

.home-scene-title {
  position: absolute;
  top: clamp(58px, 11vh, 86px);
  left: clamp(104px, 38%, 300px);
  display: grid;
  justify-items: start;
  gap: 2px;
  transform: rotate(-1.5deg);
}

.home-scene-title span {
  font-family: var(--font-pixel);
  font-size: clamp(34px, 8vw, 52px);
  font-weight: 1000;
  line-height: 1;
}

.home-scene-title small {
  border: 1px solid rgba(255, 247, 220, 0.44);
  border-radius: 999px;
  padding: 2px 9px;
  background: rgba(24, 38, 30, 0.28);
  font-size: 11px;
  font-weight: 900;
}

.home-scene-name {
  position: absolute;
  top: 10px;
  left: 10px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  width: min(250px, calc(100% - 20px));
  border: 2px solid rgba(255, 247, 220, 0.48);
  border-radius: 12px;
  padding: 7px 9px;
  background: rgba(18, 28, 24, 0.46);
  backdrop-filter: blur(5px);
}

.home-scene-name span {
  font-size: 12px;
  font-weight: 1000;
  white-space: nowrap;
}

.home-scene-name input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #fff7dc;
  font-size: 13px;
  font-weight: 900;
  outline: none;
}

.scene-start-sign {
  position: absolute;
  left: 58%;
  bottom: clamp(62px, 13vh, 108px);
  min-width: 118px;
  min-height: 42px;
  border: 2px solid rgba(255, 237, 177, 0.78);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 226, 138, 0.86), rgba(193, 109, 25, 0.92)),
    rgba(78, 45, 13, 0.86);
  box-shadow: 0 4px 0 rgba(58, 36, 18, 0.86), 0 18px 34px rgba(24, 16, 8, 0.30);
  color: #221102;
  font-family: var(--font-pixel);
  font-size: 16px;
  font-weight: 1000;
  text-shadow: none;
  transform: rotate(-2deg);
  transition: transform 140ms ease, filter 140ms ease, box-shadow 140ms ease;
}

.scene-start-sign:hover,
.scene-start-sign:focus-visible {
  filter: brightness(1.08);
  transform: translateY(-3px) rotate(-2deg);
}

.scene-start-sign:active {
  transform: translateY(3px) rotate(-2deg);
  box-shadow: 0 3px 0 #3a2412, 0 10px 22px rgba(24, 16, 8, 0.26);
}

.scene-node-labels {
  position: absolute;
  inset: 0;
}

.node-label {
  position: absolute;
  display: grid;
  justify-items: center;
  min-width: 64px;
  border: 1px solid rgba(255, 247, 220, 0.48);
  border-radius: 999px;
  padding: 5px 11px;
  background:
    linear-gradient(180deg, rgba(52, 68, 53, 0.68), rgba(25, 36, 31, 0.74)),
    rgba(18, 28, 24, 0.64);
  box-shadow: 0 2px 0 rgba(16, 24, 19, 0.55), 0 10px 18px rgba(20, 16, 10, 0.2);
  color: #fff7dc;
  text-shadow: none;
  opacity: 0.88;
  backdrop-filter: blur(6px);
  transition: transform 140ms ease, filter 140ms ease, opacity 220ms ease;
}

.node-label::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -15px;
  width: 8px;
  height: 8px;
  border: 1px solid rgba(255, 235, 166, 0.82);
  border-radius: 999px;
  background: rgba(255, 218, 105, 0.72);
  box-shadow: 0 0 18px rgba(255, 207, 90, 0.72), 0 0 34px rgba(102, 214, 205, 0.22);
  transform: translateX(-50%);
}

.node-label b {
  font-size: 13px;
  font-weight: 1000;
}

.node-label:hover,
.node-label:focus-visible {
  opacity: 1;
  filter: brightness(1.08);
  transform: translateY(-4px);
}

.node-label:active {
  transform: translateY(2px);
}

.node-rogue {
  left: 43%;
  top: 35%;
  transform: rotate(1deg);
}

.node-rogue::after {
  bottom: -18px;
}

.node-rogue:hover,
.node-rogue:focus-visible {
  transform: translateY(-4px) rotate(1deg);
}

.node-pvp {
  left: 9%;
  top: 60%;
  transform: rotate(-3deg);
}

.node-pvp::after {
  left: 66%;
}

.node-pve {
  right: 8%;
  top: 55%;
  transform: rotate(2deg);
}

.node-pve::after {
  left: 34%;
}

.node-profile {
  left: 48%;
  bottom: 15%;
  transform: rotate(-1deg);
}

.node-profile:hover,
.node-profile:focus-visible {
  transform: translateY(-4px) rotate(-1deg);
}

.scene-tools {
  position: absolute;
  right: 10px;
  top: 10px;
  bottom: auto;
  display: flex;
  gap: 6px;
  max-width: calc(100% - 20px);
  overflow-x: auto;
}

.scene-tool {
  min-height: 34px;
  border: 2px solid rgba(255, 247, 220, 0.48);
  border-radius: 10px;
  padding: 6px 10px;
  background: rgba(18, 28, 24, 0.58);
  color: #fff7dc;
  font-size: 12px;
  font-weight: 1000;
  white-space: nowrap;
  backdrop-filter: blur(5px);
}

@media (max-width: 430px) {
  .home-scene-title {
    top: 92px;
    left: 33%;
  }

  .home-scene-name {
    width: calc(100% - 20px);
  }

  .node-pvp {
    left: 5%;
    top: 61%;
  }

  .node-pve {
    right: 5%;
    top: 56%;
  }

  .node-label {
    min-width: 58px;
    padding: 5px 9px;
  }

  .node-label b {
    font-size: 12px;
  }

  .scene-tools {
    right: 8px;
    top: 8px;
  }
}
</style>
