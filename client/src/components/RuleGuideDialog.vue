<script setup lang="ts">
import { computed } from "vue";
import type { Character } from "@career-war/shared";

const props = defineProps<{
  characters: Character[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const RULE_SECTIONS = [
  {
    title: "基础规则",
    items: [
      "服务器负责投骰和结算，前端只显示。",
      "如果职业没有特殊说明，默认投到几点造成几点伤害。",
      "血量小于等于 0 时死亡。",
      "死亡玩家跳过行动。",
      "护盾优先扣除，除非技能写明无视护盾。",
      "一回合指从该角色本次行动开始，到该角色下一次行动开始之前。",
      "再投一次效果由玩家自己点击继续投骰。"
    ]
  },
  {
    title: "护盾规则",
    items: ["护盾优先扣除，除非技能写明无视护盾。", "受到伤害时先消耗护盾，剩余伤害再扣血。"]
  },
  {
    title: "无敌规则",
    items: ["无敌生效时，本次伤害为 0。", "无敌持续时间以具体职业说明为准。"]
  },
  {
    title: "死亡规则",
    items: ["血量小于等于 0 时死亡。", "死亡玩家跳过行动，不能再被选择为攻击目标。"]
  },
  {
    title: "再投一次规则",
    items: ["再投一次效果由玩家自己点击继续投骰。", "继续投骰的结果仍由服务器结算，前端只显示。"]
  }
];

const implementedCharacters = computed(() =>
  props.characters.filter((character) => character.isImplemented !== false && !character.isHidden)
);

function characterDescription(character: Character): string[] {
  return character.fullDescription?.length ? character.fullDescription : character.description;
}
</script>

<template>
  <div class="rule-guide-backdrop" @click.self="emit('close')">
    <section class="rule-guide-dialog" role="dialog" aria-modal="true" aria-label="规则 / 职业说明">
      <header class="rule-guide-header">
        <div>
          <span class="eyebrow">Rule Guide</span>
          <h2>规则 / 职业说明</h2>
        </div>
        <button class="detail-close-btn" type="button" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div class="rule-guide-body">
        <section v-for="section in RULE_SECTIONS" :key="section.title" class="rule-section">
          <h3>{{ section.title }}</h3>
          <ul>
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section class="rule-section">
          <h3>当前已实现职业说明</h3>
          <div class="rule-character-list">
            <article v-for="character in implementedCharacters" :key="character.id" class="rule-character-card">
              <div class="rule-character-title">
                <strong>{{ character.name }}</strong>
                <span>HP {{ character.maxHp }}</span>
              </div>
              <p v-if="character.shortDescription">{{ character.shortDescription }}</p>
              <ul>
                <li v-for="item in characterDescription(character)" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <footer class="rule-guide-footer">
        <button class="primary-btn" type="button" @click="emit('close')">关闭</button>
      </footer>
    </section>
  </div>
</template>
