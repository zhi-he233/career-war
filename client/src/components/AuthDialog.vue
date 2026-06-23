<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useAuth } from "../composables/useAuth";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: []; updated: [] }>();

const { register, login } = useAuth();

const mode = ref<"login" | "register">("login");
const username = ref("");
const password = ref("");
const error = ref("");
const submitting = ref(false);
const usernameInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      mode.value = "login";
      username.value = "";
      password.value = "";
      error.value = "";
      submitting.value = false;
      await nextTick();
      usernameInput.value?.focus();
    }
  },
);

// Clear error when switching between login/register
watch(mode, () => {
  error.value = "";
});

async function handleSubmit() {
  error.value = "";
  submitting.value = true;

  try {
    let result;
    if (mode.value === "register") {
      result = await register(username.value.trim(), password.value);
    } else {
      result = await login(username.value.trim(), password.value);
    }

    if (!result.ok) {
      error.value = result.error;
      return;
    }

    emit("updated");
    emit("close");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div v-if="visible" class="auth-backdrop" @click.self="emit('close')">
    <div class="auth-dialog">
      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ active: mode === 'login' }"
          type="button"
          @click="mode = 'login'"
        >
          登录
        </button>
        <button
          class="auth-tab"
          :class="{ active: mode === 'register' }"
          type="button"
          @click="mode = 'register'"
        >
          注册
        </button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="field">
          <input
            ref="usernameInput"
            v-model="username"
            type="text"
            placeholder="用户名（也是游戏名）"
            autocomplete="username"
            maxlength="20"
            :disabled="submitting"
          />
        </div>

        <div class="field">
          <input
            v-model="password"
            type="password"
            placeholder="密码（至少6位）"
            autocomplete="current-password"
            maxlength="128"
            :disabled="submitting"
          />
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button
          class="primary-btn auth-submit"
          type="submit"
          :disabled="submitting"
        >
          {{ submitting ? "请稍候…" : mode === "register" ? "注册并登录" : "登录" }}
        </button>
      </form>

      <p class="auth-hint">登录后可保存游戏进度</p>
    </div>
  </div>
</template>

<style scoped>
.auth-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.46);
  animation: backdrop-in 180ms ease;
}

.auth-dialog {
  display: grid;
  gap: 16px;
  width: min(100%, 360px);
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-dialog);
  animation: dialog-up 200ms ease;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.auth-tab {
  min-height: 40px;
  border: 0;
  background: var(--color-bg-neutral);
  color: var(--color-text-muted);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.auth-tab.active {
  background: var(--color-primary);
  color: var(--color-text-on-dark);
}

.auth-form {
  display: grid;
  gap: 12px;
}

.auth-form .field input {
  width: 100%;
}

.auth-error {
  margin: 0;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  background: var(--color-danger-bg);
  color: #991b1b;
  font-size: 13px;
  font-weight: 700;
}

.auth-submit {
  width: 100%;
}

.auth-hint {
  margin: 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
