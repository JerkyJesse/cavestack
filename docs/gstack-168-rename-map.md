# gstack 1.68.3 → cavestack rename map

Fetch-only remote: `gstack` → `https://github.com/garrytan/gstack.git`.
Reference clone: `/tmp/gstack-ref` at **VERSION 1.68.3.0**.
Do **not** `git merge` gstack. Copy files, then rename.

## Mechanical rename

| Upstream | CaveStack |
|----------|-----------|
| `gstack` / `GStack` / `GSTACK` | `cavestack` / `CaveStack` / `CAVESTACK` |
| `~/.gstack` | `~/.cavestack` |
| `gstack-*` bins | `cavestack-*` bins |
| `github.com/garrytan/gstack` install URLs | `github.com/JerkyJesse/cavestack` |
| `_gstack_source` hook tag | `_cavestack_source` |
| `GSTACK_CHROMIUM_PATH` | `CAVESTACK_CHROMIUM_PATH` |
| `resolveGstackHome` / `findGstackInstallRoot` | `resolveCavestackHome` / `findCavestackInstallRoot` |

## Leave unchanged

- **gbrain / GBrain / GBRAIN / `/setup-gbrain`** — product name
- Caveman default `full`; `hooks/caveman-*`; `voices/`
- `bin/cavestack-cs-aliases` and existing `cs-*` aliases
- LICENSE attribution to Garry Tan / gstack
- CHANGELOG history below 2.1.0.0
- `scripts/resolvers/behavioral-protocols.ts` anti-gstack-comparison rules

## Keep (CaveStack deltas re-applied)

- Claude `skipSkills: ['claude']` (caveman skills stay)
- External hosts skip `CAVEMAN_SKILLS` + `codex`
- `install.prefixable` optional; Claude `true`, others `false`
- `generateVoiceDirective()` → `getVoiceDirective()` default `caveman-full`
- `./setup --caveman` / `--no-caveman`; caveman off for kiro/factory/opencode/cursor/slate/codex

## Confirmed bugfixes in this tree (gstack 1.63–1.68)

1. `revokeToken` deletes **all** tokens for a client (not the first match)
2. `GET /health` does not return `AUTH_TOKEN`; bootstrap is `POST /extension-token`
3. Freeze/careful nest `permissionDecision` under `hookSpecificOutput`; JSON-parse commands
4. `mktemp` uses `$TMPDIR`/`$TMP` + trailing `XXXXXX` (no hardcoded `/tmp`)
5. SID `icacls`, `windowsHide` on spawns, bun-polyfill `exited`, `build-node-server.sh` no glob/`head` pipeline
6. `cavestack-settings-hook prune-stale --repoint`, mutation lock, fail-closed corrupt JSON, Windows `bash ` prefix on all hooks

## New hosts (gstack 1.68.3 set)

`claude`, `kiro`, `cursor`, `codex`, `factory`, `opencode`, `slate`, `openclaw`, `hermes`, `gbrain`

Cursor skills: `~/.cursor/skills/cavestack-*`.
