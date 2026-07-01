# Career War → Cocos Creator 迁移深度分析

> 分析日期：2026-07-02 | 基于完整代码审查

---

## 一、总览：三层的迁移结论

| 层 | 文件数 | 代码量 | 迁移结论 |
|---|---|---|---|
| **shared/** | 17 个源文件 | ~2,900 行 | ✅ **100% 直接复用** |
| **server/** | ~15 个源文件 | ~3,500 行 | ✅ **0 改动，纯后端** |
| **client/** | ~50 个源文件 + 7 个 CSS | ~6,000 行 TS + ~3,000 行 CSS | 🔄 **逻辑可复用 40%，UI 需重写** |

---

## 二、shared/ 包 —— 可直接搬走的宝藏

### 为什么能直接用？

shared/ 是纯 TypeScript 游戏逻辑引擎，**零外部依赖、零 DOM API、零 Node API**。唯一的"外部"依赖是 `DiceRoller` 和 `IdFactory` 两个函数接口，通过依赖注入传入。

```
shared/src/
├── engine.ts          (1728行) 核心引擎：回合制、骰子系统、伤害结算、胜负判定
├── types.ts           (397行)  全部类型定义：Room、Player、GameEvent 等
├── skillOutcomes.ts   (248行)  15个角色全部技能结算
├── combatMath.ts      (113行)  伤害/护甲/治疗/护盾计算
├── rogueliteDice.ts   (82行)   肉鸽骰子词条引擎
├── characterSkills.ts (47行)   角色技能查找表
├── characters.ts      (34行)   角色注册表
├── turnOrder.ts       (21行)   回合顺序
├── rollDecisions.ts   (66行)   投骰决策
├── summonerSkillOutcomes.ts (87行) 召唤师技能结算
└── data/              (8个文件) 数据层：15个角色、8个敌人、5个Boss、34个奖励、20个事件...
```

### 在 Cocos Creator 中的使用方式

```typescript
// 方式一：npm workspace（推荐，支持热更新）
// 在 Cocos 项目的 package.json 中：
{ "dependencies": { "@career-war/shared": "file:../shared" } }

// 方式二：tsconfig paths 别名
// tsconfig.json:
{ "compilerOptions": { "paths": { "@career-war/shared": ["../shared/src"] } } }

// 使用时直接 import：
import { startGame, rollForActivePlayer, createPlayer, type Room } from "@career-war/shared";

// 注：Cocos Creator 3.8.8 支持 npm 包和 tsconfig paths
```

### 唯一需要适配的：注入上下文

```typescript
// 服务器端注入（已有）：
const serverContext = {
  now: () => Date.now(),
  makeId: () => crypto.randomUUID(),
  rollDice: () => Math.floor(Math.random() * 6) + 1
};

// Cocos 客户端注入（客户端只读验证/预览用）：
const clientContext = {
  now: () => Date.now(),
  makeId: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rollDice: () => Math.floor(Math.random() * 6) + 1
};

// 注意：客户端不应该信任自己的骰子结果！
// 游戏权威在服务器，客户端只在 UI 预览时使用引擎
```

---

## 三、server/ —— 完全不动

服务器是"房间里的大象"——它承担了全部游戏权威计算。Cocos 客户端只是一个"带渲染的遥控器"。

### 服务器职责（无需改动）

- ✅ Socket.IO 事件处理（28个客户端事件、8个服务端事件）
- ✅ 房间管理（创建/加入/重连/清理）
- ✅ 游戏引擎调用（掷骰、结算、回合推进）
- ✅ Bot AI（最小化：选目标→掷骰→用技能→攻击）
- ✅ 肉鸽元游戏（地图生成、敌人选择、奖励发放）
- ✅ 认证（REST API + Cookie Session）
- ✅ 编辑器 API（角色/肉鸽数据编辑）

### 客户端需要的 Socket 协议（已完整定义）

```
客户端 → 服务器（28个 emit 事件）：
  createRoom, joinRoom, resumeRoom, leaveRoom, kickPlayer,
  chooseCharacter, chooseSummonerSkill, chooseDuoSlotCharacter,
  chooseDuoSlotSummonerSkill, startGame, updateRoomSettings,
  selectActor, selectTarget, rollDice, rollGuardCheck,
  confirmRollDecision, readyForRematch,
  chooseRogueliteReward, chooseRogueliteEventOption,
  chooseRogueliteContinue, buyRogueliteShopItem,
  useRogueliteRestAction, leaveRogueliteRoom,
  sendEmote, requestRoomList, clientPing

服务器 → 客户端（8个 on 事件）：
  characters, gameStateUpdated, roomListUpdated, battleLogAdded,
  playerEmote, gameOver, errorMessage, kickedFromRoom, clientPong
```

**核心同步机制**：`gameStateUpdated` 推送完整 Room 对象（序列化后），Cocos 客户端收到后刷新全部 UI。没有增量更新，模型极其简单。

---

## 四、client/ —— 什么可以迁移，什么必须重写

### 4.1 可以直接复用的代码（TypeScript 逻辑层）

#### 第一梯队：纯逻辑组合式函数（~800 行，直接搬）

这些文件**不依赖 Vue 响应式系统之外的任何 DOM/浏览器 API**，可以轻松移植：

| 文件 | 行数 | 功能 | Cocos 适配方式 |
|---|---|---|---|
| `composables/useBattlePlayerHelpers.ts` | 147 | 玩家显示数据计算 | `computed()` → `getXXX()` 方法，在 `update()` 中手动调用 |
| `components/battle/composables/useRogueliteViewModels.ts` | 394 | 肉鸽面板 ViewModel | 同上，纯数据转换逻辑 |
| `components/battle/composables/useBattleTexts.ts` | ~80 | 战斗文案生成 | 直接复制粘贴 |
| `components/battle/composables/useBattleUiState.ts` | ~200 | 战斗 UI 状态机 | 状态机逻辑保留，去掉 Vue ref |

#### 第二梯队：网络层（~100 行，几乎直接搬）

```typescript
// socket.ts 的逻辑直接映射到 Cocos NetworkManager：
import { io, Socket } from "socket.io-client"; // npm 包，Cocos Web 构建可用

export class NetworkManager {
  private static instance: NetworkManager;
  private socket: Socket;
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();

  // emitWithAck 模式直接保留
  emitWithAck<T>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, payload, (response: Ack<T>) => {
        if (!response.ok) reject(new Error(response.error));
        else resolve(response as T);
      });
    });
  }
}
```

#### 第三梯队：ViewModel 类型定义（直接复用）

[types.ts](client/src/components/battle/types.ts) 中定义的 `SeatViewModel`、`DicePanelProps`、`ActionSlotVM`、`SelfPanelVM`、`RoguelitePanelVM` 等接口完全是纯数据描述，不需要任何修改。

#### 第四梯队：动画状态机逻辑（保留状态机，换掉实现）

`useDiceAnimation.ts` 的状态机逻辑非常清晰：

```
idle → fast(55ms) → slow(110ms) → pause → reveal → idle
```

在 Cocos 中用 `tween` 重写：

```typescript
// Cocos 版骰子动画状态机
export class DiceAnimator {
  private phase: 'idle' | 'fast' | 'slow' | 'pause' | 'reveal' = 'idle';
  private currentFace: number = 1;
  private fastTimer: number = 0;
  private tickInterval: number = 0.055; // 55ms

  startAnimation(onReveal: () => void) {
    this.phase = 'fast';
    this.tickInterval = 0.055;
    // 0.24s 后 → slow
    this.scheduleOnce(() => { this.phase = 'slow'; this.tickInterval = 0.110; }, 0.24);
    // 0.50s 后 → pause
    this.scheduleOnce(() => { this.phase = 'pause'; }, 0.50);
    // 0.68s 后 → reveal
    this.scheduleOnce(onReveal, 0.68);
  }

  update(dt: number) {
    if (this.phase === 'fast' || this.phase === 'slow') {
      this.fastTimer += dt;
      if (this.fastTimer >= this.tickInterval) {
        this.fastTimer = 0;
        this.currentFace = Math.floor(Math.random() * 6) + 1;
      }
    }
  }
}
```

### 4.2 不能复用、但可以提供清晰规格的东西

| 原始实现 | 提供的规格 | Cocos 重构指导 |
|---|---|---|
| 7 个 CSS 文件 (~3000行) | 完整的设计语言（颜色、圆角、阴影、动画） | Cocos UI 系统 + 材质 |
| 45 个 `.vue` 组件 | 完整的组件树和交互规格 | Cocos Prefab 体系 |
| Vue Router 路由 | 7 种导航状态 + 转换条件 | Cocos `director.loadScene()` |
| Vue `ref()` / `computed()` | 精确的响应式依赖图 | Cocos Component `update()` + 事件总线 |
| CSS animations (@keyframes) | 动画时长、缓动函数、关键帧 | Cocos `tween` / Spine / 序列帧 |
| 30+ PNG 资产 | 精灵尺寸、像素风格参数 | 导入 Cocos Asset Database |

### 4.3 推荐的事件总线设计（替代 Vue 响应式）

```typescript
// GameManager.ts — 单例，桥接 NetworkManager 和 UI
export class GameManager extends EventTarget {
  private static instance: GameManager;
  private _room: Room | null = null;
  private _playerId: string = "";

  // 当 socket 收到 gameStateUpdated 时调用
  applyRoomUpdate(room: Room) {
    this._room = room;
    this.dispatchEvent(new CustomEvent('roomUpdate', { detail: room }));
    // 细粒度事件
    if (room.phase !== this._prevPhase) {
      this.dispatchEvent(new CustomEvent('phaseChange', { detail: room.phase }));
    }
  }

  get room(): Room | null { return this._room; }
  get me(): Player | undefined { return this._room?.players.find(p => p.id === this._playerId); }

  // 各组件在 onLoad 中订阅，onDestroy 中取消
}

// BattleSeat.ts — 组件订阅自己关心的数据
@ccclass('BattleSeat')
export class BattleSeat extends Component {
  private playerId: string = "";

  onLoad() {
    GameManager.instance.addEventListener('roomUpdate', this.onRoomUpdate);
  }

  onDestroy() {
    GameManager.instance.removeEventListener('roomUpdate', this.onRoomUpdate);
  }

  // 或者更简单：在 update() 中对比快照
  update() {
    const player = GameManager.instance.room?.players.find(p => p.id === this.playerId);
    if (!player) return;
    if (player.hp !== this._lastHp) {
      this.refreshHp(player.hp);
      this._lastHp = player.hp;
    }
  }
}
```

---

## 五、迁移优先级和工时评估（修正版）

### 阶段 0：项目搭建（2-3天）

- [ ] 创建 Cocos Creator 3.8.8 项目，配置 TypeScript
- [ ] 配置 npm workspace 或 tsconfig paths 引用 shared/ 包
- [ ] 实现 `NetworkManager` 单例（Socket.IO 连接、事件收发、断线重连）
- [ ] 实现 `GameManager` 单例（持有 Room、事件总线）
- [ ] 实现 `AuthManager`（REST API 封装）
- [ ] 设定设计分辨率 750×1334，Canvas 适配
- [ ] 导入像素艺术资产（34 个角色精灵 + 30 个 UI 资产）

### 阶段 1：基础场景打通（1-1.5周）

- [ ] **Home.scene**：骰子 CTA 按钮、模式卡片、道具交互
- [ ] **AuthDialog**：登录/注册 UI
- [ ] **Modes.scene**（可选）：经典/PvE 模式选择、房间列表、快速加入
- [ ] **Profile.scene**：个人档案（如需要）
- [ ] 完整打通：启动 → 登录 → 创建房间 → 加入大厅

### 阶段 2：大厅 + 角色选择（1 周）

- [ ] **Lobby.scene**：房间信息、玩家列表、设置面板
- [ ] **ClassicCharacterPicker**：翻页角色网格
- [ ] **SummonerSkillPanel**：召唤师技能选择
- [ ] **DuoSlotPicker**：2v2 双角色选择器
- [ ] **CharacterDetailDialog**：角色详情弹窗
- [ ] 房间权限（房主 vs 普通玩家）
- [ ] 完整打通：选角 → 准备 → 开始战斗

### 阶段 3：战斗核心（2-3 周，最复杂）

- [ ] **Battle.scene** 框架布局（顶层→底部：战斗区域→动作中心→底部栏）
- [ ] **CombatBoard + BattleSeat**：座位网格，含 HP/护盾/状态/表情气泡
- [ ] **DicePanel**：骰面显示、动画状态机、投骰按钮
- [ ] **ActionSlots**：动作槽（普攻/技能/召唤师技能）
- [ ] **SelfPanel**：己方状态 HUD
- [ ] 浮动伤害/治疗/格挡数字（tween 弹出动画）
- [ ] **EmotePanel**：6 个表情按钮 + 气泡
- [ ] **BattleLogDrawer**：战斗日志滚动列表
- [ ] **PlayerDetailDialog**：玩家详情弹窗
- [ ] 2v2 布局适配（双队伍列、选行动者）
- [ ] PvE 布局适配（左侧己方 vs 右侧敌人）

### 阶段 4：肉鸽全套（1.5-2 周）

- [ ] **RogueliteRunMap**：全屏地图，SVG 曲线路径→ Cocos Graphics
- [ ] **RogueliteMapNode**：7 种类型节点（普通/精英/Boss/事件/商店/休息/奖励）
- [ ] 地图交互（拖拽/缩放/选路）
- [ ] **RogueliteRewardChoice**：奖励三选一界面
- [ ] **RogueliteEventChoice**：事件二选一界面
- [ ] **RogueliteRoomPanel**：商店/休息行动面板
- [ ] **RoguelitePanel**：深度详情抽屉（词条/Boss状态/敌人信息）
- [ ] **RogueliteStatusCompact**：紧凑状态条

### 阶段 5：打磨（1-2 周）

- [ ] 骰子动画增强（序列帧或 3D 骰子旋转）
- [ ] 伤害飘字增强（暴击放大、颜色区分治疗/格挡）
- [ ] 技能特效（角色技能触发时的粒子/闪光）
- [ ] 音效集成（掷骰、攻击、技能、Boss 战、胜利）
- [ ] 移动端触控适配
- [ ] 性能优化（对象池、drawCall 合并）
- [ ] 教程引导（肉鸽新手引导的第一步）

**总计：约 6-10 周**（取决于是否全部实现肉鸽编辑器）

---

## 六、风险点和注意事项

### 6.1 Socket.IO 在 Cocos 中

- **Web 构建**：直接 `npm install socket.io-client`，和 Vue 版一模一样
- **原生构建（iOS/Android）**：可能需要额外的 JavaScriptCore polyfill 或使用原生 Socket 插件。**建议先只做 Web 构建，待验证后再考虑原生**

### 6.2 shared/ 包的引用

Cocos Creator 3.8.8 支持 npm 包。但 `shared/` 使用 `.js` 扩展名的 ESM import（`import { ... } from "./engine.js"`），需要确认 Cocos 的模块解析是否兼容。如果不兼容：

```typescript
// 方案A：在 shared/tsconfig.json 中去掉 .js 扩展名
// 方案B：直接在 Cocos 项目中用相对路径 import
// 方案C：把 shared/src/ 整个复制到 Cocos 项目的 assets/scripts/shared/
```

### 6.3 像素艺术资产

当前资产是 128×128 和 64×64 的 PNG。Cocos Creator 中需要确认：
- 纹理导入设置（Filter Mode: Point，不要线性过滤）
- Sprite 锚点位置
- 设计分辨率下的缩放比例

### 6.4 肉鸽地图 SVG 曲线

当前用 `<svg>` 的 `<path>` 元素渲染节点间曲线。在 Cocos 中需要用：
- `cc.Graphics` 组件动态绘制贝塞尔曲线
- 或预先制作曲线精灵，旋转拼接

### 6.5 字体

当前是系统字体的像素艺术风格。Cocos 中需要：
- 使用 BitmapFont（推荐，性能好）
- 或系统字体 + Label 组件
- 注意中文字符集

---

## 七、可以直接复用的代码清单（优先级排序）

### 直接复制，零修改：

1. **shared/ 全部 17 个源文件** — 游戏引擎
2. **`client/src/components/battle/types.ts`** — ViewModel 接口定义
3. **`client/src/components/battle/composables/useBattlePlayerHelpers.ts`** — 去掉 Vue `computed`，改成普通函数
4. **`client/src/components/battle/composables/useRogueliteViewModels.ts`** — 同上
5. **`client/src/components/battle/composables/useBattleTexts.ts`** — 纯文案生成
6. **`client/src/components/lobby/lobbyData.ts`** — 大厅数据

### 保留逻辑，改实现：

7. **`client/src/socket.ts`** — Socket.IO 连接配置，直接照抄
8. **`client/src/composables/useDiceAnimation.ts`** — 状态机保留，tween 重写
9. **`client/src/composables/useEmote.ts`** — 表情冷却逻辑保留
10. **`client/src/composables/useAuth.ts`** — REST API 调用逻辑保留
11. **`client/src/App.vue` 的房间管理函数** — `createRoom`、`joinRoom`、`leaveRoom`、`tryResumeRoom` 等可以直接搬到 GameManager

### 提供精确 UI 规格（不搬代码）：

12. **全部 45 个 .vue 组件** — 作为 UI 规格文档
13. **全部 7 个 CSS 文件** — 作为设计系统参考

---

## 八、架构决策记录

### ADR-1：服务端授权不变
**决定**：Cocos 客户端不执行任何游戏逻辑。所有骰子、伤害、结算在服务器完成。
**理由**：当前架构的服务器是唯一权威源。这保证了迁移期间不会引入游戏逻辑 bug。

### ADR-2：用事件总线替代 Vue 响应式
**决定**：GameManager 作为 EventTarget 分发状态变更事件，UI 组件订阅。
**理由**：Cocos 没有 Vue 的自动依赖追踪。显式事件比 `update()` 轮询更高效。

### ADR-3：优先 Web 构建，暂不做原生
**决定**：第一阶段只做 Web 构建。
**理由**：Socket.IO 在 Web 上无需适配；原生需要额外处理网络层。验证核心玩法后再考虑原生。

### ADR-4：shared/ 包通过 npm workspace 引用
**决定**：使用 npm workspace 或 tsconfig paths，不复制代码。
**理由**：保持单一事实来源。shared/ 的修改自动生效于 Cocos 项目。

---

## 九、总代码复用率评估

```
总客户端代码量（含样式）：     ~9,000 行
可直接复用的 TS 逻辑：        ~1,200 行 (13%)
保留逻辑改实现的代码：         ~800 行   (9%)
需完全重写的 UI + 样式：      ~7,000 行 (78%)
服务器代码：                  0 行改动
共享引擎：                    0 行改动
```

**核心结论**：虽然 78% 的客户端代码（Vue 模板 + CSS）需要完全重写，但 **22% 的纯逻辑代码可以直接复用**，加上 **服务器和共享引擎的 0 改动**，整体项目的代码复用率超过 **60%**。
