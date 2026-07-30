# Verification record

## M1 baseline — July 28, 2026

Historical record of the state on that date. Its claims about the imported
Workboard bundle and the browser-side live-refresh state machine describe code
that has since been removed — see the architecture rework at the end.

### Environment

- Date: July 28, 2026
- Node: 22.22.3
- OpenClaw: 2026.7.1-2 (`0790d9f`)

### Automated checks

Completed from the repository root:

```bash
npm run check:public-names
npm run typecheck
npm test
npm run build
npm run pack:check
```

All commands passed. The public-name audit inspected 36 active files and
found no public `workboard` registrations. The test suite checks the
Flowboard board-ID contract, change-wait cursor behavior, imported Workboard
host wiring, locale source coverage, and the authenticated static route's
assets, SPA fallback, encoded traversal rejection, missing-asset behavior,
and method restriction.

The UI build emitted the imported Workboard bundle plus dynamic locale chunks,
including `zh-CN` and `zh-TW`. The host source contains no periodic
`cards.list` polling; it waits on `flowboard.changes.wait` and passes returned
revisions into the upstream live-refresh state machine.

### Runtime checks

Completed against the local OpenClaw installation after moving the source to
`/home/john/src/personal/Flowboard`:

```bash
openclaw config validate
openclaw plugins install --link /home/john/src/personal/Flowboard
openclaw gateway restart
openclaw plugins inspect flowboard --runtime
openclaw plugins doctor
openclaw flowboard --help
openclaw flowboard list --json
openclaw workboard list
```

Runtime inspection reported the Flowboard tools, slash command, CLI command,
change event service, Gateway RPC methods, and one HTTP route. `plugins doctor`
reported no plugin issues. `openclaw flowboard list --json` returned an empty
Flowboard board, while the bundled `workboard` command continued to read its
own existing card, confirming their command registrations and SQLite namespaces
do not collide.

The Git clone installation and trusted Control UI smoke tests are recorded
separately below because they require a pushed repository and a paired browser.

### Git distribution

The initial commit was cloned with `git clone --no-local` into an empty
directory. After `npm ci --ignore-scripts`, all automated checks, the
production build, and `npm pack --dry-run` passed with a clean worktree.
This verifies that the committed repository contains every build input and
checked-in artifact required for local development.

After pushing the initial Flowboard commit, repeat the installation check from
a clean GitHub clone:

```bash
git clone https://github.com/johnson9316-bit/Flowboard.git Flowboard
openclaw plugins install --link /path/to/Flowboard
openclaw plugins inspect flowboard --runtime
```

The release is not considered Git-distribution-verified until this sequence
has been recorded against the GitHub repository.

### Trusted iframe UI

The full authenticated Control UI smoke test was not performed. On July 28,
2026, `gateway.controlUi.embedSandbox` was not explicitly configured, so
OpenClaw uses its default `scripts` mode. That mode gives the iframe an
origin-isolated sandbox and prevents it from reading the same-origin paired
device identity required by the UI.

After an operator explicitly configures
`gateway.controlUi.embedSandbox: "trusted"` for this trusted local Gateway,
complete the UI smoke test: create, edit, move, filter, inspect, link, claim,
heartbeat, release, complete, block, unblock, comment, add proof, attach a
file, read diagnostics, subscribe, and dispatch.

## Live-host verification — July 29, 2026

The reconciler described in the next section was written against invented host
payloads and never run against a live Gateway. Testing it against one
(OpenClaw 2026.7.1-2) showed it had never worked, and the design was replaced. What
follows is what was checked against the running system, not against mocks.

### Why the first reconciler could not work

- `runtime.gateway.request("sessions.list")` throws
  `Gateway requests are only available to bundled or trusted official plugins` on
  every call. The gate (`server-plugins-XoQmHCe9.js:337`) admits only
  `origin === "bundled"` or a package in the host's official external plugin
  catalog; no configuration opens it. Every sweep died here — 173 warnings in one
  day — so no card was ever reconciled. `runtime.gateway.isAvailable()` checks the
  request context, not the trust gate, which is why the guard passed.
- Task records are unreachable too: `runtime.tasks.runs.bindSession({sessionKey})`
  scopes every lookup to `task.ownerKey`, which for a Flowboard run is the
  *requester* session that spawned the subagent (`agent:main:main`), not the card's
  session — and the dispatch path never learns it.
- `runtime.subagent.waitForRun({runId})` returns `timeout` for a run that is not
  live in the current process, identically for a long-finished run and a nonexistent
  one, so it cannot report an outcome after a restart.
- The host task vocabulary is `queued | running | succeeded | failed | timed_out |
  cancelled | lost`. The old code branched on `"completed"`, which does not exist,
  and ignored `lost`. `TaskRunView` also has no `updatedAt`, which the old code read
  as its status provenance — so it could never have written a card status at all.
- `sessions.list` reports agent-scoped keys (`agent:main:subagent:…`) while a card
  without an explicit `agentId` stores the unscoped tail. The old orphan check
  compared them literally, so "the host has no session for this card" was true for
  every card, and the startup sweep would have force-failed every live run. (The
  host itself resolves either spelling, verified with `sessions.get` for both, so
  nothing else was affected.)

`test/host-contract.test.ts` pins these payloads with `satisfies TaskRunView` so an
upstream change fails the build rather than silently reintroducing the same class of
bug.

### Reconciler against the live database

Driven through the store's own API against
`~/.openclaw/plugins/flowboard/flowboard.sqlite`, on one throwaway card:

- A run with a fresh heartbeat: `checked 1, updated 0, finished 0` — untouched. This
  is the regression line for the sweep that would have force-failed live runs.
- The same run 41 minutes silent: `finished 1`, execution `blocked`, claim cleared,
  running attempt closed.
- Next pass: card status caught up to `blocked`; the pass after that reported
  `checked 0` — converged and out of the active set.

The loop inside the real Gateway process was confirmed separately, by leaving a
claim to lapse and watching it act with no client attached:

```
flowboard reconciled 1 active cards: 0 updated, 0 orphaned runs closed, 1 claims reclaimed, 0 skipped.
```

Zero `reconcile failed` warnings have been logged since the restart onto this build.

### Control UI in a real browser

First completed run of the smoke test that had been outstanding since M1, now that
`gateway.controlUi.embedSandbox` is set to `trusted`. A Playwright session visited
the token URL from `openclaw dashboard --no-open` so the Control UI provisioned a
device identity, then opened `/flowboard/` on the same origin and drove the real
WebSocket:

- Board list, project view, milestone columns, and card detail all render with live
  data. Zero console errors and zero page errors throughout.
- Creating a card through the UI persisted it (`revision 1`, visible immediately).
- **Live refresh:** a card moved by `openclaw flowboard move` outside the browser
  appeared in the open page **within one second**, with one navigation entry — the
  long poll alone, no reload and no interaction. This is the pure-observer claim.
- Locale switching to English works. No dynamic locale chunk is fetched because
  English is the statically imported fallback; the picker offers only these two
  locales, so the dynamic chunks are not reachable from the UI.
- The UI has **no comment affordance** — `flowboard.cards.comment` has no caller in
  `ui/src`. Of 83 registered Gateway methods, 42 are called by the UI and 41 are
  agent/CLI-only (claim, heartbeat, complete, block, comment, attachments,
  notifications, export, stats). Every method the UI calls is registered. The M1
  smoke list below therefore names steps the UI never had.

### Breadth checks

- All 16 read-only Gateway methods called with `{}`: the ten that need no argument
  answer normally, and the six that require an id return a structured
  `flowboard_error` rather than crashing.
- Four independent client processes claiming one card concurrently: exactly one won,
  the other three got `card already claimed by racer-2`. Genuinely cross-process
  compare-and-swap is covered separately by `test/card-revision.test.ts`.
- Schema 6 to 7 on a copy of the production database (103 cards): marker added, all
  three columns and the claim-owner index created, `flowboard_meta` populated, no
  rows lost. Every migrated row reads back at `revision 0`; the first write stamps
  it to 1, and a stale `expectedRevision: 0` is then refused.
- The `/flowboard/` HTTP route is declared `auth: "plugin"`, which means the plugin
  owns authentication — and it does not authenticate. The HTML shell and JS assets
  are served without credentials. Encoded and raw traversal both 404, a missing
  asset 404s, deep routes fall back to the shell, and non-GET returns 405, so what
  is exposed is the static bundle and nothing else. Acceptable under the default
  loopback bind; worth revisiting before binding to a LAN or tailnet.

Not verified in this pass: dispatching a real worker run end to end. `openclaw
flowboard dispatch` refused with `target agent is not sandboxed for this
restricted Flowboard card`, which is the workspace gate behaving correctly;
clearing it needs `--admin` full-host access, which was not granted to an
unattended probe. Attempted and found broken below, once granted.

### Real worker dispatch with `--admin` — found a defect, not a pass

`--admin` was granted for one throwaway card in the archived `fb-probe`
project (restored, tested, re-archived; card deleted after). Dispatch itself
worked mechanically — claim, subagent spawn, `subagent_ended` convergence to
`review` — but the worker could not do the one thing it was dispatched to do.

Two runs, same result for two different reasons:

- **Run 1**: the worker called `workboard_heartbeat`, `workboard_comment`,
  `workboard_proof`, `workboard_complete` — the bundled Workboard plugin's
  tools, not Flowboard's — despite the prompt naming `flowboard_*` explicitly
  twice. All four calls returned `card not found` (wrong plugin's card store).
  The card still converged to `status: review`, `execution.status: done`,
  `attempt.status: succeeded`, with zero comments, zero proof, no summary.
- **Run 2**: told explicitly and only to call `flowboard_complete`, the model's
  own reasoning (captured in the session transcript) states it has no
  `flowboard_*` tool in its available tool list at all — only `workboard_*`.
  It then called the generic `exec` tool to `echo` a string that looks like a
  tool call (`flowboard_complete({...})`), which "succeeded" because `echo`
  always does, and its final message reports the card as blocked on a missing
  tool. The card still converged to `review` the same way.

Root cause, traced through `src/backend/src/dispatcher.ts` and
`src/backend/src/workspace-access.ts`: the only place Flowboard ever asks the
host to attach the Flowboard tool set (and require
`flowboard_heartbeat`/`flowboard_complete`/`flowboard_block`) to a dispatched
subagent is `assertRestrictedFlowboardTarget` →
`resolveAgentFlowboardWorkspaceRuntime`, which passes
`confinedToolNames: FLOWBOARD_TOOL_NAMES` and
`requiredToolNames: FLOWBOARD_REQUIRED_WORKER_TOOLS` to the host's
`prepareSandboxWorkspaceAuthority`. All three call sites of
`assertRestrictedFlowboardTarget` in `dispatcher.ts` (lines ~367, ~399, ~445)
are gated by `if (!workspaceAccess.unrestricted)`. `params.subagent.run(...)`
(`dispatcher.ts:459`), the call that actually spawns the worker, passes no
tool list of its own — it relies entirely on that gated call having already
happened. `--admin` makes `workspaceAccess.unrestricted` true, so none of the
three call sites fire, so the host never hears about Flowboard's tools for
that run, so the subagent gets whatever its underlying agent profile's static
default tools are (here: the bundled Workboard plugin plus generic tools like
`exec`, but not Flowboard).

Meanwhile `finishExecutionForRun` (`store-workflow.ts:205-206`,
`succeeded = outcome === "ok"`) treats the host's `subagent_ended` event as a
pass/fail signal on its own — `outcome: "ok"` means only "the agent turn ended
without a host-level error," not "the worker called `flowboard_complete`" or
did anything Flowboard-shaped at all. Combined, a `--admin` dispatch converges
every run to `review` — indistinguishable on the card from a genuine
completion — with no comment, proof, or summary recorded, regardless of
whether the worker did anything.

### The real root cause is one level deeper — a host SDK gap, not an `if`

Attempting the fix implied above (route `--admin` through
`assertRestrictedFlowboardTarget` too, unconditionally) revealed it would not
have worked. `prepareSandboxWorkspaceAuthority` is supplied in `gateway.ts:93-99`
via `(api.runtime as unknown as { sandbox?: { prepareWorkspaceAuthority?: ... } }).sandbox`
— an `as unknown as` cast reaching for a property that does not exist on this
host. `grep -rn "prepareWorkspaceAuthority" node_modules/openclaw/` returns zero
matches in the installed OpenClaw 2026.7.1-2 package, and the public `PluginRuntime`
type (`node_modules/openclaw/dist/types-DaHgOqFX.d.ts:8424`) has no `sandbox`
field at all. So `sandbox` is always `undefined`, `prepareSandboxWorkspaceAuthority`
is always `undefined`, and `resolveAgentFlowboardWorkspaceRuntime` always takes its
`if (!sandboxRuntime)` early return — `{ sandboxed: false, workspaceAccess: { unrestricted: true } }`
— regardless of `--admin`. This means:

- A normal (non-admin) dispatch of a card with restricted workspace access is
  **also** broken on this host version: `assertRestrictedFlowboardTarget` always
  resolves `sandboxed: false` and throws `target agent is not sandboxed for this
  restricted Flowboard card` — not because no agent on this host happens to be
  sandboxed, but because the hook this code depends on to find out doesn't exist.
- The public SDK does export a real sandbox-status function —
  `resolveSandboxRuntimeStatus` from `openclaw/plugin-sdk/sandbox`
  (`node_modules/openclaw/dist/sandbox-BMYGaWSS.d.ts`) — but its signature is
  `{ cfg, sessionKey } → { sandboxed, mode, ... }` with no way to request that
  specific tools be attached to a run.
- The call that actually spawns the worker, `runtime.subagent.run(params)`, has
  a `SubagentRunParams` type (`types-DaHgOqFX.d.ts:8356`) with no tool-related
  field and no `agentId` — a subagent's toolset is entirely the static
  configuration of whatever agent its session key resolves to (here: `main`),
  and the plugin SDK gives a plugin no lever to attach its own optional tools to
  one dispatched run. `~/.openclaw/openclaw.json`'s `agents` config has no
  per-agent tool allowlist either.

Conclusion: `workspace-access.ts`'s whole `confinedToolNames`/`requiredToolNames`/
`prepareSandboxWorkspaceAuthority` mechanism was written against a host interface
that has never existed in a shipped OpenClaw version. This is not fixable inside
this repository — it needs either an upstream SDK capability or a different,
currently-unknown static configuration lever. Not scoped to `--admin`: every
dispatch path hits the same gap. The one historical successful run (card
`252615eb`, referenced in earlier planning) could not be reconstructed or
explained by this investigation.

Not verified as a result: a worker actually calling `flowboard_heartbeat`,
`flowboard_comment`, `flowboard_proof`, or `flowboard_complete` for real, and
any of the 43 tools being exercised at all — both attempts had zero working
Flowboard tool calls between them. Recorded in [[需求/8.6-问题修复.md]] as a
host capability gap, not something this round fixed.

## Architecture rework — July 29, 2026

The control loop moved from the browser to the Gateway, and card admission moved
from in-process locks to a database compare-and-swap. Verified from the
repository root:

```bash
npm run check:public-names   # 44 active files, 43 tool names agree
npm run typecheck
npm test
npm run build
npm run pack:check
```

Covered by new automated tests:

- **Cross-process compare-and-swap** (`test/card-revision.test.ts`): two stores
  over one database file — standing in for two Gateway processes, sharing no
  in-process queue — claim the same card at the same revision, and exactly one
  wins. Also covers revision monotonicity across reopen, a stale
  `expectedRevision` being rejected, the indexed `claim_owner_id` mirror, change
  cursor continuity across reopen, and prompt-version persistence.
- **Lifecycle decisions** (`test/lifecycle.test.ts`) and **reconciler behavior**
  (`test/reconciler.test.ts`). Both were rewritten after the live-host verification
  above: their host-payload fixtures asserted a contract the host does not have, so
  they passed while the code could not work. They now cover live/stale/abandoned run
  evidence, the finished-execution catch-up, and the guards that stop lifecycle from
  disturbing a status a human parked or walking a finished card backwards.
- **Worker prompt** (`test/worker-prompt.test.ts`): deterministic output for a
  fixed clock, the protocol header, and retry guidance that names prior failures
  and warns on the last attempt within the retry budget.

The UI was checked in a real browser against `npm run dev`: the declared
`<flowboard-app>` mount point upgrades to the Lit element and renders, with no
page errors. It no longer replaces `document.body` to compensate for a
name mismatch.

Not re-verified in this pass: the runtime and Git-distribution checks below, and
the trusted Control UI smoke test. Both were taken up in the live-host verification
above, which supersedes this section's claims about reconciliation.
