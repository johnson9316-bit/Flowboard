# 第 1 期：单 Card ACP 闭环

> **前置条件**：官方 ACP Spike 已通过。`@openclaw/acpx` 的 `doctor()` 成功，Claude harness
> 能通过公开 ACP API 创建、执行、查询、取消、关闭，并能在重启后按 `sessionKey` 对账。

## 范围

只支持 `implementer` + Claude、单仓库、单 mutable run、单隔离 worktree；不做并发、多角色、
Codex 或 OpenCode。

```text
Taskfold Card / UI / run ledger
  -> Taskfold ACP Runner
    -> OpenClaw 公共 ACP SDK / AcpSessionManager
      -> @openclaw/acpx
        -> Claude Code
```

- OpenClaw `AcpSessionManager` 管理 ACP session metadata、handle、turn queue、状态、取消、
  关闭和启动对账。Taskfold 不复制这些 runtime 状态。
- Workboard/Card 的 execution、attempt、event、comment、proof 和 artifact 是有界 UI 投影；
  `taskfold_runs`、`taskfold_run_events`、`taskfold_audit_events` 才是 Taskfold 的执行和审计真相。
- Card 成功只能进入 `review`；不能自动 `done`、合并、创建 PR 或丢弃 worktree。

## 实施项

1. 增加 `automation.executionPath: "openclaw-acp" | "legacy-subagent"`，默认旧 Card 为
   `legacy-subagent`；修改路径必须人工操作并写审计。
2. 在旧 dispatcher、claim、execution start、CLI、tool、dashboard action、lifecycle、reconciler
   和 worktree cleanup 中增加路径分支。`openclaw-acp` Card 绝不能生成旧 claim、旧 subagent
   run 或被旧 cleanup 删除 worktree。
3. 新增 `taskfold_runs`、`taskfold_run_events`、`taskfold_audit_events`。审计表只允许 INSERT，
   至少写入 actor、动作、run、Card、详情、序号和前序哈希。
4. 新增 run 启动服务：用 revision CAS 写 `launching`，创建 worktree lease，调用公开
   `getAcpSessionManager().initializeSession()` 和 `runTurn()`；CAS 或持久化失败必须关闭会话、
   释放租约并写失败审计。
5. Runner 只消费 manager 的结构化事件和 `getSessionStatus()`；保存 sessionKey、backend、
   harness、可恢复 id、worktree lease、base commit、状态和最近同步时间。不得保存完整 transcript
   或每条 `text_delta`。
6. 实现 `approvePlan`、`steer`、`cancel`、`close`、`sync` Gateway 服务。审批记录必须绑定
   `runId + planHash + planVersion + actor`；计划 event 或 harness 文本不能自行改变 Card 状态。
7. 修改判活：`lastSyncedAt + externalStatus + active turn` 是 ACP 路径的存活证据；
   `waitingForHuman` 是合法稳定态，不参与 abandoned 判定；多次查询失败进入
   `external_state_unknown`。
8. 在 Card 和项目 Runs 视图显示 harness、run、worktree、最近同步、需处理原因和关键审计；
   浏览器只能调用 Taskfold Gateway 方法。

## 完成门槛

- 计划 -> 人工批准 -> 执行 -> `review` 可闭环。
- 等待人工 2 小时仍保持可恢复状态，不会被 reconciler 判为 `blocked`。
- 双击或两个入口并发启动只产生一个 ACP session。
- 对 ACP Card 调用旧 dispatch/CLI/tool 后，不产生 claim、旧 worktree 或 subagent run。
- 每个人工动作和外部状态变化均可在独立审计表追溯。

完成后执行 [第 2 期：人工出口与 Git 安全](实施-第2期-人工出口与Git安全.md)。
