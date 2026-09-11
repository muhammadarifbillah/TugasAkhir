/**
 * Redacts common API keys / tokens from text before it is sent to an
 * external AI provider. This implements the prompt-injection / secret-leak
 * guardrail: user prompts and captured context should never leak credentials
 * to third-party models.
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-proj-[A-Za-z0-9_-]{20,}/g, // OpenAI project keys
  /sk-[A-Za-z0-9_-]{16,}/g, // OpenAI / many providers
  /ghp_[A-Za-z0-9]{30,}/g, // GitHub classic PAT
  /github_pat_[A-Za-z0-9_]{22,}/g, // GitHub fine-grained PAT
  /gho_[A-Za-z0-9]{30,}/g, // GitHub OAuth token
  /AIza[0-9A-Za-z_-]{30,}/g, // Google API keys
  /AKIA[0-9A-Z]{16}/g, // AWS access key id
  /xox[baprs]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /glpat-[A-Za-z0-9_-]{20,}/g, // GitLab PAT
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g, // Authorization headers
];

export function sanitizePrompt(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}