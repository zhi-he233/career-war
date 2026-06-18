<script setup lang="ts">
import { computed } from "vue";
import type { RoguelitePanelVM, RoguelitePerkVM } from "./types";

const props = defineProps<{
  data: RoguelitePanelVM;
}>();

const emit = defineEmits<{
  openDetails: [];
}>();

const allPerks = computed<RoguelitePerkVM[]>(() => [
  ...props.data.perks.growth,
  ...props.data.perks.skills,
  ...props.data.perks.boss
]);

const perkPreview = computed(() => allPerks.value.slice(0, 3));
const hiddenPerkCount = computed(() => Math.max(0, allPerks.value.length - perkPreview.value.length));

const enemyName = computed(() => props.data.boss?.name ?? props.data.enemy?.name ?? props.data.rewardPhase?.summary?.defeatedName ?? "敌人");
const enemyType = computed(() => props.data.boss?.typeLabel ?? props.data.enemy?.typeLabel ?? props.data.stageTypeLabel);
const isRewardPhase = computed(() => Boolean(props.data.rewardPhase));
const primaryText = computed(() => isRewardPhase.value ? "选择一个奖励继续" : `${enemyName.value} · ${enemyType.value}`);
const fatigueText = computed(() => {
  if (!props.data.fatigue) return "狂化 +0";
  return `狂化 +${props.data.fatigue.bonus}`;
});

const traitSummary = computed(() => {
  const traits = props.data.enemyTraits ?? [];
  if (props.data.boss?.skills.length) return props.data.boss.skills.join(" / ");
  if (traits.length) return traits.join(" / ");
  if (props.data.enemy?.description) return props.data.enemy.description;
  if (props.data.enemy?.skills.length) return props.data.enemy.skills.join(" / ");
  if (props.data.rewardPhase) return props.data.rewardPhase.title;
  if (props.data.continuePhase) return props.data.continuePhase.hint;
  return "暂无额外机制";
});

const detailsText = computed(() => {
  if (props.data.rewardPhase) return "选择奖励";
  if (props.data.continuePhase) return "继续";
  return "详情";
});
</script>

<template>
  <section v-if="data.enabled" class="roguelite-compact" :class="[`stage-${data.stageType}`, { 'reward-phase': isRewardPhase }]">
    <button class="roguelite-compact-main" type="button" @click="emit('openDetails')">
      <span class="roguelite-compact-stage">
        第 {{ data.stage }} 关
        <i v-if="data.round > 0">第 {{ data.round }} 轮</i>
      </span>
      <span class="stage-type-badge" :class="`stage-type-${data.stageType}`">{{ data.stageTypeLabel }}</span>
      <span class="fatigue-badge" :class="{ active: (data.fatigue?.bonus ?? 0) > 0 }">{{ fatigueText }}</span>
      <span class="roguelite-compact-enemy">{{ primaryText }}</span>
      <span class="roguelite-compact-traits">{{ traitSummary }}</span>
    </button>

    <div class="roguelite-compact-perks" aria-label="当前词条摘要">
      <span v-for="perk in perkPreview" :key="perk.id">{{ perk.name }} Lv.{{ perk.level }}</span>
      <span v-if="hiddenPerkCount > 0">+{{ hiddenPerkCount }}</span>
      <span v-if="allPerks.length === 0">0 词条</span>
    </div>

    <button class="roguelite-compact-details" type="button" @click="emit('openDetails')">{{ detailsText }}</button>
  </section>
</template>
