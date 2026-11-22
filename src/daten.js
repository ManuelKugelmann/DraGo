// ============================================================
//  DIESE DATEI DÜRFT IHR ÄNDERN!
//  Hier stehen Texte, Drachen und Farben vom Spiel.
//  Farben sind Zahlen wie 0xff6633 (rot-orange).
// ============================================================

export const TITEL = 'DraGo';
export const AVATAR_FRAGE = 'Wer bist du?';

// Spielfiguren im Anime-Stil (Platzhalter aus Formen). Neue Figur = Zeile kopieren.
// frisur: 'stachelig' | 'lang' | 'zopf' | 'kurz' – haut, kleidung, augen = Farben.
export const AVATARE = [
    { frisur: 'stachelig', haut: 0xffd6b0, kleidung: 0xe8562a, augen: 0x3b6fd9 },
    { frisur: 'lang', haut: 0xf1c29a, kleidung: 0x8a4fd6, augen: 0x2e9e5b },
    { frisur: 'zopf', haut: 0xc68a5a, kleidung: 0x3b8fd9, augen: 0x8a4a1c },
    { frisur: 'kurz', haut: 0xffe0c2, kleidung: 0x4caf50, augen: 0xb0306a }
];

// Haarfarben zum Antippen.
export const HAARFARBEN = [0x2b1a12, 0x7a4320, 0xf2c94c, 0xe8562a, 0xff7fbf, 0x5aa8ff, 0x9b5cff, 0xf5f5f5];

// Drachen-Arten. Der Mehrspieler schickt nur diese Namen übers Netz.
export const DRACHEN = {
    baby: { name: 'Babydrache', farbe: 0x6cbf4a }
};

// Emotes: kleine Bilder, die Freunde sehen. Kein freier Text (Sicherheit).
export const EMOTES = {
    winken: '👋',
    herz: '❤️',
    lachen: '😄',
    feuer: '🔥',
    stern: '⭐'
};
