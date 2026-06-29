import { FALLBACK_EDITABLE_CHARACTERS, toRuntimeCharacter, } from "./data/characters.js";
function sortRuntimeCharacters(items) {
    return [...items].sort((a, b) => {
        const sortA = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const sortB = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        return sortA - sortB || a.name.localeCompare(b.name);
    });
}
function buildCharacterMap(items) {
    return Object.fromEntries(items.map((item) => [item.id, toRuntimeCharacter(item)]));
}
export const characters = buildCharacterMap(FALLBACK_EDITABLE_CHARACTERS);
export const characterList = sortRuntimeCharacters(Object.values(characters));
export function replaceRuntimeCharacters(items) {
    for (const key of Object.keys(characters)) {
        delete characters[key];
    }
    for (const item of items) {
        characters[item.id] = toRuntimeCharacter(item);
    }
    characterList.splice(0, characterList.length, ...sortRuntimeCharacters(Object.values(characters)));
}
