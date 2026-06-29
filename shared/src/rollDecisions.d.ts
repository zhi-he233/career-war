import type { CharacterReactionSkillId, PendingRollDecision, RollActionType, RollDecisionAvailableAction, RollDecisionChoice, SummonerSkillId } from "./types.js";
export declare function normalizeRollDecisionChoice(choice: RollDecisionChoice): RollActionType;
export declare function getAllowedRollDecisionAction(decision: PendingRollDecision, normalizedChoice: RollActionType, requestedSkillId?: SummonerSkillId): RollDecisionAvailableAction;
export declare function createSummonerChangedRollDecision(decision: PendingRollDecision, options: {
    id: string;
    nextRoll: number;
    characterSkill?: {
        id: CharacterReactionSkillId;
        name: string;
    };
    availableActions: RollDecisionAvailableAction[];
    usedSummonerSkillId: SummonerSkillId;
}): PendingRollDecision;
export declare function createSummonerChangedRollResolution(decision: PendingRollDecision, options: {
    id: string;
    nextRoll: number;
    characterSkill?: {
        id: CharacterReactionSkillId;
        name: string;
    };
    availableActions: RollDecisionAvailableAction[];
    usedSummonerSkillId: SummonerSkillId;
}): {
    decision: PendingRollDecision;
    shouldWaitForCharacterSkill: boolean;
};
