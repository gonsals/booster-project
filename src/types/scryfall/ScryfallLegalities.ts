export type ScryfallLegalities = {
    standard: LegalStatus;
    future: LegalStatus;
    historic: LegalStatus;
    timeless: LegalStatus;
    gladiator: LegalStatus;
    pioneer: LegalStatus;
    modern: LegalStatus;
    legacy: LegalStatus;
    pauper: LegalStatus;
    vintage: LegalStatus;
    penny: LegalStatus;
    commander: LegalStatus;
    oathbreaker: LegalStatus;
    standardbrawl: LegalStatus;
    brawl: LegalStatus;
    alchemy: LegalStatus;
    paupercommander: LegalStatus;
    duel: LegalStatus;
    oldschool: LegalStatus;
    premodern: LegalStatus;
    predh: LegalStatus;
};

export type LegalStatus = "legal" | "not_legal" | "restricted" | "banned";
