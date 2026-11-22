// Knöpfe und Eingaben über dem 3D-Bild: Name, Figur, Haarfarbe, Kamera, Los.
import { TEXTE, FIGUREN, HAARFARBEN } from '../daten.js';
import { kameraAn, kameraAus } from './kamera.js';

const SPEICHER = 'drago_spieler';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const hex = f => '#' + f.toString(16).padStart(6, '0');

function lade() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { /* egal */ }
    return {
        name: typeof s.name === 'string' ? s.name.slice(0, 16) : '',
        figur: FIGUREN[s.figur] ? s.figur : 0,
        haar: s.haar in HAARFARBEN ? s.haar : 0
    };
}

export function baueStartUi(szene, leinwand) {
    const wahl = lade();
    const speichere = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(wahl)); } catch { /* egal */ } };
    const ui = document.getElementById('ui');

    const titel = el('h1', 'titel', TEXTE.titel);

    const name = el('input', 'name');
    name.placeholder = TEXTE.name_platzhalter;
    name.maxLength = 16;
    name.value = wahl.name;
    name.autocomplete = 'off';
    name.setAttribute('aria-label', TEXTE.name_frage);
    name.oninput = () => { wahl.name = name.value.trim(); speichere(); };
    name.onkeydown = e => { if (e.key === 'Enter') name.blur(); };

    const wechsel = schritt => {
        wahl.figur = (wahl.figur + schritt + FIGUREN.length) % FIGUREN.length;
        speichere();
        szene.zeige(wahl.figur, wahl.haar).then(() => szene.winken());
    };
    const links = el('button', 'pfeil links', '◀');
    const rechts = el('button', 'pfeil rechts', '▶');
    links.onclick = () => wechsel(-1);
    rechts.onclick = () => wechsel(1);

    const farben = el('div', 'farben');
    const tupfen = HAARFARBEN.map((f, i) => {
        const t = el('button', 'tupfen' + (f === null ? ' original' : ''));
        if (f !== null) t.style.background = hex(f);
        t.setAttribute('aria-label', 'Haarfarbe ' + (i + 1));
        t.onclick = () => { wahl.haar = i; speichere(); szene.setHaar(i); markiere(); szene.winken(); };
        farben.append(t);
        return t;
    });
    const markiere = () => tupfen.forEach((t, i) => t.classList.toggle('an', i === wahl.haar));
    markiere();

    // Kamerabild als Hintergrund: gleich beim Start versuchen, Knopf schaltet um.
    const kamera = el('button', 'kamera-knopf', TEXTE.kamera);
    const schalte = async an => {
        if (an && await kameraAn()) document.body.classList.add('kamera');
        else { kameraAus(); document.body.classList.remove('kamera'); }
    };
    kamera.onclick = () => schalte(!document.body.classList.contains('kamera'));
    schalte(true);

    const los = el('button', 'los', TEXTE.los);
    const unten = el('div', 'unten');
    unten.append(farben, los);

    const hinter = el('div', 'hinter-portal');
    hinter.style.backgroundImage = 'url(img/splash.webp)';
    const nochmal = el('button', 'nochmal', TEXTE.nochmal);
    hinter.append(el('h2', '', TEXTE.hinter_portal), nochmal);

    los.onclick = () => {
        document.body.classList.add('unterwegs');
        szene.los(() => {
            const t = TEXTE.hinter_portal;
            hinter.querySelector('h2').textContent = wahl.name ? `${wahl.name}, ${t[0].toLowerCase()}${t.slice(1)}` : t;
            setTimeout(() => document.body.classList.add('drin'), 500);
        });
    };
    nochmal.onclick = () => {
        document.body.classList.remove('drin', 'unterwegs');
        szene.zuruecksetzen();
    };

    leinwand.addEventListener('pointerdown', () => szene.winken());
    ui.append(titel, name, links, rechts, kamera, unten, hinter);
    szene.zeige(wahl.figur, wahl.haar);
}
