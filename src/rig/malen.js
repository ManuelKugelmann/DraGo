// Teile malen: Dreifarb-Licht, Randlicht, Kontaktschatten, Umrisslinie nur außen.
import { neuerPfad, huelle } from './geometrie.js';
import { mische, rgba } from './farben.js';

/** Licht-Richtung im Bild (Winkel in Grad, 0 = von rechts, 270 = von oben). */
export function licht(grad) {
    const a = grad * Math.PI / 180, hoch = 0.9;
    const ux = Math.cos(a), uy = Math.sin(a);
    return { ux, uy, x: ux * Math.cos(hoch), y: uy * Math.cos(hoch), z: Math.sin(hoch) };
}

function ton(pal, L, nx, ny, nz) {
    const t = 0.3 + 0.7 * Math.max(0, nx * L.x + ny * L.y + nz * L.z);
    return t < 0.5 ? mische(pal.d, pal.b, t * 2) : mische(pal.b, pal.l, (t - 0.5) * 2);
}

/** Mittelstück eines Streifens: Mitte, Quer-Richtung, halbe Breite. */
function streifenRahmen(p) {
    const s = p.sm, mi = s.length >> 1, m = s[mi], a = s[Math.max(0, mi - 1)], b = s[Math.min(s.length - 1, mi + 1)];
    let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    let mw = 0; for (const q of s) mw = Math.max(mw, q.w);
    return { m, px: -dy, py: dx, w: mw / 2 };
}

/** Füllung mit Schattierung aus einer gedachten Rundung (Rohr, Kugel, Zylinder). */
function fuelle(c, p, L, zeit) {
    const bb = huelle(p), W2 = bb.x1 - bb.x0 + 8, H2 = bb.y1 - bb.y0 + 8;
    const rechteck = () => c.fillRect(bb.x0 - 4, bb.y0 - 4, W2, H2);
    if (p.form === 'streifen') {
        const f = streifenRahmen(p);
        const g = c.createLinearGradient(f.m.x - f.px * f.w, f.m.y - f.py * f.w, f.m.x + f.px * f.w, f.m.y + f.py * f.w);
        for (let i = 0; i <= 8; i++) { const u = i / 4 - 1; g.addColorStop(i / 8, ton(p.pal, L, f.px * u, f.py * u, Math.sqrt(Math.max(0, 1 - u * u)))); }
        c.fillStyle = g; rechteck();
    } else if (p.form === 'ellipse') {
        c.save(); c.translate(p.cx, p.cy); c.rotate(p.rot); c.scale(1, p.ry / p.rx);
        const cr = Math.cos(-p.rot), sr = Math.sin(-p.rot);
        const lx = L.ux * cr - L.uy * sr, ly = (L.ux * sr + L.uy * cr) * p.rx / p.ry, q = p.rx;
        const g = c.createRadialGradient(lx * q * 0.42, ly * q * 0.42, q * 0.05, lx * q * 0.1, ly * q * 0.1, q * 1.25);
        g.addColorStop(0, p.pal.l); g.addColorStop(0.45, p.pal.b); g.addColorStop(1, p.pal.d);
        c.fillStyle = g; c.fillRect(-q * 2, -q * 2, q * 4, q * 4); c.restore();
    } else if (p.spalten) {
        // Stoff: Falten-Bahnen mit eigenem Winkel
        const K = p.spalten.length, R = p.spalten[0].length;
        c.fillStyle = p.pal.b; rechteck();
        for (let k = 0; k < K - 1; k++) {
            const A = p.spalten[k], B = p.spalten[k + 1];
            const neig = ((A[R - 1].x + B[R - 1].x) - (A[0].x + B[0].x)) * 0.5 / (Math.abs(A[R - 1].y - A[0].y) + 1);
            const a = ((k + 0.5) / (K - 1) - 0.5) * 1.5 + 0.28 * Math.sin(zeit * 1.8 + k * 1.7) + neig * 1.1;
            c.beginPath();
            A.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
            for (let i = R - 1; i >= 0; i--) c.lineTo(B[i].x, B[i].y);
            c.closePath();
            c.fillStyle = ton(p.pal, L, Math.sin(a), -0.15, Math.cos(a)); c.fill();
            c.strokeStyle = c.fillStyle; c.lineWidth = 1; c.stroke();
        }
    } else if (p.zylinder) {
        const g = c.createLinearGradient(bb.x0, 0, bb.x1, 0);
        for (let i = 0; i <= 8; i++) { const u = i / 4 - 1; g.addColorStop(i / 8, ton(p.pal, L, u, 0, Math.sqrt(Math.max(0, 1 - u * u)))); }
        c.fillStyle = g; rechteck();
    } else {
        const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, r = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
        const g = c.createLinearGradient(cx + L.ux * r, cy + L.uy * r, cx - L.ux * r, cy - L.uy * r);
        g.addColorStop(0, p.pal.l); g.addColorStop(0.5, p.pal.b); g.addColorStop(1, p.pal.d);
        c.fillStyle = g; rechteck();
    }
}

/** Ein Teil fertig malen: Füllung, Gelenk-Übergang, Licht- und Schattenkante, feine Linie. */
export function malTeil(c, p, L, zeit) {
    c.save();
    c.globalAlpha = p.alpha ?? 1;
    neuerPfad(c, p); c.save(); c.clip(); fuelle(c, p, L, zeit);
    c.lineJoin = 'round';
    if (p.gelenk && p.roh) {
        const r = p.roh, dx = r[1].x - r[0].x, dy = r[1].y - r[0].y, d = Math.hypot(dx, dy) || 1, bb = huelle(p);
        const g = c.createLinearGradient(r[0].x, r[0].y, r[0].x + dx / d * p.gelenk.s, r[0].y + dy / d * p.gelenk.s);
        g.addColorStop(0, rgba(p.gelenk.c, 0.9)); g.addColorStop(1, rgba(p.gelenk.c, 0));
        c.fillStyle = g; c.fillRect(bb.x0 - 4, bb.y0 - 4, bb.x1 - bb.x0 + 8, bb.y1 - bb.y0 + 8);
    }
    const kante = (dx, dy, farbe, a, w) => {
        c.save(); c.translate(dx, dy); neuerPfad(c, p); c.globalAlpha *= a; c.strokeStyle = farbe; c.lineWidth = w; c.stroke(); c.restore();
    };
    kante(-L.ux * 3.1, -L.uy * 3.1, p.pal.l, 0.55, 5);
    kante(L.ux * 4.2, L.uy * 4.2, p.pal.d, 0.4, 7);
    if (p.form === 'streifen') {
        for (const f of [0.3, 0.62]) {
            c.beginPath();
            p.L.forEach((q, i) => { const x = q.x * (1 - f) + p.R[i].x * f, y = q.y * (1 - f) + p.R[i].y * f; i ? c.lineTo(x, y) : c.moveTo(x, y); });
            c.save(); c.globalAlpha *= 0.35; c.strokeStyle = p.pal.l; c.lineWidth = 1.1; c.stroke(); c.restore();
        }
    }
    c.restore();
    neuerPfad(c, p); c.lineWidth = 1.3; c.strokeStyle = 'rgba(18,12,28,.85)'; c.stroke();
    c.restore();
}

const WIRFT = new Set(['armL', 'armR', 'kopf', 'stirn', 'mantelVornL', 'mantelVornR']);

/** Weicher Schatten, den ein Teil auf das Darunterliegende wirft (nur innerhalb der Figur). */
export function kontaktSchatten(c, p, L) {
    if (!WIRFT.has(p.id) || (p.alpha ?? 1) < 0.999) return;
    c.save(); c.globalCompositeOperation = 'source-atop'; c.translate(-L.ux * 3.2, -L.uy * 3.2);
    neuerPfad(c, p); c.fillStyle = 'rgba(20,12,40,.16)'; c.fill();
    c.lineJoin = 'round'; c.strokeStyle = 'rgba(20,12,40,.08)'; c.lineWidth = 7; c.stroke();
    c.restore();
}

/** Umrisslinie: alle Teile dick in Dunkel, die Füllungen danach decken die inneren Linien zu. */
export function umrissLinie(c, teile, dicke) {
    c.save(); c.lineJoin = 'round'; c.lineWidth = dicke * 2; c.strokeStyle = '#2a1a24'; c.fillStyle = '#2a1a24';
    for (const p of teile) {
        if ((p.alpha ?? 1) < 0.5) continue;
        neuerPfad(c, p); c.stroke(); c.fill();
    }
    c.restore();
}
