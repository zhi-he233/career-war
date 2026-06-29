import type { SkillOutcome } from "./skillOutcomes.js";
import type { SummonerSkillId } from "./types.js";
export interface SummonerRollChange {
    nextRoll: number;
    message: string;
}
export declare function createFirstAidOutcome(roll: number): SkillOutcome;
export declare function createIronWallOutcome(roll: number): SkillOutcome;
export declare function applyLastStandOutcome(baseOutcome: SkillOutcome): SkillOutcome;
export declare function createNonAttackSummonerSkillOutcome(skillId: SummonerSkillId, roll: number): SkillOutcome | undefined;
export declare function createSummonerRollChange(skillId: SummonerSkillId, currentRoll: number, options?: {
    reroll?: number;
}): SummonerRollChange | undefined;
