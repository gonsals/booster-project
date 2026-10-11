import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { buildCatalog } from "../src/lib/setList.ts";
import { paperBoosterConfigs, preferredBooster } from "../src/lib/boosterPool.ts";

// Replay real, dated provider snapshots through the packaged production function.
// No live card API calls, and no invented card fixtures, in this exhaustive test.
const read = async (name: string) => JSON.parse(await readFile(`.cache/coverage/${name}.json`, "utf8"));
const list = await read("set-list");
const sets = await read("sets");
const cards = await read("scryfall");
const sources = await read("sources");
const { default: app } = await import("../.vercel/output/functions/_render.func/entry.mjs");
const originalFetch = globalThis.fetch;
const originalTimer = globalThis.setTimeout;
// The provider limiter is unnecessary for local snapshot replay.
globalThis.setTimeout = ((fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => originalTimer(fn, ms === 150 ? 0 : ms, ...args)) as typeof setTimeout;
let providerRequests = 0;
globalThis.fetch = async (input, init) => {
    providerRequests++;
    const url = String(input);
    if (url.endsWith("SetList.json")) return Response.json(list);
    const code = url.match(/mtgjson\.com\/api\/v5\/([A-Z0-9]+)\.json$/)?.[1];
    if (code) {
        if (!sets[code]) return new Response("", { status: 404 });
        return Response.json({ meta: list.meta, data: sets[code] });
    }
    if (url === "https://api.scryfall.com/cards/collection") {
        const ids = JSON.parse(String(init?.body)).identifiers.map((i: { id: string }) => i.id);
        assert.ok(ids.length <= 75);
        return Response.json({ data: ids.filter((id: string) => cards[id]).map((id: string) => cards[id]), not_found: ids.filter((id: string) => !cards[id]) });
    }
    throw new Error(`Unexpected provider request: ${url}`);
};
const catalog = buildCatalog(list.data, "", list.meta.date);
const byUuid = new Map<string, any>(Object.values(sets).flatMap((s: any) => s.cards).map((c: any) => [c.uuid, c]));
const physical = (id: string) => cards[id] && !cards[id].digital && !cards[id].oversized;
const expectedFor = (config: any) => {
    const ids = new Set<string>();
    for (const pack of config.boosters.filter((p: any) => p.weight > 0)) {
        for (const [sheet, count] of Object.entries(pack.contents)) {
            if (Number(count) <= 0) continue;
            for (const [uuid, weight] of Object.entries(config.sheets[sheet].cards)) {
                if (Number(weight) <= 0) continue;
                const id = byUuid.get(uuid)?.identifiers.scryfallId;
                assert.ok(id, `Unresolved ${uuid}`);
                if (physical(id)) ids.add(id);
            }
        }
    }
    return ids;
};
const failures: { route: string; error: string }[] = [];
let routeCount = 0;
let printingRenders = 0;
const unique = new Set<string>();
async function check(route: string, expected: Set<string>, attribute: string) {
    routeCount++;
    try {
        const response = await app.fetch(new Request(`https://coverage.example${route}`));
        assert.equal(response.status, 200, `${route} HTTP ${response.status}`);
        const html = await response.text();
        assert.equal((html.match(/<html[\s>]/g) ?? []).length, 1);
        const ids = [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))].map(m => m[1]);
        assert.equal(ids.length, new Set(ids).size, `${route}: duplicate cards`);
        assert.deepEqual(new Set(ids), expected, `${route}: missing or unexpected cards`);
        if (attribute === "data-card-id") {
            printingRenders += ids.length;
            for (const id of ids) unique.add(id);
        }
        return html;
    } catch (error) { failures.push({ route, error: String(error) }); }
}
try {
    for (let page = 1; page <= Math.ceil(catalog.length / 18); page++) {
        await check(`/sets/${page}`, new Set(catalog.slice((page - 1) * 18, page * 18).map(s => s.code)), "data-set-code");
    }
    for (const [index, entry] of catalog.entries()) {
        const set = sets[entry.code.toUpperCase()];
        const configs = paperBoosterConfigs(set);
        const all = new Set<string>();
        for (const [key, config] of configs) {
            const expected = expectedFor(config);
            for (const id of expected) all.add(id);
            await check(`/sets/boosters/${entry.code}?booster=${encodeURIComponent(key)}`, expected, "data-card-id");
        }
        if (!configs.length) {
            for (const c of set.cards) if (c.availability?.includes("paper") && physical(c.identifiers.scryfallId)) all.add(c.identifiers.scryfallId);
        }
        const html = await check(`/sets/boosters/${entry.code}?booster=all`, all, "data-card-id");
        const preferred = preferredBooster(configs.map(([key]) => key));
        const primary = configs.find(([key]) => key === preferred);
        await check(`/sets/boosters/${entry.code}`, primary ? expectedFor(primary[1]) : all, "data-card-id");
        if (html) {
            for (const [key] of configs) assert.ok(html.includes(`value="${key}"`), `${entry.code}: missing booster selector ${key}`);
            if (!configs.length) assert.ok(html.includes("Selección provisional"));
        }
        if ((index + 1) % 25 === 0) console.log(`Verified ${index + 1}/${catalog.length} collections (${routeCount} routes).`);
    }
} finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimer; }
const report = { generatedAt: new Date().toISOString(), sources, catalogSets: catalog.length, routes: routeCount, printingRenders, uniquePhysicalPrintings: unique.size, providerRequests, failures };
await writeFile("reports/rendered-coverage.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
assert.equal(failures.length, 0, "Production route coverage failed; see reports/rendered-coverage.json");
