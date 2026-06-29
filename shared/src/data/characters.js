import { GENERATED_CHARACTERS } from "./characters.generated.js";
export const CHARACTER_SKILL_PRESET_IDS = [
    "basic_damage",
    "no_damage",
    "fixed_damage",
    "damage_bonus",
    "heal_self",
    "shield_self",
];
export const FALLBACK_EDITABLE_CHARACTERS = GENERATED_CHARACTERS;
export function toRuntimeCharacter(character) {
    const fullDescription = character.fullDescription?.length
        ? character.fullDescription
        : character.diceFaces
            .slice()
            .sort((a, b) => a.roll - b.roll)
            .map((face) => `${face.roll}. ${face.name}: ${face.description}`);
    return {
        id: character.id,
        name: character.name,
        title: character.title,
        maxHp: character.maxHp,
        description: fullDescription.length > 0 ? fullDescription : [character.description],
        difficulty: character.difficulty,
        role: character.role,
        tags: [...character.tags],
        shortDescription: character.shortDescription ?? character.description,
        fullDescription,
        isImplemented: character.isImplemented ?? character.implementation.mode === "code_driven",
        isHidden: character.availability.hidden === true,
        avatarUrl: character.avatarUrl,
        spriteUrl: character.spriteUrl,
        availability: { ...character.availability },
        implementation: { ...character.implementation },
        diceFaces: character.diceFaces.map((face) => ({ ...face, params: face.params ? { ...face.params } : undefined })),
        sortOrder: character.sortOrder,
    };
}
export const GENERATED_RUNTIME_CHARACTERS = FALLBACK_EDITABLE_CHARACTERS.map(toRuntimeCharacter);
