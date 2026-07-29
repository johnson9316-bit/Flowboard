# OpenClaw Skills 策略

> 2026-07-28 决策。flowboard 是 OpenClaw 插件；OpenClaw Skills 是 M2 之后可选的 agent 侧执行能力，不属于 M1 的 Workboard 复制范围。

## 结论

不复制、vendor 或改写 OpenClaw Skill 源码。flowboard 通过 `AgentRunner` 选择已安装且已授权的 Skill，并持久化“本次 run 使用了什么能力、什么版本、在哪个 worktree 执行”的审计信息。

`.planning/` 仍是 GSD 产物真相；flowboard SQLite 仍是工作项、run、事件与人工交接真相；OpenClaw 的 task/session 只作为外部指针。`taskflow` 的任务状态不得覆盖 flowboard 的 `runs` 状态。

## 三个候选 Skill

| Skill | 上游定位 | flowboard 中的角色 | 里程碑 | 边界 |
|---|---|---|---|---|
| `coding-agent` | 让 OpenClaw 使用 Claude Code、Codex、OpenCode 等专业开发 agent 执行编码任务 | M2 默认开发执行能力 | M2 | 每个写代码 run 必须在隔离 Git worktree；一个 repo 同时只允许一个 active run |
| `taskflow` | OpenClaw 内部的持久任务编排、任务树、依赖与子 agent 协作能力 | 可选的执行端编排器 | M3 | 不替代 flowboard 队列、`awaiting_human`、GSD 映射或审计账本；仅记录其 task ID 与事件 |
| `diagram-maker` | 生成 SVG、HTML 或 Excalidraw 的架构、流程、数据和时序图 | 规划产物生成动作 | M3 | 必须由人选择输出路径并确认；图是计划附件，不是状态真相 |

上游源码：[`coding-agent`](https://github.com/openclaw/openclaw/tree/main/skills/coding-agent)、[`taskflow`](https://github.com/openclaw/openclaw/tree/main/skills/taskflow)、[`diagram-maker`](https://github.com/openclaw/openclaw/tree/main/skills/diagram-maker)。

## 接入模型

```text
flowboard work_item / phase / plan
            |
            v
AgentRunner.start(run, skill_profile)
            |
            +-- OpenClaw coding-agent --> host_task_id / session_id
            +-- OpenClaw taskflow     --> optional orchestration_task_id
            +-- diagram-maker         --> approved artifact path
            |
            v
flowboard runs / run_events / HANDOFF.md
```

每个 run 只保存可验证的外部引用与摘要，不复制 transcript。Skill 的安装、版本、可用性和权限由 OpenClaw 管理；flowboard 的 `doctor` 只检查当前 profile 是否可满足，不负责静默安装未知 Skill。

## Skill Profile

项目配置只声明允许的能力，不接受 agent 自行扩大权限：

```yaml
skill_profiles:
  development:
    skills: [coding-agent]
    requires_clean_git: true
    require_worktree: true
    allow_network: false
  planning_diagram:
    skills: [diagram-maker]
    requires_human_approval: true
```

- M1 不新增 Skill profile、配置校验或 `doctor`；完整复制的 Workboard 原有行为保持不变。M2 再为 GSD 专属执行增加 profile schema、配置校验和 `doctor` 输出。
- M2 的 `development` profile 固定启用 `coding-agent`，先跑单 repo、单 worktree、单 active run。
- M3 才增加 `taskflow` 映射、`diagram-maker` 动作和多 worktree 并行；任何并行合并都必须有显式验收与人工确认。

## 必测项

进入 M2 前，必须留下实际验证记录：

1. flowboard 插件可通过 OpenClaw 正式插件 API 创建、观察和终止一个开发任务。
2. `coding-agent` 在临时 Git worktree 中执行，用户当前工作区没有被改动。
3. run 能保存 host task/session 指针、关键事件、成本摘要和 `awaiting_human` 原因。
4. 人可在真实终端恢复或接管对应会话；失败时 run 能标为异常而不是永久 `running`。
5. 项目 MCP、`.claude/skills/` 与 OpenClaw Skill 的加载顺序和并存关系有实测结论。

## 安全与升级

- 默认拒绝不在 profile allowlist 的 Skill。
- 记录 OpenClaw 版本、Skill 名称、Skill 来源和 run 启动参数；升级后先在测试项目重跑冒烟验证。
- `diagram-maker` 写文件、`coding-agent` 执行命令、`taskflow` 创建子任务都应显示在 run 审计中。
- 禁止 Skill 在主工作区直接写代码；Git worktree 创建、基线提交和清理失败都要阻止 run 启动。

相关文档：[[4-执行调度与AI]]、[[6-OpenClaw集成]]、[[8-路线图与验收]]、[[7-数据与接口]]。
