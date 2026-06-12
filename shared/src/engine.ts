import { characters } from "./characters.js";
import type { ActionSnapshot, CharacterId, Effect, GameEvent, PendingRoll, Player, Room, RollResult } from "./types.js";

export type DiceRoller = () => number;
export type IdFactory = () => string;

interface EngineContext {
  now: () => number;
  makeId: IdFactory;
  rollDice: DiceRoller;
}

interface SkillOutcome {
  damage: number;
  healing: number;
  ignoresShield: boolean;
  dice: number[];
  skillMessages: string[];
}

export function createPlayer(id: string, clientId: string, nickname: string, isHost: boolean): Player {
  return { id, clientId, nickname, isHost, isOnline: true, hp: 0, maxHp: 0, shield: 0, isDead: false };
}

export function chooseCharacter(room: Room, playerId: string, characterId: CharacterId): GameEvent {
  const player = getPlayerOrThrow(room, playerId);
  const character = characters[characterId];
  player.characterId = characterId;
  if (room.phase === "lobby") {
    player.maxHp = character.maxHp;
    player.hp = character.maxHp;
    player.shield = 0;
    player.isDead = false;
    player.isOnline = true;
  }
  return makeEvent(Date.now, randomEventId, "chooseCharacter", `${player.nickname} 选择了职业 ${character.name}`, player.id);
}

export function canStartGame(room: Room): { ok: true } | { ok: false; reason: string } {
  if (room.players.length < 2) return { ok: false, reason: "至少需要 2 名玩家" };
  if (room.players.length > 6) return { ok: false, reason: "最多支持 6 名玩家" };
  if (room.players.some((player) => !player.characterId)) return { ok: false, reason: "所有玩家都需要先选择职业" };
  return { ok: true };
}

export function startGame(room: Room, ctx: Pick<EngineContext, "now" | "makeId">): GameEvent[] {
  const readiness = canStartGame(room);
  if (!readiness.ok) throw new Error(readiness.reason);

  room.phase = "battle";
  room.activePlayerIndex = 0;
  room.effects = [];
  room.snapshots = [];
  room.previousFinalDamage = 0;
  room.pendingRoll = undefined;
  room.rematchReadyPlayerIds = [];
  room.winnerId = undefined;

  for (const player of room.players) {
    const character = characters[player.characterId as CharacterId];
    player.maxHp = character.maxHp;
    player.hp = character.maxHp;
    player.shield = 0;
    player.isDead = false;
    player.isOnline = true;
    player.selectedTargetId = undefined;
  }

  const events = [makeEvent(ctx.now, ctx.makeId, "startGame", "游戏开始"), makeTurnEvent(room, ctx)];
  room.battleLog.unshift(...events);
  return events;
}

export function resetToLobbyForRematch(room: Room): void {
  room.phase = "lobby";
  room.activePlayerIndex = 0;
  room.effects = [];
  room.battleLog = [];
  room.snapshots = [];
  room.previousFinalDamage = 0;
  room.pendingRoll = undefined;
  room.rematchReadyPlayerIds = [];
  room.winnerId = undefined;

  for (const player of room.players) {
    player.characterId = undefined;
    player.hp = 0;
    player.maxHp = 0;
    player.shield = 0;
    player.isDead = false;
    player.isOnline = true;
    player.selectedTargetId = undefined;
  }
}

export function selectTarget(room: Room, playerId: string, targetId: string): void {
  if (room.pendingRoll) throw new Error("请先完成继续投骰");
  const active = getActivePlayer(room);
  if (active.id !== playerId) throw new Error("只有当前行动玩家可以选择目标");
  const target = getPlayerOrThrow(room, targetId);
  if (target.id === playerId) throw new Error("不能攻击自己");
  if (target.isDead) throw new Error("不能选择已死亡玩家");
  active.selectedTargetId = targetId;
}

export function rollForActivePlayer(room: Room, playerId: string, ctx: EngineContext): RollResult {
  if (room.phase !== "battle") throw new Error("游戏尚未开始");
  const actor = getActivePlayer(room);
  if (actor.id !== playerId) throw new Error("还没有轮到你");
  if (actor.isDead) throw new Error("死亡玩家不能行动");
  if (!actor.characterId) throw new Error("当前玩家没有职业");

  if (room.pendingRoll) {
    return resolvePendingRoll(room, playerId, ctx);
  }

  const target = actor.selectedTargetId ? getPlayerOrThrow(room, actor.selectedTargetId) : undefined;
  if (!target || target.isDead || target.id === actor.id) throw new Error("请先选择一个存活敌人");

  saveSnapshot(room, actor.id, ctx);
  expireEffectsAtTurnStart(room, actor.id);

  const first = ctx.rollDice();
  const actorCharacter = characters[actor.characterId];
  const events: GameEvent[] = [
    makeEvent(ctx.now, ctx.makeId, "roll", `${actor.nickname}（${actorCharacter.name}）投出了 ${first} 点`, actor.id, target.id, [first])
  ];

  const pending = createPendingRoll(actor, target, first);
  if (pending) {
    room.pendingRoll = pending;
    events.push(makeEvent(ctx.now, ctx.makeId, "skill", pending.message, actor.id, target.id, [first]));
    room.battleLog.unshift(...events);
    return { room, events };
  }

  const outcome = resolveSkill(actor.characterId, first, room.previousFinalDamage, actor.hp, actor.maxHp);
  return finishAction(room, actor, target, outcome, events, ctx);
}

export function serializeRoom(room: Room): Room {
  return JSON.parse(JSON.stringify(room)) as Room;
}

function resolvePendingRoll(room: Room, playerId: string, ctx: EngineContext): RollResult {
  const pending = room.pendingRoll;
  if (!pending) throw new Error("没有待继续投骰");
  if (pending.playerId !== playerId) throw new Error("只有触发技能的玩家可以继续投骰");

  const actor = getPlayerOrThrow(room, pending.playerId);
  const target = pending.targetId ? getPlayerOrThrow(room, pending.targetId) : undefined;
  if (!target || target.isDead) throw new Error("目标已不存在或已死亡");

  const second = ctx.rollDice();
  const dice = [pending.sourceRoll, second];
  const events: GameEvent[] = [
    makeEvent(ctx.now, ctx.makeId, "roll", `${actor.nickname} 继续投骰，投出了 ${second} 点`, actor.id, target.id, dice)
  ];

  let outcome: SkillOutcome;
  if (pending.type === "gunslinger_bonus_damage") {
    outcome = {
      damage: second * 3,
      healing: 0,
      ignoresShield: false,
      dice,
      skillMessages: [`枪手第二次骰点 ${second} x3，最终伤害 ${second * 3}`]
    };
  } else if (pending.type === "vampire_bonus_heal") {
    outcome = {
      damage: 0,
      healing: second * 3,
      ignoresShield: false,
      dice,
      skillMessages: [`吸血鬼第二次骰点 ${second} x3，回复 ${second * 3} 点血`]
    };
  } else {
    throw new Error("未知的继续投骰类型");
  }

  room.pendingRoll = undefined;
  return finishAction(room, actor, target, outcome, events, ctx);
}

function createPendingRoll(actor: Player, target: Player, first: number): PendingRoll | undefined {
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

function finishAction(room: Room, actor: Player, target: Player, outcome: SkillOutcome, events: GameEvent[], ctx: EngineContext): RollResult {
  for (const message of outcome.skillMessages) {
    events.push(makeEvent(ctx.now, ctx.makeId, "skill", `${actor.nickname} 触发技能：${message}`, actor.id, target.id, outcome.dice));
  }

  if (actor.characterId === "paladin" && outcome.dice[0] === 4) {
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
  if (outcome.damage > 0) {
    if (invincible) {
      events.push(makeEvent(ctx.now, ctx.makeId, "damage", "全员无敌生效，本次伤害为 0", actor.id, target.id, outcome.dice, 0));
    } else {
      finalDamage = applyDamage(target, outcome.damage, outcome.ignoresShield);
      const shieldText = outcome.ignoresShield ? "（无视护盾）" : "";
      events.push(makeEvent(ctx.now, ctx.makeId, "damage", `${actor.nickname} 对 ${target.nickname} 造成 ${finalDamage} 点伤害${shieldText}`, actor.id, target.id, outcome.dice, finalDamage));
      if (target.isDead) events.push(makeEvent(ctx.now, ctx.makeId, "death", `${target.nickname} 已死亡`, target.id));
    }
  } else {
    events.push(makeEvent(ctx.now, ctx.makeId, "damage", `${actor.nickname} 本次没有造成伤害`, actor.id, target.id, outcome.dice, 0));
  }

  if (outcome.healing > 0) {
    const { hpGain, shieldGain } = applyHealing(actor, outcome.healing);
    const shieldText = shieldGain > 0 ? `，溢出 ${shieldGain} 点转为护盾` : "";
    events.push(makeEvent(ctx.now, ctx.makeId, "heal", `${actor.nickname} 回复 ${hpGain} 点血${shieldText}`, actor.id, undefined, outcome.dice, undefined, outcome.healing));
  }

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

function resolveSkill(characterId: CharacterId, first: number, previousFinalDamage: number, actorHp: number, actorMaxHp: number): SkillOutcome {
  const outcome: SkillOutcome = { damage: first, healing: 0, ignoresShield: false, dice: [first], skillMessages: [] };
  if (characterId === "boxer") return outcome;

  if (characterId === "gunslinger") {
    outcome.damage = Math.max(0, first - 1);
    if (first === 1) {
      outcome.damage = previousFinalDamage;
      outcome.skillMessages.push(`枪手 1 点复制上一名玩家最终伤害，伤害为 ${outcome.damage}`);
    }
    return outcome;
  }

  if (characterId === "vampire") {
    if (first === 3) {
      outcome.damage = 0;
      outcome.skillMessages.push("吸血鬼 3 点无伤");
    } else if (first === 1) {
      outcome.damage = 1;
      outcome.healing = 2;
      outcome.skillMessages.push("吸血鬼 1 点造成 1 伤害并回复 2 血");
    }
    return outcome;
  }

  if (characterId === "zhaoZilong") {
    outcome.ignoresShield = true;
    if (first === 1) {
      outcome.damage = 0;
      outcome.skillMessages.push("赵子龙 1 点无伤");
    } else {
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
    } else if (first === 4) {
      outcome.skillMessages.push("圣骑士 4 点触发全员无敌，持续到圣骑士下一次行动开始前");
    }
  }

  if (characterId === "berserker") {
    const missingHp = Math.max(0, actorMaxHp - actorHp);
    outcome.damage = first + missingHp;
    outcome.skillMessages.push(`狂战士已损失 ${missingHp} 点血，本次伤害 +${missingHp}`);
    return outcome;
  }

  return outcome;
}

function applyDamage(target: Player, incomingDamage: number, ignoresShield: boolean): number {
  if (incomingDamage <= 0) return 0;
  let hpDamage = incomingDamage;
  if (!ignoresShield && target.shield > 0) {
    const shieldBlocked = Math.min(target.shield, incomingDamage);
    target.shield -= shieldBlocked;
    hpDamage -= shieldBlocked;
  }
  target.hp = Math.max(0, target.hp - hpDamage);
  if (target.hp <= 0) target.isDead = true;
  return incomingDamage;
}

function applyHealing(player: Player, amount: number): { hpGain: number; shieldGain: number } {
  const missingHp = Math.max(0, player.maxHp - player.hp);
  const hpGain = Math.min(missingHp, amount);
  const shieldGain = amount - hpGain;
  player.hp += hpGain;
  player.shield += shieldGain;
  return { hpGain, shieldGain };
}

function saveSnapshot(room: Room, currentPlayerId: string, ctx: Pick<EngineContext, "now" | "makeId">): void {
  const snapshot: ActionSnapshot = {
    id: ctx.makeId(),
    createdAt: ctx.now(),
    currentPlayerId,
    players: JSON.parse(JSON.stringify(room.players)) as Player[],
    effects: JSON.parse(JSON.stringify(room.effects)) as Effect[],
    activePlayerIndex: room.activePlayerIndex,
    previousFinalDamage: room.previousFinalDamage
  };
  room.snapshots.push(snapshot);
  if (room.snapshots.length > 50) room.snapshots.shift();
}

function expireEffectsAtTurnStart(room: Room, playerId: string): void {
  room.effects = room.effects.filter((effect) => effect.expiresAtSourceTurnStartPlayerId !== playerId);
}

function hasInvincible(room: Room): boolean {
  return room.effects.some((effect) => effect.type === "invincible");
}

function advanceTurn(room: Room): void {
  const aliveCount = room.players.filter((player) => !player.isDead).length;
  if (aliveCount <= 1) return;
  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const nextIndex = (room.activePlayerIndex + offset) % room.players.length;
    if (!room.players[nextIndex].isDead) {
      room.activePlayerIndex = nextIndex;
      return;
    }
  }
}

function getWinner(room: Room): Player | undefined {
  const alive = room.players.filter((player) => !player.isDead);
  return alive.length === 1 ? alive[0] : undefined;
}

function getActivePlayer(room: Room): Player {
  const player = room.players[room.activePlayerIndex];
  if (!player) throw new Error("当前行动玩家不存在");
  return player;
}

function getPlayerOrThrow(room: Room, playerId: string): Player {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) throw new Error("玩家不存在");
  return player;
}

function makeTurnEvent(room: Room, ctx: Pick<EngineContext, "now" | "makeId">): GameEvent {
  const player = getActivePlayer(room);
  return makeEvent(ctx.now, ctx.makeId, "turn", `轮到 ${player.nickname} 行动`, player.id);
}

function makeEvent(
  now: () => number,
  makeId: IdFactory,
  type: GameEvent["type"],
  message: string,
  playerId?: string,
  targetId?: string,
  dice?: number[],
  damage?: number,
  healing?: number
): GameEvent {
  return { id: makeId(), createdAt: now(), type, message, playerId, targetId, dice, damage, healing };
}

function randomEventId(): string {
  return Math.random().toString(36).slice(2, 10);
}
