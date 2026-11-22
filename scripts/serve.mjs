// dist/ ausliefern (echte PWA mit Service Worker): http://localhost:4178
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (!path || path.endsWith('/') || path.endsWith('\\')) path += 'index.html';
    const file = join(DIST, path);
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    try {
        const data = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(data);
    } catch { res.writeHead(404).end('nicht gefunden'); }
}).listen(4178, () => console.log('http://localhost:4178'));
