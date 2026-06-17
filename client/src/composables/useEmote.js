import { onUnmounted, ref } from "vue";
const EMOTE_DISPLAY_MS = 1500;
/**
 * Pure emote display state machine.
 *
 * Owns: active emotes map, send lock, per-player hide timers, cleanup.
 * Does NOT own: socket calls, game rules, emoji definitions.
 */
export function useEmote() {
    const activeEmotes = ref({});
    const locked = ref(false);
    let unlockTimer;
    const emoteTimers = new Map();
    /* ---- send lock ---- */
    /** Prevent emote spam. BattlePage must call socket.emit itself. */
    function lock() {
        locked.value = true;
        window.clearTimeout(unlockTimer);
        unlockTimer = window.setTimeout(() => {
            locked.value = false;
            unlockTimer = undefined;
        }, EMOTE_DISPLAY_MS);
    }
    /* ---- display ---- */
    /** Show an emote bubble for a player. Hides automatically after EMOTE_DISPLAY_MS. */
    function showEmote(event, emoji) {
        window.clearTimeout(emoteTimers.get(event.playerId));
        activeEmotes.value = {
            ...activeEmotes.value,
            [event.playerId]: {
                key: `${event.playerId}-${event.createdAt}-${event.emoteId}`,
                emoji,
                createdAt: event.createdAt
            }
        };
        const timer = window.setTimeout(() => {
            const current = activeEmotes.value[event.playerId];
            if (current?.createdAt !== event.createdAt)
                return;
            const next = { ...activeEmotes.value };
            delete next[event.playerId];
            activeEmotes.value = next;
            emoteTimers.delete(event.playerId);
        }, EMOTE_DISPLAY_MS);
        emoteTimers.set(event.playerId, timer);
    }
    /** Look up the currently-displayed emote for a player. */
    function getEmote(playerId, controllerId) {
        return activeEmotes.value[playerId] ?? (controllerId ? activeEmotes.value[controllerId] : undefined);
    }
    /* ---- cleanup ---- */
    function clearAll() {
        window.clearTimeout(unlockTimer);
        for (const timer of emoteTimers.values())
            window.clearTimeout(timer);
        emoteTimers.clear();
        activeEmotes.value = {};
    }
    onUnmounted(clearAll);
    return { activeEmotes, locked, lock, showEmote, getEmote, clearAll };
}
