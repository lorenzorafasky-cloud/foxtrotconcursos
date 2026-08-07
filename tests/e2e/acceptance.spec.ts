import { expect, Page, test } from "@playwright/test";

const alunoUrl = process.env.E2E_ALUNO_URL ?? "http://localhost:3100";
const adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:3101";
const professorUrl = process.env.E2E_PROFESSOR_URL ?? "http://localhost:3102";

test.describe("aceite do aluno", () => {
  test("navega pelas areas principais do aluno", async ({ page }) => {
    await assertPage(page, `${alunoUrl}/`, "Foxtrot Concursos");
    await assertPage(page, `${alunoUrl}/questoes`, "Banco de questoes");
    await assertPage(page, `${alunoUrl}/foco`, "Area Foco");
    await assertPage(page, `${alunoUrl}/planejamento`, "Planejamento");
    await assertPage(page, `${alunoUrl}/ia`, "Inteligencia de estudo");
  });

  test("abre autenticacao, pagamento e documentos legais", async ({ page }) => {
    await assertPage(page, `${alunoUrl}/login`, "Login");
    await assertPage(page, `${alunoUrl}/cadastro`, "Criar conta");
    await assertPage(page, `${alunoUrl}/recuperar-senha`, "Recuperar senha");
    await assertPage(page, `${alunoUrl}/redefinir-senha`, "Redefinir senha");
    await assertPage(page, `${alunoUrl}/confirmar-email`, "Reenviar link");
    await assertPage(page, `${alunoUrl}/dois-fatores`, "Dois fatores");
    await assertPage(page, `${alunoUrl}/assinaturas`, "Checkout");
    await assertPage(page, `${alunoUrl}/termos`, "Termos de uso");
    await assertPage(page, `${alunoUrl}/privacidade`, "Politica de privacidade");
    await assertPage(page, `${alunoUrl}/cookies`, "Politica de cookies");
    await assertPage(page, `${alunoUrl}/lgpd`, "LGPD e direitos do titular");
  });
});

test.describe("aceite dos paineis operacionais", () => {
  test("abre painel administrativo em estado autenticavel", async ({ page }) => {
    await assertPage(page, `${adminUrl}/`, "Admin");
    await expect(page.getByRole("button", { name: /Entrar/ })).toBeVisible();
  });

  test("abre painel do professor em estado autenticavel", async ({ page }) => {
    await assertPage(page, `${professorUrl}/`, "Professor");
    await expect(page.getByRole("button", { name: /Entrar/ })).toBeVisible();
  });
});

async function assertPage(page: Page, url: string, visibleText: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(visibleText).first()).toBeVisible();
  await expect(page.locator("main, form").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectImagesHaveAlt(page);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectImagesHaveAlt(page: Page) {
  const missingAlt = await page.locator("img:not([alt])").count();
  expect(missingAlt).toBe(0);
}
