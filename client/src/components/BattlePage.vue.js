import { computed, onUnmounted, ref, watch } from "vue";
import { socket } from "../socket";
const props = defineProps();
const emit = defineEmits();
const MAX_RENDERED_LOG = 50;
const displayedRoom = ref(cloneRoomForDisplay(props.room));
const pendingRoom = ref(null);
const room = computed(() => displayedRoom.value);
const rollPhase = ref("idle");
const rollingDice = ref(1);
const visibleRollId = ref(getLatestRoll(props.room)?.id);
const pendingRevealRollId = ref();
let rollingTimer;
const timers = [];
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
onUnmounted(clearRollTimers);
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
    return isMyTurn.value ? "投骰开怼" : "等待对手";
});
const canRoll = computed(() => {
    if (room.value.phase === "gameOver" || isRolling.value || !isMyTurn.value)
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
    return latestDamage.value?.targetId === player.id && (latestDamage.value.damage ?? 0) > 0;
}
function isRecentHealTarget(player) {
    return latestHeal.value?.playerId === player.id && (latestHeal.value.healing ?? 0) > 0;
}
function isNoDamageTarget(player) {
    return latestDamage.value?.targetId === player.id && (latestDamage.value.damage ?? 0) === 0;
}
function rollWithAnimation() {
    if (!canRoll.value)
        return;
    startRollAnimation(true);
    emit("rollDice");
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
}
function revealServerRoll() {
    const revealRoom = pendingRoom.value ?? cloneRoomForDisplay(props.room);
    const revealRollId = pendingRevealRollId.value ?? getLatestRoll(revealRoom)?.id;
    if (!revealRollId || revealRollId === visibleRollId.value)
        return;
    displayedRoom.value = revealRoom;
    visibleRollId.value = revealRollId;
    pendingRoom.value = null;
    pendingRevealRollId.value = undefined;
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
function randomDice() {
    return Math.floor(Math.random() * 6) + 1;
}
function getLatestRoll(targetRoom) {
    return targetRoom.battleLog.find((event) => event.type === "roll");
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
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        name: "float-pop",
    }));
    const __VLS_2 = __VLS_1({
        name: "float-pop",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    if (__VLS_ctx.isRecentDamageTarget(player)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.latestDamage?.id),
            ...{ class: "float-number damage-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['damage-pop']} */ ;
        (__VLS_ctx.latestDamage?.damage);
    }
    // @ts-ignore
    [room, room, room, room, activePlayer, activePlayer, winner, pendingRoll, pendingRoll, isMyTurn, isMyTurn, playerId, selectedTargetId, isRecentDamageTarget, isRecentDamageTarget, isRecentHealTarget, isNoDamageTarget, characterName, playerStatus, hpPercent, latestDamage, latestDamage,];
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
    if (__VLS_ctx.isRecentHealTarget(player)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.latestHeal?.id),
            ...{ class: "float-number heal-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['heal-pop']} */ ;
        (__VLS_ctx.latestHeal?.healing);
    }
    // @ts-ignore
    [isRecentHealTarget, latestHeal, latestHeal,];
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
    if (__VLS_ctx.isNoDamageTarget(player)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
            key: (__VLS_ctx.latestDamage?.id),
            ...{ class: "float-number no-pop" },
        });
        /** @type {__VLS_StyleScopedClasses['float-number']} */ ;
        /** @type {__VLS_StyleScopedClasses['no-pop']} */ ;
    }
    // @ts-ignore
    [isNoDamageTarget, latestDamage,];
    var __VLS_15;
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
        [room, room, room, room, winner, pendingRoll, pendingRoll, latestDamage, latestDamage, latestHeal, latestHeal, visibleRoll, visibleRoll, isRolling, latestDiceText, latestSkill, latestSkill, rollWithAnimation, canRoll, rollButtonText, readyForRematch, isRematchReady, isRematchReady, rematchReadyIds, rematchReadyIds,];
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
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
