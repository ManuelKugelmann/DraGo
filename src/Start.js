// Startbild: Bild, Titel, Glitzer, Spielfigur wählen.
import Phaser from 'phaser';
import { TITEL, AVATAR_FRAGE, AVATARE, HAARFARBEN } from './daten.js';
import Figur from './Figur.js';

const SPEICHER = 'drago_avatar';
const SCHRIFT = 'Fredoka, "Trebuchet MS", system-ui, sans-serif';

export default class Start extends Phaser.Scene {
    constructor() { super('Start'); }

    preload() {
        this.load.image('splash', 'img/splash.webp');
    }

    create() {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        for (let r = 16; r > 0; r -= 2) g.fillStyle(0xffffff, 0.12).fillCircle(16, 16, r);
        g.generateTexture('funke', 32, 32);
        g.destroy();

        this.bild = this.textures.exists('splash') ? this.add.image(0, 0, 'splash') : null;
        this.zone = new Phaser.Geom.Rectangle(0, 0, 1, 1);
        this.glitzer = this.add.particles(0, 0, 'funke', {
            emitZone: { type: 'random', source: this.zone },
            speedY: { min: -30, max: -8 }, speedX: { min: -10, max: 10 },
            scale: { start: 0.4, end: 0 }, alpha: { start: 1, end: 0 },
            tint: [0xffe08a, 0xd9b8ff, 0xffffff], lifespan: 3000, frequency: 120, blendMode: 'ADD'
        });
        this.titel = this.add.text(0, 0, TITEL, {
            fontFamily: SCHRIFT, fontStyle: 'bold', color: '#ffd27a', stroke: '#6b2a0c', strokeThickness: 14
        }).setOrigin(0.5).setShadow(0, 8, '#00000066', 8, true, true);
        this.tweens.add({ targets: this.titel, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

        this.baueAuswahl();
        this.scale.on('resize', () => this.layout());
        this.layout();
    }

    baueAuswahl() {
        this.frage = this.add.text(0, 0, AVATAR_FRAGE, {
            fontFamily: SCHRIFT, fontStyle: 'bold', color: '#fff7e6', stroke: '#24122f', strokeThickness: 8
        }).setOrigin(0.5, 1);
        let wahl = {};
        try { wahl = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { /* egal */ }
        this.wahl = {
            figur: AVATARE[wahl.figur] ? wahl.figur : 0,
            haar: HAARFARBEN[wahl.haar] !== undefined ? wahl.haar : 0
        };
        const farbe = HAARFARBEN[this.wahl.haar];
        this.karten = AVATARE.map((a, i) => {
            const k = this.add.container(0, 0);
            const feld = this.add.graphics();
            const figur = new Figur(this, 0, 112, a, farbe).setScale(0.78);
            k.add([feld, figur]).setSize(150, 240).setInteractive({ useHandCursor: true });
            k.on('pointerdown', () => this.waehle({ figur: i }));
            k.feld = feld; k.figur = figur;
            return k;
        });
        this.tupfen = HAARFARBEN.map((f, i) => {
            const t = this.add.graphics();
            t.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
            t.on('pointerdown', () => this.waehle({ haar: i }));
            t.farbe = f;
            return t;
        });
        this.waehle({}, true);
    }

    waehle(neu, still = false) {
        const alt = this.wahl.figur;
        Object.assign(this.wahl, neu);
        try { localStorage.setItem(SPEICHER, JSON.stringify(this.wahl)); } catch { /* egal */ }
        const farbe = HAARFARBEN[this.wahl.haar];
        this.karten.forEach((k, j) => {
            const an = j === this.wahl.figur;
            k.feld.clear()
                .fillStyle(an ? 0xffd27a : 0x2b1840, an ? 0.95 : 0.7).fillRoundedRect(-75, -120, 150, 240, 26)
                .lineStyle(6, an ? 0xffffff : 0x24122f, 1).strokeRoundedRect(-75, -120, 150, 240, 26);
            k.figur.setHaar(farbe);
        });
        this.tupfen.forEach((t, j) => {
            const an = j === this.wahl.haar;
            t.clear().fillStyle(t.farbe).fillCircle(0, 0, 24).lineStyle(an ? 7 : 4, an ? 0xffffff : 0x24122f).strokeCircle(0, 0, 24);
        });
        if (still) return;
        const k = this.karten[this.wahl.figur];
        if (neu.figur !== undefined && neu.figur !== alt || neu.haar !== undefined)
            this.tweens.add({ targets: k.figur, y: 84, duration: 160, yoyo: true, ease: 'Quad.out' });
    }

    /** Bild füllt den Schirm, Titel oben, Figuren unten – quer und hoch. */
    layout() {
        const { width: w, height: h } = this.scale;
        if (this.bild) this.bild.setPosition(w / 2, h / 2).setScale(Math.max(w / this.bild.width, h / this.bild.height));
        this.titel.setPosition(w / 2, h * 0.17).setFontSize(Math.round(Math.min(w * 0.2, h * 0.16)));
        this.zone.setSize(w, h);

        // Unten: Frage, Figuren, Haarfarben. Größe passt in Breite und Höhe.
        const n = this.karten.length, m = this.tupfen.length;
        const s = Math.min(w * 0.94 / (n * 160), w * 0.94 / (m * 64), h * 0.42 / 330);
        const unten = h - Math.max(10, h * 0.025);
        const yT = unten - 32 * s;
        this.tupfen.forEach((t, i) => t.setScale(s).setPosition(w / 2 + (i - (m - 1) / 2) * 64 * s, yT));
        const yK = yT - 36 * s - 120 * s;
        this.karten.forEach((k, i) => k.setScale(s).setPosition(w / 2 + (i - (n - 1) / 2) * 160 * s, yK));
        this.frage.setPosition(w / 2, yK - 128 * s).setFontSize(Math.round(Math.max(20, 44 * s)));
    }
}
