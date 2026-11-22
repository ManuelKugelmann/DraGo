// Haare, Bänder und Mantel: Verlet-Physik in 3D (x rechts, y unten, z zur Kamera).

let kettenNr = 0;

/** Strähne aus n Punkten mit Abstand seg. */
export const Kette = (n, seg) => ({
    n, seg, ph: (kettenNr++) * 1.7, init: false,
    p: Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, ox: 0, oy: 0, oz: 0 }))
});

/**
 * Einen Schritt rechnen. A = Ansatz, r = Ruhe-Richtung, o = { wind, schwere, steif, daempf, biege, stoss, zeit }.
 * stoss(q) schiebt Punkte aus dem Körper heraus.
 */
export function schrittKette(k, A, r, o) {
    const biege = o.biege ?? 0.5, p = k.p;
    const rl = Math.hypot(r.x, r.y, r.z) || 1, rx = r.x / rl, ry = r.y / rl, rz = r.z / rl;
    if (!k.init) {
        for (let i = 0; i < k.n; i++) {
            const q = p[i];
            q.x = q.ox = A.x + rx * k.seg * i; q.y = q.oy = A.y + ry * k.seg * i; q.z = q.oz = A.z + rz * k.seg * i;
        }
        k.init = true;
    }
    p[0].x = p[0].ox = A.x; p[0].y = p[0].oy = A.y; p[0].z = p[0].oz = A.z;
    const t = o.zeit;
    for (let i = 1; i < k.n; i++) {
        const q = p[i];
        let vx = q.x - q.ox, vy = q.y - q.oy, vz = q.z - q.oz;
        const dr = o.daempf * (1 - Math.min(0.2, Math.hypot(vx, vy, vz) * 0.015));
        vx *= dr; vy *= dr; vz *= dr;
        q.ox = q.x; q.oy = q.y; q.oz = q.z;
        const wv = o.wind * (1 + 0.6 * Math.sin(t * 2.3 + i * 1.1 + k.ph) + 0.3 * Math.sin(t * 5.1 + i * 0.7 + k.ph * 2));
        const wz = o.wind * 0.7 * Math.sin(t * 1.7 + i * 0.9 + k.ph * 1.3);
        q.x += vx + wv; q.y += vy + o.schwere; q.z += vz + wz;
        let dx = rx, dy = ry, dz = rz;
        if (i >= 2) {
            let ux = p[i - 1].x - p[i - 2].x, uy = p[i - 1].y - p[i - 2].y, uz = p[i - 1].z - p[i - 2].z;
            const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
            const g = biege * (1 - i / k.n * 0.3);
            dx = ux * (1 - g) + rx * g; dy = uy * (1 - g) + ry * g; dz = uz * (1 - g) + rz * g;
            const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
        }
        const st = o.steif * (1 - 0.5 * i / k.n);
        q.x += (p[i - 1].x + dx * k.seg - q.x) * st;
        q.y += (p[i - 1].y + dy * k.seg - q.y) * st;
        q.z += (p[i - 1].z + dz * k.seg - q.z) * st;
        o.stoss?.(q);
        const ex = q.x - p[i - 1].x, ey = q.y - p[i - 1].y, ez = q.z - p[i - 1].z, d = Math.hypot(ex, ey, ez) || 1;
        q.x = p[i - 1].x + ex / d * k.seg; q.y = p[i - 1].y + ey / d * k.seg; q.z = p[i - 1].z + ez / d * k.seg;
    }
    return p;
}

/** Stoff-Gitter: R Reihen, K Spalten, seg = Reihen-Abstand, w0 = Breite oben, weit = Ausstellen pro Reihe. */
export const Tuch = (R, K, seg, w0, weit) => ({
    R, K, seg, w0, weit, init: false,
    pts: Array.from({ length: R }, () => Array.from({ length: K }, () => ({ x: 0, y: 0, z: 0, ox: 0, oy: 0, oz: 0 })))
});

/** A = Mitte oben, D = Richtung der Reihen, quer/vor = Körper-Achsen, zf = nach vorne pro Reihe. */
export function schrittTuch(C, A, D, quer, vor, zf, o) {
    const { R, K, pts } = C, cw = C.w0 / (K - 1), t = o.zeit;
    const ruhe = (r, c) => {
        const l = (c - (K - 1) / 2) * cw * (1 + C.weit * r), f = zf * r;
        return {
            x: A.x + quer.x * l + vor.x * f + D.x * C.seg * r,
            y: A.y + quer.y * l + vor.y * f + D.y * C.seg * r,
            z: A.z + quer.z * l + vor.z * f + D.z * C.seg * r
        };
    };
    if (!C.init) {
        for (let r = 0; r < R; r++) for (let c = 0; c < K; c++) {
            const q = pts[r][c], p = ruhe(r, c);
            q.x = q.ox = p.x; q.y = q.oy = p.y; q.z = q.oz = p.z;
        }
        C.init = true;
    }
    for (let c = 0; c < K; c++) { const q = pts[0][c], p = ruhe(0, c); q.x = q.ox = p.x; q.y = q.oy = p.y; q.z = q.oz = p.z; }
    for (let r = 1; r < R; r++) for (let c = 0; c < K; c++) {
        const q = pts[r][c], p = ruhe(r, c);
        const vx = (q.x - q.ox) * o.daempf, vy = (q.y - q.oy) * o.daempf, vz = (q.z - q.oz) * o.daempf;
        q.ox = q.x; q.oy = q.y; q.oz = q.z;
        const w = o.wind * (1 + r * 0.25) * (1 + 0.5 * Math.sin(t * 2.1 + c * 0.8 + r * 0.6));
        q.x += vx + w; q.y += vy + o.schwere; q.z += vz + w * 0.6 * Math.sin(t * 1.5 + c * 1.1 + r * 0.5);
        q.x += (p.x - q.x) * o.steif; q.y += (p.y - q.y) * o.steif; q.z += (p.z - q.z) * o.steif;
    }
    for (let it = 0; it < 3; it++) {
        for (let r = 1; r < R; r++) for (let c = 0; c < K; c++) {
            const a = pts[r - 1][c], b = pts[r][c];
            let ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z, d = Math.hypot(ex, ey, ez) || 1, k = (d - C.seg) / d;
            if (r === 1) { b.x -= ex * k; b.y -= ey * k; b.z -= ez * k; }
            else { b.x -= ex * k * 0.5; b.y -= ey * k * 0.5; b.z -= ez * k * 0.5; a.x += ex * k * 0.5; a.y += ey * k * 0.5; a.z += ez * k * 0.5; }
            if (c < K - 1) {
                const e = pts[r][c + 1];
                ex = e.x - b.x; ey = e.y - b.y; ez = e.z - b.z; d = Math.hypot(ex, ey, ez) || 1;
                k = (d - cw * (1 + C.weit * r)) / d * 0.5;
                b.x += ex * k; b.y += ey * k; b.z += ez * k; e.x -= ex * k; e.y -= ey * k; e.z -= ez * k;
            }
            o.stoss?.(b);
        }
    }
    return C;
}

export const mittelZ = a => a.reduce((m, q) => m + q.z, 0) / a.length;
export const mittelZTuch = C => C.pts.reduce((m, r) => m + mittelZ(r), 0) / C.pts.length;
