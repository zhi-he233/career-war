<script setup lang="ts">
import { computed } from "vue";
import type { Character, CharacterId, Room } from "@career-war/shared";

const props = defineProps<{
  room: Room;
  playerId: string;
  characters: Character[];
}>();

const emit = defineEmits<{
  chooseCharacter: [characterId: CharacterId];
  startGame: [];
}>();

const me = computed(() => props.room.players.find((player) => player.id === props.playerId));
const isHost = computed(() => props.room.hostId === props.playerId);
const canStart = computed(() => props.room.players.length >= 2 && props.room.players.every((player) => player.characterId));
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}?room=${props.room.id}`);

async function copyInviteLink(): Promise<void> {
  await navigator.clipboard.writeText(inviteLink.value);
}
</script>

<template>
  <section class="page-panel">
    <div class="room-code">
      <span>房间号</span>
      <strong>{{ room.id }}</strong>
    </div>

    <button class="secondary-btn" type="button" @click="copyInviteLink">复制邀请链接</button>

    <section>
      <h2>玩家 {{ room.players.length }}/6</h2>
      <div class="player-list">
        <article v-for="(player, index) in room.players" :key="player.id" class="player-card">
          <div>
            <strong>{{ index + 1 }}号 {{ player.nickname }}</strong>
            <span v-if="player.id === room.hostId || player.isHost" class="badge host-badge">房主</span>
            <span class="badge" :class="{ offline: !player.isOnline }">{{ player.isOnline ? "在线" : "离线" }}</span>
          </div>
          <p>{{ characters.find((item) => item.id === player.characterId)?.name ?? "未选择职业" }}</p>
        </article>
      </div>
    </section>

    <section>
      <h2>选择职业</h2>
      <div class="character-grid">
        <button
          v-for="character in characters"
          :key="character.id"
          class="character-choice"
          :class="{ selected: me?.characterId === character.id }"
          type="button"
          @click="emit('chooseCharacter', character.id)"
        >
          <strong>{{ character.name }}</strong>
          <span>血量 {{ character.maxHp }}</span>
          <small>{{ character.description.join("；") }}</small>
        </button>
      </div>
    </section>

    <button class="primary-btn" type="button" :disabled="!isHost || !canStart" @click="emit('startGame')">
      {{ isHost ? "开始游戏" : "等待房主开始" }}
    </button>
    <p class="hint" v-if="isHost && !canStart">至少 2 人，且所有玩家都选择职业后可开始。</p>
  </section>
</template>
