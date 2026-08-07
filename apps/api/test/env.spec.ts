import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/config/env";

describe("loadAppConfig", () => {
  it("loads safe development defaults", () => {
    const config = loadAppConfig({ NODE_ENV: "development" });

    expect(config.port).toBe(3333);
    expect(config.corsOrigins).toContain("http://localhost:3000");
    expect(config.rateLimitMax).toBe(90);
    expect(config.isProduction).toBe(false);
  });

  it("validates URL shaped settings", () => {
    expect(() => loadAppConfig({ APP_URL: "localhost:3000" })).toThrow(/APP_URL/);
    expect(() => loadAppConfig({ DATABASE_URL: "mysql://user:pass@example.com/db" })).toThrow(/DATABASE_URL/);
  });

  it("requires strong production secrets and explicit CORS", () => {
    const validProductionEnv: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      APP_URL: "https://app.foxtrot.test",
      API_URL: "https://api.foxtrot.test",
      DATABASE_URL: "postgresql://user:pass@db.foxtrot.test/foxtrot",
      DIRECT_URL: "postgresql://user:pass@db.foxtrot.test/foxtrot",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      PASSWORD_PEPPER: "c".repeat(32),
      COOKIE_DOMAIN: "foxtrot.test",
      CORS_ORIGINS: "https://app.foxtrot.test",
      RATE_LIMIT_MAX: "120",
      RATE_LIMIT_TTL_MS: "60000",
      REDIS_URL: "rediss://redis.foxtrot.test",
      SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.foxtrot.test/v1/traces",
      RESEND_API_KEY: "re_test",
      MAIL_FROM: "Foxtrot Concursos <contato@foxtrot.test>",
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_ZONE_ID: "zone",
      CLOUDFLARE_R2_BUCKET: "foxtrot-assets",
      CLOUDFLARE_R2_PUBLIC_URL: "https://assets.foxtrot.test",
      CLOUDFLARE_STREAM_SIGNING_KEY_ID: "stream-key",
      CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY: "stream-private-key",
      CLOUDFLARE_TURNSTILE_SITE_KEY: "turnstile-site",
      CLOUDFLARE_TURNSTILE_SECRET_KEY: "turnstile-secret",
      ANTHROPIC_API_KEY: "anthropic-key",
      STRIPE_SECRET_KEY: "stripe-secret",
      STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret"
    };

    expect(loadAppConfig(validProductionEnv)).toMatchObject({
      nodeEnv: "production",
      cookieDomain: "foxtrot.test",
      corsOrigins: ["https://app.foxtrot.test"],
      rateLimitMax: 120
    });

    expect(() => loadAppConfig({ ...validProductionEnv, JWT_ACCESS_SECRET: "short" })).toThrow(/JWT_ACCESS_SECRET/);
  });
});
