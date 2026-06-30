import type { Room, GameEvent, Player, DuoCharacterSlot, CharacterId } from "@career-war/shared";
import { ROGUELITE_BOT_BASE, ROGUELITE_PLAYER_START, ROGUELITE_MAX_STAGE, characterList, createPlayer, getSummonerSkillInitialCooldown, startGame } from "@career-war/shared";
import type { ServerContext } from "../context.js";
import { PVE_BOT_ID, PVE_BOT_CLIENT_ID, DUO_MAX_CONTROLLERS } from "../constants.js";
import { isSinglePlayerPveMode, ensureRoomGameMode, ensureRoomSettings, ensureDuoSlots, getRoomParticipantCount, addEvent } from "./roomService.js";
import { getRogueliteEarlyStage, isRogueliteBossStage, isRogueliteEliteStage, getRogueliteStageBonus, getRogueliteBossForStage, getRogueliteBossHp, getRogueliteEnemyConfig, getRogueliteEnemyForStage, getRogueliteEnemyIdentity, applyRogueliteEnemyStats, logRogueliteMapNodeSelection, logRogueliteEnemyTemplateResolution, logRogueliteEnemySpawn, logRogueliteEnemyBattleState, isCombatRogueliteRoomType, getRogueliteEnemyConfigByTemplateId } from "../roguelite/enemyHelpers.js";

// =========================================================================
// Game start validation
// =========================================================================

export function validateStartGame(room: Room): void {
  const settings = ensureRoomSettings(room);
  const pc = isSinglePlayerPveMode(room) ? room.players.filter((p) => !p.isBot).length : room.players.length;
  if (pc > settings.maxPlayers) throw new Error("当前玩家数超过房间最大人数");
  if (settings.allowDuplicateCharacters) return;
  const chars = room.players
    .filter((p) => !isSinglePlayerPveMode(room) || !p.isBot)
    .map((p) => p.characterId)
    .filter((c): c is CharacterId => Boolean(c));
  if (new Set(chars).size !== chars.length) throw new Error("当前已有重复职业，请玩家重新选择");
}

export function validatePveStartGame(room: Room, actorId: string): void {
  if (!isSinglePlayerPveMode(room)) throw new Error("当前房间不是单人 PVE 模式");
  const player = room.players.find((p) => p.id === actorId && !p.isBot);
  if (!player) throw new Error("玩家不存在");
  if (ensureRoomGameMode(room) === "pve_roguelite") {
    player.characterId = ROGUELITE_PLAYER_START.characterId;
    const bc = characterList.find((c) => c.id === ROGUELITE_PLAYER_START.characterId);
    if (!bc) throw new Error("拳手职业配置不存在");
    player.maxHp = bc.maxHp; player.hp = bc.maxHp; player.shield = 0;
    player.summonerSkillId = undefined; player.summonerSkillCooldown = 0;
    player.rogueliteSummonerCooldownReduction = 0;
  } else {
    if (!player.characterId) throw new Error("请先选择职业");
    if (!player.summonerSkillId) throw new Error("请先选择召唤师技能");
  }
  if (room.players.filter((p) => !p.isBot).length !== 1) throw new Error("单人 PVE 只支持 1 名真实玩家");
}

// =========================================================================
// PVE Bot creation
// =========================================================================

export function ensureRogueliteState(room: Room): NonNullable<Room["roguelite"]> {
  room.roguelite ??= { stage: 1, maxStage: ROGUELITE_MAX_STAGE, appliedRewards: [] };
  room.roguelite.maxStage ||= ROGUELITE_MAX_STAGE;
  room.roguelite.appliedRewards ??= [];
  room.roguelite.battleRound ??= 1;
  room.roguelite.fatigueBonus ??= 0;
  room.roguelite.fatigueAnnouncedBonus ??= 0;
  return room.roguelite;
}

export function ensurePveBot(room: Room): void {
  if (!isSinglePlayerPveMode(room)) return;
  room.players = room.players.filter((p) => !p.isBot);
  const botCharId = ensureRoomGameMode(room) === "pve_roguelite" ? ROGUELITE_BOT_BASE.characterId : "boxer";
  const character = characterList.find((c) => c.id === botCharId);
  if (!character) throw new Error("AI 职业配置不存在");
  const roguelite = ensureRoomGameMode(room) === "pve_roguelite" ? ensureRogueliteState(room) : undefined;
  const stage = roguelite?.stage ?? 1;
  const mapNode = roguelite?.currentMapNode;
  const forcedRoomType = mapNode && isCombatRogueliteRoomType(mapNode.type) ? mapNode.type : undefined;
  logRogueliteMapNodeSelection(stage, mapNode);

  // Boss via forced room type
  if (forcedRoomType === "boss") {
    const bossConfig = getRogueliteBossForStage(stage);
    const bonus = getRogueliteStageBonus(stage);
    const bossHp = getRogueliteBossHp(bossConfig, bonus.hpBonus);
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, bossConfig.displayName, false);
    bot.isBot = true; bot.isOnline = true; bot.controllerId = PVE_BOT_ID;
    bot.characterId = bossConfig.baseCharacterId ?? botCharId;
    bot.summonerSkillId = "first_aid"; bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = bossHp; bot.hp = bossHp; bot.shield = bossConfig.baseShield + bonus.shieldBonus;
    bot.rogueliteBossId = bossConfig.id;
    bot.rogueliteBossState = bossConfig.id === "boss_god_berserker" ? { t15: true, t10: true, t5: true, t1: true, dyingAfterAttack: false } : bossConfig.id === "boss_gambler_dealer" ? { lowHpMode: false } : {};
    bot.rogueliteEnemyInfo = { ...getRogueliteEnemyIdentity(bossConfig), stageType: "boss", hpBonus: Math.max(0, bossHp - bossConfig.baseHp), shieldBonus: bonus.shieldBonus, damageBonus: 0, skillNames: bossConfig.skills };
    logRogueliteEnemySpawn(stage, mapNode, bot, bossConfig.enemyTemplateId);
    room.players.push(bot);
    addEvent(room, "system", `Boss 出现：${bossConfig.name}！${bossConfig.skills.join("；")}`);
    return;
  }

  // Early fixed stages
  const earlyStage = getRogueliteEarlyStage(stage);
  if ((!forcedRoomType || forcedRoomType === "normal") && earlyStage && "enemyId" in earlyStage && earlyStage.enemyId && typeof earlyStage.hp === "number" && typeof earlyStage.shield === "number") {
    const enemyConfig = getRogueliteEnemyConfig(earlyStage.enemyId);
    logRogueliteEnemyTemplateResolution(stage, mapNode, { id: enemyConfig.enemyTemplateId, displayName: enemyConfig.displayName, maxHp: earlyStage.hp, shield: earlyStage.shield, baseCharacterId: enemyConfig.baseCharacterId });
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, enemyConfig.displayName, false);
    bot.isBot = true; bot.isOnline = true; bot.controllerId = PVE_BOT_ID;
    bot.characterId = enemyConfig.baseCharacterId ?? botCharId;
    bot.summonerSkillId = "first_aid"; bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    applyRogueliteEnemyStats(bot, { displayName: enemyConfig.displayName, maxHp: earlyStage.hp, shield: earlyStage.shield, baseCharacterId: enemyConfig.baseCharacterId, rogueliteEnemyInfo: { ...getRogueliteEnemyIdentity(enemyConfig), stageType: enemyConfig.type.startsWith("elite_") ? "elite" : "normal", hpBonus: Math.max(0, earlyStage.hp - character.maxHp), shieldBonus: earlyStage.shield, damageBonus: enemyConfig.damageBonus, description: earlyStage.description, skillNames: enemyConfig.skills.length > 0 ? enemyConfig.skills : undefined } });
    logRogueliteEnemySpawn(stage, mapNode, bot, enemyConfig.enemyTemplateId);
    logRogueliteEnemyBattleState("before_engine", bot);
    room.players.push(bot);
    return;
  }

  // Stages 4+
  const { hpBonus: bonusHp, shieldBonus: bonusShield } = getRogueliteStageBonus(stage);
  if (!forcedRoomType && isRogueliteBossStage(stage)) {
    const bossConfig = getRogueliteBossForStage(stage);
    const bossHp = getRogueliteBossHp(bossConfig, bonusHp);
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, bossConfig.displayName, false);
    bot.isBot = true; bot.isOnline = true; bot.controllerId = PVE_BOT_ID;
    bot.characterId = bossConfig.baseCharacterId ?? botCharId;
    bot.summonerSkillId = "first_aid"; bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = bossHp; bot.hp = bossHp; bot.shield = bossConfig.baseShield + bonusShield;
    bot.rogueliteBossId = bossConfig.id;
    bot.rogueliteBossState = bossConfig.id === "boss_god_berserker" ? { t15: true, t10: true, t5: true, t1: true, dyingAfterAttack: false } : bossConfig.id === "boss_gambler_dealer" ? { lowHpMode: false } : {};
    bot.rogueliteEnemyInfo = { ...getRogueliteEnemyIdentity(bossConfig), stageType: "boss", hpBonus: Math.max(0, bossHp - bossConfig.baseHp), shieldBonus: bonusShield, damageBonus: 0, skillNames: bossConfig.skills };
    logRogueliteEnemySpawn(stage, mapNode, bot, bossConfig.enemyTemplateId);
    room.players.push(bot);
    addEvent(room, "system", `Boss 出现：${bossConfig.name}！`);
    return;
  }

  const isElite = forcedRoomType === "elite" || (!forcedRoomType && isRogueliteEliteStage(stage));
  const enemyConfig = getRogueliteEnemyConfigByTemplateId(mapNode?.enemyTemplateId) ?? (forcedRoomType === "normal" ? getRogueliteEnemyConfig("normal") : forcedRoomType === "elite" ? getRogueliteEnemyConfig("elite_iron_skin") : getRogueliteEnemyForStage(stage));
  const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, enemyConfig.displayName, false);
  bot.isBot = true; bot.isOnline = true; bot.controllerId = PVE_BOT_ID;
  bot.characterId = enemyConfig.baseCharacterId ?? botCharId;
  bot.summonerSkillId = "first_aid"; bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
  bot.maxHp = character.maxHp + bonusHp + enemyConfig.hpBonus;
  bot.hp = character.maxHp + bonusHp + enemyConfig.hpBonus;
  bot.shield = bonusShield + enemyConfig.shieldBonus;
  bot.rogueliteEnemyInfo = { ...getRogueliteEnemyIdentity(enemyConfig), stageType: isElite ? "elite" : "normal", hpBonus: bonusHp, shieldBonus: bonusShield, damageBonus: enemyConfig.damageBonus, skillNames: enemyConfig.skills.length > 0 ? enemyConfig.skills : undefined };
  if (enemyConfig.type !== "normal") { bot.rogueliteBossId = enemyConfig.type as string; bot.rogueliteBossState = {}; }
  logRogueliteEnemySpawn(stage, mapNode, bot, enemyConfig.enemyTemplateId);
  room.players.push(bot);
}

export function removePveBotsForLobby(room: Room): void {
  if (!isSinglePlayerPveMode(room)) return;
  room.players = room.players.filter((p) => !p.isBot);
  if (ensureRoomGameMode(room) === "pve_roguelite") {
    room.roguelite = undefined;
    for (const p of room.players) {
      p.rogueliteSummonerCooldownReduction = undefined; p.rogueliteSkillStacks = undefined; p.rogueliteBossAbilities = undefined;
      p.roguelitePerkStacks = undefined; p.rogueliteBossId = undefined; p.rogueliteBossState = undefined;
      p.rogueliteStageStartHeal = undefined; p.rogueliteDamageBonus = undefined; p.rogueliteArmorBonus = undefined;
      p.rogueliteStartShield = undefined; p.roguelitePostBattleHealBonus = undefined; p.roguelitePassiveIds = undefined;
      p.rogueliteFirstStrikeUsed = undefined; p.rogueliteLowHpArmor = undefined; p.rogueliteKillHeal = undefined;
      p.rogueliteComebackDamage = undefined; p.rogueliteFateTokens = undefined; p.rogueliteLowRollCharge = undefined;
      p.rogueliteConsecutiveLowRolls = undefined; p.rogueliteShieldOverloadUsed = undefined;
      p.rogueliteShieldStrikeBonus = undefined; p.rogueliteLowRollDefenseShield = undefined;
      p.summonerSkillId = undefined; p.summonerSkillCooldown = 0;
    }
  }
  const host = room.players[0]; if (host) { room.hostId = host.id; host.isHost = true; }
}

// =========================================================================
// Duo 2V2 game start
// =========================================================================

export function validateDuoStartGame(room: Room): DuoCharacterSlot[] {
  if (ensureRoomGameMode(room) !== "duo_2v2") throw new Error("当前房间不是 2V2 模式");
  if (room.players.length !== DUO_MAX_CONTROLLERS) throw new Error("2V2 需要 2 名玩家");
  ensureDuoSlots(room);
  const slots = room.duoSlots ?? [];
  if (slots.length !== 4 || slots.some((s) => !s.characterId)) throw new Error("请完成 4 个角色槽位选择");
  if (slots.some((s) => !s.summonerSkillId)) throw new Error("请为所有角色选择召唤师技能");
  if (!ensureRoomSettings(room).allowDuplicateCharacters) {
    const chars = slots.map((s) => s.characterId).filter((c): c is CharacterId => Boolean(c));
    if (new Set(chars).size !== chars.length) throw new Error("当前设置不允许重复职业");
  }
  return slots;
}

export function startDuoGameV0(room: Room): GameEvent[] {
  const slots = validateDuoStartGame(room);
  const cById = new Map([...room.players].map((p) => [p.id, p]));
  const sorted = [...slots].sort((a, b) => a.teamId.localeCompare(b.teamId) || a.slotIndex - b.slotIndex);
  const aCid = sorted.find((s) => s.teamId === "A")?.controllerId;
  const bCid = sorted.find((s) => s.teamId === "B")?.controllerId;
  if (!aCid || !bCid) throw new Error("2V2 队伍信息不完整");

  room.phase = "battle"; room.activePlayerIndex = 0; room.effects = []; room.snapshots = [];
  room.previousFinalDamage = 0; room.pendingRoll = undefined; room.pendingRollDecision = undefined;
  room.pendingGuardCheck = undefined; room.guardCheckCompletedForActorId = undefined;
  room.rematchReadyPlayerIds = []; room.winnerId = undefined; room.winnerTeamId = undefined;
  room.highlight = undefined; room.skillHints = undefined;
  const order = [aCid, bCid]; if (Math.floor(Math.random() * 2) === 1) order.reverse();
  room.controllerTurnOrder = order; room.activeControllerId = order[0]; room.selectedActorId = undefined;

  room.players = sorted.map((slot) => {
    const ctrl = cById.get(slot.controllerId);
    const char = characterList.find((c) => c.id === slot.characterId);
    if (!ctrl || !char || !slot.characterId || !slot.summonerSkillId) throw new Error("2V2 战斗单位初始化失败");
    return { id: `${slot.controllerId}-slot-${slot.slotIndex}`, clientId: ctrl.clientId, controllerId: slot.controllerId, teamId: slot.teamId, slotIndex: slot.slotIndex, nickname: `${ctrl.nickname} 角色${slot.slotIndex + 1}`, isHost: ctrl.isHost, isOnline: ctrl.isOnline, characterId: slot.characterId, summonerSkillId: slot.summonerSkillId, summonerSkillCooldown: getSummonerSkillInitialCooldown(slot.summonerSkillId), hp: slot.characterId === "crescent_moon" ? 3 : char.maxHp, maxHp: char.maxHp, shield: 0, zhaoZilongHitCount: 0, flameMarks: 0, guarding: false, isDead: false, selectedTargetId: undefined };
  });

  const activeCtrl = cById.get(room.activeControllerId);
  const aTeam = sorted.find((s) => s.controllerId === room.activeControllerId)?.teamId;
  return [addEvent(room, "startGame", "2V2 V0 开始：已生成 4 个战斗单位"), addEvent(room, "turn", `随机先手：${aTeam === "B" ? "B 队" : "A 队"}`), addEvent(room, "turn", `轮到 ${activeCtrl?.nickname ?? "A 队玩家"} 选择行动角色`)];
}
