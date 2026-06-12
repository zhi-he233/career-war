import { computed, onMounted, ref } from "vue";
const props = defineProps();
const emit = defineEmits();
const nickname = ref(localStorage.getItem("career-war-nickname") ?? "");
const roomId = ref("");
const inviteRoomId = ref("");
const isInviteMode = computed(() => Boolean(inviteRoomId.value));
onMounted(() => {
    const query = new URLSearchParams(window.location.search);
    const queryRoomId = props.inviteRoomId ?? query.get("room") ?? query.get("roomId") ?? "";
    if (queryRoomId) {
        inviteRoomId.value = queryRoomId.toUpperCase().slice(0, 4);
        roomId.value = inviteRoomId.value;
    }
    emit("refreshRoomList");
});
function rememberName() {
    localStorage.setItem("career-war-nickname", nickname.value.trim());
}
function createRoom() {
    rememberName();
    emit("createRoom", nickname.value);
}
function joinRoom() {
    rememberName();
    emit("joinRoom", { nickname: nickname.value, roomId: roomId.value });
}
function selectRoom(room) {
    if (!room.canJoin)
        return;
    roomId.value = room.roomId;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "page-panel" },
});
/** @type {__VLS_StyleScopedClasses['page-panel']} */ ;
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
                if (!!(__VLS_ctx.isInviteMode))
                    return;
                __VLS_ctx.emit('refreshRoomList');
                // @ts-ignore
                [nickname, isInviteMode, isInviteMode, isInviteMode, createRoom, inviteRoomId, joinRoom, emit,];
            } },
        ...{ class: "ghost-btn small-btn" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
    if (props.roomList.length === 0) {
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
        for (const [room] of __VLS_vFor((props.roomList))) {
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
                        if (!!(__VLS_ctx.isInviteMode))
                            return;
                        if (!!(props.roomList.length === 0))
                            return;
                        __VLS_ctx.selectRoom(room);
                        // @ts-ignore
                        [phaseLabel, selectRoom,];
                    } },
                ...{ class: "secondary-btn small-btn" },
                type: "button",
                disabled: (!room.canJoin),
            });
            /** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['small-btn']} */ ;
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
// @ts-ignore
[joinRoom, roomId,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
