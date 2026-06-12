# 职业互怼

手机端 H5 联机桌游 MVP。前端使用 Vue 3 + Vite，后端使用 Node.js + Express + Socket.IO，房间状态暂存在服务器内存中，游戏规则集中在 `shared` 包。

## 项目结构

```text
career-war/
├─ client/   Vue 3 + Vite 手机端页面
├─ server/   Express + Socket.IO 联机服务
├─ shared/   共用类型、职业数据、规则引擎
├─ docs/     规则文档和开发记录
└─ README.md
```

## 安装依赖

```bash
npm install
```

## 本地启动

```bash
npm run dev
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:3001

## 双窗口测试联机

1. 打开第一个浏览器窗口访问 `http://localhost:5173`。
2. 输入昵称，点击“创建房间”，记住房间号。
3. 打开第二个浏览器窗口或无痕窗口访问同一地址。
4. 输入另一个昵称和房间号，点击“加入房间”。
5. 两个玩家都选择职业。
6. 房主点击“开始游戏”。
7. 当前行动玩家选择目标后点击“投骰”，所有窗口会同步状态和战斗日志。

## 常用脚本

```bash
npm run dev        # 同时启动 client 和 server
npm run typecheck  # 检查三个包的 TypeScript 类型
npm run build      # 构建 shared、server、client
```

## MVP 说明

- 服务器负责投骰、技能结算、伤害、治疗、死亡和胜负判断。
- 前端只负责展示状态和发送玩家操作。
- 当前没有数据库，刷新页面会断开当前 socket 身份，服务器重启会清空房间。
- 每次行动前会保存一份游戏快照到 `room.snapshots`，为后续撤销类职业预留。
