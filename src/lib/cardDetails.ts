import { cardImages, priceFor, type BoosterCard } from "./cards.ts";
import type { Finish } from "../types/scryfall/ScryFallEnums";

export function cardDetails(entry: BoosterCard, labels: Record<string, string>) {
    const { card, products = {}, odds = {} } = entry;
    const finishes = [...new Set(Object.values(products).flat().concat(entry.play, entry.collector))];
    return {
        id: card.id, name: card.name, set: card.set, setName: card.set_name, number: card.collector_number,
        rarity: card.rarity, artist: card.artist, type: card.type_line, mana: card.mana_cost,
        text: card.oracle_text, power: card.power, toughness: card.toughness, rank: card.edhrec_rank,
        url: card.scryfall_uri, images: cardImages(card),
        faces: card.card_faces?.map(f => ({ name: f.name, type: f.type_line, mana: f.mana_cost, text: f.oracle_text })),
        prices: finishes.map(finish => ({ finish, price: priceFor(card, finish), confirmed: card.finishes?.includes(finish) ?? false })),
        products: Object.entries(products).map(([key, available]) => ({ key, label: labels[key] ?? key,
            finishes: available, odds: odds[key] ?? null })),
    };
}
export type CardDetail = ReturnType<typeof cardDetails>;
export const finishLabels: Record<Finish, string> = { nonfoil: "Normal", foil: "Foil", etched: "Etched" };
export function percentage(chance: number) {
    return new Intl.NumberFormat("es", { style: "percent", maximumSignificantDigits: 3 }).format(chance);
}
