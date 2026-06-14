import { computed, onMounted, onUnmounted, ref } from "vue";
import { getClientId, resetClientId, socket } from "./socket";
import HomePage from "./components/HomePage.vue";
import LobbyPage from "./components/LobbyPage.vue";
import BattlePage from "./components/BattlePage.vue";
const ROOM_ID_KEY = "career-war-room-id";
const room = ref(null);
const characters = ref([]);
const playerId = ref("");
const roomId = ref("");
const roomList = ref([]);
const errorMessage = ref("");
const lastEvent = ref(null);
const lastEmote = ref(null);
const query = new URLSearchParams(window.location.search);
const inviteRoomId = (query.get("room") ?? query.get("roomId") ?? "").toUpperCase().slice(0, 4);
const inviteJoinStarted = ref(false);
let clientId = getClientId();
if (inviteRoomId) {
    sessionStorage.removeItem(ROOM_ID_KEY);
    clientId = resetClientId();
}
const page = computed(() => {
    if (!room.value)
        return "home";
    if (room.value.phase === "lobby")
        return "lobby";
    return "battle";
});
onMounted(() => {
    socket.on("connect", enterFromCurrentUrl);
    socket.on("characters", (items) => {
        characters.value = items;
    });
    socket.on("gameStateUpdated", (nextRoom) => {
        room.value = nextRoom;
        roomId.value = nextRoom.id;
        sessionStorage.setItem(ROOM_ID_KEY, nextRoom.id);
    });
    socket.on("roomListUpdated", (items) => {
        roomList.value = items;
    });
    socket.on("battleLogAdded", (event) => {
        lastEvent.value = event;
    });
    socket.on("playerEmote", (event) => {
        lastEmote.value = event;
    });
    socket.on("gameOver", (payload) => {
        lastEvent.value = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            type: "victory",
            message: `${payload.winnerName} 获胜！`
        };
    });
    socket.on("errorMessage", showError);
    enterFromCurrentUrl();
});
onUnmounted(() => {
    socket.off("connect", enterFromCurrentUrl);
    socket.off("characters");
    socket.off("gameStateUpdated");
    socket.off("roomListUpdated");
    socket.off("battleLogAdded");
    socket.off("playerEmote");
    socket.off("gameOver");
    socket.off("errorMessage");
});
function enterFromCurrentUrl() {
    if (inviteRoomId) {
        joinInviteRoom();
        return;
    }
    tryResumeRoom();
}
function joinInviteRoom() {
    if (inviteJoinStarted.value || room.value)
        return;
    inviteJoinStarted.value = true;
    const savedNickname = localStorage.getItem("career-war-nickname")?.trim();
    const nickname = savedNickname || `玩家${clientId.slice(0, 4)}`;
    localStorage.setItem("career-war-nickname", nickname);
    emitWithAck("joinRoom", { nickname, roomId: inviteRoomId, clientId }, (response) => {
        playerId.value = response.playerId;
        roomId.value = response.roomId;
        room.value = response.room;
        sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
        window.history.replaceState({}, "", window.location.pathname);
    });
}
function tryResumeRoom() {
    if (inviteRoomId)
        return;
    const resumableRoomId = sessionStorage.getItem(ROOM_ID_KEY);
    if (!resumableRoomId)
        return;
    socket.emit("resumeRoom", { roomId: resumableRoomId, clientId }, (response) => {
        if (!response.ok) {
            sessionStorage.removeItem(ROOM_ID_KEY);
            return;
        }
        playerId.value = response.playerId;
        roomId.value = response.roomId;
        room.value = response.room;
    });
}
function createRoom(nickname) {
    emitWithAck("createRoom", { nickname, clientId }, (response) => {
        playerId.value = response.playerId;
        roomId.value = response.roomId;
        room.value = response.room;
        sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
    });
}
function joinRoom(payload) {
    emitWithAck("joinRoom", { ...payload, clientId }, (response) => {
        playerId.value = response.playerId;
        roomId.value = response.roomId;
        room.value = response.room;
        sessionStorage.setItem(ROOM_ID_KEY, response.roomId);
    });
}
function requestRoomList() {
    emitWithAck("requestRoomList", {}, (response) => {
        roomList.value = response.roomList;
    });
}
function chooseCharacter(characterId) {
    emitWithAck("chooseCharacter", { characterId });
}
function chooseSummonerSkill(summonerSkillId) {
    emitWithAck("chooseSummonerSkill", { summonerSkillId });
}
function startGame() {
    emitWithAck("startGame", {});
}
function updateRoomSettings(settings) {
    emitWithAck("updateRoomSettings", settings);
}
function selectTarget(targetId) {
    emitWithAck("selectTarget", { targetId });
}
function rollDice() {
    emitWithAck("rollDice", {});
}
function confirmRollDecision(payload) {
    emitWithAck("confirmRollDecision", payload);
}
function leaveRoom() {
    emitWithAck("leaveRoom", {}, () => {
        room.value = null;
        roomId.value = "";
        sessionStorage.removeItem(ROOM_ID_KEY);
    });
}
function emitWithAck(eventName, payload, onSuccess) {
    errorMessage.value = "";
    socket.emit(eventName, payload, (response) => {
        if (!response.ok) {
            showError(response.error);
            return;
        }
        onSuccess?.(response);
    });
}
function showError(message) {
    errorMessage.value = message;
    window.setTimeout(() => {
        if (errorMessage.value === message)
            errorMessage.value = "";
    }, 2600);
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "app-shell" },
});
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "top-bar" },
});
/** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
if (__VLS_ctx.room) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.leaveRoom) },
        ...{ class: "ghost-btn" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
}
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "toast" },
    });
    /** @type {__VLS_StyleScopedClasses['toast']} */ ;
    (__VLS_ctx.errorMessage);
}
if (__VLS_ctx.page === 'home') {
    const __VLS_0 = HomePage;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onCreateRoom': {} },
        ...{ 'onJoinRoom': {} },
        ...{ 'onRefreshRoomList': {} },
        inviteRoomId: (__VLS_ctx.inviteRoomId),
        roomList: (__VLS_ctx.roomList),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onCreateRoom': {} },
        ...{ 'onJoinRoom': {} },
        ...{ 'onRefreshRoomList': {} },
        inviteRoomId: (__VLS_ctx.inviteRoomId),
        roomList: (__VLS_ctx.roomList),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = {
        ...{ createRoom: {} },
        onCreateRoom: (__VLS_ctx.createRoom),
        ...{ joinRoom: {} },
        onJoinRoom: (__VLS_ctx.joinRoom),
        ...{ refreshRoomList: {} },
        onRefreshRoomList: (__VLS_ctx.requestRoomList),
    };
    var __VLS_3;
    var __VLS_4;
}
else if (__VLS_ctx.page === 'lobby' && __VLS_ctx.room) {
    const __VLS_7 = LobbyPage;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
        ...{ 'onChooseCharacter': {} },
        ...{ 'onChooseSummonerSkill': {} },
        ...{ 'onUpdateRoomSettings': {} },
        ...{ 'onStartGame': {} },
        room: (__VLS_ctx.room),
        playerId: (__VLS_ctx.playerId),
        characters: (__VLS_ctx.characters),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onChooseCharacter': {} },
        ...{ 'onChooseSummonerSkill': {} },
        ...{ 'onUpdateRoomSettings': {} },
        ...{ 'onStartGame': {} },
        room: (__VLS_ctx.room),
        playerId: (__VLS_ctx.playerId),
        characters: (__VLS_ctx.characters),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_12;
    const __VLS_13 = {
        ...{ chooseCharacter: {} },
        onChooseCharacter: (__VLS_ctx.chooseCharacter),
        ...{ chooseSummonerSkill: {} },
        onChooseSummonerSkill: (__VLS_ctx.chooseSummonerSkill),
        ...{ updateRoomSettings: {} },
        onUpdateRoomSettings: (__VLS_ctx.updateRoomSettings),
        ...{ startGame: {} },
        onStartGame: (__VLS_ctx.startGame),
    };
    var __VLS_10;
    var __VLS_11;
}
else if (__VLS_ctx.room) {
    const __VLS_14 = BattlePage;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        ...{ 'onSelectTarget': {} },
        ...{ 'onRollDice': {} },
        ...{ 'onConfirmRollDecision': {} },
        room: (__VLS_ctx.room),
        playerId: (__VLS_ctx.playerId),
        characters: (__VLS_ctx.characters),
        lastEvent: (__VLS_ctx.lastEvent),
        lastEmote: (__VLS_ctx.lastEmote),
    }));
    const __VLS_16 = __VLS_15({
        ...{ 'onSelectTarget': {} },
        ...{ 'onRollDice': {} },
        ...{ 'onConfirmRollDecision': {} },
        room: (__VLS_ctx.room),
        playerId: (__VLS_ctx.playerId),
        characters: (__VLS_ctx.characters),
        lastEvent: (__VLS_ctx.lastEvent),
        lastEmote: (__VLS_ctx.lastEmote),
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_19;
    const __VLS_20 = {
        ...{ selectTarget: {} },
        onSelectTarget: (__VLS_ctx.selectTarget),
        ...{ rollDice: {} },
        onRollDice: (__VLS_ctx.rollDice),
        ...{ confirmRollDecision: {} },
        onConfirmRollDecision: (__VLS_ctx.confirmRollDecision),
    };
    var __VLS_17;
    var __VLS_18;
}
// @ts-ignore
[room, room, room, room, room, leaveRoom, errorMessage, errorMessage, page, page, inviteRoomId, roomList, createRoom, joinRoom, requestRoomList, playerId, playerId, characters, characters, chooseCharacter, chooseSummonerSkill, updateRoomSettings, startGame, lastEvent, lastEmote, selectTarget, rollDice, confirmRollDecision,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
