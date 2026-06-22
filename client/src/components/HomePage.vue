<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  selectPvp: [];
  selectPve: [];
  selectRoguelite: [];
}>();

const showRules = ref(false);
</script>

<template>
  <section class="home-page game-home">
    <div class="home-topline">
      <span>骰子桌游</span>
      <span>H5 对战</span>
    </div>

    <div class="home-title-card">
      <span class="home-dice-mark">🎲</span>
      <h2>职业互怼</h2>
      <p>骰子职业对战 · 实时互怼 · 肉鸽挑战</p>
    </div>

    <div class="home-actions">
      <button class="primary-btn home-start-btn" type="button" @click="emit('selectPvp')">开始游戏</button>
      <button class="secondary-btn home-rule-btn" type="button" @click="showRules = !showRules">规则说明</button>
      <p v-if="showRules" class="home-rule-note">投骰决定本回合行动强度，选择职业和召唤师技能后进入战斗。详细职业规则可在房间页查看。</p>
      <div class="home-sub-actions">
        <button class="secondary-btn" type="button" @click="emit('selectRoguelite')">肉鸽挑战</button>
        <button class="ghost-btn" type="button" @click="emit('selectPve')">人机练习</button>
      </div>
    </div>
  </section>
</template>
