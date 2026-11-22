// Ein Drache aus einfachen Formen (keine Bilddateien nötig).
// Gleiche Klasse für den eigenen Drachen und für Freunde.
import Phaser from 'phaser';
import { DRACHEN, DRACHEN_NAMEN } from './daten.js';

const TEMPO = 260;          // Laufen, Pixel pro Sekunde
const FLUEGEL_RUHE = 1.6;   // Flügelschläge pro Sekunde im Stehen
const FLUEGEL_LAUF = 5;     // ... beim Laufen
const UMRISS = 0x24122f;    // Farbe der Umrisslinie

const dunkler = (c, f) => {
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f);
};

export default class Drache extends Phaser.GameObjects.Container {
    constructor(scene, x, y, typ, n) {
        super(scene, x, y);
        scene.add.existing(this);
        this.typ = DRACHEN[typ] ? typ : 'feuer';
        this.n = n;
        this.ziel = { x, y };
        this.zeit = Math.random() * 10;
        this.blick = 1;           // 1 = nach rechts, -1 = nach links
        this.sprung = 0;          // Höhe eines kleinen Hüpfers
        this.kauen = 0;
        this.naechstesBlinzeln = 2;
        this.baue();
    }

    get drachenName() { return DRACHEN_NAMEN[this.n % DRACHEN_NAMEN.length]; }

    baue() {
        const s = this.scene, t = DRACHEN[this.typ];
        const k = t.koerper, kd = dunkler(k, 0.72), b = t.bauch;
        this.removeAll(true);

        this.schatten = s.add.ellipse(0, 0, 150, 26, 0x000000, 0.35);
        this.koerperTeil = s.add.container(0, 0); // alles, was hüpft und sich dreht
        this.add([this.schatten, this.koerperTeil]);
        const add = g => { this.koerperTeil.add(g); return g; };

        // Schwanz (dreht am Ansatz)
        this.schwanz = add(s.add.graphics({ x: -42, y: -48 }));
        this.schwanz.lineStyle(5, UMRISS).fillStyle(k);
        const sp = [[0, -14], [-40, -18], [-80, -30], [-104, -52], [-96, -34], [-70, -6], [-30, 12], [0, 14]];
        this.schwanz.fillPoints(sp.map(([x, y]) => ({ x, y })), true).strokePoints(sp.map(([x, y]) => ({ x, y })), true);
        this.schwanz.fillStyle(t.horn).fillTriangle(-104, -52, -122, -62, -108, -36);

        // Hinterer Flügel und hinteres Bein (dunkler = weiter weg)
        this.fluegelHinten = add(this.fluegel(s, -6, -88, kd, dunkler(b, 0.8)));
        this.beine = [];
        this.beine.push(add(this.bein(s, -30, -36, kd)), add(this.bein(s, 34, -36, kd)));

        // Körper
        const koerper = add(s.add.graphics());
        koerper.lineStyle(5, UMRISS).fillStyle(k).fillEllipse(0, -62, 124, 84).strokeEllipse(0, -62, 124, 84);
        koerper.fillStyle(b).fillEllipse(10, -46, 84, 44);
        koerper.fillStyle(t.horn); // Rückenzacken
        for (let i = 0; i < 4; i++) koerper.fillTriangle(-40 + i * 20, -96 + i * 2, -26 + i * 20, -118 + i * 3, -14 + i * 20, -98 + i * 2);

        // Vordere Beine
        this.beine.push(add(this.bein(s, -14, -30, k)), add(this.bein(s, 44, -30, k)));

        // Kopf mit Hals
        this.kopf = add(s.add.container(54, -92));
        const hals = s.add.graphics();
        hals.lineStyle(5, UMRISS).fillStyle(k).fillEllipse(-6, 18, 46, 60).strokeEllipse(-6, 18, 46, 60);
        hals.fillStyle(b).fillEllipse(4, 26, 22, 40);
        const kopfForm = s.add.graphics();
        kopfForm.fillStyle(t.horn).lineStyle(4, UMRISS);
        kopfForm.fillTriangle(-20, -26, -42, -66, -4, -34).strokeTriangle(-20, -26, -42, -66, -4, -34);
        kopfForm.fillTriangle(2, -32, -6, -72, 18, -34).strokeTriangle(2, -32, -6, -72, 18, -34);
        kopfForm.lineStyle(5, UMRISS).fillStyle(k);
        kopfForm.fillEllipse(30, -4, 64, 40).strokeEllipse(30, -4, 64, 40);   // Schnauze
        kopfForm.fillCircle(0, -12, 34).strokeCircle(0, -12, 34);            // Kopf
        kopfForm.fillEllipse(30, -4, 58, 34);                                 // Übergang ohne Linie
        kopfForm.fillStyle(UMRISS).fillCircle(52, -12, 3.5);                  // Nasenloch
        kopfForm.fillStyle(0xff8fa3, 0.55).fillCircle(20, 6, 8);              // Wange
        this.mund = s.add.graphics();
        this.zeichneMund(0);
        const auge = s.add.graphics();
        auge.fillStyle(0xffffff).fillEllipse(8, -18, 26, 30).lineStyle(3, UMRISS).strokeEllipse(8, -18, 26, 30);
        this.pupille = s.add.graphics({ x: 12, y: -18 });
        this.pupille.fillStyle(UMRISS).fillEllipse(0, 0, 13, 19).fillStyle(0xffffff).fillCircle(-2, -5, 3.5);
        this.lid = s.add.graphics({ x: 8, y: -33 });
        this.lid.fillStyle(k).fillRect(-14, 0, 28, 30).lineStyle(3, UMRISS).lineBetween(-13, 30, 13, 30);
        this.lid.scaleY = 0;
        this.kopf.add([hals, kopfForm, this.mund, auge, this.pupille, this.lid]);

        // Vorderer Flügel
        this.fluegelVorne = add(this.fluegel(s, -4, -94, k, b));

        // Name
        this.schild = s.add.text(0, 14, this.drachenName, {
            fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '26px', color: '#fff7e6',
            stroke: '#24122f', strokeThickness: 6
        }).setOrigin(0.5, 0);
        this.add(this.schild);
    }

    fluegel(s, x, y, rand, haut) {
        const g = s.add.graphics({ x, y });
        const p = [{ x: 0, y: 0 }, { x: -30, y: -70 }, { x: -6, y: -110 }, { x: 26, y: -76 }, { x: 60, y: -96 }, { x: 52, y: -40 }, { x: 24, y: -8 }];
        g.fillStyle(haut).fillPoints(p, true).lineStyle(5, UMRISS).strokePoints(p, true);
        g.lineStyle(6, rand).lineBetween(0, 0, -6, -110).lineBetween(-6, -110, 60, -96);
        return g;
    }

    bein(s, x, y, farbe) {
        const g = s.add.graphics({ x, y });
        g.lineStyle(4, UMRISS).fillStyle(farbe).fillRoundedRect(-11, 0, 22, 38, 10).strokeRoundedRect(-11, 0, 22, 38, 10);
        g.fillStyle(0xffffff).fillCircle(-6, 36, 3).fillCircle(0, 37, 3).fillCircle(6, 36, 3);
        return g;
    }

    zeichneMund(offen) {
        this.mund.clear().lineStyle(4, UMRISS);
        if (offen > 0.1) this.mund.fillStyle(0x7a1f3d).fillEllipse(44, 10, 18, 6 + offen * 12).strokeEllipse(44, 10, 18, 6 + offen * 12);
        else this.mund.beginPath().arc(40, 4, 10, 0.3, 1.6).strokePath();
    }

    /** Zum Punkt laufen. */
    geheZu(x, y) { this.ziel.x = x; this.ziel.y = y; }

    hopsen() {
        this.scene.tweens.add({ targets: this, sprung: 60, duration: 220, yoyo: true, ease: 'Quad.out' });
    }

    fressen() {
        this.kauen = 1.6;
        this.hopsen();
    }

    /** Feuer-Atem aus dem Maul. */
    atmen() {
        const s = this.scene, t = DRACHEN[this.typ];
        const p = this.kopf.getWorldTransformMatrix();
        const x = p.tx + 46 * this.scaleX, y = p.ty + 8 * this.scaleY;
        const e = s.add.particles(x, y, 'funke', {
            speed: { min: 380, max: 620 }, angle: this.blick > 0 ? { min: -14, max: 14 } : { min: 166, max: 194 },
            scale: { start: 0.9, end: 2.6 }, alpha: { start: 1, end: 0 }, lifespan: 520,
            tint: t.atem, blendMode: 'ADD', frequency: 12, quantity: 3
        });
        e.setDepth(this.depth + 1);
        this.atem = 0.9;
        s.time.delayedCall(800, () => { e.stop(); s.time.delayedCall(700, () => e.destroy()); });
    }

    /** Emoji-Blase über dem Kopf. */
    blase(emoji) {
        const s = this.scene;
        const txt = s.add.text(this.x, this.y - 200 * this.scaleY, emoji, { fontSize: '56px' }).setOrigin(0.5).setDepth(1000);
        s.tweens.add({ targets: txt, y: txt.y - 70, alpha: 0, duration: 1400, ease: 'Sine.out', onComplete: () => txt.destroy() });
    }

    update(dt) {
        this.zeit += dt;
        const dx = this.ziel.x - this.x, dy = this.ziel.y - this.y;
        const weg = Math.hypot(dx, dy);
        const laeuft = weg > 4;
        if (laeuft) {
            const schritt = Math.min(weg, TEMPO * dt);
            this.x += dx / weg * schritt;
            this.y += dy / weg * schritt;
            if (Math.abs(dx) > 6) this.blick = Math.sign(dx);
        }
        // Tiefe: weiter unten = näher = größer
        const nah = Phaser.Math.Clamp((this.y - 470) / 230, 0, 1);
        const gr = 0.78 + nah * 0.32;
        this.scaleX = Phaser.Math.Linear(this.scaleX, gr * this.blick, Math.min(1, dt * 14));
        this.scaleY = gr;
        this.setDepth(this.y);
        this.schild.scaleX = Math.sign(this.scaleX) || 1; // Name nie gespiegelt

        // Bewegung der Teile
        const t = this.zeit;
        const fl = Math.sin(t * Math.PI * 2 * (laeuft ? FLUEGEL_LAUF : FLUEGEL_RUHE));
        this.fluegelVorne.rotation = -0.15 + fl * (laeuft ? 0.45 : 0.18);
        this.fluegelHinten.rotation = -0.3 + fl * (laeuft ? 0.4 : 0.15);
        this.schwanz.rotation = Math.sin(t * 2.2) * 0.18;
        const wippen = laeuft ? Math.abs(Math.sin(t * 12)) * 8 : Math.sin(t * 2) * 2.5;
        this.koerperTeil.y = -wippen - this.sprung;
        this.schatten.scaleX = 1 - this.sprung / 200;
        this.beine.forEach((b, i) => { b.rotation = laeuft ? Math.sin(t * 12 + (i % 2) * Math.PI) * 0.5 : 0; });
        this.kopf.rotation = Math.sin(t * 1.3) * 0.06 + (this.kauen > 0 ? Math.sin(t * 24) * 0.08 : 0);
        this.pupille.x = 12 + Math.sin(t * 0.7) * 3;

        // Blinzeln
        this.naechstesBlinzeln -= dt;
        if (this.naechstesBlinzeln < 0) { this.naechstesBlinzeln = 2 + Math.random() * 3; this.blinzel = 0.18; }
        this.blinzel = Math.max(0, (this.blinzel || 0) - dt);
        this.lid.scaleY = this.blinzel > 0 ? 1 : 0;

        // Mund: auf beim Kauen und Feuer
        this.kauen = Math.max(0, this.kauen - dt);
        this.atem = Math.max(0, (this.atem || 0) - dt);
        this.zeichneMund(this.atem > 0 ? 1 : this.kauen > 0 ? Math.abs(Math.sin(t * 12)) : 0);
    }
}
