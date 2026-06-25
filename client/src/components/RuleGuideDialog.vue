<script setup lang="ts">
import type { Character } from "@career-war/shared";

defineProps<{
  characters?: Character[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const RULE_SECTIONS = [
  {
    title: "基础流程",
    items: [
      "进入房间后，选择职业和召唤师技能。",
      "战斗开始后按回合投骰，选择本回合行动。",
      "系统根据骰子、职业技能和当前状态完成结算。"
    ]
  },
  {
    title: "骰子规则",
    items: [
      "投骰点数会影响本回合行动强度。",
      "不同职业可能对特定点数有额外收益。"
    ]
  },
  {
    title: "职业规则",
    items: [
      "每个职业有生命值、标签、技能和特殊机制。",
      "选择职业后才能进入战斗。"
    ]
  },
  {
    title: "召唤师技能",
    items: [
      "召唤师技能是额外战术选择。",
      "技能可以和职业机制配合使用。"
    ]
  },
  {
    title: "肉鸽挑战",
    items: [
      "肉鸽挑战是单人闯关玩法。",
      "战斗后获得奖励并强化角色，逐步挑战普通战、精英战和 Boss。"
    ]
  },
  {
    title: "胜负结算",
    items: [
      "一方生命归零后进入结算。",
      "肉鸽模式会根据关卡推进和战斗结果进入奖励或下一关。"
    ]
  }
];
</script>

<template>
  <div class="rule-guide-backdrop" @click.self="emit('close')">
    <section class="rule-guide-dialog" role="dialog" aria-modal="true" aria-label="规则说明">
      <header class="rule-guide-header">
        <div>
          <span class="eyebrow">Rule Guide</span>
          <h2>规则说明</h2>
        </div>
        <button class="rule-guide-close-btn" type="button" @click="emit('close')">关闭</button>
      </header>

      <div class="rule-guide-body">
        <section v-for="section in RULE_SECTIONS" :key="section.title" class="rule-section">
          <h3>{{ section.title }}</h3>
          <ul>
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </section>
      </div>

      <footer class="rule-guide-footer">
        <button class="primary-btn" type="button" @click="emit('close')">关闭</button>
      </footer>
    </section>
  </div>
</template>
