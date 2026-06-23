import type { PlayerProfile } from "../types/profile";
/**
 * Generate a deterministic mock profile from a username.
 * Same username always returns the same mock data (for stable previews).
 *
 * When the real API is ready, this function should be replaced with:
 *   const res = await fetch("/api/profile/me", { credentials: "same-origin" });
 *   return res.json();
 */
export declare function createMockProfile(username: string): PlayerProfile;
/** Default guest profile used when no auth user is present. */
export declare const GUEST_PROFILE: PlayerProfile;
