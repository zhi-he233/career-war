<script setup lang="ts">
import BattleSeat from "./BattleSeat.vue";
import type { SeatViewModel } from "./BattleSeat.vue";

defineProps<{
  seats: SeatViewModel[];
  inlineClass?: string;
}>();

const emit = defineEmits<{
  seatClick: [playerId: string];
  infoClick: [playerId: string];
}>();
</script>

<template>
  <div class="combat-board" :class="inlineClass" aria-label="玩家头像战场">
    <BattleSeat
      v-for="seat in seats"
      :key="seat.playerId"
      :seat="seat"
      @seat-click="emit('seatClick', $event)"
      @info-click="emit('infoClick', $event)"
    />
  </div>
</template>
