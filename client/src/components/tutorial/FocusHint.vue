<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  message: string;
  placement?: "top" | "bottom" | "center";
}>(), {
  placement: "bottom",
});
</script>

<template>
  <div class="tutorial-focus-hint" :class="`placement-${placement}`" role="status" aria-live="polite">
    <strong>{{ title }}</strong>
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.tutorial-focus-hint {
  position: absolute;
  z-index: 70;
  left: 50%;
  display: grid;
  gap: 4px;
  width: min(280px, calc(100vw - 28px));
  padding: 10px 12px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #fffaf0;
  box-shadow: 0 4px 0 rgba(17, 17, 17, 0.88), 0 12px 22px rgba(17, 17, 17, 0.18);
  color: #111111;
  pointer-events: none;
  transform: translateX(-50%);
}

.tutorial-focus-hint::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 12px;
  height: 12px;
  border-right: 2px solid #111111;
  border-bottom: 2px solid #111111;
  background: #fffaf0;
  transform: translateX(-50%) rotate(45deg);
}

.placement-top {
  top: 10px;
}

.placement-top::after {
  bottom: -8px;
}

.placement-bottom {
  bottom: 76px;
}

.placement-bottom::after {
  bottom: -8px;
}

.placement-center {
  top: 50%;
  transform: translate(-50%, -50%);
}

.placement-center::after {
  display: none;
}

.tutorial-focus-hint strong {
  font-size: 14px;
  font-weight: 1000;
  line-height: 1.2;
}

.tutorial-focus-hint span {
  color: #4b5563;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

@media (max-width: 380px), (max-height: 690px) {
  .tutorial-focus-hint {
    width: min(260px, calc(100vw - 24px));
    padding: 8px 10px;
  }

  .tutorial-focus-hint strong {
    font-size: 13px;
  }

  .tutorial-focus-hint span {
    font-size: 11px;
  }
}
</style>
