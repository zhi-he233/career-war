<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { GameMode, RoomListItem } from "@career-war/shared";

const props = defineProps<{
  inviteRoomId?: string;
  roomList: RoomListItem[];
  initialMode?: GameMode | null;
}>();

const emit = defineEmits<{
  backHome: [];
  createRoom: [payload: { nickname: string; gameMode: GameMode }];
  joinRoom: [payload: { nickname: string; roomId: string; gameMode?: GameMode }];
  refreshRoomList: [];
}>();

const nickname = ref(localStorage.getItem("career-war-nickname") ?? "");
const roomId = ref("");
const inviteRoomId = ref("");
const selectedMode = ref<GameMode | null>(null);
const submitting = ref(false);
const isInviteMode = computed(() => Boolean(inviteRoomId.value));
const visibleRoomList = computed(() => props.roomList.filter((room) => isRoomVisibleForSelectedMode(room)));
const isPveMode = computed(() => selectedMode.value === "pve_1v1");
const selectedModeTitle = computed(() => {
  if (selectedMode.value === "duo_2v2") return "2V2 双角色房间";
  if (selectedMode.value === "pve_1v1") return "人机练习";
  return "经典对战房间";
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
  }
);

function openClassicMode(): void {
  selectedMode.value = "classic";
  emit("refreshRoomList");
}

function openDuoMode(): void {
  selectedMode.value = "duo_2v2";
  emit("refreshRoomList");
}

function openPveMode(): void {
  selectedMode.value = "pve_1v1";
}

function backToModeSelect(): void {
  selectedMode.value = null;
}

function rememberName(): void {
  localStorage.setItem("career-war-nickname", nickname.value.trim());
}

let submittingTimer: number | undefined;

function createRoom(): void {
  if (!selectedMode.value || submitting.value) return;
  submitting.value = true;
  rememberName();
  emit("createRoom", { nickname: nickname.value, gameMode: selectedMode.value });
  submittingTimer = window.setTimeout(() => { submitting.value = false; }, 3000);
}

function joinRoom(): void {
  if (!selectedMode.value || submitting.value) return;
  submitting.value = true;
  rememberName();
  emit("joinRoom", { nickname: nickname.value, roomId: roomId.value, gameMode: selectedMode.value });
  submittingTimer = window.setTimeout(() => { submitting.value = false; }, 3000);
}

function selectRoom(room: RoomListItem): void {
  if (!room.canJoin || !selectedMode.value || submitting.value) return;
  submitting.value = true;
  roomId.value = room.roomId;
  rememberName();
  emit("joinRoom", { nickname: nickname.value, roomId: room.roomId, gameMode: selectedMode.value });
  submittingTimer = window.setTimeout(() => { submitting.value = false; }, 3000);
}

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

      <button class="pvp-mode-card available" type="button" @click="openPveMode">
        <span class="mode-status ready">可进入</span>
        <strong>人机练习</strong>
        <small>单人 1V1：创建练习房间后选择职业和召唤师技能，开始后自动生成 AI 对手。</small>
      </button>
    </div>

    <section v-else class="page-panel pvp-room-flow">
      <div class="section-heading">
        <h2>{{ selectedModeTitle }}</h2>
        <button class="ghost-btn small-btn" type="button" @click="backToModeSelect">返回模式选择</button>
      </div>

      <label class="field">
        <span>昵称</span>
        <input v-model="nickname" maxlength="12" placeholder="输入你的昵称" />
      </label>

      <button v-if="!isInviteMode" class="primary-btn" type="button" :disabled="submitting" @click="createRoom">{{ submitting ? "创建中……" : isPveMode ? "创建人机练习" : "创建房间" }}</button>

      <div v-if="!isInviteMode && !isPveMode" class="divider">或</div>

      <template v-if="isInviteMode">
        <div class="room-code">
          <span>加入房间</span>
          <strong>{{ inviteRoomId }}</strong>
        </div>
        <button class="secondary-btn" type="button" :disabled="submitting" @click="joinRoom">{{ submitting ? "加入中……" : "加入该房间" }}</button>
      </template>

      <template v-else-if="!isPveMode">
        <section class="room-list-panel">
          <div class="section-heading">
            <h2>当前房间</h2>
            <button class="ghost-btn small-btn" type="button" @click="emit('refreshRoomList')">刷新房间列表</button>
          </div>

          <p v-if="visibleRoomList.length === 0" class="empty-state">暂无可加入房间</p>

          <div v-else class="room-list">
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
        </section>

        <label class="field">
          <span>房间号</span>
          <input v-model="roomId" maxlength="4" placeholder="例如 A8K2" @input="roomId = roomId.toUpperCase()" />
        </label>
        <button class="secondary-btn" type="button" :disabled="submitting" @click="joinRoom">{{ submitting ? "加入中……" : "加入房间" }}</button>
      </template>
    </section>
  </section>
</template>

<style scoped>
.pvp-page {
  display: grid;
  gap: 12px;
}

.pvp-heading {
  display: grid;
  gap: 10px;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

.pvp-heading h2 {
  margin: 3px 0 0;
  color: #172033;
  font-size: 24px;
}

.pvp-heading .ghost-btn {
  justify-self: start;
}

.pvp-mode-grid {
  display: grid;
  gap: 10px;
}

.pvp-mode-card {
  display: grid;
  gap: 8px;
  min-height: 116px;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  padding: 15px;
  background: #ffffff;
  text-align: left;
}

button.pvp-mode-card {
  cursor: pointer;
}

.pvp-mode-card.available {
  border-color: #2563eb;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
}

.pvp-mode-card.disabled {
  background: #f8fafc;
  color: #64748b;
}

.pvp-mode-card strong {
  color: #172033;
  font-size: 20px;
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
  gap: 12px;
}

@media (min-width: 760px) {
  .pvp-mode-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
