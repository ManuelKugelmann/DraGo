// Knöpfe und Dialoge als einfaches HTML über dem Spiel (große Touch-Ziele).
import { DRACHEN, EMOTES, TEXTE } from '../daten.js';
import Netz from '../net/Netz.js';
import { normalizeSecret, rollWords, MIN_JOIN, MIN_SECRET } from '../net/geheim.js';

const hud = () => document.getElementById('hud');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

/** Startbildschirm: Drachen-Art wählen. */
export function startAuswahl(fertig) {
    const box = el('div', 'start');
    box.append(el('h1', 'titel', TEXTE.titel), el('p', 'untertitel', TEXTE.drache_waehlen));
    const reihe = el('div', 'reihe');
    for (const [typ, d] of Object.entries(DRACHEN)) {
        const b = el('button', 'karte');
        b.style.setProperty('--farbe', '#' + d.koerper.toString(16).padStart(6, '0'));
        b.append(el('span', 'emoji', '🐉'), el('span', '', d.name));
        b.onclick = () => { box.remove(); fertig(typ); };
        reihe.append(b);
    }
    box.append(reihe);
    hud().append(box);
}

/** Knöpfe unten + Freunde-Knopf oben rechts. */
export function baueHud(scene) {
    const leiste = el('div', 'leiste');
    for (const id of Object.keys(EMOTES)) {
        const b = el('button', 'rund', EMOTES[id]);
        b.onclick = e => { e.stopPropagation(); scene.emote(id); };
        leiste.append(b);
    }
    const freunde = el('button', 'freunde', '👥 ' + TEXTE.freunde);
    freunde.onclick = () => raumDialog(scene, freunde);
    hud().append(leiste, freunde, el('div', 'quer', TEXTE.quer));
    scene.hud = {
        update() {
            const n = scene.net?.peers.size ?? 0;
            const t = scene.net ? (n ? TEXTE.freunde_da(n) : TEXTE[scene.net.status] || TEXTE.bereit) : TEXTE.freunde;
            if (freunde.dataset.t !== t) { freunde.dataset.t = t; freunde.textContent = '👥 ' + t; }
        }
    };
}

function raumDialog(scene, knopf) {
    const box = el('div', 'dialog');
    const feld = el('input', 'feld');
    feld.placeholder = 'drache feuer mond';
    feld.autocapitalize = 'off';
    const hinweis = el('p', 'hinweis', TEXTE.raum_hilfe);
    const wuerfeln = el('button', 'knopf', TEXTE.raum_wuerfeln);
    wuerfeln.onclick = () => { feld.value = rollWords().join(' '); pruefe(); };
    const rein = el('button', 'knopf gruen', TEXTE.raum_beitreten);
    const raus = el('button', 'knopf', scene.net ? TEXTE.raum_verlassen : '✖');
    const pruefe = () => {
        const s = normalizeSecret(feld.value);
        rein.disabled = s.length < MIN_JOIN;
        hinweis.textContent = s.length < MIN_JOIN ? TEXTE.raum_kurz : s.length < MIN_SECRET ? TEXTE.raum_leicht : TEXTE.raum_hilfe;
    };
    feld.oninput = pruefe;
    rein.onclick = () => { scene.setzeNetz(new Netz(feld.value)); box.remove(); knopf.blur(); };
    raus.onclick = () => { if (scene.net) scene.setzeNetz(null); box.remove(); };
    const reihe = el('div', 'reihe');
    reihe.append(wuerfeln, rein, raus);
    box.append(el('h2', '', TEXTE.raum_titel), feld, hinweis, reihe);
    hud().append(box);
    pruefe();
}
