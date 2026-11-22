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

/** Einmaleins-Frage mit 3 Antworten (falsche Antworten: Nachbar-Reihe, knapp daneben). */
export function rechenTor(rnd = Math.random) {
    const a = ganz(rnd, 2, 10), b = ganz(rnd, 2, 10), r = a * b;
    const falsch = new Set();
    for (const f of mische([r + a, r - a, r + b, r - b, r + 1, r - 1, r + 10], rnd)) {
        if (f > 0 && f !== r) falsch.add(f);
        if (falsch.size === 2) break;
    }
    const optionen = mische([r, ...falsch], rnd);
    return { art: 'frage', frage: `${a} · ${b} = ?`, optionen: optionen.map(String), richtig: optionen.indexOf(r) };
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
