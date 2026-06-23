// ---------------------------------------------------------------------------
// useProfile — player profile state management
// ---------------------------------------------------------------------------
// Currently backed by deterministic mock data (profileMock.ts).
// When a real /api/profile/me endpoint exists, replace refreshProfile()
// internals with a fetch call.  All consumers import from here — no mock
// data should leak into UI components.
// ---------------------------------------------------------------------------

import { computed, ref, watch } from "vue";
import { createMockProfile, GUEST_PROFILE } from "../data/profileMock";
import type { PlayerProfile } from "../types/profile";
import { useAuth } from "./useAuth";

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const profile = ref<PlayerProfile | null>(null);
const loading = ref(true);
const error = ref("");

let initDone = false;

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function refreshProfile(username: string): Promise<void> {
  loading.value = true;
  error.value = "";

  try {
    // --- Replace this block with a real API call when ready ---
    // const res = await fetch("/api/profile/me", { credentials: "same-origin" });
    // if (!res.ok) throw new Error((await res.json()).error ?? "获取档案失败");
    // profile.value = await res.json();
    // -----------------------------------------------------------
    profile.value = createMockProfile(username);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "获取档案失败";
    profile.value = null;
  } finally {
    loading.value = false;
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useProfile() {
  const { currentUser, isLoggedIn, isLoading: authLoading } = useAuth();

  // Wait for auth to resolve, then load the right profile.
  if (!initDone) {
    initDone = true;

    // One-off watch: when auth finishes loading, generate the initial profile.
    const stopAuthWatch = watch(authLoading, (v) => {
      if (v) return; // still loading
      const username = currentUser.value?.username ?? "游客骰王";
      refreshProfile(username);
      stopAuthWatch();
    });

    // If auth already loaded (e.g. second call in the same session), fire now.
    if (!authLoading.value) {
      stopAuthWatch();
      const username = currentUser.value?.username ?? "游客骰王";
      refreshProfile(username);
    }
  }

  // After initial load, react to login / logout.
  watch(isLoggedIn, (loggedIn) => {
    const username = loggedIn
      ? currentUser.value?.username ?? "游客骰王"
      : "游客骰王";
    refreshProfile(username);
  });

  return {
    /** Current player profile (null while loading or on error). */
    profile,
    /** True while the profile is being fetched/generated. */
    loading,
    /** Error message if profile generation failed. */
    error,
    /** Manually refresh the profile. Replace internals for real API. */
    refreshProfile: () => {
      const username = currentUser.value?.username ?? "游客骰王";
      return refreshProfile(username);
    },
    /** Convenience: true once a profile is available. */
    hasProfile: computed(() => profile.value !== null),
  };
}
