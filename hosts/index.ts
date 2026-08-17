/**
 * Host config registry.
 *
 * CaveStack supports multiple AI coding agents. Each host is defined as a
 * typed HostConfig object in hosts/*.ts. The registry loads all configs and
 * provides lookup utilities consumed by gen-skill-docs, setup, skill-check,
 * worktree, platform-detect, and uninstall.
 */

import type { HostConfig } from '../scripts/host-config';
import claude from './claude';
import kiro from './kiro';

/** All registered host configs. */
export const ALL_HOST_CONFIGS: HostConfig[] = [claude, kiro];

/** Map from host name to config. */
export const HOST_CONFIG_MAP: Record<string, HostConfig> = { claude, kiro };

/** Supported host name literals. */
export type Host = 'claude' | 'kiro';

/** Get a host config by name. Defaults to 'claude'. */
export function getHostConfig(name: string = 'claude'): HostConfig {
  const config = HOST_CONFIG_MAP[name];
  if (!config) {
    const supported = ALL_HOST_CONFIGS.map(c => c.name).join(', ');
    throw new Error(`Unknown host '${name}'. Supported hosts: ${supported}`);
  }
  return config;
}

// Re-export hosts for direct import
export { claude, kiro };
