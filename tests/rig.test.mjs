import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retarget, MASS } from '../src/rig/retarget.js';
import { haarPalette } from '../src/rig/farben.js';

// Stehende Figur (KayKit-artig, Meter, y oben, schaut nach +z, linke Seite +x), Arme hängen.
const stehend = (k = 1) => {
    const p = (x, y, z = 0) => ({ x: x * k, y: y * k, z: z * k });
    return {
        hips: p(0, 0.5), chest: p(0, 0.8), head: p(0, 1.0),
        upperarm_l: p(0.2, 0.95), lowerarm_l: p(0.25, 0.75), wrist_l: p(0.27, 0.55),
        upperarm_r: p(-0.2, 0.95), lowerarm_r: p(-0.25, 0.75), wrist_r: p(-0.27, 0.55),
        upperleg_l: p(0.1, 0.45), lowerleg_l: p(0.1, 0.25), foot_l: p(0.1, 0.05), toes_l: p(0.1, 0, 0.1),
        upperleg_r: p(-0.1, 0.45), lowerleg_r: p(-0.1, 0.25), foot_r: p(-0.1, 0.05), toes_r: p(-0.1, 0, 0.1)
    };
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const nah = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);

test('Kopf oben, Füße unten (y nach unten), Füße nicht im Boden', () => {
    const g = retarget(stehend());
    assert.ok(g.kopf.y < g.brust.y && g.brust.y < g.huefte.y);
    for (const b of g.beine) assert.ok(b.fuss.y <= -MASS.knoechel + 1e-9);
    assert.ok(g.vorne.z > 0.99);
});

test('KayKit ".l" (linke Seite der Figur) landet bei +x = Index 1', () => {
    const g = retarget(stehend());
    assert.ok(g.arme[1].hand.x > g.huefte.x);
    assert.ok(g.arme[0].hand.x < g.huefte.x);
    assert.ok(g.beine[1].fuss.x > 0 && g.beine[0].fuss.x < 0);
});

test('Knochen-Längen sind die der Puppe, egal wie groß die Figur ist', () => {
    for (const k of [0.01, 1, 3.5]) {
        const g = retarget(stehend(k));
        for (const a of g.arme) {
            nah(dist(a.schulter, a.ellbogen), MASS.oberarm);
            nah(dist(a.ellbogen, a.hand), MASS.unterarm);
        }
        for (const b of g.beine) {
            nah(dist(b.ansatz, b.knie), MASS.oberschenkel);
            nah(dist(b.knie, b.fuss), MASS.unterschenkel);
        }
        nah(dist(g.huefte, g.brust), MASS.rumpf);
    }
});

test('Figur hebt den Arm: Puppen-Hand geht hoch', () => {
    const k = stehend();
    k.lowerarm_l = { x: 0.25, y: 1.15, z: 0 }; k.wrist_l = { x: 0.27, y: 1.35, z: 0 };
    const g = retarget(k);
    assert.ok(g.arme[1].hand.y < g.kopf.y);
});

test('Gestreckte Beine: Knöchel am Boden, Hüfte auf Bein-Länge darüber', () => {
    const g = retarget(stehend());
    nah(g.beine[0].fuss.y, -MASS.knoechel);
    nah(g.huefte.y, -MASS.knoechel - MASS.oberschenkel - MASS.unterschenkel);
});

test('Sprung: Figur höher als beim Stehen -> Puppe hebt ab', () => {
    const k = stehend();
    for (const n in k) k[n] = { ...k[n], y: k[n].y + 0.1 };
    const g = retarget(k, 0.05);
    assert.ok(g.beine[0].fuss.y < -MASS.knoechel - 10);
    nah(retarget(k).beine[0].fuss.y, -MASS.knoechel);
});

test('Körper-Achsen: seite nach +x, oben nach -y (Puppe: y unten), vorne nach +z', () => {
    const g = retarget(stehend());
    assert.ok(g.seite.x > 0.99 && g.oben.y < -0.99 && g.vorne.z > 0.99);
});

test('Hängende Arme werden zum Körper gezogen (Hand unter dem Ellbogen)', () => {
    const k = stehend();
    k.lowerarm_l = { x: 0.4, y: 0.9, z: 0 }; k.wrist_l = { x: 0.6, y: 0.85, z: 0 };   // fast waagrecht
    const g = retarget(k);
    assert.ok(g.arme[1].hand.y > g.arme[1].ellbogen.y + 10);
});

test('Schräg gehobene Arme (Jubeln) bleiben über der Schulter', () => {
    const k = stehend();
    k.lowerarm_l = { x: 0.35, y: 1.1, z: 0 }; k.wrist_l = { x: 0.45, y: 1.3, z: 0 };   // 45° nach oben
    const a = retarget(k).arme[1];
    assert.ok(a.ellbogen.y < a.schulter.y - 20 && a.hand.y < a.ellbogen.y - 20);
});

test('Haar-Palette: hell > mittel > dunkel, null = Standard', () => {
    const p = haarPalette(0x6a4128);
    const hell = h => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    assert.equal(p.b, '#6a4128');
    assert.ok(hell(p.l) > hell(p.b) && hell(p.b) > hell(p.d));
    assert.ok(haarPalette(null).b.startsWith('#'));
});
