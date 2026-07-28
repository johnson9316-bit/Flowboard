# Upstream baseline

**Flowboard** is based on the Workboard implementation from:

- Repository: `https://github.com/openclaw/openclaw`
- Commit: `78d6c6c0471723721243d67fb053f3810c622bf8`
- Import date: July 28, 2026

`UPSTREAM-IMPORT.json` is machine-readable. It records every inspected
Workboard source path and Git blob SHA-1, the contract tree hashes, targets,
and local adaptations.

The imported behavior keeps the original card, claim, dependency, attachment,
notification, dispatch, and SQLite semantics. In the initial Flowboard release, the imported
frontend also includes the Workboard page, state layer, stylesheet, and every
Control UI locale bundle. Local changes are limited to:

1. `flowboard` public identity and isolated persistence paths.
2. External plugin packaging and checked-in build artifacts.
3. A Gateway-local `/flowboard/` Control UI static route and a thin Lit host.
4. `workboard.*` to `flowboard.*` RPC mapping plus `flowboard.changes.wait`,
   used to feed the upstream event-driven refresh logic on hosts without a
   plugin event bus.
5. Compatibility adapters required by OpenClaw `2026.7.1-2`.

The compatibility adapter uses Node 22's `DatabaseSync`, treats unavailable
sandbox authority as unrestricted host execution, and uses the host's
fixed internal managed-worktree owner enum. None of those details alter the
public `flowboard` RPC, tool, command, tab, or SQLite namespaces.
