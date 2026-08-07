const SENSITIVE_KEYS = /authorization|cookie|token|secret|password|pepper|dsn|api[_-]?key|private[_-]?key/i;
const URL_WITH_CREDENTIALS = /\b(?:postgres(?:ql)?|redis|https?):\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/gi;

export function redactSensitive(input: unknown): unknown {
  if (typeof input === "string") {
    return input.replace(URL_WITH_CREDENTIALS, "[REDACTED_URL]");
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitive(item));
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [
        key,
        SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactSensitive(value)
      ])
    );
  }

  return input;
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return redactSensitive(error.message) as string;
  return "Erro desconhecido.";
}
