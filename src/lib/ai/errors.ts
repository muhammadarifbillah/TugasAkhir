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
