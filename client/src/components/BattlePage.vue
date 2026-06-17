<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { Character, CharacterHighlight, EmoteId, GameEvent, Player, PlayerEmoteEvent, RogueliteReward, RollActionType, RollDecisionAvailableAction, RollDecisionChoice, Room, SkillHint, SummonerSkillId } from "@career-war/shared";
import { socket } from "../socket";
import { useDiceAnimation } from "../composables/useDiceAnimation";
import type { RollPhase, RollMode } from "../composables/useDiceAnimation";
import { useEmote } from "../composables/useEmote";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import EmotePanel from "./battle/EmotePanel.vue";
import BattleLogDrawer from "./battle/BattleLogDrawer.vue";
import PlayerDetailDialog from "./battle/PlayerDetailDialog.vue";
import CombatBoard from "./battle/CombatBoard.vue";
import DicePanel from "./battle/DicePanel.vue";
import ActionSlots from "./battle/ActionSlots.vue";
import SelfPanel from "./battle/SelfPanel.vue";
import RoguelitePanel from "./battle/RoguelitePanel.vue";
import type { SeatViewModel, DicePanelProps, ActionSlotVM, SelfDestructOption, SelfPanelVM, RoguelitePanelVM, RoguelitePerkVM, RogueliteRewardOptionVM, RogueliteBossStateChip } from "./battle/types";

const props = defineProps<{
  room: Room;
  playerId: string;
  characters: Character[];
  lastEvent: GameEvent | null;
  lastEmote: PlayerEmoteEvent | null;
}>();

const emit = defineEmits<{
  selectTarget: [targetId: string];
  selectActor: [actorId: string];
  rollDice: [];
  confirmRollDecision: [payload: { roomId: string; pendingDecisionId: string; actionType: RollActionType; skillId?: string; decisionId: string; choice: RollDecisionChoice; summonerSkillId?: SummonerSkillId; selfDamageAmount?: number }];
}>();

type CurrentDiceMode = "guard_check" | "action_roll" | null;
type RematchParticipant = {
  id: string;
  nickname: string;
  isHost: boolean;
};
type FloatingEffect = {
  rollId: string;
  type: "damage" | "heal" | "noEffect";
  playerId: string;
  value: number;
  key: string;
};
type EmoteOption = {
  id: EmoteId;
  label: string;
  emoji: string;
};
type VisibleEmote = { key: string; emoji: string };
type AvatarOption = {
  id: string;
  emoji: string;
};

const MAX_RENDERED_LOG = 50;
const HIGHLIGHT_DISPLAY_MS = 1500;
const SKILL_HINT_DISPLAY_MS = 1300;
const EMOTE_OPTIONS: EmoteOption[] = [
  { id: "cry", label: "大哭", emoji: "😭" },
  { id: "surprise", label: "惊讶", emoji: "😮" },
  { id: "taunt", label: "嘲讽", emoji: "😏" },
  { id: "angry", label: "愤怒", emoji: "😡" },
  { id: "like", label: "点赞", emoji: "👍" },
  { id: "question", label: "疑惑", emoji: "❓" }
];
const PLAYER_AVATARS: AvatarOption[] = [
  { id: "wolf", emoji: "🐺" },
  { id: "fox", emoji: "🦊" },
  { id: "cat", emoji: "🐱" },
  { id: "dog", emoji: "🐶" },
  { id: "panda", emoji: "🐼" },
  { id: "frog", emoji: "🐸" },
  { id: "monkey", emoji: "🐵" },
  { id: "dragon", emoji: "🐲" },
  { id: "robot", emoji: "🤖" },
  { id: "ghost", emoji: "👻" }
];

const displayedRoom = ref<Room>(cloneRoomForDisplay(props.room));
const pendingRoom = ref<Room | null>(null);
const room = computed(() => displayedRoom.value);

const { rollPhase, rollMode, rollingDice, isRolling, startAnimation, reveal, finishReveal, clearAllTimers } = useDiceAnimation();
const { activeEmotes, locked: emoteLocked, lock: lockEmote, showEmote, getEmote: lookupEmote, clearAll: clearEmotes } = useEmote();

const visibleRollId = ref<string | undefined>(getLatestRoll(props.room)?.id);
const visibleGuardCheckId = ref<string | undefined>(getLatestGuardCheck(props.room)?.id);
const pendingRevealRollId = ref<string | undefined>();
const pendingRevealGuardCheckId = ref<string | undefined>();
const activeEffectRollId = ref<string | undefined>();
const activeFloatingEffects = ref<FloatingEffect[]>([]);
const animatedRollIds = new Set<string>();
const effectTimers: number[] = [];
const rollRequestLocked = ref(false);
const activeHighlight = ref<CharacterHighlight | null>(null);
const activeSkillHints = ref<SkillHint[]>([]);
const rogueliteAlert = ref<{ text: string; key: string } | null>(null);
let rogueliteAlertTimer: number | undefined;
const showRuleGuide = ref(false);
const showBattleLog = ref(false);
const detailPlayerId = ref<string | null>(null);
const selectedActionSlot = ref<RollActionType | null>(null);
let highlightTimer: number | undefined;
let skillHintTimer: number | undefined;
const playedHighlightKeys = new Set<string>();
const playedSkillHintIds = new Set<string>();

const activePlayer = computed(() => room.value.players[room.value.activePlayerIndex]);
const isDuoMode = computed(() => room.value.gameMode === "duo_2v2");
const isPveMode = computed(() => room.value.gameMode === "pve_1v1");
const isRogueliteMode = computed(() => room.value.gameMode === "pve_roguelite");
const isSinglePlayerPveMode = computed(() => isPveMode.value || isRogueliteMode.value);
const isBotTurn = computed(() => isSinglePlayerPveMode.value && Boolean(activePlayer.value?.isBot) && room.value.phase === "battle");
const rogueliteState = computed(() => room.value.roguelite);
const rogueliteRewardChoices = computed(() => rogueliteState.value?.rewardChoices ?? []);
const rogueliteAppliedRewards = computed(() => rogueliteState.value?.appliedRewards ?? []);
const currentRogueliteRound = computed(() => Math.floor(((rogueliteState.value?.stage ?? 1) - 1) / 3) + 1);
const isBossRewardPhase = computed(() => (rogueliteState.value?.stage ?? 0) % 3 === 0 && room.value.phase === "reward");
const isBossStage = computed(() => (rogueliteState.value?.stage ?? 0) % 3 === 0 && room.value.phase === "battle");
const isRogueliteContinuePhase = computed(() => isRogueliteMode.value && room.value.phase === "roguelite_continue");
const isRogueliteSuccess = computed(() => isRogueliteMode.value && room.value.phase === "gameOver" && room.value.winnerId === props.playerId);

/** Unified click handler for any seat click from CombatBoard/BattleSeat.
 *  Delegates to mode-specific logic in BattlePage. */
function handleSeatClick(playerId: string): void {
  const player = room.value.players.find((p) => p.id === playerId);
  if (!player) return;
  if (isDuoMode.value) {
    handleDuoSeatClick(player);
  } else if (!isSelfDead.value) {
    selectTargetFromSeat(player);
  }
}

/** Pre-computed seat display data for classic (non-duo) battle mode. */
const classicSeats = computed<SeatViewModel[]>(() =>
  battlePlayers.value.map((player) => ({
    playerId: player.id,
    playerNumber: playerNumber(player),
    nickname: player.nickname,
    isDead: player.isDead,
    isActive: player.id === activePlayer.value?.id,
    isSelectable: canSelectTarget(player),
    isSelected: selectedTargetId.value === player.id,
    isHit: isRecentDamageTarget(player),
    isHealed: isRecentHealTarget(player),
    isBlocked: isNoDamageTarget(player),
    avatarEmoji: playerAvatar(player).emoji,
    statusText: playerStatus(player),
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.shield,
    lastRollText: lastRollText(player) || (zhaoZilongHitText(player) || ""),
    characterName: characterName(player.characterId),
    seatTags: buildSeatTags(player),
    attackableLabel: "可攻击",
    targetLabel: "目标",
    isHost: player.id === room.value.hostId,
    hasInvincible: hasInvincible(player),
    damageEffect: seatDamageEffect(player),
    healEffect: seatHealEffect(player),
    noEffect: seatNoEffect(player),
    emote: seatEmote(player)
  }))
);

/** Pre-computed seat data for each duo team column. */
const duoTeamSeats = computed<Record<string, SeatViewModel[]>>(() => {
  const result: Record<string, SeatViewModel[]> = {};
  for (const team of duoTeams.value) {
    result[team.id] = team.players.map((player) => {
      const canActor = canSelectDuoActor(player);
      const canEnemy = canSelectDuoEnemy(player);
      return {
        playerId: player.id,
        playerNumber: 0,
        nickname: player.nickname,
        isDead: player.isDead,
        isActive: player.controllerId === activeControllerId.value,
        isSelectable: canActor || canEnemy,
        isSelected: selectedActor.value?.id === player.id || selectedTargetId.value === player.id,
        isHit: isRecentDamageTarget(player),
        isHealed: isRecentHealTarget(player),
        isBlocked: isNoDamageTarget(player),
        avatarEmoji: playerAvatar(player).emoji,
        statusText: playerStatus(player),
        hp: player.hp,
        maxHp: player.maxHp,
        shield: player.shield,
        lastRollText: lastRollText(player),
        characterName: characterName(player.characterId),
        seatTags: buildDuoSeatTags(player),
        attackableLabel: canActor && selectedActor.value?.id !== player.id ? "可行动" : canEnemy && selectedTargetId.value !== player.id ? "可攻击" : "",
        targetLabel: selectedActor.value?.id === player.id ? "行动" : selectedTargetId.value === player.id ? "目标" : "",
        isHost: false,
        hasInvincible: hasInvincible(player),
        damageEffect: seatDamageEffect(player),
        healEffect: seatHealEffect(player),
        noEffect: seatNoEffect(player),
        emote: seatEmote(player)
      };
    });
  }
  return result;
});

function buildSeatTags(player: Player): string[] {
  const tags: string[] = [characterName(player.characterId)];
  if (!isRogueliteMode.value || player.isBot) {
    tags.push(`${summonerSkillName(player.summonerSkillId)}${player.summonerSkillCooldown ? ` ${player.summonerSkillCooldown}` : ""}`);
  }
  tags.push(...guardBadges(player));
  return tags;
}

function buildDuoSeatTags(player: Player): string[] {
  const tags: string[] = [characterName(player.characterId), summonerSkillName(player.summonerSkillId)];
  tags.push(...guardBadges(player));
  return tags;
}

function seatDamageEffect(player: Player): { key: string; value: number } | undefined {
  const effect = activeFloatingEffects.value.find((e) => e.playerId === player.id && e.type === "damage");
  return effect ? { key: effect.key, value: effect.value } : undefined;
}
function seatHealEffect(player: Player): { key: string; value: number } | undefined {
  const effect = activeFloatingEffects.value.find((e) => e.playerId === player.id && e.type === "heal");
  return effect ? { key: effect.key, value: effect.value } : undefined;
}
function seatNoEffect(player: Player): { key: string } | undefined {
  const effect = activeFloatingEffects.value.find((e) => e.playerId === player.id && e.type === "noEffect");
  return effect ? { key: effect.key } : undefined;
}

function seatEmote(player: Player) {
  const e = lookupEmote(player.id, player.controllerId);
  return e ? { key: e.key, emoji: e.emoji } : undefined;
}

/** Shared props for DicePanel — mode-agnostic fields. */
const dicePanelCommon = computed<Omit<DicePanelProps, "isReady" | "canRoll">>(() => ({
  diceValues: displayedDiceValues.value.map(String),
  diceKey: rollPhase.value === "idle" ? (visibleRoll.value?.id ?? "empty") : rollPhase.value,
  rollPhase: rollPhase.value,
  hasRolled: Boolean(visibleRoll.value),
  title: dicePanelTitle.value,
  detail: dicePanelDetail.value,
  skillText: latestSkill.value.map((event) => event.message.replace(/^.*触发技能：/, "")).join("；"),
  skillHints: activeSkillHints.value,
  showRollButton: !pendingGuardCheck.value || isGuardCheckMine.value,
  rollButtonText: rollButtonText.value
}));

/** Shared props for ActionSlots — mode-agnostic fields. */
const actionSlotsCommon = computed(() => ({
  slots: actionSlots.value.map(
    (slot): ActionSlotVM => ({
      id: slot.id,
      label: slot.label,
      description: slot.reason ?? slot.description,
      enabled: slot.enabled,
      requiresSelfDamage: slot.requiresSelfDamageAmount ?? false,
      settling: selectedActionSlot.value === slot.id
    })
  ),
  canUseSlots: canUseActionSlots.value,
  diceValue: pendingRollDecision.value?.currentRoll ?? 0,
  selfDestructOptions: selfDestructAmounts.map(
    (amount): SelfDestructOption => ({
      amount,
      damage: amount * 2,
      disabled: !canChooseSelfDestructAmount(amount)
    })
  ),
  showSelfDestruct: shouldShowSelfDestructChoices.value,
  locked: rollRequestLocked.value
}));

function onSelectAction(slotId: string): void {
  const slot = actionSlots.value.find((s) => s.id === slotId);
  if (slot) confirmActionSlot(slot);
}

function onSelectSelfDestruct(amount: number): void {
  confirmSelfDestructAmount(amount);
}

/** Display data for the player's own status panel. */
const selfPanelVM = computed<SelfPanelVM | null>(() => {
  if (!me.value) return null;
  return {
    avatarEmoji: playerAvatar(me.value).emoji,
    nickname: me.value.nickname,
    characterName: characterName(me.value.characterId),
    hp: me.value.hp,
    maxHp: me.value.maxHp,
    hpPercent: hpPercent(me.value),
    shield: me.value.shield,
    isDead: me.value.isDead,
    isCurrentTurn: me.value.id === activePlayer.value?.id,
    statusTags: buildSelfStatusTags(me.value),
    skillHintText: !isRogueliteMode.value ? selfSummonerText.value : "",
    lastRollText: lastRollText(me.value),
    damageEffect: selfDamageEffect(),
    healEffect: selfHealEffect(),
    noEffect: selfNoEffect(),
    emote: selfEmote()
  };
});

function buildSelfStatusTags(player: Player): string[] {
  const tags: string[] = [];
  tags.push(`${playerStatus(player)} · ${selfActionStateText.value}`);
  tags.push(...guardBadges(player));
  return tags;
}

function selfDamageEffect() {
  const e = activeFloatingEffects.value.find((ef) => ef.playerId === me.value?.id && ef.type === "damage");
  return e ? { key: e.key, value: e.value } : undefined;
}
function selfHealEffect() {
  const e = activeFloatingEffects.value.find((ef) => ef.playerId === me.value?.id && ef.type === "heal");
  return e ? { key: e.key, value: e.value } : undefined;
}
function selfNoEffect() {
  const e = activeFloatingEffects.value.find((ef) => ef.playerId === me.value?.id && ef.type === "noEffect");
  return e ? { key: e.key } : undefined;
}
function selfEmote() {
  const e = lookupEmote(me.value?.id ?? "");
  return e ? { key: e.key, emoji: e.emoji } : undefined;
}

/** Pre-computed display data for all roguelite-mode UI panels. */
const roguelitePanelVM = computed<RoguelitePanelVM>(() => ({
  enabled: isRogueliteMode.value,
  stage: rogueliteState.value?.stage ?? 1,
  round: currentRogueliteRound.value,
  stageType: rogueliteStageType.value,
  stageTypeLabel: rogueliteStageTypeLabel.value,
  phaseText: roguelitePhaseText(),

  boss: buildRogueliteBossVM(),
  enemy: buildRogueliteEnemyVM(),
  perks: buildRoguelitePerksVM(),
  resources: buildRogueliteResourcesVM(),
  enemyTraits: buildRogueliteEnemyTraitsVM(),

  rewardPhase: room.value.phase === "reward" ? buildRogueliteRewardPhaseVM() : undefined,
  continuePhase: isRogueliteContinuePhase.value ? buildRogueliteContinuePhaseVM() : undefined
}));

function roguelitePhaseText(): string {
  if (room.value.phase === "reward") return isBossRewardPhase.value ? "选择Boss能力" : "选择奖励";
  if (room.value.phase === "roguelite_continue") return "选择结束或继续";
  if (room.value.phase === "gameOver") return winnerText.value;
  return "挑战中";
}

function buildRogueliteBossVM(): RoguelitePanelVM["boss"] {
  if (!currentBossPlayer.value) return undefined;
  const chips: RogueliteBossStateChip[] = [];
  const state = currentBossPlayer.value.rogueliteBossState;
  if (state) {
    if ((state.charge as number) > 0) chips.push({ text: `蓄力层数：${state.charge}`, kind: "normal" });
    if (state.enraged) chips.push({ text: "狂暴中", kind: "enraged" });
    if (state.guarding) chips.push({ text: "架盾中", kind: "guarding" });
    if (state.bloodSacrificeUsed) chips.push({ text: "血祭已触发", kind: "normal" });
    if (currentBossPlayer.value.rogueliteBossId === "boss_god_berserker") {
      chips.push({ text: state.t15 ? "阈值 15" : "阈值 15 已破", kind: state.t15 ? "normal" : "broken" });
      chips.push({ text: state.t10 ? "阈值 10" : "阈值 10 已破", kind: state.t10 ? "normal" : "broken" });
      chips.push({ text: state.t5 ? "阈值 5" : "阈值 5 已破", kind: state.t5 ? "normal" : "broken" });
      chips.push({ text: state.t1 ? "阈值 1" : "阈值 1 已破", kind: state.t1 ? "normal" : "broken" });
      if (state.dyingAfterAttack) chips.push({ text: "濒死一击中", kind: "enraged" });
    }
  }
  return {
    name: currentBossPlayer.value.nickname,
    characterName: characterName(currentBossPlayer.value.characterId),
    hp: currentBossPlayer.value.hp,
    maxHp: currentBossPlayer.value.maxHp,
    shield: currentBossPlayer.value.shield,
    skills: currentBossSkills.value,
    stateChips: chips
  };
}

function buildRogueliteEnemyVM(): RoguelitePanelVM["enemy"] {
  const info = rogueliteEnemyInfo.value;
  if (!info || currentBossPlayer.value || room.value.phase !== "battle") return undefined;
  return {
    hpBonus: info.hpBonus,
    shieldBonus: info.shieldBonus ?? 0,
    damageBonus: info.damageBonus ?? 0,
    description: info.description
  };
}

function buildRogueliteResourcesVM(): RoguelitePanelVM["resources"] {
  const m = me.value;
  if (!m || room.value.phase !== "battle") return undefined;
  const res: NonNullable<RoguelitePanelVM["resources"]> = {};
  const hasFateTokens = m.roguelitePerkStacks?.["fate_tokens"];
  if (hasFateTokens) res.fateTokens = { current: m.rogueliteFateTokens ?? 0, max: 3 };
  if ((m.roguelitePerkStacks?.["low_roll_charge"])) res.lowRollCharge = m.rogueliteLowRollCharge ?? 0;
  if (m.roguelitePerkStacks?.["lucky_floor"]) res.consecutiveLowRolls = { current: m.rogueliteConsecutiveLowRolls ?? 0, max: 2 };
  if (m.roguelitePerkStacks?.["shield_overload"]) res.shieldOverloadUsed = m.rogueliteShieldOverloadUsed ?? false;
  return Object.keys(res).length > 0 ? res : undefined;
}

function buildRogueliteEnemyTraitsVM(): string[] | undefined {
  if (room.value.phase !== "battle") return undefined;
  const bot = room.value.players.find(p => p.isBot);
  if (!bot) return undefined;
  const traits: string[] = [];
  const bid = bot.rogueliteBossId;
  if (bid === "normal_shield_breaker") traits.push("破盾：攻击护盾额外 +2");
  if (bid === "normal_armor_piercer") traits.push("穿甲：无视 1 点护甲");
  if (bid === "normal_gambler") traits.push("赌徒：投 1 自伤，投 6 增伤");
  if (bid === "elite_reaper") traits.push("收割：玩家低血时增伤");
  if (bid === "elite_armor_piercing") traits.push("强穿甲：无视护甲，半血后增强");
  if (bid === "boss_god_berserker") traits.push("狂战增伤", "生命阈值");
  if (bid === "boss_gambler_dealer") traits.push("骰子操控", "赌注", "庄家通吃");
  return traits.length > 0 ? traits : undefined;
}

function buildRoguelitePerksVM(): RoguelitePanelVM["perks"] {
  return {
    growth: rogueliteGrowthPerks.value.map((p) => ({
      id: p.perkId, name: p.def.name, level: p.level, description: p.def.perLevelDesc, category: "growth" as const
    })),
    skills: rogueliteCharacterSkills.value.map((s) => ({
      id: s.skillId, name: s.def.name, level: s.level, description: s.def.perLevelDesc, category: "skill" as const
    })),
    boss: rogueliteBossPerks.value.map((p) => ({
      id: p.perkId, name: p.def.name, level: p.level, description: p.def.perLevelDesc, category: "boss" as const
    }))
  };
}

function buildRogueliteRewardPhaseVM(): NonNullable<RoguelitePanelVM["rewardPhase"]> {
  const summary = rogueliteState.value?.lastStageSummary;
  return {
    isBoss: isBossRewardPhase.value,
    title: isBossRewardPhase.value ? "选择 Boss 能力" : "选择奖励",
    hint: isBossRewardPhase.value ? "选择 1 个 Boss 能力，完成挑战" : "选择 1 个奖励后进入下一关",
    summary: summary ? {
      defeatedName: summary.defeatedEnemyName,
      postBattleHeal: summary.postBattleHeal ?? 0,
      hpAfterHeal: summary.hpAfterHeal,
      maxHp: summary.maxHp,
      isBoss: summary.isBoss ?? false
    } : undefined,
    options: rogueliteRewardChoices.value.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isBoss: isBossRewardType(r.type)
    }))
  };
}

function buildRogueliteContinuePhaseVM(): NonNullable<RoguelitePanelVM["continuePhase"]> {
  return {
    hint: `你已击败第 ${rogueliteState.value?.stage ?? 1} 关 Boss！选择结束挑战或继续前进。`,
    nextStage: rogueliteState.value?.stage ?? 1
  };
}

const rogueliteStageType = computed(() => {
  const stage = rogueliteState.value?.stage ?? 1;
  if (stage % 3 === 0) return "boss";
  if (stage % 3 === 2 && stage >= 5) return "elite";
  return "normal";
});

const rogueliteStageTypeLabel = computed(() => {
  if (rogueliteStageType.value === "boss") return "Boss 战";
  if (rogueliteStageType.value === "elite") return "精英关";
  return "普通关";
});

const rogueliteEnemyInfo = computed(() => {
  if (!isRogueliteMode.value || room.value.phase !== "battle") return undefined;
  return room.value.players.find((p) => p.isBot)?.rogueliteEnemyInfo;
});

const PERK_DISPLAY: Record<string, { name: string; category: "growth" | "boss"; perLevelDesc: string }> = {
  heavy_punch: { name: "重拳训练", category: "growth", perLevelDesc: "伤害 +1，最大生命 +2" },
  iron_body: { name: "铁布衫", category: "growth", perLevelDesc: "护甲 +1，每关开始护盾 +2" },
  blood_punch: { name: "吸血拳法", category: "growth", perLevelDesc: "伤害 +1，造成生命伤害后回复 1" },
  breathing_recovery: { name: "战斗喘息", category: "growth", perLevelDesc: "最大生命 +3，获得时恢复 40% 最大生命" },
  battle_instinct: { name: "战斗本能", category: "growth", perLevelDesc: "伤害 +1，战后额外恢复 +2" },
  guard_training: { name: "防守训练", category: "growth", perLevelDesc: "最大生命 +4，每关开始护盾 +3" },
  starter_recovery: { name: "续航开局", category: "growth", perLevelDesc: "最大生命 +4，战后额外恢复 +5" },
  berserker_blood: { name: "狂怒之血", category: "boss", perLevelDesc: "攻击额外造成已损失生命一半的伤害 + 每级额外 +2" },
  vampire_instinct: { name: "吸血本能", category: "boss", perLevelDesc: "造成生命伤害后回复 2，溢出转护盾" },
  dragon_courage: { name: "龙胆之力", category: "boss", perLevelDesc: "攻击无视护盾和护甲，每级额外伤害 +1" },
  vitality_boost: { name: "生命强化", category: "growth", perLevelDesc: "最大生命 +4" },
  shield_wall: { name: "护盾壁垒", category: "growth", perLevelDesc: "每关开始护盾 +4" },
  first_strike: { name: "先手优势", category: "growth", perLevelDesc: "每关首次攻击伤害 +3" },
  low_hp_armor: { name: "绝境护甲", category: "growth", perLevelDesc: "血量低于一半时护甲 +1" },
  kill_heal: { name: "战利品", category: "growth", perLevelDesc: "击败敌人后回复 3 点生命" },
  comeback: { name: "翻盘之力", category: "growth", perLevelDesc: "血量低于一半时伤害 +3" }
};

const SKILL_DISPLAY: Record<string, { name: string; perLevelDesc: string }> = {
  gunner_triple_shot: { name: "枪手技能", perLevelDesc: "Lv.1：6 点三倍伤害；Lv.2：额外 +3；Lv.3：5/6 点触发" },
  vampire_skill: { name: "吸血鬼技能", perLevelDesc: "造成生命伤害后回复等同等级的生命" },
  zhaoyun_pierce: { name: "赵子龙技能", perLevelDesc: "攻击无视护盾和护甲，升级后穿透伤害 +1/+2" },
  flame_lord_mark: { name: "火焰领主技能", perLevelDesc: "攻击命中后添加等同等级的火焰印记" }
};

const rogueliteGrowthPerks = computed(() => {
  const stacks = me.value?.roguelitePerkStacks ?? {};
  return Object.entries(stacks)
    .filter(([perkId]) => PERK_DISPLAY[perkId]?.category === "growth")
    .map(([perkId, level]) => ({ perkId, level, def: PERK_DISPLAY[perkId]! }))
    .filter((p) => p.def)
    .sort((a, b) => a.def.name.localeCompare(b.def.name));
});

const rogueliteBossPerks = computed(() => {
  const stacks = me.value?.roguelitePerkStacks ?? {};
  return Object.entries(stacks)
    .filter(([perkId]) => PERK_DISPLAY[perkId]?.category === "boss")
    .map(([perkId, level]) => ({ perkId, level, def: PERK_DISPLAY[perkId]! }))
    .filter((p) => p.def)
    .sort((a, b) => a.def.name.localeCompare(b.def.name));
});

const rogueliteCharacterSkills = computed(() => {
  const stacks = me.value?.rogueliteSkillStacks ?? {};
  return Object.entries(stacks)
    .filter(([skillId]) => SKILL_DISPLAY[skillId])
    .map(([skillId, level]) => ({ skillId, level, def: SKILL_DISPLAY[skillId]! }))
    .sort((a, b) => a.def.name.localeCompare(b.def.name));
});

const hasAnyRoguelitePerks = computed(() => rogueliteGrowthPerks.value.length > 0 || rogueliteCharacterSkills.value.length > 0 || rogueliteBossPerks.value.length > 0);

const BOSS_SKILL_DISPLAY: Record<string, string[]> = {
  boss_boxer_king: ["蓄力：投到 1/2 时蓄力，下次攻击额外伤害", "重拳：消耗蓄力造成额外伤害（每层 +3）", "狂暴：半血后伤害 +2"],
  boss_blood_demon: ["吸血攻击：造成生命伤害后回复 2 点血", "血盾：投到 3 时获得 4 点护盾", "血祭：血量低于 40% 时回复 5 点血并获得 3 点护盾"],
  boss_shield_guard: ["坚守：天生护甲 +1", "架盾：投到 1/2 时获得 5 点护盾并准备减伤", "盾击反击：架盾后受到攻击时反击 2 点伤害"],
  boss_god_berserker: ["狂战：已损失生命转化为额外伤害", "生命阈值：15 / 10 / 5 / 1（一次只触发一个）", "濒死一击：1 血后完成最后一次攻击才会倒下"],
  boss_gambler_dealer: ["骰子操控：投到 1-3 时重投一次", "赌注：玩家投 6 时获得 3 点护盾", "庄家通吃：血量低于 30% 时伤害 +3"],
  elite_iron_skin: ["铁皮：天生护甲 +1，每回合获 2 护盾"],
  elite_berserker: ["狂暴：血量低于一半时伤害 +3"]
};

const currentBossPlayer = computed(() => {
  if (!isRogueliteMode.value || room.value.phase !== "battle") return undefined;
  return room.value.players.find((p) => p.isBot && p.rogueliteBossId);
});

const currentBossSkills = computed(() => {
  if (!currentBossPlayer.value?.rogueliteBossId) return [];
  return BOSS_SKILL_DISPLAY[currentBossPlayer.value.rogueliteBossId] ?? [];
});
const activeControllerId = computed(() => room.value.activeControllerId);
const isMyDuoControllerTurn = computed(() => isDuoMode.value && room.value.phase === "battle" && activeControllerId.value === props.playerId);
const selectedActor = computed(() => room.value.players.find((player) => player.id === room.value.selectedActorId));
const duoTeams = computed(() => [
  { id: "A", label: "A 队", players: room.value.players.filter((player) => player.teamId === "A") },
  { id: "B", label: "B 队", players: room.value.players.filter((player) => player.teamId === "B") }
]);
const isMyTurn = computed(() => !isDuoMode.value && activePlayer.value?.id === props.playerId && room.value.phase === "battle");
const isMyDuoActionTurn = computed(() => isDuoMode.value && room.value.phase === "battle" && activeControllerId.value === props.playerId && Boolean(selectedActor.value));
const me = computed(() => room.value.players.find((player) => player.id === props.playerId));
const selectedTargetId = computed(() => {
  if (isDuoMode.value) {
    return selectedActor.value?.selectedTargetId;
  }
  return me.value?.selectedTargetId;
});
const selectedTarget = computed(() => room.value.players.find((player) => player.id === selectedTargetId.value));
const battlePlayers = computed(() => {
  const others = room.value.players.filter((player) => player.id !== props.playerId);
  return others.length > 0 ? others : room.value.players;
});
const aliveEnemies = computed(() => room.value.players.filter((player) => !player.isDead && player.id !== props.playerId));
const winner = computed(() => room.value.players.find((player) => player.id === room.value.winnerId));
const winnerText = computed(() => {
  if (isDuoMode.value && room.value.winnerTeamId) return `${room.value.winnerTeamId} 队获胜`;
  if (isRogueliteMode.value) return winner.value?.id === props.playerId ? "挑战成功" : "挑战失败";
  if (isPveMode.value) return winner.value?.id === props.playerId ? "胜利" : "失败";
  return `胜者：${winner.value?.nickname ?? "--"}`;
});
const pendingRoll = computed(() => room.value.pendingRoll);
const pendingRollDecision = computed(() => room.value.pendingRollDecision);
const pendingGuardCheck = computed(() => room.value.pendingGuardCheck);
const guardCheckActor = computed(() => {
  const pending = pendingGuardCheck.value;
  if (!pending) return undefined;
  return room.value.players.find((player) => player.id === pending.actorId);
});
const visibleGuardCheckEvent = computed(() => {
  if (rollMode.value !== "guard" || (rollPhase.value !== "reveal" && rollPhase.value !== "idle")) return undefined;
  return room.value.battleLog.find((event) => event.id === visibleGuardCheckId.value && event.type === "guardCheck");
});
const displayedGuardDice = computed(() => visibleGuardCheckEvent.value?.dice?.[0] ?? "?");
const isGuardCheckMine = computed(() => {
  const pending = pendingGuardCheck.value;
  if (!pending) return false;
  if (isDuoMode.value) {
    const actor = guardCheckActor.value;
    return activeControllerId.value === props.playerId && pending.controllerId === props.playerId && actor?.controllerId === props.playerId;
  }
  return pending.actorId === props.playerId && activePlayer.value?.id === props.playerId;
});
const canRollGuardCheck = computed(() => Boolean(pendingGuardCheck.value && isGuardCheckMine.value && !isRolling.value && !rollRequestLocked.value));
const isPendingMine = computed(() => {
  const pending = pendingRoll.value;
  if (!pending) return false;
  if (isDuoMode.value) {
    const actor = room.value.players.find((player) => player.id === pending.playerId);
    return activeControllerId.value === props.playerId && pending.playerId === room.value.selectedActorId && actor?.controllerId === props.playerId;
  }
  return pending.playerId === props.playerId;
});
const isDecisionMine = computed(() => {
  const decision = pendingRollDecision.value;
  if (!decision) return false;
  if (isDuoMode.value) {
    const actor = room.value.players.find((p) => p.id === decision.actorId);
    return actor?.controllerId === props.playerId;
  }
  return decision.actorId === props.playerId;
});
const isSelfDead = computed(() => Boolean(me.value?.isDead));
const canUseActionSlots = computed(() => Boolean(pendingRollDecision.value && isDecisionMine.value && !pendingGuardCheck.value && !isRolling.value && !rollRequestLocked.value));
const shouldShowActionSlots = computed(() => Boolean(canUseActionSlots.value && !isSelfDead.value));
const rematchReadyIds = computed(() => room.value.rematchReadyPlayerIds ?? []);
const isRematchReady = computed(() => rematchReadyIds.value.includes(props.playerId));
const rematchParticipants = computed<RematchParticipant[]>(() => {
  if (!isDuoMode.value) {
    return room.value.players.filter((player) => !player.isBot).map((player) => ({
      id: player.id,
      nickname: player.nickname,
      isHost: player.id === room.value.hostId || player.isHost
    }));
  }

  return rematchControllerIds.value.map((controllerId) => {
    const units = room.value.players.filter((player) => player.controllerId === controllerId || player.id === controllerId);
    const source = units[0];
    return {
      id: controllerId,
      nickname: source ? controllerNickname(source) : controllerId,
      isHost: room.value.hostId === controllerId || units.some((player) => player.isHost)
    };
  });
});
const rematchControllerIds = computed(() => {
  if (!isDuoMode.value) return room.value.players.filter((player) => !player.isBot).map((player) => player.id);
  const ids: string[] = [];
  for (const controllerId of room.value.controllerTurnOrder ?? []) {
    if (!ids.includes(controllerId)) ids.push(controllerId);
  }
  for (const player of room.value.players) {
    const controllerId = player.controllerId ?? player.id;
    if (!ids.includes(controllerId)) ids.push(controllerId);
  }
  return ids;
});
const rematchReadyCount = computed(() => rematchParticipants.value.filter((participant) => rematchReadyIds.value.includes(participant.id)).length);
const isAllRematchReady = computed(() => rematchParticipants.value.length > 0 && rematchReadyCount.value >= rematchParticipants.value.length);
const detailPlayer = computed(() => room.value.players.find((player) => player.id === detailPlayerId.value));
const selectedTargetText = computed(() => selectedTarget.value ? `当前目标：${selectedTarget.value.nickname}` : "当前目标：未选择");
const actionStageText = computed(() => {
  if (room.value.phase === "reward") return isBossRewardPhase.value ? "请选择一个 Boss 能力" : "请选择一个奖励";
  if (room.value.phase === "roguelite_continue") return "请选择结束挑战或继续挑战";
  if (room.value.phase === "gameOver") return "游戏结束";
  if (me.value?.isDead) return "你已死亡，等待本局结束";
  if (rollRequestLocked.value && !pendingRoom.value) return "正在结算……";
  if (isRolling.value) return "骰子滚动中……";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "架盾判定：点击投骰";
  if (pendingGuardCheck.value) return `等待 ${guardCheckActor.value?.nickname ?? "山盾"} 进行架盾判定`;
  if (isBotTurn.value) return "AI 思考中...";
  if (pendingRollDecision.value && isDecisionMine.value) return "请选择本回合行动";
  if (pendingRollDecision.value) return `等待 ${activePlayer.value?.nickname ?? "玩家"} 选择骰子用途`;
  if (pendingRoll.value && isPendingMine.value) return "技能触发：请继续投骰";
  if (!isMyTurn.value) return `等待 ${activePlayer.value?.nickname ?? "玩家"} 行动`;
  if (!selectedTargetId.value) return "请选择一个目标";
  return `已选择目标：${selectedTarget.value?.nickname ?? "目标"}，可以投骰`;
});
const selfActionStateText = computed(() => {
  if (!me.value) return "未入场";
  if (me.value.isDead) return "已死亡";
  if (isMyTurn.value) return selectedTargetId.value ? "可以投骰" : "选择目标中";
  return "等待行动";
});
const selfSummonerText = computed(() => {
  if (isRogueliteMode.value) return "";
  const player = me.value;
  if (!player) return "召唤师技能：无";
  const name = summonerSkillName(player.summonerSkillId);
  const cooldown = player.summonerSkillCooldown ?? 0;
  return cooldown > 0 ? `${name} 冷却 ${cooldown}` : `${name} 可用`;
});
const actionSlots = computed<RollDecisionAvailableAction[]>(() => {
  const decision = pendingRollDecision.value;
  if (!decision) return [];
  return decision.availableActions ?? [];
});
const activeDecisionActor = computed(() => {
  const decision = pendingRollDecision.value;
  if (!decision) return undefined;
  return room.value.players.find((player) => player.id === decision.actorId);
});
const selfDestructSlot = computed(() => actionSlots.value.find((slot) => slot.requiresSelfDamageAmount));
const shouldShowSelfDestructChoices = computed(() => Boolean(canUseActionSlots.value && selfDestructSlot.value?.enabled && activeDecisionActor.value?.characterId === "self_destructor"));
const selfDestructAmounts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

watch(
  () => props.room,
  (nextRoom) => {
    const nextRollId = getLatestRoll(nextRoom)?.id;
    const shownRollId = getLatestRoll(displayedRoom.value)?.id;
    const nextGuardCheckId = getLatestGuardCheck(nextRoom)?.id;
    const shownGuardCheckId = getLatestGuardCheck(displayedRoom.value)?.id;

    if (nextGuardCheckId && nextGuardCheckId !== shownGuardCheckId && isRolling.value && rollMode.value === "guard") {
      pendingRoom.value = cloneRoomForDisplay(nextRoom);
      pendingRevealGuardCheckId.value = nextGuardCheckId;
      return;
    }

    if (nextRollId && nextRollId !== shownRollId && isRolling.value) {
      pendingRoom.value = cloneRoomForDisplay(nextRoom);
      pendingRevealRollId.value = nextRollId;
      return;
    }

    if (nextGuardCheckId && nextGuardCheckId !== shownGuardCheckId) {
      displayedRoom.value = cloneRoomForDisplay(nextRoom);
      visibleGuardCheckId.value = nextGuardCheckId;
      rollRequestLocked.value = false;
      return;
    }

    if (nextRollId && nextRollId !== shownRollId) {
      displayedRoom.value = cloneRoomForDisplay(nextRoom);
      visibleRollId.value = nextRollId;
      startEffectWindow(nextRollId);
      rollRequestLocked.value = false;
      return;
    }

    if (isRolling.value) {
      pendingRoom.value = cloneRoomForDisplay(nextRoom);
      return;
    }

    displayedRoom.value = cloneRoomForDisplay(nextRoom);
    rollRequestLocked.value = false;
    selectedActionSlot.value = null;
    if (visibleRollId.value) startEffectWindow(visibleRollId.value);
  },
  { deep: false }
);

watch(
  () => props.lastEmote,
  (event) => {
    if (!event || event.roomId !== room.value.id) return;
    showPlayerEmote(event);
  }
);

onUnmounted(() => {
  clearAllTimers();
  while (effectTimers.length) window.clearTimeout(effectTimers.pop());
  clearEmoteTimers();
  clearHighlightTimer();
  clearSkillHintTimer();
  window.clearTimeout(rogueliteAlertTimer);
});

watch(
  () => props.lastEvent,
  (event) => {
    if (!isRogueliteMode.value || !event) return;
    const alertText = getRogueliteAlertText(event.message);
    if (alertText) {
      rogueliteAlert.value = { text: alertText, key: event.id };
      window.clearTimeout(rogueliteAlertTimer);
      rogueliteAlertTimer = window.setTimeout(() => {
        rogueliteAlert.value = null;
      }, 1500);
    }
  }
);

function getRogueliteAlertText(msg: string): string | null {
  if (msg.includes("战后恢复至满血")) return `🎉 战后恢复！满血！`;
  if (msg.includes("战后恢复")) return `💚 战后恢复！`;
  if (msg.includes("Boss 出现")) return "⚠  Boss 出现！";
  if (msg.includes("蓄力重拳")) return "💥 蓄力重拳！";
  if (msg.includes("进入狂暴")) return "🔥 狂暴！";
  if (msg.includes("凝聚血盾")) return "🛡 血盾！";
  if (msg.includes("发动血祭")) return "🩸 血祭！";
  if (msg.includes("吸取生命")) return "🩸 吸血！";
  if (msg.includes("架起巨盾")) return "🛡 架盾！";
  if (msg.includes("盾击反击")) return "⚔ 盾击反击！";
  if (msg.includes("狂怒之血")) return "😡 狂怒之血！";
  if (msg.includes("龙胆之力")) return "🐉 龙胆之力！";
  if (msg.includes("枪手") && msg.includes("三倍")) return "💥 三倍射击！";
  if (msg.includes("血祭回复")) return "🩸 血祭回复！";
  if (msg.includes("自爆")) return "💣 自爆！";
  if (msg.includes("处决")) return "⚔ 处决！";
  if (msg.includes("碾压")) return "🪨 巨岩碾压！";
  if (msg.includes("开始蓄力")) return "⚡ 蓄力！";
  if (msg.includes("生命阈值")) return "🛡 生命阈值！";
  if (msg.includes("濒死不倒")) return "💀 濒死一击！";
  if (msg.includes("燃尽最后生命")) return "⚰ 神狂战倒下！";
  if (msg.includes("狂战增伤")) return "💢 狂战增伤！";
  return null;
}

const visibleRoll = computed(() => {
  if (rollMode.value === "guard") return undefined;
  if (rollPhase.value !== "idle" && rollPhase.value !== "reveal") return undefined;
  return room.value.battleLog.find((event) => event.id === visibleRollId.value && event.type === "roll");
});
const currentDiceMode = computed<CurrentDiceMode>(() => {
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "guard_check";
  if (rollMode.value === "guard" && (isRolling.value || visibleGuardCheckEvent.value)) return "guard_check";
  if (pendingRollDecision.value || visibleRoll.value || pendingRoll.value) return "action_roll";
  return null;
});
const displayedDiceValues = computed(() => {
  if (isRolling.value) return [rollPhase.value === "pause" ? "..." : rollingDice.value];
  if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value?.dice?.length) return visibleGuardCheckEvent.value.dice;
  if (currentDiceMode.value === "guard_check") return ["?"];
  if (pendingRollDecision.value) return [pendingRollDecision.value.currentRoll];
  return visibleRoll.value?.dice ?? ["?"];
});

const latestActionEvents = computed(() => {
  if (currentDiceMode.value === "guard_check") return [];
  const rollId = visibleRoll.value?.id;
  const firstRollIndex = room.value.battleLog.findIndex((event) => event.id === rollId);
  if (firstRollIndex < 0) return [];
  const nextRollIndex = room.value.battleLog.findIndex((event, index) => index > firstRollIndex && event.type === "roll");
  return room.value.battleLog.slice(firstRollIndex, nextRollIndex < 0 ? undefined : nextRollIndex);
});

const latestSkill = computed(() => latestActionEvents.value.filter((event) => event.type === "skill"));
const latestDiceText = computed(() => {
  if (currentDiceMode.value === "guard_check" && isRolling.value) return "架盾判定中……";
  if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value) return visibleGuardCheckEvent.value.message;
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "1-4 架盾继续，5-6 架盾结束";
  if (pendingGuardCheck.value) return "对方正在进行架盾判定";
  if (isRolling.value) return pendingRoll.value?.message ?? "";
  if (pendingRollDecision.value) return `当前骰点 ${pendingRollDecision.value.currentRoll}`;
  const dice = visibleRoll.value?.dice ?? [];
  if (dice.length === 0) return pendingRoll.value?.message ?? "等待投骰";
  return `投出了 ${dice.join("、")} 点`;
});

const dicePanelTitle = computed(() => {
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "架盾判定";
  if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value) return "架盾判定";
  return latestDiceText.value;
});

const dicePanelDetail = computed(() => {
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "1-4 架盾继续，5-6 架盾结束";
  if (pendingGuardCheck.value) return "对方正在进行架盾判定";
  if (currentDiceMode.value === "guard_check" && visibleGuardCheckEvent.value) return visibleGuardCheckEvent.value.message;
  if (pendingRoll.value && !isRolling.value) return pendingRoll.value.message;
  return visibleRoll.value?.message;
});

const currentActionTitle = computed(() => {
  if (isSelfDead.value) return "你已死亡，正在观战";
  return actionStageText.value;
});

const currentDiceValueText = computed(() => {
  if (pendingGuardCheck.value) return String(displayedGuardDice.value);
  if (pendingRollDecision.value) return String(pendingRollDecision.value.currentRoll);
  return latestDiceText.value;
});

const currentActionLines = computed(() => {
  const actorName = activePlayer.value?.nickname ?? "玩家";
  if (pendingGuardCheck.value) {
    return [`架盾角色：${guardCheckActor.value?.nickname ?? "山盾"}`, `架盾判定骰：${displayedGuardDice.value}`, isGuardCheckMine.value ? "点击架盾判定骰子" : "等待架盾判定"];
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
  if (isRolling.value) return "摇骰中...";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "投骰";
  if (pendingGuardCheck.value) return "等待架盾判定";
  if (pendingRollDecision.value) return "等待选择";
  if (pendingRoll.value) return isPendingMine.value ? "继续投骰" : "等待继续投骰";
  return "投骰";
});

const turnGuideText = computed(() => {
  if (room.value.phase === "reward") return isBossRewardPhase.value ? "选择一个 Boss 能力" : "选择一个奖励后进入下一关";
  if (room.value.phase === "roguelite_continue") return "选择结束挑战或继续挑战";
  if (room.value.phase === "gameOver") return "游戏结束";
  if (me.value?.isDead) return "你已死亡，等待本局结束";
  if (rollRequestLocked.value && !pendingRoom.value) return "正在结算……";
  if (isRolling.value) return "骰子滚动中……";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "架盾判定：点击投骰";
  if (pendingGuardCheck.value) return `等待【${guardCheckActor.value?.nickname ?? "山盾"}】进行架盾判定`;
  if (isBotTurn.value) return "AI 思考中...";
  if (pendingRollDecision.value && isDecisionMine.value) return "骰点已揭示：选择一个骰子行动卡槽";
  if (pendingRollDecision.value) return `等待【${activePlayer.value?.nickname ?? "玩家"}】选择骰子用途`;
  if (pendingRoll.value && isPendingMine.value) return "技能触发：请继续投骰";
  if (!isMyTurn.value) return `等待【${activePlayer.value?.nickname ?? "玩家"}】行动`;
  if (!selectedTargetId.value) return "轮到你了：点击一个头像选择攻击目标";
  return `已选择【${selectedTarget.value?.nickname ?? "目标"}】，点击投骰`;
});

const turnGuideTone = computed(() => {
  if (room.value.phase === "reward") return "mine";
  if (room.value.phase === "roguelite_continue") return "mine";
  if (room.value.phase === "gameOver") return "ended";
  if (me.value?.isDead) return "dead";
  if (rollRequestLocked.value || isRolling.value) return "busy";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "mine";
  if (pendingRoll.value && isPendingMine.value) return "continue";
  if (isBotTurn.value) return "busy";
  if (isMyTurn.value) return "mine";
  return "waiting";
});

const canRoll = computed(() => {
  if (room.value.phase === "gameOver" || rollRequestLocked.value || isRolling.value || pendingRollDecision.value || pendingGuardCheck.value || !isMyTurn.value) return false;
  if (pendingRoll.value) return isPendingMine.value;
  return Boolean(selectedTargetId.value) && aliveEnemies.value.length > 0;
});

const canRollForDuo = computed(() => {
  if (isDuoMode.value && room.value.phase === "battle") {
    if (rollRequestLocked.value || isRolling.value || pendingRollDecision.value || pendingGuardCheck.value) return false;
    if (pendingRoll.value) return isPendingMine.value;
    return isMyDuoActionTurn.value && Boolean(selectedActor.value?.selectedTargetId);
  }
  return false;
});

function characterName(id: string | undefined): string {
  return props.characters.find((character) => character.id === id)?.name ?? "未知职业";
}

function characterFor(id: string | undefined): Character | undefined {
  return props.characters.find((character) => character.id === id);
}

function summonerSkillName(id: SummonerSkillId | undefined): string {
  if (id === "first_aid") return "急救术";
  if (id === "iron_wall") return "铁壁";
  if (id === "fate_reroll") return "命运重掷";
  if (id === "last_stand") return "破釜";
  return "幸运骰";
}

function hpPercent(player: Player): number {
  if (player.maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
}

function playerStatus(player: Player): string {
  if (!player.isOnline) return "离线";
  if (player.isDead) return "死亡";
  if (player.characterId === "mountain_shield" && player.guarding) return "架盾";
  if (pendingRoll.value?.playerId === player.id) return "待继续";
  if (player.id === activePlayer.value?.id) return "行动中";
  if (hasInvincible(player)) return "无敌";
  return "待机";
}

function guardBadges(player: Player): string[] {
  if (player.characterId === "mountain_shield" && player.guarding) {
    return ["架盾", "护甲+1", "团体护甲+2"];
  }
  if (isDuoMode.value && isProtectedByGuardingMountainShield(player)) {
    return ["受架盾保护", "团体护甲+2"];
  }
  return [];
}

function isProtectedByGuardingMountainShield(player: Player): boolean {
  if (!player.teamId || player.characterId === "mountain_shield") return false;
  return room.value.players.some((item) => item.characterId === "mountain_shield" && item.guarding && !item.isDead && item.teamId === player.teamId);
}

function hasInvincible(player: Player): boolean {
  return room.value.effects.some((effect) => effect.type === "invincible" && effect.sourcePlayerId === player.id);
}

function playerAvatar(player: Player): AvatarOption {
  const avatarId = (player as Player & { avatarId?: string }).avatarId;
  const assignedAvatar = PLAYER_AVATARS.find((avatar) => avatar.id === avatarId);
  if (assignedAvatar) return assignedAvatar;

  const hash = Array.from(player.id).reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0);
  return PLAYER_AVATARS[Math.abs(hash) % PLAYER_AVATARS.length];
}

function playerNumber(player: Player): number {
  const index = room.value.players.findIndex((item) => item.id === player.id);
  return index < 0 ? 0 : index + 1;
}

function lastRollText(player: Player): string {
  if (pendingRollDecision.value?.actorId === player.id) return `🎲 ${pendingRollDecision.value.currentRoll}`;
  const rollEvent = room.value.battleLog.find((event) => event.type === "roll" && event.playerId === player.id && event.dice?.length);
  if (!rollEvent?.dice?.length) return "";
  return `🎲 ${rollEvent.dice.join("、")}`;
}

function zhaoZilongHitText(player: Player): string {
  if (player.characterId !== "zhaoZilong") return "";
  return `龙胆：${player.zhaoZilongHitCount ?? 0}/3`;
}

function canSelectTarget(player: Player): boolean {
  return isMyTurn.value && !pendingRoll.value && !pendingRollDecision.value && !pendingGuardCheck.value && player.id !== props.playerId && !player.isDead;
}

function selectTargetFromSeat(player: Player): void {
  if (!canSelectTarget(player)) return;
  emit("selectTarget", player.id);
}

function canSelectDuoActor(player: Player): boolean {
  return isMyDuoControllerTurn.value && !pendingRoll.value && !pendingRollDecision.value && !pendingGuardCheck.value && player.controllerId === props.playerId && !player.isDead;
}

function canSelectDuoEnemy(player: Player): boolean {
  return isDuoMode.value && Boolean(selectedActor.value) && !pendingRoll.value && !pendingRollDecision.value && !pendingGuardCheck.value && player.teamId !== selectedActor.value?.teamId && player.controllerId !== props.playerId && !player.isDead;
}

function handleDuoSeatClick(player: Player): void {
  if (canSelectDuoActor(player)) {
    selectDuoActor(player);
  } else if (canSelectDuoEnemy(player)) {
    emit("selectTarget", player.id);
  }
}

function selectDuoActor(player: Player): void {
  if (!canSelectDuoActor(player)) return;
  emit("selectActor", player.id);
}

function openPlayerDetail(player: Player): void {
  detailPlayerId.value = player.id;
}

function openPlayerDetailById(playerId: string): void {
  detailPlayerId.value = playerId;
}

function closePlayerDetail(): void {
  detailPlayerId.value = null;
}

function isRecentDamageTarget(player: Player): boolean {
  return Boolean(floatingEffectFor(player, "damage"));
}

function isRecentHealTarget(player: Player): boolean {
  return Boolean(floatingEffectFor(player, "heal"));
}

function isNoDamageTarget(player: Player): boolean {
  return Boolean(floatingEffectFor(player, "noEffect"));
}

function floatingEffectFor(player: Player, type: FloatingEffect["type"]): FloatingEffect | undefined {
  return activeFloatingEffects.value.find((effect) => effect.playerId === player.id && effect.type === type);
}

function rollWithAnimation(): void {
  if (isDuoMode.value ? !canRollForDuo.value : !canRoll.value) return;
  rollRequestLocked.value = true;
  startRollAnimation("normal", true);
  emit("rollDice");
}

function rollGuardCheck(): void {
  if (!canRollGuardCheck.value) return;
  rollRequestLocked.value = true;
  startRollAnimation("guard", true);
  socket.emit("rollGuardCheck", {}, () => {
    if (!isRolling.value) rollRequestLocked.value = false;
  });
}

function rollMainDice(): void {
  if (pendingGuardCheck.value) {
    rollGuardCheck();
    return;
  }
  rollWithAnimation();
}

function confirmDecision(choice: RollDecisionChoice, summonerSkillId?: SummonerSkillId, selfDamageAmount?: number): void {
  const decision = pendingRollDecision.value;
  if (!decision || !isDecisionMine.value || rollRequestLocked.value) return;
  rollRequestLocked.value = true;
  selectedActionSlot.value = choice === "settle" ? "normal_attack" : choice;
  emit("confirmRollDecision", {
    roomId: room.value.id,
    pendingDecisionId: decision.id,
    actionType: choice === "settle" ? "normal_attack" : choice,
    skillId: summonerSkillId,
    decisionId: decision.id,
    choice,
    summonerSkillId,
    selfDamageAmount
  });
}

function confirmActionSlot(slot: RollDecisionAvailableAction): void {
  if (!pendingRollDecision.value || !isDecisionMine.value || rollRequestLocked.value || !slot.enabled) return;
  if (slot.requiresSelfDamageAmount) return;
  const summonerSkillId = slot.id === "summoner_skill" && isSummonerSkillId(slot.skillId) ? slot.skillId : undefined;
  confirmDecision(slot.id, summonerSkillId);
}

function canChooseSelfDestructAmount(amount: number): boolean {
  return Boolean(shouldShowSelfDestructChoices.value && activeDecisionActor.value && amount <= activeDecisionActor.value.hp);
}

function confirmSelfDestructAmount(amount: number): void {
  if (!canChooseSelfDestructAmount(amount) || rollRequestLocked.value) return;
  confirmDecision("character_skill", undefined, amount);
}

function isBossRewardType(type: string): boolean {
  return type === "berserker_blood" || type === "vampire_instinct" || type === "dragon_courage";
}

function isGrowthRewardType(type: string): boolean {
  return type === "starter_heavy_punch" || type === "starter_blood_punch" || type === "starter_iron_wall" || type === "starter_recovery" || type === "heavy_punch_training" || type === "iron_body" || type === "breathing_recovery" || type === "blood_punch" || type === "battle_instinct" || type === "guard_training";
}

function isRogueliteSkillRewardType(type: string): boolean {
  return type === "gunner_triple_shot" || type === "vampire_skill" || type === "zhaoyun_pierce" || type === "flame_lord_mark";
}

function isSummonerSkillId(value: unknown): value is SummonerSkillId {
  return value === "lucky_plus_one" || value === "first_aid" || value === "iron_wall" || value === "fate_reroll" || value === "last_stand";
}

function sendEmote(emoteId: EmoteId): void {
  if (emoteLocked.value) return;
  lockEmote();
  socket.emit("sendEmote", { emoteId });
}

function emoteFor(player: Player): VisibleEmote | undefined {
  return lookupEmote(player.id, player.controllerId);
}

function controllerNickname(player: Player): string {
  if (player.slotIndex === undefined) return player.nickname;
  const suffix = ` 角色${player.slotIndex + 1}`;
  return player.nickname.endsWith(suffix) ? player.nickname.slice(0, -suffix.length) : player.nickname;
}

function readyForRematch(): void {
  if (room.value.phase !== "gameOver" || isRematchReady.value) return;
  socket.emit("readyForRematch", {});
}

function chooseRogueliteReward(reward: RogueliteReward): void {
  if (!isRogueliteMode.value || room.value.phase !== "reward") return;
  socket.emit("chooseRogueliteReward", { rewardId: reward.id });
}

function onChooseRogueliteReward(rewardId: string): void {
  const reward = rogueliteRewardChoices.value.find((r) => r.id === rewardId);
  if (reward) chooseRogueliteReward(reward);
}

function chooseRogueliteContinue(choice: "finish" | "continue"): void {
  if (!isRogueliteMode.value || room.value.phase !== "roguelite_continue") return;
  socket.emit("chooseRogueliteContinue", { choice });
}

/** Kick off the roll animation, then delegate reveal to composable callback. */
function startRollAnimation(mode: RollMode, _shouldEmit: boolean): void {
  // Reset game-side effects before starting animation
  activeEffectRollId.value = undefined;
  activeFloatingEffects.value = [];
  activeSkillHints.value = [];
  clearSkillHintTimer();

  startAnimation(mode, () => {
    // Called by composable at reveal time (~680 ms)
    revealServerRoll();
  });
}

/** Apply the server's roll result to displayedRoom and related state. */
function revealServerRoll(): void {
  const revealRoom = pendingRoom.value ?? cloneRoomForDisplay(props.room);
  if (rollMode.value === "guard") {
    const revealGuardCheckId = pendingRevealGuardCheckId.value ?? getLatestGuardCheck(revealRoom)?.id;
    if (!revealGuardCheckId || revealGuardCheckId === visibleGuardCheckId.value) return;

    displayedRoom.value = revealRoom;
    visibleGuardCheckId.value = revealGuardCheckId;
    pendingRoom.value = null;
    pendingRevealGuardCheckId.value = undefined;
    rollRequestLocked.value = false;
    reveal();
    finishReveal();
    return;
  }

  const revealRollId = pendingRevealRollId.value ?? getLatestRoll(revealRoom)?.id;
  if (!revealRollId || revealRollId === visibleRollId.value) return;

  displayedRoom.value = revealRoom;
  visibleRollId.value = revealRollId;
  startEffectWindow(revealRollId);
  showSkillHints(revealRoom.skillHints, revealRollId);
  showHighlight(revealRoom.highlight);
  pendingRoom.value = null;
  pendingRevealRollId.value = undefined;
  rollRequestLocked.value = false;
  reveal();
  finishReveal();
}

function showPlayerEmote(event: PlayerEmoteEvent): void {
  const emoji = EMOTE_OPTIONS.find((e) => e.id === event.emoteId)?.emoji ?? "";
  showEmote(event, emoji);
}

function clearEmoteTimers(): void {
  clearEmotes();
}

function showHighlight(highlight: CharacterHighlight | undefined): void {
  if (!highlight || playedHighlightKeys.has(highlight.id)) return;
  playedHighlightKeys.add(highlight.id);
  activeHighlight.value = highlight;
  window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(() => {
    if (activeHighlight.value?.id === highlight.id) activeHighlight.value = null;
    highlightTimer = undefined;
  }, HIGHLIGHT_DISPLAY_MS);
}

function clearHighlightTimer(): void {
  window.clearTimeout(highlightTimer);
}

function showSkillHints(hints: SkillHint[] | undefined, rollId: string): void {
  const nextHints = (hints ?? []).filter((hint) => hint.rollId === rollId && !playedSkillHintIds.has(hint.id));
  if (nextHints.length === 0) return;

  for (const hint of nextHints) playedSkillHintIds.add(hint.id);
  activeSkillHints.value = nextHints;
  window.clearTimeout(skillHintTimer);
  skillHintTimer = window.setTimeout(() => {
    if (activeSkillHints.value.some((hint) => nextHints.some((nextHint) => nextHint.id === hint.id))) {
      activeSkillHints.value = [];
    }
    skillHintTimer = undefined;
  }, SKILL_HINT_DISPLAY_MS);
}

function clearSkillHintTimer(): void {
  window.clearTimeout(skillHintTimer);
}

function getLatestRoll(targetRoom: Room): GameEvent | undefined {
  return targetRoom.battleLog.find((event) => event.type === "roll");
}

function getLatestGuardCheck(targetRoom: Room): GameEvent | undefined {
  return targetRoom.battleLog.find((event) => event.type === "guardCheck");
}

function startEffectWindow(rollId: string): void {
  if (animatedRollIds.has(rollId)) return;
  const effects = collectFloatingEffects(rollId);
  if (effects.length === 0) return;
  animatedRollIds.add(rollId);
  activeFloatingEffects.value = effects;
  activeEffectRollId.value = rollId;
  effectTimers.push(window.setTimeout(() => {
    if (activeEffectRollId.value === rollId) {
      activeEffectRollId.value = undefined;
      activeFloatingEffects.value = [];
    }
  }, 620));
}

function collectFloatingEffects(rollId: string): FloatingEffect[] {
  const firstRollIndex = displayedRoom.value.battleLog.findIndex((event) => event.id === rollId);
  if (firstRollIndex < 0) return [];

  const nextRollIndex = displayedRoom.value.battleLog.findIndex((event, index) => index > firstRollIndex && event.type === "roll");
  const actionEvents = displayedRoom.value.battleLog.slice(firstRollIndex, nextRollIndex < 0 ? undefined : nextRollIndex);
  const effects: FloatingEffect[] = [];

  for (const event of actionEvents) {
    if (event.type === "damage" && event.targetId) {
      const value = event.damage ?? 0;
      effects.push({
        rollId,
        type: value > 0 ? "damage" : "noEffect",
        playerId: event.targetId,
        value,
        key: `${rollId}-${event.id}-${value > 0 ? "damage" : "noEffect"}`
      });
    }

    if (event.type === "heal" && event.playerId && (event.healing ?? 0) > 0) {
      const value = event.healing ?? 0;
      effects.push({
        rollId,
        type: "heal",
        playerId: event.playerId,
        value,
        key: `${rollId}-${event.id}-heal`
      });
    }
  }

  return effects;
}

function cloneRoomForDisplay(targetRoom: Room): Room {
  const nextRoom = JSON.parse(JSON.stringify(targetRoom)) as Room;
  nextRoom.battleLog = nextRoom.battleLog.slice(0, MAX_RENDERED_LOG);
  nextRoom.snapshots = [];
  return nextRoom;
}
</script>

<template>
  <section class="battle-layout">
    <section class="battle-tools">
      <button class="ghost-btn small-btn" type="button" @click="showRuleGuide = true">规则 / 职业说明</button>
      <button class="ghost-btn small-btn battle-log-trigger" type="button" @click="showBattleLog = !showBattleLog">战斗日志</button>
    </section>

    <RoguelitePanel
      :data="roguelitePanelVM"
      @choose-reward="onChooseRogueliteReward"
      @choose-continue="chooseRogueliteContinue"
    />

    <section v-if="isDuoMode" class="battle-zone duo-battle-zone">
      <div class="zone-heading">
        <strong>2V2 双角色模式</strong>
        <span>{{ selectedActor ? `当前行动角色：${selectedActor.nickname}` : isMyDuoControllerTurn ? "请选择你的一个角色行动" : "等待对方选择行动角色" }}</span>
      </div>
            <div class="duo-battle-board" aria-label="2V2 阵营战场">
        <article v-for="team in duoTeams" :key="team.id" class="duo-team-column" :class="`team-${team.id.toLowerCase()}`">
          <header>
            <strong>{{ team.label }}</strong>
            <span>{{ team.players[0]?.controllerId === props.playerId ? "你的队伍" : "对方队伍" }}</span>
          </header>
          <CombatBoard
            :seats="duoTeamSeats[team.id] ?? []"
            inline-class="duo-combat-board"
            @seat-click="handleSeatClick"
            @info-click="openPlayerDetailById"
          />
        </article>
      </div>
    </section>

    <section v-if="isDuoMode" class="action-center duo-action-center">
      <div class="action-phase">
        <span>当前阶段</span>
        <strong v-if="pendingGuardCheck && isGuardCheckMine">架盾判定</strong>
        <strong v-else-if="pendingGuardCheck">对方正在进行架盾判定</strong>
        <strong v-else-if="selectedActor && !selectedActor.selectedTargetId">已选角色：{{ selectedActor.nickname }}，请选择攻击目标</strong>
        <strong v-else-if="selectedActor && selectedActor.selectedTargetId">已选目标，可以投骰</strong>
        <strong v-else-if="isMyDuoControllerTurn">请选择你的一个角色行动</strong>
        <strong v-else>等待对方选择行动角色</strong>
        <small v-if="pendingGuardCheck && isGuardCheckMine">1-4 架盾继续，5-6 架盾结束。</small>
        <small v-else-if="pendingGuardCheck">等待判定完成。</small>
        <small v-else-if="isMyDuoControllerTurn && !selectedActor">只能选择自己队伍中存活的角色。</small>
        <small v-else-if="selectedActor && !selectedActor.selectedTargetId">点击敌方角色头像选择目标。</small>
        <small v-else-if="selectedActor && selectedActor.selectedTargetId">点击投骰按钮进行骰子投掷。</small>
      </div>
      <DicePanel
        v-bind="dicePanelCommon"
        :is-ready="isMyDuoControllerTurn"
        :can-roll="pendingGuardCheck ? canRollGuardCheck : canRollForDuo"
        @roll="rollMainDice"
      >
        <template #action-slots>
          <ActionSlots
            v-bind="actionSlotsCommon"
            @select-action="onSelectAction"
            @select-self-destruct="onSelectSelfDestruct"
          />
        </template>
      </DicePanel>
    </section>

    <section v-if="!isDuoMode" class="battle-zone">
      <div class="zone-heading">
        <strong>其他玩家</strong>
        <span>点击头像选择攻击目标</span>
      </div>
      <CombatBoard
        :seats="classicSeats"
        @seat-click="handleSeatClick"
        @info-click="openPlayerDetailById"
      />
    </section>

    <section v-if="!isDuoMode" class="action-center" :class="`turn-guide-${turnGuideTone}`">
      <div class="action-phase">
        <span>当前阶段</span>
        <strong>{{ currentActionTitle }}</strong>
        <small v-for="line in currentActionLines" :key="line">{{ line }}</small>
      </div>

      <DicePanel
        v-bind="dicePanelCommon"
        :is-ready="isMyTurn"
        :can-roll="pendingGuardCheck ? canRollGuardCheck : canRoll"
        @roll="rollMainDice"
      >
        <template #action-slots>
          <ActionSlots
            v-bind="actionSlotsCommon"
            @select-action="onSelectAction"
            @select-self-destruct="onSelectSelfDestruct"
          />
        </template>
      </DicePanel>
    </section>

    <SelfPanel v-if="!isDuoMode && selfPanelVM" :data="selfPanelVM" @show-detail="openPlayerDetail(me!)" />

    <EmotePanel :locked="emoteLocked" @send-emote="sendEmote" />

    <section v-if="room.phase === 'gameOver'" class="log-panel rematch-panel">
      <p class="winner">{{ winnerText }}</p>
      <button class="primary-btn" type="button" :disabled="isRematchReady" @click="readyForRematch">
        {{ isRematchReady ? "已准备" : "准备再来一局" }}
      </button>
      <p class="hint">{{ isAllRematchReady ? "即将返回选职业阶段" : `等待其他玩家准备（${rematchReadyCount}/${rematchParticipants.length}）` }}</p>
      <div class="player-list">
        <article v-for="(participant, index) in rematchParticipants" :key="`rematch-${participant.id}`" class="player-card">
          <strong>{{ index + 1 }}号 {{ participant.nickname }}</strong>
          <span class="badge" :class="{ 'host-badge': participant.isHost }">
            {{ rematchReadyIds.includes(participant.id) ? "已准备" : "未准备" }}
          </span>
        </article>
      </div>
    </section>

    <div v-if="activeHighlight" :key="activeHighlight.id" class="character-highlight-overlay" :class="`highlight-${activeHighlight.type}`">
      <div class="character-highlight-card">
        <strong>{{ activeHighlight.title }}</strong>
        <span v-if="activeHighlight.valueText">{{ activeHighlight.valueText }}</span>
      </div>
    </div>

    <PlayerDetailDialog
      v-if="detailPlayer"
      :player="detailPlayer"
      :characters="characters"
      :player-avatar-emoji="playerAvatar(detailPlayer).emoji"
      :last-roll-text="lastRollText(detailPlayer)"
      @close="closePlayerDetail"
    />

    <RuleGuideDialog v-if="showRuleGuide" :characters="characters" @close="showRuleGuide = false" />

    <BattleLogDrawer
      :visible="showBattleLog"
      :log="room.battleLog"
      :newest-event-id="lastEvent?.id ?? ''"
      @close="showBattleLog = false"
    />

    <transition name="alert-pop">
      <div v-if="rogueliteAlert" :key="rogueliteAlert.key" class="roguelite-alert-overlay">
        <span>{{ rogueliteAlert.text }}</span>
      </div>
    </transition>
  </section>
</template>

