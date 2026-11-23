import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istVielfaches, neueReihe, naechsteZahl, neuerRitt, nimmZahl, ticke, reiheWechseln } from '../src/reihenritt/regeln.js';
import { stufe } from '../src/magiestrom/stufen.js';

test('Vielfaches erkennen', () => {
    assert.ok(istVielfaches(21, 7));
    assert.ok(!istVielfaches(22, 7));
    assert.ok(!istVielfaches(0, 7));
});

test('Zahlen: richtige sind in der Reihe, falsche nie', () => {
    for (const alter of [6, 9, 12]) {
        const st = stufe(alter);
        for (let i = 0; i < 300; i++) {
            const reihe = neueReihe(st);
            assert.ok(st.malReihen.includes(reihe));
            const z = naechsteZahl(reihe, st);
            assert.ok(z.wert > 0);
            assert.equal(istVielfaches(z.wert, reihe), z.richtig, `${z.wert} in ${reihe}er`);
        }
    }
});

test('Neue Reihe ist eine andere', () => {
    const st = stufe(9);
    for (let i = 0; i < 50; i++) assert.notEqual(neueReihe(st, Math.random, 7), 7);
});

test('Zeit: richtig = mehr (bis max), falsch = weniger, 0 = vorbei', () => {
    const m = { zeit: 10, max: 12, plus: 3, minus: 4, wechsel: 2 };
    const z = neuerRitt(m);
    nimmZahl(z, { richtig: true }, m);
    assert.equal(z.zeit, 12);
    nimmZahl(z, { richtig: false }, m);
    assert.equal(z.zeit, 8);
    assert.ok(!reiheWechseln(z, m));
    nimmZahl(z, { richtig: true }, m);
    assert.ok(reiheWechseln(z, m));
    assert.ok(ticke(z, 5));
    assert.ok(!ticke(z, 20));
    assert.equal(z.zeit, 0);
});
