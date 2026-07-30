# 执行调度与 AI

> 跨主题请从 [[README]] 进入；发现矛盾时以 [[1-规划评审]] 为准。

AI 能力分为两类：**AI 辅助管理**（澄清、拆解、排序、播报）与**AI 执行开发调度**（v0.8 新增，模块⑥）。前者是辅助功能；后者将 GSD 的 Execute 阶段变成可排队、可观察、可接管的流程，是 taskfold 的核心差异化。

> **2026-07-30 架构修正：taskfold 是 OpenClaw 插件。** M1-M3 不开发执行调度；M4 起在插件中增加 ACP Runner、工作项、run 账本、GSD 映射和人机交接状态。执行契约见 [[8.7-待开发一波]] 与 [[14-OpenClaw技能策略]]。

### Agent Tools（**以 MCP 为主契约**）

**v0.5 决策：工具层实现为一个 MCP server，不为每个宿主写一套。**

理由：宿主会越来越多（Hermes / OpenClaw / Codex / VS Code / Cursor…），逐个写 agent tool 适配是 O(n) 成本；MCP 是当前 agent 生态的通用契约，一次实现即可全覆盖。宿主若有自己的原生工具注册机制，adapter 写一层**薄桥接**转发到同一批 handler 即可，业务逻辑仍在 core 的工具 handler 中。

> 参照：Plane 已提供原生 MCP server（[[5-技术架构与选型]]），这是它当前领先的地方之一。

工具集：

| 工具 | 用途 |
|------|------|
| `taskfold_search` | 按条件检索工作项（状态/phase/当前重点/标签/全文） |
| `taskfold_get` | 读单个工作项（含 MD 正文与 AC） |
| `taskfold_create` | 建工作项 |
| `taskfold_update` | 改字段 / 移状态（走流程校验） |
| `taskfold_link` | 建立关联 |
| `taskfold_comment` | 追加 SQLite 评论记录 |
| `taskfold_plan_focus` | 当前重点规划：给候选集、依赖与历史记录，返回建议顺序 |
| `taskfold_report` | 生成日报 / 周报 / 当前重点总结 |
| `taskfold_metrics` | 取度量数据 |

> 写操作工具需带 `dry_run` 参数，agent 默认先预演再执行。

### 自动化规则

轻量三段式（**触发器 → 条件 → 动作**），YAML 配置于 `<TASKFOLD_HOME>/automations.yaml`。规则模型参考 n8n，**但不引入 n8n，也不做画布**（[[2-产品定位与范围]]）：

```yaml
- name: 阻塞超时预警
  on: item.status_changed
  if: status == 'blocked' && duration_in_status > '2d'
  then:
    - notify: { channel: dashboard, level: warn }
    - ai_task: "分析 {{item.id}} 阻塞原因，给出 2 条解法建议，写入评论"

- name: 需求入池自动分析
  on: item.created
  if: type == 'story' && status == 'inbox'
  then:
    - ai_task: "澄清需求 {{item.id}}，补全验收标准，检测是否与既有需求重复"
    - set: { status: analyzing }
```

内建动作：`set` / `notify` / `link` / `comment` / `ai_task`（把提示词丢给宿主 agent 执行）。

### AI 辅助环节汇总

| 环节 | 输入 | 输出 | 是否需人确认 |
|------|------|------|-------------|
| 需求澄清 | 原始诉求 | 追问 + 补全后的描述 | 是 |
| 验收标准生成 | 需求描述 | Given-When-Then 清单 | 是 |
| 需求拆解 | story | 子 task 列表 + 估算 | 是 |
| 重复检测 | 新 story | 疑似重复列表 | 是 |
| 优先级建议 | 需求池 | RICE 打分 + 排序理由 | **是（强制）** |
| Release 划分建议 | 目标 + 需求池 | Release 草案 + 风险 | 是 |
| 当前重点规划 | 候选集 + 依赖 + 历史记录 | 建议顺序 + 风险 | 是 |
| 进展播报 | events 流水 | 日报 / 周报 | 否 |
| 风险预警 | 状态停留时长 | 预警项 | 否 |

---

### 执行调度层（v0.8 新增，模块⑥ 核心）

**一句话定位：**

> **taskfold 是独立调度层，不是开发执行者。真实执行者是经官方 OpenClaw ACP Runtime 启动的 Claude Code、Codex、OpenCode 等专业开发 harness。**
> 目标不是让 AI 自主完成所有开发，而是把开发执行变成**可排队、可观察、可验证、可接管**的异步流程。

#### 职责红线

| taskfold 做 | taskfold 不做 |
|-----------|-------------|
| 决定**哪个工作项该开工**（按 GSD 阶段 + 依赖 + WIP） | ❌ 自己写代码、自己改文件 |
| 组装会话的**上下文包**（workspace、phase、要读的产物、skills、MCP） | ❌ 自带 LLM 调用层、自己跑 agent loop |
| 启动 / 排队 / 观察 / 中止会话 | ❌ 替用户做架构决策与验收判断 |
| **落账**：会话 ↔ 工作项 ↔ GSD phase 的三元映射 + 全过程留档 | ❌ 复制一份会话历史（宿主已有，[[4-执行调度与AI]]） |
| 把「需要人」的时刻**推到人面前** | ❌ 卡住了自己硬猜着继续 |

**人保留的四个决策点**（不可让渡，任何自动化都不越过）：

```
规划 ──→ 关键决策 ──→ 〔agent 执行〕──→ 验收 ──→ 返工判断
 人          人           机器            人         人
```

对应到 GSD 循环（[[3-需求与工作管理]]）：

| GSD 阶段 | 谁主导 | taskfold 的角色 |
|---------|-------|--------------|
| Discuss | **人**（agent 辅助提问） | 提供上下文、记录决策入 `XX-CONTEXT.md` |
| Plan | 机器起草 → **人过目** | 起会话；`plan-checker` 未过则不放行 Execute |
| **Execute** | **机器**（可无人值守） | ★ 主战场：按 wave 排队、并行度控制、实时观察 |
| Verify | 机器跑 → **人验收** | 把 `XX-VERIFICATION.md` / `XX-UAT.md` 推成待办卡 |
| Ship | **人** | 归档、更新 `STATE.md`、度量落账 |

⇒ **只有 Execute 是可以放手的**。其余四个阶段 taskfold 只做「把材料准备好、把人叫来」。

#### 已定方案：官方 OpenClaw ACP Runtime

**2026-07-30 已定。** Taskfold 直接使用公开的
`openclaw/plugin-sdk/acp-runtime` 与官方 `@openclaw/acpx`：

```text
Taskfold Card / run ledger
  -> Taskfold ACP Runner
    -> OpenClaw 公共 ACP Runtime SDK
      -> @openclaw/acpx
        -> Claude Code / Codex / OpenCode
```

ACP Runtime 提供会话创建/恢复、结构化 turn event、状态查询、取消和关闭；Taskfold 持有
Card、run、审批、审计、worktree lease、Git 安全和并发约束。CLI backend 不再是开发执行的
主路径，只能作为 ACP 不可用时另行评估的文本型 fallback。完整 API、状态机、持久化和验收见
[[8.7-待开发一波]]。

#### 历史调研：OpenClaw CLI backend（不作为主执行路径）

**（2026-07 旧调研，保留作 fallback 参考，不得据此实现 M4 主路径）**

这是 v0.8 调研中最有价值的一条，直接回应「充分利用 OpenClaw 生态，不要啥都自己开发」：

**OpenClaw 有一整套把外部 CLI 包成会话后端的机制**，并已捆绑 `claude-cli`：

| 能力 | OpenClaw 已提供 | 出处 |
|------|----------------|------|
| 注册 CLI 后端 | `api.registerCliBackend(...)`，插件级 API，有专门文档 | `plugins/cli-backend-plugins` |
| Claude Code 后端 | 捆绑 `claude-cli`，默认参数 `-p --output-format stream-json --include-partial-messages --verbose` | `gateway/cli-backends` |
| **流式解析** | `output: "jsonl"` + `jsonlDialect: "claude-stream-json"` —— 解析 assistant 消息、tool 事件、session id | 同上 |
| **会话持久化 + resume** | `sessionArgs: ["--session-id","{sessionId}"]`、`sessionMode: "always"`；session id 跨 OpenClaw 重启存活；resume 前**校验 project transcripts** | 同上 |
| 进程复用 | 「keeps Claude's stdio process alive per session during active use，then resumes from the stored ID on subsequent turns」 | 同上 |
| **MCP 桥** | `bundleMcp: true` ⇒ 「spawns a loopback HTTP MCP server that exposes gateway tools to the CLI process」，带 per-run 授权 `OPENCLAW_MCP_TOKEN` | 同上 |
| **skills 透传** | 「Skills with materialized paths pass through via `--plugin-dir` as a temporary Claude Code plugin」 | 同上 |
| 上下文压缩归属 | `ownsNativeCompaction: true`（Claude Code 自己 compact，OpenClaw 的 summarizer 不介入） | 同上 |
| 会话历史存储 | `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` + 归档 transcripts 于 `sessions/` | `concepts/session` |
| 多 agent 编排 | `sessions_spawn`（非阻塞，返回 `runId` + `childSessionKey`）/ `sessions_yield` / subagents 树视图 | `concepts/session-tool` |

**历史结论仍成立的一部分**：Taskfold 不该自己写 CLI 会话管理器；PT​​Y、流式解析、session
resume、MCP 注入、skills 挂载、历史落库应尽量复用 OpenClaw。当前正式实现改由 ACP Runtime
完成，Taskfold 只做账本、排队、GSD 状态机和人机交接点。

**你的两条指示在这里冲突了，必须拍板**（→ [[11-交接与待决]] 决策 B）：

> 「多用**交互模式**，少用 `claude -p` 一次性模式」 vs 「**充分利用 OpenClaw 生态**」
> —— OpenClaw 的 `claude-cli` 后端用的**正是 `-p`**。

先把事实摆清楚，因为「`-p` 就是一次性」这个判断**不完全准确**：

| | Claude Agent SDK 官方口径 | 对应做法 | 多轮上下文 | 中途插话 / 排队 | **实时打断** | **权限请求上抛** |
|---|---|---|---|---|---|---|
| **Streaming Input Mode**（官方推荐） | 「a long lived process that takes in user input, handles interruptions, surfaces permission requests, and handles session management」 | Agent SDK 长驻会话 | ✅ 天然 | ✅ | ✅ | ✅ |
| **Single Message Input** | 「One-shot queries that **use session state and resuming**」 | `-p` + `--session-id` + resume ← **OpenClaw 用这个** | ✅ 靠 resume | ❌ | ❌ | ❌ |
| 裸 `claude -p "..."` | —— | 无 session | ❌ | ❌ | ❌ | ❌ |

官方明确列出 Single Message 模式**不支持**的四项（原文）：

> 「Direct image attachments in messages / Dynamic message queueing / Real-time interruption / Natural multi-turn conversations」

**所以准确的说法是**：`-p` 是**传输模式**，不是会话模式。加上 `--session-id` + resume 之后上下文是连续的，你担心的「每次从零开始」不会发生。真正丢掉的是**实时打断**和**权限请求上抛**这两项——而这两项恰好命中「可接管」。

**已作废的 CLI backend 主路径建议（保留原取证）**：

```
默认路径：OpenClaw claude-cli 后端（-p + session-id + resume）
          ├─ 白拿 MCP 桥、skills 透传、历史落库、native compaction
          └─ 代价：不能实时打断，权限须预设 permission-mode
                    ↓ 人要介入时
接管路径：人在真终端跑  claude --resume <session-id>
          └─ 会话 id 就在 taskfold 的账本里，几乎零成本 ★
                    ↓ 只有需要「跑着的时候插话」时才上
增强路径：Agent SDK 长驻会话（自建，M4+）
          └─ 仅对少数需要边跑边引导的场景开
```

> ★ **接管路径是这套设计里性价比最高的一环**：`-p --session-id` 写入的是 Claude Code 自己的 project transcript（OpenClaw 文档提到 resume 前会「verified against project transcripts」），因此人可以直接 `claude --resume <id>` 在真终端里以**完整交互模式**接手同一个会话。**待实测（[[6-OpenClaw集成]]）**，但证据链是通的。
> 这比「在 Web UI 里做一个假终端」强得多，也符合「Dashboard 是复杂问题处理**入口**」而非处理现场。

#### 会话生命周期与看板的关系

```
work_item (status=ready)
    │  ← 人点「开工」，或自动化规则触发（[[4-执行调度与AI]]），或每日巡检建议（[[4-执行调度与AI]]）
    ▼
run（一次会话）  status: queued → running → awaiting_human → done / failed / aborted
    │
    ├─ 组装上下文包：workspace 路径 + GSD phase + 要读的 .planning/ 产物
    │                + 该项目的 skills + 该项目的 MCP（[[4-执行调度与AI]]）
    ├─ 交给 Taskfold ACP Runner：创建/恢复 ACP session，启动 turn 并持久化 handle
    ├─ 流式事件 → 写 run_events → WebSocket 推到看板卡片上
    │
    ├─ 命中「需要人」→ awaiting_human，卡片进「待我处理」列 + 推送通知
    └─ 结束 → 写 run 结果、更新 work_item、落归档（[[4-执行调度与AI]]）
```

**`awaiting_human` 是这套设计的枢纽状态**，触发条件：

| 触发 | 例子 |
|------|------|
| agent 显式提问 | 「两种实现方式，选哪个」 |
| 权限被拒 / 需要审批 | 要改 CI 配置、要装依赖 |
| Verify 失败 | `XX-VERIFICATION.md` 判定不符，等人决定返工范围 |
| 超时 / 无进展 | 单会话超 N 分钟无 tool 事件 |
| 预算超限 | token / 时长超阈值 |
| plan-checker 未通过 | 计划质量不过关，不放行 Execute |

> **红线：`awaiting_human` 永不自动跨过。** 宁可停在那儿等一天，也不猜着往下做——这是「用户保留关键决策」的落地方式。

**并行度控制**：GSD 的 wave 模型（[[3-需求与工作管理]]）给出逻辑并行边界，但不能替代文件系统隔离。M2 默认每 repo 只允许一个 active run，并且必须在独立 worktree 中执行；不得让 agent 直接改用户当前工作区。M3 才评估同 repo 多 worktree 并行与合并策略。

> ⚠️ **同一 repo 并发写会互相踩**。GSD 的 wave 假设了并行 executor，但那是靠 fresh context 隔离**上下文**，没隔离**文件系统**。taskfold 必须做出选择（→ [[11-交接与待决]] 决策 C）：
> - **C1 串行化同 repo**：简单可靠，牺牲并行度
> - **C2 git worktree 隔离**：每个 run 一个 worktree，跑完合并。成本中等，收益是真并行
> - **C3 信任 wave 划分**：假定同 wave 的 plan 不碰同一批文件（gsd-core 的 planner 本就按依赖分组）
>
> 倾向 **C1 起步 + C2 作为 M3 增强**。C3 太依赖 planner 的正确性，一次冲突就毁掉一整轮执行的可信度。

#### 数据落点：不复制宿主已有的东西

| 数据 | 存哪 | 理由 |
|------|------|------|
| 会话原始 transcript | **OpenClaw**（`~/.openclaw/agents/<id>/…sqlite` + `sessions/`）与 **Claude Code**（project transcripts） | 已经有两份了，再存第三份是纯负债 |
| `runs` 表：run_id ↔ session_id ↔ work_item ↔ phase ↔ 起止时间 ↔ 结果 ↔ 成本 | **taskfold SQLite** | 宿主不知道「工作项」这个概念，这是 taskfold 独有实体（[[7-数据与接口]]） |
| `run_events`：里程碑事件（阶段切换、tool 使用摘要、awaiting_human 原因、错误） | **taskfold SQLite** | 度量（[[7-数据与接口]]）与看板实时展示需要；**只存摘要不存全文** |
| 会话产出的 GSD 产物 | **文件**（`.planning/`） | 铁律不变（[[7-数据与接口]]） |
| 复盘档 | **文件**（[[4-执行调度与AI]]） | 要能 Git 版本化、要能被 agent 读 |

> **「全过程需保存」= 保存指针 + 摘要 + 产物，不是保存全文副本。** 全文在宿主那儿，taskfold 存 `session_id` 就能随时调出（也能 `claude --resume` 直接进去）。真正需要自己存的是**跨会话、跨项目才能算出来的东西**：谁在什么时候因为什么卡住了、返工了几次、花了多少。

#### skills 与 MCP 的透传

需求：「Claude CLI 开发时要能调用项目该用的 skills 和 MCP」。

OpenClaw 侧已提供机制，但有两个坑必须实测：

| 项 | 机制 | ⚠️ 坑 |
|----|------|------|
| **skills** | `--plugin-dir` 挂成临时 Claude Code plugin | 是 OpenClaw 自己的 skills（clawhub.ai / 本地插件目录）。**项目 `.claude/skills/` 是否照常加载，待实测** |
| **MCP** | `bundleMcp: true` → loopback HTTP MCP server 暴露 **gateway tools** | 暴露的是**网关工具**，不是项目 `.mcp.json` 里的 MCP。**两者能否并存，待实测** |
| **原生工具** | `nativeToolMode: "always-on" \| "selectable" \| "disabled"` | ⚠️ 文档说 restricted run 下「Claude's native tools are disabled」。**开发场景必须 `always-on`**——没有 Read/Edit/Bash 就不用谈写代码了 |

> 若实测发现 OpenClaw 的 bundleMcp 会挤掉项目自己的 MCP 配置，退路是**不走 OpenClaw 的 MCP 桥**：`bundleMcp: false`，让 taskfold 直接把项目该用的 MCP 写进会话的 `--mcp-config`，把 taskfold 自己的工具也作为一个 MCP server 暴露（[[4-执行调度与AI]] 本来就要做 MCP server，正好复用）。
> 这条退路值得优先验证，因为它同时更符合「项目该用什么就用什么」的语义。

### 每日巡检（辅助通道）

**定位：辅助通道，不替代交互开发主流程，也不自动替用户做复杂决策。**

| 项 | 设定 |
|----|------|
| 触发 | OpenClaw 的 cron（生态已有，不自建定时器）；每个项目可独立开关 |
| 适用范围 | **只对标记为「需值守」的项目开** —— 不是所有项目都要巡检 |
| 产出 | 一张**巡检报告卡** + 一批**建议卡**，进「待我处理」列 |
| 权限 | **默认只读 + 只建议**。写操作与执行一律等人点 |

巡检检查项：

| 检查 | 输出 |
|------|------|
| `.planning/` 与看板索引是否一致 | 不一致 → 建议 `taskfold reindex` |
| 有无 `awaiting_human` 挂了超过 N 小时 | 汇总提醒（这是最有价值的一项） |
| 有无 phase 停在某阶段超阈值 | 阻塞预警（[[7-数据与接口]] 阶段停留分布） |
| 有无 Verify 失败未处理 | 返工待决 |
| 有无 plan 已通过校验但没排上 Execute | 建议开工（**建议，不自动开**） |
| 上一日 run 的失败与成本汇总 | 日报（[[4-执行调度与AI]] 进展播报） |

**升级路径**（可选，默认关）：某类低风险项可配置为「巡检直接开工」，例如 `type=chore` 且有现成 plan 且 wave 内无依赖。**默认全关**，与 [[3-需求与工作管理]] 检查器同一原则。

> 巡检的失败模式是**变成噪音**。对策：报告卡合并成一张、无事发生时不建卡、同一问题不重复提醒（记 `last_notified_at`）。

### 复盘与归档

「全过程需保存，便于复盘」的具体落法：

```
<项目仓库>/.planning/phases/XX-phase-name/
└── runs/                          ← taskfold 新增，但放在 GSD 布局内
    └── <run_id>/
        ├── META.json              # session_id / 起止 / 模型 / 成本 / 结果
        ├── TIMELINE.md            # 里程碑时间线（人可读）
        └── HANDOFF.md             # awaiting_human 的问答记录与人的决定 ★
```

> ⚠️ 这里与 [[7-数据与接口]] 铁律「不往 `.planning/` 写自有字段」有张力。**分辨方式：不改上游既有文件的格式，只在 phase 目录下加一个上游没有的 `runs/` 子目录。** 上游 gsd-core 不认识它，但也不会被它破坏；用户 Git 里能看到、能 diff、能跟着 phase 一起归档。
> 若后续发现 gsd-core 的归档逻辑会清理未知目录，退路是移到 `<TASKFOLD_HOME>/runs/<project>/<phase>/`，代价是失去「跟着代码一起版本化」。**待实测（[[6-OpenClaw集成]]）。**

**`HANDOFF.md` 是复盘里最值钱的文件**——它记录的是「机器在哪儿卡住、人怎么决定的」。这正是 [[7-数据与接口]]「Verify 返工率」「人机操作比」两个指标的原始素材，也是将来沉淀成 skills / CONTEXT 模板的来源。

复盘视图（M4）：

| 视图 | 回答 |
|------|------|
| Run 时间线 | 这个 phase 一共跑了几次会话、每次多久、卡在哪 |
| 返工链 | Verify → Execute 的回环，每次返工的原因 |
| 人工介入点汇总 | 人一共被叫了几次、为什么、平均等了多久 |
| 成本 | 每 phase / 每 work_item 的 token 与时长 |

---
