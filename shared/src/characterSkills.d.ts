import type { CharacterId, CharacterReactionSkillId } from "./types.js";
export interface CharacterReactionSkill {
    id: CharacterReactionSkillId;
    name: string;
}
export declare function getAvailableCharacterReactionSkill(characterId: CharacterId | undefined, roll: number): CharacterReactionSkill | undefined;
export declare function activeCharacterSkillReason(characterId: CharacterId | undefined, roll: number): string;
export declare function characterSkillDescription(skillId: CharacterReactionSkillId, roll: number): string;
