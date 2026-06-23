<script setup lang="ts">
import CareerDetailCard from "../CareerDetailCard.vue";

defineProps<{
  careerId: string;
  name: string;
  title: string;
  hp: number;
  avatarSrc: string | undefined;
  spriteSrc: string | undefined;
  tags: string[];
  skillLines: string[];
  selected: boolean;
  disabled: boolean;
  recommended: boolean;
}>();

const emit = defineEmits<{
  (e: "select"): void;
  (e: "close"): void;
}>();
</script>

<template>
  <div class="character-detail-backdrop career-card-backdrop" @click.self="emit('close')">
    <section
      class="character-detail-panel career-detail-panel"
      role="dialog"
      aria-modal="true"
      :aria-label="name"
    >
      <CareerDetailCard
        :career-id="careerId"
        :name="name"
        :title="title"
        :hp="hp"
        :avatar-src="avatarSrc"
        :sprite-src="spriteSrc"
        :tags="tags"
        :skill-lines="skillLines"
        :selected="selected"
        :disabled="disabled"
        :recommended="recommended"
        @select="emit('select')"
        @close="emit('close')"
      />
    </section>
  </div>
</template>
