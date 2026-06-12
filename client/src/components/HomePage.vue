<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { RoomListItem } from "@career-war/shared";

const props = defineProps<{
  inviteRoomId?: string;
  roomList: RoomListItem[];
}>();

const emit = defineEmits<{
  createRoom: [nickname: string];
  joinRoom: [payload: { nickname: string; roomId: string }];
  refreshRoomList: [];
}>();

const nickname = ref(localStorage.getItem("career-war-nickname") ?? "");
const roomId = ref("");
const inviteRoomId = ref("");
const isInviteMode = computed(() => Boolean(inviteRoomId.value));

onMounted(() => {
  const query = new URLSearchParams(window.location.search);
  const queryRoomId = props.inviteRoomId ?? query.get("room") ?? query.get("roomId") ?? "";
  if (queryRoomId) {
    inviteRoomId.value = queryRoomId.toUpperCase().slice(0, 4);
    roomId.value = inviteRoomId.value;
  }
  emit("refreshRoomList");
});

function rememberName(): void {
  localStorage.setItem("career-war-nickname", nickname.value.trim());
}

function createRoom(): void {
  rememberName();
  emit("createRoom", nickname.value);
}

function joinRoom(): void {
  rememberName();
  emit("joinRoom", { nickname: nickname.value, roomId: roomId.value });
}

function selectRoom(room: RoomListItem): void {
  if (!room.canJoin) return;
  roomId.value = room.roomId;
  rememberName();
  emit("joinRoom", { nickname: nickname.value, roomId: room.roomId });
}

function phaseLabel(phase: RoomListItem["phase"]): string {
  if (phase === "waiting") return "等待中";
  if (phase === "playing") return "游戏中";
  return "已结束";
}
</script>

<template>
  <section class="page-panel">
    <label class="field">
      <span>昵称</span>
      <input v-model="nickname" maxlength="12" placeholder="输入你的昵称" />
    </label>

    <button v-if="!isInviteMode" class="primary-btn" type="button" @click="createRoom">创建房间</button>

    <div v-if="!isInviteMode" class="divider">或</div>

    <template v-if="isInviteMode">
      <div class="room-code">
        <span>加入房间</span>
        <strong>{{ inviteRoomId }}</strong>
      </div>
      <button class="secondary-btn" type="button" @click="joinRoom">加入该房间</button>
    </template>

    <template v-else>
      <section class="room-list-panel">
        <div class="section-heading">
          <h2>当前房间</h2>
          <button class="ghost-btn small-btn" type="button" @click="emit('refreshRoomList')">刷新房间列表</button>
        </div>

        <p v-if="props.roomList.length === 0" class="empty-state">暂无可加入房间</p>

        <div v-else class="room-list">
          <article v-for="room in props.roomList" :key="room.roomId" class="public-room-card">
            <div>
              <strong>{{ room.roomId }}</strong>
              <p>房主：{{ room.hostName }}</p>
            </div>
            <div class="room-meta">
              <span>{{ room.playerCount }}/{{ room.maxPlayers }} 人</span>
              <span>{{ phaseLabel(room.phase) }}</span>
            </div>
            <button class="secondary-btn small-btn" type="button" :disabled="!room.canJoin" @click="selectRoom(room)">
              {{ room.canJoin ? "加入" : room.playerCount >= room.maxPlayers ? "已满" : "不可加入" }}
            </button>
          </article>
        </div>
      </section>

      <label class="field">
        <span>房间号</span>
        <input v-model="roomId" maxlength="4" placeholder="例如 A8K2" @input="roomId = roomId.toUpperCase()" />
      </label>
      <button class="secondary-btn" type="button" @click="joinRoom">加入房间</button>
    </template>
  </section>
</template>
