/**
 * Raised when a stage turn cannot run because no usable AI model/credential is
 * configured. Lives in its own module so `provider.ts` and `resolve-model.ts`
 * can both use it without importing each other.
 */
export class NoModelConfiguredError extends Error {
  constructor(message = "NO_MODEL_CONFIGURED") {
    super(message);
    this.name = "NoModelConfiguredError";
  }
}

/** Raised when the model returns a document with no visible content. */
export class EmptyModelOutputError extends Error {
  constructor(message = "EMPTY_MODEL_OUTPUT") {
    super(message);
    this.name = "EmptyModelOutputError";
  }
}

export interface ProviderErrorInfo {
  status: number;
  code: string;
  message: string;
}

/** Unwraps AI SDK retry/aggregate errors down to the underlying API call error. */
function findApiCallError(err: unknown): Record<string, unknown> | null {
  let cur = err as Record<string, unknown> | undefined;
  for (let depth = 0; depth < 6 && cur; depth++) {
    if (cur.statusCode || cur.responseBody || cur.name === "AI_APICallError") return cur;
    const errors = cur.errors;
    cur = (cur.lastError as Record<string, unknown> | undefined) ??
      (Array.isArray(errors) ? (errors[errors.length - 1] as Record<string, unknown>) : undefined) ??
      (cur.cause as Record<string, unknown> | undefined);
  }
  return null;
}

/** Collects error names across a retry/aggregate chain (for Timeout detection). */
function errorNameChain(err: unknown): string {
  const names: string[] = [];
  let cur = err as Record<string, unknown> | undefined;
  for (let depth = 0; depth < 6 && cur; depth++) {
    if (typeof cur.name === "string") names.push(cur.name);
    const errors = cur.errors;
    cur = (cur.lastError as Record<string, unknown> | undefined) ??
      (Array.isArray(errors) ? (errors[errors.length - 1] as Record<string, unknown>) : undefined) ??
      (cur.cause as Record<string, unknown> | undefined);
  }
  return names.join("|");
}

/**
 * Maps an AI provider error to a clear HTTP status + user-facing message.
 * Returns null for unclassified errors so callers can fall back to a generic 500.
 */
export function classifyProviderError(err: unknown): ProviderErrorInfo | null {
  if (err instanceof NoModelConfiguredError) {
    return { status: 400, code: "NO_MODEL_CONFIGURED", message: err.message };
  }
  if (err instanceof EmptyModelOutputError) {
    return { status: 502, code: "EMPTY_OUTPUT", message: "The model returned an empty screen. Please try again." };
  }

  const names = errorNameChain(err);
  if (/TimeoutError|AbortError/.test(names)) {
    return {
      status: 504,
      code: "AI_TIMEOUT",
      message: "The AI provider took too long to respond. Please try again.",
    };
  }

  const apiErr = findApiCallError(err);
  const status = typeof apiErr?.statusCode === "number" ? (apiErr.statusCode as number) : undefined;
  const body = typeof apiErr?.responseBody === "string" ? apiErr.responseBody : "";
  const text = `${(apiErr?.message as string) ?? ""} ${body} ${(err as Error)?.message ?? ""}`.toLowerCase();

  if (status === 503 || /overloaded|high demand|service unavailable|"status":\s*"unavailable"/.test(text)) {
    return {
      status: 503,
      code: "AI_OVERLOADED",
      message: "The AI provider is temporarily overloaded. Please try again in a moment, or switch model in Settings.",
    };
  }
  if (status === 429 || /rate limit|too many requests|quota|resource_exhausted/.test(text)) {
    return {
      status: 429,
      code: "AI_RATE_LIMITED",
      message: "The AI provider is rate-limiting requests. Please wait a bit and try again.",
    };
  }
  if (status === 401 || status === 403 || /invalid.?api.?key|api key not valid|unauthorized|permission denied/.test(text)) {
    return {
      status: 400,
      code: "AI_AUTH",
      message: "The AI provider rejected the API key. Check it in Settings.",
    };
  }
  if (status === 400 && /model/.test(text)) {
    return {
      status: 400,
      code: "AI_MODEL",
      message: "The selected model was rejected. Pick another model in Settings.",
    };
  }
  return null;
}
