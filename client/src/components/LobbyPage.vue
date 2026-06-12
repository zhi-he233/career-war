<script setup lang="ts">
import { computed, ref } from "vue";
import type { Character, CharacterId, Room, RoomSettings } from "@career-war/shared";
import RuleGuideDialog from "./RuleGuideDialog.vue";

const props = defineProps<{
  room: Room;
  playerId: string;
  characters: Character[];
}>();

const emit = defineEmits<{
  chooseCharacter: [characterId: CharacterId];
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
  allowDuplicateCharacters: true
};

const LOCKED_CHARACTERS: CharacterCard[] = [
  {
    id: "stoneTitan",
    name: "巨石泰坦",
    maxHp: 25,
    description: ["未开放"],
    difficulty: "normal",
    role: "defense",
    tags: ["防御", "未开放"],
    shortDescription: "厚重防御型职业，后续版本开放。",
    isImplemented: false
  },
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
const canStart = computed(() => props.room.players.length >= 2 && props.room.players.every((player) => player.characterId) && !hasDuplicateCharacterConflict.value);
const hasDuplicateCharacterConflict = computed(() => !roomSettings.value.allowDuplicateCharacters && duplicateCharacterIds.value.size > 0);
const duplicateCharacterIds = computed(() => {
  const counts = new Map<CharacterId, number>();
  for (const player of props.room.players) {
    if (!player.characterId) continue;
    counts.set(player.characterId, (counts.get(player.characterId) ?? 0) + 1);
  }
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([characterId]) => characterId));
});
const startHint = computed(() => {
  if (hasDuplicateCharacterConflict.value) return "当前已有重复职业，请玩家重新选择。";
  if (!canStart.value) return "至少 2 人，且所有玩家都选择职业后可开始。";
  return `当前选择：${characterName(me.value?.characterId)}`;
});
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}?room=${props.room.id}`);
const visibleCharacters = computed<CharacterCard[]>(() => [...props.characters, ...LOCKED_CHARACTERS].filter((character) => !character.isHidden));
const filteredCharacters = computed(() => visibleCharacters.value.filter((character) => matchesFilter(character) && matchesSearch(character)));
const randomCandidates = computed(() => filteredCharacters.value.filter(isSelectableCharacter));
const selectableMaxPlayerOptions = computed(() => MAX_PLAYER_OPTIONS.map((count) => ({ count, disabled: count < props.room.players.length })));

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
        <h2>玩家 {{ room.players.length }}/{{ roomSettings.maxPlayers }}</h2>
        <div class="player-list lobby-player-list">
          <article v-for="(player, index) in room.players" :key="player.id" class="player-card lobby-player-card">
            <div>
              <strong>{{ index + 1 }}号 {{ player.nickname }}</strong>
              <span v-if="player.id === room.hostId || player.isHost" class="badge host-badge">房主</span>
              <span class="badge" :class="{ offline: !player.isOnline }">{{ player.isOnline ? "在线" : "离线" }}</span>
            </div>
            <p>{{ characterName(player.characterId) }}</p>
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
            <span>最大人数</span>
            <select :value="roomSettings.maxPlayers" :disabled="room.phase !== 'lobby'" @change="updateMaxPlayers">
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
          最大 {{ roomSettings.maxPlayers }} 人 · {{ roomSettings.allowDuplicateCharacters ? "允许重复职业" : "不允许重复职业" }}
        </p>

        <p v-if="hasDuplicateCharacterConflict" class="settings-warning">当前已有重复职业，请玩家重新选择。</p>
      </section>

      <section class="lobby-start-bar">
        <div>
          <strong>{{ isHost ? "房主操作" : "游戏状态" }}</strong>
          <p class="hint">{{ isHost ? startHint : `当前选择：${characterName(me?.characterId)}` }}</p>
        </div>
        <button class="primary-btn" type="button" :disabled="!isHost || !canStart" @click="emit('startGame')">
          {{ isHost ? "开始游戏" : "等待房主开始" }}
        </button>
      </section>
    </section>

    <section class="character-picker">
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
