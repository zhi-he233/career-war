import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FALLBACK_EDITABLE_CHARACTERS,
  replaceRuntimeCharacters,
  toRuntimeCharacter,
  type Character,
  type EditableCharacter,
} from "@career-war/shared";
import { normalizeCharacters } from "./editor/characterEditor.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../..");
const charactersJsonPath = path.join(projectRoot, "content", "game", "characters.json");

let characterCache: readonly EditableCharacter[] = normalizeCharacters([...FALLBACK_EDITABLE_CHARACTERS]);
let characterDataStatus: {
  ok: boolean;
  source: "content" | "fallback";
  error?: string;
  updatedAt: string;
} = {
  ok: true,
  source: "fallback",
  updatedAt: new Date().toISOString(),
};

function warnFallback(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const excerpt = message.slice(0, 200);
  console.warn(`[character data cache] characters.json 读取失败，已回退到 shared/generated 数据。错误摘要：${excerpt}`);
  characterDataStatus = {
    ok: false,
    source: "fallback",
    error: excerpt,
    updatedAt: new Date().toISOString(),
  };
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function hydrateRuntimeCharacters(characters: readonly EditableCharacter[]): void {
  replaceRuntimeCharacters(characters);
}

export async function refreshCharacterData(): Promise<void> {
  characterCache = normalizeCharacters(await readJsonFile(charactersJsonPath));
  hydrateRuntimeCharacters(characterCache);
  characterDataStatus = {
    ok: true,
    source: "content",
    updatedAt: new Date().toISOString(),
  };
}

export function getEditableCharacterData(): readonly EditableCharacter[] {
  return characterCache;
}

export function getGameCharacters(): readonly Character[] {
  return characterCache
    .filter((character) => !character.availability.hidden)
    .map(toRuntimeCharacter)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

export function getCharacterDataStatus(): typeof characterDataStatus {
  return characterDataStatus;
}

try {
  await refreshCharacterData();
} catch (error) {
  warnFallback(error);
  hydrateRuntimeCharacters(characterCache);
}
