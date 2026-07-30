# 第 3 期：受控并发与 writeScope

> **前置条件**：第 1、2 期均已通过完成门槛。写入并行是本阶段唯一新增的高风险能力；
> 未完成本期前，每仓库只能有一个 mutable run。

## 范围

开放同仓库受控写入并行；不包含多角色 Profile、父子 Card 调度、Codex 或 OpenCode。

## 实施项

1. 定义 `writeScope`：仓库相对 glob 列表，统一分隔符、排序、去重和排除项；`**` 表示全仓独占。
   lockfile、生成文件和共享配置必须有显式策略；mutable run 未声明 scope 时拒绝启动。
2. 实现 scope 重叠判定和并发键：`repository + baseBranch + normalizedWriteScope`。无法可靠判断时
   按重叠处理并串行。
3. 新增并发槽表和唯一约束；领取槽位必须与 revision CAS 在同一事务中完成。定义等待、取消、
   正常结束、异常回收和强制解绑时的槽位释放规则。
4. 增加项目级和仓库级并发上限；保留 Profile 上限但不得以它替代仓库互斥。
5. 新增成本账本，按 Card、父 Card、项目、全局汇总。harness 未上报成本时标记口径不完整；
   预算耗尽时禁止新 run/new turn，不杀掉正在运行的 turn，并进入 `waitingForHuman`。
6. 在 Runs 视图展示 scope、槽位、排队原因、并发数、成本口径和预算状态。

## 完成门槛

- 不重叠 scope 可并行；重叠或全仓 scope 必定串行。
- 同时点击和多进程启动都不能越过槽位唯一约束。
- 正常结束、取消、已确认失败和人工解绑均按规则释放槽位。
- 预算耗尽不产生新 run/new turn，正在运行的 turn 不被伪装成已停止。
