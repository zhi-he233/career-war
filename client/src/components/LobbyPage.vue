<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { Character, CharacterId, DuoCharacterSlot, GameMode, Player, Room, RoomSettings, SummonerSkillId, TeamId } from "@career-war/shared";
import { getCharacterArt } from "../assets/art/characters";
import CharacterDetailDialog from "./lobby/CharacterDetailDialog.vue";
import ClassicCharacterPicker from "./lobby/ClassicCharacterPicker.vue";
import DuoSlotPicker from "./lobby/DuoSlotPicker.vue";
import LobbyStartBar from "./lobby/LobbyStartBar.vue";
import LobbyTabs from "./lobby/LobbyTabs.vue";
import PlayerListPanel from "./lobby/PlayerListPanel.vue";
import RogueliteIntroPanel from "./lobby/RogueliteIntroPanel.vue";
import RoomSettingsPanel from "./lobby/RoomSettingsPanel.vue";
import SummonerSkillDetailDialog from "./lobby/SummonerSkillDetailDialog.vue";
import SummonerSkillPanel from "./lobby/SummonerSkillPanel.vue";
import RuleGuideDialog from "./RuleGuideDialog.vue";
import {
  type CharacterCard,
  type CharacterFilter,
  type SummonerSkill,
  CAREER_ART_ID_ALIASES,
  CAREER_DETAIL_TAGS,
  CHARACTER_PAGE_SIZE,
  DEFAULT_ROOM_SETTINGS,
  DIFFICULTY_LABELS,
  FILTERS,
  LOCKED_CHARACTERS,
  MAX_PLAYER_OPTIONS,
  ROLE_LABELS,
  SUMMONER_SKILLS,
} from "./lobby/lobbyData";

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
  if (isRogueliteMode.value && !me.value?.characterId) return "请选择职业。";
  if (isRogueliteMode.value) return "准备开始肉鸽挑战。";
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
  const buttonText = button?.textContent?.trim();
  if (!button || (buttonText !== "离开" && buttonText !== "离开房间")) return;
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

function updateMaxPlayers(maxPlayers: number): void {
  emit("updateRoomSettings", { maxPlayers });
}

function updateDuplicateSetting(allowDuplicateCharacters: boolean): void {
  emit("updateRoomSettings", { allowDuplicateCharacters });
}

function updateGameMode(gameMode: GameMode): void {
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

function updateDuoSlotCharacter(slotIndex: number, characterId: CharacterId): void {
  emit("chooseDuoSlotCharacter", { slotIndex: slotIndex as 0 | 1, characterId });
}

function updateDuoSlotSummonerSkill(slotIndex: number, summonerSkillId: SummonerSkillId): void {
  emit("chooseDuoSlotSummonerSkill", { slotIndex: slotIndex as 0 | 1, summonerSkillId });
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

      <LobbyTabs
        v-model:active-tab="lobbyTab"
        :is-duo-mode="isDuoModeDevelopment"
        :is-classic-mode="!isDuoModeDevelopment && !isRogueliteMode"
      />

      <PlayerListPanel
        v-show="lobbyTab === 'players'"
        :players-count="room.players.length"
        :max-players="visibleMaxPlayers"
        :lobby-seats="lobbySeats"
        :room-host-id="room.hostId"
        :get-character-name="characterName"
        :can-kick-player="canKickPlayer"
        @kick-player="requestKickPlayer"
      />

      <RoomSettingsPanel
        v-show="lobbyTab === 'settings'"
        :is-host="isHost"
        :room-phase="room.phase"
        :room-mode="roomMode"
        :visible-max-players="visibleMaxPlayers"
        :allow-duplicate-characters="roomSettings.allowDuplicateCharacters"
        :selectable-max-player-options="selectableMaxPlayerOptions"
        :is-single-player-pve-mode="isSinglePlayerPveMode"
        :has-duplicate-character-conflict="hasDuplicateCharacterConflict"
        :is-duo-mode-development="isDuoModeDevelopment"
        :get-game-mode-label="gameModeLabel"
        @update:game-mode="updateGameMode"
        @update:max-players="updateMaxPlayers"
        @update:duplicate-setting="updateDuplicateSetting"
      />

      <SummonerSkillPanel
        v-show="lobbyTab === 'summoner'"
        :skills="SUMMONER_SKILLS"
        :selected-skill-id="(me?.summonerSkillId ?? 'lucky_plus_one')"
        :selected-skill-name="selectedSummonerSkill.name"
        :get-skill-tag="summonerSkillTag"
        @select-skill="selectSummonerSkill"
        @open-skill-details="openSummonerSkillDetails"
      />

      <ClassicCharacterPicker
        v-if="!isDuoModeDevelopment && !isRogueliteMode"
        v-show="lobbyTab === 'characters'"
        v-model:active-filter="activeFilter"
        v-model:search-keyword="searchKeyword"
        v-model:character-page="characterPage"
        :me="me"
        :paged-characters="pagedCharacters"
        :filtered-characters-empty="filteredCharacters.length === 0"
        :character-page-count="characterPageCount"
        :random-candidates="randomCandidates"
        :filters="FILTERS"
        :get-character-name="characterName"
        :get-character-sprite="characterSprite"
        :get-character-status-label="characterStatusLabel"
        :is-character-selectable="isSelectableCharacter"
        :is-character-taken-by-other="isTakenByOther"
        :get-difficulty-label="difficultyLabel"
        :get-role-label="roleLabel"
        :get-selected-names="selectedNames"
        @open-character-details="openCharacterDetails"
      />

      <LobbyStartBar
        :status-label="isHost ? '房主操作' : '游戏状态'"
        :hint-text="isHost || isDuoModeDevelopment || isSinglePlayerPveMode ? startHint : `当前选择：${characterName(me?.characterId)}`"
        :button-text="isDuoModeDevelopment ? isHost ? canStart ? '开始 2V2' : '2V2 选择未完成' : '等待房主开始' : isRogueliteMode ? '开始肉鸽挑战' : isPveMode ? canStart ? '开始人机练习' : '请选择职业和技能' : isHost ? '开始游戏' : '等待房主开始'"
        :button-disabled="!isHost || !canStart"
        @start-game="emit('startGame')"
      />
    </section>

    <DuoSlotPicker
      v-if="isDuoModeDevelopment"
      v-show="lobbyTab === 'characters'"
      :duo-slots="duoSlots"
      :my-duo-slots="myDuoSlots"
      :characters="props.characters"
      :opponent-player="opponentPlayer"
      :opponent-team-label="opponentTeamLabel"
      :can-edit-duo-slot="canEditDuoSlot"
      :is-duo-character-taken-by-other-slot="isDuoCharacterTakenByOtherSlot"
      :get-duo-slot-character-text="duoSlotCharacterText"
      :get-duo-slot-summoner-skill-text="duoSlotSummonerSkillText"
      @update:slot-character="(payload) => updateDuoSlotCharacter(payload.slotIndex, payload.characterId)"
      @update:slot-summoner-skill="(payload) => updateDuoSlotSummonerSkill(payload.slotIndex, payload.summonerSkillId)"
    />

    <RogueliteIntroPanel
      v-else-if="isRogueliteMode"
      v-show="lobbyTab === 'characters'"
    />

    <CharacterDetailDialog
      v-if="selectedCharacter"
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

    <SummonerSkillDetailDialog
      v-if="selectedSummonerSkillDetail"
      :skill="selectedSummonerSkillDetail"
      :selected-skill-id="(me?.summonerSkillId ?? 'lucky_plus_one')"
      :get-skill-tag="summonerSkillTag"
      @select="chooseSummonerSkillFromDetail"
      @close="closeSummonerSkillDetails"
    />

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
