import type { Identifiers } from "./Identifiers";

export type ForeignData = {
    faceName?: string;
    flavorText?: string;
    identifiers: Identifiers;
    language: string;
    name: string;
    text?: string;
    type?: string;
    uuid: string;
};
