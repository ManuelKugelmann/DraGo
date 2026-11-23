// Reihen-Ritt: Regeln ohne Grafik (reine Logik, getestet in tests/reihenritt.test.mjs).
// Oben steht eine Reihe (z. B. 7er-Reihe). Zahlen aus der Reihe einsammeln = mehr Zeit,
// falsche Zahlen = weniger Zeit (drüberspringen!). Zeit 0 = Ritt vorbei.

const ganz = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
const eins = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

export const istVielfaches = (z, reihe) => z > 0 && z % reihe === 0;

/** Eine Reihe passend zur Klasse (st = stufe(alter)), möglichst nicht dieselbe wie vorher. */
export function neueReihe(st, rnd = Math.random, alt = 0) {
    const wahl = st.malReihen.filter(r => r !== alt);
    return eins(wahl.length ? wahl : st.malReihen, rnd);
}

/** Nächste Zahl auf der Strecke. Falsche Zahlen liegen knapp neben der Reihe. */
export function naechsteZahl(reihe, st, rnd = Math.random, anteil = 0.5) {
    const r = reihe * ganz(rnd, 1, st.malBis);
    if (rnd() < anteil) return { wert: r, richtig: true };
    const falsch = [r + 1, r - 1, r + 2, r - 2, r + Math.ceil(reihe / 2)].filter(z => z > 0 && !istVielfaches(z, reihe));
    return { wert: eins(falsch, rnd), richtig: false };
}

export const neuerRitt = m => ({ zeit: m.zeit, magie: 0, richtig: 0, falsch: 0 });

/** Zahl eingesammelt: richtig = mehr Zeit (bis max), falsch = weniger Zeit. */
export function nimmZahl(z, zahl, m) {
    if (zahl.richtig) { z.zeit = Math.min(m.max, z.zeit + m.plus); z.richtig++; }
    else { z.zeit = Math.max(0, z.zeit - m.minus); z.falsch++; }
}

/** Zeit läuft ab. Gibt false zurück, wenn der Ritt vorbei ist. */
export function ticke(z, dt) {
    z.zeit = Math.max(0, z.zeit - dt);
    return z.zeit > 0;
}

/** Soll die Reihe wechseln? Nach je m.wechsel richtigen Zahlen. */
export const reiheWechseln = (z, m) => z.richtig > 0 && z.richtig % m.wechsel === 0;
