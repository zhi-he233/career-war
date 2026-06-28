import assert from "node:assert/strict";
import { confirmRollDecision, createPlayer } from "../shared/src/engine.ts";
import type { GameEvent, PendingRollDecision, Player, Room } from "../shared/src/types.ts";

let nextId = 0;
const ctx = {
  now: () => 1,
  makeId: () => `evt-${++nextId}`,
  rollDice: () => 1
};

function makePlayer(id: string, nickname: string, hp: number, shield: number, isBot: boolean): Player {
  const player = createPlayer(id, id, nickname, id === "hero");
  player.characterId = isBot ? "boxer" : "execution_assassin";
  player.hp = hp;
  player.maxHp = Math.max(hp, 10);
  player.shield = shield;
  player.isBot = isBot;
  return player;
}

function makeRoom(targetHp: number, targetShield: number, roll: number): Room {
  const actor = makePlayer("hero", "Assassin", 10, 0, false);
  const target = makePlayer("enemy", "Enemy", targetHp, targetShield, true);
  const rollEvent: GameEvent = {
    id: "roll-1",
    createdAt: 1,
    type: "roll",
    message: `Assassin rolled ${roll}`,
    playerId: actor.id,
    targetId: target.id,
    dice: [roll]
  };
  const decision: PendingRollDecision = {
    id: "decision-1",
    actorId: actor.id,
    targetId: target.id,
    rawRoll: roll,
    currentRoll: roll,
    phase: "waiting_reaction",
    canUseCharacterSkill: false,
    rollEventId: rollEvent.id,
    createdAt: 1,
    availableActions: [
      {
        id: "normal_attack",
        label: "Normal",
        enabled: true,
        description: "Settle damage"
      }
    ]
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
    pendingRollDecision: decision,
    roguelite: { stage: 1, maxStage: 10, appliedRewards: [] }
  };
}

function settle(targetHp: number, targetShield: number, roll: number): Player {
  const room = makeRoom(targetHp, targetShield, roll);
  confirmRollDecision(room, "hero", "decision-1", "normal_attack", ctx);
  return room.players[1]!;
}

const blockedByShield = settle(3, 5, 2);
assert.equal(blockedByShield.isDead, false, "attack below final lethal damage must not kill");
assert.equal(blockedByShield.hp, 3, "shield should absorb insufficient execute attempt");

const lethalByDamage = settle(2, 0, 2);
assert.equal(lethalByDamage.isDead, true, "final hp reaching 0 must kill");
assert.equal(lethalByDamage.hp, 0);

const legalExecute = settle(3, 0, 3);
assert.equal(legalExecute.isDead, true, "execute may kill only when low-hp condition and final damage are lethal");
assert.equal(legalExecute.hp, 0);

console.log("roguelite execute verification passed");
