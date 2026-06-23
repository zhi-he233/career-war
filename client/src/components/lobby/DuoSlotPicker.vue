<script setup lang="ts">
import type { Character, CharacterId, DuoCharacterSlot, Player, SummonerSkillId } from "@career-war/shared";
import { SUMMONER_SKILLS } from "./lobbyData";

defineProps<{
  duoSlots: DuoCharacterSlot[];
  myDuoSlots: DuoCharacterSlot[];
  characters: Character[];
  opponentPlayer: Player | undefined;
  opponentTeamLabel: string;
  canEditDuoSlot: (slot: DuoCharacterSlot) => boolean;
  isDuoCharacterTakenByOtherSlot: (slot: DuoCharacterSlot, characterId: string) => boolean;
  getDuoSlotCharacterText: (slot: DuoCharacterSlot) => string;
  getDuoSlotSummonerSkillText: (slot: DuoCharacterSlot) => string;
}>();

const emit = defineEmits<{
  (e: "update:slotCharacter", payload: { slotIndex: number; characterId: CharacterId }): void;
  (e: "update:slotSummonerSkill", payload: { slotIndex: number; summonerSkillId: SummonerSkillId }): void;
}>();

function onCharacterChange(slot: DuoCharacterSlot, event: Event): void {
  const characterId = (event.target as HTMLSelectElement).value as CharacterId | "";
  if (!characterId) return;
  emit("update:slotCharacter", { slotIndex: slot.slotIndex, characterId });
}

function onSkillChange(slot: DuoCharacterSlot, event: Event): void {
  const summonerSkillId = (event.target as HTMLSelectElement).value as SummonerSkillId;
  emit("update:slotSummonerSkill", { slotIndex: slot.slotIndex, summonerSkillId });
}
</script>

<template>
  <section class="character-picker duo-slot-picker">
    <div class="picker-heading">
      <div>
        <h2>2V2 双角色选角</h2>
        <p class="hint">每名真实玩家选择 2 个角色槽位，进入战斗后轮流选择行动角色和敌方目标。</p>
      </div>
    </div>

    <p v-if="duoSlots.length === 0" class="empty-state duo-slot-empty">2V2 槽位尚未生成，请等待房间同步或重新切换模式。</p>
    <div v-else class="duo-self-slots-grid">
      <article v-for="(slot, idx) in myDuoSlots" :key="slot.slotIndex" class="duo-slot-card">
        <div class="duo-slot-header">
          <strong>槽位 {{ idx + 1 }}</strong>
          <span class="badge">你的槽位</span>
        </div>

        <label class="compact-field">
          <span>职业</span>
          <select
            :value="slot.characterId ?? ''"
            :disabled="!canEditDuoSlot(slot)"
            @change="onCharacterChange(slot, $event)"
          >
            <option value="">未选择职业</option>
            <option
              v-for="character in characters"
              :key="character.id"
              :value="character.id"
              :disabled="isDuoCharacterTakenByOtherSlot(slot, character.id)"
            >
              {{ character.name }}{{ isDuoCharacterTakenByOtherSlot(slot, character.id) ? "（已被选择）" : "" }}
            </option>
          </select>
        </label>

        <label class="compact-field">
          <span>技能</span>
          <select
            :value="slot.summonerSkillId ?? 'lucky_plus_one'"
            :disabled="!canEditDuoSlot(slot)"
            @change="onSkillChange(slot, $event)"
          >
            <option v-for="skill in SUMMONER_SKILLS" :key="skill.id" :value="skill.id">
              {{ skill.name }}
            </option>
          </select>
        </label>

        <p class="duo-slot-summary">当前：{{ getDuoSlotCharacterText(slot) }} / {{ getDuoSlotSummonerSkillText(slot) }}</p>
      </article>
    </div>

    <div v-if="!opponentPlayer" class="duo-wait-strip">
      <span class="duo-wait-label">{{ opponentTeamLabel }} · 等待玩家加入</span>
    </div>
    <div v-else class="duo-wait-strip">
      <span class="duo-wait-label">{{ opponentTeamLabel }} · 已加入，进入战斗后选择目标</span>
    </div>
  </section>
</template>
