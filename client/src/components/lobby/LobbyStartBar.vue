<script setup lang="ts">
defineProps<{
  statusLabel: string;
  hintText: string;
  buttonText: string;
  buttonDisabled: boolean;
}>();

const emit = defineEmits<{
  (e: "startGame"): void;
}>();
</script>

<template>
  <section class="lobby-start-bar">
    <button
      class="primary-btn"
      type="button"
      :disabled="buttonDisabled"
      @click="emit('startGame')"
    >
      {{ buttonText }}
    </button>
  </section>
</template>
