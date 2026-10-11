import type { Set as MtgSet } from "../types/mtgjson/Set";
import type { MTGJSONResponse } from "../types/mtgjson/MTGJSONResponse";
import type { ScryfallCard } from "../types/scryfall/ScryFallCard";
import type { BoosterCard } from "./cards";
import { createCache } from "./cache.ts";
import { paperBoosterConfigs, resolveBoosterMembers, boosterLabel, preferredBooster } from "./boosterPool.ts";
import { DataError, fetchJson } from "./http.ts";
import { resolveBoosterOdds } from "./boosterOdds.ts";

type CompactSet = Pick<MtgSet, "code" | "name" | "releaseDate" | "booster"> & { cards: Pick<MtgSet["cards"][number], "uuid" | "identifiers" | "finishes" | "availability">[] };
type CardList = { data: ScryfallCard[]; has_more?: boolean; next_page?: string; not_found?: unknown[] };
export type BoosterData = { name: string; releaseDate: string; date: string; activeBooster: string; pool: BoosterCard[]; approximate: boolean; hasCollector: boolean; boosters: { key: string; label: string; count: number }[]; warnings: number; pending: number };
const setCache = createCache<MTGJSONResponse<CompactSet>>(60 * 60 * 1000, 32);
const poolCache = createCache<BoosterData>(60 * 60 * 1000, 20);
const printingCache = new Map<string, { card: ScryfallCard; savedAt: number }>();
const printingTtl = 60 * 60 * 1000;

function getSet(code: string) {
    if (!/^[a-z0-9]{2,8}$/i.test(code)) throw new DataError("Invalid set code", 404);
    return setCache(code.toUpperCase(), async () => {
        const json = await fetchJson<MTGJSONResponse<MtgSet>>(`https://mtgjson.com/api/v5/${code.toUpperCase()}.json`);
        if (!json.data || !Array.isArray(json.data.cards)) throw new Error("Invalid MTGJSON set");
        const { code: setCode, name, releaseDate, booster, cards } = json.data;
        return { meta: json.meta, data: { code: setCode, name, releaseDate, booster,
            cards: [...cards, ...(json.data.tokens ?? [])].map(({ uuid, identifiers, finishes, availability }) => ({ uuid, identifiers, finishes, availability })) } };
    });
}

// Serialize across visitors; remain comfortably below Scryfall's ten requests/second.
let queue: Promise<unknown> = Promise.resolve();
let blockedUntil = 0;
function scryfall<T>(url: string, init?: RequestInit): Promise<T> {
    const request = queue.then(async () => {
        if (Date.now() < blockedUntil) throw new DataError("Scryfall is cooling down", 429, Math.ceil((blockedUntil - Date.now()) / 1000));
        try { return await fetchJson<T>(url, init); }
        catch (error) {
            if (error instanceof DataError && error.status === 429) {
                const delay = Math.max(60, error.retryAfter);
                blockedUntil = Date.now() + delay * 1000;
                error.retryAfter = delay;
            }
            throw error;
        }
    });
    queue = request.catch(() => {}).then(() => new Promise((resolve) => setTimeout(resolve, 150)));
    return request;
}

async function loadPrintings(ids: string[]): Promise<ScryfallCard[]> {
    const cards: ScryfallCard[] = [];
    // Retain fresh hits while downloading: another visitor may evict the shared cache.
    const retained = new Map(ids.flatMap(id => {
        const entry = printingCache.get(id);
        return entry && Date.now() - entry.savedAt < printingTtl ? [[id, entry.card] as const] : [];
    }));
    const missing = ids.filter(id => !retained.has(id));
    for (let i = 0; i < missing.length; i += 75) {
        let page: CardList;
        try {
            page = await scryfall<CardList>("https://api.scryfall.com/cards/collection", { method: "POST",
                headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifiers: missing.slice(i, i + 75).map((id) => ({ id })) }) });
        } catch (error) {
            if (error instanceof DataError && error.status === 404) throw new DataError("Scryfall collection unavailable");
            throw error;
        }
        if (!Array.isArray(page.data) || page.not_found?.length) throw new Error("Missing Scryfall printings");
        cards.push(...page.data);
    }
    const expected = new Set(missing);
    if (cards.length !== missing.length || new Set(cards.map(c => c.id)).size !== missing.length || cards.some(c => !expected.has(c.id))) throw new Error("Incomplete Scryfall collection");
    // Only commit a complete download. A later failed batch must not cache a partial pool.
    const downloaded = new Map(cards.map(card => [card.id, card]));
    const result = ids.map(id => downloaded.get(id) ?? retained.get(id)!);
    for (const card of cards) {
        printingCache.delete(card.id);
        printingCache.set(card.id, { card, savedAt: Date.now() });
    }
    while (printingCache.size > 12_000) printingCache.delete(printingCache.keys().next().value!);
    return result;
}

export function getBoosterData(code: string, requestedBooster = "all"): Promise<BoosterData> {
    return poolCache(`${code.toLowerCase()}:${requestedBooster}`, async () => {
        const { data: set, meta } = await getSet(code);
        const configs = paperBoosterConfigs(set);
        const activeBooster = requestedBooster === "auto" ? preferredBooster(configs.map(([key]) => key)) : requestedBooster;
        if (!configs.length) {
            // Without collation, show all published paper printings as provisional.
            // Preview cards often have booster=false until their release.
            const ids = [...new Set(set.cards.filter(c => c.availability?.includes("paper")).map(c => c.identifiers.scryfallId).filter((id): id is string => Boolean(id)))];
            const cards = await loadPrintings(ids);
            return { name: set.name, releaseDate: set.releaseDate, date: meta.date, activeBooster, approximate: true,
                hasCollector: cards.some((c) => c.promo_types?.includes("boosterfun")), boosters: [], warnings: 0, pending: 0,
                pool: cards.map((card) => ({ card,
                    play: card.finishes,
                    collector: card.promo_types?.includes("boosterfun") ? card.finishes : [], products: { provisional: card.finishes } })) };
        }
        const sourceCodes = [...new Set(configs.flatMap(([, config]) => config.sourceSetCodes))].filter((source) => source.toUpperCase() !== set.code.toUpperCase());
        const sources: MTGJSONResponse<CompactSet>[] = [];
        let sourceIndex = 0;
        await Promise.all(Array.from({ length: Math.min(4, sourceCodes.length) }, async () => {
            while (sourceIndex < sourceCodes.length) {
                const source = sourceCodes[sourceIndex++];
                try { sources.push(await getSet(source)); }
                catch (error) { throw new DataError(`Booster source ${source} unavailable: ${String(error)}`); }
            }
        }));
        const members = resolveBoosterMembers(set, sources.map((s) => s.data));
        const odds = resolveBoosterOdds(set, sources.map((s) => s.data));
        const ids = [...members.entries()].filter(([, member]) => activeBooster === "all"
            || (activeBooster === "standard" ? member.play.size > 0 : !!member.products[activeBooster])).map(([id]) => id);
        const cards = await loadPrintings(ids);
        return { name: set.name, releaseDate: set.releaseDate, date: meta.date, activeBooster, approximate: false,
            hasCollector: configs.some(([key]) => key === "collector"),
            boosters: configs.map(([key, config]) => ({ key, label: boosterLabel(key, config.name), count: [...members.values()].filter((m) => m.products[key]).length })),
            warnings: [...members.values()].filter(m => m.warnings.length).length,
            pending: cards.filter(c => c.digital || c.oversized).length,
            pool: cards.map((card) => ({ card, play: [...members.get(card.id)!.play], collector: [...members.get(card.id)!.collector], odds: odds.get(card.id), products: Object.fromEntries(Object.entries(members.get(card.id)!.products).map(([key, finishes]) => [key, [...finishes]])) })) };
    });
}
