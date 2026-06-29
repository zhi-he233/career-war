<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { GameMode, RoomListItem } from "@career-war/shared";

const props = defineProps<{
  inviteRoomId?: string;
  roomList: RoomListItem[];
  initialMode?: GameMode | null;
  playerName: string;
}>();

const emit = defineEmits<{
  backHome: [];
  createRoom: [payload: { nickname: string; gameMode: GameMode }];
  joinRoom: [payload: { nickname: string; roomId: string; gameMode?: GameMode }];
  refreshRoomList: [];
}>();

const roomId = ref("");
const inviteRoomId = ref("");
const selectedMode = ref<GameMode | null>(null);
const roomView = ref<"entry" | "list">("entry");
const submitting = ref(false);
const joinError = ref("");
const isInviteMode = computed(() => Boolean(inviteRoomId.value));
const visibleRoomList = computed(() => props.roomList.filter((room) => isRoomVisibleForSelectedMode(room)));
const joinableRoomList = computed(() => visibleRoomList.value.filter((room) => room.canJoin));
const isPveMode = computed(() => selectedMode.value === "pve_1v1");
const isRoomEntryMode = computed(() => selectedMode.value === "classic" || selectedMode.value === "duo_2v2");
const canJoinByCode = computed(() => roomId.value.trim().length === 4);
const selectedModeTitle = computed(() => {
  if (selectedMode.value === "duo_2v2") return "2V2 双角色";
  if (selectedMode.value === "pve_1v1") return "人机练习";
  return "经典对战";
});
const selectedModeSummary = computed(() => {
  if (selectedMode.value === "duo_2v2") return "同样使用快速匹配、创建房间和公开房间入口。";
  if (selectedMode.value === "pve_1v1") return "创建一局人机练习，进入选角后开打。";
  return "快速进入可加入房间；没有公开房间时会创建新房间等待对手。";
});

onMounted(() => {
  const query = new URLSearchParams(window.location.search);
  const queryRoomId = props.inviteRoomId ?? query.get("room") ?? query.get("roomId") ?? "";
  if (queryRoomId) {
    inviteRoomId.value = queryRoomId.toUpperCase().slice(0, 4);
    roomId.value = inviteRoomId.value;
    selectedMode.value = "classic";
    return;
  }
  if (props.initialMode) selectedMode.value = props.initialMode;
});

watch(
  () => props.initialMode,
  (mode) => {
    selectedMode.value = mode ?? null;
    roomView.value = "entry";
  }
);

function openClassicMode(): void {
  selectedMode.value = "classic";
  roomView.value = "entry";
  emit("refreshRoomList");
}

function openDuoMode(): void {
  selectedMode.value = "duo_2v2";
  roomView.value = "entry";
  emit("refreshRoomList");
}

function backToModeSelect(): void {
  selectedMode.value = null;
  roomView.value = "entry";
}

function normalizedNickname(): string {
  return props.playerName.trim() || "玩家";
}

function rememberName(): void {
  const name = normalizedNickname();
  localStorage.setItem("career-war-nickname", name);
}

let submittingTimer: number | undefined;

function clearSubmittingTimer(): void {
  if (submittingTimer) {
    window.clearTimeout(submittingTimer);
    submittingTimer = undefined;
  }
}

function startSubmitting(timeoutMs = 1800, timeoutMessage = ""): void {
  submitting.value = true;
  joinError.value = "";
  clearSubmittingTimer();
  submittingTimer = window.setTimeout(() => {
    submitting.value = false;
    if (timeoutMessage) joinError.value = timeoutMessage;
    submittingTimer = undefined;
  }, timeoutMs);
}

function updateRoomId(value: string): void {
  roomId.value = value.toUpperCase();
  joinError.value = "";
}

function createRoom(): void {
  if (!selectedMode.value || submitting.value) return;
  startSubmitting(3000);
  rememberName();
  emit("createRoom", { nickname: normalizedNickname(), gameMode: selectedMode.value });
}

function startMatching(): void {
  if (!selectedMode.value || submitting.value) return;
  const joinableRoom = joinableRoomList.value[0];
  if (joinableRoom) {
    selectRoom(joinableRoom);
    return;
  }
  createRoom();
}

function joinRoom(): void {
  if (!selectedMode.value || submitting.value || !canJoinByCode.value) return;
  startSubmitting(1600, "房间不存在，请检查房间号");
  rememberName();
  emit("joinRoom", { nickname: normalizedNickname(), roomId: roomId.value, gameMode: selectedMode.value });
}

function selectRoom(room: RoomListItem): void {
  if (!room.canJoin || !selectedMode.value || submitting.value) return;
  startSubmitting(1600, "房间不存在，请检查房间号");
  roomId.value = room.roomId;
  rememberName();
  emit("joinRoom", { nickname: normalizedNickname(), roomId: room.roomId, gameMode: selectedMode.value });
}

function openRoomList(): void {
  roomView.value = "list";
  emit("refreshRoomList");
}

function backToRoomEntry(): void {
  roomView.value = "entry";
}

onBeforeUnmount(clearSubmittingTimer);

function isRoomVisibleForSelectedMode(room: RoomListItem): boolean {
  if (selectedMode.value === "classic") return room.gameMode === undefined || room.gameMode === "classic";
  if (selectedMode.value === "pve_1v1") return false;
  return room.gameMode === selectedMode.value;
}

function phaseLabel(phase: RoomListItem["phase"]): string {
  if (phase === "waiting") return "等待中";
  if (phase === "playing") return "游戏中";
  return "已结束";
}
</script>

<template>
  <section class="pvp-page">
    <div class="pvp-heading">
      <button class="ghost-btn small-btn" type="button" @click="emit('backHome')">返回主页</button>
      <div>
        <p class="eyebrow">玩家对战</p>
        <h2>选择对战模式</h2>
        <span class="pvp-user-chip">{{ normalizedNickname() }}</span>
      </div>
    </div>

    <div v-if="selectedMode === null" class="pvp-mode-grid">
      <button class="pvp-mode-card available" type="button" @click="openClassicMode">
        <span class="mode-status ready">可进入</span>
        <strong>1V1 / 自由对战</strong>
        <small>复用当前房间系统，支持创建房间、加入房间、房间列表、职业选择和战斗。</small>
      </button>

      <button class="pvp-mode-card available" type="button" @click="openDuoMode">
        <span class="mode-status ready">可进入</span>
        <strong>2V2 双角色（测试版）</strong>
        <small>两名真实玩家，每人控制两个同阵营角色，支持选角、投骰和行动结算。</small>
      </button>
    </div>

    <section v-else class="page-panel pvp-room-flow" :class="{ 'is-list-view': roomView === 'list' }">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ roomView === "list" ? "公开房间" : "当前模式" }}</p>
          <h2>{{ roomView === "list" ? `${selectedModeTitle}房间` : selectedModeTitle }}</h2>
        </div>
        <button class="ghost-btn small-btn" type="button" @click="roomView === 'list' ? backToRoomEntry() : backToModeSelect()">
          {{ roomView === "list" ? "返回入口" : "返回模式选择" }}
        </button>
      </div>

      <p v-if="joinError" class="pvp-alert">{{ joinError }}</p>

      <template v-if="isInviteMode">
        <div class="room-code">
          <span>加入房间</span>
          <strong>{{ inviteRoomId }}</strong>
        </div>
        <button class="secondary-btn" type="button" :disabled="submitting" @click="joinRoom">{{ submitting ? "加入中……" : "加入该房间" }}</button>
      </template>

      <template v-else-if="isPveMode">
        <p class="pvp-mode-note">{{ selectedModeSummary }}</p>
        <button class="primary-btn" type="button" :disabled="submitting" @click="createRoom">{{ submitting ? "创建中……" : "创建人机练习" }}</button>
      </template>

      <template v-else-if="isRoomEntryMode && roomView === 'entry'">
        <div class="pvp-entry-card">
          <p class="pvp-mode-note">{{ selectedModeSummary }}</p>
          <button class="primary-btn match-btn" type="button" :disabled="submitting" @click="startMatching">
            {{ submitting ? "匹配中……" : "开始匹配" }}
          </button>
          <button class="secondary-btn create-room-btn" type="button" :disabled="submitting" @click="createRoom">
            {{ submitting ? "创建中……" : "创建房间" }}
          </button>
        </div>

        <section class="join-code-panel">
          <label class="field">
            <span>房间号</span>
            <input :value="roomId" maxlength="4" placeholder="例如 A8K2" @input="updateRoomId(($event.target as HTMLInputElement).value)" />
          </label>
          <button class="secondary-btn" type="button" :disabled="submitting || !canJoinByCode" @click="joinRoom">{{ submitting ? "加入中……" : "加入房间" }}</button>
        </section>

        <button class="ghost-btn room-list-link" type="button" @click="openRoomList">
          查看公开房间<span v-if="visibleRoomList.length">（{{ visibleRoomList.length }}）</span>
        </button>
      </template>

      <template v-else-if="isRoomEntryMode">
        <div class="room-list-toolbar">
          <button class="ghost-btn small-btn" type="button" @click="emit('refreshRoomList')">刷新房间列表</button>
          <button class="secondary-btn small-btn" type="button" :disabled="submitting" @click="createRoom">
            {{ submitting ? "创建中……" : "创建房间" }}
          </button>
        </div>

        <p v-if="visibleRoomList.length === 0" class="empty-state room-list-empty">暂无可加入房间</p>

        <div v-else class="room-list standalone-room-list">
          <article v-for="room in visibleRoomList" :key="room.roomId" class="public-room-card">
            <div>
              <strong>{{ room.roomId }}</strong>
              <p>房主：{{ room.hostName }}</p>
            </div>
            <div class="room-meta">
              <span>{{ room.playerCount }}/{{ room.maxPlayers }} 人</span>
              <span>{{ phaseLabel(room.phase) }}</span>
            </div>
            <button class="secondary-btn small-btn" type="button" :disabled="!room.canJoin || submitting" @click="selectRoom(room)">
              {{ submitting ? "加入中……" : room.canJoin ? "加入" : room.playerCount >= room.maxPlayers ? "已满" : "不可加入" }}
            </button>
          </article>
        </div>
      </template>
    </section>
  </section>
</template>

<style scoped>
.pvp-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px !important;
  align-content: start;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.pvp-heading {
  display: grid;
  gap: 10px;
  min-width: 0;
  border: 1px solid rgba(17, 17, 17, 0.38) !important;
  border-radius: 14px !important;
  padding: 12px !important;
  background: rgba(255, 250, 240, 0.72) !important;
  box-shadow: none !important;
}

.pvp-heading h2 {
  margin: 3px 0 0;
  color: #172033;
  font-size: 24px;
  font-family: "Trebuchet MS", "Arial Rounded MT Bold", "Microsoft YaHei", sans-serif;
}

.pvp-user-chip {
  display: inline-flex;
  max-width: 100%;
  margin-top: 6px;
  padding: 3px 8px;
  border: 1px solid rgba(17, 17, 17, 0.35);
  border-radius: 999px;
  background: #ffffff;
  color: #172033;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
}

.pvp-heading .ghost-btn {
  justify-self: start;
}

.pvp-page .ghost-btn.small-btn {
  border-width: 1px !important;
  box-shadow: none !important;
}

.pvp-mode-grid {
  display: grid;
  gap: 14px !important;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.pvp-mode-card {
  display: grid;
  gap: 8px;
  min-height: 116px;
  position: relative;
  overflow: hidden;
  border: 2px solid #111111 !important;
  border-radius: 16px !important;
  padding: 14px !important;
  background: #fffaf0 !important;
  text-align: left;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.22) !important;
}

button.pvp-mode-card {
  cursor: pointer;
}

.pvp-mode-card::after {
  content: "";
  position: absolute;
  inset: auto -20px -24px auto;
  width: 84px;
  height: 84px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(245, 158, 11, 0.16));
  transform: rotate(16deg);
  pointer-events: none;
}

.pvp-mode-card.available {
  border-color: #111111 !important;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.22) !important;
}

.pvp-mode-card.disabled {
  background: #f8fafc;
  color: #64748b;
}

.pvp-mode-card strong {
  color: #172033;
  font-size: 20px;
  font-family: "Trebuchet MS", "Arial Rounded MT Bold", "Microsoft YaHei", sans-serif;
  line-height: 1.25;
}

.pvp-mode-card small {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
}

.mode-status {
  justify-self: start;
  border-radius: 999px;
  padding: 3px 8px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 900;
}

.mode-status.ready {
  background: #dbeafe;
  color: #1d4ed8;
}

.pvp-room-flow {
  align-content: start;
  grid-auto-rows: auto;
  gap: 12px !important;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  border: 2px solid #111111 !important;
  border-radius: 16px !important;
  padding: 14px !important;
  background: #fffaf0 !important;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.2) !important;
}

.pvp-room-flow.is-list-view {
  grid-template-rows: auto auto minmax(0, 1fr);
  align-content: stretch;
  overflow: hidden !important;
}

.pvp-room-flow .section-heading {
  min-width: 0;
  gap: 12px !important;
}

.pvp-room-flow .section-heading h2 {
  margin: 2px 0 0 !important;
}

.pvp-mode-note {
  color: #4b5563;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.pvp-entry-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 2px solid #111111;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 250, 240, 0.82)),
    #fffaf0;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.18);
}

.pvp-entry-card .match-btn {
  min-height: 68px !important;
  border-width: 3px !important;
  border-radius: 18px !important;
  background: #111111 !important;
  color: #fffaf0 !important;
  font-size: 22px !important;
  font-weight: 1000 !important;
  letter-spacing: 0 !important;
  box-shadow: 0 5px 0 rgba(17, 17, 17, 0.28) !important;
}

.pvp-entry-card .create-room-btn {
  min-height: 48px !important;
  border-width: 2px !important;
  border-radius: 14px !important;
  background: #fffaf0 !important;
  color: #111111 !important;
  font-size: 15px !important;
  box-shadow: 0 2px 0 rgba(17, 17, 17, 0.2) !important;
}

.join-code-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
  padding: 10px;
  border: 1px solid rgba(17, 17, 17, 0.36);
  border-radius: 14px;
  background: #ffffff;
}

.join-code-panel .field {
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
}

.join-code-panel .secondary-btn {
  min-width: 92px;
  min-height: 46px !important;
  border-radius: 12px !important;
}

.room-list-link {
  justify-self: stretch;
  min-height: 42px !important;
  border-style: dashed !important;
  background: #ffffff !important;
  color: #172033 !important;
  box-shadow: none !important;
}

.room-list-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.room-list-toolbar .small-btn {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: 42px !important;
  padding: 8px 10px !important;
  white-space: nowrap;
}

.room-list-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  border: 2px dashed rgba(17, 17, 17, 0.34);
  border-radius: 16px;
  background: #ffffff;
  color: #4b5563;
  font-weight: 900;
}

.pvp-room-flow .field {
  border-width: 1px !important;
  border-color: rgba(17, 17, 17, 0.34) !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.62) !important;
  box-shadow: none !important;
}

.pvp-room-flow input {
  border-width: 1px !important;
  box-shadow: none !important;
}

.pvp-room-flow .secondary-btn,
.pvp-room-flow .ghost-btn {
  border-width: 1px !important;
  box-shadow: none !important;
}

.pvp-room-flow > .primary-btn {
  border-width: 2px !important;
  box-shadow: inset 0 0 0 2px #111111, 0 2px 4px rgba(17, 17, 17, 0.12) !important;
}

.pvp-room-flow .room-list-panel {
  min-height: 0;
  border-width: 1px !important;
  border-color: rgba(17, 17, 17, 0.28) !important;
  box-shadow: none !important;
}

.pvp-room-flow .room-list {
  min-height: 0;
  max-height: min(48vh, 380px);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.pvp-room-flow .standalone-room-list {
  max-height: none !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding-right: 2px;
}

.pvp-room-flow .public-room-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  border-width: 1px !important;
  box-shadow: none !important;
}

.pvp-room-flow .public-room-card .room-meta {
  grid-column: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pvp-room-flow .public-room-card .small-btn {
  grid-column: 2;
  grid-row: 1 / span 2;
  min-width: 64px !important;
  max-width: 82px !important;
}

@media (max-width: 430px) {
  .pvp-page {
    gap: 10px !important;
  }

  .pvp-heading {
    padding: 10px !important;
  }

  .pvp-heading h2 {
    font-size: 20px;
  }

  .pvp-room-flow {
    gap: 10px !important;
    padding: 12px !important;
  }

  .pvp-entry-card {
    gap: 8px;
    padding: 10px;
  }

  .pvp-entry-card .match-btn {
    min-height: 62px !important;
    font-size: 20px !important;
  }

  .join-code-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .join-code-panel .secondary-btn {
    width: 100%;
  }
}

@media (min-width: 760px) {
  .pvp-mode-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
