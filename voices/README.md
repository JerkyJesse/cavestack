# Voice Profiles

Voice profiles control how CaveStack skills emit prose — from vanilla verbose (`none`) through caveman-full and caveman-ultra.

Each profile is a JSON file validated against `schema.json`. `generateVoiceDirective()` in `scripts/resolvers/preamble.ts` reads the active profile and injects the directive into every generated SKILL.md.

## Active profile

```bash
cavestack-config get voice   # read active profile
cavestack-config set voice caveman-full   # switch
```

Resolution order (first match wins):

1. `CAVESTACK_VOICE` env var
2. `~/.config/cavestack/config.json` or `$XDG_CONFIG_HOME/cavestack/config.json` (`voice` key)
3. `~/.cavestack/config.yaml` (`voice` key)
4. Default: `caveman-full`

## Profile fields

| Field | Purpose |
|-------|---------|
| `name` | Profile ID (must match filename) |
| `description` | Human-readable summary |
| `directive.compact` | Voice block for tier-1 skills (browse, benchmark, setup) |
| `directive.full` | Voice block for tier 2-4 (most skills) |
| `priority_instruction` | Runtime line injected by `caveman-voice-priority.js` |
| `density_thresholds` | Runtime floor for `caveman-voice-verify.js` Stop hook |
| `verbose_phrases` | Optional per-profile substitution pairs for `--fix` mode |

## Density thresholds

`density_thresholds` defines the runtime floor enforced by the `caveman-voice-verify` Stop hook. Every caveman profile ships with a threshold object. `none` has no thresholds (verbose by design).

| Metric | `caveman-full` | `caveman-lite` | `caveman-ultra` |
|---|---|---|---|
| `articlesPerHundred` | 2.0 | 3.0 | 1.0 |
| `fillersPerHundred` | 1.0 | 1.5 | 0.5 |
| `hedgesPerHundred` | 0.5 | 0.75 | 0.25 |
| `verbosePhraseMax` | 3 | 5 | 1 |

### Derivation

Template-level defaults in `scripts/lib/voice-density.ts` (`DEFAULT_THRESHOLDS`) were calibrated from 14 already-compressed templates (commit `6c16229`) at the 90th percentile of compressed results. Runtime thresholds tighten that:

- `caveman-full` sits ~2.25x tighter than template defaults. Compressed assistant output (single message, no headers/tables) scores lower than compressed templates, which contain scaffolding. Tighter gate catches model drift without false-positive-tripping compressed-but-not-cave prose.
- `caveman-lite` sits ~1.5x looser than `caveman-full`. Lite keeps articles + sentence structure, so `articlesPerHundred` is proportionally higher.
- `caveman-ultra` sits ~2x stricter than `caveman-full`. Ultra demands fragments + tables; any article or filler is a miss.

### When to adjust

If the Stop hook is false-positive blocking on obviously-compressed messages, the threshold is too tight. If genuinely verbose output ships without a block, too loose. Log which metric tripped via `CAVESTACK_VOICE_VERIFY_DEBUG=1` (stderr only — no disk writes), adjust, commit.

Never edit thresholds to silence a single false positive — the shared regex in `scripts/lib/voice-density.ts` is the better lever. Adjust the regex, keep thresholds portable.

## `extractNonFloorText` (runtime)

The Stop hook strips code blocks, inline code spans, markdown tables with separator rows, HTML comments, and leading YAML frontmatter before scoring. It does NOT strip bulleted lists containing `|` (inline pipes in prose). Accepts false-positive risk on 2-line pseudo-tables without a separator row.

Template-side audit (`voice-audit.ts`) uses a richer `extractProse()` that additionally handles headers and per-section floor detection. The math shared between both paths lives in `scripts/lib/voice-density.ts`.

## Adding a new profile

1. Copy an existing profile JSON
2. Rename `name` field and filename to match
3. Edit `directive.compact` and `directive.full`
4. Add `density_thresholds` if the profile should participate in runtime verification
5. Run `bun run gen:skill-docs --voice=<name>` to regenerate with the new voice
