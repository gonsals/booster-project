import type { Identifiers } from "./Identifiers";
import type { PurchaseUrls } from "./PurchaseUrls";

export type SealedProduct = {
    cardCount?: number;
    category?: string;
    contents?: SealedProductContents;
    identifiers: Identifiers;
    name: string;
    productSize?: number;
    purchaseUrls: PurchaseUrls;
    releaseDate?: string;
    subtype: string | null;
    uuid: string;
};

export type SealedProductContents = {
    card?: SealedProductCard[];
    deck?: SealedProductDeck[];
    other?: SealedProductOther[];
    pack?: SealedProductPack[];
    sealed?: SealedProductSealed[];
    variable?: Record<"configs", SealedProductContents[]>[];
};

export type SealedProductCard = {
    foil?: boolean;
    name: string;
    number: string;
    set: string;
    uuid: string;
};

export type SealedProductDeck = {
    name: string;
    set: string;
};

export type SealedProductOther = {
    name: string;
};

export type SealedProductPack = {
    code: string;
    set: string;
};

export type SealedProductSealed = {
    count: number;
    name: string;
    set: string;
    uuid: string;
};
