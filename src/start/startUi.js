// Knöpfe und Eingaben über dem 3D-Bild: Name, Figur, Haarfarbe, Kamera, Los.
import { TEXTE, FIGUREN, HAARFARBEN } from '../daten.js';
import { kameraAn, kameraAus } from './kamera.js';
import { arMoeglich, arSitzung } from './ar.js';
import MagieStrom from '../magiestrom/MagieStrom.js';
import ReihenRitt from '../reihenritt/ReihenRitt.js';
import { ALTER } from '../magiestrom/stufen.js';

const SPEICHER = 'drago_spieler';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const hex = f => '#' + f.toString(16).padStart(6, '0');

function lade() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { /* egal */ }
    return {
        name: typeof s.name === 'string' ? s.name.slice(0, 16) : '',
        figur: FIGUREN[s.figur] ? s.figur : 0,
        haar: s.haar in HAARFARBEN ? s.haar : 0,
        alter: ALTER.includes(s.alter) ? s.alter : 9
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
    // Alter (für die Schwierigkeit der Aufgaben)
    const alter = el('div', 'alter');
    alter.append(el('span', '', TEXTE.alter_frage));
    const alterKnoepfe = ALTER.map(a => {
        const b = el('button', a === wahl.alter ? 'an' : '', String(a) + (a === ALTER.at(-1) ? '+' : ''));
        b.onclick = () => { wahl.alter = a; speichere(); alterKnoepfe.forEach((k, i) => k.classList.toggle('an', ALTER[i] === a)); };
        alter.append(b);
        return b;
    });

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

    // Kamerabild als Hintergrund: gleich beim Start versuchen.
    // Knopf wechselt: Rückkamera -> Frontkamera -> aus -> Rückkamera ...
    const kamera = el('button', 'kamera-knopf', TEXTE.kamera);
    const meldung = el('div', 'meldung');
    const melde = text => {
        meldung.textContent = text;
        meldung.classList.add('zeigen');
        clearTimeout(melde.t);
        melde.t = setTimeout(() => meldung.classList.remove('zeigen'), 2500);
    };
    let modus = 'aus';
    const setzeModus = async (neu, still = false) => {
        modus = neu;
        if (neu !== 'aus' && await kameraAn(neu)) { document.body.classList.add('kamera'); return; }
        kameraAus();
        document.body.classList.remove('kamera');
        if (neu !== 'aus') { modus = 'aus'; if (!still) melde(TEXTE.kamera_fehler); }
    };
    kamera.onclick = () => setzeModus({ aus: 'environment', environment: 'user', user: 'aus' }[modus]);
    setzeModus('environment', true);

    // Echtes AR (nur wo verfügbar): Tor auf den echten Boden stellen.
    const ar = el('button', 'ar-knopf', TEXTE.ar);
    const arHinweis = el('div', 'ar-hinweis', TEXTE.ar_hinweis);
    ar.onclick = async () => {
        if (document.body.classList.contains('ar')) { szene.renderer.xr.getSession()?.end(); return; }
        try {
            const session = await arSitzung(ui);
            kameraAus();
            document.body.classList.remove('kamera', 'drin', 'unterwegs');
            document.body.classList.add('ar', 'ar-suchen');
            szene.beiPlatziert = () => document.body.classList.remove('ar-suchen');
            await szene.arStart(session, () => document.body.classList.remove('ar', 'ar-suchen'));
        } catch (e) { console.warn('AR:', e); }
    };
    arMoeglich().then(ja => { if (ja) document.body.classList.add('ar-geht'); });
    // Tippen auf Knöpfe soll in AR nicht das Tor versetzen
    ui.addEventListener('beforexrselect', e => e.preventDefault());

    const los = el('button', 'los', TEXTE.los);
    const unten = el('div', 'unten');
    unten.append(farben, los);

    // Hinter dem Tor: 3D-Höhle (Diorama), das Ei ist hinter einem Kristall versteckt.
    const hinter = el('div', 'hinter-portal');
    const text = el('h2', '');
    const nochmal = el('button', 'nochmal', TEXTE.nochmal);
    const brueten = el('button', 'brueten', TEXTE.ausbrueten);
    const ritt = el('button', 'ritt-knopf', TEXTE.ritt);
    const knoepfe = el('div', 'hoehle-knoepfe');
    knoepfe.append(brueten, ritt);
    hinter.append(text, knoepfe, nochmal);
    const magieEbene = el('div', '');
    magieEbene.id = 'magie';
    magieEbene.style.backgroundImage = 'url(img/splash.webp)';
    const rittEbene = el('div', '');
    rittEbene.id = 'ritt';
    let magie = null, reihenRitt = null;
    ritt.onclick = async () => {
        reihenRitt = new ReihenRitt(rittEbene, await szene.figurBild(300, 480, 1.3), wahl.alter);
        document.body.classList.add('ritt');
    };
    brueten.onclick = async () => {
        magie = new MagieStrom(magieEbene, await szene.figurBild(), wahl.alter);
        document.body.classList.add('magie');
        magie.spielen();
    };
    const mitName = t => (wahl.name ? `${wahl.name}, ${t[0].toLowerCase()}${t.slice(1)}` : t);
    const zeigeHoehle = () => {
        szene.betreteHoehle();
        hinter.classList.remove('gefunden');
        text.textContent = TEXTE.ei_suchen;
    };
    const eiGefunden = () => {
        hinter.classList.add('gefunden');
        text.textContent = mitName(TEXTE.ei_gefunden);
    };

    los.onclick = () => {
        document.body.classList.add('unterwegs');
        szene.los(() => {
            zeigeHoehle();
            setTimeout(() => document.body.classList.add('drin'), 500);
        });
    };
    nochmal.onclick = () => {
        magie?.beenden(); magie = null;
        reihenRitt?.beenden(); reihenRitt = null;
        document.body.classList.remove('drin', 'unterwegs', 'magie', 'ritt');
        szene.zuruecksetzen();
    };

    leinwand.addEventListener('pointerdown', e => {
        if (document.body.classList.contains('drin')) { if (szene.tippe(e.clientX, e.clientY)) eiGefunden(); }
        else szene.winken();
    });
    ui.append(titel, name, alter, links, rechts, kamera, ar, arHinweis, meldung, unten, hinter, magieEbene, rittEbene);
    szene.zeige(wahl.figur, wahl.haar);
}
