import { test, expect } from "@playwright/test";
import type { CardDetail } from "../../src/lib/cardDetails";

test("card modal opens instantly, uses the selected booster odds and keeps focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/sets/boosters/eoe");
    const grid = page.getByRole("region", { name: "Cartas de sobres" });
    const first = grid.locator("article").first();
    const id = await first.getAttribute("data-card-id");
    const payload = JSON.parse(await page.locator("#card-detail-data").textContent() ?? "{}");
    expect(payload.booster).toBe("play");
    await expect(grid.locator("article")).toHaveCount(371);
    const detail = payload.cards.find((c: CardDetail) => c.id === id) as CardDetail;
    const expected = detail.products.find(p => p.key === "play")!.odds!;
    let requests = 0;
    page.on("request", r => { if (["document", "fetch", "xhr"].includes(r.resourceType())) requests++; });
    const button = first.getByRole("button", { name: /^Ver detalles/ });
    const start = Date.now();
    await button.click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    expect(Date.now() - start).toBeLessThan(1000);
    await expect(modal.getByRole("heading", { name: detail.name, exact: true })).toBeVisible();
    await expect(page.locator("#modal-product")).toHaveValue("play");
    await expect(page.locator("#modal-chance")).toHaveText(new Intl.NumberFormat("es", { style: "percent", maximumSignificantDigits: 3 }).format(expected.chance));
    await expect(modal).toContainText("Valor de esta impresión");
    await expect(modal).toContainText("Aprox. 1 de cada");
    await page.screenshot({ path: "test-results/modal-desktop.png", style: "astro-dev-toolbar { display:none!important }" });
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(button).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.classList.contains("modal-open"))).toBe(false);
    await button.click();
    const other = detail.products.find(p => p.key !== "play" && p.odds);
    if (other) {
        await page.locator("#modal-product").selectOption(other.key);
        await expect(page.locator("#modal-chance")).toHaveText(new Intl.NumberFormat("es", { style: "percent", maximumSignificantDigits: 3 }).format(other.odds!.chance));
    }
    await modal.getByRole("button", { name: "Cerrar detalles" }).click();
    await expect(modal).toBeHidden();
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
});

test("mobile dialog shows both faces, scrolls and closes from the backdrop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sets/boosters/neo?q=Fable");
    await page.getByRole("region", { name: "Cartas de sobres" }).getByRole("button", { name: /^Ver detalles/ }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "Ver reverso", exact: true }).click();
    await expect(modal.getByRole("img", { name: /Reflection of Kiki-Jiki/ })).toBeVisible();
    const rect = await modal.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
    await modal.getByRole("heading", { name: "Valor de esta impresión" }).scrollIntoViewIfNeeded();
    await expect(modal.getByRole("heading", { name: "Valor de esta impresión" })).toBeVisible();
    await page.screenshot({ path: "test-results/modal-mobile.png", style: "astro-dev-toolbar { display:none!important }" });
    await page.mouse.click(2, 2);
    await expect(modal).toBeHidden();
});

test("loader appears during navigation and disappears when the real response arrives", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/sets/1");
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/sets/2", async route => { await gate; await route.continue(); });
    try {
        await page.getByRole("link", { name: "Siguiente", exact: true }).click();
        await expect(page.locator("#page-loader")).toBeVisible();
        await expect(page.locator("#loading-title")).toHaveText("Explorando colecciones");
        await expect(page.locator("#contenido")).toHaveAttribute("aria-busy", "true");
        await page.screenshot({ path: "test-results/loader.png", style: "astro-dev-toolbar { display:none!important }" });
    } finally { release(); }
    await expect(page).toHaveURL(/\/sets\/2$/);
    await expect(page.locator("#page-loader")).toBeHidden();
    await page.getByRole("link", { name: "Anterior", exact: true }).click();
    await expect(page.locator("#page-loader")).toBeHidden();
    expect(errors).toEqual([]);
});
