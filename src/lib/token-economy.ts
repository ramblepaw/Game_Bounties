// Fallback used when a Checklist doesn't specify its own tokenReward.
export const DEFAULT_TOKENS_PER_COMPLETION = 10;

/** True when a checklist is explicitly set to award 0 tokens (null means "use the default", which is non-zero). */
export function isTokenless(tokenReward: number | null): boolean {
  return (tokenReward ?? DEFAULT_TOKENS_PER_COMPLETION) === 0;
}
