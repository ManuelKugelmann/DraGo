import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSecret, rollWords, WOERTER } from '../src/net/geheim.js';
import { cleanState, cleanEmote } from '../src/net/nachricht.js';
import { deriveKeys } from '../src/net/schluessel.js';

test('Raumname: Umlaute, Leerzeichen, Großbuchstaben egal', () => {
    assert.equal(normalizeSecret('Höhle Feuer  MOND!'), 'hohlefeuermond');
    assert.equal(normalizeSecret(null), '');
});

test('Würfeln gibt drei verschiedene bekannte Wörter', () => {
    let i = 0;
    const w = rollWords(() => [0, 0, 0.5, 0.99][i++ % 4]);
    assert.equal(w.length, 3);
    assert.equal(new Set(w).size, 3);
    w.forEach(x => assert.ok(WOERTER.includes(x)));
});

test('Zustand: gültig wird durchgelassen, Unsinn nicht', () => {
    assert.deepEqual(cleanState({ x: 0.5, y: 2, typ: 'feuer', n: 3.7, text: 'hallo' }), { x: 0.5, y: 1, typ: 'feuer', n: 3 });
    assert.equal(cleanState({ x: 0.5, y: 0.5, typ: 'boese', n: 1 }), null);
    assert.equal(cleanState({ x: 'a', y: 0.5, typ: 'feuer', n: 1 }), null);
    assert.equal(cleanState({ x: 0.5, y: 0.5, typ: 'toString', n: 1 }), null);
    assert.equal(cleanState('quatsch'), null);
});

test('Emotes: nur bekannte IDs', () => {
    assert.equal(cleanEmote('herz'), 'herz');
    assert.equal(cleanEmote('hallo du'), null);
    assert.equal(cleanEmote('__proto__'), null);
});

test('Schlüssel: gleich für gleichen Namen, verschieden für andere', async () => {
    const a = await deriveKeys('drachefeuermond'), b = await deriveKeys('drachefeuermond'), c = await deriveKeys('anders');
    assert.deepEqual(a, b);
    assert.notEqual(a.room, c.room);
    assert.match(a.room, /^[0-9a-f]{48}$/);
});
