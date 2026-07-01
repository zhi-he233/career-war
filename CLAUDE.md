# Career War — 项目架构文档

> 最后更新：2026-07-02 | 此文件是 AI Agent 的必读上下文

---

## 项目概览

**Career War（职业互怼）** 是一款回合制对战桌游，支持 1v1 / 2v2 / PvE Bot / PvE 肉鸽四种模式。当前架构为一个三层 monorepo，目标是将 Vue 3 前端迁移到 Cocos Creator。

---

## 目录结构

```
career-war/
├── shared/          # 纯 TypeScript 游戏逻辑引擎 (~2,900 行)
│   └── src/
│       ├── engine.ts           核心引擎：回合制、骰子系统、伤害结算
│       ├── types.ts            全部类型定义 (Room、Player、GameEvent...)
│       ├── skillOutcomes.ts    15 个角色全部技能结算
│       ├── combatMath.ts       伤害/护甲/治疗/护盾计算
│       ├── rogueliteDice.ts    肉鸽骰子词条引擎
│       ├── characterSkills.ts  角色技能查找表
│       ├── characters.ts       角色注册表
│       ├── summonerSkillOutcomes.ts  召唤师技能结算
│       ├── turnOrder.ts        回合顺序
│       ├── rollDecisions.ts    投骰决策
│       ├── index.ts            统一导出入口
│       └── data/               数据层（全部为纯 JSON 数据 + 类型）
│           ├── characters.ts / characters.generated.ts      15 个角色定义
│           ├── rogueliteBalance.ts / .generated.ts           敌人/Boss/奖励
│           ├── rogueliteEvents.ts / .generated.ts            20 个肉鸽事件
│           ├── rogueliteShop.ts / .generated.ts             商店物品
│           ├── rogueliteRestSites.ts / .generated.ts        休息站点
│           ├── rogueliteRoomTypes.ts                         房间类型/图标/标签
│           └── rogueliteMapRules.ts                          地图生成规则
│
├── server/          # Node.js + Express + Socket.IO (~3,500 行)
│   └── src/
│       ├── index.ts           主入口（~2,900行）：Express + 全部 Socket.IO 处理
│       ├── auth.ts            认证中间件 + REST 路由 (register/login/logout/me)
│       ├── db.ts              SQLite 数据库 (better-sqlite3)
│       ├── context.ts         ServerContext 接口
│       ├── constants.ts       服务器常量
│       ├── characterDataCache.ts    角色 JSON → 运行时缓存
│       ├── rogueliteDataCache.ts    肉鸽数据 JSON → 运行时缓存
│       ├── editor/            编辑器 API (角色/肉鸽数据编辑)
│       │   ├── characterEditor.ts
│       │   ├── rogueliteBalanceEditor.ts
│       │   ├── rogueliteEventsEditor.ts
│       │   ├── rogueliteRestSitesEditor.ts
│       │   └── rogueliteShopEditor.ts
│       ├── infrastructure/
│       │   ├── handle.ts      Socket.IO 错误处理
│       │   └── utils.ts       工具函数
│       ├── roguelite/
│       │   ├── enemyHelpers.ts    敌人生成/缩放
│       │   ├── rewardHelpers.ts   奖励创建/应用
│       │   └── rogueliteService.ts  肉鸽战斗结束/事件处理
│       └── services/
│           ├── roomService.ts     房间管理广播
│           └── gameService.ts     游戏验证/机器人生成
│
├── client/          # Vue 3 SPA (当前前端，将被 Cocos 替代)
│   └── src/
│       ├── App.vue            单页入口 + 全部房间管理 + socket 事件监听
│       ├── socket.ts          Socket.IO 客户端配置
│       ├── router.ts          7 条路由
│       ├── main.ts            入口
│       ├── composables/       全局组合式函数
│       │   ├── useAuth.ts
│       │   ├── useProfile.ts
│       │   ├── useEmote.ts
│       │   └── useDiceAnimation.ts
│       ├── components/
│       │   ├── HomePage.vue          主页
│       │   ├── PvpModePage.vue       模式选择
│       │   ├── LobbyPage.vue         选角大厅
│       │   ├── BattlePage.vue        战斗主界面 (~1679行)
│       │   ├── ProfilePage.vue       个人档案
│       │   ├── AuthDialog.vue        登录/注册弹窗
│       │   ├── RuleGuideDialog.vue   规则手册
│       │   ├── CareerDetailCard.vue  职业详情卡片
│       │   ├── battle/               战斗子组件
│       │   │   ├── CombatBoard.vue         座位网格
│       │   │   ├── BattleSeat.vue          单个座位
│       │   │   ├── DicePanel.vue           骰子面板
│       │   │   ├── ActionSlots.vue         动作槽
│       │   │   ├── SelfPanel.vue           己方状态 HUD
│       │   │   ├── EmotePanel.vue          表情面板
│       │   │   ├── BattleLogDrawer.vue     战斗日志
│       │   │   ├── PlayerDetailDialog.vue  玩家详情
│       │   │   ├── BattleUnitDetailCard.vue
│       │   │   ├── RogueliteRunMap.vue     肉鸽地图
│       │   │   ├── RogueliteMapNode.vue    肉鸽地图节点
│       │   │   ├── RoguelitePanel.vue      肉鸽详情抽屉
│       │   │   ├── RogueliteRewardChoice.vue  奖励选择
│       │   │   ├── RogueliteEventChoice.vue   事件选择
│       │   │   ├── RogueliteStatusCompact.vue 紧凑状态条
│       │   │   ├── RogueliteRoomPanel.vue     商店/休息面板
│       │   │   ├── types.ts                   ViewModel 接口定义
│       │   │   └── composables/
│       │   │       ├── useBattleUiState.ts
│       │   │       ├── useBattlePlayerHelpers.ts
│       │   │       ├── useBattleTexts.ts
│       │   │       └── useRogueliteViewModels.ts
│       │   ├── lobby/               大厅子组件
│       │   │   ├── LobbyTabs.vue
│       │   │   ├── PlayerListPanel.vue
│       │   │   ├── RoomSettingsPanel.vue
│       │   │   ├── SummonerSkillPanel.vue
│       │   │   ├── ClassicCharacterPicker.vue
│       │   │   ├── DuoSlotPicker.vue
│       │   │   ├── LobbyStartBar.vue
│       │   │   ├── RogueliteIntroPanel.vue
│       │   │   ├── CharacterDetailDialog.vue
│       │   │   ├── SummonerSkillDetailDialog.vue
│       │   │   └── lobbyData.ts
│       │   └── tutorial/
│       │       ├── FocusHint.vue
│       │       ├── useRogueliteTutorial.ts
│       │       └── rogueliteTutorial.ts
│       ├── styles/              7 个 CSS 文件 (~3,000 行)
│       ├── assets/art/          像素艺术 PNG
│       ├── types/profile.ts
│       ├── data/profileMock.ts
│       └── utils/id.ts
│
├── shared/          # 共享游戏引擎包（已在上面详述）
├── MIGRATION_ANALYSIS.md   # 迁移分析文档
└── CLAUDE.md               # 本文件
```

---

## 核心架构原则

### 1. 服务端授权 (Server-Authoritative)

服务器是**唯一权威源**。所有骰子投掷、伤害计算、回合推进都在服务器执行。客户端只是一个"带渲染的遥控器"：

```
用户操作 → socket.emit("rollDice")
         → 服务器调用 shared/engine.ts 的 rollForActivePlayer()
         → 服务器广播 gameStateUpdated（完整 Room 对象）
         → 客户端渲染新状态
```

**这意味着迁移到 Cocos 不会引入任何游戏逻辑 bug。** 因为游戏逻辑不在客户端执行。

### 2. 共享引擎 (shared/ 包)

`shared/` 包含全部游戏逻辑，纯 TypeScript，零外部依赖：
- 零 DOM API、零 Node.js API、零浏览器 API
- 唯一的外部依赖通过依赖注入：`DiceRoller`（随机数函数）、`IdFactory`（ID 生成函数）
- 使用 ES Module（`"type": "module"`），import 带 `.js` 扩展名

关键函数签名：

```typescript
// engine.ts — 核心引擎
createPlayer(id, clientId, nickname, isHost): Player
chooseCharacter(room, playerId, characterId): void
startGame(room, ctx: EngineContext): void
rollForActivePlayer(room, playerId, ctx, controllerId?): RollResult
selectTarget(room, playerId, targetId, controllerId?): void
confirmRollDecision(room, playerId, decisionId, choice, ctx, ...): void
resolveGuardCheck(room, actorId, ctx): RollResult
serializeRoom(room): Room

// EngineContext 接口（依赖注入）
interface EngineContext {
  now(): number;
  makeId(): string;
  rollDice(): number;  // 1-6
}

// combatMath.ts — 纯战斗数学
getCombatArmor(target, context): number
applyDamageToPlayer(target, damage, options): DamageResult
applyHealingToPlayer(player, amount, options): HealingResult

// skillOutcomes.ts — 技能结算
resolveSkill(characterId, roll, ...): SkillOutcome
```

### 3. 状态同步机制

**全量同步**（非增量）：每当游戏状态变化，服务器序列化整个 `Room` 对象并通过 `gameStateUpdated` 事件推送给所有客户端。`serializeRoom()` 使用 `JSON.parse(JSON.stringify(room))` 进行深拷贝。

客户端不需处理增量合并——收到新 Room 直接替换旧状态。

---

## Socket.IO 协议（完整 API 契约）

### 客户端 → 服务器（28 个 emit 事件）

```typescript
// 房间生命周期
"createRoom"         → { nickname, clientId, userId?, gameMode }
"joinRoom"           → { roomId, nickname, clientId, playerId?, userId? }
"resumeRoom"         → { roomId, clientId, playerId?, userId? }
"leaveRoom"          → {}
"kickPlayer"         → { playerId }

// 大厅阶段
"chooseCharacter"    → { characterId }
"chooseSummonerSkill" → { summonerSkillId }
"chooseDuoSlotCharacter" → { slotIndex: 0|1, characterId }
"chooseDuoSlotSummonerSkill" → { slotIndex: 0|1, summonerSkillId }
"updateRoomSettings" → Partial<RoomSettings>
"startGame"          → {}

// 战斗阶段
"selectActor"        → { actorId }         // 2v2 选择行动角色
"selectTarget"       → { targetId }
"rollDice"           → {}
"rollGuardCheck"     → {}                  // 山盾架盾判定
"confirmRollDecision" → { roomId, pendingDecisionId, choice, skillId?, summonerSkillId?, selfDamageAmount? }

// 肉鸽阶段
"chooseRogueliteReward"      → { rewardId }
"chooseRogueliteEventOption" → { choiceId: "a"|"b" }
"chooseRogueliteContinue"    → { choice, mapNode? }
"buyRogueliteShopItem"       → { itemId }
"useRogueliteRestAction"     → { actionId }
"leaveRogueliteRoom"         → {}

// 社交
"sendEmote"          → { emoteId }
"readyForRematch"    → {}
"requestRoomList"    → {}
"clientPing"         → { clientSentAt? }
```

### 服务器 → 客户端（8 个 on 事件）

```typescript
"characters"         → Character[]         // 连接时发送
"gameStateUpdated"   → Room                // 核心状态同步
"roomListUpdated"    → RoomListItem[]
"battleLogAdded"     → GameEvent           // 触发浮动效果
"playerEmote"        → PlayerEmoteEvent
"gameOver"           → { winnerId, winnerName }
"errorMessage"       → string
"kickedFromRoom"     → { roomId }
"clientPong"         → { clientSentAt, serverReceivedAt }
```

---

## 关键类型速查

```
RoomPhase = "lobby" | "battle" | "reward" | "roguelite_event"
          | "roguelite_shop" | "roguelite_rest" | "roguelite_continue" | "gameOver"
GameMode  = "classic" | "duo_2v2" | "pve_1v1" | "pve_roguelite"

Room {
  id, hostId, phase: RoomPhase, gameMode: GameMode
  players: Player[]       // 含 bot
  settings: RoomSettings
  battleLog: GameEvent[]
  effects: Effect[]       // 无敌等效果
  pendingRoll?, pendingRollDecision?   // 当前投骰状态
  pendingGuardCheck?                    // 山盾架盾判定
  roguelite?: RogueliteRunState        // 肉鸽运行状态
  // 2v2 字段:
  duoSlots?, controllerTurnOrder?, activeControllerId?, selectedActorId?
}

Player {
  id, clientId, nickname, isHost, isBot, isOnline
  characterId, hp, maxHp, shield, isDead, guarding
  summonerSkillId, summonerSkillCooldown
  flameMarks, zhaoZilongHitCount
  // 肉鸽字段:
  roguelitePerkStacks, rogueliteSkillStacks
  rogueliteFateTokens, rogueliteLowRollCharge, rogueliteConsecutiveLowRolls
  rogueliteEnemyInfo?, rogueliteBossId?, rogueliteBossState?
  duoControllerId?, teamId?, slotIndex?
}
```

---

## 迁移架构：Vue → Cocos Creator

### 目标架构

```
┌─────────────────────────────────────────────────┐
│                 Cocos Creator 项目               │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │HomeScene │ │LobbyScene│ │ BattleScene    │  │
│  │          │ │          │ │ (核心，最复杂)   │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
│              ↕ 事件总线 (EventTarget)            │
│  ┌─────────────────────────────────────────┐   │
│  │         GameManager (单例)               │   │
│  │  - 持有 Room 状态                        │   │
│  │  - 分发 CustomEvent 给各 UI 组件         │   │
│  │  - 桥接 UI 层和网络层                    │   │
│  └─────────────────────────────────────────┘   │
│              ↕                                  │
│  ┌─────────────────────────────────────────┐   │
│  │        NetworkManager (单例)             │   │
│  │  - socket.io-client 连接                │   │
│  │  - emitWithAck 封装                      │   │
│  │  - 断线重连                              │   │
│  └─────────────────────────────────────────┘   │
│              ↕                                  │
│  ┌─────────────────────────────────────────┐   │
│  │      shared/ 包 (纯逻辑引擎，直接引用)     │   │
│  │  - 类型定义、角色数据、战斗数学          │   │
│  │  - 客户端只读使用（UI 预览/验证）         │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                  ↕ Socket.IO
┌─────────────────────────────────────────────────┐
│            server/ (不动！)                      │
│  服务端授权 — 所有游戏逻辑在服务器执行            │
└─────────────────────────────────────────────────┘
```

### 关键设计决策

**ADR-1：服务端授权不变** — Cocos 客户端不执行游戏逻辑。所有骰子、伤害、结算在服务器完成。

**ADR-2：事件总线替代 Vue 响应式** — GameManager 继承 EventTarget，组件在 `onLoad` 订阅、`onDestroy` 取消。避免在 `update()` 中逐帧轮询。

**ADR-3：shared/ 通过 npm workspace 引用** — 保持单一事实来源。不复制代码。

**ADR-4：优先 Web 构建** — Socket.IO 在 Web 平台零适配。原生（iOS/Android）后续再考虑。

### 可直接复用的 client/ 代码

| 源文件 | 复用到 Cocos 的方式 |
|---|---|
| `composables/useBattlePlayerHelpers.ts` | `computed()` → `getXXX()` 普通方法 |
| `composables/useRogueliteViewModels.ts` | 同上，从 Room 到 ViewModel 的纯数据转换 |
| `composables/useBattleUiState.ts` | 状态机逻辑保留，去掉 Vue ref |
| `composables/useBattleTexts.ts` | 纯文案生成，直接复制 |
| `composables/useDiceAnimation.ts` | 状态机保留，`setTimeout` → `tween` |
| `components/battle/types.ts` | ViewModel 接口直接作为 Cocos 组件 props |
| `socket.ts` | 几乎照抄，`emitWithAck` 模式不变 |
| `App.vue` 房间管理函数 | 搬到 GameManager：`createRoom`、`joinRoom`、`tryResumeRoom`... |

### Battle 场景的 Prefab 拆分

```
Battle.scene
├── CombatBoard (玩家头像棋盘)
│   └── BattleSeat × N
├── DicePanel (骰子动画 + 动作槽)
│   └── ActionSlots
├── SelfPanel (自己状态 HUD)
├── EmotePanel (表情)
├── BattleLogDrawer (战斗日志抽屉)
├── PlayerDetailDialog (玩家详情弹窗)
├── RogueliteRunMap (肉鸽地图)
│   └── RogueliteMapNode × N
├── RogueliteRewardChoice (奖励选择)
├── RogueliteEventChoice (事件选择)
├── RogueliteRoomPanel (商店/休息)
├── RoguelitePanel (深度详情抽屉)
└── RogueliteStatusCompact (紧凑状态条)
```

---

## 迁移阶段规划

```
阶段 0 (2-3天):   项目搭建 — Cocos 项目、NetworkManager、GameManager、资产导入
阶段 1 (1-1.5周): 基础打通 — Home 场景、登录、模式选择、创建/加入房间
阶段 2 (1周):     大厅 — Lobby 场景、角色选择、召唤师技能、准备开始
阶段 3 (2-3周):   核心战斗 — Battle 场景、座位棋盘、骰子面板、动作槽、HUD
阶段 4 (1.5-2周): 肉鸽全套 — 地图、奖励、事件、商店、休息
阶段 5 (1-2周):   打磨 — 音效、特效、触控适配、性能优化
─────────────────────────────────────────
总计: 约 7-11 周
```

---

## 15 个角色速查

| ID | 名称 | 最大血量 | 难度 | 定位 |
|---|---|---|---|---|
| boxer | 拳手 | 10 | simple | attack |
| gunslinger | 枪手 | 8 | normal | attack |
| vampire | 吸血鬼 | 9 | normal | burst |
| zhaoZilong | 赵子龙 | 9 | normal | attack |
| assassin | 刺客 | 7 | normal | burst |
| paladin | 圣骑士 | 11 | normal | defense |
| berserker | 狂战士 | 10 | normal | attack |
| stone_titan | 巨石泰坦 | 12 | simple | defense |
| fearless_assassin | 无畏刺客 | 8 | complex | burst |
| execution_assassin | 处决刺客 | 8 | complex | special |
| self_destructor | 自爆人 | 8 | normal | special |
| war_knight | 战争骑士 | 11 | normal | defense |
| crescent_moon | 残月者 | 9 | normal | attack |
| fire_lord | 火焰领主 | 10 | complex | special |
| mountain_shield | 山盾 | 12 | normal | defense |

---

## 6 个表情

| ID | 标签 | 表情符号 |
|---|---|---|
| cry | 大哭 | 😭 |
| surprise | 惊讶 | 😮 |
| taunt | 嘲讽 | 😏 |
| angry | 愤怒 | 😡 |
| like | 点赞 | 👍 |
| question | 疑惑 | ❓ |

---

## 5 个召唤师技能

| ID | 名称 | 冷却回合 |
|---|---|---|
| lucky_plus_one | 幸运骰 | 2 |
| first_aid | 急救术 | 3 |
| iron_wall | 铁壁 | 3 |
| fate_reroll | 命运重掷 | 3 |
| last_stand | 破釜 | 3 |

---

## 开发环境

- 开发服务器: `localhost:3001`
- Vite 开发服务器: `localhost:5173`
- 生产环境: 服务器直接提供 `client/dist/` 静态文件
- 数据库: `server/data/career-war.db` (SQLite, WAL 模式)
- 认证: Cookie Session (7天有效期)
- 编辑器: 仅开发环境 / `ENABLE_EDITOR=true` 时启用

---

## 工作规则

1. **shared/ 不可引入外部依赖** — 保持纯 TypeScript
2. **游戏逻辑只在 server 执行** — 客户端不可信任客户端计算结果
3. **所有 socket 事件使用 Ack 模式** — `{ ok: true, ...data } | { ok: false, error: string }`
4. **状态同步是全量 Room 对象** — 通过 `gameStateUpdated` 推送
5. **修改 shared/ 后同时影响 server 和 client** — 需要确保两边兼容
6. **Cocos 迁移期间不修改服务器** — 保持 server API 稳定

---

## 强制编码工作流（防止返工、省Token、提高准确度）

> ⚠️ **每次写代码必须遵循此流程。跳过步骤是返工和浪费Token的根本原因。**

### 写代码前（必做）

**1. 任务规划 — 使用 `career-war-orchestrator`**

每次收到任务后，第一步不是写代码，而是调用 orchestrator 进行：
- 任务分类（UI / 逻辑 / 服务端 / 肉鸽数据）
- 明确允许改哪些文件、禁止改哪些文件
- 明确不改什么（Non-goals）
- 输出 Task Brief

> 原则：一次只做一件事。如果任务包含多个类别，拆成多个子任务分别执行。

**2. 复杂逻辑 — 使用 `prototype`（LOGIC分支）**

如果任务涉及以下任一种情况，**必须先建终端原型**：
- 新增角色技能逻辑
- 修改战斗结算（damage/heal/shield）
- 肉鸽词条叠加
- 状态机/回合顺序
- 任何你"不太确定"的逻辑

> 原型是 throwaway 代码，纯 TypeScript，在终端运行。跑通后再写正式代码。不要在 Cocos UI 里调试游戏逻辑。

**3. 复杂设计 — 使用 `codebase-design` + `grilling`**

如果是新模块或接口设计，先用 codebase-design 设计接口（小接口 + 深实现），再用 grilling 逼问边界情况。

### 写代码时（必做）

**4. 测试驱动 — 使用 `tdd`**

```
RED:   写一个测试 → 确认失败
GREEN: 写最少代码让测试通过
REFACTOR: 整理代码，测试仍然通过
```

- 一次只写一个测试，一次只实现一个功能
- 不要一次写5个测试再写5个实现（水平切片是坏的）
- 测试应该验证行为，不是验证实现细节
- shared/ 的纯函数（combatMath、skillOutcomes）最适合写测试

### 写代码后（必做）

**5. 自查 — 使用 `review`**

改完后立即自查两个问题：
- Standards：代码符合项目规范吗？改了不该改的文件吗？
- Spec：实现了用户要的功能吗？有没有漏掉需求？有没有多加不需要的东西？

**6. 验证 — 使用 `career-war-qa-regression`**

- 跑 `npm run build`（最小验证）
- 检查是否改了禁止文件
- 检查是否影响其他模式（PVP/肉鸽/2V2）

### 遇到Bug时

**7. 结构化诊断 — 使用 `diagnosing-bugs`**

- 不要猜！先建反馈循环（一个能复现bug的最小命令）
- 有反馈循环后，生成3-5个假设，逐个验证
- 修完后写回归测试

### Token节省原则

- 每次任务只读必要文件，不扫描整个项目
- 新会话比超长会话更省（一个阶段一个会话）
- 先定位再修改，不要一上来就改代码
- 回答控制在200字以内（只说改了什么、怎么测、还有什么问题）
- 小任务用小范围读取（三档读取权限：只看文档 / 看指定文件 / 最多5个文件）

---

## 相关文档

- [MIGRATION_ANALYSIS.md](MIGRATION_ANALYSIS.md) — 详细的迁移分析（代码复用率、风险点、工时评估）
