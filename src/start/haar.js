// Haare umfärben in einer KayKit-Farbtafel (reine Logik, getestet).
// Die Textur ist ein Raster aus 8 x 4 Farbfeldern; das Haar liegt in Spalte 1, Zeile 0.
export const HAAR_FELD = { spalte: 1, zeile: 0, spalten: 8, zeilen: 4 };

/**
 * Färbt das Haar-Feld in RGBA-Pixeln (Uint8ClampedArray, breite x hoehe) um.
 * Die Helligkeit jedes Pixels bleibt erhalten (Verlauf und Glanz bleiben sichtbar).
 * farbe = 0xRRGGBB oder null (nichts ändern).
 */
export function faerbeHaar(pixel, breite, hoehe, farbe, feld = HAAR_FELD) {
    if (farbe === null || farbe === undefined) return pixel;
    const fb = breite / feld.spalten, fh = hoehe / feld.zeilen;
    const x0 = Math.round(feld.spalte * fb), y0 = Math.round(feld.zeile * fh);
    const x1 = Math.round(x0 + fb), y1 = Math.round(y0 + fh);
    const hell = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

    let summe = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * breite + x) * 4;
        summe += hell(pixel[i], pixel[i + 1], pixel[i + 2]);
    }
    const mittel = Math.max(1, summe / ((x1 - x0) * (y1 - y0)));
    const r = (farbe >> 16) & 255, g = (farbe >> 8) & 255, b = farbe & 255;

    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * breite + x) * 4;
        const f = hell(pixel[i], pixel[i + 1], pixel[i + 2]) / mittel;
        pixel[i] = r * f; pixel[i + 1] = g * f; pixel[i + 2] = b * f;
    }
    return pixel;
}
