import type { PlayerEmoteEvent } from "@career-war/shared";
export interface VisibleEmote {
    key: string;
    emoji: string;
    createdAt: number;
}
/**
 * Pure emote display state machine.
 *
 * Owns: active emotes map, send lock, per-player hide timers, cleanup.
 * Does NOT own: socket calls, game rules, emoji definitions.
 */
export declare function useEmote(): {
    activeEmotes: import("vue").Ref<Record<string, VisibleEmote>, Record<string, VisibleEmote>>;
    locked: import("vue").Ref<boolean, boolean>;
    lock: () => void;
    showEmote: (event: PlayerEmoteEvent, emoji: string) => void;
    getEmote: (playerId: string, controllerId?: string) => VisibleEmote | undefined;
    clearAll: () => void;
};
