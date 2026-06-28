# 职业互怼 · Career War

H5 手机端联机回合制桌游。玩家选择职业、投骰对战，服务器结算伤害/治疗/护盾/死亡。支持经典混战、2v2 组队、单人 PvE 和肉鸽爬塔四种模式。

**在线试玩：** 部署后通过 Railway 公开域名访问，手机浏览器或桌面均可。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Vite（手机竖屏优先） |
| 后端 | Node.js + Express + Socket.IO |
| 规则共享 | shared 包（engine.ts + characters.ts + 数据文件） |
| 部署 | Railway / Docker + Caddy（VPS） |
| 存储 | 服务器内存（当前无数据库） |

## 项目结构

```
career-war/
├── client/          Vue 3 + Vite 手机端页面
│   └── src/components/battle/   战斗、地图、事件、商店 UI 组件
├── server/          Express + Socket.IO 联机服务
│   └── src/index.ts              房间管理、回合流程、肉鸽引擎
├── shared/          前后端共用
│   └── src/
│       ├── types.ts              类型定义
│       ├── engine.ts             规则引擎
│       ├── characters.ts         15 个职业数据
│       └── data/                 肉鸽策划表 TS 数据源
├── docs/            项目文档、规则记录、肉鸽策划表
│   ├── PROJECT_BRIEF.md          项目总览
│   ├── RULES.md                  完整规则（15 职业 + 4 模式）
│   ├── TODO.md                   当前待办
│   ├── roguelite-balance.md      肉鸽数值策划表
│   ├── roguelite-events.md       肉鸽事件策划表
│   ├── roguelite-shop.md         肉鸽商店策划表
│   ├── roguelite-rest-sites.md   肉鸽休息点策划表
│   ├── roguelite-room-types.md   肉鸽房间类型说明
│   ├── roguelite-map-rules.md    肉鸽地图规则
│   ├── roguelite-authoring-guide.md  策划填写指南
│   ├── DEPLOY_RAILWAY.md         Railway 部署指南
│   └── DEPLOY_VPS.md             VPS 部署指南
└── README.md
```

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（同时启动前后端）
npm run dev

# 类型检查
npm run typecheck

# 生产构建
npm run build
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001

## 双窗口测试

1. 窗口 A 打开 `http://localhost:5173`，创建房间，记住房间号。
2. 窗口 B（无痕）打开同一地址，输入房间号加入。
3. 双方选职业 → 房主开始游戏 → 轮流投骰，状态实时同步。

## 游戏模式

| 模式 | 人数 | 说明 |
| --- | --- | --- |
| **classic** | 2-6 人 | 经典混战，各自为战 |
| **duo_2v2** | 4 人 | 2v2 组队，每人双控两个角色 |
| **pve_1v1** | 1 人 | 单人对抗 AI |
| **pve_roguelite** | 1 人 | 肉鸽爬塔，15 关，每关三选一成长，地图含多种节点 |

## 职业（15 个）

| 职业 | 血量 | 定位 | 特点 |
| --- | --- | --- | --- |
| 拳手 | 20 | 攻击 | 无技能，骰点即伤害 |
| 枪手 | 18 | 爆发 | 6 点三倍伤害，1 点复制上家 |
| 吸血鬼 | 15 | 治疗 | 吸血回复，溢出转护盾 |
| 赵子龙 | 20 | 攻击 | 无视护盾，连续命中触发龙胆回复 |
| 刺客 | 15 | 爆发 | 伤害 +1，1 点造成 3 伤 |
| 圣骑士 | 20 | 防御 | 4 点全员无敌 + 自获护盾 |
| 狂战士 | 10 | 爆发 | 残血时伤害极高 |
| 巨石泰坦 | 30 | 防御 | 低点无伤，高点爆发 |
| 刺客（无畏） | 15 | 爆发 | 血越满伤害越高 |
| 刺客（斩） | 15 | 攻击 | 收割残血，低血斩杀 |
| 自爆人 | 20 | 爆发 | 扣自己血换双倍伤害 |
| 战争骑士 | 20 | 防御 | 护甲 +1，3 点可选回复 |
| 残月者 | 15 | 爆发 | 初始 3 血，每回合回血 + 高伤害 |
| 火焰领主 | 16 | 攻击 | 叠火焰印记，按 6 引爆 |
| 山盾 | 25 | 防御 | 架盾保护全队 |

## 召唤师技能

| 技能 | 冷却 | 效果 |
| --- | --- | --- |
| 幸运 +1 | 2 回合 | 下次投骰 +1（≤6） |
| 急救 | 0 | 回复 3 生命 |
| 铁壁 | 0 | 获得 3 护盾 |
| 命运重投 | 0 | 重投当前骰子 |
| 绝境 | 0 | 本回合血量不降到 1 以下 |

## 肉鸽模式

15 关爬塔，每关胜利后三选一成长奖励。地图随机生成多条路线，包含：

- ⚔️ 普通战斗 / 💀 精英 / 👑 Boss
- ❓ 问号事件（20 个）
- 🛒 商店（20 个商品，金币购买）
- 🔥 休息点（构筑选择）
- 🎁 奖励房

第 9 回合起狂化机制启动，双方伤害递增。详细数值见 `docs/roguelite-*.md`。

## 文档导航

| 想做什么 | 看哪个文件 |
| --- | --- |
| 了解项目全貌 | [PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) |
| 查职业规则 | [RULES.md](docs/RULES.md) |
| 看待办事项 | [TODO.md](docs/TODO.md) |
| 设计肉鸽内容 | [roguelite-authoring-guide.md](docs/roguelite-authoring-guide.md) |
| 调肉鸽数值 | [roguelite-balance.md](docs/roguelite-balance.md) |
| 写肉鸽事件 | [roguelite-events.md](docs/roguelite-events.md) |
| 配商店商品 | [roguelite-shop.md](docs/roguelite-shop.md) |
| 部署到 Railway | [DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md) |
| 部署到 VPS | [DEPLOY_VPS.md](docs/DEPLOY_VPS.md) |

## 设计原则

- 服务器负责投骰和结算，前端只展示和发送操作。
- 规则逻辑集中在 `shared/engine.ts`，不在 socket 事件里写规则。
- 手机竖屏优先，组件适配 320-430px 宽度。
- 策划内容先改 `docs/` Markdown，再由程序同步到 `shared/src/data/` TS 数据源。

## 部署

支持 Railway 一键部署和 Docker + Caddy VPS 部署，详见 `docs/DEPLOY_RAILWAY.md` 和 `docs/DEPLOY_VPS.md`。

## License

MIT
