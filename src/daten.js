// ============================================================
//  DIESE DATEI DÜRFT IHR ÄNDERN!
//  Hier stehen alle Texte, Drachen und Farben vom Spiel.
//  Farben sind Zahlen wie 0xff6633 (rot-orange).
//  Tipp: Farben aussuchen auf https://htmlcolorcodes.com
// ============================================================

// Die Drachen-Arten. Neue Art = neuen Block kopieren und ändern.
export const DRACHEN = {
    feuer: {
        name: 'Feuer-Drache',
        koerper: 0xe8562a,   // Hauptfarbe
        bauch: 0xffc65c,     // Bauch und Flügelhaut
        horn: 0xfff1d0,
        atem: [0xffe066, 0xff8a1f, 0xe8301a],  // Farben vom Feuer-Atem
        lieblingsessen: '🌶️'
    },
    sturm: {
        name: 'Sturm-Drache',
        koerper: 0x3b8fd9,
        bauch: 0xbfe6ff,
        horn: 0xffffff,
        atem: [0xffffff, 0x9fe3ff, 0x4db8ff],
        lieblingsessen: '🫐'
    },
    rune: {
        name: 'Runen-Drache',
        koerper: 0x8a4fd6,
        bauch: 0xe7c9ff,
        horn: 0xffe28a,
        atem: [0xfff6a8, 0xd89bff, 0x9b5cff],
        lieblingsessen: '🍇'
    }
};

// Namen, die ein neuer Drache bekommen kann.
export const DRACHEN_NAMEN = ['Funki', 'Glut', 'Wolki', 'Blitzi', 'Runa', 'Kiesel', 'Flämmchen', 'Zisch',
    'Pupsi', 'Schuppi', 'Nebel', 'Sternchen', 'Kokel', 'Brutzel', 'Zappel', 'Moosi'];

// Emotes: kleine Bilder, die Freunde sehen. Kein freier Text (Sicherheit).
export const EMOTES = {
    winken: '👋',
    herz: '❤️',
    lachen: '😄',
    feuer: '🔥',
    stern: '⭐'
};

// Alle Texte im Spiel. Kurz halten!
export const TEXTE = {
    titel: 'DraGo',
    fuettern: 'Füttern',
    spielen: 'Spielen',
    feuer: 'Feuer!',
    freunde: 'Freunde',
    drache_waehlen: 'Wähle deinen Drachen',
    los: 'Los!',
    satt: 'Satt',
    laune: 'Laune',
    raum_titel: 'Zusammen spielen',
    raum_hilfe: 'Gleiche drei Wörter = gleiche Höhle.',
    raum_wuerfeln: '🎲 Würfeln',
    raum_beitreten: 'Rein!',
    raum_verlassen: 'Raus',
    raum_kurz: 'Zu kurz!',
    raum_leicht: 'Leicht zu erraten – lieber würfeln.',
    verbinde: 'Suche Freunde …',
    bereit: 'Warte auf Freunde …',
    freunde_da: n => (n === 1 ? '1 Freund da' : `${n} Freunde da`),
    fehler: 'Hat nicht geklappt.',
    voll: 'Höhle ist voll.',
    quer: 'Bitte Handy quer halten 🔄',
    tipp_start: 'Tipp auf den Boden, dann läuft dein Drache hin!'
};

// Wie schnell Hunger und Laune sinken (pro Minute, von 100).
export const PFLEGE = {
    hunger_pro_minute: 4,
    laune_pro_minute: 3,
    futter_gibt: 25,
    spielen_gibt: 20
};
