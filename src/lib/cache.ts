// Bounded cache: coalesce concurrent requests and never cache failed downloads.
export function createCache<T>(ttl: number | ((value: T) => number), maxEntries = 24) {
    const entries = new Map<string, { value: T; savedAt: number }>();
    const pending = new Map<string, Promise<T>>();
    return async (key: string, load: () => Promise<T>): Promise<T> => {
        const existing = entries.get(key);
        if (existing && Date.now() - existing.savedAt < (typeof ttl === "function" ? ttl(existing.value) : ttl)) return existing.value;
        const inflight = pending.get(key);
        if (inflight) return inflight;
        const request = load().then((value) => {
            entries.delete(key);
            entries.set(key, { value, savedAt: Date.now() });
            while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
            return value;
        }).finally(() => pending.delete(key));
        pending.set(key, request);
        return request;
    };
}
