// Magiestrom-Spiel: eigene Funken kreisen um das Ei und wehren Schatten-Funken ab, die von außen kommen.
// Jeder Treffer löscht einen eigenen und einen Schatten-Funken (Glitzer). Die übrigen eigenen Funken
// fliegen ins Ei und wärmen es. Ist es warm genug: Risse, aufbrechen, ein zufälliger Babydrache.
// Die eigene Spielfigur steht neben dem Ei.
import { zufallsTor, nachTor, schatten, nachSchatten, staerke } from './regeln.js';
import { MAGIE, VOKABELN, TEXTE, DRACHEN } from '../daten.js';

const warte = ms => new Promise(r => setTimeout(r, ms));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const BILD = { w: 1344, h: 768, ei: { x: 685, y: 480, rx: 150, ry: 185 } };   // Ei im Hintergrundbild (Pixel)
const MAX_KREIS = 150;   // so viele eigene Funken werden höchstens gezeichnet
const lade = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

export default class MagieStrom {
    constructor(wurzel, figurBild = null) {
        this.wurzel = wurzel;
        this.figurBild = figurBild;   // Bild der eigenen Spielfigur (oder null)
        this.leinwand = el('canvas', 'magie-leinwand');
        this.ctx = this.leinwand.getContext('2d');
        this.anzeige = el('div', 'magie-zahl');
        this.waerme = el('div', 'magie-waerme');
        this.balken = el('div', 'magie-balken');
        this.waerme.append(el('span', '', '🔥'), this.balken);
        this.tor = el('div', 'magie-tor');
        this.hinweis = el('div', 'magie-hinweis');
        wurzel.append(this.leinwand, this.waerme, this.anzeige, this.tor, this.hinweis);
        this.teilchen = [];      // Glitzer {x,y,vx,vy,leben,art}
        this.kreis = [];         // eigene Funken im Orbit {w, r, v}
        this.angreifer = [];     // Schatten-Funken, die angreifen {x,y,v}
        this.lauernd = [];       // Schatten am Rand, die warten
        this.risse = [];
        this.scherben = [];
        this.drache = null;
        this.n = MAGIE.start;
        this.s = schatten(0, MAGIE.schatten_start, MAGIE.schatten_plus);
        this.passeKreis();
        lade('img/splash.webp').then(b => { this.hintergrund = b; });
        this.groesse = this.groesse.bind(this);
        addEventListener('resize', this.groesse);
        this.groesse();
        let alt = performance.now();
        const schleife = t => { this.schritt(Math.min(0.05, (t - alt) / 1000), t); alt = t; this.lauf = requestAnimationFrame(schleife); };
        this.lauf = requestAnimationFrame(schleife);
    }

    groesse() {
        const d = Math.min(2, devicePixelRatio);
        this.w = innerWidth; this.h = innerHeight;
        this.leinwand.width = this.w * d; this.leinwand.height = this.h * d;
        this.ctx.setTransform(d, 0, 0, d, 0, 0);
        // Hintergrund ist "cover": Ei-Position im Bild auf den Bildschirm umrechnen
        const k = Math.max(this.w / BILD.w, this.h / BILD.h);
        const ox = (this.w - BILD.w * k) / 2, oy = (this.h - BILD.h * k) / 2;
        this.ei = { x: ox + BILD.ei.x * k, y: oy + BILD.ei.y * k, rx: BILD.ei.rx * k, ry: BILD.ei.ry * k, k, ox, oy };
        this.figurPlatz = { x: this.ei.x - this.ei.rx * 2.4, y: this.ei.y + this.ei.ry * 1.05, h: this.ei.ry * 2 };
    }

    // ---------- Spielablauf ----------

    async spielen() {
        this.warm = 0;
        this.startZeit = performance.now();
        this.zeigeZahl(); this.zeigeWaerme();
        for (let runde = 0; this.warm < MAGIE.ziel; runde++) {
            this.s = schatten(runde, MAGIE.schatten_start, MAGIE.schatten_plus);
            this.lauernd = Array.from({ length: Math.min(40, this.s) }, () => this.randPunkt());
            this.zeigeZahl();
            const tor = zufallsTor(this.n, VOKABELN);
            const wahl = await this.frage(tor);
            const gut = wahl === tor.richtig;
            this.n = nachTor(tor, wahl, this.n, MAGIE.bonus);
            this.passeKreis();
            this.zeigeZahl();
            this.melde(gut ? TEXTE.magie_richtig : (tor.art === 'schaetzen' ? TEXTE.magie_naja : TEXTE.magie_falsch), gut);
            await warte(700);

            // Schatten greifen an; jeder Treffer löscht einen eigenen Funken
            const erg = nachSchatten(this.n, this.s, MAGIE.start);
            this.angreifer = this.lauernd.map(p => ({ ...p, v: 120 + Math.random() * 90 }));
            this.lauernd = [];
            this.zuLoeschen = erg.geloescht;
            await warte(2200);
            this.angreifer = [];
            this.n = erg.uebrig;
            this.passeKreis();
            this.zeigeZahl();

            if (erg.uebrig > 0) {
                this.insEi = true;            // übrige Funken fliegen ins Ei
                await warte(900);
                this.insEi = false;
                this.warm += erg.uebrig;
                this.zeigeWaerme();
                this.wurzel.classList.add('ei-wackelt');
                await warte(500);
                this.wurzel.classList.remove('ei-wackelt');
            } else {
                this.melde(TEXTE.magie_neu, true);
            }
            this.n = erg.weiter;
            this.passeKreis();
            this.zeigeZahl();
        }
        await this.schluepfen();
    }

    /** So viele Funken kreisen sichtbar um das Ei, wie man hat (gedeckelt). */
    passeKreis() {
        const soll = Math.min(MAX_KREIS, this.n);
        // Neue Funken kommen von der Spielfigur angeflogen (f: 0 -> 1)
        const von = this.figurPlatz ? { x: this.figurPlatz.x + this.figurPlatz.h * 0.15, y: this.figurPlatz.y - this.figurPlatz.h * 0.55 } : null;
        while (this.kreis.length < soll) {
            this.kreis.push({ w: Math.random() * Math.PI * 2, r: 1.25 + Math.random() * 0.45, v: 0.8 + Math.random() * 1.2,
                von, f: von ? -this.kreis.length * 0.02 % 0.6 : 1 });
        }
        if (this.kreis.length > soll) this.kreis.length = soll;
    }

    randPunkt() {
        const a = Math.random() * Math.PI * 2, r = Math.max(this.w, this.h) * 0.55;
        return { x: this.ei.x + Math.cos(a) * r, y: this.ei.y + Math.sin(a) * r * 0.7 };
    }

    zeigeZahl() { this.anzeige.textContent = '✨ ' + this.n + '   🌑 ' + this.s; }
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

    melde(text, gut, bleibt = false) {
        this.hinweis.textContent = text;
        this.hinweis.className = 'magie-hinweis zeigen ' + (gut ? 'gut' : 'naja') + (bleibt ? ' gross' : '');
        clearTimeout(this.meldeZeit);
        if (!bleibt) this.meldeZeit = setTimeout(() => this.hinweis.classList.remove('zeigen'), 1000);
    }

    // ---------- Schlüpfen: Risse -> aufbrechen -> Babydrache ----------

    async schluepfen() {
        this.tor.classList.remove('offen');
        this.lauernd = [];
        const { x, y, rx, ry } = this.ei;
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
        this.risse = [];
        this.kreis = [];
        for (let i = 0; i < 60; i++) this.glitzer(x, y - ry * 0.3, 'licht');
        await warte(250);
        const arten = Object.keys(DRACHEN);
        const art = arten[Math.floor(Math.random() * arten.length)];
        const bild = await lade(DRACHEN[art].bild);
        this.drache = { bild, t0: performance.now() };
        this.wurzel.classList.remove('blitz');
        const sterne = staerke((performance.now() - this.startZeit) / 1000, MAGIE.sterne);
        this.melde(`${'⭐'.repeat(sterne)} ${DRACHEN[art].name}!`, true, true);
        this.gewonnen?.(art, sterne);
    }

    erzeugeScherben() {
        const { x, y, rx, ry } = this.ei;
        for (let i = 0; i < 9; i++) {
            const a = -Math.PI / 2 + (i - 4) * 0.35;
            this.scherben.push({
                sx: x + Math.cos(a) * rx * 0.5, sy: y + Math.sin(a) * ry * 0.55, gr: rx * (0.35 + Math.random() * 0.2),
                vx: Math.cos(a) * (180 + Math.random() * 200), vy: Math.sin(a) * 260 - 120, dreh: (Math.random() - 0.5) * 8, w: 0, t: 0
            });
        }
    }

    // ---------- Teilchen ----------

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
        const e = this.ei;
        // Schatten fliegen aufs Ei zu; am Funken-Ring treffen sie einen eigenen Funken
        for (const a of this.angreifer) {
            const dx = e.x - a.x, dy = e.y - a.y, l = Math.hypot(dx, dy) || 1;
            a.x += dx / l * a.v * dt; a.y += dy / l * a.v * dt;
            if (a.weg || l > Math.max(e.rx, e.ry) * 1.45) continue;
            a.weg = true;
            if (this.zuLoeschen > 0 && this.kreis.length) {
                this.zuLoeschen--;
                let best = 0, bestD = Infinity;
                this.kreis.forEach((k, i) => { const p = this.kreisPos(k, t); const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bestD) { bestD = d; best = i; } });
                const p = this.kreisPos(this.kreis[best], t);
                this.kreis.splice(best, 1);
                for (let i = 0; i < 6; i++) this.glitzer(p.x, p.y, 'licht');
            }
            for (let i = 0; i < 5; i++) this.glitzer(a.x, a.y, 'puff');
        }
        this.angreifer = this.angreifer.filter(a => !a.weg);
        for (const p of this.lauernd) { p.x += Math.sin(t / 700 + p.y) * 10 * dt; p.y += Math.cos(t / 900 + p.x) * 10 * dt; }
        for (const p of this.teilchen) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.leben -= dt; }
        this.teilchen = this.teilchen.filter(p => p.leben > 0);
        for (const s of this.scherben) { s.t += dt; s.vy += 600 * dt; s.sx += s.vx * dt; s.sy += s.vy * dt; s.w += s.dreh * dt; }
        this.scherben = this.scherben.filter(s => s.t < 2);
        this.zeichne(t);
    }

    zeichne(t) {
        const c = this.ctx, e = this.ei;
        c.clearRect(0, 0, this.w, this.h);
        // Spielfigur neben dem Ei (hüpft vor Freude beim Schlüpfen)
        if (this.figurBild) {
            const f = this.figurPlatz, hops = this.drache ? Math.abs(Math.sin(t / 180)) * 14 : Math.sin(t / 500) * 2;
            const breite = f.h * this.figurBild.width / this.figurBild.height;
            c.drawImage(this.figurBild, f.x - breite / 2, f.y - f.h - hops, breite, f.h);
        }
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(e.x, e.y, e.rx * 0.5, e.x, e.y, e.rx * 2);
        g.addColorStop(0, `rgba(255,210,120,${Math.min(0.45, 0.1 + this.kreis.length / 200)})`);
        g.addColorStop(1, 'rgba(255,210,120,0)');
        c.fillStyle = g; c.beginPath(); c.arc(e.x, e.y, e.rx * 2, 0, Math.PI * 2); c.fill();
        // eigene Funken im Orbit mit kurzem Schweif; beim Wärmen fliegen sie ins Ei
        for (const k of this.kreis) {
            if (k.f < 1) k.f = Math.min(1, k.f + 0.025);
            if (this.insEi) k.r = Math.max(0.1, k.r - 0.03);
            else if (k.r < 1.25) k.r += 0.01;
            for (let s = 0; s < 3; s++) {
                const p = this.kreisPos({ ...k, w: k.w - s * 0.06 / k.v }, t);
                c.fillStyle = `rgba(255,200,90,${1 - s * 0.3})`;
                c.beginPath(); c.arc(p.x, p.y, 3.4 - s, 0, Math.PI * 2); c.fill();
            }
        }
        for (const p of this.teilchen) {
            c.fillStyle = p.art === 'puff' ? `rgba(200,170,255,${p.leben * 2})` : `rgba(255,255,255,${Math.min(1, p.leben * 3)})`;
            c.beginPath(); c.arc(p.x, p.y, p.art === 'puff' ? 4 : 2, 0, Math.PI * 2); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        // Schatten-Funken: dunkle Wölkchen mit lila Rand
        for (const p of [...this.lauernd, ...this.angreifer]) {
            const gs = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
            gs.addColorStop(0, 'rgba(40,20,70,0.95)'); gs.addColorStop(0.6, 'rgba(110,60,200,0.6)'); gs.addColorStop(1, 'rgba(110,60,200,0)');
            c.fillStyle = gs; c.beginPath(); c.arc(p.x, p.y, 12, 0, Math.PI * 2); c.fill();
        }
        // Risse mit Licht dahinter
        for (const linie of this.risse) {
            if (linie.length < 2) continue;
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.strokeStyle = '#fff3b0'; c.lineWidth = 7; c.shadowColor = '#ffd27a'; c.shadowBlur = 18;
            c.beginPath(); linie.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
            c.shadowBlur = 0; c.strokeStyle = '#3a2410'; c.lineWidth = 2.5; c.stroke();
        }
        // Schalen-Stücke (aus dem Hintergrundbild ausgeschnitten)
        const b = this.hintergrund;
        for (const s of this.scherben) {
            c.save(); c.translate(s.sx, s.sy); c.rotate(s.w); c.globalAlpha = Math.max(0, 1 - s.t / 2);
            c.beginPath(); c.moveTo(-s.gr / 2, -s.gr / 2); c.lineTo(s.gr / 2, -s.gr / 3); c.lineTo(s.gr / 3, s.gr / 2); c.lineTo(-s.gr / 2, s.gr / 3); c.closePath();
            c.clip();
            if (b) c.drawImage(b, (e.x - e.ox) / e.k - 60, (e.y - e.oy) / e.k - 160, 120, 120, -s.gr / 2, -s.gr / 2, s.gr, s.gr);
            else { c.fillStyle = '#3f9a5a'; c.fill(); }
            c.restore();
        }
        // Babydrache hüpft aus dem Ei
        if (this.drache?.bild) {
            const k = Math.min(1, (performance.now() - this.drache.t0) / 600);
            const gr = e.ry * 2.6 * k * (1 + Math.sin(k * Math.PI) * 0.25), wipp = Math.sin(performance.now() / 400) * 4;
            c.save();
            c.shadowColor = '#fff3b0'; c.shadowBlur = 40;
            c.drawImage(this.drache.bild, e.x - gr / 2, e.y + e.ry * 0.9 - gr + wipp, gr, gr);
            c.restore();
        }
    }

    beenden() {
        cancelAnimationFrame(this.lauf);
        removeEventListener('resize', this.groesse);
        clearTimeout(this.meldeZeit);
        this.wurzel.replaceChildren();
        this.wurzel.className = '';
    }
}
