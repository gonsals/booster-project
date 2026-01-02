import type { ScryfallCardFace } from "./ScryfallCardFace";
import type {
    BorderColor,
    Color,
    Finish,
    Rarity,
    ScryfallGame,
} from "./ScryFallEnums";
import type { ScryfallImageUris } from "./ScryfallImageUris";
import type { ScryfallLegalities } from "./ScryfallLegalities";
import type { ScryfallPrices } from "./ScryfallPrices";
import type { ScryfallRelatedCard } from "./ScryfallRelatedCard";
import type { ScryfallRelatedUris } from "./ScryfallRelatedUris";

export type ScryfallCard = {
    object: "card";
    id: string;
    oracle_id: string;
    multiverse_ids: number[];
    arena_id?: number;
    name: string;
    lang: string;
    released_at: string;
    uri: string;
    scryfall_uri: string;
    layout: string;
    highres_image: boolean;
    image_status: "missing" | "lowres" | "highres_scan";
    image_uris?: ScryfallImageUris;
    card_faces?: ScryfallCardFace[];
    mana_cost?: string;
    cmc: number;
    type_line: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    colors?: Color[];
    color_identity: Color[];
    keywords: string[];
    all_parts?: ScryfallRelatedCard[];
    legalities: ScryfallLegalities;
    games: ScryfallGame[];
    reserved: boolean;
    game_changer: boolean;
    foil: boolean;
    nonfoil: boolean;
    finishes: Finish[];
    oversized: boolean;
    promo: boolean;
    reprint: boolean;
    variation: boolean;
    set_id: string;
    set: string;
    set_name: string;
    set_type: string;
    set_uri: string;
    set_search_uri: string;
    scryfall_set_uri: string;
    rulings_uri: string;
    prints_search_uri: string;
    collector_number: string;
    digital: boolean;
    rarity: Rarity;
    card_back_id: string;
    artist?: string;
    artist_ids?: string[];
    illustration_id?: string;
    border_color: BorderColor;
    frame: string;
    security_stamp?: string;
    full_art: boolean;
    textless: boolean;
    booster: boolean;
    story_spotlight: boolean;
    promo_types?: string[];
    prices: ScryfallPrices;
    related_uris: ScryfallRelatedUris;
    edhrec_rank: number;
};
