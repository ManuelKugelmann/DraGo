// Gemalte Schüler-Puppe (2.5D): 3D-Gelenke rein, flache Teile nach Tiefe sortiert, Canvas 2D raus.
// Körper-Raum: x seitlich, y nach unten, z nach vorne; Blickwinkel w dreht die Figur zur Kamera.
import { projiziere } from './retarget.js';
import { streifen, ellipse, vieleck, glaette, hand, klemme, glatt } from './geometrie.js';
import { Kette, schrittKette, Tuch, schrittTuch, mittelZ, mittelZTuch } from './physik.js';
import { PAL, haarPalette, farbPalette } from './farben.js';
import { licht, malTeil, kontaktSchatten, umrissLinie } from './malen.js';
import { MUENDER, zeichneGesicht, folgeGesicht } from './gesicht.js';

export const BREITE = 300, HOEHE = 380, BODEN = 342;   // Bild-Pixel der Puppe
const MITTE = 150;
const UMRISS = 1.6;

const einheit2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; };
const einheit3 = (a, b) => { const x = a.x - b.x, y = a.y - b.y, z = a.z - b.z, l = Math.hypot(x, y, z) || 1; return { x: x / l, y: y / l, z: z / l }; };
const zwischen = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
const breiten = (punkte, ws) => punkte.map((q, i) => ({ x: q.x, y: q.y, z: q.z, w: ws[i] }));

/** Stoff-Gitter als Fläche mit Falten-Bahnen. */
function tuchTeil(id, C, pal) {
    const { R, K, pts: P } = C, poly = [];
    for (let r = 0; r < R; r++) poly.push({ x: P[r][0].x, y: P[r][0].y });
    glaette(P[R - 1].map(q => ({ x: q.x, y: q.y, w: 1 }))).forEach(q => poly.push({ x: q.x, y: q.y }));
    for (let r = R - 2; r >= 0; r--) poly.push({ x: P[r][K - 1].x, y: P[r][K - 1].y });
    const spalten = [];
    for (let c = 0; c < K; c++) spalten.push(P.map(reihe => ({ x: reihe[c].x, y: reihe[c].y })));
    return { id, form: 'vieleck', poly, pal, spalten };
}

// Varianten: welche Teile fehlen, wie lang Mantel und Seiten-Strähnen sind.
const VARIANTEN = {
    maedchen: { ohne: [], mantelReihen: 6, seitenGlieder: 5, jacke: PAL.mantel },
    junge: {
        ohne: ['zopf', 'straehneA', 'straehneB', 'bandA', 'bandB', 'haarSchleifeA', 'haarSchleifeB', 'haarKnoten', 'schleifeL', 'schleifeR', 'knoten'],
        mantelReihen: 3, seitenGlieder: 3, jacke: farbPalette(0x3f7a4f)
    }
};

export default class Pupil {
    /** variante = 'maedchen' | 'junge', haarFarbe/jacke = Zahl wie 0x6a4128 (null = Standard). */
    constructor({ variante = 'maedchen', haarFarbe = null, jacke = null, aufloesung = 1.5 } = {}) {
        this.aufloesung = aufloesung;
        this.variante = variante;
        this.art = VARIANTEN[variante] ?? VARIANTEN.maedchen;
        this.ohne = new Set(this.art.ohne);
        this.palJacke = jacke == null ? this.art.jacke : farbPalette(jacke);
        this.setHaar(haarFarbe);
        this.licht = licht(300);
        this.k = {
            zopf: Kette(8, 11), straehneA: Kette(6, 10), straehneB: Kette(6, 10), seiteL: Kette(this.art.seitenGlieder, 9), seiteR: Kette(this.art.seitenGlieder, 9),
            pony0: Kette(3, 7), pony1: Kette(3, 7), pony2: Kette(3, 7), bandA: Kette(9, 9), bandB: Kette(8, 9),
            schleifeL: Kette(6, 9), schleifeR: Kette(6, 9)
        };
        const R = this.art.mantelReihen;
        this.tuch = { hinten: Tuch(R, 6, 15, 44, 0.1), vornL: Tuch(R, 3, 14, 16, 0.15), vornR: Tuch(R, 3, 14, 16, 0.15) };
        this.gesicht = { ...MUENDER.laecheln, gx: 0, gy: 0, blinzeln: 0, offen: 1 };
        this.reihenfolge = null;   // Tiefen-Reihenfolge vom letzten Bild (gegen Flackern)
        this.teile = [];
    }

    setHaar(farbe) { this.palHaar = haarPalette(farbe); }

    /**
     * Pose setzen. g = Gelenke aus retarget(), w = Blickwinkel (0 = von vorne, PI = von hinten).
     * o.zeit in Sekunden, o.mund = Name aus MUENDER, o.blickX/Y = Blick der Augen (-1..1).
     */
    setPose(g, w, { zeit = 0, mund = 'laecheln', blickX = 0, blickY = 0 } = {}) {
        const t = this.zeit = zeit, c = Math.cos(w), s = Math.sin(w);
        const P = v => { const q = projiziere(v, w); return { x: MITTE + q.x, y: BODEN + q.y, z: q.z }; };
        // "gieren" wie im Vorbild: -1..1 vom Profil links bis Profil rechts, gespiegelt für die Rückseite
        const gieren = klemme(Math.atan2(s, Math.abs(c)) / 1.38, -1, 1), ay = Math.abs(gieren);
        const BV = (xb, y, zb) => ({ x: xb * c + zb * s, y, z: -xb * s + zb * c });
        const hip = P(g.huefte), ch = P(g.brust), head = P(g.kopf);
        const kx = Math.sqrt(c * c + 0.2 * s * s), rx = 27 * (1 - 0.12 * ay);
        const boe = 0.05 + 0.06 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 3.1 + 1);
        const H = this.palHaar, J = this.palJacke, K = this.k;

        // Körper-Kollision: Kopf als Kugel, Rumpf/Beine als Ellipsen-Säule
        const kopfStoss = q => {
            const dx = q.x - head.x, dy = q.y - head.y, dz = q.z - head.z, d = Math.hypot(dx, dy, dz), R = 23;
            if (d < R && d > 1e-3) { const f = R / d; q.x = head.x + dx * f; q.y = head.y + dy * f; q.z = head.z + dz * f; }
        };
        const saeule = (Rx, Rz, y0) => q => {
            if (q.y < y0) return;
            const X = q.x - hip.x, Z = q.z - hip.z, xb = X * c - Z * s, zb = X * s + Z * c, e = (xb / Rx) ** 2 + (zb / Rz) ** 2;
            if (e < 1 && e > 1e-4) {
                const f = 1 / Math.sqrt(e), xn = xb * f, zn = zb * f;
                q.x = hip.x + xn * c + zn * s; q.z = hip.z - xn * s + zn * c;
            }
        };
        const rumpfStoss = saeule(21, 11, ch.y + 4), mantelStoss = saeule(22, 11, hip.y - 14);
        const haarStoss = q => { kopfStoss(q); rumpfStoss(q); };
        const kette = (k, A, r, wind, schwere, steif, daempf, biege, stoss) =>
            schrittKette(k, A, r, { wind, schwere, steif, daempf, biege, stoss, zeit: t });

        // Haare
        const HR = BV(-18, 0, -8), hax = head.x + HR.x, haz = head.z + HR.z, hay = head.y - 12;
        const zopf = breiten(kette(K.zopf, { x: hax, y: hay, z: haz }, BV(-0.95, 0.5, -0.25), boe * 0.8, 0.13, 0.045, 0.94, undefined, haarStoss), [14, 15, 14, 12, 10, 8, 5, 2]);
        const strA = breiten(kette(K.straehneA, { x: hax + 4 * c, y: hay + 3, z: haz - 4 * s }, BV(-0.5, 0.85, -0.25), boe * 0.8, 0.13, 0.05, 0.92, undefined, haarStoss), [9, 10, 8, 6, 4, 2]);
        const strB = breiten(kette(K.straehneB, { x: hax - 3 * c, y: hay + 6, z: haz + 3 * s }, BV(-0.8, 0.6, -0.3), boe * 0.9, 0.12, 0.04, 0.95, undefined, haarStoss), [9, 10, 8, 6, 4, 2]);
        const SL = BV(-(rx - 4), 0, 4), SR = BV(rx - 4, 0, 4);
        const seiteL = breiten(kette(K.seiteL, { x: head.x + SL.x, y: head.y - 2, z: head.z + SL.z }, BV(-0.05, 1, 0.1), boe * 0.6, 0.12, 0.07, 0.9, undefined, haarStoss), [8, 8, 7, 5, 2].slice(-this.art.seitenGlieder));
        const seiteR = breiten(kette(K.seiteR, { x: head.x + SR.x, y: head.y - 2, z: head.z + SR.z }, BV(0.05, 1, 0.1), boe * 0.6, 0.12, 0.07, 0.9, undefined, haarStoss), [8, 8, 7, 5, 2].slice(-this.art.seitenGlieder));
        const ponys = [-10, 0, 10].map((o, i) => {
            const B0 = BV(o, 0, 19);
            return breiten(kette(K['pony' + i], { x: head.x + B0.x, y: head.y - 14, z: head.z + B0.z }, BV(0, 1, 0.25), boe * 0.3, 0.1, 0.1, 0.9, undefined, haarStoss), [7, 6, 2]);
        });
        // Haarbänder: wechselnde Breite = flaches, gedrehtes Band
        const drehe = (arr, k, basis) => arr.map((q, i) => {
            const a = arr[Math.max(0, i - 1)], b = arr[Math.min(arr.length - 1, i + 1)];
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, fl = Math.sin(t * 6 - i * 0.9 + k) * 3.2 * (i / arr.length);
            return { x: q.x - dy / d * fl, y: q.y + dx / d * fl, z: q.z, w: Math.max(1.5, basis * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.85 - t * 2.6 + k))) * (1 - i / arr.length * 0.75)) };
        });
        const bandA = drehe(kette(K.bandA, { x: hax, y: hay + 2, z: haz }, BV(-1, 0.25, -0.3), boe * 2.4, 0.04, 0.02, 0.965, 0.25, haarStoss), 0, 11);
        const bandB = drehe(kette(K.bandB, { x: hax, y: hay + 2, z: haz }, BV(-0.9, 0.5, -0.45), boe * 2.4, 0.05, 0.02, 0.965, 0.25, haarStoss), 2, 10);
        // Schleife am Kragen
        const BK = BV(0, 0, 8), bx = ch.x + BK.x, schleifeFern = 1 - glatt(0.45, 0.85, ay);
        const BL3 = BV(-3, 0, 8), BR3 = BV(3, 0, 8);
        const schL = breiten(kette(K.schleifeL, { x: ch.x + BL3.x, y: ch.y + 9, z: ch.z + BL3.z }, BV(-0.25, 1, 0.2), boe * 1.4, 0.1, 0.04, 0.95, undefined, rumpfStoss), [7, 8, 8, 7, 6, 3]);
        const schR = breiten(kette(K.schleifeR, { x: ch.x + BR3.x, y: ch.y + 9, z: ch.z + BR3.z }, BV(0.25, 1, 0.2), boe * 1.4, 0.1, 0.04, 0.95, undefined, rumpfStoss), [7, 8, 8, 7, 6, 3]);
        // Mantel-Stoff
        const wy = hip.y - 8, quer = { x: c, y: 0, z: -s }, vor = { x: s, y: 0, z: c }, RUNTER = { x: 0, y: 1, z: 0 };
        const anker = (xb, zb) => { const v = BV(xb, 0, zb); return { x: hip.x + v.x, y: wy, z: hip.z + v.z }; };
        const ab = k => ({ x: quer.x * k, y: 1, z: quer.z * k });
        const tuchO = (wind, schwere, steif) => ({ wind, schwere, steif, daempf: 0.9, stoss: mantelStoss, zeit: t });
        const mH = schrittTuch(this.tuch.hinten, anker(0, -14), RUNTER, quer, vor, -0.8, tuchO(boe * 1.6, 0.22, 0.05));
        const mL = schrittTuch(this.tuch.vornL, anker(-15, 12), ab(-0.06), quer, vor, 0.5, tuchO(boe * 1.3, 0.2, 0.07));
        const mR = schrittTuch(this.tuch.vornR, anker(15, 12), ab(0.06), quer, vor, 0.5, tuchO(boe * 1.3, 0.2, 0.07));

        // Rumpf: Rahmen entlang der Wirbelsäule im Bild
        const hoch = einheit2(ch, hip), rechts = { x: -hoch.y, y: hoch.x }, lang = Math.hypot(ch.x - hip.x, ch.y - hip.y) / 62;
        const P2 = (a, b) => ({ x: hip.x + rechts.x * a * kx + hoch.x * b * lang, y: hip.y + rechts.y * a * kx + hoch.y * b * lang, w: 1 });
        const rumpfL = glaette([P2(-20, 0), P2(-16, 18), P2(-14, 32), P2(-18, 46), P2(-23, 55), P2(-17, 62), P2(-6, 65)]);
        const rumpfR = glaette([P2(6, 65), P2(17, 62), P2(23, 55), P2(18, 46), P2(14, 32), P2(16, 18), P2(20, 0)]);

        // Arme und Beine aus den Gelenken
        const arme = g.arme.map(a => ({ s: P(a.schulter), e: P(a.ellbogen), h: P(a.hand) }));
        const beine = g.beine.map(b => ({ H: P(b.ansatz), K: P(b.knie), F: P(b.fuss), Z: P(b.zehen), roh: b }));
        const armVon = (id, a) => {
            const u1 = einheit2(a.e, a.s), u2 = einheit2(a.h, a.e), fx = klemme(Math.acos(klemme(u1.x * u2.x + u1.y * u2.y, -1, 1)) / 2.2, 0, 1);
            return streifen(id, [{ ...a.s, w: 15 }, { ...zwischen(a.s, a.e, 0.38), w: 15.6 + 3.2 * fx }, { ...zwischen(a.s, a.e, 0.74), w: 13.2 + 1.6 * fx },
                { x: a.e.x, y: a.e.y, w: 12 }, { ...zwischen(a.e, a.h, 0.3), w: 12.8 + 2.6 * fx }, { ...zwischen(a.e, a.h, 0.68), w: 10.6 }, { x: a.h.x, y: a.h.y, w: 8.5 }], J);
        };
        const beinVon = (id, b) => {
            const d1 = einheit3(b.K, b.H), d2 = einheit3(b.F, b.K), fx = klemme(Math.acos(klemme(d1.x * d2.x + d1.y * d2.y + d1.z * d2.z, -1, 1)) / 1.6, 0, 1);
            return streifen(id, [{ ...b.H, w: 17 }, { ...zwischen(b.H, b.K, 0.4), w: 18.2 + 2.6 * fx }, { ...zwischen(b.H, b.K, 0.78), w: 14.4 + 1.2 * fx },
                { x: b.K.x, y: b.K.y, w: 12.6 }, { ...zwischen(b.K, b.F, 0.3), w: 14.4 + 3.2 * fx }, { ...zwischen(b.K, b.F, 0.7), w: 11 }, { x: b.F.x, y: b.F.y, w: 9.6 }], PAL.hose);
        };
        const schuh = (id, b) => {
            const r = b.roh, d = einheit3(r.zehen, r.fuss);
            const ferse = P({ x: r.fuss.x - d.x * 3, y: r.fuss.y + 3, z: r.fuss.z - d.z * 3 });
            const spitze = P({ x: r.zehen.x, y: r.zehen.y + 3, z: r.zehen.z });
            return streifen(id, [{ ...ferse, w: 12 }, { ...spitze, w: 10 }], PAL.schuh);
        };
        const seiteBild = c >= 0 ? 1 : -1;   // von hinten liegt der Daumen auf der anderen Seite
        const handVon = (id, a, seite, saat) => hand(id, a.h, einheit2(a.h, a.e), 0.3, 0.6, seite * seiteBild, t, saat, PAL.haut);

        const sL = arme[0].s, sR = arme[1].s;
        const teile = [
            tuchTeil('mantelHinten', mH, J),
            streifen('bandA', bandA, PAL.gold), streifen('bandB', bandB, PAL.gold),
            streifen('straehneB', strB, H), streifen('straehneA', strA, H), streifen('zopf', zopf, H),
            ellipse('haarHinten', head.x + BV(-5, 0, 0).x, head.y - 1, rx + 6, 31, 0, H),
            beinVon('beinL', beine[0]), beinVon('beinR', beine[1]),
            schuh('schuhL', beine[0]), schuh('schuhR', beine[1]),
            Object.assign(streifen('hals', [{ x: ch.x, y: ch.y + 8, w: 15 }, { x: ch.x, y: ch.y, w: 12 }, { x: ch.x + (head.x - ch.x) * 0.5, y: ch.y - 9, w: 11 }, { x: head.x, y: head.y + 12, w: 12 }], PAL.haut), { gelenk: { s: 8, c: PAL.hemd.b } }),
            Object.assign(vieleck('rumpf', [...rumpfL, ...rumpfR].map(q => ({ x: q.x, y: q.y })), J), { zylinder: true }),
            streifen('hemd', [{ x: hip.x, y: hip.y - 4, w: 14 }, { x: ch.x, y: ch.y + 3, w: 12 }], PAL.hemd),
            streifen('kragenL', [{ x: sL.x + 9 * kx * seiteBild, y: sL.y + 4, w: 11 }, { x: hip.x - 8 * c, y: hip.y - 6, w: 10 }], J),
            streifen('kragenR', [{ x: sR.x - 9 * kx * seiteBild, y: sR.y + 4, w: 11 }, { x: hip.x + 8 * c, y: hip.y - 6, w: 10 }], J),
            tuchTeil('mantelVornL', mL, J), tuchTeil('mantelVornR', mR, J),
            Object.assign(streifen('schleifeL', schL, PAL.schleife), { alpha: gieren < 0 ? schleifeFern : 1 }),
            Object.assign(streifen('schleifeR', schR, PAL.schleife), { alpha: gieren > 0 ? schleifeFern : 1 }),
            ellipse('knoten', bx, ch.y + 8, 5, 4, 0, PAL.schleife),
            ellipse('schulterL', sL.x, sL.y, 10, 9, 0, J), ellipse('schulterR', sR.x, sR.y, 10, 9, 0, J),
            armVon('armL', arme[0]), armVon('armR', arme[1]),
            handVon('handL', arme[0], -1, 0), handVon('handR', arme[1], 1, 2),
            ellipse('kopf', head.x, head.y, rx, 31, 0, PAL.haut)
        ];
        const fernAus = 1 - glatt(0.6, 0.9, ay);
        const sichtL = gieren < 0 ? fernAus : 1, sichtR = gieren > 0 ? fernAus : 1;
        if (sichtL > 0.01) teile.push(Object.assign(streifen('seiteL', seiteL, H), { alpha: sichtL }));
        if (sichtR > 0.01) teile.push(Object.assign(streifen('seiteR', seiteR, H), { alpha: sichtR }));
        ponys.forEach((b, i) => teile.push(streifen('pony' + i, b, H)));
        teile.push(
            ellipse('stirn', head.x + gieren * 4, head.y - 17, rx + 2, 15, gieren * 0.1, H),
            ellipse('haarSchleifeA', hax - 5, hay - 2, 7, 4.5, -0.5, PAL.gold), ellipse('haarSchleifeB', hax + 5, hay + 2, 7, 4.5, 0.5, PAL.gold),
            ellipse('haarKnoten', hax, hay, 3.5, 3.5, 0, PAL.gold));

        // Tiefe: Rumpf-Teile um die Körpermitte, Kopf-Teile um den Kopf, Glieder aus ihren Gelenken
        const mz = (hip.z + ch.z) / 2, kz = head.z - 4 * c;
        const D = (x, z) => mz - x * s + z * c, DK = (x, z) => kz - x * s + z * c;
        const zGlied = a => (a.s.z + a.h.z) / 2;
        const Z = {
            mantelHinten: mittelZTuch(mH), bandA: mittelZ(bandA), bandB: mittelZ(bandB), straehneA: mittelZ(strA), straehneB: mittelZ(strB), zopf: mittelZ(zopf),
            haarHinten: DK(0, -12), beinL: (beine[0].H.z + beine[0].K.z + beine[0].F.z) / 3, beinR: (beine[1].H.z + beine[1].K.z + beine[1].F.z) / 3,
            schuhL: (beine[0].F.z + beine[0].Z.z) / 2, schuhR: (beine[1].F.z + beine[1].Z.z) / 2,
            hals: mz - 2, rumpf: D(0, 0), hemd: D(0, 2), kragenL: D(-9, 4), kragenR: D(9, 4),
            mantelVornL: mittelZTuch(mL), mantelVornR: mittelZTuch(mR), schleifeL: D(-3, 7), schleifeR: D(3, 7), knoten: D(0, 8),
            schulterL: sL.z + 0.01, schulterR: sR.z + 0.01, armL: zGlied(arme[0]), armR: zGlied(arme[1]),
            handL: arme[0].h.z + 0.02, handR: arme[1].h.z + 0.02,
            kopf: DK(0, 9), stirn: DK(0, 11), seiteL: mittelZ(seiteL), seiteR: mittelZ(seiteR),
            haarSchleifeA: DK(-18, 2), haarSchleifeB: DK(-18, 2), haarKnoten: DK(-18, 2.5)
        };
        for (let i = teile.length - 1; i >= 0; i--) if (this.ohne.has(teile[i].id)) teile.splice(i, 1);
        for (const p of teile) p.z = Z[p.id] ?? (p.id.startsWith('pony') ? mittelZ(ponys[+p.id.slice(4)]) : 0);

        // Gesicht nur, wenn man es sieht (von vorne)
        const gesichtSicht = glatt(0.02, 0.2, c);
        if (gesichtSicht > 0) teile.push({ id: 'gesicht', form: 'gesicht', z: DK(0, 10) });
        this.teile = this.sortiere(teile);

        folgeGesicht(this.gesicht, MUENDER[mund] ?? MUENDER.laecheln, blickX, blickY, t);
        const f = this.gesicht, cy = head.y + 5, abst = 10 * (1 - 0.55 * ay), versatz = gieren * 16, sg = gieren >= 0 ? 1 : -1;
        const augeVon = (x, gr, al, seite) => ({ x, y: cy, s: gr, alpha: al * gesichtSicht, seite, open: f.offen, smile: f.es, lookx: f.gx, looky: f.gy });
        this.gesichtsDaten = {
            augen: [augeVon(head.x + versatz - abst, gieren < 0 ? 0.85 : 1, sichtL, -1), augeVon(head.x + versatz + abst, gieren > 0 ? 0.85 : 1, sichtR, 1)].filter(e => e.alpha > 0.01),
            nase: {
                x: head.x + gieren * 22, y: cy + 10, sign: sg, prot: glatt(0.35, 0.95, ay), ay, alpha: gesichtSicht,
                rand: head.x + sg * rx * Math.sqrt(Math.max(0.05, 1 - ((cy + 10 - head.y) / 31) ** 2)) * 0.985
            },
            mund: { x: head.x + gieren * 17, y: cy + 19, w: f.w, ws: 1 - 0.55 * ay, open: f.open, curve: f.curve, round: f.round, alpha: gesichtSicht }
        };
    }

    /** Nach Tiefe sortieren; fast gleich tiefe Teile behalten die alte Reihenfolge (kein Flackern). */
    sortiere(teile) {
        const alt = this.reihenfolge;
        const sortiert = teile.map((p, i) => ({ p, i })).sort((a, b) => {
            const dz = a.p.z - b.p.z;
            if (alt && Math.abs(dz) < 1.5 && alt.has(a.p.id) && alt.has(b.p.id)) return alt.get(a.p.id) - alt.get(b.p.id);
            return dz || a.i - b.i;
        }).map(d => d.p);
        this.reihenfolge = new Map(sortiert.map((p, i) => [p.id, i]));
        return sortiert;
    }

    /** In eine Leinwand malen (durchsichtiger Hintergrund). */
    zeichne(leinwand) {
        const a = this.aufloesung;
        if (leinwand.width !== BREITE * a) { leinwand.width = BREITE * a; leinwand.height = HOEHE * a; }
        const c = leinwand.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, leinwand.width, leinwand.height);
        c.setTransform(a, 0, 0, a, 0, 0);
        const L = this.licht, t = this.zeit ?? 0;
        umrissLinie(c, this.teile.filter(p => p.form !== 'gesicht'), UMRISS);
        for (const p of this.teile) {
            if (p.form === 'gesicht') { zeichneGesicht(c, this.gesichtsDaten, PAL.haut); continue; }
            kontaktSchatten(c, p, L);
            malTeil(c, p, L, t);
        }
    }
}
