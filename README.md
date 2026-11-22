# DraGo

Ein Drachen-Spiel für Kinder. Läuft im Browser und lässt sich als App installieren (PWA).

**Spielen:** https://manuelkugelmann.github.io/DraGo/

- Drachen wählen, in der Höhle herumlaufen (auf den Boden tippen).
- Knöpfe unten: Emotes, 🔥 = Feuer-Atem.
- **Freunde:** gleiche drei Wörter eingeben = gleiche Höhle. Kein Chat, keine Anmeldung.

## Mitmachen

Texte, Drachen und Farben stehen in [`src/daten.js`](src/daten.js). Ideen und Entscheidungen:
[`docs/spieldesign.md`](docs/spieldesign.md).

```bash
npm install
npm run dev      # http://localhost:8080
npm test
npm run build
```

Jeder Branch wird automatisch unter `/DraGo/<branch>/` veröffentlicht.
Herkunft der Bilder und Töne: [`CREDITS.md`](CREDITS.md).
