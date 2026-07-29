# Publishing Flowboard to ClawHub

This document records the release workflow for the official OpenClaw package
registry, ClawHub. It is intentionally written in English because the package
metadata, GitHub repository, and public release surface are English-first.

Publishing to the ClawHub registry creates a community package. It does not
self-designate the package as an OpenClaw first-party or "official channel"
package; that channel is controlled by the OpenClaw maintainers.

## Package Identity

| Field | Value |
| --- | --- |
| ClawHub package | `@johnson9316-bit/flowboard` |
| OpenClaw runtime ID | `flowboard` |
| GitHub repository | `johnson9316-bit/Flowboard` |
| Package family | `code-plugin` |
| Distribution artifact | npm pack tarball |

The unscoped `flowboard` package is already owned by an unrelated community
package. Do not publish or install Flowboard under that name.

## Release Preconditions

1. Work from a clean commit on `main`.
2. Bump the version in `package.json` and `package-lock.json`.
3. Build the checked-in runtime artifacts.
4. Run the repository checks:

```bash
npm run typecheck
npm test
npm run build
npm run check:public-names
npm run pack:check
npx clawhub package validate . --json
openclaw plugins inspect flowboard --runtime
openclaw plugins doctor
```

`openclaw.compat.pluginApi` and `openclaw.build.openclawVersion` in
`package.json` must reflect the OpenClaw plugin API used for the release.

### Runtime Capture Note

ClawHub CLI `0.23.1`'s optional `package validate --runtime --allow-execute`
currently fails while mocking `resolveStateDir` for Flowboard's OpenClaw
`2026.7.1-2` compatibility layer. The static ClawHub validation reports zero
issues, and the real-Gateway `plugins inspect --runtime` plus `plugins doctor`
checks above are the release gate until that upstream mock incompatibility is
resolved. Do not treat a clean static report as a substitute for the real
Gateway checks.

## First Manual Release

The first release establishes package ownership and source provenance. Start
an interactive device login in a visible browser:

```bash
npx clawhub login
npx clawhub whoami
```

Publish the current Git commit from the repository root:

```bash
npx clawhub package publish . \
  --family code-plugin \
  --name @johnson9316-bit/flowboard \
  --display-name Flowboard \
  --version <version> \
  --changelog "<release notes>" \
  --categories productivity \
  --topics openclaw,kanban,project-management,milestones,worktree \
  --source-repo johnson9316-bit/Flowboard \
  --source-commit "$(git rev-parse HEAD)" \
  --source-ref "v<version>"
```

Create and push the matching annotated tag before publishing:

```bash
git tag -a "v<version>" -m "Flowboard v<version>"
git push origin main "v<version>"
```

After publication, verify both the registry package and the install path:

```bash
npx clawhub package inspect @johnson9316-bit/flowboard
npx clawhub package readiness @johnson9316-bit/flowboard
openclaw plugins install clawhub:@johnson9316-bit/flowboard
openclaw plugins inspect flowboard --runtime
openclaw plugins doctor
```

## Trusted Publishing

After the first manual release, configure ClawHub trusted publishing to bind
future releases to this GitHub repository and its release workflow. The
publisher account must be authenticated when running this command:

```bash
npx clawhub package trusted-publisher set \
  @johnson9316-bit/flowboard \
  --repository johnson9316-bit/Flowboard \
  --workflow-filename package-publish.yml
```

Use the current ClawHub workflow template from the registry documentation when
adding `.github/workflows/package-publish.yml`. Grant `contents: read` and
`id-token: write`; do not add a long-lived ClawHub or npm token to GitHub
Secrets for the trusted-publisher workflow.

For manually dispatched workflow runs, OpenID Connect can publish without a
stored token. Tag-triggered publishing may require the release policy
supported by the current ClawHub workflow template, so validate the workflow
in a manual dispatch before making tag pushes the release trigger.

## Release Checklist

1. Review the complete diff and confirm no local state, database, `.env`, or
   credential is included.
2. Run all checks from the Release Preconditions section.
3. Commit the release and push `main`.
4. Create and push the version tag.
5. Publish, then inspect the ClawHub package and scan result.
6. Install the published artifact into a clean OpenClaw profile and run
   `plugins inspect` plus `plugins doctor`.
7. Record the package version, source commit, ClawHub scan result, and any
   compatibility range changes in the GitHub release notes.

## Incident Handling

- If validation fails, fix the package metadata or code and publish a new
  version. Published artifacts are immutable.
- If a release is published from the wrong source commit, do not overwrite it;
  deprecate or delete the affected release through ClawHub moderation and
  publish a corrected version.
- If the package needs to move to another publisher, use the ClawHub package
  transfer command rather than changing the npm scope locally.
- If a token is ever exposed, revoke it through ClawHub immediately, rotate
  any affected GitHub credentials, and publish only after the source has been
  reviewed.
