#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   read .tmpl → find {{PLACEHOLDERS}} → resolve from source → format → write .md
 *
 * Supports --dry-run: generate to memory, exit 1 if different from committed file.
 * Used by skill:check and CI freshness checks.
 */

import { COMMAND_DESCRIPTIONS } from '../browse/src/commands';
import { SNAPSHOT_FLAGS } from '../browse/src/snapshot';
import { discoverTemplates } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';
import type { Host, TemplateContext } from './resolvers/types';
import { HOST_PATHS } from './resolvers/types';
import { RESOLVERS } from './resolvers/index';
import { generatePlanCompletionAuditShip, generatePlanCompletionAuditReview, generatePlanVerificationExec } from './resolvers/review';
import { getHostConfig } from '../hosts/index';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Host Detection ─────────────────────────────────────────
// CaveStack is Claude Code only. Host is a literal for signature compatibility.
const HOST: Host = 'claude';

// ─── Voice Profile Detection ───────────────────────────────
// --voice=<name> selects a voice profile from voices/*.json.
// Default: caveman-full (CaveStack's identity). Use --voice=none for verbose.

const VOICE_ARG = process.argv.find(a => a.startsWith('--voice'));
if (VOICE_ARG) {
  const val = VOICE_ARG.includes('=') ? VOICE_ARG.split('=')[1] : process.argv[process.argv.indexOf(VOICE_ARG) + 1];
  if (val) {
    // Validate early — fail fast on unknown voice
    try {
      const { getVoiceProfile } = require('./resolvers/voice');
      getVoiceProfile(val);
      console.log(`Voice: ${val}`);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  }
}

// Per-skill voice overrides: skill_name → voice_profile_name
// Populated from --voice-override=skill:voice CLI args
const SKILL_VOICE_OVERRIDES = new Map<string, string>();
for (const arg of process.argv) {
  const m = arg.match(/^--voice-override=([a-z0-9-]+):([a-z0-9-]+)$/);
  if (m) SKILL_VOICE_OVERRIDES.set(m[1], m[2]);
}
if (SKILL_VOICE_OVERRIDES.size > 0) {
  console.log(`Voice overrides: ${Array.from(SKILL_VOICE_OVERRIDES.entries()).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

// HostPaths, HOST_PATHS, and TemplateContext imported from ./resolvers/types (line 7-8)

// ─── Shared Design Constants ────────────────────────────────

/** cavestack's 10 AI slop anti-patterns — shared between DESIGN_METHODOLOGY and DESIGN_HARD_RULES */
const AI_SLOP_BLACKLIST = [
  'Purple/violet/indigo gradient backgrounds or blue-to-purple color schemes',
  '**The 3-column feature grid:** icon-in-colored-circle + bold title + 2-line description, repeated 3x symmetrically. THE most recognizable AI layout.',
  'Icons in colored circles as section decoration (SaaS starter template look)',
  'Centered everything (`text-align: center` on all headings, descriptions, cards)',
  'Uniform bubbly border-radius on every element (same large radius on everything)',
  'Decorative blobs, floating circles, wavy SVG dividers (if a section feels empty, it needs better content, not decoration)',
  'Emoji as design elements (rockets in headings, emoji as bullet points)',
  'Colored left-border on cards (`border-left: 3px solid <accent>`)',
  'Generic hero copy ("Welcome to [X]", "Unlock the power of...", "Your all-in-one solution for...")',
  'Cookie-cutter section rhythm (hero → 3 features → testimonials → pricing → CTA, every section same height)',
];

/** OpenAI hard rejection criteria (from "Designing Delightful Frontends with GPT-5.4", Mar 2026) */
const OPENAI_HARD_REJECTIONS = [
  'Generic SaaS card grid as first impression',
  'Beautiful image with weak brand',
  'Strong headline with no clear action',
  'Busy imagery behind text',
  'Sections repeating same mood statement',
  'Carousel with no narrative purpose',
  'App UI made of stacked cards instead of layout',
];

/** OpenAI litmus checks — 7 yes/no tests for cross-model consensus scoring */
const OPENAI_LITMUS_CHECKS = [
  'Brand/product unmistakable in first screen?',
  'One strong visual anchor present?',
  'Page understandable by scanning headlines only?',
  'Each section has one job?',
  'Are cards actually necessary?',
  'Does motion improve hierarchy or atmosphere?',
  'Would design feel premium with all decorative shadows removed?',
];

// ─── Frontmatter Helpers ─────────────────────────────────────

function extractNameAndDescription(content: string): { name: string; description: string } {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return { name: '', description: '' };
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return { name: '', description: '' };

  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = frontmatter.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^description:\s*\|?\s*$/)) {
      inDescription = true;
      continue;
    }
    if (line.match(/^description:\s*\S/)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || line.match(/^\s/)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description };
}

// ─── Voice Trigger Processing ────────────────────────────────

/**
 * Extract voice-triggers YAML list from frontmatter.
 * Returns an array of trigger strings, or [] if no voice-triggers field.
 */
function extractVoiceTriggers(content: string): string[] {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return [];
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return [];
  const frontmatter = content.slice(fmStart + 4, fmEnd);

  const triggers: string[] = [];
  let inVoice = false;
  for (const line of frontmatter.split('\n')) {
    if (/^voice-triggers:/.test(line)) { inVoice = true; continue; }
    if (inVoice) {
      const m = line.match(/^\s+-\s+"(.+)"$/);
      if (m) triggers.push(m[1]);
      else if (!/^\s/.test(line)) break;
    }
  }
  return triggers;
}

/**
 * Preprocess voice triggers: fold voice-triggers YAML field into description,
 * then strip the field from frontmatter. Must run BEFORE transformFrontmatter
 * and extractNameAndDescription so all hosts see the updated description.
 */
function processVoiceTriggers(content: string): string {
  const triggers = extractVoiceTriggers(content);
  if (triggers.length === 0) return content;

  // Strip voice-triggers block from frontmatter
  content = content.replace(/^voice-triggers:\n(?:\s+-\s+"[^"]*"\n?)*/m, '');

  // Get current description (after stripping voice-triggers, so it's clean)
  const { description } = extractNameAndDescription(content);
  if (!description) return content;

  // Build new description with voice triggers appended
  const voiceLine = `Voice triggers (speech-to-text aliases): ${triggers.map(t => `"${t}"`).join(', ')}.`;
  const newDescription = description + '\n' + voiceLine;

  // Replace old indented description with new in frontmatter
  const oldIndented = description.split('\n').map(l => `  ${l}`).join('\n');
  const newIndented = newDescription.split('\n').map(l => `  ${l}`).join('\n');
  content = content.replace(oldIndented, newIndented);

  return content;
}

// Export for testing
export { extractVoiceTriggers, processVoiceTriggers };

/**
 * Transform frontmatter for Claude: strip denylist fields (sensitive, voice-triggers).
 */
function transformFrontmatter(content: string): string {
  const fm = getHostConfig('claude').frontmatter;
  for (const field of fm.stripFields || []) {
    if (field === 'voice-triggers') {
      content = content.replace(/^voice-triggers:\n(?:\s+-\s+"[^"]*"\n?)*/m, '');
    } else {
      content = content.replace(new RegExp(`^${field}:\\s*.*\\n`, 'm'), '');
    }
  }
  return content;
}

// ─── Template Processing ────────────────────────────────────

const GENERATED_HEADER = `<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: bun run gen:skill-docs -->\n`;

function processTemplate(tmplPath: string): { outputPath: string; content: string } {
  // Normalize CRLF→LF so downstream regexes (voice-triggers, denylist strip)
  // behave identically on Windows checkouts and Linux CI. Without this, a
  // CRLF template leaves `voice-triggers:` blocks in the generated SKILL.md
  // while CI regenerates the file with LF and strips them — freshness fails.
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8').replace(/\r\n/g, '\n');
  const relTmplPath = path.relative(ROOT, tmplPath);
  const outputPath = tmplPath.replace(/\.tmpl$/, '');

  // Extract skill name from frontmatter early — needed for TemplateContext.
  const { name: extractedName } = extractNameAndDescription(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));

  // Extract benefits-from list from frontmatter (inline YAML: benefits-from: [a, b])
  const benefitsMatch = tmplContent.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  const benefitsFrom = benefitsMatch
    ? benefitsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // Extract preamble-tier from frontmatter (1-4, controls which preamble sections are included)
  const tierMatch = tmplContent.match(/^preamble-tier:\s*(\d+)$/m);
  const preambleTier = tierMatch ? parseInt(tierMatch[1], 10) : undefined;

  // Per-skill voice override: check SKILL_VOICE_OVERRIDES map
  const voiceProfile = SKILL_VOICE_OVERRIDES.get(skillName) ?? undefined;

  const ctx: TemplateContext = { skillName, tmplPath, benefitsFrom, host: HOST, paths: HOST_PATHS[HOST], preambleTier, voiceProfile };

  // Replace placeholders (supports parameterized: {{NAME:arg1:arg2}})
  const claudeConfig = getHostConfig('claude');
  const suppressed = new Set(claudeConfig.suppressedResolvers || []);
  let content = tmplContent.replace(/\{\{(\w+(?::[^}]+)?)\}\}/g, (match, fullKey) => {
    const parts = fullKey.split(':');
    const resolverName = parts[0];
    const args = parts.slice(1);
    if (suppressed.has(resolverName)) return '';
    const resolver = RESOLVERS[resolverName];
    if (!resolver) throw new Error(`Unknown placeholder {{${resolverName}}} in ${relTmplPath}`);
    return args.length > 0 ? resolver(ctx, args) : resolver(ctx);
  });

  // Check for any remaining unresolved placeholders
  const remaining = content.match(/\{\{(\w+(?::[^}]+)?)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmplPath}: ${remaining.join(', ')}`);
  }

  // Preprocess voice triggers: fold into description, strip field from frontmatter.
  content = processVoiceTriggers(content);

  // Strip denylist fields (sensitive, voice-triggers)
  content = transformFrontmatter(content);

  // Prepend generated header (after frontmatter)
  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertAt = content.indexOf('\n', fmEnd) + 1;
    content = content.slice(0, insertAt) + header + content.slice(insertAt);
  } else {
    content = header + content;
  }

  return { outputPath, content };
}

// ─── Main ───────────────────────────────────────────────────

function findTemplates(): string[] {
  return discoverTemplates(ROOT).map(t => path.join(ROOT, t.tmpl));
}

let hasChanges = false;
const tokenBudget: Array<{ skill: string; lines: number; tokens: number }> = [];
const claudeConfig = getHostConfig('claude');

for (const tmplPath of findTemplates()) {
  const dir = path.basename(path.dirname(tmplPath));

  // includeSkills allowlist (union logic: include minus skip)
  if (claudeConfig.generation.includeSkills?.length) {
    if (!claudeConfig.generation.includeSkills.includes(dir)) continue;
  }
  // skipSkills denylist
  if (claudeConfig.generation.skipSkills?.length) {
    if (claudeConfig.generation.skipSkills.includes(dir)) continue;
  }

  const { outputPath, content } = processTemplate(tmplPath);
  const relOutput = path.relative(ROOT, outputPath);

  if (DRY_RUN) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '';
    if (existing !== content) {
      console.log(`STALE: ${relOutput}`);
      hasChanges = true;
    } else {
      console.log(`FRESH: ${relOutput}`);
    }
  } else {
    fs.writeFileSync(outputPath, content);
    console.log(`GENERATED: ${relOutput}`);
  }

  // Track token budget
  const lines = content.split('\n').length;
  const tokens = Math.round(content.length / 4); // ~4 chars per token
  tokenBudget.push({ skill: relOutput, lines, tokens });

  // Token ceiling check: warn if any generated SKILL.md exceeds ~25K tokens (100KB)
  const TOKEN_CEILING_BYTES = 100_000;
  if (content.length > TOKEN_CEILING_BYTES) {
    console.warn(`⚠️  TOKEN CEILING: ${relOutput} is ${content.length} bytes (~${tokens} tokens), exceeds ${TOKEN_CEILING_BYTES} byte ceiling (~25K tokens)`);
  }
}

if (DRY_RUN && hasChanges) {
  console.error(`\nGenerated SKILL.md files are stale. Run: bun run gen:skill-docs`);
  process.exit(1);
}

// Print token budget summary
if (!DRY_RUN && tokenBudget.length > 0) {
  tokenBudget.sort((a, b) => b.lines - a.lines);
  const totalLines = tokenBudget.reduce((s, t) => s + t.lines, 0);
  const totalTokens = tokenBudget.reduce((s, t) => s + t.tokens, 0);

  console.log('');
  console.log('Token Budget');
  console.log('═'.repeat(60));
  for (const t of tokenBudget) {
    const name = t.skill.replace(/\/SKILL\.md$/, '');
    console.log(`  ${name.padEnd(30)} ${String(t.lines).padStart(5)} lines  ~${String(t.tokens).padStart(6)} tokens`);
  }
  console.log('─'.repeat(60));
  console.log(`  ${'TOTAL'.padEnd(30)} ${String(totalLines).padStart(5)} lines  ~${String(totalTokens).padStart(6)} tokens`);
  console.log('');
}

// Warn if prefix patches may need re-applying
if (!DRY_RUN) {
  try {
    const configPath = path.join(process.env.HOME || '', '.cavestack', 'config.yaml');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf-8');
      if (/^skill_prefix:\s*true/m.test(config)) {
        console.log('\nNote: skill_prefix is true. Run cavestack-relink to re-apply name: patches.');
      }
    }
  } catch { /* non-fatal */ }
}
