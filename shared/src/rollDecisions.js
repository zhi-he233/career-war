export function normalizeRollDecisionChoice(choice) {
    return choice === "settle" ? "normal_attack" : choice;
}
export function getAllowedRollDecisionAction(decision, normalizedChoice, requestedSkillId) {
    const action = decision.availableActions?.find((item) => item.id === normalizedChoice);
    if (!action)
        throw new Error("当前没有这个骰子卡槽");
    if (!action.enabled)
        throw new Error(action.reason ?? "当前卡槽不可用");
    if (normalizedChoice === "summoner_skill" && requestedSkillId && action.skillId !== requestedSkillId)
        throw new Error("召唤师技能不匹配");
    if (normalizedChoice === "character_skill" && action.skillId !== decision.availableCharacterSkillId)
        throw new Error("职业技能不匹配");
    return action;
}
export function createSummonerChangedRollDecision(decision, options) {
    return {
        ...decision,
        id: options.id,
        currentRoll: options.nextRoll,
        canUseCharacterSkill: Boolean(options.characterSkill),
        availableCharacterSkillId: options.characterSkill?.id,
        availableCharacterSkillName: options.characterSkill?.name,
        availableSummonerSkillId: undefined,
        availableSummonerSkillName: undefined,
        availableActions: options.availableActions,
        usedSummonerSkillId: options.usedSummonerSkillId
    };
}
export function createSummonerChangedRollResolution(decision, options) {
    return {
        decision: createSummonerChangedRollDecision(decision, options),
        shouldWaitForCharacterSkill: Boolean(options.characterSkill)
    };
}
