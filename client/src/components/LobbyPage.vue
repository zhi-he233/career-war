<script setup lang="ts">
import { computed, ref } from "vue";
import type { Character, CharacterId, DuoCharacterSlot, GameMode, Player, Room, RoomSettings, SummonerSkillId, TeamId } from "@career-war/shared";
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
}>();

type CharacterFilter = "all" | "newbie" | "attack" | "defense" | "healing" | "burst" | "special";
type CharacterCard = Omit<Character, "id"> & { id: string };

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
const selectedCharacter = ref<CharacterCard | null>(null);
const showRuleGuide = ref(false);

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
const selectedSummonerSkill = computed(() => SUMMONER_SKILLS.find((skill) => skill.id === (me.value?.summonerSkillId ?? "lucky_plus_one")) ?? SUMMONER_SKILLS[0]!);
const isDuoReadyToStart = computed(() => props.room.players.length === 2 && duoSlots.value.length === 4 && duoSlots.value.every((slot) => isDuoSlotCharacterReady(slot) && isDuoSlotSummonerSkillReady(slot)) && !hasDuplicateCharacterConflict.value);
const canStart = computed(() => {
  if (isDuoModeDevelopment.value) return isDuoReadyToStart.value;
  if (isSinglePlayerPveMode.value) return Boolean(me.value?.characterId && me.value?.summonerSkillId);
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
  if (isSinglePlayerPveMode.value && !me.value?.characterId) return "请选择 1 个职业。";
  if (isSinglePlayerPveMode.value && !me.value?.summonerSkillId) return "请选择 1 个召唤师技能。";
  if (isRogueliteMode.value) return `准备开始肉鸽挑战：连续 3 关，${characterName(me.value?.characterId)} vs AI`;
  if (isPveMode.value) return `准备开始人机练习：${characterName(me.value?.characterId)} vs AI`;
  if (hasDuplicateCharacterConflict.value) return "当前已有重复职业，请玩家重新选择。";
  if (!canStart.value) return "至少 2 人，且所有玩家都选择职业后可开始。";
  return `当前选择：${characterName(me.value?.characterId)}`;
});
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}?room=${props.room.id}`);
const visibleCharacters = computed<CharacterCard[]>(() => [...props.characters, ...LOCKED_CHARACTERS].filter((character) => !character.isHidden));
const filteredCharacters = computed(() => visibleCharacters.value.filter((character) => matchesFilter(character) && matchesSearch(character)));
const randomCandidates = computed(() => filteredCharacters.value.filter(isSelectableCharacter));
const visibleMaxPlayers = computed(() => (isDuoModeDevelopment.value ? 2 : isSinglePlayerPveMode.value ? 1 : roomSettings.value.maxPlayers));
const selectableMaxPlayerOptions = computed(() => (isDuoModeDevelopment.value ? [2] : isSinglePlayerPveMode.value ? [1] : MAX_PLAYER_OPTIONS).map((count) => ({ count, disabled: count < props.room.players.length })));

async function copyInviteLink(): Promise<void> {
  await navigator.clipboard.writeText(inviteLink.value);
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
</script>

<template>
  <section class="page-panel lobby-page">
    <section class="lobby-summary">
      <div class="room-code">
        <span>房间号</span>
        <strong>{{ room.id }}</strong>
      </div>

      <div class="lobby-quick-actions">
        <button class="secondary-btn" type="button" @click="copyInviteLink">复制邀请链接</button>
        <button class="ghost-btn" type="button" @click="showRuleGuide = true">规则 / 职业说明</button>
      </div>

      <section>
        <h2>玩家 {{ room.players.length }}/{{ visibleMaxPlayers }}</h2>
        <div class="player-list lobby-player-list">
          <article v-for="(player, index) in room.players" :key="player.id" class="player-card lobby-player-card">
            <div>
              <strong>{{ index + 1 }}号 {{ player.nickname }}</strong>
              <span v-if="player.id === room.hostId || player.isHost" class="badge host-badge">房主</span>
              <span class="badge" :class="{ offline: !player.isOnline }">{{ player.isOnline ? "在线" : "离线" }}</span>
            </div>
            <p>{{ classicPlayerChoiceText(player) }}</p>
          </article>
        </div>
      </section>

      <section class="room-settings-panel">
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

      <section v-if="!isDuoModeDevelopment" class="summoner-select-panel">
        <div class="settings-title">
          <h2>召唤师技能</h2>
          <span class="hint">每人选择 1 个</span>
        </div>
        <div class="summoner-options">
          <button
            v-for="skill in SUMMONER_SKILLS"
            :key="skill.id"
            class="summoner-option"
            :class="{ selected: (me?.summonerSkillId ?? 'lucky_plus_one') === skill.id }"
            type="button"
            @click="emit('chooseSummonerSkill', skill.id)"
          >
            <strong>{{ skill.name }}</strong>
            <small>{{ skill.description }}</small>
          </button>
        </div>
        <p class="hint">当前已选择：{{ selectedSummonerSkill.name }}</p>
      </section>

      <section class="lobby-start-bar">
        <div>
          <strong>{{ isHost ? "房主操作" : "游戏状态" }}</strong>
          <p class="hint">{{ isHost || isDuoModeDevelopment || isSinglePlayerPveMode ? startHint : `当前选择：${characterName(me?.characterId)}` }}</p>
        </div>
        <button class="primary-btn" type="button" :disabled="!isHost || !canStart" @click="emit('startGame')">
          {{ isDuoModeDevelopment ? isHost ? canStart ? "开始 2V2" : "2V2 选择未完成" : "等待房主开始" : isRogueliteMode ? canStart ? "开始肉鸽挑战" : "请选择职业和技能" : isPveMode ? canStart ? "开始人机练习" : "请选择职业和技能" : isHost ? "开始游戏" : "等待房主开始" }}
        </button>
      </section>
    </section>

    <section v-if="isDuoModeDevelopment" class="character-picker duo-slot-picker">
      <div class="picker-heading">
        <div>
          <h2>2V2 双角色选角</h2>
          <p class="hint">每名真实玩家选择 2 个角色槽位，进入战斗后轮流选择行动角色和敌方目标。</p>
        </div>
      </div>

      <div class="duo-team-grid">
        <article v-for="team in duoTeams" :key="team.id" class="duo-team-panel">
          <div class="settings-title">
            <h2>{{ team.label }}</h2>
            <span class="hint">{{ team.player ? team.player.nickname : "等待玩家加入" }}</span>
          </div>

          <div v-if="team.player" class="duo-slot-list">
            <article v-for="slot in duoSlotsForTeam(team.id)" :key="`${slot.controllerId}-${slot.slotIndex}`" class="duo-slot-card">
              <div class="settings-title">
                <h3>槽位 {{ slot.slotIndex + 1 }}</h3>
                <span class="badge" :class="{ 'host-badge': canEditDuoSlot(slot) }">{{ canEditDuoSlot(slot) ? "你的槽位" : "对方槽位" }}</span>
              </div>

              <label class="compact-field">
                <span>职业</span>
                <select v-if="canEditDuoSlot(slot)" :value="slot.characterId ?? ''" @change="updateDuoSlotCharacter(slot, $event)">
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
                <span v-else class="hint">{{ duoSlotCharacterText(slot) }}</span>
              </label>

              <label class="compact-field">
                <span>召唤师技能</span>
                <select v-if="canEditDuoSlot(slot)" :value="slot.summonerSkillId ?? 'lucky_plus_one'" @change="updateDuoSlotSummonerSkill(slot, $event)">
                  <option v-for="skill in SUMMONER_SKILLS" :key="skill.id" :value="skill.id">
                    {{ skill.name }}
                  </option>
                </select>
                <span v-else class="hint">{{ duoSlotSummonerSkillText(slot) }}</span>
              </label>

              <p class="hint">当前：{{ duoSlotCharacterText(slot) }} / {{ duoSlotSummonerSkillText(slot) }}</p>
            </article>
          </div>

          <p v-else class="empty-state">等待玩家加入后生成两个角色槽位。</p>
        </article>
      </div>
    </section>

    <section v-else class="character-picker">
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
        <button
          v-for="character in filteredCharacters"
          :key="character.id"
          class="character-choice"
          :class="{ selected: me?.characterId === character.id, locked: !isSelectableCharacter(character), taken: isTakenByOther(character.id) }"
          type="button"
          :disabled="!isSelectableCharacter(character)"
          @click="openCharacterDetails(character)"
        >
          <span class="character-status">{{ characterStatusLabel(character) }}</span>
          <strong>{{ character.name }}</strong>
          <span class="character-hp">最大血量 {{ character.maxHp }}</span>
          <span class="character-tags">
            <i>{{ difficultyLabel(character.difficulty) }}</i>
            <i>{{ roleLabel(character.role) }}</i>
          </span>
          <small>{{ character.shortDescription ?? character.description[0] }}</small>
          <span v-if="me?.characterId === character.id" class="chosen-note">你已选择</span>
          <span v-else-if="selectedNames(character.id).length" class="chosen-note">已选：{{ selectedNames(character.id).join("、") }}</span>
        </button>
      </div>

      <p v-if="filteredCharacters.length === 0" class="hint">没有找到匹配的职业。</p>
    </section>

    <div v-if="selectedCharacter" class="character-detail-backdrop" @click.self="closeCharacterDetails">
      <section class="character-detail-panel" role="dialog" aria-modal="true" :aria-label="selectedCharacter.name">
        <header class="character-detail-header">
          <div>
            <span class="detail-status" :class="{ locked: !isSelectableCharacter(selectedCharacter) }">{{ isSelectableCharacter(selectedCharacter) ? "已开放" : "未开放" }}</span>
            <h2>{{ selectedCharacter.name }}</h2>
            <p>最大血量 {{ selectedCharacter.maxHp }}</p>
          </div>
          <button class="detail-close-btn" type="button" aria-label="关闭" @click="closeCharacterDetails">×</button>
        </header>

        <div class="character-detail-meta">
          <span>{{ difficultyLabel(selectedCharacter.difficulty) }}</span>
          <span>{{ roleLabel(selectedCharacter.role) }}</span>
          <span v-for="tag in selectedCharacter.tags ?? []" :key="tag">{{ tag }}</span>
        </div>

        <div class="character-detail-body">
          <h3>技能说明</h3>
          <ul>
            <li v-for="item in fullDescription(selectedCharacter)" :key="item">{{ item }}</li>
          </ul>
          <p v-if="me?.characterId === selectedCharacter.id" class="chosen-note">你已选择这个职业</p>
          <p v-else-if="selectedNames(selectedCharacter.id).length" class="chosen-note">已选：{{ selectedNames(selectedCharacter.id).join("、") }}</p>
          <p v-if="!isImplementedCharacter(selectedCharacter)" class="hint">该职业暂未开放，暂时不能选择。</p>
          <p v-else-if="isTakenByOther(selectedCharacter.id)" class="hint">该职业已被其他玩家选择。</p>
        </div>

        <footer class="character-detail-actions">
          <button class="primary-btn" type="button" :disabled="!isSelectableCharacter(selectedCharacter)" @click="confirmCharacterChoice">
            {{ isSelectableCharacter(selectedCharacter) ? "确认选择" : isTakenByOther(selectedCharacter.id) ? "已被选择" : "未开放" }}
          </button>
          <button class="ghost-btn" type="button" @click="closeCharacterDetails">退出</button>
        </footer>
      </section>
    </div>

    <RuleGuideDialog v-if="showRuleGuide" :characters="characters" @close="showRuleGuide = false" />
  </section>
</template>

<style scoped>
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

@media (min-width: 760px) {
  .duo-team-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
