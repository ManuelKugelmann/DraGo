// Magiestrom-Spiel in Echtzeit: Die Zeit läuft. Schatten-Funken kommen ständig von außen (immer mehr).
// Eigene Funken kreisen um das Ei, fangen Schatten ab und fliegen nach und nach ins Ei (Wärme).
// Gelöste Aufgaben bringen neue Funken – sie fliegen von der Spielfigur zum Ei.
// Ist das Ei rechtzeitig warm: Risse, aufbrechen, zufälliger Babydrache. Sonst: kalt – nochmal!
import { zufallsTor, nachTor, staerke, neuerZustand, neueSchatten, treffer, aufnehmen, stand } from './regeln.js';
import { stufe } from './stufen.js';
import { MAGIE, VOKABELN, TEXTE, DRACHEN } from '../daten.js';

const warte = ms => new Promise(r => setTimeout(r, ms));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const BILD = { w: 1344, h: 768, ei: { x: 685, y: 480, rx: 150, ry: 185 } };   // Ei im Hintergrundbild (Pixel)
const MAX_KREIS = 120;     // so viele eigene Funken werden höchstens gezeichnet
const FLUG = 1.3;          // Sekunden, die ein Schatten bis zum Ei braucht
const lade = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

/** Vorgerenderter Leucht-Punkt (schnell zu zeichnen). */
function leuchtPunkt(farbe, r = 16) {
    const c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const g = c.getContext('2d'), v = g.createRadialGradient(r, r, 0, r, r, r);
    v.addColorStop(0, '#ffffff'); v.addColorStop(0.25, farbe); v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v; g.fillRect(0, 0, r * 2, r * 2);
    return c;
}

export default class MagieStrom {
    constructor(wurzel, figurBild = null, alter = 9) {
        this.wurzel = wurzel;
        this.figurBild = figurBild;
        this.stufe = stufe(alter);
        this.leinwand = el('canvas', 'magie-leinwand');
        this.ctx = this.leinwand.getContext('2d');
        this.anzeige = el('div', 'magie-zahl');
        this.waerme = el('div', 'magie-waerme');
        this.balken = el('div', 'magie-balken');
        this.uhr = el('div', 'magie-uhr');
        this.waerme.append(el('span', '', '🔥'), this.balken, el('span', '', '⏳'), this.uhr);
        this.tor = el('div', 'magie-tor');
        this.hinweis = el('div', 'magie-hinweis');
        this.nochmal = el('button', 'magie-nochmal', TEXTE.magie_nochmal);
        this.nochmal.onclick = () => this.spielen();
        wurzel.append(this.leinwand, this.waerme, this.anzeige, this.tor, this.hinweis, this.nochmal);
        this.punkt = { funke: leuchtPunkt('rgba(255,190,80,0.9)'), licht: leuchtPunkt('rgba(255,255,220,0.8)', 10),
            puff: leuchtPunkt('rgba(170,120,255,0.8)', 12) };
        lade('img/splash.webp').then(b => { this.hintergrund = b; });
        this.groesse = this.groesse.bind(this);
        addEventListener('resize', this.groesse);
        this.groesse();
        this.zuruecksetzen();
        let alt = performance.now();
        const schleife = t => { this.schritt(Math.min(0.05, (t - alt) / 1000), t); alt = t; this.lauf = requestAnimationFrame(schleife); };
        this.lauf = requestAnimationFrame(schleife);
    }

    zuruecksetzen() {
        this.z = neuerZustand(MAGIE);
        this.teilchen = []; this.kreis = []; this.angreifer = []; this.risse = []; this.scherben = [];
        this.drache = null; this.laeuft = false;
        this.passeKreis();
    }

    groesse() {
        const d = Math.min(2, devicePixelRatio);
        this.w = innerWidth; this.h = innerHeight;
        this.leinwand.width = this.w * d; this.leinwand.height = this.h * d;
        this.ctx.setTransform(d, 0, 0, d, 0, 0);
        const k = Math.max(this.w / BILD.w, this.h / BILD.h);    // Hintergrund ist "cover"
        const ox = (this.w - BILD.w * k) / 2, oy = (this.h - BILD.h * k) / 2;
        this.ei = { x: ox + BILD.ei.x * k, y: oy + BILD.ei.y * k, rx: BILD.ei.rx * k, ry: BILD.ei.ry * k, k, ox, oy };
        this.figurPlatz = { x: this.ei.x - this.ei.rx * 2.4, y: this.ei.y + this.ei.ry * 1.05, h: this.ei.ry * 2 };
    }

    // ---------- Ablauf ----------

    async spielen() {
        this.zuruecksetzen();
        this.wurzel.classList.remove('verloren');
        this.hinweis.classList.remove('zeigen');
        this.laeuft = true;
        this.zeige();
        // Aufgaben ohne Pause, solange das Spiel läuft
        while (this.laeuft) {
            const tor = zufallsTor(this.z.n, VOKABELN, Math.random, this.stufe);
            const wahl = await this.frage(tor);
            if (!this.laeuft) break;
            const gut = wahl === tor.richtig;
            const neu = Math.max(0, nachTor(tor, wahl, Math.max(1, this.z.n), MAGIE.bonus) - this.z.n);
            this.z.n += neu;
            this.passeKreis();
            this.melde(gut ? TEXTE.magie_richtig : (tor.art === 'schaetzen' ? TEXTE.magie_naja : TEXTE.magie_falsch), gut);
            await warte(250);
        }
    }

    /** Spiel-Ende: geschlüpft oder kalt. */
    async ende(ergebnis) {
        this.laeuft = false;
        this.tor.classList.remove('offen');
        this.antwort?.(-1);
        if (ergebnis === 'geschluepft') await this.schluepfen();
        else {
            this.angreifer = [];
            this.wurzel.classList.add('verloren');
            this.melde(TEXTE.magie_kalt, false, true);
        }
    }

    passeKreis() {
        const soll = Math.min(MAX_KREIS, this.z.n);
        const f = this.figurPlatz, von = { x: f.x + f.h * 0.15, y: f.y - f.h * 0.55 };
        let neu = 0;
        while (this.kreis.length < soll) {
            this.kreis.push({ w: Math.random() * Math.PI * 2, r: 1.25 + Math.random() * 0.45, v: 0.8 + Math.random() * 1.2, von, f: -0.04 * neu++ });
        }
        if (this.kreis.length > soll) this.kreis.length = soll;
    }

    zeige() {
        this.anzeige.textContent = '✨ ' + this.z.n;
        this.balken.style.setProperty('--wert', Math.min(1, this.z.warm / MAGIE.ziel));
        this.uhr.style.setProperty('--wert', Math.max(0, 1 - this.z.zeit / MAGIE.zeit));
    }

    frage(tor) {
        return new Promise(fertig => {
            this.antwort = fertig;
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

    melde(text, gut, bleibt = false) {
        this.hinweis.textContent = text;
        this.hinweis.className = 'magie-hinweis zeigen ' + (gut ? 'gut' : 'naja') + (bleibt ? ' gross' : '');
        clearTimeout(this.meldeZeit);
        if (!bleibt) this.meldeZeit = setTimeout(() => this.hinweis.classList.remove('zeigen'), 800);
    }

    // ---------- Schlüpfen: Risse -> aufbrechen -> Babydrache ----------

    async schluepfen() {
        const { x, y, rx, ry } = this.ei;
        this.angreifer = [];
        for (let r = 0; r < 3; r++) {
            const linie = [];
            let px = x + (r - 1) * rx * 0.45, py = y - ry * (0.75 - Math.abs(r - 1) * 0.15);
            this.risse.push(linie);
            for (let i = 0; i < 7; i++) {
                linie.push({ x: px, y: py });
                px += (i % 2 ? 1 : -1) * rx * 0.13; py += ry * 0.09;
                this.wurzel.classList.add('ei-wackelt');
                await warte(110);
                this.wurzel.classList.remove('ei-wackelt');
            }
        }
        await warte(500);
        this.wurzel.classList.add('blitz');
        this.erzeugeScherben();
        this.risse = []; this.kreis = [];
        for (let i = 0; i < 60; i++) this.glitzer(x, y - ry * 0.3, 'licht');
        await warte(250);
        const arten = Object.keys(DRACHEN);
        const art = arten[Math.floor(Math.random() * arten.length)];
        this.drache = { bild: await lade(DRACHEN[art].bild), t0: performance.now() };
        this.wurzel.classList.remove('blitz');
        const sterne = staerke(this.z.zeit, MAGIE.sterne);
        this.melde(`${'⭐'.repeat(sterne)} ${DRACHEN[art].name}!`, true, true);
        this.gewonnen?.(art, sterne);
    }

    erzeugeScherben() {
        const { x, y, rx, ry } = this.ei;
        for (let i = 0; i < 9; i++) {
            const a = -Math.PI / 2 + (i - 4) * 0.35;
            this.scherben.push({ sx: x + Math.cos(a) * rx * 0.5, sy: y + Math.sin(a) * ry * 0.55, gr: rx * (0.35 + Math.random() * 0.2),
                vx: Math.cos(a) * (180 + Math.random() * 200), vy: Math.sin(a) * 260 - 120, dreh: (Math.random() - 0.5) * 8, w: 0, t: 0 });
        }
    }

    // ---------- Simulation + Teilchen ----------

    glitzer(x, y, art) {
        const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 160;
        this.teilchen.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leben: 0.4 + Math.random() * 0.5, art });
    }

    kreisPos(k, t) {
        const e = this.ei, w = k.w + t / 1000 * k.v;
        const p = { x: e.x + Math.cos(w) * e.rx * k.r, y: e.y + Math.sin(w) * e.ry * k.r * 0.8 };
        if (!k.von || k.f >= 1) return p;
        const f = Math.max(0, k.f), b = Math.sin(f * Math.PI) * e.ry * 0.8;   // im Bogen von der Figur
        return { x: k.von.x + (p.x - k.von.x) * f, y: k.von.y + (p.y - k.von.y) * f - b };
    }

    schritt(dt, t) {
        const e = this.ei, z = this.z;
        if (this.laeuft) {
            z.zeit += dt;
            // neue Schatten starten am Rand
            for (let i = neueSchatten(z, dt, MAGIE); i > 0; i--) {
                const a = Math.random() * Math.PI * 2, r = Math.max(this.w, this.h) * 0.6;
                const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r * 0.7;
                this.angreifer.push({ x, y, x0: x, y0: y, t: 0 });
            }
            // Funken fliegen nach und nach ins Ei
            for (let k = aufnehmen(z, dt, MAGIE); k > 0; k--) {
                const i = this.kreis.findIndex(q => q.f >= 1);
                if (i >= 0) { const p = this.kreisPos(this.kreis[i], t); this.kreis.splice(i, 1); this.teilchen.push({ x: p.x, y: p.y, vx: (e.x - p.x) * 2, vy: (e.y - p.y) * 2, leben: 0.5, art: 'funke' }); }
            }
            const s = stand(z, MAGIE);
            if (s !== 'laeuft') this.ende(s);
            this.zeige();
        }
        // Schatten fliegen zum Ei; am Ring: Treffer
        for (const a of this.angreifer) {
            a.t += dt / FLUG;
            const k = Math.min(1, a.t), ringK = 1 - (Math.max(e.rx, e.ry) * 1.4) / Math.max(this.w, this.h) / 0.6;
            a.x = a.x0 + (e.x - a.x0) * k; a.y = a.y0 + (e.y - a.y0) * k;
            if (k < ringK || a.weg) continue;
            a.weg = true;
            if (!this.laeuft) continue;
            if (treffer(z, MAGIE) === 'funke' && this.kreis.length) {
                let best = 0, bestD = Infinity;
                this.kreis.forEach((q, i) => { const p = this.kreisPos(q, t); const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bestD) { bestD = d; best = i; } });
                const p = this.kreisPos(this.kreis[best], t);
                this.kreis.splice(best, 1);
                for (let i = 0; i < 6; i++) this.glitzer(p.x, p.y, 'licht');
            } else {
                this.wurzel.classList.add('ei-wackelt');
                setTimeout(() => this.wurzel.classList.remove('ei-wackelt'), 300);
            }
            for (let i = 0; i < 5; i++) this.glitzer(a.x, a.y, 'puff');
        }
        this.angreifer = this.angreifer.filter(a => !a.weg);
        if (this.kreis.length > z.n) this.kreis.length = Math.max(0, z.n);
        for (const p of this.teilchen) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.leben -= dt; }
        this.teilchen = this.teilchen.filter(p => p.leben > 0);
        for (const s of this.scherben) { s.t += dt; s.vy += 600 * dt; s.sx += s.vx * dt; s.sy += s.vy * dt; s.w += s.dreh * dt; }
        this.scherben = this.scherben.filter(s => s.t < 2);
        this.zeichne(t);
    }

    zeichne(t) {
        const c = this.ctx, e = this.ei;
        c.clearRect(0, 0, this.w, this.h);
        if (this.figurBild) {
            const f = this.figurPlatz, hops = this.drache ? Math.abs(Math.sin(t / 180)) * 14 : Math.sin(t / 500) * 2;
            const breite = f.h * this.figurBild.width / this.figurBild.height;
            c.drawImage(this.figurBild, f.x - breite / 2, f.y - f.h - hops, breite, f.h);
        }
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(e.x, e.y, e.rx * 0.5, e.x, e.y, e.rx * 2);
        g.addColorStop(0, `rgba(255,210,120,${Math.min(0.5, 0.08 + this.z.warm / MAGIE.ziel * 0.4)})`);
        g.addColorStop(1, 'rgba(255,210,120,0)');
        c.fillStyle = g; c.beginPath(); c.arc(e.x, e.y, e.rx * 2, 0, Math.PI * 2); c.fill();
        // eigene Funken: groß und leuchtend, mit Schweif
        const gr = Math.max(14, e.rx * 0.16);
        for (const k of this.kreis) {
            if (k.f < 1) k.f = Math.min(1, k.f + 0.02);
            for (let s = 2; s >= 0; s--) {
                const p = this.kreisPos({ ...k, w: k.w - s * 0.08 / k.v }, t), m = gr * (1 - s * 0.25) * (0.85 + Math.sin(t / 150 + k.w * 7) * 0.15);
                c.globalAlpha = 1 - s * 0.3;
                c.drawImage(this.punkt.funke, p.x - m, p.y - m, m * 2, m * 2);
            }
        }
        c.globalAlpha = 1;
        for (const p of this.teilchen) {
            const m = (p.art === 'funke' ? gr : gr * 0.6) * Math.min(1, p.leben * 2);
            c.drawImage(this.punkt[p.art] || this.punkt.licht, p.x - m, p.y - m, m * 2, m * 2);
        }
        c.globalCompositeOperation = 'source-over';
        // Schatten: dunkle Wölkchen mit lila Rand
        for (const p of this.angreifer) {
            const r = gr * 0.9, gs = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            gs.addColorStop(0, 'rgba(40,20,70,0.95)'); gs.addColorStop(0.6, 'rgba(110,60,200,0.55)'); gs.addColorStop(1, 'rgba(110,60,200,0)');
            c.fillStyle = gs; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
        }
        for (const linie of this.risse) {
            if (linie.length < 2) continue;
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.strokeStyle = '#fff3b0'; c.lineWidth = 7; c.shadowColor = '#ffd27a'; c.shadowBlur = 18;
            c.beginPath(); linie.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
            c.shadowBlur = 0; c.strokeStyle = '#3a2410'; c.lineWidth = 2.5; c.stroke();
        }
        const b = this.hintergrund;
        for (const s of this.scherben) {
            c.save(); c.translate(s.sx, s.sy); c.rotate(s.w); c.globalAlpha = Math.max(0, 1 - s.t / 2);
            c.beginPath(); c.moveTo(-s.gr / 2, -s.gr / 2); c.lineTo(s.gr / 2, -s.gr / 3); c.lineTo(s.gr / 3, s.gr / 2); c.lineTo(-s.gr / 2, s.gr / 3); c.closePath();
            c.clip();
            if (b) c.drawImage(b, (e.x - e.ox) / e.k - 60, (e.y - e.oy) / e.k - 160, 120, 120, -s.gr / 2, -s.gr / 2, s.gr, s.gr);
            else { c.fillStyle = '#3f9a5a'; c.fill(); }
            c.restore();
        }
        if (this.drache?.bild) {
            const k = Math.min(1, (performance.now() - this.drache.t0) / 600);
            const d = e.ry * 2.6 * k * (1 + Math.sin(k * Math.PI) * 0.25), wipp = Math.sin(performance.now() / 400) * 4;
            c.save(); c.shadowColor = '#fff3b0'; c.shadowBlur = 40;
            c.drawImage(this.drache.bild, e.x - d / 2, e.y + e.ry * 0.9 - d + wipp, d, d);
            c.restore();
        }
    }

    beenden() {
        this.laeuft = false;
        this.antwort?.(-1);
        cancelAnimationFrame(this.lauf);
        removeEventListener('resize', this.groesse);
        clearTimeout(this.meldeZeit);
        this.wurzel.replaceChildren();
        this.wurzel.className = '';
    }
}
