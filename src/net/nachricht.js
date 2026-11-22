// Was über das Netz geht, wird hier geprüft (reine Logik, getestet).
// Kein freier Text: nur Zahlen, bekannte Drachen-Typen und bekannte Emotes.
import { DRACHEN, EMOTES } from '../daten.js';

const zahl = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;

/** Zustand eines Drachen: { x, y, typ, n } (n = Index in DRACHEN_NAMEN). */
export function cleanState(d) {
    if (!d || typeof d !== 'object') return null;
    const x = zahl(d.x, 0, 1), y = zahl(d.y, 0, 1), n = zahl(d.n, 0, 999);
    if (x === null || y === null || n === null) return null;
    if (!Object.hasOwn(DRACHEN, d.typ)) return null;
    return { x, y, typ: d.typ, n: Math.floor(n) };
}

export function cleanEmote(id) {
    return typeof id === 'string' && Object.hasOwn(EMOTES, id) ? id : null;
}
