// Magiestrom: Regeln ohne Grafik (reine Logik, getestet in tests/magiestrom.test.mjs).
//
// Ablauf einer Runde:
//  1. Ein Tor: Schätz-Tor (welche Rechnung gibt mehr Funken?) oder Frage-Tor (Rechnen / Vokabel).
//  2. Schatten-Funken kommen vom Ei und löschen gleich viele eigene Funken aus.
//  3. Die übrigen Funken wärmen das Ei. Ist das Ei warm genug, schlüpft der Drache.
// Kein Malus: eine falsche Antwort bringt nur keinen Bonus. Bei 0 Funken gibt es neue Start-Funken.

export const RECHNUNGEN = [
    { text: '× 2', f: n => n * 2 },
    { text: '× 3', f: n => n * 3 },
    { text: '+ 2', f: n => n + 2 },
    { text: '+ 4', f: n => n + 4 },
    { text: '+ 6', f: n => n + 6 },
    { text: '+ 10', f: n => n + 10 }
];

const mische = (arr, rnd) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};
const ganz = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));

/** Schätz-Tor: immer Plus gegen Mal (z. B. + 4 oder × 2), mit verschiedenem Ergebnis für n Funken.
 *  richtig = Index der Rechnung, die mehr Funken gibt. */
export function schaetzTor(n, rnd = Math.random) {
    const mal = RECHNUNGEN.filter(r => r.text.startsWith('×')), plus = RECHNUNGEN.filter(r => r.text.startsWith('+'));
    for (let versuch = 0; versuch < 50; versuch++) {
        const m = mal[Math.floor(rnd() * mal.length)], p = plus[Math.floor(rnd() * plus.length)];
        if (m.f(n) === p.f(n)) continue;
        const [a, b] = rnd() < 0.5 ? [m, p] : [p, m];
        return { art: 'schaetzen', frage: `${n} Funken`, optionen: [a.text, b.text], rechnungen: [a, b], richtig: a.f(n) > b.f(n) ? 0 : 1 };
    }
    const [a, b] = [mal[0], plus[plus.length - 1]];
    return { art: 'schaetzen', frage: `${n} Funken`, optionen: [a.text, b.text], rechnungen: [a, b], richtig: a.f(n) > b.f(n) ? 0 : 1 };
}

const STANDARD = { plusBis: 100, malReihen: [2, 3, 4, 5, 6, 7, 8, 9, 10], malBis: 10, vokabeln: true };

/** Einmaleins-Frage mit 3 Antworten (falsche Antworten: Nachbar-Reihe, knapp daneben). */
export function rechenTor(rnd = Math.random, st = STANDARD) {
    const a = st.malReihen[Math.floor(rnd() * st.malReihen.length)], b = ganz(rnd, 1, st.malBis), r = a * b;
    const falsch = new Set();
    for (const f of mische([r + a, r - a, r + b, r - b, r + 1, r - 1, r + 10], rnd)) {
        if (f > 0 && f !== r) falsch.add(f);
        if (falsch.size === 2) break;
    }
    const optionen = mische([r, ...falsch], rnd);
    return { art: 'frage', frage: `${a} · ${b} = ?`, optionen: optionen.map(String), richtig: optionen.indexOf(r) };
}

/** Plus- oder Minus-Aufgabe (bis st.plusBis) mit 3 Antworten. */
export function plusMinusTor(rnd = Math.random, st = STANDARD) {
    const plus = rnd() < 0.5, g = st.plusBis;
    const a = ganz(rnd, Math.ceil(g * 0.1), Math.floor(g * 0.9)), b = ganz(rnd, 1, plus ? g - a : a - 1);
    const r = plus ? a + b : a - b;
    const falsch = new Set();
    for (const f of mische([r + 10, r - 10, r + 1, r - 1, r + 2, r - 2], rnd)) {
        if (f >= 0 && f !== r) falsch.add(f);
        if (falsch.size === 2) break;
    }
    const optionen = mische([r, ...falsch], rnd);
    return { art: 'frage', frage: `${a} ${plus ? '+' : '−'} ${b} = ?`, optionen: optionen.map(String), richtig: optionen.indexOf(r) };
}

/** Zufälliges Tor: Schätzen, Einmaleins, Plus/Minus oder (ab Klasse 3) Vokabel. */
export function zufallsTor(n, vokabeln, rnd = Math.random, st = STANDARD) {
    const arten = st.vokabeln ? 4 : 3;
    const art = Math.floor(rnd() * arten);
    if (art === 0) return schaetzTor(n, rnd);
    if (art === 1) return rechenTor(rnd, st);
    if (art === 2) return plusMinusTor(rnd, st);
    return vokabelTor(vokabeln, rnd);
}

/** Vokabel-Frage: deutsches Wort -> englisches Wort, 3 Antworten. */
export function vokabelTor(vokabeln, rnd = Math.random) {
    const [v, ...rest] = mische(vokabeln, rnd);
    const optionen = mische([v.en, ...rest.slice(0, 2).map(x => x.en)], rnd);
    return { art: 'frage', frage: `${v.de} = ?`, optionen, richtig: optionen.indexOf(v.en) };
}

/** Funken nach der Wahl am Tor. */
export function nachTor(tor, wahl, n, bonus = 2) {
    if (tor.art === 'schaetzen') return tor.rechnungen[wahl].f(n);
    return wahl === tor.richtig ? n * bonus : n;
}

/** Schatten-Funken in Runde r (0, 1, 2, ...): werden langsam mehr. */
export const schatten = (r, start = 2, plus = 2) => start + r * plus;

/** Schatten löschen eigene Funken aus. Bei 0 gibt es neue Start-Funken. */
export function nachSchatten(n, s, startFunken = 3) {
    const uebrig = Math.max(0, n - s);
    return { geloescht: Math.min(n, s), uebrig, weiter: uebrig > 0 ? uebrig : startFunken };
}

/** Stärke des Drachen (1..3 Sterne): je schneller das Ei warm war, desto stärker.
 *  grenzen = Sekunden für 3 und 2 Sterne, z. B. [90, 180]. */
export function staerke(sekunden, grenzen = [90, 180]) {
    if (sekunden <= grenzen[0]) return 3;
    if (sekunden <= grenzen[1]) return 2;
    return 1;
}

// ---------- Echtzeit: Wettrennen Funken (Wärme) gegen Schatten (Kälte) ----------
// m = MAGIE aus daten.js: start (Funken), start_waerme, ziel (Wärme zum Schlüpfen),
// waerme (Wärme pro Funke und Sekunde), schatten_start / schatten_plus (Schatten pro Sekunde, + pro 10 s),
// kaelte (Wärme, die ein Schatten löscht). Wärme 0 = Ei kalt = verloren.

export const neuerZustand = m => ({ n: m.start, warm: m.start_waerme, zeit: 0, schattenRest: 0 });

/** Wie viele neue Schatten in dt starten (werden mit der Zeit mehr). */
export function neueSchatten(z, dt, m) {
    z.schattenRest += (m.schatten_start + m.schatten_plus * z.zeit / 10) * dt;
    const k = Math.floor(z.schattenRest);
    z.schattenRest -= k;
    return k;
}

/** Ein Schatten erreicht das Ei und löscht Wärme. */
export function treffer(z, m) {
    z.warm = Math.max(0, z.warm - m.kaelte);
    if (z.warm === 0) z.kalt = true;   // einmal ganz kalt = verloren (auch wenn Funken danach wieder heizen)
}

/** Die kreisenden Funken heizen das Ei: je mehr Funken, desto schneller. */
export function waermen(z, dt, m) {
    z.warm += z.n * m.waerme * dt;
}

/** 'laeuft' | 'geschluepft' | 'kalt' */
export function stand(z, m) {
    if (z.warm >= m.ziel) return 'geschluepft';
    if (z.kalt || z.warm <= 0) return 'kalt';
    return 'laeuft';
}
