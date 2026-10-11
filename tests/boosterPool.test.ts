import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBoosterMembers, paperBoosterConfigs, type BoosterSet } from "../src/lib/boosterPool.ts";

const config = (sheet: string, foil: boolean) => ({ sourceSetCodes: ["TST"], boosters: [{ weight: 1, contents: { [sheet]: 1 } }], sheets: { [sheet]: { foil, cards: { uuid: 1 } } } });
test("etched-only sheets resolve etched even when their sheet is named generically", () => {
    const set = { code: "TST", cards: [{ uuid: "uuid", identifiers: { scryfallId: "id" }, finishes: ["etched"] }], booster: { collector: config("specialFoil", true) } } as unknown as BoosterSet;
    const member = resolveBoosterMembers(set, []).get("id")!;
    assert.deepEqual([...member.collector], ["etched"]);
    assert.deepEqual(member.warnings, []);
});
test("digital configurations are excluded; bad physical finishes are reported without dropping cards", () => {
    const set = { code: "TST", cards: [{ uuid: "uuid", identifiers: { scryfallId: "id" }, finishes: ["nonfoil"] }], booster: { default: config("foil", true), "arena-draft": config("base", false), mtgo: config("base", false) } } as unknown as BoosterSet;
    assert.deepEqual(paperBoosterConfigs(set).map(([key]) => key), ["default"]);
    const member = resolveBoosterMembers(set, []).get("id")!;
    assert.deepEqual([...member.play], ["foil"]);
    assert.equal(member.warnings.length, 1);
});
