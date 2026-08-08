import { defineConfig } from "prisma/config";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(configDir, "../../.env");

if (existsSync(rootEnvPath)) {
  const envFile = readFileSync(rootEnvPath, "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

/**
 * `prisma generate` nao conecta ao banco, entao o config nao pode exigir
 * DATABASE_URL para carregar (quebrava o CI). O placeholder abaixo so e usado
 * na ausencia de configuracao real; comandos que de fato conectam (migrate,
 * db pull, seed) falharao com erro claro de conexao — comportamento correto.
 */
const FALLBACK_URL = "postgresql://placeholder:placeholder@localhost:5432/foxtrot?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? FALLBACK_URL,
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? FALLBACK_URL
  }
});
