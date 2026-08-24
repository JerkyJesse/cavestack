import { getVoiceDirective } from '../voice';

/**
 * CaveStack identity: default voice is caveman-full (voices/caveman-full.json).
 * Override at generate time with --voice=<profile> (see scripts/resolvers/voice.ts).
 */
export function generateVoiceDirective(tier: number): string {
  return getVoiceDirective(tier);
}
