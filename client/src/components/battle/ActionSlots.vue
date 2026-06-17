<script setup lang="ts">
import type { ActionSlotVM, SelfDestructOption } from "./types";
export type { ActionSlotVM, SelfDestructOption };

const props = defineProps<{
  slots: ActionSlotVM[];
  canUseSlots: boolean;
  diceValue: number;
  selfDestructOptions: SelfDestructOption[];
  showSelfDestruct: boolean;
  locked: boolean;
}>();

const emit = defineEmits<{
  selectAction: [slotId: string];
  selectSelfDestruct: [amount: number];
}>();
</script>

<template>
  <div v-if="props.slots.length > 0 || showSelfDestruct" class="dice-action-slots">
    <!-- Self-destruct amount picker (above action slots) -->
    <div v-if="showSelfDestruct" class="self-destruct-panel">
      <div class="self-destruct-title">
        <strong>选择自爆扣血量</strong>
        <span>造成双倍普通伤害</span>
      </div>
      <div class="self-destruct-grid">
        <button
          v-for="option in selfDestructOptions"
          :key="option.amount"
          class="self-destruct-btn"
          type="button"
          :disabled="option.disabled || locked"
          :title="option.disabled ? '血量不足' : `扣 ${option.amount} 血，造成 ${option.damage} 伤害`"
          @click="emit('selectSelfDestruct', option.amount)"
        >
          <strong>{{ option.amount }}</strong>
          <small>扣 {{ option.amount }} / 伤 {{ option.damage }}</small>
        </button>
      </div>
    </div>

    <div class="slot-heading">
      <strong>行动卡槽 · 🎲 {{ diceValue }}</strong>
    </div>
    <div class="slot-grid">
      <button
        v-for="slot in slots"
        :key="slot.id"
        class="dice-action-slot"
        type="button"
        :class="{
          enabled: slot.enabled && !slot.requiresSelfDamage,
          disabled: !slot.enabled || slot.requiresSelfDamage,
          settling: slot.settling && locked
        }"
        :disabled="!canUseSlots || !slot.enabled || slot.requiresSelfDamage"
        @click="emit('selectAction', slot.id)"
      >
        <span class="slot-dice">🎲 {{ diceValue }}</span>
        <strong>{{ slot.settling && locked ? "结算中……" : slot.label }}</strong>
        <small>{{ slot.requiresSelfDamage ? "请在上方选择扣血量" : slot.enabled ? slot.description : slot.description }}</small>
      </button>
    </div>
  </div>
</template>
