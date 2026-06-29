<script setup lang="ts">
import type { Character } from "@career-war/shared";
import { computed } from "vue";

const props = withDefaults(defineProps<{
  characters?: Character[];
  mode?: "general" | "roguelite";
}>(), {
  mode: "general"
});

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

const ROGUELITE_RULE_SECTIONS = [
  {
    title: "挑战目标",
    items: [
      "肉鸽挑战是单人连续冒险。",
      "每 15 关为一轮，第 15 关是大 Boss。",
      "击败一轮 Boss 后可以结束结算，也可以继续深入更高关卡。"
    ]
  },
  {
    title: "开局状态",
    items: [
      "开局固定使用拳手。",
      "不使用召唤师技能。",
      "初始金币为 0，初始词条为 0。"
    ]
  },
  {
    title: "成长规则",
    items: [
      "胜利后选择奖励，奖励会强化生命、伤害、防御或职业技能。",
      "普通成长、角色技能和 Boss 能力会逐步组成你的职业流派。",
      "战后会根据关卡类型恢复生命。"
    ]
  },
  {
    title: "地图节点",
    items: [
      "地图包含普通战斗、精英、Boss、事件、商店、休息点和奖励房。",
      "不同路线会影响本局成长节奏。",
      "Boss 会按轮回节奏反复出现，越往后压力越高。"
    ]
  },
  {
    title: "战斗压力",
    items: [
      "每关仍按骰子回合结算行动。",
      "第 9 回合起进入狂化，双方直接攻击伤害会增加。",
      "生命归零则本次挑战结束。"
    ]
  }
];

const isRogueliteGuide = computed(() => props.mode === "roguelite");
const guideTitle = computed(() => (isRogueliteGuide.value ? "肉鸽规则" : "规则说明"));
const guideEyebrow = computed(() => (isRogueliteGuide.value ? "Roguelite Guide" : "Rule Guide"));
const activeRuleSections = computed(() => (isRogueliteGuide.value ? ROGUELITE_RULE_SECTIONS : RULE_SECTIONS));
</script>

<template>
  <div class="rule-guide-backdrop" @click.self="emit('close')">
    <section class="rule-guide-dialog" role="dialog" aria-modal="true" :aria-label="guideTitle">
      <header class="rule-guide-header">
        <div>
          <span class="eyebrow">{{ guideEyebrow }}</span>
          <h2>{{ guideTitle }}</h2>
        </div>
        <button class="rule-guide-close-btn" type="button" @click="emit('close')">关闭</button>
      </header>

      <div class="rule-guide-body">
        <section v-for="section in activeRuleSections" :key="section.title" class="rule-section">
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
