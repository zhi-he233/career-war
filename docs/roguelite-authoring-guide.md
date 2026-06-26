# 肉鸽内容填写说明

这几份文档是给策划内容用的。你只需要改 `docs/` 里的 Markdown 表格和说明，不需要写代码。

## 你可以写什么

* 问号事件剧情
* 事件选项
* 事件奖励
* 事件代价
* 商店商品
* 商店价格
* 休息点效果
* 精英 / Boss 主题想法
* 地图路线建议

## 你不要写什么

* TypeScript 代码
* Vue 代码
* 服务端代码
* engine 结算逻辑
* 复杂公式
* 随机算法

## 怎么填

1. 每一行写一个事件、商品、休息行为或路线建议。
2. `id` 用英文小写和下划线，例如 `overtime\_invite`。
3. 文案可以写中文，越具体越好。
4. 效果先写成自然语言，例如“回复少量生命”“获得一个普通成长”。
5. 不确定数值时可以写“少量 / 中量 / 大量”，后续再由 Codex 翻译成游戏数据。
6. 不要删除表头。如果暂时没有内容，可以新增一行写“待定”。

## 推荐填写顺序

1. 先读 `docs/roguelite-room-types.md`，理解每种房间是什么。
2. 再填 `docs/roguelite-events.md` 的问号事件。
3. 然后填 `docs/roguelite-shop.md` 和 `docs/roguelite-rest-sites.md`。
4. 最后在 `docs/roguelite-map-rules.md` 里写路线节奏建议。

## 交付方式

直接改 Markdown 文件即可。Codex 后续会把这些表格翻译成 TypeScript 数据。

