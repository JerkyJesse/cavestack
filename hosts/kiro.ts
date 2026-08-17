import type { HostConfig } from '../scripts/host-config';

const kiro: HostConfig = {
  name: 'kiro',
  displayName: 'Kiro',
  cliCommand: 'kiro',
  cliAliases: [],

  globalRoot: '.kiro/skills/cavestack',
  localSkillRoot: '.kiro/skills/cavestack',
  hostSubdir: '.kiro',
  usesEnvVars: true,

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'],
    descriptionLimit: null,
  },

  generation: {
    generateMetadata: false,
    skipSkills: ['codex', 'caveman', 'caveman-commit', 'caveman-help', 'caveman-review'],
  },

  pathRewrites: [
    { from: '~/.claude/skills/cavestack', to: '~/.kiro/skills/cavestack' },
    { from: '.claude/skills/cavestack', to: '.kiro/skills/cavestack' },
    { from: '.claude/skills', to: '.kiro/skills' },
    { from: '~/.cavestack/', to: '~/.cavestack/' },  // State dir stays the same
  ],

  toolRewrites: {
    'use the Bash tool': 'run this command',
    'Claude Code': 'Kiro',
  },

  suppressedResolvers: [],

  runtimeRoot: {
    globalSymlinks: ['bin', 'browse/dist', 'browse/bin', 'cavestack-upgrade', 'ETHOS.md'],
    globalFiles: {
      'review': ['checklist.md', 'TODOS-format.md'],
    },
  },

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },

  learningsMode: 'basic',
};

export default kiro;
