<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

type Difficulty = "simple" | "normal" | "complex" | "expert";
type Role = "attack" | "defense" | "healing" | "burst" | "special";
type ImplementationMode = "data_driven" | "code_driven";
type PresetId = "basic_damage" | "no_damage" | "fixed_damage" | "damage_bonus" | "heal_self" | "shield_self";
type Roll = 1 | 2 | 3 | 4 | 5 | 6;
type CollapseSection = "list" | "basic" | "implementation" | "availability" | "assets" | "dice";

interface EditableDiceFace {
  roll: Roll;
  name: string;
  description: string;
  presetId?: PresetId;
  params?: Record<string, unknown>;
}

interface EditableCharacter {
  id: string;
  name: string;
  title?: string;
  description: string;
  maxHp: number;
  avatarUrl?: string;
  spriteUrl?: string;
  tags: string[];
  difficulty: Difficulty;
  sortOrder: number;
  availability: {
    classic: boolean;
    duo: boolean;
    pve: boolean;
    roguelite: boolean;
    hidden?: boolean;
  };
  implementation: {
    mode: ImplementationMode;
    handlerId?: string;
  };
  diceFaces: EditableDiceFace[];
  role?: Role;
  shortDescription?: string;
  fullDescription?: string[];
  isImplemented?: boolean;
}

const emit = defineEmits<{ back: [] }>();

const characters = ref<EditableCharacter[]>([]);
const selectedIndex = ref(0);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const savedSnapshot = ref("");
const collapsedSections = ref<Record<CollapseSection, boolean>>({
  list: false,
  basic: false,
  implementation: false,
  availability: false,
  assets: false,
  dice: false,
});

const difficultyOptions: Array<{ id: Difficulty; label: string }> = [
  { id: "simple", label: "简单" },
  { id: "normal", label: "普通" },
  { id: "complex", label: "复杂" },
  { id: "expert", label: "专家" },
];

const roleOptions: Array<{ id: Role; label: string }> = [
  { id: "attack", label: "攻击" },
  { id: "defense", label: "防御" },
  { id: "healing", label: "回复" },
  { id: "burst", label: "爆发" },
  { id: "special", label: "特殊" },
];

const presetOptions: Array<{ id: PresetId; label: string }> = [
  { id: "basic_damage", label: "基础伤害" },
  { id: "no_damage", label: "无伤害" },
  { id: "fixed_damage", label: "固定伤害" },
  { id: "damage_bonus", label: "伤害加成" },
  { id: "heal_self", label: "自我回复" },
  { id: "shield_self", label: "获得护盾" },
];

const selectedCharacter = computed(() => characters.value[selectedIndex.value] ?? null);
const currentSnapshot = computed(() => JSON.stringify(characters.value));
const hasUnsavedChanges = computed(() => savedSnapshot.value !== "" && savedSnapshot.value !== currentSnapshot.value);

function isCollapsed(section: CollapseSection): boolean {
  return collapsedSections.value[section];
}

function toggleCollapse(section: CollapseSection): void {
  collapsedSections.value[section] = !collapsedSections.value[section];
}

function uniqueId(prefix: string): string {
  const used = new Set(characters.value.map((character) => character.id));
  let index = characters.value.length + 1;
  let id = `${prefix}_${index}`;
  while (used.has(id)) {
    index += 1;
    id = `${prefix}_${index}`;
  }
  return id;
}

function toSafeIdBase(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "character";
}

function defaultDiceFaces(): EditableDiceFace[] {
  return [1, 2, 3, 4, 5, 6].map((roll) => ({
    roll: roll as Roll,
    name: `${roll} 点`,
    description: `造成 ${roll} 点基础伤害。`,
    presetId: "basic_damage",
    params: { damage: roll },
  }));
}

function blankCharacter(): EditableCharacter {
  const id = uniqueId("character");
  return {
    id,
    name: "新职业",
    title: "",
    description: "一个新的数据驱动职业。",
    maxHp: 20,
    avatarUrl: "",
    spriteUrl: "",
    tags: [],
    difficulty: "normal",
    role: "attack",
    sortOrder: characters.value.length + 1,
    availability: { classic: true, duo: true, pve: true, roguelite: true, hidden: false },
    implementation: { mode: "data_driven" },
    diceFaces: defaultDiceFaces(),
    shortDescription: "一个新的数据驱动职业。",
    fullDescription: [],
    isImplemented: true,
  };
}

function normalizeCharacters(input: unknown): EditableCharacter[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const raw = item as Partial<EditableCharacter>;
    return {
      ...blankCharacter(),
      ...raw,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      availability: { classic: false, duo: false, pve: false, roguelite: false, hidden: false, ...raw.availability },
      implementation: { mode: "code_driven", ...raw.implementation },
      diceFaces: Array.isArray(raw.diceFaces) && raw.diceFaces.length === 6 ? raw.diceFaces : defaultDiceFaces(),
      fullDescription: Array.isArray(raw.fullDescription) ? raw.fullDescription : [],
    };
  });
}

async function loadCharacters(): Promise<void> {
  if (hasUnsavedChanges.value && !window.confirm("当前有未保存修改，确定重新读取吗？")) return;
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const response = await fetch("/api/editor/characters", { credentials: "same-origin" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "读取职业失败");
    characters.value = normalizeCharacters(data.characters);
    selectedIndex.value = 0;
    savedSnapshot.value = currentSnapshot.value;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "读取职业失败";
  } finally {
    loading.value = false;
  }
}

function addCharacter(): void {
  characters.value.push(blankCharacter());
  selectedIndex.value = characters.value.length - 1;
  successMessage.value = "";
}

function duplicateCharacter(): void {
  const source = selectedCharacter.value;
  if (!source) return;
  const copy = JSON.parse(JSON.stringify(source)) as EditableCharacter;
  copy.id = uniqueId(`${toSafeIdBase(source.id)}_copy`);
  copy.name = `${source.name} 副本`;
  copy.sortOrder = characters.value.length + 1;
  if (copy.implementation.mode === "code_driven") copy.implementation.handlerId = source.implementation.handlerId ?? source.id;
  characters.value.push(copy);
  selectedIndex.value = characters.value.length - 1;
  successMessage.value = "";
}

function removeCharacter(): void {
  if (!selectedCharacter.value) return;
  if (!window.confirm(`确定删除 ${selectedCharacter.value.name || selectedCharacter.value.id} 吗？`)) return;
  characters.value.splice(selectedIndex.value, 1);
  selectedIndex.value = Math.max(0, Math.min(selectedIndex.value, characters.value.length - 1));
  successMessage.value = "";
}

function setTags(value: string): void {
  if (!selectedCharacter.value) return;
  selectedCharacter.value.tags = value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

function setFullDescription(value: string): void {
  if (!selectedCharacter.value) return;
  selectedCharacter.value.fullDescription = value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function setImplementationMode(mode: ImplementationMode): void {
  const character = selectedCharacter.value;
  if (!character) return;
  character.implementation.mode = mode;
  if (mode === "code_driven") {
    character.implementation.handlerId ||= character.id;
    for (const face of character.diceFaces) {
      delete face.presetId;
      delete face.params;
    }
  } else {
    delete character.implementation.handlerId;
    for (const face of character.diceFaces) {
      face.presetId ||= "basic_damage";
      face.params ||= { damage: face.roll };
    }
  }
}

function formatParams(params: Record<string, unknown> | undefined): string {
  return params ? JSON.stringify(params, null, 2) : "";
}

function updateParams(face: EditableDiceFace, event: Event): void {
  const text = (event.target as HTMLTextAreaElement).value.trim();
  if (!text) {
    delete face.params;
    return;
  }
  try {
    face.params = JSON.parse(text) as Record<string, unknown>;
    errorMessage.value = "";
  } catch {
    errorMessage.value = `骰面 ${face.roll} 的 params 不是合法 JSON`;
  }
}

function validateBeforeSave(): string {
  if (characters.value.length === 0) return "至少需要一个职业";
  const ids = new Set<string>();
  for (const character of characters.value) {
    if (!character.id.trim()) return "职业 id 不能为空";
    if (ids.has(character.id)) return `职业 id 重复：${character.id}`;
    ids.add(character.id);
    if (!character.name.trim()) return `${character.id} 缺少名称`;
    if (!Number.isInteger(character.maxHp) || character.maxHp < 1 || character.maxHp > 99) return `${character.id} 最大生命必须是 1-99`;
    if (character.implementation.mode === "code_driven" && !character.implementation.handlerId?.trim()) return `${character.id} 需要 handlerId`;
    const availability = character.availability;
    if (!availability.hidden && !availability.classic && !availability.duo && !availability.pve && !availability.roguelite) return `${character.id} 至少启用一个模式，或设为 hidden`;
    const rolls = new Set(character.diceFaces.map((face) => face.roll));
    for (const roll of [1, 2, 3, 4, 5, 6]) {
      if (!rolls.has(roll as Roll)) return `${character.id} 缺少 ${roll} 点骰面`;
    }
    if (character.implementation.mode === "data_driven" && character.diceFaces.some((face) => !face.presetId)) return `${character.id} 的 data_driven 骰面必须有 presetId`;
  }
  return "";
}

async function saveCharacters(): Promise<void> {
  const validationError = validateBeforeSave();
  if (validationError) {
    errorMessage.value = validationError;
    successMessage.value = "";
    return;
  }
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const response = await fetch("/api/editor/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ characters: characters.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "保存职业失败");
    characters.value = normalizeCharacters(data.characters);
    savedSnapshot.value = currentSnapshot.value;
    successMessage.value = "职业数据已保存，运行时 cache 已刷新。";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存职业失败";
  } finally {
    saving.value = false;
  }
}

function back(): void {
  if (hasUnsavedChanges.value && !window.confirm("当前有未保存修改，确定离开吗？")) return;
  emit("back");
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onMounted(() => {
  document.documentElement.classList.add("editor-scroll-unlocked");
  document.body.classList.add("editor-scroll-unlocked");
  window.addEventListener("beforeunload", handleBeforeUnload);
  void loadCharacters();
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("editor-scroll-unlocked");
  document.body.classList.remove("editor-scroll-unlocked");
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <section class="character-editor-page">
    <header class="tool-header">
      <div class="tool-title">
        <span class="eyebrow">Character Editor V1</span>
        <h2>职业编辑器</h2>
      </div>
      <div class="tool-actions">
        <button class="ghost-btn compact-btn" type="button" @click="back">返回</button>
        <button class="secondary-btn compact-btn" type="button" :disabled="loading || saving" @click="loadCharacters">读取</button>
        <button class="primary-btn compact-btn" type="button" :disabled="loading || saving" @click="saveCharacters">
          {{ saving ? "保存中" : "保存" }}
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="editor-message error">{{ errorMessage }}</p>
    <p v-else-if="successMessage" class="editor-message success">{{ successMessage }}</p>

    <div class="editor-workspace">
      <aside class="item-list">
        <div class="list-head">
          <div class="list-title">
            <strong>职业列表</strong>
            <span>{{ characters.length }}</span>
          </div>
          <button class="tiny-collapse-btn" type="button" @click="toggleCollapse('list')">
            {{ isCollapsed("list") ? "展开" : "收起" }}
          </button>
        </div>
        <div class="list-actions">
          <button class="list-action-btn secondary-btn" type="button" @click="addCharacter">新增</button>
          <button class="list-action-btn ghost-btn" type="button" :disabled="!selectedCharacter" @click="duplicateCharacter">复制</button>
          <button class="list-action-btn ghost-btn danger-text" type="button" :disabled="!selectedCharacter" @click="removeCharacter">删除</button>
        </div>
        <div v-if="!isCollapsed('list')" class="list-body">
          <button
            v-for="(character, index) in characters"
            :key="`${character.id}-${index}`"
            class="item-button"
            :class="{ active: selectedIndex === index }"
            type="button"
            @click="selectedIndex = index"
          >
            <span>{{ character.name || character.id }}</span>
            <small>{{ character.id }} · {{ character.implementation.mode }}</small>
          </button>
        </div>
      </aside>

      <main class="form-panel">
        <div v-if="loading" class="empty-panel">正在读取职业数据...</div>
        <form v-else-if="selectedCharacter" class="editor-form" @submit.prevent="saveCharacters">
          <fieldset class="editor-fieldset">
            <legend>
              <span>基础信息</span>
              <button class="tiny-collapse-btn" type="button" @click="toggleCollapse('basic')">
                {{ isCollapsed("basic") ? "展开" : "收起" }}
              </button>
            </legend>
            <div v-if="!isCollapsed('basic')" class="field-grid">
              <label class="field">
                <span>id</span>
                <input v-model.trim="selectedCharacter.id" />
              </label>
              <label class="field">
                <span>名称</span>
                <input v-model="selectedCharacter.name" />
              </label>
              <label class="field">
                <span>标题</span>
                <input v-model="selectedCharacter.title" />
              </label>
              <label class="field">
                <span>最大生命</span>
                <input v-model.number="selectedCharacter.maxHp" type="number" min="1" max="99" />
              </label>
              <label class="field">
                <span>难度</span>
                <select v-model="selectedCharacter.difficulty">
                  <option v-for="option in difficultyOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>定位</span>
                <select v-model="selectedCharacter.role">
                  <option v-for="option in roleOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>排序</span>
                <input v-model.number="selectedCharacter.sortOrder" type="number" />
              </label>
              <label class="field">
                <span>标签</span>
                <input :value="selectedCharacter.tags.join('，')" @change="setTags(($event.target as HTMLInputElement).value)" />
              </label>
            </div>
            <label v-if="!isCollapsed('basic')" class="field">
              <span>短描述</span>
              <input v-model="selectedCharacter.description" />
            </label>
            <label v-if="!isCollapsed('basic')" class="field">
              <span>详情描述</span>
              <textarea :value="selectedCharacter.fullDescription?.join('\n')" rows="4" @change="setFullDescription(($event.target as HTMLTextAreaElement).value)" />
            </label>
          </fieldset>

          <fieldset class="editor-fieldset">
            <legend>
              <span>实现方式</span>
              <button class="tiny-collapse-btn" type="button" @click="toggleCollapse('implementation')">
                {{ isCollapsed("implementation") ? "展开" : "收起" }}
              </button>
            </legend>
            <div v-if="!isCollapsed('implementation')" class="field-grid">
              <label class="field">
                <span>类型</span>
                <select :value="selectedCharacter.implementation.mode" @change="setImplementationMode(($event.target as HTMLSelectElement).value as ImplementationMode)">
                  <option value="data_driven">data_driven</option>
                  <option value="code_driven">code_driven</option>
                </select>
              </label>
              <label v-if="selectedCharacter.implementation.mode === 'code_driven'" class="field">
                <span>handlerId</span>
                <input v-model.trim="selectedCharacter.implementation.handlerId" />
              </label>
            </div>
          </fieldset>

          <fieldset class="editor-fieldset">
            <legend>
              <span>模式可用范围</span>
              <button class="tiny-collapse-btn" type="button" @click="toggleCollapse('availability')">
                {{ isCollapsed("availability") ? "展开" : "收起" }}
              </button>
            </legend>
            <div v-if="!isCollapsed('availability')" class="toggle-grid">
              <label class="checkbox-field"><input v-model="selectedCharacter.availability.classic" type="checkbox" /><span>classic</span></label>
              <label class="checkbox-field"><input v-model="selectedCharacter.availability.duo" type="checkbox" /><span>duo</span></label>
              <label class="checkbox-field"><input v-model="selectedCharacter.availability.pve" type="checkbox" /><span>pve</span></label>
              <label class="checkbox-field"><input v-model="selectedCharacter.availability.roguelite" type="checkbox" /><span>roguelite</span></label>
              <label class="checkbox-field"><input v-model="selectedCharacter.availability.hidden" type="checkbox" /><span>hidden</span></label>
            </div>
          </fieldset>

          <fieldset class="editor-fieldset">
            <legend>
              <span>外观资源</span>
              <button class="tiny-collapse-btn" type="button" @click="toggleCollapse('assets')">
                {{ isCollapsed("assets") ? "展开" : "收起" }}
              </button>
            </legend>
            <div v-if="!isCollapsed('assets')" class="field-grid">
              <label class="field">
                <span>avatarUrl</span>
                <input v-model="selectedCharacter.avatarUrl" placeholder="/characters/example_avatar.png" />
              </label>
              <label class="field">
                <span>spriteUrl</span>
                <input v-model="selectedCharacter.spriteUrl" placeholder="/characters/example_sprite.png" />
              </label>
            </div>
          </fieldset>

          <fieldset class="editor-fieldset">
            <legend>
              <span>骰子技能展示</span>
              <button class="tiny-collapse-btn" type="button" @click="toggleCollapse('dice')">
                {{ isCollapsed("dice") ? "展开" : "收起" }}
              </button>
            </legend>
            <div v-if="!isCollapsed('dice')" class="dice-face-list">
              <div
                v-for="face in selectedCharacter.diceFaces"
                :key="face.roll"
                class="dice-face-row"
                :class="{ 'code-driven': selectedCharacter.implementation.mode === 'code_driven' }"
              >
                <strong>{{ face.roll }}</strong>
                <label class="field compact-field">
                  <span>名称</span>
                  <input v-model="face.name" />
                </label>
                <label class="field compact-field">
                  <span>描述</span>
                  <input v-model="face.description" />
                </label>
                <label v-if="selectedCharacter.implementation.mode === 'data_driven'" class="field compact-field">
                  <span>预设</span>
                  <select v-model="face.presetId">
                    <option value="">无</option>
                    <option v-for="option in presetOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                  </select>
                </label>
                <label v-if="selectedCharacter.implementation.mode === 'data_driven'" class="field compact-field params-field">
                  <span>参数 JSON</span>
                  <textarea :value="formatParams(face.params)" rows="2" @change="updateParams(face, $event)" />
                </label>
              </div>
            </div>
          </fieldset>
        </form>
        <div v-else class="empty-panel">暂无职业数据</div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.character-editor-page {
  display: grid;
  gap: 12px;
  width: min(100%, 1180px);
  min-height: calc(100dvh - 96px);
  margin: 0 auto;
  padding: 0 4px 36px;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 8px 0 2px;
}

.tool-title h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.12;
}

.tool-actions,
.list-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-actions {
  justify-content: flex-end;
}

.compact-btn,
.list-action-btn {
  min-height: 40px;
  padding: 7px 13px;
  white-space: nowrap;
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(250px, 330px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.item-list,
.form-panel {
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
}

.item-list {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.list-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.list-title span {
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.tiny-collapse-btn {
  flex: 0 0 auto;
  min-height: 24px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-radius: 6px;
  padding: 2px 7px;
  background: #fffefa;
  color: #475569;
  box-shadow: none;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.2;
}

.tiny-collapse-btn:hover {
  border-color: rgba(15, 23, 42, 0.32);
  color: #0f172a;
}

.list-body {
  display: grid;
  gap: 8px;
}

.item-button {
  display: grid;
  gap: 3px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 2px solid rgba(15, 23, 42, 0.14);
  border-radius: 8px;
  background: #fffefa;
  color: #0f172a;
  box-shadow: 0 2px 0 rgba(15, 23, 42, 0.12);
  text-align: left;
}

.item-button.active {
  border-color: #111827;
  background: #fff2c7;
}

.item-button span,
.item-button small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-button span {
  font-size: 16px;
  font-weight: 900;
}

.item-button small {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.form-panel {
  padding: 14px;
}

.editor-form,
.editor-fieldset {
  display: grid;
  gap: 12px;
}

.editor-fieldset {
  margin: 0;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #f8fafc;
}

.editor-fieldset legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
}

.editor-fieldset legend span {
  white-space: nowrap;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field span {
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 8px;
  padding: 10px 11px;
  background: #fffefa;
  color: #111827;
  font: inherit;
  line-height: 1.35;
}

.field textarea {
  resize: vertical;
}

.compact-field input,
.compact-field select,
.compact-field textarea {
  padding: 8px 9px;
}

.toggle-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: #fffefa;
  color: #334155;
  font-weight: 900;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
}

.dice-face-list {
  display: grid;
  gap: 8px;
}

.dice-face-row {
  display: grid;
  grid-template-columns: 34px minmax(90px, 0.8fr) minmax(160px, 1.4fr) minmax(130px, 0.9fr) minmax(160px, 1fr);
  gap: 8px;
  align-items: start;
  padding: 8px;
  border-radius: 8px;
  background: #fffefa;
}

.dice-face-row strong {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #111827;
  color: #fffdf8;
}

.params-field textarea {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}

.editor-message,
.empty-panel {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  font-weight: 800;
}

.editor-message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.editor-message.success {
  background: #ecfdf5;
  color: #047857;
}

.empty-panel {
  border: 1px dashed rgba(15, 23, 42, 0.16);
  color: #64748b;
  text-align: center;
}

.danger-text {
  color: #b91c1c;
}

@media (max-width: 920px) {
  .editor-workspace {
    grid-template-columns: 1fr;
  }

  .dice-face-row {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .dice-face-row .field {
    grid-column: 2;
  }
}

@media (max-width: 620px) {
  .tool-header {
    display: grid;
  }

  .field-grid,
  .toggle-grid {
    grid-template-columns: 1fr;
  }

  .tool-actions .compact-btn,
  .list-actions .list-action-btn {
    flex: 1 1 0;
  }
}
</style>

<style>
html.editor-scroll-unlocked,
body.editor-scroll-unlocked,
html.editor-scroll-unlocked #app {
  height: auto !important;
  min-height: 100svh !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

body.editor-scroll-unlocked .app-shell {
  height: auto !important;
  min-height: 100svh !important;
  grid-template-rows: auto auto !important;
  overflow: visible !important;
}
</style>
