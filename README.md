# dsh-session-status-filter

DeepSeek Harness（DSH）左侧工作区的**会话状态筛选**插件：按「运行中 / 待确认 / 未读」筛选会话，带实时计数与行尾状态徽标。

![icon](./icon.svg)

## 功能

- 工具栏下方一排 chip：**全部 / 运行中 / 待确认 / 未读**，各带实时计数
- 点击 chip → 下方列出该状态下的**全部**会话（工作区名 · 标题 · 相对时间），点击即打开
- 行尾小圆点徽标：🟢运行中 · 🟠待确认 · 🔵未读（多状态叠加为双色点）
- 样式全部使用 `--dsw-alias-*` 主题 token，跟随深浅色主题

## 安装

在 DSH 的插件管理里安装：

```bash
dsh plugin install dsh-session-status-filter
```

或在 `plugin_manager` 里 `install_bundle` 该包名。

## 数据来源（只读官方服务）

| 状态 | 来源 |
|---|---|
| 运行中 | `ctx.sessions.list` 的 `running` + `uiSession.sessionStatus` |
| 待确认 | `uiSession.sessionStatus.pendingInteraction`（审批 / 计划审查 / 提问） |
| 未读 | `uiSession.sessionStatus.completionUnread`（后台完成且不在当前视图） |

不写入任何会话状态，卸载即完全恢复。

## 为什么筛选结果是自绘列表

官方侧边栏对**折叠的工作区**和组内**“显示更多”**不渲染会话行，第三方插件无法用 CSS 让它们出现。
因此本插件自行渲染筛选结果，保证「数字 = 能看到的结果条数」；筛选期间隐藏官方列表，避免同屏两套。

## 已知限制

- 「未读」遵循官方语义：完成时你不在看它才算未读，切回该会话即清零
- 已归档会话不参与筛选（与官方列表一致）
- 子代理（subagent）会话被排除
- 筛选激活时官方列表隐藏，关闭后恢复

## 开发

```bash
node test-logic.mjs   # 纯逻辑自测（计数 / 筛选 / 排序 / 时间格式）
```

## 许可

MIT
