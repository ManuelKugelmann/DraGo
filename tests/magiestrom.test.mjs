import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schaetzTor, rechenTor, vokabelTor, nachTor, schatten, nachSchatten } from '../src/magiestrom/regeln.js';

const folge = werte => { let i = 0; return () => werte[i++ % werte.length]; };

test('Schätz-Tor: zwei verschiedene Ergebnisse, "richtig" ist das größere', () => {
    for (let n = 0; n < 30; n++) {
        const t = schaetzTor(n);
        const [a, b] = t.rechnungen.map(r => r.f(n));
        assert.notEqual(a, b);
        assert.equal(t.richtig, a > b ? 0 : 1);
    }
});

test('Beispiel: bei 3 Funken ist × 2 (6) schlechter als + 4 (7)', () => {
    const t = { art: 'schaetzen', rechnungen: [{ f: n => n * 2 }, { f: n => n + 4 }] };
    assert.equal(nachTor(t, 0, 3), 6);
    assert.equal(nachTor(t, 1, 3), 7);
});

test('Rechen-Tor: richtige Antwort ist dabei, alle verschieden und positiv', () => {
    for (let i = 0; i < 50; i++) {
        const t = rechenTor();
        const [a, b] = t.frage.match(/\d+/g).map(Number);
        assert.equal(Number(t.optionen[t.richtig]), a * b);
        assert.equal(new Set(t.optionen).size, 3);
        t.optionen.forEach(o => assert.ok(Number(o) > 0));
    }
});

test('Vokabel-Tor: Übersetzung ist dabei', () => {
    const v = [{ de: 'Hund', en: 'dog' }, { de: 'Katze', en: 'cat' }, { de: 'Haus', en: 'house' }, { de: 'Baum', en: 'tree' }];
    const t = vokabelTor(v, folge([0.1, 0.5, 0.9]));
    const de = t.frage.split(' ')[0];
    assert.equal(t.optionen[t.richtig], v.find(x => x.de === de).en);
    assert.equal(t.optionen.length, 3);
});

test('Frage-Tor: richtig = doppelt, falsch = bleibt gleich (kein Malus)', () => {
    const t = { art: 'frage', richtig: 1 };
    assert.equal(nachTor(t, 1, 5), 10);
    assert.equal(nachTor(t, 0, 5), 5);
});

test('Schatten löschen aus, bei 0 neue Start-Funken', () => {
    assert.equal(schatten(0), 2);
    assert.equal(schatten(3), 8);
    assert.deepEqual(nachSchatten(10, 4), { geloescht: 4, uebrig: 6, weiter: 6 });
    assert.deepEqual(nachSchatten(3, 5), { geloescht: 3, uebrig: 0, weiter: 3 });
});

test('Stärke: schneller = mehr Sterne', async () => {
    const { staerke } = await import('../src/magiestrom/regeln.js');
    assert.equal(staerke(60), 3);
    assert.equal(staerke(90), 3);
    assert.equal(staerke(120), 2);
    assert.equal(staerke(500), 1);
    assert.equal(staerke(10, [5, 20]), 2);
});

test('Plus/Minus und Zufalls-Tor: richtige Antwort ist dabei', async () => {
    const { plusMinusTor, zufallsTor } = await import('../src/magiestrom/regeln.js');
    for (let i = 0; i < 100; i++) {
        const t = plusMinusTor();
        const [a, op, b] = t.frage.split(' ');
        const r = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
        assert.equal(Number(t.optionen[t.richtig]), r);
        assert.ok(r >= 0 && r <= 100);
        const z = zufallsTor(5, [{ de: 'Hund', en: 'dog' }, { de: 'Katze', en: 'cat' }, { de: 'Haus', en: 'house' }]);
        assert.ok(z.richtig >= 0);
    }
});
