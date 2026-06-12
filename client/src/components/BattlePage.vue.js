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
const aliveEnemies = computed(() => room.value.players.filter((player) => !player.isDead && player.id !== props.playerId));
const winner = computed(() => room.value.players.find((player) => player.id === room.value.winnerId));
const pendingRoll = computed(() => room.value.pendingRoll);
const isPendingMine = computed(() => pendingRoll.value?.playerId === props.playerId);
const isRolling = computed(() => rollPhase.value !== "idle" && rollPhase.value !== "reveal");
const rematchReadyIds = computed(() => room.value.rematchReadyPlayerIds ?? []);
const isRematchReady = computed(() => rematchReadyIds.value.includes(props.playerId));
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
const latestDamage = computed(() => latestActionEvents.value.find((event) => event.type === "damage"));
const latestHeal = computed(() => latestActionEvents.value.find((event) => event.type === "heal"));
const latestSkill = computed(() => latestActionEvents.value.filter((event) => event.type === "skill"));
const latestShownEvent = computed(() => room.value.battleLog[0]);
const renderedBattleLog = computed(() => room.value.battleLog.slice(0, MAX_RENDERED_LOG));
const latestDiceText = computed(() => {
    if (isRolling.value)
        return pendingRoll.value?.message ?? "";
    const dice = visibleRoll.value?.dice ?? [];
    if (dice.length === 0)
        return pendingRoll.value?.message ?? "等待投骰";
    return `投出了 ${dice.join("、")} 点`;
});
const rollButtonText = computed(() => {
    if (isRolling.value)
        return "摇骰中...";
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
    if (pendingRoll.value && isPendingMine.value)
        return "技能触发：请继续投骰";
    if (!isMyTurn.value)
        return `等待【${activePlayer.value?.nickname ?? "玩家"}】行动`;
    if (!selectedTargetId.value)
        return "轮到你了：请选择攻击目标";
    return "轮到你了：点击投骰";
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
    if (room.value.phase === "gameOver" || rollRequestLocked.value || isRolling.value || !isMyTurn.value)
        return false;
    if (pendingRoll.value)
        return isPendingMine.value;
    return Boolean(selectedTargetId.value) && aliveEnemies.value.length > 0;
});
function characterName(id) {
    return props.characters.find((character) => character.id === id)?.name ?? "未知职业";
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
    if (room.value.effects.some((effect) => effect.type === "invincible"))
        return "无敌";
    return "待机";
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
    animatedRollIds.add(rollId);
    activeFloatingEffects.value = collectFloatingEffects(rollId);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "battle-layout" },
});
/** @type {__VLS_StyleScopedClasses['battle-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "battle-header" },
});
/** @type {__VLS_StyleScopedClasses['battle-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.room.id);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.activePlayer?.nickname ?? "等待中");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.room.phase === "gameOver" ? `${__VLS_ctx.winner?.nickname ?? ""} 获胜` : __VLS_ctx.pendingRoll ? "等待继续" : __VLS_ctx.isMyTurn ? "轮到你" : "观战中");
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "battle-tools" },
});
/** @type {__VLS_StyleScopedClasses['battle-tools']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showRuleGuide = true;
            // @ts-ignore
            [room, room, activePlayer, winner, pendingRoll, isMyTurn, showRuleGuide,];
        } },
    ...{ class: "ghost-btn small-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "turn-guide" },
    ...{ class: (`turn-guide-${__VLS_ctx.turnGuideTone}`) },
    'aria-live': "polite",
});
/** @type {__VLS_StyleScopedClasses['turn-guide']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.turnGuideText);
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "combat-board" },
});
/** @type {__VLS_StyleScopedClasses['combat-board']} */ ;
for (const [player, index] of __VLS_vFor((__VLS_ctx.room.players))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        key: (player.id),
        ...{ class: "player-card battle-card" },
        ...{ class: ({
                active: player.id === __VLS_ctx.activePlayer?.id,
                dead: player.isDead,
                selectable: __VLS_ctx.isMyTurn && !__VLS_ctx.pendingRoll && player.id !== __VLS_ctx.playerId && !player.isDead,
                selected: __VLS_ctx.selectedTargetId === player.id,
                hit: __VLS_ctx.isRecentDamageTarget(player),
                healed: __VLS_ctx.isRecentHealTarget(player),
                blocked: __VLS_ctx.isNoDamageTarget(player)
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['player-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['battle-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    /** @type {__VLS_StyleScopedClasses['dead']} */ ;
    /** @type {__VLS_StyleScopedClasses['selectable']} */ ;
    /** @type {__VLS_StyleScopedClasses['selected']} */ ;
    /** @type {__VLS_StyleScopedClasses['hit']} */ ;
    /** @type {__VLS_StyleScopedClasses['healed']} */ ;
    /** @type {__VLS_StyleScopedClasses['blocked']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-title" },
    });
    /** @type {__VLS_StyleScopedClasses['card-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (index + 1);
    (player.nickname);
    if (player.id === __VLS_ctx.room.hostId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "host-mark" },
        });
        /** @type {__VLS_StyleScopedClasses['host-mark']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.characterName(player.characterId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "status-pill" },
    });
    /** @type {__VLS_StyleScopedClasses['status-pill']} */ ;
    (__VLS_ctx.playerStatus(player));
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
    [room, room, activePlayer, pendingRoll, isMyTurn, turnGuideTone, turnGuideText, playerId, selectedTargetId, isRecentDamageTarget, isRecentHealTarget, isNoDamageTarget, characterName, playerStatus, emoteFor, emoteFor, emoteFor,];
    var __VLS_3;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hp-row" },
    });
    /** @type {__VLS_StyleScopedClasses['hp-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (player.hp);
    (player.maxHp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (player.shield);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hp-bar" },
        'aria-label': "血量",
    });
    /** @type {__VLS_StyleScopedClasses['hp-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ style: ({ width: `${__VLS_ctx.hpPercent(player)}%` }) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "shield-bar" },
        'aria-label': "护盾",
    });
    /** @type {__VLS_StyleScopedClasses['shield-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ style: ({ width: `${Math.min(100, player.shield * 8)}%` }) },
    });
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
    [hpPercent, floatingEffectFor, floatingEffectFor, floatingEffectFor,];
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
    if (__VLS_ctx.isMyTurn && !__VLS_ctx.pendingRoll && player.id !== __VLS_ctx.playerId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.isMyTurn && !__VLS_ctx.pendingRoll && player.id !== __VLS_ctx.playerId))
                        return;
                    __VLS_ctx.emit('selectTarget', player.id);
                    // @ts-ignore
                    [pendingRoll, isMyTurn, playerId, emit,];
                } },
            ...{ class: "target-btn" },
            type: "button",
            disabled: (player.isDead),
        });
        /** @type {__VLS_StyleScopedClasses['target-btn']} */ ;
        (__VLS_ctx.selectedTargetId === player.id ? "目标锁定" : "选择攻击");
    }
    // @ts-ignore
    [selectedTargetId,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "dice-panel" },
    ...{ class: ({ ready: __VLS_ctx.isMyTurn, rolling: __VLS_ctx.rollPhase === 'fast', slowing: __VLS_ctx.rollPhase === 'slow', paused: __VLS_ctx.rollPhase === 'pause', reveal: __VLS_ctx.rollPhase === 'reveal', rolled: __VLS_ctx.visibleRoll }) },
});
/** @type {__VLS_StyleScopedClasses['dice-panel']} */ ;
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
if (__VLS_ctx.latestDamage) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.latestDamage.damage ?? 0);
}
if (__VLS_ctx.latestHeal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.latestHeal.healing ?? 0);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.rollWithAnimation) },
    ...{ class: "roll-btn" },
    type: "button",
    disabled: (!__VLS_ctx.canRoll),
});
/** @type {__VLS_StyleScopedClasses['roll-btn']} */ ;
(__VLS_ctx.rollButtonText);
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
                [pendingRoll, pendingRoll, visibleRoll, visibleRoll, isRolling, latestDiceText, latestSkill, latestSkill, latestDamage, latestDamage, latestHeal, latestHeal, rollWithAnimation, canRoll, rollButtonText, EMOTE_OPTIONS, sendEmote,];
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
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "log-panel battle-log" },
});
/** @type {__VLS_StyleScopedClasses['log-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['battle-log']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "log-title" },
});
/** @type {__VLS_StyleScopedClasses['log-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
if (__VLS_ctx.latestShownEvent) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.latestShownEvent.message);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.ol, __VLS_intrinsics.ol)({});
for (const [event, index] of __VLS_vFor((__VLS_ctx.renderedBattleLog))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
        key: (event.id),
        ...{ class: ({ newest: index === 0 }) },
    });
    /** @type {__VLS_StyleScopedClasses['newest']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.time, __VLS_intrinsics.time)({});
    (new Date(event.createdAt).toLocaleTimeString());
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (event.message);
    // @ts-ignore
    [latestShownEvent, latestShownEvent, renderedBattleLog,];
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
if (__VLS_ctx.showRuleGuide) {
    const __VLS_30 = RuleGuideDialog;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        ...{ 'onClose': {} },
        characters: (__VLS_ctx.characters),
    }));
    const __VLS_32 = __VLS_31({
        ...{ 'onClose': {} },
        characters: (__VLS_ctx.characters),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    let __VLS_35;
    const __VLS_36 = {
        ...{ close: {} },
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.showRuleGuide))
                return;
            __VLS_ctx.showRuleGuide = false;
            // @ts-ignore
            [showRuleGuide, showRuleGuide, activeHighlight, activeHighlight, activeHighlight, activeHighlight, activeHighlight, activeHighlight, characters,];
        },
    };
    var __VLS_33;
    var __VLS_34;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
