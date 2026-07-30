# 第 2 期：人工出口与 Git 安全

> **前置条件**：第 1 期的单 Card ACP 闭环和全部完成门槛已经通过。

## 范围

补全人工可控的运行出口和 worktree/Git 治理；仍维持单仓库、单 mutable run、单隔离 worktree，
不开放写入并行。

## 实施项

1. 启动前持久化并校验 repository root、HEAD、分支、dirty、submodule、实际 base commit、
   workspace 白名单和可用空间；主仓 dirty 默认拒绝启动。
2. 通过官方 managed-worktree 原语取得 worktree；Taskfold 保存租约、所有者、基线、路径摘要和
   清理状态。归档或删除 Card 前必须选择合并、PR、丢弃或保留待人工处理。
3. 实现 `sendBack`、`merge`、`createPr`、`discardWorktree`、`unbind`。所有破坏性操作二次确认
   并写审计；退回修改优先续接 session，不支持时新建 session 并记录 lineage。
4. 合并前检查 base 漂移、目标分支白名单、worktree 基线和 dirty 状态；默认不自动 push、
   不自动删分支。冲突、PR 失败和 cleanup 失败保持 `review + waitingForHuman`。
5. `external_state_unknown` 使用退避轮询恢复；只允许刷新、查看、取消或强制解绑，禁止批准、
   合并和 PR。解绑不得静默删除磁盘 worktree。
6. 增加周期盘点：`git worktree list`、Taskfold lease 和 ACP 关联三方对账，列出孤儿、
   租约缺失和外部会话缺失。

## 完成门槛

- dirty 主仓、非法 workspace、基线漂移和无效 lease 均拒绝启动。
- 合并、PR、丢弃和退回修改均有审计、确认和明确失败出口。
- unknown 可自动恢复，或经人工解绑后安全重启。
- 盘点能找出孤儿 worktree 和未关联 lease；失败清理不会丢失路径信息。

完成后执行 [第 3 期：受控并发与 writeScope](实施-第3期-受控并发与writeScope.md)。
