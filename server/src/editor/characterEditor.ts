import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHARACTER_SKILL_PRESET_IDS,
  FALLBACK_EDITABLE_CHARACTERS,
  type CharacterDifficulty,
  type CharacterRole,
  type CharacterSkillPresetId,
  type EditableCharacter,
  type EditableCharacterAvailability,
  type EditableCharacterImplementation,
  type EditableDiceFace,
} from "@career-war/shared";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");
const contentDir = path.join(projectRoot, "content", "game");
const charactersJsonPath = path.join(contentDir, "characters.json");
const generatedTsPath = path.join(projectRoot, "shared", "src", "data", "characters.generated.ts");
const backupDir = path.join(contentDir, "backups");
const MAX_BACKUPS_PER_FILE = 20;

const ID_PATTERN = /^[a-z0-9_-]+$/;
const LEGACY_CHARACTER_IDS = new Set(FALLBACK_EDITABLE_CHARACTERS.map((character) => character.id));
const VALID_DIFFICULTIES = new Set<CharacterDifficulty>(["simple", "normal", "complex", "expert"]);
const VALID_ROLES = new Set<CharacterRole>(["attack", "defense", "healing", "burst", "special"]);
const VALID_PRESETS = new Set<string>(CHARACTER_SKILL_PRESET_IDS);
const VALID_IMPLEMENTATION_MODES = new Set(["data_driven", "code_driven"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: Record<string, unknown>, key: string, label: string): string {
  const text = typeof value[key] === "string" ? value[key].trim() : "";
  if (!text) throw new Error(`${label} 不能为空`);
  return text;
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  const text = typeof value[key] === "string" ? value[key].trim() : "";
  return text || undefined;
}

function readNumber(value: Record<string, unknown>, key: string, label: string): number {
  const number = Number(value[key]);
  if (!Number.isFinite(number)) throw new Error(`${label} 必须是数字`);
  return number;
}

function readStringList(value: Record<string, unknown>, key: string): string[] {
  if (Array.isArray(value[key])) {
    return value[key].filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value[key] === "string") {
    return value[key].split("\n").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function normalizeAvailability(value: unknown): EditableCharacterAvailability {
  if (!isRecord(value)) throw new Error("availability 格式不正确");
  const availability: EditableCharacterAvailability = {
    classic: readBoolean(value, "classic"),
    duo: readBoolean(value, "duo"),
    pve: readBoolean(value, "pve"),
    roguelite: readBoolean(value, "roguelite"),
    hidden: readBoolean(value, "hidden"),
  };
  if (!availability.hidden && !availability.classic && !availability.duo && !availability.pve && !availability.roguelite) {
    throw new Error("至少启用一个模式，或勾选 hidden");
  }
  return availability;
}

function normalizeImplementation(value: unknown): EditableCharacterImplementation {
  if (!isRecord(value)) throw new Error("implementation 格式不正确");
  const mode = readString(value, "mode", "implementation.mode");
  if (!VALID_IMPLEMENTATION_MODES.has(mode)) throw new Error(`职业实现方式不合法：${mode}`);
  const implementation: EditableCharacterImplementation = { mode: mode as EditableCharacterImplementation["mode"] };
  const handlerId = readOptionalString(value, "handlerId");
  if (handlerId) implementation.handlerId = handlerId;
  if (implementation.mode === "code_driven" && !implementation.handlerId) throw new Error("code_driven 职业必须填写 handlerId");
  return implementation;
}

function normalizeDiceFace(value: unknown, index: number, implementationMode: EditableCharacterImplementation["mode"]): EditableDiceFace {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个骰面格式不正确`);
  const roll = readNumber(value, "roll", "骰面 roll");
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new Error(`骰面 roll 必须是 1-6：${roll}`);
  const face: EditableDiceFace = {
    roll: roll as EditableDiceFace["roll"],
    name: readString(value, "name", `骰面 ${roll} 名称`),
    description: readString(value, "description", `骰面 ${roll} 描述`),
  };
  const presetId = readOptionalString(value, "presetId");
  if (presetId) {
    if (!VALID_PRESETS.has(presetId)) throw new Error(`骰面 ${roll} presetId 不在白名单：${presetId}`);
    face.presetId = presetId as CharacterSkillPresetId;
  }
  if (implementationMode === "data_driven" && !face.presetId) {
    throw new Error(`data_driven 职业的骰面 ${roll} 必须选择 presetId`);
  }
  if (isRecord(value.params)) face.params = { ...value.params };
  return face;
}

function assertSafeAssetPath(value: string | undefined, label: string): void {
  if (!value) return;
  if (value.includes("\\") || value.includes("..") || value.startsWith("//")) {
    throw new Error(`${label} 必须是安全相对路径或 public 路径`);
  }
  const allowed =
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("assets/") ||
    value.startsWith("art/") ||
    value.startsWith("characters/") ||
    value.startsWith("src/assets/");
  if (!allowed) throw new Error(`${label} 必须是安全相对路径或 public 路径`);
}

function normalizeCharacter(value: unknown, index: number): EditableCharacter {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个职业格式不正确`);
  const id = readString(value, "id", "职业 id");
  if (!ID_PATTERN.test(id) && !LEGACY_CHARACTER_IDS.has(id)) {
    throw new Error(`职业 id 只能包含小写英文、数字、下划线、短横线：${id}`);
  }

  const maxHp = readNumber(value, "maxHp", "最大生命");
  if (!Number.isInteger(maxHp) || maxHp < 1 || maxHp > 99) throw new Error(`最大生命必须是 1-99：${maxHp}`);

  const difficulty = readOptionalString(value, "difficulty") ?? "normal";
  if (!VALID_DIFFICULTIES.has(difficulty as CharacterDifficulty)) throw new Error(`职业难度不合法：${difficulty}`);
  const role = readOptionalString(value, "role");
  if (role && !VALID_ROLES.has(role as CharacterRole)) throw new Error(`职业定位不合法：${role}`);

  const avatarUrl = readOptionalString(value, "avatarUrl");
  const spriteUrl = readOptionalString(value, "spriteUrl");
  assertSafeAssetPath(avatarUrl, "avatarUrl");
  assertSafeAssetPath(spriteUrl, "spriteUrl");

  const implementation = normalizeImplementation(value.implementation);
  if (!Array.isArray(value.diceFaces)) throw new Error("diceFaces 必须是数组");
  const diceFaces = value.diceFaces.map((face, faceIndex) => normalizeDiceFace(face, faceIndex, implementation.mode));
  const rolls = new Set(diceFaces.map((face) => face.roll));
  for (const roll of [1, 2, 3, 4, 5, 6]) {
    if (!rolls.has(roll as EditableDiceFace["roll"])) throw new Error(`diceFaces 必须包含 ${roll}`);
  }
  if (rolls.size !== 6 || diceFaces.length !== 6) throw new Error("diceFaces 必须且只能包含 1-6");

  const character: EditableCharacter = {
    id,
    name: readString(value, "name", "职业名称"),
    title: readOptionalString(value, "title") ?? "",
    description: readString(value, "description", "职业描述"),
    maxHp,
    avatarUrl: avatarUrl ?? "",
    spriteUrl: spriteUrl ?? "",
    tags: readStringList(value, "tags"),
    difficulty: difficulty as CharacterDifficulty,
    sortOrder: readNumber(value, "sortOrder", "排序"),
    availability: normalizeAvailability(value.availability),
    implementation,
    diceFaces: diceFaces.sort((a, b) => a.roll - b.roll),
  };
  if (role) character.role = role as CharacterRole;
  const shortDescription = readOptionalString(value, "shortDescription");
  if (shortDescription) character.shortDescription = shortDescription;
  const fullDescription = readStringList(value, "fullDescription");
  if (fullDescription.length > 0) character.fullDescription = fullDescription;
  if (typeof value.isImplemented === "boolean") character.isImplemented = value.isImplemented;
  return character;
}

export function normalizeCharacters(payload: unknown): EditableCharacter[] {
  if (!Array.isArray(payload)) throw new Error("characters 必须是数组");
  const characters = payload.map(normalizeCharacter);
  const seen = new Set<string>();
  for (const character of characters) {
    if (seen.has(character.id)) throw new Error(`职业 id 重复：${character.id}`);
    seen.add(character.id);
  }
  return characters.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function toGeneratedSource(characters: readonly EditableCharacter[]): string {
  return [
    "import type { EditableCharacter } from \"./characters.js\";",
    "",
    `export const GENERATED_CHARACTERS = ${JSON.stringify(characters, null, 2)} as const satisfies readonly EditableCharacter[];`,
    "",
  ].join("\n");
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function pruneBackups(parsed: path.ParsedPath): Promise<void> {
  const prefix = `${parsed.name}.`;
  const backups = (await readdir(backupDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(parsed.ext))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  await Promise.all(backups.slice(MAX_BACKUPS_PER_FILE).map((name) => rm(path.join(backupDir, name), { force: true })));
}

async function backupIfExists(filePath: string): Promise<void> {
  try {
    await mkdir(backupDir, { recursive: true });
    const parsed = path.parse(filePath);
    await copyFile(filePath, path.join(backupDir, `${parsed.name}.${timestamp()}${parsed.ext}`));
    await pruneBackups(parsed);
  } catch (error) {
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function loadEditableCharacters(): Promise<EditableCharacter[]> {
  try {
    const raw = await readFile(charactersJsonPath, "utf8");
    return normalizeCharacters(JSON.parse(raw));
  } catch (error) {
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return [...FALLBACK_EDITABLE_CHARACTERS];
    }
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`读取职业数据失败：${message}`);
  }
}

export async function saveEditableCharacters(payload: unknown): Promise<EditableCharacter[]> {
  const characters = normalizeCharacters(payload);
  await mkdir(contentDir, { recursive: true });
  await backupIfExists(charactersJsonPath);
  await backupIfExists(generatedTsPath);
  await writeAtomic(charactersJsonPath, `${JSON.stringify(characters, null, 2)}\n`);
  try {
    await writeAtomic(generatedTsPath, toGeneratedSource(characters));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[characterEditor] characters.generated.ts 写入失败，可从 content/game/characters.json 重建：${message}`);
  }
  return characters;
}
