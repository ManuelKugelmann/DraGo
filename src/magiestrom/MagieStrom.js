// Magiestrom-Spiel: Funken-Kugel links, Ei in der Mitte. Tore mit Aufgaben, Schatten-Funken, Wärme-Balken.
import { schaetzTor, rechenTor, vokabelTor, nachTor, schatten, nachSchatten } from './regeln.js';
import { MAGIE, VOKABELN, TEXTE } from '../daten.js';

const MAX_PUNKTE = 140;          // so viele Funken werden höchstens gezeichnet
const FLUG_MS = 650;
const warte = ms => new Promise(r => setTimeout(r, ms));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export default class MagieStrom {
    constructor(wurzel) {
        this.wurzel = wurzel;
        this.leinwand = el('canvas', 'magie-leinwand');
        this.ctx = this.leinwand.getContext('2d');
        this.anzeige = el('div', 'magie-zahl');
        this.waerme = el('div', 'magie-waerme');
        this.balken = el('div', 'magie-balken');
        this.waerme.append(el('span', '', '🔥'), this.balken);
        this.tor = el('div', 'magie-tor');
        this.hinweis = el('div', 'magie-hinweis');
        wurzel.append(this.leinwand, this.waerme, this.anzeige, this.tor, this.hinweis);
        this.flieger = [];   // fliegende Funken {x0,y0,x1,y1,t0,farbe,fertig}
        this.poppen = [];    // kleine Sterne beim Auslöschen
        this.zeit = 0;
        addEventListener('resize', () => this.groesse());
        this.groesse();
        const schleife = t => { this.zeichne(t); this.lauf = requestAnimationFrame(schleife); };
        this.lauf = requestAnimationFrame(schleife);
    }

    groesse() {
        const d = Math.min(2, devicePixelRatio);
        this.w = innerWidth; this.h = innerHeight;
        this.leinwand.width = this.w * d; this.leinwand.height = this.h * d;
        this.ctx.setTransform(d, 0, 0, d, 0, 0);
        this.quelle = { x: this.w * 0.14, y: this.h * 0.55 };
        this.ei = { x: this.w * 0.5, y: this.h * 0.6 };
    }

    async spielen() {
        this.n = MAGIE.start;
        this.warm = 0;
        this.zeigeZahl();
        this.zeigeWaerme();
        let fragen = 0;
        for (let runde = 0; this.warm < MAGIE.ziel; runde++) {
            // 1. Tor: abwechselnd Schätzen und Frage (Rechnen / Vokabel)
            const tor = runde % 2 === 0 ? schaetzTor(this.n)
                : (fragen++ % 2 === 0 ? rechenTor() : vokabelTor(VOKABELN));
            const wahl = await this.frage(tor);
            const vorher = this.n;
            this.n = nachTor(tor, wahl, this.n, MAGIE.bonus);
            await this.melde(wahl === tor.richtig ? TEXTE.magie_richtig : (tor.art === 'schaetzen' ? TEXTE.magie_naja : TEXTE.magie_falsch),
                wahl === tor.richtig);
            await this.wachse(vorher, this.n);

            // 2. Schatten-Funken vom Ei
            const s = schatten(runde, MAGIE.schatten_start, MAGIE.schatten_plus);
            const erg = nachSchatten(this.n, s, MAGIE.start);
            await this.schattenAngriff(s, erg.geloescht);
            this.n = erg.uebrig;
            this.zeigeZahl();

            // 3. Übrige Funken wärmen das Ei
            if (this.n > 0) await this.waermen(this.n);
            else { this.n = erg.weiter; this.zeigeZahl(); await this.melde(TEXTE.magie_neu, true); }
        }
        await this.schluepfen();
    }

    // ---------- Anzeige ----------

    zeigeZahl() { this.anzeige.textContent = '✨ ' + this.n; }
    zeigeWaerme() { this.balken.style.setProperty('--wert', Math.min(1, this.warm / MAGIE.ziel)); }

    frage(tor) {
        return new Promise(fertig => {
            this.tor.replaceChildren(el('div', 'magie-frage', tor.art === 'schaetzen' ? `${TEXTE.magie_schaetzen} (${tor.frage})` : tor.frage));
            const reihe = el('div', 'magie-optionen');
            tor.optionen.forEach((o, i) => {
                const b = el('button', 'magie-option', o);
                b.onclick = () => { this.tor.classList.remove('offen'); fertig(i); };
                reihe.append(b);
            });
            this.tor.append(reihe);
            this.tor.classList.add('offen');
        });
    }

    async melde(text, gut) {
        this.hinweis.textContent = text;
        this.hinweis.className = 'magie-hinweis zeigen ' + (gut ? 'gut' : 'naja');
        await warte(900);
        this.hinweis.classList.remove('zeigen');
    }

    // ---------- Animationen ----------

    punkt(i) {   // Position des i-ten Funkens in der Kugel (Spirale)
        const r = 6 + Math.sqrt(i) * 7, a = i * 2.4 + this.zeit * 0.6;
        return { x: this.quelle.x + Math.cos(a) * r, y: this.quelle.y + Math.sin(a) * r };
    }

    async wachse(vorher, nachher) {
        const neu = Math.min(MAX_PUNKTE, nachher) - Math.min(MAX_PUNKTE, vorher);
        this.sichtbar = Math.min(MAX_PUNKTE, vorher);
        for (let i = 0; i < neu; i++) { this.sichtbar++; if (i % 3 === 0) await warte(12); }
        this.sichtbar = Math.min(MAX_PUNKTE, nachher);
        this.zeigeZahl();
        await warte(300);
    }

    async schattenAngriff(s, geloescht) {
        const jetzt = performance.now();
        const zeige = Math.min(s, 40);
        for (let i = 0; i < zeige; i++) {
            const z = this.punkt(Math.max(0, (this.sichtbar ?? 0) - 1 - i));
            this.flieger.push({ x0: this.ei.x + (Math.random() - 0.5) * 60, y0: this.ei.y + (Math.random() - 0.5) * 60,
                x1: z.x, y1: z.y, t0: jetzt + i * 40, farbe: '#7a3cff', schatten: true });
        }
        await warte(FLUG_MS + zeige * 40);
        const vorher = this.sichtbar ?? 0;
        this.sichtbar = Math.max(0, Math.min(MAX_PUNKTE, this.n - geloescht));
        for (let i = this.sichtbar; i < vorher; i++) { const p = this.punkt(i); this.poppen.push({ ...p, t0: performance.now() }); }
        await warte(400);
    }

    async waermen(n) {
        const jetzt = performance.now();
        const zeige = Math.min(n, 40);
        for (let i = 0; i < zeige; i++) {
            const p = this.punkt(i);
            this.flieger.push({ x0: p.x, y0: p.y, x1: this.ei.x, y1: this.ei.y, t0: jetzt + i * 30, farbe: '#ffd27a' });
        }
        await warte(FLUG_MS + zeige * 30);
        this.warm += n;
        this.zeigeWaerme();
        this.wurzel.classList.add('ei-wackelt');
        await warte(500);
        this.wurzel.classList.remove('ei-wackelt');
    }

    async schluepfen() {
        this.tor.classList.remove('offen');
        this.wurzel.classList.add('schluepft');
        await warte(1800);
        this.hinweis.textContent = TEXTE.magie_geschluepft;
        this.hinweis.className = 'magie-hinweis zeigen gut gross';
    }

    zeichne(t) {
        this.zeit = t / 1000;
        const c = this.ctx;
        c.clearRect(0, 0, this.w, this.h);
        c.globalCompositeOperation = 'lighter';
        // Kugel-Schein
        const g = c.createRadialGradient(this.quelle.x, this.quelle.y, 0, this.quelle.x, this.quelle.y, 90);
        g.addColorStop(0, '#ffe9a0aa'); g.addColorStop(1, '#ffe9a000');
        c.fillStyle = g; c.beginPath(); c.arc(this.quelle.x, this.quelle.y, 90, 0, Math.PI * 2); c.fill();
        // eigene Funken
        for (let i = 0; i < (this.sichtbar ?? 0); i++) {
            const p = this.punkt(i);
            this.funke(p.x, p.y, 3.2 + Math.sin(this.zeit * 5 + i) * 0.8, '#ffd27a');
        }
        // fliegende Funken
        const jetzt = performance.now();
        this.flieger = this.flieger.filter(f => {
            const k = (jetzt - f.t0) / FLUG_MS;
            if (k < 0) return true;
            if (k > 1) return false;
            const e = k * k * (3 - 2 * k);
            const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 40;
            this.funke(x, y, 4, f.farbe);
            return true;
        });
        // Puff-Sterne beim Auslöschen (kein Blut, nur Glitzer)
        this.poppen = this.poppen.filter(p => {
            const k = (jetzt - p.t0) / 400;
            if (k > 1) return false;
            c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 2;
            const r = 4 + k * 12;
            c.beginPath(); c.moveTo(p.x - r, p.y); c.lineTo(p.x + r, p.y); c.moveTo(p.x, p.y - r); c.lineTo(p.x, p.y + r); c.stroke();
            return true;
        });
        c.globalCompositeOperation = 'source-over';
    }

    funke(x, y, r, farbe) {
        const c = this.ctx;
        c.fillStyle = farbe;
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff88';
        c.beginPath(); c.arc(x, y, r * 0.45, 0, Math.PI * 2); c.fill();
    }

    beenden() {
        cancelAnimationFrame(this.lauf);
        this.wurzel.replaceChildren();
        this.wurzel.className = '';
    }
}
