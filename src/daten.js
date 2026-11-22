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
    nochmal: '↩',
    ausbrueten: 'Ausbrüten ✨',
    magie_schaetzen: 'Was gibt mehr Funken?',
    magie_richtig: 'Super!',
    magie_naja: 'Geht auch!',
    magie_falsch: 'Knapp daneben!',
    magie_neu: 'Neue Funken!',
    magie_geschluepft: 'Dein Drache schlüpft!'
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

// Magiestrom-Spiel (Ei ausbrüten).
// start = Funken am Anfang, ziel = Wärme zum Schlüpfen, bonus = mal so viel bei richtiger Antwort,
// schatten_start / schatten_plus = Schatten-Funken in der ersten Runde / mehr pro Runde.
export const MAGIE = { start: 3, ziel: 60, bonus: 2, schatten_start: 2, schatten_plus: 2 };

// Vokabeln für Frage-Tore (deutsch -> englisch). Einfach Zeilen dazuschreiben!
export const VOKABELN = [
    { de: 'Drache', en: 'dragon' }, { de: 'Ei', en: 'egg' }, { de: 'Hund', en: 'dog' }, { de: 'Katze', en: 'cat' },
    { de: 'Haus', en: 'house' }, { de: 'Baum', en: 'tree' }, { de: 'Schule', en: 'school' }, { de: 'Buch', en: 'book' },
    { de: 'Freund', en: 'friend' }, { de: 'Wasser', en: 'water' }, { de: 'Feuer', en: 'fire' }, { de: 'Stern', en: 'star' }
];

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
