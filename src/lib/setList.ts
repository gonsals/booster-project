import type { MTGJSONResponse } from "../types/mtgjson/MTGJSONResponse";
import type { Set as MtgSet } from "../types/mtgjson/Set";
import type { SealedProduct } from "../types/mtgjson/SealedProduct";
import { createCache } from "./cache.ts";
import { fetchJson } from "./http.ts";

export type SetSummary = Omit<MtgSet, "cards" | "tokens" | "booster">;
export type CatalogSet = {
    name: string; code: string; releaseDate: string; isUpcoming: boolean;
    boosters: { play: boolean; draft: boolean; set: boolean; collector: boolean; jumpstart: boolean; theme: boolean; other: boolean };
    type: string;
};
const cache = createCache<MTGJSONResponse<SetSummary[]>>(60 * 60 * 1000, 1);

export function getSetList() {
    return cache("sets", async () => {
        const json = await fetchJson<MTGJSONResponse<SetSummary[]>>("https://mtgjson.com/api/v5/SetList.json");
        if (!Array.isArray(json.data)) throw new Error("Invalid MTGJSON set list");
        return json;
    });
}

export function getBoosterTypes(products: SealedProduct[] = []) {
    const packs = products.filter((p) => /^booster/i.test(p.category ?? "") || /booster/i.test(p.name));
    const match = (pattern: RegExp) => packs.some((p) => pattern.test(`${p.name} ${p.subtype ?? ""}`));
    return { play: match(/\bplay\b/i), draft: match(/\bdraft\b/i), set: match(/\bset booster\b|\bset$/i),
        collector: match(/\bcollector\b/i), jumpstart: match(/\bjumpstart\b/i), theme: match(/\btheme\b/i),
        other: packs.length > 0 && !match(/\b(play|draft|set|collector|jumpstart|theme) booster\b/i) };
}

export function buildCatalog(data: SetSummary[], query = "", today = new Date().toISOString().slice(0, 10)): CatalogSet[] {
    const needle = query.trim().toLocaleLowerCase("es");
    return data.filter((s) => !s.isOnlineOnly).map((s) => {
        const boosters = getBoosterTypes(s.sealedProduct);
        // Ugin's Fate event packs have published collation but no sealed-product metadata.
        if (s.code === "UGIN") boosters.other = true;
        // Future announcements often precede sealed-product metadata.
        if (!s.sealedProduct?.length && s.releaseDate > today && ["expansion", "core", "masters", "draft_innovation"].includes(s.type)) boosters.other = true;
        return { name: s.name, code: s.code.toLowerCase(), releaseDate: s.releaseDate, type: s.type,
            isUpcoming: s.releaseDate > today, boosters };
    }).filter((s) => Object.values(s.boosters).some(Boolean) && (!needle || `${s.name} ${s.code}`.toLocaleLowerCase("es").includes(needle)))
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.name.localeCompare(b.name));
}
