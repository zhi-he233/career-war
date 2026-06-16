import { computed, onMounted, ref } from "vue";
const props = defineProps();
const emit = defineEmits();
const nickname = ref(localStorage.getItem("career-war-nickname") ?? "");
const roomId = ref("");
const inviteRoomId = ref("");
const selectedMode = ref(null);
const isInviteMode = computed(() => Boolean(inviteRoomId.value));
const visibleRoomList = computed(() => props.roomList.filter((room) => isRoomVisibleForSelectedMode(room)));
const selectedModeTitle = computed(() => selectedMode.value === "duo_2v2" ? "2V2 双角色房间" : "经典对战房间");
onMounted(() => {
    const query = new URLSearchParams(window.location.search);
    const queryRoomId = props.inviteRoomId ?? query.get("room") ?? query.get("roomId") ?? "";
    if (queryRoomId) {
        inviteRoomId.value = queryRoomId.toUpperCase().slice(0, 4);
        roomId.value = inviteRoomId.value;
        selectedMode.value = "classic";
    }
});
function openClassicMode() {
    selectedMode.value = "classic";
    emit("refreshRoomList");
}
function openDuoMode() {
    selectedMode.value = "duo_2v2";
    emit("refreshRoomList");
}
function backToModeSelect() {
    selectedMode.value = null;
}
function rememberName() {
    localStorage.setItem("career-war-nickname", nickname.value.trim());
}
function createRoom() {
    if (!selectedMode.value)
        return;
    rememberName();
    emit("createRoom", { nickname: nickname.value, gameMode: selectedMode.value });
}
function joinRoom() {
    if (!selectedMode.value)
        return;
    rememberName();
    emit("joinRoom", { nickname: nickname.value, roomId: roomId.value, gameMode: selectedMode.value });
}
function selectRoom(room) {
    if (!room.canJoin || !selectedMode.value)
        return;
    roomId.value = room.roomId;
    rememberName();
    emit("joinRoom", { nickname: nickname.value, roomId: room.roomId, gameMode: selectedMode.value });
}
function isRoomVisibleForSelectedMode(room) {
    if (selectedMode.value === "classic")
        return room.gameMode === undefined || room.gameMode === "classic";
    return room.gameMode === selectedMode.value;
}
function phaseLabel(phase) {
    if (phase === "waiting")
        return "等待中";
    if (phase === "playing")
        return "游戏中";
    return "已结束";
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
/** @type {__VLS_StyleScopedClasses['pvp-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-status']} */ ;
/** @type {__VLS_StyleScopedClasses['pvp-mode-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "pvp-page" },
});
/** @type {__VLS_StyleScopedClasses['pvp-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "pvp-heading" },
});
/** @type {__VLS_StyleScopedClasses['pvp-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('backHome');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "ghost-btn small-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
if (__VLS_ctx.selectedMode === null) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pvp-mode-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['pvp-mode-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.openClassicMode) },
        ...{ class: "pvp-mode-card available" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['available']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mode-status ready" },
    });
    /** @type {__VLS_StyleScopedClasses['mode-status']} */ ;
    /** @type {__VLS_StyleScopedClasses['ready']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.openDuoMode) },
        ...{ class: "pvp-mode-card available" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['pvp-mode-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['available']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "mode-status ready" },
    });
    /** @type {__VLS_StyleScopedClasses['mode-status']} */ ;
    /** @type {__VLS_StyleScopedClasses['ready']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "page-panel pvp-room-flow" },
    });
    /** @type {__VLS_StyleScopedClasses['page-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['pvp-room-flow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.selectedModeTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.backToModeSelect) },
        ...{ class: "ghost-btn small-btn" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "field" },
    });
    /** @type {__VLS_StyleScopedClasses['field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        maxlength: "12",
        placeholder: "输入你的昵称",
    });
    (__VLS_ctx.nickname);
    if (!__VLS_ctx.isInviteMode) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.createRoom) },
            ...{ class: "primary-btn" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
    }
    if (!__VLS_ctx.isInviteMode) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "divider" },
        });
        /** @type {__VLS_StyleScopedClasses['divider']} */ ;
    }
    if (__VLS_ctx.isInviteMode) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "room-code" },
        });
        /** @type {__VLS_StyleScopedClasses['room-code']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.inviteRoomId);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.joinRoom) },
            ...{ class: "secondary-btn" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "room-list-panel" },
        });
        /** @type {__VLS_StyleScopedClasses['room-list-panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "section-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.selectedMode === null))
                        return;
                    if (!!(__VLS_ctx.isInviteMode))
                        return;
                    __VLS_ctx.emit('refreshRoomList');
                    // @ts-ignore
                    [emit, selectedMode, openClassicMode, openDuoMode, selectedModeTitle, backToModeSelect, nickname, isInviteMode, isInviteMode, isInviteMode, createRoom, inviteRoomId, joinRoom,];
                } },
            ...{ class: "ghost-btn small-btn" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
        if (__VLS_ctx.visibleRoomList.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "empty-state" },
            });
            /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "room-list" },
            });
            /** @type {__VLS_StyleScopedClasses['room-list']} */ ;
            for (const [room] of __VLS_vFor((__VLS_ctx.visibleRoomList))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                    key: (room.roomId),
                    ...{ class: "public-room-card" },
                });
                /** @type {__VLS_StyleScopedClasses['public-room-card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (room.roomId);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
                (room.hostName);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "room-meta" },
                });
                /** @type {__VLS_StyleScopedClasses['room-meta']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (room.playerCount);
                (room.maxPlayers);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (__VLS_ctx.phaseLabel(room.phase));
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.selectedMode === null))
                                return;
                            if (!!(__VLS_ctx.isInviteMode))
                                return;
                            if (!!(__VLS_ctx.visibleRoomList.length === 0))
                                return;
                            __VLS_ctx.selectRoom(room);
                            // @ts-ignore
                            [visibleRoomList, visibleRoomList, phaseLabel, selectRoom,];
                        } },
                    ...{ class: "secondary-btn small-btn" },
                    type: "button",
                    disabled: (!room.canJoin),
                });
                /** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
                (room.canJoin ? "加入" : room.playerCount >= room.maxPlayers ? "已满" : "不可加入");
                // @ts-ignore
                [];
            }
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "field" },
        });
        /** @type {__VLS_StyleScopedClasses['field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!!(__VLS_ctx.selectedMode === null))
                        return;
                    if (!!(__VLS_ctx.isInviteMode))
                        return;
                    __VLS_ctx.roomId = __VLS_ctx.roomId.toUpperCase();
                    // @ts-ignore
                    [roomId, roomId,];
                } },
            maxlength: "4",
            placeholder: "例如 A8K2",
        });
        (__VLS_ctx.roomId);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.joinRoom) },
            ...{ class: "secondary-btn" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
    }
}
// @ts-ignore
[joinRoom, roomId,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
