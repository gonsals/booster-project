import type { ScryfallCard } from "../types/scryfall/ScryFallCard";
import type { Finish } from "../types/scryfall/ScryFallEnums";
import type { PrintingOdds } from "./boosterOdds.ts";

export type BoosterCard = { card: ScryfallCard; play: Finish[]; collector: Finish[]; products?: Record<string, Finish[]>; odds?: PrintingOdds };
export type CardOptions = { collector: boolean; fullArt: boolean; finish: "auto" | Finish; sort: "value" | "rank"; query: string; booster?: string };

export function cardImages(card: ScryfallCard) {
    if (card.image_uris?.normal) return [{ name: card.name, url: card.image_uris.normal }];
    return (card.card_faces ?? []).flatMap((face) => face.image_uris?.normal ? [{ name: face.name, url: face.image_uris.normal }] : []);
}

export function priceFor(card: ScryfallCard, finish: Finish): number | null {
    const raw = card.prices?.[finish === "nonfoil" ? "usd" : finish === "etched" ? "usd_etched" : "usd_foil"];
    if (raw == null || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
}

export function selectCards(pool: BoosterCard[], options: CardOptions) {
    const needle = options.query.trim().toLocaleLowerCase("es");
    return pool.flatMap(({ card, play, collector, products }) => {
        const finishes = options.booster === "all" ? [...new Set(products ? Object.values(products).flat() : [...play, ...collector])]
            : options.booster && !["standard", "collector"].includes(options.booster) ? products?.[options.booster] ?? []
            : options.booster === "standard" ? play
            : options.booster === "collector" ? collector
            : options.collector ? [...new Set([...play, ...collector])] : play;
        if (!finishes.length || card.digital || card.oversized) return [];
        if (!options.booster && !options.collector && card.promo_types?.includes("boosterfun")) return [];
        if (options.fullArt && !card.full_art) return [];
        if (needle && !card.name.toLocaleLowerCase("es").includes(needle)) return [];
        const finish = options.finish === "auto" ? (["nonfoil", "foil", "etched"] as Finish[]).find((f) => finishes.includes(f)) : options.finish;
        if (!finish || !finishes.includes(finish)) return [];
        return [{ card, finish, price: priceFor(card, finish), images: cardImages(card), unverifiedFinish: !card.finishes?.includes(finish) }];
    }).sort((a, b) => {
        const delta = options.sort === "rank" ? (a.card.edhrec_rank ?? Infinity) - (b.card.edhrec_rank ?? Infinity) : (b.price ?? -1) - (a.price ?? -1);
        return (Number.isNaN(delta) ? 0 : delta) || a.card.name.localeCompare(b.card.name) || a.card.collector_number.localeCompare(b.card.collector_number, undefined, { numeric: true });
    });
}
