<script setup lang="ts">
import { createClientId } from "./utils/id";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Character, CharacterId, GameEvent, GameMode, PlayerEmoteEvent, RollActionType, RollDecisionChoice, Room, RoomListItem, RoomSettings, SummonerSkillId } from "@career-war/shared";
import { getClientId, socket, type Ack } from "./socket";

const route = useRoute();
const router = useRouter();
import HomePage from "./components/HomePage.vue";
import PvpModePage from "./components/PvpModePage.vue";
import LobbyPage from "./components/LobbyPage.vue";
import BattlePage from "./components/BattlePage.vue";
import AuthDialog from "./components/AuthDialog.vue";
import { useAuth } from "./composables/useAuth";

const ROOM_ID_KEY = "career-war-room-id";
const PLAYER_ID_KEY = "career-war-player-id";
const isDev = import.meta.env.DEV;

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
const showLeaveConfirm = ref(false);
/** Auth dialog visibility */
const showAuthDialog = ref(false);
const { currentUser, isLoggedIn, loading: authLoading, logout: authLogout } = useAuth();
/** Invite room ID from BOTH old format (?room=XXXX) and new format (/room/XXXX). */
const _qs = new URLSearchParams(window.location.search);
const _pathRoom = (window.location.pathname.match(/^\/room\/([A-Z0-9]{4})/) ?? [])[1] ?? "";
const inviteRoomId = (_qs.get("room") ?? _qs.get("roomId") ?? _pathRoom).toUpperCase().slice(0, 4);
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
  const savedRoomId = sessionStorage.getItem(ROOM_ID_KEY);
  if (savedRoomId && savedRoomId !== inviteRoomId) {
    sessionStorage.removeItem(ROOM_ID_KEY);
    sessionStorage.removeItem(PLAYER_ID_KEY);
  }
}

const connectionStatusText = computed(() => (isSocketConnected.value ? "已连接" : "断开"));
const latencyText = computed(() => (roundTripMs.value === null ? "-- ms" : `${roundTripMs.value} ms`));
const transportText = computed(() => transportName.value || "--");

/** Extract initial game mode from route query (?mode=pve_1v1). */
const modeFromQuery = computed<GameMode | null>(() => {
  const m = route.query.mode;
  if (m === "pve_1v1" || m === "pve_roguelite" || m === "duo_2v2" || m === "classic") return m;
  return null;
});

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
  socket.on("kickedFromRoom", handleKickedFromRoom);
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
  socket.off("kickedFromRoom", handleKickedFromRoom);
  stopClientPing();
  detachTransportListeners();
});

/** Sync URL when room phase changes (lobby ↔ battle). */
watch(
  () => room.value?.phase,
  (phase, _old) => {
    if (!room.value || !phase) return;
    const target = phase === "lobby"
      ? `/room/${room.value.id}`
      : `/room/${room.value.id}/battle`;
    if (route.path !== target) {
      router.replace(target);
    }
  }
);

/** Router guard: when on a /room/ URL without a room, try resume/join or fallback. */
watch(
  () => route.path,
  (path) => {
    const match = path.match(/^\/room\/([A-Z0-9]{4})(\/battle)?$/);
    if (!match) return; // not a room URL — nothing to do
    if (room.value) return; // already have a room — phase watcher handles URL sync

    const urlRoomId = match[1]!;

    // Try invite join (old ?room= or new /room/ format)
    if (inviteRoomId === urlRoomId) {
      joinInviteRoom();
      return;
    }

    // Try resume from session storage
    const savedId = sessionStorage.getItem(ROOM_ID_KEY);
    if (savedId === urlRoomId) {
      tryResumeRoom();
      return;
    }

    // No way to recover — show error and go back to modes
    showError("房间不存在或已失效");
    router.replace("/modes");
  },
  { immediate: true }
);

function enterFromCurrentUrl(): void {
  if (inviteRoomId) {
    joinInviteRoom();
    return;
  }
  // If URL already has a room path, let the route watcher handle it
  if (route.path.startsWith("/room/")) return;
  tryResumeRoom();
}

function joinInviteRoom(): void {
  if (inviteJoinStarted.value || room.value) return;
  inviteJoinStarted.value = true;
  const savedNickname = currentUser.value?.username || localStorage.getItem("career-war-nickname")?.trim();
  const nickname = savedNickname || `玩家${clientId.slice(0, 4)}`;
  localStorage.setItem("career-war-nickname", nickname);

  emitWithAck<{ roomId: string; playerId: string; room: Room }>("joinRoom", { nickname, roomId: inviteRoomId, clientId, playerId: sessionStorage.getItem(PLAYER_ID_KEY) ?? undefined, userId: currentUser.value?.id }, (response) => {
    setCurrentRoom(response.roomId, response.playerId, response.room);
    router.replace(`/room/${response.roomId}`);
  });
}

function setCurrentRoom(nextRoomId: string, nextPlayerId: string, nextRoom: Room): void {
  playerId.value = nextPlayerId;
  roomId.value = nextRoomId;
  room.value = nextRoom;
  sessionStorage.setItem(ROOM_ID_KEY, nextRoomId);
  sessionStorage.setItem(PLAYER_ID_KEY, nextPlayerId);
}

function clearCurrentRoom(): void {
  room.value = null;
  roomId.value = "";
  playerId.value = "";
  sessionStorage.removeItem(ROOM_ID_KEY);
  sessionStorage.removeItem(PLAYER_ID_KEY);
}

function handleKickedFromRoom(): void {
  clearCurrentRoom();
  showError("你已被房主移出房间");
  router.replace("/modes");
}

function resumePayload(roomIdToResume: string): { roomId: string; clientId: string; playerId?: string; userId?: string } {
  return {
    roomId: roomIdToResume,
    clientId,
    playerId: sessionStorage.getItem(PLAYER_ID_KEY) ?? undefined,
    userId: currentUser.value?.id
  };
}

function joinPayload(payload: { nickname: string; roomId: string; gameMode?: GameMode }): { nickname: string; roomId: string; gameMode?: GameMode; clientId: string; playerId?: string; userId?: string } {
  return {
    ...payload,
    clientId,
    playerId: sessionStorage.getItem(PLAYER_ID_KEY) ?? undefined,
    userId: currentUser.value?.id
  };
}

function createPayload(payload: { nickname: string; gameMode?: GameMode }): { nickname: string; gameMode: GameMode; clientId: string; userId?: string } {
  return {
    nickname: payload.nickname,
    clientId,
    gameMode: payload.gameMode ?? "classic",
    userId: currentUser.value?.id
  };
}

function tryResumeRoom(): void {
  if (inviteRoomId) return;
  const resumableRoomId = sessionStorage.getItem(ROOM_ID_KEY);
  if (!resumableRoomId) return;
  socket.emit("resumeRoom", resumePayload(resumableRoomId), (response: Ack<{ roomId: string; playerId: string; room: Room }>) => {
    if (!response.ok) {
      sessionStorage.removeItem(ROOM_ID_KEY);
      sessionStorage.removeItem(PLAYER_ID_KEY);
      return;
    }
    setCurrentRoom(response.roomId, response.playerId, response.room);
    if (route.path !== `/room/${response.roomId}` && route.path !== `/room/${response.roomId}/battle`) {
      router.replace(`/room/${response.roomId}`);
    }
  });
}

function createRoom(payload: { nickname: string; gameMode?: GameMode }): void {
  emitWithAck<{ roomId: string; playerId: string; room: Room }>("createRoom", createPayload(payload), (response) => {
    setCurrentRoom(response.roomId, response.playerId, response.room);
    router.replace(`/room/${response.roomId}`);
  });
}

function joinRoom(payload: { nickname: string; roomId: string; gameMode?: GameMode }): void {
  emitWithAck<{ roomId: string; playerId: string; room: Room }>("joinRoom", joinPayload(payload), (response) => {
    setCurrentRoom(response.roomId, response.playerId, response.room);
    router.replace(`/room/${response.roomId}`);
  });
}

function requestRoomList(): void {
  emitWithAck<{ roomList: RoomListItem[] }>("requestRoomList", {}, (response) => {
    roomList.value = response.roomList;
  });
}

function openPvpMode(): void {
  router.push("/modes");
}

function openPveMode(): void {
  router.push({ path: "/modes", query: { mode: "pve_1v1" } });
}

function openRogueliteMode(): void {
  const savedNickname = currentUser.value?.username || localStorage.getItem("career-war-nickname")?.trim();
  const nickname = savedNickname || `玩家${clientId.slice(0, 4)}`;
  localStorage.setItem("career-war-nickname", nickname);
  createRoom({ nickname, gameMode: "pve_roguelite" });
}

function backToHome(): void {
  router.push("/");
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
    clearCurrentRoom();
    router.replace("/modes");
  });
}

function kickPlayer(targetPlayerId: string): void {
  emitWithAck("kickPlayer", { playerId: targetPlayerId });
}

async function handleLogout(): Promise<void> {
  await authLogout();
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
        <h1>职业互怼</h1>
      </div>
      <div class="top-bar-right">
        <template v-if="!authLoading">
          <template v-if="isLoggedIn">
            <span class="user-nickname">{{ currentUser?.username }}</span>
            <button class="ghost-btn small-btn" type="button" @click="handleLogout">退出</button>
          </template>
          <button v-else class="secondary-btn small-btn" type="button" @click="showAuthDialog = true">登录</button>
        </template>
      </div>
      <button v-if="room" class="ghost-btn" type="button" @click="showLeaveConfirm = true">离开</button>
    </header>

    <p v-if="errorMessage" class="toast">{{ errorMessage }}</p>

    <aside v-if="isDev" class="net-diagnostics" aria-live="polite" title="联机延迟诊断">
      <span>连接：{{ connectionStatusText }}</span>
      <span>延迟：{{ latencyText }}</span>
      <span>transport：{{ transportText }}</span>
    </aside>

    <HomePage
      v-if="route.name === 'home'"
      @select-pvp="openPvpMode"
      @select-pve="openPveMode"
      @select-roguelite="openRogueliteMode"
    />
    <PvpModePage
      v-else-if="route.name === 'modes'"
      :invite-room-id="inviteRoomId"
      :room-list="roomList"
      :initial-mode="modeFromQuery"
      @back-home="backToHome"
      @create-room="createRoom"
      @join-room="joinRoom"
      @refresh-room-list="requestRoomList"
    />
    <LobbyPage
      v-else-if="room && room.phase === 'lobby'"
      :room="room"
      :player-id="playerId"
      :characters="characters"
      @choose-character="chooseCharacter"
      @choose-summoner-skill="chooseSummonerSkill"
      @choose-duo-slot-character="chooseDuoSlotCharacter"
      @choose-duo-slot-summoner-skill="chooseDuoSlotSummonerSkill"
      @update-room-settings="updateRoomSettings"
      @start-game="startGame"
      @kick-player="kickPlayer"
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
    <div v-else class="page-panel">
      <p class="empty-state">页面未找到</p>
      <button class="primary-btn" type="button" @click="router.push('/')">返回首页</button>
    </div>

    <div v-if="showLeaveConfirm" class="leave-confirm-backdrop" @click.self="showLeaveConfirm = false">
      <div class="leave-confirm-dialog">
        <p><strong>确定要离开房间吗？</strong></p>
        <p class="hint">离开后将无法恢复当前对局</p>
        <div class="leave-confirm-actions">
          <button class="secondary-btn" type="button" @click="showLeaveConfirm = false">取消</button>
          <button class="ghost-btn" type="button" @click="showLeaveConfirm = false; leaveRoom()">确认离开</button>
        </div>
      </div>
    </div>

    <AuthDialog :visible="showAuthDialog" @close="showAuthDialog = false" @updated="showAuthDialog = false" />
  </main>
</template>

<style scoped>
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-nickname {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 700;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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

.leave-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.46);
}

.leave-confirm-dialog {
  display: grid;
  gap: 12px;
  width: min(100%, 360px);
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-dialog);
  text-align: center;
}

.leave-confirm-dialog strong {
  color: var(--color-text-primary);
  font-size: 17px;
}

.leave-confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
