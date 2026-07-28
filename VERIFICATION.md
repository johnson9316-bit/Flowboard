# Verification record

## Environment

- Date: July 28, 2026
- Node: 22.22.3
- OpenClaw: 2026.7.1-2 (`0790d9f`)

## Automated checks

Completed from the repository root:

```bash
npm run generate:upstream-import
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

## Runtime checks

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

## Git distribution

After pushing the initial Flowboard commit, verify from a clean clone:

```bash
git clone https://github.com/johnson9316-bit/Flowboard.git Flowboard
openclaw plugins install --link /path/to/Flowboard
openclaw plugins inspect flowboard --runtime
```

The release is not considered distribution-verified until this sequence has
been recorded against a clone without uncommitted source files.

## Trusted iframe UI

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
