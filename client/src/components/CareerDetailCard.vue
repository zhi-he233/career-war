<script setup lang="ts">
import { computed } from "vue";

type CareerDetailCardProps = {
  careerId: string;
  name: string;
  title?: string;
  hp: number;
  avatarSrc?: string;
  spriteSrc?: string;
  tags?: string[];
  skillLines: string[];
  selected?: boolean;
  disabled?: boolean;
  recommended?: boolean;
};

const props = withDefaults(defineProps<CareerDetailCardProps>(), {
  title: "江湖传言：很会整活",
  avatarSrc: "",
  spriteSrc: "",
  tags: () => [],
  selected: false,
  disabled: false,
  recommended: false
});

const emit = defineEmits<{
  select: [careerId: string];
  close: [];
}>();

const statusLabel = computed(() => {
  if (props.disabled) return "不可选";
  if (props.selected) return "已选择";
  return "可选择";
});

const selectButtonText = computed(() => {
  if (props.disabled) return "不可选择";
  if (props.selected) return "已选择";
  return "选择该职业";
});

const cardClasses = computed(() => ({
  "is-selected": props.selected,
  "is-disabled": props.disabled,
  "is-recommended": props.recommended
}));

const skillTitleId = computed(() => `career-skill-title-${props.careerId.replace(/[^a-zA-Z0-9_-]/g, "-")}`);

function selectCareer(): void {
  if (props.disabled || props.selected) return;
  emit("select", props.careerId);
}
</script>

<template>
  <article class="career-detail-card" :class="cardClasses" :aria-label="`${name} 职业详情`">
    <header class="card-header">
      <span class="status-pill" :class="{ selected, disabled }">
        <span class="status-dot" aria-hidden="true"></span>
        {{ statusLabel }}
      </span>
      <span v-if="recommended" class="recommended-badge" aria-label="推荐职业">
        <span aria-hidden="true">★</span>
        推荐
      </span>
    </header>

    <section class="hero-area">
      <div class="avatar-ring">
        <img v-if="avatarSrc" class="avatar-img" :src="avatarSrc" :alt="`${name}头像`" draggable="false" />
        <img v-else-if="spriteSrc" class="avatar-img sprite-fallback" :src="spriteSrc" :alt="`${name}像素形象`" draggable="false" />
        <span v-else class="avatar-placeholder" aria-hidden="true">{{ name.slice(0, 1) }}</span>
      </div>

      <div class="career-heading">
        <h2>{{ name }}</h2>
        <p>{{ title }}</p>
      </div>

      <div class="hp-chip" aria-label="血量">
        <span aria-hidden="true">♥</span>
        {{ hp }} HP
      </div>
    </section>

    <ul v-if="tags.length" class="tag-list" aria-label="职业标签">
      <li v-for="tag in tags" :key="tag">{{ tag }}</li>
    </ul>

    <section class="skill-panel" :aria-labelledby="skillTitleId">
      <h3 :id="skillTitleId">骰子技能</h3>
      <ul>
        <li v-for="(line, index) in skillLines" :key="`${careerId}-skill-${index}`">
          <span class="dice-mark" aria-hidden="true">{{ index + 1 }}</span>
          <span>{{ line }}</span>
        </li>
      </ul>
    </section>

    <footer class="card-actions">
      <button class="select-btn" type="button" :disabled="disabled || selected" @click="selectCareer">
        {{ selectButtonText }}
      </button>
      <button class="close-btn" type="button" @click="emit('close')">关闭</button>
    </footer>
  </article>
</template>

<style scoped>
.career-detail-card {
  position: relative;
  width: min(100%, 390px);
  margin: 0 auto;
  border: 2px solid #243044;
  border-radius: 14px;
  padding: 12px;
  overflow: hidden;
  color: #172033;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 246, 218, 0.76)),
    repeating-linear-gradient(0deg, rgba(36, 48, 68, 0.035) 0 2px, transparent 2px 8px),
    #fff8df;
  box-shadow: 0 6px 0 rgba(36, 48, 68, 0.18), 0 16px 28px rgba(15, 23, 42, 0.16);
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    border-color 140ms ease;
}

.career-detail-card::before {
  position: absolute;
  inset: 7px;
  pointer-events: none;
  border: 1px dashed rgba(36, 48, 68, 0.18);
  border-radius: 10px;
  content: "";
}

.career-detail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 rgba(36, 48, 68, 0.2), 0 18px 30px rgba(15, 23, 42, 0.18);
}

.career-detail-card:active {
  transform: translateY(1px);
  box-shadow: 0 4px 0 rgba(36, 48, 68, 0.18), 0 12px 20px rgba(15, 23, 42, 0.15);
}

.career-detail-card.is-selected {
  border-color: #2563eb;
  box-shadow: 0 6px 0 rgba(37, 99, 235, 0.2), 0 0 0 4px rgba(37, 99, 235, 0.14), 0 16px 28px rgba(15, 23, 42, 0.16);
}

.career-detail-card.is-recommended {
  border-color: #f59e0b;
}

.career-detail-card.is-disabled {
  border-color: #9aa6b2;
  filter: grayscale(0.2);
}

.card-header,
.hero-area,
.tag-list,
.skill-panel,
.card-actions {
  position: relative;
  z-index: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
}

.status-pill,
.recommended-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  border: 1px solid rgba(36, 48, 68, 0.16);
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border: 1px solid rgba(36, 48, 68, 0.28);
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
}

.status-pill.selected .status-dot {
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.status-pill.disabled .status-dot {
  background: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.18);
}

.recommended-badge {
  border-color: rgba(180, 83, 9, 0.24);
  color: #7c2d12;
  background: #fef3c7;
  box-shadow: inset 0 -2px 0 rgba(180, 83, 9, 0.14);
}

.hero-area {
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 12px 4px 10px;
  text-align: center;
}

.avatar-ring {
  display: grid;
  place-items: center;
  width: clamp(86px, 27vw, 104px);
  height: clamp(86px, 27vw, 104px);
  border: 3px solid #243044;
  border-radius: 999px;
  padding: 5px;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.94), rgba(254, 243, 199, 0.72) 42%, rgba(245, 158, 11, 0.24) 100%),
    #fff7d6;
  box-shadow: inset 0 -5px 0 rgba(36, 48, 68, 0.12), 0 6px 14px rgba(15, 23, 42, 0.16);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(36, 48, 68, 0.16);
  border-radius: 999px;
  object-fit: cover;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.sprite-fallback {
  object-fit: contain;
  padding: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.avatar-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  color: #243044;
  background: #ffffff;
  font-size: 34px;
  font-weight: 900;
}

.career-heading {
  display: grid;
  gap: 4px;
  max-width: 100%;
}

.career-heading h2 {
  margin: 0;
  color: #111827;
  font-size: clamp(22px, 7vw, 28px);
  line-height: 1.08;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.career-heading p {
  margin: 0;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.hp-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  min-height: 32px;
  border: 2px solid rgba(127, 29, 29, 0.16);
  border-radius: 999px;
  padding: 6px 12px;
  color: #7f1d1d;
  background: #fee2e2;
  box-shadow: inset 0 -3px 0 rgba(127, 29, 29, 0.1);
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin: 0;
  padding: 2px 0 12px;
  list-style: none;
}

.tag-list li {
  max-width: 100%;
  border: 1px solid rgba(36, 48, 68, 0.16);
  border-radius: 8px;
  padding: 5px 8px;
  color: #243044;
  background: #e0f2fe;
  box-shadow: inset 0 -2px 0 rgba(3, 105, 161, 0.12);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.skill-panel {
  border: 2px solid rgba(36, 48, 68, 0.16);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.66);
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

.dice-mark {
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

.card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding-top: 12px;
}

.select-btn,
.close-btn {
  min-height: 44px;
  border: 2px solid rgba(36, 48, 68, 0.18);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    background 120ms ease;
}

.select-btn {
  color: #ffffff;
  background: linear-gradient(180deg, #ef4444, #dc2626);
  box-shadow: inset 0 -3px 0 rgba(127, 29, 29, 0.34), 0 4px 0 rgba(127, 29, 29, 0.2);
}

.close-btn {
  min-width: 72px;
  color: #243044;
  background: #f1f5f9;
  box-shadow: inset 0 -3px 0 rgba(36, 48, 68, 0.12), 0 4px 0 rgba(36, 48, 68, 0.12);
}

.select-btn:not(:disabled):hover,
.close-btn:hover {
  transform: translateY(-1px);
}

.select-btn:not(:disabled):active,
.close-btn:active {
  transform: translateY(2px);
  box-shadow: inset 0 -1px 0 rgba(36, 48, 68, 0.16), 0 1px 0 rgba(36, 48, 68, 0.14);
}

.select-btn:disabled {
  color: #475569;
  background: #cbd5e1;
  box-shadow: inset 0 -3px 0 rgba(36, 48, 68, 0.12);
  cursor: not-allowed;
  opacity: 1;
}

@media (max-width: 374px) {
  .career-detail-card {
    padding: 10px;
  }

  .card-header {
    align-items: flex-start;
  }

  .status-pill,
  .recommended-badge {
    padding-inline: 8px;
    font-size: 11px;
  }

  .career-heading h2 {
    font-size: 22px;
  }

  .skill-panel li {
    font-size: 12px;
  }

  .card-actions {
    grid-template-columns: 1fr;
  }

  .close-btn {
    width: 100%;
  }
}
</style>
