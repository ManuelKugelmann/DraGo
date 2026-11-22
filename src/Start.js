// Startbild: Bild, Titel, Glitzer. Sonst nichts.
import Phaser from 'phaser';
import { TITEL } from './daten.js';

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
            fontFamily: 'Fredoka, "Trebuchet MS", system-ui, sans-serif', fontStyle: 'bold',
            color: '#ffd27a', stroke: '#6b2a0c', strokeThickness: 14
        }).setOrigin(0.5).setShadow(0, 8, '#00000066', 8, true, true);
        this.tweens.add({ targets: this.titel, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.tweens.add({ targets: this.titel, scale: { from: 0.2, to: 1 }, duration: 700, ease: 'Back.out' });

        this.scale.on('resize', () => this.layout());
        this.layout();
    }

    /** Bild füllt den Schirm, Titel oben in der Mitte – quer und hoch. */
    layout() {
        const { width: w, height: h } = this.scale;
        if (this.bild) this.bild.setPosition(w / 2, h / 2).setScale(Math.max(w / this.bild.width, h / this.bild.height));
        this.titel.setPosition(w / 2, h * 0.2).setFontSize(Math.round(Math.min(w * 0.2, h * 0.18)));
        this.zone.setSize(w, h);
    }
}
