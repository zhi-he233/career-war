import { computed } from "vue";
export function useBattleTexts(params) {
    const { room, playerId, isDuoMode, isPveMode, isRogueliteMode, activePlayer, isSelfDead, isRolling, isPendingMine, isDecisionMine, isGuardCheckMine, pendingRoll, pendingRollDecision, pendingGuardCheck, guardCheckActor, visibleRoll, visibleGuardCheckEvent, displayedGuardDice, currentDiceMode, selectedTargetText, actionStageText, } = params;
    // ── internal helper (was in BattlePage as standalone computed) ──
    const winner = computed(() => room.value.players.find((p) => p.id === room.value.winnerId));
    // ── exported computeds ──
    const winnerText = computed(() => {
        if (isDuoMode.value && room.value.winnerTeamId)
            return `${room.value.winnerTeamId} 队获胜`;
        if (isRogueliteMode.value)
            return winner.value?.id === playerId ? "挑战成功" : "挑战失败";
        if (isPveMode.value)
            return winner.value?.id === playerId ? "胜利" : "失败";
        return `胜者：${winner.value?.nickname ?? "--"}`;
    });
    const opponentPanelTitle = computed(() => {
        if (isRogueliteMode.value)
            return "敌人";
        if (isPveMode.value)
            return "AI 敌人";
        return "其他玩家";
    });
    const opponentPanelHint = computed(() => isRogueliteMode.value ? "点击敌人头像选择攻击目标" : "点击头像选择攻击目标");
    const latestDiceText = computed(() => {
        if (currentDiceMode.value === "guard_check" && isRolling.value)
            return "架盾判定中……";
        if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value)
            return visibleGuardCheckEvent.value.message;
        if (pendingGuardCheck.value && isGuardCheckMine.value)
            return "1-4 架盾继续，5-6 架盾结束";
        if (pendingGuardCheck.value)
            return "对方正在进行架盾判定";
        if (isRolling.value)
            return pendingRoll.value?.message ?? "";
        if (pendingRollDecision.value)
            return `当前骰点 ${pendingRollDecision.value.currentRoll}`;
        const dice = visibleRoll.value?.dice ?? [];
        if (dice.length === 0)
            return pendingRoll.value?.message ?? "等待投骰";
        return `投出了 ${dice.join("、")} 点`;
    });
    const dicePanelTitle = computed(() => {
        if (pendingGuardCheck.value && isGuardCheckMine.value)
            return "架盾判定";
        if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value)
            return "架盾判定";
        return latestDiceText.value;
    });
    const dicePanelDetail = computed(() => {
        if (pendingGuardCheck.value && isGuardCheckMine.value)
            return "1-4 架盾继续，5-6 架盾结束";
        if (pendingGuardCheck.value)
            return "对方正在进行架盾判定";
        if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value)
            return visibleGuardCheckEvent.value.message;
        if (pendingRoll.value && !isRolling.value)
            return pendingRoll.value.message;
        return visibleRoll.value?.message;
    });
    const currentActionTitle = computed(() => {
        if (isSelfDead.value)
            return "你已死亡，正在观战";
        return actionStageText.value;
    });
    const currentDiceValueText = computed(() => {
        if (pendingGuardCheck.value)
            return String(displayedGuardDice.value);
        if (pendingRollDecision.value)
            return String(pendingRollDecision.value.currentRoll);
        return latestDiceText.value;
    });
    const currentActionLines = computed(() => {
        const actorName = activePlayer.value?.nickname ?? "玩家";
        if (pendingGuardCheck.value) {
            return [
                `架盾角色：${guardCheckActor.value?.nickname ?? "山盾"}`,
                `架盾判定骰：${displayedGuardDice.value}`,
                isGuardCheckMine.value ? "点击架盾判定骰子" : "等待架盾判定",
            ];
        }
        if (isSelfDead.value) {
            return [`当前行动：${actorName}`, `当前骰点：${currentDiceValueText.value}`, `等待 ${actorName} 操作`];
        }
        if (pendingRollDecision.value && !isDecisionMine.value) {
            return [`当前行动：${actorName}`, `当前骰点：${currentDiceValueText.value}`, `等待 ${actorName} 操作`];
        }
        return [selectedTargetText.value, latestDiceText.value];
    });
    const rollButtonText = computed(() => {
        if (isRolling.value)
            return "摇骰中...";
        if (pendingGuardCheck.value && isGuardCheckMine.value)
            return "投骰";
        if (pendingGuardCheck.value)
            return "等待架盾判定";
        if (pendingRollDecision.value)
            return "等待选择";
        if (pendingRoll.value)
            return isPendingMine.value ? "继续投骰" : "等待继续投骰";
        return "投骰";
    });
    return {
        winnerText,
        opponentPanelTitle,
        opponentPanelHint,
        latestDiceText,
        dicePanelTitle,
        dicePanelDetail,
        currentActionTitle,
        currentDiceValueText,
        currentActionLines,
        rollButtonText,
    };
}
