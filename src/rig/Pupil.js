// Gemalte Schüler-Puppe in 3D: Röhren-Glieder mit Muskel-Wölbung, Ellipsoid-Rumpf und -Kopf,
// gemaltes Gesicht, Haare/Bänder/Mantel mit Physik. Gelenke kommen aus retarget() (Pixel, y unten).
import * as THREE from 'three';
import { Kette, schrittKette, Tuch, schrittTuch } from './physik.js';
import { PAL, haarPalette, farbPalette } from './farben.js';
import { malMaterial, konturMaterial } from './material.js';
import { Roehre, Koerper, TuchFlaeche, Gesicht } from './teile.js';
import { MUENDER, folgeGesicht } from './gesicht.js';
import { klemme } from './geometrie.js';

// Varianten: welche Teile fehlen, wie lang Mantel und Seiten-Strähnen sind.
const VARIANTEN = {
    maedchen: { ohne: [], mantelReihen: 6, seitenGlieder: 5, jacke: PAL.mantel },
    junge: {
        ohne: ['zopf', 'straehneA', 'straehneB', 'bandA', 'bandB', 'haarSchleifeA', 'haarSchleifeB', 'haarKnoten', 'schleifeL', 'schleifeR', 'knoten'],
        mantelReihen: 3, seitenGlieder: 3, jacke: farbPalette(0x3f7a4f)
    }
};
const KONTUR = 0.008;     // Umriss in Metern
const KOPF = [27, 31, 25];

// kleine Vektor-Hilfen (Pixel-Raum, {x,y,z})
const plus = (...v) => v.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }));
const mal = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const minus = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const punkt = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const kreuz = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const einheit = a => { const l = Math.hypot(a.x, a.y, a.z) || 1; return mal(a, 1 / l); };
const zwischen = (a, b, t) => plus(a, mal(minus(b, a), t));
const mitW = (p, w) => ({ x: p.x, y: p.y, z: p.z, w });
const breiten = (punkte, ws) => punkte.map((q, i) => mitW(q, ws[i]));
const RUNTER = { x: 0, y: 1, z: 0 };

export default class Pupil {
    /** variante = 'maedchen' | 'junge', haarFarbe/jacke = Zahl wie 0x6a4128 (null = Standard). */
    constructor({ variante = 'maedchen', haarFarbe = null, jacke = null } = {}) {
        this.variante = variante;
        this.art = VARIANTEN[variante] ?? VARIANTEN.maedchen;
        const ohne = new Set(this.art.ohne);
        this.obj = new THREE.Group();
        const mat = {
            haut: malMaterial(PAL.haut), haar: malMaterial(haarPalette(haarFarbe)),
            jacke: malMaterial(jacke == null ? this.art.jacke : farbPalette(jacke)), hemd: malMaterial(PAL.hemd),
            hose: malMaterial(PAL.hose), gold: malMaterial(PAL.gold, { doppelt: true }), schuh: malMaterial(PAL.schuh),
            schleife: malMaterial(PAL.schleife, { doppelt: true }),
            stoff: malMaterial(jacke == null ? this.art.jacke : farbPalette(jacke), { doppelt: true })
        };
        this.mat = mat;
        const kontur = this.kontur = konturMaterial(KONTUR);
        const add = (id, teil) => { if (ohne.has(id)) return null; this.obj.add(teil.mesh); return teil; };
        const roehre = (id, n, m, o) => add(id, new Roehre(n, m, o?.ohneKontur ? null : kontur, o));
        const koerper = (id, rx, ry, rz, m) => add(id, new Koerper(rx, ry, rz, m, kontur));

        this.t = {
            beine: [roehre('beinL', 7, mat.hose), roehre('beinR', 7, mat.hose)],
            schuhe: [koerper('schuhL', 6.5, 5, 10, mat.schuh), koerper('schuhR', 6.5, 5, 10, mat.schuh)],
            bauch: koerper('bauch', 19, 20, 12, mat.jacke), brust: koerper('brust', 22, 24, 13, mat.jacke),
            hemd: koerper('hemd', 6, 16, 3, mat.hemd),
            schultern: [koerper('schulterL', 10, 9, 10, mat.jacke), koerper('schulterR', 10, 9, 10, mat.jacke)],
            arme: [roehre('armL', 7, mat.jacke), roehre('armR', 7, mat.jacke)],
            haende: [koerper('handL', 5, 8.5, 4, mat.haut), koerper('handR', 5, 8.5, 4, mat.haut)],
            hals: roehre('hals', 4, mat.haut),
            kopf: koerper('kopf', ...KOPF, mat.haut),
            haarKappe: koerper('haarKappe', KOPF[0] + 3, KOPF[1] + 2, KOPF[2] + 2, mat.haar),
            stirn: koerper('stirn', KOPF[0] + 1, 14, 16, mat.haar),
            zopf: roehre('zopf', 8, mat.haar, { flach: 0.8 }),
            straehneA: roehre('straehneA', 6, mat.haar), straehneB: roehre('straehneB', 6, mat.haar),
            seiteL: roehre('seiteL', this.art.seitenGlieder, mat.haar, { flach: 0.6 }),
            seiteR: roehre('seiteR', this.art.seitenGlieder, mat.haar, { flach: 0.6 }),
            pony: [0, 1, 2].map(i => roehre('pony' + i, 3, mat.haar, { flach: 0.6 })),
            bandA: roehre('bandA', 9, mat.gold, { flach: 0.15, ohneKontur: true }), bandB: roehre('bandB', 8, mat.gold, { flach: 0.15, ohneKontur: true }),
            haarSchleifeA: koerper('haarSchleifeA', 7, 4.5, 3, mat.gold), haarSchleifeB: koerper('haarSchleifeB', 7, 4.5, 3, mat.gold),
            haarKnoten: koerper('haarKnoten', 3.5, 3.5, 3.5, mat.gold),
            schleifeL: roehre('schleifeL', 6, mat.schleife, { flach: 0.2, ohneKontur: true }),
            schleifeR: roehre('schleifeR', 6, mat.schleife, { flach: 0.2, ohneKontur: true }),
            knoten: koerper('knoten', 5, 4, 3, mat.schleife)
        };
        const R = this.art.mantelReihen;
        this.tuch = { hinten: Tuch(R, 6, 15, 44, 0.1), vornL: Tuch(R, 3, 14, 16, 0.15), vornR: Tuch(R, 3, 14, 16, 0.15) };
        this.stoff = Object.fromEntries(Object.entries(this.tuch).map(([n, tu]) => [n, add('mantel_' + n, new TuchFlaeche(tu, mat.stoff))]));
        this.k = {
            zopf: Kette(8, 11), straehneA: Kette(6, 10), straehneB: Kette(6, 10),
            seiteL: Kette(this.art.seitenGlieder, 9), seiteR: Kette(this.art.seitenGlieder, 9),
            pony: [0, 1, 2].map(() => Kette(3, 7)), bandA: Kette(9, 9), bandB: Kette(8, 9),
            schleifeL: Kette(6, 9), schleifeR: Kette(6, 9)
        };
        this.gesicht = new Gesicht(...KOPF);
        this.t.kopf.mesh.add(this.gesicht.mesh);
        this.mimik = { ...MUENDER.laecheln, gx: 0, gy: 0, blinzeln: 0, offen: 1 };
    }

    setHaar(farbe) { this.mat.haar.farbe(haarPalette(farbe)); }

    /** Pose setzen. g = Gelenke aus retarget(); zeit in s; mund aus MUENDER; zug = Fahrtwind {x, z} (Pixel pro Bild). */
    setPose(g, { zeit = 0, mund = 'laecheln', zug = null } = {}) {
        const t = zeit, T = this.t, K = this.k;
        const hip = g.huefte, ch = g.brust, kopf = g.kopf, vorne = g.vorne, seite = g.seite, oben = g.oben, unten = mal(oben, -1);
        // Kopf-Rahmen: oben entlang des Halses
        const kOben = einheit(minus(kopf, ch)), kVorne = einheit(minus(vorne, mal(kOben, punkt(vorne, kOben)))), kSeite = kreuz(mal(kOben, -1), kVorne);
        const H = (x, y, z) => plus(kopf, mal(kSeite, x), mal(kOben, -y), mal(kVorne, z));     // y nach unten
        const HR = (x, y, z) => plus(mal(kSeite, x), mal(kOben, -y), mal(kVorne, z));
        const BR = (x, y, z) => plus(mal(seite, x), mal(unten, y), mal(vorne, z));
        const boe = 0.05 + 0.06 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 3.1 + 1);

        // Körper-Kollision: Kopf als Kugel, Rumpf als Ellipsen-Säule um die Hüfte
        const kopfStoss = q => {
            const d = minus(q, kopf), l = Math.hypot(d.x, d.y, d.z), R = 29;
            if (l < R && l > 1e-3) Object.assign(q, plus(kopf, mal(d, R / l)));
        };
        const saeule = (Rx, Rz, ab) => q => {
            if (punkt(minus(q, ch), unten) < ab) return;
            const d = minus(q, hip), xb = punkt(d, seite), zb = punkt(d, vorne), e = (xb / Rx) ** 2 + (zb / Rz) ** 2;
            if (e < 1 && e > 1e-4) {
                const f = 1 / Math.sqrt(e);
                Object.assign(q, plus(q, mal(seite, xb * (f - 1)), mal(vorne, zb * (f - 1))));
            }
        };
        const rumpfStoss = saeule(23, 15, 4), mantelStoss = saeule(24, 15, 40);
        const haarStoss = q => { kopfStoss(q); rumpfStoss(q); };
        const kette = (k, A, r, wind, schwere, steif, daempf, biege, stoss) =>
            schrittKette(k, A, r, { wind, schwere, steif, daempf, biege, stoss, zeit: t, zug });

        // Rumpf, Kopf, Glieder
        T.bauch.setze(plus(hip, mal(oben, 16)), oben, vorne);
        T.brust.setze(plus(hip, mal(oben, 42)), oben, vorne);
        T.hemd.setze(plus(hip, mal(oben, 46), mal(vorne, 11)), oben, vorne);
        T.hals.setze([mitW(plus(ch, mal(unten, 6)), 13), mitW(ch, 12), mitW(zwischen(ch, kopf, 0.5), 11), mitW(H(0, 14, 0), 12)], vorne);
        T.kopf.setze(kopf, kOben, kVorne);
        T.haarKappe.setze(H(0, -2, -5), kOben, kVorne);
        T.stirn.setze(H(0, -17, 10), kOben, kVorne);

        g.arme.forEach((a, i) => {
            const u1 = einheit(minus(a.ellbogen, a.schulter)), u2 = einheit(minus(a.hand, a.ellbogen));
            const fx = klemme(Math.acos(klemme(punkt(u1, u2), -1, 1)) / 2.2, 0, 1);
            T.schultern[i].setze(a.schulter, oben, vorne);
            T.arme[i].setze([mitW(a.schulter, 15), mitW(zwischen(a.schulter, a.ellbogen, 0.38), 15.6 + 3.2 * fx), mitW(zwischen(a.schulter, a.ellbogen, 0.74), 13.2 + 1.6 * fx),
                mitW(a.ellbogen, 12), mitW(zwischen(a.ellbogen, a.hand, 0.3), 12.8 + 2.6 * fx), mitW(zwischen(a.ellbogen, a.hand, 0.68), 10.6), mitW(a.hand, 8.5)], vorne);
            T.haende[i].setze(plus(a.hand, mal(u2, 6)), mal(u2, -1), vorne);
        });
        g.beine.forEach((b, i) => {
            const d1 = einheit(minus(b.knie, b.ansatz)), d2 = einheit(minus(b.fuss, b.knie));
            const fx = klemme(Math.acos(klemme(punkt(d1, d2), -1, 1)) / 1.6, 0, 1);
            T.beine[i].setze([mitW(b.ansatz, 17), mitW(zwischen(b.ansatz, b.knie, 0.4), 18.2 + 2.6 * fx), mitW(zwischen(b.ansatz, b.knie, 0.78), 14.4 + 1.2 * fx),
                mitW(b.knie, 12.6), mitW(zwischen(b.knie, b.fuss, 0.3), 14.4 + 3.2 * fx), mitW(zwischen(b.knie, b.fuss, 0.7), 11), mitW(b.fuss, 9.6)], vorne);
            const zeh = einheit(minus(b.zehen, b.fuss));
            T.schuhe[i].setze(plus(zwischen(b.fuss, b.zehen, 0.45), mal(RUNTER, 2)), { x: 0, y: -1, z: 0 }, zeh);
        });

        // Haare
        const knoten = H(-18, -12, -8);
        if (T.zopf) T.zopf.setze(breiten(kette(K.zopf, knoten, HR(-0.95, 0.5, -0.25), boe * 0.8, 0.13, 0.045, 0.94, undefined, haarStoss), [14, 15, 14, 12, 10, 8, 5, 2]), kVorne);
        if (T.straehneA) T.straehneA.setze(breiten(kette(K.straehneA, H(-14, -9, -8), HR(-0.5, 0.85, -0.25), boe * 0.8, 0.13, 0.05, 0.92, undefined, haarStoss), [9, 10, 8, 6, 4, 2]), kVorne);
        if (T.straehneB) T.straehneB.setze(breiten(kette(K.straehneB, H(-21, -6, -8), HR(-0.8, 0.6, -0.3), boe * 0.9, 0.12, 0.04, 0.95, undefined, haarStoss), [9, 10, 8, 6, 4, 2]), kVorne);
        const sw = [8, 8, 7, 5, 2].slice(-this.art.seitenGlieder);
        T.seiteL.setze(breiten(kette(K.seiteL, H(-(KOPF[0] - 3), -2, 4), HR(-0.05, 1, 0.1), boe * 0.6, 0.12, 0.07, 0.9, undefined, haarStoss), sw), kSeite);
        T.seiteR.setze(breiten(kette(K.seiteR, H(KOPF[0] - 3, -2, 4), HR(0.05, 1, 0.1), boe * 0.6, 0.12, 0.07, 0.9, undefined, haarStoss), sw), kSeite);
        [-10, 0, 10].forEach((o, i) => T.pony[i].setze(breiten(kette(K.pony[i], H(o, -16, 19), HR(0, 1, 0.35), boe * 0.3, 0.1, 0.1, 0.9, undefined, haarStoss), [8, 7, 2]), kVorne));
        const flatter = (punkte, k, basis) => punkte.map((q, i) => mitW(q, Math.max(1.5, basis * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.85 - t * 2.6 + k))) * (1 - i / punkte.length * 0.75))));
        const bandAn = plus(knoten, mal(unten, 2));
        if (T.bandA) T.bandA.setze(flatter(kette(K.bandA, bandAn, HR(-1, 0.25, -0.3), boe * 2.4, 0.04, 0.02, 0.965, 0.25, haarStoss), 0, 11), kVorne);
        if (T.bandB) T.bandB.setze(flatter(kette(K.bandB, bandAn, HR(-0.9, 0.5, -0.45), boe * 2.4, 0.05, 0.02, 0.965, 0.25, haarStoss), 2, 10), kVorne);
        T.haarSchleifeA?.setze(plus(knoten, HR(-5, -2, 0)), kOben, kSeite);
        T.haarSchleifeB?.setze(plus(knoten, HR(5, 2, 0)), kOben, kSeite);
        T.haarKnoten?.setze(knoten, kOben, kSeite);

        // Schleife am Kragen
        const kragen = plus(ch, BR(0, 8, 9));
        T.knoten?.setze(kragen, oben, vorne);
        if (T.schleifeL) T.schleifeL.setze(breiten(kette(K.schleifeL, plus(ch, BR(-3, 9, 9)), BR(-0.25, 1, 0.3), boe * 1.4, 0.1, 0.04, 0.95, undefined, rumpfStoss), [7, 8, 8, 7, 6, 3]), vorne);
        if (T.schleifeR) T.schleifeR.setze(breiten(kette(K.schleifeR, plus(ch, BR(3, 9, 9)), BR(0.25, 1, 0.3), boe * 1.4, 0.1, 0.04, 0.95, undefined, rumpfStoss), [7, 8, 8, 7, 6, 3]), vorne);

        // Mantel-Stoff ab der Taille
        const anker = (x, z) => plus(hip, mal(oben, 8), mal(seite, x), mal(vorne, z));
        const tuchO = (wind, schwere, steif) => ({ wind, schwere, steif, daempf: 0.9, stoss: mantelStoss, zeit: t, zug });
        const ab = k => plus(RUNTER, mal(seite, k));
        schrittTuch(this.tuch.hinten, anker(0, -14), RUNTER, seite, vorne, -0.8, tuchO(boe * 1.6, 0.22, 0.05));
        schrittTuch(this.tuch.vornL, anker(-15, 12), ab(-0.06), seite, vorne, 0.5, tuchO(boe * 1.3, 0.2, 0.07));
        schrittTuch(this.tuch.vornR, anker(15, 12), ab(0.06), seite, vorne, 0.5, tuchO(boe * 1.3, 0.2, 0.07));
        for (const s of Object.values(this.stoff)) s?.setze();

        // Gesicht (Koordinaten relativ zur Kopf-Mitte, von vorne gesehen)
        folgeGesicht(this.mimik, MUENDER[mund] ?? MUENDER.laecheln, 0, 0, t);
        const f = this.mimik;
        const auge = (x, seite) => ({ x, y: 5, s: 1, alpha: 1, seite, open: f.offen, smile: f.es, lookx: f.gx, looky: f.gy });
        this.gesicht.male({
            augen: [auge(-10, -1), auge(10, 1)],
            nase: { x: 0, y: 15, sign: 1, prot: 0, ay: 0, alpha: 1, rand: 0 },
            mund: { x: 0, y: 24, w: f.w, ws: 1, open: f.open, curve: f.curve, round: f.round, alpha: 1 }
        });
    }

    /** GPU-Speicher freigeben (beim Wechsel der Variante). */
    entsorge() {
        this.obj.removeFromParent();
        this.obj.traverse(o => o.geometry?.dispose());
        for (const m of Object.values(this.mat)) m.dispose();
        this.kontur.dispose();
        this.gesicht.mesh.material.dispose();
        this.gesicht.textur.dispose();
    }
}
