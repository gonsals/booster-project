import { test } from "node:test";
import assert from "node:assert/strict";
import { createCache } from "../src/lib/cache.ts";

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
