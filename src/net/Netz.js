// Dünne Schicht über Trystero (WebRTC, Partnersuche über öffentliche Relays).
// Kein eigener Server nötig. Der Spielcode spricht nur mit dieser Klasse,
// damit der Transport später austauschbar ist (z. B. eigenes WebSocket-Relay).
//
// Privatsphäre:
//  - Ein Raum ist ein geheimer Name aus drei Wörtern. Er wird auf dem Gerät mit
//    PBKDF2 zu Raum-ID + Passwort gestreckt; nur das geht ins Netz.
//  - Keine Raumliste, keine Suche, kein Chat, kein freier Text.
import { joinRoom } from 'trystero';
import { normalizeSecret } from './geheim.js';
import { APP_ID, deriveKeys } from './schluessel.js';
import { cleanState, cleanEmote } from './nachricht.js';

export const MAX_PLAYERS = 6;

export default class Netz {
    /** status: 'verbinde' | 'bereit' | 'voll' | 'fehler' */
    constructor(secret) {
        this.secret = normalizeSecret(secret);
        this.status = 'verbinde';
        this.peers = new Set();
        this.cbs = { join: [], leave: [], state: [], emote: [] };
        this.room = null;
        this.open();
    }

    async open() {
        try {
            const keys = await deriveKeys(this.secret);
            const cfg = { appId: APP_ID, password: keys.password, maxUsers: MAX_PLAYERS };
            // ?anon: Wegwerf-Identität, damit zwei Tabs im selben Browser zwei Spieler sind.
            if (/[?&]anon\b/.test(location.search)) cfg.identity = 'none';
            const room = joinRoom(cfg, keys.room);
            this.room = room;
            const [sendState, onState] = this.action(room, 'zustand');
            const [sendEmote, onEmote] = this.action(room, 'emote');
            this.sendState = sendState; this.sendEmoteRaw = sendEmote;
            onState((d, id) => { const s = cleanState(d); if (s) this.fire('state', id, s); });
            onEmote((d, id) => { const e = cleanEmote(d); if (e) this.fire('emote', id, e); });
            room.onUserJoin(({ userId }) => { this.peers.add(userId); this.fire('join', userId); });
            room.onUserLeave(({ userId }) => { this.peers.delete(userId); this.fire('leave', userId); });
            room.onError?.(err => { if (err?.code === 'room-full') this.status = 'voll'; });
            await room.ready;
            if (this.status === 'verbinde') this.status = 'bereit';
        } catch (e) {
            console.warn('Netz:', e);
            this.status = 'fehler';
        }
    }

    /** Trystero-Aktion als [senden, empfangen(cb(daten, absenderId))]. */
    action(room, name) {
        const a = room.makeAction(name);
        return [d => a.send(d), cb => a.onMessage((d, ctx) => cb(d, ctx.userId))];
    }

    fire(kind, ...args) { this.cbs[kind].forEach(cb => cb(...args)); }
    on(kind, cb) { this.cbs[kind].push(cb); }

    send(state) {
        if (!this.sendState || this.peers.size === 0) return;
        Promise.resolve(this.sendState(state)).catch(() => {});
    }

    sendEmote(id) {
        if (!this.sendEmoteRaw || this.peers.size === 0) return;
        Promise.resolve(this.sendEmoteRaw(id)).catch(() => {});
    }

    leave() {
        for (const k in this.cbs) this.cbs[k] = [];
        this.peers.clear();
        const room = this.room;
        this.room = null; this.sendState = null; this.sendEmoteRaw = null;
        return room ? Promise.resolve(room.leave()).catch(() => {}) : Promise.resolve();
    }
}
