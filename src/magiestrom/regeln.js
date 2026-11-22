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

/** Zwei Rechnungen mit verschiedenem Ergebnis für n Funken. richtig = Index der besseren. */
export function schaetzTor(n, rnd = Math.random) {
    for (let versuch = 0; versuch < 50; versuch++) {
        const [a, b] = mische(RECHNUNGEN, rnd);
        if (a.f(n) !== b.f(n)) {
            return { art: 'schaetzen', frage: `${n} Funken`, optionen: [a.text, b.text],
                rechnungen: [a, b], richtig: a.f(n) > b.f(n) ? 0 : 1 };
        }
    }
    return { art: 'schaetzen', frage: `${n} Funken`, optionen: ['× 2', '+ 2'],
        rechnungen: [RECHNUNGEN[0], RECHNUNGEN[2]], richtig: n > 2 ? 0 : 1 };
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

// ---------- Echtzeit: Schatten kommen ständig, die Zeit läuft ----------
// m = MAGIE aus daten.js: start, ziel, zeit (Sekunden), schatten_start / schatten_plus (pro Sekunde, + pro 10 s),
// aufnahme (Anteil der Funken, der pro Sekunde ins Ei fliegt), kaelte (Wärme-Verlust pro Schatten, der durchkommt).

export const neuerZustand = m => ({ n: m.start, warm: 0, zeit: 0, schattenRest: 0, aufnahmeRest: 0 });

/** Wie viele neue Schatten in dt starten (werden mit der Zeit mehr). */
export function neueSchatten(z, dt, m) {
    z.schattenRest += (m.schatten_start + m.schatten_plus * z.zeit / 10) * dt;
    const k = Math.floor(z.schattenRest);
    z.schattenRest -= k;
    return k;
}

/** Ein Schatten kommt an: löscht einen Funken, oder kühlt das Ei, wenn keiner mehr da ist. */
export function treffer(z, m) {
    if (z.n > 0) { z.n--; return 'funke'; }
    z.warm = Math.max(0, z.warm - m.kaelte);
    return 'ei';
}

/** Funken fliegen nach und nach ins Ei und wärmen es. Gibt die Zahl der aufgenommenen Funken zurück. */
export function aufnehmen(z, dt, m) {
    z.aufnahmeRest += z.n * m.aufnahme * dt;
    const k = Math.min(z.n, Math.floor(z.aufnahmeRest));
    z.aufnahmeRest -= k;
    z.n -= k; z.warm += k;
    return k;
}

/** 'laeuft' | 'geschluepft' | 'kalt' */
export function stand(z, m) {
    if (z.warm >= m.ziel) return 'geschluepft';
    if (z.zeit >= m.zeit) return 'kalt';
    return 'laeuft';
}
