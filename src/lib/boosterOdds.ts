import type { Finish } from "../types/scryfall/ScryFallEnums";
import { paperBoosterConfigs, type BoosterSet } from "./boosterPool.ts";
import type { BoosterSheet } from "../types/mtgjson/Booster";

export type FinishOdds = { chance: number; expected: number };
export type ProductOdds = FinishOdds & { finishes: Partial<Record<Finish, FinishOdds>>; approximate: boolean };
export type PrintingOdds = Record<string, ProductOdds>;

// Chance of at least one copy, not expected copies (which can exceed one).
export function sheetChance(sheet: BoosterSheet, weights: number[], targetWeight: number, targetEntries: number, draws: number, uniform = weights.every(w => w === weights[0])): number {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!targetWeight || !total || !draws) return 0;
    if (sheet.fixed && draws >= total) return 1;
    if (!sheet.allowDuplicates && uniform) {
        // Exact uniform sampling without replacement, grouping UUIDs of the same printing.
        let miss = 1;
        for (let i = 0; i < Math.min(draws, weights.length); i++) miss *= Math.max(0, weights.length - targetEntries - i) / (weights.length - i);
        return 1 - miss;
    }
    // Weighted slots: independent-draw approximation. Physical collation/color balancing
    // cannot be recovered from the published marginal weights; the UI labels estimates.
    return -Math.expm1(draws * Math.log1p(-targetWeight / total));
}

export function resolveBoosterOdds(set: BoosterSet, sources: BoosterSet[]): Map<string, PrintingOdds> {
    const byUuid = new Map([set, ...sources].flatMap(s => s.cards).map(c => [c.uuid, c]));
    const result = new Map<string, PrintingOdds>();
    for (const [key, config] of paperBoosterConfigs(set)) {
        const packs = config.boosters.filter(p => p.weight > 0);
        const packWeight = packs.reduce((sum, pack) => sum + pack.weight, 0);
        if (!packWeight) continue;
        // Index sheets once; avoid scanning every card for every booster variant.
        const sheets = new Map(Object.entries(config.sheets).map(([name, sheet]) => {
            const weights = Object.values(sheet.cards).filter(w => w > 0);
            const total = weights.reduce((sum, w) => sum + w, 0);
            const uniform = weights.every(w => w === weights[0]);
            const cards = new Map<string, { weight: number; entries: number; finish: Finish }>();
            for (const [uuid, weight] of Object.entries(sheet.cards)) {
                if (weight <= 0) continue;
                const ref = byUuid.get(uuid);
                const id = ref?.identifiers.scryfallId;
                if (!ref || !id) continue; // Membership resolution separately rejects used unresolved UUIDs.
                const finish: Finish = /etched/i.test(name) ? "etched" : sheet.foil
                    ? !ref.finishes.includes("foil") && ref.finishes.includes("etched") ? "etched" : "foil" : "nonfoil";
                const existing = cards.get(id);
                cards.set(id, { weight: weight + (existing?.weight ?? 0), entries: 1 + (existing?.entries ?? 0), finish });
            }
            return [name, { sheet, weights, total, uniform, cards }] as const;
        }));
        for (const pack of packs) {
            const packCards = new Map<string, ProductOdds>();
            for (const [name, count] of Object.entries(pack.contents)) {
                if (!count || count <= 0) continue;
                const source = sheets.get(name);
                if (!source || !source.total) throw new Error(`Invalid odds sheet: ${set.code}/${key}/${name}`);
                for (const [id, { weight, entries, finish }] of source.cards) {
                    const chance = sheetChance(source.sheet, source.weights, weight, entries, count, source.uniform);
                    const expected = source.sheet.fixed && count >= source.total ? weight : count * weight / source.total;
                    const entry = packCards.get(id) ?? { chance: 0, expected: 0, finishes: {}, approximate: false };
                    entry.chance = entry.chance + chance - entry.chance * chance;
                    entry.expected += expected;
                    const f = entry.finishes[finish] ?? { chance: 0, expected: 0 };
                    entry.finishes[finish] = { chance: f.chance + chance - f.chance * chance, expected: f.expected + expected };
                    entry.approximate ||= Boolean(source.sheet.balanceColors) || (!source.sheet.fixed && count > 1 && !source.sheet.allowDuplicates && !source.uniform);
                    packCards.set(id, entry);
                }
            }
            const factor = pack.weight / packWeight;
            for (const [id, entry] of packCards) {
                const products = result.get(id) ?? {};
                const product = products[key] ?? { chance: 0, expected: 0, finishes: {}, approximate: false };
                product.chance += entry.chance * factor;
                product.expected += entry.expected * factor;
                product.approximate ||= entry.approximate;
                for (const [finish, value] of Object.entries(entry.finishes) as [Finish, FinishOdds][]) {
                    const f = product.finishes[finish] ?? { chance: 0, expected: 0 };
                    product.finishes[finish] = { chance: f.chance + value.chance * factor, expected: f.expected + value.expected * factor };
                }
                products[key] = product;
                result.set(id, products);
            }
        }
    }
    return result;
}
