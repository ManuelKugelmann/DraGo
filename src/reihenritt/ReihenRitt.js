// Reihen-Ritt (Grafik): Die eigene Figur fährt auf einem Funken-Brett endlos Hügel hinunter.
// Tippen = springen. Zahlen aus der Reihe einsammeln = mehr Zeit, falsche = weniger Zeit.
// Unterwegs Magie-Funken sammeln. Zeit 0 = Ritt vorbei.
import { neueReihe, naechsteZahl, neuerRitt, nimmZahl, ticke, reiheWechseln } from './regeln.js';
import { stufe } from '../magiestrom/stufen.js';
import { RITT, TEXTE } from '../daten.js';
import { leuchtPunkt } from '../ui/leuchtPunkt.js';

const H = 400;                                     // Welt-Einheiten: Bildschirmhöhe = 400
const G = 900, SPRUNG = 430, V_MIN = 170, V_MAX = 520, REIBUNG = 0.08, KLEBEN = 6;
const FIGUR_H = 74, KOPF = 30;                     // Figur-Höhe, Mitte der Figur über dem Brett
const ZAHL_R = 24, FUNKE_R = 14;
const REKORD = 'drago_ritt';
// Hügel: geht insgesamt bergab (y wächst nach unten), dazu Wellen
const boden = x => 0.32 * x + 42 * Math.sin(x / 170) + 20 * Math.sin(x / 63 + 1) + 70 * Math.sin(x / 430 + 2);
const steigung = x => 0.32 + 42 / 170 * Math.cos(x / 170) + 20 / 63 * Math.cos(x / 63 + 1) + 70 / 430 * Math.cos(x / 430 + 2);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const zufall = (a, b) => a + Math.random() * (b - a);

export default class ReihenRitt {
    constructor(wurzel, figurBild = null, alter = 9) {
        this.wurzel = wurzel;
        this.figurBild = figurBild;
        this.stufe = stufe(alter);
        this.leinwand = el('canvas', 'ritt-leinwand');
        this.ctx = this.leinwand.getContext('2d');
        this.reiheEl = el('div', 'ritt-reihe');
        this.uhr = el('div', 'ritt-uhr');
        const kopf = el('div', 'ritt-kopf');
        kopf.append(this.reiheEl, this.uhr);
        this.magieEl = el('div', 'ritt-magie');
        this.hinweis = el('div', 'ritt-hinweis');
        this.ende = el('div', 'ritt-ende');
        wurzel.append(this.leinwand, kopf, this.magieEl, this.hinweis, this.ende);
        this.punkt = { funke: leuchtPunkt('rgba(255,190,80,0.9)'), gut: leuchtPunkt('rgba(140,255,170,0.9)', 12),
            puff: leuchtPunkt('rgba(170,120,255,0.8)', 12), brett: leuchtPunkt('rgba(120,200,255,0.9)', 20) };
        this.sprung = e => { if (!e.target.closest('button')) this.springe(); };
        this.taste = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); this.springe(); } };
        wurzel.addEventListener('pointerdown', this.sprung);
        addEventListener('keydown', this.taste);
        this.groesse = this.groesse.bind(this);
        addEventListener('resize', this.groesse);
        this.groesse();
        this.starte();
        let alt = performance.now();
        const schleife = t => { this.schritt(Math.min(0.04, (t - alt) / 1000), t); alt = t; this.lauf = requestAnimationFrame(schleife); };
        this.lauf = requestAnimationFrame(schleife);
    }

    groesse() {
        const d = Math.min(2, devicePixelRatio);
        this.w = innerWidth; this.h = innerHeight;
        this.leinwand.width = this.w * d; this.leinwand.height = this.h * d;
        this.ctx.setTransform(d, 0, 0, d, 0, 0);
        this.s = this.h / H;
    }

    starte() {
        this.z = neuerRitt(RITT);
        this.reihe = neueReihe(this.stufe);
        this.fahrer = { x: 0, y: boden(0), vx: 250, vy: 0, amBoden: true, luft: 0, winkel: 0 };
        this.kam = { x: -this.w / this.s * 0.3, y: boden(0) - H * 0.55 };
        this.dinge = []; this.teilchen = []; this.texte = [];
        this.naechstesX = 500;
        this.laeuft = true;
        this.ende.classList.remove('zeigen');
        this.wurzel.classList.remove('vorbei');
        this.zeigeReihe();
        this.melde(TEXTE.ritt_tipp, 3000);
    }

    zeigeReihe() { this.reiheEl.textContent = this.reihe + TEXTE.ritt_reihe; }

    melde(text, ms = 1200) {
        this.hinweis.textContent = text;
        this.hinweis.classList.add('zeigen');
        clearTimeout(this.meldeZeit);
        this.meldeZeit = setTimeout(() => this.hinweis.classList.remove('zeigen'), ms);
    }

    springe() {
        const f = this.fahrer;
        if (!this.laeuft || f.luft > 0.12) return;   // kurz nach der Kante darf man noch springen
        f.vy = -SPRUNG;
        f.amBoden = false;
        f.luft = 1;
    }

    // ---------- Strecke: Zahlen und Magie-Funken vor dem Fahrer ----------

    fuelle() {
        const rechts = this.kam.x + this.w / this.s + 200;
        while (this.naechstesX < rechts) {
            const x = this.naechstesX, zahl = naechsteZahl(this.reihe, this.stufe, Math.random, RITT.richtig_anteil);
            const hoch = Math.random() < (zahl.richtig ? 0.45 : 0.2);
            this.dinge.push({ art: 'zahl', x, y: boden(x) - (hoch ? 118 : ZAHL_R + 4), ...zahl });
            // dazwischen manchmal eine Reihe Magie-Funken (am Boden oder im Bogen)
            if (Math.random() < 0.6) {
                const bogen = Math.random() < 0.4, x0 = x + 110;
                for (let i = 0; i < 5; i++) {
                    const fx = x0 + i * 30;
                    this.dinge.push({ art: 'funke', x: fx, y: boden(fx) - 30 - (bogen ? Math.sin(i / 4 * Math.PI) * 80 : 0) });
                }
            }
            this.naechstesX += zufall(330, 470);
        }
    }

    sammle(d) {
        d.weg = true;
        if (d.art === 'funke') {
            this.z.magie++;
            for (let i = 0; i < 4; i++) this.glitzer(d.x, d.y, 'funke');
            return;
        }
        nimmZahl(this.z, d, RITT);
        this.texte.push({ x: d.x, y: d.y - 30, text: d.richtig ? `+${RITT.plus} s` : `−${RITT.minus} s`, gut: d.richtig, t: 0 });
        for (let i = 0; i < 10; i++) this.glitzer(d.x, d.y, d.richtig ? 'gut' : 'puff');
        if (!d.richtig) {
            this.wurzel.classList.add('wackeln');
            setTimeout(() => this.wurzel.classList.remove('wackeln'), 300);
        } else if (reiheWechseln(this.z, RITT)) {
            // neue Reihe: Zahlen vor dem Fahrer verpuffen, dann kommen neue
            this.reihe = neueReihe(this.stufe, Math.random, this.reihe);
            for (const z of this.dinge) if (z.art === 'zahl' && z.x > this.fahrer.x && !z.weg) { z.weg = true; for (let i = 0; i < 4; i++) this.glitzer(z.x, z.y, 'puff'); }
            this.naechstesX = this.fahrer.x + this.w / this.s * 0.8;
            this.zeigeReihe();
            this.reiheEl.classList.remove('neu'); void this.reiheEl.offsetWidth; this.reiheEl.classList.add('neu');
            this.melde(`${TEXTE.ritt_neue_reihe} ${this.reihe}${TEXTE.ritt_reihe}`);
        }
    }

    glitzer(x, y, art) {
        const a = Math.random() * Math.PI * 2, v = zufall(40, 200);
        this.teilchen.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leben: zufall(0.3, 0.7), art });
    }

    vorbei() {
        this.laeuft = false;
        this.wurzel.classList.add('vorbei');
        const meter = Math.round(this.fahrer.x / 40);
        let rekord = 0;
        try { rekord = Number(localStorage.getItem(REKORD)) || 0; } catch { /* egal */ }
        const neu = this.z.magie > rekord;
        if (neu) try { localStorage.setItem(REKORD, String(this.z.magie)); } catch { /* egal */ }
        const knopf = el('button', 'ritt-nochmal', TEXTE.ritt_nochmal);
        knopf.onclick = () => this.starte();
        this.ende.replaceChildren(el('h2', '', TEXTE.ritt_ende), el('div', 'ritt-wert', `✨ ${this.z.magie}   ·   ${meter} m`),
            el('div', 'ritt-rekord', neu ? TEXTE.ritt_rekord : `⭐ ${rekord}`), knopf);
        this.ende.classList.add('zeigen');
    }

    // ---------- Simulation ----------

    schritt(dt, t) {
        const f = this.fahrer, z = this.z;
        if (this.laeuft && !ticke(z, dt)) this.vorbei();
        // Fahren: wie ein Ball, der am Hang klebt; über Kuppen hebt man ab
        f.vy += G * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        const gy = boden(f.x);
        if (f.y >= gy || (f.amBoden && gy - f.y < KLEBEN)) {
            const m = steigung(f.x), l = Math.hypot(1, m), tx = 1 / l, ty = m / l;
            let v = f.vx * tx + f.vy * ty;
            v -= v * REIBUNG * dt;
            v = this.laeuft ? Math.max(V_MIN, Math.min(V_MAX, v)) : Math.max(0, v - 260 * dt);
            f.vx = v * tx; f.vy = v * ty; f.y = gy;
            f.amBoden = true; f.luft = 0;
            f.winkel += (Math.atan(m) - f.winkel) * Math.min(1, dt * 14);
        } else {
            f.amBoden = false; f.luft += dt;
            f.winkel += (Math.atan2(f.vy, f.vx) * 0.6 - f.winkel) * Math.min(1, dt * 3);
        }
        // Kamera folgt (Fahrer links im Bild, etwas unter der Mitte)
        this.kam.x = f.x - this.w / this.s * 0.3;
        this.kam.y += (f.y - H * 0.58 - this.kam.y) * Math.min(1, dt * 4);
        // Einsammeln
        if (this.laeuft) {
            this.fuelle();
            const mx = f.x + Math.sin(f.winkel) * KOPF, my = f.y - Math.cos(f.winkel) * KOPF;
            for (const d of this.dinge) {
                if (d.weg || Math.abs(d.x - mx) > 60) continue;
                if (Math.hypot(d.x - mx, d.y - my) < (d.art === 'zahl' ? ZAHL_R : FUNKE_R) + 22) this.sammle(d);
            }
        }
        this.dinge = this.dinge.filter(d => !d.weg && d.x > this.kam.x - 100);
        for (const p of this.teilchen) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; p.leben -= dt; }
        this.teilchen = this.teilchen.filter(p => p.leben > 0);
        for (const x of this.texte) { x.t += dt; x.y -= 50 * dt; }
        this.texte = this.texte.filter(x => x.t < 1);
        // Anzeigen
        this.magieEl.textContent = '✨ ' + z.magie;
        this.uhr.style.setProperty('--wert', z.zeit / RITT.max);
        this.uhr.classList.toggle('knapp', z.zeit < 5);
        this.zeichne(t);
    }

    // ---------- Zeichnen ----------

    zeichne(t) {
        const c = this.ctx, s = this.s, k = this.kam, w = this.w, h = this.h;
        const sx = x => (x - k.x) * s, sy = y => (y - k.y) * s;
        // Himmel: warme Abendstimmung
        const himmel = c.createLinearGradient(0, 0, 0, h);
        himmel.addColorStop(0, '#5b4a9e'); himmel.addColorStop(0.55, '#e59a8a'); himmel.addColorStop(1, '#ffd3a1');
        c.fillStyle = himmel; c.fillRect(0, 0, w, h);
        c.fillStyle = '#fff4d6'; c.globalAlpha = 0.9;
        c.beginPath(); c.arc(w * 0.75, h * 0.3, h * 0.09, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        // Berge weit hinten (bewegen sich langsamer)
        for (const [tiefe, farbe, hoehe] of [[0.08, '#8a6aa8', 0.45], [0.2, '#a87aa0', 0.58]]) {
            c.fillStyle = farbe; c.beginPath(); c.moveTo(0, h);
            for (let x = 0; x <= w + 8; x += 8) {
                const wx = x / s + k.x * tiefe;
                c.lineTo(x, h * hoehe - (Math.sin(wx / 90) * 30 + Math.sin(wx / 37 + 1) * 12 + Math.abs(Math.sin(wx / 160)) * 50) * s);
            }
            c.lineTo(w, h); c.fill();
        }
        // Boden (Hügel)
        const bodenFarbe = c.createLinearGradient(0, 0, 0, h);
        bodenFarbe.addColorStop(0, '#fff6ec'); bodenFarbe.addColorStop(1, '#e8c7d2');
        c.fillStyle = bodenFarbe; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w + 6; x += 6) c.lineTo(x, sy(boden(k.x + x / s)));
        c.lineTo(w, h); c.closePath(); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath();
        for (let x = 0; x <= w + 6; x += 6) c[x ? 'lineTo' : 'moveTo'](x, sy(boden(k.x + x / s)));
        c.stroke();
        // Funken und Zahlen
        c.globalCompositeOperation = 'lighter';
        for (const d of this.dinge) if (d.art === 'funke') {
            const m = FUNKE_R * s * (1.6 + Math.sin(t / 150 + d.x) * 0.2);
            c.drawImage(this.punkt.funke, sx(d.x) - m, sy(d.y) - m, m * 2, m * 2);
        }
        c.globalCompositeOperation = 'source-over';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        for (const d of this.dinge) if (d.art === 'zahl') {
            const x = sx(d.x), y = sy(d.y + Math.sin(t / 300 + d.x) * 4), r = ZAHL_R * s;
            const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#9fd0ff'); g.addColorStop(1, '#3b6fd9');
            c.fillStyle = g; c.shadowColor = '#bfe2ff'; c.shadowBlur = 14;
            c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
            c.shadowBlur = 0; c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.stroke();
            c.fillStyle = '#1d2a5a'; c.font = `bold ${r * (String(d.wert).length > 2 ? 0.8 : 1)}px system-ui, sans-serif`;
            c.fillText(d.wert, x, y + 1);
        }
        this.zeichneFahrer(c, sx(this.fahrer.x), sy(this.fahrer.y), s, t);
        // Teilchen und +/− Zeit
        c.globalCompositeOperation = 'lighter';
        for (const p of this.teilchen) {
            const m = 12 * s * Math.min(1, p.leben * 2);
            c.drawImage(this.punkt[p.art], sx(p.x) - m, sy(p.y) - m, m * 2, m * 2);
        }
        c.globalCompositeOperation = 'source-over';
        c.font = `bold ${22 * s}px system-ui, sans-serif`; c.lineWidth = 5; c.strokeStyle = '#24122f';
        for (const x of this.texte) {
            c.globalAlpha = 1 - x.t;
            c.strokeText(x.text, sx(x.x), sy(x.y)); c.fillStyle = x.gut ? '#9dffb0' : '#d8b8ff'; c.fillText(x.text, sx(x.x), sy(x.y));
        }
        c.globalAlpha = 1;
    }

    zeichneFahrer(c, x, y, s, t) {
        const f = this.fahrer;
        c.save(); c.translate(x, y); c.rotate(f.winkel);
        // Funken-Brett: leuchtet, Schweif hinten
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
            const m = (14 - i * 2) * s;
            c.globalAlpha = 0.7 - i * 0.1;
            c.drawImage(this.punkt.brett, -i * 12 * s - 18 * s - m, -3 * s - m + Math.sin(t / 60 + i) * 2 * s, m * 2, m * 2);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#6fc3ff'; c.strokeStyle = '#ffffff'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(-26 * s, -7 * s, 52 * s, 7 * s, 4 * s); c.fill(); c.stroke();
        const b = this.figurBild, fh = FIGUR_H * s;
        if (b) { const fb = fh * b.width / b.height; c.drawImage(b, -fb / 2, -fh - 4 * s, fb, fh); }
        else { c.fillStyle = '#ffb347'; c.beginPath(); c.arc(0, -KOPF * s, 16 * s, 0, Math.PI * 2); c.fill(); }
        c.restore();
    }

    beenden() {
        this.laeuft = false;
        cancelAnimationFrame(this.lauf);
        removeEventListener('resize', this.groesse);
        removeEventListener('keydown', this.taste);
        this.wurzel.removeEventListener('pointerdown', this.sprung);
        clearTimeout(this.meldeZeit);
        this.wurzel.replaceChildren();
        this.wurzel.className = '';
    }
}
