const spriteModules = import.meta.glob("./*/*_sprite.png", {
    eager: true,
    query: "?url",
    import: "default"
});
const avatarModules = import.meta.glob("./*/*_avatar.png", {
    eager: true,
    query: "?url",
    import: "default"
});
const CHARACTER_ART_ALIASES = {
    gunner: "gunslinger",
    bomber: "self_destructor",
    flame_lord: "fire_lord",
    crescent: "crescent_moon",
    zhao_yun: "zhaoZilong",
    assassin_fearless: "fearless_assassin",
    assassin_slash: "execution_assassin"
};
const artByCharacterId = {};
function normalizeCharacterId(id) {
    return CHARACTER_ART_ALIASES[id] ?? id;
}
function collectArt(modules, kind) {
    for (const [assetPath, url] of Object.entries(modules)) {
        const match = assetPath.match(/^\.\/([^/]+)\/[^/]+_(sprite|avatar)\.png$/);
        if (!match)
            continue;
        const characterId = normalizeCharacterId(match[1]);
        artByCharacterId[characterId] ??= {};
        artByCharacterId[characterId][kind] = url;
    }
}
collectArt(spriteModules, "sprite");
collectArt(avatarModules, "avatar");
export function getCharacterArt(characterId) {
    if (!characterId)
        return undefined;
    return artByCharacterId[normalizeCharacterId(characterId)];
}
