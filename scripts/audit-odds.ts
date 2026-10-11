import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolveBoosterOdds } from "../src/lib/boosterOdds.ts";
import { paperBoosterConfigs, resolveBoosterMembers, type BoosterSet } from "../src/lib/boosterPool.ts";

const sets = JSON.parse(await readFile(".cache/coverage/sets.json", "utf8")) as Record<string, BoosterSet>;
const coverage = JSON.parse(await readFile("reports/coverage.json", "utf8"));
let configurations = 0;
let printingProducts = 0;
let approximate = 0;
const failures: { code: string; issue: string }[] = [];
for (const row of coverage.results) {
    try {
        const set = sets[row.code];
        const configs = paperBoosterConfigs(set);
        const sources = [...new Set(configs.flatMap(([, c]) => c.sourceSetCodes))].map(code => sets[code]);
        const odds = resolveBoosterOdds(set, sources);
        const members = resolveBoosterMembers(set, sources);
        for (const [key, config] of configs) {
            const packs = config.boosters.filter(p => p.weight > 0);
            const weight = packs.reduce((sum, p) => sum + p.weight, 0);
            const expectedCards = packs.reduce((sum, p) => sum + p.weight / weight * Object.values(p.contents).reduce<number>((sum, n) => sum + (n ?? 0), 0), 0);
            let modeledCards = 0;
            for (const [id, m] of members) {
                if (!m.products[key]) continue;
                const entry = odds.get(id)?.[key];
                assert.ok(entry, `${key}/${id} missing odds`);
                assert.ok(Number.isFinite(entry.chance) && entry.chance > 0 && entry.chance <= 1 + 1e-10, `${key}/${id} invalid probability ${entry.chance}`);
                assert.ok(Number.isFinite(entry.expected) && entry.expected + 1e-10 >= entry.chance);
                const finishes = Object.values(entry.finishes);
                assert.ok(finishes.every(f => f && f.chance <= entry.chance + 1e-10));
                assert.ok(finishes.reduce((sum, f) => sum + f!.chance, 0) + 1e-10 >= entry.chance);
                assert.ok(Math.abs(finishes.reduce((sum, f) => sum + f!.expected, 0) - entry.expected) < 1e-8);
                modeledCards += entry.expected;
                printingProducts++;
                if (entry.approximate) approximate++;
            }
            // Conservation: expected copies across all printings must equal the pack's slot count.
            assert.ok(Math.abs(modeledCards - expectedCards) < 1e-7, `${key}: modeled ${modeledCards} cards, expected ${expectedCards}`);
            configurations++;
        }
    } catch (error) { failures.push({ code: row.code, issue: String(error) }); }
}
const result = { generatedAt: new Date().toISOString(), sources: coverage.sources, configurations, printingProducts, approximate, failures };
await writeFile("reports/odds-coverage.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
assert.equal(failures.length, 0, "Odds validation failed");
