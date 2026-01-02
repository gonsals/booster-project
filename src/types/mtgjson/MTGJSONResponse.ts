import type { Set } from "@/types/mtgjson/Set";

export type MTGJSONResponse<T> = {
    meta: {
        date: string;
        version: string;
    };
    data: Set[];
};
