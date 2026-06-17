import { computed, ref } from "vue";
// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------
const currentUser = ref(null);
const loading = ref(true);
const isLoggedIn = computed(() => currentUser.value !== null);
let initPromise = null;
async function fetchMe() {
    try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        if (res.ok) {
            const data = await res.json();
            currentUser.value = data ?? null;
        }
    }
    catch {
        currentUser.value = null;
    }
    finally {
        loading.value = false;
    }
}
async function ensureInit() {
    if (!initPromise) {
        initPromise = fetchMe();
    }
    return initPromise;
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
async function register(username, password) {
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
    }
    catch {
        return { ok: false, error: "网络错误，请稍后再试" };
    }
}
async function login(username, password) {
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
    }
    catch {
        return { ok: false, error: "网络错误，请稍后再试" };
    }
}
async function logout() {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
        });
    }
    finally {
        currentUser.value = null;
    }
}
async function updateProfile(patch) {
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
    }
    catch {
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
        currentUser,
        isLoggedIn,
        loading,
        fetchMe,
        register,
        login,
        logout,
        updateProfile,
    };
}
