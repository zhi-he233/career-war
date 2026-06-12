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
                [nickname, isInviteMode, isInviteMode, isInviteMode, createRoom, inviteRoomId, joinRoom, roomId, roomId,];
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
