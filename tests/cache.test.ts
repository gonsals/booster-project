import { test } from "node:test";
import assert from "node:assert/strict";
import { createCache } from "../src/lib/cache.ts";

test("previews can expire sooner than released products", async () => {
    const original = Date.now;
    let now = 1000;
    Date.now = () => now;
    try {
        const cache = createCache<{ preview: boolean; version: number }>(data => data.preview ? 300_000 : 3_600_000);
        await cache("preview", async () => ({ preview: true, version: 1 }));
        await cache("released", async () => ({ preview: false, version: 1 }));
        now += 300_001;
        assert.equal((await cache("preview", async () => ({ preview: true, version: 2 }))).version, 2);
        assert.equal((await cache("released", async () => ({ preview: false, version: 2 }))).version, 1);
    } finally { Date.now = original; }
});

test("concurrent visitors share the download; a failed download can be retried", async () => {
    const cache = createCache<number>(1000);
    let calls = 0;
    const load = async () => { calls++; await Promise.resolve(); return 42; };
    assert.deepEqual(await Promise.all([cache("a", load), cache("a", load)]), [42, 42]);
    assert.equal(calls, 1);
    await assert.rejects(cache("bad", async () => { throw new Error("provider down"); }));
    assert.equal(await cache("bad", load), 42);
});
test("cache expiration and capacity cannot freeze old data indefinitely", async () => {
    const cache = createCache<number>(0, 1);
    assert.equal(await cache("a", async () => 1), 1);
    assert.equal(await cache("a", async () => 2), 2);
    const bounded = createCache<number>(1000, 1);
    await bounded("a", async () => 1); await bounded("b", async () => 2);
    assert.equal(await bounded("a", async () => 3), 3);
});
