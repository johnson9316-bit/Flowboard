# OpenClaw 插件集成

> 跨主题请从 [[README]] 进入；发现矛盾时以 [[1-规划评审]] 为准。

## 当前决定

**flowboard 是 OpenClaw 插件，不是独立应用。** M1 以 OpenClaw 官方 Workboard 的完整功能层为基线，按其代码组织、插件约定和开发风格复制，产出一个 ID 为 `flowboard` 的可安装插件。

复制范围包括：

- `extensions/workboard/`
- `packages/workboard-contract/`
- `ui/src/pages/workboard/`、`ui/src/lib/workboard/`、`ui/src/styles/workboard.css` 及其直接依赖

不复制整个 OpenClaw 控制台。必须固定上游 commit，保留 MIT 版权和许可证，并在仓库中记录来源与本地修改。

M1 不拆出 `core / adapters / web` 独立架构，不提供 `flowboard serve`，不以 localhost HTTP/SSE 替换 Workboard 的宿主依赖。功能和规范以复制的 Workboard 快照为准；产品差异化先从 M2 的多项目、项目设置和项目资料开始，GSD 扩展留至 M4。

## 安装与分发

已在本机 OpenClaw `2026.7.1-2` 验证标准 CLI 支持本地路径、压缩包、npm spec 和 Git 仓库安装。

本机开发安装：

```bash
openclaw plugins install --link <本地-flowboard-目录>
openclaw plugins inspect flowboard --runtime
openclaw plugins doctor
```

Git 仓库分发安装：

```bash
openclaw plugins install <Git-仓库地址>
```

M1 仓库必须提供：

1. 有效的 OpenClaw 插件 manifest，插件 ID 和显示名称均为 `flowboard`。
2. 可从干净 clone 安装的完整源码、锁定的依赖和构建产物约定。
3. `README` 中的安装、启用、升级、卸载和本机开发说明。
4. `UPSTREAM.md` 与 `THIRD-PARTY-NOTICES`，记录 OpenClaw Workboard 的固定来源和 MIT 署名。
5. 至少一次可追溯 Git commit；发布版本必须从提交的仓库安装，而不是依赖用户机器上的未提交文件。

## M1 验收

1. 在本机通过 `openclaw plugins install --link` 安装并加载 `flowboard`。
2. `openclaw plugins inspect flowboard --runtime` 与 `openclaw plugins doctor` 无阻塞错误。
3. OpenClaw 内可打开 flowboard 看板，并完成 Workboard 基线的创建、编辑、移动、筛选、详情、评论和关联操作。
4. 从干净的 Git clone 使用 `openclaw plugins install <Git-仓库地址>` 重复安装成功。

## 后续边界

M2 在这个插件中增加多项目、项目设置和项目资料；需求见 [[8.2-需求]]，实施计划见 [[8.2-看板通用功能plan]]。M4 才增加 GSD `.planning/` 投影、工作项映射和 `coding-agent` 执行调度。OpenClaw 仍是唯一宿主；任何新增能力必须继续遵循插件 API 和 Workboard 的既有约定。
