<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

type EditorTab = "events" | "rewards" | "enemies" | "bosses" | "shop" | "restSites";
type EventRarity = "common" | "uncommon" | "rare";
type EventStage = "early" | "mid" | "late" | "any";
type RewardCategory = "growth" | "characterSkill" | "bossAbility" | "starter";
type EventRewardPool = "growth" | "character_skill" | "boss_ability" | "rare";
type ShopItemType = "heal" | "relic" | "perk" | "skill" | "remove" | "reroll";
type ShopStage = "early" | "mid" | "late" | "mid_late" | "any";
type RestSiteActionId =
  | "campfire_heal" | "weapon_drill" | "shield_repair" | "blood_meditation"
  | "dice_prayer" | "sharpen_first_hit" | "reinforce_armor"
  | "sell_scraps" | "skip_for_trophy" | "skill_focus";
type EventOutcomeType =
  | "heal"
  | "lose_hp"
  | "gain_gold"
  | "lose_gold"
  | "gain_start_shield_next_battle"
  | "gain_start_damage_next_battle"
  | "reward_choice"
  | "start_battle"
  | "todo";

interface EditableOutcome {
  type: EventOutcomeType;
  value?: number;
  rewardPool?: EventRewardPool;
  enemyId?: string;
  note?: string;
}

interface EditableChoice {
  label: string;
  effect: string;
  cost: string;
  effects?: EditableOutcome[];
  costs?: EditableOutcome[];
}

interface EditableEvent {
  id: string;
  name: string;
  rarity: EventRarity;
  stage: EventStage;
  description: string;
  choices: [EditableChoice, EditableChoice];
  notes?: string;
}

interface EditableReward {
  name: string;
  description: string;
  type: string;
  value: number;
  tag?: string;
  maxStacks?: number;
}

interface EditableEnemy {
  id: string;
  name: string;
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "monster" | "duelist";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: string;
  stageType: "normal" | "elite";
  hpBonus: number;
  shieldBonus: number;
  damageBonus: number;
  skills: string[];
  description: string;
}

interface EditableBoss {
  id: string;
  name: string;
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "boss";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: string;
  stageType: "boss";
  baseHp: number;
  fixedHp?: number;
  baseShield: number;
  skills: string[];
  description: string;
}

interface EditableShopRules {
  itemsPerVisit: number;
  canRefresh: boolean;
  refreshPrice: number;
  canBuyHeal: boolean;
  canBuySkill: boolean;
  canBuyGrowth: boolean;
  canRemoveNegative: boolean;
  canBuyRouteInfo: boolean;
  canBuyTemporaryBoost: boolean;
}

interface EditableShopItem {
  id: string;
  name: string;
  type: ShopItemType;
  price: number;
  stage: ShopStage;
  effect: string;
  limit: string;
  notes?: string;
}

interface EditableShopData {
  rules: EditableShopRules;
  items: EditableShopItem[];
  activeItemIds: string[];
}

interface EditableRestSiteAction {
  id: RestSiteActionId;
  name: string;
  effect: string;
  limit: string;
  notes?: string;
}

interface EditableRestSitesData {
  actions: EditableRestSiteAction[];
}

interface EditableBalance {
  enemies: EditableEnemy[];
  bosses: EditableBoss[];
  rewards: Record<RewardCategory, EditableReward[]>;
}

const emit = defineEmits<{ back: [] }>();

const activeTab = ref<EditorTab>("events");
const rewardCategory = ref<RewardCategory>("growth");
const events = ref<EditableEvent[]>([]);
const balance = ref<EditableBalance>({
  enemies: [],
  bosses: [],
  rewards: { growth: [], characterSkill: [], bossAbility: [], starter: [] },
});
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const selectedEventIndex = ref(0);
const selectedRewardIndex = ref(0);
const selectedEnemyIndex = ref(0);
const selectedBossIndex = ref(0);
const selectedShopIndex = ref(0);
const selectedRestSiteIndex = ref(0);
const listCollapsed = ref(false);
const savedSnapshots = ref({ events: "", balance: "", shop: "", restSites: "" });
const shop = ref<EditableShopData>({
  rules: { itemsPerVisit: 3, canRefresh: true, refreshPrice: 20, canBuyHeal: true, canBuySkill: true, canBuyGrowth: true, canRemoveNegative: true, canBuyRouteInfo: false, canBuyTemporaryBoost: true },
  items: [],
  activeItemIds: [],
});
const restSites = ref<EditableRestSitesData>({ actions: [] });

const tabs: Array<{ id: EditorTab; label: string }> = [
  { id: "events", label: "事件" },
  { id: "rewards", label: "奖励" },
  { id: "enemies", label: "敌人" },
  { id: "bosses", label: "Boss" },
  { id: "shop", label: "商店" },
  { id: "restSites", label: "休息站点" },
];

const rewardCategories: Array<{ id: RewardCategory; label: string }> = [
  { id: "growth", label: "成长" },
  { id: "characterSkill", label: "职业技能" },
  { id: "bossAbility", label: "Boss 能力" },
  { id: "starter", label: "开局" },
];

const outcomeTypeOptions: Array<{ id: EventOutcomeType; label: string }> = [
  { id: "heal", label: "回复生命" },
  { id: "lose_hp", label: "失去生命" },
  { id: "gain_gold", label: "获得金币" },
  { id: "lose_gold", label: "失去金币" },
  { id: "gain_start_shield_next_battle", label: "下场开局护盾" },
  { id: "gain_start_damage_next_battle", label: "下场开局伤害" },
  { id: "reward_choice", label: "奖励三选一" },
  { id: "start_battle", label: "进入战斗" },
  { id: "todo", label: "暂未实现/备注" },
];

const rewardPoolOptions: Array<{ id: EventRewardPool; label: string }> = [
  { id: "growth", label: "普通成长池" },
  { id: "character_skill", label: "职业技能池" },
  { id: "boss_ability", label: "Boss 能力池" },
  { id: "rare", label: "稀有奖励池" },
];

const rewardTypeOptions: Array<{ id: string; label: string; category: RewardCategory }> = [
  { id: "heavy_punch_training", label: "重拳训练", category: "growth" },
  { id: "iron_body", label: "铁布衫", category: "growth" },
  { id: "breathing_recovery", label: "战斗喘息", category: "growth" },
  { id: "blood_punch", label: "吸血拳法", category: "growth" },
  { id: "battle_instinct", label: "战斗本能", category: "growth" },
  { id: "guard_training", label: "防守训练", category: "growth" },
  { id: "vitality_boost", label: "生命强化", category: "growth" },
  { id: "shield_wall", label: "护盾壁垒", category: "growth" },
  { id: "first_strike", label: "先手优势", category: "growth" },
  { id: "low_hp_armor", label: "绝境护甲", category: "growth" },
  { id: "kill_heal", label: "战利品", category: "growth" },
  { id: "drink_blood", label: "饮血", category: "growth" },
  { id: "comeback", label: "翻盘之力", category: "growth" },
  { id: "low_roll_defense", label: "低点防御", category: "growth" },
  { id: "shield_strike", label: "盾击", category: "growth" },
  { id: "shield_overload", label: "护盾过载", category: "growth" },
  { id: "sturdy_bulwark", label: "稳固壁垒", category: "growth" },
  { id: "fate_tokens", label: "命运筹码", category: "growth" },
  { id: "low_roll_charge", label: "低点蓄力", category: "growth" },
  { id: "desperate_reroll", label: "孤注一掷", category: "growth" },
  { id: "lucky_floor", label: "幸运保底", category: "growth" },
  { id: "gunner_triple_shot", label: "枪手技能", category: "characterSkill" },
  { id: "vampire_skill", label: "吸血鬼技能", category: "characterSkill" },
  { id: "zhaoyun_pierce", label: "赵子龙技能", category: "characterSkill" },
  { id: "flame_lord_mark", label: "火焰领主技能", category: "characterSkill" },
  { id: "berserker_blood", label: "狂怒之血", category: "bossAbility" },
  { id: "vampire_instinct", label: "吸血本能", category: "bossAbility" },
  { id: "dragon_courage", label: "龙胆之力", category: "bossAbility" },
  { id: "starter_heavy_punch", label: "重拳开局", category: "starter" },
  { id: "starter_blood_punch", label: "吸血开局", category: "starter" },
  { id: "starter_iron_wall", label: "铁壁开局", category: "starter" },
  { id: "starter_recovery", label: "续航开局", category: "starter" },
];

const rewardTagOptions = [
  { id: "", label: "无标签" },
  { id: "shield", label: "护盾" },
  { id: "dice", label: "骰子" },
  { id: "low_hp", label: "低血量" },
  { id: "burst", label: "爆发" },
  { id: "heal", label: "回复" },
  { id: "armor", label: "护甲" },
  { id: "status", label: "状态" },
];

const maxStackOptions: Array<{ value: number | undefined; label: string }> = [
  { value: undefined, label: "不限" },
  { value: 1, label: "1 层" },
  { value: 2, label: "2 层" },
  { value: 3, label: "3 层" },
];

const rewardValueOptionMap: Record<string, number[]> = {
  starter_heavy_punch: [2],
  starter_blood_punch: [1],
  starter_iron_wall: [1],
  starter_recovery: [8],
  heavy_punch_training: [1],
  iron_body: [1],
  breathing_recovery: [20, 30, 40, 50],
  blood_punch: [1],
  battle_instinct: [1],
  guard_training: [2, 3, 4, 5, 6],
  vitality_boost: [4, 6, 8, 10, 12],
  shield_wall: [2, 4, 6, 8, 10],
  first_strike: [1, 2, 3, 4, 5],
  low_hp_armor: [1, 2, 3, 4],
  kill_heal: [1],
  drink_blood: [1, 2, 3, 4, 5],
  comeback: [1, 2, 3, 4, 5],
  low_roll_defense: [1, 2, 3, 4, 5],
  shield_strike: [1, 2, 3, 4],
  shield_overload: [1],
  sturdy_bulwark: [1],
  fate_tokens: [1],
  low_roll_charge: [1],
  desperate_reroll: [1],
  lucky_floor: [1],
  gunner_triple_shot: [1],
  vampire_skill: [1],
  zhaoyun_pierce: [1],
  flame_lord_mark: [1],
  berserker_blood: [0],
  vampire_instinct: [1, 2, 3, 4, 5],
  dragon_courage: [0],
};

const enemySkillOptions = [
  "无特殊机制",
  "赌徒：投 1 自伤 1，投 6 伤害 +2",
  "破盾：攻击护盾时额外 +2 伤害",
  "穿甲：攻击无视 1 点护甲",
  "铁皮：护甲 +1",
  "整备：每回合获得 2 护盾",
  "狂暴：低于半血时伤害 +3",
  "收割：目标低于 40% 生命时伤害 +2",
  "穿甲：无视 1 点护甲",
  "破势：自身低于半血时无视 2 点护甲",
];

const bossSkillOptions = [
  "蓄力：投 1/2 获得 1 层蓄力",
  "重拳：攻击时每层蓄力 +3 伤害并清空",
  "狂暴：低于半血时伤害 +2",
  "嗜血：造成生命伤害后回复 2",
  "血盾：投到 3 时获得 4 护盾",
  "血祭：低于 40% 生命时一次性回复 5 并获得 3 护盾",
  "铁壁：护甲 +1",
  "架盾：投 1/2 获得 5 护盾并使本次受伤 -2",
  "盾反：受到生命伤害后反击 2",
  "神怒：攻击附加已损失生命值",
  "濒死：进入 15/10/5/1 血阈值",
  "终击：死亡前完成最后一击",
  "洗牌：投 1-3 时重投一次",
  "抽税：玩家投 6 时自身获得 3 护盾",
  "梭哈：低于 30% 生命时伤害 +3",
];

const shopTypeOptions: Array<{ id: ShopItemType; label: string }> = [
  { id: "heal", label: "回血" },
  { id: "relic", label: "遗物" },
  { id: "perk", label: "成长" },
  { id: "skill", label: "技能" },
  { id: "remove", label: "移除负面" },
  { id: "reroll", label: "重摇" },
];

const shopStageOptions: Array<{ id: ShopStage; label: string }> = [
  { id: "early", label: "前期" },
  { id: "mid", label: "中期" },
  { id: "late", label: "后期" },
  { id: "mid_late", label: "中后期" },
  { id: "any", label: "任意" },
];

const restSiteActionIdOptions: Array<{ id: RestSiteActionId; label: string }> = [
  { id: "campfire_heal", label: "营火疗伤" },
  { id: "weapon_drill", label: "武器演练" },
  { id: "shield_repair", label: "修补护甲" },
  { id: "blood_meditation", label: "血池冥想" },
  { id: "dice_prayer", label: "骰子祈愿" },
  { id: "sharpen_first_hit", label: "磨拳蓄势" },
  { id: "reinforce_armor", label: "加固甲片" },
  { id: "sell_scraps", label: "出售碎片" },
  { id: "skip_for_trophy", label: "不休息，拿战利品" },
  { id: "skill_focus", label: "专注职业技能" },
];

const rarityOptions: EventRarity[] = ["common", "uncommon", "rare"];
const stageOptions: EventStage[] = ["early", "mid", "late", "any"];
const validRarities = new Set<string>(rarityOptions);
const validStages = new Set<string>(stageOptions);
const validShopTypes = new Set(shopTypeOptions.map((o) => o.id));
const validShopStages = new Set(shopStageOptions.map((o) => o.id));
const validRestSiteIds = new Set(restSiteActionIdOptions.map((o) => o.id));
const validRewardTypes = new Set(rewardTypeOptions.map((option) => option.id));
const validRewardTags = new Set(rewardTagOptions.map((option) => option.id));
const validEnemySkills = new Set(enemySkillOptions);
const validBossSkills = new Set(bossSkillOptions);
const enemyKindOptions: Array<EditableEnemy["enemyKind"]> = ["monster", "duelist"];
const enemyStageOptions: Array<EditableEnemy["stageType"]> = ["normal", "elite"];

const currentRewards = computed(() => balance.value.rewards[rewardCategory.value] ?? []);
const selectedEvent = computed(() => events.value[selectedEventIndex.value] ?? null);
const selectedReward = computed(() => currentRewards.value[selectedRewardIndex.value] ?? null);
const selectedEnemy = computed(() => balance.value.enemies[selectedEnemyIndex.value] ?? null);
const selectedBoss = computed(() => balance.value.bosses[selectedBossIndex.value] ?? null);
const selectedShopItem = computed(() => shop.value.items[selectedShopIndex.value] ?? null);
const selectedRestSite = computed(() => restSites.value.actions[selectedRestSiteIndex.value] ?? null);
const activeCount = computed(() => {
  if (activeTab.value === "events") return events.value.length;
  if (activeTab.value === "rewards") return currentRewards.value.length;
  if (activeTab.value === "enemies") return balance.value.enemies.length;
  if (activeTab.value === "bosses") return balance.value.bosses.length;
  if (activeTab.value === "shop") return shop.value.items.length;
  return restSites.value.actions.length;
});
const activeTabLabel = computed(() => tabs.find((tab) => tab.id === activeTab.value)?.label ?? "");
const selectedListTitle = computed(() => {
  if (activeTab.value === "events") return selectedEvent.value?.name || selectedEvent.value?.id || "暂无选中";
  if (activeTab.value === "rewards") return selectedReward.value?.name || selectedReward.value?.type || "暂无选中";
  if (activeTab.value === "enemies") return selectedEnemy.value?.displayName || selectedEnemy.value?.name || selectedEnemy.value?.id || "暂无选中";
  if (activeTab.value === "bosses") return selectedBoss.value?.displayName || selectedBoss.value?.name || selectedBoss.value?.id || "暂无选中";
  if (activeTab.value === "shop") return selectedShopItem.value?.name || selectedShopItem.value?.id || "暂无选中";
  return selectedRestSite.value?.name || selectedRestSite.value?.id || "暂无选中";
});
const selectedListMeta = computed(() => {
  if (activeTab.value === "events") return selectedEvent.value?.id ?? "";
  if (activeTab.value === "rewards") return selectedReward.value?.type ?? "";
  if (activeTab.value === "enemies") return selectedEnemy.value?.id ?? "";
  if (activeTab.value === "bosses") return selectedBoss.value?.id ?? "";
  if (activeTab.value === "shop") return selectedShopItem.value?.id ?? "";
  return selectedRestSite.value?.id ?? "";
});
const battleTargetOptions = computed(() => [
  ...balance.value.enemies.map((enemy) => ({ id: enemy.id, label: `敌人：${enemy.displayName || enemy.name || enemy.id}` })),
  ...balance.value.bosses.map((boss) => ({ id: boss.id, label: `Boss：${boss.displayName || boss.name || boss.id}` })),
]);
const currentRewardTypeOptions = computed(() => rewardTypeOptions.filter((option) => option.category === rewardCategory.value));
const currentEventsJson = computed(() => JSON.stringify(events.value));
const currentBalanceJson = computed(() => JSON.stringify(balance.value));
const currentShopJson = computed(() => JSON.stringify(shop.value));
const currentRestSitesJson = computed(() => JSON.stringify(restSites.value));
const hasUnsavedChanges = computed(() => {
  const snap = savedSnapshots.value;
  if (!snap.events && !snap.balance && !snap.shop && !snap.restSites) return false;
  return (
    (snap.events && currentEventsJson.value !== snap.events) ||
    (snap.balance && currentBalanceJson.value !== snap.balance) ||
    (snap.shop && currentShopJson.value !== snap.shop) ||
    (snap.restSites && currentRestSitesJson.value !== snap.restSites)
  );
});

function uniqueId(prefix: string, existing: Iterable<string>): string {
  const used = new Set(existing);
  let index = used.size + 1;
  let id = `${prefix}_${index}`;
  while (used.has(id)) {
    index += 1;
    id = `${prefix}_${index}`;
  }
  return id;
}

function blankChoice(): EditableChoice {
  return { label: "", effect: "", cost: "", effects: [], costs: [] };
}

function blankEvent(): EditableEvent {
  return {
    id: uniqueId("event", events.value.map((item) => item.id)),
    name: "新事件",
    rarity: "common",
    stage: "early",
    description: "",
    choices: [blankChoice(), blankChoice()],
    notes: "",
  };
}

function blankReward(): EditableReward {
  const option = rewardTypeOptions.find((item) => item.category === rewardCategory.value) ?? rewardTypeOptions[0];
  const type = option?.id ?? "heavy_punch_training";
  return {
    name: option?.label ?? "新奖励",
    description: "",
    type,
    value: rewardValueOptionsForType(type)[0] ?? 1,
    tag: "",
  };
}

function rewardValueOptionsForType(type: string, currentValue?: number): number[] {
  const baseOptions = rewardValueOptionMap[type] ?? [0, 1, 2, 3, 4, 5, 6, 8, 10, 20, 30, 40, 50];
  if (currentValue === undefined || baseOptions.includes(currentValue)) return baseOptions;
  return [...baseOptions, currentValue].sort((a, b) => a - b);
}

function normalizeRewardValue(reward: EditableReward): void {
  const options = rewardValueOptionsForType(reward.type);
  if (!options.includes(reward.value)) {
    reward.value = options[0] ?? 1;
  }
}

function blankEnemy(): EditableEnemy {
  const id = uniqueId("enemy", balance.value.enemies.map((item) => item.id));
  return {
    id,
    name: "新敌人",
    enemyTemplateId: id,
    displayName: "新敌人",
    enemyKind: "monster",
    stageType: "normal",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: [],
    description: "",
  };
}

function blankBoss(): EditableBoss {
  const id = uniqueId("boss", balance.value.bosses.map((item) => item.id));
  return {
    id,
    name: "新 Boss",
    enemyTemplateId: id,
    displayName: "新 Boss",
    enemyKind: "boss",
    stageType: "boss",
    baseHp: 18,
    baseShield: 0,
    skills: [],
    description: "",
  };
}

function blankShopItem(): EditableShopItem {
  const id = uniqueId("shop_item", shop.value.items.map((item) => item.id));
  return {
    id,
    name: "新商品",
    type: "heal",
    price: 10,
    stage: "any",
    effect: "",
    limit: "每次商店 1 次",
    notes: "",
  };
}

function blankRestSiteAction(): EditableRestSiteAction {
  return {
    id: "campfire_heal",
    name: "新操作",
    effect: "",
    limit: "",
    notes: "",
  };
}

function toggleShopActive(itemId: string): void {
  const index = shop.value.activeItemIds.indexOf(itemId);
  if (index >= 0) {
    shop.value.activeItemIds.splice(index, 1);
  } else {
    shop.value.activeItemIds.push(itemId);
  }
}

function syncShopActiveIds(): void {
  const itemIds = new Set(shop.value.items.map((item) => item.id));
  shop.value.activeItemIds = shop.value.activeItemIds.filter((id) => itemIds.has(id));
}

function isShopItemType(value: string): value is ShopItemType {
  return validShopTypes.has(value as ShopItemType);
}

function isShopStage(value: string): value is ShopStage {
  return validShopStages.has(value as ShopStage);
}

function isRestSiteActionId(value: string): value is RestSiteActionId {
  return validRestSiteIds.has(value as RestSiteActionId);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isOutcomeType(value: unknown): value is EventOutcomeType {
  return typeof value === "string" && outcomeTypeOptions.some((option) => option.id === value);
}

function isRewardPool(value: unknown): value is EventRewardPool {
  return typeof value === "string" && rewardPoolOptions.some((option) => option.id === value);
}

function outcomeNeedsValue(type: EventOutcomeType): boolean {
  return ["heal", "lose_hp", "gain_gold", "lose_gold", "gain_start_shield_next_battle", "gain_start_damage_next_battle"].includes(type);
}

function outcomeNeedsRewardPool(type: EventOutcomeType): boolean {
  return type === "reward_choice";
}

function outcomeNeedsEnemy(type: EventOutcomeType): boolean {
  return type === "start_battle";
}

function outcomeLabel(type: EventOutcomeType): string {
  return outcomeTypeOptions.find((option) => option.id === type)?.label ?? type;
}

function rewardPoolLabel(pool: EventRewardPool | undefined): string {
  return rewardPoolOptions.find((option) => option.id === pool)?.label ?? "普通成长池";
}

function battleTargetLabel(enemyId: string | undefined): string {
  return battleTargetOptions.value.find((option) => option.id === enemyId)?.label ?? enemyId ?? "未选择对象";
}

function blankOutcome(type: EventOutcomeType = "heal"): EditableOutcome {
  const outcome: EditableOutcome = { type };
  if (outcomeNeedsValue(type)) outcome.value = 1;
  if (outcomeNeedsRewardPool(type)) outcome.rewardPool = "growth";
  if (outcomeNeedsEnemy(type)) outcome.enemyId = battleTargetOptions.value[0]?.id ?? "";
  if (type === "todo") outcome.note = "";
  return outcome;
}

function normalizeOutcome(raw: unknown): EditableOutcome {
  const value = asRecord(raw);
  const type = isOutcomeType(value.type) ? value.type : "todo";
  const outcome: EditableOutcome = { type };
  if (outcomeNeedsValue(type)) outcome.value = Math.max(1, asNumber(value.value, 1));
  if (outcomeNeedsRewardPool(type)) outcome.rewardPool = isRewardPool(value.rewardPool) ? value.rewardPool : "growth";
  if (outcomeNeedsEnemy(type)) outcome.enemyId = typeof value.enemyId === "string" ? value.enemyId : battleTargetOptions.value[0]?.id ?? "";
  if (typeof value.note === "string") outcome.note = value.note;
  return outcome;
}

function normalizeOutcomeFields(outcome: EditableOutcome): void {
  if (outcomeNeedsValue(outcome.type)) {
    outcome.value = Math.max(1, asNumber(outcome.value, 1));
  } else {
    outcome.value = undefined;
  }
  if (outcomeNeedsRewardPool(outcome.type)) {
    outcome.rewardPool ??= "growth";
  } else {
    outcome.rewardPool = undefined;
  }
  if (outcomeNeedsEnemy(outcome.type)) {
    outcome.enemyId ||= battleTargetOptions.value[0]?.id ?? "";
  } else {
    outcome.enemyId = undefined;
  }
  if (outcome.type !== "todo" && outcome.type !== "start_battle") {
    outcome.note = undefined;
  }
}

function outcomeSummary(outcome: EditableOutcome): string {
  const value = Math.max(0, Math.floor(asNumber(outcome.value)));
  if (outcome.type === "heal") return `回复 ${value} 生命`;
  if (outcome.type === "lose_hp") return `失去 ${value} 生命`;
  if (outcome.type === "gain_gold") return `获得 ${value} 金币`;
  if (outcome.type === "lose_gold") return `失去 ${value} 金币`;
  if (outcome.type === "gain_start_shield_next_battle") return `下一场战斗开始获得 ${value} 护盾`;
  if (outcome.type === "gain_start_damage_next_battle") return `下一场战斗开始获得 ${value} 伤害加成`;
  if (outcome.type === "reward_choice") return `从${rewardPoolLabel(outcome.rewardPool)}三选一`;
  if (outcome.type === "start_battle") return `进入战斗：${battleTargetLabel(outcome.enemyId)}`;
  return outcome.note?.trim() || "暂未实现效果";
}

function choiceSummary(choice: EditableChoice, key: "effects" | "costs"): string {
  const outcomes = choice[key] ?? [];
  if (outcomes.length === 0) return key === "effects" ? "无效果" : "无代价";
  return outcomes.map(outcomeSummary).join("；");
}

function syncChoiceDisplayText(choice: EditableChoice): void {
  choice.effect = choiceSummary(choice, "effects");
  choice.cost = choiceSummary(choice, "costs");
}

function syncEventDisplayText(): void {
  for (const event of events.value) {
    for (const choice of event.choices) {
      syncChoiceDisplayText(choice);
    }
  }
}

function addOutcome(choice: EditableChoice, key: "effects" | "costs"): void {
  choice[key] ??= [];
  choice[key]?.push(blankOutcome(key === "effects" ? "heal" : "lose_hp"));
  syncChoiceDisplayText(choice);
}

function removeOutcome(choice: EditableChoice, key: "effects" | "costs", index: number): void {
  choice[key]?.splice(index, 1);
  syncChoiceDisplayText(choice);
}

function normalizeEvents(raw: unknown): EditableEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((event, index) => {
    const value = asRecord(event);
    const rawChoices = Array.isArray(value.choices) ? value.choices : [];
    const first = asRecord(rawChoices[0]);
    const second = asRecord(rawChoices[1]);
    return {
      id: typeof value.id === "string" && value.id ? value.id : `event_${index + 1}`,
      name: typeof value.name === "string" ? value.name : "",
      rarity: value.rarity === "uncommon" || value.rarity === "rare" ? value.rarity : "common",
      stage: value.stage === "mid" || value.stage === "late" || value.stage === "any" ? value.stage : "early",
      description: typeof value.description === "string" ? value.description : "",
      choices: [
        {
          label: typeof first.label === "string" ? first.label : "",
          effect: typeof first.effect === "string" ? first.effect : "",
          cost: typeof first.cost === "string" ? first.cost : "",
          effects: Array.isArray(first.effects) ? first.effects.map(normalizeOutcome) : [],
          costs: Array.isArray(first.costs) ? first.costs.map(normalizeOutcome) : [],
        },
        {
          label: typeof second.label === "string" ? second.label : "",
          effect: typeof second.effect === "string" ? second.effect : "",
          cost: typeof second.cost === "string" ? second.cost : "",
          effects: Array.isArray(second.effects) ? second.effects.map(normalizeOutcome) : [],
          costs: Array.isArray(second.costs) ? second.costs.map(normalizeOutcome) : [],
        },
      ],
      notes: typeof value.notes === "string" ? value.notes : "",
    };
  });
}

function normalizeReward(raw: unknown): EditableReward {
  const value = asRecord(raw);
  return {
    name: typeof value.name === "string" ? value.name : "",
    description: typeof value.description === "string" ? value.description : "",
    type: typeof value.type === "string" ? value.type : "",
    value: asNumber(value.value),
    tag: typeof value.tag === "string" ? value.tag : "",
    maxStacks: value.maxStacks === undefined ? undefined : asNumber(value.maxStacks, 1),
  };
}

function normalizeEnemy(raw: unknown, index: number): EditableEnemy {
  const value = asRecord(raw);
  return {
    id: typeof value.id === "string" ? value.id : `enemy_${index + 1}`,
    name: typeof value.name === "string" ? value.name : "",
    enemyTemplateId: typeof value.enemyTemplateId === "string" ? value.enemyTemplateId : "",
    displayName: typeof value.displayName === "string" ? value.displayName : "",
    enemyKind: value.enemyKind === "duelist" ? "duelist" : "monster",
    spriteKey: typeof value.spriteKey === "string" ? value.spriteKey : "",
    portraitKey: typeof value.portraitKey === "string" ? value.portraitKey : "",
    baseCharacterId: typeof value.baseCharacterId === "string" ? value.baseCharacterId : "",
    stageType: value.stageType === "elite" ? "elite" : "normal",
    hpBonus: asNumber(value.hpBonus),
    shieldBonus: asNumber(value.shieldBonus),
    damageBonus: asNumber(value.damageBonus),
    skills: Array.isArray(value.skills) ? value.skills.filter((item): item is string => typeof item === "string") : [],
    description: typeof value.description === "string" ? value.description : "",
  };
}

function normalizeBoss(raw: unknown, index: number): EditableBoss {
  const value = asRecord(raw);
  return {
    id: typeof value.id === "string" ? value.id : `boss_${index + 1}`,
    name: typeof value.name === "string" ? value.name : "",
    enemyTemplateId: typeof value.enemyTemplateId === "string" ? value.enemyTemplateId : "",
    displayName: typeof value.displayName === "string" ? value.displayName : "",
    enemyKind: "boss",
    spriteKey: typeof value.spriteKey === "string" ? value.spriteKey : "",
    portraitKey: typeof value.portraitKey === "string" ? value.portraitKey : "",
    baseCharacterId: typeof value.baseCharacterId === "string" ? value.baseCharacterId : "",
    stageType: "boss",
    baseHp: asNumber(value.baseHp),
    fixedHp: value.fixedHp === undefined ? undefined : asNumber(value.fixedHp),
    baseShield: asNumber(value.baseShield),
    skills: Array.isArray(value.skills) ? value.skills.filter((item): item is string => typeof item === "string") : [],
    description: typeof value.description === "string" ? value.description : "",
  };
}

function normalizeBalance(raw: unknown): EditableBalance {
  const value = asRecord(raw);
  const rewards = asRecord(value.rewards);
  return {
    enemies: Array.isArray(value.enemies) ? value.enemies.map(normalizeEnemy) : [],
    bosses: Array.isArray(value.bosses) ? value.bosses.map(normalizeBoss) : [],
    rewards: {
      growth: Array.isArray(rewards.growth) ? rewards.growth.map(normalizeReward) : [],
      characterSkill: Array.isArray(rewards.characterSkill) ? rewards.characterSkill.map(normalizeReward) : [],
      bossAbility: Array.isArray(rewards.bossAbility) ? rewards.bossAbility.map(normalizeReward) : [],
      starter: Array.isArray(rewards.starter) ? rewards.starter.map(normalizeReward) : [],
    },
  };
}

function normalizeShopItem(raw: unknown, index: number): EditableShopItem {
  const value = asRecord(raw);
  const rawType = String(value.type ?? "");
  const rawStage = String(value.stage ?? "");
  return {
    id: typeof value.id === "string" && value.id ? value.id : `shop_item_${index + 1}`,
    name: typeof value.name === "string" ? value.name : "",
    type: isShopItemType(rawType) ? rawType : "heal",
    price: Math.max(0, asNumber(value.price)),
    stage: isShopStage(rawStage) ? rawStage : "any",
    effect: typeof value.effect === "string" ? value.effect : "",
    limit: typeof value.limit === "string" ? value.limit : "",
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

function normalizeShop(raw: unknown): EditableShopData {
  const value = asRecord(raw);
  const rules = asRecord(value.rules);
  const items: EditableShopItem[] = Array.isArray(value.items) ? value.items.map(normalizeShopItem) : [];
  const rawActiveIds: string[] = Array.isArray(value.activeItemIds) ? value.activeItemIds.filter((item): item is string => typeof item === "string") : [];
  const itemIds = new Set(items.map((item) => item.id));
  const activeItemIds = rawActiveIds.filter((id) => itemIds.has(id));
  return {
    rules: {
      itemsPerVisit: asNumber(rules.itemsPerVisit, 3),
      canRefresh: Boolean(rules.canRefresh),
      refreshPrice: asNumber(rules.refreshPrice, 20),
      canBuyHeal: Boolean(rules.canBuyHeal),
      canBuySkill: Boolean(rules.canBuySkill),
      canBuyGrowth: Boolean(rules.canBuyGrowth),
      canRemoveNegative: Boolean(rules.canRemoveNegative),
      canBuyRouteInfo: Boolean(rules.canBuyRouteInfo),
      canBuyTemporaryBoost: Boolean(rules.canBuyTemporaryBoost),
    },
    items,
    activeItemIds,
  };
}

function normalizeRestSiteAction(raw: unknown, index: number): EditableRestSiteAction {
  const value = asRecord(raw);
  const rawId = String(value.id ?? "");
  return {
    id: isRestSiteActionId(rawId) ? rawId : "campfire_heal",
    name: typeof value.name === "string" ? value.name : `操作 ${index + 1}`,
    effect: typeof value.effect === "string" ? value.effect : "",
    limit: typeof value.limit === "string" ? value.limit : "",
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

function normalizeRestSites(raw: unknown): EditableRestSitesData {
  const value = asRecord(raw);
  return {
    actions: Array.isArray(value.actions) ? value.actions.map(normalizeRestSiteAction) : [],
  };
}

function findDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function validateOutcome(outcome: EditableOutcome, eventName: string): string | null {
  normalizeOutcomeFields(outcome);
  if (outcomeNeedsValue(outcome.type) && (!Number.isFinite(Number(outcome.value)) || Number(outcome.value) <= 0)) {
    return `${eventName} 的「${outcomeLabel(outcome.type)}」必须填写大于 0 的数值`;
  }
  if (outcomeNeedsRewardPool(outcome.type) && !outcome.rewardPool) return `${eventName} 的奖励三选一必须选择奖励池`;
  if (outcomeNeedsEnemy(outcome.type) && !outcome.enemyId) return `${eventName} 的进入战斗必须选择战斗对象`;
  return null;
}

function validateBeforeSave(): string | null {
  syncEventDisplayText();
  if (activeTab.value === "events") {
    const duplicate = findDuplicate(events.value.map((item) => item.id.trim()));
    if (duplicate) return `事件 id 重复：${duplicate}`;
    for (const event of events.value) {
      if (!event.id.trim() || !event.name.trim() || !event.description.trim()) return "事件 id、名称、描述不能为空";
      if (!validRarities.has(event.rarity)) return `事件 ${event.id || event.name || "未命名"} 的稀有度不合法`;
      if (!validStages.has(event.stage)) return `事件 ${event.id || event.name || "未命名"} 的出现阶段不合法`;
      if (event.choices.length !== 2 || event.choices.some((choice) => !choice.label.trim())) {
        return "每个事件必须有两个完整选项按钮文案";
      }
      for (const choice of event.choices) {
        for (const outcome of [...(choice.effects ?? []), ...(choice.costs ?? [])]) {
          const error = validateOutcome(outcome, event.name || event.id);
          if (error) return error;
        }
      }
    }
    return null;
  }

  const duplicateEnemy = findDuplicate(balance.value.enemies.map((item) => item.id.trim()));
  if (duplicateEnemy) return `敌人 id 重复：${duplicateEnemy}`;
  const duplicateBoss = findDuplicate(balance.value.bosses.map((item) => item.id.trim()));
  if (duplicateBoss) return `Boss id 重复：${duplicateBoss}`;
  for (const reward of Object.values(balance.value.rewards).flat()) {
    if (!reward.name.trim() || !reward.type.trim() || !reward.description.trim()) return "奖励名称、type、说明不能为空";
    if (!validRewardTypes.has(reward.type)) return `奖励 type 不在可选规则内：${reward.type}`;
    if (!Number.isFinite(Number(reward.value))) return `奖励 ${reward.name || reward.type} 的数值必须是数字`;
    if (reward.tag && !validRewardTags.has(reward.tag)) return `奖励 tag 不在可选标签内：${reward.tag}`;
  }
  for (const enemy of balance.value.enemies) {
    if (!enemy.id.trim() || !enemy.name.trim() || !enemy.displayName.trim() || !enemy.enemyTemplateId.trim() || !enemy.description.trim()) return "敌人核心字段不能为空";
    const invalidSkill = enemy.skills.find((skill) => !validEnemySkills.has(skill));
    if (invalidSkill) return `敌人机制不在预设内：${invalidSkill}`;
  }
  for (const boss of balance.value.bosses) {
    if (!boss.id.trim() || !boss.name.trim() || !boss.displayName.trim() || !boss.enemyTemplateId.trim() || !boss.description.trim()) return "Boss 核心字段不能为空";
    const invalidSkill = boss.skills.find((skill) => !validBossSkills.has(skill));
    if (invalidSkill) return `Boss 机制不在预设内：${invalidSkill}`;
  }

  if (activeTab.value === "shop") {
    const shopDuplicate = findDuplicate(shop.value.items.map((item) => item.id.trim()));
    if (shopDuplicate) return `商品 id 重复：${shopDuplicate}`;
    for (const item of shop.value.items) {
      if (!item.id.trim() || !item.name.trim() || !item.effect.trim() || !item.limit.trim()) return "商品 id、名称、效果、限制不能为空";
      if (!validShopTypes.has(item.type)) return `商品 type 不合法：${item.type}`;
      if (!validShopStages.has(item.stage)) return `商品 stage 不合法：${item.stage}`;
      if (item.price < 0) return "商品价格不能为负数";
    }
    const itemIds = new Set(shop.value.items.map((item) => item.id));
    for (const activeId of shop.value.activeItemIds) {
      if (!itemIds.has(activeId)) return `可购买列表中的 id「${activeId}」不在商品列表中`;
    }
    return null;
  }

  if (activeTab.value === "restSites") {
    const restSiteDuplicate = findDuplicate(restSites.value.actions.map((action) => action.id));
    if (restSiteDuplicate) return `休息站点操作 id 重复：${restSiteDuplicate}`;
    for (const action of restSites.value.actions) {
      if (!action.id || !action.name.trim() || !action.effect.trim() || !action.limit.trim()) return "休息站点操作 id、名称、效果、限制不能为空";
      if (!validRestSiteIds.has(action.id)) return `休息站点操作 id 不在预设内：${action.id}`;
    }
    return null;
  }

  return null;
}

function skillsText(skills: string[]): string {
  return skills.join("\n");
}

function setSkills(target: { skills: string[] }, value: string): void {
  target.skills = value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function addSkill(target: { skills: string[] }, options: readonly string[]): void {
  target.skills.push(options[0] ?? "无特殊机制");
}

function removeSkill(target: { skills: string[] }, index: number): void {
  target.skills.splice(index, 1);
}

function markAllSaved(): void {
  savedSnapshots.value = {
    events: currentEventsJson.value,
    balance: currentBalanceJson.value,
    shop: currentShopJson.value,
    restSites: currentRestSitesJson.value,
  };
}

function markTabSaved(tab: EditorTab): void {
  if (tab === "events") savedSnapshots.value.events = currentEventsJson.value;
  else if (tab === "rewards" || tab === "enemies" || tab === "bosses") savedSnapshots.value.balance = currentBalanceJson.value;
  else if (tab === "shop") savedSnapshots.value.shop = currentShopJson.value;
  else if (tab === "restSites") savedSnapshots.value.restSites = currentRestSitesJson.value;
}

async function loadAll(): Promise<void> {
  if (hasUnsavedChanges.value && !window.confirm("当前有未保存修改，确定重新读取吗？")) return;
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const [eventsResponse, balanceResponse, shopResponse, restSitesResponse] = await Promise.all([
      fetch("/api/editor/roguelite/events", { credentials: "same-origin" }),
      fetch("/api/editor/roguelite/balance", { credentials: "same-origin" }),
      fetch("/api/editor/roguelite/shop", { credentials: "same-origin" }),
      fetch("/api/editor/roguelite/rest-sites", { credentials: "same-origin" }),
    ]);
    const eventsData = await eventsResponse.json();
    const balanceData = await balanceResponse.json();
    const shopData = await shopResponse.json();
    const restSitesData = await restSitesResponse.json();
    if (!eventsResponse.ok) throw new Error(eventsData.error ?? "事件读取失败");
    if (!balanceResponse.ok) throw new Error(balanceData.error ?? "平衡数据读取失败");
    if (!shopResponse.ok) throw new Error(shopData.error ?? "商店数据读取失败");
    if (!restSitesResponse.ok) throw new Error(restSitesData.error ?? "休息站点数据读取失败");
    events.value = normalizeEvents(eventsData.events);
    balance.value = normalizeBalance(balanceData.balance);
    shop.value = normalizeShop(shopData.shop);
    restSites.value = normalizeRestSites(restSitesData.restSites);
    selectedEventIndex.value = 0;
    selectedRewardIndex.value = 0;
    selectedEnemyIndex.value = 0;
    selectedBossIndex.value = 0;
    selectedShopIndex.value = 0;
    selectedRestSiteIndex.value = 0;
    markAllSaved();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "读取失败";
  } finally {
    loading.value = false;
  }
}

function selectTab(tab: EditorTab): void {
  if (activeTab.value === tab) return;
  const shouldRemindUnsaved = hasUnsavedChanges.value;
  activeTab.value = tab;
  errorMessage.value = "";
  successMessage.value = shouldRemindUnsaved ? "已切换分类，未保存修改仍在内存中，记得保存。" : "";
}

function addItem(): void {
  if (activeTab.value === "events") {
    events.value.push(blankEvent());
    selectedEventIndex.value = events.value.length - 1;
  } else if (activeTab.value === "rewards") {
    currentRewards.value.push(blankReward());
    selectedRewardIndex.value = currentRewards.value.length - 1;
  } else if (activeTab.value === "enemies") {
    balance.value.enemies.push(blankEnemy());
    selectedEnemyIndex.value = balance.value.enemies.length - 1;
  } else if (activeTab.value === "bosses") {
    balance.value.bosses.push(blankBoss());
    selectedBossIndex.value = balance.value.bosses.length - 1;
  } else if (activeTab.value === "shop") {
    shop.value.items.push(blankShopItem());
    selectedShopIndex.value = shop.value.items.length - 1;
  } else if (activeTab.value === "restSites") {
    restSites.value.actions.push(blankRestSiteAction());
    selectedRestSiteIndex.value = restSites.value.actions.length - 1;
  }
  successMessage.value = "";
}

function removeItem(): void {
  if (!window.confirm("确定删除当前条目吗？")) return;
  if (activeTab.value === "events") {
    events.value.splice(selectedEventIndex.value, 1);
    selectedEventIndex.value = Math.max(0, Math.min(selectedEventIndex.value, events.value.length - 1));
  } else if (activeTab.value === "rewards") {
    currentRewards.value.splice(selectedRewardIndex.value, 1);
    selectedRewardIndex.value = Math.max(0, Math.min(selectedRewardIndex.value, currentRewards.value.length - 1));
  } else if (activeTab.value === "enemies") {
    balance.value.enemies.splice(selectedEnemyIndex.value, 1);
    selectedEnemyIndex.value = Math.max(0, Math.min(selectedEnemyIndex.value, balance.value.enemies.length - 1));
  } else if (activeTab.value === "bosses") {
    balance.value.bosses.splice(selectedBossIndex.value, 1);
    selectedBossIndex.value = Math.max(0, Math.min(selectedBossIndex.value, balance.value.bosses.length - 1));
  } else if (activeTab.value === "shop") {
    const deletedId = shop.value.items[selectedShopIndex.value]?.id;
    shop.value.items.splice(selectedShopIndex.value, 1);
    if (deletedId) {
      shop.value.activeItemIds = shop.value.activeItemIds.filter((id) => id !== deletedId);
    }
    selectedShopIndex.value = Math.max(0, Math.min(selectedShopIndex.value, shop.value.items.length - 1));
  } else if (activeTab.value === "restSites") {
    restSites.value.actions.splice(selectedRestSiteIndex.value, 1);
    selectedRestSiteIndex.value = Math.max(0, Math.min(selectedRestSiteIndex.value, restSites.value.actions.length - 1));
  }
  successMessage.value = "";
}

function normalizeIndexes(): void {
  selectedEventIndex.value = Math.min(selectedEventIndex.value, Math.max(0, events.value.length - 1));
  selectedRewardIndex.value = Math.min(selectedRewardIndex.value, Math.max(0, currentRewards.value.length - 1));
  selectedEnemyIndex.value = Math.min(selectedEnemyIndex.value, Math.max(0, balance.value.enemies.length - 1));
  selectedBossIndex.value = Math.min(selectedBossIndex.value, Math.max(0, balance.value.bosses.length - 1));
  selectedShopIndex.value = Math.min(selectedShopIndex.value, Math.max(0, shop.value.items.length - 1));
  selectedRestSiteIndex.value = Math.min(selectedRestSiteIndex.value, Math.max(0, restSites.value.actions.length - 1));
}

async function saveActive(): Promise<void> {
  const validationError = validateBeforeSave();
  if (validationError) {
    errorMessage.value = validationError;
    successMessage.value = "";
    return;
  }
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    if (activeTab.value === "events") {
      const response = await fetch("/api/editor/roguelite/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ events: events.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      events.value = normalizeEvents(data.events);
      successMessage.value = "事件已保存，旧文件已备份。";
    } else if (activeTab.value === "shop") {
      syncShopActiveIds();
      const response = await fetch("/api/editor/roguelite/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ shop: shop.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      shop.value = normalizeShop(data.shop);
      successMessage.value = "商店数据已保存，旧文件已备份。";
    } else if (activeTab.value === "restSites") {
      const response = await fetch("/api/editor/roguelite/rest-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ restSites: restSites.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      restSites.value = normalizeRestSites(data.restSites);
      successMessage.value = "休息站点数据已保存，旧文件已备份。";
    } else {
      const response = await fetch("/api/editor/roguelite/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ balance: balance.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      balance.value = normalizeBalance(data.balance);
      successMessage.value = "肉鸽数据已保存，旧文件已备份。";
    }
    normalizeIndexes();
    markTabSaved(activeTab.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

function back(): void {
  if (hasUnsavedChanges.value && !window.confirm("当前有未保存修改，确定离开吗？")) return;
  emit("back");
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = "";
}

onMounted(() => {
  document.documentElement.classList.add("editor-scroll-unlocked");
  document.body.classList.add("editor-scroll-unlocked");
  window.addEventListener("beforeunload", handleBeforeUnload);
  void loadAll();
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("editor-scroll-unlocked");
  document.body.classList.remove("editor-scroll-unlocked");
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <section class="editor-page">
    <header class="tool-header">
      <div class="tool-title">
        <span class="eyebrow">ROGUELITE DATA</span>
        <h2>肉鸽数据编辑器</h2>
      </div>
      <div class="tool-actions">
        <button class="ghost-btn compact-btn" type="button" @click="back">返回</button>
        <button class="secondary-btn compact-btn" type="button" @click="loadAll" :disabled="loading || saving">读取</button>
        <button class="primary-btn compact-btn" type="button" @click="saveActive" :disabled="loading || saving">
          {{ saving ? "保存中" : "保存" }}
        </button>
      </div>
    </header>

    <nav class="editor-tabs" aria-label="肉鸽数据类型">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        type="button"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="errorMessage" class="editor-message error">{{ errorMessage }}</p>
    <p v-else-if="successMessage" class="editor-message success">{{ successMessage }}</p>

    <div v-if="loading" class="empty-panel">正在读取数据...</div>
    <div v-else class="editor-workspace">
      <aside class="item-list" :class="{ collapsed: listCollapsed }">
        <div class="list-head">
          <div class="list-title">
            <strong>{{ activeTabLabel }}列表</strong>
            <span>{{ activeCount }}</span>
          </div>
          <button class="collapse-btn" type="button" @click="listCollapsed = !listCollapsed">
            {{ listCollapsed ? "展开列表" : "收起列表" }}
          </button>
        </div>

        <div v-if="listCollapsed" class="collapsed-summary">
          <strong>{{ selectedListTitle }}</strong>
          <small v-if="selectedListMeta">{{ selectedListMeta }}</small>
        </div>

        <div v-else class="list-body">
          <div v-if="activeTab === 'rewards'" class="category-tabs">
            <button
              v-for="category in rewardCategories"
              :key="category.id"
              class="category-button"
              :class="{ active: rewardCategory === category.id }"
              type="button"
              @click="rewardCategory = category.id; selectedRewardIndex = 0"
            >
              {{ category.label }}
            </button>
          </div>

          <div class="list-actions">
            <button class="secondary-btn list-action-btn" type="button" @click="addItem">新增</button>
            <button class="ghost-btn list-action-btn" type="button" @click="removeItem">删除</button>
          </div>

          <template v-if="activeTab === 'events'">
            <button
              v-for="(item, index) in events"
              :key="`${item.id}-${index}`"
              class="item-button"
              :class="{ active: index === selectedEventIndex }"
              type="button"
              @click="selectedEventIndex = index"
            >
              <span>{{ item.name || "未命名事件" }}</span>
              <small>{{ item.id }}</small>
            </button>
          </template>

          <template v-else-if="activeTab === 'rewards'">
            <button
              v-for="(item, index) in currentRewards"
              :key="`${rewardCategory}-${item.type}-${index}`"
              class="item-button"
              :class="{ active: index === selectedRewardIndex }"
              type="button"
              @click="selectedRewardIndex = index"
            >
              <span>{{ item.name || "未命名奖励" }}</span>
              <small>{{ item.type }}</small>
            </button>
          </template>

          <template v-else-if="activeTab === 'enemies'">
            <button
              v-for="(item, index) in balance.enemies"
              :key="`${item.id}-${index}`"
              class="item-button"
              :class="{ active: index === selectedEnemyIndex }"
              type="button"
              @click="selectedEnemyIndex = index"
            >
              <span>{{ item.displayName || item.name }}</span>
              <small>{{ item.id }}</small>
            </button>
          </template>

          <template v-else-if="activeTab === 'bosses'">
            <button
              v-for="(item, index) in balance.bosses"
              :key="`${item.id}-${index}`"
              class="item-button"
              :class="{ active: index === selectedBossIndex }"
              type="button"
              @click="selectedBossIndex = index"
            >
              <span>{{ item.displayName || item.name }}</span>
              <small>{{ item.id }}</small>
            </button>
          </template>

          <template v-else-if="activeTab === 'shop'">
            <button
              v-for="(item, index) in shop.items"
              :key="`${item.id}-${index}`"
              class="item-button"
              :class="{ active: index === selectedShopIndex }"
              type="button"
              @click="selectedShopIndex = index"
            >
              <span>{{ item.name || "未命名商品" }}</span>
              <small>{{ item.id }} · {{ item.type }}</small>
            </button>
          </template>

          <template v-else>
            <button
              v-for="(item, index) in restSites.actions"
              :key="`${item.id}-${index}`"
              class="item-button"
              :class="{ active: index === selectedRestSiteIndex }"
              type="button"
              @click="selectedRestSiteIndex = index"
            >
              <span>{{ item.name || "未命名操作" }}</span>
              <small>{{ item.id }}</small>
            </button>
          </template>
        </div>
      </aside>

      <main class="form-panel">
        <form v-if="activeTab === 'events' && selectedEvent" class="editor-form" @submit.prevent="saveActive">
          <div class="field-grid">
            <label class="field">
              <span>事件 id</span>
              <input v-model="selectedEvent.id" />
            </label>
            <label class="field">
              <span>事件名</span>
              <input v-model="selectedEvent.name" />
            </label>
            <label class="field">
              <span>稀有度</span>
              <select v-model="selectedEvent.rarity">
                <option v-for="option in rarityOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <label class="field">
              <span>出现阶段</span>
              <select v-model="selectedEvent.stage">
                <option v-for="option in stageOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
          </div>

          <label class="field">
            <span>描述文本</span>
            <textarea v-model="selectedEvent.description" rows="4" />
          </label>

          <label class="field">
            <span>备注</span>
            <textarea v-model="selectedEvent.notes" rows="2" placeholder="给自己看的设计备注，不直接影响战斗逻辑" />
          </label>

          <div class="choice-grid">
            <section class="choice-block">
              <h3>选项 A</h3>
              <label class="field">
                <span>按钮文案</span>
                <input v-model="selectedEvent.choices[0].label" />
              </label>
              <div class="outcome-editor">
                <div class="outcome-head">
                  <strong>效果</strong>
                  <button class="mini-btn" type="button" @click="addOutcome(selectedEvent.choices[0], 'effects')">添加效果</button>
                </div>
                <p v-if="selectedEvent.choices[0].effects?.length === 0" class="outcome-empty">暂无效果，保存时会显示为“无效果”。</p>
                <div v-for="(outcome, index) in selectedEvent.choices[0].effects" :key="`a-effect-${index}`" class="outcome-row">
                  <label class="field compact-field">
                    <span>类型</span>
                    <select v-model="outcome.type" @change="normalizeOutcomeFields(outcome); syncChoiceDisplayText(selectedEvent.choices[0])">
                      <option v-for="option in outcomeTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsValue(outcome.type)" class="field compact-field">
                    <span>数值</span>
                    <input v-model.number="outcome.value" type="number" min="1" @input="syncChoiceDisplayText(selectedEvent.choices[0])" />
                  </label>
                  <label v-if="outcomeNeedsRewardPool(outcome.type)" class="field compact-field">
                    <span>奖励池</span>
                    <select v-model="outcome.rewardPool" @change="syncChoiceDisplayText(selectedEvent.choices[0])">
                      <option v-for="pool in rewardPoolOptions" :key="pool.id" :value="pool.id">{{ pool.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsEnemy(outcome.type)" class="field compact-field">
                    <span>战斗对象</span>
                    <select v-model="outcome.enemyId" @change="syncChoiceDisplayText(selectedEvent.choices[0])">
                      <option v-for="target in battleTargetOptions" :key="target.id" :value="target.id">{{ target.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcome.type === 'todo' || outcome.type === 'start_battle'" class="field compact-field outcome-note">
                    <span>备注</span>
                    <input v-model="outcome.note" placeholder="可选" @input="syncChoiceDisplayText(selectedEvent.choices[0])" />
                  </label>
                  <button class="mini-btn danger" type="button" @click="removeOutcome(selectedEvent.choices[0], 'effects', index)">删除</button>
                </div>
                <small class="outcome-preview">显示：{{ choiceSummary(selectedEvent.choices[0], "effects") }}</small>
              </div>
              <div class="outcome-editor">
                <div class="outcome-head">
                  <strong>代价</strong>
                  <button class="mini-btn" type="button" @click="addOutcome(selectedEvent.choices[0], 'costs')">添加代价</button>
                </div>
                <p v-if="selectedEvent.choices[0].costs?.length === 0" class="outcome-empty">暂无代价，保存时会显示为“无代价”。</p>
                <div v-for="(outcome, index) in selectedEvent.choices[0].costs" :key="`a-cost-${index}`" class="outcome-row">
                  <label class="field compact-field">
                    <span>类型</span>
                    <select v-model="outcome.type" @change="normalizeOutcomeFields(outcome); syncChoiceDisplayText(selectedEvent.choices[0])">
                      <option v-for="option in outcomeTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsValue(outcome.type)" class="field compact-field">
                    <span>数值</span>
                    <input v-model.number="outcome.value" type="number" min="1" @input="syncChoiceDisplayText(selectedEvent.choices[0])" />
                  </label>
                  <label v-if="outcomeNeedsRewardPool(outcome.type)" class="field compact-field">
                    <span>奖励池</span>
                    <select v-model="outcome.rewardPool" @change="syncChoiceDisplayText(selectedEvent.choices[0])">
                      <option v-for="pool in rewardPoolOptions" :key="pool.id" :value="pool.id">{{ pool.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsEnemy(outcome.type)" class="field compact-field">
                    <span>战斗对象</span>
                    <select v-model="outcome.enemyId" @change="syncChoiceDisplayText(selectedEvent.choices[0])">
                      <option v-for="target in battleTargetOptions" :key="target.id" :value="target.id">{{ target.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcome.type === 'todo' || outcome.type === 'start_battle'" class="field compact-field outcome-note">
                    <span>备注</span>
                    <input v-model="outcome.note" placeholder="可选" @input="syncChoiceDisplayText(selectedEvent.choices[0])" />
                  </label>
                  <button class="mini-btn danger" type="button" @click="removeOutcome(selectedEvent.choices[0], 'costs', index)">删除</button>
                </div>
                <small class="outcome-preview">显示：{{ choiceSummary(selectedEvent.choices[0], "costs") }}</small>
              </div>
            </section>

            <section class="choice-block">
              <h3>选项 B</h3>
              <label class="field">
                <span>按钮文案</span>
                <input v-model="selectedEvent.choices[1].label" />
              </label>
              <div class="outcome-editor">
                <div class="outcome-head">
                  <strong>效果</strong>
                  <button class="mini-btn" type="button" @click="addOutcome(selectedEvent.choices[1], 'effects')">添加效果</button>
                </div>
                <p v-if="selectedEvent.choices[1].effects?.length === 0" class="outcome-empty">暂无效果，保存时会显示为“无效果”。</p>
                <div v-for="(outcome, index) in selectedEvent.choices[1].effects" :key="`b-effect-${index}`" class="outcome-row">
                  <label class="field compact-field">
                    <span>类型</span>
                    <select v-model="outcome.type" @change="normalizeOutcomeFields(outcome); syncChoiceDisplayText(selectedEvent.choices[1])">
                      <option v-for="option in outcomeTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsValue(outcome.type)" class="field compact-field">
                    <span>数值</span>
                    <input v-model.number="outcome.value" type="number" min="1" @input="syncChoiceDisplayText(selectedEvent.choices[1])" />
                  </label>
                  <label v-if="outcomeNeedsRewardPool(outcome.type)" class="field compact-field">
                    <span>奖励池</span>
                    <select v-model="outcome.rewardPool" @change="syncChoiceDisplayText(selectedEvent.choices[1])">
                      <option v-for="pool in rewardPoolOptions" :key="pool.id" :value="pool.id">{{ pool.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsEnemy(outcome.type)" class="field compact-field">
                    <span>战斗对象</span>
                    <select v-model="outcome.enemyId" @change="syncChoiceDisplayText(selectedEvent.choices[1])">
                      <option v-for="target in battleTargetOptions" :key="target.id" :value="target.id">{{ target.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcome.type === 'todo' || outcome.type === 'start_battle'" class="field compact-field outcome-note">
                    <span>备注</span>
                    <input v-model="outcome.note" placeholder="可选" @input="syncChoiceDisplayText(selectedEvent.choices[1])" />
                  </label>
                  <button class="mini-btn danger" type="button" @click="removeOutcome(selectedEvent.choices[1], 'effects', index)">删除</button>
                </div>
                <small class="outcome-preview">显示：{{ choiceSummary(selectedEvent.choices[1], "effects") }}</small>
              </div>
              <div class="outcome-editor">
                <div class="outcome-head">
                  <strong>代价</strong>
                  <button class="mini-btn" type="button" @click="addOutcome(selectedEvent.choices[1], 'costs')">添加代价</button>
                </div>
                <p v-if="selectedEvent.choices[1].costs?.length === 0" class="outcome-empty">暂无代价，保存时会显示为“无代价”。</p>
                <div v-for="(outcome, index) in selectedEvent.choices[1].costs" :key="`b-cost-${index}`" class="outcome-row">
                  <label class="field compact-field">
                    <span>类型</span>
                    <select v-model="outcome.type" @change="normalizeOutcomeFields(outcome); syncChoiceDisplayText(selectedEvent.choices[1])">
                      <option v-for="option in outcomeTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsValue(outcome.type)" class="field compact-field">
                    <span>数值</span>
                    <input v-model.number="outcome.value" type="number" min="1" @input="syncChoiceDisplayText(selectedEvent.choices[1])" />
                  </label>
                  <label v-if="outcomeNeedsRewardPool(outcome.type)" class="field compact-field">
                    <span>奖励池</span>
                    <select v-model="outcome.rewardPool" @change="syncChoiceDisplayText(selectedEvent.choices[1])">
                      <option v-for="pool in rewardPoolOptions" :key="pool.id" :value="pool.id">{{ pool.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcomeNeedsEnemy(outcome.type)" class="field compact-field">
                    <span>战斗对象</span>
                    <select v-model="outcome.enemyId" @change="syncChoiceDisplayText(selectedEvent.choices[1])">
                      <option v-for="target in battleTargetOptions" :key="target.id" :value="target.id">{{ target.label }}</option>
                    </select>
                  </label>
                  <label v-if="outcome.type === 'todo' || outcome.type === 'start_battle'" class="field compact-field outcome-note">
                    <span>备注</span>
                    <input v-model="outcome.note" placeholder="可选" @input="syncChoiceDisplayText(selectedEvent.choices[1])" />
                  </label>
                  <button class="mini-btn danger" type="button" @click="removeOutcome(selectedEvent.choices[1], 'costs', index)">删除</button>
                </div>
                <small class="outcome-preview">显示：{{ choiceSummary(selectedEvent.choices[1], "costs") }}</small>
              </div>
            </section>
          </div>
        </form>

        <form v-else-if="activeTab === 'rewards' && selectedReward" class="editor-form" @submit.prevent="saveActive">
          <div class="field-grid">
            <label class="field">
              <span>奖励名</span>
              <input v-model="selectedReward.name" />
            </label>
            <label class="field">
              <span>type</span>
              <select v-model="selectedReward.type" @change="normalizeRewardValue(selectedReward)">
                <option v-for="option in currentRewardTypeOptions" :key="option.id" :value="option.id">{{ option.label }} · {{ option.id }}</option>
              </select>
            </label>
            <label class="field">
              <span>数值</span>
              <select v-model.number="selectedReward.value">
                <option
                  v-for="value in rewardValueOptionsForType(selectedReward.type, selectedReward.value)"
                  :key="value"
                  :value="value"
                >
                  {{ value }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>最大层数</span>
              <select v-model="selectedReward.maxStacks">
                <option v-for="option in maxStackOptions" :key="option.label" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label class="field">
              <span>tag</span>
              <select v-model="selectedReward.tag">
                <option v-for="option in rewardTagOptions" :key="option.id || 'none'" :value="option.id">{{ option.label }}</option>
              </select>
            </label>
          </div>
          <label class="field">
            <span>说明</span>
            <textarea v-model="selectedReward.description" rows="5" />
          </label>
        </form>

        <form v-else-if="activeTab === 'enemies' && selectedEnemy" class="editor-form" @submit.prevent="saveActive">
          <div class="field-grid">
            <label class="field">
              <span>敌人 id</span>
              <input v-model="selectedEnemy.id" />
            </label>
            <label class="field">
              <span>显示名</span>
              <input v-model="selectedEnemy.displayName" />
            </label>
            <label class="field">
              <span>内部名</span>
              <input v-model="selectedEnemy.name" />
            </label>
            <label class="field">
              <span>模板 id</span>
              <input v-model="selectedEnemy.enemyTemplateId" />
            </label>
            <label class="field">
              <span>敌人类型</span>
              <select v-model="selectedEnemy.enemyKind">
                <option v-for="option in enemyKindOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <label class="field">
              <span>关卡类型</span>
              <select v-model="selectedEnemy.stageType">
                <option v-for="option in enemyStageOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <label class="field">
              <span>生命修正</span>
              <input v-model.number="selectedEnemy.hpBonus" type="number" />
            </label>
            <label class="field">
              <span>护盾修正</span>
              <input v-model.number="selectedEnemy.shieldBonus" type="number" />
            </label>
            <label class="field">
              <span>伤害修正</span>
              <input v-model.number="selectedEnemy.damageBonus" type="number" />
            </label>
          </div>
          <div class="outcome-editor">
            <div class="outcome-head">
              <strong>机制预设</strong>
              <button class="mini-btn" type="button" @click="addSkill(selectedEnemy, enemySkillOptions)">添加机制</button>
            </div>
            <p v-if="selectedEnemy.skills.length === 0" class="outcome-empty">暂无机制。</p>
            <div v-for="(_skill, index) in selectedEnemy.skills" :key="`enemy-skill-${index}`" class="skill-row">
              <label class="field compact-field">
                <span>机制</span>
                <select v-model="selectedEnemy.skills[index]">
                  <option v-for="option in enemySkillOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>
              <button class="mini-btn danger" type="button" @click="removeSkill(selectedEnemy, index)">删除</button>
            </div>
          </div>
          <label class="field">
            <span>说明</span>
            <textarea v-model="selectedEnemy.description" rows="4" />
          </label>
        </form>

        <form v-else-if="activeTab === 'bosses' && selectedBoss" class="editor-form" @submit.prevent="saveActive">
          <div class="field-grid">
            <label class="field">
              <span>Boss id</span>
              <input v-model="selectedBoss.id" />
            </label>
            <label class="field">
              <span>显示名</span>
              <input v-model="selectedBoss.displayName" />
            </label>
            <label class="field">
              <span>内部名</span>
              <input v-model="selectedBoss.name" />
            </label>
            <label class="field">
              <span>模板 id</span>
              <input v-model="selectedBoss.enemyTemplateId" />
            </label>
            <label class="field">
              <span>基础生命</span>
              <input v-model.number="selectedBoss.baseHp" type="number" />
            </label>
            <label class="field">
              <span>固定生命</span>
              <input v-model.number="selectedBoss.fixedHp" type="number" placeholder="空为不固定" />
            </label>
            <label class="field">
              <span>基础护盾</span>
              <input v-model.number="selectedBoss.baseShield" type="number" />
            </label>
          </div>
          <div class="outcome-editor">
            <div class="outcome-head">
              <strong>机制预设</strong>
              <button class="mini-btn" type="button" @click="addSkill(selectedBoss, bossSkillOptions)">添加机制</button>
            </div>
            <p v-if="selectedBoss.skills.length === 0" class="outcome-empty">暂无机制。</p>
            <div v-for="(_skill, index) in selectedBoss.skills" :key="`boss-skill-${index}`" class="skill-row">
              <label class="field compact-field">
                <span>机制</span>
                <select v-model="selectedBoss.skills[index]">
                  <option v-for="option in bossSkillOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>
              <button class="mini-btn danger" type="button" @click="removeSkill(selectedBoss, index)">删除</button>
            </div>
          </div>
          <label class="field">
            <span>说明</span>
            <textarea v-model="selectedBoss.description" rows="4" />
          </label>
        </form>

        <form v-else-if="activeTab === 'shop' && selectedShopItem" class="editor-form" @submit.prevent="saveActive">
          <fieldset class="editor-fieldset">
            <legend>商店规则</legend>
            <div class="field-grid">
              <label class="field">
                <span>每次商店商品数</span>
                <input v-model.number="shop.rules.itemsPerVisit" type="number" min="1" />
              </label>
              <label class="field">
                <span>刷新价格</span>
                <input v-model.number="shop.rules.refreshPrice" type="number" min="0" />
              </label>
              <label class="field checkbox-field">
                <span>可刷新</span>
                <input v-model="shop.rules.canRefresh" type="checkbox" />
              </label>
              <label class="field checkbox-field">
                <span>可购买回血</span>
                <input v-model="shop.rules.canBuyHeal" type="checkbox" />
              </label>
              <label class="field checkbox-field">
                <span>可购买技能</span>
                <input v-model="shop.rules.canBuySkill" type="checkbox" />
              </label>
              <label class="field checkbox-field">
                <span>可购买成长</span>
                <input v-model="shop.rules.canBuyGrowth" type="checkbox" />
              </label>
              <label class="field checkbox-field">
                <span>可移除负面</span>
                <input v-model="shop.rules.canRemoveNegative" type="checkbox" />
              </label>
              <label class="field checkbox-field">
                <span>可购买路线信息</span>
                <input v-model="shop.rules.canBuyRouteInfo" type="checkbox" />
              </label>
              <label class="field checkbox-field">
                <span>可购买临时增益</span>
                <input v-model="shop.rules.canBuyTemporaryBoost" type="checkbox" />
              </label>
            </div>
          </fieldset>

          <fieldset class="editor-fieldset">
            <legend>商品详情</legend>
            <div class="field-grid">
              <label class="field">
                <span>商品 id</span>
                <input v-model="selectedShopItem.id" />
              </label>
              <label class="field">
                <span>商品名</span>
                <input v-model="selectedShopItem.name" />
              </label>
              <label class="field">
                <span>类型</span>
                <select v-model="selectedShopItem.type">
                  <option v-for="option in shopTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>出现阶段</span>
                <select v-model="selectedShopItem.stage">
                  <option v-for="option in shopStageOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>价格</span>
                <input v-model.number="selectedShopItem.price" type="number" min="0" />
              </label>
              <label class="field">
                <span>限制</span>
                <input v-model="selectedShopItem.limit" />
              </label>
            </div>
            <label class="field">
              <span>效果描述</span>
              <input v-model="selectedShopItem.effect" />
            </label>
            <label class="field">
              <span>备注</span>
              <textarea v-model="selectedShopItem.notes" rows="2" placeholder="给自己看的设计备注" />
            </label>
            <label class="field checkbox-field">
              <span>当前可购买</span>
              <input type="checkbox" :checked="shop.activeItemIds.includes(selectedShopItem.id)" @change="toggleShopActive(selectedShopItem.id)" />
            </label>
          </fieldset>
        </form>

        <form v-else-if="activeTab === 'restSites' && selectedRestSite" class="editor-form" @submit.prevent="saveActive">
          <div class="field-grid">
            <label class="field">
              <span>操作 id</span>
              <select v-model="selectedRestSite.id">
                <option v-for="option in restSiteActionIdOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
            </label>
            <label class="field">
              <span>操作名</span>
              <input v-model="selectedRestSite.name" />
            </label>
          </div>
          <label class="field">
            <span>效果描述</span>
            <input v-model="selectedRestSite.effect" />
          </label>
          <label class="field">
            <span>限制</span>
            <input v-model="selectedRestSite.limit" />
          </label>
          <label class="field">
            <span>备注</span>
            <textarea v-model="selectedRestSite.notes" rows="2" placeholder="给自己看的设计备注" />
          </label>
        </form>

        <div v-else class="empty-panel">请选择一条数据。</div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.editor-page {
  display: grid;
  gap: 12px;
  width: min(100%, 1180px);
  min-height: calc(100dvh - 96px);
  margin: 0 auto;
  overflow: visible;
  padding: 0 4px 36px;
  overscroll-behavior: auto;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 8px 0 2px;
}

.tool-title {
  min-width: 0;
}

.eyebrow {
  display: block;
  margin-bottom: 2px;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
}

.tool-title h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.12;
}

.tool-actions,
.list-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-actions {
  justify-content: flex-end;
}

.compact-btn,
.list-action-btn {
  min-height: 40px;
  padding: 7px 13px;
  white-space: nowrap;
}

.editor-tabs,
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.tab-button,
.category-button {
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #334155;
  font-weight: 900;
  white-space: nowrap;
}

.tab-button {
  min-height: 40px;
  padding: 7px 16px;
}

.category-button {
  min-height: 34px;
  padding: 6px 10px;
  font-size: 13px;
}

.tab-button.active,
.category-button.active {
  border-color: #111827;
  background: #111827;
  color: #fffdf8;
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(250px, 330px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-height: 0;
}

.item-list,
.form-panel {
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
}

.item-list {
  display: grid;
  gap: 8px;
  max-height: none;
  overflow: visible;
  padding: 10px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #111827;
}

.list-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.list-title strong {
  min-width: 0;
}

.list-title span {
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.collapse-btn {
  flex: 0 0 auto;
  min-height: 32px;
  border: 2px solid #111827;
  border-radius: 8px;
  padding: 5px 10px;
  background: #fffefa;
  color: #0f172a;
  box-shadow: 0 3px 0 #111827;
  font-size: 13px;
  font-weight: 900;
}

.collapse-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #111827;
}

.list-body {
  display: grid;
  gap: 8px;
}

.item-list.collapsed {
  align-content: start;
}

.collapsed-summary {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px dashed rgba(15, 23, 42, 0.22);
  border-radius: 8px;
  background: rgba(255, 248, 222, 0.74);
  color: #0f172a;
}

.collapsed-summary strong,
.collapsed-summary small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapsed-summary small {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.item-button {
  display: grid;
  gap: 3px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 2px solid rgba(15, 23, 42, 0.14);
  border-radius: 8px;
  background: #fffefa;
  color: #0f172a;
  box-shadow: 0 2px 0 rgba(15, 23, 42, 0.12);
  text-align: left;
}

.item-button.active {
  border-color: #111827;
  background: #fff2c7;
}

.item-button span,
.item-button small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-button span {
  font-size: 16px;
  font-weight: 900;
}

.item-button small {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.form-panel {
  padding: 14px;
}

.editor-form {
  display: grid;
  gap: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.choice-block {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #f8fafc;
}

.choice-block h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.outcome-editor {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.9);
}

.outcome-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.outcome-head strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
}

.outcome-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)) auto;
  gap: 8px;
  align-items: end;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
}

.outcome-note {
  min-width: 160px;
}

.skill-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
}

.outcome-empty,
.outcome-preview {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.outcome-preview {
  line-height: 1.45;
}

.mini-btn {
  min-height: 32px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-radius: 8px;
  padding: 5px 9px;
  background: #fffefa;
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.mini-btn.danger {
  border-color: rgba(185, 28, 28, 0.28);
  color: #b91c1c;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field span {
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 8px;
  padding: 10px 11px;
  background: #fffefa;
  color: #111827;
  font: inherit;
  line-height: 1.35;
}

.field textarea {
  resize: vertical;
}

.editor-fieldset {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #f8fafc;
}

.editor-fieldset legend {
  margin-bottom: 2px;
  padding: 0 6px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
}

.checkbox-field {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.checkbox-field span {
  flex: 0 0 auto;
}

.checkbox-field input[type="checkbox"] {
  width: auto;
  min-width: auto;
}

.compact-field {
  gap: 4px;
}

.compact-field input,
.compact-field select {
  padding: 8px 9px;
}

.editor-message,
.empty-panel {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  font-weight: 800;
}

.editor-message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.editor-message.success {
  background: #ecfdf5;
  color: #047857;
}

.empty-panel {
  border: 1px dashed rgba(15, 23, 42, 0.16);
  color: #64748b;
  text-align: center;
}

@media (max-width: 820px) {
  .editor-page {
    min-height: calc(100dvh - 76px);
  }

  .tool-header {
    align-items: flex-start;
  }

  .tool-title h2 {
    font-size: 22px;
  }

  .editor-workspace {
    grid-template-columns: 1fr;
  }

  .item-list {
    max-height: none;
  }
}

@media (max-width: 560px) {
  .tool-header {
    display: grid;
  }

  .tool-actions .compact-btn,
  .list-actions .list-action-btn {
    flex: 1 1 0;
  }

  .field-grid,
  .choice-grid {
    grid-template-columns: 1fr;
  }

  .outcome-row {
    grid-template-columns: 1fr;
  }

  .outcome-note {
    grid-column: auto;
  }

  .skill-row {
    grid-template-columns: 1fr;
  }

  .form-panel {
    padding: 10px;
  }
}
</style>

<style>
html.editor-scroll-unlocked,
body.editor-scroll-unlocked,
html.editor-scroll-unlocked #app {
  height: auto !important;
  min-height: 100svh !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

body.editor-scroll-unlocked .app-shell {
  height: auto !important;
  min-height: 100svh !important;
  grid-template-rows: auto auto !important;
  overflow: visible !important;
}
</style>
