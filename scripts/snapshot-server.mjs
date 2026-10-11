import './snapshot-provider.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { default as app } from '../.vercel/output/functions/_render.func/entry.mjs';

const root = resolve('.vercel/output/static');
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
createServer(async (req, res) => {
    try {
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
        const url = new URL(req.url, 'http://127.0.0.1:4322');
        if (url.pathname.startsWith('/_astro/') || url.pathname === '/mtg-top-picks.png') {
            const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
            if (!file.startsWith(root + sep)) { res.writeHead(404); res.end(); return; }
            const body = await readFile(file);
            res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
            res.end(req.method === 'HEAD' ? undefined : body); return;
        }
        const response = await app.fetch(new Request(url, { method: req.method, headers: req.headers }));
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch (error) { console.error(error); res.writeHead(500); res.end('Snapshot test server error'); }
}).listen(4322, '127.0.0.1', () => console.log('Packaged production app with official test snapshots: http://127.0.0.1:4322'));
