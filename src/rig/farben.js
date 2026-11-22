// Farben der gemalten Puppe: je Teil drei Töne (l = Licht, b = Grundton, d = Schatten).

const pal = (l, b, d) => ({ l, b, d });

export const PAL = {
    haut: pal('#f8dcc4', '#e9bb98', '#b9855f'),
    haar: pal('#f0aa62', '#bd5a31', '#7a2f1e'),
    mantel: pal('#4a84ab', '#28507a', '#14263f'),
    hemd: pal('#f6f1e4', '#d9cfb8', '#9d9079'),
    hose: pal('#59608a', '#343863', '#1a1c3a'),
    gold: pal('#f6da84', '#d6a23a', '#8a5d18'),
    schuh: pal('#c05a36', '#8a3322', '#471612'),
    schleife: pal('#ee7b80', '#bf3643', '#701624')
};

const hex = v => '#' + Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
const zuHex = ([r, g, b]) => hex(r) + hex(g).slice(1) + hex(b).slice(1);

/** Drei Töne aus einer Farbe (Zahl wie 0x6a4128). */
export function farbPalette(farbe) {
    const rgb = [(farbe >> 16) & 255, (farbe >> 8) & 255, farbe & 255];
    const licht = rgb.map(v => v + (255 - v) * 0.38 + 18);
    const schatten = rgb.map(v => v * 0.5);
    return pal(zuHex(licht), zuHex(rgb), zuHex(schatten));
}

/** Haar-Töne; null = Standard-Haar. */
export const haarPalette = farbe => (farbe == null ? PAL.haar : farbPalette(farbe));
