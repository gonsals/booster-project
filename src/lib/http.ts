export class DataError extends Error {
    status: number;
    retryAfter: number;
    constructor(message: string, status = 502, retryAfter = 0) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/json", "User-Agent": "MTGTopPicks/0.1", ...init.headers },
    });
    if (!response.ok) throw new DataError(`${new URL(url).hostname} returned ${response.status}`, response.status, Number(response.headers.get("Retry-After")) || 0);
    return response.json() as Promise<T>;
}
