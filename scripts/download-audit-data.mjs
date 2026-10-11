import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/pick.js';
import { streamObject } from 'stream-json/streamers/stream-object.js';
import chain from 'stream-chain';

const dir = '.cache/coverage';
await mkdir(dir, { recursive: true });
const headers = { Accept: 'application/json', 'User-Agent': 'MTGTopPicks/0.1' };
async function json(url) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Metadata download failed: ${response.status}`);
    return response.json();
}
const list = await json('https://mtgjson.com/api/v5/SetList.json');
await writeFile(`${dir}/set-list.json`, JSON.stringify(list));
const bulk = await json('https://api.scryfall.com/bulk-data');
const data = bulk.data.find((d) => d.type === 'default_cards');
if (!data?.jsonl_download_uri) throw new Error('Scryfall bulk JSONL unavailable');
const scryfallFile = `${dir}/scryfall-${data.updated_at.replace(/[^0-9]/g, '')}.gz`;
await writeFile(`${dir}/sources.json`, JSON.stringify({ mtgjson: list.meta.date, scryfall: data.updated_at, url: data.jsonl_download_uri }));
async function download(url, file) {
    if (existsSync(file)) { console.log(`Using cached download: ${file}`); return; }
    console.log(`Downloading ${url}`);
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(300_000) });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${file}.partial`));
    const { rename } = await import('node:fs/promises');
    await rename(`${file}.partial`, file);
    console.log(`Downloaded ${file}`);
}
await Promise.all([
    download('https://mtgjson.com/api/v5/AllPrintings.json.gz', `${dir}/all-printings-${list.meta.date}.gz`),
    download(data.jsonl_download_uri, scryfallFile),
]);
const sets = {};
console.log('Reading all MTGJSON sets with bounded memory…');
const stream = chain([createReadStream(`${dir}/all-printings-${list.meta.date}.gz`), createGunzip(), parser(), pick({ filter: 'data' }), streamObject()]);
for await (const { key, value: s } of stream) {
    sets[key] = { code: s.code, name: s.name, releaseDate: s.releaseDate, type: s.type, isOnlineOnly: s.isOnlineOnly,
        sealedProduct: s.sealedProduct, booster: s.booster,
        cards: [...s.cards, ...(s.tokens ?? [])].map(c => ({ uuid: c.uuid, identifiers: { scryfallId: c.identifiers.scryfallId }, finishes: c.finishes, name: c.name, language: c.language, availability: c.availability })) };
}
await writeFile(`${dir}/sets.json`, JSON.stringify(sets));
console.log(`Indexed ${Object.keys(sets).length} sets. Reading Scryfall printings…`);
const cards = {};
const lines = createInterface({ input: createReadStream(scryfallFile).pipe(createGunzip()), crlfDelay: Infinity });
for await (const line of lines) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    cards[c.id] = { id: c.id, name: c.name, lang: c.lang, set: c.set, set_name: c.set_name, collector_number: c.collector_number,
        scryfall_uri: c.scryfall_uri, rarity: c.rarity, finishes: c.finishes, prices: c.prices, full_art: c.full_art,
        artist: c.artist, type_line: c.type_line, mana_cost: c.mana_cost, oracle_text: c.oracle_text, power: c.power, toughness: c.toughness,
        booster: c.booster, promo: c.promo, promo_types: c.promo_types, edhrec_rank: c.edhrec_rank, digital: c.digital, oversized: c.oversized,
        image_uris: c.image_uris?.normal ? { normal: c.image_uris.normal } : undefined,
        card_faces: c.card_faces?.map(f => ({ name: f.name, type_line: f.type_line, mana_cost: f.mana_cost, oracle_text: f.oracle_text, image_uris: f.image_uris?.normal ? { normal: f.image_uris.normal } : undefined })) };
}
await writeFile(`${dir}/scryfall.json`, JSON.stringify(cards));
console.log(`Indexed ${Object.keys(cards).length} printings. Bulk downloads complete.`);
