// Gesicht der Puppe (Canvas 2D): Anime-Augen mit Blinzeln und Blick, Nase, Mund-Formen.
import { klemme } from './geometrie.js';

/** Mund-Formen: w = Breite, open = offen, curve = Lächeln, round = rund, eo/es = Augen auf/lächeln. */
export const MUENDER = {
    laecheln: { w: 1, open: 0, curve: 0.9, round: 0, eo: 0.95, es: 0.55 },
    ruhig: { w: 0.8, open: 0, curve: 0.1, round: 0, eo: 1, es: 0 },
    jubel: { w: 0.95, open: 0.85, curve: 0.25, round: 0.2, eo: 1.05, es: 0.1 },
    oh: { w: 0.5, open: 0.7, curve: 0, round: 1, eo: 1.12, es: 0 }
};

function auge(c, e) {
    c.save(); c.globalAlpha = e.alpha; c.translate(e.x, e.y); c.scale(e.s, e.s);
    const o = Math.max(0, e.open), oy = -15.5 * o + 1.2, uy = 1 + 10 * Math.min(1, o * 1.5) * (1 - 0.4 * e.smile);
    const oeffnung = () => {
        c.beginPath(); c.moveTo(-6.6, 0.6); c.quadraticCurveTo(0, oy, 6.6, 0.6); c.quadraticCurveTo(0, uy, -6.6, 0.6); c.closePath();
    };
    const ix = e.lookx * 2.6, iy = e.looky * 2.4 + 0.6;
    oeffnung(); c.save(); c.clip(); c.fillStyle = '#fffaf0'; c.fillRect(-8, -10, 16, 22);
    const g = c.createLinearGradient(0, iy - 7, 0, iy + 7);
    g.addColorStop(0, '#1f3d6b'); g.addColorStop(0.6, '#3f86c2'); g.addColorStop(1, '#8fd6e8');
    c.beginPath(); c.ellipse(ix, iy, 4.8, 7, 0, 0, 7); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(ix, iy + 0.2, 2, 3.4, 0, 0, 7); c.fillStyle = '#0b1226'; c.fill();
    c.beginPath(); c.arc(ix - 1.6, iy - 2.8, 1.5, 0, 7); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(ix + 1.8, iy + 2.6, 0.8, 0, 7); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
    c.beginPath(); c.moveTo(-6.6, 0.6); c.quadraticCurveTo(0, oy, 6.6, 0.6); c.lineWidth = 4; c.strokeStyle = 'rgba(20,10,30,.28)'; c.stroke();
    c.restore();
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6.6, 0.6); c.quadraticCurveTo(0, oy, 6.6, 0.6); c.lineWidth = 2.2; c.strokeStyle = '#1a1020'; c.stroke();
    c.beginPath(); c.moveTo(e.seite * 6.6, 0.6); c.lineTo(e.seite * 8.8, -1.4); c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.moveTo(-6.6, 0.6); c.quadraticCurveTo(0, uy, 6.6, 0.6); c.lineWidth = 0.9; c.strokeStyle = 'rgba(107,74,69,.6)'; c.stroke();
    c.restore();
}

function nase(c, n, haut) {
    c.save(); c.strokeStyle = 'rgba(150,95,70,.85)'; c.lineWidth = 1.2; c.lineCap = 'round';
    c.globalAlpha = n.alpha * (1 - n.prot * 0.9);
    c.beginPath(); c.arc(n.x, n.y, 1.7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    if (n.ay > 0.15) {
        c.globalAlpha = n.alpha * (1 - n.prot) * Math.min(1, n.ay * 2);
        c.beginPath(); c.moveTo(n.x + n.sign * 1.8, n.y - 5); c.lineTo(n.x + n.sign * 0.3, n.y - 0.6); c.stroke();
    }
    c.restore();
    if (n.prot <= 0.02) return;
    // Im Profil: Nase steht über den Kopf-Rand hinaus
    c.save(); c.globalAlpha = n.alpha * Math.min(1, n.prot * 1.6);
    const e = n.rand, sg = n.sign, pr = n.prot, y = n.y;
    const form = () => {
        c.beginPath(); c.moveTo(e, y - 6.5);
        c.quadraticCurveTo(e + sg * 3.4 * pr, y - 2.4, e + sg * 6.4 * pr, y + 1.5);
        c.quadraticCurveTo(e + sg * 3.8 * pr, y + 3.8, e - sg * 0.5, y + 3.6);
    };
    form(); c.closePath(); c.fillStyle = haut.b; c.fill();
    form(); c.lineWidth = 1.1; c.lineCap = 'round'; c.strokeStyle = 'rgba(30,18,24,.85)'; c.stroke();
    c.beginPath(); c.arc(e + sg * 3.6 * pr, y + 2.2, 0.8, 0, 7); c.fillStyle = 'rgba(120,60,50,.55)'; c.fill();
    c.restore();
}

function mundForm(m) {
    const hw = 7 * m.w * m.ws * (1 - 0.5 * m.round), cy1 = m.y - m.curve * 1.8;
    return { hw, cy1, top: m.y + m.curve * 3.2 * (1 - 0.5 * m.open), bot: m.y + m.open * 12 + m.curve * 1.5 };
}
function mundPfad(c, m) {
    const g = mundForm(m);
    c.beginPath(); c.moveTo(m.x - g.hw, g.cy1); c.quadraticCurveTo(m.x, g.top * 2 - g.cy1, m.x + g.hw, g.cy1);
    if (m.open > 0.04) { c.quadraticCurveTo(m.x, g.bot * 2 - g.cy1, m.x - g.hw, g.cy1); c.closePath(); }
}
function mund(c, m) {
    c.save(); c.globalAlpha = m.alpha; c.lineCap = 'round'; c.lineJoin = 'round';
    mundPfad(c, m);
    if (m.open > 0.04) {
        const g = mundForm(m);
        c.fillStyle = '#5a1e2a'; c.fill();
        c.save(); mundPfad(c, m); c.clip();
        c.beginPath(); c.ellipse(m.x, g.bot - 1.5, g.hw * 0.7, 2.6 + m.open * 2, 0, 0, 7); c.fillStyle = '#e86a7a'; c.fill();
        c.fillStyle = '#fffaf0'; c.fillRect(m.x - g.hw, g.top - 1, g.hw * 2, Math.min(2.6, m.open * 5));
        c.restore();
        mundPfad(c, m); c.strokeStyle = '#3b141c'; c.lineWidth = 1.2; c.stroke();
    } else { c.strokeStyle = '#8a3a3f'; c.lineWidth = 1.5; c.stroke(); }
    c.restore();
}

export function zeichneGesicht(c, f, haut) {
    f.augen.forEach(e => auge(c, e));
    nase(c, f.nase, haut);
    mund(c, f.mund);
}

const puls = (x, a, d) => (x > a && x < a + d ? Math.sin(Math.PI * (x - a) / d) : 0);

/** Gesichts-Zustand weich zur Ziel-Form ziehen (Mund, Augen, Blick). */
export function folgeGesicht(z, ziel, blickX, blickY, t) {
    const k = 0.35;
    for (const n of ['w', 'open', 'curve', 'round', 'eo', 'es']) z[n] += (ziel[n] - z[n]) * k;
    z.gx += (blickX + 0.06 * Math.sin(t * 1.7) - z.gx) * k * 0.6;
    z.gy += (blickY + 0.04 * Math.sin(t * 2.3 + 1) - z.gy) * k * 0.6;
    z.blinzeln = Math.max(puls(t % 3.7, 3.35, 0.17), puls(t % 8.3, 6, 0.17));
    z.offen = klemme(z.eo * (1 - z.blinzeln), 0, 1.2);
}
