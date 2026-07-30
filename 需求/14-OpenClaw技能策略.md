# OpenClaw Skills 与 ACP 执行策略

> 2026-07-30 决策。Taskfold 是 OpenClaw 插件；M1 不增加执行能力。M4 的开发执行使用
> OpenClaw 公共 ACP Runtime 与官方 `@openclaw/acpx`，不依赖第三方执行插件。

## 结论

Taskfold 不复制、vendor 或改写 OpenClaw Skill 源码，也不将 Skill 当作稳定的插件执行 API。
开发执行通过 `openclaw/plugin-sdk/acp-runtime` 直接调用已注册的 ACP backend：

```text
Taskfold run / Card
  -> Taskfold ACP Runner
    -> OpenClaw 公共 ACP Runtime SDK
      -> @openclaw/acpx
        -> Claude Code / Codex / OpenCode
```

`.planning/` 仍是 GSD 产物真相；Taskfold SQLite 是 Card、run、事件、审计与人工交接真相；
OpenClaw ACP session 只作为外部引用。Taskfold 不复制 transcript。

## 能力分工

| 能力 | Taskfold 中的角色 | 里程碑 | 边界 |
| --- | --- | --- | --- |
| **ACP Runtime + `@openclaw/acpx`** | 默认开发执行实现 | M4 | Taskfold 直接调用公开 API；写入型 run 必须使用隔离 worktree；同 repo 起步时仅一个 active mutable run。 |
| `coding-agent` Skill | 可选的 agent-side 开发协作 Skill | M7+ | 可供 OpenClaw agent 在对话中使用，但不作为 Taskfold Card 的生产执行控制 API。 |
| `taskflow` Skill | 可选执行端编排器 | M7+ | 不替代 Taskfold 队列、`awaiting_human`、GSD 映射、审计账本或并发槽。 |
| `diagram-maker` Skill | 规划产物生成动作 | M7+ | 人选择输出路径并确认；图是附件，不是状态真相。 |

## ACP Profile

项目配置只声明允许的 harness 与安全策略，不允许 agent 自行扩大权限：

```yaml
execution_profiles:
  development:
    backend: openclaw-acp
    harness: claude
    requires_clean_git: true
    require_worktree: true
    requires_plan_approval: true
    allow_network: false
  review:
    backend: openclaw-acp
    harness: claude
    mutable: false
```

- 第 1 期只支持 `claude` harness。
- Codex 通过独立 ACP Spike 后开放。
- OpenCode 标记实验性，不阻塞主路径发布。
- model id、权限 profile 和原生能力按 harness 分别验证，不能假定互通。

## 进入 M4 的必测项

1. Taskfold 插件可通过公开 ACP Runtime API 对指定 `cwd` 创建、观察、取消和关闭一个开发会话。
2. `@openclaw/acpx` 的 `doctor` 通过；Claude Code 在临时 Git worktree 中执行，主工作区不被改动。
3. run 能保存 ACP `sessionKey`、backend/harness session id、关键 event、成本口径和
   `awaiting_human` 原因。
4. Gateway 与 Taskfold 重启后，能按持久化 handle 调 `getStatus` 对账，而不重复启动会话。
5. 项目 MCP、`.claude/skills/`、OpenClaw tools MCP bridge 与 harness 原生能力的加载顺序有实测结论。
6. 人可在真实终端恢复或接管时，保存其已验证的命令；不支持的 harness 必须明确显示“不支持接管”。

## 安全与升级

- 默认拒绝不在 Profile allowlist 的 harness、workspace 和权限配置。
- Taskfold 的计划批准、Git 合并、PR 和 Card 完成由自己的审计与 Gateway 方法控制，不由 ACP
  文本或 Skill 自动触发。
- 记录 OpenClaw、`@openclaw/acpx`、harness、model 与启动参数；升级后先在测试项目重跑 ACP Spike。
- Git worktree 创建、基线提交、清理失败和外部状态未知都必须阻止破坏性动作。

相关文档：[[8.7-待开发一波]]、[[4-执行调度与AI]]、[[7-数据与接口]]、[[8-路线图与验收]]。
