/**
 * Host config registry.
 *
 * CaveStack is Claude Code only. This registry exists as a single-entry
 * shim so resolvers and template paths keep a consistent shape.
 */

import type { HostConfig } from '../scripts/host-config';
import claude from './claude';

/** All registered host configs. Claude only. */
export const ALL_HOST_CONFIGS: HostConfig[] = [claude];

/** Map from host name to config. */
export const HOST_CONFIG_MAP: Record<string, HostConfig> = { claude };

/** Host name literal. Always 'claude'. */
export type Host = 'claude';

/** Get the Claude host config. */
export function getHostConfig(name: string = 'claude'): HostConfig {
  if (name !== 'claude') {
    throw new Error(`Unknown host '${name}'. Only 'claude' is supported.`);
  }
  return claude;
}

// Re-export claude for direct import
export { claude };
