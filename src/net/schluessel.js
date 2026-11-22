// Raum-Schlüssel, auf dem Gerät aus dem Raumnamen abgeleitet.
// Nur diese abgeleiteten Werte verlassen das Gerät, nie der Name selbst.

// Neutrale App-Kennung + Protokollversion (Teil des Salzes): andere Versionen
// treffen sich nie im selben Raum. Bei Änderungen am Nachrichtenformat hochzählen.
export const APP_ID = 'cave-wing-pals-v1';

const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/** Name -> { room, password }: PBKDF2-SHA-256, 120k Runden. */
export async function deriveKeys(secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(APP_ID), iterations: 120000 }, key, 512);
    const b = new Uint8Array(bits);
    return { room: hex(b.slice(0, 24)), password: hex(b.slice(24, 64)) };
}
