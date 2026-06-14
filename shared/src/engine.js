import { characters } from "./characters.js";
export function createPlayer(id, clientId, nickname, isHost) {
    return { id, clientId, nickname, isHost, isOnline: true, summonerSkillId: "lucky_plus_one", summonerSkillCooldown: 0, hp: 0, maxHp: 0, shield: 0, zhaoZilongHitCount: 0, isDead: false };
}
export function chooseCharacter(room, playerId, characterId) {
    const player = getPlayerOrThrow(room, playerId);
    const character = characters[characterId];
    player.characterId = characterId;
    if (room.phase === "lobby") {
        player.maxHp = character.maxHp;
        player.hp = character.maxHp;
        player.shield = 0;
        player.zhaoZilongHitCount = 0;
        player.isDead = false;
        player.isOnline = true;
    }
    return makeEvent(Date.now, randomEventId, "chooseCharacter", `${player.nickname} 选择了职业 ${character.name}`, player.id);
}
export function canStartGame(room) {
    if (room.players.length < 2)
        return { ok: false, reason: "至少需要 2 名玩家" };
    if (room.players.length > 8)
        return { ok: false, reason: "最多支持 8 名玩家" };
    if (room.players.some((player) => !player.characterId))
        return { ok: false, reason: "所有玩家都需要先选择职业" };
    return { ok: true };
}
export function startGame(room, ctx) {
    const readiness = canStartGame(room);
    if (!readiness.ok)
        throw new Error(readiness.reason);
    room.phase = "battle";
    room.activePlayerIndex = 0;
    room.effects = [];
    room.snapshots = [];
    room.previousFinalDamage = 0;
    room.pendingRoll = undefined;
    room.pendingRollDecision = undefined;
    room.rematchReadyPlayerIds = [];
    room.winnerId = undefined;
    room.highlight = undefined;
    room.skillHints = undefined;
    for (const player of room.players) {
        const character = characters[player.characterId];
        player.maxHp = character.maxHp;
        player.hp = character.maxHp;
        player.shield = 0;
        player.zhaoZilongHitCount = 0;
        player.isDead = false;
        player.isOnline = true;
        player.summonerSkillId ??= "lucky_plus_one";
        player.summonerSkillCooldown = 0;
        player.selectedTargetId = undefined;
    }
    const events = [makeEvent(ctx.now, ctx.makeId, "startGame", "游戏开始"), makeTurnEvent(room, ctx)];
    room.battleLog.unshift(...events);
    return events;
}
export function resetToLobbyForRematch(room) {
    room.phase = "lobby";
    room.activePlayerIndex = 0;
    room.effects = [];
    room.battleLog = [];
    room.snapshots = [];
    room.previousFinalDamage = 0;
    room.pendingRoll = undefined;
    room.pendingRollDecision = undefined;
    room.rematchReadyPlayerIds = [];
    room.winnerId = undefined;
    room.highlight = undefined;
    room.skillHints = undefined;
    for (const player of room.players) {
        player.characterId = undefined;
        player.hp = 0;
        player.maxHp = 0;
        player.shield = 0;
        player.zhaoZilongHitCount = 0;
        player.isDead = false;
        player.isOnline = true;
        player.summonerSkillId ??= "lucky_plus_one";
        player.summonerSkillCooldown = 0;
        player.selectedTargetId = undefined;
    }
}
export function selectTarget(room, playerId, targetId) {
    if (room.pendingRoll)
        throw new Error("请先完成继续投骰");
    if (room.pendingRollDecision)
        throw new Error("请先完成投后选择");
    const active = getActivePlayer(room);
    if (active.id !== playerId)
        throw new Error("只有当前行动玩家可以选择目标");
    const target = getPlayerOrThrow(room, targetId);
    if (target.id === playerId)
        throw new Error("不能攻击自己");
    if (target.isDead)
        throw new Error("不能选择已死亡玩家");
    active.selectedTargetId = targetId;
}
export function rollForActivePlayer(room, playerId, ctx) {
    if (room.phase !== "battle")
        throw new Error("游戏尚未开始");
    const actor = getActivePlayer(room);
    if (actor.id !== playerId)
        throw new Error("还没有轮到你");
    if (actor.isDead)
        throw new Error("死亡玩家不能行动");
    if (!actor.characterId)
        throw new Error("当前玩家没有职业");
    room.skillHints = undefined;
    if (room.pendingRollDecision)
        throw new Error("请先完成投后选择");
    if (room.pendingRoll) {
        return resolvePendingRoll(room, playerId, ctx);
    }
    const target = actor.selectedTargetId ? getPlayerOrThrow(room, actor.selectedTargetId) : undefined;
    if (!target || target.isDead || target.id === actor.id)
        throw new Error("请先选择一个存活敌人");
    saveSnapshot(room, actor.id, ctx);
    expireEffectsAtTurnStart(room, actor.id);
    decrementSummonerCooldown(actor);
    const first = ctx.rollDice();
    const actorCharacter = characters[actor.characterId];
    const events = [
        makeEvent(ctx.now, ctx.makeId, "roll", `${actor.nickname}（${actorCharacter.name}）投出了 ${first} 点`, actor.id, target.id, [first])
    ];
    room.pendingRollDecision = createPendingRollDecision(room, actor, target, first, events[0].id, ctx);
    room.battleLog.unshift(...events);
    return { room, events };
}
export function serializeRoom(room) {
    return JSON.parse(JSON.stringify(room));
}
export function confirmRollDecision(room, playerId, decisionId, choice, ctx, summonerSkillId) {
    const decision = room.pendingRollDecision;
    if (!decision || decision.id !== decisionId || decision.phase !== "waiting_reaction")
        throw new Error("投后选择已失效");
    if (decision.actorId !== playerId)
        throw new Error("只有当前行动玩家可以选择");
    if (room.phase !== "battle")
        throw new Error("游戏尚未开始");
    const actor = getPlayerOrThrow(room, decision.actorId);
    const target = getPlayerOrThrow(room, decision.targetId);
    if (getActivePlayer(room).id !== actor.id)
        throw new Error("还没有轮到你");
    if (actor.isDead)
        throw new Error("死亡玩家不能行动");
    if (!actor.characterId)
        throw new Error("当前玩家没有职业");
    const rollEvent = findRollEvent(room, decision.rollEventId) ?? makeEvent(ctx.now, ctx.makeId, "roll", `${actor.nickname} 投出了 ${decision.rawRoll} 点`, actor.id, target.id, [decision.rawRoll]);
    const normalizedChoice = choice === "settle" ? "normal_attack" : choice;
    ensureDecisionActionAllowed(decision, normalizedChoice, summonerSkillId);
    if (normalizedChoice === "summoner_skill") {
        return confirmSummonerSkill(room, actor, target, decision, rollEvent, ctx, summonerSkillId);
    }
    if (normalizedChoice === "character_skill") {
        if (!decision.canUseCharacterSkill || !decision.availableCharacterSkillId)
            throw new Error("当前没有可发动的职业技能");
        room.pendingRollDecision = undefined;
        const pending = createPendingRoll(actor, target, decision.currentRoll);
        if (pending && (decision.availableCharacterSkillId === "gunslinger_barrage" || decision.availableCharacterSkillId === "vampire_blood_rite")) {
            room.pendingRoll = pending;
            const events = [makeEvent(ctx.now, ctx.makeId, "skill", pending.message, actor.id, target.id, [decision.currentRoll])];
            room.skillHints = createSkillHints([pendingSkillHintDraft(pending.type)], actor.id, rollEvent.id, ctx);
            room.battleLog.unshift(...events);
            return { room, events };
        }
        const outcome = resolveSkill(actor.characterId, decision.currentRoll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: true });
        return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
    }
    if (normalizedChoice !== "normal_attack")
        throw new Error("未知的投后选择");
    room.pendingRollDecision = undefined;
    const outcome = resolveSkill(actor.characterId, decision.currentRoll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: false });
    return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
}
function ensureDecisionActionAllowed(decision, choice, skillId) {
    const normalizedChoice = choice === "settle" ? "normal_attack" : choice;
    const action = decision.availableActions?.find((item) => item.id === normalizedChoice);
    if (!action)
        throw new Error("当前没有这个骰子卡槽");
    if (!action.enabled)
        throw new Error(action.reason ?? "当前卡槽不可用");
    if (normalizedChoice === "summoner_skill" && skillId && action.skillId !== skillId)
        throw new Error("召唤师技能不匹配");
    if (normalizedChoice === "character_skill" && action.skillId !== decision.availableCharacterSkillId)
        throw new Error("职业技能不匹配");
}
function confirmSummonerSkill(room, actor, target, decision, rollEvent, ctx, requestedSkillId) {
    const skillId = requestedSkillId ?? decision.availableSummonerSkillId;
    ensureSummonerSkill(actor);
    if (!skillId || skillId !== decision.availableSummonerSkillId || skillId !== actor.summonerSkillId)
        throw new Error("当前没有可发动的召唤师技能");
    if (decision.isFollowUpRoll)
        throw new Error("继续投骰不能发动召唤师技能");
    if (decision.usedSummonerSkillId)
        throw new Error("本次行动已经发动过召唤师技能");
    if ((actor.summonerSkillCooldown ?? 0) > 0)
        throw new Error("召唤师技能冷却中");
    if (skillId === "first_aid") {
        actor.summonerSkillCooldown = 3;
        room.pendingRollDecision = undefined;
        const outcome = {
            damage: 0,
            healing: decision.currentRoll,
            shieldGain: 0,
            selfDamage: 0,
            ignoresShield: false,
            grantsInvincible: false,
            executesTarget: false,
            dice: [decision.currentRoll],
            skillMessages: [`急救术发动，本次不攻击，回复 ${decision.currentRoll} 点血`],
            skillHints: []
        };
        return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
    }
    if (skillId === "iron_wall") {
        actor.summonerSkillCooldown = 3;
        room.pendingRollDecision = undefined;
        const outcome = {
            damage: 0,
            healing: 0,
            shieldGain: decision.currentRoll,
            selfDamage: 0,
            ignoresShield: false,
            grantsInvincible: false,
            executesTarget: false,
            dice: [decision.currentRoll],
            skillMessages: [`铁壁发动，本次不攻击，获得 ${decision.currentRoll} 点护盾`],
            skillHints: []
        };
        return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
    }
    if (skillId === "last_stand") {
        const outcome = resolveSkill(actor.characterId, decision.currentRoll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: false });
        if (!canUseLastStand(room, outcome))
            throw new Error("当前行动不能发动破釜");
        actor.summonerSkillCooldown = 3;
        room.pendingRollDecision = undefined;
        outcome.damage += 2;
        outcome.selfDamage = 2;
        outcome.skillMessages.push("破釜发动，本次最终伤害 +2，自己受到 2 点反噬伤害");
        return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
    }
    if (skillId === "lucky_plus_one") {
        actor.summonerSkillCooldown = 3;
        const nextRoll = Math.min(6, decision.currentRoll + 1);
        rollEvent.dice = [nextRoll];
        rollEvent.message = `${actor.nickname} 发动幸运骰，骰点变为 ${nextRoll} 点`;
        const characterSkill = getAvailableCharacterReactionSkill(actor.characterId, nextRoll);
        const nextActions = createAvailableActions(room, actor, target, nextRoll, characterSkill, undefined, true);
        const nextDecision = {
            ...decision,
            id: ctx.makeId(),
            currentRoll: nextRoll,
            canUseCharacterSkill: Boolean(characterSkill),
            availableCharacterSkillId: characterSkill?.id,
            availableCharacterSkillName: characterSkill?.name,
            availableSummonerSkillId: undefined,
            availableSummonerSkillName: undefined,
            availableActions: nextActions,
            usedSummonerSkillId: skillId
        };
        if (characterSkill) {
            room.pendingRollDecision = nextDecision;
            return { room, events: [] };
        }
        room.pendingRollDecision = undefined;
        const outcome = resolveSkill(actor.characterId, nextRoll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: false });
        return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
    }
    if (skillId === "fate_reroll") {
        actor.summonerSkillCooldown = 3;
        const nextRoll = ctx.rollDice();
        rollEvent.dice = [nextRoll];
        rollEvent.message = `${actor.nickname} 命运重掷发动，新的骰点为 ${nextRoll} 点`;
        const characterSkill = getAvailableCharacterReactionSkill(actor.characterId, nextRoll);
        const nextActions = createAvailableActions(room, actor, target, nextRoll, characterSkill, undefined, true);
        const nextDecision = {
            ...decision,
            id: ctx.makeId(),
            currentRoll: nextRoll,
            canUseCharacterSkill: Boolean(characterSkill),
            availableCharacterSkillId: characterSkill?.id,
            availableCharacterSkillName: characterSkill?.name,
            availableSummonerSkillId: undefined,
            availableSummonerSkillName: undefined,
            availableActions: nextActions,
            usedSummonerSkillId: skillId
        };
        if (characterSkill) {
            room.pendingRollDecision = nextDecision;
            return { room, events: [] };
        }
        room.pendingRollDecision = undefined;
        const outcome = resolveSkill(actor.characterId, nextRoll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: false });
        return finishDecisionAction(room, actor, target, outcome, rollEvent, ctx);
    }
    throw new Error("未知的召唤师技能");
}
function finishDecisionAction(room, actor, target, outcome, rollEvent, ctx) {
    room.battleLog = room.battleLog.filter((event) => event.id !== rollEvent.id);
    return finishAction(room, actor, target, outcome, [rollEvent], ctx);
}
function createPendingRollDecision(room, actor, target, roll, rollEventId, ctx) {
    const characterSkill = getAvailableCharacterReactionSkill(actor.characterId, roll);
    const summonerSkill = getAvailableSummonerSkill(room, actor, target, roll);
    const actions = createAvailableActions(room, actor, target, roll, characterSkill, summonerSkill, false);
    return {
        id: ctx.makeId(),
        actorId: actor.id,
        targetId: target.id,
        rawRoll: roll,
        currentRoll: roll,
        phase: "waiting_reaction",
        canUseCharacterSkill: Boolean(characterSkill),
        availableCharacterSkillId: characterSkill?.id,
        availableCharacterSkillName: characterSkill?.name,
        availableSummonerSkillId: summonerSkill?.id,
        availableSummonerSkillName: summonerSkill?.name,
        availableActions: actions,
        rollEventId,
        createdAt: ctx.now(),
        isFollowUpRoll: false
    };
}
function createAvailableActions(room, actor, target, roll, characterSkill, summonerSkill, usedSummonerSkillThisAction) {
    const characterReason = activeCharacterSkillReason(actor.characterId, roll);
    const summonerReason = summonerSkillUnavailableReason(room, actor, target, roll, usedSummonerSkillThisAction);
    const summonerSkillId = actor.summonerSkillId ?? "lucky_plus_one";
    return [
        {
            id: "normal_attack",
            label: "普通攻击",
            enabled: true,
            description: `使用 🎲 ${roll} 攻击目标`
        },
        {
            id: "character_skill",
            label: characterSkill ? `发动【${characterSkill.name}】` : "职业技能",
            enabled: Boolean(characterSkill),
            description: characterSkill ? characterSkillDescription(characterSkill.id, roll) : characterReason,
            reason: characterSkill ? undefined : characterReason,
            skillId: characterSkill?.id,
            skillName: characterSkill?.name
        },
        {
            id: "summoner_skill",
            label: summonerSkill ? `发动【${summonerSkill.name}】` : summonerSkillName(summonerSkillId),
            enabled: Boolean(summonerSkill),
            description: summonerSkill ? summonerSkillDescription(summonerSkill.id, roll) : summonerReason,
            reason: summonerSkill ? undefined : summonerReason,
            skillId: summonerSkill?.id ?? summonerSkillId,
            skillName: summonerSkill?.name ?? summonerSkillName(summonerSkillId)
        }
    ];
}
function activeCharacterSkillReason(characterId, roll) {
    if (characterId === "gunslinger")
        return roll === 6 ? "消耗 🎲 6，继续投骰" : "当前骰点不能发动";
    if (characterId === "vampire")
        return roll === 6 ? "消耗 🎲 6，继续投骰回血" : "当前骰点不能发动";
    if (characterId === "paladin")
        return roll === 4 ? "消耗 🎲 4，发动全员无敌" : "当前骰点不能发动";
    return "无可发动职业技能";
}
function characterSkillDescription(skillId, roll) {
    if (skillId === "gunslinger_barrage")
        return `消耗 🎲 ${roll}，继续投骰`;
    if (skillId === "vampire_blood_rite")
        return `消耗 🎲 ${roll}，继续投骰回血`;
    return `消耗 🎲 ${roll}，发动全员无敌`;
}
function summonerSkillDescription(skillId, roll) {
    if (skillId === "lucky_plus_one")
        return `🎲 ${roll} → 🎲 ${Math.min(6, roll + 1)}`;
    if (skillId === "first_aid")
        return `本次改为回复自己 ${roll} 点`;
    if (skillId === "iron_wall")
        return `本次改为获得 ${roll} 点护盾`;
    if (skillId === "fate_reroll")
        return "重新投一次，必须接受新结果";
    return "本次伤害 +2，自己受 2 点反噬";
}
function summonerSkillUnavailableReason(room, actor, target, roll, usedSummonerSkillThisAction) {
    ensureSummonerSkill(actor);
    if (usedSummonerSkillThisAction)
        return "本次行动已使用";
    if (actor.isDead)
        return "死亡玩家不可用";
    if ((actor.summonerSkillCooldown ?? 0) > 0)
        return `冷却中：${actor.summonerSkillCooldown} 次行动`;
    if (actor.summonerSkillId === "last_stand") {
        if (!actor.characterId)
            return "当前不可用";
        const outcome = resolveSkill(actor.characterId, roll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: false });
        if (!canUseLastStand(room, outcome))
            return "当前行动不能发动";
    }
    return "当前不可用";
}
function getAvailableCharacterReactionSkill(characterId, roll) {
    if (characterId === "gunslinger" && roll === 6)
        return { id: "gunslinger_barrage", name: "连射" };
    if (characterId === "vampire" && roll === 6)
        return { id: "vampire_blood_rite", name: "血祭回复" };
    if (characterId === "paladin" && roll === 4)
        return { id: "paladin_invincible", name: "全员无敌" };
    return undefined;
}
function getAvailableSummonerSkill(room, actor, target, roll) {
    ensureSummonerSkill(actor);
    if (actor.isDead || (actor.summonerSkillCooldown ?? 0) > 0)
        return undefined;
    const skillId = actor.summonerSkillId;
    if (skillId === "last_stand") {
        if (!actor.characterId)
            return undefined;
        const outcome = resolveSkill(actor.characterId, roll, room.previousFinalDamage, actor.hp, actor.maxHp, target.hp, target.maxHp, { useOptionalCharacterSkill: false });
        if (!canUseLastStand(room, outcome))
            return undefined;
    }
    return { id: skillId, name: summonerSkillName(skillId) };
}
function ensureSummonerSkill(player) {
    player.summonerSkillId ??= "lucky_plus_one";
    player.summonerSkillCooldown ??= 0;
}
function decrementSummonerCooldown(player) {
    ensureSummonerSkill(player);
    player.summonerSkillCooldown = Math.max(0, (player.summonerSkillCooldown ?? 0) - 1);
}
function summonerSkillName(skillId) {
    if (skillId === "first_aid")
        return "急救术";
    if (skillId === "iron_wall")
        return "铁壁";
    if (skillId === "fate_reroll")
        return "命运重掷";
    if (skillId === "last_stand")
        return "破釜";
    return "幸运骰";
}
function canUseLastStand(room, outcome) {
    return outcome.damage > 0 && !outcome.executesTarget && !outcome.grantsInvincible && !hasInvincible(room);
}
function findRollEvent(room, rollEventId) {
    return room.battleLog.find((event) => event.id === rollEventId && event.type === "roll");
}
function resolvePendingRoll(room, playerId, ctx) {
    const pending = room.pendingRoll;
    if (!pending)
        throw new Error("没有待继续投骰");
    if (pending.playerId !== playerId)
        throw new Error("只有触发技能的玩家可以继续投骰");
    const actor = getPlayerOrThrow(room, pending.playerId);
    const target = pending.targetId ? getPlayerOrThrow(room, pending.targetId) : undefined;
    if (!target || target.isDead)
        throw new Error("目标已不存在或已死亡");
    const second = ctx.rollDice();
    const dice = [pending.sourceRoll, second];
    const events = [
        makeEvent(ctx.now, ctx.makeId, "roll", `${actor.nickname} 继续投骰，投出了 ${second} 点`, actor.id, target.id, dice)
    ];
    let outcome;
    if (pending.type === "gunslinger_bonus_damage") {
        outcome = {
            damage: second * 3,
            healing: 0,
            shieldGain: 0,
            selfDamage: 0,
            ignoresShield: false,
            grantsInvincible: false,
            executesTarget: false,
            dice,
            skillMessages: [`枪手第二次骰点 ${second} x3，最终伤害 ${second * 3}`],
            skillHints: []
        };
    }
    else if (pending.type === "vampire_bonus_heal") {
        outcome = {
            damage: 0,
            healing: second * 3,
            shieldGain: 0,
            selfDamage: 0,
            ignoresShield: false,
            grantsInvincible: false,
            executesTarget: false,
            dice,
            skillMessages: [`吸血鬼第二次骰点 ${second} x3，回复 ${second * 3} 点血`],
            skillHints: []
        };
    }
    else {
        throw new Error("未知的继续投骰类型");
    }
    room.pendingRoll = undefined;
    return finishAction(room, actor, target, outcome, events, ctx);
}
function createPendingRoll(actor, target, first) {
    if (actor.characterId === "gunslinger" && first === 6) {
        return {
            playerId: actor.id,
            type: "gunslinger_bonus_damage",
            targetId: target.id,
            sourceRoll: first,
            characterId: actor.characterId,
            message: "枪手触发暴击！请继续投骰"
        };
    }
    if (actor.characterId === "vampire" && first === 6) {
        return {
            playerId: actor.id,
            type: "vampire_bonus_heal",
            targetId: target.id,
            sourceRoll: first,
            characterId: actor.characterId,
            message: "吸血鬼触发吸血恢复！请继续投骰"
        };
    }
    return undefined;
}
function pendingSkillHintDraft(type) {
    if (type === "gunslinger_bonus_damage") {
        return { key: "gunslinger-6", text: "连射准备！" };
    }
    if (type === "vampire_bonus_heal") {
        return { key: "vampire-6", text: "血祭回复准备！" };
    }
    return { key: type, text: "技能准备！" };
}
function finishAction(room, actor, target, outcome, events, ctx) {
    const actorHpAtActionStart = actor.hp;
    const rollId = events.find((event) => event.type === "roll")?.id;
    const previousOwnRoll = findPreviousOwnRoll(room, actor.id);
    const skillHintDrafts = [...outcome.skillHints];
    for (const message of outcome.skillMessages) {
        events.push(makeEvent(ctx.now, ctx.makeId, "skill", `${actor.nickname} 触发技能：${message}`, actor.id, target.id, outcome.dice));
    }
    if (outcome.grantsInvincible) {
        room.effects = room.effects.filter((effect) => !(effect.type === "invincible" && effect.sourcePlayerId === actor.id));
        room.effects.push({
            id: ctx.makeId(),
            type: "invincible",
            sourcePlayerId: actor.id,
            expiresAtSourceTurnStartPlayerId: actor.id
        });
    }
    let finalDamage = 0;
    const invincible = hasInvincible(room);
    if (outcome.executesTarget) {
        finalDamage = executeTarget(target);
        events.push(makeEvent(ctx.now, ctx.makeId, "damage", `${actor.nickname} 处决 ${target.nickname}，直接斩杀`, actor.id, target.id, outcome.dice, finalDamage));
        skillHintDrafts.push({ key: "execution-assassin-execute", text: "处决！" });
        events.push(makeEvent(ctx.now, ctx.makeId, "death", `${target.nickname} 已死亡`, target.id));
    }
    else if (outcome.damage > 0) {
        if (invincible) {
            events.push(makeEvent(ctx.now, ctx.makeId, "damage", "全员无敌生效，本次伤害为 0", actor.id, target.id, outcome.dice, 0));
        }
        else {
            finalDamage = applyDamage(target, outcome.damage, outcome.ignoresShield);
            const shieldText = outcome.ignoresShield ? "（无视护盾）" : "";
            events.push(makeEvent(ctx.now, ctx.makeId, "damage", `${actor.nickname} 对 ${target.nickname} 造成 ${finalDamage} 点伤害${shieldText}`, actor.id, target.id, outcome.dice, finalDamage));
            if (actor.characterId === "zhaoZilong" && finalDamage > 0) {
                skillHintDrafts.push({ key: "zhaoZilong-ignore-shield", text: "无视护盾！" });
            }
            if (target.isDead)
                events.push(makeEvent(ctx.now, ctx.makeId, "death", `${target.nickname} 已死亡`, target.id));
        }
    }
    else {
        events.push(makeEvent(ctx.now, ctx.makeId, "damage", `${actor.nickname} 本次没有造成伤害`, actor.id, target.id, outcome.dice, 0));
    }
    if (actor.characterId === "zhaoZilong" && finalDamage > 0) {
        actor.zhaoZilongHitCount = ((actor.zhaoZilongHitCount ?? 0) + 1) % 3;
        if (actor.zhaoZilongHitCount === 0) {
            const hpGain = applyHpHealing(actor, 2);
            events.push(makeEvent(ctx.now, ctx.makeId, "heal", `${actor.nickname} 触发【龙胆】，回复 ${hpGain} 点血`, actor.id, undefined, outcome.dice, undefined, hpGain));
            skillHintDrafts.push({ key: "zhaoZilong-dragon-guts", text: "龙胆！", valueText: `+${hpGain}` });
        }
    }
    if (outcome.healing > 0) {
        const { hpGain, shieldGain } = applyHealing(actor, outcome.healing);
        const shieldText = shieldGain > 0 ? `，溢出 ${shieldGain} 点转为护盾` : "";
        events.push(makeEvent(ctx.now, ctx.makeId, "heal", `${actor.nickname} 回复 ${hpGain} 点血${shieldText}`, actor.id, undefined, outcome.dice, undefined, outcome.healing));
        if (actor.characterId === "vampire" && shieldGain > 0) {
            skillHintDrafts.push({ key: "vampire-overflow-shield", text: "溢出转护盾！" });
        }
    }
    if (outcome.shieldGain > 0) {
        actor.shield += outcome.shieldGain;
        events.push(makeEvent(ctx.now, ctx.makeId, "skill", `${actor.nickname} 获得 ${outcome.shieldGain} 点护盾`, actor.id, undefined, outcome.dice));
    }
    if (outcome.selfDamage > 0) {
        const backlashDamage = applyDirectDamage(actor, outcome.selfDamage);
        events.push(makeEvent(ctx.now, ctx.makeId, "damage", `${actor.nickname} 受到 ${backlashDamage} 点反噬伤害`, actor.id, actor.id, outcome.dice, backlashDamage));
        if (actor.isDead)
            events.push(makeEvent(ctx.now, ctx.makeId, "death", `${actor.nickname} 已死亡`, actor.id));
    }
    room.skillHints = createSkillHints(skillHintDrafts, actor.id, rollId, ctx);
    room.highlight = createCharacterHighlight(actor, outcome, finalDamage, actorHpAtActionStart, previousOwnRoll, rollId, ctx);
    room.pendingRollDecision = undefined;
    room.previousFinalDamage = finalDamage;
    actor.selectedTargetId = undefined;
    const winner = getWinner(room);
    if (winner) {
        room.phase = "gameOver";
        room.winnerId = winner.id;
        events.push(makeEvent(ctx.now, ctx.makeId, "victory", `${winner.nickname} 获胜！`, winner.id));
        room.battleLog.unshift(...events);
        return { room, events, gameOver: { winnerId: winner.id, winnerName: winner.nickname } };
    }
    advanceTurn(room);
    events.push(makeTurnEvent(room, ctx));
    room.battleLog.unshift(...events);
    return { room, events };
}
function createSkillHints(drafts, actorId, rollId, ctx) {
    const uniqueDrafts = drafts.filter((draft, index) => drafts.findIndex((item) => item.key === draft.key) === index);
    if (uniqueDrafts.length === 0)
        return undefined;
    return uniqueDrafts.map((draft) => ({
        id: rollId ? `${rollId}:${draft.key}` : ctx.makeId(),
        actorId,
        text: draft.text,
        valueText: draft.valueText,
        rollId
    }));
}
function createCharacterHighlight(actor, outcome, finalDamage, actorHpAtActionStart, previousOwnRoll, rollId, ctx) {
    const diceKey = outcome.dice.join("-");
    const base = {
        actorId: actor.id,
        rollId
    };
    if (actor.characterId === "gunslinger" && diceKey === "6-6" && finalDamage === 18) {
        return {
            id: ctx.makeId(),
            type: "big_damage",
            title: "爆头！",
            valueText: "-18",
            ...base
        };
    }
    if (actor.characterId === "vampire" && diceKey === "6-6" && outcome.healing === 18) {
        return {
            id: ctx.makeId(),
            type: "big_heal",
            title: "血祭回复！",
            valueText: "+18",
            ...base
        };
    }
    if (actor.characterId === "berserker" && actorHpAtActionStart <= 2 && finalDamage >= 15) {
        return {
            id: ctx.makeId(),
            type: "big_damage",
            title: "暴怒！",
            valueText: `-${finalDamage}`,
            ...base
        };
    }
    if (actor.characterId === "execution_assassin" && outcome.executesTarget) {
        return {
            id: ctx.makeId(),
            type: "big_damage",
            title: "处决！",
            valueText: "斩杀",
            ...base
        };
    }
    if (actor.characterId === "fearless_assassin" && actorHpAtActionStart === actor.maxHp && finalDamage >= 9) {
        return {
            id: ctx.makeId(),
            type: "big_damage",
            title: "无畏突袭！",
            valueText: `-${finalDamage}`,
            ...base
        };
    }
    if (actor.characterId === "stone_titan" && outcome.dice[0] === 6 && finalDamage > 0) {
        return {
            id: ctx.makeId(),
            type: "big_damage",
            title: "巨岩碾压！",
            valueText: `-${finalDamage}`,
            ...base
        };
    }
    if (actor.characterId === "paladin" && outcome.grantsInvincible && previousOwnRoll?.dice?.[0] === 4) {
        return {
            id: ctx.makeId(),
            type: "streak",
            title: "神圣庇护！",
            valueText: "连续守护",
            ...base
        };
    }
    return undefined;
}
function findPreviousOwnRoll(room, actorId) {
    return room.battleLog.find((event) => event.type === "roll" && event.playerId === actorId);
}
function resolveSkill(characterId, first, previousFinalDamage, actorHp, actorMaxHp, targetHp, targetMaxHp, options = {}) {
    const outcome = { damage: first, healing: 0, shieldGain: 0, selfDamage: 0, ignoresShield: false, grantsInvincible: false, executesTarget: false, dice: [first], skillMessages: [], skillHints: [] };
    if (characterId === "boxer")
        return outcome;
    if (characterId === "gunslinger") {
        outcome.damage = Math.max(0, first - 1);
        if (first === 1) {
            outcome.damage = previousFinalDamage;
            outcome.skillMessages.push(`枪手 1 点复制上一名玩家最终伤害，伤害为 ${outcome.damage}`);
            outcome.skillHints.push({ key: "gunslinger-1", text: "复制伤害！" });
        }
        return outcome;
    }
    if (characterId === "vampire") {
        if (first === 3) {
            outcome.damage = 0;
            outcome.skillMessages.push("吸血鬼 3 点无伤");
        }
        else if (first === 1) {
            outcome.damage = 1;
            outcome.healing = 2;
            outcome.skillMessages.push("吸血鬼 1 点造成 1 伤害并回复 2 血");
            outcome.skillHints.push({ key: "vampire-1", text: "吸血回复！" });
        }
        return outcome;
    }
    if (characterId === "zhaoZilong") {
        outcome.ignoresShield = true;
        if (first === 1) {
            outcome.damage = 0;
            outcome.skillMessages.push("赵子龙 1 点无伤");
        }
        else {
            outcome.skillMessages.push("赵子龙造成伤害时无视护盾");
        }
        return outcome;
    }
    if (characterId === "assassin") {
        outcome.damage = first === 1 ? 3 : first + 1;
        outcome.skillMessages.push(first === 1 ? "刺客 1 点造成 3 点伤害" : "刺客基础伤害 +1");
        return outcome;
    }
    if (characterId === "paladin") {
        if (first === 1) {
            outcome.damage = 0;
            outcome.skillMessages.push("圣骑士 1 点无伤");
        }
        else if (first === 4 && options.useOptionalCharacterSkill) {
            outcome.skillMessages.push("圣骑士 4 点触发全员无敌，持续到圣骑士下一次行动开始前");
            outcome.skillHints.push({ key: "paladin-4", text: "全员无敌！" });
            outcome.grantsInvincible = true;
            outcome.shieldGain += 3;
        }
    }
    if (characterId === "berserker") {
        const missingHp = Math.max(0, actorMaxHp - actorHp);
        outcome.damage = first + missingHp;
        outcome.skillMessages.push(`狂战士已损失 ${missingHp} 点血，本次伤害 +${missingHp}`);
        if (missingHp > 0) {
            outcome.skillHints.push({ key: "berserker-low-hp-damage", text: "残血增伤", valueText: `+${missingHp}` });
        }
        return outcome;
    }
    if (characterId === "stone_titan") {
        if (first <= 4) {
            outcome.damage = 0;
            outcome.skillMessages.push("巨石泰坦低点数未造成伤害");
        }
        else if (first === 6) {
            outcome.damage = 9;
            outcome.skillMessages.push("巨石泰坦 6 点造成 9 点伤害");
            outcome.skillHints.push({ key: "stone-titan-6", text: "巨岩碾压！" });
        }
        return outcome;
    }
    if (characterId === "fearless_assassin") {
        if (first === 1) {
            outcome.damage = 0;
            outcome.skillMessages.push("刺客（无畏）1 点无伤");
            return outcome;
        }
        let bonus = 0;
        if (actorHp === actorMaxHp)
            bonus = 3;
        else if (actorHp > 10)
            bonus = 2;
        else if (actorHp > 5)
            bonus = 1;
        outcome.damage = first + bonus;
        if (bonus > 0) {
            outcome.skillMessages.push(`刺客（无畏）血量健康，伤害 +${bonus}`);
            outcome.skillHints.push({ key: "fearless-assassin-hp-bonus", text: "无畏增伤", valueText: `+${bonus}` });
        }
        return outcome;
    }
    if (characterId === "execution_assassin") {
        if (first === 1) {
            outcome.damage = 0;
            outcome.skillMessages.push("刺客（斩）1 点无伤");
            return outcome;
        }
        if (targetHp <= 3) {
            outcome.executesTarget = true;
            outcome.ignoresShield = true;
            outcome.skillMessages.push("刺客（斩）发动处决，斩杀残血目标");
            return outcome;
        }
        let bonus = 0;
        if (targetHp < targetMaxHp * 0.5)
            bonus = 2;
        else if (targetHp < targetMaxHp * 0.75)
            bonus = 1;
        outcome.damage = first + bonus;
        if (bonus > 0) {
            outcome.skillMessages.push(`刺客（斩）针对残血目标，伤害 +${bonus}`);
            outcome.skillHints.push({ key: "execution-assassin-low-hp-bonus", text: "残血收割", valueText: `+${bonus}` });
        }
        return outcome;
    }
    return outcome;
}
function applyDamage(target, incomingDamage, ignoresShield) {
    if (incomingDamage <= 0)
        return 0;
    let hpDamage = incomingDamage;
    if (!ignoresShield && target.shield > 0) {
        const shieldBlocked = Math.min(target.shield, incomingDamage);
        target.shield -= shieldBlocked;
        hpDamage -= shieldBlocked;
    }
    target.hp = Math.max(0, target.hp - hpDamage);
    if (target.hp <= 0)
        target.isDead = true;
    return incomingDamage;
}
function applyDirectDamage(target, incomingDamage) {
    if (incomingDamage <= 0)
        return 0;
    target.hp = Math.max(0, target.hp - incomingDamage);
    if (target.hp <= 0)
        target.isDead = true;
    return incomingDamage;
}
function executeTarget(target) {
    const hpDamage = target.hp;
    target.hp = 0;
    target.isDead = true;
    return hpDamage;
}
function applyHealing(player, amount) {
    const missingHp = Math.max(0, player.maxHp - player.hp);
    const hpGain = Math.min(missingHp, amount);
    const shieldGain = amount - hpGain;
    player.hp += hpGain;
    player.shield += shieldGain;
    return { hpGain, shieldGain };
}
function applyHpHealing(player, amount) {
    const missingHp = Math.max(0, player.maxHp - player.hp);
    const hpGain = Math.min(missingHp, amount);
    player.hp += hpGain;
    return hpGain;
}
function saveSnapshot(room, currentPlayerId, ctx) {
    const snapshot = {
        id: ctx.makeId(),
        createdAt: ctx.now(),
        currentPlayerId,
        players: JSON.parse(JSON.stringify(room.players)),
        effects: JSON.parse(JSON.stringify(room.effects)),
        activePlayerIndex: room.activePlayerIndex,
        previousFinalDamage: room.previousFinalDamage
    };
    room.snapshots.push(snapshot);
    if (room.snapshots.length > 50)
        room.snapshots.shift();
}
function expireEffectsAtTurnStart(room, playerId) {
    room.effects = room.effects.filter((effect) => effect.expiresAtSourceTurnStartPlayerId !== playerId);
}
function hasInvincible(room) {
    return room.effects.some((effect) => effect.type === "invincible");
}
function advanceTurn(room) {
    const aliveCount = room.players.filter((player) => !player.isDead).length;
    if (aliveCount <= 1)
        return;
    for (let offset = 1; offset <= room.players.length; offset += 1) {
        const nextIndex = (room.activePlayerIndex + offset) % room.players.length;
        if (!room.players[nextIndex].isDead) {
            room.activePlayerIndex = nextIndex;
            return;
        }
    }
}
function getWinner(room) {
    const alive = room.players.filter((player) => !player.isDead);
    return alive.length === 1 ? alive[0] : undefined;
}
function getActivePlayer(room) {
    const player = room.players[room.activePlayerIndex];
    if (!player)
        throw new Error("当前行动玩家不存在");
    return player;
}
function getPlayerOrThrow(room, playerId) {
    const player = room.players.find((item) => item.id === playerId);
    if (!player)
        throw new Error("玩家不存在");
    return player;
}
function makeTurnEvent(room, ctx) {
    const player = getActivePlayer(room);
    return makeEvent(ctx.now, ctx.makeId, "turn", `轮到 ${player.nickname} 行动`, player.id);
}
function makeEvent(now, makeId, type, message, playerId, targetId, dice, damage, healing) {
    return { id: makeId(), createdAt: now(), type, message, playerId, targetId, dice, damage, healing };
}
function randomEventId() {
    return Math.random().toString(36).slice(2, 10);
}
