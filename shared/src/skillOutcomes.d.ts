import type { CharacterId, SkillHint } from "./types.js";
type SkillHintDraft = Pick<SkillHint, "text" | "valueText"> & {
    key: string;
};
export interface SkillOutcome {
    damage: number;
    healing: number;
    shieldGain: number;
    selfDamage: number;
    ignoresShield: boolean;
    grantsInvincible: boolean;
    executesTarget: boolean;
    flameMarksToAdd: number;
    clearsFlameMarks: boolean;
    entersGuarding: boolean;
    dice: number[];
    skillMessages: string[];
    skillHints: SkillHintDraft[];
    rogueliteSkillId?: string;
}
export declare function resolveSkill(characterId: CharacterId, first: number, previousFinalDamage: number, actorHp: number, actorMaxHp: number, targetHp: number, targetMaxHp: number, actorGuarding: boolean, targetFlameMarks: number, options?: {
    useOptionalCharacterSkill?: boolean;
    selfDamageAmount?: number;
}): SkillOutcome;
export {};
