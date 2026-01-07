export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getErrorMessage(
  error: unknown,
  fallback: string = "An unknown error occurred"
): string {
  // Log the detailed error server-side for debugging purposes.
  // Do not expose raw error messages or stack traces to the client.
  try {
    console.error("Internal error:", error);
  } catch {
    // Swallow logging errors to avoid affecting response handling.
  }

  // Always return the provided fallback message (or a safe default),
  // ensuring no sensitive details from `error` are leaked to the user.
  return fallback || "An unknown error occurred";
}
