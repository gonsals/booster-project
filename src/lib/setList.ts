import type { MTGJSONResponse } from "@/types/mtgjson/MTGJSONResponse";
import type { Set } from "@/types/mtgjson/Set";

let cache: MTGJSONResponse<Set[]> | null = null;
let cachedAt = 0;

const TTL = 1000 * 60 * 60 * 24; // 24h

export async function getSetList(): Promise<MTGJSONResponse<Set[]>> {
    const now = Date.now();

    if (cache && now - cachedAt < TTL) {
        return cache;
    }

    const res = await fetch("https://mtgjson.com/api/v5/SetList.json", {
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        throw new Error("Failed to fetch SetList");
    }

    const json = (await res.json()) as MTGJSONResponse<Set[]>;

    cache = json;
    cachedAt = now;

    return json;
}
