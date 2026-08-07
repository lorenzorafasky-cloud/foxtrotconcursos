import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const envPath = resolve(process.cwd(), args.get("env") ?? ".env.production");
const env = { ...process.env, ...(existsSync(envPath) ? readEnvFile(envPath) : {}) };
const errors = [];
const warnings = [];

const required = [
  "NODE_ENV",
  "APP_URL",
  "API_URL",
  "COOKIE_DOMAIN",
  "CORS_ORIGINS",
  "DATABASE_URL",
  "DIRECT_URL",
  "REDIS_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "PASSWORD_PEPPER",
  "SENTRY_DSN",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "RESEND_API_KEY",
  "MAIL_FROM",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_PUBLIC_URL",
  "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
  "CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY",
  "CLOUDFLARE_TURNSTILE_SITE_KEY",
  "CLOUDFLARE_TURNSTILE_SECRET_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
];

for (const key of required) {
  if (!env[key]?.trim()) errors.push(`${key} ausente.`);
}

if (env.NODE_ENV !== "production") errors.push("NODE_ENV deve ser production.");
for (const key of ["APP_URL", "API_URL", "SENTRY_DSN", "OTEL_EXPORTER_OTLP_ENDPOINT", "CLOUDFLARE_R2_PUBLIC_URL"]) {
  if (env[key] && !isHttps(env[key])) errors.push(`${key} deve usar https.`);
}
if (env.COOKIE_DOMAIN === "localhost") errors.push("COOKIE_DOMAIN nao pode ser localhost.");
if (env.CORS_ORIGINS?.includes("localhost")) errors.push("CORS_ORIGINS nao deve conter localhost em producao.");
if (env.CORS_ORIGINS?.includes("*")) errors.push("CORS_ORIGINS nao deve usar wildcard.");
for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "PASSWORD_PEPPER"]) {
  if (env[key] && env[key].length < 32) errors.push(`${key} deve ter pelo menos 32 caracteres.`);
}
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  if (env[key] && !/^postgres(ql)?:\/\//.test(env[key])) errors.push(`${key} deve ser PostgreSQL.`);
}

const requiredFiles = [
  "apps/api/openapi.json",
  "docs/producao-checklist.md",
  "docs/operacao-producao.md",
  "docs/seguranca-pre-lancamento.md",
  "docs/retencao-backups-lgpd.md",
  "apps/aluno/src/app/termos/page.tsx",
  "apps/aluno/src/app/privacidade/page.tsx",
  "apps/aluno/src/app/cookies/page.tsx",
  "apps/aluno/src/app/lgpd/page.tsx"
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(process.cwd(), file))) errors.push(`Arquivo obrigatorio ausente: ${file}`);
}

if (!existsSync(resolve(process.cwd(), "packages/database/prisma/migrations"))) {
  errors.push("Diretorio de migrations ausente.");
}

if (!existsSync(envPath)) {
  warnings.push(`Arquivo ${envPath} nao encontrado; usando apenas process.env.`);
}

if (warnings.length) {
  console.warn("Avisos:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Production readiness falhou:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production readiness OK.");

function readEnvFile(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function isHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
