import type { Character, RoomSettings, SummonerSkillId } from "@career-war/shared";
export type CharacterFilter = "all" | "newbie" | "attack" | "defense" | "healing" | "burst" | "special";
export type CharacterCard = Omit<Character, "id"> & {
    id: string;
};
export declare const CAREER_DETAIL_TAGS: Partial<Record<string, string[]>>;
export declare const CAREER_ART_ID_ALIASES: Record<string, string>;
export declare const FILTERS: Array<{
    id: CharacterFilter;
    label: string;
}>;
export declare const DIFFICULTY_LABELS: Record<NonNullable<Character["difficulty"]>, string>;
export declare const ROLE_LABELS: Record<NonNullable<Character["role"]>, string>;
export declare const MAX_PLAYER_OPTIONS: number[];
export declare const CHARACTER_PAGE_SIZE = 4;
export declare const DEFAULT_ROOM_SETTINGS: RoomSettings;
export declare const SUMMONER_SKILLS: Array<{
    id: SummonerSkillId;
    name: string;
    description: string;
}>;
export type SummonerSkill = (typeof SUMMONER_SKILLS)[number];
export declare const LOCKED_CHARACTERS: CharacterCard[];
