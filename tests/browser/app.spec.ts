import { test, expect } from "@playwright/test";

test("catalog search, pagination and repeated navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/sets/1");
    await expect(page.getByRole("heading", { name: /Colecciones.*con sobres/ })).toBeVisible();
    await page.getByRole("link", { name: "Siguiente", exact: true }).click();
    await expect(page).toHaveURL(/\/sets\/2$/);
    await expect(page.locator("#page-loader")).toBeHidden();
    await page.getByRole("link", { name: "Anterior", exact: true }).click();
    await expect(page.locator("#page-loader")).toBeHidden();
    await page.getByLabel("Buscar colección o código").fill("eoe");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByRole("link", { name: "Edge of Eternities", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Edge of Eternities", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/catalog.png", fullPage: true, style: "astro-dev-toolbar { display:none!important }" });
    expect(errors).toEqual([]);
});

test("exact booster cards, Collector, foil prices and combined filters", async ({ page }) => {
    await page.goto("/sets/boosters/eoe?booster=standard");
    await expect(page.getByRole("heading", { name: "Edge of Eternities", exact: true })).toBeVisible();
    const grid = page.getByRole("region", { name: "Cartas de sobres" });
    const standard = await grid.locator("article").count();
    expect(standard).toBeGreaterThan(200);
    await page.getByRole("link", { name: "Todos los sobres", exact: true }).click();
    await expect(page.locator("#page-loader")).toBeHidden();
    expect(await grid.locator("article").count()).toBeGreaterThan(standard);
    await page.getByRole("link", { name: "Collector", exact: true }).click();
    await expect(page).toHaveURL(/booster=collector/);
    await expect(page.getByLabel("Sobre", { exact: true })).toHaveValue("collector");
    await expect(page.locator("#page-loader")).toBeHidden();
    await page.getByLabel("Acabado y precio").selectOption("foil");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page).toHaveURL(/finish=foil/);
    await expect(grid.locator("article").first()).toContainText("Foil");
    await expect(grid).toContainText("EOS #");
    await page.getByRole("link", { name: "EDHREC", exact: true }).click();
    await expect(page).toHaveURL(/sort=rank/);
    await expect(page.locator("#page-loader")).toBeHidden();
    await page.reload();
    await expect(grid.locator("article").first()).toBeVisible();
    await page.screenshot({ path: "test-results/boosters.png", style: "astro-dev-toolbar { display:none!important }" });
    await page.getByLabel("Buscar carta").fill("zzzz-no-card");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No hay cartas para estos filtros" })).toBeVisible();
    await page.getByRole("link", { name: "Restablecer", exact: true }).click();
    await expect(grid.locator("article").first()).toBeVisible();
});

test("double-faced card, mobile layout and missing routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sets/boosters/neo?q=Fable");
    await expect(page.getByRole("region", { name: "Cartas de sobres" })).toBeVisible();
    await page.getByText("Ver reverso", { exact: true }).first().click();
    await expect(page.getByRole("img", { name: /Reflection of Kiki-Jiki/ }).first()).toBeVisible();
    expect(await page.getByLabel("Buscar carta").evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/mobile.png", fullPage: true, style: "astro-dev-toolbar { display:none!important }" });
    const invalid = await page.goto("/sets/0");
    expect(invalid?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
    const missing = await page.goto("/sets/boosters/notaset");
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "No encontramos esta colección" })).toBeVisible();
});


test("Jumpstart includes its complete pool and loads images at both ends of the grid", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/sets/boosters/j25");
    await expect(page.getByRole("heading", { name: "Foundations Jumpstart", exact: true })).toBeVisible();
    const grid = page.getByRole("region", { name: "Cartas de sobres" });
    // Released product: 779 distinct printings across the 46 themed decklists.
    await expect(grid.locator("article")).toHaveCount(779);
    await expect(page.getByLabel("Sobre", { exact: true }).locator('option[value="jumpstart"]')).toContainText("779");
    const first = grid.locator("img").first();
    await expect(first).toBeVisible();
    await expect.poll(() => first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const last = grid.locator("article").last().locator("img").first();
    await last.scrollIntoViewIfNeeded();
    await expect.poll(() => last.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await grid.locator("article").evaluateAll(nodes => new Set(nodes.map(n => n.getAttribute("data-card-id"))).size)).toBe(779);
    await page.getByLabel("Sobre", { exact: true }).selectOption("jumpstart");
    await page.getByRole("button", { name: "Aplicar", exact: true }).click();
    await expect(grid.locator("article")).toHaveCount(779);
    expect(errors).toEqual([]);
});
