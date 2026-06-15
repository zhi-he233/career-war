<script setup lang="ts">
const emit = defineEmits<{
  selectPvp: [];
}>();
</script>

<template>
  <section class="home-page">
    <div class="home-hero">
      <p class="eyebrow">H5 联机桌游 MVP</p>
      <h2>职业互怼 / 职业战争</h2>
      <p>选择玩法入口，后续 PVE、肉鸽、阵营大战都会从这里进入。</p>
    </div>

    <div class="mode-entry-list">
      <button class="mode-entry-card available" type="button" @click="emit('selectPvp')">
        <span class="mode-status ready">可进入</span>
        <strong>玩家对战</strong>
        <small>创建房间、加入房间、查看房间列表，进入 1V1 / 自由对战或 2V2 双角色。</small>
      </button>

      <article class="mode-entry-card disabled" aria-disabled="true">
        <span class="mode-status">开发中</span>
        <strong>PVE 冒险</strong>
        <small>人机对战、无限肉鸽准备中，需要玩家档案系统后开放。</small>
        <div class="sub-mode-list">
          <span>人机对战：开发中</span>
          <span>无限肉鸽：开发中</span>
        </div>
      </article>

      <article class="mode-entry-card disabled" aria-disabled="true">
        <span class="mode-status">占位</span>
        <strong>玩家档案</strong>
        <small>游客玩家</small>
        <div class="profile-placeholder">
          <span>等级：开发中</span>
          <span>金币：开发中</span>
          <span>战绩：开发中</span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 14px;
}

.home-hero,
.mode-entry-card {
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
}

.home-hero {
  padding: 18px 16px;
}

.home-hero h2 {
  margin: 4px 0 8px;
  color: #172033;
  font-size: 28px;
  line-height: 1.15;
}

.home-hero p:last-child {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.mode-entry-list {
  display: grid;
  gap: 10px;
}

.mode-entry-card {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 124px;
  padding: 16px;
  text-align: left;
}

button.mode-entry-card {
  cursor: pointer;
}

.mode-entry-card.available {
  border-color: #2563eb;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
}

.mode-entry-card.disabled {
  background: #f8fafc;
  color: #64748b;
}

.mode-entry-card strong {
  color: #172033;
  font-size: 22px;
  line-height: 1.2;
}

.mode-entry-card small,
.sub-mode-list,
.profile-placeholder {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
}

.mode-status {
  justify-self: start;
  border-radius: 999px;
  padding: 3px 8px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 900;
}

.mode-status.ready {
  background: #dbeafe;
  color: #1d4ed8;
}

.sub-mode-list,
.profile-placeholder {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-mode-list span,
.profile-placeholder span {
  border-radius: 999px;
  padding: 4px 8px;
  background: #eef2ff;
}

@media (max-width: 480px) {
  .home-hero h2 {
    font-size: 25px;
  }

  .mode-entry-card {
    min-height: 116px;
    padding: 14px;
  }
}
</style>
