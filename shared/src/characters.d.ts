import { type EditableCharacter } from "./data/characters.js";
import type { Character } from "./types.js";
export declare const characters: Record<string, Character>;
export declare const characterList: Character[];
export declare function replaceRuntimeCharacters(items: readonly EditableCharacter[]): void;
