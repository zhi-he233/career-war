import { computed, onUnmounted, ref, watch } from "vue";
import { socket } from "../socket";
import RuleGuideDialog from "./RuleGuideDialog.vue";
const props = defineProps();
const emit = defineEmits();
const MAX_RENDERED_LOG = 50;
const EMOTE_DISPLAY_MS = 1500;
const HIGHLIGHT_DISPLAY_MS = 1500;
const SKILL_HINT_DISPLAY_MS = 1300;
const EMOTE_OPTIONS = [
    { id: "cry", label: "大哭", emoji: "😭" },
    { id: "surprise", label: "惊讶", emoji: "😮" },
    { id: "taunt", label: "嘲讽", emoji: "😏" },
    { id: "angry", label: "愤怒", emoji: "😡" },
    { id: "like", label: "点赞", emoji: "👍" },
    { id: "question", label: "疑惑", emoji: "❓" }
];
const PLAYER_AVATARS = [
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
const displayedRoom = ref(cloneRoomForDisplay(props.room));
const pendingRoom = ref(null);
const room = computed(() => displayedRoom.value);
const rollPhase = ref("idle");
const rollingDice = ref(1);
const visibleRollId = ref(getLatestRoll(props.room)?.id);
const pendingRevealRollId = ref();
const activeEffectRollId = ref();
const activeFloatingEffects = ref([]);
const animatedRollIds = new Set();
const rollRequestLocked = ref(false);
const activeEmotes = ref({});
const activeHighlight = ref(null);
const activeSkillHints = ref([]);
const showRuleGuide = ref(false);
const emoteLocked = ref(false);
const detailPlayerId = ref(null);
const selectedActionSlot = ref(null);
let rollingTimer;
let emoteUnlockTimer;
let highlightTimer;
let skillHintTimer;
const timers = [];
const emoteTimers = new Map();
const playedHighlightKeys = new Set();
const playedSkillHintIds = new Set();
const activePlayer = computed(() => room.value.players[room.value.activePlayerIndex]);
const isMyTurn = computed(() => activePlayer.value?.id === props.playerId && room.value.phase === "battle");
const me = computed(() => room.value.players.find((player) => player.id === props.playerId));
const selectedTargetId = computed(() => me.value?.selectedTargetId);
const selectedTarget = computed(() => room.value.players.find((player) => player.id === selectedTargetId.value));
const battlePlayers = computed(() => {
    const others = room.value.players.filter((player) => player.id !== props.playerId);
    return others.length > 0 ? others : room.value.players;
});
const aliveEnemies = computed(() => room.value.players.filter((player) => !player.isDead && player.id !== props.playerId));
const winner = computed(() => room.value.players.find((player) => player.id === room.value.winnerId));
const pendingRoll = computed(() => room.value.pendingRoll);
const pendingRollDecision = computed(() => room.value.pendingRollDecision);
const isPendingMine = computed(() => pendingRoll.value?.playerId === props.playerId);
const isDecisionMine = computed(() => pendingRollDecision.value?.actorId === props.playerId);
const isRolling = computed(() => rollPhase.value !== "idle" && rollPhase.value !== "reveal");
const isSelfDead = computed(() => Boolean(me.value?.isDead));
const canUseActionSlots = computed(() => Boolean(pendingRollDecision.value && isDecisionMine.value && !isRolling.value && !rollRequestLocked.value));
const shouldShowActionSlots = computed(() => Boolean(canUseActionSlots.value && !isSelfDead.value));
const rematchReadyIds = computed(() => room.value.rematchReadyPlayerIds ?? []);
const isRematchReady = computed(() => rematchReadyIds.value.includes(props.playerId));
const detailPlayer = computed(() => room.value.players.find((player) => player.id === detailPlayerId.value));
const selectedTargetText = computed(() => selectedTarget.value ? `当前目标：${selectedTarget.value.nickname}` : "当前目标：未选择");
const actionStageText = computed(() => {
    if (room.value.phase === "gameOver")
        return "游戏结束";
    if (me.value?.isDead)
        return "你已死亡，等待本局结束";
    if (rollRequestLocked.value && !pendingRoom.value)
        return "正在结算……";
    if (isRolling.value)
        return "骰子滚动中……";
    if (pendingRollDecision.value && isDecisionMine.value)
        return "请选择本回合行动";
    if (pendingRollDecision.value)
        return `等待 ${activePlayer.value?.nickname ?? "玩家"} 选择骰子用途`;
    if (pendingRoll.value && isPendingMine.value)
        return "技能触发：请继续投骰";
    if (!isMyTurn.value)
        return `等待 ${activePlayer.value?.nickname ?? "玩家"} 行动`;
    if (!selectedTargetId.value)
        return "请选择一个目标";
    return `已选择目标：${selectedTarget.value?.nickname ?? "目标"}，可以投骰`;
});
const selfActionStateText = computed(() => {
    if (!me.value)
        return "未入场";
    if (me.value.isDead)
        return "已死亡";
    if (isMyTurn.value)
        return selectedTargetId.value ? "可以投骰" : "选择目标中";
    return "等待行动";
});
const selfSummonerText = computed(() => {
    const player = me.value;
    if (!player)
        return "召唤师技能：无";
    const name = summonerSkillName(player.summonerSkillId);
    const cooldown = player.summonerSkillCooldown ?? 0;
    return cooldown > 0 ? `${name} 冷却 ${cooldown}` : `${name} 可用`;
});
const actionSlots = computed(() => {
    const decision = pendingRollDecision.value;
    if (!decision)
        return [];
    return decision.availableActions ?? [];
});
watch(() => props.room, (nextRoom) => {
    const nextRollId = getLatestRoll(nextRoom)?.id;
    const shownRollId = getLatestRoll(displayedRoom.value)?.id;
    if (nextRollId && nextRollId !== shownRollId) {
        pendingRoom.value = cloneRoomForDisplay(nextRoom);
        pendingRevealRollId.value = nextRollId;
        startRollAnimation(false);
        return;
    }
    if (isRolling.value) {
        pendingRoom.value = cloneRoomForDisplay(nextRoom);
        return;
    }
    displayedRoom.value = cloneRoomForDisplay(nextRoom);
    rollRequestLocked.value = false;
    selectedActionSlot.value = null;
    if (visibleRollId.value)
        startEffectWindow(visibleRollId.value);
}, { deep: false });
watch(() => props.lastEmote, (event) => {
    if (!event || event.roomId !== room.value.id)
        return;
    showPlayerEmote(event);
});
onUnmounted(() => {
    clearRollTimers();
    clearEmoteTimers();
    clearHighlightTimer();
    clearSkillHintTimer();
});
const visibleRoll = computed(() => {
    if (rollPhase.value !== "idle" && rollPhase.value !== "reveal")
        return undefined;
    return room.value.battleLog.find((event) => event.id === visibleRollId.value && event.type === "roll");
});
const latestActionEvents = computed(() => {
    const rollId = visibleRoll.value?.id;
    const firstRollIndex = room.value.battleLog.findIndex((event) => event.id === rollId);
    if (firstRollIndex < 0)
        return [];
    const nextRollIndex = room.value.battleLog.findIndex((event, index) => index > firstRollIndex && event.type === "roll");
    return room.value.battleLog.slice(firstRollIndex, nextRollIndex < 0 ? undefined : nextRollIndex);
});
const latestSkill = computed(() => latestActionEvents.value.filter((event) => event.type === "skill"));
const latestDiceText = computed(() => {
    if (isRolling.value)
        return pendingRoll.value?.message ?? "";
    if (pendingRollDecision.value)
        return `当前骰点 ${pendingRollDecision.value.currentRoll}`;
    const dice = visibleRoll.value?.dice ?? [];
    if (dice.length === 0)
        return pendingRoll.value?.message ?? "等待投骰";
    return `投出了 ${dice.join("、")} 点`;
});
const currentActionTitle = computed(() => {
    if (isSelfDead.value)
        return "你已死亡，正在观战";
    return actionStageText.value;
});
const currentDiceValueText = computed(() => {
    if (pendingRollDecision.value)
        return String(pendingRollDecision.value.currentRoll);
    return latestDiceText.value;
});
const currentActionLines = computed(() => {
    const actorName = activePlayer.value?.nickname ?? "玩家";
    if (isSelfDead.value) {
        return [`当前行动：${actorName}`, `当前骰点：${currentDiceValueText.value}`, `等待 ${actorName} 操作`];
    }
    if (pendingRollDecision.value && !isDecisionMine.value) {
        return [`当前行动：${actorName}`, `当前骰点：${currentDiceValueText.value}`, `等待 ${actorName} 操作`];
    }
    return [selectedTargetText.value, latestDiceText.value];
});
const rollButtonText = computed(() => {
    if (isRolling.value)
        return "摇骰中...";
    if (pendingRollDecision.value)
        return "等待选择";
    if (pendingRoll.value)
        return isPendingMine.value ? "继续投骰" : "等待继续投骰";
    return "投骰";
});
const turnGuideText = computed(() => {
    if (room.value.phase === "gameOver")
        return "游戏结束";
    if (me.value?.isDead)
        return "你已死亡，等待本局结束";
    if (rollRequestLocked.value && !pendingRoom.value)
        return "正在结算……";
    if (isRolling.value)
        return "骰子滚动中……";
    if (pendingRollDecision.value && isDecisionMine.value)
        return "骰点已揭示：选择一个骰子行动卡槽";
    if (pendingRollDecision.value)
        return `等待【${activePlayer.value?.nickname ?? "玩家"}】选择骰子用途`;
    if (pendingRoll.value && isPendingMine.value)
        return "技能触发：请继续投骰";
    if (!isMyTurn.value)
        return `等待【${activePlayer.value?.nickname ?? "玩家"}】行动`;
    if (!selectedTargetId.value)
        return "轮到你了：点击一个头像选择攻击目标";
    return `已选择【${selectedTarget.value?.nickname ?? "目标"}】，点击投骰`;
});
const turnGuideTone = computed(() => {
    if (room.value.phase === "gameOver")
        return "ended";
    if (me.value?.isDead)
        return "dead";
    if (rollRequestLocked.value || isRolling.value)
        return "busy";
    if (pendingRoll.value && isPendingMine.value)
        return "continue";
    if (isMyTurn.value)
        return "mine";
    return "waiting";
});
const canRoll = computed(() => {
    if (room.value.phase === "gameOver" || rollRequestLocked.value || isRolling.value || pendingRollDecision.value || !isMyTurn.value)
        return false;
    if (pendingRoll.value)
        return isPendingMine.value;
    return Boolean(selectedTargetId.value) && aliveEnemies.value.length > 0;
});
function characterName(id) {
    return props.characters.find((character) => character.id === id)?.name ?? "未知职业";
}
function characterFor(id) {
    return props.characters.find((character) => character.id === id);
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
function playerStatus(player) {
    if (!player.isOnline)
        return "离线";
    if (player.isDead)
        return "死亡";
    if (pendingRoll.value?.playerId === player.id)
        return "待继续";
    if (player.id === activePlayer.value?.id)
        return "行动中";
    if (hasInvincible(player))
        return "无敌";
    return "待机";
}
function hasInvincible(player) {
    return room.value.effects.some((effect) => effect.type === "invincible" && effect.sourcePlayerId === player.id);
}
function playerAvatar(player) {
    const avatarId = player.avatarId;
    const assignedAvatar = PLAYER_AVATARS.find((avatar) => avatar.id === avatarId);
    if (assignedAvatar)
        return assignedAvatar;
    const hash = Array.from(player.id).reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0);
    return PLAYER_AVATARS[Math.abs(hash) % PLAYER_AVATARS.length];
}
function playerNumber(player) {
    const index = room.value.players.findIndex((item) => item.id === player.id);
    return index < 0 ? 0 : index + 1;
}
function lastRollText(player) {
    if (pendingRollDecision.value?.actorId === player.id)
        return `🎲 ${pendingRollDecision.value.currentRoll}`;
    const rollEvent = room.value.battleLog.find((event) => event.type === "roll" && event.playerId === player.id && event.dice?.length);
    if (!rollEvent?.dice?.length)
        return "";
    return `🎲 ${rollEvent.dice.join("、")}`;
}
function zhaoZilongHitText(player) {
    if (player.characterId !== "zhaoZilong")
        return "";
    return `龙胆：${player.zhaoZilongHitCount ?? 0}/3`;
}
function canSelectTarget(player) {
    return isMyTurn.value && !pendingRoll.value && !pendingRollDecision.value && player.id !== props.playerId && !player.isDead;
}
function selectTargetFromSeat(player) {
    if (!canSelectTarget(player))
        return;
    emit("selectTarget", player.id);
}
function openPlayerDetail(player) {
    detailPlayerId.value = player.id;
}
function closePlayerDetail() {
    detailPlayerId.value = null;
}
function isRecentDamageTarget(player) {
    return Boolean(floatingEffectFor(player, "damage"));
}
function isRecentHealTarget(player) {
    return Boolean(floatingEffectFor(player, "heal"));
}
function isNoDamageTarget(player) {
    return Boolean(floatingEffectFor(player, "noEffect"));
}
function floatingEffectFor(player, type) {
    return activeFloatingEffects.value.find((effect) => effect.playerId === player.id && effect.type === type);
}
function rollWithAnimation() {
    if (!canRoll.value)
        return;
    rollRequestLocked.value = true;
    startRollAnimation(true);
    emit("rollDice");
}
function confirmDecision(choice, summonerSkillId) {
    const decision = pendingRollDecision.value;
    if (!decision || !isDecisionMine.value || rollRequestLocked.value)
        return;
    rollRequestLocked.value = true;
    selectedActionSlot.value = choice === "settle" ? "normal_attack" : choice;
    emit("confirmRollDecision", {
        roomId: room.value.id,
        pendingDecisionId: decision.id,
        actionType: choice === "settle" ? "normal_attack" : choice,
        skillId: summonerSkillId,
        decisionId: decision.id,
        choice,
        summonerSkillId
    });
}
function confirmActionSlot(slot) {
    if (!pendingRollDecision.value || !isDecisionMine.value || rollRequestLocked.value || !slot.enabled)
        return;
    const summonerSkillId = slot.id === "summoner_skill" && isSummonerSkillId(slot.skillId) ? slot.skillId : undefined;
    confirmDecision(slot.id, summonerSkillId);
}
function isSummonerSkillId(value) {
    return value === "lucky_plus_one" || value === "first_aid" || value === "iron_wall" || value === "fate_reroll" || value === "last_stand";
}
function sendEmote(emoteId) {
    if (emoteLocked.value)
        return;
    emoteLocked.value = true;
    socket.emit("sendEmote", { emoteId });
    window.clearTimeout(emoteUnlockTimer);
    emoteUnlockTimer = window.setTimeout(() => {
        emoteLocked.value = false;
        emoteUnlockTimer = undefined;
    }, EMOTE_DISPLAY_MS);
}
function emoteFor(player) {
    return activeEmotes.value[player.id];
}
function readyForRematch() {
    if (room.value.phase !== "gameOver" || isRematchReady.value)
        return;
    socket.emit("readyForRematch", {});
}
function startRollAnimation(shouldEmit) {
    if (isRolling.value)
        return;
    clearRollTimers();
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
            rollRequestLocked.value = false;
            window.clearInterval(rollingTimer);
            rollingTimer = undefined;
        }
    }, 1200));
}
function revealServerRoll() {
    const revealRoom = pendingRoom.value ?? cloneRoomForDisplay(props.room);
    const revealRollId = pendingRevealRollId.value ?? getLatestRoll(revealRoom)?.id;
    if (!revealRollId || revealRollId === visibleRollId.value)
        return;
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
    }, 220));
}
function startDiceTicker(interval) {
    window.clearInterval(rollingTimer);
    rollingTimer = window.setInterval(() => {
        rollingDice.value = randomDice();
    }, interval);
}
function clearRollTimers() {
    window.clearInterval(rollingTimer);
    while (timers.length)
        window.clearTimeout(timers.pop());
    rollingTimer = undefined;
}
function showPlayerEmote(event) {
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
        if (current?.createdAt !== event.createdAt)
            return;
        const nextEmotes = { ...activeEmotes.value };
        delete nextEmotes[event.playerId];
        activeEmotes.value = nextEmotes;
        emoteTimers.delete(event.playerId);
    }, EMOTE_DISPLAY_MS);
    emoteTimers.set(event.playerId, timer);
}
function clearEmoteTimers() {
    window.clearTimeout(emoteUnlockTimer);
    for (const timer of emoteTimers.values())
        window.clearTimeout(timer);
    emoteTimers.clear();
}
function showHighlight(highlight) {
    if (!highlight || playedHighlightKeys.has(highlight.id))
        return;
    playedHighlightKeys.add(highlight.id);
    activeHighlight.value = highlight;
    window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
        if (activeHighlight.value?.id === highlight.id)
            activeHighlight.value = null;
        highlightTimer = undefined;
    }, HIGHLIGHT_DISPLAY_MS);
}
function clearHighlightTimer() {
    window.clearTimeout(highlightTimer);
}
function showSkillHints(hints, rollId) {
    const nextHints = (hints ?? []).filter((hint) => hint.rollId === rollId && !playedSkillHintIds.has(hint.id));
    if (nextHints.length === 0)
        return;
    for (const hint of nextHints)
        playedSkillHintIds.add(hint.id);
    activeSkillHints.value = nextHints;
    window.clearTimeout(skillHintTimer);
    skillHintTimer = window.setTimeout(() => {
        if (activeSkillHints.value.some((hint) => nextHints.some((nextHint) => nextHint.id === hint.id))) {
            activeSkillHints.value = [];
        }
        skillHintTimer = undefined;
    }, SKILL_HINT_DISPLAY_MS);
}
function clearSkillHintTimer() {
    window.clearTimeout(skillHintTimer);
}
function randomDice() {
    return Math.floor(Math.random() * 6) + 1;
}
function getLatestRoll(targetRoom) {
    return targetRoom.battleLog.find((event) => event.type === "roll");
}
function startEffectWindow(rollId) {
    if (animatedRollIds.has(rollId))
        return;
    const effects = collectFloatingEffects(rollId);
    if (effects.length === 0)
        return;
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
function collectFloatingEffects(rollId) {
    const firstRollIndex = displayedRoom.value.battleLog.findIndex((event) => event.id === rollId);
    if (firstRollIndex < 0)
        return [];
    const nextRollIndex = displayedRoom.value.battleLog.findIndex((event, index) => index > firstRollIndex && event.type === "roll");
    const actionEvents = displayedRoom.value.battleLog.slice(firstRollIndex, nextRollIndex < 0 ? undefined : nextRollIndex);
    const effects = [];
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
function cloneRoomForDisplay(targetRoom) {
    const nextRoom = JSON.parse(JSON.stringify(targetRoom));
    nextRoom.battleLog = nextRoom.battleLog.slice(0, MAX_RENDERED_LOG);
    nextRoom.snapshots = [];
    return nextRoom;
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['zone-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['zone-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['battle-zone']} */ ;
/** @type {__VLS_StyleScopedClasses['seat-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['action-center']} */ ;
/** @type {__VLS_StyleScopedClasses['action-phase']} */ ;
/** @type {__VLS_StyleScopedClasses['action-phase']} */ ;
/** @type {__VLS_StyleScopedClasses['action-phase']} */ ;
/** @type {__VLS_StyleScopedClasses['action-center']} */ ;
/** @type {__VLS_StyleScopedClasses['action-center']} */ ;
/** @type {__VLS_StyleScopedClasses['action-center']} */ ;
/** @type {__VLS_StyleScopedClasses['action-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['dice-action-slot']} */ ;
/** @type {__VLS_StyleScopedClasses['emote-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['battle-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['battle-tools']} */ ;
/** @type {__VLS_StyleScopedClasses['zone-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['zone-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['battle-zone']} */ ;
/** @type {__VLS_StyleScopedClasses['combat-board']} */ ;
/** @type {__VLS_StyleScopedClasses['seat-button']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['seat-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['action-phase']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dice-action-slot']} */ ;
/** @type {__VLS_StyleScopedClasses['self-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['self-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['emote-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['emote-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['emote-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "battle-layout" },
});
/** @type {__VLS_StyleScopedClasses['battle-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "battle-tools" },
});
/** @type {__VLS_StyleScopedClasses['battle-tools']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showRuleGuide = true;
            // @ts-ignore
            [showRuleGuide,];
        } },
    ...{ class: "ghost-btn small-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "battle-zone" },
});
/** @type {__VLS_StyleScopedClasses['battle-zone']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "zone-heading" },
});
/** @type {__VLS_StyleScopedClasses['zone-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "combat-board" },
    ...{ class: (`turn-guide-${__VLS_ctx.turnGuideTone}`) },
    'aria-label': "玩家头像战场",
});
/** @type {__VLS_StyleScopedClasses['combat-board']} */ ;
for (const [player] of __VLS_vFor((__VLS_ctx.battlePlayers))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        key: (player.id),
        ...{ class: "battle-seat" },
        ...{ class: ({
                active: player.id === __VLS_ctx.activePlayer?.id,
                dead: player.isDead,
                selectable: __VLS_ctx.canSelectTarget(player),
                selected: __VLS_ctx.selectedTargetId === player.id,
                hit: __VLS_ctx.isRecentDamageTarget(player),
                healed: __VLS_ctx.isRecentHealTarget(player),
                blocked: __VLS_ctx.isNoDamageTarget(player)
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['battle-seat']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    /** @type {__VLS_StyleScopedClasses['dead']} */ ;
    /** @type {__VLS_StyleScopedClasses['selectable']} */ ;
    /** @type {__VLS_StyleScopedClasses['selected']} */ ;
    /** @type {__VLS_StyleScopedClasses['hit']} */ ;
    /** @type {__VLS_StyleScopedClasses['healed']} */ ;
    /** @type {__VLS_StyleScopedClasses['blocked']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectTargetFromSeat(player);
                // @ts-ignore
                [turnGuideTone, battlePlayers, activePlayer, canSelectTarget, selectedTargetId, isRecentDamageTarget, isRecentHealTarget, isNoDamageTarget, selectTargetFromSeat,];
            } },
        ...{ class: "seat-button" },
        type: "button",
        'aria-pressed': (__VLS_ctx.selectedTargetId === player.id),
        'aria-label': (`${__VLS_ctx.playerNumber(player)}号 ${player.nickname}，${__VLS_ctx.playerStatus(player)}`),
    });
    /** @type {__VLS_StyleScopedClasses['seat-button']} */ ;
    if (__VLS_ctx.canSelectTarget(player) && __VLS_ctx.selectedTargetId !== player.id) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "attackable-mark" },
        });
        /** @type {__VLS_StyleScopedClasses['attackable-mark']} */ ;
    }
    if (__VLS_ctx.selectedTargetId === player.id) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "target-mark" },
        });
        /** @type {__VLS_StyleScopedClasses['target-mark']} */ ;
    }
    if (__VLS_ctx.hasInvincible(player)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "invincible-mark" },
            'aria-label': "无敌",
        });
        /** @type {__VLS_StyleScopedClasses['invincible-mark']} */ ;
    }
    if (player.id === __VLS_ctx.room.hostId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "seat-host-mark" },
        });
        /** @type {__VLS_StyleScopedClasses['seat-host-mark']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "avatar-ring" },
    });
    /** @type {__VLS_StyleScopedClasses['avatar-ring']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "avatar-emoji" },
    });
    /** @type {__VLS_StyleScopedClasses['avatar-emoji']} */ ;
    (__VLS_ctx.playerAvatar(player).emoji);
    if (player.isDead) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "dead-label" },
        });
        /** @type {__VLS_StyleScopedClasses['dead-label']} */ ;
    }
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        name: "emote-bubble",
    }));
    const __VLS_2 = __VLS_1({
        name: "emote-bubble",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    if (__VLS_ctx.emoteFor(player)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (__VLS_ctx.emoteFor(player)?.key),
            ...{ class: "emote-bubble" },
        });
        /** @type {__VLS_StyleScopedClasses['emote-bubble']} */ ;
        (__VLS_ctx.emoteFor(player)?.emoji);
    }
    // @ts-ignore
    [canSelectTarget, selectedTargetId, selectedTargetId, selectedTargetId, playerNumber, playerStatus, hasInvincible, room, playerAvatar, emoteFor, emoteFor, emoteFor,];
    var __VLS_3;
    let __VLS_6;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        name: "float-pop",
    }));
    const __VLS_8 = __VLS_7({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    if (__VLS_ctx.floatingEffectFor(player, 'damage')) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.floatingEffectFor(player, 'damage')?.key),
            ...{ class: "float-number damage-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['damage-pop']} */ ;
        (__VLS_ctx.floatingEffectFor(player, "damage")?.value);
    }
    // @ts-ignore
    [floatingEffectFor, floatingEffectFor, floatingEffectFor,];
    var __VLS_9;
    let __VLS_12;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        name: "float-pop",
    }));
    const __VLS_14 = __VLS_13({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const { default: __VLS_17 } = __VLS_15.slots;
    if (__VLS_ctx.floatingEffectFor(player, 'heal')) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.floatingEffectFor(player, 'heal')?.key),
            ...{ class: "float-number heal-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['heal-pop']} */ ;
        (__VLS_ctx.floatingEffectFor(player, "heal")?.value);
    }
    // @ts-ignore
    [floatingEffectFor, floatingEffectFor, floatingEffectFor,];
    var __VLS_15;
    let __VLS_18;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        name: "float-pop",
    }));
    const __VLS_20 = __VLS_19({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    const { default: __VLS_23 } = __VLS_21.slots;
    if (__VLS_ctx.floatingEffectFor(player, 'noEffect')) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.floatingEffectFor(player, 'noEffect')?.key),
            ...{ class: "float-number no-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['no-pop']} */ ;
    }
    // @ts-ignore
    [floatingEffectFor, floatingEffectFor,];
    var __VLS_21;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "seat-name-row" },
    });
    /** @type {__VLS_StyleScopedClasses['seat-name-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.playerNumber(player));
    (player.nickname);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openPlayerDetail(player);
                // @ts-ignore
                [playerNumber, openPlayerDetail,];
            } },
        ...{ class: "seat-info-btn" },
        type: "button",
        'aria-label': "查看玩家详情",
    });
    /** @type {__VLS_StyleScopedClasses['seat-info-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "seat-tags" },
    });
    /** @type {__VLS_StyleScopedClasses['seat-tags']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.characterName(player.characterId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.summonerSkillName(player.summonerSkillId));
    (player.summonerSkillCooldown ? ` ${player.summonerSkillCooldown}` : "");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "seat-stats" },
    });
    /** @type {__VLS_StyleScopedClasses['seat-stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (player.hp);
    if (player.shield > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (player.shield);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "seat-roll" },
    });
    /** @type {__VLS_StyleScopedClasses['seat-roll']} */ ;
    (__VLS_ctx.lastRollText(player));
    if (__VLS_ctx.zhaoZilongHitText(player)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "seat-roll" },
        });
        /** @type {__VLS_StyleScopedClasses['seat-roll']} */ ;
        (__VLS_ctx.zhaoZilongHitText(player));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "seat-status" },
    });
    /** @type {__VLS_StyleScopedClasses['seat-status']} */ ;
    (__VLS_ctx.playerStatus(player));
    // @ts-ignore
    [playerStatus, characterName, summonerSkillName, lastRollText, zhaoZilongHitText, zhaoZilongHitText,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "action-center" },
    ...{ class: (`turn-guide-${__VLS_ctx.turnGuideTone}`) },
});
/** @type {__VLS_StyleScopedClasses['action-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "action-phase" },
});
/** @type {__VLS_StyleScopedClasses['action-phase']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.currentActionTitle);
for (const [line] of __VLS_vFor((__VLS_ctx.currentActionLines))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({
        key: (line),
    });
    (line);
    // @ts-ignore
    [turnGuideTone, currentActionTitle, currentActionLines,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dice-panel action-arena" },
    ...{ class: ({ ready: __VLS_ctx.isMyTurn, rolling: __VLS_ctx.rollPhase === 'fast', slowing: __VLS_ctx.rollPhase === 'slow', paused: __VLS_ctx.rollPhase === 'pause', reveal: __VLS_ctx.rollPhase === 'reveal', rolled: __VLS_ctx.visibleRoll }) },
});
/** @type {__VLS_StyleScopedClasses['dice-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['action-arena']} */ ;
/** @type {__VLS_StyleScopedClasses['ready']} */ ;
/** @type {__VLS_StyleScopedClasses['rolling']} */ ;
/** @type {__VLS_StyleScopedClasses['slowing']} */ ;
/** @type {__VLS_StyleScopedClasses['paused']} */ ;
/** @type {__VLS_StyleScopedClasses['reveal']} */ ;
/** @type {__VLS_StyleScopedClasses['rolled']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dice-visual" },
});
/** @type {__VLS_StyleScopedClasses['dice-visual']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dice-box" },
    key: (__VLS_ctx.rollPhase === 'idle' ? __VLS_ctx.visibleRoll?.id : __VLS_ctx.rollPhase),
});
/** @type {__VLS_StyleScopedClasses['dice-box']} */ ;
for (const [dice, index] of __VLS_vFor((__VLS_ctx.isRolling ? [__VLS_ctx.rollPhase === 'pause' ? '...' : __VLS_ctx.rollingDice] : __VLS_ctx.visibleRoll?.dice ?? ['?']))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: (`${__VLS_ctx.visibleRoll?.id ?? 'empty'}-${index}`),
    });
    (dice);
    // @ts-ignore
    [isMyTurn, rollPhase, rollPhase, rollPhase, rollPhase, rollPhase, rollPhase, rollPhase, visibleRoll, visibleRoll, visibleRoll, visibleRoll, isRolling, rollingDice,];
}
let __VLS_24;
/** @ts-ignore @type { | typeof __VLS_components.transitionGroup | typeof __VLS_components.TransitionGroup | typeof __VLS_components['transition-group'] | typeof __VLS_components.transitionGroup | typeof __VLS_components.TransitionGroup | typeof __VLS_components['transition-group']} */
transitionGroup;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
    name: "skill-hint",
    tag: "div",
    ...{ class: "skill-hint-stack" },
    'aria-live': "polite",
}));
const __VLS_26 = __VLS_25({
    name: "skill-hint",
    tag: "div",
    ...{ class: "skill-hint-stack" },
    'aria-live': "polite",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
/** @type {__VLS_StyleScopedClasses['skill-hint-stack']} */ ;
const { default: __VLS_29 } = __VLS_27.slots;
for (const [hint] of __VLS_vFor((__VLS_ctx.activeSkillHints))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        key: (hint.id),
        ...{ class: "skill-hint-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['skill-hint-badge']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (hint.text);
    if (hint.valueText) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
        (hint.valueText);
    }
    // @ts-ignore
    [activeSkillHints,];
}
// @ts-ignore
[];
var __VLS_27;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "action-summary" },
});
/** @type {__VLS_StyleScopedClasses['action-summary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.latestDiceText);
if (__VLS_ctx.pendingRoll && !__VLS_ctx.isRolling) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.pendingRoll.message);
}
else if (__VLS_ctx.visibleRoll) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.visibleRoll.message);
}
if (__VLS_ctx.latestSkill.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.latestSkill.map((event) => event.message.replace(/^.*触发技能：/, "")).join("；"));
}
if (__VLS_ctx.shouldShowActionSlots) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "dice-action-slots" },
    });
    /** @type {__VLS_StyleScopedClasses['dice-action-slots']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "slot-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['slot-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.pendingRollDecision?.currentRoll);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "slot-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['slot-grid']} */ ;
    for (const [slot] of __VLS_vFor((__VLS_ctx.actionSlots))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.shouldShowActionSlots))
                        return;
                    __VLS_ctx.confirmActionSlot(slot);
                    // @ts-ignore
                    [visibleRoll, visibleRoll, isRolling, latestDiceText, pendingRoll, pendingRoll, latestSkill, latestSkill, shouldShowActionSlots, pendingRollDecision, actionSlots, confirmActionSlot,];
                } },
            key: (slot.id),
            ...{ class: "dice-action-slot" },
            type: "button",
            ...{ class: ({ enabled: slot.enabled, disabled: !slot.enabled, settling: __VLS_ctx.selectedActionSlot === slot.id && __VLS_ctx.rollRequestLocked }) },
            disabled: (!__VLS_ctx.canUseActionSlots || !slot.enabled),
        });
        /** @type {__VLS_StyleScopedClasses['dice-action-slot']} */ ;
        /** @type {__VLS_StyleScopedClasses['enabled']} */ ;
        /** @type {__VLS_StyleScopedClasses['disabled']} */ ;
        /** @type {__VLS_StyleScopedClasses['settling']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "slot-dice" },
        });
        /** @type {__VLS_StyleScopedClasses['slot-dice']} */ ;
        (__VLS_ctx.pendingRollDecision?.currentRoll);
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.selectedActionSlot === slot.id && __VLS_ctx.rollRequestLocked ? "结算中……" : slot.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (slot.enabled ? slot.description : slot.reason ?? slot.description);
        // @ts-ignore
        [pendingRollDecision, selectedActionSlot, selectedActionSlot, rollRequestLocked, rollRequestLocked, canUseActionSlots,];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.rollWithAnimation) },
    ...{ class: "roll-btn" },
    type: "button",
    disabled: (!__VLS_ctx.canRoll),
});
/** @type {__VLS_StyleScopedClasses['roll-btn']} */ ;
(__VLS_ctx.rollButtonText);
if (__VLS_ctx.me) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "self-panel" },
        ...{ class: ({ active: __VLS_ctx.me.id === __VLS_ctx.activePlayer?.id, dead: __VLS_ctx.me.isDead }) },
    });
    /** @type {__VLS_StyleScopedClasses['self-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    /** @type {__VLS_StyleScopedClasses['dead']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.me))
                    return;
                __VLS_ctx.openPlayerDetail(__VLS_ctx.me);
                // @ts-ignore
                [activePlayer, openPlayerDetail, rollWithAnimation, canRoll, rollButtonText, me, me, me, me,];
            } },
        ...{ class: "self-avatar" },
        type: "button",
        'aria-label': "查看自己详情",
    });
    /** @type {__VLS_StyleScopedClasses['self-avatar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.playerAvatar(__VLS_ctx.me).emoji);
    let __VLS_30;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        name: "emote-bubble",
    }));
    const __VLS_32 = __VLS_31({
        name: "emote-bubble",
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    const { default: __VLS_35 } = __VLS_33.slots;
    if (__VLS_ctx.emoteFor(__VLS_ctx.me)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (__VLS_ctx.emoteFor(__VLS_ctx.me)?.key),
            ...{ class: "emote-bubble" },
        });
        /** @type {__VLS_StyleScopedClasses['emote-bubble']} */ ;
        (__VLS_ctx.emoteFor(__VLS_ctx.me)?.emoji);
    }
    // @ts-ignore
    [playerAvatar, emoteFor, emoteFor, emoteFor, me, me, me, me,];
    var __VLS_33;
    let __VLS_36;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        name: "float-pop",
    }));
    const __VLS_38 = __VLS_37({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    const { default: __VLS_41 } = __VLS_39.slots;
    if (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, 'damage')) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, 'damage')?.key),
            ...{ class: "float-number damage-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['damage-pop']} */ ;
        (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, "damage")?.value);
    }
    // @ts-ignore
    [floatingEffectFor, floatingEffectFor, floatingEffectFor, me, me, me,];
    var __VLS_39;
    let __VLS_42;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
        name: "float-pop",
    }));
    const __VLS_44 = __VLS_43({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    const { default: __VLS_47 } = __VLS_45.slots;
    if (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, 'heal')) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, 'heal')?.key),
            ...{ class: "float-number heal-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['heal-pop']} */ ;
        (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, "heal")?.value);
    }
    // @ts-ignore
    [floatingEffectFor, floatingEffectFor, floatingEffectFor, me, me, me,];
    var __VLS_45;
    let __VLS_48;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
        name: "float-pop",
    }));
    const __VLS_50 = __VLS_49({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const { default: __VLS_53 } = __VLS_51.slots;
    if (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, 'noEffect')) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.floatingEffectFor(__VLS_ctx.me, 'noEffect')?.key),
            ...{ class: "float-number no-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['no-pop']} */ ;
    }
    // @ts-ignore
    [floatingEffectFor, floatingEffectFor, me, me,];
    var __VLS_51;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "self-main" },
    });
    /** @type {__VLS_StyleScopedClasses['self-main']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "self-title" },
    });
    /** @type {__VLS_StyleScopedClasses['self-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.me.nickname);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.characterName(__VLS_ctx.me.characterId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "self-meta" },
    });
    /** @type {__VLS_StyleScopedClasses['self-meta']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.me.hp);
    (__VLS_ctx.me.maxHp);
    if (__VLS_ctx.me.shield > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.me.shield);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.playerStatus(__VLS_ctx.me));
    (__VLS_ctx.selfActionStateText);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.selfSummonerText);
    if (__VLS_ctx.lastRollText(__VLS_ctx.me)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.lastRollText(__VLS_ctx.me));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "self-hp-bar" },
        'aria-label': "自己的血量",
    });
    /** @type {__VLS_StyleScopedClasses['self-hp-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ style: ({ width: `${__VLS_ctx.hpPercent(__VLS_ctx.me)}%` }) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.me))
                    return;
                __VLS_ctx.openPlayerDetail(__VLS_ctx.me);
                // @ts-ignore
                [playerStatus, openPlayerDetail, characterName, lastRollText, lastRollText, me, me, me, me, me, me, me, me, me, me, me, selfActionStateText, selfSummonerText, hpPercent,];
            } },
        ...{ class: "seat-info-btn self-info-btn" },
        type: "button",
        'aria-label': "查看自己详情",
    });
    /** @type {__VLS_StyleScopedClasses['seat-info-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['self-info-btn']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "emote-panel" },
    'aria-label': "固定表情",
});
/** @type {__VLS_StyleScopedClasses['emote-panel']} */ ;
for (const [emote] of __VLS_vFor((__VLS_ctx.EMOTE_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.sendEmote(emote.id);
                // @ts-ignore
                [EMOTE_OPTIONS, sendEmote,];
            } },
        key: (emote.id),
        ...{ class: "emote-btn" },
        type: "button",
        disabled: (__VLS_ctx.emoteLocked),
        title: (emote.label),
    });
    /** @type {__VLS_StyleScopedClasses['emote-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (emote.emoji);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (emote.label);
    // @ts-ignore
    [emoteLocked,];
}
if (__VLS_ctx.room.phase === 'gameOver') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "log-panel rematch-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['log-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['rematch-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "winner" },
    });
    /** @type {__VLS_StyleScopedClasses['winner']} */ ;
    (__VLS_ctx.winner?.nickname);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.readyForRematch) },
        ...{ class: "primary-btn" },
        type: "button",
        disabled: (__VLS_ctx.isRematchReady),
    });
    /** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
    (__VLS_ctx.isRematchReady ? "已准备" : "准备再来一局");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    (__VLS_ctx.rematchReadyIds.length === __VLS_ctx.room.players.length ? "即将返回选职业阶段" : "等待其他玩家准备");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "player-list" },
    });
    /** @type {__VLS_StyleScopedClasses['player-list']} */ ;
    for (const [player, index] of __VLS_vFor((__VLS_ctx.room.players))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            key: (`rematch-${player.id}`),
            ...{ class: "player-card" },
        });
        /** @type {__VLS_StyleScopedClasses['player-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (index + 1);
        (player.nickname);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "badge" },
            ...{ class: ({ 'host-badge': player.id === __VLS_ctx.room.hostId }) },
        });
        /** @type {__VLS_StyleScopedClasses['badge']} */ ;
        /** @type {__VLS_StyleScopedClasses['host-badge']} */ ;
        (__VLS_ctx.rematchReadyIds.includes(player.id) ? "已准备" : "未准备");
        // @ts-ignore
        [room, room, room, room, winner, readyForRematch, isRematchReady, isRematchReady, rematchReadyIds, rematchReadyIds,];
    }
}
if (__VLS_ctx.activeHighlight) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (__VLS_ctx.activeHighlight.id),
        ...{ class: "character-highlight-overlay" },
        ...{ class: (`highlight-${__VLS_ctx.activeHighlight.type}`) },
    });
    /** @type {__VLS_StyleScopedClasses['character-highlight-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "character-highlight-card" },
    });
    /** @type {__VLS_StyleScopedClasses['character-highlight-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.activeHighlight.title);
    if (__VLS_ctx.activeHighlight.valueText) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.activeHighlight.valueText);
    }
}
if (__VLS_ctx.detailPlayer) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closePlayerDetail) },
        ...{ class: "player-detail-backdrop" },
        role: "presentation",
    });
    /** @type {__VLS_StyleScopedClasses['player-detail-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "player-detail-panel" },
        role: "dialog",
        'aria-modal': "true",
        'aria-label': (`${__VLS_ctx.detailPlayer.nickname} 状态详情`),
    });
    /** @type {__VLS_StyleScopedClasses['player-detail-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "player-detail-header" },
    });
    /** @type {__VLS_StyleScopedClasses['player-detail-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "detail-avatar" },
    });
    /** @type {__VLS_StyleScopedClasses['detail-avatar']} */ ;
    (__VLS_ctx.playerAvatar(__VLS_ctx.detailPlayer).emoji);
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.detailPlayer.nickname);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.characterName(__VLS_ctx.detailPlayer.characterId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closePlayerDetail) },
        ...{ class: "detail-close-btn" },
        type: "button",
        'aria-label': "关闭详情",
    });
    /** @type {__VLS_StyleScopedClasses['detail-close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.dl, __VLS_intrinsics.dl)({
        ...{ class: "player-detail-list" },
    });
    /** @type {__VLS_StyleScopedClasses['player-detail-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.detailPlayer.hp);
    (__VLS_ctx.detailPlayer.maxHp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.detailPlayer.shield);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.playerStatus(__VLS_ctx.detailPlayer));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.detailPlayer.isDead ? "已死亡" : "存活");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
    (__VLS_ctx.lastRollText(__VLS_ctx.detailPlayer) || "暂无");
    if (__VLS_ctx.zhaoZilongHitText(__VLS_ctx.detailPlayer)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
        (__VLS_ctx.zhaoZilongHitText(__VLS_ctx.detailPlayer));
    }
    if (__VLS_ctx.characterFor(__VLS_ctx.detailPlayer.characterId)?.description?.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.dt, __VLS_intrinsics.dt)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.dd, __VLS_intrinsics.dd)({});
        (__VLS_ctx.characterFor(__VLS_ctx.detailPlayer.characterId)?.description.join("；"));
    }
}
if (__VLS_ctx.showRuleGuide) {
    const __VLS_54 = RuleGuideDialog;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
        ...{ 'onClose': {} },
        characters: (__VLS_ctx.characters),
    }));
    const __VLS_56 = __VLS_55({
        ...{ 'onClose': {} },
        characters: (__VLS_ctx.characters),
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    let __VLS_59;
    const __VLS_60 = {
        ...{ close: {} },
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.showRuleGuide))
                return;
            __VLS_ctx.showRuleGuide = false;
            // @ts-ignore
            [showRuleGuide, showRuleGuide, playerStatus, playerAvatar, characterName, lastRollText, zhaoZilongHitText, zhaoZilongHitText, activeHighlight, activeHighlight, activeHighlight, activeHighlight, activeHighlight, activeHighlight, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, detailPlayer, closePlayerDetail, closePlayerDetail, characterFor, characterFor, characters,];
        },
    };
    var __VLS_57;
    var __VLS_58;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
