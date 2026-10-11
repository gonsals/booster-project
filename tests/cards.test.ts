import { test } from "node:test";
import assert from "node:assert/strict";
import { selectCards, priceFor, cardImages, type CardOptions, type BoosterCard } from "../src/lib/cards.ts";
import type { ScryfallCard } from "../src/types/scryfall/ScryFallCard";

const card = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
    id: "regular", name: "Test", collector_number: "1", digital: false, oversized: false,
    booster: true, promo: false, finishes: ["nonfoil", "foil"], full_art: false,
    prices: { usd: "1", usd_foil: "20", usd_etched: null, eur: null, eur_foil: null, tix: null },
    image_uris: { normal: "https://example.com/front.jpg" }, ...overrides,
} as ScryfallCard);
const options: CardOptions = { collector: false, fullArt: false, finish: "auto", sort: "value", query: "" };
const pool: BoosterCard[] = [
    { card: card(), play: ["nonfoil", "foil"], collector: ["foil"] },
    { card: card({ id: "special", promo: true, promo_types: ["boosterfun"], full_art: true }), play: [], collector: ["foil"] },
    { card: card({ id: "promo", promo: true }), play: [], collector: [] },
];

test("standard pool excludes Collector-only and unrelated promo printings", () => {
    assert.deepEqual(selectCards(pool, options).map((c) => c.card.id), ["regular"]);
    assert.deepEqual(selectCards(pool, { ...options, collector: true }).map((c) => c.card.id), ["special", "regular"]);
});
test("Collector-only foil prices never use a nonfoil price from the same printing", () => {
    const chosen = selectCards(pool, { ...options, collector: true }).find((c) => c.card.id === "special")!;
    assert.equal(chosen.finish, "foil"); assert.equal(chosen.price, 20);
});
test("explicit finishes, full-art and search filters compose", () => {
    assert.equal(selectCards(pool, { ...options, collector: true, fullArt: true, finish: "nonfoil" }).length, 0);
    assert.equal(selectCards(pool, { ...options, collector: true, fullArt: true, finish: "foil", query: "TEST" }).length, 1);
    assert.equal(selectCards(pool, { ...options, query: "absent" }).length, 0);
});
test("unknown prices stay unknown, zero is a valid price, and etched uses its own field", () => {
    assert.equal(priceFor(card({ prices: { usd: "0", usd_foil: null, usd_etched: "99" } as ScryfallCard["prices"] }), "nonfoil"), 0);
    assert.equal(priceFor(card({ prices: { usd: "1", usd_foil: null } as ScryfallCard["prices"] }), "foil"), null);
    assert.equal(priceFor(card({ prices: { usd_etched: "99" } as ScryfallCard["prices"] }), "etched"), 99);
});
test("double-faced cards remain visible with both printing-specific images", () => {
    const double = card({ image_uris: undefined, card_faces: [{ name: "Front", image_uris: { normal: "front" } }, { name: "Back", image_uris: { normal: "back" } }] as ScryfallCard["card_faces"] });
    assert.equal(cardImages(double).length, 2);
    assert.equal(selectCards([{ card: double, play: ["nonfoil"], collector: [] }], options).length, 1);
});
test("EDHREC sorts ranked cards ahead of cards without a rank", () => {
    const cards = [card({ id: "unranked", edhrec_rank: undefined }), card({ id: "ranked", edhrec_rank: 3 })];
    assert.equal(selectCards(cards.map((card) => ({ card, play: ["nonfoil"], collector: [] })), { ...options, sort: "rank" })[0].card.id, "ranked");
});

test("all products include Jumpstart and promos; each product filter keeps its own pool", () => {
    const products: BoosterCard[] = [
        { card: card({ id: "play" }), play: ["nonfoil"], collector: [], products: { play: ["nonfoil"] } },
        { card: card({ id: "jumpstart", booster: false }), play: [], collector: [], products: { jumpstart: ["nonfoil"] } },
        { card: card({ id: "promo", promo: true }), play: [], collector: [], products: { promo: ["foil"] } },
    ];
    assert.equal(selectCards(products, { ...options, booster: "all" }).length, 3);
    assert.deepEqual(selectCards(products, { ...options, booster: "jumpstart" }).map(c => c.card.id), ["jumpstart"]);
    assert.deepEqual(selectCards(products, { ...options, booster: "standard", collector: true }).map(c => c.card.id), ["play"]);
});

test("missing images and unconfirmed finishes do not silently remove a printing", () => {
    const pool: BoosterCard[] = [{ card: card({ image_uris: undefined, finishes: ["nonfoil"] }), play: ["foil"], collector: [] }];
    const selected = selectCards(pool, { ...options, booster: "all" });
    assert.equal(selected.length, 1);
    assert.equal(selected[0].unverifiedFinish, true);
    assert.deepEqual(selected[0].images, []);
});
