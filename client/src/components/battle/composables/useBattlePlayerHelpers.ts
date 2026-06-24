import type { ComputedRef } from "vue";
import type { Character, Player, Room, SummonerSkillId } from "@career-war/shared";

/**
 * Pure player-display helpers extracted from BattlePage.vue.
 * No socket, no game flow rules, no animation state, no emit.
 */

export interface BattlePlayerHelpersParams {
  room: ComputedRef<Room>;
  characters: Character[];
  isDuoMode: ComputedRef<boolean>;
  isRogueliteMode: ComputedRef<boolean>;
  rogueliteEnemyTypeLabel: (player: Player) => string;
  activePlayer: ComputedRef<Player | undefined>;
  pendingRoll: ComputedRef<Room["pendingRoll"]>;
  pendingRollDecision: ComputedRef<Room["pendingRollDecision"]>;
}

export function useBattlePlayerHelpers(params: BattlePlayerHelpersParams) {
  const { room, characters, isDuoMode, isRogueliteMode, rogueliteEnemyTypeLabel, activePlayer, pendingRoll, pendingRollDecision } = params;

  function characterName(id: string | undefined): string {
    return characters.find((c) => c.id === id)?.name ?? "未知职业";
  }

  function characterFor(id: string | undefined): Character | undefined {
    return characters.find((c) => c.id === id);
  }

  function summonerSkillName(id: SummonerSkillId | undefined): string {
    if (id === "first_aid") return "急救术";
    if (id === "iron_wall") return "铁壁";
    if (id === "fate_reroll") return "命运重掷";
    if (id === "last_stand") return "破釜";
    return "幸运骰";
  }

  function hpPercent(player: Player): number {
    if (player.maxHp <= 0) return 0;
    return Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  }

  function zhaoZilongHitText(player: Player): string {
    if (player.characterId !== "zhaoZilong") return "";
    return `龙胆：${player.zhaoZilongHitCount ?? 0}/3`;
  }

  function playerFallbackMark(player: Player): string {
    const label = characterName(player.characterId).trim();
    return Array.from(label)[0] ?? "?";
  }

  function playerNumber(player: Player): number {
    const index = room.value.players.findIndex((item) => item.id === player.id);
    return index < 0 ? 0 : index + 1;
  }

  function displayCharacterName(player: Player): string {
    if (isRogueliteMode.value && player.isBot && player.rogueliteEnemyInfo) return rogueliteEnemyTypeLabel(player);
    return characterName(player.characterId);
  }

  function hasInvincible(player: Player): boolean {
    return room.value.effects.some((effect) => effect.type === "invincible" && effect.sourcePlayerId === player.id);
  }

  function playerStatus(player: Player): string {
    if (!player.isOnline) return "离线";
    if (player.isDead) return "死亡";
    if (player.characterId === "mountain_shield" && player.guarding) return "架盾";
    if (pendingRoll.value?.playerId === player.id) return "待继续";
    if (player.id === activePlayer.value?.id) return "行动中";
    if (hasInvincible(player)) return "无敌";
    return "待机";
  }

  function lastRollText(player: Player): string {
    if (pendingRollDecision.value?.actorId === player.id) return `🎲 ${pendingRollDecision.value.currentRoll}`;
    const rollEvent = room.value.battleLog.find((event) => event.type === "roll" && event.playerId === player.id && event.dice?.length);
    if (!rollEvent?.dice?.length) return "";
    return `🎲 ${rollEvent.dice.join("、")}`;
  }

  function isProtectedByGuardingMountainShield(player: Player): boolean {
    if (!player.teamId || player.characterId === "mountain_shield") return false;
    return room.value.players.some((item) => item.characterId === "mountain_shield" && item.guarding && !item.isDead && item.teamId === player.teamId);
  }

  function guardBadges(player: Player): string[] {
    if (player.characterId === "mountain_shield" && player.guarding) {
      return ["架盾", "护甲+1", "团体护甲+2"];
    }
    if (isDuoMode.value && isProtectedByGuardingMountainShield(player)) {
      return ["受架盾保护", "团体护甲+2"];
    }
    return [];
  }

  function buildSeatTags(player: Player): string[] {
    if (isRogueliteMode.value && player.isBot && player.rogueliteEnemyInfo) {
      const tags = [rogueliteEnemyTypeLabel(player)];
      if (player.rogueliteEnemyInfo.skillNames?.[0]) tags.push(player.rogueliteEnemyInfo.skillNames[0]);
      return tags;
    }
    const tags: string[] = [characterName(player.characterId)];
    if (!isRogueliteMode.value || player.isBot) {
      tags.push(`${summonerSkillName(player.summonerSkillId)}${player.summonerSkillCooldown ? ` ${player.summonerSkillCooldown}` : ""}`);
    }
    tags.push(...guardBadges(player));
    return tags;
  }

  function buildDuoSeatTags(player: Player): string[] {
    const tags: string[] = [characterName(player.characterId), summonerSkillName(player.summonerSkillId)];
    tags.push(...guardBadges(player));
    return tags;
  }

  return {
    characterName,
    characterFor,
    summonerSkillName,
    hpPercent,
    zhaoZilongHitText,
    playerFallbackMark,
    playerNumber,
    displayCharacterName,
    hasInvincible,
    playerStatus,
    lastRollText,
    guardBadges,
    isProtectedByGuardingMountainShield,
    buildSeatTags,
    buildDuoSeatTags,
  };
}
