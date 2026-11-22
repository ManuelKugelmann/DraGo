// PWA-Icons ohne Abhängigkeiten: ein einfacher Drachenkopf als PNG.
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public');

function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc(size * (size * 4 + 1));
    let p = 0;
    for (let y = 0; y < size; y++) {
        raw[p++] = 0;
        for (let x = 0; x < size; x++) for (const c of pixel(x / size, y / size)) raw[p++] = c;
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inTri = (x, y, [ax, ay], [bx, by], [cx, cy]) => {
    const d = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
    const d1 = d(x, y, ax, ay, bx, by), d2 = d(x, y, bx, by, cx, cy), d3 = d(x, y, cx, cy, ax, ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

/** Drachenkopf; pad = Rand für maskable Icons. */
function drache(pad) {
    return (u, v) => {
        const x = (u - 0.5) / (1 - 2 * pad) + 0.5, y = (v - 0.5) / (1 - 2 * pad) + 0.5;
        const bg = [43 + v * 30, 24, 64 + v * 20, 255];
        if (inEll(x, y, 0.43, 0.38, 0.045, 0.06)) return [255, 255, 255, 255];                  // Auge
        if (inEll(x, y, 0.45, 0.39, 0.022, 0.035)) return [36, 18, 47, 255];
        if (inTri(x, y, [0.30, 0.38], [0.18, 0.08], [0.42, 0.30]) || inTri(x, y, [0.46, 0.30], [0.48, 0.05], [0.58, 0.32])) return [255, 241, 208, 255];
        if (inEll(x, y, 0.42, 0.45, 0.22, 0.2) || inEll(x, y, 0.62, 0.55, 0.24, 0.13) || inEll(x, y, 0.38, 0.72, 0.13, 0.22))
            return inEll(x, y, 0.62, 0.62, 0.18, 0.05) ? [255, 198, 92, 255] : [232, 86, 42, 255];
        return bg;
    };
}

mkdirSync(OUT, { recursive: true });
for (const s of [192, 512]) {
    writeFileSync(`${OUT}/pwa-${s}x${s}.png`, png(s, drache(0.04)));
    writeFileSync(`${OUT}/maskable-${s}.png`, png(s, drache(0.14)));
}
console.log('Icons geschrieben.');
