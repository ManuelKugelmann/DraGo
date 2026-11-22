// Platzhalter-Spielfigur im Anime-Stil (Chibi: großer Kopf, große Augen).
// Haare liegen in eigenen Ebenen, damit die Haarfarbe sich umfärben lässt.
import Phaser from 'phaser';

const UMRISS = 0x24122f;
const pkt = arr => arr.map(([x, y]) => ({ x, y }));
const umriss = (g, p) => g.fillPoints(p, true).strokePoints(p, true);

// Haare hinter dem Kopf (Formen pro Frisur).
const HINTEN = {
    stachelig: g => g.fillCircle(0, -168, 60),
    lang: g => g.fillRoundedRect(-62, -200, 124, 170, 40),
    zopf: g => g.fillCircle(0, -168, 58).fillEllipse(62, -150, 40, 90),
    kurz: g => g.fillRoundedRect(-60, -210, 120, 110, 44)
};

// Pony und Spitzen vor dem Kopf.
const VORNE = {
    stachelig: g => {
        umriss(g, pkt([[-58, -170], [-70, -236], [-34, -206], [-20, -262], [4, -212], [30, -258], [36, -204], [72, -226], [58, -166], [30, -186], [0, -176], [-30, -186]]));
    },
    lang: g => {
        umriss(g, pkt([[-56, -150], [-50, -214], [0, -230], [50, -214], [56, -150], [36, -190], [10, -176], [-14, -196], [-36, -176]]));
    },
    zopf: g => {
        umriss(g, pkt([[-56, -160], [-44, -218], [0, -232], [44, -218], [56, -160], [30, -196], [-4, -180], [-26, -200]]));
    },
    kurz: g => {
        umriss(g, pkt([[-58, -150], [-54, -214], [0, -234], [54, -214], [58, -150], [40, -184], [-40, -184]]));
    }
};

export default class Figur extends Phaser.GameObjects.Container {
    /** Figur steht mit den Füßen auf (x, y), ca. 260 px hoch bei scale 1. */
    constructor(scene, x, y, a, haarfarbe) {
        super(scene, x, y);
        scene.add.existing(this);
        this.a = a;
        this.haarHinten = scene.add.graphics();
        const koerper = scene.add.graphics();
        this.haarVorne = scene.add.graphics();
        this.add([this.haarHinten, koerper, this.haarVorne]);

        const g = koerper;
        g.lineStyle(5, UMRISS);
        g.fillStyle(0x3a2a4a).fillRoundedRect(-24, -46, 20, 46, 9).fillRoundedRect(4, -46, 20, 46, 9);     // Beine
        g.fillStyle(a.kleidung).fillRoundedRect(-36, -100, 72, 66, 22).strokeRoundedRect(-36, -100, 72, 66, 22);
        g.fillStyle(0xffffff, 0.35).fillTriangle(-14, -100, 14, -100, 0, -80);                              // Kragen
        g.fillStyle(a.haut).fillEllipse(0, -160, 112, 104).strokeEllipse(0, -160, 112, 104);                // Kopf
        for (const s of [-1, 1]) {                                                                          // Augen
            const ex = s * 22;
            g.fillStyle(0xffffff).fillEllipse(ex, -152, 26, 34);
            g.fillStyle(a.augen).fillEllipse(ex, -149, 20, 28);
            g.fillStyle(UMRISS).fillEllipse(ex, -147, 10, 14);
            g.fillStyle(0xffffff).fillCircle(ex - 5, -157, 5).fillCircle(ex + 4, -142, 2.5);
            g.lineStyle(4, UMRISS).lineBetween(ex - 14, -168, ex + 14, -170);                               // Wimpern
        }
        g.lineStyle(3, UMRISS).beginPath().arc(0, -128, 7, 0.3, Math.PI - 0.3).strokePath();               // Mund
        g.fillStyle(0xff8fa3, 0.45).fillEllipse(-36, -134, 16, 9).fillEllipse(36, -134, 16, 9);            // Wangen

        this.setHaar(haarfarbe);
    }

    setHaar(farbe) {
        const dunkel = Phaser.Display.Color.ValueToColor(farbe).darken(25).color;
        this.haarHinten.clear().fillStyle(dunkel).lineStyle(5, UMRISS);
        HINTEN[this.a.frisur]?.(this.haarHinten);
        this.haarVorne.clear().fillStyle(farbe).lineStyle(5, UMRISS);
        VORNE[this.a.frisur]?.(this.haarVorne);
        if (this.a.frisur === 'zopf') this.haarVorne.fillStyle(0xff5c8a).fillCircle(44, -196, 9).strokeCircle(44, -196, 9); // Haarband
    }
}
