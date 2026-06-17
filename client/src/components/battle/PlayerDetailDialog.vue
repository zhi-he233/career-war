<script setup lang="ts">
import type { Character, Player } from "@career-war/shared";

const props = defineProps<{
  player: Player;
  characters: Character[];
  playerAvatarEmoji: string;
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
</script>

<template>
  <div class="player-detail-backdrop" role="presentation" @click.self="emit('close')">
    <section class="player-detail-panel" role="dialog" aria-modal="true" :aria-label="`${player.nickname} 状态详情`">
      <header class="player-detail-header">
        <div>
          <span class="detail-avatar">{{ playerAvatarEmoji }}</span>
          <h2>{{ player.nickname }}</h2>
          <p>{{ characterName(player.characterId) }}</p>
        </div>
        <button class="detail-close-btn" type="button" aria-label="关闭详情" @click="emit('close')">×</button>
      </header>
      <dl class="player-detail-list">
        <div>
          <dt>血量</dt>
          <dd>{{ player.hp }} / {{ player.maxHp }}</dd>
        </div>
        <div>
          <dt>护盾</dt>
          <dd>{{ player.shield }}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{{ playerStatus(player) }}</dd>
        </div>
        <div>
          <dt>是否死亡</dt>
          <dd>{{ player.isDead ? "已死亡" : "存活" }}</dd>
        </div>
        <div>
          <dt>最近骰点</dt>
          <dd>{{ lastRollText || "暂无" }}</dd>
        </div>
        <div v-if="zhaoZilongHitText(player)">
          <dt>龙胆</dt>
          <dd>{{ zhaoZilongHitText(player) }}</dd>
        </div>
        <div v-if="characterFor(player.characterId)?.description?.length">
          <dt>职业技能</dt>
          <dd>{{ characterFor(player.characterId)?.description.join("；") }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
