import { computed } from "vue";
const props = defineProps();
const emit = defineEmits();
const RULE_SECTIONS = [
    {
        title: "基础规则",
        items: [
            "服务器负责投骰和结算，前端只显示。",
            "如果职业没有特殊说明，默认投到几点造成几点伤害。",
            "血量小于等于 0 时死亡。",
            "死亡玩家跳过行动。",
            "护盾优先扣除，除非技能写明无视护盾。",
            "一回合指从该角色本次行动开始，到该角色下一次行动开始之前。",
            "再投一次效果由玩家自己点击继续投骰。"
        ]
    },
    {
        title: "护盾规则",
        items: ["护盾优先扣除，除非技能写明无视护盾。", "受到伤害时先消耗护盾，剩余伤害再扣血。"]
    },
    {
        title: "无敌规则",
        items: ["无敌生效时，本次伤害为 0。", "无敌持续时间以具体职业说明为准。"]
    },
    {
        title: "死亡规则",
        items: ["血量小于等于 0 时死亡。", "死亡玩家跳过行动，不能再被选择为攻击目标。"]
    },
    {
        title: "再投一次规则",
        items: ["再投一次效果由玩家自己点击继续投骰。", "继续投骰的结果仍由服务器结算，前端只显示。"]
    }
];
const implementedCharacters = computed(() => props.characters.filter((character) => character.isImplemented !== false && !character.isHidden));
function characterDescription(character) {
    return character.fullDescription?.length ? character.fullDescription : character.description;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('close');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "rule-guide-backdrop" },
});
/** @type {__VLS_StyleScopedClasses['rule-guide-backdrop']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "rule-guide-dialog" },
    role: "dialog",
    'aria-modal': "true",
    'aria-label': "规则 / 职业说明",
});
/** @type {__VLS_StyleScopedClasses['rule-guide-dialog']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "rule-guide-header" },
});
/** @type {__VLS_StyleScopedClasses['rule-guide-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('close');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "detail-close-btn" },
    type: "button",
    'aria-label': "关闭",
});
/** @type {__VLS_StyleScopedClasses['detail-close-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "rule-guide-body" },
});
/** @type {__VLS_StyleScopedClasses['rule-guide-body']} */ ;
for (const [section] of __VLS_vFor((__VLS_ctx.RULE_SECTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        key: (section.title),
        ...{ class: "rule-section" },
    });
    /** @type {__VLS_StyleScopedClasses['rule-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    (section.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({});
    for (const [item] of __VLS_vFor((section.items))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (item),
        });
        (item);
        // @ts-ignore
        [RULE_SECTIONS,];
    }
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "rule-section" },
});
/** @type {__VLS_StyleScopedClasses['rule-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "rule-character-list" },
});
/** @type {__VLS_StyleScopedClasses['rule-character-list']} */ ;
for (const [character] of __VLS_vFor((__VLS_ctx.implementedCharacters))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        key: (character.id),
        ...{ class: "rule-character-card" },
    });
    /** @type {__VLS_StyleScopedClasses['rule-character-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "rule-character-title" },
    });
    /** @type {__VLS_StyleScopedClasses['rule-character-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (character.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (character.maxHp);
    if (character.shortDescription) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (character.shortDescription);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({});
    for (const [item] of __VLS_vFor((__VLS_ctx.characterDescription(character)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (item),
        });
        (item);
        // @ts-ignore
        [implementedCharacters, characterDescription,];
    }
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
    ...{ class: "rule-guide-footer" },
});
/** @type {__VLS_StyleScopedClasses['rule-guide-footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('close');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "primary-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
