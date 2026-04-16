#!/usr/bin/env node
// CaveRock — lightweight caveman mode for Claude Code
// Standalone UserPromptSubmit hook. No external dependencies.
// Tracks /caveman commands and writes mode to flag file.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = ['lite', 'full', 'ultra'];
const flagPath = path.join(os.homedir(), '.claude', '.caveman-active');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim().toLowerCase();

    // Match /caveman commands
    if (prompt.startsWith('/caveman')) {
      const arg = prompt.split(/\s+/)[1] || 'full';
      if (VALID_MODES.includes(arg)) {
        fs.mkdirSync(path.dirname(flagPath), { recursive: true });
        fs.writeFileSync(flagPath, arg);
      }
    }

    // Detect deactivation
    if (/\b(stop caveman|normal mode)\b/i.test(prompt)) {
      try { fs.unlinkSync(flagPath); } catch {}
    }
  } catch {}
});
