import assert from "node:assert/strict";
import { confirmRollDecision, createPlayer } from "../shared/src/engine.ts";
import type { CharacterId, CharacterReactionSkillId, GameEvent, PendingRollDecision, Player, RollActionType, Room } from "../shared/src/types.ts";

let nextId = 0;
const ctx = {
  now: () => 1,
  makeId: () => `evt-${++nextId}`,
  rollDice: () => 1
};

function makePlayer(id: string, characterId: CharacterId, hp: number, isBot = false): Player {
  const player = createPlayer(id, id, id, id === "hero");
  player.characterId = characterId;
  player.hp = hp;
  player.maxHp = Math.max(20, hp);
  player.isBot = isBot;
  return player;
}

function makeDecision(actor: Player, target: Player, roll: number, action: RollActionType, skillId?: CharacterReactionSkillId): PendingRollDecision {
  const availableActions: PendingRollDecision["availableActions"] = [
    {
      id: "normal_attack",
      label: "normal_attack",
      enabled: true,
      description: "normal_attack"
    }
  ];
  if (skillId) {
    availableActions.push({
      id: "character_skill",
      label: "character_skill",
      enabled: true,
      description: "character_skill",
      skillId,
      requiresSelfDamageAmount: skillId === "self_destruct"
    });
  } else if (action !== "normal_attack") {
    availableActions.push({
      id: action,
      label: action,
      enabled: true,
      description: action
    });
  }

  return {
    id: "decision-1",
    actorId: actor.id,
    targetId: target.id,
    rawRoll: roll,
    currentRoll: roll,
    phase: "waiting_reaction",
    canUseCharacterSkill: Boolean(skillId),
    availableCharacterSkillId: skillId,
    rollEventId: "roll-1",
    createdAt: 1,
    availableActions
  };
}

function makeRoom(actor: Player, target: Player, roll: number, action: RollActionType, skillId?: CharacterReactionSkillId): Room {
  const rollEvent: GameEvent = {
    id: "roll-1",
    createdAt: 1,
    type: "roll",
    message: `${actor.nickname} rolled ${roll}`,
    playerId: actor.id,
    targetId: target.id,
    dice: [roll]
  };
  return {
    id: "R1",
    hostId: actor.id,
    phase: "battle",
    gameMode: "pve_roguelite",
    settings: { maxPlayers: 1, allowDuplicateCharacters: false, gameMode: "pve_roguelite" },
    players: [actor, target],
    rematchReadyPlayerIds: [],
    activePlayerIndex: 0,
    effects: [],
    battleLog: [rollEvent],
    snapshots: [],
    previousFinalDamage: 0,
    pendingRollDecision: makeDecision(actor, target, roll, action, skillId),
    roguelite: { stage: 1, maxStage: 10, appliedRewards: [] }
  };
}

function settleFireLord(roll: number, choice: RollActionType, skillId?: CharacterReactionSkillId): Player {
  const actor = makePlayer("hero", "fire_lord", 16);
  const target = makePlayer("enemy", "boxer", 20, true);
  const room = makeRoom(actor, target, roll, choice, skillId);
  confirmRollDecision(room, actor.id, "decision-1", choice, ctx);
  return room.players[1]!;
}

const fireRoll3Normal = settleFireLord(3, "normal_attack", "fire_lord_spark");
assert.equal(fireRoll3Normal.hp, 20, "fire lord roll 3 normal attack must deal no direct damage");
assert.equal(fireRoll3Normal.flameMarks ?? 0, 0, "fire lord roll 3 normal attack must not add flame marks");
assert.equal(fireRoll3Normal.isDead, false, "fire lord roll 3 normal attack must not kill the target");

const fireRoll3Skill = settleFireLord(3, "character_skill", "fire_lord_spark");
assert.equal(fireRoll3Skill.hp, 20, "fire lord roll 3 flame mark skill must deal no direct damage");
assert.equal(fireRoll3Skill.flameMarks, 1, "fire lord roll 3 flame mark skill must add one flame mark");
assert.equal(fireRoll3Skill.isDead, false, "fire lord roll 3 flame mark skill must not kill the target");

const fireRoll4 = settleFireLord(4, "normal_attack");
assert.equal(fireRoll4.hp, 16, "fire lord non-3 roll keeps normal damage");
assert.equal(fireRoll4.flameMarks, 1, "fire lord non-3 roll still adds one flame mark");

function settleSelfDestructTarget(target: Player, selfDamageAmount = 9): Player {
  const actor = makePlayer("hero", "self_destructor", 20);
  const room = makeRoom(actor, target, 6, "character_skill", "self_destruct");
  confirmRollDecision(room, actor.id, "decision-1", "character_skill", ctx, undefined, selfDamageAmount);
  return room.players[1]!;
}

function godBerserker(hp: number, state: Record<string, number | boolean>): Player {
  const target = makePlayer("enemy", "boxer", hp, true);
  target.maxHp = 20;
  target.rogueliteBossId = "boss_god_berserker";
  target.rogueliteBossState = state;
  return target;
}

assert.equal(settleSelfDestructTarget(godBerserker(20, { t15: true, t10: true, t5: true, t1: true })).hp, 15);
assert.equal(settleSelfDestructTarget(godBerserker(15, { t15: false, t10: true, t5: true, t1: true })).hp, 10);
assert.equal(settleSelfDestructTarget(godBerserker(10, { t15: false, t10: false, t5: true, t1: true })).hp, 5);
assert.equal(settleSelfDestructTarget(godBerserker(5, { t15: false, t10: false, t5: false, t1: true })).hp, 1);

const godAtOne = settleSelfDestructTarget(godBerserker(1, { t15: false, t10: false, t5: false, t1: false }));
assert.equal(godAtOne.isDead, true, "god berserker may die after all thresholds are spent");

const normalEnemy = settleSelfDestructTarget(makePlayer("enemy", "boxer", 10, true));
assert.equal(normalEnemy.isDead, true, "ordinary enemies should still die from lethal damage");

console.log("fire lord and god berserker verification passed");
