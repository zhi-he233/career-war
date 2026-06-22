<script setup lang="ts">
import { computed } from "vue";

type BattleUnitDetailCardProps = {
  name: string;
  careerName: string;
  hp: number;
  maxHp: number;
  shield: number;
  statusText: string;
  lastRollText?: string;
  avatarSrc?: string;
  fallbackMark: string;
  skillLines: string[];
  tags?: string[];
  dead?: boolean;
  offline?: boolean;
};

const props = withDefaults(defineProps<BattleUnitDetailCardProps>(), {
  lastRollText: "",
  avatarSrc: "",
  tags: () => [],
  dead: false,
  offline: false
});

const emit = defineEmits<{
  close: [];
}>();

const visibleSkillLines = computed(() =>
  props.skillLines.length > 0 ? props.skillLines : ["无技能，投到几点造成几点伤害"]
);
</script>

<template>
  <article class="battle-unit-card" :class="{ dead, offline }" :aria-label="`${name} 战斗详情`">
    <button class="close-btn" type="button" aria-label="关闭详情" @click="emit('close')">×</button>

    <header class="unit-hero">
      <span class="status-pill">
        <span class="status-dot" aria-hidden="true"></span>
        {{ statusText }}
      </span>

      <div class="avatar-ring">
        <img v-if="avatarSrc" class="avatar-img" :src="avatarSrc" :alt="careerName" draggable="false" />
        <span v-else class="avatar-fallback">{{ fallbackMark }}</span>
      </div>

      <div class="unit-title">
        <h2>{{ name }}</h2>
        <p>{{ careerName }}</p>
      </div>

      <ul v-if="tags.length" class="tag-list" aria-label="角色状态标签">
        <li v-for="tag in tags" :key="tag">{{ tag }}</li>
      </ul>
    </header>

    <section class="stat-grid" aria-label="当前战斗状态">
      <div class="stat-tile hp-tile">
        <span>血量</span>
        <strong>{{ hp }} / {{ maxHp }}</strong>
      </div>
      <div class="stat-tile">
        <span>护盾</span>
        <strong>{{ shield }}</strong>
      </div>
      <div class="stat-tile">
        <span>状态</span>
        <strong>{{ statusText }}</strong>
      </div>
      <div class="stat-tile">
        <span>最近骰点</span>
        <strong>{{ lastRollText || "暂无" }}</strong>
      </div>
    </section>

    <section class="skill-panel" aria-labelledby="battle-unit-skill-title">
      <h3 id="battle-unit-skill-title">职业技能</h3>
      <ul>
        <li v-for="(line, index) in visibleSkillLines" :key="`${index}-${line}`">
          <span class="skill-index" aria-hidden="true">{{ index + 1 }}</span>
          <span>{{ line }}</span>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.battle-unit-card {
  position: relative;
  display: grid;
  gap: 12px;
  width: min(100%, 390px);
  max-height: calc(100svh - 28px);
  margin: 0 auto;
  border: 2px solid #243044;
  border-radius: 14px;
  padding: 12px;
  overflow-y: auto;
  color: #172033;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 249, 255, 0.72)),
    repeating-linear-gradient(0deg, rgba(36, 48, 68, 0.035) 0 2px, transparent 2px 8px),
    #fffdf4;
  box-shadow: 0 6px 0 rgba(36, 48, 68, 0.18), 0 20px 34px rgba(15, 23, 42, 0.22);
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
}

.battle-unit-card::before {
  position: absolute;
  inset: 7px;
  pointer-events: none;
  border: 1px dashed rgba(36, 48, 68, 0.18);
  border-radius: 10px;
  content: "";
}

.close-btn,
.unit-hero,
.stat-grid,
.skill-panel {
  position: relative;
  z-index: 1;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 2px solid rgba(36, 48, 68, 0.18);
  border-radius: 10px;
  color: #243044;
  background: #f8fafc;
  box-shadow: inset 0 -3px 0 rgba(36, 48, 68, 0.12), 0 3px 0 rgba(36, 48, 68, 0.12);
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
}

.close-btn:active {
  transform: translateY(2px);
  box-shadow: inset 0 -1px 0 rgba(36, 48, 68, 0.12), 0 1px 0 rgba(36, 48, 68, 0.12);
}

.unit-hero {
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 6px 40px 2px;
  text-align: center;
}

.status-pill {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  border: 1px solid rgba(36, 48, 68, 0.16);
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(255, 255, 255, 0.76);
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border: 1px solid rgba(36, 48, 68, 0.28);
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
}

.battle-unit-card.dead .status-dot {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.16);
}

.battle-unit-card.offline .status-dot {
  background: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.18);
}

.avatar-ring {
  display: grid;
  place-items: center;
  width: clamp(88px, 28vw, 108px);
  height: clamp(88px, 28vw, 108px);
  border: 3px solid #243044;
  border-radius: 999px;
  padding: 6px;
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.96), rgba(219, 234, 254, 0.74) 45%, rgba(37, 99, 235, 0.22) 100%),
    #eff6ff;
  box-shadow: inset 0 -5px 0 rgba(36, 48, 68, 0.12), 0 7px 16px rgba(15, 23, 42, 0.18);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(36, 48, 68, 0.16);
  border-radius: 999px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.62);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: #ffffff;
  color: #243044;
  font-size: 34px;
  font-weight: 900;
}

.unit-title {
  display: grid;
  gap: 4px;
  max-width: 100%;
}

.unit-title h2 {
  margin: 0;
  color: #111827;
  font-size: clamp(22px, 7vw, 28px);
  line-height: 1.08;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.unit-title p {
  margin: 0;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-list li {
  border: 1px solid rgba(36, 48, 68, 0.16);
  border-radius: 8px;
  padding: 5px 8px;
  background: #dcfce7;
  box-shadow: inset 0 -2px 0 rgba(22, 101, 52, 0.12);
  color: #14532d;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.15;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat-tile {
  display: grid;
  gap: 5px;
  min-width: 0;
  min-height: 66px;
  border: 2px solid rgba(36, 48, 68, 0.14);
  border-radius: 10px;
  padding: 9px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 -4px 0 rgba(36, 48, 68, 0.06);
}

.stat-tile span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.stat-tile strong {
  min-width: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 1000;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.hp-tile strong {
  color: #7f1d1d;
}

.skill-panel {
  border: 2px solid rgba(36, 48, 68, 0.16);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: inset 0 -4px 0 rgba(36, 48, 68, 0.06);
}

.skill-panel h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  color: #172033;
  font-size: 15px;
  line-height: 1.2;
}

.skill-panel h3::before {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(36, 48, 68, 0.18);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: inset 0 -2px 0 rgba(36, 48, 68, 0.12);
  content: "⚂";
}

.skill-panel ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill-panel li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.skill-index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(36, 48, 68, 0.2);
  border-radius: 7px;
  color: #172033;
  background: #f8fafc;
  box-shadow: inset 0 -3px 0 rgba(36, 48, 68, 0.1);
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

@media (max-width: 374px) {
  .battle-unit-card {
    padding: 10px;
  }

  .unit-hero {
    padding-inline: 38px;
  }

  .stat-tile {
    min-height: 62px;
    padding: 8px;
  }

  .stat-tile strong {
    font-size: 14px;
  }

  .skill-panel li {
    font-size: 12px;
  }
}
</style>
