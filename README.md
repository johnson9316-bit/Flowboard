# Flowboard

Flowboard is an OpenClaw plugin for planning and running work across projects.
It combines project milestones, a lightweight document reader, delivery facts,
and OpenClaw-managed worktree execution in one board.

English is the primary project language. The Control UI supports English and
Simplified Chinese.

## What It Provides

- Projects with milestone columns, including a permanent **Unassigned** column.
- Cards whose board placement is separate from their execution status.
- Card delivery records for development, validation, release, and source
  references. A completed card never implies that validation or release happened.
- A project document library that securely renders explicitly registered
  Markdown files without indexing project directories or storing file contents.
- OpenClaw-native card execution in managed Git worktrees: prompt preview,
  start confirmation, run inspection, steering, abort, and a link to the
  native Chat session.
- OpenClaw CLI commands, slash commands, tools, and Gateway RPC methods under
  the isolated `flowboard` namespace.
- Independent English/Simplified Chinese UI language preference, while still
  inheriting the host Control UI theme.

## Requirements

- OpenClaw `>=2026.7.1 <2027.0.0`
- Node.js `>=22`
- A trusted Control UI embedding configuration for the authenticated plugin UI

Flowboard runs inside the same Gateway as the Control UI. It does not start a
separate web server.

## Install

### From ClawHub

After the package is published, install the scoped package:

```bash
openclaw plugins install clawhub:@johnson9316-bit/flowboard
openclaw plugins enable flowboard
openclaw gateway restart
```

### From GitHub

Install directly from this repository:

```bash
openclaw plugins install git:github.com/johnson9316-bit/Flowboard
openclaw plugins enable flowboard
openclaw gateway restart
```

Open the **Flowboard** tab from the OpenClaw Control UI after the Gateway has
restarted.

## Control UI Security

The Control UI uses the browser identity already paired with the same-origin
Gateway. Configure the embedding sandbox as trusted only when the Gateway and
its installed plugins are trusted:

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "trusted",
    },
  },
}
```

The default `scripts` sandbox is origin-isolated and cannot access that paired
identity, so it cannot provide the complete Flowboard UI.

## Data and Execution

Flowboard stores its SQLite state under:

```text
plugins/flowboard/flowboard.sqlite
```

relative to `OPENCLAW_STATE_DIR`. It uses its own data, commands, tools, RPC
methods, UI route, and database namespace. The bundled OpenClaw Workboard can
remain enabled.

When a card starts OpenClaw-native execution, Flowboard only supports a
managed Git worktree. It does not fall back to running directly in the primary
checkout. Stopping an execution preserves the card's business status and does
not automatically infer delivery, validation, or release facts.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:public-names
npm run pack:check
```

For local Gateway testing:

```bash
openclaw plugins install --link /home/john/src/personal/Flowboard
openclaw plugins enable flowboard
openclaw gateway restart
openclaw plugins inspect flowboard --runtime
openclaw plugins doctor
```

`npm run dev` starts a Vite server for visual development only. It cannot
exercise Gateway authentication or the paired browser identity; verify those
flows through the Gateway-hosted Control UI.

## Release and Publishing

The ClawHub package identity is `@johnson9316-bit/flowboard`. The unscoped
`flowboard` name belongs to an unrelated community package and is intentionally
not used.

The release procedure, validation steps, and trusted-publisher handoff are
recorded in [docs/CLAW_HUB_PUBLISHING.md](docs/CLAW_HUB_PUBLISHING.md).

## License and Attribution

Flowboard is distributed under the [MIT License](LICENSE). It began from an
imported OpenClaw Workboard baseline; the exact source commit and local changes
are documented in [UPSTREAM.md](UPSTREAM.md).
