<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { Character, CharacterId, DuoCharacterSlot, GameMode, Player, Room, RoomSettings, SummonerSkillId, TeamId } from "@career-war/shared";
import { getCharacterArt } from "../assets/art/characters";
import CareerDetailCard from "./CareerDetailCard.vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";

const props = defineProps<{
  room: Room;
  playerId: string;
  characters: Character[];
}>();

const emit = defineEmits<{
  chooseCharacter: [characterId: CharacterId];
  chooseSummonerSkill: [summonerSkillId: SummonerSkillId];
  chooseDuoSlotCharacter: [payload: { slotIndex: 0 | 1; characterId: CharacterId }];
  chooseDuoSlotSummonerSkill: [payload: { slotIndex: 0 | 1; summonerSkillId: SummonerSkillId }];
  updateRoomSettings: [settings: Partial<RoomSettings>];
  startGame: [];
  kickPlayer: [playerId: string];
}>();

type CharacterFilter = "all" | "newbie" | "attack" | "defense" | "healing" | "burst" | "special";
type CharacterCard = Omit<Character, "id"> & { id: string };

const CAREER_DETAIL_TAGS: Partial<Record<string, string[]>> = {
  zhaoZilong: ["破盾", "回血", "稳定输出"],
  mountain_shield: ["防御", "护盾", "坦克"],
  fire_lord: ["灼烧", "爆发", "持续伤害"],
  self_destructor: ["高风险", "爆炸", "赌命"],
  vampire: ["吸血", "回复", "消耗"]
};

const CAREER_ART_ID_ALIASES: Record<string, string> = {
  warKnight: "war_knight"
};

const FILTERS: Array<{ id: CharacterFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "newbie", label: "新手推荐" },
  { id: "attack", label: "攻击" },
  { id: "defense", label: "防御" },
  { id: "healing", label: "治疗" },
  { id: "burst", label: "爆发" },
  { id: "special", label: "特殊" }
];

const DIFFICULTY_LABELS: Record<NonNullable<Character["difficulty"]>, string> = {
  simple: "简单",
  normal: "普通",
  complex: "复杂",
  expert: "高手"
};

const ROLE_LABELS: Record<NonNullable<Character["role"]>, string> = {
  attack: "攻击",
  defense: "防御",
  healing: "治疗",
  burst: "爆发",
  special: "特殊"
};

const MAX_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8];
const CHARACTER_PAGE_SIZE = 4;
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  allowDuplicateCharacters: true,
  gameMode: "classic"
};
const SUMMONER_SKILLS: Array<{ id: SummonerSkillId; name: string; description: string }> = [
  { id: "lucky_plus_one", name: "幸运骰", description: "投后让本次主骰 +1，最高 6。开局预冷却：2 次自己的行动。使用后冷却：3 次自己的行动。" },
  { id: "first_aid", name: "急救术", description: "本次不攻击，改为回复自己等于骰点的血量。冷却：3 次自己的行动。" },
  { id: "iron_wall", name: "铁壁", description: "本次不攻击，改为获得等于骰点的护盾。冷却：3 次自己的行动。" },
  { id: "fate_reroll", name: "命运重掷", description: "服务器重新投一次主骰，必须接受新骰点。冷却：3 次自己的行动。" },
  { id: "last_stand", name: "破釜", description: "攻击伤害行动可用，最终伤害 +2，自己受 2 点反噬。冷却：3 次自己的行动。" }
];
type SummonerSkill = (typeof SUMMONER_SKILLS)[number];

const LOCKED_CHARACTERS: CharacterCard[] = [
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

const activeFilter = ref<CharacterFilter>("all");
const searchKeyword = ref("");
const characterPage = ref(0);
const selectedCharacter = ref<CharacterCard | null>(null);
const selectedSummonerSkillDetail = ref<SummonerSkill | null>(null);
const showRuleGuide = ref(false);
const copyFeedback = ref(false);
const lobbyTab = ref<"players" | "settings" | "summoner" | "characters">("players");
let copyFeedbackTimer: number | undefined;
let pendingLeaveAutoConfirm = false;
let leaveAutoConfirmListenerAttached = false;

const me = computed(() => props.room.players.find((player) => player.id === props.playerId));
const isHost = computed(() => props.room.hostId === props.playerId);
const roomSettings = computed(() => ({ ...DEFAULT_ROOM_SETTINGS, ...(props.room.settings ?? {}) }));
const roomMode = computed<GameMode>(() => props.room.gameMode ?? roomSettings.value.gameMode ?? "classic");
const isDuoModeDevelopment = computed(() => roomMode.value === "duo_2v2");
const isPveMode = computed(() => roomMode.value === "pve_1v1");
const isRogueliteMode = computed(() => roomMode.value === "pve_roguelite");
const isSinglePlayerPveMode = computed(() => isPveMode.value || isRogueliteMode.value);
const duoSlots = computed(() => props.room.duoSlots ?? []);
const duoTeams = computed<Array<{ id: TeamId; label: string; player: Player | undefined }>>(() => [
  { id: "A", label: "A 队", player: props.room.players[0] },
  { id: "B", label: "B 队", player: props.room.players[1] }
]);
const myDuoSlots = computed(() => duoSlots.value.filter((s) => s.controllerId === props.playerId).sort((a, b) => a.slotIndex - b.slotIndex));
const selfTeamId = computed(() => myDuoSlots.value[0]?.teamId ?? undefined);
const opponentTeamId = computed(() => (selfTeamId.value === "A" ? "B" : selfTeamId.value === "B" ? "A" : undefined));
const opponentPlayer = computed(() => props.room.players.find((p) => duoSlots.value.some((s) => s.controllerId === p.id && s.teamId === opponentTeamId.value)));
const opponentTeamLabel = computed(() => opponentTeamId.value === "A" ? "A 队" : "B 队");
const selectedSummonerSkill = computed(() => SUMMONER_SKILLS.find((skill) => skill.id === (me.value?.summonerSkillId ?? "lucky_plus_one")) ?? SUMMONER_SKILLS[0]!);
const isDuoReadyToStart = computed(() => props.room.players.length === 2 && duoSlots.value.length === 4 && duoSlots.value.every((slot) => isDuoSlotCharacterReady(slot) && isDuoSlotSummonerSkillReady(slot)) && !hasDuplicateCharacterConflict.value);
const canStart = computed(() => {
  if (isDuoModeDevelopment.value) return isDuoReadyToStart.value;
  if (isRogueliteMode.value) return true;
  if (isPveMode.value) return Boolean(me.value?.characterId && me.value?.summonerSkillId);
  return props.room.players.length >= 2 && props.room.players.every(isClassicPlayerReady) && !hasDuplicateCharacterConflict.value;
});
const hasDuplicateCharacterConflict = computed(() => !roomSettings.value.allowDuplicateCharacters && (isDuoModeDevelopment.value ? duoDuplicateCharacterIds.value.size > 0 : duplicateCharacterIds.value.size > 0));
const duplicateCharacterIds = computed(() => {
  const counts = new Map<CharacterId, number>();
  for (const player of props.room.players) {
    if (!player.characterId) continue;
    counts.set(player.characterId, (counts.get(player.characterId) ?? 0) + 1);
  }
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([characterId]) => characterId));
});
const duoDuplicateCharacterIds = computed(() => {
  const counts = new Map<CharacterId, number>();
  for (const slot of duoSlots.value) {
    if (!slot.characterId) continue;
    counts.set(slot.characterId, (counts.get(slot.characterId) ?? 0) + 1);
  }
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([characterId]) => characterId));
});
const startHint = computed(() => {
  if (isDuoModeDevelopment.value && hasDuplicateCharacterConflict.value) return "当前设置不允许重复职业，请重新选择 2V2 槽位。";
  if (isDuoModeDevelopment.value && props.room.players.length !== 2) return "2V2 需要 2 名玩家后才能开始。";
  if (isDuoModeDevelopment.value && !isDuoReadyToStart.value) return "请完成 4 个角色槽位和召唤师技能选择。";
  if (isDuoModeDevelopment.value) return "将进入 2V2 双角色测试版：每名玩家控制两个角色进行战斗。";
  if (isRogueliteMode.value) return `肉鸽挑战：初始拳手，不使用召唤师技能，胜利后按阶段获得奖励。`;
  if (isSinglePlayerPveMode.value && !me.value?.characterId) return "请选择 1 个职业。";
  if (isSinglePlayerPveMode.value && !me.value?.summonerSkillId) return "请选择 1 个召唤师技能。";
  if (isPveMode.value) return `准备开始人机练习：${characterName(me.value?.characterId)} vs AI`;
  if (hasDuplicateCharacterConflict.value) return "当前已有重复职业，请玩家重新选择。";
  if (!canStart.value) return "至少 2 人，且所有玩家都选择职业后可开始。";
  return `当前选择：${characterName(me.value?.characterId)}`;
});
const inviteLink = computed(() => `${window.location.origin}/room/${props.room.id}`);
const visibleCharacters = computed<CharacterCard[]>(() => [...props.characters, ...LOCKED_CHARACTERS].filter((character) => !character.isHidden));
const filteredCharacters = computed(() => visibleCharacters.value.filter((character) => matchesFilter(character) && matchesSearch(character)));
const characterPageCount = computed(() => Math.max(1, Math.ceil(filteredCharacters.value.length / CHARACTER_PAGE_SIZE)));
const pagedCharacters = computed(() => filteredCharacters.value.slice(characterPage.value * CHARACTER_PAGE_SIZE, (characterPage.value + 1) * CHARACTER_PAGE_SIZE));
const randomCandidates = computed(() => filteredCharacters.value.filter(isSelectableCharacter));
const visibleMaxPlayers = computed(() => (isDuoModeDevelopment.value ? 2 : isSinglePlayerPveMode.value ? 1 : roomSettings.value.maxPlayers));
const selectableMaxPlayerOptions = computed(() => (isDuoModeDevelopment.value ? [2] : isSinglePlayerPveMode.value ? [1] : MAX_PLAYER_OPTIONS).map((count) => ({ count, disabled: count < props.room.players.length })));
const lobbySeats = computed(() =>
  Array.from({ length: Math.max(visibleMaxPlayers.value, props.room.players.length) }, (_, index) => ({
    index,
    player: props.room.players[index]
  }))
);

watch([activeFilter, searchKeyword], () => {
  characterPage.value = 0;
});

watch(characterPageCount, (count) => {
  if (characterPage.value >= count) {
    characterPage.value = Math.max(0, count - 1);
  }
});

watch(
  [roomMode, lobbyTab],
  () => {
    if (isRogueliteMode.value && (lobbyTab.value === "characters" || lobbyTab.value === "summoner")) {
      lobbyTab.value = "players";
      return;
    }
    if (isDuoModeDevelopment.value && lobbyTab.value === "summoner") {
      lobbyTab.value = "characters";
    }
  },
  { immediate: true }
);

function autoConfirmLeaveClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement | null)?.closest("button");
  if (!button || button.textContent?.trim() !== "离开") return;
  if (pendingLeaveAutoConfirm) return;
  pendingLeaveAutoConfirm = true;
  window.setTimeout(() => {
    const confirmButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".leave-confirm-dialog button")).find((item) => item.textContent?.includes("确认离开"));
    confirmButton?.click();
    pendingLeaveAutoConfirm = false;
  }, 0);
}

onMounted(() => {
  if (leaveAutoConfirmListenerAttached) return;
  document.addEventListener("click", autoConfirmLeaveClick, true);
  leaveAutoConfirmListenerAttached = true;
});

async function copyInviteLink(): Promise<void> {
  await navigator.clipboard.writeText(inviteLink.value);
  copyFeedback.value = true;
  window.clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = window.setTimeout(() => {
    copyFeedback.value = false;
    copyFeedbackTimer = undefined;
  }, 1500);
}

function confirmCharacterChoice(): void {
  const character = selectedCharacter.value;
  if (!character || !isSelectableCharacter(character)) return;
  emit("chooseCharacter", character.id as CharacterId);
  closeCharacterDetails();
}

function chooseCharacterFromCard(character: CharacterCard): void {
  openCharacterDetails(character);
}

function openCharacterDetails(character: CharacterCard): void {
  selectedCharacter.value = character;
}

function closeCharacterDetails(): void {
  selectedCharacter.value = null;
}

function selectSummonerSkill(skill: SummonerSkill): void {
  emit("chooseSummonerSkill", skill.id);
}

function openSummonerSkillDetails(skill: SummonerSkill): void {
  selectedSummonerSkillDetail.value = skill;
}

function closeSummonerSkillDetails(): void {
  selectedSummonerSkillDetail.value = null;
}

function chooseSummonerSkillFromDetail(): void {
  if (!selectedSummonerSkillDetail.value) return;
  selectSummonerSkill(selectedSummonerSkillDetail.value);
  closeSummonerSkillDetails();
}

function summonerSkillTag(id: SummonerSkillId): string {
  if (id === "lucky_plus_one") return "+1";
  if (id === "first_aid") return "回血";
  if (id === "iron_wall") return "护盾";
  if (id === "fate_reroll") return "重掷";
  return "爆发";
}

function chooseRandomCharacter(): void {
  const pool = randomCandidates.value;
  if (pool.length === 0) return;
  const character = pool[Math.floor(Math.random() * pool.length)];
  if (character) openCharacterDetails(character);
}

function updateMaxPlayers(event: Event): void {
  const maxPlayers = Number((event.target as HTMLSelectElement).value);
  emit("updateRoomSettings", { maxPlayers });
}

function updateDuplicateSetting(event: Event): void {
  const allowDuplicateCharacters = (event.target as HTMLInputElement).checked;
  emit("updateRoomSettings", { allowDuplicateCharacters });
}

function updateGameMode(event: Event): void {
  const gameMode = (event.target as HTMLSelectElement).value as GameMode;
  emit("updateRoomSettings", { gameMode });
}

function gameModeLabel(gameMode: GameMode): string {
  if (gameMode === "pve_roguelite") return "肉鸽挑战";
  if (gameMode === "pve_1v1") return "人机练习";
  return gameMode === "duo_2v2" ? "2V2 双角色（测试版）" : "经典对战";
}

function duoSlotsForTeam(teamId: TeamId): DuoCharacterSlot[] {
  return duoSlots.value.filter((slot) => slot.teamId === teamId).sort((a, b) => a.slotIndex - b.slotIndex);
}

function canEditDuoSlot(slot: DuoCharacterSlot): boolean {
  return slot.controllerId === props.playerId;
}

function canKickPlayer(player: Player): boolean {
  return isHost.value && props.room.phase === "lobby" && player.id !== props.playerId && !player.isBot;
}

function requestKickPlayer(player: Player): void {
  if (!canKickPlayer(player)) return;
  if (window.confirm(`Kick ${player.nickname}?`)) {
    emit("kickPlayer", player.id);
  }
}

function isClassicPlayerReady(player: Player): boolean {
  return Boolean(player.characterId || player.characterSelected);
}

function classicPlayerChoiceText(player: Player): string {
  const characterText = player.characterId ? characterName(player.characterId) : player.characterSelected ? "已选择职业" : "未选择职业";
  const summonerText = player.summonerSkillId ? summonerSkillDescription(player.summonerSkillId) : player.summonerSkillSelected ? "已选择召唤师技能" : "未选择召唤师技能";
  return `${characterText} / ${summonerText}`;
}

function isDuoSlotCharacterReady(slot: DuoCharacterSlot): boolean {
  return Boolean(slot.characterId || slot.characterSelected);
}

function isDuoSlotSummonerSkillReady(slot: DuoCharacterSlot): boolean {
  return Boolean(slot.summonerSkillId || slot.summonerSkillSelected);
}

function duoSlotCharacterText(slot: DuoCharacterSlot): string {
  if (slot.characterId) return characterName(slot.characterId);
  return slot.characterSelected ? "已选择职业" : "未选择职业";
}

function duoSlotSummonerSkillText(slot: DuoCharacterSlot): string {
  if (slot.summonerSkillId) return summonerSkillDescription(slot.summonerSkillId);
  return slot.summonerSkillSelected ? "已选择召唤师技能" : "未选择召唤师技能";
}

function updateDuoSlotCharacter(slot: DuoCharacterSlot, event: Event): void {
  if (!canEditDuoSlot(slot)) return;
  const characterId = (event.target as HTMLSelectElement).value as CharacterId | "";
  if (!characterId) return;
  emit("chooseDuoSlotCharacter", { slotIndex: slot.slotIndex, characterId });
}

function updateDuoSlotSummonerSkill(slot: DuoCharacterSlot, event: Event): void {
  if (!canEditDuoSlot(slot)) return;
  const summonerSkillId = (event.target as HTMLSelectElement).value as SummonerSkillId;
  emit("chooseDuoSlotSummonerSkill", { slotIndex: slot.slotIndex, summonerSkillId });
}

function isDuoCharacterTakenByOtherSlot(slot: DuoCharacterSlot, characterId: string): boolean {
  return !roomSettings.value.allowDuplicateCharacters && duoSlots.value.some((item) => !(item.controllerId === slot.controllerId && item.slotIndex === slot.slotIndex) && item.characterId === characterId);
}

function summonerSkillDescription(id: SummonerSkillId | undefined): string {
  return SUMMONER_SKILLS.find((skill) => skill.id === (id ?? "lucky_plus_one"))?.name ?? "幸运骰";
}

function isSelectableCharacter(character: CharacterCard | null | undefined): boolean {
  if (!character) return false;
  return character.isImplemented !== false && !character.isHidden && !isTakenByOther(character.id);
}

function isImplementedCharacter(character: CharacterCard | null | undefined): boolean {
  return Boolean(character && character.isImplemented !== false && !character.isHidden);
}

function isTakenByOther(characterId: string): boolean {
  return !roomSettings.value.allowDuplicateCharacters && me.value?.characterId !== characterId && props.room.players.some((player) => player.id !== props.playerId && player.characterId === characterId);
}

function characterStatusLabel(character: CharacterCard): string {
  if (!isImplementedCharacter(character)) return "未开放";
  if (me.value?.characterId === character.id) return "已选择";
  if (isTakenByOther(character.id)) return "已被选择";
  return "已开放";
}

function matchesFilter(character: CharacterCard): boolean {
  if (activeFilter.value === "all") return true;
  if (activeFilter.value === "newbie") return character.tags?.includes("新手推荐") ?? false;
  return character.role === activeFilter.value || (character.tags?.includes(roleLabel(activeFilter.value)) ?? false);
}

function matchesSearch(character: CharacterCard): boolean {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return true;
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

function difficultyLabel(difficulty: Character["difficulty"]): string {
  return difficulty ? DIFFICULTY_LABELS[difficulty] : "普通";
}

function roleLabel(role: Character["role"] | CharacterFilter): string {
  if (!role || role === "all") return "";
  if (role === "newbie") return "新手推荐";
  return ROLE_LABELS[role];
}

function selectedNames(characterId: string): string[] {
  return props.room.players.filter((player) => player.characterId === characterId).map((player) => player.nickname);
}

function characterName(characterId: CharacterId | undefined): string {
  return props.characters.find((item) => item.id === characterId)?.name ?? "未选择职业";
}

function fullDescription(character: CharacterCard): string[] {
  return character.fullDescription?.length ? character.fullDescription : character.description;
}

function characterTitle(character: CharacterCard): string {
  return [roleLabel(character.role), difficultyLabel(character.difficulty)].filter(Boolean).join(" / ");
}

function characterDetailTags(character: CharacterCard): string[] {
  return uniqueCareerTags([roleLabel(character.role), difficultyLabel(character.difficulty), ...(CAREER_DETAIL_TAGS[character.id] ?? []), ...(character.tags ?? [])]);
}

function isRecommendedCharacter(character: CharacterCard): boolean {
  return character.tags?.includes(roleLabel("newbie")) ?? false;
}

function characterAvatar(characterId: string): string | undefined {
  return getCharacterArt(normalizeCareerArtId(characterId))?.avatar;
}

function characterSprite(characterId: string): string | undefined {
  const art = getCharacterArt(normalizeCareerArtId(characterId));
  return art?.sprite ?? art?.avatar;
}

function normalizeCareerArtId(characterId: string): string {
  return CAREER_ART_ID_ALIASES[characterId] ?? characterId;
}

function uniqueCareerTags(tags: Array<string | undefined>): string[] {
  return Array.from(new Set(tags.filter((tag): tag is string => Boolean(tag))));
}
</script>

<template>
  <section class="page-panel lobby-page" :class="`lobby-tab-${lobbyTab}`">
    <section class="lobby-summary">
      <div class="room-code">
        <span>房间号</span>
        <strong>{{ room.id }}</strong>
      </div>

      <div class="lobby-quick-actions">
        <button class="secondary-btn" type="button" :disabled="copyFeedback" @click="copyInviteLink">{{ copyFeedback ? "已复制 ✓" : "复制邀请链接" }}</button>
        <button class="ghost-btn" type="button" @click="showRuleGuide = true">规则 / 职业说明</button>
      </div>

      <nav class="lobby-tabs">
        <button class="lobby-tab-btn" :class="{ active: lobbyTab === 'players' }" type="button" @click="lobbyTab = 'players'">玩家</button>
        <button class="lobby-tab-btn" :class="{ active: lobbyTab === 'settings' }" type="button" @click="lobbyTab = 'settings'">设置</button>
        <button v-if="isDuoModeDevelopment" class="lobby-tab-btn" :class="{ active: lobbyTab === 'characters' }" type="button" @click="lobbyTab = 'characters'">阵容</button>
        <button v-if="!isDuoModeDevelopment && !isRogueliteMode" class="lobby-tab-btn" :class="{ active: lobbyTab === 'characters' }" type="button" @click="lobbyTab = 'characters'">职业</button>
        <button v-if="!isDuoModeDevelopment && !isRogueliteMode" class="lobby-tab-btn" :class="{ active: lobbyTab === 'summoner' }" type="button" @click="lobbyTab = 'summoner'">技能</button>
      </nav>

      <section v-show="lobbyTab === 'players'">
        <h2>玩家 {{ room.players.length }}/{{ visibleMaxPlayers }}</h2>
        <div class="player-list lobby-player-list">
          <article v-for="seat in lobbySeats" :key="seat.player?.id ?? `empty-${seat.index}`" class="player-card lobby-player-card" :class="{ empty: !seat.player }">
            <template v-if="seat.player">
              <strong>{{ seat.index + 1 }} {{ seat.player.nickname }}</strong>
              <span v-if="seat.player.id === room.hostId || seat.player.isHost" class="badge host-badge">房主</span>
              <span class="badge" :class="{ offline: !seat.player.isOnline }">{{ seat.player.isOnline ? "在线" : "离线" }}</span>
              <span class="lobby-seat-choice">{{ characterName(seat.player.characterId) }}</span>
              <button v-if="canKickPlayer(seat.player)" class="ghost-btn small-btn lobby-kick-btn" type="button" @click="requestKickPlayer(seat.player)">Kick</button>
            </template>
            <template v-else>
              <strong>{{ seat.index + 1 }} 空位</strong>
              <span class="badge">等待</span>
            </template>
          </article>
        </div>
      </section>

      <section v-show="lobbyTab === 'settings'" class="room-settings-panel">
        <div class="settings-title">
          <h2>房间设置</h2>
          <span v-if="!isHost" class="hint">仅房主可修改</span>
        </div>

        <div v-if="isHost" class="settings-controls">
          <label class="compact-field">
            <span>游戏模式</span>
            <select :value="roomMode" :disabled="room.phase !== 'lobby'" @change="updateGameMode">
              <option value="classic">经典对战</option>
              <option value="duo_2v2">2V2 双角色（测试版）</option>
              <option value="pve_1v1">人机练习</option>
              <option value="pve_roguelite">肉鸽挑战</option>
            </select>
          </label>

          <label class="compact-field">
            <span>最大人数</span>
            <select :value="visibleMaxPlayers" :disabled="room.phase !== 'lobby' || isSinglePlayerPveMode" @change="updateMaxPlayers">
              <option v-for="option in selectableMaxPlayerOptions" :key="option.count" :value="option.count" :disabled="option.disabled">
                {{ option.count }} 人
              </option>
            </select>
          </label>

          <label class="toggle-field">
            <input type="checkbox" :checked="roomSettings.allowDuplicateCharacters" :disabled="room.phase !== 'lobby'" @change="updateDuplicateSetting" />
            <span>允许重复职业</span>
          </label>
        </div>

        <p v-else class="settings-readonly">
          模式：{{ gameModeLabel(roomMode) }} /
          最大 {{ visibleMaxPlayers }} 人 · {{ roomSettings.allowDuplicateCharacters ? "允许重复职业" : "不允许重复职业" }}
        </p>

        <p v-if="hasDuplicateCharacterConflict" class="settings-warning">当前已有重复职业，请玩家重新选择。</p>
        <p v-if="isDuoModeDevelopment" class="settings-warning">2V2 双角色测试版：请完成 4 个角色槽位和召唤师技能选择后开始。</p>
      </section>

      <section v-show="lobbyTab === 'summoner'" class="summoner-select-panel">
        <div class="settings-title">
          <h2>召唤师技能</h2>
          <span class="hint">每人选择 1 个</span>
        </div>
        <div class="summoner-options">
          <article
            v-for="skill in SUMMONER_SKILLS"
            :key="skill.id"
            class="summoner-option"
            :class="{ selected: (me?.summonerSkillId ?? 'lucky_plus_one') === skill.id }"
            role="button"
            tabindex="0"
            @click="selectSummonerSkill(skill)"
            @keydown.enter.prevent="selectSummonerSkill(skill)"
            @keydown.space.prevent="selectSummonerSkill(skill)"
          >
            <span class="summoner-option-main">
              <strong>{{ skill.name }}</strong>
              <small>{{ summonerSkillTag(skill.id) }}</small>
              <em class="summoner-option-description">{{ skill.description }}</em>
            </span>
            <button class="seat-info-btn summoner-info-btn" type="button" aria-label="查看技能详情" @click.stop="openSummonerSkillDetails(skill)">i</button>
          </article>
        </div>
        <p class="hint">当前已选择：{{ selectedSummonerSkill.name }}</p>
      </section>

      <section v-if="!isDuoModeDevelopment && !isRogueliteMode" v-show="lobbyTab === 'characters'" class="character-picker">
        <div class="picker-heading">
          <div>
            <h2>选择职业</h2>
            <p class="hint">当前选择：{{ characterName(me?.characterId) }}</p>
          </div>
          <button class="secondary-btn random-character-btn" type="button" :disabled="randomCandidates.length === 0" @click="chooseRandomCharacter">随机职业</button>
        </div>

        <div class="character-toolbar">
          <input v-model="searchKeyword" class="character-search" type="search" placeholder="搜索职业名或标签" />
          <div class="character-filters" aria-label="职业分类筛选">
            <button
              v-for="filter in FILTERS"
              :key="filter.id"
              class="filter-chip"
              :class="{ active: activeFilter === filter.id }"
              type="button"
              @click="activeFilter = filter.id"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div class="character-grid">
          <article
            v-for="character in pagedCharacters"
            :key="character.id"
            class="character-choice"
            :class="{ selected: me?.characterId === character.id, locked: !isSelectableCharacter(character), taken: isTakenByOther(character.id) }"
            role="button"
            :tabindex="isSelectableCharacter(character) ? 0 : -1"
            :aria-disabled="!isSelectableCharacter(character)"
            @click="chooseCharacterFromCard(character)"
            @keydown.enter.prevent="chooseCharacterFromCard(character)"
            @keydown.space.prevent="chooseCharacterFromCard(character)"
          >
            <span class="character-status">{{ characterStatusLabel(character) }}</span>
            <button class="seat-info-btn character-info-btn" type="button" aria-label="查看职业详情" @click.stop="openCharacterDetails(character)">i</button>
            <span class="character-art-thumb" :class="{ empty: !characterSprite(character.id) }">
              <img v-if="characterSprite(character.id)" :src="characterSprite(character.id)" :alt="character.name" draggable="false" />
              <span v-else>{{ character.name.slice(0, 1) }}</span>
            </span>
            <span class="character-card-copy">
              <strong>{{ character.name }}</strong>
              <span class="character-hp">最大血量 {{ character.maxHp }}</span>
              <span class="character-tags">
                <i>{{ difficultyLabel(character.difficulty) }}</i>
                <i>{{ roleLabel(character.role) }}</i>
              </span>
              <small>{{ character.shortDescription ?? character.description[0] }}</small>
              <span v-if="me?.characterId === character.id" class="chosen-note">你已选择</span>
              <span v-else-if="selectedNames(character.id).length" class="chosen-note">已选：{{ selectedNames(character.id).join("、") }}</span>
            </span>
          </article>
        </div>

        <div v-if="characterPageCount > 1" class="character-pager">
          <button class="ghost-btn small-btn" type="button" :disabled="characterPage === 0" @click="characterPage = Math.max(0, characterPage - 1)">上一页</button>
          <span>{{ characterPage + 1 }}/{{ characterPageCount }}</span>
          <button class="ghost-btn small-btn" type="button" :disabled="characterPage + 1 >= characterPageCount" @click="characterPage = Math.min(characterPageCount - 1, characterPage + 1)">下一页</button>
        </div>

        <p v-if="filteredCharacters.length === 0" class="hint">没有找到匹配的职业。</p>
      </section>

      <section class="lobby-start-bar">
        <div>
          <strong>{{ isHost ? "房主操作" : "游戏状态" }}</strong>
          <p class="hint">{{ isHost || isDuoModeDevelopment || isSinglePlayerPveMode ? startHint : `当前选择：${characterName(me?.characterId)}` }}</p>
        </div>
        <button class="primary-btn" type="button" :disabled="!isHost || !canStart" @click="emit('startGame')">
          {{ isDuoModeDevelopment ? isHost ? canStart ? "开始 2V2" : "2V2 选择未完成" : "等待房主开始" : isRogueliteMode ? "开始肉鸽挑战" : isPveMode ? canStart ? "开始人机练习" : "请选择职业和技能" : isHost ? "开始游戏" : "等待房主开始" }}
        </button>
      </section>
    </section>

    <section v-if="isDuoModeDevelopment" v-show="lobbyTab === 'characters'" class="character-picker duo-slot-picker">
      <div class="picker-heading">
        <div>
          <h2>2V2 双角色选角</h2>
          <p class="hint">每名真实玩家选择 2 个角色槽位，进入战斗后轮流选择行动角色和敌方目标。</p>
        </div>
      </div>

      <p v-if="duoSlots.length === 0" class="empty-state duo-slot-empty">2V2 槽位尚未生成，请等待房间同步或重新切换模式。</p>
      <div v-else class="duo-self-slots-grid">
        <article v-for="(slot, idx) in myDuoSlots" :key="slot.slotIndex" class="duo-slot-card">
          <div class="duo-slot-header">
            <strong>槽位 {{ idx + 1 }}</strong>
            <span class="badge">你的槽位</span>
          </div>

          <label class="compact-field">
            <span>职业</span>
            <select :value="slot.characterId ?? ''" @change="updateDuoSlotCharacter(slot, $event)">
              <option value="">未选择职业</option>
              <option
                v-for="character in props.characters"
                :key="character.id"
                :value="character.id"
                :disabled="isDuoCharacterTakenByOtherSlot(slot, character.id)"
              >
                {{ character.name }}{{ isDuoCharacterTakenByOtherSlot(slot, character.id) ? "（已被选择）" : "" }}
              </option>
            </select>
          </label>

          <label class="compact-field">
            <span>技能</span>
            <select :value="slot.summonerSkillId ?? 'lucky_plus_one'" @change="updateDuoSlotSummonerSkill(slot, $event)">
              <option v-for="skill in SUMMONER_SKILLS" :key="skill.id" :value="skill.id">
                {{ skill.name }}
              </option>
            </select>
          </label>

          <p class="duo-slot-summary">当前：{{ duoSlotCharacterText(slot) }} / {{ duoSlotSummonerSkillText(slot) }}</p>
        </article>
      </div>

      <div v-if="!opponentPlayer" class="duo-wait-strip">
        <span class="duo-wait-label">{{ opponentTeamLabel }} · 等待玩家加入</span>
      </div>
      <div v-else class="duo-wait-strip">
        <span class="duo-wait-label">{{ opponentTeamLabel }} · 已加入，进入战斗后选择目标</span>
      </div>
    </section>

    <section v-else-if="isRogueliteMode" v-show="lobbyTab === 'characters'" class="character-picker roguelite-intro">
      <div class="picker-heading">
        <div>
          <h2>肉鸽挑战</h2>
          <p class="hint">固定从拳手开始，通过奖励获得能力。</p>
        </div>
      </div>
    </section>

    <div v-if="selectedCharacter" class="character-detail-backdrop career-card-backdrop" @click.self="closeCharacterDetails">
      <section class="character-detail-panel career-detail-panel" role="dialog" aria-modal="true" :aria-label="selectedCharacter.name">
        <CareerDetailCard
          :career-id="selectedCharacter.id"
          :name="selectedCharacter.name"
          :title="characterTitle(selectedCharacter)"
          :hp="selectedCharacter.maxHp"
          :avatar-src="characterAvatar(selectedCharacter.id)"
          :sprite-src="characterSprite(selectedCharacter.id)"
          :tags="characterDetailTags(selectedCharacter)"
          :skill-lines="fullDescription(selectedCharacter)"
          :selected="me?.characterId === selectedCharacter.id"
          :disabled="!isSelectableCharacter(selectedCharacter)"
          :recommended="isRecommendedCharacter(selectedCharacter)"
          @select="confirmCharacterChoice"
          @close="closeCharacterDetails"
        />
      </section>
    </div>

    <div v-if="selectedSummonerSkillDetail" class="character-detail-backdrop skill-detail-backdrop" @click.self="closeSummonerSkillDetails">
      <section class="character-detail-panel skill-detail-panel" role="dialog" aria-modal="true" :aria-label="selectedSummonerSkillDetail.name">
        <header class="character-detail-header">
          <div>
            <span class="detail-status">{{ summonerSkillTag(selectedSummonerSkillDetail.id) }}</span>
            <h2>{{ selectedSummonerSkillDetail.name }}</h2>
            <p>{{ (me?.summonerSkillId ?? 'lucky_plus_one') === selectedSummonerSkillDetail.id ? "当前已选择" : "可选择的召唤师技能" }}</p>
          </div>
          <button class="detail-close-btn" type="button" aria-label="关闭" @click="closeSummonerSkillDetails">×</button>
        </header>

        <div class="character-detail-body">
          <h3>技能说明</h3>
          <p>{{ selectedSummonerSkillDetail.description }}</p>
        </div>

        <footer class="character-detail-actions">
          <button class="primary-btn" type="button" @click="chooseSummonerSkillFromDetail">选择</button>
          <button class="ghost-btn" type="button" @click="closeSummonerSkillDetails">关闭</button>
        </footer>
      </section>
    </div>

    <RuleGuideDialog v-if="showRuleGuide" :characters="characters" @close="showRuleGuide = false" />
  </section>
</template>

<style scoped>
.career-card-backdrop {
  align-items: center;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.career-detail-panel {
  display: block;
  width: min(100%, 430px);
  max-height: none;
  overflow: visible;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.roguelite-intro-body {
  padding: 10px;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  line-height: 1.5;
}

.roguelite-intro-body p {
  margin: 4px 0;
}

.roguelite-intro-body ul {
  margin: 4px 0;
  padding-left: 20px;
}

.roguelite-intro-body li {
  font-size: 13px;
  color: #475569;
}

.duo-slot-picker {
  gap: 12px;
}

.duo-team-grid {
  display: grid;
  gap: 12px;
}

.duo-team-panel,
.duo-slot-card {
  display: grid;
  gap: 10px;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
}

.duo-slot-list {
  display: grid;
  gap: 10px;
}

.duo-slot-card h3 {
  margin: 0;
  color: #172033;
  font-size: 15px;
}

</style>
