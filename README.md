# Flowboard

**Flowboard** is an external OpenClaw board plugin with the same local operating
card model as the imported upstream baseline, isolated from the bundled
plugin under the `flowboard` public namespace and SQLite database.

## Requirements

- OpenClaw `>=2026.7.1 <2027.0.0`
- Node.js `>=22`
- The Control UI must be served by the same Gateway that hosts Flowboard.

The Control UI has one hard security prerequisite:

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "trusted",
    },
  },
}
```

The UI reuses the already-paired browser device identity from the same-origin
Control UI. `strict` blocks the required script execution. The default
`scripts` mode runs the frame in an origin-isolated sandbox, so it cannot read
that paired identity. Both modes therefore cannot provide the full Flowboard
UI. Use `trusted` only for a Gateway and plugin installation you trust.

## Install

Install this release:

```bash
openclaw plugins install git:github.com/johnson9316-bit/Flowboard
openclaw plugins enable flowboard
openclaw gateway restart
```

Open the **Flowboard** Control UI tab. Its static files are authenticated by
the Gateway at `/flowboard/`; it does not start a separate HTTP service or
proxy business requests.

## Interfaces

- CLI: `openclaw flowboard ...`
- Slash command: `/flowboard ...`
- Tools: `flowboard_*`
- Gateway RPC: `flowboard.*`
- Control UI: **Flowboard** tab at `/flowboard/`
- Storage: `plugins/flowboard/flowboard.sqlite` beneath `OPENCLAW_STATE_DIR`

The bundled board plugin can remain enabled. Its IDs, commands, tools, RPCs,
tab route, and database are separate from Flowboard.

## UI baseline

The initial Flowboard UI imports the fixed upstream Workboard page, state layer,
stylesheet, and locale bundles. The standalone host maps its internal
`workboard.*` calls to `flowboard.*`; Flowboard data remains isolated. Idle UI
refresh is driven by the `flowboard.changes.wait` long-wait RPC, rather than a
periodic `cards.list` request.

## Upgrade and uninstall

```bash
openclaw plugins update flowboard
openclaw gateway restart
```

```bash
openclaw plugins disable flowboard
openclaw plugins uninstall flowboard
openclaw gateway restart
```

Uninstalling the plugin does not delete the SQLite state automatically. Remove
`plugins/flowboard/flowboard.sqlite` only when the board history is no longer
needed.

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
openclaw plugins install --link /home/john/src/personal/Flowboard
openclaw plugins enable flowboard
openclaw gateway restart
```

`npm run dev` starts a Vite server for UI layout work. Gateway authentication
and the paired device identity are intentionally unavailable there; perform
functional UI testing through the Gateway-hosted trusted Control UI tab after
`npm run build`.

## Verification

```bash
npm run check:public-names
npm run typecheck
npm test
npm run build
npm run pack:check
openclaw plugins inspect flowboard --runtime
openclaw plugins doctor
```

See `VERIFICATION.md` for the recorded M1 checks and `UPSTREAM.md` for the
import baseline.
