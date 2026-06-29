export function useBattlePlayerHelpers(params) {
    const { room, characters, isDuoMode, isRogueliteMode, rogueliteEnemyTypeLabel, activePlayer, pendingRoll, pendingRollDecision } = params;
    function characterName(id) {
        return characters.find((c) => c.id === id)?.name ?? "未知职业";
    }
    function characterFor(id) {
        return characters.find((c) => c.id === id);
    }
    function summonerSkillName(id) {
        if (id === "first_aid")
            return "急救术";
        if (id === "iron_wall")
            return "铁壁";
        if (id === "fate_reroll")
            return "命运重掷";
        if (id === "last_stand")
            return "破釜";
        return "幸运骰";
    }
    function hpPercent(player) {
        if (player.maxHp <= 0)
            return 0;
        return Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    }
    function zhaoZilongHitText(player) {
        if (player.characterId !== "zhaoZilong")
            return "";
        return `龙胆：${player.zhaoZilongHitCount ?? 0}/3`;
    }
    function playerFallbackMark(player) {
        const label = characterName(player.characterId).trim();
        return Array.from(label)[0] ?? "?";
    }
    function playerNumber(player) {
        const index = room.value.players.findIndex((item) => item.id === player.id);
        return index < 0 ? 0 : index + 1;
    }
    function displayCharacterName(player) {
        if (isRogueliteMode.value && player.isBot && player.rogueliteEnemyInfo)
            return rogueliteEnemyTypeLabel(player);
        return characterName(player.characterId);
    }
    function hasInvincible(player) {
        return room.value.effects.some((effect) => effect.type === "invincible" && effect.sourcePlayerId === player.id);
    }
    function playerStatus(player) {
        if (!player.isOnline)
            return "离线";
        if (player.isDead)
            return "死亡";
        if (player.characterId === "mountain_shield" && player.guarding)
            return "架盾";
        if (pendingRoll.value?.playerId === player.id)
            return "待继续";
        if (player.id === activePlayer.value?.id)
            return "行动中";
        if (hasInvincible(player))
            return "无敌";
        return "待机";
    }
    function lastRollText(player) {
        if (pendingRollDecision.value?.actorId === player.id)
            return `骰点 ${pendingRollDecision.value.currentRoll}`;
        const rollEvent = room.value.battleLog.find((event) => event.type === "roll" && event.playerId === player.id && event.dice?.length);
        if (!rollEvent?.dice?.length)
            return "";
        return `骰点 ${rollEvent.dice.join("、")}`;
    }
    function isProtectedByGuardingMountainShield(player) {
        if (!player.teamId || player.characterId === "mountain_shield")
            return false;
        return room.value.players.some((item) => item.characterId === "mountain_shield" && item.guarding && !item.isDead && item.teamId === player.teamId);
    }
    function guardBadges(player) {
        if (player.characterId === "mountain_shield" && player.guarding) {
            return ["架盾", "护甲+1", "团体护甲+2"];
        }
        if (isDuoMode.value && isProtectedByGuardingMountainShield(player)) {
            return ["受架盾保护", "团体护甲+2"];
        }
        return [];
    }
    function statusBadges(player) {
        const tags = [];
        if ((player.flameMarks ?? 0) > 0)
            tags.push(`火焰印记 x${player.flameMarks}`);
        return tags;
    }
    function buildSeatTags(player) {
        if (isRogueliteMode.value && player.isBot && player.rogueliteEnemyInfo) {
            const tags = [rogueliteEnemyTypeLabel(player)];
            if (player.rogueliteEnemyInfo.skillNames?.[0])
                tags.push(player.rogueliteEnemyInfo.skillNames[0]);
            tags.push(...statusBadges(player));
            return tags;
        }
        const tags = [characterName(player.characterId)];
        if (!isRogueliteMode.value || player.isBot) {
            tags.push(`${summonerSkillName(player.summonerSkillId)}${player.summonerSkillCooldown ? ` ${player.summonerSkillCooldown}` : ""}`);
        }
        tags.push(...statusBadges(player));
        tags.push(...guardBadges(player));
        return tags;
    }
    function buildDuoSeatTags(player) {
        const tags = [characterName(player.characterId), summonerSkillName(player.summonerSkillId)];
        tags.push(...statusBadges(player));
        tags.push(...guardBadges(player));
        return tags;
    }
    return {
        characterName,
        characterFor,
        summonerSkillName,
        hpPercent,
        zhaoZilongHitText,
        playerFallbackMark,
        playerNumber,
        displayCharacterName,
        hasInvincible,
        playerStatus,
        lastRollText,
        guardBadges,
        statusBadges,
        isProtectedByGuardingMountainShield,
        buildSeatTags,
        buildDuoSeatTags,
    };
}
