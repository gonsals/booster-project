import { test } from "node:test";
import assert from "node:assert/strict";
import { getBoosterData } from "../src/lib/boosters.ts";

test("booster sheets resolve bonus printings and finishes, including promo packs and ignoring unused sheets", async () => {
    const original = globalThis.fetch;
    const mtgCard = (uuid: string, id: string) => ({ uuid, identifiers: { scryfallId: id }, finishes: ["nonfoil", "foil"] });
    globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.endsWith("TST.json")) return Response.json({ meta: { date: "2026-10-10" }, data: {
            code: "TST", name: "Test set", releaseDate: "2025-01-01", cards: [mtgCard("base", "id-base"), mtgCard("promo", "id-promo")],
            booster: {
                play: { sourceSetCodes: ["TST", "BON"], boosters: [{ weight: 1, contents: { base: 1, bonus: 1 } }], sheets: {
                    base: { foil: false, cards: { base: 1 } }, bonus: { foil: true, cards: { bonus: 1 } }, unused: { foil: false, cards: { promo: 1 } },
                } },
                collector: { sourceSetCodes: ["TST"], boosters: [{ weight: 1, contents: { base: 1 } }], sheets: { base: { foil: true, cards: { base: 1 } } } },
                promo: { sourceSetCodes: ["TST"], boosters: [{ weight: 1, contents: { promo: 1 } }], sheets: { promo: { foil: false, cards: { promo: 1 } } } },
            },
        } });
        if (url.endsWith("BON.json")) return Response.json({ meta: { date: "2026-10-10" }, data: { code: "BON", cards: [mtgCard("bonus", "id-bonus")] } });
        assert.equal(url, "https://api.scryfall.com/cards/collection");
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(body.identifiers.map((i: { id: string }) => i.id).sort(), ["id-base", "id-bonus", "id-promo"]);
        return Response.json({ data: body.identifiers.map((i: { id: string }) => ({ id: i.id })) });
    };
    try {
        const result = await getBoosterData("tst");
        assert.equal(result.approximate, false);
        assert.equal(result.pool.length, 3);
        assert.deepEqual(result.pool.find((c) => c.card.id === "id-base")?.play, ["nonfoil"]);
        assert.deepEqual(result.pool.find((c) => c.card.id === "id-base")?.collector, ["foil"]);
        assert.deepEqual(result.pool.find((c) => c.card.id === "id-bonus")?.play, ["foil"]);
    } finally { globalThis.fetch = original; }
});

test("a failed later Scryfall batch is rejected, never cached as a partial collection", async () => {
    const original = globalThis.fetch;
    let fail = true;
    globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes("mtgjson")) return Response.json({ meta: { date: "2026-10-10" }, data: { code: "ERR", name: "Provisional", releaseDate: "2025-01-01", cards: Array.from({ length: 76 }, (_, i) => ({ uuid: `uuid-${i}`, identifiers: { scryfallId: `id-${i}` }, finishes: ["nonfoil"], availability: ["paper"] })) } });
        const ids = JSON.parse(String(init?.body)).identifiers;
        if (fail && ids.length === 1) return new Response("", { status: 503 });
        // These previews deliberately have booster=false; they must still be included.
        return Response.json({ data: ids.map(({ id }: { id: string }) => ({ id, finishes: ["nonfoil"], booster: false })) });
    };
    try {
        await assert.rejects(getBoosterData("err"), /503/);
        fail = false;
        assert.equal((await getBoosterData("err")).pool.length, 76);
    } finally { globalThis.fetch = original; }
});

test("previously loaded printings are shared across collections without another Scryfall request", async () => {
    const original = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async input => {
        if (!String(input).endsWith("USE.json")) { requests++; throw new Error("Should reuse the printing"); }
        return Response.json({ meta: { date: "2026-10-10" }, data: { code: "USE", name: "Shared", cards: [{ uuid: "shared", identifiers: { scryfallId: "id-base" }, finishes: ["nonfoil"] }],
            booster: { play: { sourceSetCodes: ["USE"], boosters: [{ weight: 1, contents: { base: 1 } }], sheets: { base: { cards: { shared: 1 }, foil: false } } } } } });
    };
    try { assert.equal((await getBoosterData("use")).pool[0].card.id, "id-base"); assert.equal(requests, 0); }
    finally { globalThis.fetch = original; }
});

test("load only the selected product, resolve more than four source sets, and reuse hits in the all-products view", async () => {
    const original = globalThis.fetch;
    const batches: string[][] = [];
    const sources = new Set<string>();
    const codes = Array.from({ length: 6 }, (_, i) => `B0${i + 1}`);
    globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.endsWith("FOC.json")) return Response.json({ meta: { date: "2026-10-10" }, data: {
            code: "FOC", name: "Focused", cards: [{ uuid: "focused-play", identifiers: { scryfallId: "foc-play" }, finishes: ["nonfoil"] }],
            booster: {
                play: { sourceSetCodes: ["FOC"], boosters: [{ weight: 1, contents: { base: 1 } }], sheets: { base: { cards: { "focused-play": 1 }, foil: false } } },
                collector: { sourceSetCodes: codes, boosters: [{ weight: 1, contents: { special: 1 } }], sheets: { special: { cards: { "focused-collector": 1 }, foil: true } } },
            },
        } });
        const code = codes.find(code => url.endsWith(`${code}.json`));
        if (code) { sources.add(code); return Response.json({ meta: { date: "2026-10-10" }, data: { code, cards: code === "B06" ? [{ uuid: "focused-collector", identifiers: { scryfallId: "foc-collector" }, finishes: ["foil"] }] : [] } }); }
        const ids = JSON.parse(String(init?.body)).identifiers.map((i: { id: string }) => i.id);
        batches.push(ids);
        return Response.json({ data: ids.map((id: string) => ({ id })) });
    };
    try {
        const play = await getBoosterData("foc", "auto");
        assert.equal(play.activeBooster, "play"); assert.equal(play.pool.length, 1);
        assert.deepEqual(sources, new Set(codes));
        assert.deepEqual(batches, [["foc-play"]]);
        assert.equal((await getBoosterData("foc", "collector")).pool.length, 1);
        assert.deepEqual(batches, [["foc-play"], ["foc-collector"]]);
        assert.equal((await getBoosterData("foc", "all")).pool.length, 2);
        assert.equal(batches.length, 2);
    } finally { globalThis.fetch = original; }
});

test("Scryfall 429 starts a cooldown and repeated visitors do not hit the provider", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (input) => {
        if (String(input).includes("mtgjson")) return Response.json({ meta: { date: "2026-10-10" }, data: { code: "LIM", name: "Limited", releaseDate: "2025-01-01", cards: [{ uuid: "limited", identifiers: { scryfallId: "limited" }, finishes: ["nonfoil"], availability: ["paper"] }] } });
        calls++;
        return new Response("", { status: 429, headers: { "Retry-After": "5" } });
    };
    try {
        await assert.rejects(getBoosterData("lim"), (error: unknown) => {
            const failure = error as { status: number; retryAfter: number };
            return failure.status === 429 && failure.retryAfter >= 60;
        });
        await assert.rejects(getBoosterData("lim"), /cooling down/);
        assert.equal(calls, 1);
    } finally { globalThis.fetch = original; }
});
