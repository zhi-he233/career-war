<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { Character, CharacterHighlight, EmoteId, GameEvent, Player, PlayerEmoteEvent, RollActionType, RollDecisionAvailableAction, RollDecisionChoice, Room, SkillHint, SummonerSkillId } from "@career-war/shared";
import { socket } from "../socket";
import RuleGuideDialog from "./RuleGuideDialog.vue";

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

type RollPhase = "idle" | "fast" | "slow" | "pause" | "reveal";
type RollMode = "normal" | "guard";
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
type VisibleEmote = PlayerEmoteEvent & {
  key: string;
  emoji: string;
};
type AvatarOption = {
  id: string;
  emoji: string;
};

const MAX_RENDERED_LOG = 50;
const EMOTE_DISPLAY_MS = 1500;
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
const rollPhase = ref<RollPhase>("idle");
const rollMode = ref<RollMode>("normal");
const rollingDice = ref(1);
const visibleRollId = ref<string | undefined>(getLatestRoll(props.room)?.id);
const visibleGuardCheckId = ref<string | undefined>(getLatestGuardCheck(props.room)?.id);
const pendingRevealRollId = ref<string | undefined>();
const pendingRevealGuardCheckId = ref<string | undefined>();
const activeEffectRollId = ref<string | undefined>();
const activeFloatingEffects = ref<FloatingEffect[]>([]);
const animatedRollIds = new Set<string>();
const rollRequestLocked = ref(false);
const activeEmotes = ref<Record<string, VisibleEmote>>({});
const activeHighlight = ref<CharacterHighlight | null>(null);
const activeSkillHints = ref<SkillHint[]>([]);
const showRuleGuide = ref(false);
const emoteLocked = ref(false);
const detailPlayerId = ref<string | null>(null);
const selectedActionSlot = ref<RollActionType | null>(null);
let rollingTimer: number | undefined;
let emoteUnlockTimer: number | undefined;
let highlightTimer: number | undefined;
let skillHintTimer: number | undefined;
const timers: number[] = [];
const emoteTimers = new Map<string, number>();
const playedHighlightKeys = new Set<string>();
const playedSkillHintIds = new Set<string>();

const activePlayer = computed(() => room.value.players[room.value.activePlayerIndex]);
const isDuoMode = computed(() => room.value.gameMode === "duo_2v2");
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
const isRolling = computed(() => rollPhase.value !== "idle" && rollPhase.value !== "reveal");
const isSelfDead = computed(() => Boolean(me.value?.isDead));
const canUseActionSlots = computed(() => Boolean(pendingRollDecision.value && isDecisionMine.value && !pendingGuardCheck.value && !isRolling.value && !rollRequestLocked.value));
const shouldShowActionSlots = computed(() => Boolean(canUseActionSlots.value && !isSelfDead.value));
const rematchReadyIds = computed(() => room.value.rematchReadyPlayerIds ?? []);
const isRematchReady = computed(() => rematchReadyIds.value.includes(props.playerId));
const rematchParticipants = computed<RematchParticipant[]>(() => {
  if (!isDuoMode.value) {
    return room.value.players.map((player) => ({
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
  if (!isDuoMode.value) return room.value.players.map((player) => player.id);
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
  if (room.value.phase === "gameOver") return "游戏结束";
  if (me.value?.isDead) return "你已死亡，等待本局结束";
  if (rollRequestLocked.value && !pendingRoom.value) return "正在结算……";
  if (isRolling.value) return "骰子滚动中……";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "架盾判定：点击投骰";
  if (pendingGuardCheck.value) return `等待 ${guardCheckActor.value?.nickname ?? "山盾"} 进行架盾判定`;
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
  clearRollTimers();
  clearEmoteTimers();
  clearHighlightTimer();
  clearSkillHintTimer();
});

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
  if (room.value.phase === "gameOver") return "游戏结束";
  if (me.value?.isDead) return "你已死亡，等待本局结束";
  if (rollRequestLocked.value && !pendingRoom.value) return "正在结算……";
  if (isRolling.value) return "骰子滚动中……";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "架盾判定：点击投骰";
  if (pendingGuardCheck.value) return `等待【${guardCheckActor.value?.nickname ?? "山盾"}】进行架盾判定`;
  if (pendingRollDecision.value && isDecisionMine.value) return "骰点已揭示：选择一个骰子行动卡槽";
  if (pendingRollDecision.value) return `等待【${activePlayer.value?.nickname ?? "玩家"}】选择骰子用途`;
  if (pendingRoll.value && isPendingMine.value) return "技能触发：请继续投骰";
  if (!isMyTurn.value) return `等待【${activePlayer.value?.nickname ?? "玩家"}】行动`;
  if (!selectedTargetId.value) return "轮到你了：点击一个头像选择攻击目标";
  return `已选择【${selectedTarget.value?.nickname ?? "目标"}】，点击投骰`;
});

const turnGuideTone = computed(() => {
  if (room.value.phase === "gameOver") return "ended";
  if (me.value?.isDead) return "dead";
  if (rollRequestLocked.value || isRolling.value) return "busy";
  if (pendingGuardCheck.value && isGuardCheckMine.value) return "mine";
  if (pendingRoll.value && isPendingMine.value) return "continue";
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

function isSummonerSkillId(value: unknown): value is SummonerSkillId {
  return value === "lucky_plus_one" || value === "first_aid" || value === "iron_wall" || value === "fate_reroll" || value === "last_stand";
}

function sendEmote(emoteId: EmoteId): void {
  if (emoteLocked.value) return;
  emoteLocked.value = true;
  socket.emit("sendEmote", { emoteId });
  window.clearTimeout(emoteUnlockTimer);
  emoteUnlockTimer = window.setTimeout(() => {
    emoteLocked.value = false;
    emoteUnlockTimer = undefined;
  }, EMOTE_DISPLAY_MS);
}

function emoteFor(player: Player): VisibleEmote | undefined {
  return activeEmotes.value[player.id] ?? (player.controllerId ? activeEmotes.value[player.controllerId] : undefined);
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

function startRollAnimation(mode: RollMode, shouldEmit: boolean): void {
  if (isRolling.value) return;
  clearRollTimers();
  rollMode.value = mode;
  activeEffectRollId.value = undefined;
  activeFloatingEffects.value = [];
  activeSkillHints.value = [];
  clearSkillHintTimer();
  rollPhase.value = "fast";
  rollingDice.value = randomDice();
  startDiceTicker(55);

  timers.push(window.setTimeout(() => {
    rollPhase.value = "slow";
    startDiceTicker(110);
  }, 240));

  timers.push(window.setTimeout(() => {
    rollPhase.value = "pause";
    window.clearInterval(rollingTimer);
    rollingTimer = undefined;
  }, 500));

  timers.push(window.setTimeout(revealServerRoll, shouldEmit ? 680 : 560));
  timers.push(window.setTimeout(revealServerRoll, 820));
  timers.push(window.setTimeout(() => {
    if (rollPhase.value !== "idle" && !pendingRoom.value) {
      rollPhase.value = "idle";
      rollMode.value = "normal";
      rollRequestLocked.value = false;
      window.clearInterval(rollingTimer);
      rollingTimer = undefined;
    }
  }, 1200));
}

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
    rollPhase.value = "reveal";
    window.clearInterval(rollingTimer);
    rollingTimer = undefined;
    timers.push(window.setTimeout(() => {
      rollPhase.value = "idle";
      visibleRollId.value = undefined;
      pendingRevealRollId.value = undefined;
      rollMode.value = "normal";
    }, 420));
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
  rollPhase.value = "reveal";
  window.clearInterval(rollingTimer);
  rollingTimer = undefined;
  timers.push(window.setTimeout(() => {
    rollPhase.value = "idle";
    rollMode.value = "normal";
  }, 220));
}

function startDiceTicker(interval: number): void {
  window.clearInterval(rollingTimer);
  rollingTimer = window.setInterval(() => {
    rollingDice.value = randomDice();
  }, interval);
}

function clearRollTimers(): void {
  window.clearInterval(rollingTimer);
  while (timers.length) window.clearTimeout(timers.pop());
  rollingTimer = undefined;
}

function showPlayerEmote(event: PlayerEmoteEvent): void {
  window.clearTimeout(emoteTimers.get(event.playerId));
  activeEmotes.value = {
    ...activeEmotes.value,
    [event.playerId]: {
      ...event,
      key: `${event.playerId}-${event.createdAt}-${event.emoteId}`,
      emoji: EMOTE_OPTIONS.find((emote) => emote.id === event.emoteId)?.emoji ?? ""
    }
  };

  const timer = window.setTimeout(() => {
    const current = activeEmotes.value[event.playerId];
    if (current?.createdAt !== event.createdAt) return;
    const nextEmotes = { ...activeEmotes.value };
    delete nextEmotes[event.playerId];
    activeEmotes.value = nextEmotes;
    emoteTimers.delete(event.playerId);
  }, EMOTE_DISPLAY_MS);
  emoteTimers.set(event.playerId, timer);
}

function clearEmoteTimers(): void {
  window.clearTimeout(emoteUnlockTimer);
  for (const timer of emoteTimers.values()) window.clearTimeout(timer);
  emoteTimers.clear();
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

function randomDice(): number {
  return Math.floor(Math.random() * 6) + 1;
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
  timers.push(window.setTimeout(() => {
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
    </section>

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
          <div class="combat-board duo-combat-board">
            <article
              v-for="player in team.players"
              :key="player.id"
              class="battle-seat duo-actor-seat"
              :class="{
                active: player.controllerId === activeControllerId,
                dead: player.isDead,
                selectable: canSelectDuoActor(player) || canSelectDuoEnemy(player),
                selected: selectedActor?.id === player.id || selectedTargetId === player.id,
                hit: isRecentDamageTarget(player),
                healed: isRecentHealTarget(player),
                blocked: isNoDamageTarget(player)
              }"
            >
              <button
                class="seat-button"
                type="button"
                :aria-pressed="selectedActor?.id === player.id || selectedTargetId === player.id"
                :aria-label="`${team.label} ${player.nickname}，${playerStatus(player)}`"
                @click="handleDuoSeatClick(player)"
              >
                <span v-if="canSelectDuoActor(player) && selectedActor?.id !== player.id" class="attackable-mark">可行动</span>
                <span v-if="canSelectDuoEnemy(player) && selectedTargetId !== player.id" class="attackable-mark">可攻击</span>
                <span v-if="selectedActor?.id === player.id" class="target-mark">行动</span>
                <span v-if="selectedTargetId === player.id" class="target-mark">目标</span>
                <span v-if="hasInvincible(player)" class="invincible-mark" aria-label="无敌">✨</span>
                <span class="avatar-ring">
                  <span class="avatar-emoji">{{ playerAvatar(player).emoji }}</span>
                </span>
                <span class="dead-label" v-if="player.isDead">已死亡</span>
                <transition name="emote-bubble">
                  <span v-if="emoteFor(player)" :key="emoteFor(player)?.key" class="emote-bubble">{{ emoteFor(player)?.emoji }}</span>
                </transition>
                <transition name="float-pop">
                  <b v-if="floatingEffectFor(player, 'damage')" :key="floatingEffectFor(player, 'damage')?.key" class="float-number damage-pop">-{{ floatingEffectFor(player, "damage")?.value }}</b>
                </transition>
                <transition name="float-pop">
                  <b v-if="floatingEffectFor(player, 'heal')" :key="floatingEffectFor(player, 'heal')?.key" class="float-number heal-pop">+{{ floatingEffectFor(player, "heal")?.value }}</b>
                </transition>
                <transition name="float-pop">
                  <b v-if="floatingEffectFor(player, 'noEffect')" :key="floatingEffectFor(player, 'noEffect')?.key" class="float-number no-pop">无效</b>
                </transition>
              </button>

              <div class="seat-name-row">
                <strong>{{ player.nickname }}</strong>
                <button class="seat-info-btn" type="button" aria-label="查看角色详情" @click.stop="openPlayerDetail(player)">i</button>
              </div>
              <div class="seat-tags">
                <span>{{ characterName(player.characterId) }}</span>
                <span>{{ summonerSkillName(player.summonerSkillId) }}</span>
                <span v-for="badge in guardBadges(player)" :key="`${player.id}-${badge}`" class="guard-badge">{{ badge }}</span>
              </div>
              <div class="seat-stats">
                <span>♥ {{ player.hp }}/{{ player.maxHp }}</span>
                <span v-if="player.shield > 0">盾 {{ player.shield }}</span>
              </div>
              <div class="seat-roll">{{ lastRollText(player) }}</div>
              <span class="seat-status">{{ playerStatus(player) }}</span>
            </article>
          </div>
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
      <div class="dice-panel action-arena" :class="{ ready: isMyDuoControllerTurn, rolling: rollPhase === 'fast', slowing: rollPhase === 'slow', paused: rollPhase === 'pause', reveal: rollPhase === 'reveal', rolled: visibleRoll }">
        <div class="dice-visual">
          <div class="dice-box" :key="rollPhase === 'idle' ? visibleRoll?.id : rollPhase">
            <span v-for="(dice, index) in displayedDiceValues" :key="`${visibleRoll?.id ?? pendingRollDecision?.id ?? 'empty'}-${index}`">{{ dice }}</span>
          </div>
          <transition-group name="skill-hint" tag="div" class="skill-hint-stack" aria-live="polite">
            <span v-for="hint in activeSkillHints" :key="hint.id" class="skill-hint-badge">
              <span>{{ hint.text }}</span>
              <b v-if="hint.valueText">{{ hint.valueText }}</b>
            </span>
          </transition-group>
        </div>
        <div class="action-summary">
          <strong>{{ dicePanelTitle }}</strong>
          <p v-if="dicePanelDetail">{{ dicePanelDetail }}</p>
          <p v-if="latestSkill.length">技能：{{ latestSkill.map((event) => event.message.replace(/^.*触发技能：/, "")).join("；") }}</p>
        </div>
        <div v-if="shouldShowActionSlots" class="dice-action-slots">
          <div v-if="shouldShowSelfDestructChoices" class="self-destruct-panel">
            <div class="self-destruct-title">
              <strong>选择自爆扣血量</strong>
              <span>造成双倍普通伤害</span>
            </div>
            <div class="self-destruct-grid">
              <button
                v-for="amount in selfDestructAmounts"
                :key="`duo-self-destruct-${amount}`"
                class="self-destruct-btn"
                type="button"
                :disabled="!canChooseSelfDestructAmount(amount) || rollRequestLocked"
                :title="canChooseSelfDestructAmount(amount) ? `扣 ${amount} 血，造成 ${amount * 2} 伤害` : '血量不足'"
                @click="confirmSelfDestructAmount(amount)"
              >
                <strong>{{ amount }}</strong>
                <small>扣 {{ amount }} / 伤 {{ amount * 2 }}</small>
              </button>
            </div>
          </div>
          <div class="slot-heading">
            <strong>行动卡槽 · 🎲 {{ pendingRollDecision?.currentRoll }}</strong>
          </div>
          <div class="slot-grid">
            <button
              v-for="slot in actionSlots"
              :key="slot.id"
              class="dice-action-slot"
              type="button"
              :class="{ enabled: slot.enabled && !slot.requiresSelfDamageAmount, disabled: !slot.enabled || slot.requiresSelfDamageAmount, settling: selectedActionSlot === slot.id && rollRequestLocked }"
              :disabled="!canUseActionSlots || !slot.enabled || slot.requiresSelfDamageAmount"
              @click="confirmActionSlot(slot)"
            >
              <span class="slot-dice">🎲 {{ pendingRollDecision?.currentRoll }}</span>
              <strong>{{ selectedActionSlot === slot.id && rollRequestLocked ? "结算中……" : slot.label }}</strong>
              <small>{{ slot.requiresSelfDamageAmount ? "请在上方选择扣血量" : slot.enabled ? slot.description : slot.reason ?? slot.description }}</small>
            </button>
          </div>
        </div>
        <button v-if="!pendingGuardCheck || isGuardCheckMine" class="roll-btn" type="button" :disabled="pendingGuardCheck ? !canRollGuardCheck : !canRollForDuo" @click="rollMainDice">
          {{ rollButtonText }}
        </button>
      </div>
    </section>

    <section v-if="!isDuoMode" class="battle-zone">
      <div class="zone-heading">
        <strong>其他玩家</strong>
        <span>点击头像选择攻击目标</span>
      </div>
      <div class="combat-board" :class="`turn-guide-${turnGuideTone}`" aria-label="玩家头像战场">
        <article
          v-for="player in battlePlayers"
          :key="player.id"
          class="battle-seat"
          :class="{
            active: player.id === activePlayer?.id,
            dead: player.isDead,
            selectable: canSelectTarget(player),
            selected: selectedTargetId === player.id,
            hit: isRecentDamageTarget(player),
            healed: isRecentHealTarget(player),
            blocked: isNoDamageTarget(player)
          }"
        >
          <button
            class="seat-button"
            type="button"
            :aria-pressed="selectedTargetId === player.id"
            :aria-label="`${playerNumber(player)}号 ${player.nickname}，${playerStatus(player)}`"
            @click="selectTargetFromSeat(player)"
          >
            <span v-if="canSelectTarget(player) && selectedTargetId !== player.id" class="attackable-mark">可攻击</span>
            <span v-if="selectedTargetId === player.id" class="target-mark">目标</span>
            <span v-if="hasInvincible(player)" class="invincible-mark" aria-label="无敌">✨</span>
            <span v-if="player.id === room.hostId" class="seat-host-mark">房</span>

            <span class="avatar-ring">
              <span class="avatar-emoji">{{ playerAvatar(player).emoji }}</span>
            </span>

            <span class="dead-label" v-if="player.isDead">已死亡</span>

            <transition name="emote-bubble">
              <span v-if="emoteFor(player)" :key="emoteFor(player)?.key" class="emote-bubble">{{ emoteFor(player)?.emoji }}</span>
            </transition>

            <transition name="float-pop">
              <b v-if="floatingEffectFor(player, 'damage')" :key="floatingEffectFor(player, 'damage')?.key" class="float-number damage-pop">-{{ floatingEffectFor(player, "damage")?.value }}</b>
            </transition>
            <transition name="float-pop">
              <b v-if="floatingEffectFor(player, 'heal')" :key="floatingEffectFor(player, 'heal')?.key" class="float-number heal-pop">+{{ floatingEffectFor(player, "heal")?.value }}</b>
            </transition>
            <transition name="float-pop">
              <b v-if="floatingEffectFor(player, 'noEffect')" :key="floatingEffectFor(player, 'noEffect')?.key" class="float-number no-pop">无效</b>
            </transition>
          </button>

          <div class="seat-name-row">
            <strong>{{ playerNumber(player) }}号 {{ player.nickname }}</strong>
            <button class="seat-info-btn" type="button" aria-label="查看玩家详情" @click.stop="openPlayerDetail(player)">i</button>
          </div>

          <div class="seat-tags">
            <span>{{ characterName(player.characterId) }}</span>
            <span>{{ summonerSkillName(player.summonerSkillId) }}{{ player.summonerSkillCooldown ? ` ${player.summonerSkillCooldown}` : "" }}</span>
            <span v-for="badge in guardBadges(player)" :key="`${player.id}-${badge}`" class="guard-badge">{{ badge }}</span>
          </div>
          <div class="seat-stats">
            <span>♥ {{ player.hp }}</span>
            <span v-if="player.shield > 0">🛡 {{ player.shield }}</span>
          </div>
          <div class="seat-roll">{{ lastRollText(player) }}</div>
          <div v-if="zhaoZilongHitText(player)" class="seat-roll">{{ zhaoZilongHitText(player) }}</div>
          <span class="seat-status">{{ playerStatus(player) }}</span>
        </article>
      </div>
    </section>

    <section v-if="!isDuoMode" class="action-center" :class="`turn-guide-${turnGuideTone}`">
      <div class="action-phase">
        <span>当前阶段</span>
        <strong>{{ currentActionTitle }}</strong>
        <small v-for="line in currentActionLines" :key="line">{{ line }}</small>
      </div>

      <div class="dice-panel action-arena" :class="{ ready: isMyTurn, rolling: rollPhase === 'fast', slowing: rollPhase === 'slow', paused: rollPhase === 'pause', reveal: rollPhase === 'reveal', rolled: visibleRoll }">
        <div class="dice-visual">
          <div class="dice-box" :key="rollPhase === 'idle' ? visibleRoll?.id : rollPhase">
            <span v-for="(dice, index) in displayedDiceValues" :key="`${visibleRoll?.id ?? pendingRollDecision?.id ?? 'empty'}-${index}`">{{ dice }}</span>
          </div>
          <transition-group name="skill-hint" tag="div" class="skill-hint-stack" aria-live="polite">
            <span v-for="hint in activeSkillHints" :key="hint.id" class="skill-hint-badge">
              <span>{{ hint.text }}</span>
              <b v-if="hint.valueText">{{ hint.valueText }}</b>
            </span>
          </transition-group>
        </div>
        <div class="action-summary">
          <strong>{{ dicePanelTitle }}</strong>
          <p v-if="dicePanelDetail">{{ dicePanelDetail }}</p>
          <p v-if="latestSkill.length">技能：{{ latestSkill.map((event) => event.message.replace(/^.*触发技能：/, "")).join("；") }}</p>
        </div>
        <div v-if="shouldShowActionSlots" class="dice-action-slots">
          <div v-if="shouldShowSelfDestructChoices" class="self-destruct-panel">
            <div class="self-destruct-title">
              <strong>选择自爆扣血量</strong>
              <span>造成双倍普通伤害</span>
            </div>
            <div class="self-destruct-grid">
              <button
                v-for="amount in selfDestructAmounts"
                :key="`classic-self-destruct-${amount}`"
                class="self-destruct-btn"
                type="button"
                :disabled="!canChooseSelfDestructAmount(amount) || rollRequestLocked"
                :title="canChooseSelfDestructAmount(amount) ? `扣 ${amount} 血，造成 ${amount * 2} 伤害` : '血量不足'"
                @click="confirmSelfDestructAmount(amount)"
              >
                <strong>{{ amount }}</strong>
                <small>扣 {{ amount }} / 伤 {{ amount * 2 }}</small>
              </button>
            </div>
          </div>
          <div class="slot-heading">
            <strong>行动卡槽 · 🎲 {{ pendingRollDecision?.currentRoll }}</strong>
          </div>
          <div class="slot-grid">
            <button
              v-for="slot in actionSlots"
              :key="slot.id"
              class="dice-action-slot"
              type="button"
              :class="{ enabled: slot.enabled && !slot.requiresSelfDamageAmount, disabled: !slot.enabled || slot.requiresSelfDamageAmount, settling: selectedActionSlot === slot.id && rollRequestLocked }"
              :disabled="!canUseActionSlots || !slot.enabled || slot.requiresSelfDamageAmount"
              @click="confirmActionSlot(slot)"
            >
              <span class="slot-dice">🎲 {{ pendingRollDecision?.currentRoll }}</span>
              <strong>{{ selectedActionSlot === slot.id && rollRequestLocked ? "结算中……" : slot.label }}</strong>
              <small>{{ slot.requiresSelfDamageAmount ? "请在上方选择扣血量" : slot.enabled ? slot.description : slot.reason ?? slot.description }}</small>
            </button>
          </div>
        </div>
        <button v-if="!pendingGuardCheck || isGuardCheckMine" class="roll-btn" type="button" :disabled="pendingGuardCheck ? !canRollGuardCheck : !canRoll" @click="rollMainDice">
          {{ rollButtonText }}
        </button>
      </div>
    </section>

    <section v-if="!isDuoMode && me" class="self-panel" :class="{ active: me.id === activePlayer?.id, dead: me.isDead }">
      <button class="self-avatar" type="button" aria-label="查看自己详情" @click="openPlayerDetail(me)">
        <span>{{ playerAvatar(me).emoji }}</span>
        <transition name="emote-bubble">
          <span v-if="emoteFor(me)" :key="emoteFor(me)?.key" class="emote-bubble">{{ emoteFor(me)?.emoji }}</span>
        </transition>
        <transition name="float-pop">
          <b v-if="floatingEffectFor(me, 'damage')" :key="floatingEffectFor(me, 'damage')?.key" class="float-number damage-pop">-{{ floatingEffectFor(me, "damage")?.value }}</b>
        </transition>
        <transition name="float-pop">
          <b v-if="floatingEffectFor(me, 'heal')" :key="floatingEffectFor(me, 'heal')?.key" class="float-number heal-pop">+{{ floatingEffectFor(me, "heal")?.value }}</b>
        </transition>
        <transition name="float-pop">
          <b v-if="floatingEffectFor(me, 'noEffect')" :key="floatingEffectFor(me, 'noEffect')?.key" class="float-number no-pop">无效</b>
        </transition>
      </button>
      <div class="self-main">
        <div class="self-title">
          <strong>{{ me.nickname }}</strong>
          <span>{{ characterName(me.characterId) }}</span>
        </div>
        <div class="self-meta">
          <span>♥ {{ me.hp }}/{{ me.maxHp }}</span>
          <span v-if="me.shield > 0">🛡 {{ me.shield }}</span>
          <span>{{ playerStatus(me) }} · {{ selfActionStateText }}</span>
          <span>{{ selfSummonerText }}</span>
          <span v-for="badge in guardBadges(me)" :key="`self-${badge}`" class="guard-badge">{{ badge }}</span>
          <span v-if="lastRollText(me)">{{ lastRollText(me) }}</span>
        </div>
        <div class="self-hp-bar" aria-label="自己的血量">
          <i :style="{ width: `${hpPercent(me)}%` }"></i>
        </div>
      </div>
      <button class="seat-info-btn self-info-btn" type="button" aria-label="查看自己详情" @click="openPlayerDetail(me)">i</button>
    </section>

    <section class="emote-panel" aria-label="固定表情">
      <button v-for="emote in EMOTE_OPTIONS" :key="emote.id" class="emote-btn" type="button" :disabled="emoteLocked" :title="emote.label" @click="sendEmote(emote.id)">
        <span>{{ emote.emoji }}</span>
        <small>{{ emote.label }}</small>
      </button>
    </section>

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

    <div v-if="detailPlayer" class="player-detail-backdrop" role="presentation" @click.self="closePlayerDetail">
      <section class="player-detail-panel" role="dialog" aria-modal="true" :aria-label="`${detailPlayer.nickname} 状态详情`">
        <header class="player-detail-header">
          <div>
            <span class="detail-avatar">{{ playerAvatar(detailPlayer).emoji }}</span>
            <h2>{{ detailPlayer.nickname }}</h2>
            <p>{{ characterName(detailPlayer.characterId) }}</p>
          </div>
          <button class="detail-close-btn" type="button" aria-label="关闭详情" @click="closePlayerDetail">×</button>
        </header>
        <dl class="player-detail-list">
          <div>
            <dt>血量</dt>
            <dd>{{ detailPlayer.hp }} / {{ detailPlayer.maxHp }}</dd>
          </div>
          <div>
            <dt>护盾</dt>
            <dd>{{ detailPlayer.shield }}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{{ playerStatus(detailPlayer) }}</dd>
          </div>
          <div>
            <dt>是否死亡</dt>
            <dd>{{ detailPlayer.isDead ? "已死亡" : "存活" }}</dd>
          </div>
          <div>
            <dt>最近骰点</dt>
            <dd>{{ lastRollText(detailPlayer) || "暂无" }}</dd>
          </div>
          <div v-if="zhaoZilongHitText(detailPlayer)">
            <dt>龙胆</dt>
            <dd>{{ zhaoZilongHitText(detailPlayer) }}</dd>
          </div>
          <div v-if="characterFor(detailPlayer.characterId)?.description?.length">
            <dt>职业技能</dt>
            <dd>{{ characterFor(detailPlayer.characterId)?.description.join("；") }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <RuleGuideDialog v-if="showRuleGuide" :characters="characters" @close="showRuleGuide = false" />
  </section>
</template>

<style scoped>
.battle-layout {
  gap: 7px;
  padding-bottom: 8px;
}

.battle-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.battle-zone,
.action-center {
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
}

.zone-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 9px;
  border-bottom: 1px solid #e2e8f0;
}

.zone-heading strong {
  color: #172033;
  font-size: 14px;
}

.zone-heading span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.battle-zone .combat-board {
  border: 0;
  border-radius: 0 0 8px 8px;
  padding: 8px;
}

.duo-battle-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
}

.duo-team-column {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.duo-team-column header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 9px;
  border-bottom: 1px solid #e2e8f0;
  color: #172033;
}

.duo-team-column header span {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.duo-combat-board {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.duo-actor-seat.selected .seat-button {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}

.duo-action-center .action-summary {
  text-align: center;
}

.battle-seat {
  gap: 4px;
}

.seat-button {
  min-height: 68px;
  padding: 6px;
}

.avatar-ring {
  width: 48px;
  height: 48px;
}

.avatar-emoji {
  font-size: 28px;
}

.seat-name-row {
  gap: 4px;
}

.seat-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  min-width: 0;
}

.seat-tags span {
  max-width: 100%;
  overflow: hidden;
  border-radius: 999px;
  padding: 1px 5px;
  background: #eef2ff;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat-tags .guard-badge,
.self-meta .guard-badge {
  background: #ecfdf5;
  color: #047857;
}

.action-center {
  display: grid;
  gap: 0;
  overflow: hidden;
}

.action-phase {
  display: grid;
  gap: 2px;
  padding: 7px 10px;
  background: #172033;
  color: #ffffff;
}

.action-phase span {
  color: #cbd5e1;
  font-size: 11px;
}

.action-phase strong {
  font-size: 16px;
  line-height: 1.25;
}

.action-phase small {
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 800;
}

.action-center .dice-panel {
  border: 0;
  border-radius: 0;
  gap: 7px;
  padding: 8px 10px;
  box-shadow: none;
}

.action-center .dice-visual {
  gap: 6px;
}

.action-center .dice-box span {
  width: 48px;
  height: 48px;
  font-size: 28px;
}

.action-summary {
  gap: 3px;
}

.action-summary p {
  margin: 0;
  line-height: 1.3;
}

.dice-action-slots {
  margin-top: 4px;
}

.self-destruct-panel {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff7ed;
}

.self-destruct-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: #7f1d1d;
}

.self-destruct-title strong {
  font-size: 13px;
}

.self-destruct-title span {
  color: #b45309;
  font-size: 11px;
  font-weight: 800;
}

.self-destruct-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.self-destruct-btn {
  min-height: 46px;
  border: 1px solid #fb923c;
  border-radius: 8px;
  background: #ffffff;
  color: #9a3412;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

.self-destruct-btn strong,
.self-destruct-btn small {
  display: block;
}

.self-destruct-btn strong {
  font-size: 18px;
  line-height: 1.1;
}

.self-destruct-btn small {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.2;
}

.self-destruct-btn:not(:disabled):hover {
  border-color: #ea580c;
  background: #ffedd5;
}

.self-destruct-btn:disabled {
  border-color: #e2e8f0;
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.slot-grid {
  gap: 6px;
}

.slot-heading {
  align-items: start;
}

.dice-action-slot {
  min-height: 72px;
  padding: 7px;
}

.dice-action-slot small {
  min-height: 0;
}

.self-panel {
  position: relative;
  padding: 8px 10px;
  gap: 8px;
}

.self-avatar {
  width: 52px;
  height: 52px;
}

.self-title span {
  flex: 0 0 auto;
}

.self-meta {
  gap: 4px;
}

.emote-panel {
  gap: 5px;
  padding: 6px;
}

.emote-btn {
  min-height: 38px;
  padding: 4px 6px;
}

.emote-btn small {
  font-size: 10px;
}

@media (max-width: 480px) {
  .battle-tools {
    justify-content: stretch;
  }

  .battle-tools .small-btn {
    flex: 1;
    min-height: 34px;
  }

  .zone-heading {
    padding: 5px 8px;
  }

  .zone-heading span {
    display: none;
  }

  .battle-zone .combat-board {
    padding: 6px;
  }

  .duo-battle-board {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 6px;
  }

  .duo-combat-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .seat-button {
    min-height: 58px;
    padding: 5px;
  }

  .avatar-ring {
    width: 42px;
    height: 42px;
  }

  .avatar-emoji {
    font-size: 25px;
  }

  .seat-tags,
  .seat-roll {
    display: none;
  }

  .action-phase strong {
    font-size: 16px;
  }

  .slot-grid {
    padding-bottom: 4px;
  }

  .self-destruct-title {
    display: grid;
  }

  .self-destruct-btn {
    min-height: 44px;
  }

  .dice-action-slot {
    min-height: 64px;
  }

  .self-panel {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 7px 8px;
  }

  .self-avatar {
    width: 46px;
    height: 46px;
  }

  .emote-panel {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .emote-btn {
    min-height: 34px;
  }

  .emote-btn small {
    display: none;
  }

  .self-info-btn {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}
</style>
