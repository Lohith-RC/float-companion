/**
 * FloatCompanion Safe Error Handling Utilities
 * Enforces strict TypeScript error handling, eliminating any-typed catch blocks.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
    return String((error as Record<string, unknown>).message);
  }
  return 'An unexpected error occurred.';
}
