import { expect, Page, test } from "@playwright/test";
import { authenticator } from "otplib";

/**
 * Fluxos autenticados exigidos pela Secao 15 do Prompt Mestre.
 *
 * Pre-requisitos (ambiente local ou CI):
 *   1. API + apps rodando (`pnpm dev`) com Postgres/Redis do docker-compose;
 *   2. `pnpm db:seed` executado — cria o usuario dedicado `e2e-aluno@foxtrot.local`
 *      com 2FA TOTP deterministico (segredo em E2E_TOTP_SECRET, padrao do seed).
 */
const alunoUrl = process.env.E2E_ALUNO_URL ?? "http://localhost:3100";
const e2eEmail = process.env.E2E_STUDENT_EMAIL ?? "e2e-aluno@foxtrot.local";
const e2ePassword = process.env.E2E_STUDENT_PASSWORD ?? "Foxtrot@123";
const e2eTotpSecret = process.env.E2E_TOTP_SECRET ?? "JBSWY3DPEHPK3PXP";

test.describe("fluxos autenticados do aluno", () => {
  test("cadastro cria conta e orienta verificacao de e-mail", async ({ page }) => {
    const uniqueness = Date.now().toString(36);
    await page.goto(`${alunoUrl}/cadastro`, { waitUntil: "domcontentloaded" });
    await page.locator("#fullName").fill("Operador Playwright");
    await page.locator("#nickname").fill(`pw-${uniqueness}`);
    await page.locator("#email").fill(`pw-${uniqueness}@foxtrot.local`);
    await page.locator("#password").fill("SenhaForte123");
    await page.locator("#confirmPassword").fill("SenhaForte123");
    await page.getByRole("button", { name: /Criar conta|Cadastrar/i }).click();
    await expect(page.getByText("Cadastro recebido")).toBeVisible({ timeout: 15_000 });
  });

  test("login com 2FA TOTP chega autenticado na home", async ({ page }) => {
    await loginWithTwoFactor(page);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(alunoUrl)}/?$`));
    await expect(page.getByText(/Sair|Minha conta|Perfil/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("resolve uma questao objetiva e recebe correcao", async ({ page }) => {
    await loginWithTwoFactor(page);
    await page.goto(`${alunoUrl}/questoes`, { waitUntil: "domcontentloaded" });

    // Abre a primeira questao objetiva da lista.
    await page.locator("article button.text-left").first().click();
    // Seleciona a primeira alternativa disponivel e responde.
    await page.locator("button:has(strong)").first().click();
    await page.getByRole("button", { name: /Responder/ }).click();
    await expect(page.getByText(/Correta|Errada/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("registra uma sessao na Area Foco", async ({ page }) => {
    await loginWithTwoFactor(page);
    await page.goto(`${alunoUrl}/foco`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Iniciar/ }).click();
    await page.waitForTimeout(2_000);
    await page.getByRole("button", { name: /Pausar/ }).click();
    await page.getByRole("button", { name: /Registrar/ }).click();
    await expect(page.getByText("Sessao registrada.")).toBeVisible({ timeout: 15_000 });
  });

  test("gamificacao exibe ranking e patente do operador", async ({ page }) => {
    await loginWithTwoFactor(page);
    await page.goto(`${alunoUrl}/gamificacao`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/XP|Patente|Ranking/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("compra de curso (Stripe test mode)", () => {
  test.skip(!process.env.E2E_STRIPE_ENABLED, "Defina E2E_STRIPE_ENABLED=1 com chaves de teste do Stripe para exercitar o checkout.");

  test("inicia checkout de assinatura", async ({ page }) => {
    await loginWithTwoFactor(page);
    await page.goto(`${alunoUrl}/assinaturas`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Assinar|Checkout|Comprar/i }).first().click();
    await page.waitForURL(/checkout\.stripe\.com|pagamento/, { timeout: 30_000 });
  });
});

async function loginWithTwoFactor(page: Page) {
  await page.goto(`${alunoUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(e2eEmail);
  await page.locator("#password").fill(e2ePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page.locator("#twoFactorCode")).toBeVisible({ timeout: 15_000 });
  await page.locator("#twoFactorCode").fill(authenticator.generate(e2eTotpSecret));
  await page.getByRole("button", { name: /Validar e entrar/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
