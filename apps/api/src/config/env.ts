export type NodeEnv = "development" | "test" | "production";

export type AppConfig = {
  nodeEnv: NodeEnv;
  port: number;
  appUrl: string;
  apiUrl: string;
  cookieDomain?: string;
  corsOrigins: string[];
  rateLimitTtlMs: number;
  rateLimitMax: number;
  isProduction: boolean;
};

const DEFAULT_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
const SECRET_PLACEHOLDERS = new Set([
  "",
  "replace-with-strong-access-secret",
  "replace-with-strong-refresh-secret",
  "replace-with-password-pepper"
]);

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const appUrl = env.APP_URL ?? "http://localhost:3000";
  const apiUrl = env.API_URL ?? "http://localhost:3333";

  assertUrl("APP_URL", appUrl);
  assertUrl("API_URL", apiUrl);

  if (env.DATABASE_URL) assertPostgresUrl("DATABASE_URL", env.DATABASE_URL);
  if (env.DIRECT_URL) assertPostgresUrl("DIRECT_URL", env.DIRECT_URL);
  if (nodeEnv === "production") validateProductionEnv(env);

  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS, appUrl);

  return {
    nodeEnv,
    port: parseInteger("PORT", env.PORT, 3333, 1, 65_535),
    appUrl,
    apiUrl,
    cookieDomain: env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== "localhost" ? env.COOKIE_DOMAIN : undefined,
    corsOrigins,
    rateLimitTtlMs: parseInteger("RATE_LIMIT_TTL_MS", env.RATE_LIMIT_TTL_MS, 60_000, 1_000, 3_600_000),
    rateLimitMax: parseInteger("RATE_LIMIT_MAX", env.RATE_LIMIT_MAX, 90, 1, 10_000),
    isProduction: nodeEnv === "production"
  };
}

function parseNodeEnv(value?: string): NodeEnv {
  if (!value) return "development";
  if (value === "development" || value === "test" || value === "production") return value;
  throw new Error("NODE_ENV deve ser development, test ou production.");
}

function parseCorsOrigins(value: string | undefined, appUrl: string) {
  const origins = value
    ? value.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [appUrl, ...DEFAULT_DEV_ORIGINS];

  for (const origin of origins) {
    assertUrl("CORS_ORIGINS", origin);
  }

  return [...new Set(origins)];
}

function parseInteger(name: string, value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} deve ser um inteiro entre ${min} e ${max}.`);
  }
  return parsed;
}

function validateProductionEnv(env: NodeJS.ProcessEnv) {
  requireValue("DATABASE_URL", env.DATABASE_URL);
  requireValue("DIRECT_URL", env.DIRECT_URL);
  requireStrongSecret("JWT_ACCESS_SECRET", env.JWT_ACCESS_SECRET);
  requireStrongSecret("JWT_REFRESH_SECRET", env.JWT_REFRESH_SECRET);
  requireStrongSecret("PASSWORD_PEPPER", env.PASSWORD_PEPPER);
  requireValue("COOKIE_DOMAIN", env.COOKIE_DOMAIN);
  requireValue("CORS_ORIGINS", env.CORS_ORIGINS);
  requireValue("REDIS_URL", env.REDIS_URL);
  requireValue("SENTRY_DSN", env.SENTRY_DSN);
  requireValue("OTEL_EXPORTER_OTLP_ENDPOINT", env.OTEL_EXPORTER_OTLP_ENDPOINT);
  requireValue("RESEND_API_KEY", env.RESEND_API_KEY);
  requireValue("MAIL_FROM", env.MAIL_FROM);
  requireValue("CLOUDFLARE_ACCOUNT_ID", env.CLOUDFLARE_ACCOUNT_ID);
  requireValue("CLOUDFLARE_ZONE_ID", env.CLOUDFLARE_ZONE_ID);
  requireValue("CLOUDFLARE_R2_BUCKET", env.CLOUDFLARE_R2_BUCKET);
  requireValue("CLOUDFLARE_R2_PUBLIC_URL", env.CLOUDFLARE_R2_PUBLIC_URL);
  requireValue("CLOUDFLARE_STREAM_SIGNING_KEY_ID", env.CLOUDFLARE_STREAM_SIGNING_KEY_ID);
  requireValue("CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY", env.CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY);
  requireValue("CLOUDFLARE_TURNSTILE_SITE_KEY", env.CLOUDFLARE_TURNSTILE_SITE_KEY);
  requireValue("CLOUDFLARE_TURNSTILE_SECRET_KEY", env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
  requireValue("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY);
  requireValue("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY);
  requireValue("STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET);

  assertHttpsUrl("APP_URL", env.APP_URL);
  assertHttpsUrl("API_URL", env.API_URL);
  assertHttpsUrl("SENTRY_DSN", env.SENTRY_DSN);
  assertHttpsUrl("OTEL_EXPORTER_OTLP_ENDPOINT", env.OTEL_EXPORTER_OTLP_ENDPOINT);
  assertHttpsUrl("CLOUDFLARE_R2_PUBLIC_URL", env.CLOUDFLARE_R2_PUBLIC_URL);
  for (const origin of parseCorsOrigins(env.CORS_ORIGINS, env.APP_URL ?? "")) {
    assertHttpsUrl("CORS_ORIGINS", origin);
  }
  if (env.COOKIE_DOMAIN === "localhost") throw new Error("COOKIE_DOMAIN nao pode ser localhost em producao.");
}

function requireValue(name: string, value?: string) {
  if (!value?.trim()) throw new Error(`${name} e obrigatoria em producao.`);
}

function requireStrongSecret(name: string, value?: string) {
  requireValue(name, value);
  if (!value || value.length < 32 || SECRET_PLACEHOLDERS.has(value)) {
    throw new Error(`${name} deve ter pelo menos 32 caracteres e nao pode ser placeholder.`);
  }
}

function assertUrl(name: string, value: string) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error(`${name} deve ser uma URL http(s) valida.`);
  }
}

function assertHttpsUrl(name: string, value?: string) {
  requireValue(name, value);
  try {
    const parsed = new URL(value ?? "");
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
  } catch {
    throw new Error(`${name} deve ser uma URL https valida em producao.`);
  }
}

function assertPostgresUrl(name: string, value: string) {
  try {
    const parsed = new URL(value);
    if (!["postgresql:", "postgres:"].includes(parsed.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error(`${name} deve ser uma URL PostgreSQL valida.`);
  }
}
