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
    ei_suchen: 'Hier ist irgendwo dein Drachenei versteckt. Tipp auf das Versteck!',
    ei_gefunden: 'Du hast dein erstes Drachenei gefunden!',
    nochmal: '↩',
    ausbrueten: 'Ausbrüten ✨',
    magie_schaetzen: 'Was gibt mehr Funken?',
    magie_du_hast: 'Du hast gerade',
    magie_richtig: 'Super!',
    magie_naja: 'Geht auch!',
    magie_falsch: 'Knapp daneben!',
    magie_neu: 'Neue Funken!',
    magie_geschluepft: 'Dein Drache schlüpft!',
    magie_kalt: 'Oh nein, das Ei ist kalt geworden!',
    magie_nochmal: 'Nochmal ✨',
    alter_frage: 'Wie alt bist du?'
};

// Spielfiguren (3D, KayKit Adventurers, CC0). datei = Datei in public/figuren/.
// Keine Klassen: man wählt nur, wie die Figur aussieht.
export const FIGUREN = [
    { datei: 'knight.glb' },
    { datei: 'barbarian.glb' },
    { datei: 'mage.glb' },
    { datei: 'rogue.glb' }
];

// Höhle (2.5D): gemalte Teile an 3D-Positionen [x (links/rechts), y (hoch), z (vorne/hinten)] in Metern.
// groesse = Höhe in Metern. versteck = dahinter liegt das Ei. ei = das Nest mit dem Ei.
export const HOEHLE_TEILE = [
    { bild: 'hoehle/fels.png', ort: [-3.4, 0, -5], groesse: 2.6 },
    { bild: 'hoehle/kristalle.png', ort: [-2.6, 0, -2.2], groesse: 2.4 },
    { bild: 'hoehle/pilze.png', ort: [-1.4, 0, 0.6], groesse: 0.8 },
    { bild: 'hoehle/fels.png', ort: [4.2, 0, -6], groesse: 3 },
    { bild: 'hoehle/nest.png', ort: [2.3, 0, -3.2], groesse: 1.7, ei: true },
    { bild: 'hoehle/kristalle.png', ort: [2.1, 0, -2.4], groesse: 2.3, versteck: true },
    { bild: 'hoehle/pilze.png', ort: [3.4, 0, 0.2], groesse: 0.7 }
];

// Gemalte Schüler (Test mit ?rig in der Adresse): ◀ ▶ wechselt zwischen ihnen.
// variante = 'maedchen' oder 'junge', jacke = Farbe der Jacke.
export const SCHUELER = [
    { variante: 'maedchen', jacke: 0x28507a },
    { variante: 'junge', jacke: 0x3f7a4f }
];

// Natürliche Haarfarben zum Antippen: Original, schwarz, dunkelbraun, braun, hellbraun, blond, rot, grau.
export const HAARFARBEN = [null, 0x1c1410, 0x3b2416, 0x6a4128, 0x9a6a3e, 0xd9b26a, 0xb5532a, 0xc9c4bc];

// Magiestrom-Spiel (Ei ausbrüten): Wettrennen. Funken = Wärme des Eis, Schatten löschen Funken.
// start = Funken am Anfang (wenige: dann ist Plus besser, später Mal), ziel = Funken zum Schlüpfen,
// bonus = mal so viele Funken bei richtiger Antwort,
// schatten_start = Schatten pro Sekunde am Anfang, schatten_plus = so viel mehr pro 10 Sekunden,
// kaelte = Funken, die ein Schatten löscht. 0 Funken = Ei kalt = nochmal.
// sterne = Sekunden bis zum Schlüpfen für ⭐⭐⭐ und ⭐⭐ (schneller = stärkerer Drache).
export const MAGIE = { start: 5, ziel: 100, bonus: 2,
    schatten_start: 0.3, schatten_plus: 0.15, kaelte: 1, sterne: [25, 45] };

// Vokabeln für Frage-Tore (deutsch -> englisch). Einfach Zeilen dazuschreiben!
export const VOKABELN = [
    { de: 'Drache', en: 'dragon' }, { de: 'Ei', en: 'egg' }, { de: 'Hund', en: 'dog' }, { de: 'Katze', en: 'cat' },
    { de: 'Haus', en: 'house' }, { de: 'Baum', en: 'tree' }, { de: 'Schule', en: 'school' }, { de: 'Buch', en: 'book' },
    { de: 'Freund', en: 'friend' }, { de: 'Wasser', en: 'water' }, { de: 'Feuer', en: 'fire' }, { de: 'Stern', en: 'star' }
];

// Drachen-Arten: schlüpfen zufällig. bild = Datei in public/drachen/.
// Der Mehrspieler schickt nur diese Namen übers Netz.
export const DRACHEN = {
    feuer: { name: 'Feuer-Drache', bild: 'drachen/feuer.png' },
    sturm: { name: 'Sturm-Drache', bild: 'drachen/sturm.png' },
    rune: { name: 'Runen-Drache', bild: 'drachen/rune.png' }
};

// Emotes: kleine Bilder, die Freunde sehen. Kein freier Text (Sicherheit).
export const EMOTES = {
    winken: '👋',
    herz: '❤️',
    lachen: '😄',
    feuer: '🔥',
    stern: '⭐'
};
