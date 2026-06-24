import { computed, type ComputedRef } from "vue";
import {
  ROGUELITE_BOSS_ABILITY_REWARDS,
  ROGUELITE_BOSSES,
  ROGUELITE_CHARACTER_SKILL_REWARDS,
  ROGUELITE_ENEMIES,
  ROGUELITE_GROWTH_REWARDS,
  ROGUELITE_STAGE_SCALING,
  ROGUELITE_STARTER_REWARDS,
} from "@career-war/shared";
import type { Player, Room } from "@career-war/shared";
import type { RoguelitePanelVM, RogueliteRewardOptionVM, RogueliteBossStateChip } from "../types";

/** All roguelite-related ViewModels extracted from BattlePage.vue to keep the page component manageable. */

export function useRogueliteViewModels(
  room: ComputedRef<Room>,
  me: ComputedRef<Player | undefined>,
  playerId: string,
) {
  // ── mode / phase shortcuts ──
  const isRogueliteMode = computed(() => room.value.gameMode === "pve_roguelite");
  const rogueliteState = computed(() => room.value.roguelite);
  const rogueliteRewardChoices = computed(() => rogueliteState.value?.rewardChoices ?? []);
  const rogueliteAppliedRewards = computed(() => rogueliteState.value?.appliedRewards ?? []);
  const currentRogueliteRound = computed(() => Math.floor(((rogueliteState.value?.stage ?? 1) - 1) / 3) + 1);
  const isBossRewardPhase = computed(() => room.value.phase === "reward" && rogueliteRewardChoices.value.length > 0 && rogueliteRewardChoices.value.every((reward) => isBossRewardType(reward.type)));
  const isRogueliteContinuePhase = computed(() => isRogueliteMode.value && room.value.phase === "roguelite_continue");

  // ── perk display infrastructure ──
  type RogueliteDisplayDraft = { type: string; name: string; description: string };
  type PerkDisplay = { name: string; category: "growth" | "boss"; perLevelDesc: string };
  type SkillDisplay = { name: string; perLevelDesc: string };

  const ROGUELITE_GROWTH_DISPLAY_DRAFTS: readonly RogueliteDisplayDraft[] = [
    ...ROGUELITE_GROWTH_REWARDS,
    ...ROGUELITE_STARTER_REWARDS,
  ];
  const ROGUELITE_BOSS_DISPLAY_DRAFTS: readonly RogueliteDisplayDraft[] = ROGUELITE_BOSS_ABILITY_REWARDS;
  const ROGUELITE_SKILL_DISPLAY_DRAFTS: readonly RogueliteDisplayDraft[] = ROGUELITE_CHARACTER_SKILL_REWARDS;
  const ROGUELITE_GROWTH_REWARD_TYPES = new Set<string>(ROGUELITE_GROWTH_DISPLAY_DRAFTS.map((reward) => reward.type));
  const ROGUELITE_BOSS_REWARD_TYPES = new Set<string>(ROGUELITE_BOSS_DISPLAY_DRAFTS.map((reward) => reward.type));
  const ROGUELITE_SKILL_REWARD_TYPES = new Set<string>(ROGUELITE_SKILL_DISPLAY_DRAFTS.map((reward) => reward.type));

  function createPerkDisplay(): Record<string, PerkDisplay> {
    const result: Record<string, PerkDisplay> = {};
    for (const reward of ROGUELITE_GROWTH_DISPLAY_DRAFTS) {
      result[reward.type] = { name: reward.name, category: "growth", perLevelDesc: reward.description };
    }
    for (const reward of ROGUELITE_BOSS_DISPLAY_DRAFTS) {
      result[reward.type] = { name: reward.name, category: "boss", perLevelDesc: reward.description };
    }
    const heavyPunch = result.heavy_punch_training;
    if (heavyPunch) result.heavy_punch = heavyPunch;
    return result;
  }

  function createSkillDisplay(): Record<string, SkillDisplay> {
    const result: Record<string, SkillDisplay> = {};
    for (const reward of ROGUELITE_SKILL_DISPLAY_DRAFTS) {
      result[reward.type] = { name: reward.name, perLevelDesc: reward.description };
    }
    return result;
  }

  const PERK_DISPLAY = createPerkDisplay();
  const SKILL_DISPLAY = createSkillDisplay();

  // ── computed perk/skill lists ──
  const rogueliteGrowthPerks = computed(() => {
    const stacks = me.value?.roguelitePerkStacks ?? {};
    return Object.entries(stacks)
      .filter(([perkId]) => PERK_DISPLAY[perkId]?.category === "growth")
      .map(([perkId, level]) => ({ perkId, level, def: PERK_DISPLAY[perkId]! }))
      .filter((p) => p.def)
      .sort((a, b) => a.def.name.localeCompare(b.def.name));
  });

  const rogueliteBossPerks = computed(() => {
    const stacks = me.value?.roguelitePerkStacks ?? {};
    return Object.entries(stacks)
      .filter(([perkId]) => PERK_DISPLAY[perkId]?.category === "boss")
      .map(([perkId, level]) => ({ perkId, level, def: PERK_DISPLAY[perkId]! }))
      .filter((p) => p.def)
      .sort((a, b) => a.def.name.localeCompare(b.def.name));
  });

  const rogueliteCharacterSkills = computed(() => {
    const stacks = me.value?.rogueliteSkillStacks ?? {};
    return Object.entries(stacks)
      .filter(([skillId]) => SKILL_DISPLAY[skillId])
      .map(([skillId, level]) => ({ skillId, level, def: SKILL_DISPLAY[skillId]! }))
      .sort((a, b) => a.def.name.localeCompare(b.def.name));
  });

  const hasAnyRoguelitePerks = computed(() => rogueliteGrowthPerks.value.length > 0 || rogueliteCharacterSkills.value.length > 0 || rogueliteBossPerks.value.length > 0);

  // ── enemy / boss helpers ──
  function rogueliteEnemyMechanicSkills(id: string): string[] {
    const boss = ROGUELITE_BOSSES.find((item) => item.id === id);
    if (boss) return [...boss.skills];
    const enemy = ROGUELITE_ENEMIES.find((item) => item.id === id);
    if (!enemy || enemy.id === "normal") return [];
    return [...enemy.skills];
  }

  function rogueliteEnemyTypeLabel(player: Player | undefined): string {
    const stageType = player?.rogueliteEnemyInfo?.stageType;
    if (stageType === "boss") return "Boss";
    if (stageType === "elite") return "精英";
    if (stageType === "normal") return "小怪";
    return "敌人";
  }

  const rogueliteEnemyInfo = computed(() => {
    if (!isRogueliteMode.value || room.value.phase !== "battle") return undefined;
    return room.value.players.find((p) => p.isBot)?.rogueliteEnemyInfo;
  });

  const currentBossPlayer = computed(() => {
    if (!isRogueliteMode.value || room.value.phase !== "battle") return undefined;
    return room.value.players.find((p) => p.isBot && p.rogueliteEnemyInfo?.stageType === "boss");
  });

  const currentBossSkills = computed(() => {
    if (!currentBossPlayer.value) return [];
    if (currentBossPlayer.value.rogueliteEnemyInfo?.skillNames?.length) return currentBossPlayer.value.rogueliteEnemyInfo.skillNames;
    if (!currentBossPlayer.value.rogueliteBossId) return [];
    return rogueliteEnemyMechanicSkills(currentBossPlayer.value.rogueliteBossId);
  });

  const rogueliteStageType = computed(() => {
    const liveStageType = rogueliteEnemyInfo.value?.stageType;
    if (liveStageType) return liveStageType;
    const stage = rogueliteState.value?.stage ?? 1;
    if (stage % ROGUELITE_STAGE_SCALING.bossInterval === 0) return "boss";
    if (stage % ROGUELITE_STAGE_SCALING.bossInterval === 2 && stage >= 5) return "elite";
    return "normal";
  });

  const rogueliteStageTypeLabel = computed(() => {
    if (rogueliteStageType.value === "boss") return "Boss 战";
    if (rogueliteStageType.value === "elite") return "精英关";
    return "普通关";
  });

  // ── reward type helpers ──
  function isBossRewardType(type: string): boolean { return ROGUELITE_BOSS_REWARD_TYPES.has(type); }
  function isGrowthRewardType(type: string): boolean { return ROGUELITE_GROWTH_REWARD_TYPES.has(type); }
  function isRogueliteSkillRewardType(type: string): boolean { return ROGUELITE_SKILL_REWARD_TYPES.has(type); }

  function rogueliteRewardRarity(type: string): RogueliteRewardOptionVM["rarity"] {
    if (isBossRewardType(type)) return "legendary";
    if (isRogueliteSkillRewardType(type)) return "epic";
    if (type.startsWith("starter_")) return "rare";
    return "common";
  }

  function rogueliteRewardTags(type: string): string[] {
    if (isBossRewardType(type)) return ["Boss", "Endgame"];
    if (isRogueliteSkillRewardType(type)) return ["Skill", "Build"];
    if (type.startsWith("starter_")) return ["Starter", "Core"];
    if (isGrowthRewardType(type)) return ["Growth", "Boost"];
    return ["Loot"];
  }

  function rogueliteRewardIcon(type: string): string {
    if (isBossRewardType(type)) return "👑";
    if (isRogueliteSkillRewardType(type)) return "✦";
    if (type.startsWith("starter_")) return "◆";
    if (isGrowthRewardType(type)) return "▲";
    return "★";
  }

  // ── roguelite alert text (battle log event → overlay popup) ──
  function getRogueliteAlertText(msg: string): string | null {
    if (msg.includes("战后恢复至满血")) return "🎉 战后恢复！满血！";
    if (msg.includes("战后恢复")) return "💚 战后恢复！";
    if (msg.includes("Boss 出现")) return "⚠  Boss 出现！";
    if (msg.includes("蓄力重拳")) return "💥 蓄力重拳！";
    if (msg.includes("进入狂暴")) return "🔥 狂暴！";
    if (msg.includes("凝聚血盾")) return "🛡 血盾！";
    if (msg.includes("发动血祭")) return "🩸 血祭！";
    if (msg.includes("吸取生命")) return "🩸 吸血！";
    if (msg.includes("架起巨盾")) return "🛡 架盾！";
    if (msg.includes("盾击反击")) return "⚔ 盾击反击！";
    if (msg.includes("狂怒之血")) return "😡 狂怒之血！";
    if (msg.includes("龙胆之力")) return "🐉 龙胆之力！";
    if (msg.includes("枪手") && msg.includes("三倍")) return "💥 三倍射击！";
    if (msg.includes("血祭回复")) return "🩸 血祭回复！";
    if (msg.includes("自爆")) return "💣 自爆！";
    if (msg.includes("处决")) return "⚔ 处决！";
    if (msg.includes("碾压")) return "🪨 巨岩碾压！";
    if (msg.includes("开始蓄力")) return "⚡ 蓄力！";
    if (msg.includes("生命阈值")) return "🛡 生命阈值！";
    if (msg.includes("濒死不倒")) return "💀 濒死一击！";
    if (msg.includes("燃尽最后生命")) return "⚰ 神狂战倒下！";
    if (msg.includes("狂战增伤")) return "💢 狂战增伤！";
    return null;
  }

  // ── sub-VM builders ──
  function buildRogueliteBossVM(): RoguelitePanelVM["boss"] {
    if (!currentBossPlayer.value) return undefined;
    const chips: RogueliteBossStateChip[] = [];
    const state = currentBossPlayer.value.rogueliteBossState;
    if (state) {
      if ((state.charge as number) > 0) chips.push({ text: `蓄力层数：${state.charge}`, kind: "normal" });
      if (state.enraged) chips.push({ text: "狂暴中", kind: "enraged" });
      if (state.guarding) chips.push({ text: "架盾中", kind: "guarding" });
      if (state.bloodSacrificeUsed) chips.push({ text: "血祭已触发", kind: "normal" });
      if (currentBossPlayer.value.rogueliteBossId === "boss_god_berserker") {
        chips.push({ text: state.t15 ? "阈值 15" : "阈值 15 已破", kind: state.t15 ? "normal" : "broken" });
        chips.push({ text: state.t10 ? "阈值 10" : "阈值 10 已破", kind: state.t10 ? "normal" : "broken" });
        chips.push({ text: state.t5 ? "阈值 5" : "阈值 5 已破", kind: state.t5 ? "normal" : "broken" });
        chips.push({ text: state.t1 ? "阈值 1" : "阈值 1 已破", kind: state.t1 ? "normal" : "broken" });
        if (state.dyingAfterAttack) chips.push({ text: "濒死一击中", kind: "enraged" });
      }
    }
    return {
      name: currentBossPlayer.value.nickname,
      typeLabel: rogueliteEnemyTypeLabel(currentBossPlayer.value),
      hp: currentBossPlayer.value.hp,
      maxHp: currentBossPlayer.value.maxHp,
      shield: currentBossPlayer.value.shield,
      skills: currentBossSkills.value,
      stateChips: chips,
    };
  }

  function buildRogueliteEnemyVM(): RoguelitePanelVM["enemy"] {
    const info = rogueliteEnemyInfo.value;
    if (!info || currentBossPlayer.value || room.value.phase !== "battle") return undefined;
    const bot = room.value.players.find((p) => p.isBot);
    return {
      name: bot?.nickname ?? "敌人",
      typeLabel: rogueliteEnemyTypeLabel(bot),
      hpBonus: info.hpBonus,
      shieldBonus: info.shieldBonus ?? 0,
      damageBonus: info.damageBonus ?? 0,
      description: info.description,
      skills: info.skillNames ?? [],
    };
  }

  function buildRogueliteResourcesVM(): RoguelitePanelVM["resources"] {
    const m = me.value;
    if (!m || room.value.phase !== "battle") return undefined;
    const res: NonNullable<RoguelitePanelVM["resources"]> = {};
    const hasFateTokens = m.roguelitePerkStacks?.["fate_tokens"];
    if (hasFateTokens) res.fateTokens = { current: m.rogueliteFateTokens ?? 0, max: 3 };
    if (m.roguelitePerkStacks?.["low_roll_charge"]) res.lowRollCharge = m.rogueliteLowRollCharge ?? 0;
    if (m.roguelitePerkStacks?.["lucky_floor"]) res.consecutiveLowRolls = { current: m.rogueliteConsecutiveLowRolls ?? 0, max: 2 };
    if (m.roguelitePerkStacks?.["shield_overload"]) res.shieldOverloadUsed = m.rogueliteShieldOverloadUsed ?? false;
    return Object.keys(res).length > 0 ? res : undefined;
  }

  function buildRogueliteEnemyTraitsVM(): string[] | undefined {
    if (room.value.phase !== "battle") return undefined;
    const bot = room.value.players.find((p) => p.isBot);
    if (!bot) return undefined;
    const stateSkills = bot.rogueliteEnemyInfo?.skillNames?.filter(Boolean) ?? [];
    if (stateSkills.length > 0) return stateSkills;
    if (!bot.rogueliteBossId) return undefined;
    const balanceSkills = rogueliteEnemyMechanicSkills(bot.rogueliteBossId);
    return balanceSkills.length > 0 ? balanceSkills : undefined;
  }

  function buildRoguelitePerksVM(): RoguelitePanelVM["perks"] {
    return {
      growth: rogueliteGrowthPerks.value.map((p) => ({
        id: p.perkId, name: p.def.name, level: p.level, description: p.def.perLevelDesc, category: "growth" as const,
      })),
      skills: rogueliteCharacterSkills.value.map((s) => ({
        id: s.skillId, name: s.def.name, level: s.level, description: s.def.perLevelDesc, category: "skill" as const,
      })),
      boss: rogueliteBossPerks.value.map((p) => ({
        id: p.perkId, name: p.def.name, level: p.level, description: p.def.perLevelDesc, category: "boss" as const,
      })),
    };
  }

  function buildRogueliteRewardPhaseVM(): NonNullable<RoguelitePanelVM["rewardPhase"]> {
    const summary = rogueliteState.value?.lastStageSummary;
    return {
      isBoss: isBossRewardPhase.value,
      title: isBossRewardPhase.value ? "选择 Boss 能力" : "选择奖励",
      hint: isBossRewardPhase.value ? "选择 1 个 Boss 能力，完成挑战" : "选择 1 个奖励后进入下一关",
      summary: summary ? {
        defeatedName: summary.defeatedEnemyName,
        postBattleHeal: summary.postBattleHeal ?? 0,
        hpAfterHeal: summary.hpAfterHeal,
        maxHp: summary.maxHp,
        isBoss: summary.isBoss ?? false,
      } : undefined,
      options: rogueliteRewardChoices.value.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isBoss: isBossRewardType(r.type),
        rarity: rogueliteRewardRarity(r.type),
        tags: rogueliteRewardTags(r.type),
        icon: rogueliteRewardIcon(r.type),
      })),
    };
  }

  function buildRogueliteContinuePhaseVM(): NonNullable<RoguelitePanelVM["continuePhase"]> {
    return {
      hint: `你已击败第 ${rogueliteState.value?.stage ?? 1} 关 Boss！选择结束挑战或继续前进。`,
      nextStage: rogueliteState.value?.stage ?? 1,
    };
  }

  // ── main roguelite panel VM ──
  const roguelitePanelVM = computed<RoguelitePanelVM>(() => ({
    enabled: isRogueliteMode.value,
    stage: rogueliteState.value?.stage ?? 1,
    round: currentRogueliteRound.value,
    stageType: rogueliteStageType.value,
    stageTypeLabel: rogueliteStageTypeLabel.value,
    phaseText: roguelitePhaseText(),
    fatigue: room.value.phase === "battle" ? {
      battleRound: rogueliteState.value?.battleRound ?? 1,
      bonus: rogueliteState.value?.fatigueBonus ?? 0,
    } : undefined,
    boss: buildRogueliteBossVM(),
    enemy: buildRogueliteEnemyVM(),
    perks: buildRoguelitePerksVM(),
    resources: buildRogueliteResourcesVM(),
    enemyTraits: buildRogueliteEnemyTraitsVM(),
    rewardPhase: room.value.phase === "reward" ? buildRogueliteRewardPhaseVM() : undefined,
    continuePhase: isRogueliteContinuePhase.value ? buildRogueliteContinuePhaseVM() : undefined,
  }));

  function roguelitePhaseText(): string {
    if (room.value.phase === "reward") return isBossRewardPhase.value ? "选择Boss能力" : "选择奖励";
    if (room.value.phase === "roguelite_continue") return "选择结束或继续";
    if (room.value.phase === "gameOver") {
      const winner = room.value.players.find((p) => p.id === room.value.winnerId);
      if (room.value.gameMode === "duo_2v2" && room.value.winnerTeamId)
        return `${room.value.winnerTeamId} 队获胜`;
      return winner?.id === playerId ? "挑战成功" : "挑战失败";
    }
    return "挑战中";
  }

  const showRogueliteRewardCenterPrompt = computed(() => Boolean(roguelitePanelVM.value.enabled && roguelitePanelVM.value.rewardPhase));
  const showRogueliteCompactStatus = computed(() => Boolean(roguelitePanelVM.value.enabled && !roguelitePanelVM.value.rewardPhase));

  return {
    // Main VM
    roguelitePanelVM,
    // Mode checks
    isRogueliteMode,
    isBossRewardPhase,
    isRogueliteContinuePhase,
    // State
    rogueliteState,
    rogueliteRewardChoices,
    rogueliteAppliedRewards,
    currentRogueliteRound,
    // Stage
    rogueliteStageType,
    rogueliteStageTypeLabel,
    rogueliteEnemyInfo,
    currentBossPlayer,
    currentBossSkills,
    // Perks
    hasAnyRoguelitePerks,
    rogueliteGrowthPerks,
    rogueliteBossPerks,
    rogueliteCharacterSkills,
    // Display helpers
    showRogueliteRewardCenterPrompt,
    showRogueliteCompactStatus,
    rogueliteEnemyTypeLabel,
    rogueliteEnemyMechanicSkills,
    // Reward helpers
    isBossRewardType,
    isGrowthRewardType,
    isRogueliteSkillRewardType,
    rogueliteRewardRarity,
    rogueliteRewardTags,
    rogueliteRewardIcon,
    // Alert
    getRogueliteAlertText,
  };
}
