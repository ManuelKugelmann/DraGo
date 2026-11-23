/** Vorgerenderter Leucht-Punkt für Canvas-Teilchen (schnell zu zeichnen). */
export function leuchtPunkt(farbe, r = 16) {
    const c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const g = c.getContext('2d'), v = g.createRadialGradient(r, r, 0, r, r, r);
    v.addColorStop(0, '#ffffff'); v.addColorStop(0.25, farbe); v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v; g.fillRect(0, 0, r * 2, r * 2);
    return c;
}
