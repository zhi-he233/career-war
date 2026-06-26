<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RogueliteEventChoiceId, RoguelitePendingEvent } from "@career-war/shared";

const props = defineProps<{
  event: RoguelitePendingEvent;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [choiceId: RogueliteEventChoiceId];
}>();

const selectedChoiceId = ref<RogueliteEventChoiceId | null>(null);

const selectedChoice = computed(() =>
  props.event.choices.find((choice) => choice.id === selectedChoiceId.value) ?? null
);
const canConfirm = computed(() => Boolean(selectedChoice.value) && !props.disabled);

watch(
  () => props.event.id,
  () => {
    selectedChoiceId.value = null;
  }
);

function choose(choiceId: RogueliteEventChoiceId): void {
  if (props.disabled) return;
  selectedChoiceId.value = choiceId;
}

function confirm(): void {
  if (!canConfirm.value || !selectedChoice.value) return;
  emit("select", selectedChoice.value.id);
}

function rarityText(rarity: RoguelitePendingEvent["rarity"]): string {
  if (rarity === "rare") return "稀有事件";
  if (rarity === "uncommon") return "特殊事件";
  return "普通事件";
}
</script>

<template>
  <div class="event-choice-overlay">
    <section class="event-choice-panel" role="dialog" aria-modal="true" :aria-label="event.name">
      <header class="event-header">
        <p>{{ rarityText(event.rarity) }}</p>
        <h2>{{ event.name }}</h2>
        <span>{{ event.description }}</span>
      </header>

      <div class="event-body">
        <button
          v-for="choice in event.choices"
          :key="choice.id"
          class="event-card"
          :class="{ selected: selectedChoiceId === choice.id }"
          type="button"
          :disabled="disabled"
          @click="choose(choice.id)"
        >
          <div class="event-card-top">
            <strong>{{ choice.label }}</strong>
            <small>{{ choice.id === 'a' ? 'A' : 'B' }}</small>
          </div>
          <dl>
            <div>
              <dt>效果</dt>
              <dd>{{ choice.effect }}</dd>
            </div>
            <div>
              <dt>代价</dt>
              <dd>{{ choice.cost }}</dd>
            </div>
          </dl>
        </button>
      </div>

      <footer class="event-footer">
        <p>{{ selectedChoice ? `已选择：${selectedChoice.label}` : "选择一个事件选项后继续" }}</p>
        <button class="confirm-button" type="button" :disabled="!canConfirm" @click="confirm">
          {{ canConfirm ? "确认选择" : "先选择一个选项" }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.event-choice-overlay {
  position: absolute;
  inset: 0;
  z-index: 45;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(45, 30, 14, 0.32);
  backdrop-filter: blur(6px);
}

.event-choice-panel {
  display: flex;
  flex-direction: column;
  width: min(92vw, 420px);
  max-width: 100%;
  max-height: calc(100dvh - 80px);
  overflow: hidden;
  border: 3px solid #6f4e22;
  border-radius: 22px;
  background: linear-gradient(180deg, #fff7d6 0%, #f8e7b5 100%);
  box-shadow: 0 18px 0 rgba(86, 57, 24, 0.18), 0 30px 50px rgba(74, 46, 20, 0.26);
  color: #372511;
}

.event-header {
  display: grid;
  gap: 5px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(111, 78, 34, 0.16);
}

.event-header p,
.event-header h2,
.event-header span,
.event-footer p {
  margin: 0;
}

.event-header p {
  color: #8a5e2e;
  font-size: 10px;
  font-weight: 900;
}

.event-header h2 {
  color: #442a10;
  font-size: 22px;
  line-height: 1.1;
}

.event-header span {
  color: #73583a;
  font-size: 12px;
  line-height: 1.4;
}

.event-body {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 12px;
}

.event-card {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 2px solid rgba(111, 78, 34, 0.22);
  border-radius: 16px;
  background: linear-gradient(180deg, #fffef5 0%, #fbf1d0 100%);
  box-shadow: 0 5px 0 rgba(111, 78, 34, 0.12);
  color: #3e2811;
  text-align: left;
  cursor: pointer;
}

.event-card.selected {
  border-color: #d97706;
  background: linear-gradient(180deg, #fffbe1 0%, #ffecaa 100%);
  box-shadow: 0 5px 0 rgba(152, 94, 19, 0.2), 0 0 0 3px rgba(245, 158, 11, 0.16);
}

.event-card:disabled {
  cursor: wait;
  opacity: 0.72;
}

.event-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.event-card-top strong {
  min-width: 0;
  font-size: 15px;
  line-height: 1.2;
}

.event-card-top small {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9px;
  background: rgba(111, 78, 34, 0.1);
  color: #7b5428;
  font-weight: 900;
}

.event-card dl {
  display: grid;
  gap: 6px;
  margin: 0;
}

.event-card dl > div {
  display: grid;
  gap: 2px;
}

.event-card dt {
  color: #8a5e2e;
  font-size: 10px;
  font-weight: 900;
}

.event-card dd {
  margin: 0;
  color: #6a5134;
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.event-footer {
  flex: 0 0 auto;
  display: grid;
  gap: 8px;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(111, 78, 34, 0.16);
}

.event-footer p {
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
  background: linear-gradient(180deg, #ffb548 0%, #f97316 100%);
  box-shadow: 0 6px 0 rgba(127, 59, 12, 0.26);
  color: #fff8f0;
  font-size: 14px;
  font-weight: 900;
}

.confirm-button:disabled {
  border-color: rgba(111, 78, 34, 0.3);
  background: linear-gradient(180deg, #ddd3bd 0%, #c8baa0 100%);
  color: rgba(68, 42, 16, 0.66);
  box-shadow: 0 4px 0 rgba(111, 78, 34, 0.14);
}

@media (max-width: 390px) {
  .event-choice-overlay {
    padding: 8px;
  }

  .event-choice-panel {
    width: min(94vw, 390px);
    max-height: calc(100dvh - 56px);
    border-radius: 18px;
  }

  .event-header {
    padding: 12px 12px 8px;
  }

  .event-header h2 {
    font-size: 20px;
  }

  .event-body {
    padding: 8px 10px;
  }
}

@media (max-width: 360px) {
  .event-choice-panel {
    max-height: calc(100dvh - 40px);
  }

  .event-card {
    padding: 9px;
  }
}
</style>
