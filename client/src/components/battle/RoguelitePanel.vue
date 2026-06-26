<script setup lang="ts">
import type { RoguelitePanelVM } from "./types";

defineProps<{
  data: RoguelitePanelVM;
}>();

const emit = defineEmits<{
  chooseReward: [rewardId: string];
  chooseContinue: [choice: "finish" | "continue"];
}>();

function hasAnyResource(r: Record<string, unknown>): boolean {
  return Boolean(r.fateTokens || (Number(r.lowRollCharge ?? 0) > 0) || (r.consecutiveLowRolls && (r.consecutiveLowRolls as Record<string,number>).current > 0) || r.shieldOverloadUsed !== undefined);
}
</script>

<template>
  <template v-if="data.enabled">
    <!-- Stage status bar -->
    <section class="roguelite-status" :class="`stage-${data.stageType}`">
      <div>
        <strong>第 {{ data.stage }} 关</strong>
        <span v-if="data.round > 0" class="round-badge">第 {{ data.round }} 轮</span>
        <span class="stage-type-badge" :class="`stage-type-${data.stageType}`">{{ data.stageTypeLabel }}</span>
        <span v-if="data.fatigue" class="fatigue-badge" :class="{ active: data.fatigue.bonus > 0 }">
          回合 {{ data.fatigue.battleRound }} · 狂化 +{{ data.fatigue.bonus }}
        </span>
        <span>{{ data.phaseText }}</span>
      </div>
    </section>

    <!-- Dynamic resources -->
    <section v-if="data.resources && hasAnyResource(data.resources)" class="roguelite-resources">
      <span v-if="data.resources.fateTokens" class="resource-chip dice-chip">🎲 命运筹码：{{ data.resources.fateTokens.current }}/{{ data.resources.fateTokens.max }}</span>
      <span v-if="(data.resources.lowRollCharge ?? 0) > 0" class="resource-chip charge-chip">⚡ 蓄力：{{ data.resources.lowRollCharge }} 层</span>
      <span v-if="data.resources.consecutiveLowRolls && data.resources.consecutiveLowRolls.current > 0" class="resource-chip low-chip">📉 连续低点：{{ data.resources.consecutiveLowRolls.current }}/{{ data.resources.consecutiveLowRolls.max }}</span>
      <span v-if="data.resources.shieldOverloadUsed !== undefined" class="resource-chip overload-chip" :class="{ used: data.resources.shieldOverloadUsed }">💥 护盾过载：{{ data.resources.shieldOverloadUsed ? '已使用' : '可用' }}</span>
    </section>

    <!-- Enemy traits -->
    <section v-if="data.enemyTraits && data.enemyTraits.length > 0" class="roguelite-enemy-traits">
      <span class="trait-label">敌人特性</span>
      <span v-for="(t, i) in data.enemyTraits" :key="i" class="trait-chip">{{ t }}</span>
    </section>

    <!-- Boss panel -->
    <section v-if="data.boss" class="roguelite-boss-panel">
      <div class="section-heading">
        <h2>当前 Boss</h2>
        <span class="boss-badge">Boss</span>
      </div>
      <div class="boss-info-body">
        <strong>{{ data.boss.name }}</strong>
        <p>{{ data.boss.typeLabel }} · ♥ {{ data.boss.hp }}/{{ data.boss.maxHp }} · 盾 {{ data.boss.shield }}</p>
        <div v-if="data.boss.skills.length" class="boss-skills">
          <span v-for="(skill, i) in data.boss.skills" :key="i" class="boss-skill-chip">{{ skill }}</span>
        </div>
        <div v-if="data.boss.stateChips.length" class="boss-state">
          <span
            v-for="(chip, i) in data.boss.stateChips"
            :key="i"
            class="boss-state-chip"
            :class="chip.kind"
          >{{ chip.text }}</span>
        </div>
      </div>
    </section>

    <!-- Enemy buffs panel -->
    <section v-if="data.enemy" class="roguelite-enemy-panel">
      <div class="section-heading">
        <h2>{{ data.enemy.name }} · {{ data.enemy.typeLabel }}</h2>
      </div>
      <div class="enemy-info-body">
        <span>生命加成 +{{ data.enemy.hpBonus }}</span>
        <span v-if="data.enemy.shieldBonus > 0">护盾加成 +{{ data.enemy.shieldBonus }}</span>
        <span v-if="data.enemy.damageBonus > 0">伤害加成 +{{ data.enemy.damageBonus }}</span>
        <span v-if="data.enemy.description">{{ data.enemy.description }}</span>
        <span v-for="skill in data.enemy.skills" :key="skill">{{ skill }}</span>
      </div>
    </section>

    <!-- Perks panel -->
    <section class="roguelite-perks-panel">
      <div class="section-heading">
        <h2>我的词条</h2>
      </div>
      <div v-if="data.perks.growth.length > 0" class="perk-group">
        <span class="perk-group-label">基础成长</span>
        <div class="perk-list">
          <div v-for="perk in data.perks.growth" :key="perk.id" class="perk-chip growth-perk">
            <strong>{{ perk.name }} Lv.{{ perk.level }}</strong>
            <small>{{ perk.description }}</small>
          </div>
        </div>
      </div>
      <div class="perk-group">
        <span class="perk-group-label">角色技能</span>
        <div v-if="data.perks.skills.length > 0" class="perk-list">
          <div v-for="perk in data.perks.skills" :key="perk.id" class="perk-chip skill-perk">
            <strong>{{ perk.name }} Lv.{{ perk.level }}</strong>
            <small>{{ perk.description }}</small>
          </div>
        </div>
        <p v-else class="hint">暂无角色技能，击败敌人后获得。</p>
      </div>
      <div v-if="data.perks.boss.length > 0" class="perk-group">
        <span class="perk-group-label">Boss 能力</span>
        <div class="perk-list">
          <div v-for="perk in data.perks.boss" :key="perk.id" class="perk-chip boss-perk">
            <strong>{{ perk.name }} Lv.{{ perk.level }}</strong>
            <small>{{ perk.description }}</small>
          </div>
        </div>
      </div>
    </section>

    <!-- Reward selection panel -->
    <section v-if="data.rewardPhase" class="roguelite-reward-panel" :class="{ 'boss-reward-panel': data.rewardPhase.isBoss }">
      <div class="section-heading">
        <h2>{{ data.rewardPhase.title }}</h2>
        <span class="hint">{{ data.rewardPhase.hint }}</span>
      </div>
      <div v-if="data.rewardPhase.summary" class="stage-summary">
        <span class="summary-label">本关结算</span>
        <div class="summary-chips">
          <span>击败：{{ data.rewardPhase.summary.defeatedName }}</span>
          <span v-if="(data.rewardPhase.summary.goldGained ?? 0) > 0" class="summary-gold">获得金币：+{{ data.rewardPhase.summary.goldGained }}</span>
          <span v-if="data.rewardPhase.summary.postBattleHeal > 0" class="summary-heal">战后恢复：+{{ data.rewardPhase.summary.postBattleHeal }} 生命</span>
          <span>当前生命：{{ data.rewardPhase.summary.hpAfterHeal }} / {{ data.rewardPhase.summary.maxHp }}</span>
          <span v-if="data.rewardPhase.summary.isBoss" class="summary-boss">Boss 关</span>
        </div>
      </div>
      <div class="reward-card-grid">
        <button
          v-for="option in data.rewardPhase.options"
          :key="option.id"
          class="reward-card"
          :class="{ 'boss-reward-card': option.isBoss }"
          type="button"
          @click="emit('chooseReward', option.id)"
        >
          <span class="reward-card-type" :class="option.isBoss ? 'reward-type-boss' : 'reward-type-growth'">
            {{ option.isBoss ? 'Boss 能力' : '基础成长' }}
          </span>
          <strong>{{ option.name }}</strong>
          <small>{{ option.description }}</small>
        </button>
      </div>
    </section>

    <!-- Continue / Finish panel -->
    <section v-if="data.continuePhase" class="roguelite-continue-panel">
      <div class="section-heading">
        <h2>挑战继续</h2>
        <span class="hint">{{ data.continuePhase.hint }}</span>
      </div>
      <div class="continue-actions">
        <button class="primary-btn continue-finish-btn" type="button" @click="emit('chooseContinue', 'finish')">
          <strong>结束挑战</strong>
          <small>以当前成绩结算，挑战成功</small>
        </button>
        <button class="primary-btn continue-go-btn" type="button" @click="emit('chooseContinue', 'continue')">
          <strong>继续挑战</strong>
          <small>进入第 {{ data.continuePhase.nextStage }} 关，敌人更强</small>
        </button>
      </div>
    </section>
  </template>
</template>
