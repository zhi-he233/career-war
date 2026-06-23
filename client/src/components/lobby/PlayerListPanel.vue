<script setup lang="ts">
import type { CharacterId, Player } from "@career-war/shared";

defineProps<{
  playersCount: number;
  maxPlayers: number;
  lobbySeats: Array<{ index: number; player: Player | undefined }>;
  roomHostId: string;
  getCharacterName: (id: CharacterId | undefined) => string;
  canKickPlayer: (player: Player) => boolean;
}>();

const emit = defineEmits<{
  (e: "kickPlayer", player: Player): void;
}>();
</script>

<template>
  <section>
    <h2>玩家 {{ playersCount }}/{{ maxPlayers }}</h2>
    <div class="player-list lobby-player-list">
      <article
        v-for="seat in lobbySeats"
        :key="seat.player?.id ?? `empty-${seat.index}`"
        class="player-card lobby-player-card"
        :class="{ empty: !seat.player }"
      >
        <template v-if="seat.player">
          <strong>{{ seat.index + 1 }} {{ seat.player.nickname }}</strong>
          <span
            v-if="seat.player.id === roomHostId || seat.player.isHost"
            class="badge host-badge"
          >房主</span>
          <span class="badge" :class="{ offline: !seat.player.isOnline }">
            {{ seat.player.isOnline ? "在线" : "离线" }}
          </span>
          <span class="lobby-seat-choice">{{ getCharacterName(seat.player.characterId) }}</span>
          <button
            v-if="canKickPlayer(seat.player)"
            class="ghost-btn small-btn lobby-kick-btn"
            type="button"
            @click="emit('kickPlayer', seat.player)"
          >
            Kick
          </button>
        </template>
        <template v-else>
          <strong>{{ seat.index + 1 }} 空位</strong>
          <span class="badge">等待</span>
        </template>
      </article>
    </div>
  </section>
</template>
