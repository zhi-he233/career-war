import type { CharacterId } from "@career-war/shared";

export interface CharacterArt {
  sprite?: string;
  avatar?: string;
}

const spriteModules = import.meta.glob("./*/*_sprite.png", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

const avatarModules = import.meta.glob("./*/*_avatar.png", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

const CHARACTER_ART_ALIASES: Record<string, CharacterId> = {
  gunner: "gunslinger",
  bomber: "self_destructor",
  flame_lord: "fire_lord",
  crescent: "crescent_moon",
  zhao_yun: "zhaoZilong",
  assassin_fearless: "fearless_assassin",
  assassin_slash: "execution_assassin"
};

const artByCharacterId: Partial<Record<CharacterId, CharacterArt>> = {};

function normalizeCharacterId(id: string): CharacterId {
  return CHARACTER_ART_ALIASES[id] ?? (id as CharacterId);
}

function collectArt(modules: Record<string, string>, kind: keyof CharacterArt): void {
  for (const [assetPath, url] of Object.entries(modules)) {
    const match = assetPath.match(/^\.\/([^/]+)\/[^/]+_(sprite|avatar)\.png$/);
    if (!match) continue;
    const characterId = normalizeCharacterId(match[1]);
    artByCharacterId[characterId] ??= {};
    artByCharacterId[characterId]![kind] = url;
  }
}

collectArt(spriteModules, "sprite");
collectArt(avatarModules, "avatar");

export function getCharacterArt(characterId: string | undefined): CharacterArt | undefined {
  if (!characterId) return undefined;
  return artByCharacterId[normalizeCharacterId(characterId)];
}
