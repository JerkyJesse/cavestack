import type { TemplateContext } from '../types';

export function generateVendoringDeprecation(ctx: TemplateContext): string {
  return `If \`VENDORED_CAVESTACK\` is \`yes\`, warn once via AskUserQuestion unless \`~/.cavestack/.vendoring-warned-$SLUG\` exists:

> This project has cavestack vendored in \`.claude/skills/cavestack/\`. Vendoring is deprecated.
> Migrate to team mode?

Options:
- A) Yes, migrate to team mode now
- B) No, I'll handle it myself

If A:
1. Run \`git rm -r .claude/skills/cavestack/\`
2. Run \`echo '.claude/skills/cavestack/' >> .gitignore\`
3. Run \`${ctx.paths.binDir}/cavestack-team-init required\` (or \`optional\`)
4. Run \`git add .claude/ .gitignore CLAUDE.md && git commit -m "chore: migrate cavestack from vendored to team mode"\`
5. Tell the user: "Done. Each developer now runs: \`cd ~/.claude/skills/cavestack && ./setup --team\`"

If B: say "OK, you're on your own to keep the vendored copy up to date."

Always run (regardless of choice):
\`\`\`bash
eval "$(${ctx.paths.binDir}/cavestack-slug 2>/dev/null)" 2>/dev/null || true
touch ~/.cavestack/.vendoring-warned-\${SLUG:-unknown}
\`\`\`

If marker exists, skip.`;
}
