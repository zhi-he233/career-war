<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const props = defineProps<{
  inviteRoomId?: string;
}>();

const emit = defineEmits<{
  createRoom: [nickname: string];
  joinRoom: [payload: { nickname: string; roomId: string }];
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
      <label class="field">
        <span>房间号</span>
        <input v-model="roomId" maxlength="4" placeholder="例如 A8K2" @input="roomId = roomId.toUpperCase()" />
      </label>
      <button class="secondary-btn" type="button" @click="joinRoom">加入房间</button>
    </template>
  </section>
</template>
