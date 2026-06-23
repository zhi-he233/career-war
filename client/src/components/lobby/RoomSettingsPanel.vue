<script setup lang="ts">
import type { GameMode } from "@career-war/shared";

defineProps<{
  isHost: boolean;
  roomPhase: string;
  roomMode: GameMode;
  visibleMaxPlayers: number;
  allowDuplicateCharacters: boolean;
  selectableMaxPlayerOptions: Array<{ count: number; disabled: boolean }>;
  isSinglePlayerPveMode: boolean;
  hasDuplicateCharacterConflict: boolean;
  isDuoModeDevelopment: boolean;
  getGameModeLabel: (mode: GameMode) => string;
}>();

const emit = defineEmits<{
  (e: "update:gameMode", value: GameMode): void;
  (e: "update:maxPlayers", value: number): void;
  (e: "update:duplicateSetting", value: boolean): void;
}>();

function onGameModeChange(event: Event): void {
  emit("update:gameMode", (event.target as HTMLSelectElement).value as GameMode);
}

function onMaxPlayersChange(event: Event): void {
  emit("update:maxPlayers", Number((event.target as HTMLSelectElement).value));
}

function onDuplicateChange(event: Event): void {
  emit("update:duplicateSetting", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <section class="room-settings-panel">
    <div class="settings-title">
      <h2>房间设置</h2>
      <span v-if="!isHost" class="hint">仅房主可修改</span>
    </div>

    <div v-if="isHost" class="settings-controls">
      <label class="compact-field">
        <span>游戏模式</span>
        <select :value="roomMode" :disabled="roomPhase !== 'lobby'" @change="onGameModeChange">
          <option value="classic">经典对战</option>
          <option value="duo_2v2">2V2 双角色（测试版）</option>
          <option value="pve_1v1">人机练习</option>
          <option value="pve_roguelite">肉鸽挑战</option>
        </select>
      </label>

      <label class="compact-field">
        <span>最大人数</span>
        <select
          :value="visibleMaxPlayers"
          :disabled="roomPhase !== 'lobby' || isSinglePlayerPveMode"
          @change="onMaxPlayersChange"
        >
          <option
            v-for="option in selectableMaxPlayerOptions"
            :key="option.count"
            :value="option.count"
            :disabled="option.disabled"
          >
            {{ option.count }} 人
          </option>
        </select>
      </label>

      <label class="toggle-field">
        <input
          type="checkbox"
          :checked="allowDuplicateCharacters"
          :disabled="roomPhase !== 'lobby'"
          @change="onDuplicateChange"
        />
        <span>允许重复职业</span>
      </label>
    </div>

    <p v-else class="settings-readonly">
      模式：{{ getGameModeLabel(roomMode) }} /
      最大 {{ visibleMaxPlayers }} 人 · {{ allowDuplicateCharacters ? "允许重复职业" : "不允许重复职业" }}
    </p>

    <p v-if="hasDuplicateCharacterConflict" class="settings-warning">当前已有重复职业，请玩家重新选择。</p>
    <p v-if="isDuoModeDevelopment" class="settings-warning">2V2 双角色测试版：请完成 4 个角色槽位和召唤师技能选择后开始。</p>
  </section>
</template>
