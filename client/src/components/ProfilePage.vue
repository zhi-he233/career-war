<script setup lang="ts">
// ---------------------------------------------------------------------------
// ProfilePage.vue — 玩家档案页 UI 原型
// ---------------------------------------------------------------------------
// 数据来源：useProfile() composable
// 美术资源：getCharacterArt() from characters index
// 本轮只做 UI，不接路由、不接真实统计。
// ---------------------------------------------------------------------------

import { computed } from "vue";
import { useProfile } from "../composables/useProfile";
import { useAuth } from "../composables/useAuth";
import { getCharacterArt } from "../assets/art/characters/index";
import { characters } from "@career-war/shared";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const emit = defineEmits<{
  back: [];
  openAuth: [];
  logout: [];
}>();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const { profile, loading, error, refreshProfile, hasProfile } = useProfile();
const { isLoggedIn } = useAuth();

// ---------------------------------------------------------------------------
// Career display name — always from the canonical character table
// ---------------------------------------------------------------------------

function careerDisplayName(careerId: string): string {
  const c = characters[careerId as keyof typeof characters];
  return c?.name ?? "未知职业";
}

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

const avatarArt = computed(() => {
  const careerId = profile.value?.user.avatarCareerId;
  return careerId ? getCharacterArt(careerId) : undefined;
});

const expPercent = computed(() => {
  const p = profile.value?.progress;
  if (!p || p.expToNext <= 0) return 0;
  return Math.min(100, Math.round((p.exp / p.expToNext) * 100));
});

const winRateDisplay = computed(() => {
  const rate = profile.value?.pvp.winRate;
  if (rate === undefined || rate === null) return "—";
  return Math.round(rate * 100) + "%";
});

const streakLabel = computed(() => {
  const s = profile.value?.pvp.streak ?? 0;
  if (s > 0) return `${s} 连胜`;
  if (s < 0) return `${Math.abs(s)} 连败`;
  return "无连胜";
});

const streakClass = computed(() => {
  const s = profile.value?.pvp.streak ?? 0;
  if (s > 0) return "streak--win";
  if (s < 0) return "streak--loss";
  return "";
});

// ---------------------------------------------------------------------------
// Refresh handler
// ---------------------------------------------------------------------------

function handleRetry() {
  refreshProfile();
}
</script>

<template>
  <div class="profile-page" role="region" aria-label="玩家档案页">
    <!-- ================================================================ -->
    <!-- Back button                                                      -->
    <!-- ================================================================ -->
    <button class="profile-back-btn" type="button" aria-label="返回首页" @click="emit('back')">
      ← 返回
    </button>

    <!-- ================================================================ -->
    <!-- Loading                                                          -->
    <!-- ================================================================ -->
    <div v-if="loading" class="state-card state-card--loading" aria-busy="true">
      <span class="state-icon" aria-hidden="true">📋</span>
      <p class="state-text">正在读取玩家档案...</p>
    </div>

    <!-- ================================================================ -->
    <!-- Error                                                            -->
    <!-- ================================================================ -->
    <div v-else-if="error" class="state-card state-card--error" role="alert">
      <span class="state-icon" aria-hidden="true">⚠️</span>
      <p class="state-text">{{ error }}</p>
      <button class="retry-btn" type="button" @click="handleRetry">重新读取</button>
    </div>

    <!-- ================================================================ -->
    <!-- Guest locked — not logged in                                     -->
    <!-- ================================================================ -->
    <div v-else-if="!isLoggedIn" class="state-card state-card--guest">
      <span class="state-icon state-icon--guest" aria-hidden="true">🔒</span>
      <p class="state-text state-text--guest">登录后开启个人档案</p>
      <p class="state-hint">登录后可查看等级、战绩、肉鸽记录和成就墙</p>
      <button class="login-cta-btn" type="button" @click="emit('openAuth')">去登录</button>
    </div>

    <!-- ================================================================ -->
    <!-- Profile content                                                  -->
    <!-- ================================================================ -->
    <template v-else-if="profile">
      <!-- ============================================================= -->
      <!-- 一、顶部玩家档案大卡                                          -->
      <!-- ============================================================= -->
      <article class="profile-hero-card" aria-label="玩家档案">
        <header class="hero-header">
          <span class="hero-rank-pill">{{ profile.user.title }}</span>
          <button class="settings-btn-placeholder" type="button" disabled aria-label="设置（暂未开放）">
            ⚙
          </button>
        </header>

        <div class="hero-avatar-area">
          <div class="hero-avatar-ring">
            <img
              v-if="avatarArt?.avatar"
              class="hero-avatar-img"
              :src="avatarArt.avatar"
              :alt="`${profile.user.displayName} 头像`"
              draggable="false"
            />
            <span v-else class="hero-avatar-fallback" aria-hidden="true">
              {{ profile.user.displayName.slice(0, 1) }}
            </span>
          </div>

          <div class="hero-name-group">
            <h1 class="hero-display-name">{{ profile.user.displayName }}</h1>
            <p class="hero-title">{{ profile.user.title }}</p>
            <p class="hero-username">@{{ profile.user.username }}</p>
          </div>
        </div>
      </article>

      <!-- ============================================================= -->
      <!-- 二、等级与资源卡                                               -->
      <!-- ============================================================= -->
      <section class="profile-card" aria-label="等级与资源">
        <div class="card-heading">
          <span class="card-heading-icon" aria-hidden="true">⬆</span>
          <h2>等级 &amp; 资源</h2>
        </div>

        <div class="level-display">
          <span class="level-badge">Lv.{{ profile.progress.level }}</span>
          <span class="rank-chip">{{ profile.progress.rankTitle }}</span>
        </div>

        <div class="exp-bar-wrapper">
          <div class="exp-bar-track">
            <div
              class="exp-bar-fill"
              :style="{ width: expPercent + '%' }"
              role="progressbar"
              :aria-valuenow="profile.progress.exp"
              :aria-valuemin="0"
              :aria-valuemax="profile.progress.expToNext"
            ></div>
          </div>
          <span class="exp-label">
            {{ profile.progress.exp }} / {{ profile.progress.expToNext }} EXP
          </span>
        </div>

        <div class="resource-row">
          <div class="resource-chip">
            <span aria-hidden="true">🪙</span>
            <strong>{{ profile.progress.coins }}</strong>
            <span>金币</span>
          </div>
        </div>
      </section>

      <!-- ============================================================= -->
      <!-- 三、PVP 统计卡                                                  -->
      <!-- ============================================================= -->
      <section class="profile-card" aria-label="PVP 战绩">
        <div class="card-heading">
          <span class="card-heading-icon" aria-hidden="true">⚔</span>
          <h2>PVP 战绩</h2>
        </div>

        <div class="stat-grid stat-grid--4">
          <div class="stat-tile">
            <span class="stat-label">胜场</span>
            <strong class="stat-value">{{ profile.pvp.wins }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">总对局</span>
            <strong class="stat-value">{{ profile.pvp.totalGames }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">胜率</span>
            <strong class="stat-value stat-value--highlight">{{ winRateDisplay }}</strong>
          </div>
          <div class="stat-tile" :class="streakClass">
            <span class="stat-label">连胜</span>
            <strong class="stat-value">{{ streakLabel }}</strong>
          </div>
        </div>

        <div v-if="profile.pvp.recentResults.length" class="recent-results" aria-label="最近战绩">
          <span class="recent-label">最近战绩</span>
          <div class="recent-dots">
            <span
              v-for="(result, idx) in profile.pvp.recentResults"
              :key="idx"
              class="result-dot"
              :class="'result-dot--' + result"
              :aria-label="result === 'win' ? '胜' : '负'"
            >
              {{ result === "win" ? "W" : "L" }}
            </span>
          </div>
        </div>
      </section>

      <!-- ============================================================= -->
      <!-- 四、肉鸽统计卡                                                  -->
      <!-- ============================================================= -->
      <section class="profile-card" aria-label="肉鸽挑战">
        <div class="card-heading">
          <span class="card-heading-icon" aria-hidden="true">🗡</span>
          <h2>肉鸽挑战</h2>
        </div>

        <div class="stat-grid stat-grid--2">
          <div class="stat-tile">
            <span class="stat-label">最高关卡</span>
            <strong class="stat-value">第 {{ profile.roguelite.highestStage }} 关</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">击败 Boss</span>
            <strong class="stat-value">{{ profile.roguelite.bossesDefeated }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">最高单次伤害</span>
            <strong class="stat-value stat-value--danger">{{ profile.roguelite.maxSingleDamage }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">最高承伤</span>
            <strong class="stat-value">{{ profile.roguelite.maxDamageTaken }}</strong>
          </div>
          <div class="stat-tile stat-tile--full">
            <span class="stat-label">最高回血</span>
            <strong class="stat-value stat-value--heal">{{ profile.roguelite.maxHealing }}</strong>
          </div>
        </div>
      </section>

      <!-- ============================================================= -->
      <!-- 五、职业偏好区域                                                -->
      <!-- ============================================================= -->
      <section class="profile-card" aria-label="职业偏好">
        <div class="card-heading">
          <span class="card-heading-icon" aria-hidden="true">🎭</span>
          <h2>职业偏好</h2>
        </div>

        <div class="career-preferences">
          <div class="pref-row">
            <span class="pref-label">最常用</span>
            <span class="pref-career-chip pref-career-chip--fav">
              {{ careerDisplayName(profile.careers.favoriteCareer) }}
            </span>
          </div>
          <div class="pref-row">
            <span class="pref-label">最高胜率</span>
            <span class="pref-career-chip pref-career-chip--best">
              {{ careerDisplayName(profile.careers.bestWinRateCareer) }}
            </span>
          </div>
        </div>

        <div v-if="profile.careers.recentCareers.length" class="recent-careers">
          <span class="recent-label">最近使用</span>
          <div class="recent-career-list">
            <span
              v-for="(careerId, idx) in profile.careers.recentCareers"
              :key="`${careerId}-${idx}`"
              class="recent-career-chip"
            >
              {{ careerDisplayName(careerId) }}
            </span>
          </div>
        </div>
      </section>

      <!-- ============================================================= -->
      <!-- 六、成就墙                                                      -->
      <!-- ============================================================= -->
      <section class="profile-card" aria-label="成就墙">
        <div class="card-heading">
          <span class="card-heading-icon" aria-hidden="true">🏆</span>
          <h2>成就</h2>
        </div>

        <div class="achievement-grid" role="list">
          <div
            v-for="achievement in profile.achievements"
            :key="achievement.id"
            class="achievement-badge"
            :class="{ 'achievement-badge--locked': !achievement.unlocked }"
            role="listitem"
            :aria-label="`${achievement.name}：${achievement.unlocked ? '已解锁' : '未解锁'}`"
          >
            <span class="achievement-icon" aria-hidden="true">{{ achievement.icon }}</span>
            <strong class="achievement-name">{{ achievement.name }}</strong>
            <p class="achievement-desc">{{ achievement.description }}</p>
            <div v-if="achievement.maxProgress" class="achievement-progress">
              <div class="mini-progress-track">
                <div
                  class="mini-progress-fill"
                  :class="{ 'mini-progress-fill--done': achievement.unlocked }"
                  :style="{
                    width:
                      achievement.unlocked
                        ? '100%'
                        : Math.round(
                            ((achievement.progress ?? 0) / achievement.maxProgress) * 100
                          ) + '%',
                  }"
                ></div>
              </div>
              <span class="mini-progress-label">
                {{ achievement.unlocked ? "✓" : `${achievement.progress ?? 0}/${achievement.maxProgress}` }}
              </span>
            </div>
            <span v-else class="achievement-no-progress">
              {{ achievement.unlocked ? "已获得" : "未获得" }}
            </span>
          </div>
        </div>
      </section>

      <section class="profile-account-actions" aria-label="账号操作">
        <button class="profile-logout-btn" type="button" @click="emit('logout')">退出登录</button>
      </section>
    </template>

    <!-- ================================================================ -->
    <!-- Empty / fallback                                                 -->
    <!-- ================================================================ -->
    <div v-else class="state-card">
      <span class="state-icon" aria-hidden="true">🎲</span>
      <p class="state-text">暂无档案数据</p>
      <p class="state-hint">请先登录或创建角色</p>
    </div>
  </div>
</template>

<style scoped>
/* =====================================================================
   ProfilePage — 玩家档案页 UI 原型
   风格：像素游戏感 + 卡牌桌游感 + 明亮轻松 + 手机端优先
   ===================================================================== */

/* ---- root scroll container ---- */
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(100%, 430px);
  max-width: 430px;
  margin: 0 auto;
  padding: 12px 8px max(40px, env(safe-area-inset-bottom));
  /* scroll-friendly: parent should allow overflow-y: auto on this */
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* ---- back button ---- */
.profile-back-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  border: var(--cw-border-thin, 2px solid #111111);
  border-radius: 10px;
  padding: 6px 12px;
  background: #ffffff;
  color: #111111;
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.2);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.profile-back-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 rgba(17, 17, 17, 0.2);
}

/* =====================================================================
   Shared card shell
   ===================================================================== */

.profile-card,
.profile-hero-card,
.state-card {
  position: relative;
  border: var(--cw-border-thin, 2px solid #111111);
  border-radius: var(--cw-radius-lg, 14px);
  padding: 12px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 248, 235, 0.8)),
    repeating-linear-gradient(0deg, rgba(17, 17, 17, 0.03) 0 2px, transparent 2px 8px),
    #fffdf5;
  box-shadow: 0 4px 0 rgba(17, 17, 17, 0.16), 0 12px 20px rgba(15, 23, 42, 0.1);
  color: #111111;
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
}

/* inner dashed border */
.profile-card::before,
.profile-hero-card::before,
.state-card::before {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px dashed rgba(17, 17, 17, 0.14);
  border-radius: 10px;
  pointer-events: none;
}

.profile-card > *,
.profile-hero-card > *,
.state-card > * {
  position: relative;
  z-index: 1;
}

/* =====================================================================
   State cards (loading / error / empty)
   ===================================================================== */

.state-card {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 220px;
  text-align: center;
}

.state-card--loading {
  border-color: rgba(17, 17, 17, 0.35);
}

.state-card--error {
  border-color: #dc2626;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(254, 226, 226, 0.65)),
    #fef2f2;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: var(--cw-border-thin, 2px solid #111111);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.18);
  font-size: 26px;
}

.state-text {
  margin: 0;
  color: #111111;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
}

.state-hint {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.retry-btn {
  min-height: 40px;
  min-width: 120px;
  border: var(--cw-border-thin, 2px solid #111111);
  border-radius: 10px;
  padding: 9px 16px;
  background: #ffffff;
  color: #111111;
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 4px 0 rgba(17, 17, 17, 0.24);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.retry-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(17, 17, 17, 0.24);
}

/* ---- guest locked state ---- */
.state-card--guest {
  border-color: rgba(17, 17, 17, 0.12);
  background:
    linear-gradient(135deg, rgba(248, 250, 252, 0.78), rgba(241, 245, 249, 0.62)),
    #f8fafc;
  box-shadow: 0 2px 0 rgba(17, 17, 17, 0.08), 0 8px 16px rgba(15, 23, 42, 0.06);
}

.state-icon--guest {
  border-color: rgba(17, 17, 17, 0.08);
  background: #f1f5f9;
  box-shadow: none;
  font-size: 28px;
}

.state-text--guest {
  color: #475569;
}

.login-cta-btn {
  min-height: 42px;
  min-width: 140px;
  border: var(--cw-border-thin, 2px solid #111111);
  border-radius: 10px;
  padding: 10px 20px;
  background: #111111;
  color: #ffffff;
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 4px 0 rgba(17, 17, 17, 0.28);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.login-cta-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(17, 17, 17, 0.28);
}

.profile-account-actions {
  display: flex;
  justify-content: center;
  padding: 2px 0 4px;
}

.profile-logout-btn {
  min-height: 36px;
  border: 1px solid rgba(17, 17, 17, 0.28);
  border-radius: 10px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.72);
  color: #475569;
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.profile-logout-btn:active {
  transform: translateY(1px);
}

/* =====================================================================
   一、Hero card — top profile identity
   ===================================================================== */

.profile-hero-card {
  display: grid;
  gap: 12px;
  padding-top: 10px;
  padding-bottom: 14px;
}

.hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-rank-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 1px solid rgba(17, 17, 17, 0.18);
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.78);
  color: #334155;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.settings-btn-placeholder {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.64);
  color: #94a3b8;
  font-size: 18px;
  font-family: var(--font-pixel, "Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif);
  cursor: not-allowed;
}

.hero-avatar-area {
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
}

.hero-avatar-ring {
  display: grid;
  place-items: center;
  width: clamp(90px, 27vw, 108px);
  height: clamp(90px, 27vw, 108px);
  border: 3px solid #111111;
  border-radius: 999px;
  padding: 5px;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.96), rgba(255, 246, 200, 0.76) 44%, rgba(245, 158, 11, 0.2) 100%),
    #fff8df;
  box-shadow: inset 0 -5px 0 rgba(17, 17, 17, 0.1), 0 6px 16px rgba(15, 23, 42, 0.14);
}

.hero-avatar-img {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(17, 17, 17, 0.14);
  border-radius: 999px;
  object-fit: cover;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.hero-avatar-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: #ffffff;
  color: #111111;
  font-size: 38px;
  font-weight: 900;
}

.hero-name-group {
  display: grid;
  gap: 3px;
  max-width: 100%;
}

.hero-display-name {
  margin: 0;
  color: #111111;
  font-size: clamp(22px, 7vw, 28px);
  font-weight: 1000;
  line-height: 1.1;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.hero-title {
  margin: 0;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
}

.hero-username {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
}

/* =====================================================================
   Card heading
   ===================================================================== */

.card-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  padding-bottom: 7px;
  border-bottom: 2px solid rgba(17, 17, 17, 0.12);
}

.card-heading-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(17, 17, 17, 0.18);
  border-radius: 7px;
  background: #ffffff;
  box-shadow: inset 0 -2px 0 rgba(17, 17, 17, 0.1);
  font-size: 14px;
}

.card-heading h2 {
  margin: 0;
  color: #111111;
  font-size: 16px;
  font-weight: 1000;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

/* =====================================================================
   二、Level & resources
   ===================================================================== */

.level-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border: 2px solid rgba(17, 17, 17, 0.18);
  border-radius: 999px;
  padding: 4px 12px;
  background: #ffffff;
  font-size: 16px;
  font-weight: 1000;
  line-height: 1;
  box-shadow: inset 0 -3px 0 rgba(17, 17, 17, 0.08);
}

.rank-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 999px;
  padding: 4px 10px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  box-shadow: inset 0 -2px 0 rgba(180, 83, 9, 0.12);
}

/* ---- EXP bar ---- */
.exp-bar-wrapper {
  display: grid;
  gap: 5px;
  margin-bottom: 10px;
}

.exp-bar-track {
  width: 100%;
  height: 14px;
  border: 2px solid rgba(17, 17, 17, 0.2);
  border-radius: 999px;
  background: #f1f5f9;
  box-shadow: inset 0 2px 4px rgba(17, 17, 17, 0.08);
  overflow: hidden;
}

.exp-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: width 300ms ease;
}

.exp-label {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-align: right;
}

/* ---- Coins ---- */
.resource-row {
  display: flex;
  gap: 8px;
}

.resource-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border: 2px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
  padding: 6px 12px;
  background: #fffdf5;
  box-shadow: inset 0 -3px 0 rgba(245, 158, 11, 0.1);
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.resource-chip strong {
  color: #b45309;
  font-size: 15px;
  font-weight: 1000;
}

/* =====================================================================
   Stat grid (shared across PVP / Roguelite cards)
   ===================================================================== */

.stat-grid {
  display: grid;
  gap: 7px;
}

.stat-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-grid--4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-tile {
  display: grid;
  gap: 5px;
  min-height: 64px;
  border: 2px solid rgba(17, 17, 17, 0.1);
  border-radius: 10px;
  padding: 9px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: inset 0 -3px 0 rgba(17, 17, 17, 0.05);
}

.stat-tile--full {
  grid-column: 1 / -1;
}

.stat-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.stat-value {
  color: #111111;
  font-size: 20px;
  font-weight: 1000;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.stat-value--highlight {
  color: #2563eb;
}

.stat-value--danger {
  color: #dc2626;
}

.stat-value--heal {
  color: #16a34a;
}

/* streak coloring */
.streak--win .stat-value {
  color: #16a34a;
}

.streak--loss .stat-value {
  color: #dc2626;
}

/* =====================================================================
   Recent results dots
   ===================================================================== */

.recent-results {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(17, 17, 17, 0.08);
}

.recent-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.recent-dots {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.result-dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid rgba(17, 17, 17, 0.18);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 1000;
  line-height: 1;
}

.result-dot--win {
  background: #dcfce7;
  color: #14532d;
  border-color: rgba(22, 163, 74, 0.28);
  box-shadow: inset 0 -2px 0 rgba(22, 101, 52, 0.12);
}

.result-dot--loss {
  background: #fee2e2;
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.22);
  box-shadow: inset 0 -2px 0 rgba(127, 29, 29, 0.1);
}

/* =====================================================================
   五、Career preferences
   ===================================================================== */

.career-preferences {
  display: grid;
  gap: 7px;
  margin-bottom: 10px;
}

.pref-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pref-label {
  min-width: 56px;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.pref-career-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  border: 1px solid rgba(17, 17, 17, 0.14);
  background: rgba(255, 255, 255, 0.7);
}

.pref-career-chip--fav {
  border-color: rgba(37, 99, 235, 0.22);
  background: #dbeafe;
  color: #1e40af;
}

.pref-career-chip--best {
  border-color: rgba(245, 158, 11, 0.28);
  background: #fef3c7;
  color: #92400e;
}

.recent-careers {
  padding-top: 8px;
  border-top: 1px solid rgba(17, 17, 17, 0.08);
}

.recent-career-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.recent-career-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 8px;
  padding: 4px 9px;
  background: rgba(255, 255, 255, 0.64);
  color: #334155;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

/* =====================================================================
   六、Achievement wall
   ===================================================================== */

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.achievement-badge {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-height: 110px;
  border: 2px solid rgba(17, 17, 17, 0.16);
  border-radius: 12px;
  padding: 9px 7px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 251, 235, 0.78)),
    #fffdf5;
  box-shadow: 0 3px 0 rgba(17, 17, 17, 0.1);
  text-align: center;
}

.achievement-badge--locked {
  border-color: rgba(17, 17, 17, 0.08);
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.65), rgba(241, 245, 249, 0.5)),
    #f1f5f9;
  filter: grayscale(0.55);
  opacity: 0.72;
}

.achievement-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid rgba(17, 17, 17, 0.18);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: inset 0 -3px 0 rgba(17, 17, 17, 0.08);
  font-size: 18px;
}

.achievement-badge--locked .achievement-icon {
  border-color: rgba(17, 17, 17, 0.06);
  background: #f8fafc;
  box-shadow: none;
}

.achievement-name {
  min-width: 0;
  color: #111111;
  font-size: 12px;
  font-weight: 1000;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.achievement-badge--locked .achievement-name {
  color: #64748b;
}

.achievement-desc {
  margin: 0;
  min-width: 0;
  color: #475569;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.achievement-badge--locked .achievement-desc {
  color: #94a3b8;
}

/* mini progress bar inside achievement */
.achievement-progress {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  margin-top: 2px;
}

.mini-progress-track {
  flex: 1 1 0;
  height: 5px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #94a3b8;
}

.mini-progress-fill--done {
  background: #22c55e;
}

.mini-progress-label {
  flex: 0 0 auto;
  color: #94a3b8;
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
}

.achievement-no-progress {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
}

.achievement-badge:not(.achievement-badge--locked) .achievement-no-progress {
  color: #16a34a;
}

/* =====================================================================
   Responsive: 360px / 374px
   ===================================================================== */

@media (max-width: 374px) {
  .profile-page {
    gap: 10px;
    padding: 10px 6px max(36px, env(safe-area-inset-bottom));
  }

  .profile-card,
  .profile-hero-card {
    padding: 10px;
  }

  .hero-avatar-ring {
    width: clamp(76px, 23vw, 90px);
    height: clamp(76px, 23vw, 90px);
  }

  .hero-display-name {
    font-size: 20px;
  }

  .stat-grid--4 {
    grid-template-columns: 1fr 1fr;
  }

  .stat-tile {
    min-height: 56px;
    padding: 7px;
  }

  .stat-value {
    font-size: 17px;
  }

  .achievement-grid {
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }

  .achievement-badge {
    min-height: 98px;
    padding: 7px 5px;
  }

  .achievement-icon {
    width: 30px;
    height: 30px;
    font-size: 15px;
  }
}

/* =====================================================================
   Responsive: 390px (default style works fine)
   ===================================================================== */

/* =====================================================================
   Responsive: 430px — slightly more breathing room
   ===================================================================== */

@media (min-width: 430px) {
  .profile-page {
    gap: 14px;
    padding: 14px 10px max(44px, env(safe-area-inset-bottom));
  }

  .stat-value {
    font-size: 22px;
  }

  .achievement-grid {
    gap: 8px;
  }
}
</style>
