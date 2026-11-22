// ============================================================
//  DIESE DATEI DÜRFT IHR ÄNDERN!
//  Hier stehen Texte, Figuren und Farben vom Spiel.
//  Farben sind Zahlen wie 0xff6633 (rot-orange).
// ============================================================

export const TEXTE = {
    titel: 'DraGo',
    name_frage: 'Wie heißt du?',
    name_platzhalter: 'Dein Name',
    los: 'Los!',
    kamera: '📷',
    kamera_fehler: 'Kamera geht nicht – erlaubt?',
    ar: 'AR',
    ar_hinweis: 'Zeig auf den Boden und tippe!',
    ei_suchen: 'Hier ist irgendwo dein Drachenei versteckt. Such es!',
    ei_gefunden: 'Du hast dein erstes Drachenei gefunden!',
    nochmal: '↩'
};

// Spielfiguren (3D, KayKit Adventurers, CC0). datei = Datei in public/figuren/.
// Keine Klassen: man wählt nur, wie die Figur aussieht.
export const FIGUREN = [
    { datei: 'knight.glb' },
    { datei: 'barbarian.glb' },
    { datei: 'mage.glb' },
    { datei: 'rogue.glb' }
];

// Natürliche Haarfarben zum Antippen: Original, schwarz, dunkelbraun, braun, hellbraun, blond, rot, grau.
// Wo das erste Ei versteckt ist (in Prozent vom Bild: links, oben).
export const EI_VERSTECK = { links: 9, oben: 44 };

export const HAARFARBEN = [null, 0x1c1410, 0x3b2416, 0x6a4128, 0x9a6a3e, 0xd9b26a, 0xb5532a, 0xc9c4bc];

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
