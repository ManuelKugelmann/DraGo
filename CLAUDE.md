# DraGo – Arbeitsanweisungen

Drachen-Spiel für Kinder. Installierbare PWA (Handy quer zuerst), statisch auf GitHub Pages.
three.js (3D, WebGL) + Vite, einfaches JavaScript (ESM). Mehrspieler peer-to-peer über Trystero.

## Wer gibt die Richtung vor

**Ein paar 10-jährige Kinder machen das Spieldesign.** Sie schreiben dir direkt.

- Antworte **auf Deutsch**. **Sehr kurze Fragen und Antworten**: 1–3 Sätze. Keine Fachwörter.
- **Eine Frage auf einmal.** Bei mehreren Möglichkeiten: 2–3 Auswahlen anbieten.
- Nach jeder Änderung: **sagen, was man jetzt sehen kann**, und wo (Link / „lade die Seite neu“).
- Ideen der Kinder ernst nehmen und klein anfangen: erst etwas Sichtbares, dann verfeinern.
- Entscheidungen der Kinder in `docs/spieldesign.md` eintragen (kurz, mit Datum).
- **Gewalt wie bei Nintendo:** kein Blut, kein Splatter, kein Töten. Besiegte Gegner hüpfen weg,
  schrumpfen, purzeln, laufen davon oder werden Freunde. Treffer = Sterne, Puff-Wolken, Wackeln.
  Gilt auch für Prompts an Bild-KIs. Nichts Gruseliges.
- Kein Chat mit Fremden, keine persönlichen Daten.

## Ideen-Pool (nur vorläufig)

Ältere Brainstorm-Notizen (Lernspiel mit Schulaufgaben, Höhlenbau, Ei-Diebe, Rig-Tests) liegen
lokal in `Reference/` (gitignored, privat, **nie committen**). Sie sind **keine Regeln**, nur
Ideen. Was die Kinder entscheiden, gilt.

## Feste Regeln

- `Reference/` und `_ref/` bleiben lokal. Vor jedem Push: `git ls-files | grep -i reference` muss leer sein.
- **Keine Projekt-, Personen- oder Kindernamen** in Prompts an externe Dienste (Replicate usw.).
- Mehrspieler: **kein freier Text** über das Netz. Nur Zahlen, bekannte Drachen-Typen, Emote-IDs
  (geprüft in `src/net/nachricht.js`). Räume nur über geheime Drei-Wort-Namen, keine Raumliste.
- Nur freie Bibliotheken/Assets (Open Source, CC0/CC-BY). Quelle + Lizenz in `CREDITS.md`.
  Bilder dürfen mit Replicate erzeugt werden (günstige Modelle bevorzugen, z. B. FLUX.2 klein).
- Jede Grafik hat einen Ersatz aus Code: das Spiel läuft auch ohne Bilddateien.

## Bilder erzeugen

- Replicate-Modell `black-forest-labs/flux-2-klein-4b` (billig, schnell). `aspect_ratio` 16:9 für
  Hintergründe, `output_format` webp. Ablage in `public/img/`, Prompt + Modell in `CREDITS.md`.
- Stil: gemütliche Fantasy, Anime-artig, gemalt, warme Farben. Nie Namen im Prompt.

## Code

- **`src/daten.js` ist die Kinder-Datei**: alle Texte, Drachen-Arten, Farben, Emotes, Pflege-Werte.
  Neue Inhalte zuerst dort als Daten, nicht als Sonderfälle im Code.
- Reine Logik ohne Phaser, mit Test in `tests/` (läuft im Deploy).
- Kleine Dateien, eine Aufgabe pro Datei, kein toter Code.

```
main.js                 Start: 3D-Szene + Knöpfe
src/daten.js            Texte, Figuren, Haarfarben (Kinder ändern hier)
src/start/StartSzene.js 3D-Startbild: Figur von hinten, Portal, Durchlaufen
src/start/Figur3D.js    Figur laden (glb), Bewegungen, Haare umfärben
src/start/haar.js       Haar-Farbfeld umfärben (rein, getestet)
src/start/Portal.js     Ring-Tor mit Wasser-Shader
src/start/startUi.js    Name, Pfeile, Haarfarben, Kamera, Los
src/start/kamera.js     Kamerabild als Hintergrund (hinten/vorne)
src/start/ar.js         WebXR-AR: Tor auf echten Boden stellen (Android Chrome)
src/magiestrom/          Ei ausbrüten: regeln.js (rein, getestet), MagieStrom.js (Grafik)
src/ui/ui.css           Seiten-Stil
src/net/                Mehrspieler, fertig aber noch nicht eingebaut
public/figuren/         KayKit-Figuren (CC0), erzeugt mit scripts/prep-figuren.mjs
public/img/             Bilder (FLUX)
scripts/                gen-icons.mjs, prep-figuren.mjs, serve.mjs
tests/                  node --test
```

## Befehle

```bash
npm run dev      # :8080, ohne Service Worker
npm run build    # -> dist/
npm run serve    # dist/ auf :4178 (echte PWA)
npm test
```

## Branches und Deploy

- `main` -> https://manuelkugelmann.github.io/DraGo/ , anderer Branch -> `/DraGo/<branch>/`.
- `.github/workflows/deploy.yml` baut, testet und schreibt in `gh-pages` (keep_files).
  `cleanup.yml` löscht die Vorschau eines gelöschten Branches.
- Alle Pfade relativ (kein führendes `/`), `--base` wird pro Branch gesetzt.

## Prüfen

Build + Tests grün, dann im Browser ansehen (Desktop quer + Handy-Emulation). Mehrspieler (wenn eingebaut):
zwei Tabs mit `?anon`, gleicher Raumname. Altes 2D-Beispiel (Phaser) mit Höhle + Freunden: Commit `11c5823`.
