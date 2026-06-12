import { computed } from "vue";
const props = defineProps();
const emit = defineEmits();
const me = computed(() => props.room.players.find((player) => player.id === props.playerId));
const isHost = computed(() => props.room.hostId === props.playerId);
const canStart = computed(() => props.room.players.length >= 2 && props.room.players.every((player) => player.characterId));
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}?room=${props.room.id}`);
async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink.value);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "room-code" },
});
/** @type {__VLS_StyleScopedClasses['room-code']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.room.id);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.copyInviteLink) },
    ...{ class: "secondary-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.room.players.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "player-list" },
});
/** @type {__VLS_StyleScopedClasses['player-list']} */ ;
for (const [player, index] of __VLS_vFor((__VLS_ctx.room.players))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        key: (player.id),
        ...{ class: "player-card" },
    });
    /** @type {__VLS_StyleScopedClasses['player-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (index + 1);
    (player.nickname);
    if (player.id === __VLS_ctx.room.hostId || player.isHost) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "badge host-badge" },
        });
        /** @type {__VLS_StyleScopedClasses['badge']} */ ;
        /** @type {__VLS_StyleScopedClasses['host-badge']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "badge" },
        ...{ class: ({ offline: !player.isOnline }) },
    });
    /** @type {__VLS_StyleScopedClasses['badge']} */ ;
    /** @type {__VLS_StyleScopedClasses['offline']} */ ;
    (player.isOnline ? "在线" : "离线");
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.characters.find((item) => item.id === player.characterId)?.name ?? "未选择职业");
    // @ts-ignore
    [room, room, room, room, copyInviteLink, characters,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "character-grid" },
});
/** @type {__VLS_StyleScopedClasses['character-grid']} */ ;
for (const [character] of __VLS_vFor((__VLS_ctx.characters))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.emit('chooseCharacter', character.id);
                // @ts-ignore
                [characters, emit,];
            } },
        key: (character.id),
        ...{ class: "character-choice" },
        ...{ class: ({ selected: __VLS_ctx.me?.characterId === character.id }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['character-choice']} */ ;
    /** @type {__VLS_StyleScopedClasses['selected']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (character.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (character.maxHp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (character.description.join("；"));
    // @ts-ignore
    [me,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('startGame');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "primary-btn" },
    type: "button",
    disabled: (!__VLS_ctx.isHost || !__VLS_ctx.canStart),
});
/** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
(__VLS_ctx.isHost ? "开始游戏" : "等待房主开始");
if (__VLS_ctx.isHost && !__VLS_ctx.canStart) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
}
// @ts-ignore
[isHost, isHost, isHost, canStart, canStart,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
