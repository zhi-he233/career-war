<script setup lang="ts">
defineProps<{
  activeTab: string;
  isDuoMode: boolean;
  isClassicMode: boolean;
}>();

const emit = defineEmits<{
  (e: "update:activeTab", value: string): void;
}>();
</script>

<template>
  <nav class="lobby-tabs">
    <button class="lobby-tab-btn" :class="{ active: activeTab === 'players' }" type="button" @click="emit('update:activeTab', 'players')">玩家</button>
    <button class="lobby-tab-btn" :class="{ active: activeTab === 'settings' }" type="button" @click="emit('update:activeTab', 'settings')">设置</button>
    <button v-if="isDuoMode" class="lobby-tab-btn" :class="{ active: activeTab === 'characters' }" type="button" @click="emit('update:activeTab', 'characters')">阵容</button>
    <button v-if="isClassicMode" class="lobby-tab-btn" :class="{ active: activeTab === 'characters' }" type="button" @click="emit('update:activeTab', 'characters')">职业</button>
    <button v-if="isClassicMode" class="lobby-tab-btn" :class="{ active: activeTab === 'summoner' }" type="button" @click="emit('update:activeTab', 'summoner')">技能</button>
  </nav>
</template>
