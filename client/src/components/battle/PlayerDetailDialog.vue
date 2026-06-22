<script setup lang="ts">
import type { Character, Player } from "@career-war/shared";
import BattleUnitDetailCard from "./BattleUnitDetailCard.vue";

const props = defineProps<{
  player: Player;
  characters: Character[];
  playerAvatarEmoji: string;
  playerAvatarSrc?: string;
  lastRollText: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

function characterName(id: string | undefined): string {
  return props.characters.find((c) => c.id === id)?.name ?? "未知职业";
}

function characterFor(id: string | undefined): Character | undefined {
  return props.characters.find((c) => c.id === id);
}

function rogueliteEnemyTypeLabel(player: Player): string {
  const stageType = player.rogueliteEnemyInfo?.stageType;
  if (stageType === "boss") return "Boss";
  if (stageType === "elite") return "精英";
  if (stageType === "normal") return "小怪";
  return "敌人";
}

function detailSubtitle(player: Player): string {
  if (player.rogueliteEnemyInfo) {
    const description = player.rogueliteEnemyInfo.description ? ` · ${player.rogueliteEnemyInfo.description}` : "";
    return `${rogueliteEnemyTypeLabel(player)}${description}`;
  }
  return characterName(player.characterId);
}

function rogueliteEnemySkills(player: Player): string[] {
  return player.rogueliteEnemyInfo?.skillNames ?? [];
}

function skillLines(player: Player): string[] {
  const enemySkills = rogueliteEnemySkills(player);
  if (enemySkills.length) return enemySkills;
  return characterFor(player.characterId)?.description ?? [];
}

function playerStatus(player: Player): string {
  if (!player.isOnline) return "离线";
  if (player.isDead) return "死亡";
  if (player.characterId === "mountain_shield" && (player as Player & { guarding?: boolean }).guarding) return "架盾";
  return "存活";
}

function zhaoZilongHitText(player: Player): string {
  if (player.characterId !== "zhaoZilong") return "";
  const hits = (player as Player & { zhaoZilongHitCount?: number }).zhaoZilongHitCount ?? 0;
  return `龙胆：${hits}/3`;
}

function detailTags(player: Player): string[] {
  return [playerStatus(player), zhaoZilongHitText(player)].filter(Boolean);
}
</script>

<template>
  <div class="player-detail-backdrop" role="presentation" @click.self="emit('close')">
    <section class="player-detail-panel" role="dialog" aria-modal="true" :aria-label="`${player.nickname} 状态详情`">
      <BattleUnitDetailCard
        :name="player.nickname"
        :career-name="detailSubtitle(player)"
        :hp="player.hp"
        :max-hp="player.maxHp"
        :shield="player.shield"
        :status-text="playerStatus(player)"
        :last-roll-text="lastRollText"
        :avatar-src="playerAvatarSrc"
        :fallback-mark="playerAvatarEmoji"
        :skill-lines="skillLines(player)"
        :tags="detailTags(player)"
        :dead="player.isDead"
        :offline="!player.isOnline"
        @close="emit('close')"
      />
    </section>
  </div>
</template>

<style scoped>
.player-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  align-items: center;
  padding: 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(15, 23, 42, 0.42);
  animation: backdrop-in 180ms ease;
}

.player-detail-panel {
  width: min(100%, 430px);
  margin: 0 auto;
  overflow: visible;
  background: transparent;
  box-shadow: none;
  animation: dialog-up 200ms ease;
}
</style>
