import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faerbeHaar } from '../src/start/haar.js';

const bild = (b, h, rgb) => {
    const p = new Uint8ClampedArray(b * h * 4);
    for (let i = 0; i < b * h; i++) p.set([...rgb, 255], i * 4);
    return p;
};

test('Haar-Feld bekommt die neue Farbe, der Rest bleibt', () => {
    const p = faerbeHaar(bild(16, 8, [100, 100, 100]), 16, 8, 0xff0000);
    const at = (x, y) => Array.from(p.slice((y * 16 + x) * 4, (y * 16 + x) * 4 + 4));
    assert.deepEqual(at(2, 0), [255, 0, 0, 255]);   // Feld Spalte 1 (x 2..3), Zeile 0 (y 0..1)
    assert.deepEqual(at(3, 1), [255, 0, 0, 255]);
    assert.deepEqual(at(0, 0), [100, 100, 100, 255]);
    assert.deepEqual(at(2, 2), [100, 100, 100, 255]);
});

test('Helligkeits-Verlauf bleibt erhalten', () => {
    const p = bild(16, 8, [100, 100, 100]);
    p.set([50, 50, 50, 255], (1 * 16 + 2) * 4);       // ein dunkler Pixel im Feld
    faerbeHaar(p, 16, 8, 0x808080);
    assert.ok(p[(1 * 16 + 2) * 4] < p[(0 * 16 + 2) * 4]);
});

test('null = nichts ändern', () => {
    const p = bild(16, 8, [10, 20, 30]);
    faerbeHaar(p, 16, 8, null);
    assert.deepEqual(Array.from(p.slice(8, 12)), [10, 20, 30, 255]);
});
