// Test-only provider replay. The application uses its normal HTTP/cache code.
// Use the real downloaded snapshots to test the browser during provider outages.
import { readFile } from 'node:fs/promises';
const read = async name => JSON.parse(await readFile(new URL(`../.cache/coverage/${name}.json`, import.meta.url), 'utf8'));
const [list, sets, cards] = await Promise.all(['set-list', 'sets', 'scryfall'].map(read));
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://mtgjson.com/api/v5/SetList.json') return Response.json(list);
    const code = url.match(/^https:\/\/mtgjson\.com\/api\/v5\/([A-Z0-9]+)\.json$/)?.[1];
    if (code) return sets[code] ? Response.json({ meta: list.meta, data: sets[code] }) : new Response('', { status: 404 });
    if (url === 'https://api.scryfall.com/cards/collection') {
        const ids = JSON.parse(String(init?.body)).identifiers.map(i => i.id);
        return Response.json({ data: ids.filter(id => cards[id]).map(id => cards[id]), not_found: ids.filter(id => !cards[id]) });
    }
    return original(input, init);
};
console.log(`Test provider replay: official snapshots dated ${list.meta.date}.`);
