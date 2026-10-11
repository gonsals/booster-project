import { readFile, writeFile, mkdir } from "node:fs/promises";
import { buildCatalog, type SetSummary } from "../src/lib/setList.ts";
import { paperBoosterConfigs, resolveBoosterMembers, type BoosterSet } from "../src/lib/boosterPool.ts";
import { selectCards, cardImages, type BoosterCard } from "../src/lib/cards.ts";
import type { ScryfallCard } from "../src/types/scryfall/ScryFallCard";

const read = async (name: string) => JSON.parse(await readFile(`.cache/coverage/${name}.json`, "utf8"));
const list = await read("set-list");
const all = await read("sets") as Record<string, BoosterSet & SetSummary>;
const scryfall = await read("scryfall") as Record<string, ScryfallCard>;
const sources = await read("sources");
const catalog = buildCatalog(list.data);
const catalogCodes = new Set(catalog.map(s => s.code.toUpperCase()));
const byUuid = new Map(Object.values(all).flatMap(s => s.cards).map(c => [c.uuid, c]));
const results: Record<string, unknown>[] = [];
const failures: Record<string, unknown>[] = [];
const dataWarnings: Record<string, unknown>[] = [];
let configsChecked = 0;
let memberships = 0;
const uniquePrintings = new Set<string>();
for (const set of Object.values(all).filter(s => !s.isOnlineOnly)) {
    const configs = paperBoosterConfigs(set);
    if (!configs.length || (!catalogCodes.has(set.code) && !configs.some(([, c]) => /booster/i.test(c.name ?? "")))) continue;
    if (!catalogCodes.has(set.code)) failures.push({ code: set.code, issue: "Set with paper booster configs missing from catalog" });
    try {
        const sourceCodes = [...new Set(configs.flatMap(([, c]) => c.sourceSetCodes))];
        const member = resolveBoosterMembers(set, sourceCodes.map(code => {
            if (!all[code]) throw new Error(`Missing source set ${code}`);
            return all[code];
        }));
        const missing = [...member.keys()].filter(id => !scryfall[id]);
        if (missing.length) {
            const issue = { code: set.code, issue: "Printings missing from Scryfall paper bulk", ids: missing };
            if (set.releaseDate > list.meta.date) dataWarnings.push(issue); else failures.push(issue);
        }
        const finishWarnings = [...member.entries()].filter(([, m]) => m.warnings.length).map(([id, m]) => ({ id, issues: m.warnings }));
        if (finishWarnings.length) dataWarnings.push({ code: set.code, issue: "Source finish discrepancies", printings: finishWarnings });
        const pool: BoosterCard[] = [...member.entries()].filter(([id]) => scryfall[id]).map(([id, m]) => ({ card: scryfall[id], play: [...m.play], collector: [...m.collector], products: Object.fromEntries(Object.entries(m.products).map(([key, f]) => [key, [...f]])) }));
        const row: Record<string, unknown> = { code: set.code, name: set.name, boosterTypes: configs.length, printings: member.size, missing: missing.length, missingImages: pool.filter(c => !cardImages(c.card).length).length, products: [] };
        for (const [key, config] of configs) {
            // Independent count directly from pack contents, instead of trusting the app's membership map.
            const expected = new Set<string>();
            for (const pack of config.boosters.filter(p => p.weight > 0)) {
                for (const [sheetKey, count] of Object.entries(pack.contents)) {
                    if (!count || count <= 0) continue;
                    if (!config.sheets[sheetKey]) throw new Error(`Missing sheet ${key}/${sheetKey}`);
                    for (const [uuid, weight] of Object.entries(config.sheets[sheetKey].cards)) {
                        if (weight > 0) {
                            const id = byUuid.get(uuid)?.identifiers.scryfallId;
                            if (!id) throw new Error(`Unresolved UUID ${uuid}`);
                            expected.add(id);
                        }
                    }
                }
            }
            const selected = selectCards(pool, { collector: true, fullArt: false, finish: "auto", sort: "value", query: "", booster: key });
            const expectedPaper = [...expected].filter(id => scryfall[id] && !scryfall[id].digital && !scryfall[id].oversized);
            const actual = new Set(selected.map(c => c.card.id));
            if (actual.size !== expectedPaper.length || expectedPaper.some(id => !actual.has(id))) failures.push({ code: set.code, booster: key, issue: "Rendered count differs from source sheets", expected: expectedPaper.length, actual: actual.size });
            (row.products as unknown[]).push({ key, expected: expected.size, rendered: actual.size });
            configsChecked++;
            memberships += actual.size;
        }
        for (const id of member.keys()) uniquePrintings.add(id);
        results.push(row);
    } catch (error) { failures.push({ code: set.code, issue: String(error) }); }
}
const withoutCollation = catalog.filter(s => !paperBoosterConfigs(all[s.code.toUpperCase()] ?? { code: s.code, cards: [] }).length).map(s => ({ code: s.code, name: s.name, upcoming: s.isUpcoming }));
const report = { generatedAt: new Date().toISOString(), sources, catalogSets: catalog.length, exactSets: results.length, boosterConfigurations: configsChecked, cardMemberships: memberships, uniquePrintings: uniquePrintings.size, failures, dataWarnings, withoutCollation, results };
await mkdir("reports", { recursive: true });
await writeFile("reports/coverage.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
if (failures.length) process.exitCode = 1;
