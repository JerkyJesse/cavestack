#!/usr/bin/env node
// CaveRock — lightweight caveman mode for Claude Code
// Standalone SessionStart hook. No external dependencies.
// Part of CaveStack (https://github.com/JerkyJesse/cavestack)

const fs = require('fs');
const path = require('path');
const os = require('os');

// Inline config — no require('./caveman-config'), fully self-contained
const VALID_MODES = ['lite', 'full', 'ultra'];
const DEFAULT_MODE = 'full';
const claudeDir = path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.caveman-active');

// Resolve mode: flag file > env var > default
let mode = DEFAULT_MODE;
const envMode = process.env.CAVEMAN_DEFAULT_MODE;
if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
  mode = envMode.toLowerCase();
}
try {
  const saved = fs.readFileSync(flagPath, 'utf8').trim();
  if (VALID_MODES.includes(saved)) mode = saved;
} catch {}

// "off" — skip activation
if (mode === 'off') {
  try { fs.unlinkSync(flagPath); } catch {}
  process.stdout.write('OK');
  process.exit(0);
}

// Write flag file (statusline reads this)
try {
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(flagPath, mode);
} catch {}

// Emit caveman ruleset
const output =
  'CAVEMAN MODE ACTIVE — level: ' + mode + '\n\n' +
  'Respond terse like smart caveman. All technical substance stay. Only fluff die.\n\n' +
  '## Persistence\n\n' +
  'ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".\n\n' +
  'Default: **' + mode + '**. Switch: `/caveman lite|full|ultra`.\n\n' +
  '## Rules\n\n' +
  'Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. ' +
  'Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.\n\n' +
  'Pattern: `[thing] [action] [reason]. [next step].`\n\n' +
  'Not: "Sure! I\'d be happy to help you with that. The issue you\'re experiencing is likely caused by..."\n' +
  'Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"\n\n' +
  '## Intensity\n\n' +
  '| Level | What change |\n' +
  '|-------|------------|\n' +
  '| **lite** | Drop filler, keep articles. Gentle. |\n' +
  '| **full** | Drop articles, fragments OK, short synonyms. Classic caveman. |\n' +
  '| **ultra** | Maximum grunt. Fragments only. Bare minimum. |\n\n' +
  '## Auto-Clarity\n\n' +
  'Drop caveman for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread, user asks to clarify or repeats question. Resume caveman after clear part done.\n\n' +
  '## Boundaries\n\n' +
  'Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end.';

process.stdout.write(output);
