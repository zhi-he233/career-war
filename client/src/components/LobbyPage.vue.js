import { computed, ref } from "vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";
const props = defineProps();
const emit = defineEmits();
const FILTERS = [
    { id: "all", label: "全部" },
    { id: "newbie", label: "新手推荐" },
    { id: "attack", label: "攻击" },
    { id: "defense", label: "防御" },
    { id: "healing", label: "治疗" },
    { id: "burst", label: "爆发" },
    { id: "special", label: "特殊" }
];
const DIFFICULTY_LABELS = {
    simple: "简单",
    normal: "普通",
    complex: "复杂",
    expert: "高手"
};
const ROLE_LABELS = {
    attack: "攻击",
    defense: "防御",
    healing: "治疗",
    burst: "爆发",
    special: "特殊"
};
const MAX_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8];
const DEFAULT_ROOM_SETTINGS = {
    maxPlayers: 8,
    allowDuplicateCharacters: true,
    gameMode: "classic"
};
const SUMMONER_SKILLS = [
    { id: "lucky_plus_one", name: "幸运骰", description: "投后让本次主骰 +1，最高 6。开局预冷却：2 次自己的行动。使用后冷却：3 次自己的行动。" },
    { id: "first_aid", name: "急救术", description: "本次不攻击，改为回复自己等于骰点的血量。冷却：3 次自己的行动。" },
    { id: "iron_wall", name: "铁壁", description: "本次不攻击，改为获得等于骰点的护盾。冷却：3 次自己的行动。" },
    { id: "fate_reroll", name: "命运重掷", description: "服务器重新投一次主骰，必须接受新骰点。冷却：3 次自己的行动。" },
    { id: "last_stand", name: "破釜", description: "攻击伤害行动可用，最终伤害 +2，自己受 2 点反噬。冷却：3 次自己的行动。" }
];
const LOCKED_CHARACTERS = [
    {
        id: "warKnight",
        name: "战争骑士",
        maxHp: 20,
        description: ["未开放"],
        difficulty: "complex",
        role: "attack",
        tags: ["攻击", "未开放"],
        shortDescription: "攻守节奏型职业，后续版本开放。",
        isImplemented: false
    },
    {
        id: "priest",
        name: "牧师",
        maxHp: 18,
        description: ["未开放"],
        difficulty: "normal",
        role: "healing",
        tags: ["治疗", "未开放"],
        shortDescription: "团队治疗型职业，后续版本开放。",
        isImplemented: false
    },
    {
        id: "shenNong",
        name: "神农氏",
        maxHp: 18,
        description: ["未开放"],
        difficulty: "complex",
        role: "special",
        tags: ["治疗", "特殊", "未开放"],
        shortDescription: "药草与恢复相关的特殊职业，后续版本开放。",
        isImplemented: false
    },
    {
        id: "counterflow",
        name: "逆流",
        maxHp: 16,
        description: ["未开放"],
        difficulty: "expert",
        role: "special",
        tags: ["特殊", "高手", "未开放"],
        shortDescription: "反转局势型职业，后续版本开放。",
        isImplemented: false
    }
];
const activeFilter = ref("all");
const searchKeyword = ref("");
const selectedCharacter = ref(null);
const showRuleGuide = ref(false);
const me = computed(() => props.room.players.find((player) => player.id === props.playerId));
const isHost = computed(() => props.room.hostId === props.playerId);
const roomSettings = computed(() => ({ ...DEFAULT_ROOM_SETTINGS, ...(props.room.settings ?? {}) }));
const roomMode = computed(() => props.room.gameMode ?? roomSettings.value.gameMode ?? "classic");
const isDuoModeDevelopment = computed(() => roomMode.value === "duo_2v2");
const isPveMode = computed(() => roomMode.value === "pve_1v1");
const isRogueliteMode = computed(() => roomMode.value === "pve_roguelite");
const isSinglePlayerPveMode = computed(() => isPveMode.value || isRogueliteMode.value);
const duoSlots = computed(() => props.room.duoSlots ?? []);
const duoTeams = computed(() => [
    { id: "A", label: "A 队", player: props.room.players[0] },
    { id: "B", label: "B 队", player: props.room.players[1] }
]);
const selectedSummonerSkill = computed(() => SUMMONER_SKILLS.find((skill) => skill.id === (me.value?.summonerSkillId ?? "lucky_plus_one")) ?? SUMMONER_SKILLS[0]);
const isDuoReadyToStart = computed(() => props.room.players.length === 2 && duoSlots.value.length === 4 && duoSlots.value.every((slot) => isDuoSlotCharacterReady(slot) && isDuoSlotSummonerSkillReady(slot)) && !hasDuplicateCharacterConflict.value);
const canStart = computed(() => {
    if (isDuoModeDevelopment.value)
        return isDuoReadyToStart.value;
    if (isSinglePlayerPveMode.value)
        return Boolean(me.value?.characterId && me.value?.summonerSkillId);
    return props.room.players.length >= 2 && props.room.players.every(isClassicPlayerReady) && !hasDuplicateCharacterConflict.value;
});
const hasDuplicateCharacterConflict = computed(() => !roomSettings.value.allowDuplicateCharacters && (isDuoModeDevelopment.value ? duoDuplicateCharacterIds.value.size > 0 : duplicateCharacterIds.value.size > 0));
const duplicateCharacterIds = computed(() => {
    const counts = new Map();
    for (const player of props.room.players) {
        if (!player.characterId)
            continue;
        counts.set(player.characterId, (counts.get(player.characterId) ?? 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([characterId]) => characterId));
});
const duoDuplicateCharacterIds = computed(() => {
    const counts = new Map();
    for (const slot of duoSlots.value) {
        if (!slot.characterId)
            continue;
        counts.set(slot.characterId, (counts.get(slot.characterId) ?? 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([characterId]) => characterId));
});
const startHint = computed(() => {
    if (isDuoModeDevelopment.value && hasDuplicateCharacterConflict.value)
        return "当前设置不允许重复职业，请重新选择 2V2 槽位。";
    if (isDuoModeDevelopment.value && props.room.players.length !== 2)
        return "2V2 需要 2 名玩家后才能开始。";
    if (isDuoModeDevelopment.value && !isDuoReadyToStart.value)
        return "请完成 4 个角色槽位和召唤师技能选择。";
    if (isDuoModeDevelopment.value)
        return "将进入 2V2 双角色测试版：每名玩家控制两个角色进行战斗。";
    if (isSinglePlayerPveMode.value && !me.value?.characterId)
        return "请选择 1 个职业。";
    if (isSinglePlayerPveMode.value && !me.value?.summonerSkillId)
        return "请选择 1 个召唤师技能。";
    if (isRogueliteMode.value)
        return `准备开始肉鸽挑战：连续 3 关，${characterName(me.value?.characterId)} vs AI`;
    if (isPveMode.value)
        return `准备开始人机练习：${characterName(me.value?.characterId)} vs AI`;
    if (hasDuplicateCharacterConflict.value)
        return "当前已有重复职业，请玩家重新选择。";
    if (!canStart.value)
        return "至少 2 人，且所有玩家都选择职业后可开始。";
    return `当前选择：${characterName(me.value?.characterId)}`;
});
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}?room=${props.room.id}`);
const visibleCharacters = computed(() => [...props.characters, ...LOCKED_CHARACTERS].filter((character) => !character.isHidden));
const filteredCharacters = computed(() => visibleCharacters.value.filter((character) => matchesFilter(character) && matchesSearch(character)));
const randomCandidates = computed(() => filteredCharacters.value.filter(isSelectableCharacter));
const visibleMaxPlayers = computed(() => (isDuoModeDevelopment.value ? 2 : isSinglePlayerPveMode.value ? 1 : roomSettings.value.maxPlayers));
const selectableMaxPlayerOptions = computed(() => (isDuoModeDevelopment.value ? [2] : isSinglePlayerPveMode.value ? [1] : MAX_PLAYER_OPTIONS).map((count) => ({ count, disabled: count < props.room.players.length })));
async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink.value);
}
function confirmCharacterChoice() {
    const character = selectedCharacter.value;
    if (!character || !isSelectableCharacter(character))
        return;
    emit("chooseCharacter", character.id);
    closeCharacterDetails();
}
function openCharacterDetails(character) {
    selectedCharacter.value = character;
}
function closeCharacterDetails() {
    selectedCharacter.value = null;
}
function chooseRandomCharacter() {
    const pool = randomCandidates.value;
    if (pool.length === 0)
        return;
    const character = pool[Math.floor(Math.random() * pool.length)];
    if (character)
        openCharacterDetails(character);
}
function updateMaxPlayers(event) {
    const maxPlayers = Number(event.target.value);
    emit("updateRoomSettings", { maxPlayers });
}
function updateDuplicateSetting(event) {
    const allowDuplicateCharacters = event.target.checked;
    emit("updateRoomSettings", { allowDuplicateCharacters });
}
function updateGameMode(event) {
    const gameMode = event.target.value;
    emit("updateRoomSettings", { gameMode });
}
function gameModeLabel(gameMode) {
    if (gameMode === "pve_roguelite")
        return "肉鸽挑战";
    if (gameMode === "pve_1v1")
        return "人机练习";
    return gameMode === "duo_2v2" ? "2V2 双角色（测试版）" : "经典对战";
}
function duoSlotsForTeam(teamId) {
    return duoSlots.value.filter((slot) => slot.teamId === teamId).sort((a, b) => a.slotIndex - b.slotIndex);
}
function canEditDuoSlot(slot) {
    return slot.controllerId === props.playerId;
}
function isClassicPlayerReady(player) {
    return Boolean(player.characterId || player.characterSelected);
}
function classicPlayerChoiceText(player) {
    const characterText = player.characterId ? characterName(player.characterId) : player.characterSelected ? "已选择职业" : "未选择职业";
    const summonerText = player.summonerSkillId ? summonerSkillDescription(player.summonerSkillId) : player.summonerSkillSelected ? "已选择召唤师技能" : "未选择召唤师技能";
    return `${characterText} / ${summonerText}`;
}
function isDuoSlotCharacterReady(slot) {
    return Boolean(slot.characterId || slot.characterSelected);
}
function isDuoSlotSummonerSkillReady(slot) {
    return Boolean(slot.summonerSkillId || slot.summonerSkillSelected);
}
function duoSlotCharacterText(slot) {
    if (slot.characterId)
        return characterName(slot.characterId);
    return slot.characterSelected ? "已选择职业" : "未选择职业";
}
function duoSlotSummonerSkillText(slot) {
    if (slot.summonerSkillId)
        return summonerSkillDescription(slot.summonerSkillId);
    return slot.summonerSkillSelected ? "已选择召唤师技能" : "未选择召唤师技能";
}
function updateDuoSlotCharacter(slot, event) {
    if (!canEditDuoSlot(slot))
        return;
    const characterId = event.target.value;
    if (!characterId)
        return;
    emit("chooseDuoSlotCharacter", { slotIndex: slot.slotIndex, characterId });
}
function updateDuoSlotSummonerSkill(slot, event) {
    if (!canEditDuoSlot(slot))
        return;
    const summonerSkillId = event.target.value;
    emit("chooseDuoSlotSummonerSkill", { slotIndex: slot.slotIndex, summonerSkillId });
}
function isDuoCharacterTakenByOtherSlot(slot, characterId) {
    return !roomSettings.value.allowDuplicateCharacters && duoSlots.value.some((item) => !(item.controllerId === slot.controllerId && item.slotIndex === slot.slotIndex) && item.characterId === characterId);
}
function summonerSkillDescription(id) {
    return SUMMONER_SKILLS.find((skill) => skill.id === (id ?? "lucky_plus_one"))?.name ?? "幸运骰";
}
function isSelectableCharacter(character) {
    if (!character)
        return false;
    return character.isImplemented !== false && !character.isHidden && !isTakenByOther(character.id);
}
function isImplementedCharacter(character) {
    return Boolean(character && character.isImplemented !== false && !character.isHidden);
}
function isTakenByOther(characterId) {
    return !roomSettings.value.allowDuplicateCharacters && me.value?.characterId !== characterId && props.room.players.some((player) => player.id !== props.playerId && player.characterId === characterId);
}
function characterStatusLabel(character) {
    if (!isImplementedCharacter(character))
        return "未开放";
    if (me.value?.characterId === character.id)
        return "已选择";
    if (isTakenByOther(character.id))
        return "已被选择";
    return "已开放";
}
function matchesFilter(character) {
    if (activeFilter.value === "all")
        return true;
    if (activeFilter.value === "newbie")
        return character.tags?.includes("新手推荐") ?? false;
    return character.role === activeFilter.value || (character.tags?.includes(roleLabel(activeFilter.value)) ?? false);
}
function matchesSearch(character) {
    const keyword = searchKeyword.value.trim().toLowerCase();
    if (!keyword)
        return true;
    const searchable = [
        character.name,
        character.shortDescription,
        roleLabel(character.role),
        difficultyLabel(character.difficulty),
        ...(character.tags ?? []),
        ...character.description
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return searchable.includes(keyword);
}
function difficultyLabel(difficulty) {
    return difficulty ? DIFFICULTY_LABELS[difficulty] : "普通";
}
function roleLabel(role) {
    if (!role || role === "all")
        return "";
    if (role === "newbie")
        return "新手推荐";
    return ROLE_LABELS[role];
}
function selectedNames(characterId) {
    return props.room.players.filter((player) => player.characterId === characterId).map((player) => player.nickname);
}
function characterName(characterId) {
    return props.characters.find((item) => item.id === characterId)?.name ?? "未选择职业";
}
function fullDescription(character) {
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
/** @type {__VLS_StyleScopedClasses['duo-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['duo-team-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "page-panel lobby-page" },
});
/** @type {__VLS_StyleScopedClasses['page-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['lobby-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "lobby-summary" },
});
/** @type {__VLS_StyleScopedClasses['lobby-summary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "room-code" },
});
/** @type {__VLS_StyleScopedClasses['room-code']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.room.id);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "lobby-quick-actions" },
});
/** @type {__VLS_StyleScopedClasses['lobby-quick-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.copyInviteLink) },
    ...{ class: "secondary-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showRuleGuide = true;
            // @ts-ignore
            [room, copyInviteLink, showRuleGuide,];
        } },
    ...{ class: "ghost-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.room.players.length);
(__VLS_ctx.visibleMaxPlayers);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "player-list lobby-player-list" },
});
/** @type {__VLS_StyleScopedClasses['player-list']} */ ;
/** @type {__VLS_StyleScopedClasses['lobby-player-list']} */ ;
for (const [player, index] of __VLS_vFor((__VLS_ctx.room.players))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        key: (player.id),
        ...{ class: "player-card lobby-player-card" },
    });
    /** @type {__VLS_StyleScopedClasses['player-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['lobby-player-card']} */ ;
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
    (__VLS_ctx.classicPlayerChoiceText(player));
    // @ts-ignore
    [room, room, room, visibleMaxPlayers, classicPlayerChoiceText,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "room-settings-panel" },
});
/** @type {__VLS_StyleScopedClasses['room-settings-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "settings-title" },
});
/** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
if (!__VLS_ctx.isHost) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
}
if (__VLS_ctx.isHost) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "settings-controls" },
    });
    /** @type {__VLS_StyleScopedClasses['settings-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "compact-field" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.updateGameMode) },
        value: (__VLS_ctx.roomMode),
        disabled: (__VLS_ctx.room.phase !== 'lobby'),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "classic",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "duo_2v2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "pve_1v1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "pve_roguelite",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "compact-field" },
    });
    /** @type {__VLS_StyleScopedClasses['compact-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.updateMaxPlayers) },
        value: (__VLS_ctx.visibleMaxPlayers),
        disabled: (__VLS_ctx.room.phase !== 'lobby' || __VLS_ctx.isSinglePlayerPveMode),
    });
    for (const [option] of __VLS_vFor((__VLS_ctx.selectableMaxPlayerOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (option.count),
            value: (option.count),
            disabled: (option.disabled),
        });
        (option.count);
        // @ts-ignore
        [room, room, visibleMaxPlayers, isHost, isHost, updateGameMode, roomMode, updateMaxPlayers, isSinglePlayerPveMode, selectableMaxPlayerOptions,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "toggle-field" },
    });
    /** @type {__VLS_StyleScopedClasses['toggle-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.updateDuplicateSetting) },
        type: "checkbox",
        checked: (__VLS_ctx.roomSettings.allowDuplicateCharacters),
        disabled: (__VLS_ctx.room.phase !== 'lobby'),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "settings-readonly" },
    });
    /** @type {__VLS_StyleScopedClasses['settings-readonly']} */ ;
    (__VLS_ctx.gameModeLabel(__VLS_ctx.roomMode));
    (__VLS_ctx.visibleMaxPlayers);
    (__VLS_ctx.roomSettings.allowDuplicateCharacters ? "允许重复职业" : "不允许重复职业");
}
if (__VLS_ctx.hasDuplicateCharacterConflict) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "settings-warning" },
    });
    /** @type {__VLS_StyleScopedClasses['settings-warning']} */ ;
}
if (__VLS_ctx.isDuoModeDevelopment) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "settings-warning" },
    });
    /** @type {__VLS_StyleScopedClasses['settings-warning']} */ ;
}
if (!__VLS_ctx.isDuoModeDevelopment) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "summoner-select-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['summoner-select-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "settings-title" },
    });
    /** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summoner-options" },
    });
    /** @type {__VLS_StyleScopedClasses['summoner-options']} */ ;
    for (const [skill] of __VLS_vFor((__VLS_ctx.SUMMONER_SKILLS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.isDuoModeDevelopment))
                        return;
                    __VLS_ctx.emit('chooseSummonerSkill', skill.id);
                    // @ts-ignore
                    [room, visibleMaxPlayers, roomMode, updateDuplicateSetting, roomSettings, roomSettings, gameModeLabel, hasDuplicateCharacterConflict, isDuoModeDevelopment, isDuoModeDevelopment, SUMMONER_SKILLS, emit,];
                } },
            key: (skill.id),
            ...{ class: "summoner-option" },
            ...{ class: ({ selected: (__VLS_ctx.me?.summonerSkillId ?? 'lucky_plus_one') === skill.id }) },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['summoner-option']} */ ;
        /** @type {__VLS_StyleScopedClasses['selected']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (skill.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (skill.description);
        // @ts-ignore
        [me,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    (__VLS_ctx.selectedSummonerSkill.name);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "lobby-start-bar" },
});
/** @type {__VLS_StyleScopedClasses['lobby-start-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.isHost ? "房主操作" : "游戏状态");
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "hint" },
});
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
(__VLS_ctx.isHost || __VLS_ctx.isDuoModeDevelopment || __VLS_ctx.isSinglePlayerPveMode ? __VLS_ctx.startHint : `当前选择：${__VLS_ctx.characterName(__VLS_ctx.me?.characterId)}`);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('startGame');
            // @ts-ignore
            [isHost, isHost, isSinglePlayerPveMode, isDuoModeDevelopment, emit, me, selectedSummonerSkill, startHint, characterName,];
        } },
    ...{ class: "primary-btn" },
    type: "button",
    disabled: (!__VLS_ctx.isHost || !__VLS_ctx.canStart),
});
/** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
(__VLS_ctx.isDuoModeDevelopment ? __VLS_ctx.isHost ? __VLS_ctx.canStart ? "开始 2V2" : "2V2 选择未完成" : "等待房主开始" : __VLS_ctx.isRogueliteMode ? __VLS_ctx.canStart ? "开始肉鸽挑战" : "请选择职业和技能" : __VLS_ctx.isPveMode ? __VLS_ctx.canStart ? "开始人机练习" : "请选择职业和技能" : __VLS_ctx.isHost ? "开始游戏" : "等待房主开始");
if (__VLS_ctx.isDuoModeDevelopment) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "character-picker duo-slot-picker" },
    });
    /** @type {__VLS_StyleScopedClasses['character-picker']} */ ;
    /** @type {__VLS_StyleScopedClasses['duo-slot-picker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "picker-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['picker-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "duo-team-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['duo-team-grid']} */ ;
    for (const [team] of __VLS_vFor((__VLS_ctx.duoTeams))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            key: (team.id),
            ...{ class: "duo-team-panel" },
        });
        /** @type {__VLS_StyleScopedClasses['duo-team-panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "settings-title" },
        });
        /** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        (team.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "hint" },
        });
        /** @type {__VLS_StyleScopedClasses['hint']} */ ;
        (team.player ? team.player.nickname : "等待玩家加入");
        if (team.player) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "duo-slot-list" },
            });
            /** @type {__VLS_StyleScopedClasses['duo-slot-list']} */ ;
            for (const [slot] of __VLS_vFor((__VLS_ctx.duoSlotsForTeam(team.id)))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                    key: (`${slot.controllerId}-${slot.slotIndex}`),
                    ...{ class: "duo-slot-card" },
                });
                /** @type {__VLS_StyleScopedClasses['duo-slot-card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "settings-title" },
                });
                /** @type {__VLS_StyleScopedClasses['settings-title']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
                (slot.slotIndex + 1);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "badge" },
                    ...{ class: ({ 'host-badge': __VLS_ctx.canEditDuoSlot(slot) }) },
                });
                /** @type {__VLS_StyleScopedClasses['badge']} */ ;
                /** @type {__VLS_StyleScopedClasses['host-badge']} */ ;
                (__VLS_ctx.canEditDuoSlot(slot) ? "你的槽位" : "对方槽位");
                __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                    ...{ class: "compact-field" },
                });
                /** @type {__VLS_StyleScopedClasses['compact-field']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                if (__VLS_ctx.canEditDuoSlot(slot)) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                        ...{ onChange: (...[$event]) => {
                                if (!(__VLS_ctx.isDuoModeDevelopment))
                                    return;
                                if (!(team.player))
                                    return;
                                if (!(__VLS_ctx.canEditDuoSlot(slot)))
                                    return;
                                __VLS_ctx.updateDuoSlotCharacter(slot, $event);
                                // @ts-ignore
                                [isHost, isHost, isHost, isDuoModeDevelopment, isDuoModeDevelopment, canStart, canStart, canStart, canStart, isRogueliteMode, isPveMode, duoTeams, duoSlotsForTeam, canEditDuoSlot, canEditDuoSlot, canEditDuoSlot, updateDuoSlotCharacter,];
                            } },
                        value: (slot.characterId ?? ''),
                    });
                    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                        value: "",
                    });
                    for (const [character] of __VLS_vFor((props.characters))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                            key: (character.id),
                            value: (character.id),
                            disabled: (__VLS_ctx.isDuoCharacterTakenByOtherSlot(slot, character.id)),
                        });
                        (character.name);
                        (__VLS_ctx.isDuoCharacterTakenByOtherSlot(slot, character.id) ? "（已被选择）" : "");
                        // @ts-ignore
                        [isDuoCharacterTakenByOtherSlot, isDuoCharacterTakenByOtherSlot,];
                    }
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "hint" },
                    });
                    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
                    (__VLS_ctx.duoSlotCharacterText(slot));
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                    ...{ class: "compact-field" },
                });
                /** @type {__VLS_StyleScopedClasses['compact-field']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                if (__VLS_ctx.canEditDuoSlot(slot)) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                        ...{ onChange: (...[$event]) => {
                                if (!(__VLS_ctx.isDuoModeDevelopment))
                                    return;
                                if (!(team.player))
                                    return;
                                if (!(__VLS_ctx.canEditDuoSlot(slot)))
                                    return;
                                __VLS_ctx.updateDuoSlotSummonerSkill(slot, $event);
                                // @ts-ignore
                                [canEditDuoSlot, duoSlotCharacterText, updateDuoSlotSummonerSkill,];
                            } },
                        value: (slot.summonerSkillId ?? 'lucky_plus_one'),
                    });
                    for (const [skill] of __VLS_vFor((__VLS_ctx.SUMMONER_SKILLS))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                            key: (skill.id),
                            value: (skill.id),
                        });
                        (skill.name);
                        // @ts-ignore
                        [SUMMONER_SKILLS,];
                    }
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "hint" },
                    });
                    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
                    (__VLS_ctx.duoSlotSummonerSkillText(slot));
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "hint" },
                });
                /** @type {__VLS_StyleScopedClasses['hint']} */ ;
                (__VLS_ctx.duoSlotCharacterText(slot));
                (__VLS_ctx.duoSlotSummonerSkillText(slot));
                // @ts-ignore
                [duoSlotCharacterText, duoSlotSummonerSkillText, duoSlotSummonerSkillText,];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "empty-state" },
            });
            /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
        }
        // @ts-ignore
        [];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "character-picker" },
    });
    /** @type {__VLS_StyleScopedClasses['character-picker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "picker-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['picker-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "hint" },
    });
    /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    (__VLS_ctx.characterName(__VLS_ctx.me?.characterId));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.chooseRandomCharacter) },
        ...{ class: "secondary-btn random-character-btn" },
        type: "button",
        disabled: (__VLS_ctx.randomCandidates.length === 0),
    });
    /** @type {__VLS_StyleScopedClasses['secondary-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['random-character-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "character-toolbar" },
    });
    /** @type {__VLS_StyleScopedClasses['character-toolbar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ class: "character-search" },
        type: "search",
        placeholder: "搜索职业名或标签",
    });
    (__VLS_ctx.searchKeyword);
    /** @type {__VLS_StyleScopedClasses['character-search']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "character-filters" },
        'aria-label': "职业分类筛选",
    });
    /** @type {__VLS_StyleScopedClasses['character-filters']} */ ;
    for (const [filter] of __VLS_vFor((__VLS_ctx.FILTERS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isDuoModeDevelopment))
                        return;
                    __VLS_ctx.activeFilter = filter.id;
                    // @ts-ignore
                    [me, characterName, chooseRandomCharacter, randomCandidates, searchKeyword, FILTERS, activeFilter,];
                } },
            key: (filter.id),
            ...{ class: "filter-chip" },
            ...{ class: ({ active: __VLS_ctx.activeFilter === filter.id }) },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['filter-chip']} */ ;
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        (filter.label);
        // @ts-ignore
        [activeFilter,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "character-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['character-grid']} */ ;
    for (const [character] of __VLS_vFor((__VLS_ctx.filteredCharacters))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isDuoModeDevelopment))
                        return;
                    __VLS_ctx.openCharacterDetails(character);
                    // @ts-ignore
                    [filteredCharacters, openCharacterDetails,];
                } },
            key: (character.id),
            ...{ class: "character-choice" },
            ...{ class: ({ selected: __VLS_ctx.me?.characterId === character.id, locked: !__VLS_ctx.isSelectableCharacter(character), taken: __VLS_ctx.isTakenByOther(character.id) }) },
            type: "button",
            disabled: (!__VLS_ctx.isSelectableCharacter(character)),
        });
        /** @type {__VLS_StyleScopedClasses['character-choice']} */ ;
        /** @type {__VLS_StyleScopedClasses['selected']} */ ;
        /** @type {__VLS_StyleScopedClasses['locked']} */ ;
        /** @type {__VLS_StyleScopedClasses['taken']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "character-status" },
        });
        /** @type {__VLS_StyleScopedClasses['character-status']} */ ;
        (__VLS_ctx.characterStatusLabel(character));
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (character.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "character-hp" },
        });
        /** @type {__VLS_StyleScopedClasses['character-hp']} */ ;
        (character.maxHp);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "character-tags" },
        });
        /** @type {__VLS_StyleScopedClasses['character-tags']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        (__VLS_ctx.difficultyLabel(character.difficulty));
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        (__VLS_ctx.roleLabel(character.role));
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (character.shortDescription ?? character.description[0]);
        if (__VLS_ctx.me?.characterId === character.id) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "chosen-note" },
            });
            /** @type {__VLS_StyleScopedClasses['chosen-note']} */ ;
        }
        else if (__VLS_ctx.selectedNames(character.id).length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "chosen-note" },
            });
            /** @type {__VLS_StyleScopedClasses['chosen-note']} */ ;
            (__VLS_ctx.selectedNames(character.id).join("、"));
        }
        // @ts-ignore
        [me, me, isSelectableCharacter, isSelectableCharacter, isTakenByOther, characterStatusLabel, difficultyLabel, roleLabel, selectedNames, selectedNames,];
    }
    if (__VLS_ctx.filteredCharacters.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "hint" },
        });
        /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    }
}
if (__VLS_ctx.selectedCharacter) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeCharacterDetails) },
        ...{ class: "character-detail-backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['character-detail-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "character-detail-panel" },
        role: "dialog",
        'aria-modal': "true",
        'aria-label': (__VLS_ctx.selectedCharacter.name),
    });
    /** @type {__VLS_StyleScopedClasses['character-detail-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "character-detail-header" },
    });
    /** @type {__VLS_StyleScopedClasses['character-detail-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "detail-status" },
        ...{ class: ({ locked: !__VLS_ctx.isSelectableCharacter(__VLS_ctx.selectedCharacter) }) },
    });
    /** @type {__VLS_StyleScopedClasses['detail-status']} */ ;
    /** @type {__VLS_StyleScopedClasses['locked']} */ ;
    (__VLS_ctx.isSelectableCharacter(__VLS_ctx.selectedCharacter) ? "已开放" : "未开放");
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.selectedCharacter.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.selectedCharacter.maxHp);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeCharacterDetails) },
        ...{ class: "detail-close-btn" },
        type: "button",
        'aria-label': "关闭",
    });
    /** @type {__VLS_StyleScopedClasses['detail-close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "character-detail-meta" },
    });
    /** @type {__VLS_StyleScopedClasses['character-detail-meta']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.difficultyLabel(__VLS_ctx.selectedCharacter.difficulty));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.roleLabel(__VLS_ctx.selectedCharacter.role));
    for (const [tag] of __VLS_vFor((__VLS_ctx.selectedCharacter.tags ?? []))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (tag),
        });
        (tag);
        // @ts-ignore
        [filteredCharacters, isSelectableCharacter, isSelectableCharacter, difficultyLabel, roleLabel, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, closeCharacterDetails, closeCharacterDetails,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "character-detail-body" },
    });
    /** @type {__VLS_StyleScopedClasses['character-detail-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({});
    for (const [item] of __VLS_vFor((__VLS_ctx.fullDescription(__VLS_ctx.selectedCharacter)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (item),
        });
        (item);
        // @ts-ignore
        [selectedCharacter, fullDescription,];
    }
    if (__VLS_ctx.me?.characterId === __VLS_ctx.selectedCharacter.id) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "chosen-note" },
        });
        /** @type {__VLS_StyleScopedClasses['chosen-note']} */ ;
    }
    else if (__VLS_ctx.selectedNames(__VLS_ctx.selectedCharacter.id).length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "chosen-note" },
        });
        /** @type {__VLS_StyleScopedClasses['chosen-note']} */ ;
        (__VLS_ctx.selectedNames(__VLS_ctx.selectedCharacter.id).join("、"));
    }
    if (!__VLS_ctx.isImplementedCharacter(__VLS_ctx.selectedCharacter)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "hint" },
        });
        /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    }
    else if (__VLS_ctx.isTakenByOther(__VLS_ctx.selectedCharacter.id)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "hint" },
        });
        /** @type {__VLS_StyleScopedClasses['hint']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
        ...{ class: "character-detail-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['character-detail-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.confirmCharacterChoice) },
        ...{ class: "primary-btn" },
        type: "button",
        disabled: (!__VLS_ctx.isSelectableCharacter(__VLS_ctx.selectedCharacter)),
    });
    /** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
    (__VLS_ctx.isSelectableCharacter(__VLS_ctx.selectedCharacter) ? "确认选择" : __VLS_ctx.isTakenByOther(__VLS_ctx.selectedCharacter.id) ? "已被选择" : "未开放");
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeCharacterDetails) },
        ...{ class: "ghost-btn" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
}
if (__VLS_ctx.showRuleGuide) {
    const __VLS_0 = RuleGuideDialog;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onClose': {} },
        characters: (__VLS_ctx.characters),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClose': {} },
        characters: (__VLS_ctx.characters),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = {
        ...{ close: {} },
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.showRuleGuide))
                return;
            __VLS_ctx.showRuleGuide = false;
            // @ts-ignore
            [showRuleGuide, showRuleGuide, me, isSelectableCharacter, isSelectableCharacter, isTakenByOther, isTakenByOther, selectedNames, selectedNames, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, selectedCharacter, closeCharacterDetails, isImplementedCharacter, confirmCharacterChoice, characters,];
        },
    };
    var __VLS_3;
    var __VLS_4;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
