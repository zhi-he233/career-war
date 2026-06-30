import type { Room, RogueliteEventDraft, RogueliteEventOutcomeDraft, RogueliteMapNodeSelection } from "@career-war/shared";
import { getRogueliteEvents } from "../rogueliteDataCache.js";
import { isRogueliteBossStage } from "./enemyHelpers.js";
import { ensureRoomGameMode, addEvent, emitRoomToParticipants } from "../services/roomService.js";
import { ensureRogueliteState, ensurePveBot } from "../services/gameService.js";
import type { ServerContext } from "../context.js";
import {
  ROGUELITE_BOSS_REWARD_STAGE, ROGUELITE_BASIC_REWARD_STAGE, ROGUELITE_ARCHETYPE_REWARD_STAGE, ROGUELITE_CORE_REWARD_STAGE,
  createRogueliteBossRewardChoices, createRogueliteBasicRewardChoices, createRogueliteArchetypeStarterChoices,
  createRogueliteCoreRewardChoices, createRogueliteRewardChoices
} from "./rewardHelpers.js";
import { rememberRogueliteMapNode, consumeRogueliteMapNode } from "./enemyHelpers.js";
import { pickOne } from "../infrastructure/utils.js";

type RogueliteEventChoiceDraft = RogueliteEventDraft["choices"][number];

// =========================================================================
// Roguelite battle end
// =========================================================================

export function getRogueliteBattleGoldReward(stage: number, stageType: "normal" | "elite" | "boss"): number {
  const cycle = Math.floor((stage - 1) / 15);
  if (stageType === "boss") return 60 + cycle * 12;
  if (stageType === "elite") return 35 + cycle * 7;
  return 18 + cycle * 4;
}

export function handleRogueliteBattleEnd(room: Room, gameOver: { winnerId: string; winnerName: string }, ctx: ServerContext): boolean {
  if (ensureRoomGameMode(room) !== "pve_roguelite") return false;
  if (room.phase !== "battle" && room.phase !== "gameOver") return true;
  const winner = room.players.find((p) => p.id === gameOver.winnerId);
  if (!winner || winner.isBot) return false;
  const roguelite = ensureRogueliteState(room);
  const stage = roguelite.stage;
  const enemyBot = room.players.find((p) => p.isBot);
  const enemyName = enemyBot?.nickname ?? "敌人";
  const isBossStage = enemyBot?.rogueliteEnemyInfo?.stageType === "boss" || isRogueliteBossStage(stage);
  const goldGained = getRogueliteBattleGoldReward(stage, enemyBot?.rogueliteEnemyInfo?.stageType ?? (isBossStage ? "boss" : "normal"));
  roguelite.runGold = (roguelite.runGold ?? 0) + goldGained;
  addEvent(room, "system", `获得金币 +${goldGained}，当前金币 ${roguelite.runGold}`);
  let actualHeal = 0;
  if (stage === 1) { actualHeal = winner.maxHp - winner.hp; winner.hp = winner.maxHp; addEvent(room, "heal", `战后恢复至满血（${winner.maxHp} 点）`); }
  else if (stage === 2) { const ha = Math.max(8, Math.floor(winner.maxHp * 0.5)) + (winner.roguelitePostBattleHealBonus ?? 0); actualHeal = Math.min(winner.maxHp - winner.hp, ha); if (actualHeal > 0) { winner.hp += actualHeal; addEvent(room, "heal", `战后恢复 ${actualHeal} 点生命`); } }
  else { const ha = Math.max(5, Math.floor(winner.maxHp * 0.3)) + (winner.roguelitePostBattleHealBonus ?? 0); actualHeal = Math.min(winner.maxHp - winner.hp, ha); if (actualHeal > 0) { winner.hp += actualHeal; addEvent(room, "heal", `战后恢复 ${actualHeal} 点生命`); } }
  room.phase = "reward"; room.winnerId = undefined; room.rematchReadyPlayerIds = [];
  const summary = { defeatedEnemyName: enemyName, postBattleHeal: actualHeal, goldGained, hpAfterHeal: winner.hp, maxHp: winner.maxHp, isBoss: isBossStage };
  if (stage === ROGUELITE_BOSS_REWARD_STAGE && isBossStage) { room.roguelite = { ...roguelite, lastStageSummary: summary, rewardChoices: createRogueliteBossRewardChoices() }; addEvent(room, "system", `第 ${ROGUELITE_BOSS_REWARD_STAGE} 关大 Boss 胜利！选择 1 个 Boss 能力`); }
  else if (stage === ROGUELITE_BASIC_REWARD_STAGE) { room.roguelite = { ...roguelite, lastStageSummary: summary, rewardChoices: createRogueliteBasicRewardChoices(winner.roguelitePerkStacks) }; addEvent(room, "system", `第 1 关胜利！选择 1 个基础奖励`); }
  else if (stage === ROGUELITE_ARCHETYPE_REWARD_STAGE) { room.roguelite = { ...roguelite, lastStageSummary: summary, rewardChoices: createRogueliteArchetypeStarterChoices(winner.roguelitePerkStacks) }; addEvent(room, "system", `第 2 关胜利！选择 1 个流派启动奖励`); }
  else if (stage === ROGUELITE_CORE_REWARD_STAGE) { room.roguelite = { ...roguelite, lastStageSummary: summary, rewardChoices: createRogueliteCoreRewardChoices(winner.roguelitePerkStacks) }; addEvent(room, "system", `第 3 关 Boss 胜利！选择 1 个核心技能奖励`); }
  else { room.roguelite = { ...roguelite, lastStageSummary: summary, rewardChoices: createRogueliteRewardChoices(winner.roguelitePerkStacks, roguelite.appliedRewards ?? [], stage) }; addEvent(room, "system", `第 ${stage} 关胜利，选择 1 个奖励后进入下一关`); }
  emitRoomToParticipants(room, ctx);
  return true;
}

// =========================================================================
// Roguelite events
// =========================================================================

export function getRogueliteEventStageBand(stage: number): "early" | "mid" | "late" { if (stage <= 3) return "early"; if (stage <= 9) return "mid"; return "late"; }

export function pickRogueliteEventForStage(stage: number): RogueliteEventDraft {
  const band = getRogueliteEventStageBand(stage);
  const events = getRogueliteEvents();
  const candidates = events.filter((e) => e.stage === "any" || e.stage === band);
  const event = pickOne(candidates) ?? events[0]; if (!event) throw new Error("肉鸽事件配置为空"); return event;
}

export function toPendingRogueliteEvent(event: RogueliteEventDraft): NonNullable<NonNullable<Room["roguelite"]>["pendingEvent"]> {
  return { id: event.id, name: event.name, rarity: event.rarity, stage: event.stage, description: event.description, choices: event.choices.slice(0, 2).map((c, i) => ({ id: i === 0 ? "a" : "b", label: c.label, effect: c.effect, cost: c.cost })) };
}

export function startRogueliteEventRoom(room: Room, player: Room["players"][number], roguelite: NonNullable<Room["roguelite"]>, mapNode: RogueliteMapNodeSelection): void {
  rememberRogueliteMapNode(roguelite, mapNode); consumeRogueliteMapNode(roguelite, mapNode);
  const pendingEvent = toPendingRogueliteEvent(pickRogueliteEventForStage(mapNode.stage));
  roguelite.currentMapNode = mapNode; roguelite.pendingEvent = pendingEvent; roguelite.rewardChoices = undefined;
  room.phase = "roguelite_event"; addEvent(room, "system", `${player.nickname} 遇到问号事件：${pendingEvent.name}`);
}

export function applyRogueliteEventChoice(room: Room, player: Room["players"][number], eventDraft: RogueliteEventDraft, choiceDraft: RogueliteEventChoiceDraft): { opensRewardChoice: boolean; playerDied: boolean } {
  let opens = false; let died = false;
  const outcomes = [...(choiceDraft.effects ?? []), ...(choiceDraft.costs ?? [])];
  if (outcomes.length === 0) addEvent(room, "system", `事件「${eventDraft.name}」的选项暂未配置可执行效果，已安全跳过`);
  for (const o of outcomes) { const r = applyRogueliteEventOutcome(room, player, o); opens ||= r.opensRewardChoice; died ||= r.playerDied; if (died) break; }
  return { opensRewardChoice: opens, playerDied: died };
}

export function applyRogueliteEventOutcome(room: Room, player: Room["players"][number], outcome: RogueliteEventOutcomeDraft): { opensRewardChoice: boolean; playerDied: boolean } {
  const roguelite = ensureRogueliteState(room); const v = Math.max(0, Math.floor(outcome.value ?? 0));
  if (outcome.type === "heal") { const h = Math.min(player.maxHp - player.hp, v); if (h > 0) { player.hp += h; const e = addEvent(room, "heal", `${player.nickname} 通过事件回复 ${h} 点生命`); e.playerId = player.id; e.healing = h; } return { opensRewardChoice: false, playerDied: false }; }
  if (outcome.type === "lose_hp") { const l = Math.min(Math.max(0, player.hp), v); if (l > 0) { player.hp -= l; const e = addEvent(room, "damage", `${player.nickname} 通过事件失去 ${l} 点生命`); e.targetId = player.id; e.damage = l; if (player.hp <= 0) { player.hp = 0; player.isDead = true; } } return { opensRewardChoice: false, playerDied: player.isDead }; }
  if (outcome.type === "gain_gold") { roguelite.runGold = (roguelite.runGold ?? 0) + v; addEvent(room, "system", `${player.nickname} 获得 ${v} 金币，当前金币 ${roguelite.runGold}`); return { opensRewardChoice: false, playerDied: false }; }
  if (outcome.type === "lose_gold") { const cg = roguelite.runGold ?? 0; const l = Math.min(cg, v); roguelite.runGold = cg - l; addEvent(room, "system", `${player.nickname} 失去 ${l} 金币，当前金币 ${roguelite.runGold}`); return { opensRewardChoice: false, playerDied: false }; }
  if (outcome.type === "gain_start_shield_next_battle") { roguelite.nextBattleShieldBonus = (roguelite.nextBattleShieldBonus ?? 0) + v; addEvent(room, "system", `${player.nickname} 下一场战斗开始获得 ${v} 护盾`); return { opensRewardChoice: false, playerDied: false }; }
  if (outcome.type === "gain_start_damage_next_battle") { roguelite.nextBattleDamageBonus = (roguelite.nextBattleDamageBonus ?? 0) + v; addEvent(room, "system", `${player.nickname} 下一场战斗开始获得 ${v} 伤害加成`); return { opensRewardChoice: false, playerDied: false }; }
  if (outcome.type === "reward_choice") { if (outcome.rewardPool && outcome.rewardPool !== "growth") addEvent(room, "system", outcome.note ?? "TODO: 非基础成长奖励池暂未接入，本次降级为基础成长池"); return { opensRewardChoice: true, playerDied: false }; }
  if (outcome.type === "start_battle") { resetRogueliteBattleState(room, player); ensurePveBot(room); room.activePlayerIndex = room.players.findIndex((p) => !p.isBot); addEvent(room, "system", `${player.nickname} 被卷入战斗！对手：${outcome.enemyId ?? room.players.find((p) => p.isBot)?.nickname ?? "敌人"}`); return { opensRewardChoice: false, playerDied: false }; }
  if (outcome.type === "todo") { addEvent(room, "system", outcome.note ?? "TODO: 该事件效果暂未接入，已安全跳过"); return { opensRewardChoice: false, playerDied: false }; }
  return { opensRewardChoice: false, playerDied: false };
}

// =========================================================================
// Battle state reset
// =========================================================================

export function resetRogueliteBattleState(room: Room, player: Room["players"][number]): void {
  const roguelite = ensureRogueliteState(room);
  room.phase = "battle"; room.effects = []; room.snapshots = []; room.previousFinalDamage = 0;
  room.pendingRoll = undefined; room.pendingRollDecision = undefined; room.pendingGuardCheck = undefined;
  room.guardCheckCompletedForActorId = undefined; room.winnerId = undefined; room.winnerTeamId = undefined;
  room.highlight = undefined; room.skillHints = undefined;
  roguelite.battleRound = 1; roguelite.fatigueBonus = 0; roguelite.fatigueAnnouncedBonus = 0;
  player.isDead = false; player.isOnline = true; player.selectedTargetId = undefined; player.guarding = false;
  player.flameMarks = 0; player.zhaoZilongHitCount = 0; player.summonerSkillId = undefined; player.summonerSkillCooldown = 0;
  player.rogueliteSummonerCooldownReduction = 0;
  const nsb = roguelite.nextBattleShieldBonus ?? 0; player.shield = (player.rogueliteStartShield ?? 0) + nsb;
  if (nsb > 0) { addEvent(room, "system", `事件护盾生效：${player.nickname} 获得 ${nsb} 护盾`); roguelite.nextBattleShieldBonus = 0; }
  const ndb = roguelite.nextBattleDamageBonus ?? 0;
  if (ndb > 0) { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + ndb; addEvent(room, "system", `事件伤害生效：${player.nickname} 获得 ${ndb} 伤害加成`); roguelite.nextBattleDamageBonus = 0; }
  player.rogueliteShieldOverloadUsed = false; player.rogueliteLowRollCharge = 0; player.rogueliteConsecutiveLowRolls = 0;
}
