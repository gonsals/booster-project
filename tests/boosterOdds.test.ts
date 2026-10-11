import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetChance, resolveBoosterOdds } from "../src/lib/boosterOdds.ts";
import type { BoosterSheet } from "../src/types/mtgjson/Booster";
import type { BoosterSet } from "../src/lib/boosterPool.ts";

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const sheet = (overrides: Partial<BoosterSheet> = {}): BoosterSheet => ({ cards: { a: 1, b: 3 }, foil: false, totalWeight: 4, ...overrides });
test("probability of at least one differs from expected copies when duplicates are allowed", () => {
    close(sheetChance(sheet({ allowDuplicates: true }), [1, 3], 1, 1, 2), 1 - .75 ** 2);
});
test("uniform slots without duplicates use sampling without replacement", () => {
    close(sheetChance(sheet(), [1, 1, 1, 1], 1, 1, 2), .5);
    close(sheetChance(sheet(), [2, 2, 2, 2], 4, 2, 2), 5 / 6);
});
test("fixed theme decks guarantee each printing once that deck variant is chosen", () => {
    close(sheetChance(sheet({ fixed: true }), [1, 3], 3, 1, 4), 1);
});

test("very rare weighted outcomes do not round down to zero during calculation", () => {
    const chance = sheetChance(sheet({ allowDuplicates: true }), [1, 1e18], 1, 1, 2);
    assert.ok(chance > 0);
    assert.ok(Math.abs(chance - 2e-18) < 1e-30);
});
test("variant weights, multiple slots and finishes are combined per actual booster product", () => {
    const set: BoosterSet = { code: "TST", cards: [
        { uuid: "a", identifiers: { scryfallId: "id-a" }, finishes: ["nonfoil", "foil"] },
        { uuid: "b", identifiers: { scryfallId: "id-b" }, finishes: ["nonfoil", "foil"] },
    ], booster: { play: { boostersTotalWeight: 4, sourceSetCodes: ["TST"],
        boosters: [{ weight: 3, contents: { base: 1 } }, { weight: 1, contents: { base: 1, foil: 1 } }],
        sheets: { base: sheet(), foil: sheet({ foil: true }) } } } };
    const result = resolveBoosterOdds(set, []).get("id-a")!.play;
    close(result.chance, .75 * .25 + .25 * (1 - .75 ** 2));
    close(result.expected, .3125);
    close(result.finishes.nonfoil!.chance, .25);
    close(result.finishes.foil!.chance, .0625);
    assert.ok(result.expected >= result.chance);
});
test("Jumpstart deck variants are weighted, including repeated basic lands", () => {
    const set: BoosterSet = { code: "TST", cards: [
        { uuid: "a", identifiers: { scryfallId: "id-a" }, finishes: ["nonfoil"] },
        { uuid: "b", identifiers: { scryfallId: "id-b" }, finishes: ["nonfoil"] },
    ], booster: { jumpstart: { boostersTotalWeight: 4, sourceSetCodes: ["TST"],
        boosters: [{ weight: 1, contents: { theme: 4 } }, { weight: 3, contents: { other: 4 } }],
        sheets: { theme: sheet({ fixed: true }), other: sheet({ cards: { b: 4 }, fixed: true }) } } } };
    close(resolveBoosterOdds(set, []).get("id-a")!.jumpstart.chance, .25);
    close(resolveBoosterOdds(set, []).get("id-b")!.jumpstart.chance, 1);
    close(resolveBoosterOdds(set, []).get("id-b")!.jumpstart.expected, 3.75);
});
test("color-balanced sheets explicitly mark the odds as approximate", () => {
    const set: BoosterSet = { code: "TST", cards: [{ uuid: "a", identifiers: { scryfallId: "id-a" }, finishes: ["nonfoil"] }, { uuid: "b", identifiers: { scryfallId: "id-b" }, finishes: ["nonfoil"] }], booster: { draft: { boostersTotalWeight: 1, sourceSetCodes: ["TST"], boosters: [{ weight: 1, contents: { base: 1 } }], sheets: { base: sheet({ balanceColors: true }) } } } };
    assert.equal(resolveBoosterOdds(set, []).get("id-a")!.draft.approximate, true);
});
