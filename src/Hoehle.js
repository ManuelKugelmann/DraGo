// Die Höhle: Hintergrund, eigener Drache, Drachen von Freunden.
import Phaser from 'phaser';
import Drache from './Drache.js';
import { DRACHEN, DRACHEN_NAMEN, EMOTES } from './daten.js';
import { startAuswahl, baueHud } from './ui/hud.js';

const W = 1280, H = 720;
const BODEN = { oben: 500, unten: 690, rand: 110 }; // wo Drachen laufen dürfen
const SENDEN_MS = 150;
const SPEICHER = 'drago_spieler';

export default class Hoehle extends Phaser.Scene {
    constructor() { super('Hoehle'); }

    preload() {
        this.load.image('hoehle', 'img/hoehle.webp');
        this.load.audio('klick', 'sfx/klick.wav');
        this.load.audio('tipp', 'sfx/tipp.wav');
        this.load.audio('hallo', 'sfx/hallo.wav');
        this.load.on('loaderror', f => console.warn('fehlt:', f.key)); // Spiel läuft auch ohne
    }

    create() {
        this.hintergrund();
        this.funkenTextur();
        this.gluehwuermchen();
        this.freunde = new Map();
        this.net = null;
        this.sendeZeit = 0;

        let spieler = null;
        try { spieler = JSON.parse(localStorage.getItem(SPEICHER)); } catch { /* egal */ }
        if (spieler && DRACHEN[spieler.typ]) this.starte(spieler);
        else startAuswahl(typ => this.starte({ typ, n: Math.floor(Math.random() * DRACHEN_NAMEN.length) }));

        this.input.on('pointerdown', p => {
            if (!this.ich) return;
            const x = Phaser.Math.Clamp(p.worldX, BODEN.rand, W - BODEN.rand);
            const y = Phaser.Math.Clamp(p.worldY, BODEN.oben, BODEN.unten);
            this.ich.geheZu(x, y);
            this.ton('tipp');
        });
    }

    starte(spieler) {
        try { localStorage.setItem(SPEICHER, JSON.stringify(spieler)); } catch { /* egal */ }
        this.ich = new Drache(this, W / 2, 600, spieler.typ, spieler.n);
        this.ich.hopsen();
        this.ton('hallo');
        baueHud(this);
    }

    hintergrund() {
        if (this.textures.exists('hoehle')) {
            this.add.image(W / 2, H / 2, 'hoehle').setDisplaySize(W, H).setDepth(-10);
            return;
        }
        // Ersatz ohne Bild: Verlauf, Boden, Kristalle
        const g = this.add.graphics().setDepth(-10);
        g.fillGradientStyle(0x2b1840, 0x2b1840, 0x5a3b2a, 0x5a3b2a).fillRect(0, 0, W, H);
        g.fillStyle(0xc9a36b).fillEllipse(W / 2, 640, 1400, 300);
        const rnd = new Phaser.Math.RandomDataGenerator(['drago']);
        for (let i = 0; i < 14; i++) {
            const x = rnd.between(0, W), y = rnd.between(300, 520), h = rnd.between(40, 120);
            g.fillStyle(rnd.pick([0xb388ff, 0xffb347]), 0.9).fillTriangle(x - 14, y, x, y - h, x + 14, y);
        }
    }

    funkenTextur() {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        for (let r = 16; r > 0; r -= 2) g.fillStyle(0xffffff, 0.12).fillCircle(16, 16, r);
        g.generateTexture('funke', 32, 32);
        g.destroy();
    }

    gluehwuermchen() {
        this.add.particles(0, 0, 'funke', {
            x: { min: 0, max: W }, y: { min: 120, max: 560 },
            speedX: { min: -12, max: 12 }, speedY: { min: -18, max: -4 },
            scale: { start: 0.35, end: 0.05 }, alpha: { start: 0.9, end: 0 },
            tint: [0xffe08a, 0xd9b8ff], lifespan: 5000, frequency: 260, blendMode: 'ADD'
        }).setDepth(900);
    }

    ton(key) {
        if (this.cache.audio.exists(key)) this.sound.play(key, { volume: 0.5 });
    }

    /** Wird vom Raum-Dialog aufgerufen. net = Netz oder null. */
    setzeNetz(net) {
        this.net?.leave();
        for (const d of this.freunde.values()) d.destroy();
        this.freunde.clear();
        this.net = net;
        if (!net) return;
        net.on('state', (id, s) => {
            let d = this.freunde.get(id);
            if (!d || d.typ !== s.typ || d.n !== s.n) {
                d?.destroy();
                d = new Drache(this, s.x * W, s.y * H, s.typ, s.n);
                d.hopsen();
                this.freunde.set(id, d);
                this.ton('hallo');
            }
            d.geheZu(s.x * W, s.y * H);
        });
        net.on('leave', id => { this.freunde.get(id)?.destroy(); this.freunde.delete(id); });
        net.on('emote', (id, e) => {
            const d = this.freunde.get(id);
            if (!d) return;
            if (e === 'feuer') d.atmen();
            d.blase(EMOTES[e]);
        });
    }

    /** Eigenes Emote: zeigen und an Freunde senden. */
    emote(e) {
        if (!this.ich) return;
        if (e === 'feuer') this.ich.atmen();
        this.ich.blase(EMOTES[e]);
        this.net?.sendEmote(e);
        this.ton('klick');
    }

    update(time, delta) {
        const dt = Math.min(delta / 1000, 0.05);
        this.ich?.update(dt);
        for (const d of this.freunde.values()) d.update(dt);
        if (this.net && this.ich && time - this.sendeZeit > SENDEN_MS) {
            this.sendeZeit = time;
            this.net.send({ x: this.ich.ziel.x / W, y: this.ich.ziel.y / H, typ: this.ich.typ, n: this.ich.n });
        }
        this.hud?.update();
    }
}
