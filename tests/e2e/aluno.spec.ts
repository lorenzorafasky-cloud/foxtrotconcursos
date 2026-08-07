import { expect, test } from "@playwright/test";

test.describe("portal do aluno", () => {
  test("abre o painel operacional", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Foxtrot Concursos" })).toBeVisible();
    await expect(page.getByText("Meu Dia")).toBeVisible();
  });

  test("abre o banco de questoes", async ({ page }) => {
    await page.goto("/questoes", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Banco de questoes" })).toBeVisible();
    await expect(page.getByText("FOX-DCON-0001")).toBeVisible();
  });

  test("abre a area foco", async ({ page }) => {
    await page.goto("/foco", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("25:00")).toBeVisible();
    await expect(page.getByText("Sons de foco")).toBeVisible();
  });

  test("abre o planejamento", async ({ page }) => {
    await page.goto("/planejamento", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Planejamento" })).toBeVisible();
    await expect(page.getByText("Resolver 30 questoes de Constitucional")).toBeVisible();
  });

  test("abre o login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar/ })).toBeVisible();
  });

  test("abre o cadastro com aviso de ranking", async ({ page }) => {
    await page.goto("/cadastro", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Cadastro" })).toBeVisible();
    await expect(page.getByText("Seu apelido aparecera no ranking publico")).toBeVisible();
  });

  test("abre o onboarding", async ({ page }) => {
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Perfil de combate" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Salvar perfil/ })).toBeVisible();
  });
});
