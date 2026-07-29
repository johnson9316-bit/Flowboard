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

## Architecture rework — July 29, 2026

The control loop moved from the browser to the Gateway, and card admission moved
from in-process locks to a database compare-and-swap. Verified from the
repository root:

```bash
npm run check:public-names   # 44 active files, 43 tool names agree
npm run typecheck
npm test                     # 98 passing
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
- **Lifecycle decisions** (`test/lifecycle.test.ts`, 28 cases): the task/session
  precedence rules, stale-session detection, and the guards that stop lifecycle
  from disturbing a status a human parked or walking a finished card backwards.
- **Reconciler behavior** (`test/reconciler.test.ts`): a running card converges to
  `review`/`blocked` from host state with no browser involved; the startup pass
  closes a run orphaned by a Gateway restart while a periodic pass does not; an
  unreachable host changes nothing rather than treating "unknown" as "no
  sessions"; one uncooperative card does not abort the sweep.
- **Worker prompt** (`test/worker-prompt.test.ts`): deterministic output for a
  fixed clock, the protocol header, and retry guidance that names prior failures
  and warns on the last attempt within the retry budget.

The UI was checked in a real browser against `npm run dev`: the declared
`<flowboard-app>` mount point upgrades to the Lit element and renders, with no
page errors. It no longer replaces `document.body` to compensate for a
name mismatch.

Not re-verified in this pass: the runtime and Git-distribution checks below, and
the trusted Control UI smoke test, which remains outstanding.
