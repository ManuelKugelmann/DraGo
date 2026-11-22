// Geheimer Raumname: aufräumen und würfeln (reine Logik, getestet in tests/).
export const MIN_JOIN = 3;    // kürzester Name, der überhaupt geht
export const MIN_SECRET = 8;  // kürzer = Hinweis "leicht zu erraten"
export const MAX_SECRET = 30;

/** Nur Kleinbuchstaben und Ziffern, Umlaute gefaltet (ä -> a): "Höhle" == "hohle". */
export function normalizeSecret(input) {
    return String(input || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, MAX_SECRET);
}

// Kurze Wörter, leicht zu sagen und zu schreiben.
export const WOERTER = ['drache', 'ei', 'feuer', 'funke', 'kristall', 'hoehle', 'nest', 'fluegel', 'schuppe', 'horn',
    'schatz', 'gold', 'rubin', 'mond', 'stern', 'blitz', 'wolke', 'sturm', 'rune', 'zauber',
    'lava', 'vulkan', 'berg', 'tunnel', 'fackel', 'kerze', 'laterne', 'krone', 'burg', 'turm',
    'apfel', 'kirsche', 'keks', 'honig', 'pilz', 'moos', 'farn', 'eule', 'fuchs', 'igel'];

/** Drei zufällige, verschiedene Wörter. Zusammen sind sie der Raumname. */
export function rollWords(random = Math.random) {
    const out = [];
    while (out.length < 3) {
        const w = WOERTER[Math.floor(random() * WOERTER.length)];
        if (!out.includes(w)) out.push(w);
    }
    return out;
}
