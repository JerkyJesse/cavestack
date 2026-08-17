import { ALL_HOST_CONFIGS } from '../../hosts/index';

/**
 * Host type — supported AI coding agents that CaveStack can install for.
 */
export type Host = 'claude' | 'kiro';

export interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
  browseDir: string;
  designDir: string;
}

/**
 * HOST_PATHS — derived from the Claude host config.
 */
function buildHostPaths(): Record<string, HostPaths> {
  const paths: Record<string, HostPaths> = {};
  for (const config of ALL_HOST_CONFIGS) {
    const root = `~/${config.globalRoot}`;
    paths[config.name] = {
      skillRoot: root,
      localSkillRoot: config.localSkillRoot,
      binDir: `${root}/bin`,
      browseDir: `${root}/browse/dist`,
      designDir: `${root}/design/dist`,
    };
  }
  return paths;
}

export const HOST_PATHS: Record<string, HostPaths> = buildHostPaths();

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;
  voiceProfile?: string;
}

/** Resolver function signature. args is populated for parameterized placeholders like {{INVOKE_SKILL:name}}. */
export type ResolverFn = (ctx: TemplateContext, args?: string[]) => string;
