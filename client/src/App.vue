<script setup lang="ts">
import { createClientId } from "./utils/id";
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Character, CharacterId, GameEvent, GameMode, PlayerEmoteEvent, RollActionType, RollDecisionChoice, Room, RoomListItem, RoomSettings, SummonerSkillId } from "@career-war/shared";
import { getClientId, resetClientId, socket, type Ack } from "./socket";
import HomePage from "./components/HomePage.vue";
import PvpModePage from "./components/PvpModePage.vue";
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
const isSocketConnected = ref(socket.connected);
const roundTripMs = ref<number | null>(null);
const transportName = ref("");
const frontPage = ref<"home" | "pvpMode">("home");
const query = new URLSearchParams(window.location.search);
const inviteRoomId = (query.get("room") ?? query.get("roomId") ?? "").toUpperCase().slice(0, 4);
const inviteJoinStarted = ref(false);
let clientId = getClientId();
let pingTimer: number | undefined;
let transportEngine: SocketEngineLike | undefined;
let transportUpgradeHandler: ((transport: unknown) => void) | undefined;
let transportCloseHandler: (() => void) | undefined;

type SocketTransportLike = {
  name?: string;
};

type SocketEngineLike = {
  transport?: SocketTransportLike;
  on: (event: "upgrade" | "close", handler: (...args: unknown[]) => void) => void;
  off: (event: "upgrade" | "close", handler: (...args: unknown[]) => void) => void;
};

if (inviteRoomId) {
  sessionStorage.removeItem(ROOM_ID_KEY);
  clientId = resetClientId();
}

const page = computed(() => {
  if (!room.value) return frontPage.value;
  if (room.value.phase === "lobby") return "lobby";
  return "battle";
});
const connectionStatusText = computed(() => (isSocketConnected.value ? "已连接" : "断开"));
const latencyText = computed(() => (roundTripMs.value === null ? "-- ms" : `${roundTripMs.value} ms`));
const transportText = computed(() => transportName.value || "--");

onMounted(() => {
  socket.on("connect", enterFromCurrentUrl);
  socket.on("connect", handleSocketConnected);
  socket.on("disconnect", handleSocketDisconnected);
  socket.on("clientPong", handleClientPong);
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
      id: createClientId("player"),
      createdAt: Date.now(),
      type: "victory",
      message: `${payload.winnerName} 获胜！`
    };
  });
  socket.on("errorMessage", showError);
  handleSocketConnected();
  enterFromCurrentUrl();
});

onUnmounted(() => {
  socket.off("connect", enterFromCurrentUrl);
  socket.off("connect", handleSocketConnected);
  socket.off("disconnect", handleSocketDisconnected);
  socket.off("clientPong", handleClientPong);
  socket.off("characters");
  socket.off("gameStateUpdated");
  socket.off("roomListUpdated");
  socket.off("battleLogAdded");
  socket.off("playerEmote");
  socket.off("gameOver");
  socket.off("errorMessage");
  stopClientPing();
  detachTransportListeners();
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

function createRoom(payload: { nickname: string; gameMode?: GameMode }): void {
  emitWithAck<{ roomId: string; playerId: string; room: Room }>("createRoom", { nickname: payload.nickname, clientId, gameMode: payload.gameMode ?? "classic" }, (response) => {
    playerId.value = response.playerId;
    roomId.value = response.roomId;
    room.value = response.room;
    sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
  });
}

function joinRoom(payload: { nickname: string; roomId: string; gameMode?: GameMode }): void {
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

function openPvpMode(): void {
  frontPage.value = "pvpMode";
}

function backToHome(): void {
  frontPage.value = "home";
}

function chooseCharacter(characterId: string): void {
  emitWithAck("chooseCharacter", { characterId });
}

function chooseSummonerSkill(summonerSkillId: SummonerSkillId): void {
  emitWithAck("chooseSummonerSkill", { summonerSkillId });
}

function chooseDuoSlotCharacter(payload: { slotIndex: 0 | 1; characterId: CharacterId }): void {
  emitWithAck("chooseDuoSlotCharacter", payload);
}

function chooseDuoSlotSummonerSkill(payload: { slotIndex: 0 | 1; summonerSkillId: SummonerSkillId }): void {
  emitWithAck("chooseDuoSlotSummonerSkill", payload);
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

function selectActor(actorId: string): void {
  emitWithAck("selectActor", { actorId });
}

function rollDice(): void {
  emitWithAck("rollDice", {});
}

function confirmRollDecision(payload: { roomId?: string; pendingDecisionId?: string; actionType?: RollActionType; skillId?: string; decisionId: string; choice: RollDecisionChoice; summonerSkillId?: SummonerSkillId }): void {
  emitWithAck("confirmRollDecision", payload);
}

function leaveRoom(): void {
  emitWithAck("leaveRoom", {}, () => {
    room.value = null;
    roomId.value = "";
    frontPage.value = "pvpMode";
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

function handleSocketConnected(): void {
  isSocketConnected.value = socket.connected;
  attachTransportListeners();
  updateTransportName();
  startClientPing();
}

function handleSocketDisconnected(): void {
  isSocketConnected.value = false;
  transportName.value = "";
  stopClientPing();
}

function startClientPing(): void {
  stopClientPing();
  sendClientPing();
  pingTimer = window.setInterval(sendClientPing, 5000);
}

function stopClientPing(): void {
  window.clearInterval(pingTimer);
  pingTimer = undefined;
}

function sendClientPing(): void {
  if (!socket.connected) return;
  socket.emit("clientPing", { clientSentAt: Date.now() });
}

function handleClientPong(payload: { clientSentAt?: unknown; serverReceivedAt?: unknown }): void {
  if (typeof payload.clientSentAt !== "number") return;
  roundTripMs.value = Math.max(0, Date.now() - payload.clientSentAt);
}

function attachTransportListeners(): void {
  const engine = getSocketEngine();
  if (!engine || engine === transportEngine) return;
  detachTransportListeners();
  transportEngine = engine;
  transportUpgradeHandler = (transport: unknown) => {
    updateTransportName(getTransportName(transport));
  };
  transportCloseHandler = () => {
    transportName.value = "";
  };
  engine.on("upgrade", transportUpgradeHandler);
  engine.on("close", transportCloseHandler);
}

function detachTransportListeners(): void {
  if (!transportEngine) return;
  if (transportUpgradeHandler) transportEngine.off("upgrade", transportUpgradeHandler);
  if (transportCloseHandler) transportEngine.off("close", transportCloseHandler);
  transportEngine = undefined;
  transportUpgradeHandler = undefined;
  transportCloseHandler = undefined;
}

function updateTransportName(nextName = getTransportName(getSocketEngine()?.transport)): void {
  if (!nextName || transportName.value === nextName) return;
  transportName.value = nextName;
  if (import.meta.env.DEV) {
    console.log(`[socket] transport: ${nextName}`);
  }
}

function getSocketEngine(): SocketEngineLike | undefined {
  return socket.io.engine as unknown as SocketEngineLike | undefined;
}

function getTransportName(transport: unknown): string {
  if (!transport || typeof transport !== "object") return "";
  const name = (transport as SocketTransportLike).name;
  return typeof name === "string" ? name : "";
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

    <aside class="net-diagnostics" aria-live="polite" title="联机延迟诊断">
      <span>连接：{{ connectionStatusText }}</span>
      <span>延迟：{{ latencyText }}</span>
      <span>transport：{{ transportText }}</span>
    </aside>

    <HomePage
      v-if="page === 'home'"
      @select-pvp="openPvpMode"
    />
    <PvpModePage
      v-else-if="page === 'pvpMode'"
      :invite-room-id="inviteRoomId"
      :room-list="roomList"
      @back-home="backToHome"
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
      @choose-summoner-skill="chooseSummonerSkill"
      @choose-duo-slot-character="chooseDuoSlotCharacter"
      @choose-duo-slot-summoner-skill="chooseDuoSlotSummonerSkill"
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
      @select-actor="selectActor"
      @roll-dice="rollDice"
      @confirm-roll-decision="confirmRollDecision"
    />
  </main>
</template>

<style scoped>
.net-diagnostics {
  position: fixed;
  right: 8px;
  bottom: 8px;
  z-index: 30;
  display: flex;
  gap: 6px;
  align-items: center;
  max-width: calc(100vw - 16px);
  padding: 4px 6px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.82);
  color: #334155;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  pointer-events: none;
}

@media (max-width: 480px) {
  .net-diagnostics {
    right: 6px;
    bottom: 6px;
    gap: 4px;
    padding: 3px 5px;
    font-size: 9px;
  }
}
</style>
