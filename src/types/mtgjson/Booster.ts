export type BoosterConfig = {
    boosters: BoosterPack[];
    boostersTotalWeight: number;
    name?: string;
    sheets: Record<string, BoosterSheet>;
    sourceSetCodes: string[];
};

export type BoosterPack = {
    contents: Partial<Record<string, number>>;
    weight: number;
};

export type BoosterSheet = {
    allowDuplicates?: boolean;
    balanceColors?: boolean;
    cards: Record<string, number>;
    foil: boolean;
    fixed?: boolean;
    totalWeight: number;
};
