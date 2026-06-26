# Railway 部署说明

本项目使用单个 Railway Web Service 部署：Express 后端启动 Socket.IO，并在生产环境托管 `client/dist` 前端静态文件。

## 从 GitHub 导入

1. 打开 Railway Dashboard。
2. 点击 New Project。
3. 选择 Deploy from GitHub repo。
4. 选择本项目仓库。
5. Root Directory 保持仓库根目录，也就是包含根 `package.json` 的目录。

## Railway 命令

Build Command:

```bash
npm run build
```

Start Command:

```bash
npm start
```

## 环境变量

通常不需要手动配置环境变量。

Railway 会自动提供 `PORT`，server 会读取 `process.env.PORT`。不要手动写死端口。

如需允许额外的跨域开发地址，可以设置 `CLIENT\_ORIGIN`，例如 `http://localhost:5173`。线上单服务同域部署不需要设置它。

## 部署后测试

1. 打开 Railway 提供的公开域名。
2. 确认首页可以正常加载。
3. 创建房间，复制邀请链接。
4. 在另一个浏览器窗口打开邀请链接并加入房间。
5. 双方选择职业，开始游戏。
6. 选择目标并投骰，确认两个窗口状态同步。
7. 刷新页面，确认前端路由不会 404。

## 常见问题

### PORT 问题

Railway 只会把外部流量转发到它提供的 `PORT`。server 必须监听 `process.env.PORT`，不能固定监听 `3001`。

### localhost 问题

生产环境的浏览器不能连接 `localhost:3001`，因为那会指向用户自己的设备。本项目生产环境使用 `io()` 同域连接 Railway 服务。

### Socket.IO 连接失败

检查浏览器 Network 面板里的 `/socket.io/` 请求：

* 如果请求去了 `localhost`，说明前端构建里仍有本地地址。
* 如果状态是 404，确认 Railway 使用的是单服务部署，并且 Start Command 是 `npm start`。
* 如果端口错误，确认 server 使用 `process.env.PORT`。
* 如果跨域报错，线上同域部署通常不需要 `CLIENT\_ORIGIN`；只有跨域访问时才需要配置它。

