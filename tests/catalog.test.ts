import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, type SetSummary } from "../src/lib/setList.ts";

test("announced expansions appear without sealed metadata; digital and deck-only sets are excluded", () => {
    const data = [
        { name: "Future", code: "NEW", releaseDate: "2027-01-01", type: "expansion" },
        { name: "Arena", code: "DIG", releaseDate: "2027-01-01", type: "expansion", isOnlineOnly: true },
        { name: "Commander Deck", code: "CMD", releaseDate: "2027-01-01", type: "commander" },
        { name: "Released", code: "OLD", releaseDate: "2025-01-01", type: "expansion", sealedProduct: [{ category: "booster_pack", name: "Released Draft Booster", subtype: "draft" }] },
    ] as SetSummary[];
    const catalog = buildCatalog(data, "", "2026-10-10");
    assert.deepEqual(catalog.map((c) => c.code), ["new", "old"]);
    assert.equal(catalog[0].isUpcoming, true);
    assert.equal(catalog[1].boosters.draft, true);
    assert.equal(catalog[1].boosters.play, false);
    assert.equal(buildCatalog(data, "OLD", "2026-10-10").length, 1);
});

test("foreign paper sets, Jumpstart and Ugin event packs remain discoverable", () => {
    const data = [
        { name: "Foreign", code: "FBB", releaseDate: "1994-01-01", type: "core", isForeignOnly: true, sealedProduct: [{ category: "booster_pack", name: "Foreign Booster" }] },
        { name: "Jumpstart", code: "J25", releaseDate: "2024-11-15", type: "draft_innovation", sealedProduct: [{ category: "booster_pack", name: "Foundations Jumpstart Booster" }] },
        { name: "Ugin's Fate", code: "UGIN", releaseDate: "2015-01-01", type: "promo" },
    ] as SetSummary[];
    const catalog = buildCatalog(data, "", "2026-10-10");
    assert.equal(catalog.length, 3);
    assert.equal(catalog.find(s => s.code === "j25")?.boosters.jumpstart, true);
    assert.equal(catalog.find(s => s.code === "ugin")?.boosters.other, true);
});
