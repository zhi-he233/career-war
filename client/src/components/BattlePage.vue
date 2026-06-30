<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { Character, CharacterHighlight, EmoteId, GameEvent, Player, PlayerEmoteEvent, RogueliteEventChoiceId, RogueliteMapNodeSelection, RogueliteReward, RollActionType, RollDecisionAvailableAction, RollDecisionChoice, Room, SkillHint, SummonerSkillId } from "@career-war/shared";
import { socket } from "../socket";
import { getCharacterArt } from "../assets/art/characters";
import { useDiceAnimation } from "../composables/useDiceAnimation";
import type { RollMode } from "../composables/useDiceAnimation";
import { useEmote } from "../composables/useEmote";
import { useRogueliteTutorial } from "../tutorial/useRogueliteTutorial";
import { useRogueliteViewModels } from "./battle/composables/useRogueliteViewModels";
import { useBattleUiState } from "./battle/composables/useBattleUiState";
import { useBattlePlayerHelpers } from "./battle/composables/useBattlePlayerHelpers";
import { useBattleTexts } from "./battle/composables/useBattleTexts";
import FocusHint from "./tutorial/FocusHint.vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import EmotePanel from "./battle/EmotePanel.vue";
import BattleLogDrawer from "./battle/BattleLogDrawer.vue";
import PlayerDetailDialog from "./battle/PlayerDetailDialog.vue";
import CombatBoard from "./battle/CombatBoard.vue";
import DicePanel from "./battle/DicePanel.vue";
import ActionSlots from "./battle/ActionSlots.vue";
import SelfPanel from "./battle/SelfPanel.vue";
import RoguelitePanel from "./battle/RoguelitePanel.vue";
import RogueliteEventChoice from "./battle/RogueliteEventChoice.vue";
import RogueliteRewardChoice from "./battle/RogueliteRewardChoice.vue";
import RogueliteStatusCompact from "./battle/RogueliteStatusCompact.vue";
import RogueliteRunMap from "./battle/RogueliteRunMap.vue";
import type { SeatViewModel, DicePanelProps, ActionSlotVM, SelfDestructOption, SelfPanelVM } from "./battle/types";

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
type SkillToast = {
  key: string;
  actorName: string;
  skillName: string;
  effect: string;
};
type EmoteOption = {
  id: EmoteId;
  label: string;
  emoji: string;
};
type VisibleEmote = { key: string; emoji: string };

const MAX_RENDERED_LOG = 50;
const HIGHLIGHT_DISPLAY_MS = 2200;
const SKILL_HINT_DISPLAY_MS = 1300;
const SKILL_TOAST_DISPLAY_MS = 1800;
const EMOTE_OPTIONS: EmoteOption[] = [
  { id: "cry", label: "大哭", emoji: "😭" },
  { id: "surprise", label: "惊讶", emoji: "😮" },
  { id: "taunt", label: "嘲讽", emoji: "😏" },
  { id: "angry", label: "愤怒", emoji: "😡" },
  { id: "like", label: "点赞", emoji: "👍" },
  { id: "question", label: "疑惑", emoji: "❓" }
];
const displayedRoom = ref<Room>(cloneRoomForDisplay(props.room));
const pendingRoom = ref<Room | null>(null);
const room = computed(() => displayedRoom.value);

const { rollPhase, rollMode, rollingDice, isRolling, startAnimation, reveal, finishReveal, clearAllTimers } = useDiceAnimation();
const { locked: emoteLocked, lock: lockEmote, showEmote, getEmote: lookupEmote, clearAll: clearEmotes } = useEmote();
const {
  currentStep: rogueliteTutorialStep,
  isActive: isRogueliteTutorialActive,
  startIfNeeded: startRogueliteTutorialIfNeeded,
  advanceTo: advanceRogueliteTutorialTo,
  complete: completeRogueliteTutorial,
} = useRogueliteTutorial();

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
const skillToast = ref<SkillToast | null>(null);
const rogueliteAlert = ref<{ text: string; key: string } | null>(null);
const tutorialCompleteVisible = ref(false);
let rogueliteAlertTimer: number | undefined;
let skillToastTimer: number | undefined;
let tutorialCompleteTimer: number | undefined;

// ── Roguelite map gate: show map before each new stage ──
const rogueliteMapGateVisible = ref(false);
const lastMapStageShown = ref<number | null>(null);

const {
  showRuleGuide,
  showBattleLog,
  showRogueliteDetails,
  detailPlayerId,
  detailPlayer,
  openPlayerDetail,
  openPlayerDetailById,
  closePlayerDetail,
  toggleBattleLog,
  closeBattleLog,
  openRuleGuide,
  closeRuleGuide,
  openRogueliteDetails,
  closeRogueliteDetails,
} = useBattleUiState(room);
const selectedActionSlot = ref<RollActionType | null>(null);
let highlightTimer: number | undefined;
let skillHintTimer: number | undefined;
const playedHighlightKeys = new Set<string>();
const playedSkillHintIds = new Set<string>();
const playedSkillToastIds = new Set<string>();

const activePlayer = computed(() => room.value.players[room.value.activePlayerIndex]);
const isDuoMode = computed(() => room.value.gameMode === "duo_2v2");
const isPveMode = computed(() => room.value.gameMode === "pve_1v1");
const isRogueliteMode = computed(() => room.value.gameMode === "pve_roguelite");
const showRogueliteMap = computed(() =>
  isRogueliteMode.value &&
  (rogueliteMapGateVisible.value ||
   room.value.phase === "roguelite_continue" ||
   room.value.phase === "roguelite_shop" ||
   room.value.phase === "roguelite_rest")
);
const isSinglePlayerPveMode = computed(() => isPveMode.value || isRogueliteMode.value);
const isBotTurn = computed(() => isSinglePlayerPveMode.value && Boolean(activePlayer.value?.isBot) && room.value.phase === "battle");
const isBossStage = computed(() => room.value.phase === "battle" && rogueliteEnemyInfo.value?.stageType === "boss");
const isRogueliteSuccess = computed(() => isRogueliteMode.value && room.value.phase === "gameOver" && room.value.winnerId === props.playerId);
const pendingRogueliteEvent = computed(() => room.value.roguelite?.pendingEvent);

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
    isSelectable: canSelectTarget(player) && !shouldShowSelectedTarget(player),
    isSelected: shouldShowSelectedTarget(player),
    isHit: isRecentDamageTarget(player),
    isHealed: isRecentHealTarget(player),
    isBlocked: isNoDamageTarget(player),
    avatarEmoji: playerFallbackMark(player),
    avatarSrc: getCharacterArt(player.characterId)?.avatar,
    spriteSrc: getCharacterArt(player.characterId)?.sprite,
    statusText: playerStatus(player),
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.shield,
    lastRollText: lastRollText(player) || (zhaoZilongHitText(player) || ""),
    characterName: displayCharacterName(player),
    seatTags: buildSeatTags(player),
    attackableLabel: "可攻击",
    targetLabel: "目标",
    isHost: player.id === room.value.hostId,
    isSelf: false,
    hasInvincible: hasInvincible(player),
    damageEffect: seatDamageEffect(player),
    healEffect: seatHealEffect(player),
    noEffect: seatNoEffect(player),
    emote: seatEmote(player)
  }))
);

/** Stage seats for roguelite mode: self (ally) on left, enemy on right. */
const rogueliteStageSeats = computed<SeatViewModel[]>(() => {
  if (!isRogueliteMode.value) return [];
  const seats: SeatViewModel[] = [];

  // Ally seat (self, left side)
  if (me.value) {
    seats.push({
      playerId: me.value.id,
      playerNumber: 0,
      nickname: me.value.nickname,
      isDead: me.value.isDead,
      isActive: me.value.id === activePlayer.value?.id,
      isSelectable: false,
      isSelected: false,
      isHit: isRecentDamageTarget(me.value),
      isHealed: isRecentHealTarget(me.value),
      isBlocked: isNoDamageTarget(me.value),
      avatarEmoji: playerFallbackMark(me.value),
      avatarSrc: getCharacterArt(me.value.characterId)?.avatar,
      spriteSrc: getCharacterArt(me.value.characterId)?.sprite,
      statusText: playerStatus(me.value),
      hp: me.value.hp,
      maxHp: me.value.maxHp,
      shield: me.value.shield,
      lastRollText: lastRollText(me.value) || (zhaoZilongHitText(me.value) || ""),
      characterName: displayCharacterName(me.value),
      seatTags: statusBadges(me.value),
      attackableLabel: "",
      targetLabel: "",
      isHost: false,
      isSelf: true,
      hasInvincible: hasInvincible(me.value),
      damageEffect: seatDamageEffect(me.value),
      healEffect: seatHealEffect(me.value),
      noEffect: seatNoEffect(me.value),
      emote: seatEmote(me.value),
    });
  }

  // Enemy seats (right side)
  for (const player of battlePlayers.value) {
    seats.push({
      playerId: player.id,
      playerNumber: playerNumber(player),
      nickname: player.nickname,
      isDead: player.isDead,
      isActive: false,
      isSelectable: canSelectTarget(player) && !shouldShowSelectedTarget(player),
      isSelected: shouldShowSelectedTarget(player),
      isHit: isRecentDamageTarget(player),
      isHealed: isRecentHealTarget(player),
      isBlocked: isNoDamageTarget(player),
      avatarEmoji: playerFallbackMark(player),
      avatarSrc: getCharacterArt(player.characterId)?.avatar,
      spriteSrc: getCharacterArt(player.characterId)?.sprite,
      statusText: playerStatus(player),
      hp: player.hp,
      maxHp: player.maxHp,
      shield: player.shield,
      lastRollText: lastRollText(player) || (zhaoZilongHitText(player) || ""),
      characterName: displayCharacterName(player),
      seatTags: statusBadges(player),
      attackableLabel: "可攻击",
      targetLabel: "目标",
      isHost: player.id === room.value.hostId,
      isSelf: false,
      hasInvincible: hasInvincible(player),
      damageEffect: seatDamageEffect(player),
      healEffect: seatHealEffect(player),
      noEffect: seatNoEffect(player),
      emote: seatEmote(player),
    });
  }

  return seats;
});

/** Pre-computed seat data for each duo team column. */
const duoTeamSeats = computed<Record<string, SeatViewModel[]>>(() => {
  const result: Record<string, SeatViewModel[]> = {};
  for (const team of duoTeams.value) {
    result[team.id] = team.players.map((player) => {
      const canActor = canSelectDuoActor(player);
      const canEnemy = canSelectDuoEnemy(player);
      const actorSelected = selectedActor.value?.id === player.id && isMyDuoControllerTurn.value && !pendingRoll.value && !pendingRollDecision.value && !pendingGuardCheck.value;
      const targetSelected = shouldShowSelectedTarget(player);
      return {
        playerId: player.id,
        playerNumber: 0,
        nickname: player.nickname,
        isDead: player.isDead,
        isActive: player.controllerId === activeControllerId.value,
        isSelectable: canActor || (canEnemy && !targetSelected),
        isSelected: actorSelected || targetSelected,
        isHit: isRecentDamageTarget(player),
        isHealed: isRecentHealTarget(player),
        isBlocked: isNoDamageTarget(player),
        avatarEmoji: playerFallbackMark(player),
        avatarSrc: getCharacterArt(player.characterId)?.avatar,
        spriteSrc: getCharacterArt(player.characterId)?.sprite,
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
        isSelf: player.controllerId === props.playerId || player.id === props.playerId,
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
  const directEmote = lookupEmote(player.id);
  if (directEmote) return { key: directEmote.key, emoji: directEmote.emoji };

  if (isDuoMode.value && player.controllerId) {
    const controllerEmote = lookupEmote(player.controllerId);
    const targetId = duoEmoteTargetId(player.controllerId);
    return controllerEmote && targetId === player.id ? { key: controllerEmote.key, emoji: controllerEmote.emoji } : undefined;
  }

  const e = lookupEmote(player.id, player.controllerId);
  return e ? { key: e.key, emoji: e.emoji } : undefined;
}

function duoEmoteTargetId(controllerId: string): string | undefined {
  if (selectedActor.value?.controllerId === controllerId) return selectedActor.value.id;
  const guardActorId = room.value.pendingGuardCheck?.actorId;
  const guardActor = guardActorId ? room.value.players.find((player) => player.id === guardActorId) : undefined;
  if (guardActor?.controllerId === controllerId) return guardActor.id;

  const controlledUnits = room.value.players
    .filter((player) => player.controllerId === controllerId || player.id === controllerId)
    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
  return controlledUnits.find((player) => !player.isDead)?.id ?? controlledUnits[0]?.id;
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
    avatarEmoji: playerFallbackMark(me.value),
    avatarSrc: getCharacterArt(me.value.characterId)?.avatar,
    spriteSrc: getCharacterArt(me.value.characterId)?.sprite,
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

const {
  roguelitePanelVM,
  isBossRewardPhase,
  rogueliteRewardChoices,
  rogueliteEnemyInfo,
  showRogueliteRewardCenterPrompt,
  showRogueliteCompactStatus,
  rogueliteEnemyTypeLabel,
  getRogueliteAlertText,
} = useRogueliteViewModels(room, me, props.playerId);

const {
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
} = useBattlePlayerHelpers({
  room,
  characters: props.characters,
  isDuoMode,
  isRogueliteMode,
  rogueliteEnemyTypeLabel,
  activePlayer,
  pendingRoll: computed(() => room.value.pendingRoll),
  pendingRollDecision: computed(() => room.value.pendingRollDecision),
});

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
const showMapNodeTutorial = computed(() => isRogueliteTutorialActive.value && rogueliteTutorialStep.value === "map-node" && showRogueliteMap.value);
const showRollDiceTutorial = computed(() => isRogueliteTutorialActive.value && rogueliteTutorialStep.value === "roll-dice" && isRogueliteMode.value && !showRogueliteMap.value && canRoll.value);
const showChooseRewardTutorial = computed(() => isRogueliteTutorialActive.value && rogueliteTutorialStep.value === "choose-reward" && isRogueliteMode.value && showRogueliteRewardCenterPrompt.value);
const activeDecisionActor = computed(() => {
  const decision = pendingRollDecision.value;
  if (!decision) return undefined;
  return room.value.players.find((player) => player.id === decision.actorId);
});
const selfDestructSlot = computed(() => actionSlots.value.find((slot) => slot.requiresSelfDamageAmount));
const shouldShowSelfDestructChoices = computed(() => Boolean(canUseActionSlots.value && selfDestructSlot.value?.enabled && activeDecisionActor.value?.characterId === "self_destructor"));
const selfDestructAmounts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

onMounted(() => {
  document.body.classList.add("battle-locked");
});

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
      showSkillHints(displayedRoom.value.skillHints, nextRollId);
      showHighlight(displayedRoom.value.highlight);
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
    if (visibleRollId.value) {
      startEffectWindow(visibleRollId.value);
      showSkillHints(displayedRoom.value.skillHints, visibleRollId.value);
      showHighlight(displayedRoom.value.highlight);
    }
  },
  { deep: false }
);

// ── Roguelite map gate: open when entering a new stage in battle phase ──
watch(
  () => {
    const s = props.room.roguelite?.stage;
    const p = props.room.phase;
    return { stage: s ?? 0, phase: p };
  },
  ({ stage, phase }) => {
    if (!isRogueliteMode.value) return;
    // Never gate during reward or gameOver
    if (phase === "reward" || phase === "gameOver") return;
    // Open gate when entering battle phase with a new stage we haven't accepted yet
    if (phase === "battle" && stage > 0 && lastMapStageShown.value !== stage) {
      rogueliteMapGateVisible.value = true;
    }
  },
  { immediate: true }
);

watch(
  () => props.lastEmote,
  (event) => {
    if (!event || event.roomId !== room.value.id) return;
    showPlayerEmote(event);
  }
);

onUnmounted(() => {
  document.body.classList.remove("battle-locked");
  clearAllTimers();
  while (effectTimers.length) window.clearTimeout(effectTimers.pop());
  clearEmoteTimers();
  clearHighlightTimer();
  clearSkillHintTimer();
  clearSkillToastTimer();
  window.clearTimeout(rogueliteAlertTimer);
  window.clearTimeout(tutorialCompleteTimer);
  rogueliteMapGateVisible.value = false;
  lastMapStageShown.value = null;
});

// Reset roguelite map gate when leaving roguelite mode
watch(isRogueliteMode, (val) => {
  if (!val) {
    rogueliteMapGateVisible.value = false;
    lastMapStageShown.value = null;
  }
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

watch(showRogueliteMap, (visible) => {
  if (visible && isRogueliteMode.value) {
    startRogueliteTutorialIfNeeded();
  }
}, { immediate: true });

watch(
  () => [isRogueliteMode.value, room.value.phase, rogueliteRewardChoices.value.length] as const,
  ([enabled, phase, rewardCount]) => {
    if (enabled && phase === "reward" && rewardCount > 0 && rogueliteTutorialStep.value !== null) {
      advanceRogueliteTutorialTo("choose-reward");
    }
  }
);

watch(
  () => props.lastEvent,
  (event) => {
    if (!event || event.type !== "skill" || playedSkillToastIds.has(event.id)) return;
    const toast = createSkillToast(event);
    if (!toast) return;
    playedSkillToastIds.add(event.id);
    skillToast.value = toast;
    clearSkillToastTimer();
    skillToastTimer = window.setTimeout(() => {
      skillToast.value = null;
      skillToastTimer = undefined;
    }, SKILL_TOAST_DISPLAY_MS);
  }
);

function clearSkillToastTimer(): void {
  if (skillToastTimer) {
    window.clearTimeout(skillToastTimer);
    skillToastTimer = undefined;
  }
}

function createSkillToast(event: GameEvent): SkillToast | null {
  if (!event.playerId) return null;
  const actor = room.value.players.find((player) => player.id === event.playerId);
  const actorName = actor?.rogueliteEnemyInfo?.displayName || actor?.nickname || "角色";
  const skillName = inferSkillToastName(event.message, actor);
  const effect = normalizeSkillToastEffect(event.message, actorName, skillName);
  return {
    key: event.id,
    actorName,
    skillName,
    effect
  };
}

function inferSkillToastName(message: string, actor: Player | undefined): string {
  const marker = "技能发动：";
  const markerIndex = message.indexOf(marker);
  if (markerIndex >= 0) {
    const rest = message.slice(markerIndex + marker.length).trim();
    const end = rest.search(/[！!，,。:：]/);
    return (end >= 0 ? rest.slice(0, end) : rest).trim() || "技能";
  }
  if (message.includes("三倍射击")) return "三倍射击";
  if (message.includes("火焰爆发") || message.includes("爆发") && message.includes("火焰印记")) return "火焰爆发";
  if (message.includes("火焰印记")) return "火焰印记";
  if (message.includes("处决") || message.includes("斩杀")) return "处决";
  if (message.includes("破阵")) return "破阵";
  if (message.includes("架盾")) return "架盾";
  if (actor?.characterId === "fire_lord") return "火焰印记";
  return "技能";
}

function normalizeSkillToastEffect(message: string, actorName: string, skillName: string): string {
  let effect = message.replace(/\s+/g, " ").trim();
  if (effect.startsWith(actorName)) effect = effect.slice(actorName.length).trim();
  const escapedSkillName = skillName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  effect = effect.replace(/^使用\s*/, "").replace(new RegExp(`^${escapedSkillName}[：:，,\\s]*`), "").trim();
  return effect || message;
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
const {
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
} = useBattleTexts({
  room,
  playerId: props.playerId,
  isDuoMode,
  isPveMode,
  isRogueliteMode,
  activePlayer,
  isSelfDead,
  isRolling,
  isPendingMine,
  isDecisionMine,
  isGuardCheckMine,
  pendingRoll,
  pendingRollDecision,
  pendingGuardCheck,
  guardCheckActor,
  visibleRoll,
  visibleGuardCheckEvent,
  displayedGuardDice,
  currentDiceMode,
  selectedTargetText,
  actionStageText,
});

/** Cute wait hint for roguelite idle/thinking states — UI-only, no game logic. */
const rogueliteWaitHint = computed(() => {
  if (isBotTurn.value) return "训练拳手正在憋坏招...";
  if (isRolling.value) return "命运在旋转...";
  if (pendingGuardCheck.value && !isGuardCheckMine.value) return "对手正在检查护甲...";
  if (pendingRollDecision.value && !isDecisionMine.value) return "对手正在琢磨用什么招...";
  if (room.value.phase === "reward") return "挑个奖励，继续变强！";
  if (room.value.phase === "roguelite_continue") return "见好就收，还是继续闯？";
  if (room.value.phase === "gameOver") return "";
  if (me.value?.isDead) return "躺平观战中，等待下一局...";
  if (!isMyTurn.value) return "对手正在思考战术...";
  if (!selectedTargetId.value) return "先挑一个想揍的家伙";
  if (pendingRoll.value && isPendingMine.value) return "技能触发！再投一次...";
  if (pendingRollDecision.value) return "选个行动卡，给对手好看！";
  return "骰子已经在手里发抖了";
});

const rogueliteWaitIconClass = computed(() => {
  if (isRolling.value) return "cw-icon-dice";
  if (pendingGuardCheck.value) return "cw-icon-shield";
  if (isBotTurn.value) return "cw-icon-rune";
  if (isMyTurn.value) return "cw-icon-swords";
  return "cw-icon-rune";
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

const isActionPanelActive = computed(() => {
  if (room.value.phase !== "battle") return false;
  if (isSelfDead.value || isBotTurn.value) return false;
  if (pendingGuardCheck.value) return isGuardCheckMine.value;
  if (pendingRollDecision.value) return isDecisionMine.value;
  if (pendingRoll.value) return isPendingMine.value;
  return isDuoMode.value ? isMyDuoControllerTurn.value : isMyTurn.value;
});

const compactActionTitle = computed(() => {
  if (room.value.phase === "reward") return isBossRewardPhase.value ? "选择 Boss 能力" : "选择奖励";
  if (room.value.phase === "roguelite_continue") return "挑战继续";
  if (room.value.phase === "gameOver") return winnerText.value;
  if (isBotTurn.value) return "AI 行动中";
  if (pendingGuardCheck.value) return `等待 ${guardCheckActor.value?.nickname ?? "山盾"} 架盾`;
  if (pendingRollDecision.value) return `等待 ${activePlayer.value?.nickname ?? "玩家"} 选择行动`;
  if (isDuoMode.value && activeControllerId.value && !isMyDuoControllerTurn.value) return "等待对方行动";
  if (!isDuoMode.value && activePlayer.value?.id !== props.playerId) return `等待 ${activePlayer.value?.nickname ?? "玩家"} 行动`;
  return actionStageText.value;
});

const compactDiceText = computed(() => {
  if (isRolling.value) return "骰子滚动中";
  if (pendingGuardCheck.value || currentDiceMode.value === "guard_check") return `架盾骰 ${displayedGuardDice.value}`;
  if (pendingRollDecision.value) return `骰点 ${pendingRollDecision.value.currentRoll}`;
  const dice = visibleRoll.value?.dice ?? [];
  if (dice.length > 0) return `骰点 ${dice.join("、")}`;
  return "未投骰";
});

const compactActorText = computed(() => {
  if (isDuoMode.value) {
    if (selectedActor.value) return selectedActor.value.nickname;
    const activeUnit = room.value.players.find((player) => player.controllerId === activeControllerId.value);
    return activeUnit ? controllerNickname(activeUnit) : "对方";
  }
  return activePlayer.value?.nickname ?? "玩家";
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

function canSelectTarget(player: Player): boolean {
  return isMyTurn.value && !pendingRoll.value && !pendingRollDecision.value && !pendingGuardCheck.value && player.id !== props.playerId && !player.isDead;
}

function shouldShowSelectedTarget(player: Player): boolean {
  if (selectedTargetId.value !== player.id) return false;
  if (pendingRoll.value || pendingRollDecision.value || pendingGuardCheck.value) return false;
  if (isDuoMode.value) {
    return isMyDuoActionTurn.value && Boolean(selectedActor.value) && player.teamId !== selectedActor.value?.teamId && player.controllerId !== props.playerId && !player.isDead;
  }
  return isMyTurn.value && player.id !== props.playerId && !player.isDead;
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

function isSummonerSkillId(value: unknown): value is SummonerSkillId {
  return value === "lucky_plus_one" || value === "first_aid" || value === "iron_wall" || value === "fate_reroll" || value === "last_stand";
}

function sendEmote(emoteId: EmoteId): void {
  if (emoteLocked.value) return;
  lockEmote();
  showPlayerEmote({
    roomId: room.value.id,
    playerId: isDuoMode.value ? props.playerId : me.value?.id ?? props.playerId,
    emoteId,
    createdAt: Date.now()
  });
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
  if (!reward) return;
  if (rogueliteTutorialStep.value === "choose-reward") {
    completeRogueliteTutorial();
    showTutorialCompleteToast();
  }
  chooseRogueliteReward(reward);
  closeRogueliteDetails();
}

function showTutorialCompleteToast(): void {
  tutorialCompleteVisible.value = true;
  window.clearTimeout(tutorialCompleteTimer);
  tutorialCompleteTimer = window.setTimeout(() => {
    tutorialCompleteVisible.value = false;
    tutorialCompleteTimer = undefined;
  }, 2600);
}

function chooseRogueliteEventOption(choiceId: RogueliteEventChoiceId): void {
  if (!isRogueliteMode.value || room.value.phase !== "roguelite_event") return;
  socket.emit("chooseRogueliteEventOption", { choiceId });
}

function chooseRogueliteContinue(choice: "finish" | "continue", mapNode?: RogueliteMapNodeSelection): void {
  if (!isRogueliteMode.value || room.value.phase !== "roguelite_continue") return;
  socket.emit("chooseRogueliteContinue", { choice, mapNode });
}

function handleRogueliteMapChallenge(mapNode: RogueliteMapNodeSelection): void {
  if (!isRogueliteMode.value) return;

  // Case 1: roguelite_continue phase — use existing socket flow
  if (room.value.phase === "roguelite_continue") {
    lastMapStageShown.value = room.value.roguelite?.stage ?? null;
    rogueliteMapGateVisible.value = false;
    if (rogueliteTutorialStep.value === "map-node") {
      advanceRogueliteTutorialTo("roll-dice");
    }
    chooseRogueliteContinue("continue", mapNode);
    return;
  }

  // Case 2: battle phase gate — just close the gate, no socket emit
  if (room.value.phase === "battle" && rogueliteMapGateVisible.value) {
    lastMapStageShown.value = room.value.roguelite?.stage ?? null;
    rogueliteMapGateVisible.value = false;
    if (rogueliteTutorialStep.value === "map-node") {
      advanceRogueliteTutorialTo("roll-dice");
    }
    return;
  }

  // Safety: any other case, just close the gate
  rogueliteMapGateVisible.value = false;
}

function handleRogueliteMapOpenBuild(): void {
  openRogueliteDetails();
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
  <section class="battle-page" :class="{ 'is-duo-page': isDuoMode }">
    <div class="battle-phone-shell">
      <!-- ── Roguelite Run Map (pve_roguelite only, shown during lobby & roguelite_continue) ── -->
      <RogueliteRunMap
        v-if="showRogueliteMap"
        :room="room"
        :player-id="playerId"
        :tutorial-step="showMapNodeTutorial ? rogueliteTutorialStep : null"
        @challenge="handleRogueliteMapChallenge"
        @open-build="handleRogueliteMapOpenBuild"
      />

      <section
        v-else-if="showRogueliteRewardCenterPrompt && roguelitePanelVM.rewardPhase"
        class="roguelite-reward-screen tutorial-hint-host"
      >
        <FocusHint
          v-if="showChooseRewardTutorial"
          title="选择词条"
          message="选择一个词条，本局会越来越强。"
          placement="top"
        />
        <RogueliteRewardChoice
          :rewards="roguelitePanelVM.rewardPhase.options"
          :title="roguelitePanelVM.rewardPhase.title"
          :subtitle="roguelitePanelVM.rewardPhase.hint"
          :show-close="false"
          :tutorial-active="showChooseRewardTutorial"
          @select="onChooseRogueliteReward"
        />
      </section>

      <!-- ── Normal battle layout ── -->
      <section v-else class="battle-layout battle-layout-fixed" :class="{ 'is-duo-layout': isDuoMode }">
        <section class="battle-tools">
          <button class="ghost-btn small-btn" type="button" @click="openRuleGuide">规则 / 职业说明</button>
          <button class="ghost-btn small-btn battle-log-trigger" type="button" @click="toggleBattleLog">战斗日志</button>
        </section>

        <RogueliteStatusCompact
          v-if="showRogueliteCompactStatus"
          :data="roguelitePanelVM"
          @open-details="openRogueliteDetails"
        />

        <template v-if="isDuoMode">
          <section class="duo-content-scroll-area">
            <section class="battle-zone duo-battle-zone">
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
          </section>

          <section class="battle-bottom-dock duo-bottom-dock">
            <section class="action-center duo-action-center" :class="{ 'is-compact': !isActionPanelActive, 'is-active': isActionPanelActive }">
              <div v-if="!isActionPanelActive" class="action-wait-strip">
                <span>当前阶段</span>
                <strong>{{ compactActionTitle }}</strong>
                <small>{{ compactActorText }} · {{ compactDiceText }}</small>
              </div>

              <template v-else>
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
              </template>
            </section>

            <section class="battle-bottom-bar">
              <EmotePanel :locked="emoteLocked" compact @send-emote="sendEmote" />
            </section>
          </section>
        </template>

        <!-- Roguelite stage layout: self left, enemy right -->
        <section v-if="isRogueliteMode && !isDuoMode" class="battle-zone roguelite-stage-zone">
          <CombatBoard
            :seats="rogueliteStageSeats"
            inline-class="roguelite-stage-board"
            @seat-click="handleSeatClick"
            @info-click="openPlayerDetailById"
          />
        </section>

        <!-- Classic battle zone: 1v1 / PVE (non-roguelite) -->
        <section v-else-if="!isDuoMode" class="battle-zone">
          <div class="zone-heading">
            <strong>{{ opponentPanelTitle }}</strong>
            <span>{{ opponentPanelHint }}</span>
          </div>
          <CombatBoard
            :seats="classicSeats"
            @seat-click="handleSeatClick"
            @info-click="openPlayerDetailById"
          />
        </section>

        <section v-if="!isDuoMode" class="action-center" :class="[`turn-guide-${turnGuideTone}`, { 'is-compact': !isActionPanelActive, 'is-active': isActionPanelActive, 'roguelite-action': isRogueliteMode, 'tutorial-hint-host': showRollDiceTutorial }]">
          <FocusHint
            v-if="showRollDiceTutorial"
            title="投骰"
            message="先投骰，决定本回合能做什么。"
            placement="top"
          />
          <!-- Roguelite: cute wait card instead of thin strip -->
          <div v-if="isRogueliteMode && !isActionPanelActive" class="roguelite-wait-card">
            <span class="roguelite-wait-emoji" aria-hidden="true"><span class="cw-icon" :class="rogueliteWaitIconClass"></span></span>
            <strong>{{ compactActionTitle }}</strong>
            <p>{{ rogueliteWaitHint }}</p>
            <small>{{ compactDiceText }}</small>
          </div>
          <!-- Classic: thin wait strip -->
          <div v-else-if="!isActionPanelActive" class="action-wait-strip">
            <span>当前阶段</span>
            <strong>{{ compactActionTitle }}</strong>
            <small>{{ compactActorText }} · {{ compactDiceText }}</small>
          </div>

          <template v-else>
          <div class="action-phase">
            <span>当前阶段</span>
            <strong>{{ currentActionTitle }}</strong>
            <small>{{ selectedTargetText }}</small>
          </div>

            <DicePanel
              v-bind="dicePanelCommon"
              :is-ready="isMyTurn"
              :can-roll="pendingGuardCheck ? canRollGuardCheck : canRoll"
              :tutorial-focus="showRollDiceTutorial ? 'roll' : undefined"
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
          </template>
        </section>

        <section v-if="!isDuoMode" class="battle-bottom-bar" :class="{ 'has-self-panel': !isDuoMode && selfPanelVM }">
          <SelfPanel v-if="!isDuoMode && selfPanelVM" :data="selfPanelVM" compact @show-detail="openPlayerDetail(me!)" />
          <EmotePanel :locked="emoteLocked" compact @send-emote="sendEmote" />
        </section>

        <section v-if="room.phase === 'gameOver' && !isRogueliteMode" class="log-panel rematch-panel">
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
      </section>

      <transition name="skill-toast">
        <div v-if="skillToast" :key="skillToast.key" class="skill-toast-overlay" aria-live="polite">
          <div class="skill-toast-card">
            <strong>{{ skillToast.actorName }} 使用 {{ skillToast.skillName }}</strong>
            <span>{{ skillToast.effect }}</span>
          </div>
        </div>
      </transition>

      <transition name="skill-toast">
        <div v-if="tutorialCompleteVisible" class="tutorial-complete-toast" aria-live="polite">
          <strong>基础循环已掌握</strong>
          <span>你已经学会基础循环：选路线、打敌人、拿词条。继续深入吧。</span>
        </div>
      </transition>

      <RogueliteEventChoice
        v-if="isRogueliteMode && room.phase === 'roguelite_event' && pendingRogueliteEvent"
        :event="pendingRogueliteEvent"
        @select="chooseRogueliteEventOption"
      />
    </div>

    <div
      v-if="showRogueliteDetails && roguelitePanelVM.enabled && !roguelitePanelVM.rewardPhase"
      class="roguelite-detail-backdrop"
      @click.self="closeRogueliteDetails"
    >
      <section class="roguelite-detail-drawer" aria-label="肉鸽详情">
        <header class="roguelite-detail-header">
          <div>
            <span class="eyebrow">肉鸽详情</span>
            <strong>第 {{ roguelitePanelVM.stage }} 关 · {{ roguelitePanelVM.stageTypeLabel }}</strong>
          </div>
          <button class="ghost-btn small-btn" type="button" @click="closeRogueliteDetails">关闭</button>
        </header>
        <div class="roguelite-detail-body">
          <RoguelitePanel
            :data="roguelitePanelVM"
            @choose-reward="onChooseRogueliteReward"
            @choose-continue="chooseRogueliteContinue"
          />
        </div>
      </section>
    </div>

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
      :player-avatar-emoji="playerFallbackMark(detailPlayer)"
      :player-avatar-src="getCharacterArt(detailPlayer.characterId)?.sprite ?? getCharacterArt(detailPlayer.characterId)?.avatar"
      :last-roll-text="lastRollText(detailPlayer)"
      @close="closePlayerDetail"
    />

    <RuleGuideDialog v-if="showRuleGuide" :characters="characters" @close="closeRuleGuide" />

    <BattleLogDrawer
      :visible="showBattleLog"
      :log="room.battleLog"
      :newest-event-id="lastEvent?.id ?? ''"
      @close="closeBattleLog"
    />

    <transition name="alert-pop">
      <div v-if="rogueliteAlert" :key="rogueliteAlert.key" class="roguelite-alert-overlay">
        <span>{{ rogueliteAlert.text }}</span>
      </div>
    </transition>
  </section>
</template>
