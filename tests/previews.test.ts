import { test } from "node:test";
import assert from "node:assert/strict";
import { getBoosterData } from "../src/lib/boosters.ts";
import { selectCards, type CardOptions } from "../src/lib/cards.ts";
import { cardDetails } from "../src/lib/cardDetails.ts";
import type { ScryfallCard } from "../src/types/scryfall/ScryFallCard";

const options: CardOptions = { collector: false, fullArt: false, finish: "auto", sort: "value", query: "", booster: "play" };
const card = (id: string, set: string, overrides: Partial<ScryfallCard> = {}) => ({
    id, name: id, set, games: ["paper"], finishes: ["nonfoil", "foil"], booster: false, digital: false,
    layout: "normal", collector_number: "1", prices: { usd: null, usd_foil: null },
    preview: { source: "Test publisher", source_uri: "https://example.com/preview", previewed_at: "2026-10-11" }, ...overrides,
} as ScryfallCard);
const set = (code: string, extra = {}) => ({ meta: { date: "2026-10-11" }, data: { code, name: code, releaseDate: "2099-01-01", isPartialPreview: true, cards: [], ...extra } });

test("public previews appear before MTGJSON knows any cards, across all pages without duplicates", async () => {
    const original = globalThis.fetch;
    let searches = 0;
    globalThis.fetch = async input => {
        const url = new URL(String(input));
        if (url.hostname === "mtgjson.com") return Response.json(set("PRV"));
        searches++;
        assert.equal(url.pathname, "/cards/search");
        assert.equal(url.searchParams.get("q"), "set:prv game:paper");
        assert.equal(url.searchParams.get("unique"), "prints");
        if (url.searchParams.get("page") === "2") return Response.json({ data: [card("first", "prv"), card("second", "prv")], has_more: false });
        const next = new URL(url); next.searchParams.set("page", "2");
        return Response.json({ data: [card("first", "prv"), card("digital", "prv", { digital: true }), card("token", "prv", { layout: "token" }), card("other-set", "other")], has_more: true, next_page: next.href });
    };
    try {
        const data = await getBoosterData("prv", "auto");
        assert.equal(data.preview, true); assert.equal(data.approximate, true);
        assert.deepEqual(data.pool.map(c => c.card.id), ["first", "second"]);
        assert.equal(selectCards(data.pool, options).length, 2);
        assert.equal(selectCards(data.pool, { ...options, booster: "collector" }).length, 2);
        assert.equal(selectCards(data.pool, { ...options, query: "second", finish: "foil" }).length, 1);
        assert.equal(selectCards(data.pool, { ...options, fullArt: true }).length, 0);
        const details = cardDetails(data.pool[0], { provisional: "Sobre por confirmar" });
        assert.equal(details.provisional, true); assert.equal(details.products[0].odds, null);
        assert.equal(details.reveal?.previewed_at, "2026-10-11");
        assert.equal(details.prices[0].price, null);
        await getBoosterData("prv", "collector");
        assert.equal(searches, 2, "reuse the paginated preview search between products");
    } finally { globalThis.fetch = original; }
});

test("new previews supplement a known pack without inventing membership or changing confirmed odds", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async input => {
        if (String(input).includes("mtgjson.com")) return Response.json(set("MIX", {
            cards: [{ uuid: "known", identifiers: { scryfallId: "known-preview" }, finishes: ["nonfoil"] }],
            booster: { play: { sourceSetCodes: ["MIX"], boosters: [{ weight: 1, contents: { base: 1 } }], sheets: { base: { cards: { known: 1 }, foil: false } } } },
        }));
        assert.equal(new URL(String(input)).pathname, "/cards/search");
        return Response.json({ data: [card("known-preview", "mix"), card("new-preview", "mix")], has_more: false });
    };
    try {
        const data = await getBoosterData("mix", "auto");
        assert.equal(data.activeBooster, "play");
        assert.equal(data.boosters[0].count, 1);
        assert.equal(selectCards(data.pool, options).length, 2);
        const known = data.pool.find(c => c.card.id === "known-preview")!;
        const fresh = data.pool.find(c => c.card.id === "new-preview")!;
        assert.equal(known.odds?.play.chance, 1); assert.equal(known.provisional, undefined);
        assert.deepEqual(fresh.play, []); assert.deepEqual(fresh.collector, []); assert.equal(fresh.odds, undefined);
        assert.deepEqual(selectCards(data.pool, { ...options, booster: "provisional" }).map(c => c.card.id), ["new-preview"]);
    } finally { globalThis.fetch = original; }
});

test("an announced set with no public previews is an empty preview, not an error", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async input => String(input).includes("mtgjson.com") ? Response.json(set("NPR")) : new Response("", { status: 404 });
    try { const data = await getBoosterData("npr", "auto"); assert.deepEqual(data.pool, []); assert.equal(data.previewUnavailable, false); }
    finally { globalThis.fetch = original; }
});

test("a failed later preview page is never cached as a complete preview", async () => {
    const original = globalThis.fetch;
    let fail = true;
    globalThis.fetch = async input => {
        const url = new URL(String(input));
        if (url.hostname === "mtgjson.com") return Response.json(set("PFL"));
        if (url.searchParams.has("page")) return fail ? new Response("", { status: 503 }) : Response.json({ data: [card("last-page", "pfl")], has_more: false });
        const next = new URL(url); next.searchParams.set("page", "2");
        return Response.json({ data: [card("first-page", "pfl")], has_more: true, next_page: next.href });
    };
    try {
        await assert.rejects(getBoosterData("pfl", "auto"), /503/);
        fail = false;
        assert.equal((await getBoosterData("pfl", "auto")).pool.length, 2);
    } finally { globalThis.fetch = original; }
});

test("an unavailable preview update retains the confirmed pool and reports the missing update", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async input => {
        const url = new URL(String(input));
        if (url.hostname === "mtgjson.com") return Response.json(set("PFB", {
            cards: [{ uuid: "fallback", identifiers: { scryfallId: "fallback-preview" }, finishes: ["nonfoil"] }],
            booster: { play: { sourceSetCodes: ["PFB"], boosters: [{ weight: 1, contents: { base: 1 } }], sheets: { base: { cards: { fallback: 1 }, foil: false } } } },
        }));
        if (url.pathname === "/cards/search") return new Response("", { status: 503 });
        return Response.json({ data: [card("fallback-preview", "pfb")] });
    };
    try { const data = await getBoosterData("pfb", "auto"); assert.equal(data.previewUnavailable, true); assert.equal(data.pool.length, 1); assert.equal(data.pool[0].odds?.play.chance, 1); }
    finally { globalThis.fetch = original; }
});

test("a rate-limited empty preview propagates Retry-After instead of claiming no cards are published", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async input => String(input).includes("mtgjson.com") ? Response.json(set("PRL")) : new Response("", { status: 429, headers: { "Retry-After": "121" } });
    try {
        await assert.rejects(getBoosterData("prl", "auto"), (error: unknown) => {
            const failure = error as { status: number; retryAfter: number };
            return failure.status === 429 && failure.retryAfter === 121;
        });
    } finally { globalThis.fetch = original; }
});
