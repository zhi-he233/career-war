<script setup lang="ts">
import type { Character, CharacterId, Player } from "@career-war/shared";

type CharacterFilter = "all" | "newbie" | "attack" | "defense" | "healing" | "burst" | "special";
type CharacterCard = Omit<Character, "id"> & { id: string };

const props = defineProps<{
  me: Player | undefined;
  activeFilter: CharacterFilter;
  searchKeyword: string;
  pagedCharacters: CharacterCard[];
  filteredCharactersEmpty: boolean;
  characterPage: number;
  characterPageCount: number;
  randomCandidates: CharacterCard[];
  filters: Array<{ id: CharacterFilter; label: string }>;
  getCharacterName: (id: CharacterId | undefined) => string;
  getCharacterSprite: (id: string) => string | undefined;
  getCharacterStatusLabel: (c: CharacterCard) => string;
  isCharacterSelectable: (c: CharacterCard | null | undefined) => boolean;
  isCharacterTakenByOther: (id: string) => boolean;
  getDifficultyLabel: (d: Character["difficulty"]) => string;
  getRoleLabel: (r: Character["role"] | CharacterFilter) => string;
  getSelectedNames: (id: string) => string[];
}>();

const emit = defineEmits<{
  (e: "update:activeFilter", value: CharacterFilter): void;
  (e: "update:searchKeyword", value: string): void;
  (e: "update:characterPage", value: number): void;
  (e: "openCharacterDetails", character: CharacterCard): void;
}>();

function onSearchInput(event: Event): void {
  emit("update:searchKeyword", (event.target as HTMLInputElement).value);
}

function onRandomCharacter(): void {
  const pool = props.randomCandidates;
  if (pool.length === 0) return;
  const character = pool[Math.floor(Math.random() * pool.length)];
  if (character) emit("openCharacterDetails", character);
}

function onCardClick(character: CharacterCard): void {
  emit("openCharacterDetails", character);
}
</script>

<template>
  <section class="character-picker">
    <div class="picker-heading">
      <div>
        <h2>选择职业</h2>
        <p class="hint">当前选择：{{ getCharacterName(me?.characterId) }}</p>
      </div>
      <button
        class="secondary-btn random-character-btn"
        type="button"
        :disabled="randomCandidates.length === 0"
        @click="onRandomCharacter"
      >
        随机职业
      </button>
    </div>

    <div class="character-toolbar">
      <input
        :value="searchKeyword"
        class="character-search"
        type="search"
        placeholder="搜索职业名或标签"
        @input="onSearchInput"
      />
      <div class="character-filters" aria-label="职业分类筛选">
        <button
          v-for="filter in filters"
          :key="filter.id"
          class="filter-chip"
          :class="{ active: activeFilter === filter.id }"
          type="button"
          @click="emit('update:activeFilter', filter.id)"
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
        :class="{
          selected: me?.characterId === character.id,
          locked: !isCharacterSelectable(character),
          taken: isCharacterTakenByOther(character.id),
        }"
        role="button"
        :tabindex="isCharacterSelectable(character) ? 0 : -1"
        :aria-disabled="!isCharacterSelectable(character)"
        @click="onCardClick(character)"
        @keydown.enter.prevent="onCardClick(character)"
        @keydown.space.prevent="onCardClick(character)"
      >
        <span class="character-status">{{ getCharacterStatusLabel(character) }}</span>
        <span class="character-art-thumb" :class="{ empty: !getCharacterSprite(character.id) }">
          <img
            v-if="getCharacterSprite(character.id)"
            :src="getCharacterSprite(character.id)"
            :alt="character.name"
            draggable="false"
          />
          <span v-else>{{ character.name.slice(0, 1) }}</span>
        </span>
        <span class="character-card-copy">
          <strong>{{ character.name }}</strong>
          <span class="character-hp">最大血量 {{ character.maxHp }}</span>
          <span class="character-tags">
            <i>{{ getDifficultyLabel(character.difficulty) }}</i>
            <i>{{ getRoleLabel(character.role) }}</i>
          </span>
          <small>{{ character.shortDescription ?? character.description[0] }}</small>
          <span v-if="me?.characterId === character.id" class="chosen-note">你已选择</span>
          <span
            v-else-if="getSelectedNames(character.id).length"
            class="chosen-note"
          >
            已选：{{ getSelectedNames(character.id).join("、") }}
          </span>
        </span>
      </article>
    </div>

    <div v-if="characterPageCount > 1" class="character-pager">
      <button
        class="ghost-btn small-btn"
        type="button"
        :disabled="characterPage === 0"
        @click="emit('update:characterPage', Math.max(0, characterPage - 1))"
      >
        上一页
      </button>
      <span>{{ characterPage + 1 }}/{{ characterPageCount }}</span>
      <button
        class="ghost-btn small-btn"
        type="button"
        :disabled="characterPage + 1 >= characterPageCount"
        @click="emit('update:characterPage', Math.min(characterPageCount - 1, characterPage + 1))"
      >
        下一页
      </button>
    </div>

    <p v-if="filteredCharactersEmpty" class="hint">没有找到匹配的职业。</p>
  </section>
</template>
