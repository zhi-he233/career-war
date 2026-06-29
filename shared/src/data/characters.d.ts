import type { Character, CharacterDifficulty, CharacterRole } from "../types.js";
export type CharacterImplementationMode = "data_driven" | "code_driven";
export type CharacterSkillPresetId = "basic_damage" | "no_damage" | "fixed_damage" | "damage_bonus" | "heal_self" | "shield_self";
export type CharacterAvailabilityMode = "classic" | "duo" | "pve" | "roguelite";
export interface EditableCharacterAvailability {
    classic: boolean;
    duo: boolean;
    pve: boolean;
    roguelite: boolean;
    hidden?: boolean;
}
export interface EditableCharacterImplementation {
    mode: CharacterImplementationMode;
    handlerId?: string;
}
export interface EditableDiceFace {
    roll: 1 | 2 | 3 | 4 | 5 | 6;
    name: string;
    description: string;
    presetId?: CharacterSkillPresetId;
    params?: Record<string, unknown>;
}
export interface EditableCharacter {
    id: string;
    name: string;
    title?: string;
    description: string;
    maxHp: number;
    avatarUrl?: string;
    spriteUrl?: string;
    tags: string[];
    difficulty: CharacterDifficulty;
    sortOrder: number;
    availability: EditableCharacterAvailability;
    implementation: EditableCharacterImplementation;
    diceFaces: EditableDiceFace[];
    role?: CharacterRole;
    shortDescription?: string;
    fullDescription?: string[];
    isImplemented?: boolean;
}
export declare const CHARACTER_SKILL_PRESET_IDS: readonly CharacterSkillPresetId[];
export declare const FALLBACK_EDITABLE_CHARACTERS: readonly EditableCharacter[];
export declare function toRuntimeCharacter(character: EditableCharacter): Character;
export declare const GENERATED_RUNTIME_CHARACTERS: readonly Character[];
