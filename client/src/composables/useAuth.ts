import { computed, ref } from "vue";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
  displayName: string;
  avatar: string;
  tutorialCompleted: boolean;
  createdAt: string;
}

interface AuthResult {
  ok: true;
  data: PublicUser;
}

interface AuthError {
  ok: false;
  error: string;
}

type AuthResponse = AuthResult | AuthError;

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const currentUser = ref<PublicUser | null>(null);
const loading = ref(true);
const isLoggedIn = computed(() => currentUser.value !== null);
const isAuthenticated = isLoggedIn; // alias
const isLoading = loading; // alias
const displayName = computed(() => currentUser.value?.username ?? "游客");

let initPromise: Promise<void> | null = null;

async function fetchMe(): Promise<void> {
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      currentUser.value = data ?? null;
    }
  } catch {
    currentUser.value = null;
  } finally {
    loading.value = false;
  }
}

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = fetchMe();
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function register(
  username: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "注册失败" };
    }
    currentUser.value = data;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "网络错误，请稍后再试" };
  }
}

async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "登录失败" };
    }
    currentUser.value = data;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "网络错误，请稍后再试" };
  }
}

async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } finally {
    currentUser.value = null;
  }
}

async function updateProfile(
  patch: Partial<Pick<PublicUser, "avatar">> & { tutorialCompleted?: boolean },
): Promise<AuthResponse> {
  try {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "更新失败" };
    }
    currentUser.value = data;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "网络错误" };
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAuth() {
  // Kick off initial fetch on first access
  ensureInit();

  return {
    user: currentUser,
    currentUser,
    isLoggedIn,
    isAuthenticated,
    isLoading,
    loading,
    displayName,
    fetchMe,
    refreshMe: fetchMe,
    register,
    login,
    logout,
    updateProfile,
  };
}
