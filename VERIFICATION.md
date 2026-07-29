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

Not verified: dispatching a real worker run end to end. `openclaw flowboard dispatch`
refused with `target agent is not sandboxed for this restricted Flowboard card`,
which is the workspace gate behaving correctly; clearing it needs `--admin`
full-host access, which was not granted to an unattended probe.

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
