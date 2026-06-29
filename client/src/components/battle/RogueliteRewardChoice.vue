<script setup lang="ts">
import { computed, ref, watch } from "vue";

type RogueliteRewardOption = {
  id: string;
  name: string;
  description: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  tags?: string[];
  icon?: string;
  disabled?: boolean;
};

const props = withDefaults(
  defineProps<{
    rewards: RogueliteRewardOption[];
    title?: string;
    subtitle?: string;
    confirmText?: string;
    disabled?: boolean;
    closable?: boolean;
    tutorialActive?: boolean;
  }>(),
  {
    title: "选择一个奖励",
    subtitle: "击败敌人后，选择一个强化继续",
    confirmText: "选择奖励继续",
    disabled: false,
    closable: false,
    tutorialActive: false,
  }
);

const emit = defineEmits<{
  select: [rewardId: string];
  close: [];
}>();

const selectedRewardId = ref<string | null>(null);

const rewardCount = computed(() => props.rewards.length);
const selectedReward = computed(() =>
  props.rewards.find((reward) => reward.id === selectedRewardId.value) ?? null
);
const canConfirm = computed(
  () => !props.disabled && Boolean(selectedReward.value && !selectedReward.value.disabled)
);

watch(
  () => props.rewards,
  (nextRewards) => {
    if (!nextRewards.some((reward) => reward.id === selectedRewardId.value && !reward.disabled)) {
      selectedRewardId.value = null;
    }
  },
  { deep: false }
);

function handleSelect(reward: RogueliteRewardOption) {
  if (props.disabled || reward.disabled) {
    return;
  }
  selectedRewardId.value = reward.id;
}

function handleConfirm() {
  if (!canConfirm.value || !selectedReward.value) {
    return;
  }
  emit("select", selectedReward.value.id);
}

function handleClose() {
  if (!props.closable) {
    return;
  }
  emit("close");
}

function rarityLabel(rarity?: RogueliteRewardOption["rarity"]): string {
  switch (rarity) {
    case "rare":
      return "稀有";
    case "epic":
      return "史诗";
    case "legendary":
      return "传说";
    case "common":
    default:
      return "普通";
  }
}

function cardAccent(rarity?: RogueliteRewardOption["rarity"]): string {
  switch (rarity) {
    case "rare":
      return "稀有奖励";
    case "epic":
      return "史诗奖励";
    case "legendary":
      return "传说奖励";
    case "common":
    default:
      return "普通奖励";
  }
}
</script>

<template>
  <div class="reward-choice-overlay" @click.self="handleClose">
    <section class="reward-choice-panel" aria-modal="true" role="dialog" :aria-label="title">
      <button
        v-if="closable"
        class="close-button"
        type="button"
        aria-label="关闭奖励选择"
        @click="handleClose"
      >
        ×
      </button>

      <header class="panel-header">
        <p class="header-kicker">ROGUELITE REWARD</p>
        <h2>{{ title }}</h2>
        <p class="header-subtitle">{{ subtitle }}</p>
      </header>

      <p class="reward-count" aria-live="polite">可选 {{ rewardCount }} 项奖励</p>

      <div class="reward-body">
        <p v-if="rewards.length === 0" class="reward-empty">奖励正在结算中，请稍等。</p>
        <div v-else class="reward-list">
        <button
          v-for="reward in rewards"
          :key="reward.id"
          class="reward-card"
          :class="[
            `rarity-${reward.rarity ?? 'common'}`,
            {
              selected: selectedRewardId === reward.id,
              disabled: reward.disabled || disabled,
              'tutorial-target-control': tutorialActive,
            },
          ]"
          type="button"
          :disabled="reward.disabled || disabled"
          @click="handleSelect(reward)"
        >
          <div class="reward-card-top">
            <span class="reward-card-mark" aria-hidden="true">
              <span class="cw-icon" :class="reward.rarity === 'legendary' ? 'cw-icon-crown' : reward.rarity === 'epic' ? 'cw-icon-rune' : reward.rarity === 'rare' ? 'cw-icon-dice' : 'cw-icon-swords'"></span>
            </span>
            <div class="reward-card-heading">
              <span class="reward-rarity">{{ rarityLabel(reward.rarity) }}</span>
              <strong class="reward-name">
                {{ reward.name }}
              </strong>
            </div>
            <span v-if="selectedRewardId === reward.id" class="selected-badge">已选中</span>
          </div>

          <p class="reward-description">{{ reward.description }}</p>

          <div v-if="reward.tags?.length" class="reward-tags">
            <span v-for="tag in reward.tags.slice(0, 2)" :key="tag" class="reward-tag">
              {{ tag }}
            </span>
          </div>

          <div class="reward-accent">
            {{ reward.disabled ? "暂不可选" : cardAccent(reward.rarity) }}
          </div>
        </button>
        </div>
      </div>

      <footer class="panel-footer">
        <p class="selection-hint">
          {{ selectedReward ? `已锁定：${selectedReward.name}` : "先选择一个奖励，再继续战斗" }}
        </p>
        <button class="confirm-button" type="button" :disabled="!canConfirm" @click="handleConfirm">
          {{ canConfirm ? confirmText : "先选择一个奖励" }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.reward-choice-overlay {
  --panel-bg: linear-gradient(180deg, #fff7d6 0%, #f9e8b4 100%);
  --panel-shadow: 0 18px 0 rgba(86, 57, 24, 0.18), 0 30px 50px rgba(74, 46, 20, 0.26);
  --border-strong: #6f4e22;
  --ink: #372511;
  --muted-ink: #73583a;
  --paper: #fffdf1;
  --paper-line: rgba(111, 78, 34, 0.18);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  max-width: 100%;
  padding: 2px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 245, 198, 0.92) 0%, rgba(255, 245, 198, 0.55) 28%, rgba(94, 66, 28, 0.08) 100%),
    linear-gradient(180deg, rgba(101, 67, 33, 0.2) 0%, rgba(101, 67, 33, 0.08) 100%);
}

.reward-choice-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(92vw, 420px);
  max-width: 100%;
  max-height: calc(100dvh - 104px);
  padding: 12px 10px 10px;
  border: 3px solid var(--border-strong);
  border-radius: 24px;
  background: var(--panel-bg);
  box-shadow: var(--panel-shadow);
  color: var(--ink);
  overflow: hidden;
}

.reward-choice-panel::before,
.reward-choice-panel::after {
  content: "";
  position: absolute;
  inset: 7px;
  border: 1px dashed rgba(111, 78, 34, 0.28);
  border-radius: 18px;
  pointer-events: none;
}

.reward-choice-panel::after {
  inset: auto 16px 16px;
  height: 8px;
  border: 0;
  border-radius: 999px;
  background: rgba(111, 78, 34, 0.12);
}

.close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 2px solid rgba(111, 78, 34, 0.55);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff8da 0%, #f2ddb3 100%);
  box-shadow: 0 4px 0 rgba(111, 78, 34, 0.24);
  color: var(--ink);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
}

.close-button:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(111, 78, 34, 0.24);
}

.panel-header {
  display: grid;
  gap: 3px;
  padding-right: 42px;
}

.header-kicker {
  color: #8a5e2e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.8;
}

.panel-header h2 {
  margin: 0;
  color: #442a10;
  font-size: 20px;
  line-height: 1.1;
}

.header-subtitle {
  color: var(--muted-ink);
  overflow: hidden;
  font-size: 11px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-count {
  margin-top: 5px;
  padding: 0 2px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #805c31;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
}

.reward-body {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 1px;
}

.reward-empty {
  display: grid;
  min-height: 120px;
  place-items: center;
  border: 2px dashed rgba(111, 78, 34, 0.2);
  border-radius: 16px;
  background: rgba(255, 253, 241, 0.68);
  color: #7a5932;
  font-size: 13px;
  font-weight: 900;
  text-align: center;
}

.reward-list {
  display: grid;
  gap: 6px;
}

.reward-card {
  position: relative;
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 9px 10px;
  border: 2px solid rgba(111, 78, 34, 0.25);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 254, 245, 0.98) 0%, rgba(251, 241, 208, 0.94) 100%);
  box-shadow: 0 6px 0 rgba(111, 78, 34, 0.12);
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.reward-card::before {
  content: "";
  position: absolute;
  top: 6px;
  left: 8px;
  right: 8px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
}

.reward-card:hover:not(.disabled),
.reward-card:focus-visible:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 rgba(111, 78, 34, 0.16);
}

.reward-card:active:not(.disabled) {
  transform: translateY(1px) scale(0.995);
  box-shadow: 0 4px 0 rgba(111, 78, 34, 0.14);
}

.reward-card.selected {
  border-color: #d97706;
  background:
    linear-gradient(180deg, rgba(255, 251, 225, 1) 0%, rgba(255, 236, 170, 1) 100%);
  box-shadow:
    0 5px 0 rgba(152, 94, 19, 0.2),
    0 0 0 3px rgba(245, 158, 11, 0.16);
}

.reward-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.2);
}

.reward-card-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.reward-card-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 2px solid currentColor;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.62);
  color: #7b5428;
  font-size: 20px;
}

.reward-card-heading {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.reward-rarity,
.selected-badge,
.reward-tag,
.reward-accent {
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.reward-rarity {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: 20px;
  padding: 0 7px;
  background: #f4ead1;
  color: #7b5428;
}

.selected-badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
  color: #fff8ee;
  box-shadow: 0 3px 0 rgba(154, 52, 18, 0.26);
}

.reward-name {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: #3e2811;
  font-size: 15px;
  line-height: 1.2;
}

.reward-description {
  color: #6a5134;
  font-size: 11px;
  line-height: 1.35;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.reward-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.reward-tag {
  padding: 3px 7px;
  background: rgba(255, 248, 222, 0.94);
  color: #815d33;
  border: 1px solid rgba(111, 78, 34, 0.14);
}

.reward-accent {
  justify-self: start;
  padding: 4px 8px;
  background: rgba(111, 78, 34, 0.08);
  color: #7b552b;
}

.rarity-common .reward-rarity,
.rarity-common .reward-accent {
  background: rgba(148, 163, 184, 0.16);
  color: #516073;
}

.rarity-rare .reward-rarity,
.rarity-rare .reward-accent {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.rarity-epic .reward-rarity,
.rarity-epic .reward-accent {
  background: rgba(168, 85, 247, 0.14);
  color: #7e22ce;
}

.rarity-legendary .reward-rarity,
.rarity-legendary .reward-accent {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.panel-footer {
  flex: 0 0 auto;
  display: grid;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(111, 78, 34, 0.14);
  background: linear-gradient(180deg, rgba(249, 232, 180, 0) 0%, rgba(249, 232, 180, 0.32) 100%);
}

.selection-hint {
  min-height: 16px;
  color: #7a5932;
  font-size: 11px;
  line-height: 1.25;
  text-align: center;
}

.confirm-button {
  width: 100%;
  min-height: 42px;
  padding: 10px 14px;
  border: 2px solid #7f3b0c;
  border-radius: 18px;
  background:
    linear-gradient(180deg, #ffb548 0%, #f97316 100%);
  box-shadow: 0 6px 0 rgba(127, 59, 12, 0.26);
  color: #fff8f0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.02em;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.confirm-button:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: 0 3px 0 rgba(127, 59, 12, 0.26);
}

.confirm-button:disabled {
  border-color: rgba(111, 78, 34, 0.3);
  background: linear-gradient(180deg, #ddd3bd 0%, #c8baa0 100%);
  color: rgba(68, 42, 16, 0.66);
  box-shadow: 0 4px 0 rgba(111, 78, 34, 0.14);
}

@media (min-width: 390px) {
  .reward-choice-overlay {
    padding: 2px;
  }

  .reward-choice-panel {
    max-height: calc(100dvh - 88px);
    padding: 12px 11px 11px;
  }

  .reward-card {
    padding: 9px 11px;
  }

  .header-kicker {
    display: none;
  }

  .panel-header h2 {
    font-size: 21px;
  }

  .reward-name {
    font-size: 15px;
  }
}

@media (min-width: 430px) {
  .reward-choice-panel {
    max-height: calc(100dvh - 80px);
  }

  .panel-header h2 {
    font-size: 22px;
  }

  .reward-name {
    font-size: 16px;
  }
}
</style>
