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
  <div v-if="props.slots.length > 0 || props.showSelfDestruct" class="dice-action-slots">
    <div v-if="props.showSelfDestruct" class="self-destruct-panel">
      <div class="self-destruct-title">
        <strong>选择自爆扣血量</strong>
        <span>造成双倍普通伤害</span>
      </div>
      <div class="self-destruct-grid">
        <button
          v-for="option in props.selfDestructOptions"
          :key="option.amount"
          class="self-destruct-btn"
          type="button"
          :disabled="option.disabled || props.locked"
          :title="option.disabled ? '血量不足' : `扣 ${option.amount} 血，造成 ${option.damage} 伤害`"
          @click="emit('selectSelfDestruct', option.amount)"
        >
          <strong>{{ option.amount }}</strong>
          <small>扣 {{ option.amount }} / 伤 {{ option.damage }}</small>
        </button>
      </div>
    </div>

    <div class="slot-heading">
      <strong><span class="cw-icon cw-icon-dice" aria-hidden="true"></span>行动卡槽 · 骰点 {{ props.diceValue }}</strong>
    </div>
    <div class="slot-grid">
      <button
        v-for="slot in props.slots"
        :key="slot.id"
        class="dice-action-slot"
        type="button"
        :class="{
          enabled: slot.enabled && !slot.requiresSelfDamage,
          disabled: !slot.enabled || slot.requiresSelfDamage,
          settling: slot.settling && props.locked,
          'attack-slot': slot.id === 'normal_attack',
          'character-skill-slot': slot.id === 'character_skill',
          'summoner-skill-slot': slot.id === 'summoner_skill',
          'roguelite-skill-slot': slot.id === 'roguelite_skill'
        }"
        :disabled="!props.canUseSlots || !slot.enabled || slot.requiresSelfDamage"
        @click="emit('selectAction', slot.id)"
      >
        <span class="slot-dice"><span class="cw-icon cw-icon-dice" aria-hidden="true"></span>骰点 {{ props.diceValue }}</span>
        <strong>{{ slot.settling && props.locked ? "结算中..." : slot.label }}</strong>
        <small>{{ slot.requiresSelfDamage ? "请先在上方选择扣血量" : slot.description }}</small>
      </button>
    </div>
  </div>
</template>
