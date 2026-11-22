// Formen der Puppe: Streifen (Glieder, Haare), Ellipsen, Vielecke. Alles in Bild-Pixeln.

export const klemme = (v, a, b) => Math.max(a, Math.min(b, v));
export const glatt = (a, b, x) => { const u = klemme((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

/** Catmull-Rom: aus wenigen Punkten (x, y, w = Breite) eine glatte Linie machen. */
export function glaette(a) {
    if (a.length < 3) return a.map(q => ({ x: q.x, y: q.y, w: q.w }));
    const aus = [], g = i => a[klemme(i, 0, a.length - 1)];
    const f = (a0, a1, a2, a3, t) => {
        const t2 = t * t, t3 = t2 * t;
        return 0.5 * (2 * a1 + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3);
    };
    for (let i = 0; i < a.length - 1; i++) {
        const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
        for (let s = 0; s < 4; s++) {
            const t = s / 4;
            aus.push({ x: f(p0.x, p1.x, p2.x, p3.x, t), y: f(p0.y, p1.y, p2.y, p3.y, t), w: Math.max(1, f(p0.w, p1.w, p2.w, p3.w, t)) });
        }
    }
    const e = a[a.length - 1];
    aus.push({ x: e.x, y: e.y, w: e.w });
    return aus;
}

/** Rand eines Streifens: linke/rechte Kante (in Kurven innen gekürzt) und runde Enden. */
function umriss(s) {
    const L = [], R = [];
    for (let i = 0; i < s.length; i++) {
        const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
        let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const nx = -dy, ny = dx, w = s[i].w / 2;
        let wl = w, wr = w;
        if (i > 0 && i < s.length - 1) {
            const p = s[i - 1], q = s[i], r = s[i + 1];
            let ax = q.x - p.x, ay = q.y - p.y, bx = r.x - q.x, by = r.y - q.y;
            const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
            ax /= la; ay /= la; bx /= lb; by /= lb;
            const kr = ax * by - ay * bx, wink = Math.atan2(kr, ax * bx + ay * by);
            const grenze = Math.max(1.5, ((la + lb) / 2) / (Math.abs(wink) + 1e-6) * 0.8);
            if (kr > 0) wl = Math.min(w, grenze); else wr = Math.min(w, grenze);
        }
        L.push({ x: s[i].x + nx * wl, y: s[i].y + ny * wl });
        R.push({ x: s[i].x - nx * wr, y: s[i].y - ny * wr });
    }
    const bogen = (c, tx, ty, sg) => {
        const nx = -ty * sg, ny = tx * sg, r = c.w / 2, o = [];
        for (let k = 1; k <= 4; k++) {
            const f = k / 5 * Math.PI, cf = Math.cos(f), sf = Math.sin(f);
            o.push({ x: c.x + (nx * cf + tx * sf) * r, y: c.y + (ny * cf + ty * sf) * r });
        }
        return o;
    };
    const e = s[s.length - 1], e0 = s[s.length - 2] || e;
    let dx = e.x - e0.x, dy = e.y - e0.y, d = Math.hypot(dx, dy) || 1;
    const ende = bogen(e, dx / d, dy / d, 1);
    const b0 = s[0], b1 = s[1] || b0;
    dx = b0.x - b1.x; dy = b0.y - b1.y; d = Math.hypot(dx, dy) || 1;
    const anfang = bogen(b0, dx / d, dy / d, -1).reverse();
    return { L, R, poly: [...anfang, ...L, ...ende, ...R.slice().reverse()] };
}

export const streifen = (id, pts, pal) => {
    const sm = glaette(pts), o = umriss(sm);
    return { id, form: 'streifen', roh: pts, sm, L: o.L, R: o.R, poly: o.poly, pal };
};
export const ellipse = (id, cx, cy, rx, ry, rot, pal) => ({ id, form: 'ellipse', cx, cy, rx, ry, rot: rot || 0, pal });
export const vieleck = (id, poly, pal) => ({ id, form: 'vieleck', poly, pal });

/** Pfad einer Form an den Canvas anhängen. */
export function pfad(c, p) {
    if (p.form === 'ellipse') {
        c.moveTo(p.cx + Math.cos(p.rot) * p.rx, p.cy + Math.sin(p.rot) * p.rx);
        c.ellipse(p.cx, p.cy, p.rx, p.ry, p.rot, 0, Math.PI * 2);
    } else if (p.form === 'mehrere') {
        p.teile.forEach(q => pfad(c, q));
    } else {
        p.poly.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.closePath();
    }
}
export function neuerPfad(c, p) { c.beginPath(); pfad(c, p); }

/** Umgebendes Rechteck {x0, y0, x1, y1}. */
export function huelle(p) {
    if (p.form === 'ellipse') {
        const r = Math.max(p.rx, p.ry);
        return { x0: p.cx - r, y0: p.cy - r, x1: p.cx + r, y1: p.cy + r };
    }
    if (p.form === 'mehrere') {
        return p.teile.map(huelle).reduce((b, r) => ({
            x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1)
        }));
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of p.poly) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    return { x0, y0, x1, y1 };
}

/** Hand mit vier Fingern und Daumen; w = Handgelenk, dir = Richtung des Unterarms. */
export function hand(id, w, dir, griff, spreiz, seite, t, saat, pal) {
    const px = -dir.y, py = dir.x, rot = Math.atan2(dir.y, dir.x);
    const basis = { x: w.x + dir.x * 6.5, y: w.y + dir.y * 6.5 };
    const teile = [ellipse('palm', basis.x, basis.y, 7, 6.2, rot)];
    const laengen = [8.6, 10.2, 9.4, 7.4], g = klemme(griff, 0, 1);
    for (let i = 0; i < 4; i++) {
        const off = (i - 1.5) * 3.7;
        const p0 = { x: basis.x + dir.x * 5 + px * off, y: basis.y + dir.y * 5 + py * off };
        const krumm = g * 1.35 + Math.sin(t * 2.5 + i * 1.3 + saat) * 0.05;
        const a0 = rot + (i - 1.5) * spreiz * 0.16, a1 = a0 + seite * krumm * 0.55, a2 = a1 + seite * krumm * 0.95;
        const L1 = laengen[i] * 0.55, L2 = laengen[i] * 0.45;
        const p1 = { x: p0.x + L1 * Math.cos(a1), y: p0.y + L1 * Math.sin(a1) };
        const p2 = { x: p1.x + L2 * Math.cos(a2), y: p1.y + L2 * Math.sin(a2) };
        teile.push(streifen('f' + i, [{ ...p0, w: 4.4 }, { ...p1, w: 3.8 }, { ...p2, w: 3 }]));
    }
    const ts = -seite;
    const t0 = { x: basis.x + px * ts * 4.8 + dir.x, y: basis.y + py * ts * 4.8 + dir.y };
    const ta = rot + ts * (0.8 - 0.55 * g), tb = ta - ts * g * 0.9;
    const t1 = { x: t0.x + 5.2 * Math.cos(ta), y: t0.y + 5.2 * Math.sin(ta) };
    const t2 = { x: t1.x + 4.4 * Math.cos(tb), y: t1.y + 4.4 * Math.sin(tb) };
    teile.push(streifen('daumen', [{ ...t0, w: 4.8 }, { ...t1, w: 4 }, { ...t2, w: 3.2 }]));
    return { id, form: 'mehrere', teile, pal };
}
