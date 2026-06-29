# personal-pm

自动活动监测 + 工时记录，集成 Super Productivity。

## 这是什么

在 Windows 上用 Super Productivity 管理任务，ActivityWatch 自动追踪你在做什么，脚本把时间写回 SP。

```
你在 SP 里规划任务 → AW 自动记录活动 → 脚本汇总写入 SP 工时
```

不用手动按计时器，不用回忆今天干了什么。

## 架构

```
Windows 11 本地
├── Super Productivity    ← 任务 / 日历 / Focus Mode
├── ActivityWatch         ← 窗口追踪 / 浏览器URL / AFK 检测
├── SP 插件 task-signal   ← 监听任务变化，输出当前状态
└── Python 桥接脚本       ← 读 AW 数据 → 按分类汇总 → 写入 SP
```

## 为什么用 ActivityWatch

自己写窗口检测要处理很多边缘情况：轮询精度、空闲判断、浏览器 URL 获取。ActivityWatch（18K+ stars）已经做好了这些：

| 能力 | 说明 |
|---|---|
| 窗口追踪 | 进程名 + 窗口标题 |
| 浏览器 URL | Chrome 扩展，知道具体网址 |
| AFK 检测 | 键鼠监控，自动标记离开时间 |
| 数据合并 | 相邻相同事件自动合并，节省存储 |

## 组件

### task-signal 插件

Super Productivity 插件，监听任务 hooks：

- `TASK_CREATED` — 新建任务
- `TASK_COMPLETE` — 完成任务
- `TASK_DELETE` — 删除任务
- `TASK_UPDATE` — 任务变更
- `CURRENT_TASK_CHANGE` — 切换当前任务

触发时输出 `tasks-signal.json`，包含当前任务列表和活动任务 ID。

### 桥接脚本 (开发中)

Python 脚本，流程：

```
ActivityWatch (aw-client)
  ↓ 读取今日窗口事件 + Web 事件
过滤 AFK 时间
  ↓
按 编程/浏览器/文档/沟通/摸鱼 分类
  ↓
SP REST API PATCH /tasks/:id
  ↓
SP 界面显示工时
```

### 可选扩展

- 走神提醒：摸鱼超 5 分钟弹通知
- 周报：HTML 可视化报告
- 早安摘要：启动时打印今日计划

## Super Productivity REST API

SP 桌面版暴露本地 REST API（`http://127.0.0.1:3876`），已验证支持：

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/tasks` | 查询任务 |
| POST | `/tasks` | 创建任务 |
| PATCH | `/tasks/:id` | 更新任务（含 timeSpent） |
| GET | `/projects` | 项目列表 |
| GET | `/tags` | 标签列表 |

timeSpent 是累计值（毫秒），需先 GET 当前值再加增量。

## 技术选型依据

基于 SP 源码 + 社区项目交叉验证（2026-06-29）：

- Plugin hooks：`packages/plugin-api/src/types.ts` — 5 个 hooks 全部存在
- REST API：`local-rest-api-handler.service.ts` — `ALLOWED_TASK_FIELDS` 含 timeSpent
- 第三方验证：`super-productivity-cli` 33 commits，确认 REST API 可用
- 活动追踪：ActivityWatch 18K stars，aw-watcher-web Chrome 扩展提供 URL 级别精度

## 项目状态

🚧 选型完成，待 Win11 到位后部署测试。

## 许可证

MIT
