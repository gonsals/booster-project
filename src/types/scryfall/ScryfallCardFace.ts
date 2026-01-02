import type { Color } from "./ScryFallEnums";
import type { ScryfallImageUris } from "./ScryfallImageUris";

export type ScryfallCardFace = {
    object: "card_face";
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    colors?: Color[];
    power?: string;
    toughness?: string;
    image_uris?: ScryfallImageUris;
};
