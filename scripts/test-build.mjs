import assert from "node:assert/strict";

// Import the actual packaged Vercel function, catching native-binding startup regressions.
const { default: app } = await import("../.vercel/output/functions/_render.func/entry.mjs");
const original = globalThis.fetch;
const meta = { date: "2026-10-10", version: "5.3.0" };
const set = {
    code: "TST", name: "Production smoke test", releaseDate: "2025-01-01", type: "expansion", isOnlineOnly: false,
    sealedProduct: [{ category: "booster_pack", name: "Test Play Booster", subtype: "play" }],
    cards: [{ uuid: "test-card", identifiers: { scryfallId: "test-id" }, finishes: ["nonfoil"] }],
    booster: { play: { sourceSetCodes: ["TST"], boosters: [{ weight: 1, contents: { base: 1 } }],
        sheets: { base: { foil: false, cards: { "test-card": 1 } } } } },
};
globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("SetList.json")) return Response.json({ meta, data: [set] });
    if (url.endsWith("TST.json")) return Response.json({ meta, data: set });
    if (url === "https://api.scryfall.com/cards/collection") return Response.json({ data: [{
        id: "test-id", name: "Verified printing", set: "tst", collector_number: "1", rarity: "rare", edhrec_rank: 42,
        finishes: ["nonfoil"], prices: { usd: "42.00" }, image_uris: { normal: "https://example.com/printing.jpg" },
        scryfall_uri: "https://scryfall.com/card/tst/1", digital: false, oversized: false,
    }] });
    throw new Error(`Unexpected external request: ${url}`);
};
try {
    const home = await app.fetch(new Request("https://example.com/"));
    assert.equal(home.status, 301);
    assert.equal(home.headers.get("location"), "/sets/1");
    const catalog = await app.fetch(new Request("https://example.com/sets/1?q=TST"));
    assert.equal(catalog.status, 200);
    assert.match(await catalog.text(), /Production smoke test/);
    assert.match(catalog.headers.get("cache-control"), /s-maxage=300/);
    const cards = await app.fetch(new Request("https://example.com/sets/boosters/tst"));
    assert.equal(cards.status, 200);
    const html = await cards.text();
    assert.match(html, /Verified printing/);
    assert.match(html, /42,00/);
    assert.equal((html.match(/<html/g) ?? []).length, 1);
    const invalid = await app.fetch(new Request("https://example.com/sets/0"));
    assert.equal(invalid.status, 404);
    assert.equal(invalid.headers.get("cache-control"), "no-store");
    const api = await app.fetch(new Request("https://example.com/api/set-list"));
    assert.equal(api.status, 200);
    assert.equal((await api.json()).data[0].code, "TST");
    console.log("Production function: startup, redirect, catalog, cards, prices, 404 and API passed.");
} finally { globalThis.fetch = original; }
