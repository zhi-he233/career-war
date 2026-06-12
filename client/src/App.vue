<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Character, GameEvent, PlayerEmoteEvent, Room, RoomListItem, RoomSettings } from "@career-war/shared";
import { getClientId, resetClientId, socket, type Ack } from "./socket";
import HomePage from "./components/HomePage.vue";
import LobbyPage from "./components/LobbyPage.vue";
import BattlePage from "./components/BattlePage.vue";

const ROOM_ID_KEY = "career-war-room-id";

const room = ref<Room | null>(null);
const characters = ref<Character[]>([]);
const playerId = ref("");
const roomId = ref("");
const roomList = ref<RoomListItem[]>([]);
const errorMessage = ref("");
const lastEvent = ref<GameEvent | null>(null);
const lastEmote = ref<PlayerEmoteEvent | null>(null);
const query = new URLSearchParams(window.location.search);
const inviteRoomId = (query.get("room") ?? query.get("roomId") ?? "").toUpperCase().slice(0, 4);
const inviteJoinStarted = ref(false);
let clientId = getClientId();

if (inviteRoomId) {
  sessionStorage.removeItem(ROOM_ID_KEY);
  clientId = resetClientId();
}

const page = computed(() => {
  if (!room.value) return "home";
  if (room.value.phase === "lobby") return "lobby";
  return "battle";
});

onMounted(() => {
  socket.on("connect", enterFromCurrentUrl);
  socket.on("characters", (items: Character[]) => {
    characters.value = items;
  });
  socket.on("gameStateUpdated", (nextRoom: Room) => {
    room.value = nextRoom;
    roomId.value = nextRoom.id;
    sessionStorage.setItem(ROOM_ID_KEY, nextRoom.id);
  });
  socket.on("roomListUpdated", (items: RoomListItem[]) => {
    roomList.value = items;
  });
  socket.on("battleLogAdded", (event: GameEvent) => {
    lastEvent.value = event;
  });
  socket.on("playerEmote", (event: PlayerEmoteEvent) => {
    lastEmote.value = event;
  });
  socket.on("gameOver", (payload: { winnerName: string }) => {
    lastEvent.value = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      type: "victory",
      message: `${payload.winnerName} 获胜！`
    };
  });
  socket.on("errorMessage", showError);
  enterFromCurrentUrl();
});

onUnmounted(() => {
  socket.off("connect", enterFromCurrentUrl);
  socket.off("characters");
  socket.off("gameStateUpdated");
  socket.off("roomListUpdated");
  socket.off("battleLogAdded");
  socket.off("playerEmote");
  socket.off("gameOver");
  socket.off("errorMessage");
});

function enterFromCurrentUrl(): void {
  if (inviteRoomId) {
    joinInviteRoom();
    return;
  }
  tryResumeRoom();
}

function joinInviteRoom(): void {
  if (inviteJoinStarted.value || room.value) return;
  inviteJoinStarted.value = true;
  const savedNickname = localStorage.getItem("career-war-nickname")?.trim();
  const nickname = savedNickname || `玩家${clientId.slice(0, 4)}`;
  localStorage.setItem("career-war-nickname", nickname);

  emitWithAck<{ roomId: string; playerId: string; room: Room }>("joinRoom", { nickname, roomId: inviteRoomId, clientId }, (response) => {
    playerId.value = response.playerId;
    roomId.value = response.roomId;
    room.value = response.room;
    sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
    window.history.replaceState({}, "", window.location.pathname);
  });
}

function tryResumeRoom(): void {
  if (inviteRoomId) return;
  const resumableRoomId = sessionStorage.getItem(ROOM_ID_KEY);
  if (!resumableRoomId) return;
  socket.emit("resumeRoom", { roomId: resumableRoomId, clientId }, (response: Ack<{ roomId: string; playerId: string; room: Room }>) => {
    if (!response.ok) {
      sessionStorage.removeItem(ROOM_ID_KEY);
      return;
    }
    playerId.value = response.playerId;
    roomId.value = response.roomId;
    room.value = response.room;
  });
}

function createRoom(nickname: string): void {
  emitWithAck<{ roomId: string; playerId: string; room: Room }>("createRoom", { nickname, clientId }, (response) => {
    playerId.value = response.playerId;
    roomId.value = response.roomId;
    room.value = response.room;
    sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
  });
}

function joinRoom(payload: { nickname: string; roomId: string }): void {
  emitWithAck<{ roomId: string; playerId: string; room: Room }>("joinRoom", { ...payload, clientId }, (response) => {
    playerId.value = response.playerId;
    roomId.value = response.roomId;
    room.value = response.room;
    sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
  });
}

function requestRoomList(): void {
  emitWithAck<{ roomList: RoomListItem[] }>("requestRoomList", {}, (response) => {
    roomList.value = response.roomList;
  });
}

function chooseCharacter(characterId: string): void {
  emitWithAck("chooseCharacter", { characterId });
}

function startGame(): void {
  emitWithAck("startGame", {});
}

function updateRoomSettings(settings: Partial<RoomSettings>): void {
  emitWithAck("updateRoomSettings", settings);
}

function selectTarget(targetId: string): void {
  emitWithAck("selectTarget", { targetId });
}

function rollDice(): void {
  emitWithAck("rollDice", {});
}

function leaveRoom(): void {
  emitWithAck("leaveRoom", {}, () => {
    room.value = null;
    roomId.value = "";
    sessionStorage.removeItem(ROOM_ID_KEY);
  });
}

function emitWithAck<T extends Record<string, unknown> = Record<string, unknown>>(
  eventName: string,
  payload: unknown,
  onSuccess?: (response: { ok: true } & T) => void
): void {
  errorMessage.value = "";
  socket.emit(eventName, payload, (response: Ack<T>) => {
    if (!response.ok) {
      showError(response.error);
      return;
    }
    onSuccess?.(response);
  });
}

function showError(message: string): void {
  errorMessage.value = message;
  window.setTimeout(() => {
    if (errorMessage.value === message) errorMessage.value = "";
  }, 2600);
}
</script>

<template>
  <main class="app-shell">
    <header class="top-bar">
      <div>
        <p class="eyebrow">H5 联机桌游 MVP</p>
        <h1>职业互怼</h1>
      </div>
      <button v-if="room" class="ghost-btn" type="button" @click="leaveRoom">离开</button>
    </header>

    <p v-if="errorMessage" class="toast">{{ errorMessage }}</p>

    <HomePage
      v-if="page === 'home'"
      :invite-room-id="inviteRoomId"
      :room-list="roomList"
      @create-room="createRoom"
      @join-room="joinRoom"
      @refresh-room-list="requestRoomList"
    />
    <LobbyPage
      v-else-if="page === 'lobby' && room"
      :room="room"
      :player-id="playerId"
      :characters="characters"
      @choose-character="chooseCharacter"
      @update-room-settings="updateRoomSettings"
      @start-game="startGame"
    />
    <BattlePage
      v-else-if="room"
      :room="room"
      :player-id="playerId"
      :characters="characters"
      :last-event="lastEvent"
      :last-emote="lastEmote"
      @select-target="selectTarget"
      @roll-dice="rollDice"
    />
  </main>
</template>
