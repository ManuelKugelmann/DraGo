// Kleine Rechenhilfen für die Puppe.

export const klemme = (v, a, b) => Math.max(a, Math.min(b, v));

/** Catmull-Rom: aus wenigen Punkten (x, y, z, w = Breite) eine glatte Linie mit 4 Teilen pro Stück machen. */
export function glaette(a) {
    if (a.length < 3) return a.map(q => ({ x: q.x, y: q.y, z: q.z, w: q.w }));
    const aus = [], g = i => a[klemme(i, 0, a.length - 1)];
    const f = (a0, a1, a2, a3, t) => {
        const t2 = t * t, t3 = t2 * t;
        return 0.5 * (2 * a1 + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3);
    };
    for (let i = 0; i < a.length - 1; i++) {
        const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
        for (let s = 0; s < 4; s++) {
            const t = s / 4;
            aus.push({
                x: f(p0.x, p1.x, p2.x, p3.x, t), y: f(p0.y, p1.y, p2.y, p3.y, t), z: f(p0.z, p1.z, p2.z, p3.z, t),
                w: Math.max(0.5, f(p0.w, p1.w, p2.w, p3.w, t))
            });
        }
    }
    const e = a[a.length - 1];
    aus.push({ x: e.x, y: e.y, z: e.z, w: e.w });
    return aus;
}

/** Anzahl Punkte nach glaette(). */
export const geglaettet = n => (n < 3 ? n : (n - 1) * 4 + 1);
